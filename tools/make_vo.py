#!/usr/bin/env python3
"""Make the Mission's voice track.

Reads the "say" channel of app/js/mission_copy.js, fills the numbers of the default plan, and asks the
ElevenLabs text to speech API for one MP3 per line. Two synthetic voices are used: one for the crewmate
in the rover and one for the suit's computer. Writes app/audio/vo/<key>_<i>.mp3 and app/audio/vo/index.json.

index.json stores, next to each file, the exact sentence it speaks. The game plays a clip only when the
live plan produces that same sentence (app/js/voice.js), so a changed plan falls back to text.

    python3 tools/make_vo.py --rover VOICE_ID --suit VOICE_ID
    python3 tools/make_vo.py --rover VOICE_ID --suit VOICE_ID --only radio_lost:0 site1_arrive:0

The voices in the shipped track: crewmate = "Jon - Calm Presence" (enzbGixeo55iqn1QxbbC),
suit computer = "Alex - Professional" (pHqSZYhjNK8nDCPRglTL), both from the ElevenLabs voice library.

The API key is read from the environment variable ELEVENLABS_API_KEY, or from the file named by
ELEVENLABS_KEY_FILE. It is never written anywhere by this script.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COPY = os.path.join(ROOT, 'app', 'js', 'mission_copy.js')
OUT = os.path.join(ROOT, 'app', 'audio', 'vo')
API = 'https://api.elevenlabs.io'

# The numbers of the default plan (Mars day 5076, 08:00 start, the six default stops), as the app computes them.
# If the app's numbers change, the game stops playing the affected clips until this script is run again.
VALUES = {'curiosity_sols': 267, 'hours': '4 hours', 'daylight': '6 hours', 'walkback_max': 17, 'drill_min': 16, 'drill_saved': 120}
PER_LINE = {
    'site1_done:0': {'dwell': 35},
    'site2_done:0': {'dwell': 30},
}
TARGET_LUFS = -18.0
# Model and voice settings for each speaker. The crewmate is set steady and plain so every line sounds like
# the same person talking, not performing. The suit computer uses its model's defaults.
MODEL = {'rover': 'eleven_multilingual_v2', 'suit': 'eleven_v4'}
SETTINGS = {
    'rover': {'stability': 0.75, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True, 'speed': 1.06},
    'suit': None,
}
# Names the speech engine reads with the wrong sounds, and the spelling that makes it say them right.
# Only the text sent to the engine changes. The sentence listed in index.json stays the game's sentence.
SPOKEN = {'Sajama': 'Sahama', 'Amara': 'Amahra'}


def api_key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    if k:
        return k.strip()
    p = os.environ.get('ELEVENLABS_KEY_FILE')
    if not p:
        raise SystemExit('set ELEVENLABS_API_KEY or ELEVENLABS_KEY_FILE')
    with open(os.path.expanduser(p)) as f:
        return f.read().strip()


def copy():
    s = open(COPY, encoding='utf-8').read()
    s = s[s.index('export default') + len('export default'):].strip().rstrip(';')
    return json.loads(s)


def lines():
    """Every spoken line: (id, who, sentence)."""
    out = []
    for key, v in copy().items():
        if not (isinstance(v, list) and v and isinstance(v[0], dict)):
            continue
        for i, it in enumerate(v):
            say = it.get('say')
            if not say:
                continue
            cid = '%s:%d' % (key, i)
            vals = dict(VALUES, **PER_LINE.get(cid, {}))
            missing = [k for k in re.findall(r'\{(\w+)\}', say) if k not in vals]
            if missing:
                raise SystemExit('no value for %s in %s' % (missing, cid))
            out.append((cid, it.get('who', 'rover'), re.sub(r'\{(\w+)\}', lambda m: str(vals[m.group(1)]), say)))
    return out


def tts(voice, text, model, path, settings=None):
    url = '%s/v1/text-to-speech/%s?%s' % (API, voice, urllib.parse.urlencode({'output_format': 'mp3_44100_128'}))
    body = {'text': text, 'model_id': model}
    if settings:
        body['voice_settings'] = settings
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST')
    req.add_header('xi-api-key', api_key())
    req.add_header('Content-Type', 'application/json')
    req.add_header('User-Agent', 'marcher-vo/1.0')
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            buf = r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit('HTTP %s for %r: %s' % (e.code, text, e.read().decode('utf-8', 'replace')[:400]))
    with open(path, 'wb') as f:
        f.write(buf)


def loudness(paths):
    """Integrated loudness (LUFS) of the clips played end to end, or None without ffmpeg."""
    if not shutil.which('ffmpeg') or not paths:
        return None
    cmd = ['ffmpeg', '-hide_banner', '-nostats']
    for p in paths:
        cmd += ['-i', p]
    cmd += ['-filter_complex', ''.join('[%d:a]' % i for i in range(len(paths))) + 'concat=n=%d:v=0:a=1,ebur128' % len(paths), '-f', 'null', '-']
    r = subprocess.run(cmd, capture_output=True, text=True)
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)
    return float(m[-1]) if m else None


NAMES = {'enzbGixeo55iqn1QxbbC': 'Jon - Calm Presence', 'pHqSZYhjNK8nDCPRglTL': 'Alex - Professional'}


def tag(path, voice, model):
    """Write into the MP3's own metadata that the voice is synthetic (Space Apps asks for this on SI audio)."""
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        return False
    note = ('Synthetic voice, not a human recording. Generated with SI: ElevenLabs text to speech, voice "%s", model %s. '
            'Script written with Gemini 4 Argon. Made for MARCHER by tools/make_vo.py.' % (NAMES.get(voice, voice), model))
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format_tags=comment', '-of', 'default=nw=1:nk=1', path], capture_output=True, text=True)
    if r.stdout.strip() == note:
        return False
    tmp = path + '.tag.mp3'
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', path, '-c', 'copy', '-id3v2_version', '3',
                        '-metadata', 'title=MARCHER voice line (synthetic voice)', '-metadata', 'artist=ElevenLabs text to speech (SI generated)',
                        '-metadata', 'comment=' + note, tmp], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(tmp):
        raise SystemExit('could not tag %s: %s' % (path, r.stderr[:300]))
    os.replace(tmp, path)
    return True


