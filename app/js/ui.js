// DOM interface: brand, clock, plan panel, layers, timeline, walk HUD, rover views.
const $ = (sel, el = document) => el.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
export const fmtHM = (hours) => { const m = Math.round(hours * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export const fmtDur = (sec) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const IC = {
  add: 'M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10zM12 8.5v5M9.5 11h5',
  reset: 'M4 11l8-7 8 7M6 10v9h12v-9',
  drill: 'M13 3L5 14h6l-1 7 8-11h-6z',
  exp: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  src: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
};

export class UI {
  constructor(root, on) {
    this.root = root; this.on = on;
    root.innerHTML = `
      <div id="brand"><div class="word">MARCHER</div><div class="site"></div><div class="coord"></div></div>
      <div id="clock" class="hit"><div class="big"><button class="solb" data-d="-1" aria-label="Previous sol">‹</button><span class="t"></span><button class="solb" data-d="1" aria-label="Next sol">›</button></div><div class="sub"></div></div>
      <div id="pins"></div>
      <div id="appbar" class="hit"><button class="mark" data-a="title" aria-label="MARCHER title screen"><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="#b5532a"/><path d="M7 18c3-1 3-6 6-6s3 4 8-3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="18" r="1.8" fill="#fff"/></svg></button><div class="doc"><div class="dn"><span class="t"></span><span class="s"></span></div><div class="menus">${['File', 'Edit', 'View', 'Tools', 'Help'].map(n => `<button data-k="${n.toLowerCase()}">${n}</button>`).join('')}</div></div></div>
      <div id="toolbar" class="hit"><button data-a="add">${ic(IC.add)}Add stop</button><button data-a="reset">${ic(IC.reset)}Reset view</button><button data-a="drill">${ic(IC.drill)}Storm drill</button><i class="sep"></i><button data-a="export">${ic(IC.exp)}Export</button><button data-a="sources">${ic(IC.src)}NASA data</button></div>
      <div id="nav" class="hit"><button data-a="north" class="cmp" aria-label="North up"><svg viewBox="0 0 24 24" aria-hidden="true"><g class="needle"><path d="M12 3l3.2 9H8.8z" fill="#d93025"/><path d="M12 21l3.2-9H8.8z" fill="#9aa0a6"/></g></svg></button><button data-a="tilt" class="tilt" aria-label="Switch between top-down and tilted view">2D</button><div class="zoom"><button data-a="zin" aria-label="Zoom in">${ic(IC.plus)}</button><button data-a="zout" aria-label="Zoom out">${ic(IC.minus)}</button></div></div>
      <div id="status"><div class="scale"><i></i><span></span></div><div class="cam"></div><div class="cur"></div><div class="credit">Terrain: MRO HiRISE stereo, 1 m</div></div>
      <div id="menu" class="hit"></div>
      <div id="toast"></div>
      <div id="about" class="hit"><div class="card"><button class="x" aria-label="Close">×</button><div class="nm">MARCHER</div><div class="full">Mars Mission Activity, Route, Consumables, Hazard &amp; EVA Resource planner</div><p>Built by Transcendiant Labs, Manila, for the NASA Space Apps Challenge 2026. Challenge: Interplanetary Survival Guide: Martian Map.</p><p>Every map layer is built from NASA mission data. Help, NASA data used lists each source.</p><p>Drag turns the map. Right-drag or Shift-drag moves it. The wheel zooms. Click the ground to read it.</p><p class="lic">Apache License 2.0</p></div></div>
      <div id="plan" class="glass hit">
        <div class="head"><div class="lab">EVA plan</div><div class="title"></div><div class="goal"></div></div>
        <div class="verdict"><div class="badge"></div><div class="why"></div></div>
        <div class="compare"></div>
        <div class="stats"></div>
        <div class="stops"></div>
        <div class="notes"></div>
      </div>
      <button id="layerbtn" class="hit" aria-label="Map layers">LAYERS</button>
      <div id="layers" class="glass hit"><div class="lab">Layers</div><div class="list"></div><button class="srcbtn">NASA data used</button></div>
      <div id="sources" class="glass hit"><button class="x" aria-label="Close">×</button><div class="lab">NASA data in this map</div><div class="list"></div></div>
      <div id="modes" class="glass hit"><button data-m="plan" class="on">PLAN</button><button data-m="walk">WALK</button></div>
      <div id="time" class="glass hit"><canvas></canvas><div class="notes"></div></div>
      <div id="hud">
        <div class="tape"><canvas></canvas></div>
        <div class="alert"></div>
        <div class="suit glass"></div>
        <div class="next glass"><div class="lab">Next stop</div><div class="nm"></div><div class="row"></div></div>
        <div class="walkbar glass"><button data-w="pause">PAUSE</button><button data-w="1" >1×</button><button data-w="30" class="on">30×</button><button data-w="120">120×</button><button data-w="drill" class="drill">STORM DRILL</button></div>
      </div>
      <div id="pov" class="glass hit"><img alt=""><div class="cap"><div class="lab"></div><div class="nm"></div><div class="meta"></div></div><div class="strip"></div></div>`;
    root.querySelectorAll('#modes button').forEach(b => b.addEventListener('click', () => on.mode(b.dataset.m)));
    root.querySelectorAll('#clock .solb').forEach(b => b.addEventListener('click', () => on.sol(+b.dataset.d)));
    root.querySelectorAll('#hud .walkbar button').forEach(b => b.addEventListener('click', () => on.walkRate(b.dataset.w)));
    $('#layers .srcbtn', root).addEventListener('click', () => this.toggleSources());
    // app bar, toolbar and map buttons all send one named action
    root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => on.action(b.dataset.a)));
    root.querySelectorAll('#appbar .menus button').forEach(b => {
      b.addEventListener('click', () => { if (this._menu === b.dataset.k) this.closeMenu(); else this.openMenu(b.dataset.k); });
      b.addEventListener('pointerenter', () => { if (this._menu && this._menu !== b.dataset.k) this.openMenu(b.dataset.k); });
    });
    addEventListener('pointerdown', (e) => { if (this._menu && !e.target.closest('#menu, #appbar .menus')) this.closeMenu(); }, true);
    $('#about', root).addEventListener('click', (e) => { if (e.target.id === 'about' || e.target.closest('.x')) this.closeAbout(); });
    $('#sources .x', root).addEventListener('click', () => this.closeSources());
    $('#layerbtn', root).addEventListener('click', () => document.body.classList.toggle('layers-open'));
    this.timeline = new Timeline($('#time canvas', root), on);
    this.tape = new Tape($('#hud .tape canvas', root));
  }

  // each row is plain text. Only the small address under it is a link, so a stray click never leaves the map.
  setSources(list) {
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };
    $('#sources .list', this.root).innerHTML = list.map(s => `<div class="src"><div class="m">${s.mission}</div><div class="nm">${s.name}</div><div class="use">${s.use}</div><a href="${s.url}" target="_blank" rel="noopener">${host(s.url)}</a></div>`).join('');
  }
  // true when the list was open and is now closed
  closeSources() { const el = $('#sources', this.root), was = el.classList.contains('on'); el.classList.remove('on'); return was; }
  // one line per note under the timeline (and at the foot of the plan on phones)
  setNotes(list) {
    const html = list.map(n => `<div class="${n.cls || ''}"><b>${n.k}</b>${n.v}</div>`).join('');
    this.root.querySelectorAll('.notes').forEach(el => { if (el.innerHTML !== html) el.innerHTML = html; });
  }
  setSite(name, coord) { $('#brand .site', this.root).textContent = name; $('#brand .coord', this.root).textContent = coord; $('#appbar .dn .s', this.root).textContent = name; }
  toggleSources() { $('#sources', this.root).classList.toggle('on'); }

  // menus: [label, action, disabled, checked]. A null action is a feature that is not built yet. An object action is a map layer.
  menuItems(k) {
    const L = this._layers || [], none = !this._hasCustom;
    return {
      file: [['Reset plan', 'reset-plan'], ['Export plan as GeoJSON', 'export'], ['Export stops as CSV', 'export-csv'], ['Back to the title screen', 'title'], 0, ['Import plan', null]],
      edit: [['Remove last added stop', 'undo-add', none], ['Remove all added stops', 'clear-added', none]],
      view: [...L.map(l => [l.name, l, false, l.on]), 0, ['Top-down (2D)', 'tilt2d'], ['Tilted (3D)', 'tilt3d'], ['North up', 'north'], ['Zoom in', 'zin'], ['Zoom out', 'zout'], ['Reset view', 'reset'], 0, ['Walk view', 'walk']],
      tools: [['Add stop', 'add'], ['Solar storm drill', 'drill'], ['Plan for previous sol', 'sol-1'], ['Plan for next sol', 'sol+1'], 0, ['Measure distance', null], ['Second astronaut', null], ['Crew rover leg', null]],
      help: [['NASA data used', 'sources'], ['Replay the Demo', 'demo'], ['About MARCHER', 'about']],
    }[k];
  }
  openMenu(k) {
    const m = $('#menu', this.root), btn = $(`#appbar .menus [data-k="${k}"]`, this.root);
    this._menu = k;
    this.root.querySelectorAll('#appbar .menus button').forEach(b => b.classList.toggle('on', b === btn));
    m.innerHTML = '';
    for (const it of this.menuItems(k)) {
      if (!it) { m.appendChild(h('div', 'sep')); continue; }
      const [name, a, off, chk] = it;
      const row = h('button', 'mi' + (a === null ? ' soon' : '') + (off ? ' off' : ''), `<i>${chk ? '✓' : ''}</i><span>${name}</span>${a === null ? '<em>Soon</em>' : ''}`);
      row.addEventListener('click', () => {
        if (off) return;
        this.closeMenu();
        if (a === null) this.toast(`${name} is coming soon`);
        else if (typeof a === 'object') { a.on = !a.on; this.on.layer(a); this.setLayers(this._layers); }
        else this.on.action(a);
      });
      m.appendChild(row);
    }
    m.style.left = btn.getBoundingClientRect().left + 'px';
    m.classList.add('on');
  }
  closeMenu() {
    if (!this._menu) return false;
    this._menu = null; $('#menu', this.root).classList.remove('on');
    this.root.querySelectorAll('#appbar .menus button').forEach(b => b.classList.remove('on'));
    return true;
  }
  toast(msg) { const t = $('#toast', this.root); t.textContent = msg; t.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), 2200); }
  showAbout() { $('#about', this.root).classList.add('on'); }
  closeAbout() { $('#about', this.root).classList.remove('on'); }
  // bottom bar and compass. Text is written only when it changes.
  setStatus({ scalePx, scaleLabel, cam, cur, az, flat }) {
    const set = (sel, v) => { const e = $(sel, this.root); if (e.textContent !== v) e.textContent = v; };
    $('#status .scale i', this.root).style.width = scalePx + 'px';
    set('#status .scale span', scaleLabel); set('#status .cam', cam); set('#status .cur', cur);
    $('#nav .needle', this.root).setAttribute('transform', `rotate(${(az * 180 / Math.PI).toFixed(1)} 12 12)`);
    set('#nav .tilt', flat ? '3D' : '2D');
  }

  setClock({ sol, lmst, utc, ls, sunEl }) {
    $('#clock .big .t', this.root).innerHTML = `SOL ${sol}<span class="sep">|</span>${fmtHM(lmst)} <span class="unit">LMST</span>`;
    const d = new Date(utc);
    const iso = d.toISOString();
    $('#clock .sub', this.root).innerHTML = `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC &nbsp;·&nbsp; Ls ${ls.toFixed(1)}° &nbsp;·&nbsp; SUN <b>${sunEl.toFixed(1)}°</b>`;
  }

  setMode(m) {
    document.body.classList.toggle('walking', m === 'walk');
    this.root.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    $('#hud', this.root).classList.toggle('on', m === 'walk');
  }

  setPlan(v) {
    const p = $('#plan', this.root);
    $('.title', p).textContent = v.title;
    $('#appbar .dn .t', this.root).textContent = v.title;
    this._hasCustom = v.stops.some(s => s.custom);
    $('.goal', p).textContent = v.goal;
    const b = $('.badge', p);
    b.className = 'badge ' + v.verdict.level;
    b.textContent = { go: 'GO', caution: 'CAUTION', nogo: 'NO-GO' }[v.verdict.level];
    $('.why', p).innerHTML = v.verdict.why;
    const cmp = $('.compare', p); cmp.innerHTML = v.compare || ''; cmp.style.display = v.compare ? '' : 'none';
    $('.stats', p).innerHTML = v.stats.map(s => `<div><div class="lab">${s.k}</div><div class="v num ${s.cls || ''}">${s.v}<span class="unit">${s.u || ''}</span></div></div>`).join('');
    const list = $('.stops', p);
    list.innerHTML = '';
    for (const s of v.stops) {
      const row = h('div', 'stop' + (s.kind === 'rover' ? ' rover' : ''));
      row.innerHTML = `<div class="n">${s.key}</div><div class="nm">${s.name}</div><div class="t">${s.time}</div><div class="d">${s.desc}${s.custom ? '<button class="rm">REMOVE</button>' : ''}</div>`;
      row.addEventListener('click', (e) => { if (e.target.closest('.rm')) this.on.removeStop(s.id); else this.on.pickStop(s.id); });
      row.dataset.id = s.id;
      list.appendChild(row);
    }
  }
  highlightStop(id) { this.root.querySelectorAll('.stop').forEach(r => r.classList.toggle('on', r.dataset.id === id)); }

  setLayers(list) {
    const box = $('#layers .list', this.root);
    this._layers = list;
    box.innerHTML = '';
    for (const L of list) {
      const row = h('div', 'layer' + (L.on ? ' on' : ''));
      row.innerHTML = `<div><div class="nm">${L.name}</div><div class="src">${L.src}</div></div><div class="sw"></div>`;
      row.addEventListener('click', () => { L.on = !L.on; row.classList.toggle('on', L.on); this.on.layer(L); });
      box.appendChild(row);
      if (L.legend) { const lg = h('div', 'legend', L.legend); box.appendChild(lg); }
    }
  }

  setHud(v) {
    const hud = $('#hud', this.root);
    $('.suit', hud).innerHTML = v.suit.map(s => `<div><div class="lab">${s.k}</div><div class="v num ${s.cls || ''}">${s.v}<span class="unit">${s.u || ''}</span></div></div>`).join('');
    $('.next .nm', hud).textContent = v.next.name;
    $('.next .lab', hud).textContent = v.next.label || 'Next stop';
    $('.next .row', hud).innerHTML = v.next.row.map(s => `<div><div class="lab">${s.k}</div><div class="v num">${s.v}<span class="unit">${s.u || ''}</span></div></div>`).join('');
    const al = $('.alert', hud);
    al.classList.toggle('on', !!v.alert);
    al.textContent = v.alert || '';
  }
  setWalkRate(r) { this.root.querySelectorAll('#hud .walkbar button').forEach(b => b.classList.toggle('on', b.dataset.w === String(r))); }

  showPov(stop, images, idx = 0) {
    const card = $('#pov', this.root);
    if (!stop || !images || !images.length) { card.classList.remove('on'); return; }
    const im = images[idx];
    $('img', card).src = im.src;
    $('.lab', card).textContent = `Curiosity saw this · Sol ${im.sol}`;
    $('.nm', card).textContent = stop.name;
    $('.meta', card).textContent = `${im.camera} · looking ${im.dir} · ${im.lmst} LMST · ${im.rec?.credit || 'NASA/JPL-Caltech'}`;
    const strip = $('.strip', card);
    strip.innerHTML = '';
    images.forEach((m, k) => {
      const t = h('img', k === idx ? 'on' : ''); t.src = m.src; t.alt = '';
      t.addEventListener('click', () => this.showPov(stop, images, k));
      strip.appendChild(t);
    });
    card.classList.add('on');
  }
}

