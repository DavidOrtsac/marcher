#!/usr/bin/env python3
"""Bake orbital science layers onto the site grid (run from the repo root).

THEMIS thermal inertia (Mars Odyssey): research/themis_ti_box_100m.json holds the 32 x 32
  values (J m^-2 K^-1 s^-1/2) range-read from the USGS quantitative mosaic tile 30S120E
  (Fergason, USGS Astrogeology, 2014). Same projection as the site; row 0 = north edge.
CRISM (MRO): MTRDR browse product FRT0000B6F1 (2008-07-09, 18 m/px) HYD composite from the
  PDS Geosciences Node. World file (pixel centres) from the product's ENVI header:
  18, 0, 0, -18, 8138487.6, -278204.96.
Outputs: app/data/themis_ti.png (32 x 32, R = (TI - 200) / 300, A = 255),
         app/data/crism_hyd.png (178 x 178 RGBA, alpha from signal strength), layers.json
"""
import json
import numpy as np
from PIL import Image

X0, X1, Y0, Y1 = 8142400, 8145600, -286800, -283600
ti = json.load(open('research/themis_ti_box_100m.json'))
g = np.array(json.loads(ti['grid']) if isinstance(ti['grid'], str) else ti['grid'], dtype=np.float64)
assert g.shape == (32, 32), g.shape
lo, hi = 200.0, 500.0
r = np.clip((g - lo) / (hi - lo), 0, 1)
rgba = np.zeros((32, 32, 4), np.uint8); rgba[..., 0] = np.round(r * 255); rgba[..., 3] = 255
Image.fromarray(rgba, 'RGBA').save('app/data/themis_ti.png')

im = np.array(Image.open('research/dl/frt0000b6f1_hyd.png').convert('RGBA')).astype(np.float64)
A, E, C, F = 18.0, -18.0, 8138487.6, -278204.96   # pixel-centre world file
n = int((X1 - X0) / 18)                           # 177.8 -> 178 cells of 18 m
out = np.zeros((n, n, 4), np.float64)
res = (X1 - X0) / n
for j in range(n):
    y = Y1 - (j + 0.5) * res
    for i in range(n):
        x = X0 + (i + 0.5) * res
        u = (x - C) / A; v = (y - F) / E
        iu, iv = int(round(u)), int(round(v))
        if 0 <= iv < im.shape[0] and 0 <= iu < im.shape[1]:
            out[j, i] = im[iv, iu]
from scipy.ndimage import median_filter
for c in range(3): out[..., c] = median_filter(out[..., c], size=3)   # 3 x 3 median: display denoise
sig = out[..., :3].max(axis=2)
alpha = np.clip((sig - 40) / 120, 0, 1) * (out[..., 3] > 0)
out[..., 3] = alpha * 255
Image.fromarray(np.round(out).astype(np.uint8), 'RGBA').save('app/data/crism_hyd.png')
cover = float((out[..., 3] > 0).mean())
json.dump({
  'themis_ti': {'file': 'themis_ti.png', 'lo': lo, 'hi': hi, 'units': 'J m^-2 K^-1 s^-1/2', 'min': float(g.min()), 'max': float(g.max()),
                'source': 'THEMIS Thermal Inertia Mosaic Quantitative 30S120E 100 m/px (Fergason, USGS Astrogeology, 2014)',
                'url': 'https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30s120e_100mpp'},
  'crism_hyd': {'file': 'crism_hyd.png', 'product': 'FRT0000B6F1_07_IF165J_MTR3', 'date': '2008-07-09', 'res_m': 18,
                'legend': 'HYD browse: polyhydrated sulfates appear magenta, monohydrated sulfates yellow/green (CRISM MTRDR browse documentation)',
                'url': 'https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/browse/2008/2008_191/frt0000b6f1/'},
}, open('app/data/layers.json', 'w'), indent=1)
print('TI', g.min(), g.max(), 'CRISM cover with signal', round(cover, 3))
