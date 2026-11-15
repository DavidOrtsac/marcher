// Route worker: least-energy walking routes, the walk-back field and radio
// line of sight, all on the site's 2 m height grid.
//
// Messages in:
//   {type:'init', h: Float32Array, n, res, half, model}
//   {type:'route', id, pts:[{x,z}], model, by}       -> {type:'route', id, legs:[...]}
//       by: 'energy' (default, least metabolic energy) or 'time' (fastest, for the walk back)
//   {type:'walkback', id, from:{x,z}, model}          -> {type:'walkback', id, minutes: Float32Array}
//   {type:'radio', id, from:{x,z}, mast, target, wave} -> {type:'radio', id, vis: Uint8Array}
// model = { grades: Float32Array (grade values), jPerM: Float32Array (J per metre walked
//           at that grade), sPerM: Float32Array (s per metre), maxGrade, maxCellSlope }
//   built by js/suit.js from the published walking model.

let H, N, RES, HALF, SLOPE, STEP;

function idx(i, j) { return j * N + i; }
function toCell(x, z) {
  return [Math.min(N - 1, Math.max(0, Math.round((x + HALF) / RES - 0.5))),
          Math.min(N - 1, Math.max(0, Math.round((z + HALF) / RES - 0.5)))];
}
function cellXZ(i, j) { return [-HALF + (i + 0.5) * RES, -HALF + (j + 0.5) * RES]; }

function computeSlope() {
  SLOPE = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const l = H[idx(Math.max(i - 1, 0), j)], r = H[idx(Math.min(i + 1, N - 1), j)];
    const u = H[idx(i, Math.max(j - 1, 0))], d = H[idx(i, Math.min(j + 1, N - 1))];
    const gx = (r - l) / (2 * RES), gz = (d - u) / (2 * RES);
    SLOPE[idx(i, j)] = Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI;
  }
}

// 16-connected moves: smoother lines than 8-connected, same grid
const MOVES = [];
for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1],[2,1],[1,2],[-2,1],[-1,2],[2,-1],[1,-2],[-2,-1],[-1,-2]])
  MOVES.push({ di, dj, d: Math.hypot(di, dj) });
for (const m of MOVES) m.rev = MOVES.findIndex(q => q.di === -m.di && q.dj === -m.dj);

// Per-move sampling, built once the grid is known. Diagonal and knight moves cross ground
// between their end cells, so they are summed over ~1 m sub-steps on the same bilinear
// surface legStats() walks: each sub-point is 4 fixed cell offsets and weights.
function buildMoves() {
  for (const m of MOVES) {
    m.dist = m.d * RES; m.off = m.dj * N + m.di;
    m.n = (m.di === 0 || m.dj === 0) ? 1 : Math.round(m.dist);
    m.dd = m.dist / m.n;
    m.so = new Int32Array((m.n - 1) * 4); m.sw = new Float64Array((m.n - 1) * 4);
    for (let q = 1; q < m.n; q++) {
      const u = m.di * q / m.n, v = m.dj * q / m.n, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, k = (q - 1) * 4;
      m.so.set([j * N + i, j * N + i + 1, (j + 1) * N + i, (j + 1) * N + i + 1], k);
      m.sw.set([(1 - fu) * (1 - fv), fu * (1 - fv), (1 - fu) * fv, fu * fv], k);
    }
  }
}

function interp(table, grades, g) {
  const n = grades.length;
  if (g <= grades[0]) return table[0];
  if (g >= grades[n - 1]) return table[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (grades[m] <= g) lo = m; else hi = m; }
  const t = (g - grades[lo]) / (grades[hi] - grades[lo]);
  return table[lo] * (1 - t) + table[hi] * t;
}

// O(1) lookup tables on a uniform grade grid (-1..1, step 0.002), built once per model message
const GT = 500;
function tables(model) {
  if (model._J) return model;
  const J = new Float32Array(2 * GT + 1), T = new Float32Array(2 * GT + 1);
  for (let i = 0; i <= 2 * GT; i++) { const g = i / GT - 1; J[i] = interp(model.jPerM, model.grades, g); T[i] = interp(model.sPerM, model.grades, g); }
  model._J = J; model._T = T;
  return model;
}
const gi = (g) => Math.max(0, Math.min(2 * GT, Math.round((g + 1) * GT)));