// Sol timeline: Sun elevation band, EVA bar with stops, cursor.
export class Timeline {
  constructor(canvas, on) {
    this.c = canvas; this.on = on; this.model = null;
    const pick = (e) => {
      const r = this.c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      return this.x0h + x * (this.x1h - this.x0h);
    };
    this.c.addEventListener('pointerdown', (e) => {
      if (!this.model) return;
      this.c.setPointerCapture(e.pointerId);
      const hr = pick(e), ev = this.model.eva;
      this.drag = (ev && hr > ev.start && hr < ev.end && e.offsetY > this.c.clientHeight * 0.42) ? { kind: 'eva', off: hr - ev.start } : { kind: 'cursor' };
      if (this.drag.kind === 'cursor') on.scrub(hr);
    });
    this.c.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const hr = pick(e);
      if (this.drag.kind === 'cursor') on.scrub(hr); else on.moveEva(hr - this.drag.off);
    });
    addEventListener('pointerup', () => { if (this.drag && this.drag.kind === 'eva') on.moveEvaDone(); this.drag = null; });
    this.x0h = 0; this.x1h = 24;
  }
  draw(m) {
    this.model = m;
    const c = this.c, dpr = Math.min(devicePixelRatio, 2);
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const narrow = W < 600;
    const L = narrow ? 40 : 112, R = W - 8;
    const X = (hr) => L + (hr - this.x0h) / (this.x1h - this.x0h) * (R - L);
    // the canvas inherits the panel's tokens, so it follows the light planning chrome or the dark one
    const css = getComputedStyle(c), light = css.getPropertyValue('--acc').trim() !== '';
    const dim = css.getPropertyValue('--dim'), faint = css.getPropertyValue('--faint'), text = css.getPropertyValue('--text').trim() || '#f3ede6';
    const line = light ? '#e3e6ea' : 'rgba(255,240,225,0.10)', lineStrong = light ? '#c4c8cd' : 'rgba(255,240,225,0.16)';
    const fn = light ? 'system-ui, sans-serif' : 'Rajdhani, sans-serif', fl = light ? 'system-ui, sans-serif' : 'Jost, sans-serif';
    const sunY0 = 30, sunH = 22;      // sun band
    const evaY = 62, evaH = 14;        // EVA bar
    g.font = `500 10.5px ${fl}`; g.fillStyle = dim; g.textBaseline = 'middle';
    const label = (t, y) => { g.save(); g.letterSpacing = light ? '0.4px' : '2px'; g.fillText(t, 0, y); g.restore(); };
    label('SUN', sunY0 + sunH / 2 - 4); label('EVA', evaY + evaH / 2);
    // hour grid
    g.font = `500 11px ${fn}`;
    for (let hr = 0; hr <= 24; hr += 1) {
      const x = X(hr);
      g.strokeStyle = hr % 6 === 0 ? lineStrong : line;
      g.beginPath(); g.moveTo(x + .5, 22); g.lineTo(x + .5, H - 4); g.stroke();
      if (hr % (narrow ? 4 : 2) === 0 && hr < 24) { g.fillStyle = faint; g.textAlign = 'left'; g.fillText(String(hr).padStart(2, '0'), x + 3, 12); }
    }
    g.textAlign = 'left';
    // Sun elevation: gold where above the horizon, height = elevation
    if (m.sun) {
      const maxEl = 90;
      const base = sunY0 + sunH;
      const grad = g.createLinearGradient(0, base, 0, sunY0 - 6);
      grad.addColorStop(0, 'rgba(184,100,15,0.35)'); grad.addColorStop(1, 'rgba(255,200,87,0.85)');
      g.beginPath(); g.moveTo(X(m.sun[0].h), base);
      for (const s of m.sun) g.lineTo(X(s.h), base - Math.max(0, s.el) / maxEl * (sunH + 6));
      g.lineTo(X(m.sun[m.sun.length - 1].h), base); g.closePath();
      g.fillStyle = grad; g.fill();
      g.strokeStyle = lineStrong; g.beginPath(); g.moveTo(L, base + .5); g.lineTo(R, base + .5); g.stroke();
      g.fillStyle = css.getPropertyValue('--sun'); g.font = `600 11px ${fn}`;
      if (m.sunrise !== undefined) { g.fillText('↑ ' + fmtHM(m.sunrise), X(m.sunrise) - 46, base + 9); }
      if (m.sunset !== undefined) { g.fillText(fmtHM(m.sunset) + ' ↓', X(m.sunset) + 4, base + 9); }
    }
    // EVA bar
    if (m.eva) {
      const ev = m.eva;
      g.fillStyle = light ? '#e9ebee' : 'rgba(255,240,225,0.10)';
      g.fillRect(X(ev.start), evaY, X(ev.end) - X(ev.start), evaH);
      for (const seg of ev.segs) {
        g.fillStyle = seg.kind === 'walk' ? (light ? '#3c4043' : 'rgba(243,237,230,0.85)') : (light ? '#b9bec4' : 'rgba(243,237,230,0.35)');
        g.fillRect(X(seg.a), evaY + (seg.kind === 'walk' ? 4 : 0), Math.max(1, X(seg.b) - X(seg.a)), seg.kind === 'walk' ? evaH - 8 : evaH);
      }
      g.font = `700 11px ${fn}`; g.fillStyle = text; g.textAlign = 'center';
      for (const s of ev.stops) g.fillText(s.key, X(s.h), evaY + evaH + 10);
      g.textAlign = 'left';
      g.font = `600 12px ${fn}`; g.fillStyle = dim;
      g.textAlign = 'right'; g.fillText(fmtHM(ev.start), X(ev.start) - 5, evaY + evaH / 2); g.textAlign = 'left';
      g.fillText(fmtHM(ev.end), X(ev.end) + 5, evaY + evaH / 2);
    }
    // cursor
    if (m.cursor !== undefined) {
      const x = X(m.cursor);
      g.strokeStyle = text; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, 20); g.lineTo(x, evaY + evaH + 2); g.stroke();
      g.fillStyle = text; g.beginPath(); g.moveTo(x - 5, 18); g.lineTo(x + 5, 18); g.lineTo(x, 24); g.fill();
      g.lineWidth = 1;
    }
  }
}

