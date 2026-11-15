// Space weather for the EVA date, from NASA CCMC DONKI (Space Weather Database Of
// Notifications, Knowledge, Information): coronal mass ejections (CMEs) whose WSA-ENLIL
// model run predicts an arrival at Mars.
//
// What the list can and cannot say:
//   DONKI lists a CME after it has left the Sun. So the list can clear an EVA only up to the
//   time it was fetched plus the shortest Sun-to-Mars transit in the list (our rule). A later
//   date has no forecast yet. That reads as "no forecast", never as an all-clear.
//   Looking back, a date is covered from the first listed launch day plus LONGEST_TRANSIT_D.
//
// The map ships a baked list (tools/bake_spaceweather.py). On load the app also asks
// api.nasa.gov for the last LIVE_DAYS days and merges them, so the forecast is as fresh as
// the page load. If that request fails, the baked list is used with its own date.

export const NEAR_MS = 86400e3;        // our rule: an arrival within 1 day of the EVA counts (ENLIL arrival times are estimates)
export const LONGEST_TRANSIT_D = 7;    // our rule: launches up to 7 days earlier can still arrive (longest in the baked list: 6.2 days)
export const LIVE_DAYS = 10;
const API = 'https://api.nasa.gov/DONKI/CME';
const KEY = 'DEMO_KEY';                // NASA's shared public key: about 30 requests per hour per address
const CACHE = 'marcher.donki.v1', CACHE_MS = 2 * 3600e3, MISS_MS = 20 * 60e3;

// DONKI CME records -> one Mars arrival per CME (latest run of the analysis flagged most accurate)
export function marsArrivals(cmes) {
  const out = [];
  for (const c of cmes || []) {
    let best = null, bk = null;
    for (const a of c.cmeAnalyses || []) for (const e of a.enlilList || []) for (const imp of e.impactList || []) {
      if ((imp.location || '') !== 'Mars' || !imp.arrivalTime) continue;
      const k = (a.isMostAccurate ? '1' : '0') + (e.modelCompletionTime || '');
      if (bk === null || k > bk) {
        bk = k;
        best = { cme: c.activityID, start: c.startTime, speed_kms: a.speed ?? null, arrival: imp.arrivalTime, glancing: !!imp.isGlancingBlow, link: e.link || null };
      }
    }
    if (best) out.push(best);
  }
  return out.sort((p, q) => (p.arrival < q.arrival ? -1 : 1));
}

const day = (ms) => new Date(ms).toISOString().slice(0, 10);

// Ask DONKI for the last LIVE_DAYS days. Resolves to { fetched, from, mars_cme } or null.
export async function fetchLive(now = Date.now()) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (c && now - c.fetched < CACHE_MS && now >= c.fetched) return c;
    // the shared key is rate limited: after a refusal, leave the API alone for a while
    const miss = +localStorage.getItem(CACHE + '.miss');
    if (miss && now - miss < MISS_MS && now >= miss) return null;
  } catch { /* storage blocked: fetch every time */ }
  try {
    const from = now - LIVE_DAYS * 86400e3;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(`${API}?startDate=${day(from)}&endDate=${day(now)}&api_key=${KEY}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) { try { localStorage.setItem(CACHE + '.miss', String(now)); } catch { /* fine without */ } return null; }
    const txt = await r.text();
    const live = { fetched: now, from: Date.parse(day(from) + 'T00:00Z'), mars_cme: marsArrivals(txt.trim() ? JSON.parse(txt) : []) };
    try { localStorage.setItem(CACHE, JSON.stringify(live)); } catch { /* fine without */ }
    return live;
  } catch { return null; }
}

// baked file -> the same shape as a live result
export function fromBaked(doc) {
  if (!doc || !Array.isArray(doc.mars_cme)) return null;
  return { fetched: Date.parse(doc.fetched_utc), from: Date.parse(doc.window[0] + 'T00:00Z'), mars_cme: doc.mars_cme, live: false };
}

// newer list on top of the older one; the older list keeps the launches before the newer window
export function merge(base, live) {
  if (!live) return base;
  if (!base || base.fetched < live.from) return { ...live, live: true };
  return { fetched: live.fetched, from: Math.min(base.from, live.from), live: true,
    mars_cme: [...base.mars_cme.filter(c => Date.parse(c.start) < live.from), ...live.mars_cme].sort((p, q) => (p.arrival < q.arrival ? -1 : 1)) };
}

// Space weather for an EVA from a to b (ms UTC):
//   { state: 'cme',    cme: [...] }   an arrival at Mars is predicted within NEAR_MS of the EVA
//   { state: 'clear' }                the EVA is inside what the list covers and nothing arrives
//   { state: 'ahead',  to }           the EVA is later than the list can forecast
//   { state: 'before', from }         the EVA is earlier than the list reaches back
//   { state: 'none' }                 no list at all
export function check(sw, a, b) {
  if (!sw) return { state: 'none' };
  const cme = sw.mars_cme.filter(c => { const t = Date.parse(c.arrival); return t > a - NEAR_MS && t < b + NEAR_MS; });
  if (cme.length) return { state: 'cme', cme };
  let shortest = Infinity;
  for (const c of sw.mars_cme) shortest = Math.min(shortest, Date.parse(c.arrival) - Date.parse(c.start));
  const to = sw.fetched + (isFinite(shortest) ? Math.max(0, shortest) : 0);
  const from = sw.from + LONGEST_TRANSIT_D * 86400e3;
  if (b > to) return { state: 'ahead', to, fetched: sw.fetched };
  if (a < from) return { state: 'before', from };
  return { state: 'clear', fetched: sw.fetched, to };
}
