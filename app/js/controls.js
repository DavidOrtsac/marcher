// Camera control: an orbit "table" camera for planning and a first-person
// walker for the EVA. Smooth, damped, and wheel-zooms toward the cursor.
import * as THREE from '../vendor/three.module.min.js';

export class TableControls {
  constructor(camera, dom, heightAt, half) {
    this.camera = camera; this.dom = dom; this.heightAt = heightAt; this.half = half;
    this.target = new THREE.Vector3(0, 300, 0);
    this.goal = { target: this.target.clone(), dist: 3600, az: -0.35, pol: 0.95 };
    this.cur = { target: this.target.clone(), dist: 3600, az: -0.35, pol: 0.95 };
    this.enabled = true;
    this.drag = null;
    dom.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointermove', e => this.move(e));
    addEventListener('pointerup', (e) => {
      if (this.drag && this.drag.moved < 5 && this.enabled && this.onTap && e.target === this.dom) this.onTap(e.clientX, e.clientY);
      this.drag = null; this.touches.delete(e.pointerId);
    });
    dom.addEventListener('wheel', e => this.wheel(e), { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());
    this.touches = new Map();
  }
  down(e) {
    if (!this.enabled) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pan = e.button === 2 || e.shiftKey || this.touches.size === 2;
    this.drag = { x: e.clientX, y: e.clientY, pan, moved: 0 };
  }
  move(e) {
    if (!this.enabled || !this.drag) return;
    const prev = this.touches.get(e.pointerId);
    if (this.touches.size === 2 && prev) {
      const pts = [...this.touches.values()];
      const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const q = [...this.touches.values()];
      const d1 = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y);
      if (d0 > 0 && d1 > 0) this.goal.dist = THREE.MathUtils.clamp(this.goal.dist * d0 / d1, 60, 6000);
      return;
    }
    if (prev) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
    this.drag.x = e.clientX; this.drag.y = e.clientY;
    this.drag.moved += Math.abs(dx) + Math.abs(dy);
    if (this.drag.pan) {
      const s = this.cur.dist / this.dom.clientHeight * 1.1;
      const az = this.cur.az;
      const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
      const fwd = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az));
      this.goal.target.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s);
      this.clampTarget();
    } else {
      this.goal.az -= dx * 0.005;
      this.goal.pol = THREE.MathUtils.clamp(this.goal.pol - dy * 0.004, 0.12, 1.45);
    }
  }
  wheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const k = Math.exp(e.deltaY * 0.0012);
    const hit = this.pick(e.clientX, e.clientY);
    const nd = THREE.MathUtils.clamp(this.goal.dist * k, 40, 6000);
    if (hit && k < 1) this.goal.target.lerp(hit, 1 - nd / this.goal.dist);
    this.goal.dist = nd;
    this.clampTarget();
  }
  clampTarget() {
    const t = this.goal.target, h = this.half;
    t.x = THREE.MathUtils.clamp(t.x, -h, h); t.z = THREE.MathUtils.clamp(t.z, -h, h);
    t.y = this.heightAt(t.x, t.z);
  }
  // ray-march the height field
  pick(cx, cy) {
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = 0, step = Math.max(1, this.cur.dist / 400), prev = null;
    for (let k = 0; k < 4000; k++) {
      const p = o.clone().addScaledVector(d, t);
      if (Math.abs(p.x) > this.half * 1.4 || Math.abs(p.z) > this.half * 1.4) { if (t > this.cur.dist * 4) return null; }
      const h = this.heightAt(p.x, p.z);
      if (p.y <= h && Math.abs(p.x) <= this.half && Math.abs(p.z) <= this.half) {
        if (!prev) return p;
        let a = t - step, b = t;
        for (let i = 0; i < 20; i++) { const m = (a + b) / 2; const q = o.clone().addScaledVector(d, m); if (q.y <= this.heightAt(q.x, q.z)) b = m; else a = m; }
        const q = o.clone().addScaledVector(d, b); q.y = this.heightAt(q.x, q.z); return q;
      }
      prev = p; t += step; step *= 1.004;
    }
    return null;
  }
  flyTo(target, dist, az, pol) {
    this.goal.target.copy(target);
    if (dist !== undefined) this.goal.dist = dist;
    if (az !== undefined) this.goal.az = az;
    if (pol !== undefined) this.goal.pol = pol;
  }
  update(dt) {
    const k = 1 - Math.exp(-dt * 6);
    this.cur.target.lerp(this.goal.target, k);
    this.cur.dist += (this.goal.dist - this.cur.dist) * k;
    this.cur.az += (this.goal.az - this.cur.az) * k;
    this.cur.pol += (this.goal.pol - this.cur.pol) * k;
    const { target, dist, az, pol } = this.cur;
    const p = new THREE.Vector3(Math.sin(az) * Math.sin(pol), Math.cos(pol), Math.cos(az) * Math.sin(pol)).multiplyScalar(dist).add(target);
    const floor = this.heightAt(p.x, p.z) + 8;
    if (p.y < floor) p.y = floor;
    this.camera.position.copy(p);
    this.camera.lookAt(target);
  }
}

// First-person walker. Eye 1.65 m above the ground (suited astronaut).
export class WalkControls {
  constructor(camera, dom, heightAt, half) {
    this.camera = camera; this.dom = dom; this.heightAt = heightAt; this.half = half;
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = -0.08;
    this.eye = 1.65; this.keys = new Set(); this.enabled = false; this.auto = null;
    this.look = null;
    // only the walking keys count: any other key held down must not stop the guided walk
    const MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    this.fast = false;
    addEventListener('keydown', e => {
      if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey) return;
      if (MOVE.has(e.code)) { this.keys.add(e.code); e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.fast = true;
    });
    addEventListener('keyup', e => { this.keys.delete(e.code); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.fast = false; });
    // a key released while the window is in the background never sends keyup
    const drop = () => { this.keys.clear(); this.fast = false; this.look = null; };
    addEventListener('blur', drop);
    document.addEventListener('visibilitychange', drop);
    dom.addEventListener('pointerdown', e => { if (this.enabled) this.look = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointermove', e => {
      if (!this.enabled || !this.look) return;
      this.yaw -= (e.clientX - this.look.x) * 0.0035;
      this.pitch = THREE.MathUtils.clamp(this.pitch - (e.clientY - this.look.y) * 0.003, -1.2, 1.2);
      this.look = { x: e.clientX, y: e.clientY };
      this.lookTouched = performance.now();
    });
    addEventListener('pointerup', () => { this.look = null; });
  }
  place(x, z, yaw) { this.pos.set(x, this.heightAt(x, z), z); if (yaw !== undefined) this.yaw = yaw; }
  // heading in degrees from north, clockwise
  heading() { return ((-this.yaw * 180 / Math.PI) % 360 + 360) % 360; }
  update(dt) {
    let vx = 0, vz = 0;
    const f = (this.keys.has('KeyW') || this.keys.has('ArrowUp')) - (this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const s = (this.keys.has('KeyD') || this.keys.has('ArrowRight')) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    if (f || s) {
      const sp = this.fast ? 12 : 1.4;
      vx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) * sp;
      vz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) * sp;
      this.pos.x += vx * dt; this.pos.z += vz * dt;
    }
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -this.half + 1, this.half - 1);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -this.half + 1, this.half - 1);
    this.pos.y = this.heightAt(this.pos.x, this.pos.z);
    const e = this.pos.clone(); e.y += this.eye;
    this.camera.position.copy(e);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.lookAt(e.add(dir));
  }
}
