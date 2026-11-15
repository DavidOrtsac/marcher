#!/usr/bin/env python3
"""Extra rover views for the 7 EVA science stops (stage after pov_build.py; same index schema).

For each (site, drive) below:
  Navcam  : up to 10 more frames at horizon level (extended.mast_el -25 .. +10 deg), from any
            Navcam eye and product type (full, subframe, mixed, downsampled) taken at exactly that
            site/drive on any sol parked there, chosen greedily for new azimuth coverage
            (counting the stop's existing Navcam). Saved at native size up to 1024 px.
  Mastcam : up to 6 colour frames (product type 'E') at that site/drive with PDS4 pointing
            (sols <= 4843): horizon-level first, then the drill target, workspace documentation
            and DRT brush spots; rover-hardware frames (SAM inlet, drill bit, wheels, cal target,
            sky) skipped; picks spread over pointings. Saved up to 1024 px.
  Budget  : about 30 MB on top of the main set.

Stages
  python3 tools/pov_enrich.py fetch     Navcam metadata for each stop's sols (paced, cached)
  python3 tools/pov_enrich.py select    -> research/pov/enrich_selection.json
  python3 tools/pov_enrich.py labels    PDS4 labels for the chosen Mastcam frames
  python3 tools/pov_enrich.py download  -> app/data/pov/img/, research/pov/enrich_downloaded.json
  then  python3 tools/pov_build.py index   (merges these into index.json)
  and   python3 tools/pov_enrich.py skyline  (DEM skyline alignment on the new Navcam frames)
"""
import json, math, os, sys, collections
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pov_build as B
import pov_geom as G

STOPS = {'116_1944': 'Altadena', '117_1122': 'Volcan Pena Blanca', '118_198': 'Salar de Agua Amara',
         '118_1752': 'Rio Frio wall', '119_846': 'Monte Grande hollow', '120_82': 'Nevado Sajama ridge',
         '120_2366': 'Timboy Chaco'}
CACHE = os.path.join(B.RES, 'api_pages')
SEL = os.path.join(B.RES, 'enrich_selection.json')
GOT = os.path.join(B.RES, 'enrich_downloaded.json')
BUDGET = 30.0e6
NAV_MAX, MAST_MAX = 10, 6
API = 'https://mars.nasa.gov/api/v1/raw_image_items/'


def stop_sols():
    raw = B.load_raw()
    st = B.build_stops(raw)
    out = {}
    for k in STOPS:
        s = st[tuple(map(int, k.split('_')))]
        ss = s['sols'] + ([s['wp_sol']] if s.get('wp_sol') else [])
        out[k] = [min(ss) - 1, max(ss) + 1]      # arrival sol and a margin; records are filtered by site/drive
    return out, st


def fetch():
    import urllib.parse
    sols, _ = stop_sols()
    os.makedirs(CACHE, exist_ok=True)
    recs = {}
    for k, ss in sols.items():
        lo, hi = min(ss), max(ss)
        page = 0
        while True:
            fn = os.path.join(CACHE, f'enrich_nav_{lo}_{hi}_p{page:03d}.json')
            if os.path.exists(fn):
                d = json.load(open(fn))
            else:
                q = {'order': 'sol desc,date_taken desc', 'per_page': 200, 'page': page, 'condition_1': 'msl:mission',
                     'condition_2': f'{lo}:sol:gte', 'condition_3': f'{hi}:sol:lte',
                     'search': 'NAV_LEFT_A|NAV_LEFT_B|NAV_RIGHT_A|NAV_RIGHT_B',
                     'extended': 'thumbnail::sample_type::noteq'}
                b = B.http_get(API + '?' + urllib.parse.urlencode(q, safe=':|,'))
                if b is None:
                    raise SystemExit('fetch failed')
                d = json.loads(b)
                json.dump(d, open(fn, 'w'))
            for it in d['items']:
                if f"{it['site']}_{it['drive']}" in STOPS:
                    recs[it['id']] = it
            print(k, f'sols {lo}-{hi} page {page}: {len(d["items"])} of {d["total"]}')
            if not d.get('more') or not d['items']:
                break
            page += 1
    json.dump(sorted(recs.values(), key=lambda r: r['id']), open(os.path.join(B.RES, 'enrich_nav_items.json'), 'w'))
    print('Navcam records at the 7 stops:', len(recs))


def az_cov(az, hf):
    return set((np.arange(int(math.floor(az - hf / 2)), int(math.ceil(az + hf / 2))) % 360).tolist())


def sep_deg(az1, el1, az2, el2):
    a1, e1, a2, e2 = map(math.radians, (az1, el1, az2, el2))
    c = math.sin(e1) * math.sin(e2) + math.cos(e1) * math.cos(e2) * math.cos(a1 - a2)
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