// Visor heading tape: compass with stops, rover and Sun marked.
export class Tape {
  constructor(canvas) { this.c = canvas; }
  draw(heading, marks) {
    const c = this.c, dpr = Math.min(devicePixelRatio, 2), W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const span = 110, px = W / span;
    const X = (b) => { let d = ((b - heading + 540) % 360) - 180; return W / 2 + d * px; };
    g.strokeStyle = 'rgba(243,237,230,0.5)'; g.fillStyle = 'rgba(243,237,230,0.85)';
    g.font = '600 13px Rajdhani, sans-serif'; g.textAlign = 'center';
    for (let b = 0; b < 360; b += 5) {
      const x = X(b); if (x < 0 || x > W) continue;
      const major = b % 45 === 0, mid = b % 15 === 0;
      g.globalAlpha = 1 - Math.abs(x - W / 2) / (W / 2) * 0.8;
      g.beginPath(); g.moveTo(x, 30); g.lineTo(x, major ? 18 : mid ? 23 : 26); g.stroke();
      if (Math.abs(x - W / 2) < 30) continue;        // the heading readout sits here
      if (major) g.fillText(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][b / 45], x, 10);
      else if (mid) { g.font = '500 11px Rajdhani, sans-serif'; g.fillText(String(b).padStart(3, '0'), x, 10); g.font = '600 13px Rajdhani, sans-serif'; }
    }
    g.globalAlpha = 1;
    // marks that would print on top of each other share one label: "2 3"
    const seen = marks.map(m => ({ ...m, x: X(m.bearing) })).filter(m => m.x >= 6 && m.x <= W - 6).sort((a, b) => a.x - b.x);
    const groups = [];
    for (const m of seen) {
      const gr = groups[groups.length - 1];
      if (gr && m.kind !== 'sun' && gr.kind !== 'sun' && m.x - gr.x1 < 13) { gr.x1 = m.x; gr.labels.push(m.label); if (m.color !== '#f3ede6') gr.color = m.color; }
      else groups.push({ x0: m.x, x1: m.x, kind: m.kind, color: m.color, labels: [m.label] });
    }
    for (const gr of groups) {
      const x = (gr.x0 + gr.x1) / 2;
      g.fillStyle = gr.color; g.strokeStyle = gr.color;
      if (gr.kind === 'sun') { g.beginPath(); g.arc(x, 38, 4.5, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.moveTo(x, 33); g.lineTo(x - 5, 42); g.lineTo(x + 5, 42); g.closePath(); g.fill(); }
      g.font = '700 11px Rajdhani, sans-serif'; g.fillText(gr.labels.join(' '), x, 50);
    }
    // heading readout, centred on the tape above the marks
    g.strokeStyle = '#f3ede6'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(W / 2, 18); g.lineTo(W / 2, 30); g.stroke(); g.lineWidth = 1;
    g.fillStyle = '#f3ede6'; g.font = '700 15px Rajdhani, sans-serif';
    g.fillText(String(Math.round(heading) % 360).padStart(3, '0'), W / 2, 10);
  }
}
