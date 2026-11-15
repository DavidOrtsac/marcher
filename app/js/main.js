import * as THREE from '../vendor/three.module.min.js';
import { loadSite, makeFrames, loadHeights, makeSampler, loadGray } from './site.js';
import { Terrain } from './terrain.js';
import { Sky } from './sky.js';
import { TableControls, WalkControls } from './controls.js';
import { Planner, schedule, trackAt } from './plan.js';
import { RouteRibbon, Pins, PhotoBubbles } from './overlays.js';
import { UI, fmtHM, fmtDur } from './ui.js';
import { SUIT, routeModel, evaBudgetJ, metabolicW, speedAt } from './suit.js';
import { parseWeather, outlookFor } from './weather.js';
import { sunAt, mslSol, mslUtcFor, sunEvents, marsClock, marsYear } from './marstime.js';
import * as SW from './spaceweather.js';
import { Story } from './story.js';

const canvas = document.getElementById('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { window.__fail?.('This browser could not start WebGL, which the 3D map needs. Use a current Chrome, Safari, Firefox or Edge with hardware acceleration on.'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 40000);
const sky = new Sky(scene);
if (Math.min(innerWidth, innerHeight) < 700) sky.sun.shadow.mapSize.set(2048, 2048); // lighter on phone GPUs
const ui = new UI(document.getElementById('ui'), {
  mode: (m) => setMode(m),
  pickStop: (id) => focusStop(id),
  // a stop added on the map comes off again; the six Curiosity sites stay
  removeStop: (id) => {
    const k = stops.findIndex(s => s.id === id && s.custom);
    if (k < 1 || state.mode !== 'plan') return;
    stops.splice(k, 1);
    stops.forEach((s, i) => { s.key = i === 0 ? 'R' : String(i); });
    if (state.focus === id) state.focus = null;
    rebuildRoute();
  },
  layer: (L) => applyLayer(L),
  action: (a) => doAction(a),
  scrub: (hr) => { state.cursorLmst = hr; state.follow = false; updateTime(); },
  moveEva: (hr) => { state.startLmst = Math.max(0, Math.min(23, hr)); rebuildSchedule(false); },
  moveEvaDone: () => rebuildSchedule(true),
  sol: (d) => { if (state.mode !== 'plan') return; state.sol += d; rebuildSchedule(false); },
  walkRate: (r) => {
    if (r === 'drill') { toggleDrill(); return; }
    if (r === 'pause') state.walkRate = 0; else state.walkRate = +r; ui.setWalkRate(r);
  },
});

// the crew rover's model starts downloading now, beside the terrain, so it is parked before the walk can begin
const roverModel = import('./rover.js').then(m => m.loadRover());
roverModel.catch(() => {});
const site = await loadSite('data/');
const frames = makeFrames(site);
const stopsDocP = fetch(site.base + 'stops.json').then(r => { if (!r.ok) throw new Error(`could not load stops.json (HTTP ${r.status})`); return r.json(); });
const terrain = await new Terrain(site, renderer).build(innerWidth < 700);
scene.add(terrain.group);
const heightAt = (x, z) => terrain.heightAt(x, z);
const table = new TableControls(camera, canvas, heightAt, site.half);
const walk = new WalkControls(camera, canvas, heightAt, site.half);
const ribbon = new RouteRibbon(scene);
const pins = new Pins(document.getElementById('pins'), camera, (p) => focusStop(p.id));

const center = frames.toLonLat(0, 0);
ui.setSite('Mount Sharp boxwork · Gale crater', `${Math.abs(center.lat).toFixed(3)}° S  ${center.lon.toFixed(3)}° E`);

// A first visit lands on the title screen with its two tracks: The Mission (guided story)
// and Mission Control (this planner). ?pro opens the planner at once, ?story the story.
const QS = new URLSearchParams(location.search);
const FILM = QS.has('film'), DEBUG = FILM || QS.has('debug');
const story = FILM ? null : new Story();
const OPEN = !story ? 'control' : QS.has('story') ? 'story' : QS.has('title') ? 'title' : (DEBUG || QS.has('pro')) ? 'control' : 'title';
let onTick = null;

// Show the terrain at once; the plan arrives when the route data has loaded.
let booted = false;
{
  const s0 = sunAt(mslUtcFor(mslSol(Date.now()).sol + 2, 9.0), center.lat, center.lon);
  sky.setSun(s0.az, s0.el);
  const sd = await stopsDocP;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const q of sd.stops) { const w = frames.toWorld(q.easting, q.northing); x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); z0 = Math.min(z0, w.z); z1 = Math.max(z1, w.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = Math.max(x1 - x0, z1 - z0) / 2, portrait = innerWidth < innerHeight;
  table.flyTo(new THREE.Vector3(cx, heightAt(cx, cz), cz), Math.max(1000, r * 4.2) * (portrait ? 2.1 : 1), 0.55, portrait ? 0.62 : 0.92);
  table.cur.target.copy(table.goal.target); Object.assign(table.cur, { dist: table.goal.dist * 1.5, az: table.goal.az - 0.4, pol: table.goal.pol * 0.8 });
  if (OPEN !== 'control') { document.body.classList.add('cine', 'title', 'nopins'); if (OPEN === 'title') story.showTitle(); }
  else if (innerWidth > 900) camera.setViewOffset(innerWidth, innerHeight, 42, 42, innerWidth, innerHeight);
  else camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.24, innerWidth, innerHeight);
  let t0 = performance.now();
  const preview = (now) => {
    if (booted) return;
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    table.update(dt * 0.5);
    sky.fitShadow(table.cur.target.x, table.cur.target.y, table.cur.target.z, 1600);
    sky.follow(camera);
    renderer.render(scene, camera);
    requestAnimationFrame(preview);
  };
  requestAnimationFrame(preview);
  document.body.classList.add('pending');
  document.getElementById('loading')?.classList.add('done');
}

const [grid2, stopsDoc, wx, swDoc] = await Promise.all([
  loadHeights(site.base + site.dem_2m.file, site.dem_2m.n),
  stopsDocP,
  fetch(site.base + 'weather.json').then(r => r.ok ? r.json() : null).catch(() => null),
  fetch(site.base + 'spaceweather.json').then(r => r.ok ? r.json() : null).catch(() => null),
]);
// steepest 1 m step per 2 m cell (degrees x 2), from the 1 m HiRISE DTM
const stepGrid = await loadGray(site.base + 'step_2m.png');
const step2 = new Float32Array(stepGrid.v.length);
for (let k = 0; k < step2.length; k++) step2[k] = stepGrid.v[k] * 0.5;
const planner = new Planner(site, grid2, step2);
{
  const t = new THREE.DataTexture(stepGrid.v, stepGrid.w, stepGrid.hgt, THREE.RedFormat, THREE.UnsignedByteType);
  t.needsUpdate = true; terrain.setLayerTexture('tStep', t);
}
const model = routeModel(SUIT);

const stops = stopsDoc.stops.map((s, k) => {
  const w = frames.toWorld(s.easting, s.northing);
  return { ...s, key: k === 0 ? 'R' : String(k), x: w.x, z: w.z, y: heightAt(w.x, w.z) };
});
const rover = stops[0];

// EVA day: two sols after today on Curiosity's clock, close enough for DONKI to forecast
const nowSol = mslSol(Date.now()).sol;
const state = {
  mode: 'plan', sol: nowSol + 2, startLmst: 8.0, cursorLmst: 9.0, follow: false,
  walkT: 0, walkRate: 30, layers: {}, sched: null, legs: null, focus: null, cam: 'auto', followK: 0,
};
// space weather: the baked DONKI list now, a fresh one from api.nasa.gov when it answers
let swx = SW.fromBaked(swDoc);
SW.fetchLive().then(live => { if (!live) return; swx = SW.merge(swx, live); if (state.sched) renderPlan(); });

// --------- route + schedule ---------
async function rebuildRoute() {
  const pts = [...stops, rover].map(s => ({ x: s.x, z: s.z }));
  // the verdict needs all three: the route, the walk-back field and the radio map (the last two are computed once)
  [state.legs] = await Promise.all([planner.route(pts, model), ensureWalkback(), ensureRadio()]);
  rebuildSchedule(true);
}

// cumulative walked distance (m) at each track sample
function cumDist(tr) {
  const c = new Float32Array(tr.length / 5);
  for (let i = 1; i < c.length; i++) c[i] = c[i - 1] + Math.hypot(tr[i * 5] - tr[i * 5 - 5], tr[i * 5 + 2] - tr[i * 5 - 3]);
  return c;
}
function alongAt(tr, cum, t) {
  const p = trackAt(tr, t);
  return cum[p.i] + Math.hypot(p.x - tr[p.i * 5], p.z - tr[p.i * 5 + 2]);
}
// nearest cell within maxM of (x, z) that passes ok(value); null if none
function nearestCell(grid, x, z, maxM, ok) {
  const n = planner.n, res = planner.res;
  const ci = Math.round((x + site.half) / res - 0.5), cj = Math.round((z + site.half) / res - 0.5), R = Math.ceil(maxM / res);
  let best = null;
  for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
    const i = ci + di, j = cj + dj;
    if (i < 0 || j < 0 || i >= n || j >= n) continue;
    const d = Math.hypot(di, dj) * res;
    if (d > maxM || (best && d >= best.d) || !ok(grid[j * n + i])) continue;
    best = { d, v: grid[j * n + i], x: (i + 0.5) * res - site.half, z: (j + 0.5) * res - site.half };
  }
  return best;
}

