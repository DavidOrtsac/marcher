// Terrain: one 4 m overview mesh for the whole site, plus 1 m detail tiles
// with 25 cm HiRISE colour that stream in around a focus point (walk mode).
// Layers are drawn in the terrain shader from site-wide textures indexed by
// world position, so every mesh shows the same layers.
import * as THREE from '../vendor/three.module.min.js';
import { loadHeights } from './site.js';

const LAYER_GLSL = /* glsl */`
uniform float uHalf;
uniform sampler2D tSlope;   uniform float lSlope;
uniform sampler2D tStep;
uniform sampler2D tBack;    uniform float lBack;   uniform float uBackMax;
uniform sampler2D tRadio;   uniform float lRadio;
uniform sampler2D tTherm;   uniform float lTherm;
uniform sampler2D tMin;     uniform float lMin;
uniform sampler2D tRelief;  uniform float lRelief;
uniform vec4 uHideRect;     // detail tiles cover this rect on the overview (xmin, zmin, xmax, zmax)
uniform float uIsOverview;
varying vec3 vWPos;

// a layer stains the ground instead of painting over it: the hue is the layer's, the light and dark stay the photo's
float lyLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 lyStain(vec3 col, vec3 tint, float a) { return mix(col, tint * (0.3 + 1.5 * lyLum(col)), a); }

vec3 slopeRamp(float d) {
  // suited walking classes (deg); 20 deg is the suit limit (NASA EVA-EXP-0075), see js/suit.js
  if (d < 10.0) return vec3(0.0);
  if (d < 15.0) return vec3(0.96, 0.85, 0.56);
  if (d < 20.0) return vec3(0.95, 0.56, 0.20);
  return vec3(0.13, 0.05, 0.04);   // ground past the suit limit is blacked out, so the walkable ground is what stays lit
}
float slopeAlpha(float d) { return d < 10.0 ? 0.0 : d < 15.0 ? 0.3 : d < 20.0 ? 0.5 : 0.62; }

vec3 thermRamp(float t) { // t 0..1 low -> high thermal inertia
  vec3 a = vec3(0.09, 0.17, 0.22), b = vec3(0.36, 0.58, 0.58), c = vec3(0.96, 0.92, 0.80);
  return t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0);
}

vec3 applyLayers(vec3 base) {
  vec2 suv = (vWPos.xz + uHalf) / (2.0 * uHalf);
  vec3 col = base;
  if (lSlope > 0.001) {
    float d = texture2D(tSlope, suv).r * 255.0 * 0.25;
    float st = texture2D(tStep, suv).r * 255.0 * 0.5;   // steepest 1 m step
    if (st > 30.0) d = max(d, 20.0);                     // short walls are no-go too
    float a = slopeAlpha(d) * lSlope;
    if (d >= 20.0) { // hatch the no-go ground
      float hatch = step(0.5, fract((vWPos.x + vWPos.z) * 0.08));
      a *= mix(0.6, 1.0, hatch);
    }
    col = d >= 20.0 ? mix(col, slopeRamp(d), a) : lyStain(col, slopeRamp(d), a);
  }
  if (lTherm > 0.001) {
    vec4 t = texture2D(tTherm, suv);
    col = lyStain(col, thermRamp(t.r), 0.72 * lTherm * t.a);
  }
  if (lMin > 0.001) {
    vec4 m = texture2D(tMin, suv);
    // the CRISM browse colours, calmed: polyhydrated stays on the magenta side, monohydrated on the green side
    float wm = m.g, wp = 0.5 * (m.r + m.b);
    vec3 mc = mix(vec3(0.84, 0.50, 0.80), vec3(0.70, 0.84, 0.42), smoothstep(0.35, 0.65, wm / max(1e-3, wm + wp)));
    col = lyStain(col, mc, 0.8 * m.a * lMin);
  }
  if (lRelief > 0.001) {
    float r = (texture2D(tRelief, suv).r * 255.0 - 128.0) / 50.0;   // metres above surroundings
    col = mix(col, vec3(1.0, 0.92, 0.76), smoothstep(0.2, 0.7, r) * 0.6 * lRelief);
    col = mix(col, vec3(0.16, 0.50, 0.52), smoothstep(-0.2, -0.7, r) * 0.6 * lRelief);
  }
  if (lRadio > 0.001) {
    float r = texture2D(tRadio, suv).r;
    // ground the mast can see keeps its own colour, ground in radio shadow goes dark and grey
    col = mix(col, col * 1.1 + 0.015, r * 0.5 * lRadio);
    col = mix(col, vec3(lyLum(col)) * 0.4, (1.0 - r) * 0.7 * lRadio);
  }
  if (lBack > 0.001) {
    float m = texture2D(tBack, suv).r * uBackMax;      // minutes back to the rover
    float band = fract(m / 5.0);
    float w = fwidth(m / 5.0) * 1.2;
    float line = 1.0 - smoothstep(0.0, w, min(band, 1.0 - band));
    bool major = abs(m - 15.0 * floor(m / 15.0 + 0.5)) < 0.5 * 5.0 * w + 0.01;
    vec3 lc = major ? vec3(1.0) : vec3(1.0, 0.95, 0.88);
    float far = smoothstep(uBackMax * 0.97, uBackMax * 0.995, m);
    line *= 1.0 - far;
    col = mix(col, lc, line * (major ? 0.9 : 0.45) * lBack);
    col = mix(col, col * 0.35, far * 0.7 * lBack);
  }
  return col;
}
`;