BAD_MAST = ('inlet', 'drill bit', 'wheel', 'calibration', 'cal target', 'sky', 'sun', 'tau', 'cloud',
            'dust devil', 'deck', 'chimra', 'scoop', 'apxs', 'rover')


def select():
    _, stops = stop_sols()
    idx = json.load(open(os.path.join(B.OUTD, 'index.json')))
    have = {im['id'] for im in idx['images']}
    navrecs = json.load(open(os.path.join(B.RES, 'enrich_nav_items.json')))
    mi = B.mast_index()
    raw = B.load_raw()
    byid = {r['imageid'][:22]: r for r in raw if r['instrument'].startswith('MAST') and r['imageid'][22] == 'E'}
    picks, report = [], {}
    for key, name in STOPS.items():
        sd = tuple(map(int, key.split('_')))
        st = stops[sd]
        cov = set()
        for im in idx['images']:
            if (im['site'], im['drive']) == sd and im['kind'] == 'nav':
                cov |= az_cov(im['az'], im['hfov'])
        cov0 = len(cov)
        def nav_cands(lo, hi, taken):
            out = []
            for r in navrecs:
                if (r['site'], r['drive']) != sd or not r['camera_model_component_list'] or not r['attitude']:
                    continue
                if r['imageid'].rstrip('_') in have or r['imageid'] in taken or not (lo <= float(r['extended']['mast_el']) <= hi):
                    continue
                g = B.eng_geometry(r, st)
                q = math.sqrt(min(1.0, g['width'] * g['height'] / 1024.0 ** 2))
                out.append((r, g, q))
            return out

        chosen_nav = []

        def greedy(cands, min_new, relaxed):
            while len(chosen_nav) < NAV_MAX and cands:
                best = None
                for c in cands:
                    r, g, q = c
                    new = len(az_cov(g['az_site'], g['hfov']) - cov)
                    v = new * q * (1.0 - 0.01 * abs(g['el_site'] + 8.0)) * (1.0 if 'LEFT' in r['instrument'] else 0.98)
                    if best is None or v > best[0]:
                        best = (v, c)
                if best[0] < min_new:
                    break
                r, g, q = best[1]
                cov.update(az_cov(g['az_site'], g['hfov']))
                cands.remove(best[1])
                chosen_nav.append(dict(kind='nav', key=key, site=sd[0], drive=sd[1], id=r['imageid'], sol=r['sol'], url=r['url'],
                                       rec=r, est=290e3 * g['width'] * g['height'] / 1024.0 ** 2, az=g['az_site'], el=g['el_site'],
                                       mast_el=float(r['extended']['mast_el']), size=[g['width'], g['height']],
                                       product=r['extended']['sample_type'], relaxed=relaxed))
        cands = nav_cands(-25.0, 10.0, set())
        n_strict = len(cands)
        greedy(cands, 5.0, False)
        if len(cov) < 270:
            # sparse stop (Monte Grande): fill uncovered directions from frames just outside the window
            greedy(nav_cands(-50.0, 25.0, {c['id'] for c in chosen_nav}), 10.0, True)
        # Mastcam colour with PDS pointing
        mc = []
        for k22, d in mi.items():
            if (int(d['ROVER_MOTION_COUNTER:SITE']), int(d['ROVER_MOTION_COUNTER:DRIVE'])) != sd or k22 not in byid:
                continue
            r = byid[k22]
            rat = d['RATIONALE_DESC'].lower()
            if r['imageid'].rstrip('_') in have or any(b in rat for b in BAD_MAST):
                continue
            el, az = float(d['FIXED_INSTRUMENT_ELEVATION']), float(d['FIXED_INSTRUMENT_AZIMUTH']) % 360
            W, H = int(d['IMAGE:LINE_SAMPLES']), int(d['IMAGE:LINES'])
            rank = 0 if el >= -15 else 1 if ('drill target' in rat or 'boresight' in rat) else 2 if 'workspace' in rat \
                else 3 if 'dust removal tool' in rat else 4
            hf = math.degrees(W * (0.218e-3 if r['instrument'] == 'MAST_LEFT' else 0.0738e-3))
            mc.append((rank, -W * H, az, el, hf, r, d))
        mc.sort(key=lambda t: (t[0], t[1]))
        chosen_m = []
        for rank, nwh, az, el, hf, r, d in mc:
            if len(chosen_m) >= MAST_MAX:
                break
            if any(sep_deg(az, el, c['az'], c['el']) < 0.6 * hf for c in chosen_m):
                continue
            W, H = int(d['IMAGE:LINE_SAMPLES']), int(d['IMAGE:LINES'])
            s_ = min(1.0, B.MAST_PX / max(W, H))
            chosen_m.append(dict(kind='mast', cls=['horizon', 'drill_target', 'workspace', 'drt', 'other'][rank], key=key,
                                 site=sd[0], drive=sd[1], id=r['imageid'], sol=r['sol'], url=r['url'], az=az, el=el,
                                 est=0.23 * W * H * s_ * s_, size=[W, H], rationale=d['RATIONALE_DESC'],
                                 pds_path=d['PATH_NAME'] + d['PRODUCT_ID'].lower() + '.xml'))
        picks += chosen_nav + chosen_m
        nrel = sum(c['relaxed'] for c in chosen_nav)
        report[key] = dict(name=name, nav_existing_cov_deg=cov0, nav_cov_deg=len(cov), nav_added=len(chosen_nav),
                           nav_outside_window=nrel, mast_added=len(chosen_m), nav_candidates_in_window=n_strict,
                           mast_candidates=len(mc))
        print(f"{key:9s} {name:22s} navcam +{len(chosen_nav)} ({nrel} outside window) (cov {cov0} -> {len(cov)} deg, "
              f"{n_strict} in-window candidates)  mastcam +{len(chosen_m)} of {len(mc)}  "
              f"{collections.Counter(c['product'] for c in chosen_nav)} {collections.Counter(c['cls'] for c in chosen_m)}")
    est = sum(p['est'] for p in picks)
    print('picks', len(picks), 'est %.1f MB' % (est / 1e6))
    json.dump(dict(picks=picks, report=report), open(SEL, 'w'), indent=1)


