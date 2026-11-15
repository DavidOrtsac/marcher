#!/usr/bin/env python3
"""Boxwork ridges and hollows from the 1 m HiRISE DTM (run from the repo root after bake_site.py).
Band-pass relief r = G(1.5 m) * h - G(8 m) * h: positive where the ground stands above its
surroundings over 8 to 20 m (boxwork ridges), negative in the hollows between them.
Checked against Curiosity team labels: Monte Grande hollow r = -0.28 m, Nevado Sajama ridge
r = +0.35 m, Rio Frio ridge wall r = +1.6 m (rover positions from MMGIS waypoints).
Output app/data/relief_2m.png: 1600 x 1600, value = 128 + 50 r (clamped), 2 m cells."""
import numpy as np
from PIL import Image
from scipy import ndimage
H = np.zeros((3200, 3200))
for j in range(8):
    for i in range(8):
        a = np.array(Image.open(f'app/data/dem1/r{j}c{i}.png').convert('RGB')).astype(np.float64)
        H[j*400:(j+1)*400, i*400:(i+1)*400] = ((a[..., 0] * 256 + a[..., 1]) * 0.01)[:400, :400]
r = ndimage.gaussian_filter(H, 1.5) - ndimage.gaussian_filter(H, 8)
r2 = r.reshape(1600, 2, 1600, 2).mean(axis=(1, 3))
Image.fromarray(np.clip(np.round(128 + 50 * r2), 0, 255).astype(np.uint8), 'L').save('app/data/relief_2m.png', optimize=True)
print('relief std %.2f m, ridge cells (>0.35 m) %.1f %%, hollow cells (<-0.35 m) %.1f %%' % (r2.std(), (r2 > .35).mean() * 100, (r2 < -.35).mean() * 100))
