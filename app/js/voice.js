// The voice track of the Mission.
// The clips are made ahead of time from the "say" channel of mission_copy.js (tools/make_vo.py) and
// listed in audio/vo/index.json next to the exact sentence each one speaks. A clip is played only
// when the sentence the live plan produces is that same sentence, so the voice cannot state a number
// the plan no longer has. With no clip, or with the sound off, the Mission is text only.
export class Voice {
  constructor(base = 'audio/vo/') {
    this.base = base; this.clips = null; this.raw = new Map(); this.buf = new Map();
    this.ctx = null; this.out = null; this.cur = null; this.muted = false; this.played = []; this.stale = [];
    try { this.muted = localStorage.getItem('marcher.voice') === 'off'; } catch { /* storage blocked */ }
  }
  // fetch the list and the bytes. Decoding waits for unlock(), which needs a click or a key.
  async load() {
    try {
      const r = await fetch(this.base + 'index.json');
      if (!r.ok) return;
      const idx = await r.json(), keys = Object.keys(idx.clips || {});
      this.clips = idx.clips;
      for (let i = 0; i < keys.length; i += 6) {
        await Promise.all(keys.slice(i, i + 6).map(async k => {
          try {
            const res = await fetch(this.base + this.clips[k].f);
            if (!res.ok) return;
            this.raw.set(k, await res.arrayBuffer());
            if (this.ctx) this.decode(k);
          } catch { /* this line stays text only */ }
        }));
      }
    } catch { /* no voice track: text only */ }
  }
  decode(k) {
    const ab = this.raw.get(k);
    if (!ab) return;
    this.raw.delete(k);
    try { this.ctx.decodeAudioData(ab, b => this.buf.set(k, b), () => {}); } catch { /* undecodable */ }
  }
  // call from a click or a key press
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { navigator.audioSession.type = 'playback'; } catch { /* not Safari */ }
      try { this.ctx = new AC(); } catch { return; }
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
      for (const k of [...this.raw.keys()]) this.decode(k);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }
  // seconds of speech ready for this line, or 0 when it has to be text only
  ready(k, text) {
    const c = this.clips?.[k], b = this.buf.get(k);
    if (c && c.t !== text && !this.stale.includes(k)) this.stale.push(k);
    return !this.muted && c && b && c.t === text && this.ctx?.state === 'running' ? b.duration : 0;
  }
  play(k) {
    this.stop();
    const b = this.buf.get(k);
    if (!b || !this.ctx) return 0;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = b; src.connect(g); g.connect(this.out);
    g.gain.value = this.level(k); src.start();
    const cur = this.cur = { src, g, k };
    src.onended = () => { if (this.cur === cur) this.cur = null; };
    this.played.push(k);
    return b.duration;
  }
  // each voice has one gain, set when the clips were made, so both sit at the same loudness
  level(k) { const g = this.clips?.[k]?.g; return g > 0 ? g : 1; }
  stop(fade = 0.09) {
    const c = this.cur;
    if (!c) return;
    this.cur = null;
    const t = this.ctx.currentTime;
    try { c.g.gain.setValueAtTime(this.level(c.k), t); c.g.gain.linearRampToValueAtTime(0, t + fade); c.src.stop(t + fade + 0.02); } catch { /* already over */ }
  }
  setMuted(m) {
    this.muted = !!m;
    if (m) this.stop();
    try { localStorage.setItem('marcher.voice', m ? 'off' : 'on'); } catch { /* storage blocked */ }
  }
}
