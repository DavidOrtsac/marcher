// Validation of app/js/marstime.js.  Run: node tools/tests/test_marstime.mjs
// Every check prints expected vs got. Exit code 1 on any FAIL.
import fs from 'node:fs';
import * as mt from '../../app/js/marstime.js';

const here = new URL('.', import.meta.url).pathname;
let pass = 0, fail = 0, noted = 0;
const fmt = (x) => (typeof x === 'number' ? +x.toPrecision(12) : x);
function line(status, label, expected, got, extra = '') {
  console.log(`${status.padEnd(5)} ${label.padEnd(34)} expected ${String(fmt(expected)).padEnd(16)} got ${String(fmt(got)).padEnd(18)} ${extra}`);
}
function check(label, expected, got, tol, extra = '') {
  const ok = typeof expected === 'string' ? expected === got : Math.abs(got - expected) <= tol;
  ok ? pass++ : fail++;
  line(ok ? 'PASS' : 'FAIL', label, expected, got, extra);
  return ok;
}
// Compare to a value printed on the Mars24 page with d decimals (tolerance half a unit in the last place).
function page(label, printed, got, why) {
  const d = (printed.split('.')[1] || '').length;
  const ok = Math.abs(got - Number(printed)) <= 0.5 * 10 ** -d + 1e-12;
  const shown = got.toFixed(d);
  if (ok) { pass++; line('PASS', label, printed, shown); return; }
  if (why) { noted++; line('NOTE', label, printed, shown, `page inconsistent: ${why}`); return; }
  fail++; line('FAIL', label, printed, shown);
}
function pageStr(label, printed, got, why) {
  if (printed === got) { pass++; line('PASS', label, printed, got); return; }
  if (why) { noted++; line('NOTE', label, printed, got, `page inconsistent: ${why}`); return; }
  fail++; line('FAIL', label, printed, got);
}
const D2R = Math.PI / 180;
// Mars24 D-1 / D-5 recomputed from numbers printed on the page, to show where the page disagrees with itself.
const eotFrom = (ls, nuM) => 2.861 * Math.sin(2 * ls * D2R) - 0.071 * Math.sin(4 * ls * D2R)
  + 0.002 * Math.sin(6 * ls * D2R) - nuM;
const decFromLs = (ls) => Math.asin(0.42565 * Math.sin(ls * D2R)) / D2R + 0.25 * Math.sin(ls * D2R);
function zFrom(dec, lonW, subW, latG) {
  const H = (lonW - subW) * D2R, p = latG * D2R, d = dec * D2R;
  return Math.acos(Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(p) * Math.cos(H)) / D2R;
}
function azFrom(dec, lonW, subW, latG) {
  const H = (lonW - subW) * D2R, p = latG * D2R, d = dec * D2R;
  return ((Math.atan2(Math.sin(H), Math.cos(p) * Math.tan(d) - Math.sin(p) * Math.cos(H)) / D2R) + 360) % 360;
}

// ---------------------------------------------------------------------------------------------
console.log('\n(a) Mars24 worked examples, https://www.giss.nasa.gov/tools/mars24/help/algorithm.html (updated 2025-01-07)');

