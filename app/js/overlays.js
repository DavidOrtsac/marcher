// 3D overlays: the route ribbon draped on the terrain, the walker marker,
// and DOM pins that follow stops on screen.
import * as THREE from '../vendor/three.module.min.js';

const RIBBON_VS = /* glsl */`
attribute float side;
attribute float along;
varying float vAlong;
varying float vSide;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec3 p = position;
  vAlong = along; vSide = side;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  #include <logdepthbuf_vertex>
}`;
const RIBBON_FS = /* glsl */`
uniform float uTime;
uniform float uDone;     // metres already walked (drawn dimmer)
uniform float uDash;
uniform vec3 uColor;
varying float vAlong;
varying float vSide;
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
  float flow = fract((vAlong - uTime * 6.0) / uDash);
  float chev = smoothstep(0.0, 0.08, flow) * (1.0 - smoothstep(0.35, 0.5, flow));
  float a = edge * (0.55 + 0.45 * chev);
  vec3 c = uColor * (vAlong < uDone ? 0.45 : 1.0);
  gl_FragColor = vec4(c, a * (vAlong < uDone ? 0.5 : 0.92));
}`;

export class RouteRibbon {
  constructor(scene) {
    this.uniforms = {
      uWidth: { value: 6 }, uLift: { value: 0.6 }, uTime: { value: 0 }, uDone: { value: -1 },
      uDash: { value: 24 }, uColor: { value: new THREE.Color(1, 1, 1) },
    };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VS, fragmentShader: RIBBON_FS, uniforms: this.uniforms,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }
  // track: Float32Array [x, y, z, t, e] * n ; heightAt refines y on the visible mesh
  set(track, heightAt) {
    const n = track.length / 5;
    if (n < 2) { this.mesh.visible = false; return; }
    // resample every 1 m so the ribbon hugs the terrain
    const P = [];
    for (let k = 0; k < n - 1; k++) {
      const ax = track[k * 5], az = track[k * 5 + 2], bx = track[k * 5 + 5], bz = track[k * 5 + 7];
      const d = Math.hypot(bx - ax, bz - az);
      if (d < 0.05) continue; // dwell entries repeat the same point
      const m = Math.max(1, Math.ceil(d / 1.0));
      for (let i = 0; i < m; i++) { const f = i / m; P.push([ax + (bx - ax) * f, az + (bz - az) * f]); }
    }
    P.push([track[(n - 1) * 5], track[(n - 1) * 5 + 2]]);
    const pos = [], tan = [], side = [], along = [];
    let acc = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(i - 3, 0)], b = P[Math.min(i + 3, P.length - 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      if (i > 0) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      for (const s of [-1, 1]) { pos.push(P[i][0], 0, P[i][1]); tan.push(-tz, 0, tx); side.push(s); along.push(acc); }
    }
    const idx = [];
    for (let i = 0; i < P.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.centre = new Float32Array(pos); this.normal = new Float32Array(tan); this.sides = new Float32Array(side);
    this.heightAt = heightAt;
    g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
    g.setIndex(idx);
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    this.mesh.visible = true;
    this.length = acc;
    this.samples = P;
    this.applyWidth();
  }
  // place the ribbon's edges on the terrain at the current width and lift
  applyWidth() {
    const g = this.mesh.geometry, p = g.attributes.position;
    if (!p || !this.centre) return;
    const w = this.uniforms.uWidth.value * 0.5, lift = this.uniforms.uLift.value;
    for (let i = 0; i < p.count; i++) {
      const x = this.centre[i * 3] + this.normal[i * 3] * this.sides[i] * w;
      const z = this.centre[i * 3 + 2] + this.normal[i * 3 + 2] * this.sides[i] * w;
      p.setXYZ(i, x, this.heightAt(x, z) + lift, z);
    }
    p.needsUpdate = true;
    g.computeBoundingSphere();
  }
  // re-drape on the current best heights (after detail tiles load)
  redrape() { this.applyWidth(); }
  setWidth(w, lift, dash) { this.uniforms.uWidth.value = w; this.uniforms.uLift.value = lift; if (dash) this.uniforms.uDash.value = dash; this.applyWidth(); }
}

export class Pins {
  constructor(root, camera, onPick) {
    this.root = root; this.camera = camera; this.onPick = onPick; this.items = [];
  }
  set(list) {
    this.root.innerHTML = '';
    this.items = list.map((p) => {
      const el = document.createElement('div');
      el.className = 'pin' + (p.kind === 'rover' ? ' rover' : '');
      el.innerHTML = `<div class="tag"><span class="k">${p.key}</span><span>${p.label}</span></div><div class="stem"></div>`;
      el.addEventListener('click', () => this.onPick && this.onPick(p));
      this.root.appendChild(el);
      return { p, el, v: new THREE.Vector3(p.x, p.y, p.z) };
    });
  }
  update(w, h, visible = true) {
    const placed = [];
    for (const it of this.items) {
      const v = it.v.clone().project(this.camera);
      const on = visible && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      it.el.classList.toggle('hidden', !on);
      if (!on) continue;
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      it.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      // declutter: a label that would overlap an earlier one shows only its number
      if (!it.size) { const r = it.el.getBoundingClientRect(); it.size = [r.width, r.height]; }
      const bw = it.size[0], bh = 26;
      const box = [x - bw / 2, y - it.size[1], x + bw / 2, y - it.size[1] + bh];
      const hit = placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
      it.el.classList.toggle('short', hit);
      if (!hit) placed.push(box);
    }
  }
}

// Curiosity's photos hung in 3D: each frame is a quad whose corners lie along the
// camera's own corner rays (from its CAHVOR model), at a fixed distance from the
// camera position. Seen from that position, the photo lines up with the terrain.
export class PhotoBubbles {
  constructor(scene, base) {
    this.group = new THREE.Group();
    this.group.renderOrder = 10;
    scene.add(this.group);
    this.base = base;
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
    this.opacity = 0;
    this.target = 0;
  }
  // Per-photo alpha: wide feathered edges so overlapping photos cross-fade, and a
  // fade to nothing above the photo's own skyline (im.sky from tools/pov_blend.py)
  // so the rendered sky shows instead of the grey camera sky.
  alphaFor(im) {
    const N = 96, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    const sky = im.sky && im.sky.some(v => v > 0) ? im.sky : null;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N, v = (y + 0.5) / N;
      const e = Math.min(u, 1 - u, v, 1 - v);
      let a = Math.min(1, e / 0.16); a = a * a * (3 - 2 * a);
      if (sky) {
        const f = Math.max(0, Math.min(sky.length - 1, u * sky.length - 0.5)), i = Math.floor(f), j = Math.min(sky.length - 1, i + 1);
        const line = sky[i] + (sky[j] - sky[i]) * (f - i);
        if (line > 0) { let k = Math.max(0, Math.min(1, (v - (line - 0.045)) / 0.045)); a *= k * k * (3 - 2 * k); }
      }
      const o = (y * N + x) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(255 * a); img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }
  show(images, dist = 30) {
    this.clear();
    for (const im of images) {
      const p = new THREE.Vector3(...im.pos);
      const pts = im.corners.map(c => p.clone().addScaledVector(new THREE.Vector3(...c), dist));
      // corner rays from the index: top-left, top-right, bottom-right, bottom-left
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...pts[0].toArray(), ...pts[1].toArray(), ...pts[2].toArray(), ...pts[3].toArray()], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      let tex = this.cache.get(im.file);
      if (!tex) { tex = this.loader.load(this.base + im.file); tex.colorSpace = THREE.SRGBColorSpace; this.cache.set(im.file, tex); }
      const m = new THREE.MeshBasicMaterial({ map: tex, alphaMap: this.alphaFor(im), color: new THREE.Color().setScalar(im.gain || 1), transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(g, m);
      mesh.renderOrder = 10;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.target = 1;
  }
  clear() { for (const m of this.group.children) { m.geometry.dispose(); m.material.alphaMap?.dispose(); m.material.dispose(); } this.group.clear(); }
  hide() { this.target = 0; }
  update(dt) {
    this.opacity += (this.target - this.opacity) * Math.min(1, dt * 3);
    for (const m of this.group.children) m.material.opacity = this.opacity * 0.92;
    this.group.visible = this.opacity > 0.01;
  }
}
