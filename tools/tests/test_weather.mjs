// Validation of app/js/weather.js on the real baked REMS file.  Run: node tools/tests/test_weather.mjs
// Prints expected vs got. Exit code 1 on any FAIL.
import fs from 'node:fs';
import http from 'node:http';
import { loadWeather, parseWeather, outlookFor, latest } from '../../app/js/weather.js';
import { marsClock, marsYear, mslSol, hms } from '../../app/js/marstime.js';

const root = new URL('../../', import.meta.url).pathname;
let pass = 0, fail = 0;
function check(label, expected, got, tol = 0) {
  const ok = typeof expected === 'number' ? Math.abs(got - expected) <= tol : JSON.stringify(expected) === JSON.stringify(got);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} expected ${JSON.stringify(expected).padEnd(22)} got ${JSON.stringify(got)}`);
}

// loadWeather through a real HTTP fetch of app/data/weather.json.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  fs.createReadStream(root + 'app/data/weather.json').pipe(res);
}).listen(0);
await new Promise((r) => server.once('listening', r));
const data = await loadWeather(`http://127.0.0.1:${server.address().port}/weather.json`);
server.close();

// Independent read of the source feed for spot checks.
const raw = JSON.parse(fs.readFileSync(root + 'research/rems.json', 'utf8')).soles;
const rawBySol = new Map(raw.map((r) => [Number(r.sol), r]));
const n = (v) => (v === '--' ? null : Number(v));

console.log('\nFile coverage');
const first = data.sols[0], last = data.sols[data.sols.length - 1];
check('rows (= feed records)', raw.length, data.sols.length);
console.log(`      sols ${first.sol}..${last.sol}, Earth dates ${first.date} .. ${last.date}, Mars Years ${data.years.join(', ')}`);
let same = 0;
for (const s of data.sols) {
  const r = rawBySol.get(s.sol);
  if (r.terrestrial_date === s.date && n(r.min_temp) === s.minTemp && n(r.max_temp) === s.maxTemp
    && n(r.min_gts_temp) === s.minGts && n(r.max_gts_temp) === s.maxGts && n(r.pressure) === s.pressure
    && (r.local_uv_irradiance_index === '--' ? null : r.local_uv_irradiance_index) === s.uv
    && r.sunrise === s.sunrise && r.sunset === s.sunset && Number(r.ls) === s.ls) same++;
}
check('baked rows identical to feed values', raw.length, same);
// Mars Year: compare with a count of published-ls wraps from MY 31 at landing.
let my = 31, prev = null, myDiff = [];
for (const s of data.sols) {
  if (prev !== null && prev - s.ls > 180) my++;
  prev = s.ls;
  if (my !== s.my) myDiff.push(`sol ${s.sol} ls ${s.ls} lsNoon ${s.lsNoon.toFixed(2)} MY ${s.my} vs ${my}`);
}
console.log(`      MY from mid-sol Ls vs MY from published-ls wraps: ${myDiff.length} differ${myDiff.length ? ' (' + myDiff.join('; ') + ')' : ''}`);
check('MY differences only at Ls 0 crossings', true, myDiff.length <= 6);

console.log('\nlatest()');
const lt = latest(data);
const lr = rawBySol.get(lt.sol);
console.log(`      sol ${lt.sol} (${lt.date}), Ls ${lt.lsNoon.toFixed(1)}, MY ${lt.my}: air ${lt.minTemp}..${lt.maxTemp} C, ground ${lt.minGts}..${lt.maxGts} C, ${lt.pressure} Pa, UV ${lt.uv}, sunrise ${lt.sunrise} sunset ${lt.sunset}`);
check('latest sol = last feed sol with readings', Math.max(...raw.filter((r) => r.max_temp !== '--' || r.pressure !== '--').map((r) => Number(r.sol))), lt.sol);
check('latest values = feed record', [n(lr.min_temp), n(lr.max_temp), n(lr.pressure), lr.terrestrial_date], [lt.minTemp, lt.maxTemp, lt.pressure, lt.date]);

// Outlook math on a synthetic fixture. THIS IS MOCK DATA - NOT REAL REMS DATA (only checks the statistics).
console.log('\noutlookFor() statistics on a synthetic fixture (THIS IS MOCK DATA - NOT REAL REMS DATA)');
const mock = { sols: [] };
for (let i = 1; i <= 10; i++) mock.sols.push({ sol: i, my: 30 + (i % 2), lsNoon: i <= 5 ? 358 + i * 0.2 : (i - 5) * 0.5, minTemp: i, maxTemp: null, minGts: null, maxGts: null, pressure: 700 + i, uv: ['Low', 'Moderate', 'High', 'Very_High', 'Moderate'][i % 5], sunrise: '06:00', sunset: `18:0${i % 10}` });
mock.sols.push({ sol: 11, my: 32, lsNoon: 1, minTemp: 999, uv: 'Low', sunrise: null, sunset: null });
const mo = outlookFor(mock, 0, 5, 32);
check('wraps 358..360 and 0..2.5, excludes MY >= 32', 10, mo.sols);
check('median 1..10 (numpy type 7)', 5.5, mo.fields.minTemp.median, 1e-12);
check('p10 1..10 (numpy type 7)', 1.9, mo.fields.minTemp.p10, 1e-12);
check('p90 1..10 (numpy type 7)', 9.1, mo.fields.minTemp.p90, 1e-12);
check('all-null field -> count 0', 0, mo.fields.maxTemp.count);
check('UV ordinal median / p10 / p90', ['Moderate', 'Low', 'Very_High'], [mo.fields.uv.median, mo.fields.uv.p10, mo.fields.uv.p90]);
check('sunset in hours', 18 + 4.5 / 60, mo.fields.sunset.median, 1e-12);
check('years used', [30, 31], mo.years);

console.log('\nOutlooks from the real REMS record');
const t15 = Date.parse('2026-11-15T12:00:00Z');
const ls15 = marsClock(t15).ls, my15 = marsYear(t15), sol15 = mslSol(t15);
console.log(`  2026-11-15 12:00 UTC: Ls ${ls15.toFixed(3)}, MY ${my15}, MSL ${sol15.label}`);
const f1 = (x) => (x === null ? 'null' : Number.isInteger(x) ? String(x) : x.toFixed(1));
const hh = (x) => (x === null ? 'null' : hms(x).slice(0, 5));
function show(title, o) {
  console.log(`\n  ${title}: Ls ${o.ls.toFixed(2)} +-${o.windowDeg}, ${o.sols} sols from MY ${o.years.join(', ')}`);
  console.log('    field       median    p10     p90   count');
  for (const [k, v] of Object.entries(o.fields)) {
    const g = k === 'sunrise' || k === 'sunset' ? hh : k === 'uv' ? (x) => String(x) : f1;
    console.log(`    ${k.padEnd(9)} ${g(v.median).padStart(9)} ${g(v.p10).padStart(9)} ${g(v.p90).padStart(9)} ${String(v.count).padStart(6)}`);
  }
}
const o15 = outlookFor(data, ls15, 5, my15);
show('2026-11-15 (earlier years only)', o15);
check('2026-11-15 outlook uses MY 31..38 only', true, o15.years.every((y) => y < my15) && o15.years.length > 0);
check('2026-11-15 outlook count = sols in window', o15.sols, data.sols.filter((s) => Math.abs((((s.lsNoon - ls15) % 360) + 540) % 360 - 180) <= 5).length);
show('Ls 90, southern winter solstice', outlookFor(data, 90));
show('Ls 250, near perihelion', outlookFor(data, 250));
show('Ls 2, window wraps through 0', outlookFor(data, 2, 5));

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
