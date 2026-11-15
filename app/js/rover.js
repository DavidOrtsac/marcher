// The crew's pressurized rover, parked where the walk starts and ends.
//
// The model is NASA's own: "Space Exploration Vehicle" from NASA 3D Resources
// (github.com/nasa/NASA-3D-Resources, 3D Models/Space Exploration Vehicle/Space Exploration Vehicle.glb).
// The file here is that model with the mesh simplified (413,198 to 61,978 triangles), the colour
// map halved to 2048 px, and the height map left out (the export had it in the normal slot, where
// it turned the white cabin dark). Nothing was redrawn. It is shown at the size NASA authored
// it, one model unit to one metre: 4.0 m wide, 5.9 m long, 3.4 m to the roof, twelve 0.72 m wheels
// on six pods. See parkingSpot for where it stands and why.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

export const ROVER = {
  name: 'Space Exploration Vehicle',
  credit: 'NASA 3D Resources',
  source: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Space%20Exploration%20Vehicle',
  // measured on the model, metres. z runs along the vehicle, +z is the front (the windows).
  width: 4.04, length: 5.91, roof: 3.45,
  podZ: [-2.57, -0.87, 0.83],        // the three wheel pod rows
  aft: -3.355, front: 2.555, track: 1.70,
};
const MID = ROVER.podZ[1];           // the vehicle is placed by the middle of its wheel footprint
const CLEAR = 3.4;                   // gap between the side hatch and the first step of the route, m
const HATCH_Z = 0.95;                // the side hatch, metres ahead of the middle wheel pod
const MAX_TILT = 0.21;               // 12 degrees
const SIL_LAYER = 6;                 // the layer the shadow silhouette is drawn from
const SIL_R = 4.3;                   // half-size of the silhouette frame around the vehicle, m
const SIL_C = [0, 1.95, 0.47];       // the centre of that frame in the vehicle's own frame

// unit ground direction between two points of a flat track (x, y, z, t, e per sample)
function dirOver(tr, from, to) {
  const dx = tr[to * 5] - tr[from * 5], dz = tr[to * 5 + 2] - tr[from * 5 + 2], l = Math.hypot(dx, dz);
  return l > 1e-6 ? [dx / l, dz / l] : null;
}
// sample index about `m` metres along the track from one end
function indexAt(tr, m, fromEnd) {
  const n = tr.length / 5; let s = 0, i = fromEnd ? n - 1 : 0;
  const step = fromEnd ? -1 : 1;
  while (i + step >= 0 && i + step < n && s < m) {
    s += Math.hypot(tr[(i + step) * 5] - tr[i * 5], tr[(i + step) * 5 + 2] - tr[i * 5 + 2]);
    i += step;
  }
  return i;
}

// Where to park. The walk ends by coming home, so the rover stands straight ahead of those last
// steps, side-on, with its round side hatch in line with the walker and CLEAR metres away. NASA's
// model has no suitports on its aft bulkhead (that face is a blank cap), so the side hatch is the
// door the walk starts and ends at. Of the two ways round, the nose points against the way out:
// the camera that follows the walker at the start then sees the cabin windows, not the aft cap.
// If the way out heads the same way as the way home, the rover moves to the side away from both.
// Returns the centre of the wheel footprint, the unit direction the front points (u) and the unit
// direction from the first step to the rover (away).
export function parkingSpot(app) {
  const tr = app.state.sched?.track;
  let s0 = app.stops[0], away = [0, -1], out = [-1, 0];
  if (tr && tr.length >= 10) {
    s0 = { x: tr[0], z: tr[2] };                                 // the first step of the walk itself
    const n = tr.length / 5;
    out = dirOver(tr, 0, indexAt(tr, 9, false)) || out;
    const back = dirOver(tr, indexAt(tr, 9, true), n - 1);       // heading of the last steps home
    if (back && back[0] * out[0] + back[1] * out[1] < 0.35) away = back;
    else {
      let x = -out[0] + (back ? back[0] : 0), z = -out[1] + (back ? back[1] : 0);
      if (Math.hypot(x, z) < 0.35) { x = out[1]; z = -out[0]; }  // out and home share a line: stand to one side of it
      const l = Math.hypot(x, z); away = [x / l, z / l];
    }
  }
  let u = [-away[1], away[0]];
  if (u[0] * out[0] + u[1] * out[1] > 0) u = [-u[0], -u[1]];
  const d = CLEAR + ROVER.width / 2;
  return { x: s0.x + away[0] * d - u[0] * HATCH_Z, z: s0.z + away[1] * d - u[1] * HATCH_Z, u, away };
}

