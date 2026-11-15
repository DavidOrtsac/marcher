// The title screen and the Mission.
// The Mission is a game. One button walks the planned route, from the rover to every site and home
// again: press it to start walking and press it again to stop. The same button is held to take a
// sample and to confirm the drill. Mission Control opens from the list of places and from the end screen.
// Every word comes from mission_copy.js. Each line there has two channels: "say" is spoken by the
// voice track (voice.js) and "show" is the on-screen text. A few lines are spoken only.
// Every number is filled from the live plan, and a line whose number is missing is not shown.
import COPY from './mission_copy.js';
import { parkingSpot } from './rover.js';
import { Voice } from './voice.js';
import { Visor, stroke } from './visor.js';
import { SUIT, evaBudgetJ, metabolicW } from './suit.js';

const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = u => { u = clamp(u, 0, 1); return u * u * u * (u * (6 * u - 15) + 10); };
const MARS_HOUR_S = 88775.244 / 24;
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const CANCEL = Symbol('cancel');
const HOLD = new Set(['Space', 'Enter', 'KeyW', 'ArrowUp']);
const EAT = new Set(['KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ShiftLeft', 'ShiftRight']);
// Lines whose on-screen text states a count, an order or a distance that is only true for the
// plan the app opens with. If the plan has been changed in Mission Control they are left out.
const FIXED = new Set(['intro:2', 'site1_arrive:0', 'site3_done:0', 'site4_arrive:1', 'site4_done:0', 'site5_arrive:1', 'site5_done:0', 'site6_done:0', 'home:0']);
const clock = h => { const m = Math.round(((h % 24) + 24) % 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const hm = s => { const m = Math.round(s / 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };

// distance walked (m), energy spent (J) and position at EVA time t. The track is x, y, z, t, e per sample.
function along(sc, t) {
  const tr = sc.track; let lo = 0, hi = tr.length / 5 - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m * 5 + 3] <= t) lo = m; else hi = m; }
  const t0 = tr[lo * 5 + 3], t1 = tr[hi * 5 + 3], u = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 0;
  const x = lerp(tr[lo * 5], tr[hi * 5], u), z = lerp(tr[lo * 5 + 2], tr[hi * 5 + 2], u);
  return { x, z, d: sc.cum[lo] + Math.hypot(x - tr[lo * 5], z - tr[lo * 5 + 2]), e: lerp(tr[lo * 5 + 4], tr[hi * 5 + 4], u) };
}

// one Curiosity photo per stop (file names from data/pov/index.json)
const NAME_LONG = 'Mars Mission Activity, Route, Consumables, Hazard and EVA Resource planner';
// the name spelled out, with the seven letters it is made of picked out
const NAME_HTML = '<b>M</b>ars Mission <b>A</b>ctivity, <b>R</b>oute, <b>C</b>onsumables, <b>H</b>azard &amp; <b>E</b>VA <b>R</b>esource planner';
const PHOTO = {
  s1: 'NLB_805065572EDR_S1171122NCAM00296M', // the layered ridge wall
  s2: 'NLB_807464450EDR_F1180198NCAM00280M', // Curiosity's own wheel tracks across the ridges
  s3: 'NLB_809061434EDR_S1181752NCAM00256M', // the ridge wall
  s4: 'NRB_812613687EDR_F1190846NCAM00200M', // the arm on the hollow's bedrock
  s5: 'NLB_815715641EDR_F1200082NCAM00265M',      // the drill hole in the ridge
  s6: 'NLB_826010375EDR_F1202366NCAM00255M', // the eastern edge
};
const SIGNAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="18" r="1.6"/><path d="M7.8 14.2a6 6 0 0 1 8.4 0"/><path d="M4.6 11a10.5 10.5 0 0 1 14.8 0"/><path class="cut" d="M4 4l16 16"/></svg>';
const RING = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="r0" cx="50" cy="50" r="46"/><circle class="r1" cx="50" cy="50" r="46" pathLength="100"/></svg>';
const SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.6h3.2l4.6-3.9v12.6l-4.6-3.9H4z"/><path class="w" d="M15.4 9.2a4 4 0 0 1 0 5.6"/><path class="w" d="M17.9 6.6a7.6 7.6 0 0 1 0 10.8"/><path class="cut" d="M4 4l16 16"/></svg>';
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.6 12s3.4-6 9.4-6 9.4 6 9.4 6-3.4 6-9.4 6-9.4-6-9.4-6z"/><circle cx="12" cy="12" r="2.7"/></svg>';
// the walk plays at the planned pace. The speed chip steps through these multiples of it.
// While a line is being said the walk is always at the planned pace, so it is heard at the place it talks about.
const SPEEDS = [1, 5, 15, 30];
const LIST = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
const FWD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5v11l7-5.5zM12.5 6.5v11l7-5.5z"/></svg>';
// the leg lengths (m) the spoken lines were written for. The voice is used only on this route.
const VOICED_LEGS = [249, 220, 81, 191, 55, 112, 501];

