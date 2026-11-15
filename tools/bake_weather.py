#!/usr/bin/env python3
"""Bake the Curiosity REMS weather feed into app/data/weather.json.

Input: the MSL REMS outreach feed (Centro de Astrobiologia, CAB),
  https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
  saved copy: research/rems.json (retrieved 2026-11-14).
Output (columnar, one row per sol, sorted by sol; missing values "--" become null):
  sol, date (Earth date at the sol's midday, per the feed's terrestrial_date_desc_en),
  ls (deg, integer as published), minTemp/maxTemp (air, C), minGts/maxGts (ground, C),
  pressure (Pa), uv (text), sunrise/sunset (HH:MM as published).
Published ls is floor(Ls at the start of the sol); sunrise/sunset are MSL mission LMST
truncated to the minute (both checked in tools/tests/test_marstime.mjs). app/js/weather.js
adds the exact mid-sol Ls and the Mars Year from app/js/marstime.js at load time.

Usage: python3 tools/bake_weather.py [research/rems.json] [app/data/weather.json]
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'research', 'rems.json')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'app', 'data', 'weather.json')

def num(v):
    v = (v or '').strip()
    return None if v in ('', '--') else int(round(float(v)))

def txt(v):
    v = (v or '').strip()
    return None if v in ('', '--') else v

with open(SRC, encoding='utf-8') as f:
    rows_in = json.load(f)['soles']
rows_in.sort(key=lambda r: int(r['sol']))
sols = [int(r['sol']) for r in rows_in]
assert len(sols) == len(set(sols)), 'duplicate sols in feed'

fields = ['sol', 'date', 'ls', 'minTemp', 'maxTemp', 'minGts', 'maxGts',
          'pressure', 'uv', 'sunrise', 'sunset']
rows = []
for r in rows_in:
    rows.append([int(r['sol']), r['terrestrial_date'], num(r['ls']),
                 num(r['min_temp']), num(r['max_temp']),
                 num(r['min_gts_temp']), num(r['max_gts_temp']),
                 num(r['pressure']), txt(r['local_uv_irradiance_index']),
                 txt(r['sunrise']), txt(r['sunset'])])

out = {
    'source': {
        'name': 'Curiosity (MSL) REMS weather feed',
        'by': 'Centro de Astrobiologia (CAB) / NASA JPL-Caltech',
        'url': 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json',
        'retrieved': '2026-11-14',
        'note': 'Outreach values at the REMS location on the rover (CAB disclaimer); '
                'science data are in the PDS. Sunrise/sunset are MSL mission LMST, HH:MM.',
    },
    'units': {'ls': 'deg', 'minTemp': 'C', 'maxTemp': 'C', 'minGts': 'C', 'maxGts': 'C',
              'pressure': 'Pa', 'sunrise': 'LMST HH:MM', 'sunset': 'LMST HH:MM'},
    'fields': fields,
    'rows': rows,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    f.write('{\n')
    for k in ('source', 'units', 'fields'):
        f.write(f'"{k}":{json.dumps(out[k], separators=(",", ":"))},\n')
    f.write('"rows":[\n' + ',\n'.join(json.dumps(r, separators=(',', ':')) for r in rows) + '\n]}\n')

print(f'{len(rows)} sols, {rows[0][0]}..{rows[-1][0]} ({rows[0][1]} .. {rows[-1][1]}) '
      f'-> {os.path.normpath(OUT)} ({os.path.getsize(OUT)} bytes)')
