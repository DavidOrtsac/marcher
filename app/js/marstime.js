// Mars clock and Sun position.
//
// Algorithm: NASA GISS Mars24 "Algorithm and Worked Examples" (page updated 2025-01-07),
//   https://www.giss.nasa.gov/tools/mars24/help/algorithm.html
// which documents Allison & McEwen (2000), Planet. Space Sci. 48, 215-235, with the
// Allison (2015) constant updates. Step labels A-1 ... D-6 below are that page's.
//
// Conventions in this module:
//   utcMs     POSIX milliseconds (Date.getTime()); like Mars24 A-1, leap seconds are not counted
//             in utcMs and are added back through the TT - UTC table below.
//   latDeg    planetocentric latitude (the MSL / USGS convention used by the app); converted to
//             planetographic internally because Mars24 D-5/D-6 need planetographic latitude.
//   lonEastDeg  east-positive longitude. Mars24 uses planetographic west longitude; on Mars the two
//             name the same meridian, west = 360 - east.

const D2R = Math.PI / 180;
const sind = (x) => Math.sin(x * D2R);
const cosd = (x) => Math.cos(x * D2R);
const mod = (x, m) => ((x % m) + m) % m;

const JD_UNIX_EPOCH = 2440587.5;  // JD of 1970-01-01T00:00 (Mars24 A-2)
const JD_J2000 = 2451545.0;       // JD of J2000 epoch, 2000-01-01T12:00 TT (Mars24 A-6)
const J2000_UNIX_MS = (JD_J2000 - JD_UNIX_EPOCH) * 864e5;  // 946728000000

// ---------------------------------------------------------------------------------------------
// TT - UTC
// TAI - UTC steps from the IERS leap second table, Leap_Second.dat, "updated through IERS
// Bulletin C 72 issued in July 2026, file expires on 28 June 2027":
//   https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat
// TT - UTC = (TAI - UTC) + 32.184 s (Mars24 A-4). For 2000 to 2030:
//   1999-01-01 .. 2005-12-31   64.184 s
//   2006-01-01 .. 2008-12-31   65.184 s
//   2009-01-01 .. 2012-06-30   66.184 s
//   2012-07-01 .. 2015-06-30   67.184 s
//   2015-07-01 .. 2016-12-31   68.184 s
//   2017-01-01 onward          69.184 s
// No leap second is announced up to the file's expiry (2027-06-28). Later dates assume none;
// add a row here if IERS announces one.
const TAI_UTC = [
  [1972, 1, 10], [1972, 7, 11], [1973, 1, 12], [1974, 1, 13], [1975, 1, 14], [1976, 1, 15],
  [1977, 1, 16], [1978, 1, 17], [1979, 1, 18], [1980, 1, 19], [1981, 7, 20], [1982, 7, 21],
  [1983, 7, 22], [1985, 7, 23], [1988, 1, 24], [1990, 1, 25], [1991, 1, 26], [1992, 7, 27],
  [1993, 7, 28], [1994, 7, 29], [1996, 1, 30], [1997, 7, 31], [1999, 1, 32], [2006, 1, 33],
  [2009, 1, 34], [2012, 7, 35], [2015, 7, 36], [2017, 1, 37],
].map(([y, m, s]) => [Date.UTC(y, m - 1, 1), s]);

/** TT - UTC in seconds at a UTC instant. */
export function ttMinusUtc(utcMs) {
  if (utcMs < TAI_UTC[0][0]) {
    // Before 1972: Mars24 A-4 polynomial, T in Julian centuries from J2000 (A-3).
    const T = (JD_UNIX_EPOCH + utcMs / 864e5 - JD_J2000) / 36525;
    return 64.184 + 59 * T - 51.2 * T ** 2 - 67.1 * T ** 3 - 16.4 * T ** 4;
  }
  let s = TAI_UTC[0][1];
  for (const [t, v] of TAI_UTC) { if (utcMs >= t) s = v; else break; }
  return s + 32.184;
}

