#!/usr/bin/env python3
"""Blend aids for the photos hung in 3D at each stop (app/data/pov/index.json).

Adds two fields to every Navcam and Mastcam record. Neither changes a photo file.

  sky   16 numbers, one per image column strip, left to right: the fraction of the
        image height (from the top) where the sky ends. 0 means no sky in that strip.
        The app fades the photo out above this line, so the grey Navcam sky does not
        cover the rendered sky. Found from the photo itself: the smooth run that
        starts at the top row, never lower than 3 degrees below level.
  gain  brightness multiplier that makes overlapping photos at one stop agree. For
        every pair of photos at a stop, the ground they both see is sampled along
        the same view rays and the median brightness ratio taken. One least-squares
        solve per stop, pulled toward 1, gives each photo its gain.

The side panel always shows the untouched photo.

Run: python3 tools/pov_blend.py            (writes the index in place)
     python3 tools/pov_blend.py --dry      (prints the per-stop report only)
"""
import json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
POV = os.path.join(HERE, '..', 'app', 'data', 'pov')
NS = 16          # sky strips per photo
W = 192          # working width for analysis
GRID = 28        # ray samples per side for overlaps


def load_gray(rec):
    im = Image.open(os.path.join(POV, rec['file'])).convert('L')
    h = max(8, round(W * im.height / im.width))
    return np.asarray(im.resize((W, h), Image.BILINEAR), dtype=np.float32) / 255.0


