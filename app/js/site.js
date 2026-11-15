// Site data: the baked Mount Sharp boxwork square and its coordinate frames.
//
// Map frame: USGS MSL Gale v3 mosaics, Mars 2000 sphere (R = 3396190 m),
// equirectangular, centre longitude 0. x = R * lon, y = R * lat (radians).
// World frame (three.js): metres from the site centre.
//   X = easting - xc (east), Y = elevation - base (up), Z = -(northing - yc) (south).
// Grids are pixel-is-area: sample k of an n-cell grid sits at x0 + (k + 0.5) * size / n.

// fetch that fails loudly: a missing file must stop the boot with its name, not as a decode error later
async function get(url) {
  let r;
  try { r = await fetch(url); } catch { throw new Error(`could not load ${url.split('/').pop()} (network)`); }
  if (!r.ok) throw new Error(`could not load ${url.split('/').pop()} (HTTP ${r.status})`);
  return r;
}

export async function loadSite(base = 'data/') {
  const s = await (await get(base + 'site.json')).json();
  s.base = base;
  s.xc = (s.x0 + s.x1) / 2;
  s.yc = (s.y0 + s.y1) / 2;
  s.half = s.size_m / 2;
  return s;
}

// Decode a height PNG (centimetres above base in R*256+G) to Float32 metres above base.
export async function loadHeights(url, n) {
  const blob = await (await get(url)).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0);
  const px = g.getImageData(0, 0, bmp.width, bmp.height).data;
  const out = new Float32Array(bmp.width * bmp.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = (px[j] * 256 + px[j + 1]) * 0.01;
  if (n && bmp.width !== n) throw new Error(`height grid ${url}: ${bmp.width} != ${n}`);
  return { h: out, w: bmp.width, hgt: bmp.height };
}

export async function loadGray(url) {
  const blob = await (await get(url)).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0);
  const px = g.getImageData(0, 0, bmp.width, bmp.height).data;
  const out = new Uint8Array(bmp.width * bmp.height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = px[j];
  return { v: out, w: bmp.width, hgt: bmp.height };
}

export function makeFrames(s) {
  const k = s.R * Math.PI / 180;
  return {
    toWorld(easting, northing) { return { x: easting - s.xc, z: -(northing - s.yc) }; },
    toMap(x, z) { return { e: x + s.xc, n: s.yc - z }; },
    toLonLat(x, z) { return { lon: (x + s.xc) / k, lat: (s.yc - z) / k }; },
    fromLonLat(lon, lat) { return { x: lon * k - s.xc, z: -(lat * k - s.yc) }; },
    elevToY(elev) { return elev - s.height.base_m; },
    yToElev(y) { return y + s.height.base_m; },
  };
}

// Bilinear sampler on a pixel-is-area grid covering the whole site.
export function makeSampler(grid, s) {
  const { h, w } = grid;
  const res = s.size_m / w;
  const sample = (x, z) => {
    let u = (x + s.half) / res - 0.5, v = (z + s.half) / res - 0.5;
    u = Math.min(Math.max(u, 0), w - 1.001);
    v = Math.min(Math.max(v, 0), w - 1.001);
    const i = u | 0, j = v | 0, fu = u - i, fv = v - j, o = j * w + i;
    const a = h[o], b = h[o + 1], c = h[o + w], d = h[o + w + 1];
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
  };
  const slopeDeg = (x, z, d = res) => {
    const gx = (sample(x + d, z) - sample(x - d, z)) / (2 * d);
    const gz = (sample(x, z + d) - sample(x, z - d)) / (2 * d);
    return Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI;
  };
  return { sample, slopeDeg, res, w };
}