function example(title, utcMs, lonW, latG, p, notes = {}) {
  console.log(`\n  ${title}`);
  const c = mt.marsClock(utcMs);
  const s = mt.sunAt(utcMs, mt.planetocentricLat(latG), 360 - lonW);  // page gives planetographic lat, west lon
  check('A-1 millis', p.millis, utcMs, 0);
  page('A-2 JD_UT', p.jdUT, c.jdUT);
  page('A-4 TT-UTC (s)', p.ttUtc, c.ttMinusUtc);
  page('A-5 JD_TT', p.jdTT, c.jdTT);
  page('A-6 dt_J2000 (d)', p.dt, c.deltaJ2000);
  page('B-1 M (deg, mod 360)', p.M, c.M);
  page('B-2 alpha_FMS (deg, mod 360)', p.aFMS, c.alphaFMS);
  page('B-3 PBS (deg)', p.pbs, c.pbs);
  page('B-4 nu-M (deg)', p.nuM, c.nuMinusM);
  page('B-5 Ls (deg)', p.ls, c.ls, notes.ls);
  page('C-1 EOT (deg)', p.eot, c.eot, notes.eot);
  page('C-1 EOT (h)', p.eotH, c.eot / 15);
  pageStr('C-1 EOT (hh:mm:ss)', p.eotS, mt.hms(c.eot / 15));
  page('C-2 MST unwrapped (h)', p.mstRaw, 24 * c.msd);
  page('C-2 MST (h)', p.mst, c.mtc);
  pageStr('C-2 MST (hh:mm:ss)', p.mstS, mt.hms(c.mtc));
  page('C-3 LMST (h)', p.lmst, s.lmst);
  pageStr('C-3 LMST (hh:mm:ss)', p.lmstS, mt.hms(s.lmst), notes.lmstS);
  page('C-4 LTST (h)', p.ltst, s.ltst, notes.ltst);
  pageStr('C-4 LTST (hh:mm:ss)', p.ltstS, mt.hms(s.ltst), notes.ltstS);
  page('C-5 subsolar lon (deg W)', p.subW, c.subsolarLonWest);
  page('D-1 declination (deg)', p.dec, c.subsolarLat, notes.dec);
  page('D-2 R_M (AU)', p.r, c.sunDistAU);
  page('D-3 l_M (deg)', p.lM, c.helioLon);
  page('D-4 b_M (deg)', p.bM, c.helioLat);
  page('D-5 Z (deg)', p.Z, 90 - s.el, notes.Z);
  page('D-6 A (deg)', p.A, s.az, notes.A);
}

const p1 = { millis: 947116800000, jdUT: '2451549.5', ttUtc: '64.184', jdTT: '2451549.50074', dt: '4.50074',
  M: '21.74558', aFMS: '272.74566', pbs: '0.00142', nuM: '4.44193', ls: '277.18758', eot: '-5.18774',
  eotH: '-0.34585', eotS: '-00:20:45', mstRaw: '1075103.99425', mst: '23.99425', mstS: '23:59:39',
  lmst: '23.99425', lmstS: '23:59:39', ltst: '23.64840', ltstS: '23:38:54', subW: '174.72600',
  dec: '-25.22825', r: '1.39358', lM: '2.26352', bM: '-1.35957', Z: '154.26182', A: '191.03905' };
example('Example 1: 2000-01-06 00:00:00 UTC, 0 W 0 N', Date.UTC(2000, 0, 6), 0, 0, p1, {
  ls: `B-5 on the page's own alpha_FMS + (nu-M) = 272.74566 + 4.44193 = ${(272.74566 + 4.44193).toFixed(5)} (last digit)`,
  eot: `C-1 on the page's own Ls 277.18758 and nu-M 4.44193 gives ${eotFrom(277.18758, 4.44193).toFixed(5)} (last digit)`,
  dec: `D-1 on the page's own Ls 277.18758 gives ${decFromLs(277.18758).toFixed(6)} (last digit)`,
  Z: `D-5 on the page's own dec -25.22825 and subsolar 174.72600 gives ${zFrom(-25.22825, 0, 174.726, 0).toFixed(5)}`,
});

const p2 = { millis: 1073137591000, jdUT: '2453008.07397', ttUtc: '64.184', jdTT: '2453008.07471',
  dt: '1463.07471', M: '66.06858', aFMS: '317.09457', pbs: '0.01614', nuM: '10.22959', ls: '327.32416',
  eot: '-12.77553', eotH: '-0.85170', eotS: '-00:51:06', mstRaw: '1109173.16537', mst: '13.16537',
  mstS: '13:09:55', lmst: '0.85190', lmstS: '00:51:07', ltst: '0.00025', ltstS: '00:00:00',
  subW: '4.70500', dec: '-13.42065', r: '1.47767', lM: '52.37564', bM: '0.08965', Z: '151.93895',
  A: '179.99383' };
example('Example 2: Spirit landing site, 2004-01-03 13:46:31 UTC, 184.702 W -14.640 N', Date.UTC(2004, 0, 3, 13, 46, 31), 184.702, -14.640, p2, {
  lmstS: "the page's own LMST 0.85190 h is 00:51:06.8, which a clock shows as 00:51:06",
  ltst: `the page's own LMST 0.85190 + EOT -12.77553/15 = ${(0.85190 - 12.77553 / 15).toFixed(5)} h`,
  dec: `D-1 on the page's own Ls 327.32416 gives ${decFromLs(327.32416).toFixed(5)}`,
  Z: `D-5 on the page's own dec and subsolar lon gives ${zFrom(-13.42065, 184.702, 4.705, -14.640).toFixed(5)}`,
  A: `D-6 on the page's own dec and subsolar lon gives ${azFrom(-13.42065, 184.702, 4.705, -14.640).toFixed(5)}`,
});

