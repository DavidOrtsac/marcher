#!/usr/bin/env python3
"""Rover point-of-view (POV) images for the MARCHER planner: Curiosity at Mount Sharp boxwork.

WHAT IT MAKES
  app/data/pov/index.json   every rover stop inside the map (sols 4500-5073) with its position,
                            and the curated images with camera position, look, up, FOV, corners
  app/data/pov/img/*.jpg    resized copies (JPEG q85; Navcam <= 768 px, Front Hazcam <= 640 px,
                            Mastcam <= 1024 px) of the curated raw images, about 60 MB in all
  research/pov/verify.json  convention checks with residuals (see VERIFICATION below)

STAGES (run in order; each caches its inputs)
  python3 tools/pov_fetch.py 4500 5073      API metadata -> research/pov/raw_items.json
  python3 tools/pov_build.py verify         frame-convention checks against the waypoints
  python3 tools/pov_build.py select         choose views per stop -> research/pov/selection.json
  python3 tools/pov_build.py labels         PDS4 Mastcam labels (camera model) for chosen frames
  python3 tools/pov_build.py verify_mast    Mastcam label geometry vs PDS index angles + waypoints
  python3 tools/pov_build.py download       fetch + resize the chosen images (<= 1 req/1.2 s)
  python3 tools/pov_build.py index          write app/data/pov/index.json
  python3 tools/pov_build.py check 118_924 ...      top-down PNGs per stop (site_drive keys)
  python3 tools/pov_build.py render_check <id> ...  DEM ray-cast skyline overlaid on the photo
  python3 tools/pov_build.py render_stats 70        skyline alignment over a Navcam sample
  python3 tools/pov_build.py validate               integrity checks on index.json
  Extra views for the 7 EVA science stops: tools/pov_enrich.py (fetch, select, labels, download),
  merged by 'index' when research/pov/enrich_*.json exist.
  Mastcam index tables (RAW_INDEX_0040..0042.CSV, stored gzipped, + raw_index_0042.xml) are
  read from research/pov/pds/, fetched once from .../msl_mmm/miscellaneous_MSLMST/volume_00NN/.

INPUTS
  Waypoints: MMGIS MSL_waypoints.json (https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/
    MSL_waypoints.json), one localized 'final' position per (site, drive): easting/northing in
    the map projection (Mars 2000 sphere equirectangular, R 3396190 m, centre lon 0),
    elev_geoid, roll/pitch/yaw in degrees.
  Raw images: https://mars.nasa.gov/api/v1/raw_image_items/ (see pov_fetch.py for the query
    syntax). Navcam NAV_LEFT_B, Front Hazcam FHAZ_LEFT_B (both 'full', 1024 x 1024, CAHVOR /
    CAHVORE models in the record), Mastcam MAST_LEFT/MAST_RIGHT colour products (type 'E').
  Mastcam pointing: the API has no geometry for Mastcam (MSSS products), so it comes from the
    PDS4 labels of the msl_mmm bundle, which (Release 42) reach sol 4843. Later Mastcam frames
    have no published pointing yet and are left out. Mastcam 'full' products are full-CCD raw
    Bayer readouts (sky, dark, arm); the colour frames are product type 'E' (JPEG 4:2:2).

CURATION (stage 'select')
  Candidates per stop: Navcam frames with mast_el in [-20, +10] deg; Mastcam colour frames with
  site-frame elevation in [-15, +10] deg (PDS rationales: 'Periodic documentation of the
  terrain along the traverse', 'To supplement Navcam coverage in drive direction'), plus contact-
  science workspace / DRT close-ups as a fallback colour view; the first Front Hazcam frame
  after arrival (arm normally stowed). Everything competes in one greedy pick by value per byte
  until the budget is used: a Navcam frame is worth the azimuth degrees it adds that are not
  already shown from this stop or from a stop within 25 m (weight falls linearly to 0 at 25 m),
  with a bonus for the first horizon view at a stop and a 0.7 factor for low views over the
  rover's rear deck (rover az 110-250, el < -5); each waypoint stop gets one Front Hazcam
  frame; the first Mastcam colour frame at a stop is worth more than a Navcam frame, up to 3.
  The download stage then takes the picks in that order until 59.5 MB of saved files.

FRAMES AND CONVENTIONS: see the docstring of pov_geom.py (sources quoted there). In short:
  camera model, camera_position, camera_vector, mast_az/el : rover nav frame (RNAV) at the
    image's (site, drive); RNAV = +X forward, +Y right, +Z down, origin on the ground under
    the turn-in-place axis.
  attitude : quaternion (s, v1, v2, v3), v_site = R(q) v_rnav.
  xyz      : RNAV origin in the SITE frame (+X north, +Y east, +Z down), metres.

POSITION OF A CAMERA ON THE MAP
  rover (E, N, elev): the waypoint for the image's (site, drive). If that (site, drive) has no
    waypoint (mid-drive imaging), take the nearest waypoint of the same site that has an xyz
    (from its own images) and add (xyz_image - xyz_waypoint), i.e. the telemetry displacement
    in the site frame; the site origin itself is never needed, only the local displacement,
    which keeps the dead-reckoning drift small. North/east map scale: the equirectangular
    map is true-scale north-south; east-west map metres = ground metres / cos(lat), applied.
  camera = rover + R(q) C, then app frame: X = E - 8144000, Y = elev + 3863, Z = -(N + 285200).
  look/up/corners = R(q) rays from the camera model, (N, E, D) -> app (k E, -D, -N), normalised
    (k = 1/cos(lat), the same east-west stretch as the map, < 0.1 deg; up re-orthogonalised).

VERIFICATION (stage 'verify', results printed and saved): (a) yaw/pitch/roll from 'attitude'
  vs waypoint yaw/pitch/roll; (b) Front Hazcam boresight in the site frame vs rover heading and
  the nominal 45 deg depression; (c) derived boresight vs extended.mast_az/mast_el, and site
  azimuth vs mast_az + yaw; (d) xyz displacements vs waypoint map displacements within a
  site (heading bias and scale of the site frame vs the map); (e) waypoint elevation vs the
  app DEM; (f) Mastcam PDS4 label geometry vs the PDS index angles (verify_mast); (g) end to end:
  DEM ray-cast skyline vs the photo, best-fit angular shift over a Navcam sample (render_stats).

Credit for every image: NASA/JPL-Caltech (Mastcam: NASA/JPL-Caltech/MSSS).
"""
import json, math, os, sys, collections, statistics, tempfile
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pov_geom as G

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'research', 'pov')
OUTD = os.path.join(ROOT, 'app', 'data', 'pov')
WP_FILE = os.environ.get('MSL_WP', os.path.join(ROOT, 'research', 'pov', 'msl_wp.json'))
SITE_JSON = os.path.join(ROOT, 'app', 'data', 'site.json')
X0, X1, Y0, Y1 = 8142400.0, 8145600.0, -286800.0, -283600.0
EC, NC, BASE = 8144000.0, -285200.0, -3863.0
SOL0, SOL1 = 4500, 5073
R_MARS = 3396190.0


def load_wp():
    d = json.load(open(WP_FILE))
    wp = {}
    for f in d['features']:
        p = f['properties']
        if X0 <= p['easting'] <= X1 and Y0 <= p['northing'] <= Y1 and SOL0 <= p['sol'] <= SOL1:
            wp[(p['site'], p['drive'])] = p
    return wp


def load_raw():
    return json.load(open(os.path.join(RES, 'raw_items.json')))


def eng_records(raw):
    """Engineering-camera records with full geometry."""
    out = []
    for r in raw:
        if r['instrument'] in ('NAV_LEFT_B', 'NAV_LEFT_A', 'FHAZ_LEFT_B', 'FHAZ_LEFT_A') and r['attitude'] \
                and r['camera_model_component_list'] and r['subframe_rect'] == '(1,1,1024,1024)':
            out.append(r)
    return out


def rnav_to_site(r):
    return G.quat_to_R(G.vec(r['attitude']))


def stats(xs):
    xs = [abs(x) for x in xs]
    if not xs:
        return {}
    xs.sort()
    return {'n': len(xs), 'median_abs': round(statistics.median(xs), 4),
            'p95_abs': round(xs[min(len(xs) - 1, int(0.95 * len(xs)))], 4), 'max_abs': round(xs[-1], 4)}


def signed(xs):
    return {'mean': round(statistics.mean(xs), 4), 'sd': round(statistics.pstdev(xs), 4)} if xs else {}