function rebuildSchedule(full) {
  const pts = [...stops, { ...rover, dwellMin: 0 }];
  const sc = schedule(pts, state.legs, { dwellPower: SUIT.stationW, walkFloorW: SUIT.stationW });
  state.sched = sc;
  if (sc.ok && state.walkback) {
    // longest walk back to the rover anywhere on the route
    let wb = 0;
    for (let i = 0; i < sc.track.length; i += 5) wb = Math.max(wb, planner.sampleGrid(state.walkback, sc.track[i], sc.track[i + 2]));
    sc.maxWalkback = wb;
  }
  if (sc.ok) sc.cum = cumDist(sc.track);
  if (sc.ok && state.radio) {
    // share of the EVA time with radio line of sight to the rover mast, and the stops without it
    const tr = sc.track; let lit = 0;
    for (let i = 5; i < tr.length; i += 5) if (planner.sampleGrid(state.radio, tr[i], tr[i + 2])) lit += tr[i + 3] - tr[i - 2];
    sc.radioShare = sc.total > 0 ? lit / sc.total : 1;
    sc.radioDark = [];
    sc.events.forEach((e, k) => {
      if (e.depart <= e.arrive) return;
      const p = trackAt(tr, e.arrive);
      if (planner.sampleGrid(state.radio, p.x, p.z)) return;
      const near = nearestCell(state.radio, p.x, p.z, 100, v => v > 0);
      sc.radioDark.push({ key: pts[k + 1].key, near: near ? Math.max(1, Math.round(near.d)) : null });
    });
  }
  if (full && sc.ok) ribbon.set(sc.track, heightAt);
  renderPlan();
}

const MARS_HOUR_S = 88775.244 / 24;   // MSL sol length 88775.244 s (NAIF msl_lmst kernel)
function lmstAt(t) { return state.startLmst + t / MARS_HOUR_S; }
const weather = wx ? parseWeather(wx) : null;

function evaUtcWindow() {
  const sc = state.sched;
  const a = mslUtcFor(state.sol, state.startLmst);
  return [a, a + (sc?.ok ? sc.total * 1000 : 0)];
}
function spaceWx() { const [a, b] = evaUtcWindow(); return SW.check(swx, a, b); }
const utcShort = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
const WALK_RANGE_MIN = SUIT.walkRangeM / SUIT.paceMs / 60;   // the 2 km walking range at the planning pace

function renderPlan() {
  const sc = state.sched;
  const ev = sunEvents(state.sol, center.lat, center.lon);
  const endLmst = state.startLmst + (sc.ok ? sc.total : 0) / MARS_HOUR_S;
  const issues = [], cautions = [];
  const budget = evaBudgetJ(SUIT);
  if (!sc.ok) issues.push(`no safe line to stop ${sc.unreachable + 1}`);
  const sunsetMargin = ev.sunsetLmst !== null ? (ev.sunsetLmst - endLmst) : 0;
  if (sc.ok) {
    if (sunsetMargin < 0) issues.push('ends after sunset');
    else if (sunsetMargin < 1) cautions.push('under 1 h of daylight left at the end');
    if (sc.total > SUIT.evaHours * 3600) issues.push(`longer than the ${SUIT.evaHours} h EVA limit`);
    if (sc.energy > budget) issues.push('over the 8 h metabolic budget');
    if (sc.maxWalkback !== undefined && sc.maxWalkback > WALK_RANGE_MIN) cautions.push(`the route goes ${Math.ceil(sc.maxWalkback)} min from the crew rover, past the 2 km walking range`);
    if (ev.sunriseLmst === null || state.startLmst < ev.sunriseLmst) issues.push('starts before sunrise');
    else if (state.startLmst < ev.sunriseLmst + 0.75) cautions.push('starts in low Sun, long shadows');
    if (sc.radioDark?.length) {
      const d = sc.radioDark, near = d.every(q => q.near !== null) ? Math.max(...d.map(q => q.near)) : null;
      cautions.push(`no radio line of sight to the crew rover at stop${d.length > 1 ? 's' : ''} ${d.map(q => q.key).join(', ')}` + (near !== null ? ` (link ${near} m away)` : ''));
    }
    const sx = spaceWx();
    if (sx.state === 'cme') cautions.push(`CME predicted at Mars ${sx.cme[0].arrival.slice(5, 16).replace('T', ' ')} UTC`);
    else if (sx.state === 'ahead') cautions.push('no space weather forecast for this sol yet');
    else if (sx.state === 'before') cautions.push('no space weather record loaded for this sol');
    else if (sx.state === 'none') cautions.push('space weather data did not load');
  }
  const level = issues.length ? 'nogo' : cautions.length ? 'caution' : 'go';
  const why = issues.length ? issues.join(' · ') : cautions.length ? cautions.join(' · ')
    : `Route on ground under ${SUIT.maxCellSlopeDeg}°, radio link at every stop, no CME predicted to reach Mars. Back at the crew rover <b>${fmtHM(endLmst)}</b>, ${sunsetMargin.toFixed(1)} h before sunset.`;
  const doseMSv = sc.ok ? SUIT.doseMSvPerDay * sc.total / 86400 : 0;
  const o2 = sc.ok ? sc.energy / 1e6 * SUIT.o2KgPerMJ : 0;
  const stats = sc.ok ? [
    { k: 'Walking', v: (sc.dist / 1000).toFixed(2), u: 'km' },
    { k: 'Duration', v: fmtDur(sc.total) },
    { k: 'Climb', v: Math.round(sc.up), u: `m, max ${Math.round(sc.maxGrade)}°`, cls: sc.maxGrade > SUIT.maxGradeDeg - 2 ? 'warn' : '' },
    { k: 'Energy', v: Math.round(sc.energy / budget * 100), u: '% of budget', cls: sc.energy > budget * 0.8 ? 'warn' : '' },
    { k: 'Oxygen', v: o2.toFixed(2), u: 'kg' },
    { k: 'Radiation', v: doseMSv.toFixed(2), u: 'mSv' },
    { k: 'Walk back', v: sc.maxWalkback === undefined ? '…' : Math.ceil(sc.maxWalkback), u: sc.maxWalkback === undefined ? '' : 'min max', cls: sc.maxWalkback > WALK_RANGE_MIN ? 'warn' : '' },
    { k: 'Radio link', v: sc.radioShare === undefined ? '…' : Math.floor(sc.radioShare * 100), u: sc.radioShare === undefined ? '' : '% of EVA', cls: sc.radioDark?.length ? 'warn' : '' },
    { k: 'Daylight', v: sunsetMargin.toFixed(1), u: 'h left', cls: sunsetMargin < 0 ? 'bad' : sunsetMargin < 1 ? 'warn' : '' },
  ] : [];
  const solsCur = CUR_SOL1 - CUR_SOL0;
  state.verdict = { level, issues, cautions, solsCur, margin: sunsetMargin };
  ui.setPlan({
    title: stopsDoc.eva.title, goal: stopsDoc.eva.goal, verdict: { level, why }, stats,
    compare: sc.ok ? `Curiosity drove from Altadena to Timboy Chaco in <b>${solsCur} sols</b>. This EVA on foot: <b>${fmtDur(sc.total)}</b>.` : '',
    stops: stops.map((s, k) => {
      const e = k === 0 ? null : sc.ok ? sc.events[k - 1] : null;
      return { id: s.id, key: s.key, kind: s.kind, name: s.name, custom: !!s.custom,
        time: k === 0 ? fmtHM(state.startLmst) : e ? fmtHM(lmstAt(e.arrive)) : '–',
        desc: s.task };
    }),
  });
  // timeline model
  const sun = [];
  for (let hr = 0; hr <= 24.001; hr += 0.1) sun.push({ h: hr, el: sunAt(mslUtcFor(state.sol, hr), center.lat, center.lon).el });
  const segs = [], tstops = [];
  if (sc.ok) {
    let t0 = 0;
    sc.events.forEach((e, k) => {
      segs.push({ kind: 'walk', a: lmstAt(t0), b: lmstAt(e.arrive) });
      if (e.depart > e.arrive) segs.push({ kind: 'stop', a: lmstAt(e.arrive), b: lmstAt(e.depart) });
      if (k < sc.events.length - 1) tstops.push({ key: String(k + 1), h: lmstAt(e.arrive) });
      t0 = e.depart;
    });
  }
  state.timeline = {
    sun, sunrise: ev.sunriseLmst, sunset: ev.sunsetLmst,
    eva: sc.ok ? { start: state.startLmst, end: endLmst, segs, stops: tstops } : null,
  };
  ui.setNotes([weatherNote(), spaceWeatherNote()].filter(Boolean));
  pins.set(stops.map(s => ({ id: s.id, key: s.key, label: s.name, kind: s.kind, x: s.x, y: s.y + 4, z: s.z })));
  updateTime();
}

