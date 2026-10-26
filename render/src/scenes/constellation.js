// CONSTELLATION PLATE: the Listener (AI) drawn as stars and the links between them — the same stuff as the contact graph.
// Stars come from tools/roto/constellation.py (flow-carried, stable ids); the face is traced from landmarks as brighter
// stars joined in order (lips, lids, brows), so the singing reads. Ice by default; p.gold (0..1) turns her to signal gold.
// p: {clip, s0, lag, zoom, pan, gold, starSize, linkAlpha, gain, sky (bool: draw deep sky behind), skyP}
import * as THREE from 'three';
import { meta, drawingAt } from '../plates.js';
import { P } from '../palette.js';
import { drawSky } from './sky.js';

const starCache = new Map();
async function stars(url) {
  if (starCache.has(url)) return starCache.get(url);
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf); let p = 0;
  const n = dv.getInt32(p, true); p += 4;
  const xy = new Float32Array(n * 2), b = new Float32Array(n), id = new Int32Array(n);
  for (let i = 0; i < n; i++) { xy[i * 2] = dv.getFloat32(p, true); xy[i * 2 + 1] = dv.getFloat32(p + 4, true); b[i] = dv.getFloat32(p + 8, true); id[i] = dv.getInt32(p + 12, true); p += 16; }
  const m = dv.getInt32(p, true); p += 4;
  const L = new Int32Array(buf.slice(p, p + m * 8));
  const v = { n, xy, b, id, m, L };
  starCache.set(url, v); if (starCache.size > 80) starCache.delete(starCache.keys().next().value);
  return v;
}
const faceCache = new Map();
async function faceData(clip) {
  if (faceCache.has(clip)) return faceCache.get(clip);
  let f = null; try { const r = await fetch(`work/guides/${clip}/face.json`); if (r.ok) f = await r.json(); } catch (e) { /* */ }
  faceCache.set(clip, f); return f;
}

let starMesh = null, linkMesh = null, scene = null, cam = null;
const MAXS = 12000, MAXL = 30000;

function build(e) {
  if (starMesh) return;
  const quad = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  // stars: instanced sprites, gaussian core + faint halo, size from brightness
  const sg = new THREE.InstancedBufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(quad, 3)); sg.setIndex([0, 1, 2, 0, 2, 3]);
  sg.setAttribute('star', new THREE.InstancedBufferAttribute(new Float32Array(MAXS * 4), 4));
  const sm = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { zoom: { value: 1 }, pan: { value: new THREE.Vector2() }, size: { value: 2.2 }, col: { value: new THREE.Color() }, gain: { value: 1 }, S: { value: e.S } },
    vertexShader: /* glsl */`
      in vec4 star; uniform float zoom; uniform vec2 pan; uniform float size; out vec2 vQ; out float vB;
      void main(){
        vec2 c = (star.xy - vec2(960., 540.)) * zoom + vec2(960., 540.) + pan;
        float r = size * (.55 + 1.3 * star.z) * (1. + star.w) * 3.;
        vec2 p = c + position.xy * r; vQ = position.xy * 3.; vB = star.z * (1. + star.w);
        if (star.z <= 0.) p = vec2(-1e5);
        gl_Position = vec4(p.x / 960. - 1., 1. - p.y / 540., 0., 1.);
      }`,
    fragmentShader: /* glsl */`
      precision highp float; in vec2 vQ; in float vB; uniform vec3 col; uniform float gain; out vec4 fragColor;
      void main(){ float d2 = dot(vQ, vQ); float core = exp(-d2 * 2.2); float halo = exp(-d2 * .45) * .12;
        vec3 c = col * (core * (1.2 + 2.5 * vB) + halo) * gain; fragColor = vec4(c, 1.); }`,
  });
  starMesh = new THREE.Mesh(sg, sm); starMesh.frustumCulled = false;
  // links: instanced thin capsules
  const lg = new THREE.InstancedBufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)); lg.setIndex([0, 1, 2, 0, 2, 3]);
  lg.setAttribute('seg', new THREE.InstancedBufferAttribute(new Float32Array(MAXL * 4), 4));
  lg.setAttribute('la', new THREE.InstancedBufferAttribute(new Float32Array(MAXL), 1));
  const lm = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { zoom: { value: 1 }, pan: { value: new THREE.Vector2() }, width: { value: 1.1 }, col: { value: new THREE.Color() }, alpha: { value: 0.5 }, S: { value: e.S } },
    vertexShader: /* glsl */`
      in vec4 seg; in float la; uniform float zoom; uniform vec2 pan; uniform float width;
      out vec2 vP; out vec4 vSeg; out float vA;
      void main(){
        vec2 a = (seg.xy - vec2(960., 540.)) * zoom + vec2(960., 540.) + pan;
        vec2 b = (seg.zw - vec2(960., 540.)) * zoom + vec2(960., 540.) + pan;
        vec2 d = b - a; float L = max(length(d), 1e-3); vec2 t = d / L; vec2 n = vec2(-t.y, t.x);
        float hw = width * .5 + 1.;
        vec2 p = mix(a, b, position.x) + t * (position.x * 2. - 1.) * hw + n * position.y * hw;
        vP = p; vSeg = vec4(a, b); vA = la;
        if (la <= 0.) p = vec2(-1e5);
        gl_Position = vec4(p.x / 960. - 1., 1. - p.y / 540., 0., 1.);
      }`,
    fragmentShader: /* glsl */`
      precision highp float; in vec2 vP; in vec4 vSeg; in float vA; uniform vec3 col; uniform float width; uniform float alpha; uniform float S; out vec4 fragColor;
      void main(){ vec2 pa = vP - vSeg.xy, ba = vSeg.zw - vSeg.xy; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.);
        float d = length(pa - ba * h); float cov = 1. - smoothstep(width * .5 - .6 / S, width * .5 + .6 / S, d);
        fragColor = vec4(col * cov * vA * alpha, 1.); }`,
  });
  linkMesh = new THREE.Mesh(lg, lm); linkMesh.frustumCulled = false;
  scene = new THREE.Scene(); scene.add(linkMesh); scene.add(starMesh);
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}