# ------------------------------------------------------------------------------------------
def verify():
    wp = load_wp()
    raw = load_raw()
    eng = eng_records(raw)
    by_sd = collections.defaultdict(list)
    for r in eng:
        by_sd[(r['site'], r['drive'])].append(r)
    out = {}

    # (a) attitude -> yaw/pitch/roll vs waypoint, three candidate conventions
    conv = {'(s,v1,v2,v3) rnav->site': lambda q: G.quat_to_R(q),
            '(v1,v2,v3,s) rnav->site': lambda q: G.quat_to_R([q[3], q[0], q[1], q[2]]),
            '(s,v1,v2,v3) site->rnav (inverse)': lambda q: G.quat_to_R(q).T}
    res = {k: {'yaw': [], 'pitch': [], 'roll': []} for k in conv}
    n_stops = 0
    per_stop = []
    for sd, p in sorted(wp.items()):
        rs = by_sd.get(sd)
        if not rs:
            continue
        n_stops += 1
        q = G.vec(rs[-1]['attitude'])  # attitude is constant within a (site, drive)
        for k, f in conv.items():
            y, pi, ro = G.ypr_from_R(f(q))
            res[k]['yaw'].append(G.wrap(y - p['yaw']))
            res[k]['pitch'].append(pi - p['pitch'])
            res[k]['roll'].append(ro - p['roll'])
        y, pi, ro = G.ypr_from_R(G.quat_to_R(q))
        per_stop.append((sd, p['sol'], round(y, 2), p['yaw'], round(pi, 2), p['pitch'], round(ro, 2), p['roll']))
    out['a_attitude_vs_waypoint'] = {'stops': n_stops, **{k: {c: stats(v) for c, v in d.items()} for k, d in res.items()}}
    # attitude constant within a (site, drive)?
    spread = []
    for sd, rs in by_sd.items():
        ys = [G.ypr_from_R(rnav_to_site(r))[0] for r in rs]
        spread.append(max(G.wrap(y - ys[0]) for y in ys) - min(G.wrap(y - ys[0]) for y in ys))
    out['a_attitude_yaw_spread_within_site_drive_deg'] = stats(spread)
    print('(a) stops with waypoint + images:', n_stops)
    for k in conv:
        print('   ', k, {c: stats(v) for c, v in res[k].items()})
    print('    first 12 stops (site,drive) sol | yaw derived, waypoint | pitch | roll')
    for row in per_stop[:12]:
        print('     ', row)

    # (b) Front Hazcam boresight
    fa, fe_rnav, fe_site, fe_res, frl = [], [], [], [], []
    a_vecs = []
    for r in eng:
        if not r['instrument'].startswith('FHAZ'):
            continue
        m = G.parse_cmod(r['camera_model_component_list'], r['camera_model_type'])
        look = G.ray(m, 511.5, 511.5)
        a_vecs.append(m['A'])
        R = rnav_to_site(r)
        ls = R @ look
        yaw, pitch, roll = G.ypr_from_R(R)
        az_s, el_s = G.az_el(ls)
        az_r, el_r = G.az_el(look)
        fa.append(G.wrap(az_s - yaw))
        frl.append(roll)
        fe_rnav.append(el_r)
        fe_site.append(el_s)
        # expected site-frame elevation if the camera is fixed at el_r on a tilted chassis
        fe_res.append(el_s - el_r - pitch * math.cos(math.radians(az_r)) - roll * math.sin(math.radians(az_r)))
    a_vecs = np.array(a_vecs)
    # a body-fixed camera 44.5 deg down: chassis roll swings its site azimuth by ~ -tan(44.5) * roll
    X = np.vstack([frl, np.ones(len(frl))]).T
    (kr, br), *_ = np.linalg.lstsq(X, np.array(fa), rcond=None)
    rr = np.array(fa) - (kr * np.array(frl) + br)
    out['b_front_hazcam_az_vs_roll'] = {'slope_deg_per_deg_roll': round(float(kr), 3), 'offset_deg': round(float(br), 3),
                                        'corr': round(float(np.corrcoef(frl, fa)[0, 1]), 4),
                                        'residual_sd_deg': round(float(rr.std()), 3), 'residual_max_deg': round(float(np.abs(rr).max()), 3)}
    out['b_front_hazcam'] = {
        'images': len(fa),
        'site_az_minus_rover_yaw_deg': {**signed(fa), **stats(fa)},
        'rnav_elevation_deg': signed(fe_rnav),
        'site_elevation_deg': signed(fe_site),
        'site_el_minus_(rnav_el + pitch)_deg': {**signed(fe_res), **stats(fe_res)},
        'A_vector_rnav_sd': [round(float(s), 5) for s in a_vecs.std(axis=0)],
        'A_vector_rnav_mean': [round(float(s), 4) for s in a_vecs.mean(axis=0)]}
    print('(b) FHAZ', json.dumps(out['b_front_hazcam']), json.dumps(out['b_front_hazcam_az_vs_roll']))

    # (c) Navcam boresight vs mast_az/mast_el, and site az vs mast_az + yaw
    d_az, d_el, d_site, d_site_lvl, d_cv, d_cv512 = [], [], [], [], [], []
    for r in eng:
        if not r['instrument'].startswith('NAV'):
            continue
        ex = r['extended']
        if ex.get('mast_az') is None:
            continue
        m = G.parse_cmod(r['camera_model_component_list'], r['camera_model_type'])
        look = G.ray(m, 511.5, 511.5)
        az_r, el_r = G.az_el(look)
        maz, mel = float(ex['mast_az']), float(ex['mast_el'])
        d_az.append(G.wrap(az_r - maz))
        d_el.append(el_r - mel)
        cvec = G.vec(r['camera_vector']) / np.linalg.norm(G.vec(r['camera_vector']))
        d_cv.append(G.angle(look, cvec))
        d_cv512.append(G.angle(G.ray(m, 512.0, 512.0), cvec))
        R = rnav_to_site(r)
        yaw, pitch, roll = G.ypr_from_R(R)
        az_s, el_s = G.az_el(R @ look)
        d_site.append(G.wrap(az_s - (maz + yaw)))
        if -20 <= mel <= 10:
            d_site_lvl.append(G.wrap(az_s - (maz + yaw)))
    out['c_navcam'] = {
        'images': len(d_az),
        'rnav_az_minus_mast_az_deg': stats(d_az), 'rnav_el_minus_mast_el_deg': stats(d_el),
        'site_az_minus_(mast_az+yaw)_deg_all': {**signed(d_site), **stats(d_site)},
        'site_az_minus_(mast_az+yaw)_deg_mast_el_-20..10': {**signed(d_site_lvl), **stats(d_site_lvl)},
        'angle_boresight_to_camera_vector_deg': stats(d_cv),
        'angle_ray_through_pixel_512_512_to_camera_vector_deg': stats(d_cv512)}
    print('(c) NAV', json.dumps(out['c_navcam']))

    # (d) xyz displacement vs waypoint map displacement within a site
    pts = collections.defaultdict(list)
    for sd, p in wp.items():
        rs = by_sd.get(sd)
        if rs:
            pts[sd[0]].append((sd[1], G.vec(rs[-1]['xyz']), p))
    rot, scl, resid, dz = [], [], [], []
    origin_spread = {}
    for site, lst in sorted(pts.items()):
        lst.sort(key=lambda t: t[0])
        org = []
        for d, xyz, p in lst:
            k = 1.0 / math.cos(math.radians(p['lat']))
            org.append((p['northing'] - xyz[0], p['easting'] - k * xyz[1], p['elev_geoid'] + xyz[2]))
        org = np.array(org)
        origin_spread[site] = {'n': len(lst), 'sd_N_E_up_m': [round(float(s), 2) for s in org.std(axis=0)],
                               'range_N_E_up_m': [round(float(s), 2) for s in (org.max(0) - org.min(0))]}
        for (d0, x0, p0), (d1, x1, p1) in zip(lst, lst[1:]):
            k = 1.0 / math.cos(math.radians(p0['lat']))
            dm = np.array([p1['northing'] - p0['northing'], (p1['easting'] - p0['easting']) / k])
            dx = (x1 - x0)[:2]
            if np.linalg.norm(dm) < 5:
                continue
            a_m = math.degrees(math.atan2(dm[1], dm[0]))
            a_x = math.degrees(math.atan2(dx[1], dx[0]))
            rot.append(G.wrap(a_m - a_x))
            scl.append(np.linalg.norm(dm) / np.linalg.norm(dx))
            resid.append(float(np.linalg.norm(dm - dx)))
            dz.append(float((p1['elev_geoid'] - p0['elev_geoid']) - (-(x1[2] - x0[2]))))
    out['d_xyz_vs_map'] = {
        'pairs': len(rot), 'heading_of_map_step_minus_xyz_step_deg': {**signed(rot), **stats(rot)},
        'length_ratio_map_over_xyz': signed(scl),
        'step_vector_difference_m': stats(resid), 'step_elev_difference_m': {**signed(dz), **stats(dz)},
        'site_origin_estimates_spread': origin_spread}
    print('(d) xyz vs map', json.dumps({k: v for k, v in out['d_xyz_vs_map'].items() if k != 'site_origin_estimates_spread'}))
    print('    site origin spread', json.dumps(origin_spread))

    # (e) waypoint elevation vs app DEM (2 m grid)
    try:
        from PIL import Image
        sj = json.load(open(SITE_JSON))
        im = np.asarray(Image.open(os.path.join(ROOT, 'app', 'data', sj['dem_2m']['file'])).convert('RGB')).astype(np.float64)
        dem = sj['height']['base_m'] + (im[..., 0] * 256 + im[..., 1]) * sj['height']['scale_m']
        n = sj['dem_2m']['n']
        res_m = sj['size_m'] / n
        de = []
        for p in wp.values():
            # pixel-is-area grid; bilinear
            fx = (p['easting'] - sj['x0']) / res_m - 0.5
            fy = (sj['y1'] - p['northing']) / res_m - 0.5
            i0, j0 = int(math.floor(fx)), int(math.floor(fy))
            tx, ty = fx - i0, fy - j0
            i0 = min(max(i0, 0), n - 2)
            j0 = min(max(j0, 0), n - 2)
            z = (dem[j0, i0] * (1 - tx) * (1 - ty) + dem[j0, i0 + 1] * tx * (1 - ty) +
                 dem[j0 + 1, i0] * (1 - tx) * ty + dem[j0 + 1, i0 + 1] * tx * ty)
            de.append(p['elev_geoid'] - z)
        out['e_waypoint_elev_minus_dem2m_m'] = {**signed(de), **stats(de)}
        print('(e) waypoint elev - DEM', out['e_waypoint_elev_minus_dem2m_m'])
    except Exception as e:
        print('(e) skipped:', e)

    os.makedirs(RES, exist_ok=True)
    json.dump(out, open(os.path.join(RES, 'verify.json'), 'w'), indent=1)
    print('wrote', os.path.join(RES, 'verify.json'))



