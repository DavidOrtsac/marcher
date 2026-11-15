// Curiosity REMS weather: load the baked feed, seasonal outlook from earlier Mars years, latest reading.
// Data: app/data/weather.json, baked by tools/bake_weather.py from the CAB / NASA REMS outreach feed
//   https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json
// Season and Mars Year per sol come from marstime.js (Mars24): Ls at MSL LMST 12:00 of each sol.

import { mslUtcFor, marsClock, marsYear } from './marstime.js';

// Fields summarised by outlookFor. Units: C, Pa; sunrise/sunset in MSL LMST hours; uv is ordinal text.
export const OUTLOOK_FIELDS = ['minTemp', 'maxTemp', 'minGts', 'maxGts', 'pressure', 'uv', 'sunrise', 'sunset'];
const MEASURED = ['minTemp', 'maxTemp', 'minGts', 'maxGts', 'pressure', 'uv'];
// The four REMS UV index categories present in the feed, in increasing order; other text is skipped.
const UV_ORDER = ['Low', 'Moderate', 'High', 'Very_High'];

const hours = (s) => { if (!s) return null; const [h, m] = s.split(':').map(Number); return h + m / 60; };

/** Turn the baked columnar JSON into { source, units, sols: [...], years: [...] }. */
export function parseWeather(json) {
  const { fields, rows } = json;
  const sols = rows.map((r) => {
    const o = Object.fromEntries(fields.map((f, i) => [f, r[i]]));
    const noon = mslUtcFor(o.sol, 12);
    o.lsNoon = marsClock(noon).ls;  // exact Ls at mid-sol (published ls is floor of Ls at sol start)
    o.my = marsYear(noon);          // Clancy et al. (2000) Mars Year
    return o;
  }).sort((a, b) => a.sol - b.sol);
  const years = [...new Set(sols.map((s) => s.my))].sort((a, b) => a - b);
  return { source: json.source, units: json.units, sols, years };
}

/** Fetch and parse app/data/weather.json. */
export async function loadWeather(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather: ${res.status} ${url}`);
  return parseWeather(await res.json());
}

// Linear-interpolation quantile (Hyndman & Fan 1996 type 7, the numpy/R default) of a sorted array.
function quantile(sorted, p) {
  const h = (sorted.length - 1) * p, lo = Math.floor(h);
  return lo + 1 < sorted.length ? sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
}
// Nearest-rank quantile for ordinal data (Hyndman & Fan type 1, inverse empirical CDF).
const rankQuantile = (sorted, p) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];

/**
 * Seasonal outlook at solar longitude `ls`: for each field, median / p10 / p90 / count over sols
 * whose mid-sol Ls is within +-windowDeg (wrapping at 360) and whose Mars Year is < beforeMY.
 * Pass the planned date's Mars Year as beforeMY so only earlier years count (default: all years).
 */
export function outlookFor(data, ls, windowDeg = 5, beforeMY = Infinity) {
  const near = data.sols.filter((s) => {
    const d = Math.abs((((s.lsNoon - ls) % 360) + 540) % 360 - 180);
    return d <= windowDeg && s.my < beforeMY;
  });
  const fields = {};
  for (const f of OUTLOOK_FIELDS) {
    if (f === 'uv') {
      const v = near.map((s) => UV_ORDER.indexOf(s.uv)).filter((i) => i >= 0).sort((a, b) => a - b);
      fields.uv = v.length
        ? { median: UV_ORDER[rankQuantile(v, 0.5)], p10: UV_ORDER[rankQuantile(v, 0.1)],
            p90: UV_ORDER[rankQuantile(v, 0.9)], count: v.length }
        : { median: null, p10: null, p90: null, count: 0 };
      continue;
    }
    const v = near.map((s) => (f === 'sunrise' || f === 'sunset' ? hours(s[f]) : s[f]))
      .filter((x) => x !== null && x !== undefined).sort((a, b) => a - b);
    fields[f] = v.length
      ? { median: quantile(v, 0.5), p10: quantile(v, 0.1), p90: quantile(v, 0.9), count: v.length }
      : { median: null, p10: null, p90: null, count: 0 };
  }
  const years = [...new Set(near.map((s) => s.my))].sort((a, b) => a - b);
  return { ls, windowDeg, years, sols: near.length, fields };
}

/** Most recent sol with at least one measured value (temperature, pressure or UV). */
export function latest(data) {
  for (let i = data.sols.length - 1; i >= 0; i--) {
    const s = data.sols[i];
    if (MEASURED.some((f) => s[f] !== null && s[f] !== undefined)) return { ...s };
  }
  return null;
}