def labels():
    sel = json.load(open(SEL))
    d = os.path.join(B.RES, 'pds', 'labels')
    for c in sel['picks']:
        if c['kind'] == 'mast':
            fn = os.path.join(d, os.path.basename(c['pds_path']))
            if not os.path.exists(fn):
                b = B.http_get(B.PDS_MMM + c['pds_path'])
                if b:
                    open(fn, 'wb').write(b)
                    print('label', os.path.basename(fn))


def download():
    from PIL import Image
    sel = json.load(open(SEL))
    os.makedirs(B.ORIG, exist_ok=True)
    total, kept = 0, []
    for c in sel['picks']:
        if c['kind'] == 'mast' and not os.path.exists(os.path.join(B.RES, 'pds', 'labels', os.path.basename(c['pds_path']))):
            continue
        name = c['id'].rstrip('_') + '.jpg'
        out = os.path.join(B.OUTD, 'img', name)
        if not os.path.exists(out):
            src = os.path.join(B.ORIG, os.path.basename(c['url']))
            if not os.path.exists(src):
                b = B.http_get(c['url'])
                if not b:
                    continue
                open(src, 'wb').write(b)
            im = Image.open(src)
            im.load()
            w, h = im.size
            s = min(1.0, 1024.0 / max(w, h))
            if s < 1.0:
                im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
            im = im.convert('RGB') if c['kind'] == 'mast' else im.convert('L')
            im.save(out, 'JPEG', quality=85, optimize=True)
        sz = os.path.getsize(out)
        if total + sz > BUDGET:
            os.remove(out)
            print('budget reached')
            break
        total += sz
        kept.append(dict(id=c['id'], file=name, bytes=sz))
    json.dump(kept, open(GOT, 'w'), indent=1)
    print('enrich images', len(kept), '%.2f MB' % (total / 1e6))


def skyline(png_ids=''):
    sel = json.load(open(SEL))
    got = {d['id'].rstrip('_') for d in json.load(open(GOT))}
    ids = [c['id'].rstrip('_') for c in sel['picks'] if c['kind'] == 'nav' and c['id'].rstrip('_') in got]
    res = []
    B.render_check(*ids, png=False, results=res)
    ok = [r for r in res if not r['at_bound']]
    out = {'frames_tried': len(ids), 'frames_with_dem_silhouette': len(res), 'at_search_bound': len(res) - len(ok),
           'dx_deg (azimuth-like)': {**B.signed([r['dx_deg'] for r in ok]), **B.stats([r['dx_deg'] for r in ok])},
           'dy_deg (elevation-like)': {**B.signed([r['dy_deg'] for r in ok]), **B.stats([r['dy_deg'] for r in ok])},
           'per_frame': res}
    ver = json.load(open(os.path.join(B.RES, 'verify.json')))
    ver['h_dem_skyline_eva_navcam'] = out
    json.dump(ver, open(os.path.join(B.RES, 'verify.json'), 'w'), indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != 'per_frame'}))
    if png_ids:
        B.render_check(*png_ids.split(','))


if __name__ == '__main__':
    globals()[sys.argv[1]](*sys.argv[2:])