# ------------------------------------------------------------------------------------------
# Stops and rover positions
def load_wp_all():
    d = json.load(open(WP_FILE))
    return {(f['properties']['site'], f['properties']['drive']): f['properties'] for f in d['features']}


def mast_index():
    """PDS4 Mastcam RAW_INDEX rows (volumes 40-42), keyed by the 22-char PICNO prefix
    (sol, camera, sequence, command, CDPID counter + CDPID), shared by all compression variants."""
    import csv, glob, gzip, re
    X = open(os.path.join(RES, 'pds', 'raw_index_0042.xml')).read()
    names = re.findall(r'<Field_Delimited>\s*<name>([^<]+)</name>', X)
    out = {}
    for f in sorted(glob.glob(os.path.join(RES, 'pds', 'RAW_INDEX_*.CSV*'))):
        fh = gzip.open(f, 'rt', newline='') if f.endswith('.gz') else open(f, newline='')
        for row in csv.reader(fh):
            d = dict(zip(names, row))
            if SOL0 <= int(d['PLANET_DAY_NUMBER']) <= SOL1 and d['PRODUCT_ID'][22] == 'E':
                out[d['PRODUCT_ID'][:22]] = d
    return out


def build_stops(raw):
    """(site, drive) -> stop dict with map position. Rover position from the waypoint, else from
    the nearest same-site waypoint plus the site-frame telemetry displacement."""
    wpa = load_wp_all()
    eng = [r for r in eng_records(raw) if SOL0 <= r['sol'] <= SOL1]
    xyz = collections.defaultdict(list)   # telemetry rover position in site frame per (site, drive)
    att = collections.defaultdict(list)
    sols = collections.defaultdict(set)
    for r in eng:
        sd = (r['site'], r['drive'])
        xyz[sd].append(G.vec(r['xyz']))
        att[sd].append(G.vec(r['attitude']))
        sols[sd].add(r['sol'])
    mi = mast_index()
    for d in mi.values():
        sd = (int(d['ROVER_MOTION_COUNTER:SITE']), int(d['ROVER_MOTION_COUNTER:DRIVE']))
        if d['ORIGIN_OFFSET_VECTOR:X']:
            xyz[sd].append(np.array([float(d['ORIGIN_OFFSET_VECTOR:' + c]) for c in 'XYZ']))
        sols[sd].add(int(d['PLANET_DAY_NUMBER']))
    stops = {}
    for sd in sols:
        x = np.median(np.array(xyz[sd]), axis=0) if xyz[sd] else None
        p = wpa.get(sd)
        if p:
            st = dict(E=p['easting'], N=p['northing'], elev=p['elev_geoid'], lat=p['lat'],
                      source='waypoint', yaw=p['yaw'], wp_sol=p['sol'])
        else:
            if x is None:
                continue
            refs = [(abs(d2 - sd[1]), d2) for (s2, d2) in wpa if s2 == sd[0] and xyz.get((s2, d2))]
            if not refs:
                continue
            _, d2 = min(refs)
            q = wpa[(sd[0], d2)]
            x2 = np.median(np.array(xyz[(sd[0], d2)]), axis=0)
            k = 1.0 / math.cos(math.radians(q['lat']))
            dx = x - x2
            st = dict(E=q['easting'] + k * dx[1], N=q['northing'] + dx[0], elev=q['elev_geoid'] - dx[2],
                      lat=q['lat'], source=f'site {sd[0]} drive {d2} waypoint + xyz displacement '
                                           f'({np.linalg.norm(dx):.1f} m)', yaw=None, wp_sol=None)
            if att[sd]:
                st['yaw'] = G.ypr_from_R(G.quat_to_R(att[sd][-1]))[0]
        if not (X0 <= st['E'] <= X1 and Y0 <= st['N'] <= Y1):
            continue
        st.update(site=sd[0], drive=sd[1], sols=sorted(sols[sd]), xyz_site=None if x is None else [round(float(v), 3) for v in x])
        stops[sd] = st
    return stops


def eng_geometry(r, st):
    """Full geometry of an engineering-camera image in the app frame."""
    m = G.parse_cmod(r['camera_model_component_list'], r['camera_model_type'])
    # product size = subframe_rect width x height (already in the product's own pixels: e.g.
    # downsampled (1,1,512,512) scale 2 is a 512 x 512 image); verified against the models,
    # whose centre ray then equals mast_az/mast_el for full, subframe, mixed and downsampled
    sx, sy, W, H = [int(t) for t in r['subframe_rect'].strip('()').split(',')]
    look, up, hf, vf, corners = G.view(m, W, H)
    R = G.quat_to_R(G.vec(r['attitude']))
    return finish_geometry(m['C'], R, look, up, hf, vf, corners, W, H, st)


def finish_geometry(C_rnav, R, look, up, hf, vf, corners, W, H, st):
    k = 1.0 / math.cos(math.radians(st['lat']))
    off = R @ C_rnav                              # camera offset from RNAV origin, (N, E, D)
    E = st['E'] + k * off[1]
    N = st['N'] + off[0]
    el = st['elev'] - off[2]
    ls = R @ look
    az_s, el_s = G.az_el(ls)
    la = G.ned_to_app_dir(ls, k)
    ua = G.ned_to_app_dir(R @ up, k)
    ua = ua - np.dot(ua, la) * la
    ua /= np.linalg.norm(ua)
    return dict(
        pos=[round(E - EC, 3), round(el - BASE, 3), round(-(N - NC), 3)],
        look=[round(float(v), 5) for v in la],
        up=[round(float(v), 5) for v in ua],
        corners=[[round(float(v), 4) for v in G.ned_to_app_dir(R @ c, k)] for c in corners],
        hfov=round(hf, 3), vfov=round(vf, 3), width=W, height=H,
        az_site=round(az_s % 360.0, 2), el_site=round(el_s, 2))


# ------------------------------------------------------------------------------------------
# Selection
BUDGET = 62.0e6       # estimate; the download stage stops at 59.5 MB of real files
NAV_PX, FHAZ_PX, MAST_PX = 768, 640, 1024
# mean saved bytes measured on this set (nav 768: 165 kB, fhaz 640: 76 kB, mast: 0.23 B/px)
EST = {'nav': {1024: 290e3, 768: 165e3, 640: 120e3}, 'fhaz': {1024: 220e3, 768: 130e3, 640: 77e3}}
R_NEAR = 25.0          # metres over which a nearby stop's view of the same direction counts


def mast_est(w, h):
    s = min(1.0, MAST_PX / max(w, h))
    return 0.23 * (w * s) * (h * s)   # 136 kB for 672 x 896, measured


