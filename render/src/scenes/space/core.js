// Shared galaxy renderer for `galaxy` and `phyllo`: one three.js scene holding the baked disk glow, the 56k-star cloud, a
// warm bulge, and per-frame batches of world-space sprites (the worlds) and lines (links, tracers, arms). Scenes fill
// G.sprites / G.lines, set G.view, then call renderGalaxy(ctx).
import * as THREE from 'three';
import { MW, loadMW } from './mw.js';
import { StarCloud, SpriteBatch, LineBatch, setCommon } from './gfx.js';
import { drawSky } from '../sky.js';
import { P } from '../../palette.js';

export let G = null;
const EXT = 17;          // half-size of the glow map, kpc
const GRID = 512;

function blur(src, n, sigma) {
  const r = Math.ceil(sigma * 3), k = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const w = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(w); ks += w; }
  for (let i = 0; i < k.length; i++) k[i] /= ks;
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0; for (let i = -r; i <= r; i++) { const xx = x + i; if (xx >= 0 && xx < n) s += src[y * n + xx] * k[i + r]; } tmp[y * n + x] = s;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0; for (let i = -r; i <= r; i++) { const yy = y + i; if (yy >= 0 && yy < n) s += tmp[yy * n + x] * k[i + r]; } out[y * n + x] = s;
  }
  return out;
}

// the disk's diffuse light: star density splatted on a grid, blurred at two scales (arms, haze), tone-compressed, coloured
function glowTexture() {
  const n = GRID, ch = [new Float32Array(n * n), new Float32Array(n * n), new Float32Array(n * n)];
  const st = MW.stars;
  for (let i = 0; i < MW.nStars; i++) {
    const o = i * 8, x = st[o], y = -st[o + 2];
    const gx = Math.floor((x / (2 * EXT) + 0.5) * n), gy = Math.floor((y / (2 * EXT) + 0.5) * n);
    if (gx < 0 || gy < 0 || gx >= n || gy >= n) continue;
    const b = Math.min(st[o + 7], 2.0);
    ch[0][gy * n + gx] += st[o + 4] * b; ch[1][gy * n + gx] += st[o + 5] * b; ch[2][gy * n + gx] += st[o + 6] * b;
  }
  const A = ch.map((c) => blur(c, n, 2.2)), B = ch.map((c) => blur(c, n, 9));
  const data = new Uint8Array(n * n * 4);
  // normalise on the arms (a high percentile of the non-empty cells), then a soft shoulder so the bulge can't saturate
  const vals = []; for (let i = 0; i < n * n; i += 3) { const v = A[1][i] * 0.6 + B[1][i] * 0.4; if (v > 0) vals.push(v); }
  vals.sort((a, b) => a - b);
  const ref = vals[Math.floor(vals.length * 0.9)] || 1;
  for (let i = 0; i < n * n; i++) {
    for (let c = 0; c < 3; c++) {
      const v = (A[c][i] * 0.6 + B[c][i] * 0.4) / ref * 0.55;
      data[i * 4 + c] = Math.round(255 * Math.sqrt(v / (1 + v)));
    }
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
}

function glowPlane(tex) {
  const g = new THREE.PlaneGeometry(2 * EXT, 2 * EXT, 1, 1);
  g.rotateX(-Math.PI / 2);   // into the XZ plane
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tGlow: { value: tex }, gain: { value: 1 }, off: { value: new THREE.Vector2() }, S: { value: 1 }, tint: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: /* glsl */`
      uniform vec2 off; out vec2 vUv2;
      void main(){ vUv2 = vec2(position.x / ${(2 * EXT).toFixed(1)} + .5, -position.z / ${(2 * EXT).toFixed(1)} + .5);
        vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        c.xy += off / vec2(960., 540.) * c.w; gl_Position = c; }`,
    fragmentShader: /* glsl */`
      precision highp float; uniform sampler2D tGlow; uniform float gain; uniform vec3 tint; in vec2 vUv2; out vec4 fragColor;
      void main(){ vec3 c = texture(tGlow, vUv2).rgb; c = c * c; float e = smoothstep(.5, .42, length(vUv2 - .5)); fragColor = vec4(c * tint * gain * e, 1.); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  return mesh;
}

// camera-facing soft blob in world units (the bulge's glow, a world's corona)
function blob() {
  const g = new THREE.PlaneGeometry(2, 2);
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { center: { value: new THREE.Vector3() }, radius: { value: 2 }, col: { value: new THREE.Color(1, 0.8, 0.5) }, gain: { value: 1 }, off: { value: new THREE.Vector2() }, squash: { value: 0.7 } },
    vertexShader: /* glsl */`
      uniform vec3 center; uniform float radius; uniform vec2 off; uniform float squash; out vec2 vQ;
      void main(){ vec4 c = projectionMatrix * modelViewMatrix * vec4(center, 1.);
        float rp = radius * projectionMatrix[1][1] / c.w;   // NDC radius (y)
        vec2 q = position.xy; vQ = q;
        c.xy += vec2(q.x * rp * 1080. / 1920., q.y * rp * squash) * c.w + off / vec2(960., 540.) * c.w;
        gl_Position = c; }`,
    fragmentShader: /* glsl */`
      precision highp float; uniform vec3 col; uniform float gain; in vec2 vQ; out vec4 fragColor;
      void main(){ float d = length(vQ); float a = exp(-d * d * 7.) * .9 + exp(-d * 3.2) * .25; a *= smoothstep(1., .7, d);
        fragColor = vec4(col * a * gain, 1.); }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  return mesh;
}

export async function initCore(ctx) {
  if (G) return G;
  await loadMW();
  G = {};
  G.scene = new THREE.Scene();
  G.cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.02, 800);
  G.glow = glowPlane(glowTexture()); G.glow.renderOrder = 0;
  G.bulge = blob(); G.bulge.renderOrder = 1;
  G.stars = new StarCloud(MW.stars, MW.nStars); G.stars.mesh.renderOrder = 2;
  G.lines = new LineBatch(32000); G.lines.mesh.renderOrder = 3;
  G.sprites = new SpriteBatch(4000); G.sprites.mesh.renderOrder = 4;
  G.scene.add(G.glow, G.bulge, G.stars.mesh, G.lines.mesh, G.sprites.mesh);
  return G;
}