function spaceWeatherNote() {
  const sx = spaceWx(), asOf = swx ? `NASA DONKI, as of ${utcShort(swx.fetched)} UTC` : '';
  const k = 'Space weather';
  if (sx.state === 'cme') return { k, cls: 'warn', v: `CME predicted at Mars ${sx.cme[0].arrival.slice(0, 16).replace('T', ' ')} UTC, launched ${sx.cme[0].start.slice(0, 10)} (WSA-ENLIL run, ${asOf})` };
  if (sx.state === 'clear') return { k, v: `no CME now in flight is predicted to reach Mars within a day of this EVA (WSA-ENLIL runs, ${asOf})` };
  if (sx.state === 'ahead') return { k, cls: 'warn', v: `no forecast for this sol yet. A CME is listed only after it leaves the Sun (${asOf}, forecast reaches ${utcShort(sx.to)} UTC)` };
  if (sx.state === 'before') return { k, cls: 'warn', v: `this sol is earlier than the CME list loaded here (arrivals from ${utcShort(sx.from).slice(0, 10)})` };
  return { k, cls: 'warn', v: 'NASA DONKI data did not load' };
}
function weatherNote() {
  if (!weather) return null;
  const ls = marsClock(mslUtcFor(state.sol, 12)).ls;
  const my = marsYear(mslUtcFor(state.sol, 12));
  const o = outlookFor(weather, ls, 5, my);
  const f = o.fields;
  return { k: 'Weather', v: `air ${f.minTemp.median} to ${f.maxTemp.median} °C, ${f.pressure.median} Pa, UV ${f.uv.median} (median of ${o.sols} sols of Curiosity REMS daily reports at Ls ${ls.toFixed(0)}±5°, Mars years ${o.years[0]} to ${o.years[o.years.length - 1]})` };
}

// --------- time ---------
function updateTime() {
  const lm = state.cursorLmst;
  const utc = mslUtcFor(state.sol, lm);
  const s = sunAt(utc, center.lat, center.lon);
  const c = marsClock(utc);
  sky.setSun(s.az, s.el, c.sunDistAU);
  ui.setClock({ sol: state.sol, lmst: lm, utc, ls: s.ls, sunEl: s.el });
  if (state.timeline) ui.timeline.draw({ ...state.timeline, cursor: lm });
  state.sun = s;
}

