#!/usr/bin/env python3
"""Curiosity's real drive path inside the site, tagged by sol (for the replay layer).
Sources: MSL traverse and waypoints from NASA MMGIS
  https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json (copy: research/msl_tr.json)
  https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json (copy: research/msl_wp.json)
Each traverse LineString is one drive; it gets the sol of the waypoint nearest its end point.
Output app/data/curiosity_track.json: drives [{sol, site, drive, pts: [[x, y, z], ...]}] in the app frame
(X = easting - 8144000, Y = elev + 3863, Z = -(northing + 285200)); lon/lat converted with R = 3396190 m."""
import json, math
R = 3396190.0; K = R * math.pi / 180
X0, X1, Y0, Y1 = 8142400, 8145600, -286800, -283600
wp = [f['properties'] for f in json.load(open('research/msl_wp.json'))['features'] if f['properties'].get('sol')]
tr = json.load(open('research/msl_tr.json'))['features']
def app(lon, lat, elev): e, n = lon * K, lat * K; return [round(e - 8144000, 2), round(elev + 3863, 2), round(-(n + 285200), 2)]
drives = []
for f in tr:
    c = f['geometry']['coordinates']
    if f['geometry']['type'] != 'LineString' or len(c) < 2: continue
    e, n = c[-1][0] * K, c[-1][1] * K
    if not (X0 < e < X1 and Y0 < n < Y1): continue
    w = min(wp, key=lambda p: (p['easting'] - e) ** 2 + (p['northing'] - n) ** 2)
    if (w['easting'] - e) ** 2 + (w['northing'] - n) ** 2 > 25 ** 2: continue
    pts = [app(*p[:3]) for p in c if X0 < p[0] * K < X1 and Y0 < p[1] * K < Y1]
    if len(pts) >= 2: drives.append({'sol': w['sol'], 'site': w['site'], 'drive': w['drive'], 'pts': pts})
drives.sort(key=lambda d: (d['sol'], d['site'], d['drive']))
dist = sum(math.hypot(b[0] - a[0], b[2] - a[2]) for d in drives for a, b in zip(d['pts'], d['pts'][1:]))
json.dump({'source': 'NASA MMGIS MSL traverse + waypoints', 'drives': drives}, open('app/data/curiosity_track.json', 'w'), separators=(',', ':'))
print(len(drives), 'drives, sols', drives[0]['sol'], '-', drives[-1]['sol'], 'path', round(dist), 'm')
s0, s1 = 4560, 4827
d2 = sum(math.hypot(b[0] - a[0], b[2] - a[2]) for d in drives if s0 < d['sol'] <= s1 for a, b in zip(d['pts'], d['pts'][1:]))
print('between Altadena (sol 4560) and Timboy Chaco (sol 4827):', round(d2), 'm driven over', s1 - s0, 'sols')