function patchMaterial(mat, uniforms) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + LAYER_GLSL)
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (uIsOverview > 0.5 && vWPos.x > uHideRect.x && vWPos.z > uHideRect.y && vWPos.x < uHideRect.z && vWPos.z < uHideRect.w) discard;
        diffuseColor.rgb = applyLayers(diffuseColor.rgb);`);
  };
  mat.customProgramCacheKey = () => 'terrain-layers-' + (uniforms.uIsOverview.value > 0.5 ? 'o' : 'd');
}

function gridGeometry(h, n, res, x0, z0) {
  // n x n samples, spacing res, first sample at (x0, z0)
  const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i;
    pos[k * 3] = x0 + i * res; pos[k * 3 + 1] = h[k]; pos[k * 3 + 2] = z0 + j * res;
    const hl = h[j * n + Math.max(i - 1, 0)], hr = h[j * n + Math.min(i + 1, n - 1)];
    const hu = h[Math.max(j - 1, 0) * n + i], hd = h[Math.min(j + 1, n - 1) * n + i];
    const dx = (hr - hl) / ((Math.min(i + 1, n - 1) - Math.max(i - 1, 0)) * res);
    const dz = (hd - hu) / ((Math.min(j + 1, n - 1) - Math.max(j - 1, 0)) * res);
    const l = Math.hypot(dx, 1, dz);
    nor[k * 3] = -dx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = -dz / l;
    uv[k * 2] = i / (n - 1); uv[k * 2 + 1] = j / (n - 1);
  }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6);
  let p = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

export class Terrain {
  constructor(site, renderer) {
    this.site = site;
    this.renderer = renderer;
    this.group = new THREE.Group();
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    blank.needsUpdate = true;
    this.uniforms = {
      uHalf: { value: site.half },
      tSlope: { value: blank }, lSlope: { value: 0 }, tStep: { value: blank },
      tBack: { value: blank }, lBack: { value: 0 }, uBackMax: { value: 60 },
      tRadio: { value: blank }, lRadio: { value: 0 },
      tTherm: { value: blank }, lTherm: { value: 0 },
      tMin: { value: blank }, lMin: { value: 0 },
      tRelief: { value: blank }, lRelief: { value: 0 },
      uHideRect: { value: new THREE.Vector4(1e9, 1e9, -1e9, -1e9) },
      uIsOverview: { value: 1 },
    };
    this.tiles = new Map();
    this.tileTarget = null;
  }

  tex(img, { srgb = false, linear = true, mips = true } = {}) {
    const t = new THREE.Texture(img);
    t.flipY = false;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.magFilter = linear ? THREE.LinearFilter : THREE.NearestFilter;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.generateMipmaps = mips;
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    t.needsUpdate = true;
    return t;
  }

  async loadImage(url) {
    const blob = await (await fetch(url)).blob();
    return createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  }

  async build(small = false) {
    const s = this.site;
    // the 2048 px colour first (1.4 MB) so the map appears fast; the 4096 px one swaps in later
    const [g4, img] = await Promise.all([
      loadHeights(s.base + s.dem_4m.file, s.dem_4m.n),
      this.loadImage(s.base + s.ortho.whole_small),
    ]);
    this.h4 = g4.h;
    const n = s.dem_4m.n, res = s.dem_4m.res;
    const geo = gridGeometry(g4.h, n, res, -s.half + res / 2, -s.half + res / 2);
    const mat = new THREE.MeshStandardMaterial({ map: this.tex(img, { srgb: true }), roughness: 1, metalness: 0 });
    this.overviewUniforms = { ...this.uniforms, uIsOverview: { value: 1 } };
    patchMaterial(mat, this.overviewUniforms);
    this.overview = new THREE.Mesh(geo, mat);
    this.overview.castShadow = true;
    this.overview.receiveShadow = true;
    this.group.add(this.overview);
    this.skirt = this.makeSkirt(g4.h, n, res);
    this.group.add(this.skirt);
    if (!small) this.loadImage(s.base + s.ortho.whole).then(big => {
      const old = mat.map; mat.map = this.tex(big, { srgb: true }); mat.needsUpdate = true; old.dispose();
    }).catch(() => {});
    return this;
  }

  // Dark sides around the square so the site reads as a cut block of terrain.
  makeSkirt(h, n, res) {
    const s = this.site, x0 = -s.half + res / 2, floor = -40;
    const pts = [];
    const edge = (fn) => { for (let k = 0; k < n; k++) pts.push(fn(k)); };
    edge(k => [x0 + k * res, h[k], x0]);                         // north
    edge(k => [x0 + (n - 1) * res, h[k * n + n - 1], x0 + k * res]); // east
    edge(k => [x0 + (n - 1 - k) * res, h[(n - 1) * n + n - 1 - k], x0 + (n - 1) * res]); // south
    edge(k => [x0, h[(n - 1 - k) * n], x0 + (n - 1 - k) * res]); // west
    const pos = new Float32Array(pts.length * 6);
    pts.forEach((p, k) => { pos.set([p[0], p[1], p[2], p[0], floor, p[2]], k * 6); });
    const idx = [];
    for (let k = 0; k < pts.length - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 1, side: THREE.DoubleSide });
    return new THREE.Mesh(g, m);
  }

  setLayerTexture(name, tex) { this.uniforms[name].value = tex; this.overviewUniforms[name].value = tex; }
  setLayer(name, v) { this.uniforms[name].value = v; this.overviewUniforms[name].value = v; }

  // ---- detail tiles (1 m heights, 25 cm colour) ----
  tileKey(j, i) { return `r${j}c${i}`; }

  async loadTile(j, i) {
    const s = this.site, key = this.tileKey(j, i);
    if (this.tiles.has(key)) return this.tiles.get(key);
    const rec = { j, i, mesh: null, ready: false };
    this.tiles.set(key, rec);
    const T = s.dem_1m.tile_m;
    const [g, img] = await Promise.all([
      loadHeights(`${s.base}${s.dem_1m.dir}/${key}.png`, s.dem_1m.n),
      this.loadImage(`${s.base}${s.ortho.dir}/${key}.jpg`),
    ]);
    const x0 = -s.half + i * T + 0.5, z0 = -s.half + j * T + 0.5;
    const geo = gridGeometry(g.h, s.dem_1m.n, 1, x0, z0);
    // 25 cm texture covers the tile's 400 m square; vertices sit at pixel centres of the 1 m grid
    const uv = geo.attributes.uv.array, n = s.dem_1m.n;
    for (let jj = 0; jj < n; jj++) for (let ii = 0; ii < n; ii++) {
      const k = jj * n + ii;
      uv[k * 2] = (ii + 0.5) / T; uv[k * 2 + 1] = (jj + 0.5) / T;
    }
    const map = this.tex(img, { srgb: true });
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const u = { ...this.uniforms, uIsOverview: { value: 0 } };
    // share layer uniforms by reference so toggles reach every tile
    for (const k of Object.keys(this.uniforms)) if (k !== 'uIsOverview') u[k] = this.uniforms[k];
    // bump from the same 25 cm HiRISE pixels: shading cues for ripples and blocks at walking range
    const mat = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.6, roughness: 1, metalness: 0 });
    patchMaterial(mat, u);
    rec.mesh = new THREE.Mesh(geo, mat);
    rec.mesh.castShadow = true;
    rec.mesh.receiveShadow = true;
    rec.h = g.h;
    rec.ready = true;
    if (this.wanted && this.wanted.has(key)) this.group.add(rec.mesh);
    this.updateHide();
    return rec;
  }

  // Keep the 3 x 3 block of tiles around (x, z) loaded and shown; null hides all.
  focus(x, z) {
    const s = this.site, T = s.dem_1m.tile_m, N = s.dem_1m.tiles;
    if (x === null) {
      this.wanted = new Set();
    } else {
      const ci = Math.min(N - 1, Math.max(0, Math.floor((x + s.half) / T)));
      const cj = Math.min(N - 1, Math.max(0, Math.floor((z + s.half) / T)));
      this.wanted = new Set();
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++)
        if (j >= 0 && i >= 0 && j < N && i < N) this.wanted.add(this.tileKey(j, i));
    }
    for (const [key, rec] of this.tiles) {
      if (!rec.mesh) continue;
      const want = this.wanted.has(key);
      if (want && !rec.mesh.parent) this.group.add(rec.mesh);
      if (!want && rec.mesh.parent) this.group.remove(rec.mesh);
    }
    for (const key of this.wanted) if (!this.tiles.has(key)) {
      const [, j, i] = key.match(/r(\d+)c(\d+)/);
      this.loadTile(+j, +i);
    }
    this.updateHide();
  }

  updateHide() {
    // hide the overview only where every shown tile is ready (union is a rectangle for a 3x3 block)
    const s = this.site, T = s.dem_1m.tile_m;
    let xmin = 1e9, zmin = 1e9, xmax = -1e9, zmax = -1e9, all = true;
    for (const key of this.wanted || []) {
      const rec = this.tiles.get(key);
      if (!rec || !rec.ready) { all = false; break; }
      xmin = Math.min(xmin, -s.half + rec.i * T); xmax = Math.max(xmax, -s.half + (rec.i + 1) * T);
      zmin = Math.min(zmin, -s.half + rec.j * T); zmax = Math.max(zmax, -s.half + (rec.j + 1) * T);
    }
    const r = this.overviewUniforms.uHideRect.value;
    if (all && xmin < xmax) r.set(xmin + 0.5, zmin + 0.5, xmax - 0.5, zmax - 0.5); else r.set(1e9, 1e9, -1e9, -1e9);
  }

  // best available height at (x, z): 1 m tile if loaded, else the 4 m grid
  heightAt(x, z) {
    const s = this.site, T = s.dem_1m.tile_m, N = s.dem_1m.tiles;
    const i = Math.floor((x + s.half) / T), j = Math.floor((z + s.half) / T);
    const rec = (i >= 0 && j >= 0 && i < N && j < N) ? this.tiles.get(this.tileKey(j, i)) : null;
    if (rec && rec.ready) {
      const n = s.dem_1m.n;
      let u = x - (-s.half + i * T) - 0.5, v = z - (-s.half + j * T) - 0.5;
      u = Math.min(Math.max(u, 0), n - 1.001); v = Math.min(Math.max(v, 0), n - 1.001);
      const a = u | 0, b = v | 0, fu = u - a, fv = v - b, o = b * n + a, h = rec.h;
      return (h[o] * (1 - fu) + h[o + 1] * fu) * (1 - fv) + (h[o + n] * (1 - fu) + h[o + n + 1] * fu) * fv;
    }
    const n = s.dem_4m.n, res = s.dem_4m.res;
    let u = (x + s.half) / res - 0.5, v = (z + s.half) / res - 0.5;
    u = Math.min(Math.max(u, 0), n - 1.001); v = Math.min(Math.max(v, 0), n - 1.001);
    const a = u | 0, b = v | 0, fu = u - a, fv = v - b, o = b * n + a, h = this.h4;
    return (h[o] * (1 - fu) + h[o + 1] * fu) * (1 - fv) + (h[o + n] * (1 - fu) + h[o + n + 1] * fu) * fv;
  }
}