// --------- layers ---------
const LAYERS = [
  { id: 'slope', name: 'Slope and steps', src: 'MRO HiRISE stereo terrain, 1 m', on: false,
    legend: `<div class="bar" style="background:linear-gradient(90deg,#d9c287 0 33%,#d98a3a 33% 66%,transparent 66%),repeating-linear-gradient(135deg,#1c0f0d 0 3px,#6b4a40 3px 6px)"></div><div class="ticks"><span>10°</span><span>15°</span><span>20° no-go</span></div>` },
  { id: 'back', name: 'Walk back', src: 'Minutes to the crew rover on foot', on: false,
    legend: `<div class="ticks"><span>lines every 5 min</span><span>bold every 15</span></div>` },
  { id: 'radio', name: 'Radio line of sight', src: 'From the crew rover mast, 3 m', on: false },
  { id: 'relief', name: 'Ridges and hollows', src: 'Boxwork from the 1 m HiRISE terrain', on: false,
    legend: `<div class="ticks" style="justify-content:flex-start;gap:14px"><span><i class="swt" style="background:#fff0c8"></i>ridge</span><span><i class="swt" style="background:#38a3a6"></i>hollow</span></div>` },
  { id: 'rover', name: 'Curiosity\u2019s drive', src: 'MSL traverse, sols 4560 to 4827, replayed', on: false },
  { id: 'therm', name: 'Thermal inertia', src: 'Mars Odyssey THEMIS, 100 m', on: false,
    legend: `<div class="bar" style="background:linear-gradient(90deg,#172b38,#5c9494,#f5ebcc)"></div><div class="ticks"><span>200</span><span>sandier · rockier</span><span>500</span></div>` },
  { id: 'min', name: 'Hydrated minerals', src: 'MRO CRISM, 18 m, 2008', on: false,
    legend: `<div class="ticks" style="justify-content:flex-start;gap:14px"><span><i class="swt" style="background:#c98ac6"></i>polyhydrated sulfate</span><span><i class="swt" style="background:#b3d66b"></i>monohydrated sulfate</span></div>` },
];
function applyLayer(L) {
  state.layers[L.id] = L.on;
  if (L.id === 'slope') ensureSlope().then(() => terrain.setLayer('lSlope', state.layers.slope ? 1 : 0));
  if (L.id === 'back') { ensureWalkback().then(() => terrain.setLayer('lBack', state.layers.back ? 1 : 0)); }
  if (L.id === 'radio') { ensureRadio().then(() => terrain.setLayer('lRadio', state.layers.radio ? 1 : 0)); }
  if (L.id === 'rover') ensureCuriosity().then(() => { curRibbon.mesh.visible = L.on; curMarker.visible = L.on; curPin.style.display = L.on ? '' : 'none'; state.replayT = 0; });
  if (L.id === 'relief') { ensureImageLayer('tRelief', 'relief_2m.png').then(() => terrain.setLayer('lRelief', state.layers.relief ? 1 : 0)); }
  if (L.id === 'therm') { ensureImageLayer('tTherm', 'themis_ti.png').then(() => terrain.setLayer('lTherm', state.layers.therm ? 1 : 0)); }
  if (L.id === 'min') { ensureImageLayer('tMin', 'crism_hyd.png').then(() => terrain.setLayer('lMin', state.layers.min ? 1 : 0)); }
}
let walkbackTex = null, radioTex = null, slopeTex = null;
async function ensureSlope() {
  if (slopeTex) return;
  const px = await planner.slope();
  slopeTex = new THREE.DataTexture(px, planner.n, planner.n, THREE.RedFormat, THREE.UnsignedByteType);
  slopeTex.needsUpdate = true;
  terrain.setLayerTexture('tSlope', slopeTex);
}
const imageLayers = {};
function ensureImageLayer(uniform, file) {
  // one load per layer, however often it is switched while loading
  return imageLayers[uniform] || (imageLayers[uniform] = terrain.loadImage(site.base + file).then(img => {
    terrain.setLayerTexture(uniform, terrain.tex(img, { srgb: false, mips: false }));
  }));
}
let walkbackP = null, radioP = null;
function ensureWalkback() { return walkbackP || (walkbackP = computeWalkback()); }
function ensureRadio() { return radioP || (radioP = computeRadio()); }
async function computeWalkback() {
  const minutes = await planner.walkback({ x: rover.x, z: rover.z }, model);
  state.walkback = minutes;
  const n = planner.n, maxM = 60, px = new Uint8Array(n * n);
  for (let k = 0; k < px.length; k++) px[k] = Math.min(255, Math.round(Math.min(minutes[k], maxM) / maxM * 255));
  walkbackTex = new THREE.DataTexture(px, n, n, THREE.RedFormat, THREE.UnsignedByteType);
  walkbackTex.magFilter = THREE.LinearFilter; walkbackTex.minFilter = THREE.LinearFilter; walkbackTex.needsUpdate = true;
  terrain.setLayerTexture('tBack', walkbackTex);
  terrain.setLayer('uBackMax', maxM);
}
const RADIO_WAVE_M = 299.792458 / 415;
async function computeRadio() {
  // mast 3 m, helmet 1.9 m, and the wavelength of a 415 MHz suit radio (the frequency Report ITU-R SA.2162 lists for EVA voice links)
  const vis = await planner.radio({ x: rover.x, z: rover.z }, 3.0, 1.9, RADIO_WAVE_M);
  state.radio = vis;
  const n = planner.n, px = new Uint8Array(n * n);
  for (let k = 0; k < px.length; k++) px[k] = vis[k] * 255;
  radioTex = new THREE.DataTexture(px, n, n, THREE.RedFormat, THREE.UnsignedByteType);
  radioTex.magFilter = THREE.LinearFilter; radioTex.minFilter = THREE.LinearFilter; radioTex.needsUpdate = true;
  terrain.setLayerTexture('tRadio', radioTex);
}
ui.setLayers(LAYERS);
ui.setSources([
  { mission: 'MRO HiRISE', name: 'MSL Gale Merged DEM 1 m v3 (stereo terrain; USGS, with CTX, ESA Mars Express HRSC and MOLA beneath)', use: 'Terrain, slope, route costing, walk-back time, radio line of sight', url: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m' },
  { mission: 'MRO HiRISE', name: 'MSL Gale Merged Orthophoto Mosaic 25 cm, with the HiRISE 78 quad colour basemap (Parker and Calef)', use: 'Ground colour from table view to walking range', url: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_orthophoto_mosaic_25cm' },
  { mission: 'MRO CRISM', name: 'MTRDR FRT0000B6F1, HYD browse (2008-07-09, 18 m)', use: 'Hydrated sulfate layer', url: 'https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/browse/2008/2008_191/frt0000b6f1/' },
  { mission: 'Mars Odyssey THEMIS', name: 'Thermal Inertia Mosaic, Quantitative, 30S120E, 100 m (Fergason, USGS 2014)', use: 'Thermal inertia layer (sandier vs rockier ground)', url: 'https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30s120e_100mpp' },
  { mission: 'MSL Curiosity', name: 'Curiosity waypoints and traverse (MMGIS)', use: 'Science stops at the places Curiosity parked, and its replayed drive', url: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json' },
  { mission: 'MSL Curiosity', name: 'Raw images API (Navcam, Mastcam, Hazcam) with camera models', use: 'Curiosity\u2019s own photos at each stop', url: 'https://mars.nasa.gov/msl/multimedia/raw-images/' },
  { mission: 'MSL Mastcam', name: 'PDS4 bundle msl_mmm, labels and index tables (Release 42)', use: 'Pointing of the Mastcam photos', url: 'https://planetarydata.jpl.nasa.gov/img/data/msl/msl_mmm/' },
  { mission: 'MSL Curiosity', name: 'Mission blog, sols 4500 to 5073', use: 'Target names, drill sites and what was found there', url: 'https://science.nasa.gov/mission/msl-curiosity/' },
  { mission: 'MSL REMS', name: 'Daily weather reports, sols 1 to 4995 (outreach feed; instrument from Spain\u2019s Centro de Astrobiolog\u00eda, pressure sensor from the Finnish Meteorological Institute)', use: 'Weather outlook for the EVA season', url: 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json' },
  { mission: 'Viking Orbiter', name: 'MDIM 2.1 colour global mosaic of Mars, 232 m (USGS Astrogeology, served by NASA Mars Trek)', use: 'Globe on the opening card of the demo', url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml' },
  { mission: 'MSL RAD', name: 'Surface dose rate at Gale, Hassler et al. 2014 (Science 343)', use: 'EVA radiation dose', url: 'https://doi.org/10.1126/science.1244797' },
  { mission: 'MSL RAD', name: 'September 2017 solar particle event at Gale, Zeitlin et al. 2018 (GRL 45)', use: 'Dose rate context shown in the solar storm drill', url: 'https://doi.org/10.1029/2018GL077760' },
  { mission: 'NASA CCMC DONKI', name: 'CME analyses with WSA-ENLIL arrival predictions at Mars (api.nasa.gov, read when the map loads)', use: 'Space weather for the EVA date', url: 'https://ccmc.gsfc.nasa.gov/DONKI/' },
  { mission: 'NASA GISS Mars24', name: 'Mars time and Sun position algorithm (Allison and McEwen 2000)', use: 'Sun, shadows, sunrise and sunset for the EVA sol', url: 'https://www.giss.nasa.gov/tools/mars24/help/algorithm.html' },
  { mission: 'NASA NAIF', name: 'MSL spacecraft clock and local mean solar time kernels', use: 'Curiosity\u2019s sol count and clock', url: 'https://naif.jpl.nasa.gov/pub/naif/MSL/kernels/sclk/' },
  { mission: 'NASA EVA-EXP-0075', name: 'Exploration EVA System Concept of Operations Summary (Coan 2020, written for Artemis lunar EVAs)', use: 'EVA length, 2 km walking range, 20\u00b0 walking slope, 2 km/h pace', url: 'https://ntrs.nasa.gov/citations/20200001071' },
  { mission: 'NASA JSC', name: 'Mars Spacesuit Mass Requirements, Ogilvie et al., ICES-2026-127', use: 'Crew, suit and carried mass, 1200 BTU/hr average metabolic rate', url: 'https://ntrs.nasa.gov/citations/20260003038' },
  { mission: 'NASA-STD-3001', name: 'Space Flight Human-System Standard, Volume 2, Revision F', use: 'Top of the nominal suited metabolic range, 2100 BTU/hr', url: 'https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf' },
  { mission: 'NASA JSC', name: 'Joint Augmented Reality Visual Informatics System: Concept of Operations, CTSD-ADV-1788 Rev A, and its trade study ICES-2023-298', use: 'Design of the suit display in Step Outside', url: 'https://ntrs.nasa.gov/citations/20230016622' },
  { mission: 'ITU-R', name: 'Report ITU-R SA.2162, EVA links in the 410-420 MHz band (Table 1: 415 MHz)', use: 'Radio wavelength for the link map', url: 'https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-SA.2162-2009-PDF-E.pdf' },
  { mission: 'NASA 3D Resources', name: 'Z-2 Spacesuit model (planetary walking suit prototype)', use: 'The astronaut figure in the follow view', url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Z2%20Spacesuit' },
    { mission: 'NASA 3D Resources', name: 'Space Exploration Vehicle model (pressurized rover concept)', use: 'The crew rover parked at the start and end of the walk', url: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Space%20Exploration%20Vehicle' },
  { mission: 'NASA BVAD', name: 'Life Support Baseline Values and Assumptions Document (TP-2015-218570 Rev 1)', use: 'Oxygen used per unit of metabolic energy', url: 'https://ntrs.nasa.gov/citations/20180001338' },
  { mission: 'NASA SP-368', name: 'Metabolism and Heat Dissipation During Apollo EVA Periods (Waligora and Horrigan 1975)', use: 'Working rate at a science stop', url: 'https://ntrs.nasa.gov/citations/19760005580' },
  { mission: 'Walking model', name: 'Johnson 2010, MIT S.M. thesis (SEXTANT traverse planner), with the Santee et al. 2001 load carriage model', use: 'Walking energy and speed against slope', url: 'https://dspace.mit.edu/handle/1721.1/59560' },
]);

// --------- Curiosity's real drive, replayed ---------
const curRibbon = new RouteRibbon(scene);
curRibbon.uniforms.uColor.value.setRGB(0.62, 0.82, 0.84);
curRibbon.mesh.visible = false;
const curMarker = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0x9ed1d6 }));
curMarker.visible = false; scene.add(curMarker);
const curPin = document.createElement('div');
curPin.className = 'pin rover curpin'; curPin.style.display = 'none';
curPin.innerHTML = '<div class="tag"><span class="k">MSL</span><span class="t"></span></div><div class="stem"></div>';
document.getElementById('ui').appendChild(curPin);
let curTrack = null, curP = null;
const CUR_SOL0 = 4560, CUR_SOL1 = 4827;   // Altadena to Timboy Chaco
function ensureCuriosity() {
  return curP || (curP = fetch(site.base + 'curiosity_track.json').then(r => r.json()).then(j => {
    const pts = [];
    for (const d of j.drives) if (d.sol > CUR_SOL0 && d.sol <= CUR_SOL1) for (const q of d.pts) pts.push([q[0], q[2], d.sol]);
    let acc = 0; const tr = [];
    pts.forEach((q, k) => { if (k) acc += Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]); tr.push(q[0], 0, q[1], acc, q[2]); });
    curTrack = { tr: new Float32Array(tr), len: acc, n: pts.length };
    curRibbon.set(curTrack.tr, heightAt); curRibbon.setWidth(3, 0.5, 14);
    curRibbon.mesh.visible = false;
  }));
}
function replayStep(dt) {
  if (!curTrack || !curMarker.visible) return;
  state.replayT = ((state.replayT || 0) + dt / 14) % 1;
  const want = state.replayT * curTrack.len, tr = curTrack.tr;
  let lo = 0, hi = curTrack.n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m * 5 + 3] <= want) lo = m; else hi = m; }
  const a = lo * 5, b = hi * 5, f = Math.min(1, (want - tr[a + 3]) / Math.max(1e-6, tr[b + 3] - tr[a + 3]));
  const x = tr[a] + (tr[b] - tr[a]) * f, z = tr[a + 2] + (tr[b + 2] - tr[a + 2]) * f;
  curMarker.position.set(x, heightAt(x, z) + 2.2, z);
  const v = curMarker.position.clone(); v.y += 6; v.project(camera);
  const show = v.z < 1 && state.mode === 'plan';
  curPin.style.display = show ? '' : 'none';
  if (show) {
    curPin.style.transform = `translate(${(v.x + 1) / 2 * innerWidth}px, ${(1 - v.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
    curPin.querySelector('.t').textContent = `Curiosity · sol ${tr[a + 4]}`;
  }
  curRibbon.uniforms.uDone.value = want;
}

// --------- probe: every layer at one spot ---------
const sampler2 = makeSampler(grid2, site);
const rawLayers = {};
async function layerPixels(file) {
  if (rawLayers[file]) return rawLayers[file];
  const img = await terrain.loadImage(site.base + file);
  const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  return (rawLayers[file] = { w: img.width, h: img.height, px: g.getImageData(0, 0, img.width, img.height).data });
}
function pix(L, x, z) {
  const i = Math.min(L.w - 1, Math.max(0, Math.floor((x + site.half) / site.size_m * L.w)));
  const j = Math.min(L.h - 1, Math.max(0, Math.floor((z + site.half) / site.size_m * L.h)));
  const o = (j * L.w + i) * 4;
  return [L.px[o], L.px[o + 1], L.px[o + 2], L.px[o + 3]];
}
let probeEl = null, probeAt = null;
async function probe(p) {
  const [ti, hyd, rel] = await Promise.all([layerPixels('themis_ti.png'), layerPixels('crism_hyd.png'), layerPixels('relief_2m.png'), ensureWalkback(), ensureRadio()]);
  const ll = frames.toLonLat(p.x, p.z);
  const slope = sampler2.slopeDeg(p.x, p.z);
  const t = pix(ti, p.x, p.z), TI = Math.round(200 + t[0] / 255 * 300);
  const m = pix(hyd, p.x, p.z);
  let mineral = 'no clear hydration signal';
  if (m[3] > 60) mineral = (m[1] > m[0] * 1.15) ? 'monohydrated sulfate signal' : (m[0] > m[1] * 1.15 && m[2] > 40) ? 'polyhydrated sulfate signal' : 'mixed hydrated signal';
  const rv = (pix(rel, p.x, p.z)[0] - 128) / 50;
  let box = rv > 0.25 ? `ridge, ${rv.toFixed(1)} m above its surroundings` : rv < -0.25 ? `hollow, ${(-rv).toFixed(1)} m below its surroundings` : 'between ridge and hollow';
  // sample pair: nearest ground of the opposite kind within 40 m
  if (Math.abs(rv) > 0.25) {
    let best = null;
    for (let r = 2; r <= 40 && !best; r += 2) for (let a = 0; a < 360; a += 10) {
      const x = p.x + r * Math.sin(a * Math.PI / 180), z = p.z - r * Math.cos(a * Math.PI / 180);
      const o = (pix(rel, x, z)[0] - 128) / 50;
      if (rv > 0 ? o < -0.25 : o > 0.25) { best = { r, a }; break; }
    }
    if (best) box += `. Nearest ${rv > 0 ? 'hollow' : 'ridge'} ${best.r} m ${compass(best.a)}`;
  }
  // a spot too steep to stand on is read from the nearest footing, as the route does (within 30 m)
  let wb = state.walkback ? planner.sampleGrid(state.walkback, p.x, p.z) : Infinity, footM = 0, at = p;
  if (state.walkback && !isFinite(wb)) {
    const f = nearestCell(state.walkback, p.x, p.z, 30, v => isFinite(v));
    if (f) { wb = f.v; footM = Math.max(1, Math.round(f.d)); at = f; }
  }
  const radio = state.radio ? planner.sampleGrid(state.radio, at.x, at.z) : null;
  const reachable = isFinite(wb);
  if (!probeEl) { probeEl = document.createElement('div'); probeEl.className = 'probe glass hit'; document.getElementById('ui').appendChild(probeEl); }
  const rows = [
    ['Position', `${Math.abs(ll.lat).toFixed(5)}° S  ${ll.lon.toFixed(5)}° E`],
    ['Elevation', `${Math.round(frames.yToElev(p.y)).toLocaleString('en-US')} m`],
    ['Slope', `${slope.toFixed(0)}°${slope > SUIT.maxCellSlopeDeg ? '  too steep on foot' : ''}`],
    ['Thermal inertia', `${TI} <span class="u">J m⁻² K⁻¹ s⁻½</span>`],
    ['Boxwork', box],
    ['CRISM', mineral],
    ['Walk back', reachable ? `${Math.ceil(wb)} min to the crew rover${footM ? `, from footing ${footM} m away` : ''}` : 'not reachable on foot'],
    ['Radio', radio ? 'line of sight to crew rover' : 'no line of sight'],
  ];
  probeEl.innerHTML = `<div class="rows">${rows.map(([k, v]) => `<div class="lab">${k}</div><div class="v">${v}</div>`).join('')}</div>` +
    (reachable ? `<button class="add">ADD AS STOP</button>` : '') + `<button class="x" aria-label="Close">×</button>`;
  probeAt = p.clone();
  probeEl.querySelector('.x').onclick = () => { probeEl.remove(); probeEl = null; probeAt = null; };
  const add = probeEl.querySelector('.add');
  if (add) add.onclick = () => { addStop(p); probeEl.remove(); probeEl = null; probeAt = null; };
}
let customN = 0;
function addStop(p) {
  // insert where it adds the least straight-line distance to the loop
  const loop = [...stops, rover];
  let best = 1, bestAdd = Infinity;
  for (let k = 0; k < loop.length - 1; k++) {
    const a = loop[k], b = loop[k + 1];
    const add = Math.hypot(a.x - p.x, a.z - p.z) + Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(a.x - b.x, a.z - b.z);
    if (add < bestAdd) { bestAdd = add; best = k + 1; }
  }
  const name = `Waypoint ${String.fromCharCode(65 + customN++)}`;
  stops.splice(best, 0, { id: 'c' + customN, name, kind: 'science', custom: true, task: 'Added on the map.', dwellMin: 20, x: p.x, z: p.z, y: p.y });
  stops.forEach((s, k) => { s.key = k === 0 ? 'R' : String(k); });
  rebuildRoute();
}
table.onTap = (cx, cy) => {
  if (state.mode !== 'plan') return;
  if (ui.closeSources()) return;
  const p = table.pick(cx, cy); if (!p) return;
  if (adding) { setAdding(false); placeStop(p); } else probe(p);
};
// Escape puts away whatever is open over the map
addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || document.body.classList.contains('cine')) return;
  if (probeEl) { probeEl.remove(); probeEl = null; probeAt = null; }
  ui.closeSources(); document.body.classList.remove('layers-open');
  setAdding(false); ui.closeAbout(); ui.closeMenu();
});

// --------- planning actions: app bar, toolbar, map buttons ---------
let adding = false;
function setAdding(v) { adding = v; document.body.classList.toggle('adding', v); }
// same rule as the ground readout: a stop needs footing within 30 m that the walk-back map can reach
async function placeStop(p) {
  await ensureWalkback();
  let ok = state.walkback && isFinite(planner.sampleGrid(state.walkback, p.x, p.z));
  if (!ok && state.walkback) ok = !!nearestCell(state.walkback, p.x, p.z, 30, v => isFinite(v));
  if (!ok) { ui.toast('That spot is not reachable on foot'); return; }
  addStop(p); ui.toast('Stop added to the route');
}
const customIds = () => stops.filter(s => s.custom).map(s => s.id);
function dropStops(ids) {
  if (state.mode !== 'plan') return;
  if (!ids.length) { ui.toast('No added stops'); return; }
  for (const id of ids) { const k = stops.findIndex(s => s.id === id && s.custom); if (k > 0) stops.splice(k, 1); }
  stops.forEach((s, i) => { s.key = i === 0 ? 'R' : String(i); });
  if (state.focus && !stops.some(s => s.id === state.focus)) state.focus = null;
  rebuildRoute();
}
function download(name, type, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// the plan as a file other mapping tools can open
function exportPlan(fmt) {
  const sc = state.sched;
  if (!sc?.ok) { ui.toast('No route to export yet'); return; }
  const r6 = (v) => +v.toFixed(6), el = (y) => Math.round(frames.yToElev(y) * 10) / 10;
  const pt = (s) => { const ll = frames.toLonLat(s.x, s.z); return [r6(ll.lon), r6(ll.lat), el(s.y)]; };
  if (fmt === 'csv') {
    const rows = stops.map(s => { const c = pt(s); return [s.key, `"${s.name}"`, s.kind, c[0], c[1], c[2], s.dwellMin ?? 0].join(','); });
    download('marcher_stops.csv', 'text/csv', ['key,name,kind,lon_e,lat_n,elevation_m,dwell_min', ...rows].join('\n') + '\n');
  } else {
    const tr = sc.track, line = [];
    for (let i = 0; i < tr.length / 5; i++) { const ll = frames.toLonLat(tr[i * 5], tr[i * 5 + 2]); line.push([r6(ll.lon), r6(ll.lat), el(tr[i * 5 + 1])]); }
    const doc = {
      type: 'FeatureCollection', generator: 'MARCHER', body: 'Mars', site: 'Mount Sharp boxwork, Gale crater',
      sol: state.sol, eva_start_lmst: fmtHM(state.startLmst), walking_distance_m: Math.round(sc.dist), duration_s: Math.round(sc.total),
      note: 'Coordinates are degrees east and north in the frame of the MRO HiRISE terrain used by the map. Elevation is in metres from the same terrain.',
      features: [
        ...stops.map(s => ({ type: 'Feature', geometry: { type: 'Point', coordinates: pt(s) }, properties: { key: s.key, name: s.name, kind: s.kind, task: s.task ?? null, dwell_min: s.dwellMin ?? 0 } })),
        { type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: { name: 'EVA route', distance_m: Math.round(sc.dist) } },
      ],
    };
    download('marcher_eva_plan.geojson', 'application/geo+json', JSON.stringify(doc, null, 1));
  }
  ui.toast(fmt === 'csv' ? 'Stops exported as CSV' : 'Plan exported as GeoJSON');
}
// the drill starts where the timeline cursor sits inside the EVA, or partway out if it sits outside
async function drillFromPlan() {
  const sc = state.sched; if (!sc?.ok) return;
  if (state.mode === 'walk') { toggleDrill(); return; }
  const cur = (state.cursorLmst - state.startLmst) * MARS_HOUR_S;
  const t = cur > 120 && cur < sc.total - 120 ? cur : sc.total * 0.45;
  setMode('walk');
  state.walkT = t; state.lastDone = Math.floor(ribbon.samples.length * t / sc.total);
  await new Promise(r => setTimeout(r, 700));
  if (state.mode === 'walk' && !state.abort) toggleDrill();
}
function doAction(a) {
  if (state.cine) return;
  const g = table.goal, plan = state.mode === 'plan';
  switch (a) {
    case 'add': if (!plan) setMode('plan'); setAdding(true); ui.toast('Click the map to place a stop'); break;
    case 'tilt': g.pol = g.pol < 0.3 ? 0.92 : 0.12; break;
    case 'tilt2d': g.pol = 0.12; break;
    case 'tilt3d': g.pol = 0.92; break;
    case 'north': g.az = Math.round(table.cur.az / (2 * Math.PI)) * 2 * Math.PI; break;
    case 'zin': g.dist = Math.max(60, g.dist * 0.62); break;
    case 'zout': g.dist = Math.min(6000, g.dist / 0.62); break;
    case 'reset': if (!plan) setMode('plan'); framePlan(false); break;
    case 'walk': setAdding(false); setMode('walk'); break;
    case 'drill': setAdding(false); drillFromPlan(); break;
    case 'sol-1': case 'sol+1': if (plan) { state.sol += a === 'sol+1' ? 1 : -1; rebuildSchedule(false); } break;
    case 'sources': ui.toggleSources(); break;
    case 'demo': story?.start(0); break;
    case 'title': story?.showTitle(); break;
    case 'about': ui.showAbout(); break;
    case 'export': exportPlan('geojson'); break;
    case 'export-csv': exportPlan('csv'); break;
    case 'undo-add': { const c = customIds().sort((p, q) => +q.slice(1) - +p.slice(1)); dropStops(c.slice(0, 1)); break; }
    case 'clear-added': dropStops(customIds()); break;
    case 'reset-plan':
      if (!plan) break;
      state.sol = nowSol + 2; state.startLmst = 8.0;
      if (customIds().length) dropStops(customIds()); else rebuildSchedule(true);
      framePlan(false); ui.toast('Plan reset to the six Curiosity stops'); break;
  }
}
// bottom bar: map scale at the view centre, camera height, and the ground under the pointer
const ptr = { x: -1, y: -1, t: 0, txt: '', dirty: false };
canvas.addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.dirty = true; });
canvas.addEventListener('pointerleave', () => { ptr.x = -1; ptr.txt = ''; });
function statusTick(now) {
  requestAnimationFrame(statusTick);
  if (state.mode !== 'plan' || state.cine || innerWidth <= 900) return;
  const c = table.cur;
  const mpp = 2 * c.dist * Math.tan(camera.fov * Math.PI / 360) / innerHeight;
  let m = 1; for (const v of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]) if (v / mpp <= 110) m = v;
  if (ptr.x >= 0 && ptr.dirty && now - ptr.t > 80) {
    ptr.t = now; ptr.dirty = false;
    const p = table.pick(ptr.x, ptr.y);
    if (p) {
      const ll = frames.toLonLat(p.x, p.z);
      ptr.txt = `${Math.abs(ll.lat).toFixed(5)}° S  ${ll.lon.toFixed(5)}° E   Elevation ${Math.round(frames.yToElev(p.y)).toLocaleString('en-US')} m   Slope ${sampler2.slopeDeg(p.x, p.z).toFixed(0)}°`;
    } else ptr.txt = '';
  }
  ui.setStatus({ scalePx: Math.round(m / mpp), scaleLabel: m >= 1000 ? `${m / 1000} km` : `${m} m`, cam: `Camera ${Math.round(c.dist * Math.cos(c.pol)).toLocaleString('en-US')} m`, cur: ptr.txt, az: c.az, flat: c.pol < 0.3 });
}
requestAnimationFrame(statusTick);

// --------- camera focus ---------
function evaBounds() {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const s of stops) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); }
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.max(x1 - x0, z1 - z0) / 2 };
}
function framePlan(instant) {
  const b = evaBounds();
  const t = new THREE.Vector3(b.cx, heightAt(b.cx, b.cz), b.cz);
  const portrait = innerWidth < innerHeight;
  table.flyTo(t, Math.max(1000, b.r * 4.2) * (portrait ? 2.1 : 1), 0.55, portrait ? 0.62 : 0.92);
  if (instant) { table.cur.target.copy(table.goal.target); Object.assign(table.cur, { dist: table.goal.dist, az: table.goal.az, pol: table.goal.pol }); }
}
function focusStop(id) {
  const s = stops.find(q => q.id === id);
  if (!s) return;
  state.focus = id;
  ui.highlightStop(id);
  if (state.mode === 'plan') table.flyTo(new THREE.Vector3(s.x, s.y, s.z), 260, table.goal.az, 0.95);
  const k = stops.indexOf(s);
  if (k > 0 && state.sched?.ok) { state.cursorLmst = lmstAt(state.sched.events[k - 1].arrive); updateTime(); }
}

// --------- modes ---------
function setMode(m) {
  // remember where the camera was so the switch glides instead of cutting
  state.blendFrom = { p: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov };
  state.blendK = 0;
  state.mode = m;
  ui.setMode(m);
  viewOffset();
  if (m === 'walk') {
    ensureRadio(); ensureWalkback();
    table.enabled = false; walk.enabled = true;
    state.walkT = 0; state.lastDone = 0;
    const p = trackAt(state.sched.track, 0);
    walk.place(p.x, p.z, 0);
    terrain.focus(p.x, p.z);
    ribbon.setWidth(1.2, 0.08, 4);
    camera.fov = 56; camera.updateProjectionMatrix(); state.fovTarget = 56;
    scene.fog = walkFog;
    renderer.toneMappingExposure = 1.18;
    state.followK = 1;
  } else {
    if (state.abort) endDrill();
    table.enabled = true; walk.enabled = false;
    terrain.focus(null);
    ribbon.setWidth(6, 0.6, 24); ribbon.uniforms.uDone.value = -1;
    camera.fov = 36; camera.updateProjectionMatrix(); state.fovTarget = 36;
    scene.fog = null;
    renderer.toneMappingExposure = 1.0;
    marker.visible = false; if (suitFig.shadow) suitFig.shadow.visible = false;
    framePlan(false);
  }
}

// --------- walk ---------
let lastTile = '';
// Dust haze for the eye-level view; colour follows the sky horizon
const walkFog = new THREE.FogExp2(0x9a7254, 0.00022);
// Astronaut for the chase camera: NASA's Z-2 planetary suit prototype (NASA 3D Resources)
// inside a ground ring. A plain mast stands in until the model has loaded.
const marker = new THREE.Group();
const suitFig = { fig: null, group: null, shadow: null, last: null };
// The GLB is one rigid mesh. astronaut.js gives it a skeleton and skin weights at load, walks it
// with a procedural gait, and renders its true silhouette from the Sun for the ground shadow.
import('./astronaut.js').then(({ loadAstronaut }) => loadAstronaut('models/z2_suit.glb')).then((fig) => {
  suitFig.fig = fig;
  suitFig.group = fig.group;           // already turned to face -Z, the way the walker faces
  fig.group.position.y = -0.05;        // the marker floats 5 cm up for its ring, the boots stand on the ground
  marker.add(fig.group);
  for (const c of marker.children) if (c.userData.standIn) c.visible = false;
  marker.children[0].geometry = new THREE.RingGeometry(1.02, 1.1, 64);    // a finer ring around the figure
  scene.add(suitFig.shadow = fig.makeShadow(heightAt));
}).catch((e) => console.warn('suit model not loaded, keeping the mast', e));
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 3;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mast.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  head.position.y = 1.9;
  mast.userData.standIn = head.userData.standIn = true;
  marker.add(ring, mast, head);
  marker.visible = false;
  scene.add(marker);
}
function walkStep(dt) {
  const sc = state.sched;
  if (!sc?.ok) return;
  const autoOn = !walk.keys.size;
  if (autoOn && state.walkRate > 0) state.walkT = Math.min(sc.total, state.walkT + dt * state.walkRate);
  const p = trackAt(sc.track, state.walkT);
  if (autoOn) {
    walk.pos.set(p.x, 0, p.z);
    // look along the path unless the user dragged to look around recently
    const ahead = trackAt(sc.track, state.walkT + 25);
    if (ahead && (performance.now() - (walk.lookTouched || 0)) > 2500 && simTime > (state.holdLookUntil || 0)) {
      const want = Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z));
      if (Math.hypot(ahead.x - p.x, ahead.z - p.z) > 0.5) {
        let d = want - walk.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        walk.yaw += d * Math.min(1, dt * 1.5);
      }
    }
  }
  walk.update(dt);
  const atStop = sc.events.some(e => state.walkT >= e.arrive - 0.5 && state.walkT < e.depart);
  chaseCam(dt, state.cam === 'follow' || (state.cam === 'auto' && !atStop && state.walkRate > 0));
  if (state.povEye && atStop) {
    state.povK = Math.min(1, (state.povK || 0) + dt * 1.2);
    camera.position.lerp(state.povEye, THREE.MathUtils.smoothstep(state.povK, 0, 1) * (1 - state.followK));
  } else state.povK = 0;
  const key = `${Math.floor((walk.pos.x + site.half) / 400)}:${Math.floor((walk.pos.z + site.half) / 400)}`;
  if (key !== lastTile) { lastTile = key; terrain.focus(walk.pos.x, walk.pos.z); setTimeout(() => ribbon.redrape(), 1500); }
  // walked distance along ribbon: nearest sample index
  ribbon.uniforms.uDone.value = state.walkT > 0 ? doneAlong(walk.pos) : -1;
  state.cursorLmst = lmstAt(state.walkT);
  updateTime();
  hud(p);
}
// chase camera: behind and above the astronaut, blending with the visor view
function chaseCam(dt, wantFollow) {
  state.followK += ((wantFollow ? 1 : 0) - state.followK) * Math.min(1, dt * 1.8);
  marker.position.set(walk.pos.x, walk.pos.y + 0.05, walk.pos.z);
  marker.visible = state.followK > 0.02;
  marker.children.forEach(m => { if (m.material) { m.material.transparent = true; m.material.opacity = 0.9 * THREE.MathUtils.smoothstep(state.followK, 0.3, 1); } });
  if (suitFig.group) {
    const f = suitFig;
    f.group.visible = state.followK > 0.45;      // hidden in the visor view, where the camera is the helmet
    // the stride is driven by ground covered (astronaut.js), so the boots do not slide
    const moved = f.last ? Math.hypot(walk.pos.x - f.last.x, walk.pos.z - f.last.z) : 0;
    // face the way the walk is going, not where the camera looks
    if (moved > 1e-3) {
      let dy = Math.atan2(-(walk.pos.x - f.last.x), -(walk.pos.z - f.last.z)) - marker.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      marker.rotation.y += dy * Math.min(1, dt * 5);
    } else if (!f.last) marker.rotation.y = walk.yaw;
    f.last = { x: walk.pos.x, z: walk.pos.z };
    f.fig.advance(moved, dt);
    // Sun shadow: the figure's real silhouette, faded out near sunset and in the visor view
    const d = sky.dir, el = d ? Math.atan2(d.y, Math.hypot(d.x, d.z)) : 0;
    const shOn = d && marker.visible && f.group.visible;
    f.fig.updateShadow(renderer, d, walk.pos, shOn ? 0.62 * THREE.MathUtils.smoothstep(el, 0.035, 0.2) * THREE.MathUtils.smoothstep(state.followK, 0.45, 1) : 0);
  }
  if (state.followK > 0.001) {
    const k = THREE.MathUtils.smoothstep(state.followK, 0, 1);
    const far = state.chaseFar || 0;   // the story lifts the camera while a leg runs fast
    const back = (suitFig.group ? 11 : 20) * (1 + 1.0 * far), up = (suitFig.group ? 4.6 : 10) * (1 + 1.4 * far);
    const fx = walk.pos.x + Math.sin(walk.yaw) * back, fz = walk.pos.z + Math.cos(walk.yaw) * back;
    const dip = state.chaseDip || 0;   // the story tips the view at the ground while a sample is taken
    const fy = Math.max(heightAt(fx, fz) + 3, walk.pos.y + up) + 1.3 * dip;
    const eye = camera.position.clone();
    const tgt = new THREE.Vector3(walk.pos.x - Math.sin(walk.yaw) * 6, walk.pos.y + 1.4 - 2.4 * dip, walk.pos.z - Math.cos(walk.yaw) * 6);
    const lookEye = eye.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
    camera.position.lerpVectors(eye, new THREE.Vector3(fx, fy, fz), k);
    camera.lookAt(lookEye.lerp(tgt, k));
  }
}

// ---- solar storm drill: an alert mid-walk; walk the fastest line back to the crew rover ----
// Labelled DRILL on screen: it is an exercise, not a real alert. Context shown from MSL RAD:
// in the September 2017 event the Gale dose rate doubled within about 7 h and peaked 2 to 3x
// (Zeitlin et al. 2018; Hassler et al. 2018).
const abortRibbon = new RouteRibbon(scene);
abortRibbon.uniforms.uColor.value.setRGB(0.99, 0.30, 0.18);
abortRibbon.mesh.visible = false;
async function toggleDrill() {
  if (state.abort) { endDrill(); return; }
  if (state.mode !== 'walk') return;
  const from = { x: walk.pos.x, z: walk.pos.z };
  if (state.drillBusy) return;
  state.drillBusy = true;
  let leg;
  try { [leg] = await planner.route([from, { x: rover.x, z: rover.z }], model, 'time'); } finally { state.drillBusy = false; }
  if (!leg || state.mode !== 'walk' || state.abort) return;
  if (state.walkRate <= 0) { state.walkRate = 30; ui.setWalkRate(30); }
  state.abort = { track: leg.pts, cum: cumDist(leg.pts), total: leg.time, t: 0, startWalkT: state.walkT, e0: trackAt(state.sched.track, state.walkT).e };
  abortRibbon.set(leg.pts, heightAt); abortRibbon.setWidth(1.6, 0.1, 4);
  ribbon.uniforms.uColor.value.setRGB(0.45, 0.42, 0.40);
  bubbles.hide(); ui.showPov(null); state.povEye = null; state.povStop = '__drill';
  document.querySelector('#hud .walkbar .drill')?.classList.add('on');
}
function endDrill() {
  state.abort = null;
  abortRibbon.mesh.visible = false;
  ribbon.uniforms.uColor.value.setRGB(1, 1, 1);
  state.povStop = null;
  document.querySelector('#hud .walkbar .drill')?.classList.remove('on');
}
function drillStep(dt) {
  const A = state.abort;
  A.t = Math.min(A.total, A.t + dt * state.walkRate);
  // a camera that has lifted off looks further down the line, toward where it leads
  const p = trackAt(A.track, A.t), ahead = trackAt(A.track, Math.min(A.total, A.t + 20 + 60 * Math.max(0, state.chaseFar || 0)));
  walk.pos.set(p.x, 0, p.z);
  if (ahead && Math.hypot(ahead.x - p.x, ahead.z - p.z) > 0.5) {
    let d = Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z)) - walk.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    walk.yaw += d * Math.min(1, dt * 2);
  }
  walk.update(dt);
  chaseCam(dt, A.t < A.total);
  abortRibbon.uniforms.uDone.value = A.t / Math.max(1, A.total) * (abortRibbon.length || 0);
  state.cursorLmst = lmstAt(A.startWalkT + A.t);
  updateTime();
  const left = A.total - A.t, safe = left <= 0.5;
  const o2 = (A.e0 + p.e) / 1e6 * SUIT.o2KgPerMJ;
  const inRadio = state.radio ? planner.sampleGrid(state.radio, walk.pos.x, walk.pos.z) : null;
  ui.setHud({
    suit: [
      { k: 'EVA time', v: fmtDur(A.startWalkT + A.t) },
      { k: 'Oxygen used', v: o2.toFixed(2), u: 'kg' },
      { k: 'To crew rover', v: safe ? 'SAFE' : fmtDur(left), cls: safe ? '' : 'warn' },
      { k: 'Distance', v: Math.round(A.cum[A.cum.length - 1] - alongAt(A.track, A.cum, A.t)), u: 'm' },
      { k: 'Metabolic', v: Math.round(safe ? SUIT.stationW : rateW(A.track, A.t, A.total)), u: 'W' },
      { k: 'Radio', v: inRadio === null ? '–' : inRadio ? 'LINK' : 'NO LINK', cls: inRadio === 0 ? 'warn' : '' },
      { k: 'Sep 2017 storm', v: '2 to 3×', u: 'dose rate', cls: 'warn' },
      { k: 'Sun', v: state.sun.el.toFixed(1), u: '°' },
    ],
    next: { name: safe ? 'Inside the crew rover' : 'Crew rover', label: safe ? 'Drill complete' : 'Shelter', row: [
      { k: 'Walk back', v: safe ? '0' : fmtDur(left) }, { k: 'Bearing', v: String(Math.round(bearingTo(rover.x, rover.z))).padStart(3, '0'), u: '°' }] },
    alert: safe ? 'SOLAR STORM DRILL · SAFE AT THE CREW ROVER' : 'SOLAR STORM DRILL · RETURN TO THE CREW ROVER',
  });
  const marks = stops.map(s => ({ bearing: bearingTo(s.x, s.z), label: s.key, color: '#f3ede6' }));
  marks.push({ bearing: state.sun.az, label: 'SUN', color: '#ffc857', kind: 'sun' });
  ui.tape.draw(walk.heading(), marks);
}

function doneAlong(pos) {
  const P = ribbon.samples; if (!P) return -1;
  let best = 1e18, bi = 0;
  const start = Math.max(0, (state.lastDone || 0) - 50);
  for (let i = start; i < Math.min(P.length, start + 400); i++) { const d = (P[i][0] - pos.x) ** 2 + (P[i][1] - pos.z) ** 2; if (d < best) { best = d; bi = i; } }
  state.lastDone = bi;
  return bi * 1.0;
}
function bearingTo(x, z) { return ((Math.atan2(x - walk.pos.x, -(z - walk.pos.z)) * 180 / Math.PI) + 360) % 360; }
// metabolic rate (W) from the planned energy along a track, over about 10 s around t
function rateW(tr, t, total) {
  const a = Math.max(0, t - 5), b = Math.min(total, t + 5);
  return b - a > 1 ? (trackAt(tr, b).e - trackAt(tr, a).e) / (b - a) : SUIT.stationW;
}
// ground grade (degrees, + uphill) over the next `m` metres of a track
function gradeAhead(tr, cum, t, m) {
  const p = trackAt(tr, t), s0 = cum[p.i] + Math.hypot(p.x - tr[p.i * 5], p.z - tr[p.i * 5 + 2]);
  let i = p.i + 1;
  while (i < cum.length - 1 && cum[i] < s0 + m) i++;
  const run = cum[i] - s0;
  return run > 0.5 ? Math.atan((tr[i * 5 + 1] - p.y) / run) * 180 / Math.PI : null;
}
function hud(p) {
  const sc = state.sched, t = state.walkT;
  const atK = sc.events.findIndex(e => t >= e.arrive - 0.5 && t < e.depart);
  const nextK = sc.events.findIndex(e => e.arrive > t + 0.5);
  const nx = nextK >= 0 ? (stops[nextK + 1] || rover) : rover;
  // distance left along the route to the next stop
  const dist = nextK >= 0 ? Math.max(0, alongAt(sc.track, sc.cum, sc.events[nextK].arrive) - alongAt(sc.track, sc.cum, t)) : 0;
  const eta = nextK >= 0 ? sc.events[nextK].arrive - t : 0;
  const g4 = atK < 0 ? gradeAhead(sc.track, sc.cum, t, 4) : null;
  const walking = g4 !== null, grade = walking ? Math.round(g4) : 0;
  const metW = atK >= 0 ? SUIT.stationW : rateW(sc.track, t, sc.total);
  const wbk = state.walkback ? planner.sampleGrid(state.walkback, walk.pos.x, walk.pos.z) : null;
  const inRadio = state.radio ? planner.sampleGrid(state.radio, walk.pos.x, walk.pos.z) : null;
  const o2 = p.e / 1e6 * SUIT.o2KgPerMJ;
  ui.setHud({
    suit: [
      { k: 'EVA time', v: fmtDur(t) },
      { k: 'Oxygen used', v: o2.toFixed(2), u: 'kg' },
      { k: 'Metabolic', v: Math.round(metW), u: 'W', cls: metW > SUIT.maxW * 0.9 ? 'warn' : '' },
      { k: 'Dose', v: Math.round(SUIT.doseMSvPerDay * t / 86400 * 1000), u: 'µSv' },
      { k: 'Walk back', v: wbk === null ? '–' : isFinite(wbk) ? Math.ceil(wbk) : '75+', u: 'min', cls: wbk > WALK_RANGE_MIN ? 'warn' : '' },
      { k: 'Radio', v: inRadio === null ? '–' : inRadio ? 'LINK' : 'NO LINK', cls: inRadio === 0 ? 'warn' : '' },
      { k: 'Grade', v: walking ? `${grade > 0 ? '+' : ''}${grade}` : '–', u: walking ? '°' : '', cls: Math.abs(grade) > 15 ? 'warn' : '' },
      { k: 'Sun', v: state.sun.el.toFixed(1), u: '°' },
    ],
    next: atK >= 0
      ? { name: stops[atK + 1]?.name || rover.name, label: 'On site', row: [
          { k: 'Time left', v: fmtDur(sc.events[atK].depart - t) },
          { k: 'Then', v: (stops[atK + 2] || rover).key }] }
      : { name: nx === rover ? 'Crew rover' : nx.name, label: 'Next stop', row: [
          { k: 'Distance', v: Math.round(dist), u: 'm' }, { k: 'ETA', v: fmtDur(Math.max(0, eta)) },
          { k: 'Bearing', v: String(Math.round(bearingTo(nx.x, nx.z))).padStart(3, '0'), u: '°' }] },
    alert: null,
  });
  const marks = stops.map(s => ({ bearing: bearingTo(s.x, s.z), label: s.key, color: '#f3ede6' }));
  marks.push({ bearing: state.sun.az, label: 'SUN', color: '#ffc857', kind: 'sun' });
  ui.tape.draw(walk.heading(), marks);
  // rover's-eye photos at a stop
  const here = atK >= 0 ? stops[atK + 1] : null;
  if ((here?.id || null) !== state.povStop) { state.povStop = here?.id || null; showPovFor(here); }
}

// --------- rover views ---------
let pov = null;
fetch(site.base + 'pov/index.json').then(r => r.ok ? r.json() : null).then(j => { pov = j; }).catch(() => {});
function showPovFor(stop) {
  if (!stop || !pov || state.noPov) { ui.showPov(null); bubbles.hide(); state.povEye = null; return; }
  const imgs = povImages(stop);
  const hang = imgs.filter(i => i.rec.kind !== 'fhaz').map(i => i.rec);
  // face a photo of the ground first (camera pointing down past 10°) when the stop has one
  const r = hang.find(q => q.kind === 'nav' && q.el <= -10) || hang[0];
  ui.showPov(stop, imgs, r ? imgs.findIndex(i => i.rec === r) : 0);
  if (hang.length) {
    bubbles.show(hang);
    // stand where Curiosity's camera stood
    state.povEye = new THREE.Vector3(...r.pos);
    if (state.mode === 'walk') { const el = Math.asin(Math.max(-1, Math.min(1, r.look[1]))); walk.yaw = Math.atan2(-r.look[0], -r.look[2]); walk.pitch = Math.min(el * 0.6, el + 0.21); state.holdLookUntil = simTime + 8; }
  } else { bubbles.hide(); state.povEye = null; }
}
const CAM_ORDER = { nav: 0, mast: 1, fhaz: 2 };
function compass(az) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((az % 360) + 360) % 360 / 45) % 8]; }
function povImages(stop) {
  if (!pov || stop.site === undefined) return [];
  const st = pov.stops.find(q => q.site === stop.site && q.drive === stop.drive);
  if (!st) return [];
  const byId = povById || (povById = new Map(pov.images.map(i => [i.id, i])));
  return st.images.map(id => byId.get(id)).filter(Boolean)
    .sort((a, b) => (CAM_ORDER[a.kind] - CAM_ORDER[b.kind]) || (a.az - b.az))
    .map(r => ({ src: site.base + 'pov/' + r.file, sol: r.sol, camera: r.camera, dir: `${compass(r.az)} ${Math.round(r.az)}°`, lmst: r.lmst.slice(-12, -4), rec: r }));
}
let povById = null;
const bubbles = new PhotoBubbles(scene, site.base + 'pov/');

// --------- loop ---------
// in plan mode the 3D view is centred on the free space between the panels
function viewOffset() {
  // the title screen and the story place the picture themselves (fractions of the window)
  if (state.cine) {
    if (state.cine.x || state.cine.y) camera.setViewOffset(innerWidth, innerHeight, innerWidth * state.cine.x, innerHeight * state.cine.y, innerWidth, innerHeight);
    else camera.clearViewOffset();
    return;
  }
  if (state.mode === 'plan' && innerWidth > 900) camera.setViewOffset(innerWidth, innerHeight, 42, 42, innerWidth, innerHeight);
  else if (state.mode === 'plan') camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.24, innerWidth, innerHeight);
  else camera.clearViewOffset();
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; viewOffset(); camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
let last = performance.now(), slowFrames = 0, prFloor = 1, simTime = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // keep it smooth on slower GPUs: step the pixel ratio down after sustained slow frames
  if (dt > 0.034) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 45 && renderer.getPixelRatio() > prFloor) { renderer.setPixelRatio(Math.max(prFloor, renderer.getPixelRatio() - 0.25)); renderer.setSize(innerWidth, innerHeight, false); slowFrames = 0; }
  tick(dt);
  requestAnimationFrame(frame);
}
function tick(dt) {
  simTime += dt;
  if (onTick) onTick(dt);
  ribbon.uniforms.uTime.value = simTime;
  if (state.mode === 'plan') {
    table.update(dt);
    const b = evaBounds();
    sky.fitShadow(table.cur.target.x, table.cur.target.y, table.cur.target.z, Math.min(site.half * 1.3, Math.max(300, table.cur.dist * 0.9)));
  } else {
    if (state.abort) drillStep(dt); else walkStep(dt);
    sky.fitShadow(walk.pos.x, walk.pos.y, walk.pos.z, 260);
  }
  if (state.blendFrom && state.blendK < 1) {
    state.blendK = Math.min(1, state.blendK + dt / 2.4);
    const k = THREE.MathUtils.smootherstep(state.blendK, 0, 1);
    const toP = camera.position.clone(), toQ = camera.quaternion.clone(), toF = state.fovTarget;
    // arc over the terrain: lift the midpoint so the glide never clips a ridge
    const lift = Math.sin(Math.PI * k) * Math.min(400, state.blendFrom.p.distanceTo(toP) * 0.25);
    camera.position.lerpVectors(state.blendFrom.p, toP, k); camera.position.y += lift;
    camera.quaternion.slerpQuaternions(state.blendFrom.q, toQ, k);
    camera.fov = state.blendFrom.fov + (toF - state.blendFrom.fov) * k; camera.updateProjectionMatrix();
    if (state.blendK >= 1) { camera.fov = toF; camera.updateProjectionMatrix(); }
  }
  replayStep(dt);
  bubbles.update(dt);
  sky.follow(camera);
  renderer.render(scene, camera);
  pins.update(innerWidth, innerHeight, state.mode === 'plan');
  if (probeEl && probeAt) {
    const v = probeAt.clone().project(camera);
    const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
    probeEl.style.transform = `translate(${Math.min(innerWidth - (innerWidth > 900 ? 660 : 300), x + 14)}px, ${Math.max(innerWidth > 900 ? 104 : 90, y - 40)}px)`;
    probeEl.style.display = state.mode === 'plan' && v.z < 1 ? '' : 'none';
  }
}

if (OPEN !== 'control') state.cine = { x: 0, y: 0 };
viewOffset();
framePlan(false);
await rebuildRoute();
booted = true;
document.body.classList.remove('pending');
if (!FILM) requestAnimationFrame(frame);

window.__booted = true;
const failEl = document.getElementById('fail'); if (failEl) failEl.hidden = true;
const app = { THREE, scene, camera, renderer, site, frames, terrain, sky, table, walk, state, stops, planner, model, ribbon, ui,
  setMode, focusStop, updateTime, rebuildRoute, rebuildSchedule, applyLayer, LAYERS, curRibbon, curMarker, showPovFor, marker, framePlan, toggleDrill, abortRibbon, suitFig, heightAt, pins, bubbles, povImages,
  setLmst(h) { state.cursorLmst = h; updateTime(); },
  preloadLayers: () => Promise.all([ensureImageLayer('tRelief', 'relief_2m.png'), ensureImageLayer('tMin', 'crism_hyd.png'), ensureWalkback()]),
  layer(id, on) { const L = LAYERS.find(l => l.id === id); L.on = on; applyLayer(L); ui.setLayers(LAYERS); },
  // the ground at a point, read with the same maps and thresholds as the stop probe
  groundAt: async p => { const [hyd, rel] = await Promise.all([layerPixels('crism_hyd.png'), layerPixels('relief_2m.png')]); return { relief: (pix(rel, p.x, p.z)[0] - 128) / 50, hydrated: pix(hyd, p.x, p.z)[3] > 60 }; },
  viewOffset,
};
if (DEBUG) window.__app = app;
// the crew's rover, parked where the walk starts and ends (NASA's Space Exploration Vehicle model)
const roverParked = import('./rover.js').then(m => m.addRover(app, roverModel)).catch(e => console.warn('rover', e));
// the walk opens on the rover, so it waits for it (a model that will not load holds it 10 s at most)
await Promise.race([roverParked, new Promise(r => setTimeout(r, 10000))]);
if (story) { story.attach(app, fn => { onTick = fn; }); window.__story = story; if (OPEN === 'story') story.start(+QS.get('story') || 0); }
if (FILM) { const { Film } = await import('./film.js'); window.__film = new Film(window.__app, tick); }
