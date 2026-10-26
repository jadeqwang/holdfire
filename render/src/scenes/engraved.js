// ENGRAVED PLATE: a redrawn performance/environment plate in engraved light (the Keeper's material).
// Lines (tools/roto/engrave.py streamlines) are drawn as anti-aliased variable-width capsules in one instanced draw,
// additively, over a faint tone fill and XDoG contours. Footage never appears: only its guide maps are read.
// p: {clip, s0, lag, zoom, pan:[x,y], fadeEdges:[l,r,t,b] (plate-border fade widths, plate px), color:[r,g,b], hot:[r,g,b], wmax, gain, fill, edge, bg:[r,g,b], bgLines (0..1 dim for background)}
import * as THREE from 'three';
import { meta, texture, lines, drawingAt } from '../plates.js';
import { P, css } from '../palette.js';

const faceCache = new Map();
async function faceData(clip) {
  if (faceCache.has(clip)) return faceCache.get(clip);
  let f = null; try { const r = await fetch(`work/guides/${clip}/face.json`); if (r.ok) f = await r.json(); } catch (e) { /* none */ }
  faceCache.set(clip, f); return f;
}

// smooth closed/open curve through points (Catmull-Rom as quadratic midpoints)
function curve(c, pts, closed) {
  if (!pts || pts.length < 3) return;
  const n = pts.length; const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  if (closed) { let m = mid(pts[n - 1], pts[0]); c.moveTo(m[0], m[1]); for (let i = 0; i < n; i++) { const q = mid(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } c.closePath(); }
  else { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const q = mid(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } c.lineTo(pts[n - 1][0], pts[n - 1][1]); }
}

let mesh = null, scene = null, cam = null, fillMat = null;
const MAXSEG = 160000;

function build(e) {
  if (mesh) return;
  const base = new THREE.InstancedBufferGeometry();
  base.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  base.setIndex([0, 1, 2, 0, 2, 3]);
  const segA = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG * 4), 4); segA.setUsage(THREE.DynamicDrawUsage);
  const segB = new THREE.InstancedBufferAttribute(new Float32Array(MAXSEG * 2), 2); segB.setUsage(THREE.DynamicDrawUsage);
  base.setAttribute('seg', segA); base.setAttribute('wid', segB);
  base.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { tMatte: { value: null }, hasMatte: { value: 0 }, wLo: { value: 0.1 }, wHi: { value: 0.95 }, wGam: { value: 1.2 }, bgW: { value: 0.45 }, S: { value: e.S }, wmax: { value: 3.4 }, zoom: { value: 1 }, pan: { value: new THREE.Vector2() }, color: { value: new THREE.Color() }, hot: { value: new THREE.Color() }, gain: { value: 1 }, minW: { value: 0.05 }, wmaxU: { value: 3.4 }, efw: { value: new THREE.Vector4(140, 140, 100, 100) } },
    vertexShader: /* glsl */`
      in vec4 seg; in vec2 wid;
      uniform float S; uniform float wmax; uniform float zoom; uniform vec2 pan;
      uniform sampler2D tMatte; uniform float hasMatte; uniform float wLo; uniform float wHi; uniform float wGam; uniform float bgW; uniform vec4 efw;
      out vec2 vP; out vec4 vSeg; out vec2 vW;
      vec2 remap(vec2 w, vec2 mid){
        float m = hasMatte > .5 ? texture(tMatte, vec2(mid.x / 1920., 1. - mid.y / 1080.)).r : 1.;
        vec2 r = pow(clamp((w - wLo) / (wHi - wLo), 0., 1.), vec2(wGam));
        // fade to the plate border; efw = widths (left, right, top, bottom) in plate px
        float ef = smoothstep(0., efw.x, mid.x) * smoothstep(0., efw.y, 1920. - mid.x) * smoothstep(0., efw.z, mid.y) * smoothstep(0., efw.w, 1080. - mid.y);
        return r * mix(bgW, 1., m) * ef;
      }
      void main(){
        vec2 a = (seg.xy - vec2(960., 540.)) * zoom + vec2(960., 540.) + pan;
        vec2 b = (seg.zw - vec2(960., 540.)) * zoom + vec2(960., 540.) + pan;
        vec2 d = b - a; float L = max(length(d), 1e-3); vec2 t = d / L; vec2 n = vec2(-t.y, t.x);
        vec2 ww = remap(wid, (seg.xy + seg.zw) * .5);
        float hw = max(ww.x, ww.y) * wmax * zoom * .5 + 1.2;
        vec2 p = mix(a, b, position.x) + t * (position.x * 2. - 1.) * hw + n * position.y * hw;
        vP = p; vSeg = vec4(a, b); vW = ww * wmax * zoom * .5;
        if (max(ww.x, ww.y) < .015) p = vec2(-1e5);
        vec2 ndc = vec2(p.x / 960. - 1., 1. - p.y / 540.);
        gl_Position = vec4(ndc, 0., 1.);
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      in vec2 vP; in vec4 vSeg; in vec2 vW;
      uniform vec3 color; uniform vec3 hot; uniform float gain; uniform float S; uniform float wmaxU;
      out vec4 fragColor;
      void main(){
        vec2 a = vSeg.xy, b = vSeg.zw; vec2 pa = vP - a, ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.);
        float d = length(pa - ba * h);
        float r = mix(vW.x, vW.y, h);
        float aa = .75 / S;
        float cov = 1. - smoothstep(r - aa, r + aa, d);
        float w = r * 2. / max(wmaxU, 1.);         // normalised width -> brightness ramp
        vec3 c = mix(color, hot, smoothstep(.55, 1.05, w)) * (.55 + .9 * w) * gain;
        fragColor = vec4(c * cov, cov);
      }`,
    side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  mesh = new THREE.Mesh(base, mat); mesh.frustumCulled = false;
  scene = new THREE.Scene(); scene.add(mesh);
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  fillMat = e.shader(/* glsl */`
    uniform sampler2D tTone; uniform sampler2D tEdge; uniform sampler2D tMatte; uniform float zoom; uniform vec2 pan; uniform vec3 color; uniform vec3 bg;
    uniform float fill; uniform float edge; uniform float hasMatte; uniform vec4 efw;
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 q = (px - vec2(960., 540.) - pan) / zoom + vec2(960., 540.);
      vec2 uv = vec2(q.x / 1920., 1. - q.y / 1080.);
      vec3 col = bg;
      if (uv.x >= 0. && uv.x <= 1. && uv.y >= 0. && uv.y <= 1.) {
        float ef = smoothstep(0., efw.x, q.x) * smoothstep(0., efw.y, 1920. - q.x) * smoothstep(0., efw.z, q.y) * smoothstep(0., efw.w, 1080. - q.y);
        float t = texture(tTone, uv).r * ef; float e = texture(tEdge, uv).r * ef; float m = hasMatte > .5 ? texture(tMatte, uv).r : 1.;
        col += color * pow(t, 3.5) * fill * (.25 + .75 * m);
        col += color * e * edge * (.4 + .6 * m) * 1.6;
      }
      fragColor = vec4(col, 1.);
    }`, { tTone: { value: null }, tEdge: { value: null }, tMatte: { value: null }, zoom: { value: 1 }, pan: { value: new THREE.Vector2() }, color: { value: new THREE.Color() }, bg: { value: new THREE.Color() }, fill: { value: 0.08 }, edge: { value: 0.5 }, hasMatte: { value: 0 }, efw: { value: new THREE.Vector4(140, 140, 100, 100) } });
}

