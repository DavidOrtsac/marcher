#!/usr/bin/env python3
"""Stream Gemini 4 Argon's answer to a brief into a file. run.py BRIEF.md OUTSTEM"""
import os, sys, json, time, urllib.request, urllib.error
import google.oauth2.service_account as sa, google.auth.transport.requests as tr
HERE = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]   # a service account key with Vertex AI access
URL = ("https://aiplatform.googleapis.com/v1/projects/" + os.environ["GOOGLE_CLOUD_PROJECT"] + "/locations/global/publishers/google/models/"
       "gemini-4-argon:streamGenerateContent?alt=sse")
BRIEF, STEM = sys.argv[1], sys.argv[2]
OUT, LOG = os.path.join(HERE, STEM + ".txt"), os.path.join(HERE, STEM + ".log")
brief = open(os.path.join(HERE, BRIEF), encoding="utf-8").read()
c = sa.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/cloud-platform"])
c.refresh(tr.Request())
body = {"contents": [{"role": "user", "parts": [{"text": brief}]}],
        "generationConfig": {"temperature": 1.0, "maxOutputTokens": 32768}}
t0 = time.time()
req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                             headers={"Authorization": f"Bearer {c.token}", "Content-Type": "application/json"})
open(OUT, "w").close(); log = open(LOG, "w", buffering=1); thought = 0; last = {}
try:
    with urllib.request.urlopen(req, timeout=1500) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:"): continue
            ev = json.loads(line[5:]); last = ev
            for cand in ev.get("candidates", []):
                for p in cand.get("content", {}).get("parts", []):
                    if p.get("thought"): thought += len(p.get("text", "")); continue
                    if p.get("text"):
                        with open(OUT, "a", encoding="utf-8") as f: f.write(p["text"])
                if cand.get("finishReason"): log.write(f"finish {cand['finishReason']}\n")
            log.write(f"{round(time.time() - t0)}s thought_chars={thought} out_chars={os.path.getsize(OUT)}\n")
except urllib.error.HTTPError as e:
    log.write(f"HTTP {e.code}: {e.read().decode()[:1500]}\n"); raise SystemExit(1)
log.write(f"DONE seconds={round(time.time() - t0)} usage={json.dumps(last.get('usageMetadata', {}))}\n")
print("DONE", OUT)