const pad = (k) => String(k).padStart(4, '0');
const FEAT = [['lipsO', true], ['lipsI', true], ['eyeL', true], ['eyeR', true], ['browL', false], ['browR', false], ['nose', false]];

export default {
  async prepare(ctx, shot, t, lt, p) {
    const m = await meta(p.clip);
    const k = drawingAt(m, t, p.s0 ?? shot.t0, p.lag || 0);
    const st = await stars(`work/guides/${p.clip}/stars_${pad(k)}.bin`);
    const face = p.face === false ? null : await faceData(p.clip);
    const fr = face ? face.frames[Math.min(face.frames.length - 1, k * (m.step || 2))] : null;
    ctx.state.const = { st, fr, k };
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    if (p.over) { /* layered: draw on top */ } else if (p.sky !== false) drawSky(ctx, { density: 0.35, band: 0.15, neb: 0.25, nebCol: [0.02, 0.04, 0.08], seed: 21, ...(p.skyP || {}) });
    else e.clear(e.rtScene, ...P.void);
    const { st, fr } = ctx.state.const;
    const zoom = p.zoom ?? 1, pan = p.pan || [0, 0];
    const gold = p.gold ?? 0;
    const col = [P.ice[0] + (P.gold[0] - P.ice[0]) * gold, P.ice[1] + (P.gold[1] - P.ice[1]) * gold, P.ice[2] + (P.gold[2] - P.ice[2]) * gold];
    // stars from the plate + landmark stars
    const S = starMesh.geometry.attributes.star.array; let ns = 0;
    const tw = (id) => 0.15 * Math.sin(t * 2.1 + (id % 97) * 0.7);   // gentle per-star shimmer
    for (let i = 0; i < st.n && ns < MAXS; i++, ns++) { S[ns * 4] = st.xy[i * 2]; S[ns * 4 + 1] = st.xy[i * 2 + 1]; S[ns * 4 + 2] = st.b[i]; S[ns * 4 + 3] = tw(st.id[i]); }
    const LA = linkMesh.geometry.attributes.seg.array, LL = linkMesh.geometry.attributes.la.array; let nl = 0;
    for (let q = 0; q < st.m && nl < MAXL; q++, nl++) {
      const i = st.L[q * 2], j = st.L[q * 2 + 1];
      const x0 = st.xy[i * 2], y0 = st.xy[i * 2 + 1], x1 = st.xy[j * 2], y1 = st.xy[j * 2 + 1];
      LA[nl * 4] = x0; LA[nl * 4 + 1] = y0; LA[nl * 4 + 2] = x1; LA[nl * 4 + 3] = y1;
      const len = Math.hypot(x1 - x0, y1 - y0);
      LL[nl] = Math.min(st.b[i], st.b[j]) * Math.max(0, 1 - len / 40);
    }
    if (fr && (p.features ?? 1) > 0) {
      for (const [key, closed] of FEAT) {
        const pts = fr[key]; if (!pts) continue;
        for (let i = 0; i < pts.length; i++) {
          if (ns < MAXS) { S[ns * 4] = pts[i][0]; S[ns * 4 + 1] = pts[i][1]; S[ns * 4 + 2] = 0.9; S[ns * 4 + 3] = 0.4; ns++; }
          const j = (i + 1) % pts.length; if (!closed && j === 0) continue;
          if (nl < MAXL) { LA[nl * 4] = pts[i][0]; LA[nl * 4 + 1] = pts[i][1]; LA[nl * 4 + 2] = pts[j][0]; LA[nl * 4 + 3] = pts[j][1]; LL[nl] = 1.6 * (p.features ?? 1); nl++; }
        }
      }
    }
    const sg = starMesh.geometry; sg.attributes.star.needsUpdate = true; sg.instanceCount = ns;
    const lg = linkMesh.geometry; lg.attributes.seg.needsUpdate = true; lg.attributes.la.needsUpdate = true; lg.instanceCount = nl;
    const su = starMesh.material.uniforms; su.zoom.value = zoom; su.pan.value.set(pan[0], pan[1]); su.size.value = p.starSize ?? 1.6; su.col.value.setRGB(...col); su.gain.value = p.gain ?? 1.0;
    const lu = linkMesh.material.uniforms; lu.zoom.value = zoom; lu.pan.value.set(pan[0], pan[1]); lu.col.value.setRGB(...col); lu.alpha.value = p.linkAlpha ?? 0.45; lu.width.value = p.linkW ?? 1.1;
    e.renderer.autoClear = false; e.renderer.setRenderTarget(e.rtScene); e.renderer.render(scene, cam); e.renderer.autoClear = true;
  },
};
