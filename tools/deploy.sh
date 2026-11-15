#!/bin/bash
# Publish the app code and the small data files to the public bucket.
# The big terrain tiles go up from the bake VM (tools/bake_site.py output), never from this Mac.
set -e
cd "$(dirname "$0")/../app"
B=gs://transcendiant-marcher
OLD=gs://transcendiant-marswalk   # the first link, from before the project was renamed during the hackathon, kept as a mirror
G="gcloud --configuration=robot storage"
NC="no-cache, max-age=0"
$G cp -z html index.html "$B/index.html" --cache-control="$NC" >/dev/null
$G cp -z js,css,svg -r css js vendor img "$B/" --cache-control="$NC" >/dev/null
DATA=""
for f in data/step_2m.png data/relief_2m.png data/curiosity_track.json data/stops.json data/weather.json data/spaceweather.json data/layers.json data/themis_ti.png data/crism_hyd.png data/mars_global.jpg; do
  [ -f "$f" ] && $G cp -z json "$f" "$B/$f" --cache-control="$NC" >/dev/null && DATA="$DATA $B/$f"
done
$G cp -z glb -r models "$B/" --cache-control="$NC" >/dev/null
for f in ../LICENSE ../NOTICE ../README.md; do
  $G cp "$f" "$B/$(basename "$f")" --content-type="text/plain; charset=utf-8" --cache-control="$NC" >/dev/null
done
# the voice track: the list and one MP3 per spoken line
[ -f audio/vo/index.json ] && $G cp -r audio "$B/" --cache-control="$NC" >/dev/null
[ -f data/pov/index.json ] && $G cp -z json data/pov/index.json "$B/data/pov/index.json" --cache-control="$NC" >/dev/null
# mirror what was just published, bucket to bucket (nothing leaves this Mac twice)
$G cp -r "$B/index.html" "$B/css" "$B/js" "$B/vendor" "$B/img" "$B/models" "$B/audio" "$B/LICENSE" "$B/NOTICE" "$B/README.md" "$OLD/" >/dev/null
$G cp $DATA "$OLD/data/" >/dev/null
$G cp "$B/data/pov/index.json" "$OLD/data/pov/index.json" >/dev/null
echo "https://storage.googleapis.com/transcendiant-marcher/index.html"
