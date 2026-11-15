#!/usr/bin/env python3
"""Build app/data/stops.json: the EVA's science stops from research/boxwork_targets.json.
Each stop sits where Curiosity parked to study the target, so Curiosity's own photos
from that spot are the astronaut's preview. Text in 'task' is ours; 'what' and
'sources' come from the NASA mission blog / JPL releases listed in the research file."""
import json
T = {t['name']: t for t in json.load(open('research/boxwork_targets.json'))['targets']}
PICK = [  # (target name, short label, task, minutes at the stop)
  ('Altadena', 'Altadena', 'Crew rover parks at Curiosity\'s first boxwork drill site. Suit checks, then walk south.', 0),
  ('Volcan Pena Blanca', 'Volcán Peña Blanca', 'Raised ridge with at least three layers in its wall: sample each layer from bottom to top.', 35),
  ('Salar de Agua Amara', 'Salar de Agua Amara', 'Delicate branching structures likely made by groundwater: image in place, then core beside them.', 30),
  ('Minimini / El Tapado', 'Río Frío wall', 'Nodule-filled ridge wall and a vein: compare nodule and vein chemistry.', 35),
  ('Monte Grande', 'Monte Grande hollow', 'Hollow floor where Curiosity drilled Valle de la Luna: collect the hollow sample.', 40),
  ('Nevado Sajama', 'Nevado Sajama ridge', 'Ridge top 10 m from the hollow drill: collect the matching ridge sample.', 30),
  ('Timboy Chaco', 'Timboy Chaco', 'Pitted vertical rock face at the eastern edge of the boxwork.', 20),
]
stops = []
for k, (name, label, task, dwell) in enumerate(PICK):
    t = T[name]
    r = t['rover_at_or_before_sol']
    stops.append({'id': f's{k}', 'name': label, 'target': name, 'kind': 'rover' if k == 0 else 'science',
                  'sol': t.get('sol') or r['sol'], 'rover_sol': r['sol'], 'site': r['site'], 'drive': r['drive'],
                  'easting': r['easting'], 'northing': r['northing'], 'elev': r['elev_geoid'],
                  'what': t['what'], 'feature': t['kind'], 'task': task, 'dwellMin': dwell, 'sources': t['sources']})
json.dump({'eva': {'title': 'Ridge and hollow transect', 'goal': 'Sample a boxwork ridge and the hollow beside it to test how groundwater cemented the ridges.'},
           'stops': stops}, open('app/data/stops.json', 'w'), indent=1, ensure_ascii=False)
for s in stops: print(s['id'], s['name'], s['sol'], s['site'], s['drive'], round(s['easting'] - 8144000, 1), round(-(s['northing'] + 285200), 1))
