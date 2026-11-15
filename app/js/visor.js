// The suit display: the few numbers the walker reads on the helmet glass, and the tags it pins to the ground.
// Its characters are not a font file. A head-up display writes each character as a handful of straight
// strokes with one pen width, so that is how these are stored: stroke paths on a grid 4 wide and 6 tall.
// The display is one colour, sits up and to the right of the view, and each instrument is written on
// stroke by stroke when the walk first needs it (the layout follows NASA's Joint AR suit display work).
import { SUIT, evaBudgetJ } from './suit.js';
const GLYPH = {
  '0': 'M1 0L3 0L4 1L4 5L3 6L1 6L0 5L0 1Z', '1': 'M1 1.2L2.2 0L2.2 6M1 6L3.4 6', '2': 'M0 1L1 0L3 0L4 1L4 2.2L0 6L4 6',
  '3': 'M0 1L1 0L3 0L4 1L4 2L3 3L1.5 3M3 3L4 4L4 5L3 6L1 6L0 5', '4': 'M3 6L3 0L0 4L4 4', '5': 'M4 0L0 0L0 2.6L3 2.6L4 3.6L4 5L3 6L1 6L0 5',
  '6': 'M4 1L3 0L1 0L0 1L0 5L1 6L3 6L4 5L4 3.6L3 2.6L0 2.6', '7': 'M0 0L4 0L1.5 6', '8': 'M1 0L3 0L4 1L4 2L3 3L1 3L0 2L0 1ZM1 3L0 4L0 5L1 6L3 6L4 5L4 4L3 3',
  '9': 'M0 5L1 6L3 6L4 5L4 1L3 0L1 0L0 1L0 2.4L1 3.4L4 3.4',
  A: 'M0 6L0 2L2 0L4 2L4 6M0 4L4 4', D: 'M0 0L0 6L3 6L4 5L4 1L3 0Z', E: 'M4 0L0 0L0 6L4 6M0 3L3 3', G: 'M4 1L3 0L1 0L0 1L0 5L1 6L3 6L4 5L4 3L2 3',
  H: 'M0 0L0 6M4 0L4 6M0 3L4 3', K: 'M0 0L0 6M4 0L0 3.2L4 6', I: 'M1 0L1 6M0 0L2 0M0 6L2 6', L: 'M0 0L0 6L4 6', M: 'M0 6L0 0L2 3L4 0L4 6', N: 'M0 6L0 0L4 6L4 0',
  O: 'M1 0L3 0L4 1L4 5L3 6L1 6L0 5L0 1Z', R: 'M0 6L0 0L3 0L4 1L4 2L3 3L0 3M2 3L4 6', S: 'M4 1L3 0L1 0L0 1L0 2L1 3L3 3L4 4L4 5L3 6L1 6L0 5',
  T: 'M0 0L4 0M2 0L2 6', W: 'M0 0L0 6L2 3L4 6L4 0', Y: 'M0 0L2 3L4 0M2 3L2 6',
  v: 'M0.4 2.5L2 6L3.6 2.5', 'µ': 'M0 2.5L0 7.4M0 5L1 6L2 6L3.4 4.8M3.4 2.5L3.4 6',
  '%': 'M4 0L0 6M0 0L1.2 0L1.2 1.2L0 1.2ZM2.8 4.8L4 4.8L4 6L2.8 6Z', '°': 'M0.8 0L1.8 0L2.6 0.8L2.6 1.6L1.8 2.4L0.8 2.4L0 1.6L0 0.8Z',
  '+': 'M0.5 3L3.5 3M2 1.5L2 4.5', '−': 'M0.5 3L3.5 3', '.': 'M0.5 5.4L0.5 6', '×': 'M0.8 1.8L3.2 4.2M3.2 1.8L0.8 4.2',
};
const WIDE = { '.': 1, ' ': 1.6, I: 2, '°': 2.6 };
const GAP = 1.5, PAIR = /(-?\d*\.?\d+) (-?\d*\.?\d+)/g;
const r1 = v => Math.round(v * 10) / 10;
// the strokes for a line of characters. Capitals are 6 * s tall. x is the left edge, or the right edge when end is set.
export function stroke(text, x, y, s, end) {
  const parts = []; let w = 0;
  for (const ch of String(text)) { const g = GLYPH[ch]; if (g) parts.push([g, w]); w += (WIDE[ch] ?? 4) + GAP; }
  w = Math.max(0, w - GAP);
  const x0 = end ? x - w * s : x;
  return { d: parts.map(([g, o]) => g.replace(PAIR, (m, a, b) => r1(x0 + (o + +a) * s) + ' ' + r1(y + b * s))).join(''), w: w * s };
}

