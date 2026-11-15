// The astronaut in the follow view: NASA's Z-2 planetary suit prototype (NASA 3D Resources),
// given a skeleton here so it can walk, and a Sun shadow that is its own silhouette.
//
// The model file is one rigid mesh made of 43 separate shells (boots, leg tubes, bearings,
// torso, arms, helmet, backpack). At load the shells are found, each vertex is tied to the
// joints it sits between, and the mesh becomes a skinned mesh. Joint positions below were
// measured on the mesh (metres, x across with +x the figure's left, y up, z forward).
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const J = {
  root: [0, 0.96, 0.015],
  chest: [0, 1.10, 0.0],
  hip: [0.145, 0.92, 0.03], knee: [0.182, 0.50, 0.04], ankle: [0.205, 0.11, 0.025],
  shoulder: [0.30, 1.39, 0.08], elbow: [0.312, 1.30, 0.33], wrist: [0.268, 1.135, 0.535],
};
const B = { root: 0, pelvis: 1, chest: 2, thighL: 3, shinL: 4, footL: 5, thighR: 6, shinR: 7, footR: 8, upperL: 9, foreL: 10, handL: 11, upperR: 12, foreR: 13, handR: 14 };
const CYCLE_M = 1.05;        // ground covered by one full walk cycle (two steps), m
const MAX_HZ = 1.6;          // cycles a second at most, at fast playback
const STANCE = 0.6;          // share of the cycle a foot is on the ground
const REACH = STANCE * CYCLE_M / 2;   // the foot lands this far ahead of the hip and leaves this far behind, m
const SOLE = J.ankle[1];     // ankle height with the boot flat on the ground
const SHADOW_LAYER = 5;
const SH = { s: 0.95, v0: -0.75, v1: 2.15 };   // silhouette frame around the feet, m

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;

export async function loadAstronaut(url) {
  const g = await new GLTFLoader().loadAsync(url);
  return new Astronaut(g.scene);
}

export class Astronaut {
  constructor(gltfScene) {
    let src = null;
    gltfScene.updateMatrixWorld(true);
    gltfScene.traverse((o) => { if (o.isMesh && !src) src = o; });
    const geo = src.geometry.clone();
    geo.applyMatrix4(src.matrixWorld);                // mesh axes to x across, y up, z forward
    const mat = src.material;
    mat.side = THREE.FrontSide; mat.envMapIntensity = 0;
    mat.emissiveMap = mat.map; mat.emissive.set(0x33241a);   // skylight fill on the shaded side, as dusty air gives
    this.skin(geo);
    const mesh = this.mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.layers.enable(SHADOW_LAYER);
    // bones, at the measured joints
    const mk = (name, at, parent, parentAt) => {
      const b = new THREE.Bone(); b.name = name;
      b.position.set(at[0] - parentAt[0], at[1] - parentAt[1], at[2] - parentAt[2]);
      if (parent) parent.add(b);
      return b;
    };
    const mir = (p) => [-p[0], p[1], p[2]];
    const O = [0, 0, 0], bones = [];
    const root = bones[B.root] = mk('root', J.root, null, O);
    const pelvis = bones[B.pelvis] = mk('pelvis', J.root, root, J.root);
    const chest = bones[B.chest] = mk('chest', J.chest, pelvis, J.root);
    for (const [sd, f] of [['L', (p) => p], ['R', mir]]) {
      const th = bones[B['thigh' + sd]] = mk('thigh' + sd, f(J.hip), root, J.root);
      const sh = bones[B['shin' + sd]] = mk('shin' + sd, f(J.knee), th, f(J.hip));
      bones[B['foot' + sd]] = mk('foot' + sd, f(J.ankle), sh, f(J.knee));
      const up = bones[B['upper' + sd]] = mk('upper' + sd, f(J.shoulder), chest, J.chest);
      const fo = bones[B['fore' + sd]] = mk('fore' + sd, f(J.elbow), up, f(J.shoulder));
      bones[B['hand' + sd]] = mk('hand' + sd, f(J.wrist), fo, f(J.elbow));
    }
    this.bones = bones;
    mesh.add(root);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    this.group = new THREE.Group();
    this.group.add(mesh);
    this.group.rotation.y = Math.PI;                  // the model faces +Z, the walker faces -Z
    // sagittal leg geometry for the two-link solve: [z, y] of thigh and shin at rest
    this.leg = { a: [J.knee[2] - J.hip[2], J.knee[1] - J.hip[1]], b: [J.ankle[2] - J.knee[2], J.ankle[1] - J.knee[1]] };
    this.phase = 0; this.amp = 0; this.clock = 0;
    this.pose(0, 0, 0);
  }