/** TT seconds past J2000 for a UTC instant. */
export function ttSecondsJ2000(utcMs) {
  return (utcMs - J2000_UNIX_MS) / 1000 + ttMinusUtc(utcMs);
}

/** Inverse of ttSecondsJ2000. */
export function utcMsFromTt(ttSec) {
  let u = J2000_UNIX_MS + ttSec * 1000 - 69184;
  for (let i = 0; i < 3; i++) u = J2000_UNIX_MS + (ttSec - ttMinusUtc(u)) * 1000;
  return u;
}

// ---------------------------------------------------------------------------------------------
// Mars clock

// Mars24 B-3 perturbation terms: [A_i (deg), tau_i (Julian years), phi_i (deg)].
const PBS = [
  [0.0071, 2.2353, 49.409], [0.0057, 2.7543, 168.173], [0.0039, 1.1177, 191.837],
  [0.0037, 15.7866, 21.736], [0.0021, 2.1354, 15.704], [0.0020, 2.4694, 95.528],
  [0.0018, 32.8493, 49.095],
];

/**
 * Mars time and Sun geometry at a UTC instant (Mars24 A-1 to D-4).
 * Returns { jdTT, msd, mtc (h), ls (deg), eot (deg), subsolarLon (deg E), subsolarLat (deg),
 *   sunDistAU } plus the intermediate values the Mars24 page lists.
 */
export function marsClock(utcMs) {
  const jdUT = JD_UNIX_EPOCH + utcMs / 864e5;                    // A-2
  const dTT = ttMinusUtc(utcMs);                                  // A-4
  const jdTT = jdUT + dTT / 86400;                                // A-5
  const dt = jdTT - JD_J2000;                                     // A-6, days
  const M = 19.3871 + 0.52402073 * dt;                            // B-1, mean anomaly
  const alphaFMS = 270.3871 + 0.524038496 * dt;                   // B-2, fictitious mean Sun
  let pbs = 0;                                                    // B-3, 0.985626 = 360/365.25
  for (const [A, tau, phi] of PBS) pbs += A * cosd(0.985626 * dt / tau + phi);
  const nuMinusM = (10.691 + 3.0e-7 * dt) * sind(M) + 0.623 * sind(2 * M)   // B-4
    + 0.050 * sind(3 * M) + 0.005 * sind(4 * M) + 0.0005 * sind(5 * M) + pbs;
  const ls = mod(alphaFMS + nuMinusM, 360);                       // B-5
  const eot = 2.861 * sind(2 * ls) - 0.071 * sind(4 * ls)         // C-1, degrees
    + 0.002 * sind(6 * ls) - nuMinusM;
  const msd = (jdTT - 2451549.5) / 1.0274912517 + 44796.0 - 0.0009626;  // C-2 bracket (Mars Sol Date)
  const mtc = mod(24 * msd, 24);                                  // C-2, MST at prime meridian
  const subsolarLonWest = mod(mtc * 15 + eot + 180, 360);         // C-5
  const subsolarLat = Math.asin(0.42565 * sind(ls)) / D2R + 0.25 * sind(ls);  // D-1, declination
  const sunDistAU = 1.52367934 * (1.00436 - 0.09309 * cosd(M)     // D-2
    - 0.004336 * cosd(2 * M) - 0.00031 * cosd(3 * M) - 0.00003 * cosd(4 * M));
  const helioLon = mod(ls + 85.061 - 0.015 * sind(71 + 2 * ls) - 5.5e-6 * dt, 360);  // D-3
  const helioLat = -(1.8497 - 2.23e-5 * dt) * sind(ls - 144.50 + 2.57e-6 * dt);      // D-4
  return {
    jdUT, ttMinusUtc: dTT, jdTT, deltaJ2000: dt,
    M: mod(M, 360), alphaFMS: mod(alphaFMS, 360), pbs, nuMinusM, ls, eot,
    msd, mtc, subsolarLon: mod(360 - subsolarLonWest, 360), subsolarLonWest, subsolarLat,
    sunDistAU, helioLon, helioLat,
  };
}

