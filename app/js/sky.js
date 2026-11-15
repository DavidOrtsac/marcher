// Mars sky dome and sunlight.
// Colours: daytime Martian sky is butterscotch from suspended dust; near the
// Sun and at sunset it turns blue because dust grains forward-scatter blue light
// (NASA/JPL-Caltech/MSSS/Texas A&M, "Sunset in Mars' Gale Crater", https://photojournal.jpl.nasa.gov/catalog/PIA19400).
// These are visual approximations, not a radiative transfer model.
import * as THREE from '../vendor/three.module.min.js';

const SKY_VS = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FS = /* glsl */`
uniform vec3 uSun;      // unit vector to the Sun (world)
uniform float uSunEl;   // radians
uniform float uSunSize; // angular radius, radians
uniform float uExposure;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float day = smoothstep(-0.12, 0.10, uSunEl);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 zenith  = mix(vec3(0.010, 0.010, 0.016), vec3(0.30, 0.20, 0.135), day);
  vec3 horizon = mix(vec3(0.020, 0.018, 0.024), vec3(0.60, 0.43, 0.29), day);
  vec3 col = mix(horizon, zenith, pow(max(h, 0.0), 0.55));
  float c = dot(d, uSun);
  // blue aureole around the Sun, strongest when the Sun is low
  float low = 1.0 - smoothstep(0.0, 0.6, uSunEl);
  float aure = pow(max(c, 0.0), 24.0) * (0.35 + 0.9 * low) * smoothstep(-0.15, 0.02, uSunEl);
  col += vec3(0.32, 0.48, 0.80) * aure;
  // warm glow across the sky near the horizon at dusk
  col += vec3(0.25, 0.14, 0.08) * pow(1.0 - max(h, 0.0), 6.0) * smoothstep(-0.2, 0.05, uSunEl) * (1.0 - day * 0.6);
  // the Sun disc, limb darkened
  float r = acos(clamp(c, -1.0, 1.0)) / uSunSize;
  if (r < 1.0 && d.y > -0.02) {
    float mu = sqrt(1.0 - r * r);
    col += vec3(1.0, 0.92, 0.78) * 14.0 * (0.4 + 0.6 * mu);
  }
  if (d.y < 0.0) col = mix(col, horizon * 0.35, smoothstep(0.0, -0.08, d.y));
  gl_FragColor = vec4(col * uExposure, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor(scene) {
    this.uniforms = {
      uSun: { value: new THREE.Vector3(0, 1, 0) },
      uSunEl: { value: 1 },
      // Sun angular radius at Mars: 0.2665 deg at 1 AU / r(AU); r ~ 1.38 to 1.67 AU
      uSunSize: { value: THREE.MathUtils.degToRad(0.2665 / 1.52) },
      uExposure: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);

    this.sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xd8a77c, 0x3a2418, 0.9);
    scene.add(this.hemi);
  }

  // az: degrees from north clockwise, el: degrees. World: -Z north, +X east.
  setSun(azDeg, elDeg, distAU = 1.52) {
    const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
    const v = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.uniforms.uSun.value.copy(v);
    this.uniforms.uSunEl.value = el;
    this.uniforms.uSunSize.value = THREE.MathUtils.degToRad(0.2665 / distAU);
    this.dir = v;
    const day = THREE.MathUtils.smoothstep(elDeg, -2, 8);
    // irradiance scales with 1/r^2 and with path length through the dusty air
    const air = Math.max(Math.sin(el), 0.02);
    const trans = Math.exp(-0.5 * (1 / air - 1) * 0.35);
    this.sun.intensity = 2.3 * day * trans * Math.pow(1.52 / distAU, 2);
    this.sun.color.setRGB(1.0, 0.86 + 0.1 * trans, 0.70 + 0.2 * trans);
    this.hemi.intensity = 0.12 + 0.72 * THREE.MathUtils.smoothstep(elDeg, -12, 20);
  }

  // shadow camera box centred on (x, z), half-size r metres
  fitShadow(x, y, z, r) {
    const d = this.dir || new THREE.Vector3(0, 1, 0);
    const cam = this.sun.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 1; cam.far = 6000;
    cam.updateProjectionMatrix();
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x + d.x * 3000, y + d.y * 3000, z + d.z * 3000);
    this.sun.target.updateMatrixWorld();
    this.sun.updateMatrixWorld();
  }

  follow(camera) { this.mesh.position.copy(camera.position); this.mesh.scale.setScalar(camera.far * 0.9); }
}