// Cost of move m from cell a (or Infinity), plus its time.
// The planner minimises the same number legStats() reports.
function moveCost(a, m, model, out) {
  const b = a + m.off, dist = m.dist;
  const dh = H[b] - H[a];
  const g = dh / dist;
  if (Math.abs(g) > model.maxGrade) return Infinity;
  if (SLOPE[b] > model.maxCellSlope) return Infinity;
  if (STEP && STEP[b] > model.maxStep) return Infinity;
  let e, t;
  if (m.n === 1) {
    const d3 = Math.sqrt(dist * dist + dh * dh), k = gi(g);
    e = model._J[k] * d3; t = model._T[k] * d3;
  } else {
    const n = m.n, dd = m.dd, so = m.so, sw = m.sw;
    let ph = H[a]; e = 0; t = 0;
    for (let q = 1; q <= n; q++) {
      const o = (q - 1) * 4;
      const h = q === n ? H[b] : H[a + so[o]] * sw[o] + H[a + so[o + 1]] * sw[o + 1] + H[a + so[o + 2]] * sw[o + 2] + H[a + so[o + 3]] * sw[o + 3];
      const sh = h - ph, d3 = Math.sqrt(dd * dd + sh * sh), k = gi(sh / dd);
      e += model._J[k] * d3; t += model._T[k] * d3;
      ph = h;
    }
  }
  // side-slope penalty: ground steeper than the walking line is harder footing
  const side = SLOPE[b] - Math.abs(g) * 57.2958;   // small-angle grade in degrees is close enough here
  const pen = side > model.sideFree ? 1 + model.sidePenalty * (side - model.sideFree) : 1;
  if (out) out.t = t;
  return e * pen;
}

// A knight move (2 cells one way, 1 the other) crosses two cells between its ends.
// Both must be walkable, so the line never cuts over no-go ground.
const blocked = (c, model) => SLOPE[c] > model.maxCellSlope || (STEP && STEP[c] > model.maxStep);
function knightBlocked(ci, cj, m, model) {
  const si = Math.sign(m.di), sj = Math.sign(m.dj);
  const a = Math.abs(m.di) === 2 ? (cj * N + ci + si) : ((cj + sj) * N + ci);
  const b = Math.abs(m.di) === 2 ? ((cj + m.dj) * N + ci + si) : ((cj + sj) * N + ci + m.di);
  return blocked(a, model) || blocked(b, model);
}