/**
 * Mars Year number at a UTC instant, Clancy et al. (2000, JGR 105(E4), 9553) convention:
 * MY 1 began at Ls 0 on 1955-04-11. Year length 360 / 0.524038496 = 686.9725 d (Mars24 B-2).
 */
export function marsYear(utcMs) {
  const c = marsClock(utcMs);
  const years = (c.jdTT - 2435208.5) / (360 / 0.524038496);      // JD 2435208.5 = 1955-04-11
  return 1 + Math.round(years - c.ls / 360);
}

// ---------------------------------------------------------------------------------------------
// Latitude conversion. Mars radii a = 3396.19 km (equatorial), c = 3376.20 km (polar): IAU WGCCRE
// 2015 report, Archinal et al. (2018), Celest. Mech. Dyn. Astron. 130:22.
const F2 = (3396.19 / 3376.20) ** 2;
export const planetographicLat = (latC) => Math.atan(F2 * Math.tan(latC * D2R)) / D2R;
export const planetocentricLat = (latG) => Math.atan(Math.tan(latG * D2R) / F2) / D2R;

/**
 * Sun as seen from a surface point (Mars24 C-3, C-4, D-5, D-6).
 * el: geometric elevation of the Sun's centre above the ellipsoid horizon, no refraction.
 * az: degrees clockwise from north. lmst/ltst: local mean/true solar time at lonEastDeg, hours.
 */
export function sunAt(utcMs, latDeg, lonEastDeg) {
  const c = marsClock(utcMs);
  const lonW = mod(-lonEastDeg, 360);
  const lmst = mod(c.mtc - lonW / 15, 24);                        // C-3
  const ltst = mod(lmst + c.eot / 15, 24);                        // C-4
  const phi = planetographicLat(latDeg) * D2R;
  const H = (lonW - c.subsolarLonWest) * D2R;                     // D-5 hour angle
  const dec = c.subsolarLat * D2R;
  const cosZ = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi) * Math.cos(H);
  const Z = Math.acos(Math.max(-1, Math.min(1, cosZ))) / D2R;     // D-5 zenith angle
  const az = mod(Math.atan2(Math.sin(H),                          // D-6, atan2 form
    Math.cos(phi) * Math.tan(dec) - Math.sin(phi) * Math.cos(H)) / D2R, 360);
  return { el: 90 - Z, az, lmst, ltst, ls: c.ls };
}

// ---------------------------------------------------------------------------------------------
// Curiosity (MSL) mission clock.
// Source: NAIF SPICE kernel msl_lmst_ops120808_v1.tsc ("MSL SCLK File Implementing LMST at GC
// Landing Site"), https://naif.jpl.nasa.gov/pub/naif/MSL/kernels/sclk/msl_lmst_ops120808_v1.tsc :
//   midnight LMST of SOL 0 = 397446666.183 ET seconds past J2000 (2012-08-05T13:49:59 UTC),
//   one sol = 88775.244 ET seconds (1.02749125 ET s per local Martian second).
// ET (TDB) is used as TT here; |TDB - TT| < 2 ms.
// The meridian: Mars24 notes, "Lander Mission Times", https://www.giss.nasa.gov/tools/mars24/help/notes.html :
//   MSL sol 0 is the landing sol; the mission clock is LMST for a planned site at 137.42 E, not
//   re-defined for the actual landing site at 137.442 E (about 5 s apart).
const MSL_EPOCH_ET = 397446666.183;
const MSL_SOL_SEC = 88775.244;
export const MSL_CLOCK_LON_E = 137.42;
export const MSL_LANDING = { lat: -4.5895, lon: 137.4417 };  // PDS MSL mission catalog, msl_mission_cat.txt