export class Story {
  constructor() {
    this.app = null; this.where = null; this.phase = null; this.cam = null;
    this.off = { x: 0, y: 0 }; this.offTo = { x: 0, y: 0 };
    this.gen = 0; this.waiters = []; this.held = false; this.lock = false; this.skipOk = false;
    this.q = []; this.cur = null; this.v = 0; this.far = 0; this.farK = 1.3; this.orbit = 0; this.eye = false; this.look = null; this.dipOn = false;
    this.sel = 0; this.target = null; this.samples = 0; this.vars = {}; this.radio = null;
    this.go = false; this.walking = false; this.spd = 0; this.fp = false; this.sec = 0; this.jumpOpen = false; this.jumpSel = 0;
    this.voice = new Voice(); this.voiceOk = false;
    this.build();
  }
  build() {
    const t = this.title = document.createElement('div');
    t.id = 'title';
    t.innerHTML = `<div class="tin"><h1>MARCHER</h1><p class="g-tag" aria-label="${esc(NAME_LONG)}">${NAME_HTML}</p>
      <nav class="g-menu wait"><button data-go="story" disabled>${esc(COPY.menu_mission)}</button><button data-go="control" class="plain" disabled>${esc(COPY.menu_control)}</button></nav></div>
      <div class="g-for"><p class="g-by">by Transcendiant Labs</p><i></i><p class="g-fr"><span>for</span><img src="img/space_apps_logo.svg" alt="NASA Space Apps Challenge" width="561" height="221"></p></div>`;
    const s = this.el = document.createElement('div');
    s.id = 'story';
    const L = COPY.end_labels;
    s.innerHTML = `<div class="g-alarm"></div>
      <div class="g-top"><button class="g-nav" aria-label="Jump to a place" aria-expanded="false">${LIST}</button><span class="g-clock"></span><div class="g-trail"><i class="g-fill"></i><div class="g-pts"></div></div><span class="g-sig">${SIGNAL}</span><button class="g-snd" aria-label="Voice" aria-pressed="true">${SOUND}</button></div>
      <div class="g-way"><i></i><b></b><span><svg aria-hidden="true"><path/></svg></span></div>
      <div class="g-photo"><i></i><b></b></div>
      <div class="g-toast"></div>
      <div class="g-drill">${esc(COPY.drill_tag)}</div>
      <div class="g-obj"><h4>${esc(COPY.objectives_heading)}</h4><ol></ol></div>
      <div class="g-sub"></div>
      <div class="g-hint"></div>
      <button class="g-act" aria-label="">${RING}<span></span><i class="g-dn" aria-hidden="true"></i></button>
      <button class="g-opt g-spd" aria-label="Walking speed"><b></b>${FWD}</button>
      <button class="g-opt g-view" aria-label="First person view" aria-pressed="false">${EYE}</button>
      <div class="g-scrim"></div>
      <nav class="g-jump" aria-label="Jump to a place"></nav>
      <i class="g-bar t"></i><i class="g-bar b"></i>
      <div class="g-black"></div>
      <div class="g-open"></div>
      <div class="g-end"><h2>${esc(COPY.end_heading)}</h2>
        <div class="g-nums"><div><b data-n="samples"></b><span>${esc(L.samples)}</span></div><div><b data-n="distance"></b><span>${esc(L.distance)}</span></div><div><b data-n="outside"></b><span>${esc(L.outside)}</span></div><div><b data-n="daylight"></b><span>${esc(L.daylight)}</span></div></div>
        <p class="g-line"></p>
        <nav class="g-menu"><button data-go="control">${esc(COPY.end_control)}</button><button data-go="again">${esc(COPY.end_replay)}</button></nav></div>`;
    document.body.append(t, s);
    const q = c => s.querySelector(c);
    this.ui = { top: q('.g-top'), clock: q('.g-clock'), trail: q('.g-trail'), pts: q('.g-pts'), sig: q('.g-sig'), way: q('.g-way'), photo: q('.g-photo'), toast: q('.g-toast'), obj: q('.g-obj ol'),
      sub: q('.g-sub'), hint: q('.g-hint'), act: q('.g-act'), black: q('.g-black'), open: q('.g-open'), end: q('.g-end'), ring: q('.g-act .r1'), word: q('.g-act span'),
      snd: q('.g-snd'), spd: q('.g-spd'), view: q('.g-view'), nav: q('.g-nav'), jump: q('.g-jump'), scrim: q('.g-scrim') };
    // the suit display: instruments on the helmet glass and tags pinned to the ground (visor.js)
    this.vis = new Visor(); this.gl = { lRelief: 0, lMin: 0 }; this.ground = null; this.flag = {};
    this.ui.way.after(this.vis.el, this.vis.tagEl);
    // the three small switches: voice, walking speed, first person
    for (const [b, fn] of [[this.ui.snd, () => this.setSound(this.voice.muted)], [this.ui.spd, () => this.setSpeed(this.spd + 1)], [this.ui.view, () => this.setView(!this.fp)],
      [this.ui.nav, () => this.setJump(!this.jumpOpen)]]) {
      b.addEventListener('click', () => { b.blur(); this.voice.unlock(); fn(); });
    }
    this.setSpeed(0); this.setView(false); this.setSound(!this.voice.muted);
    // the slide-out list of places: a tap on one jumps the walk there
    this.ui.scrim.addEventListener('pointerdown', () => this.setJump(false));
    this.ui.jump.addEventListener('click', e => { const b = e.target.closest('button'); if (b?.dataset.go === 'control') this.toControl(); else if (b?.dataset.k !== undefined) this.start(+b.dataset.k); });
    // menus: the title and the end screen. Hover or arrow keys choose, a click or Enter goes.
    for (const nav of [t.querySelector('.g-menu'), q('.g-end .g-menu')]) {
      const bs = [...nav.children];
      bs.forEach((b, i) => {
        b.addEventListener('pointerenter', () => this.select(i));
        b.addEventListener('click', () => { b.blur(); this.choose(b.dataset.go); });
      });
    }
    this.ui.pts.addEventListener('click', e => { const k = e.target.closest('button')?.dataset.k; if (k !== undefined) this.start(+k + 1); });
    this.ui.sub.addEventListener('pointerdown', () => { if (this.skipOk) this.subSkip(); });
    // the one button: hold it to walk, to sample, to confirm
    const act = this.ui.act;
    act.addEventListener('pointerdown', e => { e.preventDefault(); try { act.setPointerCapture(e.pointerId); } catch { /* not capturable */ } this.down(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) act.addEventListener(ev, () => this.up());
    act.addEventListener('contextmenu', e => e.preventDefault());
    // keys are taken before the planner's walk controls can see them
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || !this.app) return;
      const menu = this.where === 'title' || (this.where === 'story' && this.phase === 'end');
      if (menu) {
        const step = e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : e.code === 'ArrowUp' || e.code === 'ArrowLeft' ? -1 : 0;
        const go = e.code === 'Enter' || e.code === 'Space';
        if (!step && !go) return;
        e.preventDefault(); e.stopPropagation();
        if (step) this.select(this.sel + step);
        else if (!e.repeat) this.choose(this.menu()[this.sel]?.dataset.go);
        return;
      }
      if (this.where !== 'story') return;
      if (this.jumpOpen) {
        e.preventDefault(); e.stopPropagation();
        const nb = this.ui.jump.children.length, step = e.code === 'ArrowDown' ? 1 : e.code === 'ArrowUp' ? -1 : 0;
        if (e.code === 'Escape' || e.code === 'KeyJ') this.setJump(false);
        else if (step && nb) { this.jumpSel = (this.jumpSel + step + nb) % nb; this.paintJump(); }
        else if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { if (this.ui.jump.children[this.jumpSel]?.dataset.go === 'control') this.toControl(); else this.start(this.jumpSel); }
        return;
      }
      if (e.code === 'Escape') { e.preventDefault(); this.showTitle(); return; }
      if (HOLD.has(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) this.down(); }
      else if (e.code === 'KeyV' || e.code === 'KeyF' || e.code === 'KeyM' || e.code === 'KeyJ') {
        e.preventDefault(); e.stopPropagation();
        if (e.repeat || !this.el.classList.contains('g-hud')) return;
        this.voice.unlock();
        if (e.code === 'KeyV') this.setView(!this.fp); else if (e.code === 'KeyF') this.setSpeed(this.spd + 1); else if (e.code === 'KeyJ') this.setJump(true); else this.setSound(this.voice.muted);
      }
      else if (EAT.has(e.code)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    addEventListener('keyup', e => { if (HOLD.has(e.code)) { if (this.where === 'story') e.stopPropagation(); this.up(); } }, true);
    addEventListener('blur', () => this.up());
  }
  // ---- input ----
  down() {
    this.voice.unlock();
    this.held = true;
    if (this.walking) this.setGo(!this.go);   // walking is a switch: one press starts it, the next stops it
    if (this.skipOk) this.subSkip();
  }
  up() { this.held = false; this.lock = false; if (!this.walking) this.el.classList.remove('g-held'); }
  get holding() { return this.held && !this.lock; }
  setGo(on) {
    this.go = !!on;
    this.el.classList.toggle('g-held', this.go);
    const w = this.go ? COPY.button_stop : COPY.button_walk;
    this.ui.word.textContent = w; this.ui.act.setAttribute('aria-label', w);
  }
  // each press of the speed chip steps to the next speed, and after the fastest comes the planned pace again
  setSpeed(i) {
    this.spd = ((i % SPEEDS.length) + SPEEDS.length) % SPEEDS.length;
    this.spdFlash = performance.now() + 1400;
    this.paintSpeed();
  }
  // the chip shows the pace of the walk right now: the chosen speed, or times one while a line is being said
  paintSpeed() {
    const sel = SPEEDS[this.spd], slow = sel > 1 && this.walking && this.listening() && performance.now() > this.spdFlash;
    const x = slow ? 1 : sel, key = x + (slow ? 'h' : '');
    if (key === this.spdKey) return;
    this.spdKey = key;
    const b = this.ui.spd;
    b.firstChild.textContent = '×' + x;
    b.classList.toggle('hold', slow);
    b.setAttribute('aria-label', `Walking speed: ${x} times the planned pace` + (slow ? `, held there while a line is spoken. Chosen: ${sel} times` : '') + '. Press to change.');
  }
  // true while a line is being said or read, or is waiting its turn
  listening() { const c = this.cur; return !!this.voice.cur || (!!c && !c.done) || this.q.length > 0; }
  // the list of places slides in from the side
  setJump(on) {
    this.jumpOpen = !!on && this.el.classList.contains('g-hud');
    this.el.classList.toggle('g-jumping', this.jumpOpen);
    this.ui.nav.setAttribute('aria-expanded', String(this.jumpOpen));
    if (this.jumpOpen) { this.jumpSel = this.sec; this.paintJump(); }
  }
  paintJump() {
    const bs = this.ui.jump.children;
    for (let k = 0; k < bs.length; k++) {
      const b = bs[k];
      const place = b.dataset.k !== undefined;
      b.classList.toggle('done', place && k <= this.samples); b.classList.toggle('here', place && k === this.sec); b.classList.toggle('sel', k === this.jumpSel);
    }
  }
  setView(on) {
    this.fp = !!on;
    this.ui.view.classList.toggle('fp', this.fp); this.ui.view.setAttribute('aria-pressed', String(this.fp));
    if (this.fp && this.app) this.app.walk.pitch = 0.1;   // eyes on the horizon, not the ground at your boots
  }
  setSound(on) {
    this.voice.setMuted(!on);
    this.ui.snd.classList.toggle('off', !on); this.ui.snd.setAttribute('aria-pressed', String(!!on));
  }
  menu() { return [...(this.where === 'title' ? this.title : this.ui.end).querySelectorAll('.g-menu button')]; }
  select(i) {
    const bs = this.menu(); if (!bs.length) return;
    this.sel = (i + bs.length) % bs.length;
    bs.forEach((b, j) => b.classList.toggle('sel', j === this.sel));
  }
  choose(go) {
    if (!this.app || !go) return;
    this.voice.unlock();
    if (go === 'control') this.toControl(); else this.start(0);
  }
  // main.js calls this once the route is planned and the app can be driven
  attach(app, setTick) {
    this.app = app;
    // the red ghost that walks the escape route in the drill: the same suit, drawn as a red figure of light
    this.mars = new Image(); this.mars.src = new URL('../data/mars_global.jpg', import.meta.url).href;
    import('./astronaut.js').then(({ loadAstronaut }) => loadAstronaut('models/z2_suit.glb')).then((fig) => {
      const T = app.THREE, g = new T.Group();
      fig.mesh.material = new T.MeshBasicMaterial({ color: 0xff3a1c, transparent: true, opacity: 0, depthWrite: false });
      fig.mesh.layers.set(0);   // a ghost casts no shadow
      g.add(fig.group); g.visible = false; app.scene.add(g);
      this.ghost = { fig, group: g, t: 0, i: 0, x: 0, z: 0, on: false };
    }).catch(() => {});
    setTick(dt => this.tick(dt));
    this.voice.load().then(() => { if (this.voice.clips) document.body.classList.add('has-voice'); });
    const nav = this.title.querySelector('.g-menu');
    nav.classList.remove('wait');
    nav.querySelectorAll('button').forEach(b => { b.disabled = false; });
    const w = document.querySelector('#brand .word');
    if (w) w.addEventListener('click', () => this.showTitle());
    if (this.where === 'title') { this.select(0); this.toPlan({ cam: 'title', drift: 0.014, dur: 3.6 }); }
  }
  // ---- the places: title, the walk, Mission Control ----
  // stop whatever the Mission was doing and put the app's own state back
  leave() {
    this.gen++; this.phase = null; this.q = []; this.cur = null; this.held = false; this.lock = false; this.skipOk = false;
    this.v = 0; this.far = 0; this.farK = 1.3; this.orbit = 0; this.target = null; this.eye = false; this.look = null; this.dipOn = false;
    this.go = false; this.walking = false; this.voice.stop();
    this.jumpOpen = false; this.ui.nav.setAttribute('aria-expanded', 'false');
    this.el.className = '';
    this.el.querySelectorAll('.on').forEach(e => e.classList.remove('on'));
    this.ui.black.style.transitionDuration = '';
    if (this.beam) this.beam.visible = false;
    this.vis.reset(); this.ground = null; this.flag = {};
    const a = this.app; if (!a) return;
    const st = a.state;
    this.groundOff();
    if (st.abort) a.toggleDrill();
    a.bubbles.hide(); st.povEye = null;
    st.noPov = false; st.povStop = null; st.holdLookUntil = 0; st.chaseFar = 0;
  }
  showTitle() {
    this.leave();
    this.where = 'title';
    document.body.classList.add('cine', 'title', 'nopins');
    this.el.classList.remove('on'); this.title.classList.add('on');
    this.offTo = { x: 0, y: 0 };
    this.select(0);
    if (this.app) this.toPlan({ cam: 'title', drift: 0.014, dur: 2.6 });
  }
  // k: 0 from the hatch, 1..n at site k, n + 1 the end screen
  start(k = 0) {
    const a = this.app;
    if (!a?.state.sched?.ok) { this.toControl(); return; }
    this.leave();
    this.where = 'story';
    document.body.classList.add('cine', 'nopins'); document.body.classList.remove('title', 'curpin');
    this.title.classList.remove('on'); this.el.classList.add('on');
    this.setup();
    this.run(k).catch(e => { if (e !== CANCEL) console.error(e); });
  }
  toControl() {
    const a = this.app, st = a.state;
    this.leave();
    this.where = 'leaving'; this.cam = null;
    this.title.classList.remove('on'); this.el.classList.remove('on');
    this.toPlan({ route: true, pins: true, bare: true });
    document.body.classList.remove('cine', 'title', 'nopins', 'curpin');
    st.cursorLmst = 9.0; st.walkRate = 30; st.cam = 'auto'; st.chaseFar = 0;
    a.ui.setWalkRate(30); a.updateTime();
    // slide the picture to where the planner frames it, then hand the camera back
    st.cine = st.cine || { x: this.off.x, y: this.off.y };
    this.offTo = innerWidth > 900 ? { x: -45 / innerWidth, y: 30 / innerHeight } : { x: 0, y: 0.24 };
    a.framePlan(false);
  }
  // ---- timing: everything waits on the frame loop, and leaving cancels all of it ----
  wait(fn) { return new Promise((res, rej) => this.waiters.push({ fn, res, rej, g: this.gen })); }
  sleep(s) { let t = 0; return this.wait(dt => (t += dt) >= s); }
  later(s, fn) { this.sleep(s).then(fn, () => {}); }
  // ---- the words ----
  // the numbers the copy may ask for, all from the live plan
  setup() {
    const a = this.app, st = a.state, sc = st.sched, v = st.verdict || {}, n = sc.events.length - 1;
    const hrs = Math.round(sc.total / 3600), day = Math.floor(v.margin ?? 0);
    this.total = sc.cum[sc.cum.length - 1] || 1;
    this.vars = {
      sol: st.sol, start_clock: clock(st.startLmst), total: n,
      hours: hrs >= 1 ? `${hrs} hour${hrs > 1 ? 's' : ''}` : undefined,
      daylight: day >= 1 ? `${day} hour${day > 1 ? 's' : ''}` : undefined,
      curiosity_sols: v.solsCur || undefined,
      walkback_max: isFinite(sc.maxWalkback) && sc.maxWalkback > 0 ? Math.ceil(sc.maxWalkback) : undefined,
    };
    const home = sc.events[n], homeM = this.total - along(sc, n ? sc.events[n - 1].depart : 0).d;
    this.canon = n === 6 && a.stops.every((s, i) => s.id === 's' + i) && Math.abs(homeM - 500) <= 25 && !!home;
    // the spoken lines name places and leg lengths, so the voice needs this exact route
    const legM = sc.events.map((e, k) => along(sc, e.arrive).d - along(sc, k ? sc.events[k - 1].depart : 0).d);
    this.voiceOk = this.canon && legM.length === VOICED_LEGS.length && legM.every((m, k) => Math.abs(m - VOICED_LEGS[k]) <= 0.9);
    this.samples = 0; this.sec = 0; this.said = { lost: false, back: false };
    this.buildRadio();
    // what the suit display needs: the energy budget, where the drill falls, the radio gap, the ground at each site
    this.budget = evaBudgetJ(SUIT); this.standW = metabolicW(0, 0); this.w = null; this.hudT = 0; this.shown = {};
    this.half = Math.ceil(n / 2);
    this.drillK = n >= 4 ? Math.min(3, n - 1) : -1;
    this.drillT = this.drillK >= 0 ? lerp(this.drillK ? sc.events[this.drillK - 1].depart : 0, sc.events[this.drillK].arrive, 0.5) : Infinity;
    const R = this.radio || [], off = R.find(s => !s.on && s.t > 0), back = off && R.find(s => s.on && s.t > off.t);
    this.gap = off && back ? { from: off.t, to: back.t, d: along(sc, back.t).d, m: along(sc, back.t).d - along(sc, off.t).d } : null;
    // the steep stretches of the route: 10 degrees or more, measured the way the planner measures grade
    // (over a baseline of ten track samples, longer than 5 m, because a single 1 m step is terrain noise)
    const tr = sc.track, N = tr.length / 5, gr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const j = Math.min(N - 1, i + 10), dd = Math.hypot(tr[j * 5] - tr[i * 5], tr[j * 5 + 2] - tr[i * 5 + 2]);
      gr[i] = dd > 5 ? Math.abs(Math.atan((tr[j * 5 + 1] - tr[i * 5 + 1]) / dd)) * 57.2958 : 0;
    }
    this.grade = gr; this.steep = [];
    for (let i = 0; i < N; i++) {
      if (gr[i] < 10) continue;
      const t0 = tr[i * 5 + 3]; let mx = 0, t1 = t0;
      for (; i < N && (gr[i] >= 10 || tr[i * 5 + 3] - t1 < 12) && tr[i * 5 + 3] - tr[i * 5 - 2] < 30; i++) if (gr[i] >= 10) { t1 = tr[i * 5 + 3]; mx = Math.max(mx, gr[i]); }
      if (mx >= 12 && t1 - t0 >= 6) this.steep.push({ from: t0, to: t1, max: mx });
    }
    this.gnd = [];
    this.gndP = Promise.all(a.stops.slice(1).map(p => a.groundAt(p))).then(G => { this.gnd = G; }, () => {});
    a.preloadLayers().catch(() => {});
    // the trail: one dot per site, placed by distance along the route
    let h = '';
    sc.events.forEach((e, k) => { if (k < n) h += `<button data-k="${k}" style="left:${(along(sc, e.arrive).d / this.total * 100).toFixed(2)}%" aria-label="${esc(a.stops[k + 1].name)}"></button>`; });
    this.ui.pts.innerHTML = h;
    // the objectives, in the order the walk meets them. Each one strikes itself out when it is done.
    // The drill is unannounced: its line joins the list when the alarm sounds.
    let o = '';
    for (let k = 0; k < n; k++) {
      if (k === this.drillK) o += `<li data-o="d" class="hid"><span>${esc(COPY.objective_drill)}</span></li>`;
      o += `<li data-o="s" data-k="${k}"><span>${esc(COPY.objective_sample.replace('{place}', a.stops[k + 1].name))}</span></li>`;
    }
    this.ui.obj.innerHTML = o + `<li data-o="h"><span>${esc(COPY.objective_home)}</span></li>`;
    this.objSig = ''; this.drillOk = false;
    // the same places as a list, each with the clock time the plan reaches it: the rover, the sites, the rover again
    const row = (k, name, t, rover) => `<button data-k="${k}"${rover ? ' class="rv"' : ''}><i></i><b>${esc(name)}</b><span>${clock(st.startLmst + t / MARS_HOUR_S)}</span></button>`;
    let j = row(0, a.stops[0].name, 0, true);
    sc.events.forEach((e, k) => { j += k < n ? row(k + 1, a.stops[k + 1].name, e.arrive) : row(n + 1, a.stops[0].name, e.arrive, true); });
    // the last row leaves the walk for Mission Control, the full planner
    j += `<button class="mc" data-go="control"><i></i><b>${esc(COPY.menu_control)}</b></button>`;
    this.ui.jump.innerHTML = j;
  }
  // where along the walk the rover's radio is lost and found (blips under 40 s are ignored)
  buildRadio() {
    const a = this.app, st = a.state, sc = st.sched;
    this.radio = null;
    if (!st.radio) return;
    const tr = sc.track, n = tr.length / 5; let segs = [];
    for (let i = 0; i < n; i++) {
      const on = !!a.planner.sampleGrid(st.radio, tr[i * 5], tr[i * 5 + 2]);
      if (!segs.length || segs[segs.length - 1].on !== on) segs.push({ t: tr[i * 5 + 3], on });
    }
    for (let pass = 0; pass < 8; pass++) {
      const keep = segs.filter((s, i) => i === 0 || (i + 1 < segs.length ? segs[i + 1].t : sc.total) - s.t >= 40);
      const out = [];
      for (const s of keep) if (!out.length || out[out.length - 1].on !== s.on) out.push(s);
      if (out.length === segs.length) break;
      segs = out;
    }
    this.radio = segs;
  }
  radioOn(t) { const R = this.radio; if (!R) return true; let on = R[0].on; for (const s of R) { if (s.t <= t) on = s.on; else break; } return on; }
  fill(s, vars) {
    let ok = true;
    const out = s.replace(/\{(\w+)\}/g, (m, k) => { const v = vars[k] ?? this.vars[k]; if (v === undefined || v === null || v === '') { ok = false; return ''; } return v; });
    return ok ? out : null;
  }
  lines(key, vars = {}) {
    const L = COPY[key], out = [];
    if (!Array.isArray(L)) return out;
    L.forEach((it, i) => {
      if (!this.canon && FIXED.has(key + ':' + i)) return;
      const text = it.show ? this.fill(it.show, vars) : '';
      if (text === null) return;
      const say = this.voiceOk && it.say ? this.fill(it.say, vars) : null;
      if (text || say) out.push({ who: it.who, text, say, id: key + ':' + i });
    });
    return out;
  }
  // queue lines for the subtitle. flush drops what is waiting (an alarm does not wait its turn).
  push(key, vars, o = {}) {
    const L = this.lines(key, vars);
    if (o.flush) { for (const it of this.q) it.started = it.done = true; this.q = []; if (this.cur) this.cur.cut = true; }
    for (const it of L) { it.alarm = !!o.alarm; this.q.push(it); }
    return L;
  }
  // the same, but wait for the last line: until it has been read, or with o.early until it starts
  async talk(key, vars, o = {}) {
    const L = this.push(key, vars, o), last = L[L.length - 1];
    if (last) {
      this.skipOk = true;
      await this.wait(() => (o.early ? last.started : last.done));
      this.skipOk = false;
    }
    if (o.early) o.early();
  }
  subSkip() {
    const c = this.cur; if (!c) return;
    if (c.n < c.text.length) c.n = c.text.length; else { c.t = Math.max(c.t, c.hold); this.voice.stop(); }
  }
  subTick(dt) {
    const el = this.ui.sub;
    let c = this.cur;
    if (c && c.cut) { this.voice.stop(); c.started = c.done = true; c = this.cur = null; }
    if (!c) {
      if (!this.q.length) return;
      c = this.cur = this.q.shift();
      // the voice speaks the line if its clip says exactly this sentence. A spoken-only line with no voice is dropped.
      const vd = c.say ? this.voice.ready(c.id, c.say) : 0;
      if (!c.text && !vd) { c.started = c.done = true; this.cur = null; return; }
      c.n = 0; c.t = 0; c.shown = -1; c.started = true;
      if (c.id === 'pace:0') this.flag.pace = true;
      c.hold = Math.max(c.text ? Math.max(1.9, c.text.length * 0.055) : 0, vd ? vd + 0.3 - c.text.length / 46 : 0);
      if (vd) this.voice.play(c.id);
      el.className = 'g-sub ' + (c.text ? 'on ' : '') + c.who + (c.alarm ? ' alarm' : '');
      el.innerHTML = '<span></span><span class="rest"></span>';
    }
    const len = c.text.length;
    if (c.shown < len) {
      c.n = Math.min(len, c.n + dt * 46);
      const k = Math.floor(c.n);
      if (k !== c.shown) { c.shown = k; el.firstChild.textContent = c.text.slice(0, k); el.lastChild.textContent = c.text.slice(k); }
      return;
    }
    c.t += dt;
    if (c.t < c.hold) return;
    c.done = true;
    if (this.q.length) this.cur = null;
    else if (c.t >= c.hold + 3.2) { el.classList.remove('on'); this.cur = null; }
  }
  // ---- small screen pieces ----
  fade(on, secs = 0.6) { const b = this.ui.black; b.style.transitionDuration = secs + 's'; b.classList.toggle('on', !!on); }
  setAct(word) {
    const b = this.ui.act;
    if (word) { this.ui.word.textContent = word; b.setAttribute('aria-label', word.replace(/\s+/g, ' ')); b.classList.toggle('two', word.includes('\n')); b.classList.toggle('sample', word === COPY.button_sample); }
    b.classList.toggle('on', !!word);
    this.ring(0);
  }
  ring(u) { this.ui.ring.style.strokeDashoffset = String(100 - clamp(u, 0, 1) * 100); }
  toast(text) { if (!text) return; const t = this.ui.toast; t.textContent = text; t.classList.add('on'); this.later(2.8, () => t.classList.remove('on')); }
  // a real photo Curiosity took from this stop: Mastcam if there is one, else Navcam
  photoFor(stop) {
    const all = this.app.povImages(stop) || [];
    // hand-picked so the photo shows the place, not the rover's own tools. Other plans fall back to a Navcam view of the horizon.
    const want = PHOTO[stop.id];
    const pick = (want && all.find(p => p.src.includes(want))) || all.find(p => p.rec.kind === 'nav' && p.rec.el > 0) || all.find(p => p.rec.kind === 'nav') || all[0];
    if (!pick) return null;
    const camera = /mastcam/i.test(pick.camera) ? 'Mastcam' : /nav/i.test(pick.camera) ? 'Navcam' : 'Hazcam';
    const cap = this.fill(COPY.photo_caption, { camera, photo_sol: pick.sol });
    return { cap, rec: pick.rec };
  }
  // Stand where Curiosity's camera stood and hang its photo in the world, on the camera's own corner rays, so it lines up with the terrain.
  eyeOn(ph, stop) {
    const a = this.app, st = a.state, r = ph?.rec;
    if (!r?.corners) return false;
    st.povStop = stop.id;   // the app's own stop watcher has nothing left to change
    a.bubbles.show([r], 30);
    st.povEye = new a.THREE.Vector3(...r.pos);
    const el = Math.asin(clamp(r.look[1], -1, 1));
    this.look = { yaw: Math.atan2(-r.look[0], -r.look[2]), pitch: Math.min(el * 0.6, el + 0.21) };
    // the caption rides on the photo's top edge
    // (below the camera's own sky, which the photo fades out, when it has one)
    const c = r.corners, sky = (r.sky || []).filter(v => v > 0), v = sky.length ? Math.max(0, sky.reduce((x, y) => x + y, 0) / sky.length - 0.06) : 0;
    this.capP = new a.THREE.Vector3().fromArray([0, 1, 2].map(i => ((c[0][i] + c[1][i]) * (1 - v) + (c[3][i] + c[2][i]) * v) * 15)).add(st.povEye);
    this.ui.photo.querySelector('b').textContent = ph.cap;
    this.eye = true; this.orbit = 0;
    return true;
  }
  eyeOff() {
    if (!this.eye) return;
    const a = this.app;
    this.eye = false; a.bubbles.hide(); a.state.povEye = null;
    this.ui.photo.classList.remove('on');
    this.look = { yaw: a.walk.yaw, pitch: this.fp ? 0.1 : 0 };
  }
  // ---- the two views ----
  // the map from above: the title, the end screen and the handoff to Mission Control
  toPlan(sc) {
    const a = this.app, st = a.state, T = a.THREE;
    if (st.abort) a.toggleDrill();
    st.holdLookUntil = 0; st.noPov = false;
    if (!sc.bare) st.cine = st.cine || { x: this.off.x, y: this.off.y };
    if (st.mode !== 'plan') { a.setMode('plan'); if (sc.cut) st.blendK = 1; }
    for (const L of a.LAYERS) if (L.on) { L.on = false; a.applyLayer(L); }
    a.ui.setLayers(a.LAYERS);
    a.ribbon.mesh.visible = !!sc.route;
    document.body.classList.toggle('nopins', !sc.pins);
    document.body.classList.remove('curpin');
    if (sc.bare) return;
    const sched = st.sched;
    st.chaseFar = 0;
    st.cursorLmst = sc.end && sched?.ok ? st.startLmst + sched.total / MARS_HOUR_S : 9.0;
    a.updateTime();
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of a.stops) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); z0 = Math.min(z0, s.z); z1 = Math.max(z1, s.z); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, portrait = innerWidth < innerHeight;
    const c = sc.cam === 'title' ? { d: 2500, az: a.table.cur.az + 0.25, pol: 0.74 } : sc.cam;
    const to = { target: new T.Vector3(cx, a.heightAt(cx, cz), cz), dist: c.d * (portrait ? c.pk || 1.9 : 1), az: c.az, pol: portrait ? Math.min(c.pol, 0.66) : c.pol };
    const cur = a.table.cur;
    const az0 = to.az + Math.atan2(Math.sin(cur.az - to.az), Math.cos(cur.az - to.az));
    cur.az = az0;
    this.cam = { from: { target: cur.target.clone(), dist: cur.dist, az: az0, pol: cur.pol }, to, u: 0, dur: sc.dur || 3, drift: sc.drift || 0, free: false };
  }
  // on the ground behind the astronaut, at EVA time t. Called under black, so it cuts.
  enterWalk(t) {
    const a = this.app, st = a.state;
    if (st.abort) a.toggleDrill();
    st.noPov = true; st.povStop = null; a.showPovFor(null);
    st.cine = st.cine || { x: this.off.x, y: this.off.y };
    if (st.mode !== 'walk') a.setMode('walk');
    st.blendK = 1;
    for (const L of a.LAYERS) if (L.on) { L.on = false; a.applyLayer(L); }
    a.ui.setLayers(a.LAYERS);
    a.ribbon.mesh.visible = true;
    document.body.classList.add('nopins');
    st.cam = 'follow'; st.followK = 1; st.walkRate = 0; st.walkT = t; st.holdLookUntil = 0;
    a.walk.lookTouched = 0;
    this.cam = null; this.v = 0;
    this.offTo = { x: 0, y: innerWidth <= 900 ? 0.06 : 0.03 };
    if (!this.radio) this.buildRadio();
    // point the camera down the route from here
    const sc = st.sched, p = along(sc, t), q = along(sc, Math.min(sc.total, t + 25));
    if (Math.hypot(q.x - p.x, q.z - p.z) > 0.5) a.walk.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
  }
  // ---- the walk, start to finish ----
  async run(k) {
    const a = this.app, sc = a.state.sched, n = sc.events.length;
    if (k >= n) { this.fade(1, 0); this.samples = n - 1; await this.finish(true); return; }
    if (k <= 0) { await this.open(); await this.intro(); } else await this.cutTo(k - 1);
    for (let i = Math.max(0, k - 1); i < n; i++) {
      if (k <= 0 || i > k - 1) await this.leg(i);
      if (i < n - 1) await this.site(i);
    }
    await this.finish(false);
  }
  hud(on) { this.el.classList.toggle('g-hud', !!on); if (!on) this.setJump(false); }
  async open() {
    const a = this.app, st = a.state, sc = st.sched;
    this.phase = 'open';
    this.el.classList.add('g-bars');
    this.fade(1, 0.6);
    await this.sleep(0.75);
    this.enterWalk(0);
    // start high behind the astronaut with the rover in the frame, and come down slowly
    const P = parkingSpot(a), p = along(sc, 0);
    a.walk.yaw = Math.atan2(-(P.x - p.x), -(P.z - p.z)) + 0.55;
    st.holdLookUntil = 1e9; st.chaseFar = 2.2; this.far = 0.7; this.farK = 0.22; this.orbit = -0.035;
    const card = this.ui.open;
    card.innerHTML = COPY.open_card.map((s, i) => { const t = this.fill(s, {}); return t ? `<p style="--i:${i}">${esc(t)}</p>` : ''; }).join('')
      + `<p class="obj" style="--i:${COPY.open_card.length}">${esc(COPY.open_objective)}</p>`;
    const globeOff = this.globeOn(card);
    card.classList.add('on');
    try { await this.sleep(8.6); card.classList.remove('on'); await this.sleep(0.7); } finally { globeOff(); }
    this.fade(0, 2.4);
    await this.sleep(1.5);
  }
  // The whole planet on the opening card, turned until this site faces the viewer, then pinned.
  // Texture: Viking MDIM 2.1 colour global mosaic (NASA/JPL/USGS, from NASA Mars Trek). The pin is the site's own centre from site.json.
  globeOn(card) {
    const a = this.app, T = a.THREE, S = a.site, img = this.mars;
    const lon = S.xc / S.R, lat = S.yc / S.R, deg = 180 / Math.PI;
    const wrap = document.createElement('div'); wrap.className = 'g-globe';
    wrap.innerHTML = '<canvas></canvas><i class="g-pin"><b></b><u></u><span></span></i>';
    wrap.querySelector('span').textContent = `${Math.abs(lat * deg).toFixed(1)}° ${lat < 0 ? 'S' : 'N'}   ${((lon * deg + 360) % 360).toFixed(1)}° E`;
    card.prepend(wrap);
    const pin = wrap.querySelector('.g-pin');
    let rdr; try { rdr = new T.WebGLRenderer({ canvas: wrap.firstChild, antialias: true, alpha: true }); } catch (e) { wrap.remove(); return () => {}; }
    rdr.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(24, 1, 0.1, 20); cam.position.z = 5.5;
    const tex = new T.Texture(img); tex.anisotropy = rdr.capabilities.getMaxAnisotropy();
    const sun = new T.Vector3(-0.55, 0.36, 0.75).normalize();
    const vs = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
    const geo = new T.SphereGeometry(1, 128, 80);
    const ball = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: { map: { value: tex }, sun: { value: sun } }, vertexShader: vs,
      fragmentShader: 'uniform sampler2D map; uniform vec3 sun; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main() { vec3 n = normalize(vN); vec3 c = texture2D(map, vUv).rgb; float lit = smoothstep(-.16, .5, dot(n, sun)); float rim = pow(1. - max(dot(n, normalize(vV)), 0.), 2.6); gl_FragColor = vec4(c * (.035 + 1.1 * lit) * (1. - .45 * rim) + vec3(.98, .66, .46) * rim * .3 * lit, 1.); }' }));
    const haze = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: { sun: { value: sun } }, vertexShader: vs, side: T.BackSide, transparent: true, depthWrite: false,
      fragmentShader: 'uniform vec3 sun; varying vec3 vN; void main() { vec3 n = normalize(vN); float i = pow(clamp(-n.z / .3, 0., 1.), 2.2) * smoothstep(-.5, .7, dot(normalize(-n.xy), normalize(sun.xy))); gl_FragColor = vec4(vec3(.95, .6, .4), i * .5); }' }));
    haze.scale.setScalar(1.045);
    const tilt = new T.Group(); tilt.rotation.x = -0.15; tilt.add(ball); scene.add(tilt, haze);
    const at = new T.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));   // where the site sits on the sphere's own texture mapping
    const face = -Math.PI / 2 - lon, SPIN = 3.2, v = new T.Vector3();
    let raf = 0, t0 = 0, w = 0, dead = false;
    const frame = () => {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000, u = clamp(t / SPIN, 0, 1), W = wrap.clientWidth;
      if (W !== w && W > 0) { w = W; rdr.setSize(W, W, false); pin.style.setProperty('--L', Math.round(W * 0.3) + 'px'); }
      ball.rotation.y = face - 1.9 * Math.pow(1 - u, 3);   // spins east, the way Mars turns, and settles on the site
      rdr.render(scene, cam);
      v.copy(at).applyMatrix4(ball.matrixWorld).project(cam);
      pin.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((0.5 - v.y * 0.5) * w).toFixed(1)}px)`;
      if (u >= 0.9) pin.classList.add('on');
    };
    const go = () => { if (dead) return; tex.needsUpdate = true; t0 = performance.now(); wrap.classList.add('on'); frame(); };
    if (img && img.complete && img.naturalWidth) go(); else if (img) img.addEventListener('load', go, { once: true });
    return () => { dead = true; cancelAnimationFrame(raf); tex.dispose(); geo.dispose(); ball.material.dispose(); haze.material.dispose(); rdr.dispose(); rdr.forceContextLoss(); };
  }
  async intro() {
    this.phase = 'intro';
    await this.talk('intro', {}, { early: () => this.ready() });
  }
  // the player takes over: bars away, the trail and the button appear
  ready() {
    this.el.classList.remove('g-bars');
    this.hud(true);
    this.far = 0.25; this.farK = 0.5;
    const h = this.ui.hint;
    h.textContent = matchMedia('(pointer: coarse)').matches ? COPY.hint_touch : COPY.hint_key;
    h.classList.add('on');
  }
  async cutTo(i) {
    const a = this.app, sc = a.state.sched, e = sc.events[i];
    this.phase = 'cut';
    this.fade(1, 0.35);
    await this.sleep(0.45);
    this.enterWalk(e.arrive + 0.5);
    this.samples = i;
    const R = this.radio || [], off = R.find(s => !s.on && s.t > 0), on = off && R.find(s => s.on && s.t > off.t);
    this.said = { lost: !!off && off.t <= e.arrive, back: !!on && on.t <= e.arrive };
    this.hud(true);
    this.fade(0, 0.7);
  }
  // hold to walk from one place to the next. Leg k ends at site k + 1, the last one at the rover.
  async leg(k) {
    const a = this.app, st = a.state, sc = st.sched, ev = sc.events, n = ev.length, home = k === n - 1;
    const from = k ? ev[k - 1].depart : 0, to = ev[k].arrive, stop = home ? a.stops[0] : a.stops[k + 1];
    const end = along(sc, to);
    this.phase = 'leg';
    this.target = { x: end.x, z: end.z, y: a.heightAt(end.x, end.z), name: stop.name, to, home };
    st.walkT = clamp(st.walkT, from, to);
    st.holdLookUntil = Math.min(st.holdLookUntil || 0, 1e9);
    this.lock = this.held;
    this.setAct(COPY.button_walk);
    this.setGo(false);
    // the warning that the radio is about to drop is said just before the ground drops it, and only if it does
    const off = (this.radio || []).find(s => !s.on && s.t > from && s.t < to);
    const L = this.lines(home ? 'home' : 'leg' + stop.id.slice(1)).filter(it => off || it.id !== 'leg1:1');
    const at = L.length === 1 ? [0.06] : L.length === 2 ? [0.04, 0.18] : [0.08, 0.42, 0.85];
    const cues = L.map((it, i) => ({ f: at[i] ?? 0.9, it }));
    if (!home && stop.id === 's1' && cues.length === 2 && off) cues[1].f = Math.max(cues[0].f + 0.05, (off.t - 12 - from) / Math.max(1, to - from));
    // the first steps from the rover: why the walk is this slow
    if (k === 0 && st.walkT < 1) cues.unshift(...this.lines('pace').map((it, i) => ({ f: 0.012 + i * 0.004, it })));
    const leg = { from, to, cues };
    if (k === this.drillK && st.walkT < lerp(from, to, 0.5) - 1) {
      await this.walk(leg, lerp(from, to, 0.5));
      await this.drill();
      this.phase = 'leg';
      this.setAct(COPY.button_walk);
    }
    await this.walk(leg, to);
    this.setGo(false);
    this.target = null;
  }
  // the button switches walking on and off. A walk the drill interrupted carries on by itself.
  walk(leg, end) {
    const a = this.app, st = a.state;
    this.walking = true;
    this.setGo(this.go);
    return this.wait(dt => {
      const want = this.go ? 1 : 0;
      this.v += (want - this.v) * Math.min(1, dt * (want ? 2.5 : 5));
      if (want && st.holdLookUntil) { st.holdLookUntil = 0; this.orbit = 0; this.farK = 1.3; this.ui.hint.classList.remove('on'); a.walk.lookTouched = 0; }
      // st.walkT is planned time, so the pace over slopes and rough ground is the plan's own
      const goal = this.listening() ? 1 : SPEEDS[this.spd];
      this.rate = this.rate > 0 ? this.rate + (goal - this.rate) * Math.min(1, dt * 4) : goal;
      const rate = this.rate;
      const rem = end - st.walkT, r = Math.min(rate, Math.max(rate * 0.25, rem / 0.6)) * this.v;
      st.walkT = Math.min(end, st.walkT + r * dt);
      if (!st.holdLookUntil) this.far = (0.08 + 0.52 * Math.log(SPEEDS[this.spd]) / Math.log(30)) * this.v;
      const f = (st.walkT - leg.from) / Math.max(1, leg.to - leg.from);
      this.ring(f);
      while (leg.cues.length && f >= leg.cues[0].f) this.q.push(leg.cues.shift().it);
      // the radio is lost and found where the ground says so, not where a script says so
      const on = this.radioOn(st.walkT);
      if (!on && !this.said.lost) { this.said.lost = true; this.push('radio_lost', {}, { flush: true }); }
      if (on && this.said.lost && !this.said.back) { this.said.back = true; this.push('radio_back', {}); }
      if (st.walkT < end - 1e-3) return false;
      this.walking = false;
      return true;
    });
  }
  // at a site: hold to take the sample. The clock runs through the planned minutes while you do.
  async site(k) {
    const a = this.app, st = a.state, sc = st.sched, e = sc.events[k], stop = a.stops[k + 1], id = stop.id.slice(1);
    this.phase = 'site'; this.sec = k + 1;
    this.target = null; this.v = 0; this.el.classList.remove('g-held');
    st.walkT = e.arrive + 0.5;
    this.far = -0.25; this.farK = 0.9; this.orbit = 0.05; st.holdLookUntil = 1e9; a.walk.lookTouched = 0;
    this.lock = this.held;
    this.setAct(null);
    this.ui.hint.classList.remove('on');
    const g0 = this.gen, ground = () => this.gndP.then(() => { if (g0 === this.gen && this.phase === 'site') this.setGround(k); });
    if (this.eyeOn(this.photoFor(stop), stop)) this.orbit = 0; else ground();
    await this.talk(`site${id}_arrive`, {}, { early: () => this.setAct(COPY.button_sample) });
    let u = 0;
    await this.wait(dt => {
      const on = this.holding;
      if (on && this.eye) { this.eyeOff(); this.orbit = 0.05; ground(); }   // back behind the astronaut for the work
      if (on) u = Math.min(1, u + dt / 3.4);
      this.dipOn = on;
      this.el.classList.toggle('g-held', on);
      this.ring(u);
      st.walkT = lerp(e.arrive + 0.5, e.depart, u);
      return u >= 1;
    });
    st.walkT = e.depart; this.dipOn = false;
    this.samples = k + 1; this.lock = this.held; this.el.classList.remove('g-held');
    this.setAct(null);
    this.toast(this.fill(COPY.sample_toast, { n: k + 1 }));
    this.eyeOff();
    this.push(`site${id}_done`, { dwell: Math.round((e.depart - e.arrive) / 60) });
    this.later(5, () => { if (this.ground?.k === k) this.ground = null; });
    await this.sleep(1.2);
    this.orbit = 0; this.farK = 1.3; st.holdLookUntil = 0; a.walk.lookTouched = 0; this.look = null;
  }
  // the ground under a site, read the way the planner reads it: a ridge or a hollow from the relief map,
  // or a hydrated mineral signal from orbit. The display shows that layer and pins one tag to the spot.
  setGround(k) {
    const g = this.gnd[k];
    this.ground = null;
    if (!g || k < 2) return;   // the first sites keep the screen clear
    const m = Math.abs(g.relief).toFixed(1) + ' M';
    const G = g.hydrated ? { layer: 'lMin', word: COPY.tag_minerals } : g.relief > 0.25 ? { layer: 'lRelief', word: COPY.tag_ridge, value: '+' + m }
      : g.relief < -0.25 ? { layer: 'lRelief', word: COPY.tag_hollow, value: '−' + m } : null;
    if (!G) return;
    G.k = k; G.fp = null;
    this.ground = G;
  }
  groundOff() {
    const a = this.app;
    for (const L in this.gl) if (this.gl[L] > 0) { this.gl[L] = 0; a.terrain.setLayer(L, 0); }
  }
  // the solar storm drill: the app's own fastest safe line back to the rover, from where you stand
  // The drill's ghost: a red copy of the astronaut walks the escape route to the crew rover, the whole
  // walk in a few seconds and at the plan's own pace on every slope, while the real one stands still.
  objSync() {
    const L = this.ui.obj.children, st = this.app.state, ph = this.phase;
    const live = ph === 'drill', past = this.drillOk || (isFinite(this.drillT) && st.walkT > this.drillT + 1);
    const home = ph === 'arrive' || ph === 'end';
    const S = [...L].map(li => { const o = li.dataset.o; return o === 's' ? (+li.dataset.k < this.samples ? 2 : 1) : o === 'd' ? (live ? 1 : past ? 2 : 0) : home ? 2 : 1; });   // 0 hidden, 1 open, 2 done
    const sig = S.join('');
    if (sig === this.objSig) return;
    this.objSig = sig;
    const now = S.indexOf(1);
    for (let i = 0; i < L.length; i++) { const c = L[i].classList; c.toggle('hid', S[i] === 0); c.toggle('done', S[i] === 2); c.toggle('now', i === now); c.toggle('alarm', L[i].dataset.o === 'd' && live); }
  }
  ghostStep(dt) {
    const G = this.ghost, a = this.app, A = a.state.abort;
    if (!G) return;
    if (!G.on || !A) { G.group.visible = false; G.t = 0; G.i = 0; return; }
    const tr = A.track, N = tr.length / 5, t00 = tr[3], T = tr[(N - 1) * 5 + 3] - t00, RUN = 7;
    if (!(T > 0)) return;
    G.t += dt * T / RUN;
    if (G.t > T * 1.22) { G.t = 0; G.i = 0; }   // a pause at the crew rover, then once more
    const t = t00 + Math.min(T, G.t);
    let i = G.i; while (i < N - 2 && tr[(i + 1) * 5 + 3] <= t) i++; G.i = i;
    const t0 = tr[i * 5 + 3], t1 = tr[(i + 1) * 5 + 3], u = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 0;
    const x = lerp(tr[i * 5], tr[(i + 1) * 5], u), z = lerp(tr[i * 5 + 2], tr[(i + 1) * 5 + 2], u);
    const dx = x - G.x, dz = z - G.z, moved = Math.hypot(dx, dz), fresh = G.t < dt * T / RUN * 1.5;
    if (!fresh && moved > 1e-3) { let d = Math.atan2(-dx, -dz) - G.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); G.group.rotation.y += d * Math.min(1, dt * 14); }
    G.x = x; G.z = z;
    // from the lifted camera a life size figure is a speck, so the ghost is drawn large enough to follow
    // all the way to the crew rover, and life size again when the camera is down beside it
    G.group.position.set(x, a.heightAt(x, z), z);
    G.group.scale.setScalar(Math.max(1, G.group.position.distanceTo(a.camera.position) / 24));
    G.fig.advance(fresh ? 0 : moved, dt);
    G.fig.mesh.material.opacity = 0.78 * clamp(G.t / (T * 0.05), 0, 1) * clamp((T * 1.22 - G.t) / (T * 0.1), 0, 1);
    G.group.visible = true;
  }
  async drill() {
    const a = this.app, st = a.state, g = this.gen;
    this.phase = 'drill';
    this.v = 0; this.lock = this.held; this.el.classList.remove('g-held');
    this.setAct(null);
    this.el.classList.add('g-alert');
    this.vis.jolt();
    this.far = 1.25; this.farK = 0.8;
    const route = a.toggleDrill();
    const alarm = this.talk('drill_alarm', {}, { alarm: true, flush: true });
    await route;
    if (g !== this.gen) { if (st.abort) a.toggleDrill(); throw CANCEL; }
    st.walkRate = 0;
    await alarm;
    const m = st.abort ? Math.max(1, Math.ceil(st.abort.total / 60)) : undefined;
    // how much shorter the red line is than the way walked out to here
    let saved = 0;
    if (st.abort) {
      const tr = st.sched.track, T = st.abort.startWalkT; let out = 0;
      for (let i = 1; i < tr.length / 5 && tr[i * 5 + 3] <= T; i++) out += Math.hypot(tr[i * 5] - tr[i * 5 - 5], tr[i * 5 + 2] - tr[i * 5 - 3]);
      saved = Math.floor((out - st.abort.cum[st.abort.cum.length - 1]) / 10) * 10;
    }
    // lift the camera so the red line and the grey way out are seen apart
    // and both lines are drawn wide enough to read from up there
    this.far = 9; this.farK = 0.45;
    if (this.ghost) this.ghost.on = true;
    if (st.abort) { a.abortRibbon.setWidth(3.6, 0.3, 4); a.ribbon.setWidth(2.6, 0.25, 4); a.ribbon.uniforms.uColor.value.setRGB(0.8, 0.78, 0.76); a.ribbon.uniforms.uDone.value = -1; }
    try {
      await this.talk(saved >= 20 ? 'drill_explain' : 'drill_explain_plain', { drill_min: m, drill_saved: saved }, { alarm: true, early: () => this.setAct(COPY.button_confirm) });
      let u = 0;
      await this.wait(dt => { u = this.holding ? Math.min(1, u + dt / 1.2) : Math.max(0, u - dt * 2); this.ring(u); return u >= 1; });
    } finally { a.ribbon.setWidth(1.2, 0.08, 4); if (this.ghost) this.ghost.on = false; }
    if (st.abort) a.toggleDrill();
    st.povStop = null;
    this.el.classList.remove('g-alert');
    this.lock = false; this.far = 0; this.farK = 1.3;
    this.drillOk = true;
    this.go = true;   // the drill stopped the walk, so the walk carries on without another press
    this.push('drill_clear', {});
  }
  // back at the rover: the results, and only now the door to Mission Control
  async finish(direct) {
    const a = this.app, st = a.state, sc = st.sched, v = st.verdict || {};
    this.target = null; this.v = 0; this.el.classList.remove('g-held');
    this.setAct(null);
    if (!direct) {
      this.phase = 'arrive';
      this.far = 0.9; this.farK = 0.4; this.orbit = 0.05; st.holdLookUntil = 1e9;
      await this.talk('arrive', {});
      await this.sleep(0.5);
      this.fade(1, 0.8);
      await this.sleep(0.95);
    }
    this.phase = 'end';
    this.ground = null; this.groundOff(); this.vis.reset();
    this.hud(false); this.q = []; this.cur = null; this.ui.sub.classList.remove('on');
    this.ui.photo.classList.remove('on'); this.ui.toast.classList.remove('on');
    this.orbit = 0;
    this.toPlan({ cam: { d: 1250, az: 0.95, pol: 1.0, pk: 2.3 }, drift: 0.02, dur: 5, route: true, cut: true, end: true });
    this.offTo = { x: 0, y: innerWidth <= 900 ? 0.2 : 0.16 };
    const E = this.ui.end, set = (k, t) => { E.querySelector(`[data-n=${k}]`).textContent = t; };
    const km = this.total / 1000, out = sc.total, day = Math.max(0, (v.margin || 0) * 3600), n = this.samples;
    const paint = u => { set('samples', Math.round(n * u)); set('distance', (km * u).toFixed(1) + ' km'); set('outside', hm(out * u)); set('daylight', hm(day * u)); };
    paint(0);
    const line = !(v.issues || []).length ? this.fill(COPY.end_line, {}) : null;
    E.querySelector('.g-line').textContent = line || '';
    E.classList.add('on');
    this.select(0);
    this.lock = this.held;
    this.fade(0, 1.6);
    await this.sleep(0.9);
    let t = 0;
    await this.wait(dt => { t += dt / 1.6; paint(ease(t)); return t >= 1; });
    paint(1);
    // the closing line is spoken only. It praises the margin, so it needs a plan with no problems.
    const es = COPY.end_say?.[0], say = es && line && this.voiceOk ? this.fill(es.say, {}) : null;
    if (say && this.voice.ready('end_say:0', say)) this.voice.play('end_say:0');
  }
  // ---- every frame ----
  // a thin column of light standing on the next place to walk to
  makeBeam() {
    const a = this.app, T = a.THREE, c = document.createElement('canvas');
    c.width = 4; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(201,242,92,0)'); gr.addColorStop(0.75, 'rgba(201,242,92,0.5)'); gr.addColorStop(1, 'rgba(232,250,176,1)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    const map = new T.CanvasTexture(c), geo = new T.CylinderGeometry(0.32, 0.32, 60, 20, 1, true);
    geo.translate(0, 30, 0);
    this.beam = new T.Mesh(geo, new T.MeshBasicMaterial({ map, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false }));
    this.beam.renderOrder = 5; this.beam.frustumCulled = false;
    this.vec = new T.Vector3();
    a.scene.add(this.beam);
  }
  paint() {
    const a = this.app, st = a.state, sc = st.sched, U = this.ui, t = st.walkT;
    const c = clock(st.cursorLmst ?? st.startLmst + t / MARS_HOUR_S);
    if (c !== this.clockText) { this.clockText = c; U.clock.textContent = c; }
    U.trail.style.setProperty('--f', (along(sc, t).d / this.total * 100).toFixed(2) + '%');
    const bs = U.pts.children;
    for (let k = 0; k < bs.length; k++) bs[k].classList.toggle('done', k < this.samples);
    this.objSync();
    this.paintSpeed();
    if (this.jumpOpen) this.paintJump();
    U.sig.classList.toggle('lost', !this.radioOn(t));
    const tg = this.target, W = U.way, show = !!tg && this.phase === 'leg';
    W.classList.toggle('on', show);
    if (!show) { if (this.beam) this.beam.visible = false; return; }
    if (!this.beam) this.makeBeam();
    const P = a.walk.pos, d = Math.hypot(tg.x - P.x, tg.z - P.z);
    this.beam.visible = true;
    this.beam.position.set(tg.x, tg.y, tg.z);
    this.beam.material.opacity = clamp((d - 5) / 30, 0, 1) * 0.8;
    // the label rides on the place itself. Off screen it waits at the edge and points the way.
    const v = this.vec.set(tg.x, tg.y + 2.6, tg.z).project(a.camera), iw = innerWidth, ih = innerHeight;
    let x = v.x, y = v.y;
    if (v.z > 1) { const s = 2 / Math.max(1e-3, Math.hypot(x, y)); x = -x * s; y = -y * s; }
    const px = (x * 0.5 + 0.5) * iw, py = (-y * 0.5 + 0.5) * ih;
    const cx = clamp(px, 96, iw - 96), cy = clamp(py, iw <= 900 ? 170 : 130, ih - (iw <= 900 ? 250 : 210));
    const edge = cx !== px || cy !== py;
    W.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
    W.classList.toggle('edge', edge);
    if (edge) W.style.setProperty('--r', Math.atan2(py - cy, px - cx).toFixed(3) + 'rad');
    const m = Math.max(0, Math.round(along(sc, tg.to).d - along(sc, t).d));
    if (m !== this.wayM || tg !== this.wayT) {
      this.wayM = m; this.wayT = tg;
      W.children[1].textContent = tg.name;
      const txt = m + ' M', S = 1.9;
      W.querySelector('path').setAttribute('d', stroke(txt, -stroke(txt, 0, 0, S).w / 2, -6 * S, S).d);
    }
  }
  tick(dt) {
    // waiters first, so leaving cancels them even when nothing else runs
    if (this.waiters.length) {
      const W = this.waiters; this.waiters = [];
      for (const w of W) {
        if (w.g !== this.gen) { w.rej(CANCEL); continue; }
        let done = false;
        try { done = w.fn(dt); } catch (e) { w.rej(e); continue; }
        if (done) w.res(); else this.waiters.push(w);
      }
    }
    const a = this.app; if (!a || !this.where) return;
    const st = a.state;
    // ease the picture to where this screen wants it
    if (st.cine && (Math.abs(this.off.x - this.offTo.x) > 1e-4 || Math.abs(this.off.y - this.offTo.y) > 1e-4)) {
      const k = 1 - Math.exp(-dt * 2.2);
      this.off.x = lerp(this.off.x, this.offTo.x, k); this.off.y = lerp(this.off.y, this.offTo.y, k);
      st.cine.x = this.off.x; st.cine.y = this.off.y;
      a.viewOffset(); a.camera.updateProjectionMatrix();
    } else if (this.where === 'leaving') {
      st.cine = null; this.where = null;
      a.viewOffset(); a.camera.updateProjectionMatrix();
      return;
    }
    const C = this.cam;
    if (C && st.mode === 'plan') {
      const g = a.table.goal;
      if (a.table.drag) C.free = true;
      if (!C.free) {
        if (C.u < 1) {
          C.u = Math.min(1, C.u + dt / C.dur);
          const u = ease(C.u);
          g.target.lerpVectors(C.from.target, C.to.target, u);
          g.dist = lerp(C.from.dist, C.to.dist, u); g.pol = lerp(C.from.pol, C.to.pol, u);
          C.to.az += C.drift * dt;
          g.az = lerp(C.from.az, C.to.az, u);
        } else g.az += C.drift * dt;
      }
    }
    if (this.where !== 'story') return;
    this.subTick(dt);
    if (st.mode !== 'walk') return;
    // the story moves the walker itself, so the planner's own playback stays off
    st.walkRate = 0;
    // first person is the app's own visor view. The opening, the drill and the arrival stay behind the astronaut.
    st.cam = this.eye || (this.fp && (this.phase === 'leg' || this.phase === 'site')) ? 'first' : 'follow';
    st.chaseFar = (st.chaseFar || 0) + (this.far - (st.chaseFar || 0)) * Math.min(1, dt * this.farK);
    // while a sample is being taken the view tips down at the work, and comes back up after
    st.chaseDip = (st.chaseDip || 0) + ((this.dipOn ? 1 : 0) - (st.chaseDip || 0)) * Math.min(1, dt * 3.2);
    if (this.fp && st.chaseDip > 0.004 && !this.eye && !a.walk.look && !a.walk.lookTouched) this.look = { yaw: a.walk.yaw, pitch: 0.1 - 0.42 * st.chaseDip };
    if (this.orbit && !a.walk.look && !a.walk.lookTouched) a.walk.yaw += this.orbit * dt;
    if (this.look) {
      if (a.walk.look || a.walk.lookTouched) this.look = null;   // the user took the view
      else {
        const L = this.look, q = Math.min(1, dt * 2.4), d = Math.atan2(Math.sin(L.yaw - a.walk.yaw), Math.cos(L.yaw - a.walk.yaw));
        a.walk.yaw += d * q; a.walk.pitch += (L.pitch - a.walk.pitch) * q;
      }
    }
    this.ghostStep(dt);
    if (this.eye) {
      const v = (this.vec || (this.vec = new a.THREE.Vector3())).copy(this.capP).project(a.camera), f = this.ui.photo;
      f.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${Math.max(118, (-v.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px)`;
      f.classList.toggle('on', v.z < 1 && Math.abs(v.x) < 0.9 && st.followK < 0.25);
    }
    this.hudTick(dt);
    this.paint();
  }
  // ---- the suit display ----
  // Each instrument comes on when the walk first needs it and reads the plan's own track and grids.
  hudTick(dt) {
    const a = this.app, st = a.state, sc = st.sched, V = this.vis, t = st.walkT, ph = this.phase, S = this.shown;
    const live = this.el.classList.contains('g-hud');
    const here = along(sc, t);
    // effort: the plan's metabolic rate at this step. Standing still it falls to the model's standing rate.
    const A = Math.max(0, t - 5), B = Math.min(sc.total, t + 5);
    const plan = B > A ? (along(sc, B).e - along(sc, A).e) / (B - A) : SUIT.stationW;
    const want = ph === 'site' ? SUIT.stationW : ph === 'leg' ? lerp(this.standW, plan, clamp(this.v, 0, 1)) : this.standW;
    this.w = this.w === null ? want : this.w + (want - this.w) * (1 - Math.exp(-dt * 2.4));
    const pct = here.e / this.budget * 100;
    const drill = ph === 'drill';
    let mins = st.walkback ? a.planner.sampleGrid(st.walkback, here.x, here.z) : NaN;
    if (drill && st.abort) mins = st.abort.total / 60;
    const gap = this.gap, lost = !!gap && t >= gap.from && t < gap.to - 0.5;
    V.show('eff', live && (!!this.flag.pace || t > 15));
    V.show('o2', live && (!!this.flag.pace || t > 15));
    V.show('en', live && this.samples >= this.half);
    V.show('sh', live && isFinite(mins) && (isFinite(this.drillT) ? drill || t >= this.drillT - 0.5 : this.samples >= this.half));
    V.show('rad', live && lost);
    const steep = ph === 'leg' && this.steep.some(q => t >= q.from - 3 && t <= q.to + 2);
    V.show('stp', live && steep);
    let gi = 0; { const tr = sc.track, N = tr.length / 5; let lo = 0, hi = N - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m * 5 + 3] <= t) lo = m; else hi = m; } gi = lo; }
    this.gd = (this.gd || 0) + (this.grade[gi] - (this.gd || 0)) * (1 - Math.exp(-dt * 3));
    V.show('dose', live && drill);
    // the numbers step a few times a second, the way an instrument does. The bars move every frame.
    this.hudT -= dt;
    if (this.hudT <= 0 || S.w === undefined) {
      this.hudT = 0.22;
      S.w = Math.round(this.w); S.pct = Math.round(pct); S.min = isFinite(mins) ? Math.ceil(mins - 1e-6) : 0;
      S.gd = Math.round(this.gd); S.o2 = (here.e / 1e6 * SUIT.o2KgPerMJ).toFixed(2);
      S.dose = Math.round(SUIT.doseMSvPerDay * t / 86400 * 1000); S.gap = gap ? Math.max(0, Math.round(gap.d - here.d)) : 0;
    }
    V.val('eff', S.w, this.w / 700, { at: SUIT.maxW / 700 });
    V.tone('eff', 'warn', this.w > SUIT.maxW);
    // oxygen used so far, from the same energy track the planner reports. The mark is the plan's total.
    V.val('o2', S.o2, pct / 100, { at: sc.energy / this.budget, under: true });
    V.val('en', S.pct, pct / 100, { at: sc.energy / this.budget, under: true });
    V.val('sh', S.min, (isFinite(mins) ? mins : 0) / 20);
    V.val('stp', S.gd, this.gd / 25, { at: SUIT.maxGradeDeg / 25 });
    V.val('dose', S.dose); V.extra('dose', '×2');
    if (gap) V.val('rad', S.gap, clamp((gap.d - here.d) / Math.max(1, gap.m), 0, 1));
    V.tick(dt, a.walk.yaw, a.walk.pitch || 0, ph === 'leg' ? clamp(this.v, 0, 1) : 0);
    // the ground layer under a site, and its tag
    const G = this.ground;
    for (const L in this.gl) {
      const to = G && G.layer === L ? 1 : 0, v = this.gl[L];
      if (v !== to) { const nv = Math.abs(to - v) < 0.012 ? to : v + (to - v) * (1 - Math.exp(-dt * 1.5)); this.gl[L] = nv; a.terrain.setLayer(L, nv); }
    }
    if (G && live) {
      if (!this.vec) this.vec = new a.THREE.Vector3();
      // the tag's mark sits on the ground at the edge of the site ring. In first person it is fixed a few steps ahead.
      const e = a.camera.matrixWorld.elements, fp = this.fp;
      if (G.fp !== fp) G.set = 1.4;   // the camera takes a moment to settle into a view
      if (!fp || (G.set -= dt) > 0) {
        const dx = fp ? -e[8] : e[0], dz = fp ? -e[10] : e[2], l = Math.hypot(dx, dz) || 1, r = fp ? 7 : 1.05;
        const bx = fp ? e[12] : here.x, bz = fp ? e[14] : here.z;   // measured from where the walker stands
        G.x = bx + dx / l * r; G.z = bz + dz / l * r; G.y = a.heightAt(G.x, G.z);
      }
      G.fp = fp;
      const v = this.vec.set(G.x, G.y + 0.05, G.z).project(a.camera), iw = innerWidth, ih = innerHeight, ph2 = iw <= 900;
      const px = (v.x * 0.5 + 0.5) * iw, py = (-v.y * 0.5 + 0.5) * ih;
      V.tagEl.classList.toggle('far', v.z > 1 || px < -40 || px > iw + 40 || py < 60);
      V.tag(G.word, G.value, ph2);
      V.tagAt(px, Math.min(py, ih - (ph2 ? 262 : 190)), iw - 12 - px);
    } else V.tag(null);
  }
}
