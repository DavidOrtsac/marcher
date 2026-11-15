#!/usr/bin/env python3
"""Bake the Mount Sharp boxwork site into web-ready files.

Inputs (cut by tools/cut_site.sh from the USGS Gale v3 mosaics):
  dem1m.tif    MSL Gale merged DEM, 1 m posts (HiRISE stereo), Float32 metres (areoid)
  color25.tif  MSL Gale HiRISE LRGB pansharpened colour, 0.25 m, RGBA (A = coverage)

Outputs (in OUT):
  site.json            bounds, projection, elevation encoding, file list
  dem_4m.png           800 x 800 heights for the overview mesh
  dem_2m.png           1600 x 1600 heights for route planning and walking collision
  dem1/r{j}c{i}.png    8 x 8 tiles of 401 x 401 heights at 1 m (1 px overlap)
  ortho_4096.jpg       whole-site colour at 0.78 m/px
  ortho25/r{j}c{i}.jpg 8 x 8 tiles of 1600 x 1600 colour at 0.25 m/px
Heights are encoded as centimetres above BASE in R (high byte) and G (low byte).
"""
import json, os, sys, math
import numpy as np
from osgeo import gdal
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out'
os.makedirs(OUT + '/dem1', exist_ok=True)
os.makedirs(OUT + '/ortho25', exist_ok=True)

ds = gdal.Open(f'{SRC}/dem1m.tif')
gt = ds.GetGeoTransform()
dem = ds.GetRasterBand(1).ReadAsArray().astype(np.float64)
assert (dem > -10000).all(), 'nodata inside site'
H, W = dem.shape
x0, y1 = gt[0], gt[3]
base = math.floor(dem.min()) - 1.0

def enc(a):
    cm = np.clip(np.round((a - base) * 100.0), 0, 65535).astype(np.uint32)
    rgb = np.zeros(a.shape + (3,), np.uint8)
    rgb[..., 0] = cm >> 8
    rgb[..., 1] = cm & 255
    return Image.fromarray(rgb, 'RGB')

def block(a, k):
    h, w = a.shape
    return a.reshape(h // k, k, w // k, k).mean(axis=(1, 3))

d2 = block(dem, 2)
d4 = block(dem, 4)
enc(d4).save(f'{OUT}/dem_4m.png', optimize=True)
enc(d2).save(f'{OUT}/dem_2m.png', optimize=True)

T = 400  # 1 m tiles, 8 x 8, each 401 x 401 with the next tile's first row/col
pad = np.pad(dem, ((0, 1), (0, 1)), mode='edge')
for j in range(H // T):
    for i in range(W // T):
        enc(pad[j*T:j*T+T+1, i*T:i*T+T+1]).save(f'{OUT}/dem1/r{j}c{i}.png', optimize=True)

# colour
cs = gdal.Open(f'{SRC}/color25.tif')
rgba = np.dstack([cs.GetRasterBand(b).ReadAsArray() for b in (1, 2, 3, 4)])
cover = float((rgba[..., 3] > 0).mean())
img = Image.fromarray(rgba[..., :3], 'RGB')
img.resize((4096, 4096), Image.LANCZOS).save(f'{OUT}/ortho_4096.jpg', quality=88)
img.resize((2048, 2048), Image.LANCZOS).save(f'{OUT}/ortho_2048.jpg', quality=88)
P = 1600
for j in range(8):
    for i in range(8):
        img.crop((i*P, j*P, i*P+P, j*P+P)).save(f'{OUT}/ortho25/r{j}c{i}.jpg', quality=84)

site = {
  'name': 'Mount Sharp boxwork, Gale crater',
  'crs': 'Mars 2000 sphere, equirectangular, centre lon 0, R = 3396190 m (USGS MSL Gale v3)',
  'R': 3396190.0,
  'x0': x0, 'x1': x0 + W, 'y0': y1 - H, 'y1': y1,
  'size_m': W,
  'grid_note': 'pixel-is-area: sample k of an n-cell grid sits at x0 + (k + 0.5) * size/n; dem1 tiles add one overlap sample',
  'height': {'base_m': base, 'scale_m': 0.01, 'encoding': 'cm above base, R*256+G'},
  'elev_min': float(dem.min()), 'elev_max': float(dem.max()),
  'dem_4m': {'file': 'dem_4m.png', 'n': W // 4, 'res': 4},
  'dem_2m': {'file': 'dem_2m.png', 'n': W // 2, 'res': 2},
  'dem_1m': {'dir': 'dem1', 'tile_m': T, 'tiles': W // T, 'n': T + 1},
  'ortho': {'whole': 'ortho_4096.jpg', 'whole_small': 'ortho_2048.jpg', 'dir': 'ortho25', 'tile_px': P, 'tiles': 8, 'res': 0.25, 'colour_cover': cover},
  'sources': [
    {'what': 'Terrain', 'name': 'MSL Gale Merged DEM 1m v3 (HiRISE stereo)', 'by': 'USGS Astrogeology / NASA MRO HiRISE', 'url': 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m'},
    {'what': 'Colour', 'name': 'MSL Gale Merged Orthophoto Mosaic 25 cm, with the HiRISE 78 quad colour basemap (Parker and Calef)', 'by': 'USGS Astrogeology / NASA MRO HiRISE', 'url': 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm', 'file': 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif'},
  ],
}
json.dump(site, open(f'{OUT}/site.json', 'w'), indent=1)
print(json.dumps({k: site[k] for k in ('x0', 'x1', 'y0', 'y1', 'elev_min', 'elev_max')}), 'colour cover', round(cover, 4),
      'slope p50/p95/max', np.percentile(slope, [50, 95]).round(1), slope.max().round(1))

# ---- step hazard (added 2026-11-14): steepest 1 m step around each 2 m cell ----
# The 2 m slope (4 m baseline) smooths over short walls such as boxwork ridges 1 to 2 m tall.
# For every 1 m post: max over the 8 neighbours of |dh| / distance, as an angle; then the max
# over each 2 x 2 block. Stored as degrees x 2 (8 bit) in step_2m.png.
st = np.zeros_like(dem)
for dj, di in [(0, 1), (1, 0), (1, 1), (1, -1)]:
    d = np.abs(np.roll(np.roll(dem, -dj, 0), -di, 1) - dem) / math.hypot(dj, di)
    st = np.maximum(st, d); st = np.maximum(st, np.roll(np.roll(d, dj, 0), di, 1))
s1 = np.degrees(np.arctan(st)).reshape(H // 2, 2, W // 2, 2).max(axis=(1, 3))
Image.fromarray(np.clip(np.round(s1 * 2), 0, 255).astype(np.uint8), 'L').save(f'{OUT}/step_2m.png', optimize=True)
