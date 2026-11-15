// Demo film: a 30 s scripted run of the live app for the Space Apps video.
// Titles to 6.6 s, plan layers to 13.2, the walk to 19.8, a stop's photos to 23.6,
// the SEP drill to 26.4, then the closing card.
// Load with ?film. The capture tool calls __film.step(1/30) once per frame and
// screenshots the page, so every frame is deterministic.
import * as THREE from '../vendor/three.module.min.js';
import { fmtDur } from './ui.js';

const ease = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export class Film {
  constructor(app, tick) {
    this.app = app; this.tick = tick; this.t = 0; this.duration = 30;
    this.fired = new Set();
    const root = document.createElement('div');
    root.id = 'film';
    root.innerHTML = `
      <div class="veil"></div>
      <div class="card c1"><div class="k">NASA Space Apps Challenge 2026</div><div class="big">TRANSCENDIANT LABS</div><div class="who">David Castro</div></div>
      <div class="card c2"><div class="k">Challenge</div><div class="mid">Interplanetary Survival Guide:<br>Martian Map</div></div>
      <div class="card c3"><div class="big wide">MARCHER</div><div class="tag">Plan a walk on Mars at Curiosity's boxwork. Then walk it.</div></div>
      <div class="cap"></div>
      <div class="card c4"><div class="k">Next</div><div class="mid small">Any HiRISE stereo site on Mars<br>Live suit telemetry on the visor<br>Two-person EVAs with a crew rover in reserve</div><div class="sig">MARCHER · Transcendiant Labs</div></div>`;
    document.body.appendChild(root);
    const css = document.createElement('style');
    css.textContent = `
      #film { position: fixed; inset: 0; pointer-events: none; z-index: 50; font-family: var(--name); }
      #film .veil { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(8,6,5,.35), rgba(8,6,5,.88)); opacity: 0; }
      #film .card { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; opacity: 0; }
      #film .k { font: 500 15px var(--name); letter-spacing: .32em; text-transform: uppercase; color: var(--sun); }
      #film .big { font: 600 64px var(--name); letter-spacing: .34em; margin-top: 16px; padding-left: .34em; }
      #film .big.wide { font-size: 88px; letter-spacing: .5em; padding-left: .5em; }
      #film .who { font: 300 24px var(--name); color: var(--dim); margin-top: 18px; letter-spacing: .06em; }
      #film .mid { font: 500 46px/1.25 var(--name); margin-top: 16px; }
      #film .mid.small { font-size: 34px; line-height: 1.5; font-weight: 400; }
      #film .tag { font: 300 28px var(--name); color: var(--text); margin-top: 22px; letter-spacing: .02em; }
      #film .sig { font: 600 14px var(--name); letter-spacing: .4em; color: var(--dim); margin-top: 40px; }
      #film .cap { position: absolute; left: 50%; bottom: 210px; transform: translateX(-50%); font: 500 26px var(--name); padding: 12px 26px 11px; border-radius: 12px; background: rgba(12,10,9,.72); border: 1px solid var(--line-strong); white-space: nowrap; opacity: 0; }
      #film .cap b { color: var(--sun); font-weight: 600; }
    `;
    document.head.appendChild(css);
    this.el = root;
    this.q = (s) => root.querySelector(s);
    // the app's own chrome fades with the film clock, so every capture is the same
    this.ui = document.getElementById('ui'); this.ui.style.opacity = 0;
    // where the camera sits at the start of the plan sequence
    const st = app.stops;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of st) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); }
    this.c = new THREE.Vector3((x0 + x1) / 2, app.heightAt((x0 + x1) / 2, (z0 + z1) / 2), (z0 + z1) / 2);
    this.r = Math.max(x1 - x0, z1 - z0) / 2;
    this.preload();
    app.state.cursorLmst = 9.0; app.updateTime();
  }

  // fetch every 1 m tile the walk will touch, so no frame waits on the network
  async preload() {
    const a = this.app, s = a.site, T = s.dem_1m.tile_m, keys = new Set();
    const tr = a.state.sched.track;
    for (let i = 0; i < tr.length; i += 5) {
      const ci = Math.floor((tr[i] + s.half) / T), cj = Math.floor((tr[i + 2] + s.half) / T);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) keys.add(`${cj + dj},${ci + di}`);
    }
    // and the photos hung at the stop the film visits
    const hang = a.povImages(a.stops[3]).filter(i => i.rec.kind !== 'fhaz');
    const photos = hang.map(i => a.bubbles.loader.loadAsync(a.site.base + 'pov/' + i.rec.file).then(tex => { tex.colorSpace = THREE.SRGBColorSpace; a.bubbles.cache.set(i.rec.file, tex); }).catch(() => null));
    await Promise.all(photos);
    await a.preloadLayers();
    await Promise.all([...keys].map(k => { const [j, i] = k.split(',').map(Number); return (j >= 0 && i >= 0 && j < 8 && i < 8) ? a.terrain.loadTile(j, i) : null; }));
    this.ready = true;
  }

  once(id, fn) { if (!this.fired.has(id)) { this.fired.add(id); fn(); } }
  fade(sel, t, a, b, fi = 0.5, fo = 0.5) {
    const el = this.q(sel); if (!el) return;
    let o = 0;
    if (t >= a && t <= b) o = Math.min(ease((t - a) / fi), ease((b - t) / fo));
    el.style.opacity = o.toFixed(3);
  }
  caption(t) {
    const st = this.app.state, v = st.verdict || { level: 'go', cautions: [], issues: [] };
    // the verdict line says what the app itself decided for this plan
    const why = v.level === 'go' ? '' : (v.issues[0] || v.cautions[0] || '').replace(/^no radio line of sight to the crew rover at stops? ([\d, ]+).*$/, 'no radio link at stop $1');
    const verdict = `Sun, REMS weather, DONKI space weather, radio: <b>${v.level === 'nogo' ? 'NO-GO' : v.level.toUpperCase()}</b>${why ? ', ' + why : ''}`;
    const back = st.abort ? `, <b>${fmtDur(st.abort.total)}</b>` : '';
    const caps = [
      [6.6, 8.3, 'Boxwork ridges and hollows, mapped from 1 m HiRISE terrain'],
      [8.3, 10.0, 'Route kept under the <b>20°</b> slope limit, with minutes to walk back'],
      [10.0, 11.7, 'CRISM hydrated sulfates guide where to sample'],
      [11.7, 13.4, verdict],
      [15.6, 19.4, `Curiosity: <b>${v.solsCur ?? 267} sols</b> from Altadena to Timboy Chaco. On foot: <b>${fmtDur(st.sched.total)}</b>`],
      [20.0, 23.4, 'Curiosity’s own photos, hung where its cameras took them'],
      [23.8, 26.3, `Solar particle drill: the fastest line back to the crew rover${back}`],
    ];
    const el = this.q('.cap');
    el.style.bottom = st.mode === 'plan' ? '244px' : '210px';   // clear of the Plan / Walk switch
    const c = caps.find(([a, b]) => t >= a && t < b);
    if (c) { if (this.capText !== c[2]) { this.capText = c[2]; el.innerHTML = c[2]; } el.style.opacity = Math.min(ease((t - c[0]) / 0.3), ease((c[1] - t) / 0.3)).toFixed(3); }
    else el.style.opacity = 0;
  }

  step(dt = 1 / 30) {
    const a = this.app, t = this.t, st = a.state;
    // ---- titles ----
    this.fade('.veil', t, -1, 7.0, 0.01, 1.4);
    this.fade('.c1', t, 0.15, 2.0, 0.4, 0.35);
    this.fade('.c2', t, 2.1, 4.0, 0.35, 0.35);
    this.fade('.c3', t, 4.1, 6.6, 0.4, 0.6);
    this.fade('.c4', t, 26.6, 31, 0.6, 0.1);
    if (t > 26.4) this.q('.veil').style.opacity = ease((t - 26.4) / 0.8).toFixed(3);
    this.caption(t);
    a.ribbon.mesh.visible = t >= 6.0;
    const uo = Math.min(ease((t - 6.2) / 0.8), 1 - ease((t - 26.3) / 0.8));
    this.ui.style.opacity = uo >= 1 ? '' : uo.toFixed(3);

    // ---- plan camera: wide to EVA frame ----
    if (st.mode === 'plan') {
      const keys = [
        [0, { d: 3300, az: -0.75, pol: 0.62 }],
        [3.8, { d: 2300, az: -0.05, pol: 0.74 }],
        [6.6, { d: Math.max(1000, this.r * 4.2), az: 0.5, pol: 0.9 }],
        [13.2, { d: Math.max(1000, this.r * 4.0), az: 0.66, pol: 0.88 }],
      ];
      let k = 0; while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
      const [ta, A] = keys[k], [tb, B] = keys[k + 1];
      const u = ease((t - ta) / (tb - ta));
      a.table.goal.target.copy(this.c); a.table.cur.target.copy(this.c);
      a.table.goal.dist = a.table.cur.dist = lerp(A.d, B.d, u);
      a.table.goal.az = a.table.cur.az = lerp(A.az, B.az, u);
      a.table.goal.pol = a.table.cur.pol = lerp(A.pol, B.pol, u);
    }
    // ---- layers ----
    const L = (id, on) => { const l = a.LAYERS.find(x => x.id === id); if (l.on !== on) { l.on = on; a.applyLayer(l); a.ui.setLayers(a.LAYERS); } };
    if (t >= 6.6) this.once('l1', () => L('relief', true));
    if (t >= 8.3) this.once('l2', () => { L('relief', false); L('back', true); });
    if (t >= 10.0) this.once('l3', () => { L('back', false); L('min', true); });
    if (t >= 11.7) this.once('l4', () => L('min', false));
    // sweep the Sun across the EVA window so the shadows move
    if (t >= 11.7 && t < 13.2) { st.cursorLmst = lerp(9.0, 16.5, ease((t - 11.7) / 1.5)); a.updateTime(); }

    // ---- walk ----
    const ev = st.sched.events;
    const legTo = 3;                      // the leg into stop 3 (Río Frío wall)
    const dep = ev[legTo - 2].depart, arr = ev[legTo - 1].arrive;
    if (t >= 13.2) this.once('walk', () => { a.setMode('walk'); st.walkT = dep + 30; st.walkRate = 0; st.cam = 'follow'; });
    if (st.mode === 'walk') {
      if (t < 19.8) st.walkT = lerp(dep + 30, arr - 1, ease((t - 14.6) / 5.2) * (t > 14.6 ? 1 : 0));
      else if (t < 23.6) {
        this.once('arrive', () => { st.walkT = arr + 2; st.cam = 'auto'; });
        st.walkT = arr + 2 + (t - 19.8) * 2;
        // look around Curiosity's photo ring: a slow pan to the right
        if (t > 20.4) {
          if (this.yaw0 === undefined) this.yaw0 = a.walk.yaw;
          a.walk.yaw = this.yaw0 - 1.15 * ease((t - 20.6) / 2.8);
          st.holdLookUntil = 1e9;
        }
      } else {
        // SEP drill: the app's own abort route back to the rover, seen from behind
        this.once('drill', () => { st.holdLookUntil = 0; st.cam = 'follow'; this.wait = a.toggleDrill().then(() => { st.walkRate = 90; this.wait = null; }); });
      }
    }
    this.tick(dt);
    this.t += dt;
    return this.t < this.duration;
  }
}