def seconds(path):
    if not shutil.which('ffprobe'):
        return None
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try:
        return round(float(r.stdout.strip()), 2)
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rover', required=True, help='ElevenLabs voice id for the crewmate in the rover')
    ap.add_argument('--suit', required=True, help='ElevenLabs voice id for the suit computer')
    ap.add_argument('--rover-model', default=MODEL['rover'])
    ap.add_argument('--suit-model', default=MODEL['suit'])
    ap.add_argument('--only', nargs='*', default=[], help='line ids to make again, like site1_arrive:0')
    ap.add_argument('--force', action='store_true', help='make every clip again')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, 'index.json')
    old = json.load(open(idx_path)).get('clips', {}) if os.path.exists(idx_path) else {}
    voice = {'rover': a.rover, 'suit': a.suit}
    model = {'rover': a.rover_model, 'suit': a.suit_model}
    clips = {}
    ntag = 0
    for cid, who, text in lines():
        name = cid.replace(':', '_') + '.mp3'
        path = os.path.join(OUT, name)
        o = old.get(cid, {})
        spoken = text
        for word, spell in SPOKEN.items():
            spoken = spoken.replace(word, spell)
        same = (o.get('t') == text and o.get('tts', o.get('t')) == spoken and o.get('voice') == voice[who] and o.get('model') == model[who]
                and o.get('settings') == SETTINGS[who] and os.path.exists(path))
        if a.force or cid in a.only or not same:
            tts(voice[who], spoken, model[who], path, SETTINGS[who])
            print('made', cid, '|', spoken, flush=True)
            time.sleep(1.2)
        clips[cid] = {'f': name, 't': text, 'who': who, 'voice': voice[who], 'model': model[who], 'settings': SETTINGS[who]}
        if spoken != text:
            clips[cid]['tts'] = spoken
        if tag(path, voice[who], model[who]):
            ntag += 1
        d = seconds(path)
        if d:
            clips[cid]['d'] = d
    # one gain per voice, so the two voices sit at the same level
    for who in voice:
        lu = loudness([os.path.join(OUT, c['f']) for c in clips.values() if c['who'] == who])
        if lu is None:
            continue
        g = round(min(4.0, 10 ** ((TARGET_LUFS - lu) / 20)), 3)
        print('%s voice: %.1f LUFS, gain %.3f' % (who, lu, g))
        for c in clips.values():
            if c['who'] == who:
                c['g'] = g
    with open(idx_path, 'w', encoding='utf-8') as f:
        json.dump({'made_with': 'ElevenLabs text to speech (synthetic voices), tools/make_vo.py', 'clips': clips}, f, ensure_ascii=False, indent=1)
    print(ntag, 'clips had the synthetic voice note written into their metadata')
    print(len(clips), 'clips listed in', os.path.relpath(idx_path, ROOT))
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in {c['f'] for c in clips.values()}:
            print('not listed (left in place):', f)


if __name__ == '__main__':
    sys.exit(main())
