#!/usr/bin/env python3
"""Bake NASA DONKI space weather relevant to Mars into app/data/spaceweather.json.

Source: NASA CCMC Space Weather Database Of Notifications, Knowledge, Information
(DONKI) via api.nasa.gov (https://api.nasa.gov/, "DONKI" section).
Keeps every CME whose WSA-ENLIL run predicts an arrival at Mars (latest run per CME,
from the analysis flagged most accurate), plus SEP and flare events in the window.
Usage: bake_spaceweather.py START END OUT [API_KEY]   (dates YYYY-MM-DD)
"""
import json, sys, urllib.request, datetime

start, end, out = sys.argv[1], sys.argv[2], sys.argv[3]
key = sys.argv[4] if len(sys.argv) > 4 else 'DEMO_KEY'

def get(kind):
    url = f'https://api.nasa.gov/DONKI/{kind}?startDate={start}&endDate={end}&api_key={key}'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'marcher-bake'}), timeout=60) as r:
        txt = r.read().decode()
    return json.loads(txt) if txt.strip() else []

cmes = get('CME')
mars = []
for c in cmes:
    best = None
    for a in c.get('cmeAnalyses') or []:
        for e in a.get('enlilList') or []:
            for imp in e.get('impactList') or []:
                if (imp.get('location') or '') == 'Mars':
                    rec = {'cme': c['activityID'], 'start': c['startTime'], 'speed_kms': a.get('speed'),
                           'type': a.get('type'), 'most_accurate': a.get('isMostAccurate'),
                           'run': e.get('modelCompletionTime'), 'arrival': imp.get('arrivalTime'),
                           'glancing': imp.get('isGlancingBlow'), 'minor': imp.get('isMinorImpact'),
                           'link': e.get('link')}
                    k = (bool(a.get('isMostAccurate')), e.get('modelCompletionTime') or '')
                    if best is None or k > best[0]: best = (k, rec)
    if best: mars.append(best[1])
mars.sort(key=lambda r: r['arrival'])
seps = get('SEP')
try:
    flares = get('FLR')
except Exception as ex:  # FLR returned 404 on api.nasa.gov on 2026-11-14
    print('flares skipped:', ex); flares = []
doc = {
    'fetched_utc': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
    'window': [start, end],
    'source': 'NASA CCMC DONKI via api.nasa.gov',
    'cme_count': len(cmes),
    'mars_cme': mars,
    'sep': [{'id': s['sepID'], 'time': s['eventTime'], 'instruments': [i['displayName'] for i in s.get('instruments') or []], 'link': s.get('link')} for s in seps],
    'flares': [{'id': f['flrID'], 'peak': f.get('peakTime'), 'class': f.get('classType'), 'link': f.get('link')} for f in flares if (f.get('classType') or 'C')[0] in 'MX'],
}
json.dump(doc, open(out, 'w'), indent=1)
print(len(cmes), 'CMEs;', len(mars), 'with a Mars arrival;', len(doc['sep']), 'SEP;', len(doc['flares']), 'M/X flares')
for r in mars[-6:]: print(r['arrival'], r['cme'], r['speed_kms'], 'glancing' if r['glancing'] else 'direct')