def select():
    raw = load_raw()
    stops = build_stops(raw)
    print('stops in map:', len(stops), ' waypoint:', sum(s['source'] == 'waypoint' for s in stops.values()))
    cands = []
    eng = [r for r in eng_records(raw) if SOL0 <= r['sol'] <= SOL1]
    for r in eng:
        sd = (r['site'], r['drive'])
        if sd not in stops:
            continue
        kind = 'nav' if r['instrument'].startswith('NAV') else 'fhaz'
        mel = float(r['extended']['mast_el'])
        if kind == 'nav' and not (-20.0 <= mel <= 10.0):
            continue
        g = eng_geometry(r, stops[sd])
        cands.append(dict(kind=kind, sd=sd, rec=r, g=g, id=r['imageid'], sol=r['sol'], date=r['date_taken']))
    mi = mast_index()
    byid = {r['imageid'][:22]: r for r in raw if r['instrument'].startswith('MAST') and r['imageid'][22] == 'E'}
    bad = ('sky', 'sun', 'tau', 'calibration', 'cal target', 'cloud', 'dust devil', 'deck', 'rover',
           'drill', 'apxs', 'sampling system', 'inlet', 'wheel', 'chimra', 'scoop')
    for key, d in mi.items():
        r = byid.get(key)
        if not r:
            continue
        sd = (int(d['ROVER_MOTION_COUNTER:SITE']), int(d['ROVER_MOTION_COUNTER:DRIVE']))
        st = stops.get(sd)
        el = float(d['FIXED_INSTRUMENT_ELEVATION'])
        W, H = int(d['IMAGE:LINE_SAMPLES']), int(d['IMAGE:LINES'])
        rat = d['RATIONALE_DESC'].lower()
        if not st or min(W, H) < 500 or any(b in rat for b in bad):
            continue
        if -15.0 <= el <= 10.0:
            cls = 'horizon'        # 'Periodic documentation of the terrain along the traverse', etc.
        elif -50.0 <= el < -15.0 and ('workspace' in rat or 'dust removal tool' in rat):
            cls = 'near_workspace' if 'workspace' in rat else 'near_drt'
        else:
            continue
        # FIXED_INSTRUMENT_AZIMUTH/ELEVATION: boresight at the centre of the nominal full frame, in
        # the surface-fixed frame (clockwise from north, gravity-level), per the index label's own
        # field description; checked against the PDS4 camera models (verify_mast).
        az = float(d['FIXED_INSTRUMENT_AZIMUTH']) % 360.0
        ifov = 0.218e-3 if r['instrument'] == 'MAST_LEFT' else 0.0738e-3   # rad/px, Malin et al. 2017
        hf = math.degrees(W * ifov)
        cands.append(dict(kind='mast', cls=cls, sd=sd, rec=r, idx=d, id=r['imageid'], sol=r['sol'], date=r['date_taken'],
                          g=dict(az_site=az, el_site=el, hfov=hf, width=W, height=H)))
    print('candidates:', collections.Counter(c['kind'] for c in cands))

    # global greedy by value per byte, with direction coverage shared by nearby stops
    pos = {sd: np.array([s['E'], s['N']]) for sd, s in stops.items()}
    near = {sd: [(t, max(0.0, 1 - np.linalg.norm(pos[sd] - pos[t]) / R_NEAR)) for t in stops
                 if np.linalg.norm(pos[sd] - pos[t]) < R_NEAR] for sd in stops}
    cov = {'nav': {sd: np.zeros(360) for sd in stops}, 'mast': {sd: np.zeros(360) for sd in stops}}
    has = collections.Counter()
    nmast = collections.Counter()
    nnav = collections.Counter()
    fhaz_done = {}

    def bins(az, hf):
        return np.arange(int(math.floor(az - hf / 2)), int(math.ceil(az + hf / 2))) % 360

    def cost(c):
        if c['kind'] == 'nav':
            return EST['nav'][NAV_PX]
        if c['kind'] == 'fhaz':
            return EST['fhaz'][FHAZ_PX]
        return mast_est(c['g']['width'], c['g']['height'])

    def value(c):
        sd = c['sd']
        wpt = stops[sd]['source'] == 'waypoint'
        bonus = 25.0 if has[sd] == 0 else 0.0
        if c['kind'] == 'fhaz':
            if sd in fhaz_done:
                return 0.0
            if wpt:
                return 45.0 + bonus          # one Front Hazcam frame at every waypoint stop
            red = max([w for t, w in near[sd] if t in fhaz_done and t != sd] + [0.0])
            return 10.0 * (1 - red)
        b = bins(c['g']['az_site'], c['g']['hfov'])
        new = float(np.mean(1.0 - cov[c['kind']][sd][b])) if len(b) else 0.0
        if c['kind'] == 'nav':
            v = new * c['g']['hfov'] * (1.0 - 0.01 * abs(c['g']['el_site'] + 8.0))  # prefer just below horizon
            maz, mel = float(c['rec']['extended']['mast_az']) % 360.0, float(c['rec']['extended']['mast_el'])
            if 110.0 <= maz <= 250.0 and mel < -5.0:
                v *= 0.7                     # looking back over the deck: rover hardware in the frame
            if wpt and nnav[sd] == 0:
                v += 20.0                    # at least one horizon view per waypoint stop
            return v + bonus
        if nmast[sd] >= 3:
            return 0.0
        lens = 1.0 if c['rec']['instrument'] == 'MAST_LEFT' else 0.7      # M34 wider than M100
        if c['cls'] != 'horizon':           # near-field colour only when nothing better at the stop
            return 0.0 if nmast[sd] else (20.0 if c['cls'] == 'near_workspace' else 8.0) * lens + bonus
        return (60.0, 40.0, 20.0)[nmast[sd]] * new * lens + bonus

    def take(c):
        sd = c['sd']
        has[sd] += 1
        if c['kind'] == 'fhaz':
            fhaz_done[sd] = c
            return
        if c['kind'] == 'mast':
            nmast[sd] += 1
            if c['cls'] != 'horizon':
                return
        if c['kind'] == 'nav':
            nnav[sd] += 1
        b = bins(c['g']['az_site'], c['g']['hfov'])
        for t, w in near[sd]:
            cv = cov[c['kind']][t]
            cv[b] = np.maximum(cv[b], w)

    # FHAZ: one candidate per stop, the first after arrival (arm normally stowed)
    first = {}
    for c in sorted([c for c in cands if c['kind'] == 'fhaz'], key=lambda c: c['date']):
        first.setdefault(c['sd'], c)
    pool = [c for c in cands if c['kind'] != 'fhaz'] + list(first.values())
    chosen, spent = [], 0.0
    while True:
        best, br = None, 0.0
        for c in pool:
            v = value(c)
            if v <= 3.0:
                continue
            ratio = v / cost(c)
            if ratio > br:
                best, br = c, ratio
        if best is None or spent + cost(best) > BUDGET:
            break
        best['ratio'] = br
        take(best)
        chosen.append(best)
        spent += cost(best)
        pool.remove(best)
    print('chosen', len(chosen), collections.Counter(c['kind'] for c in chosen), 'est MB %.1f' % (spent / 1e6))
    print('stops with >=1 image', sum(1 for sd in stops if has[sd]), 'of', len(stops),
          '| waypoint stops with >=1', sum(1 for sd, s in stops.items() if has[sd] and s['source'] == 'waypoint'))
    navc = [float(np.mean(cov['nav'][sd] > 0.5)) * 360 for sd, s in stops.items() if s['source'] == 'waypoint']
    print('waypoint stops: median azimuth deg covered (own or <~12 m neighbour) %.0f' % statistics.median(navc))
    sel = dict(stops={f'{k[0]}_{k[1]}': v for k, v in stops.items()},
               chosen=[dict(kind=c['kind'], cls=c.get('cls'), site=c['sd'][0], drive=c['sd'][1], id=c['id'], sol=c['sol'],
                            url=c['rec']['url'], est=cost(c), ratio=c['ratio'],
                            pds_path=(c['idx']['PATH_NAME'] + c['idx']['PRODUCT_ID'].lower() + '.xml') if c['kind'] == 'mast' else None)
                       for c in chosen])
    json.dump(sel, open(os.path.join(RES, 'selection.json'), 'w'), indent=1)
    print('wrote selection.json')


# ------------------------------------------------------------------------------------------
# HTTP (shared pacing: >= 1.2 s between requests, stop at 429 or 3 errors in a row)
_last = [0.0]
_errs = [0]
UA = 'SpaceApps2026-MARCHER-research/1.0 (low rate, 1 req/s)'


def http_get(url, timeout=90):
    import time, urllib.request, urllib.error
    wait = _last[0] + 1.2 - time.time()
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout) as r:
            b = r.read()
        _errs[0] = 0
        return b
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise SystemExit(f'HTTP 429 on {url}: stopping')
        _errs[0] += 1
        print('  HTTP', e.code, url)
        if e.code == 404:
            _errs[0] -= 1      # a missing file is an answer, not a server problem
    except Exception as e:
        _errs[0] += 1
        print('  error', e, url)
    if _errs[0] >= 3:
        raise SystemExit('3 errors in a row: stopping')
    return None


