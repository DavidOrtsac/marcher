#!/usr/bin/env python3
"""Fetch Curiosity raw-image metadata for the boxwork map (stage 1 of the POV build).

API (reverse engineered from the RawImages React component in
https://mars.nasa.gov/assets/public_manifest-*.js, the bundle behind
https://mars.nasa.gov/msl/multimedia/raw-images/):

  GET https://mars.nasa.gov/api/v1/raw_image_items/
      order=sol desc            sort key(s), comma separated
      per_page=N, page=K        paging (page is 0-based); response has total, more
      condition_1=msl:mission   condition_N = <value>:<field>[:<op>]   op in gte, lte, lt, ...
      condition_2=4500:sol:gte  sol range lower bound   (the page uses this for "begin sol")
      condition_3=5073:sol:lte  sol range upper bound   ("end sol")
      search=NAV_LEFT_B|MAST_LEFT   instrument values joined with '|'
      extended=full::sample_type    <value>::<field>[::op] on the 'extended' JSON; the page
                                    default is thumbnail::sample_type::noteq. Tested: when two
                                    are comma joined only the first is applied, so use one.
                                    %E___DXXX%::url_list::ilike works (SQL ilike on the file URL).

Pacing: one request every >= 1.2 s, stop at the first HTTP 429, stop after 3 errors in a row.
Raw pages are cached, so a re-run only asks for what is missing.

Usage: python3 tools/pov_fetch.py [sol_min] [sol_max]
Output: research/pov/raw_items.json  (all records, de-duplicated by id)
"""
import json, os, sys, time, urllib.parse, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'research', 'pov', 'api_pages')
OUT = os.path.join(ROOT, 'research', 'pov', 'raw_items.json')
API = 'https://mars.nasa.gov/api/v1/raw_image_items/'
UA = 'SpaceApps2026-MARCHER-research/1.0 (low rate, 1 req/s)'
GAP = 1.2
PER = 200

# (label, search string, extended filter)
QUERIES = [
    ('navl', 'NAV_LEFT_A|NAV_LEFT_B', 'full::sample_type'),
    ('mast', 'MAST_LEFT|MAST_RIGHT', 'full::sample_type'),
    ('fhazl', 'FHAZ_LEFT_A|FHAZ_LEFT_B', 'full::sample_type'),
    # Mastcam "full" products are full-CCD readouts (1648 x 1200 with dark margins): mostly raw
    # Bayer 'C' (lossless) frames of sky, dark current and the arm. The colour frames are product
    # type 'E' (JPEG 4:2:2, MMM DPSIS Table 3.9-1), which the API files as 'subframe'.
    # PICNO = SSSSIIFFFFFFLLLXXCCCCCPGV_XXXX, P = product type letter.
    # Only one extended filter is honoured per request, so this one filters on the file name.
    ('mastc', 'MAST_LEFT|MAST_RIGHT', '%E___DXXX%::url_list::ilike'),
]

_last = [0.0]
_errs = [0]


class Stop(Exception):
    pass


def get(params):
    url = API + '?' + urllib.parse.urlencode(params, safe=':|,')
    wait = _last[0] + GAP - time.time()
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
            body = r.read()
        _errs[0] = 0
        return json.loads(body)
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise Stop(f'HTTP 429 on {url}')
        _errs[0] += 1
        print('  error', e.code, url, file=sys.stderr)
    except Exception as e:  # network, JSON
        _errs[0] += 1
        print('  error', e, url, file=sys.stderr)
    if _errs[0] >= 3:
        raise Stop('3 errors in a row')
    return None


def fetch(sol_min, sol_max):
    os.makedirs(CACHE, exist_ok=True)
    items = {}
    for label, search, ext in QUERIES:
        page = 0
        while True:
            fn = os.path.join(CACHE, f'{label}_{sol_min}_{sol_max}_p{page:03d}.json')
            if os.path.exists(fn):
                d = json.load(open(fn))
            else:
                d = get({'order': 'sol desc,date_taken desc', 'per_page': PER, 'page': page,
                         'condition_1': 'msl:mission', 'condition_2': f'{sol_min}:sol:gte',
                         'condition_3': f'{sol_max}:sol:lte', 'search': search, 'extended': ext})
                if d is None:
                    continue  # retry same page (error budget is enforced in get)
                json.dump(d, open(fn, 'w'))
            for it in d['items']:
                items[it['id']] = it
            print(f'{label} page {page}: {len(d["items"])} items, total {d["total"]}')
            if not d.get('more') or not d['items']:
                break
            page += 1
    recs = sorted(items.values(), key=lambda r: (r['sol'], r['date_taken'] or '', r['id']))
    json.dump(recs, open(OUT, 'w'))
    print('wrote', OUT, len(recs), 'records')


if __name__ == '__main__':
    a = sys.argv[1:]
    try:
        fetch(int(a[0]) if a else 4500, int(a[1]) if len(a) > 1 else 5073)
    except Stop as e:
        print('STOPPED:', e, file=sys.stderr)
        sys.exit(2)