def skyline(g, rec):
    """Per column: rows from the top that are smooth and bright (sky)."""
    h, w = g.shape
    g = g.copy(); g[:3] = g[3]                        # some frames carry a bright first row
    # local texture: mean absolute difference to the 4 neighbours, box-smoothed
    d = np.zeros_like(g)
    d[1:-1, 1:-1] = (np.abs(g[1:-1, 1:-1] - g[:-2, 1:-1]) + np.abs(g[1:-1, 1:-1] - g[2:, 1:-1]) +
                     np.abs(g[1:-1, 1:-1] - g[1:-1, :-2]) + np.abs(g[1:-1, 1:-1] - g[1:-1, 2:])) / 4
    k = 5
    pad = np.pad(d, k // 2, mode='edge')
    tex = sum(pad[i:i + h, j:j + w] for i in range(k) for j in range(k)) / (k * k)
    out = np.zeros(w)
    # sky brightness per column, from the top rows (a dim evening sky still counts)
    top = np.convolve(g[:3].mean(axis=0), np.ones(7) / 7, mode='same')
    for x in range(w):
        col_t, col_g = tex[:, x], g[:, x]
        if col_t[1:4].max() > 0.012 or top[x] < 0.04:
            continue                                  # the top of this column is not smooth sky
        y = 1
        while y < h - 1 and col_t[y] < 0.014 and col_g[y] > top[x] * 0.62:
            y += 1
        out[x] = y / h if y > 2 else 0.0
    s = np.array([float(np.median(a)) for a in np.array_split(out, NS)])
    sp = np.pad(s, 1, mode='edge')                    # drop lone strips
    s = np.median(np.stack([sp[:-2], sp[1:-1], sp[2:]]), axis=0)
    # geometry guard: nothing more than 3 degrees below level can be sky, so smooth
    # bright ground in a photo that looks down is never faded
    c = np.array(rec['corners'], dtype=np.float64)
    us = (np.arange(NS) + 0.5) / NS
    lim = np.zeros(NS)
    for k, u in enumerate(us):
        for v in np.linspace(0, 1, 101):
            ray = c[0] + u * (c[1] - c[0]) + v * (c[3] - c[0])
            if np.degrees(np.arcsin(ray[1] / np.linalg.norm(ray))) < -3.0:
                break
            lim[k] = v
    return np.clip(np.minimum(s, lim), 0, 0.97)


def frame(rec):
    c = np.array(rec['corners'], dtype=np.float64)   # TL, TR, BR, BL unit rays
    return c[0], c[1] - c[0], c[3] - c[0]


def uv_in(rec, rays):
    """Where unit rays land in a photo: (u, v) from the top left, and a hit mask."""
    o, eu, ev = frame(rec)
    n = np.cross(eu, ev)
    den = rays @ n
    t = (o @ n) / np.where(np.abs(den) < 1e-9, 1e-9, den)
    p = rays * t[:, None] - o
    u = (p @ eu) / (eu @ eu)
    v = (p @ ev) / (ev @ ev)
    return u, v, (t > 0) & (u > 0.06) & (u < 0.94) & (v > 0.06) & (v < 0.94)


def sample(g, u, v):
    h, w = g.shape
    return g[np.clip((v * h).astype(int), 0, h - 1), np.clip((u * w).astype(int), 0, w - 1)]


def main():
    dry = '--dry' in sys.argv
    fn = os.path.join(POV, 'index.json')
    doc = json.load(open(fn))
    by = {r['id']: r for r in doc['images']}
    gray, sky = {}, {}
    for r in doc['images']:
        if r['kind'] == 'fhaz':
            continue
        gray[r['id']] = load_gray(r)
        sky[r['id']] = skyline(gray[r['id']], r)
    gu, gv = np.meshgrid((np.arange(GRID) + 0.5) / GRID, (np.arange(GRID) + 0.5) / GRID)
    gu, gv = gu.ravel(), gv.ravel()
    gains, report = {}, []
    for st in doc['stops']:
        ids = [i for i in st['images'] if i in gray]
        if not ids:
            continue
        n = len(ids)
        A, b = [], []
        for ai in range(n):
            ra = by[ids[ai]]
            o, eu, ev = frame(ra)
            rays = o + gu[:, None] * eu + gv[:, None] * ev
            rays /= np.linalg.norm(rays, axis=1)[:, None]
            la = sample(gray[ids[ai]], gu, gv)
            ska = sky[ids[ai]][np.clip((gu * NS).astype(int), 0, NS - 1)]
            ok_a = (gu > 0.06) & (gu < 0.94) & (gv > 0.06) & (gv < 0.94) & (gv > ska + 0.03) & (la > 0.04) & (la < 0.96)
            for bi in range(ai + 1, n):
                u, v, hit = uv_in(by[ids[bi]], rays)
                lb = sample(gray[ids[bi]], u, v)
                skb = sky[ids[bi]][np.clip((u * NS).astype(int), 0, NS - 1)]
                m = ok_a & hit & (v > skb + 0.03) & (lb > 0.04) & (lb < 0.96)
                if m.sum() < 12:
                    continue
                # log brightness ratio over the shared ground
                d = float(np.median(np.log(lb[m]) - np.log(la[m])))
                wgt = min(1.0, m.sum() / 120.0) ** 0.5
                row = np.zeros(n); row[ai] = wgt; row[bi] = -wgt
                A.append(row); b.append(wgt * d)      # want ga + log la = gb + log lb
        g = np.zeros(n)
        if A:
            lam = 0.25                                   # pull toward gain 1
            M = np.vstack([np.array(A), lam * np.eye(n)])
            y = np.concatenate([np.array(b), np.zeros(n)])
            g = np.linalg.lstsq(M, y, rcond=None)[0]
            g -= np.median(g)
            g = np.clip(g, np.log(0.6), np.log(1.7))
            before = float(np.sqrt(np.mean(np.square(np.array(b) / np.maximum(1e-9, np.abs(np.array(A)).max(axis=1))))))
            res = np.array(A) @ g - np.array(b)
            after = float(np.sqrt(np.mean(np.square(res / np.maximum(1e-9, np.abs(np.array(A)).max(axis=1))))))
            if n >= 6:
                report.append((st['key'], n, len(A), round(before, 3), round(after, 3)))
        for i, gi in zip(ids, g):
            gains[i] = round(float(np.exp(gi)), 3)
    for r in doc['images']:
        if r['id'] in gray:
            r['gain'] = gains.get(r['id'], 1.0)
            r['sky'] = [round(float(x), 3) for x in sky[r['id']]]
    note = ('gain and sky (tools/pov_blend.py) are display aids for the photos hung in 3D: gain is a brightness multiplier '
            'that makes overlapping photos at one stop agree, sky lists per column strip (16, left to right) the fraction '
            'of image height from the top where the sky ends, so the app can fade the photo out above it. The image files are untouched.')
    doc['notes'] = [x for x in doc['notes'] if 'pov_blend.py' not in x] + [note]
    print('stop, photos, overlapping pairs, rms log brightness mismatch before, after')
    for row in report:
        print(*row)
    withsky = sum(1 for i in sky.values() if i.max() > 0)
    print(f'{len(gray)} photos, {withsky} with sky, gains {min(gains.values())} to {max(gains.values())}')
    if not dry:
        json.dump(doc, open(fn, 'w'), separators=(',', ':'))
        print('wrote', os.path.normpath(fn))


if __name__ == '__main__':
    main()