PDS_MMM = 'https://planetarydata.jpl.nasa.gov/img/data/msl/msl_mmm/'


def parse_mmm_label(xml):
    """CAHVOR model (ROVER_NAV_FRAME) and the ROVER_NAV_FRAME -> SITE_FRAME definition from a
    PDS4 msl_mmm label."""
    import xml.etree.ElementTree as ET
    ns = {'g': 'http://pds.nasa.gov/pds4/geom/v1', 'p': 'http://pds.nasa.gov/pds4/pds/v1'}
    root = ET.fromstring(xml)

    def v3(el, tags):
        return np.array([float(el.find('g:' + t, ns).text) for t in tags])
    cm = root.find('.//g:Camera_Model_Parameters', ns)
    cv = cm.find('g:CAHVOR_Model', ns)
    m = dict(kind='CAHVOR',
             C=v3(cv.find('g:Vector_Center', ns), ('x_position', 'y_position', 'z_position')),
             A=v3(cv.find('g:Vector_Axis', ns), ('x_unit', 'y_unit', 'z_unit')),
             H=v3(cv.find('g:Vector_Horizontal', ns), ('x_pixel', 'y_pixel', 'z_pixel')),
             V=v3(cv.find('g:Vector_Vertical', ns), ('x_pixel', 'y_pixel', 'z_pixel')),
             O=v3(cv.find('g:Vector_Optical', ns), ('x_unit', 'y_unit', 'z_unit')),
             R=v3(cv.find('g:Radial_Terms', ns), ('c0', 'c1', 'c2')))
    ref = cm.find('.//g:coordinate_space_frame_type', ns).text
    idx = {e.find('g:index_id', ns).text: int(e.find('g:index_value_number', ns).text)
           for e in cm.findall('.//g:Coordinate_Space_Index', ns)}
    rnav = None
    for d in root.findall('.//g:Coordinate_Space_Definition', ns):
        if d.find('p:local_identifier', ns).text.startswith('ROVER_NAV_FRAME'):
            q = d.find('g:Quaternion_Plus_Direction', ns)
            o = d.find('g:Vector_Origin_Offset', ns)
            rnav = dict(q=[float(q.find('g:' + t, ns).text) for t in ('qcos', 'qsin1', 'qsin2', 'qsin3')],
                        offset=[float(o.find('g:' + t, ns).text) for t in ('x_position', 'y_position', 'z_position')],
                        ref=d.find('.//g:Coordinate_Space_Reference//g:coordinate_space_frame_type', ns).text)
    W = int(root.find('.//p:Axis_Array[p:axis_name="Sample"]/p:elements', ns).text)
    H = int(root.find('.//p:Axis_Array[p:axis_name="Line"]/p:elements', ns).text)
    return dict(model=m, model_frame=ref, site=idx.get('SITE'), drive=idx.get('DRIVE'), rnav=rnav, W=W, H=H)


def labels():
    sel = json.load(open(os.path.join(RES, 'selection.json')))
    d = os.path.join(RES, 'pds', 'labels')
    os.makedirs(d, exist_ok=True)
    for c in sel['chosen']:
        if c['kind'] != 'mast':
            continue
        fn = os.path.join(d, os.path.basename(c['pds_path']))
        if os.path.exists(fn):
            continue
        b = http_get(PDS_MMM + c['pds_path'])
        if b:
            open(fn, 'wb').write(b)
            print('label', os.path.basename(fn), len(b))


# ------------------------------------------------------------------------------------------
ORIG = os.environ.get('POV_ORIG', os.path.join(tempfile.gettempdir(), 'marcher_pov_orig'))
LIMIT = 59.5e6


def out_name(c):
    return c['id'].rstrip('_') + '.jpg'


def download():
    from PIL import Image
    sel = json.load(open(os.path.join(RES, 'selection.json')))
    os.makedirs(ORIG, exist_ok=True)
    os.makedirs(os.path.join(OUTD, 'img'), exist_ok=True)
    px = {'nav': NAV_PX, 'fhaz': FHAZ_PX, 'mast': MAST_PX}
    total, kept = 0, []
    for c in sel['chosen']:
        if c['kind'] == 'mast' and not os.path.exists(os.path.join(RES, 'pds', 'labels', os.path.basename(c['pds_path']))):
            continue
        out = os.path.join(OUTD, 'img', out_name(c))
        if not os.path.exists(out):
            src = os.path.join(ORIG, os.path.basename(c['url']))
            if not os.path.exists(src):
                b = http_get(c['url'])
                if not b:
                    continue
                open(src, 'wb').write(b)
            im = Image.open(src)
            im.load()
            w, h = im.size
            s = min(1.0, px[c['kind']] / max(w, h))
            if s < 1.0:
                im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
            if c['kind'] == 'mast':
                im = im.convert('RGB')
            elif im.mode != 'L':
                im = im.convert('L')
            im.save(out + '.tmp', 'JPEG', quality=85, optimize=True)
            sz = os.path.getsize(out + '.tmp')
            if total + sz > LIMIT:
                os.remove(out + '.tmp')
                print('budget reached at', len(kept), 'images, %.2f MB' % (total / 1e6))
                break
            os.replace(out + '.tmp', out)
        sz = os.path.getsize(out)
        if total + sz > LIMIT:
            os.remove(out)
            print('budget reached at', len(kept), 'images, %.2f MB' % (total / 1e6))
            break
        total += sz
        kept.append(dict(id=c['id'], file=out_name(c), bytes=sz))
        if len(kept) % 25 == 0:
            print(len(kept), 'images, %.2f MB' % (total / 1e6))
    # drop files from earlier runs that are no longer selected (EVA-stop extras are kept)
    keep = {k['file'] for k in kept}
    egot = os.path.join(RES, 'enrich_downloaded.json')
    if os.path.exists(egot):
        keep |= {d['file'] for d in json.load(open(egot))}
    for f in os.listdir(os.path.join(OUTD, 'img')):
        if f not in keep:
            os.remove(os.path.join(OUTD, 'img', f))
    json.dump(kept, open(os.path.join(RES, 'downloaded.json'), 'w'), indent=1)
    print('done', len(kept), 'images, %.2f MB' % (total / 1e6))


# ------------------------------------------------------------------------------------------
CAM = {'NAV_LEFT_B': 'Navcam (left, B side)', 'NAV_LEFT_A': 'Navcam (left, A side)',
       'FHAZ_LEFT_B': 'Front Hazcam (left, B side)', 'FHAZ_LEFT_A': 'Front Hazcam (left, A side)',
       'MAST_LEFT': 'Mastcam M-34 (left)', 'MAST_RIGHT': 'Mastcam M-100 (right)'}


def mast_geometry(c, st_all):
    """Geometry of a Mastcam frame from its PDS4 label."""
    L = parse_mmm_label(open(os.path.join(RES, 'pds', 'labels', os.path.basename(c['pds_path'])), 'rb').read())
    assert L['model_frame'] == 'ROVER_NAV_FRAME' and L['rnav']['ref'] == 'SITE_FRAME', L['model_frame']
    sd = (L['site'], L['drive'])
    st = st_all[f'{sd[0]}_{sd[1]}']
    look, up, hf, vf, corners = G.view(L['model'], L['W'], L['H'])
    R = G.quat_to_R(L['rnav']['q'])
    return finish_geometry(L['model']['C'], R, look, up, hf, vf, corners, L['W'], L['H'], st), L


