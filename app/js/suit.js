// Suited walking model for Mars: speed, metabolic power and oxygen versus slope.
// Sources and quotes for every number: research/human_factors.md.

export const MARS_G = 3.71;   // m/s^2, value used by the challenge (NASA fact sheet: 3.73 mean, 3.69 equatorial)

export const SUIT = {
  // Masses from Ogilvie et al., "Mars Spacesuit Mass Requirements", ICES-2026-127 (NASA JSC).
  // Putting the three together is our assumption: the paper derives its 104 kg suit maximum
  // for a 49 kg crew member, so an 82 kg wearer in that suit is the heavy case.
  crewKg: 82,            // average male crew member (ICES-2026-127)
  suitKg: 104,           // proposed Mars suit maximum mass (ICES-2026-127)
  loadKg: 22.7,          // carried tools and samples, 50 lbm (ICES-2026-127)
  // EVA-EXP-0075 (Coan 2020) is written for Artemis lunar EVAs. No NASA figure for walking on
  // Mars in a suit is published, so its planning values are used here as the nearest ones.
  paceMs: 0.56,          // planning pace on level ground, ~2 km/h (EVA-EXP-0075)
  maxW: 615,             // top of the nominal suited metabolic range, 2100 BTU/hr (NASA-STD-3001 Vol 2 Rev F [V2 11011])
  planW: 352,            // average metabolic rate for exploration suit sizing, 1200 BTU/hr (ICES-2026-127)
  stationW: 272,         // Apollo lunar surface EVA average, 234 kcal/h (Waligora & Horrigan, NASA SP-368)
  evaHours: 8,           // maximum EVA length, 6 +/- 2 h (EVA-EXP-0075)
  o2KgPerMJ: 0.071,      // derived from NASA BVAD Table 4-76: 0.075 kg O2/h at 293 W
  walkRangeM: 2000,      // walking EVA range from the vehicle (EVA-EXP-0075)
  maxGradeDeg: 20,       // walking on terrain of up to a 20 deg slope (EVA-EXP-0075)
  maxCellSlopeDeg: 20,
  maxStepDeg: 30,        // our rule: a 1 m step steeper than 30 deg (0.6 m rise) is a wall (short ridges the 2 m grid smooths)
  sideFreeDeg: 8,        // our footing penalty: side slope beyond 8 deg costs +4 % per degree
  sidePenalty: 0.04,
  doseMSvPerDay: 0.64,   // Gale surface dose equivalent, MSL RAD (Hassler et al. 2014, Science 343)
};
export const massKg = (s = SUIT) => s.crewKg + s.suitKg + s.loadKg;

// Speed vs slope from Apollo 14 data (Marquez, used in Johnson 2010, the MIT SEXTANT planner),
// capped at the planning pace because the lunar speeds give metabolic rates above the nominal
// suited range at Mars mass.
export function marquezSpeed(aDeg) {
  let v;
  if (aDeg >= 15 || aDeg <= -20) v = 0.05;
  else if (aDeg < -10) v = 0.095 * aDeg + 1.95;
  else if (aDeg < 0) v = 0.06 * aDeg + 1.6;
  else if (aDeg < 6) v = -0.2 * aDeg + 1.6;
  else v = -0.039 * aDeg + 0.634;
  return v;
}

// Metabolic rate (W): the Santee et al. 2001 load carriage model (measured unsuited at 1 g),
// scaled by mass and gravity as implemented in SEXTANT (Johnson 2010, Table 3.2)
export function metabolicW(v, aDeg, s = SUIT, g = MARS_G) {
  const m = massKg(s), a = aDeg * Math.PI / 180;
  const level = (3.28 * m + 71.1) * (0.661 * v * Math.cos(a) + 0.115);
  let slope = 0;
  if (aDeg > 0) slope = 3.5 * m * g * v * Math.sin(a);
  else if (aDeg < 0) slope = 2.4 * m * g * v * Math.sin(a) * Math.pow(0.3, Math.abs(aDeg) / 7.65);
  return level + slope;
}

// Walking speed at a slope: Marquez, capped at the planning pace, slowed until inside the nominal range
export function speedAt(aDeg, s = SUIT) {
  let v = Math.min(marquezSpeed(aDeg), s.paceMs);
  for (let k = 0; k < 40 && metabolicW(v, aDeg, s) > s.maxW && v > 0.05; k++) v *= 0.95;
  return Math.max(v, 0.05);
}

// Tables for the route worker: grade (rise/run) -> J per metre and s per metre walked
export function routeModel(s = SUIT) {
  const grades = [], jPerM = [], sPerM = [];
  for (let d = -40; d <= 40; d += 0.5) {
    const v = speedAt(d, s);
    grades.push(Math.tan(d * Math.PI / 180));
    jPerM.push(metabolicW(v, d, s) / v);
    sPerM.push(1 / v);
  }
  return {
    grades: new Float32Array(grades), jPerM: new Float32Array(jPerM), sPerM: new Float32Array(sPerM),
    maxGrade: Math.tan(s.maxGradeDeg * Math.PI / 180), maxCellSlope: s.maxCellSlopeDeg, maxStep: s.maxStepDeg,
    sideFree: s.sideFreeDeg, sidePenalty: s.sidePenalty,
  };
}

// 8 h EVA budget at the 1200 BTU/hr sizing average, in joules
export const evaBudgetJ = (s = SUIT) => s.evaHours * 3600 * s.planW;
export const restPower = (s = SUIT) => s.stationW;