// ---------------------------------------------------------------------------------------------
console.log('\nTT - UTC table (IERS Leap_Second.dat, through Bulletin C 72)');
for (const [iso, exp] of [
  ['2000-01-01T00:00:00Z', 64.184], ['2005-12-31T23:59:59Z', 64.184], ['2006-01-01T00:00:00Z', 65.184],
  ['2008-12-31T23:59:59Z', 65.184], ['2009-01-01T00:00:00Z', 66.184], ['2012-06-30T23:59:59Z', 66.184],
  ['2012-07-01T00:00:00Z', 67.184], ['2015-06-30T23:59:59Z', 67.184], ['2015-07-01T00:00:00Z', 68.184],
  ['2016-12-31T23:59:59Z', 68.184], ['2017-01-01T00:00:00Z', 69.184], ['2026-11-15T12:00:00Z', 69.184],
  ['2030-12-31T23:59:59Z', 69.184],
]) check(`TT-UTC ${iso}`, exp, mt.ttMinusUtc(Date.parse(iso)), 1e-9);

// ---------------------------------------------------------------------------------------------
console.log('\n(b) Curiosity clock: NAIF msl_lmst_ops120808_v1.tsc epoch + rate, meridian 137.42 E (Mars24 notes)');
// Raw image FLB_847851928EDR_F1252490FHAZ00302M_ (mars.nasa.gov raw image API record 1653833, sol 5073).
const taken = Date.parse('2026-11-13T15:38:30Z');
const labelLmst = 14 + 18 / 60 + 2.833 / 3600;
const r = mt.mslSol(taken);
check('sol from date_taken', 5073, r.sol, 0);
check('LMST from date_taken (s of day)', +(labelLmst * 3600).toFixed(3), +(r.lmst * 3600).toFixed(3), 3,
  `label Sol-05073M14:18:02.833, got ${r.label}, diff ${((r.lmst - labelLmst) * 3600).toFixed(2)} s`);
// Same image through its spacecraft clock 847851928.779 and the last record of NAIF msl.tsc
// (MSL_76_SCLKSCET.00020, 2024-10-28): SCLK 781968210.0 s <-> TT 781972030.506 s past J2000, rate 1.00000953.
const ttImg = 781972030.506 + (847851928.779 - 781968210.0) * 1.00000953;
const tImg = mt.utcMsFromTt(ttImg);
const rs = mt.mslSol(tImg);
check('LMST from SCLK (s of day)', +(labelLmst * 3600).toFixed(3), +(rs.lmst * 3600).toFixed(3), 0.5,
  `SCLK time ${new Date(tImg).toISOString()}, got ${rs.label} (msl.tsc extrapolated 2 yr)`);
const inv = mt.mslUtcFor(5073, labelLmst);
check('mslUtcFor(5073, 14:18:02.833) vs date_taken (s)', 0, (inv - taken) / 1000, 3, new Date(inv).toISOString());
// Round trip, including sols that straddle the 2012-07-01, 2015-07-01 and 2017-01-01 leap seconds.
let worst = 0;
for (let k = 0; k < 2000; k++) {
  const sol = Math.floor(k * 2.6), h = (k * 7.31) % 24;
  const q = mt.mslSol(mt.mslUtcFor(sol, h));
  worst = Math.max(worst, Math.abs((q.sol - sol) * 24 + q.lmst - h) * 3600);
}
for (const iso of ['2012-07-01T00:00:00Z', '2015-07-01T00:00:00Z', '2017-01-01T00:00:00Z']) {
  const t = Date.parse(iso) + 1000, q = mt.mslSol(t);
  worst = Math.max(worst, Math.abs(mt.mslUtcFor(q.sol, q.lmst) - t) / 1000);
}
check('round trip mslSol(mslUtcFor()) worst (s)', 0, worst, 0.001);
// Mars24 LMST at the MSL clock meridian vs the NAIF clock.
const m24 = mt.sunAt(taken, -4.6, mt.MSL_CLOCK_LON_E).lmst;
check('Mars24 LMST at 137.42 E - MSL clock (s)', 0, (m24 - r.lmst) * 3600, 2);
const sol0 = mt.marsClock(mt.mslUtcFor(0, 0));
console.log(`      meridian implied by the NAIF sol-0 epoch under Mars24: ${((-15 * sol0.mtc) % 360 + 360) % 360} E`);
// Landing: NAIF kernel landing time 2012-08-06T05:17:57 UTC; PDS msl_mission_cat.txt: "at 15:03 Local Mean Solar Time".
const land = mt.mslSol(Date.parse('2012-08-06T05:17:57Z'));
check('landing sol', 0, land.sol, 0);
check('landing LMST hh:mm', '15:03', mt.hms(land.lmst).slice(0, 5), 0, land.label);