def index():
    from PIL import Image
    sel = json.load(open(os.path.join(RES, 'selection.json')))
    got = {d['id']: d for d in json.load(open(os.path.join(RES, 'downloaded.json')))}
    raw = {r['imageid']: r for r in load_raw()}
    mi = mast_index()
    ver = json.load(open(os.path.join(RES, 'verify.json')))
    stops = sel['stops']
    images = []
    work = [(c, raw[c['id']]) for c in sel['chosen'] if c['id'] in got]
    # extra views for the EVA science stops (tools/pov_enrich.py), same schema
    esel, egot = os.path.join(RES, 'enrich_selection.json'), os.path.join(RES, 'enrich_downloaded.json')
    if os.path.exists(esel) and os.path.exists(egot):
        eg = {d['id']: d for d in json.load(open(egot))}
        got.update(eg)
        work += [(c, c['rec'] if c['kind'] == 'nav' else raw[c['id']]) for c in json.load(open(esel))['picks'] if c['id'] in eg]
    seen = set()
    for c, r in work:
        if c['id'] in seen:
            continue
        seen.add(c['id'])
        st = stops[f"{c['site']}_{c['drive']}"]
        if c['kind'] == 'mast':
            g, L = mast_geometry(c, stops)
            d = mi[c['id'][:22]]
            lmst = d['LOCAL_MEAN_SOLAR_TIME']
            geom_src = 'PDS4 label ' + PDS_MMM + c['pds_path']
            raw_az = dict(fixed_instrument_azimuth=float(d['FIXED_INSTRUMENT_AZIMUTH']),
                          fixed_instrument_elevation=float(d['FIXED_INSTRUMENT_ELEVATION']))
            note = d['RATIONALE_DESC']
        else:
            g = eng_geometry(r, st)
            lmst = r['extended'].get('lmst')
            geom_src = 'raw image API record (camera_model_component_list, attitude)'
            raw_az = dict(mast_az=float(r['extended']['mast_az']), mast_el=float(r['extended']['mast_el']))
            note = None
        fpath = os.path.join(OUTD, 'img', got[c['id']]['file'])
        fw, fh = Image.open(fpath).size
        src = os.path.join(ORIG, os.path.basename(r['url']))
        if os.path.exists(src):
            ow, oh = Image.open(src).size
            assert (ow, oh) == (g['width'], g['height']), (c['id'], ow, oh, g['width'], g['height'])
        images.append(dict(
            id=c['id'].rstrip('_'), file='img/' + got[c['id']]['file'], kind=c['kind'],
            instrument=r['instrument'], camera=CAM.get(r['instrument'], r['instrument']),
            sol=r['sol'], site=c['site'], drive=c['drive'], lmst=lmst, date_taken=r['date_taken'],
            pos=g['pos'], look=g['look'], up=g['up'], hfov=g['hfov'], vfov=g['vfov'],
            corners=g['corners'], width=fw, height=fh, model_width=g['width'], model_height=g['height'],
            az=g['az_site'], el=g['el_site'], **raw_az,
            url=r['url'], credit=r.get('image_credit') or 'NASA/JPL-Caltech',
            geometry_source=geom_src, **({'rationale': note} if note else {}), bytes=got[c['id']]['bytes']))
    by_stop = collections.defaultdict(list)
    for im in images:
        by_stop[f"{im['site']}_{im['drive']}"].append(im['id'])
    kind_order = {'fhaz': 0, 'nav': 1, 'mast': 2}
    images.sort(key=lambda im: (im['site'], im['drive'], kind_order[im['kind']], im['az']))
    out_stops = []
    for k, st in sorted(stops.items(), key=lambda kv: (kv[1]['site'], kv[1]['drive'])):
        out_stops.append(dict(
            key=k, site=st['site'], drive=st['drive'], sols=st['sols'],
            waypoint=st['source'] == 'waypoint', position_source=st['source'],
            pos=[round(st['E'] - EC, 3), round(st['elev'] - BASE, 3), round(-(st['N'] - NC), 3)],
            easting=round(st['E'], 3), northing=round(st['N'], 3), elev_geoid=round(st['elev'], 3),
            yaw=None if st.get('yaw') is None else round(st['yaw'], 2),
            images=[im['id'] for im in images if im['site'] == st['site'] and im['drive'] == st['drive']]))
    a = ver['a_attitude_vs_waypoint']['(s,v1,v2,v3) rnav->site']
    doc = {
        'title': 'Curiosity rover point-of-view images, Mount Sharp boxwork (sols %d-%d)' % (SOL0, SOL1),
        'generated_by': 'tools/pov_build.py (see its header for method and sources)',
        'frame': {
            'app': 'X = easting - 8144000 (east), Y = elev_geoid + 3863 (up), Z = -(northing + 285200) '
                   '(-Z is north); metres in the map projection (Mars 2000 sphere equirectangular, '
                   'R 3396190 m, centre lon 0)',
            'pos': 'camera entrance pupil (CAHVOR C) for images; rover nav frame origin (ground under the '
                   'turn-in-place axis) for stops',
            'look': 'unit vector through the image centre pixel (the boresight), app frame',
            'up': 'unit vector toward the top of the image at its centre, orthogonal to look',
            'corners': 'unit rays through the outer corners of the top-left, top-right, bottom-right, '
                       'bottom-left pixels, app frame (lens distortion included)',
            'hfov_vfov': 'degrees between the rays through the left/right (top/bottom) image edges at the '
                         'centre row (column), from the CAHVOR/CAHVORE model',
            'az_el': 'boresight azimuth (deg clockwise from north) and elevation (deg above the local '
                     'level plane) in the site frame',
            'width_height': 'pixels of the saved file; model_width/height = pixels of the original product '
                            '(the grid the camera model is defined on)'},
        'credit': 'NASA/JPL-Caltech (Mastcam: NASA/JPL-Caltech/MSSS)',
        'sources': {
            'images_metadata': 'https://mars.nasa.gov/api/v1/raw_image_items/',
            'waypoints': 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
            'mastcam_pointing': PDS_MMM + ' (PDS4 labels and RAW_INDEX tables, Release 42, to sol 4843)',
            'frames': 'PDS MSLNAV_0XXX/DOCUMENT/MSL_COORDINATE_FRAMES.PDF; MSL Camera & LIBS EDR/RDR SIS '
                      'v4.1 (JPL D-38107); GEOMETRIC_CM.TXT (CAHV/CAHVOR/CAHVORE, Gennery)'},
        'verification': {
            'yaw_from_attitude_minus_waypoint_yaw_deg': a['yaw'],
            'pitch_deg': a['pitch'], 'roll_deg': a['roll'],
            'front_hazcam': ver['b_front_hazcam'], 'front_hazcam_az_vs_roll': ver.get('b_front_hazcam_az_vs_roll'),
            'navcam': ver['c_navcam'],
            'mastcam': ver.get('f_mastcam'),
            'xyz_vs_map_steps': {k: v for k, v in ver['d_xyz_vs_map'].items() if k != 'site_origin_estimates_spread'},
            'waypoint_elev_minus_app_dem_m': ver.get('e_waypoint_elev_minus_dem2m_m'),
            'dem_skyline_alignment_navcam': ver.get('g_dem_skyline'),
            'dem_skyline_alignment_eva_stop_navcam': {k: v for k, v in (ver.get('h_dem_skyline_eva_navcam') or {}).items()
                                                      if k != 'per_frame'} or None},
        'notes': [
            'Mastcam frames after sol 4843 are not included: the raw-image API gives no pointing for '
            'Mastcam and PDS has released Mastcam labels only to sol 4843 (Release 42).',
            'Navcam is stored at up to 768 px and Front Hazcam at up to 640 px (originals 1024 px), '
            'Mastcam at up to 1024 px, all JPEG quality 85, to fit about 60 MB; the url field links '
            'the full-resolution original.',
            'Stops without a waypoint (mid-drive imaging) are placed from the nearest waypoint of the same '
            'site plus the site-frame telemetry displacement (position_source says which).',
            'Navcam and Mastcam are near-perspective (CAHVOR): a frustum from pos/look/up/hfov/vfov, or the '
            'corner rays, matches the photo to a fraction of a pixel at the centre. Front Hazcam is a '
            'fish-eye (CAHVORE, 126 deg edge to edge, corner rays ~90 deg off axis): it does not fit a '
            'rectilinear frustum; show it as a flat picture placed along look/up.',
            'Stops with an empty images list are mid-drive stops (Hazcam during drives) kept for position '
            'only, or stops whose frames lost out in the 60 MB budget to views from nearby stops.',
            'The 7 EVA science stops (116_1944, 117_1122, 118_198, 118_1752, 119_846, 120_82, 120_2366) carry '
            'extra views from tools/pov_enrich.py: up to 10 more Navcam frames for 360 deg coverage (any Navcam '
            'eye and product type, native size up to 1024 px) and up to 6 Mastcam colour frames. Navcam subframe, '
            'mixed and downsampled products are partial or half-resolution frames; width/height give their size.'],
        'stops': out_stops,
        'images': images}
    fn = os.path.join(OUTD, 'index.json')
    json.dump(doc, open(fn, 'w'), separators=(',', ':'))
    tot = sum(os.path.getsize(os.path.join(OUTD, 'img', f)) for f in os.listdir(os.path.join(OUTD, 'img')))
    print('wrote', fn, '%d stops (%d with images), %d images' % (
        len(out_stops), sum(1 for s in out_stops if s['images']), len(images)),
        collections.Counter(im['kind'] for im in images), 'img %.2f MB, index %.2f MB' % (tot / 1e6, os.path.getsize(fn) / 1e6))


