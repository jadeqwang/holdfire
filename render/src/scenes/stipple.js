// BIOLUMINESCENT STIPPLE PLATE: the Other's material. Soft dots sampled from the plate (tools/roto/constellation.py with
// --color=1, denser), front-lit only, breathing; each dot takes its colour from the plate's colour guide: warm light
// (eye-spots, the egg, the gold-ringed eyes) stays gold, the body is luna green fading to violet in shadow. No links.
// p: {clip, s0, lag, zoom, pan, size, gain, breathe, sky (bool), skyP, warm (gold threshold), green, violet}
import * as THREE from 'three';
import { meta, texture, drawingAt } from '../plates.js';
import { P } from '../palette.js';
import { drawSky } from './sky.js';

const cache = new Map();
async function stars(url) {
  if (cache.has(url)) return cache.get(url);
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf); let p = 0;
  const n = dv.getInt32(p, true); p += 4;
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { a[i * 4] = dv.getFloat32(p, true); a[i * 4 + 1] = dv.getFloat32(p + 4, true); a[i * 4 + 2] = dv.getFloat32(p + 8, true); a[i * 4 + 3] = dv.getInt32(p + 12, true) % 1000 / 1000; p += 16; }
  const v = { n, a }; cache.set(url, v); if (cache.size > 80) cache.delete(cache.keys().next().value);
  return v;
}

let mesh = null, scene = null, cam = null;
const MAX = 16000;
function build(e) {
  if (mesh) return;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('pt', new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4));
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tCol: { value: null }, zoom: { value: 1 }, pan: { value: new THREE.Vector2() }, size: { value: 2.4 }, gain: { value: 1 }, time: { value: 0 },
      breathe: { value: 0.25 }, warm: { value: 0.18 }, green: { value: new THREE.Color() }, violet: { value: new THREE.Color() }, gold: { value: new THREE.Color() } },
    vertexShader: /* glsl */`
      in vec4 pt; uniform sampler2D tCol; uniform float zoom; uniform vec2 pan; uniform float size; uniform float time; uniform float breathe; uniform float warm;
      uniform vec3 green; uniform vec3 violet; uniform vec3 gold;
      out vec2 vQ; out vec3 vC;
      void main(){
        vec3 pc = texture(tCol, vec2(pt.x / 1920., 1. - pt.y / 1080.)).rgb;
        float l = dot(pc, vec3(.299, .587, .114));
        float warmth = clamp((pc.r - pc.b) * 2.2 - .05, 0., 1.) * smoothstep(warm, warm + .25, l);
        vec3 body = mix(violet * .55, green, smoothstep(.08, .55, l));
        vC = mix(body, gold * 1.6, warmth) * (.35 + 1.25 * pt.z);
        float br = 1. + breathe * sin(time * 1.7 + pt.w * 6.283);
        vec2 c = (pt.xy - vec2(960., 540.)) * zoom + vec2(960., 540.) + pan;
        float r = size * (.6 + 1.2 * pt.z) * (1. + warmth * .8) * br * 2.5;
        vec2 p = c + position.xy * r; vQ = position.xy * 2.5;
        if (pt.z <= 0.) p = vec2(-1e5);
        gl_Position = vec4(p.x / 960. - 1., 1. - p.y / 540., 0., 1.);
      }`,
    fragmentShader: /* glsl */`
      precision highp float; in vec2 vQ; in vec3 vC; uniform float gain; out vec4 fragColor;
      void main(){ float d2 = dot(vQ, vQ); float a = exp(-d2 * 1.6) + exp(-d2 * .35) * .08; fragColor = vec4(vC * a * gain, 1.); }`,
  });
  mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
  scene = new THREE.Scene(); scene.add(mesh); cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}

const pad = (k) => String(k).padStart(4, '0');
export default {
  async prepare(ctx, shot, t, lt, p) {
    const m = await meta(p.clip);
    const k = drawingAt(m, t, p.s0 ?? shot.t0, p.lag || 0);
    const [st, col] = await Promise.all([stars(`work/guides/${p.clip}/stars_${pad(k)}.bin`), texture(`work/guides/${p.clip}/color_${pad(k)}.jpg`)]);
    ctx.state.stip = { st, col };
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    if (p.over) { /* layered */ } else if (p.sky !== false) drawSky(ctx, { density: 0.45, band: 0.3, neb: 0.35, nebCol: [0.02, 0.05, 0.07], nebCol2: [0.05, 0.03, 0.09], seed: 89, ...(p.skyP || {}) });
    else e.clear(e.rtScene, ...P.void);
    const { st, col } = ctx.state.stip;
    const A = mesh.geometry.attributes.pt.array; const n = Math.min(MAX, st.n);
    A.set(st.a.subarray(0, n * 4));
    mesh.geometry.attributes.pt.needsUpdate = true; mesh.geometry.instanceCount = n;
    const u = mesh.material.uniforms;
    u.tCol.value = col; u.zoom.value = p.zoom ?? 1; u.pan.value.set(...(p.pan || [0, 0])); u.size.value = p.size ?? 1.5; u.gain.value = p.gain ?? 1;
    u.time.value = t; u.breathe.value = p.breathe ?? 0.2; u.warm.value = p.warm ?? 0.18;
    u.green.value.setRGB(...(p.green || P.luna)); u.violet.value.setRGB(...(p.violet || P.violet)); u.gold.value.setRGB(...P.gold);
    e.renderer.autoClear = false; e.renderer.setRenderTarget(e.rtScene); e.renderer.render(scene, cam); e.renderer.autoClear = true;
  },
};