class Heap {
  constructor(cap) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  push(key, val) {
    let i = this.n++;
    if (i >= this.k.length) { const k = new Float64Array(this.k.length * 2); k.set(this.k); this.k = k; const v = new Int32Array(this.v.length * 2); v.set(this.v); this.v = v; }
    while (i > 0) { const p = (i - 1) >> 1; if (this.k[p] <= key) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
    this.k[i] = key; this.v[i] = val;
  }
  pop() {
    const top = this.v[0]; this.topKey = this.k[0];
    const key = this.k[--this.n], val = this.v[this.n];
    let i = 0;
    for (;;) { let c = 2 * i + 1; if (c >= this.n) break; if (c + 1 < this.n && this.k[c + 1] < this.k[c]) c++; if (this.k[c] >= key) break; this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c; }
    this.k[i] = key; this.v[i] = val;
    return top;
  }
}

function astar(s, t, model, byTime = false) {
  const g = new Float64Array(N * N).fill(Infinity);
  const from = new Int32Array(N * N).fill(-1);
  const closed = new Uint8Array(N * N);
  // admissible heuristic: horizontal distance x cheapest energy (or time) per metre at any grade
  let minJ = Infinity; for (const v of (byTime ? model.sPerM : model.jPerM)) minJ = Math.min(minJ, v);
  const o = { t: 0 };
  const ti = t % N, tj = (t / N) | 0;
  const hfun = (c) => Math.hypot((c % N) - ti, ((c / N) | 0) - tj) * RES * minJ;
  const heap = new Heap(1 << 16);
  g[s] = 0; heap.push(hfun(s), s);
  while (heap.n) {
    const c = heap.pop();
    if (closed[c]) continue;
    closed[c] = 1;
    if (c === t) break;
    const ci = c % N, cj = (c / N) | 0;
    for (const m of MOVES) {
      const ni = ci + m.di, nj = cj + m.dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nb = nj * N + ni;
      if (closed[nb]) continue;
      if (m.d > 1.5 && knightBlocked(ci, cj, m, model)) continue;
      const w = moveCost(c, m, model, o);
      if (!isFinite(w)) continue;
      const ng = g[c] + (byTime ? o.t : w);
      if (ng < g[nb]) { g[nb] = ng; from[nb] = c; heap.push(ng + hfun(nb), nb); }
    }
  }
  if (from[t] === -1 && s !== t) return null;
  const path = [];
  for (let c = t; c !== -1; c = from[c]) { path.push(c); if (c === s) break; }
  return path.reverse();
}

// bilinear height on the 2 m grid at world (x, z)
function hAt(x, z) {
  let u = (x + HALF) / RES - 0.5, v = (z + HALF) / RES - 0.5;
  u = Math.min(Math.max(u, 0), N - 1.001); v = Math.min(Math.max(v, 0), N - 1.001);
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, o = j * N + i;
  return (H[o] * (1 - fu) + H[o + 1] * fu) * (1 - fv) + (H[o + N] * (1 - fu) + H[o + N + 1] * fu) * fv;
}

// Grid paths zigzag between the 16 move directions. Resample every 1 m and apply a
// Gaussian average (sigma 2 m, ends fixed); the line stays within ~2 m of the
// least-energy cells, and any point that drifts onto no-go ground keeps its grid position.
function smooth(path, model) {
  const raw = [];
  for (let k = 0; k < path.length; k++) {
    const [x, z] = cellXZ(path[k] % N, (path[k] / N) | 0);
    if (k === 0) { raw.push([x, z]); continue; }
    const [px, pz] = raw[raw.length - 1];
    const d = Math.hypot(x - px, z - pz), m = Math.max(1, Math.round(d));
    for (let i = 1; i <= m; i++) raw.push([px + (x - px) * i / m, pz + (z - pz) * i / m]);
  }
  const out = raw.map(p => p.slice());
  const R = 6, w = [];
  for (let i = -R; i <= R; i++) w.push(Math.exp(-(i * i) / (2 * 2 * 2)));
  for (let k = 1; k < raw.length - 1; k++) {
    let sx = 0, sz = 0, sw = 0;
    for (let i = -R; i <= R; i++) {
      const q = raw[Math.min(raw.length - 1, Math.max(0, k + i))];
      sx += q[0] * w[i + R]; sz += q[1] * w[i + R]; sw += w[i + R];
    }
    const [ci, cj] = toCell(sx / sw, sz / sw);
    if (!blocked(idx(ci, cj), model)) out[k] = [sx / sw, sz / sw];
  }
  return out;
}

function legStats(path, model) {
  const P = smooth(path, model);
  const pts = [];
  let dist = 0, time = 0, energy = 0, up = 0, down = 0, maxGrade = 0, maxSlope = 0;
  let px = P[0][0], pz = P[0][1], ph = hAt(px, pz);
  pts.push(px, ph, pz, 0, 0);
  for (let k = 1; k < P.length; k++) {
    const [x, z] = P[k], h = hAt(x, z);
    const dd = Math.hypot(x - px, z - pz);
    if (dd < 1e-6) continue;
    const dh = h - ph, g = dh / dd, d3 = Math.hypot(dd, dh);
    const [ci, cj] = toCell(x, z), sl = SLOPE[idx(ci, cj)];
    const side = Math.max(0, sl - Math.abs(Math.atan(g) * 57.2958));
    const pen = 1 + model.sidePenalty * Math.max(0, side - model.sideFree);
    energy += interp(model.jPerM, model.grades, g) * d3 * pen;
    time += interp(model.sPerM, model.grades, g) * d3;
    dist += d3;
    if (dh > 0) up += dh; else down -= dh;
    maxSlope = Math.max(maxSlope, sl);
    pts.push(x, h, z, time, energy);
    px = x; pz = z; ph = h;
  }
  // steepest walking grade over 10 m baselines (a single 1 m step is DTM noise)
  for (let k = 0; k + 10 < pts.length / 5; k += 2) {
    const a = k * 5, b = (k + 10) * 5;
    const dd = Math.hypot(pts[b] - pts[a], pts[b + 2] - pts[a + 2]);
    if (dd > 5) maxGrade = Math.max(maxGrade, Math.abs(Math.atan((pts[b + 1] - pts[a + 1]) / dd) * 57.2958));
  }
  return { pts: new Float32Array(pts), dist, time, energy, up, down, maxGrade, maxSlope };
}

// Stops often sit where Curiosity parked against a ridge wall: step to the
// nearest walkable cell (within 30 m) so the astronaut stands beside it.
function snap(p, model, reach) {
  const [i, j] = toCell(p.x, p.z);
  const ok = (c) => reach ? reach[c] === 1 : (SLOPE[c] <= model.maxCellSlope && (!STEP || STEP[c] <= model.maxStep));
  if (ok(idx(i, j))) return idx(i, j);
  let best = -1, bd = Infinity;
  for (let dj = -15; dj <= 15; dj++) for (let di = -15; di <= 15; di++) {
    const ii = i + di, jj = j + dj;
    if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue;
    const d = di * di + dj * dj;
    if (d < bd && ok(idx(ii, jj))) { bd = d; best = idx(ii, jj); }
  }
  return best >= 0 ? best : idx(i, j);
}

// every cell reachable on foot from s under the model's limits (flood fill over legal moves)
function reachable(s, model) {
  const seen = new Uint8Array(N * N), stack = new Int32Array(N * N);
  let top = 0; stack[top++] = s; seen[s] = 1;
  while (top) {
    const c = stack[--top], ci = c % N, cj = (c / N) | 0;
    for (let k = 0; k < 8; k++) {
      const m = MOVES[k], ni = ci + m.di, nj = cj + m.dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nb = nj * N + ni;
      if (seen[nb]) continue;
      if (!isFinite(moveCost(c, m, model))) continue;
      seen[nb] = 1; stack[top++] = nb;
    }
  }
  return seen;
}

function walkback(from, model, capMin = 75) {
  // Dijkstra from the rover over reversed moves: time (s) to walk from each cell back.
  // Same 16 moves as the route planner, so the field agrees with a timed route back. Stopped at capMin.
  const s = snap(from, model);
  const t = new Float64Array(N * N).fill(Infinity);
  const heap = new Heap(1 << 18);
  t[s] = 0; heap.push(0, s);
  const o = { t: 0 }, cap = capMin * 60;
  while (heap.n) {
    const c = heap.pop();
    const tc = t[c];
    if (heap.topKey > tc + 1e-9) continue;     // stale entry
    if (tc > cap) break;
    const ci = c % N, cj = (c / N) | 0;
    for (let mk = 0; mk < 16; mk++) {
      const m = MOVES[mk];
      const ni = ci + m.di, nj = cj + m.dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nb = nj * N + ni;
      if (t[nb] <= tc) continue;
      if (m.d > 1.5 && knightBlocked(ci, cj, m, model)) continue;   // crosses the same two cells either way
      // walking from nb to c
      const w = moveCost(nb, MOVES[m.rev], model, o);
      if (!isFinite(w)) continue;
      const nt = tc + o.t;
      if (nt < t[nb] - 1e-6) { t[nb] = nt; heap.push(nt, nb); }
    }
  }
  const out = new Float32Array(N * N);
  for (let k = 0; k < out.length; k++) out[k] = t[k] / 60;
  return out;
}

function radio(from, mast, target, wave) {
  // Viewshed on the 2 m grid (Franklin R2): rays from the antenna to every edge cell. A cell has a
  // link when the line from the antenna to a helmet there clears the ground, or when the ground
  // cuts that line by less than the first Fresnel zone of the radio at the cut (wave = wavelength, m).
  // A cut that shallow bends a UHF signal around the ground and does not stop it. A wall or a ridge
  // close to either end of the line has a small Fresnel zone, so it still blocks.
  const [si, sj] = toCell(from.x, from.z);
  const eye = H[idx(si, sj)] + mast;
  const vis = new Uint8Array(N * N);
  vis[idx(si, sj)] = 1;
  const hd = new Float64Array(N + 2), hg = new Float64Array(N + 2);   // upper hull of the ground profile along the ray
  const ray = (ei, ej) => {
    const di = ei - si, dj = ej - sj, steps = Math.max(Math.abs(di), Math.abs(dj));
    let hn = 0;
    for (let k = 1; k <= steps; k++) {
      const fi = si + di * k / steps, fj = sj + dj * k / steps;
      const i = Math.round(fi), j = Math.round(fj);
      const c = j * N + i;
      const d = Math.hypot(fi - si, fj - sj) * RES;
      const drop = d * d / (2 * 3396190); // Mars curvature (sphere radius of the map projection)
      const g = H[c] - drop - eye;        // ground here, measured from the antenna
      const tTarget = (g + target) / d;
      // the ground that stands furthest into the line to this helmet is a corner of the hull
      let lo = 0, hi = hn - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if ((hg[m + 1] - hg[m]) / (hd[m + 1] - hd[m]) > tTarget) lo = m + 1; else hi = m; }
      const cut = hn ? hg[lo] - tTarget * hd[lo] : -1;
      if (cut <= 0 || cut * cut <= wave * hd[lo] * (d - hd[lo]) / d) vis[c] = 1;
      while (hn >= 2 && (hg[hn - 1] - hg[hn - 2]) * (d - hd[hn - 2]) <= (g - hg[hn - 2]) * (hd[hn - 1] - hd[hn - 2])) hn--;
      hd[hn] = d; hg[hn] = g; hn++;
    }
  };
  for (let k = 0; k < N; k++) { ray(k, 0); ray(k, N - 1); ray(0, k); ray(N - 1, k); }
  return vis;
}