def verify_mast():
    """Mastcam label geometry vs the PDS index angles and the waypoint yaw; adds f_mastcam to verify.json."""
    import glob
    mi = mast_index()
    wpa = load_wp_all()
    da, de, dy = [], [], []
    for f in sorted(glob.glob(os.path.join(RES, 'pds', 'labels', '*.xml'))):
        L = parse_mmm_label(open(f, 'rb').read())
        d = mi[os.path.basename(f)[:22].upper()]
        fls, fl = int(d['IMAGE:FIRST_LINE_SAMPLE']), int(d['IMAGE:FIRST_LINE'])
        x, y = (1648 - 1) / 2.0 - (fls - 1), (1200 - 1) / 2.0 - (fl - 1)   # nominal full-frame centre
        R = G.quat_to_R(L['rnav']['q'])
        az, el = G.az_el(R @ G.ray(L['model'], x, y))
        da.append(G.wrap(az - float(d['FIXED_INSTRUMENT_AZIMUTH'])))
        de.append(el - float(d['FIXED_INSTRUMENT_ELEVATION']))
        p = wpa.get((L['site'], L['drive']))
        if p:
            dy.append(G.wrap(G.ypr_from_R(R)[0] - p['yaw']))
    ver = json.load(open(os.path.join(RES, 'verify.json')))
    ver['f_mastcam'] = {
        'labels': len(da),
        'site_az_at_full_frame_centre_minus_FIXED_INSTRUMENT_AZIMUTH_deg': {**signed(da), **stats(da)},
        'site_el_minus_FIXED_INSTRUMENT_ELEVATION_deg': {**signed(de), **stats(de)},
        'label_quaternion_yaw_minus_waypoint_yaw_deg': stats(dy)}
    json.dump(ver, open(os.path.join(RES, 'verify.json'), 'w'), indent=1)
    print(json.dumps(ver['f_mastcam']))


# ------------------------------------------------------------------------------------------
CHECK_DIR = os.environ.get('POV_CHECK', os.path.join(tempfile.gettempdir(), 'marcher_pov_check'))


def check(*keys):
    """Top-down plot per stop: ortho background, waypoint track, rover heading, camera positions
    and horizontal FOV wedges from index.json, plus the images themselves with their az/el."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    doc = json.load(open(os.path.join(OUTD, 'index.json')))
    sj = json.load(open(SITE_JSON))
    ortho = Image.open(os.path.join(ROOT, 'app', 'data', sj['ortho']['whole']))
    opx = sj['size_m'] / ortho.size[0]
    stops = {s['key']: s for s in doc['stops']}
    ims = {im['id']: im for im in doc['images']}
    track = [(s['pos'][0], -s['pos'][2]) for s in doc['stops'] if s['waypoint']]
    col = {'nav': '#4fc3f7', 'fhaz': '#ffb74d', 'mast': '#e57373'}
    for key in keys:
        st = stops[key]
        cx, cy = st['pos'][0], -st['pos'][2]
        half = 45.0
        E0, N0 = cx + EC, cy + NC
        box = (int((E0 - half - sj['x0']) / opx), int((sj['y1'] - (N0 + half)) / opx),
               int((E0 + half - sj['x0']) / opx), int((sj['y1'] - (N0 - half)) / opx))
        crop = ortho.crop(box)
        sims = [ims[i] for i in st['images']]
        n = len(sims)
        cols = 4
        rows = max(1, math.ceil(n / cols))
        fig = plt.figure(figsize=(8 + 3.2 * cols, max(8, 3.4 * rows)), facecolor='#111')
        ax = fig.add_axes([0.02, 0.05, 8 / (8 + 3.2 * cols) * 0.96, 0.9])
        ax.imshow(crop, extent=(cx - half, cx + half, cy - half, cy + half), cmap='gray')
        tx, ty = zip(*track)
        ax.plot(tx, ty, '-', color='#cddc39', lw=1, alpha=0.8)
        ax.plot(tx, ty, '.', color='#cddc39', ms=4)
        if st['yaw'] is not None:
            yr = math.radians(st['yaw'])
            ax.annotate('', xy=(cx + 6 * math.sin(yr), cy + 6 * math.cos(yr)), xytext=(cx, cy),
                        arrowprops=dict(arrowstyle='->', color='white', lw=2))
        for im in sims:
            px, py = im['pos'][0], -im['pos'][2]
            # horizontal projection of the corner rays -> wedge
            L = 30.0 if im['kind'] != 'fhaz' else 8.0
            angs = []
            for c in im['corners'] + [im['look']]:
                angs.append(math.degrees(math.atan2(c[0], -c[2])))
            a0 = im['az']
            rel = sorted(G.wrap(a - a0) for a in angs)
            lo, hi = a0 + rel[0], a0 + rel[-1]
            pts = [(px, py)] + [(px + L * math.sin(math.radians(a)), py + L * math.cos(math.radians(a)))
                                for a in np.linspace(lo, hi, 20)] + [(px, py)]
            xs, ys = zip(*pts)
            ax.fill(xs, ys, color=col[im['kind']], alpha=0.25)
            ax.plot(xs, ys, color=col[im['kind']], lw=1)
            ax.plot([px, px + L * im['look'][0] / math.hypot(im['look'][0], im['look'][2])],
                    [py, py - L * im['look'][2] / math.hypot(im['look'][0], im['look'][2])], color=col[im['kind']], lw=1.5)
            ax.plot(px, py, 'o', color=col[im['kind']], ms=4)
        ax.set_xlim(cx - half, cx + half)
        ax.set_ylim(cy - half, cy + half)
        ax.set_title(f"stop {key}  sols {st['sols'][0]}-{st['sols'][-1]}  yaw {st['yaw']}  "
                     f"(X east, -Z north; m)", color='white', fontsize=10)
        ax.tick_params(colors='#aaa', labelsize=7)
        for i, im in enumerate(sims):
            r, c = divmod(i, cols)
            w = 3.0 / (8 + 3.2 * cols)
            x0 = (8.2 + 3.2 * c) / (8 + 3.2 * cols)
            a2 = fig.add_axes([x0, 1 - (r + 1) / rows * 0.92, w, 0.84 / rows])
            a2.imshow(Image.open(os.path.join(OUTD, im['file'])).convert('RGB'))
            a2.set_title(f"{im['kind']} az {im['az']:.0f} el {im['el']:.0f}  sol {im['sol']}",
                         color=col[im['kind']], fontsize=8)
            a2.axis('off')
        out = os.path.join(CHECK_DIR, f'pov_check_{key}.png')
        fig.savefig(out, dpi=80, facecolor=fig.get_facecolor())
        plt.close(fig)
        print('wrote', out)



def render_check(*ids, png=True, results=None):
    """Independent check of position + look + up + FOV: ray-cast the app DEM (2 m) from the
    camera pose through the image's corner/edge geometry and overlay the synthetic depth edges
    and skyline on the real photo. Rays use bilinear interpolation of the index corners
    (exact for the centre, close elsewhere)."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from PIL import Image
    doc = json.load(open(os.path.join(OUTD, 'index.json')))
    ims = {im['id']: im for im in doc['images']}
    sj = json.load(open(SITE_JSON))
    a = np.asarray(Image.open(os.path.join(ROOT, 'app', 'data', sj['dem_2m']['file'])).convert('RGB')).astype(np.float64)
    dem = sj['height']['base_m'] + (a[..., 0] * 256 + a[..., 1]) * sj['height']['scale_m'] - BASE  # app Y
    n = sj['dem_2m']['n']
    res = sj['size_m'] / n

    def h_at(X, Z):
        # app X,Z -> grid (pixel-is-area)
        fx = (X + EC - sj['x0']) / res - 0.5
        fy = (sj['y1'] - (-Z + NC)) / res - 0.5
        ok = (fx >= 0) & (fy >= 0) & (fx < n - 1) & (fy < n - 1)
        fx = np.clip(fx, 0, n - 1.001)
        fy = np.clip(fy, 0, n - 1.001)
        i, j = fx.astype(int), fy.astype(int)
        tx, ty = fx - i, fy - j
        z = (dem[j, i] * (1 - tx) * (1 - ty) + dem[j, i + 1] * tx * (1 - ty) +
             dem[j + 1, i] * (1 - tx) * ty + dem[j + 1, i + 1] * tx * ty)
        return z, ok
    for iid in ids:
        im = ims[iid]
        S = 160
        c = np.array(im['corners'])   # TL, TR, BR, BL
        u = np.linspace(0, 1, S)[None, :, None]
        v = np.linspace(0, 1, S)[:, None, None]
        top = c[0] * (1 - u) + c[1] * u
        bot = c[3] * (1 - u) + c[2] * u
        d = top * (1 - v) + bot * v
        d = d / np.linalg.norm(d, axis=2, keepdims=True)
        d = d.reshape(-1, 3)
        p0 = np.array(im['pos'])
        depth = np.full(len(d), np.nan)
        hitp = np.zeros((len(d), 3))
        alive = np.ones(len(d), bool)
        t = 0.5
        while t < 2500 and alive.any():
            P = p0 + d * t
            z, ok = h_at(P[:, 0], P[:, 2])
            hit = alive & ok & (P[:, 1] <= z)
            depth[hit] = t
            hitp[hit] = P[hit]
            alive &= ~hit & (ok | (t < 5))
            t += max(0.25, t * 0.003)
        sky = np.isnan(depth)
        # hillshade at the hit points (light from the north-west, 45 deg up), app frame normals
        e1 = 1.0
        hx1, _ = h_at(hitp[:, 0] + e1, hitp[:, 2])
        hx0, _ = h_at(hitp[:, 0] - e1, hitp[:, 2])
        hz1, _ = h_at(hitp[:, 0], hitp[:, 2] + e1)
        hz0, _ = h_at(hitp[:, 0], hitp[:, 2] - e1)
        nrm = np.stack([-(hx1 - hx0) / (2 * e1), np.ones(len(d)), -(hz1 - hz0) / (2 * e1)], axis=1)
        nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
        Ld = np.array([-0.5, 0.7071, -0.5])
        shade = np.clip(nrm @ Ld, 0, 1)
        shade[sky] = np.nan
        shade = shade.reshape(S, S)
        depth = depth.reshape(S, S)
        ld = np.log(np.where(sky.reshape(S, S), 3000.0, depth))
        sky = sky.reshape(S, S)
        edge = np.zeros_like(ld)
        edge[1:-1, 1:-1] = np.hypot(ld[1:-1, 2:] - ld[1:-1, :-2], ld[2:, 1:-1] - ld[:-2, 1:-1])
        photo = Image.open(os.path.join(OUTD, im['file'])).convert('L').resize((S * 4, S * 4))
        fig, axs = plt.subplots(1, 3, figsize=(15, 5.3), facecolor='#111')
        axs[0].imshow(photo, cmap='gray')
        axs[0].set_title(f"{im['id'][:28]}  {im['kind']} az {im['az']:.1f} el {im['el']:.1f}", color='w', fontsize=9)
        axs[1].imshow(shade, cmap='gray', vmin=0, vmax=1)
        axs[1].set_title('app DEM (2 m) ray-cast, hillshade; blank = no hit inside the map', color='w', fontsize=9)
        axs[2].imshow(photo, cmap='gray', extent=(0, S, S, 0))
        yy, xx = np.nonzero(edge > 0.25)
        axs[2].plot(xx, yy, ',', color='#ff4081', alpha=0.9)
        sk = [np.argmax(~sky[:, i]) if (~sky[:, i]).any() else np.nan for i in range(S)]
        # alignment: shift (dx, dy) of the DEM skyline that best sits on a bright-above / dark-below
        # edge in the photo; only columns whose skyline is a real silhouette (not the map edge or
        # the top of the image) are used. Reported in degrees via the image scale.
        P = np.asarray(Image.open(os.path.join(OUTD, im['file'])).convert('L'), np.float64)
        Hp, Wp = P.shape
        gy = np.zeros_like(P)
        gy[2:-2] = (P[:-4] - P[4:])          # >0 where it gets darker downward
        cols = [i for i in range(S) if not np.isnan(sk[i]) and 2 < sk[i] < S - 2
                and np.isfinite(depth[int(sk[i]), i]) and depth[int(sk[i]), i] < 1500]
        best = None
        if len(cols) > S // 5:
            xs = np.array([(i + 0.5) * Wp / S for i in cols])
            ys = np.array([(sk[i] + 0.5) * Hp / S for i in cols])
            for dx in range(-40, 41, 2):
                for dy in range(-40, 41, 2):
                    xi = np.clip((xs + dx).astype(int), 0, Wp - 1)
                    yi = np.clip((ys + dy).astype(int), 0, Hp - 1)
                    sc = gy[yi, xi].mean()
                    if best is None or sc > best[0]:
                        best = (sc, dx, dy)
            degpx = im['hfov'] / Wp
            print(f"  {iid}: skyline alignment best shift dx {best[1] * degpx:+.2f} deg, dy {best[2] * degpx:+.2f} deg "
                  f"(search +-{40 * degpx:.1f} deg, {len(cols)} silhouette columns)")
            if results is not None:
                results.append(dict(id=iid, dx_deg=best[1] * degpx, dy_deg=best[2] * degpx,
                                    at_bound=max(abs(best[1]), abs(best[2])) >= 40, cols=len(cols)))
        if not png:
            plt.close(fig)
            continue
        axs[2].plot(np.arange(S), sk, '-', color='#00e5ff', lw=1.2)
        axs[2].set_xlim(0, S)
        axs[2].set_ylim(S, 0)
        axs[2].set_title('overlay: DEM skyline (cyan), depth edges (pink)', color='w', fontsize=9)
        for a_ in axs:
            a_.axis('off')
        out = os.path.join(CHECK_DIR, f"pov_render_{iid[:30]}.png")
        fig.savefig(out, dpi=80, facecolor=fig.get_facecolor(), bbox_inches='tight')
        plt.close(fig)
        print('wrote', out)