const ROW = 27, X0 = 27, X1 = 123, NUM = 2.05, UNIT = 1.25;
const P = (cls, d, delay) => `<path class="${cls}" pathLength="1" d="${d}"${delay ? ` style="--d:${delay}s"` : ''}/>`;
const burst = () => { let d = 'M9.4 12L8.7 13.7L7 14.4L5.3 13.7L4.6 12L5.3 10.3L7 9.6L8.7 10.3Z'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); d += `M${r1(7 + c * 4.4)} ${r1(12 + s * 4.4)}L${r1(7 + c * 6.6)} ${r1(12 + s * 6.6)}`; } return d; };
// oxygen: the scale ends at what the suit model burns over the whole planned energy budget
const O2_MAX = evaBudgetJ(SUIT) / 1e6 * SUIT.o2KgPerMJ;
// each instrument: a dim symbol, a thin scale with its marks, a bright fill and a bright number
const ROWS = [
  { id: 'eff', icon: 'M0 12L3.5 12L5.5 6.5L8.5 17.5L10.5 12L14 12', unit: 'W', max: 700, step: 100 },
  { id: 'o2', icon: stroke('O', 0, 7.5, 1.5).d + stroke('2', 8.6, 12.9, 0.85).d, unit: 'KG', max: O2_MAX, step: O2_MAX / 4 },
  { id: 'en', icon: 'M1 8L11 8L11 10.5L13 10.5L13 13.5L11 13.5L11 16L1 16Z', unit: '%', max: 100, step: 25 },
  { id: 'sh', icon: 'M0.5 12.5L7 6.5L13.5 12.5M3 11L3 18L11 18L11 11', unit: 'MIN', max: 20, step: 5 },
  { id: 'rad', icon: 'M7 17.4L7 17.6M3.6 14.4L7 12.8L10.4 14.4M0.6 11L7 8L13.4 11M1 6L13 18', unit: 'M', max: 1, step: 0.25 },
  { id: 'stp', icon: 'M0 17L14 17L14 8Z', unit: '°', max: 25, step: 5, tone: 'amber' },
  { id: 'dose', icon: burst(), unit: 'µSv', tone: 'red' },
];