const pad = (k) => String(k).padStart(4, '0');

export default {
  async prepare(ctx, shot, t, lt, p) {
    const m = await meta(p.clip);
    const k = drawingAt(m, t, p.s0 ?? shot.t0, p.lag || 0);
    const base = `work/guides/${p.clip}/`;
    const [ln, tone, edge] = await Promise.all([lines(base + `lines_${pad(k)}.bin`), texture(base + `tone_${pad(k)}.png`), texture(base + `edge_${pad(k)}.png`)]);
    let matte = null; try { matte = await texture(base + `matte_${pad(k)}.png`); } catch (e) { /* optional */ }
    const face = p.face === false ? null : await faceData(p.clip);
    const fr = face ? face.frames[Math.min(face.frames.length - 1, k * (m.step || 2))] : null;
    ctx.state.engr = { ln, tone, edge, matte, k, fr };
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    const { ln, tone, edge, matte } = ctx.state.engr;
    const col = p.color || P.gold, hot = p.hot || P.goldPale;
    const zoom = p.zoom ?? 1, pan = p.pan || [0, 0];
    // fill + contours
    const fu = fillMat.uniforms;
    fu.tTone.value = tone; fu.tEdge.value = edge; fu.tMatte.value = matte; fu.hasMatte.value = matte ? 1 : 0;
    fu.zoom.value = zoom; fu.pan.value.set(pan[0], pan[1]); fu.color.value.setRGB(...col); fu.bg.value.setRGB(...(p.bg || P.void));
    const fe = p.fadeEdges || [140, 140, 100, 100];
    fu.efw.value.set(...fe);
    fu.fill.value = p.fill ?? 0.10; fu.edge.value = p.edge ?? 0.45;
    if (!p.over) e.pass(fillMat, e.rtScene);
    // lines
    const g = mesh.geometry; const A = g.attributes.seg.array, B = g.attributes.wid.array;
    const n = Math.min(MAXSEG, ln.count);
    for (let i = 0; i < n; i++) { A[i * 4] = ln.segs[i * 6]; A[i * 4 + 1] = ln.segs[i * 6 + 1]; A[i * 4 + 2] = ln.segs[i * 6 + 2]; A[i * 4 + 3] = ln.segs[i * 6 + 3]; B[i * 2] = ln.segs[i * 6 + 4]; B[i * 2 + 1] = ln.segs[i * 6 + 5]; }
    g.attributes.seg.needsUpdate = true; g.attributes.wid.needsUpdate = true; g.instanceCount = n;
    const u = mesh.material.uniforms;
    u.wmax.value = p.wmax ?? 6.0; u.wmaxU.value = (p.wmax ?? 6.0) * zoom;
    u.tMatte.value = matte; u.hasMatte.value = matte ? 1 : 0; u.efw.value.set(...fe);
    u.wLo.value = p.wLo ?? 0.12; u.wHi.value = p.wHi ?? 0.95; u.wGam.value = p.wGam ?? 1.25; u.bgW.value = p.bgW ?? 0.4; u.zoom.value = zoom; u.pan.value.set(pan[0], pan[1]); u.color.value.setRGB(...col); u.hot.value.setRGB(...hot); u.gain.value = p.gain ?? 1.15;
    e.renderer.autoClear = false; e.renderer.setRenderTarget(e.rtScene); e.renderer.render(scene, cam); e.renderer.autoClear = true;
    // facial features from landmarks: the mouth opening carved dark, lips, lids, irises, brows (crisp, so expression and lip sync read)
    const fr = ctx.state.engr.fr;
    if (fr && (p.features ?? 1) > 0) {
      const c = e.c2dBegin();
      c.save();
      c.translate(960 + pan[0], 540 + pan[1]); c.scale(zoom, zoom); c.translate(-960, -540);
      const a = p.features ?? 1;
      const lw = Math.max(1.2, fr.faceH * 0.0055);
      c.lineJoin = 'round'; c.lineCap = 'round';
      // mouth interior: dark, so the opening reads
      curve(c, fr.lipsI, true); c.fillStyle = css(P.void, 0.92 * a); c.fill();
      // lips: outer contour, warm gold, slightly heavier on the lower lip
      c.strokeStyle = css(col, 0.45 * a); c.lineWidth = lw * 0.9; curve(c, fr.lipsO, true); c.stroke();
      c.strokeStyle = css(col, 0.5 * a); c.lineWidth = lw * 0.7; curve(c, fr.lipsI, true); c.stroke();
      for (const [eye, iris] of [[fr.eyeL, fr.irisL], [fr.eyeR, fr.irisR]]) {
        if (!eye) continue;
        // eye opening: dark almond, upper lid line heavier
        curve(c, eye, true); c.fillStyle = css(P.void, 0.75 * a); c.fill();
        const top = eye.slice().sort((u, v) => u[0] - v[0]);
        c.strokeStyle = css(col, 0.7 * a); c.lineWidth = lw * 1.1; curve(c, eye, true); c.stroke();
        // iris: a ring of gold with a catchlight (the aperture motif), only when the eye is open
        const ys = eye.map((q) => q[1]); const openH = Math.max(...ys) - Math.min(...ys);
        if (iris && openH > iris[2] * 0.9) {
          c.save(); curve(c, eye, true); c.clip();
          c.strokeStyle = css(col, 0.85 * a); c.lineWidth = lw * 0.9; c.beginPath(); c.arc(iris[0], iris[1], iris[2] * 0.95, 0, Math.PI * 2); c.stroke();
          c.fillStyle = css(P.goldPale, 0.95 * a); c.beginPath(); c.arc(iris[0] - iris[2] * 0.3, iris[1] - iris[2] * 0.35, Math.max(1, iris[2] * 0.18), 0, Math.PI * 2); c.fill();
          c.restore();
        }
      }
      // brows: two engraved strokes each
      for (const b of [fr.browL, fr.browR]) {
        if (!b) continue;
        const up = b.slice(0, 5), lo = b.slice(5).reverse();
        c.strokeStyle = css(col, 0.6 * a); c.lineWidth = lw * 0.9; curve(c, up, false); c.stroke(); curve(c, lo, false); c.stroke();
      }
      c.restore();
      e.blit2d('over', p.featGain ?? 1.4);
    }
  },
};
