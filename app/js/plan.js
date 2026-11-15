// EVA planner: talks to the route worker and turns legs into a timed plan
// with consumables, radiation, daylight and a GO / CAUTION / NO-GO verdict.

export class Planner {
  constructor(site, grid, step) {
    this.site = site;
    this.worker = new Worker(new URL('./route-worker.js', import.meta.url));
    this.pending = new Map();
    this.seq = 0;
    this.ready = new Promise((res, rej) => {
      this.worker.onerror = (e) => { const err = new Error('route worker: ' + (e.message || 'failed to start')); rej(err); for (const p of this.pending.values()) p(null, err); this.pending.clear(); };
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'ready') { res(); return; }
        const p = this.pending.get(m.id);
        if (p) { this.pending.delete(m.id); p(m); }
      };
    });
    this.n = grid.w;
    this.res = site.size_m / grid.w;
    this.worker.postMessage({ type: 'init', h: grid.h, n: grid.w, res: this.res, half: site.half, step });
  }
  call(msg) {
    const id = ++this.seq;
    return new Promise((res, rej) => { this.pending.set(id, (m, err) => err ? rej(err) : res(m)); this.worker.postMessage({ ...msg, id }); });
  }
  async route(pts, model, by = 'energy') { await this.ready; return (await this.call({ type: 'route', pts, model, by })).legs; }
  async walkback(from, model) { await this.ready; return (await this.call({ type: 'walkback', from, model })).minutes; }
  async slope() { await this.ready; return (await this.call({ type: 'slope' })).px; }
  async radio(from, mast, target, wave = 0) { await this.ready; return (await this.call({ type: 'radio', from, mast, target, wave })).vis; }

  // sample a site-wide grid (n x n, pixel-is-area) at world (x, z)
  sampleGrid(grid, x, z) {
    const n = this.n, res = this.res, half = this.site.half;
    const i = Math.min(n - 1, Math.max(0, Math.round((x + half) / res - 0.5)));
    const j = Math.min(n - 1, Math.max(0, Math.round((z + half) / res - 0.5)));
    return grid[j * n + i];
  }
}

// Build the timed schedule from legs. All times in SI seconds from EVA start.
// legs[k] goes from point k to point k+1; points[0] and points[last] are the rover.
export function schedule(points, legs, opts) {
  const { dwellPower, walkFloorW } = opts;
  const events = [];
  let t = 0, energy = 0, dist = 0, up = 0, down = 0, maxGrade = 0, maxSlope = 0;
  const track = []; // [x, y, z, t, energy] along the whole EVA
  for (let k = 0; k < legs.length; k++) {
    const leg = legs[k];
    if (!leg) return { ok: false, unreachable: k };
    const p = leg.pts;
    // A slow step on a steep slope cannot cost less than standing work in the suit:
    // floor every track segment at walkFloorW, so the visor's rate and the totals agree.
    let le = 0;
    for (let i = 0; i < p.length; i += 5) {
      if (i) le += Math.max(p[i + 4] - p[i - 1], walkFloorW * (p[i + 3] - p[i - 2]));
      track.push(p[i], p[i + 1], p[i + 2], t + p[i + 3], energy + le);
    }
    t += leg.time; energy += le;
    dist += leg.dist; up += leg.up; down += leg.down;
    maxGrade = Math.max(maxGrade, leg.maxGrade); maxSlope = Math.max(maxSlope, leg.maxSlope);
    const stop = points[k + 1];
    const arrive = t;
    const dwell = (stop.dwellMin || 0) * 60;
    if (dwell) {
      const x = p[p.length - 5], y = p[p.length - 4], z = p[p.length - 3];
      track.push(x, y, z, t + dwell, energy + dwellPower * dwell);
    }
    t += dwell; energy += dwellPower * dwell;
    events.push({ stop, arrive, depart: t, legTime: leg.time, legDist: leg.dist });
  }
  return { ok: true, events, total: t, energy, dist, up, down, maxGrade, maxSlope, track: new Float32Array(track) };
}

// position along the track at time t (SI seconds from EVA start)
export function trackAt(track, t) {
  const n = track.length / 5;
  if (!n) return null;
  if (t <= track[3]) return { x: track[0], y: track[1], z: track[2], e: track[4], i: 0 };
  let lo = 0, hi = n - 1;
  if (t >= track[hi * 5 + 3]) return { x: track[hi * 5], y: track[hi * 5 + 1], z: track[hi * 5 + 2], e: track[hi * 5 + 4], i: hi };
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (track[m * 5 + 3] <= t) lo = m; else hi = m; }
  const a = lo * 5, b = hi * 5, f = (t - track[a + 3]) / Math.max(1e-6, track[b + 3] - track[a + 3]);
  return {
    x: track[a] + (track[b] - track[a]) * f, y: track[a + 1] + (track[b + 1] - track[a + 1]) * f,
    z: track[a + 2] + (track[b + 2] - track[a + 2]) * f, e: track[a + 4] + (track[b + 4] - track[a + 4]) * f,
    i: lo, hx: track[b] - track[a], hz: track[b + 2] - track[a + 2],
  };
}