const pad = (n, w) => String(n).padStart(w, '0');

/** MSL sol, LMST (hours) and the PDS-style label "Sol-05073M14:18:02.833" at a UTC instant. */
export function mslSol(utcMs) {
  const sols = (ttSecondsJ2000(utcMs) - MSL_EPOCH_ET) / MSL_SOL_SEC;
  const sol = Math.floor(sols);
  const lmst = (sols - sol) * 24;
  let lsol = sol, ms = Math.round((sols - sol) * 86400000);  // label rounded to the ms
  if (ms >= 86400000) { lsol += 1; ms -= 86400000; }
  const label = `Sol-${pad(lsol, 5)}M${pad(Math.floor(ms / 3600000), 2)}:`
    + `${pad(Math.floor(ms / 60000) % 60, 2)}:${pad(Math.floor(ms / 1000) % 60, 2)}.${pad(ms % 1000, 3)}`;
  return { sol, lmst, label };
}

/** UTC milliseconds when the MSL clock reads (sol, lmstHours). */
export function mslUtcFor(sol, lmstHours) {
  return utcMsFromTt(MSL_EPOCH_ET + (sol + lmstHours / 24) * MSL_SOL_SEC);
}

// ---------------------------------------------------------------------------------------------
// Sunrise / sunset.
// Default: the Sun's centre on the geometric (ellipsoid) horizon, no refraction or terrain.
// opts.upperLimb: the upper limb instead; solar radius 695700 km (IAU 2015 Resolution B3),
// 1 au = 149597870.7 km (IAU 2012 Resolution B2), distance from Mars24 D-2.
const R_SUN_KM = 695700;
const AU_KM = 149597870.7;

/**
 * Sunrise and sunset during MSL sol `sol` at a site. sunriseLmst/sunsetLmst are MSL mission
 * clock hours (the 137.42 E meridian, same clock as `sol`). Missing events are null.
 */
export function sunEvents(sol, latDeg, lonEastDeg, opts = {}) {
  const f = (t) => {
    const s = sunAt(t, latDeg, lonEastDeg);
    if (!opts.upperLimb) return s.el;
    const r = marsClock(t).sunDistAU * AU_KM;
    return s.el + Math.asin(R_SUN_KM / r) / D2R;
  };
  const t0 = mslUtcFor(sol, 0);
  const t1 = mslUtcFor(sol + 1, 0);
  const N = 96;  // 15 Mars-minute steps, then bisection to < 1 ms
  let rise = null, set = null;
  let ta = t0, fa = f(ta);
  for (let i = 1; i <= N; i++) {
    const tb = t0 + (t1 - t0) * i / N, fb = f(tb);
    if ((fa < 0) !== (fb < 0)) {
      let lo = ta, hi = tb, flo = fa;
      while (hi - lo > 0.5) {
        const m = (lo + hi) / 2, fm = f(m);
        if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
      }
      const t = (lo + hi) / 2;
      if (fa < 0 && rise === null) rise = t;
      if (fa >= 0 && set === null) set = t;
    }
    ta = tb; fa = fb;
  }
  const lm = (t) => (t === null ? null
    : ((ttSecondsJ2000(t) - MSL_EPOCH_ET) / MSL_SOL_SEC - sol) * 24);
  return { sunriseUtcMs: rise, sunsetUtcMs: set, sunriseLmst: lm(rise), sunsetLmst: lm(set) };
}

/** Format decimal hours as HH:MM:SS, truncated to the second like a clock (and like the Mars24 page). */
export function hms(hours) {
  const s = Math.floor(Math.abs(hours) * 3600 + 1e-9);
  return `${hours < 0 ? '-' : ''}${pad(Math.floor(s / 3600), 2)}:${pad(Math.floor(s / 60) % 60, 2)}:${pad(s % 60, 2)}`;
}