onmessage = (e) => {
  const m = e.data;
  if (m.model) tables(m.model);
  if (m.type === 'init') { H = m.h; N = m.n; RES = m.res; HALF = m.half; STEP = m.step || null; buildMoves(); computeSlope(); postMessage({ type: 'ready' }); return; }
  if (m.type === 'route') {
    const legs = [];
    const start = snap(m.pts[0], m.model);
    const reach = reachable(start, m.model);
    const cells = m.pts.map((p, k) => k === 0 ? start : snap(p, m.model, reach));
    for (let k = 0; k + 1 < m.pts.length; k++) {
      const path = astar(cells[k], cells[k + 1], m.model, m.by === 'time');
      legs.push(path ? legStats(path, m.model) : null);
    }
    postMessage({ type: 'route', id: m.id, legs });
    return;
  }
  if (m.type === 'walkback') {
    const minutes = walkback(m.from, m.model);
    postMessage({ type: 'walkback', id: m.id, minutes }, [minutes.buffer]);
    return;
  }
  if (m.type === 'slope') {
    // slope in degrees x 4, 8 bit, for the slope layer (saves shipping a 1.7 MB PNG)
    const out = new Uint8Array(N * N);
    for (let k = 0; k < out.length; k++) out[k] = Math.min(255, Math.round(SLOPE[k] * 4));
    postMessage({ type: 'slope', id: m.id, px: out }, [out.buffer]);
    return;
  }
  if (m.type === 'radio') {
    const vis = radio(m.from, m.mast, m.target, m.wave || 0);
    postMessage({ type: 'radio', id: m.id, vis }, [vis.buffer]);
  }
};