  // ---- skin weights from the rest shape ----
  skin(geo) {
    const P = geo.attributes.position, n = P.count, idx = geo.index.array;
    // shells: vertices joined by triangles, after welding the duplicated seam vertices
    const weld = new Map(), id = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = Math.round(P.getX(i) * 2000) + ',' + Math.round(P.getY(i) * 2000) + ',' + Math.round(P.getZ(i) * 2000);
      let w = weld.get(k); if (w === undefined) { w = weld.size; weld.set(k, w); }
      id[i] = w;
    }
    const par = new Int32Array(weld.size).map((_, i) => i);
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    for (let t = 0; t < idx.length; t += 3) {
      const a = find(id[idx[t]]); par[find(id[idx[t + 1]])] = a; par[find(id[idx[t + 2]])] = a;
    }
    const shells = new Map();
    for (let i = 0; i < n; i++) {
      const c = find(id[i]); let s = shells.get(c);
      if (!s) shells.set(c, s = { v: [], x0: 9, x1: -9, y0: 9, y1: -9, z0: 9, z1: -9, cx: 0 });
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      s.v.push(i); s.cx += x;
      s.x0 = Math.min(s.x0, x); s.x1 = Math.max(s.x1, x); s.y0 = Math.min(s.y0, y); s.y1 = Math.max(s.y1, y); s.z0 = Math.min(s.z0, z); s.z1 = Math.max(s.z1, z);
    }
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const put = (i, list) => {
      list = list.filter(e => e[1] > 1e-4).sort((p, q) => q[1] - p[1]).slice(0, 4);
      const sum = list.reduce((s, e) => s + e[1], 0);
      list.forEach((e, k) => { si[i * 4 + k] = e[0]; sw[i * 4 + k] = e[1] / sum; });
    };
    // unit axes of the arm at rest, for blends along it
    const ax = (p, q) => { const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], l = Math.hypot(...d); return { d: d.map(c => c / l), l }; };
    const foA = ax(J.elbow, J.wrist);
    const arms = new Float32Array(n);                    // how far each vertex of the hard torso follows its arm
    let torso = null;
    for (const s of shells.values()) if (s.x1 - s.x0 > 0.7 && s.y1 - s.y0 > 0.8 && s.z1 > 0.2) torso = s;
    const patches = [];
    for (const s of shells.values()) {
      s.cx /= s.v.length;
      const side = s.cx > 0 ? 'L' : 'R', m = s.cx > 0 ? 1 : -1, off = Math.abs(s.cx);
      const isLeg = off > 0.1 && s.y1 < 1.08 && s.y0 < 0.75;
      const isPelvis = off < 0.05 && s.y1 < 1.2 && s.y0 < 0.85;
      const isArm = off > 0.2 && s.z1 > 0.3 && s.y1 < 1.5 && s.y0 > 0.95;
      for (const i of s.v) {
        const x = P.getX(i) * m, y = P.getY(i), z = P.getZ(i);
        if (isLeg) {
          const foot = 1 - sstep(0.08, 0.20, y), thigh = sstep(0.43, 0.57, y), pel = sstep(0.84, 1.03, y);
          put(i, [[B['foot' + side], foot], [B['shin' + side], (1 - foot) * (1 - thigh)], [B['thigh' + side], thigh * (1 - pel)], [B.pelvis, pel]]);
        } else if (isPelvis) {
          // the brief: its leg openings go with the thighs, the middle stays with the pelvis
          const ch = sstep(1.04, 1.13, y), th = (1 - sstep(0.84, 1.03, y)) * sstep(0.03, 0.10, Math.abs(P.getX(i)));
          put(i, [[B.pelvis, (1 - ch) * (1 - th)], [B.chest, ch], [B['thigh' + (P.getX(i) > 0 ? 'L' : 'R')], th]]);
        } else if (isArm) {
          // distance along the forearm from the elbow
          const tf = (x - J.elbow[0]) * foA.d[0] + (y - J.elbow[1]) * foA.d[1] + (z - J.elbow[2]) * foA.d[2];
          const body = 1 - sstep(0.04, 0.22, z);            // the arm's root stays seated in the shoulder sleeve
          const fore = sstep(-0.06, 0.06, tf), hand = sstep(foA.l - 0.04, foA.l + 0.03, tf);
          put(i, [[B.chest, body], [B['upper' + side], (1 - body) * (1 - fore)], [B['fore' + side], (1 - body) * fore * (1 - hand)], [B['hand' + side], (1 - body) * fore * hand]]);
        } else {
          const pel = 1 - sstep(0.98, 1.10, y);          // the waist of the hard torso
          // the short sleeve of the torso, and the pads on it, follow the arm they hold
          const arm = arms[i] = sstep(0.19, 0.27, Math.abs(P.getX(i))) * sstep(0.04, 0.22, z) * sstep(1.22, 1.30, y) * (1 - sstep(1.62, 1.68, y));
          put(i, [[B.chest, (1 - pel) * (1 - arm)], [B.pelvis, pel], [B['upper' + (P.getX(i) > 0 ? 'L' : 'R')], arm]]);
          if (arm > 0 && s !== torso && patches[patches.length - 1] !== s) patches.push(s);
        }
      }
    }
    // Patches that lie on the sleeve (the flag, the NASA badge) take their weights from the torso
    // surface right under them, so they stay on it as it bends.
    if (torso && patches.length) {
      const inT = new Uint8Array(n); for (const i of torso.v) inT[i] = 1;
      const tris = [], va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), p = new THREE.Vector3(), cp = new THREE.Vector3(), bc = new THREE.Vector3(), tri = new THREE.Triangle();
      for (let t = 0; t < idx.length; t += 3) if (inT[idx[t]] && arms[idx[t]] + arms[idx[t + 1]] + arms[idx[t + 2]] > 0) tris.push(t);
      for (const s of patches) for (const i of s.v) {
        p.fromBufferAttribute(P, i);
        let best = Infinity, w = 0;
        for (const t of tris) {
          tri.set(va.fromBufferAttribute(P, idx[t]), vb.fromBufferAttribute(P, idx[t + 1]), vc.fromBufferAttribute(P, idx[t + 2]));
          const d = tri.closestPointToPoint(p, cp).distanceToSquared(p);
          if (d < best) { best = d; tri.getBarycoord(cp, bc); w = bc.x * arms[idx[t]] + bc.y * arms[idx[t + 1]] + bc.z * arms[idx[t + 2]]; }
        }
        if (best > 0.03 * 0.03) continue;                // not lying on the sleeve after all
        put(i, [[B.chest, 1 - w], [B['upper' + (P.getX(i) > 0 ? 'L' : 'R')], w]]);
      }
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  }

  // Ground covered since the last frame drives the stride, so the boots do not slide.
  advance(moved, dt) {
    const step = Math.min(moved / CYCLE_M, MAX_HZ * dt);
    this.phase = (this.phase + step) % 1;
    this.amp += ((step > 1e-5 ? 1 : 0) - this.amp) * Math.min(1, dt * 5);
    this.clock += dt;
    this.pose(this.phase, this.amp, this.clock);
  }

  // One foot through the cycle: c 0 is its heel strike. Returns ankle [z ahead of the hip, y above
  // the ground] and the boot pitch (toe down positive).
  foot(c) {
    if (c < STANCE) {
      const s = c / STANCE, land = 1 - sstep(0, 0.14, s), push = sstep(0.68, 1, s);
      return { z: REACH - 2 * REACH * s, y: SOLE + 0.012 * land + 0.06 * push, pitch: -0.16 * land + 0.42 * push };
    }
    const u = (c - STANCE) / (1 - STANCE), e = u * u * (3 - 2 * u);
    return { z: -REACH + 2 * REACH * e, y: SOLE + 0.06 * (1 - sstep(0, 0.55, u)) + 0.045 * Math.sin(Math.PI * u) + 0.012 * sstep(0.75, 1, u),
      pitch: 0.42 * (1 - sstep(0, 0.6, u)) - 0.16 * sstep(0.45, 1, u) };
  }

  // phase 0..1 of the cycle, amp 0 standing to 1 walking, t seconds for the idle sway
  pose(phase, amp, t) {
    const b = this.bones, TAU = Math.PI * 2;
    const sw = Math.cos(TAU * phase - 0.3);              // +1 as the left foot lands ahead, -1 as the right does
    const breath = Math.sin(t * 1.1), drift = Math.sin(t * 0.37);
    const idle = 1 - amp;
    // pelvis: lowest in double support, highest over the standing leg, weight shifted onto it
    const drop = lerp(0.006 + 0.002 * breath, 0.033 + 0.026 * Math.cos(2 * TAU * (phase - 0.05)), amp);
    const sway = lerp(0.012 * drift, -0.016 * Math.sin(TAU * (phase - 0.05)), amp);
    b[B.root].position.set(J.root[0] + sway, J.root[1] - drop, J.root[2]);
    b[B.pelvis].rotation.set(0.03 * amp, -0.06 * sw * amp + 0.01 * drift * idle, 0.03 * Math.sin(TAU * (phase - 0.05)) * amp);
    // hard torso: leans into the walk under the backpack and turns against the hips
    b[B.chest].rotation.set(0.075 * amp + 0.008 * breath * idle + 0.012 * Math.cos(2 * TAU * phase) * amp, 0.115 * sw * amp, -0.02 * Math.sin(TAU * (phase - 0.05)) * amp);
    // legs: ankle target, then thigh and knee from the two-link solve
    for (const [sd, c] of [['L', phase], ['R', (phase + 0.5) % 1]]) {
      const f = this.foot(c);
      const tz = J.ankle[2] + f.z * amp, ty = lerp(SOLE, f.y, amp), pitch = f.pitch * amp;
      const hz = J.hip[2], hy = J.hip[1] - drop;
      const { t1, t2 } = this.solveLeg(tz - hz, ty - hy);
      b[B['thigh' + sd]].rotation.set(t1, 0, -sway / 0.81);           // the roll keeps the boot where it stands as the hips sway
      b[B['shin' + sd]].rotation.set(t2, 0, 0);
      b[B['foot' + sd]].rotation.set(pitch - t1 - t2, 0, 0);
    }
    // arms: each swings against the leg on its side, elbow bending as it comes forward
    for (const [sd, m] of [['L', 1], ['R', -1]]) {
      const fwd = -m * sw;                               // +1 with this arm at the front of its swing
      const lag = -m * Math.cos(TAU * phase - 0.3 - 0.45); // the forearm follows a beat behind
      b[B['upper' + sd]].rotation.set(lerp(0.72, 0.74 - 0.30 * fwd, amp) + 0.012 * breath * idle, m * lerp(0.13, 0.15, amp), 0);
      b[B['fore' + sd]].rotation.set(lerp(-0.30, -0.30 - 0.12 * lag, amp), 0, 0);
      b[B['hand' + sd]].rotation.set(lerp(0.10, 0.12 + 0.10 * lag, amp), 0, 0);
    }
  }

  // Thigh and knee angles (rotation about the across axis) that put the ankle at [z, y] from the hip.
  solveLeg(z, y) {
    const { a, b } = this.leg, L1 = Math.hypot(a[0], a[1]), L2 = Math.hypot(b[0], b[1]);
    const D = Math.min(Math.hypot(z, y), (L1 + L2) * 0.9995);
    const fa = Math.atan2(a[1], a[0]), fb = Math.atan2(b[1], b[0]);
    const g = -Math.acos(Math.min(1, Math.max(-1, (D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2))));   // the knee folds backward
    const p2 = fa + g - fb;
    const ex = a[0] + L2 * Math.cos(fa + g), ey = a[1] + L2 * Math.sin(fa + g);
    const p1 = Math.atan2(y, z) - Math.atan2(ey, ex);
    return { t1: -p1, t2: -p2 };
  }

  // ---- the Sun shadow: the figure's own silhouette, seen from the Sun, laid on the ground ----
  makeShadow(heightAt) {
    this.heightAt = heightAt;
    this.shTarget = new THREE.WebGLRenderTarget(192, 288, { depthBuffer: true });
    this.shTarget.texture.generateMipmaps = false;
    this.shCam = new THREE.OrthographicCamera(-SH.s, SH.s, SH.v1, SH.v0, 1, 60);
    this.shCam.layers.set(SHADOW_LAYER);
    this.shMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
    const NA = 20, NC = 4, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NA + 1) * (NC + 1) * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((NA + 1) * (NC + 1) * 2), 2));
    geo.setAttribute('soft', new THREE.BufferAttribute(new Float32Array((NA + 1) * (NC + 1)), 1));
    const ix = [];
    for (let k = 0; k < NA; k++) for (let e = 0; e < NC; e++) {
      const p = k * (NC + 1) + e;
      ix.push(p, p + 1, p + NC + 1, p + 1, p + NC + 2, p + NC + 1);
    }
    geo.setIndex(ix);
    const mat = new THREE.ShaderMaterial({
      uniforms: { tSil: { value: this.shTarget.texture }, uOpacity: { value: 0.6 }, uColor: { value: new THREE.Color(0x140a06) }, uPx: { value: new THREE.Vector2(1 / 192, 1 / 288) } },
      vertexShader: `attribute float soft; varying vec2 vUv; varying float vSoft;
        void main() { vUv = uv; vSoft = soft; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      // a soft edge that widens away from the boots, as a real penumbra does
      fragmentShader: `uniform sampler2D tSil; uniform float uOpacity; uniform vec3 uColor; uniform vec2 uPx; varying vec2 vUv; varying float vSoft;
        void main() {
          if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) discard;
          vec2 r = uPx * (1.2 + 3.2 * vSoft);
          float a = texture2D(tSil, vUv).r * 0.22;
          a += (texture2D(tSil, vUv + r * vec2(1.0, 0.0)).r + texture2D(tSil, vUv - r * vec2(1.0, 0.0)).r + texture2D(tSil, vUv + r * vec2(0.0, 1.0)).r + texture2D(tSil, vUv - r * vec2(0.0, 1.0)).r) * 0.115;
          a += (texture2D(tSil, vUv + r * vec2(0.7, 0.7)).r + texture2D(tSil, vUv - r * vec2(0.7, 0.7)).r + texture2D(tSil, vUv + r * vec2(0.7, -0.7)).r + texture2D(tSil, vUv - r * vec2(0.7, -0.7)).r) * 0.08;
          a = smoothstep(0.08, 0.92, a) * uOpacity * (1.0 - smoothstep(0.82, 1.0, vSoft));
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
    });
    const m = this.shadow = new THREE.Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = 2; m.visible = false;
    m.userData.grid = [NA, NC];
    return m;
  }

  // sun: unit vector toward the Sun. feet: where the figure stands (world). opacity 0 hides it.
  updateShadow(renderer, sun, feet, opacity) {
    const m = this.shadow, el = sun ? Math.atan2(sun.y, Math.hypot(sun.x, sun.z)) : 0;
    m.visible = opacity > 0.004 && el > 0.035;
    if (!m.visible) return;
    const hl = Math.hypot(sun.x, sun.z), ax = -sun.x / hl, az = -sun.z / hl;     // along the ground, away from the Sun
    const ce = Math.cos(el), se = Math.sin(el);
    const up = new THREE.Vector3(ax * se, ce, az * se);                          // image up: the figure's height, foreshortened
    const rx = -az, rz = ax;                                                     // image right, level on the ground
    // 1. the silhouette, from the Sun
    const cam = this.shCam;
    cam.position.set(feet.x + sun.x * 30, feet.y + sun.y * 30, feet.z + sun.z * 30);
    cam.up.copy(up); cam.lookAt(feet.x, feet.y, feet.z); cam.updateMatrixWorld(true);
    this.group.updateWorldMatrix(true, true);
    const keepT = renderer.getRenderTarget(), keepC = renderer.getClearColor(new THREE.Color()), keepA = renderer.getClearAlpha(), keepM = this.mesh.material, keepV = this.group.visible;
    this.mesh.material = this.shMat; this.group.visible = true;
    renderer.setRenderTarget(this.shTarget); renderer.setClearColor(0x000000, 1); renderer.clear();
    renderer.render(this.group, cam);
    renderer.setRenderTarget(keepT); renderer.setClearColor(keepC, keepA);
    this.mesh.material = keepM; this.group.visible = keepV;
    // 2. the strip of ground it falls on, each vertex looked up along the Sun's rays
    const [NA, NC] = m.userData.grid, P = m.geometry.attributes.position, U = m.geometry.attributes.uv, S = m.geometry.attributes.soft;
    const len = Math.min(SH.v1 / se, 30), r0 = Math.max(SH.v0 / se, -1.2);
    for (let k = 0; k <= NA; k++) {
      const q = k / NA, r = r0 + (len - r0) * q * (0.35 + 0.65 * q);             // rows closer together near the boots
      for (let e = 0; e <= NC; e++) {
        const s = SH.s * (e / NC * 2 - 1), i = k * (NC + 1) + e;
        const px = feet.x + ax * r + rx * s, pz = feet.z + az * r + rz * s, py = this.heightAt(px, pz) + 0.07;
        P.setXYZ(i, px, py, pz);
        const dx = px - feet.x, dy = py - 0.07 - feet.y, dz = pz - feet.z;
        U.setXY(i, ((dx * rx + dz * rz) / SH.s + 1) / 2, (dx * up.x + dy * up.y + dz * up.z - SH.v0) / (SH.v1 - SH.v0));
        S.setX(i, Math.max(0, r) / 30 + (len >= 30 ? sstep(0.7, 1, q) * 0.9 : 0));
      }
    }
    P.needsUpdate = U.needsUpdate = S.needsUpdate = true;
    m.material.uniforms.uOpacity.value = opacity;
  }
}