// orbit camera: target (world), distance, azimuth (about +Y, rad), elevation above the disk plane (rad), fov (deg)
export function camPose(c) {
  const tg = c.target || [0, 0, 0];
  const az = c.az ?? 0, el = c.el ?? 0.5, d = c.dist ?? 40;
  const ce = Math.cos(el), se = Math.sin(el);
  const pos = [tg[0] + d * ce * Math.sin(az), tg[1] + d * se, tg[2] + d * ce * Math.cos(az)];
  const up = [-se * Math.sin(az), ce, -se * Math.cos(az)];
  return { pos, up, target: tg };
}

export function setCam(c) {
  const cam = G.cam, q = camPose(c);
  cam.fov = c.fov ?? 30; cam.aspect = 16 / 9; cam.near = c.near ?? 0.02; cam.far = 800;
  cam.position.set(...q.pos); cam.up.set(...q.up); cam.lookAt(...q.target);
  if (c.roll) { cam.rotateZ(c.roll); }
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  G.camDist = c.dist ?? 40;
}

// project a world point to design px (y down), for 2D labels
export function project(v, off = [0, 0]) {
  const p = new THREE.Vector3(v[0], v[1], v[2]).project(G.cam);
  return [(p.x * 0.5 + 0.5) * 1920 + off[0], (1 - (p.y * 0.5 + 0.5)) * 1080 + off[1], p.z < 1];
}

// world position of a galaxy (x, y, h) point
export const W3 = (x, y, h = 0) => [x, h, -y];

// V: {cam, off:[px,py], sky (bool|exposure), stars (gain), glow (gain), bulge (gain), starSize}
export function renderGalaxy(ctx, V) {
  const e = ctx.engine, S = e.S, off = V.off || [0, 0];
  if (V.sky === false) e.clear(e.rtScene, ...P.void);
  else drawSky(ctx, { density: 0.12, band: 0, neb: 0.18, nebCol: [0.02, 0.03, 0.06], nebCol2: [0.03, 0.025, 0.02], seed: 77, exposure: V.skyExp ?? 1, pan: V.skyPan || [0, 0] });
  setCam(V.cam);
  if (typeof window !== 'undefined') window.__spaceCam = { cam: V.cam, off: V.off, pos: G.cam.position.toArray(), stars: V.stars };
  // screen offset in NDC-of-design convention: our shaders add off in px with y up
  const offU = [off[0], -off[1]];
  setCommon(G.stars.mat, S, offU); setCommon(G.sprites.mat, S, offU); setCommon(G.lines.mat, S, offU);
  G.glow.material.uniforms.off.value.set(offU[0], offU[1]);
  G.bulge.material.uniforms.off.value.set(offU[0], offU[1]);
  const sg = V.stars ?? 1;
  G.stars.mat.uniforms.gain.value = sg; G.stars.mesh.visible = sg > 0.001;
  G.stars.mat.uniforms.sizeK.value = V.starSize ?? 1;
  G.stars.mat.uniforms.refDist.value = V.refDist ?? 40;
  G.stars.mat.uniforms.hot.value = V.starHot ?? 1;
  const gg = V.glow ?? 1; G.glow.material.uniforms.gain.value = gg; G.glow.visible = gg > 0.001;
  const bg = V.bulge ?? 1; const bu = G.bulge.material.uniforms;
  bu.gain.value = bg * 0.16; G.bulge.visible = bg > 0.001; bu.radius.value = V.bulgeR ?? 3.2; bu.col.value.setRGB(1.0, 0.72, 0.42);
  bu.squash.value = 0.35 + 0.65 * Math.abs(Math.sin(V.cam.el ?? 0.5));
  G.sprites.commit(); G.lines.commit();
  const r = e.renderer;
  r.autoClear = false; r.setRenderTarget(e.rtScene); r.render(G.scene, G.cam); r.autoClear = true;
}