// REMS rows: the Earth date of each sol's LMST noon, and published Ls.
const W = JSON.parse(fs.readFileSync(here + '../../app/data/weather.json', 'utf8'));
const rows = W.rows.map((a) => Object.fromEntries(W.fields.map((f, i) => [f, a[i]])));
let dateOk = 0, lsOk = 0;
for (const w of rows) {
  if (new Date(mt.mslUtcFor(w.sol, 12)).toISOString().slice(0, 10) === w.date) dateOk++;
  if (Math.floor(mt.marsClock(mt.mslUtcFor(w.sol, 0)).ls) === w.ls) lsOk++;
}
check('REMS sol -> Earth date at LMST 12:00', rows.length, dateOk, 0, `(${rows.length} REMS rows)`);
check('REMS ls == floor(Ls at sol start)', rows.length, lsOk, 10, `(${rows.length - lsOk} off by one at an integer boundary)`);

// ---------------------------------------------------------------------------------------------
console.log('\n(c) REMS sunrise / sunset (HH:MM) vs sunEvents at the landing site (-4.5895, 137.4417 E, PDS catalog)');
const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const L = mt.MSL_LANDING;
const stats = (a) => {
  const b = [...a].sort((x, y) => x - y), q = (p) => b[Math.round(p * (b.length - 1))];
  return `mean ${(b.reduce((s, x) => s + x, 0) / b.length).toFixed(3)}  p5 ${q(0.05).toFixed(3)}  median ${q(0.5).toFixed(3)}  p95 ${q(0.95).toFixed(3)}  min ${b[0].toFixed(3)}  max ${b[b.length - 1].toFixed(3)}`;
};
// Truncation test: REMS minute == floor(my minutes); excess = how far mine falls outside [REMS, REMS + 1 min).
const excess = (rems, mine) => (mine < rems ? mine - rems : mine >= rems + 1 ? mine - rems - 1 : 0);
function compare(name, fn, list) {
  const dr = [], ds = [], xr = [], xs = [];
  let fr = 0, fs_ = 0, rr = 0, rs_ = 0;
  for (const w of list) {
    const [a, b] = fn(w);
    dr.push(hm(w.sunrise) - a); ds.push(hm(w.sunset) - b);
    xr.push(excess(hm(w.sunrise), a)); xs.push(excess(hm(w.sunset), b));
    if (Math.floor(a) === hm(w.sunrise)) fr++; if (Math.floor(b) === hm(w.sunset)) fs_++;
    if (Math.round(a) === hm(w.sunrise)) rr++; if (Math.round(b) === hm(w.sunset)) rs_++;
  }
  const n = list.length, pct = (k) => `${(100 * k / n).toFixed(1)}%`;
  console.log(`  ${name}`);
  console.log(`    sunrise REMS - mine (min): ${stats(dr)}`);
  console.log(`    sunset  REMS - mine (min): ${stats(ds)}`);
  console.log(`    REMS == floor(mine): rise ${pct(fr)} set ${pct(fs_)};  REMS == round(mine): rise ${pct(rr)} set ${pct(rs_)}`);
  console.log(`    outside the truncation minute (min): rise ${Math.min(...xr).toFixed(3)}..${Math.max(...xr).toFixed(3)}  set ${Math.min(...xs).toFixed(3)}..${Math.max(...xs).toFixed(3)}`);
  return { fr: fr / n, fs: fs_ / n, maxEx: Math.max(...xr.map(Math.abs), ...xs.map(Math.abs)) };
}
const ev = new Map();
const centre = (w) => { if (!ev.has(w.sol)) ev.set(w.sol, mt.sunEvents(w.sol, L.lat, L.lon)); return ev.get(w.sol); };