def validate():
    """Integrity checks on index.json: unit vectors, up perpendicular to look, files present,
    total size, stops inside the map, camera heights above the app DEM."""
    from PIL import Image
    doc = json.load(open(os.path.join(OUTD, 'index.json')))
    sj = json.load(open(SITE_JSON))
    a = np.asarray(Image.open(os.path.join(ROOT, 'app', 'data', sj['dem_2m']['file'])).convert('RGB')).astype(np.float64)
    dem = sj['height']['base_m'] + (a[..., 0] * 256 + a[..., 1]) * sj['height']['scale_m'] - BASE
    n, res = sj['dem_2m']['n'], sj['size_m'] / sj['dem_2m']['n']
    probs = []
    tot = 0
    hgt = collections.defaultdict(list)
    ids = {im['id'] for im in doc['images']}
    for im in doc['images']:
        L, U = np.array(im['look']), np.array(im['up'])
        if abs(np.linalg.norm(L) - 1) > 1e-3 or abs(np.linalg.norm(U) - 1) > 1e-3 or abs(L @ U) > 2e-3:
            probs.append(('vector', im['id']))
        f = os.path.join(OUTD, im['file'])
        if not os.path.exists(f):
            probs.append(('missing', im['id']))
            continue
        tot += os.path.getsize(f)
        x, y, z = im['pos']
        fx = (x + EC - sj['x0']) / res - 0.5
        fy = (sj['y1'] - (-z + NC)) / res - 0.5
        i, j = min(max(int(fx), 0), n - 2), min(max(int(fy), 0), n - 2)
        tx, ty = fx - i, fy - j
        zt = (dem[j, i] * (1 - tx) * (1 - ty) + dem[j, i + 1] * tx * (1 - ty) +
              dem[j + 1, i] * (1 - tx) * ty + dem[j + 1, i + 1] * tx * ty)
        hgt[im['kind']].append(y - zt)
    for st in doc['stops']:
        if not (X0 - EC <= st['pos'][0] <= X1 - EC and Y0 - NC <= -st['pos'][2] <= Y1 - NC):
            probs.append(('outside', st['key']))
        for i in st['images']:
            if i not in ids:
                probs.append(('dangling', st['key'], i))
    files = os.listdir(os.path.join(OUTD, 'img'))
    print('images', len(doc['images']), 'files', len(files), 'bytes in index %.2f MB, dir %.2f MB' % (
        tot / 1e6, sum(os.path.getsize(os.path.join(OUTD, 'img', f)) for f in files) / 1e6))
    for k, v in hgt.items():
        print(f'  {k}: camera height above DEM (2 m, bilinear) median {np.median(v):.2f} m, min {min(v):.2f}, '
              f'max {max(v):.2f}, below 0.3 m: {sum(1 for h in v if h < 0.3)}')
    print('problems:', probs[:20] if probs else 'none')



def render_stats(n='40'):
    """Skyline alignment (render_check without figures) on an evenly spread sample of the chosen
    Navcam frames; frames whose in-map DEM silhouette is too short are skipped.
    Results -> verify.json g_dem_skyline."""
    doc = json.load(open(os.path.join(OUTD, 'index.json')))
    navs = [im for im in doc['images'] if im['kind'] == 'nav']
    step = max(1, len(navs) // int(n))
    res = []
    render_check(*[im['id'] for im in navs[::step]], png=False, results=res)
    ok = [r for r in res if not r['at_bound']]
    ver = json.load(open(os.path.join(RES, 'verify.json')))
    ver['g_dem_skyline'] = {
        'frames_tried': len(navs[::step]), 'frames_with_dem_silhouette': len(res), 'at_search_bound': len(res) - len(ok),
        'dx_deg (azimuth-like)': {**signed([r['dx_deg'] for r in ok]), **stats([r['dx_deg'] for r in ok])},
        'dy_deg (elevation-like)': {**signed([r['dy_deg'] for r in ok]), **stats([r['dy_deg'] for r in ok])}}
    json.dump(ver, open(os.path.join(RES, 'verify.json'), 'w'), indent=1)
    print(json.dumps(ver['g_dem_skyline']))

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'verify'
    globals()[cmd](*sys.argv[2:])