export class Visor {
  constructor() {
    const el = this.el = document.createElement('div');
    el.className = 'g-vis';
    let h = '';
    for (const R of ROWS) {
      let g = P('dm', R.icon, 0);
      if (R.max) {
        let sc = `M${X0} 12L${X1} 12`;
        for (let v = 0; v <= R.max + 1e-6; v += R.step) { const x = r1(X0 + (X1 - X0) * v / R.max); sc += `M${x} 12L${x} ${v === 0 || v >= R.max ? 16.5 : 14.5}`; }
        g += P('dm', sc, 0.12) + P('mk', '', 0.3) + P('fl', '', 0.35);
      } else if (R.id === 'dose') g += '<path class="bk" d="M-5 1L211 1L211 23L-5 23Z"/>' + P('nm x2', '', 0.2) + P('fr', `M-5 6L-5 1L0 1M206 1L211 1L211 6M211 18L211 23L206 23M0 23L-5 23L-5 18`, 0);
      g += P('nm', '', 0.4) + P('dm', stroke(R.unit, 180, R.unit === '°' ? 12 - 3 * NUM : 12 + 3 * NUM - 6 * UNIT, UNIT).d, 0.55);
      h += `<g class="vi${R.tone ? ' ' + R.tone : ''}" data-i="${R.id}">${g}</g>`;
    }
    el.innerHTML = `<i></i><svg viewBox="-10 -4 226 ${ROW * 4 + 6}" aria-hidden="true">${h}</svg>`;
    this.rows = {};
    for (const R of ROWS) {
      const g = el.querySelector(`[data-i=${R.id}]`);
      this.rows[R.id] = { R, g, on: false, num: g.querySelector('.nm:not(.x2)'), fill: g.querySelector('.fl'), mark: g.querySelector('.mk'), x2: g.querySelector('.x2'), text: null, f: -1, m: -1, y: 0 };
    }
    // the tag the display pins to a point on the ground
    const t = this.tagEl = document.createElement('div');
    t.className = 'g-gt';
    t.innerHTML = '<svg aria-hidden="true"><path class="ld" pathLength="1"/><g><path class="bx" pathLength="1" style="--d:.15s"/><path class="tx" pathLength="1" style="--d:.3s"/><path class="nm" pathLength="1" style="--d:.5s"/></g></svg>';
    this.tagText = null;
    this.sx = 0; this.sy = 0; this.yaw = null; this.pitch = 0; this.bob = 0; this.wr = [];
  }
  // write an element on, stroke by stroke
  write(g) {
    g.classList.remove('w'); void g.getBoundingClientRect(); g.classList.add('w');
    this.wr = this.wr.filter(q => q.g !== g); this.wr.push({ g, t: 1.7 });
  }
  show(id, on) {
    const r = this.rows[id]; if (!r || r.on === !!on) return;
    r.on = !!on;
    r.g.classList.toggle('on', r.on);
    if (!r.on) r.placed = false;
    this.layout();
    if (r.on) this.write(r.g);
  }
  // the instruments stack in a fixed order, and close up when one leaves
  layout() {
    let y = 0;
    for (const R of ROWS) { const r = this.rows[R.id]; if (!r.on) continue; if (r.y !== y || !r.placed) {
        // a new instrument appears in its place. One that is already up slides to close a gap.
        const fresh = !r.placed; r.y = y; r.placed = true;
        if (fresh) r.g.style.transition = 'none';
        r.g.style.transform = `translate(0px, ${y}px)`;
        if (fresh) { void r.g.getBoundingClientRect(); r.g.style.transition = ''; }
      } y += ROW + (R.id === 'sh' ? 3 : 0); }
  }
  // text: the number as shown. frac: how far along the scale. mark: a fixed mark on the scale (a limit or a forecast).
  val(id, text, frac, mark) {
    const r = this.rows[id]; if (!r) return;
    text = String(text);
    if (text !== r.text) { r.text = text; r.num.setAttribute('d', stroke(text, 175, 12 - 3 * NUM, NUM, true).d); }
    if (r.fill && frac !== undefined) {
      const f = Math.round(Math.min(1, Math.max(0, frac)) * 960) / 960;
      if (f !== r.f) { r.f = f; r.fill.setAttribute('d', `M${X0} 12L${r1(X0 + (X1 - X0) * Math.max(0.004, f))} 12`); }
    }
    if (r.mark && mark !== undefined && mark.at !== r.m) {
      r.m = mark.at;
      const x = r1(X0 + (X1 - X0) * Math.min(1, Math.max(0, mark.at)));
      r.mark.setAttribute('d', mark.under ? `M${x - 3} 20.5L${x} 16.5L${x + 3} 20.5` : `M${x} 12L${x} 4.5M${x - 2.5} 4.5L${x + 2.5} 4.5`);
    }
  }
  extra(id, text) { const r = this.rows[id]; if (r?.x2 && r.xt !== text) { r.xt = text; r.x2.setAttribute('d', stroke(text, X0 + 2, 12 - 3 * NUM, NUM).d); } }
  tone(id, cls, on) { this.rows[id]?.g.classList.toggle(cls, !!on); }
  // word and value for the ground tag, or null to take it away. On a narrow screen the words hang below the mark.
  tag(word, value, below) {
    const key = word ? word + '|' + (value || '') + '|' + (below ? 1 : 0) : null;
    if (key === this.tagText) return;
    this.tagText = key;
    const t = this.tagEl;
    if (!key) { t.classList.remove('on'); return; }
    const S = 1.7, a = stroke(word, 0, 0, S), b = value ? stroke(value, 0, 0, S) : { w: 0 }, gap = value ? 9 : 0, w = a.w + gap + b.w, pad = 9, hgt = 6 * S;
    const q = t.querySelectorAll('path'), W = w + pad * 2, H = hgt + pad * 2;
    // a mark on the ground, a short leader, and the words in a corner frame clear of the astronaut
    const l = below ? 0 : 22, tp = below ? 17 : -40 - H, rr = l + W, bt = tp + H, c = 6;
    q[0].setAttribute('d', (below ? 'M0 3.6L0 17' : 'M2.6 -3.4L22 -40') + 'M-3.5 0L0 -3.5L3.5 0L0 3.5Z');
    q[1].setAttribute('d', `M${r1(l)} ${tp + c}L${r1(l)} ${tp}L${r1(l + c)} ${tp}M${r1(rr - c)} ${tp}L${r1(rr)} ${tp}L${r1(rr)} ${tp + c}M${r1(rr)} ${bt - c}L${r1(rr)} ${bt}L${r1(rr - c)} ${bt}M${r1(l + c)} ${bt}L${r1(l)} ${bt}L${r1(l)} ${bt - c}`);
    q[2].setAttribute('d', stroke(word, l + pad, tp + pad, S).d);
    q[3].setAttribute('d', value ? stroke(value, l + pad + a.w + gap, tp + pad, S).d : '');
    this.tagW = W; this.tagBelow = !!below; this.tagDx = null;
    t.style.setProperty('--w', W.toFixed(0) + 'px'); t.style.setProperty('--by', (tp + H / 2).toFixed(0) + 'px'); t.style.setProperty('--bx', l.toFixed(0) + 'px');
    t.classList.add('on');
    this.write(t);
  }
  // room: the clear width to the right of the mark. The frame slides left to stay on the screen.
  tagAt(x, y, room) {
    this.tagEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const dx = this.tagBelow ? Math.round(Math.max(-this.tagW + 14, Math.min(-this.tagW * 0.3, room - this.tagW))) : 0;
    if (dx !== this.tagDx) { this.tagDx = dx; this.tagEl.style.setProperty('--dx', dx + 'px'); }
  }
  // a short break-up of the picture, for the moment the storm alarm trips
  jolt() { const e = this.el; e.classList.remove('jolt'); void e.offsetWidth; e.classList.add('jolt'); }
  reset() {
    for (const id in this.rows) { const r = this.rows[id]; r.on = false; r.placed = false; r.g.classList.remove('on', 'w', 'warn'); }
    this.tag(null); this.el.classList.remove('jolt'); this.wr = []; this.yaw = null; this.sx = this.sy = 0;
    this.el.style.transform = '';
  }
  // the glass rides on the helmet: it trails a turn of the head by a few pixels and settles, and bobs with each step
  tick(dt, yaw, pitch, walk) {
    if (this.wr.length) { for (const q of this.wr) { q.t -= dt; if (q.t <= 0) q.g.classList.remove('w'); } this.wr = this.wr.filter(q => q.t > 0); }
    if (this.yaw === null) { this.yaw = yaw; this.pitch = pitch; }
    let dy = yaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const dp = pitch - this.pitch;
    this.yaw = yaw; this.pitch = pitch;
    const k = 1 / Math.max(dt, 1e-3);
    const tx = Math.max(-16, Math.min(16, dy * k * 26)), ty = Math.max(-12, Math.min(12, dp * k * 26));
    const e = 1 - Math.exp(-dt * 7);
    this.sx += (tx - this.sx) * e; this.sy += (ty - this.sy) * e;
    this.bob += dt * 5.6 * walk;
    const by = Math.sin(this.bob * 2) * 1.1 * walk, bx = Math.sin(this.bob) * 0.7 * walk;
    this.el.style.transform = `translate(${(this.sx + bx).toFixed(2)}px, ${(this.sy + by).toFixed(2)}px)`;
  }
}