// 24 sols spread evenly over the record.
console.log('\n  sol    earth date   Ls   REMS rise  mine rise   REMS set  mine set   d_rise  d_set (REMS - mine, min)');
const pick = Array.from({ length: 24 }, (_, i) => rows[Math.round(i * (rows.length - 1) / 23)]);
for (const w of pick) {
  const e = centre(w);
  console.log(`  ${String(w.sol).padStart(4)}  ${w.date}  ${String(w.ls).padStart(3)}   ${w.sunrise}    ${mt.hms(e.sunriseLmst)}   ${w.sunset}     ${mt.hms(e.sunsetLmst)}  ${(hm(w.sunrise) - e.sunriseLmst * 60).toFixed(2).padStart(6)} ${(hm(w.sunset) - e.sunsetLmst * 60).toFixed(2).padStart(6)}`);
}
console.log('');
const c24 = compare('24 sols above: LMST, Sun centre, geometric horizon', (w) => { const e = centre(w); return [e.sunriseLmst * 60, e.sunsetLmst * 60]; }, pick);
const call = compare(`all ${rows.length} sols: LMST, Sun centre, geometric horizon (default)`, (w) => { const e = centre(w); return [e.sunriseLmst * 60, e.sunsetLmst * 60]; }, rows);
console.log('  convention probes, all sols:');
compare('LTST instead of LMST', (w) => { const e = centre(w); return [mt.sunAt(e.sunriseUtcMs, L.lat, L.lon).ltst * 60, mt.sunAt(e.sunsetUtcMs, L.lat, L.lon).ltst * 60]; }, rows);
compare('upper limb instead of centre', (w) => { const e = mt.sunEvents(w.sol, L.lat, L.lon, { upperLimb: true }); return [e.sunriseLmst * 60, e.sunsetLmst * 60]; }, rows);
compare('centre, -4.5895 used as planetographic (no conversion)', (w) => { const e = mt.sunEvents(w.sol, mt.planetocentricLat(L.lat), L.lon); return [e.sunriseLmst * 60, e.sunsetLmst * 60]; }, rows);
check('24 sols: REMS == floor(mine) share (rise)', 1, c24.fr, 0.15);
check('all sols: REMS == floor(mine) share (rise)', 1, call.fr, 0.1);
check('all sols: REMS == floor(mine) share (set)', 1, call.fs, 0.1);
check('all sols: worst excess beyond truncation (min)', 0, call.maxEx, 0.2);
// sunEvents self-consistency: elevation at the events is 0.
const e5073 = mt.sunEvents(5073, L.lat, L.lon);
check('el at sol 5073 sunrise (deg)', 0, mt.sunAt(e5073.sunriseUtcMs, L.lat, L.lon).el, 1e-6, `${new Date(e5073.sunriseUtcMs).toISOString()} LMST ${mt.hms(e5073.sunriseLmst)}`);
check('el at sol 5073 sunset (deg)', 0, mt.sunAt(e5073.sunsetUtcMs, L.lat, L.lon).el, 1e-6, `${new Date(e5073.sunsetUtcMs).toISOString()} LMST ${mt.hms(e5073.sunsetLmst)}`);

// ---------------------------------------------------------------------------------------------
console.log('\nReference values');
const t15 = Date.parse('2026-11-15T12:00:00Z');
const c15 = mt.marsClock(t15), s15 = mt.mslSol(t15);
console.log(`  2026-11-15 12:00 UTC: Ls ${c15.ls.toFixed(3)} deg, MY ${mt.marsYear(t15)}, MSL ${s15.label}`);
const box = mt.sunEvents(s15.sol, -4.81, 137.39);
console.log(`  boxwork (-4.81, 137.39 E) sol ${s15.sol}: sunrise ${mt.hms(box.sunriseLmst)} sunset ${mt.hms(box.sunsetLmst)} LMST (MSL clock), ${new Date(box.sunriseUtcMs).toISOString()} / ${new Date(box.sunsetUtcMs).toISOString()}`);
console.log(`  Ls at 1955-04-11 12:00 UTC (MY 1 start, Clancy et al. 2000): ${mt.marsClock(Date.parse('1955-04-11T12:00:00Z')).ls.toFixed(3)}`);

console.log(`\n${pass} pass, ${fail} fail, ${noted} noted (Mars24 page values that disagree with the page's own inputs)`);
process.exit(fail ? 1 : 0);
