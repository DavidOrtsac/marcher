#!/usr/bin/env python3
"""The project page text, streamed: run5.py OUTSTEM PROMPT.md MODEL
Sends PROMPT.md as it is and streams the answer to OUTSTEM.txt with a progress log in OUTSTEM.log."""
import os, sys, json, time, urllib.request, urllib.error
import google.oauth2.service_account as sa, google.auth.transport.requests as tr
HERE = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]   # a service account key with Vertex AI access
STEM, PROMPT, MODEL = sys.argv[1], sys.argv[2], sys.argv[3]
URL = ("https://aiplatform.googleapis.com/v1/projects/" + os.environ["GOOGLE_CLOUD_PROJECT"] + "/locations/global/publishers/google/models/"
       f"{MODEL}:streamGenerateContent?alt=sse")
OUT, LOG = os.path.join(HERE, STEM + ".txt"), os.path.join(HERE, STEM + ".log")
c = sa.Credentials.from_service_account_file(KEY, scopes=["https://www.googleapis.com/auth/cloud-platform"])
c.refresh(tr.Request())
body = {"contents": [{"role": "user", "parts": [{"text": open(os.path.join(HERE, PROMPT), encoding="utf-8").read()}]}],
        "generationConfig": {"temperature": 1.0, "maxOutputTokens": 32768}}
t0 = time.time()
req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                             headers={"Authorization": f"Bearer {c.token}", "Content-Type": "application/json"})
open(OUT, "w").close(); log = open(LOG, "w", buffering=1); last = {}
log.write(f"model {MODEL}\n")
try:
    with urllib.request.urlopen(req, timeout=900) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:"): continue
            ev = json.loads(line[5:]); last = ev
            for cand in ev.get("candidates", []):
                for p in cand.get("content", {}).get("parts", []):
                    if p.get("text") and not p.get("thought"):
                        with open(OUT, "a", encoding="utf-8") as f: f.write(p["text"])
                if cand.get("finishReason"): log.write(f"finish {cand['finishReason']}\n")
            log.write(f"{round(time.time() - t0)}s out_chars={os.path.getsize(OUT)}\n")
except urllib.error.HTTPError as e:
    log.write(f"HTTP {e.code}: {e.read().decode()[:1500]}\n"); raise SystemExit(1)
log.write(f"DONE seconds={round(time.time() - t0)} model={last.get('modelVersion')} usage={json.dumps(last.get('usageMetadata', {}))}\n")
print("DONE", OUT)