// Fetch and parse the model. main.js starts this with the first terrain request, so the rover is
// ready to stand in the scene by the time the walk can begin.
export function loadRover(url = new URL('../models/rover.glb', import.meta.url).href) {
  return new GLTFLoader().loadAsync(url);
}

export async function addRover(app, loaded = loadRover()) {
  const g = await loaded;
  const model = g.scene;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  // model frame to vehicle frame: wheels on y = 0, middle wheel pod over the origin
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -MID);
  model.traverse((o) => {
    if (!o.isMesh) return;
    // The scene's Sun shadow map is tuned for hills (its depth bias is about 2 m), so a vehicle
    // this size leaves no mark in it. The rover draws its own shadow instead, see RoverShadow.
    o.castShadow = false; o.receiveShadow = false;
    o.layers.enable(SIL_LAYER);
    o.raycast = () => {};                               // map clicks pass through to the ground
    const m = o.material;
    m.envMapIntensity = 0;
    m.emissiveMap = m.map; m.emissive.set(0x33241a);    // skylight fill on the shaded side, as dusty air gives
  });
  const group = new THREE.Group();
  group.name = 'crew-rover';
  group.add(model);

  // sit it on the ground: height and tilt from the ground under the wheel pods
  const spot = parkingSpot(app), [fx, fz] = spot.u, rx = -fz, rz = fx;   // front, and the vehicle's right
  const h = (a, b) => app.heightAt(spot.x + fx * a + rx * b, spot.z + fz * a + rz * b);
  const zf = ROVER.podZ[2] - MID, zb = ROVER.podZ[0] - MID, t = ROVER.track;
  const hf = (h(zf, t) + h(zf, -t)) / 2, hb = (h(zb, t) + h(zb, -t)) / 2;
  const hr = (h(zf, t) + h(0, t) + h(zb, t)) / 3, hl = (h(zf, -t) + h(0, -t) + h(zb, -t)) / 3;
  const clamp = (v) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
  const pitch = clamp(Math.atan2(hf - hb, zf - zb)), roll = clamp(Math.atan2(hr - hl, 2 * t));
  const fwd = new THREE.Vector3(fx * Math.cos(pitch), Math.sin(pitch), fz * Math.cos(pitch));
  const right = new THREE.Vector3(rx * Math.cos(roll), Math.sin(roll), rz * Math.cos(roll));
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  right.crossVectors(fwd, up).normalize();
  // the model's +x is its left when +z is the front and y is up
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right.clone().negate(), up, fwd));
  const y = (h(zf, t) + h(zf, -t) + h(0, t) + h(0, -t) + h(zb, t) + h(zb, -t)) / 6;
  group.position.set(spot.x, y - 0.04, spot.z);
  group.updateMatrixWorld(true);
  app.scene.add(group);

  const shadow = new RoverShadow(app, group, model);
  group.userData = { ...ROVER, spot, pitch, roll, shadow };
  // the shadow follows the Sun by itself, for as long as the rover is in the scene
  const loop = () => { if (!group.parent) return; shadow.update(); requestAnimationFrame(loop); };
  loop();
  return group;
}

