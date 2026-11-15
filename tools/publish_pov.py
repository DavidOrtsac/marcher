#!/usr/bin/env python3
"""Publish the rover photos from the bake VM (keeps big uploads off the home line).
Reads app/data/pov/index.json, downloads each original from its NASA url, resizes it to the
width/height recorded in the index (JPEG q85, same as tools/pov_build.py), and writes
OUT/img/<file>. Then: gcloud storage cp -r OUT/img gs://transcendiant-marcher/data/pov/
Usage: publish_pov.py index.json OUT"""
import json, os, sys, io, time, urllib.request
from PIL import Image
idx = json.load(open(sys.argv[1])); out = sys.argv[2]
os.makedirs(out + '/img', exist_ok=True)
ok = skip = fail = 0
for im in idx['images']:
    dst = os.path.join(out, im['file'])
    if os.path.exists(dst): skip += 1; continue
    try:
        req = urllib.request.Request(im['url'], headers={'User-Agent': 'marcher-publish'})
        with urllib.request.urlopen(req, timeout=60) as r: data = r.read()
        img = Image.open(io.BytesIO(data)).convert('RGB' if im['kind'] == 'mast' else 'L')
        img = img.resize((im['width'], im['height']), Image.LANCZOS)
        img.save(dst, quality=85)
        ok += 1
        time.sleep(0.5)  # polite pacing for mars.nasa.gov / PDS
    except Exception as e:
        fail += 1; print('fail', im['id'], e)
print('ok', ok, 'skip', skip, 'fail', fail)