// The rover's shadow on the ground: its real outline as the Sun sees it, laid over the terrain
// along the Sun's rays (the same method as the astronaut's shadow), plus a soft dark patch under
// the chassis where the sky is hidden. Redrawn only when the Sun has moved.
class RoverShadow {
  constructor(app, group, model) {
    this.app = app; this.group = group; this.model = model;
    this.target = new THREE.WebGLRenderTarget(384, 384, { depthBuffer: true });
    this.target.texture.generateMipmaps = false;
    this.cam = new THREE.OrthographicCamera(-SIL_R, SIL_R, SIL_R, -SIL_R, 1, 80);
    this.cam.layers.set(SIL_LAYER);
    this.silMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false, side: THREE.DoubleSide });
    this.centre = group.localToWorld(new THREE.Vector3(...SIL_C));
    this.last = new THREE.Vector3();

    // Sun shadow: a strip of ground running away from the Sun
    const NA = this.NA = 56, NC = this.NC = 22, n = (NA + 1) * (NC + 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    geo.setAttribute('soft', new THREE.BufferAttribute(new Float32Array(n), 1));
    geo.setIndex(gridIndex(NA, NC));
    const common = { transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      ...common,
      uniforms: { tSil: { value: this.target.texture }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0x140a06) }, uPx: { value: new THREE.Vector2(1 / 384, 1 / 384) } },
      vertexShader: `attribute float soft; varying vec2 vUv; varying float vSoft;
        void main() { vUv = uv; vSoft = soft; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      // the edge softens with distance from the vehicle, as a real penumbra does
      fragmentShader: `uniform sampler2D tSil; uniform float uOpacity; uniform vec3 uColor; uniform vec2 uPx; varying vec2 vUv; varying float vSoft;
        void main() {
          if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) discard;
          vec2 r = uPx * (1.4 + 5.0 * vSoft);
          float a = texture2D(tSil, vUv).r * 0.22;
          a += (texture2D(tSil, vUv + r * vec2(1.0, 0.0)).r + texture2D(tSil, vUv - r * vec2(1.0, 0.0)).r + texture2D(tSil, vUv + r * vec2(0.0, 1.0)).r + texture2D(tSil, vUv - r * vec2(0.0, 1.0)).r) * 0.115;
          a += (texture2D(tSil, vUv + r * vec2(0.7, 0.7)).r + texture2D(tSil, vUv - r * vec2(0.7, 0.7)).r + texture2D(tSil, vUv + r * vec2(0.7, -0.7)).r + texture2D(tSil, vUv - r * vec2(0.7, -0.7)).r) * 0.08;
          a = smoothstep(0.08, 0.92, a) * uOpacity * (1.0 - smoothstep(0.86, 1.0, vSoft));
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; this.mesh.visible = false;
    this.mesh.raycast = () => {};

    // the patch under the chassis: there in any light, strongest between the wheels
    const GA = 14, GC = 10, hx = 2.5, z0 = ROVER.aft - MID - 0.5, z1 = ROVER.front - MID + 0.1;
    const cg = new THREE.BufferGeometry(), cp = new Float32Array((GA + 1) * (GC + 1) * 3), cu = new Float32Array((GA + 1) * (GC + 1) * 2);
    const v = new THREE.Vector3();
    for (let k = 0; k <= GA; k++) for (let e = 0; e <= GC; e++) {
      const i = k * (GC + 1) + e;
      group.localToWorld(v.set(hx * (e / GC * 2 - 1), 0, z0 + (z1 - z0) * k / GA));
      v.y = app.heightAt(v.x, v.z) + 0.05;
      group.worldToLocal(v);
      cp.set([v.x, v.y, v.z], i * 3); cu.set([e / GC, k / GA], i * 2);
    }
    cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    cg.setAttribute('uv', new THREE.BufferAttribute(cu, 2));
    cg.setIndex(gridIndex(GA, GC));
    this.contact = new THREE.Mesh(cg, new THREE.ShaderMaterial({
      ...common,
      uniforms: { uOpacity: { value: 0.42 }, uColor: { value: new THREE.Color(0x140a06) } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
        void main() {
          vec2 d = abs(vUv - 0.5) * 2.0;
          float a = (1.0 - smoothstep(0.45, 1.0, d.x)) * (1.0 - smoothstep(0.55, 1.0, d.y)) * uOpacity;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    }));
    this.contact.frustumCulled = false; this.contact.renderOrder = 2; this.contact.raycast = () => {};
    group.add(this.contact, this.mesh);
  }

  // Call every frame. It does work only when the Sun has moved by more than about 0.05 degrees.
  update() {
    const sun = this.app.sky?.dir, m = this.mesh;
    if (!sun) { m.visible = false; return; }
    if (this.last.dot(sun) > 0.9999996) return;
    this.last.copy(sun);
    const el = Math.atan2(sun.y, Math.hypot(sun.x, sun.z));
    const opacity = 0.62 * THREE.MathUtils.smoothstep(el, 0.035, 0.2);     // fades out toward sunset, as the astronaut's does
    m.visible = opacity > 0.004;
    if (!m.visible) return;
    const hl = Math.hypot(sun.x, sun.z), ax = -sun.x / hl, az = -sun.z / hl;   // along the ground, away from the Sun
    const se = Math.sin(el), ce = Math.cos(el), C = this.centre;

    // 1. the outline, from the Sun
    const cam = this.cam, r = this.app.renderer;
    cam.position.set(C.x + sun.x * 40, C.y + sun.y * 40, C.z + sun.z * 40);
    cam.up.set(ax * se, ce, az * se); cam.lookAt(C); cam.updateMatrixWorld(true);
    this.group.updateWorldMatrix(true, true);
    const keepT = r.getRenderTarget(), keepC = r.getClearColor(new THREE.Color()), keepA = r.getClearAlpha();
    const mats = [];
    this.model.traverse((o) => { if (o.isMesh) { mats.push([o, o.material]); o.material = this.silMat; } });
    r.setRenderTarget(this.target); r.setClearColor(0x000000, 1); r.clear();
    r.render(this.model, cam);
    r.setRenderTarget(keepT); r.setClearColor(keepC, keepA);
    for (const [o, mat] of mats) o.material = mat;

    // 2. the ground it falls on. Each point is looked up along the Sun's rays in that outline.
    const { NA, NC } = this, P = m.geometry.attributes.position, U = m.geometry.attributes.uv, S = m.geometry.attributes.soft;
    const rx = -az, rz = ax, top = SIL_C[1] + SIL_R;
    const full = top / Math.tan(el) + SIL_R, len = Math.min(full, 70), r0 = -SIL_R;
    const v = new THREE.Vector3(), q3 = new THREE.Vector3();
    for (let k = 0; k <= NA; k++) {
      const q = k / NA, d = r0 + (len - r0) * q * (0.4 + 0.6 * q);            // rows closer together near the vehicle
      for (let e = 0; e <= NC; e++) {
        const s = SIL_R * (e / NC * 2 - 1), i = k * (NC + 1) + e;
        const px = C.x + ax * d + rx * s, pz = C.z + az * d + rz * s;
        v.set(px, this.app.heightAt(px, pz) + 0.07, pz);
        q3.copy(v).project(cam);
        U.setXY(i, q3.x * 0.5 + 0.5, q3.y * 0.5 + 0.5);
        S.setX(i, Math.max(0, d) / 70 + (full > len ? THREE.MathUtils.smoothstep(q, 0.7, 1) * 0.9 : 0));
        this.group.worldToLocal(v);
        P.setXYZ(i, v.x, v.y, v.z);
      }
    }
    P.needsUpdate = U.needsUpdate = S.needsUpdate = true;
    m.material.uniforms.uOpacity.value = opacity;
  }
}

function gridIndex(na, nc) {
  const ix = [];
  for (let k = 0; k < na; k++) for (let e = 0; e < nc; e++) {
    const p = k * (nc + 1) + e;
    ix.push(p, p + 1, p + nc + 1, p + 1, p + nc + 2, p + nc + 1);
  }
  return ix;
}
