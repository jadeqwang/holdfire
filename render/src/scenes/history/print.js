// PRINTED MATTER, the history material (docs/STYLE_BIBLE.md §1): cream archival paper with fibre and tooth, black ink in an
// amplitude-modulated halftone (Euclidean dot, 45°), ONE red spot ink (75°, for fire and alarm light only), the plates slightly
// out of register, ink multiplied into the paper the way a press lays it down. Paper is static per shot (baked once per seed).
//
// Three ways in:
//   1. PRINT_GLSL in your own fragment shader: compute ink densities per pixel, then `printPixel(page, kTone, kSolid, rTone, rSolid)`.
//   2. The canvas press: `pressBegin(e)` gives a 2D context on white paper (design px). Paint with `ink(kTone, kSolid, rTone)`
//      colours (painter's order = occlusion), then `pressPrint(e, opts)` screens it onto the paper into rtScene.
//   3. `pressPrint(e, {mode:'multiply'})` overprints the inks onto whatever rtScene already holds (an overlay on another plate).
// Densities: kTone (black, screened), kSolid (black line art / calligraphy, unscreened), rTone (red, screened), rSolid (red solid).
import * as THREE from 'three';
import { P } from '../../palette.js';
import { hash1 } from '../../util.js';

export const INK_K = [0.085, 0.079, 0.074];   // warm press black (multiplied into the paper)
export const INK_R = P.red;                    // the one red
export const PAPER = P.cream;

// recommended post block for a printed shot: no tone map (the paper must stay the paper), no bloom on the page
export const PRINT_LOOK = { tonemap: 0, bloom: 0.0, bloomThreshold: 2.0, halation: 0, streak: 0, grain: 0.012, vignette: 0.22, typeGlow: 0 };

export const PRINT_GLSL = /* glsl */`
uniform sampler2D tPaper;      // baked paper: rgb = stock colour, a = tooth (fine fibre height)
uniform vec3 paperCol; uniform vec3 inkK; uniform vec3 inkR;
uniform float cellK; uniform float cellR; uniform float angK; uniform float angR;  // screen ruling (design px) and angles
uniform vec2 offK; uniform vec2 offR;          // misregistration of each plate (design px)
uniform float rough;           // ink edge roughness (dot edges eaten by the paper's tooth)
uniform float kGain; uniform float rGain;      // overall ink densities
uniform float pageZoom; uniform vec2 pagePan;  // rostrum camera over the page (zoom about the centre, pan in design px)
// design px of this fragment, and its page coordinate under the rostrum camera
vec2 fragDesign(){ return vec2(vUv.x * 1920., (1. - vUv.y) * 1080.); }
vec2 toPage(vec2 d){ return (d - vec2(960., 540.) - pagePan) / pageZoom + vec2(960., 540.); }
vec2 pageUv(vec2 page){ return vec2(page.x / 1920., 1. - page.y / 1080.); }
vec4 paperAt(vec2 page){ vec2 uv = pageUv(page); uv = abs(mod(uv + 1., 2.) - 1.); return texture(tPaper, uv); }
// Euclidean spot function: round dots in the lights, a checkerboard at 50 %, round holes in the shadows (natural dot gain)
float spotE(vec2 q){ vec2 f = abs(fract(q) - .5) * 2.;
  return (f.x + f.y <= 1.) ? (f.x * f.x + f.y * f.y) * .5 : 1. - ((1. - f.x) * (1. - f.x) + (1. - f.y) * (1. - f.y)) * .5; }
float screenAM(vec2 page, float v, float cell, float ang, float n){
  vec2 q = rot(ang) * page / cell;
  float s = spotE(q) + n;
  float w = max(fwidth(s), 1e-4) * .75;     // derivatives before any branch
  v = clamp(v, 0., 1.);
  return v < .004 ? 0. : 1. - smoothstep(v - w, v + w, s);
}
// lay the inks on the paper. page = page coord of this pixel (content must already be sampled with offK / offR applied)
vec3 printPixel(vec2 page, float kTone, float kSolid, float rTone, float rSolid){
  vec4 pp = paperAt(page);
  float tooth = pp.a - .5;
  float mottle = luma(pp.rgb) / max(luma(paperCol), 1e-3);
  vec2 pk = page - offK, pr = page - offR;
  float ck = max(screenAM(pk, kTone * kGain, cellK, angK, tooth * rough), clamp((kSolid * kGain - .5) * 1.7 + .5 + tooth * rough * .8, 0., 1.));
  float cr = max(screenAM(pr, rTone * rGain, cellR, angR, -tooth * rough), clamp((rSolid * rGain - .5) * 1.7 + .5 - tooth * rough * .8, 0., 1.));
  ck *= .9 + .1 * mottle; cr *= .92 + .08 * mottle;
  vec3 col = pp.rgb;
  col *= mix(vec3(1.), inkR, cr);
  col *= mix(vec3(1.), inkK, ck);
  return col;
}
// the same inks as a multiply factor (for overprinting onto an existing image)
vec3 printFactor(vec2 page, float kTone, float kSolid, float rTone, float rSolid){
  vec4 pp = paperAt(page); float tooth = pp.a - .5;
  vec2 pk = page - offK, pr = page - offR;
  float ck = max(screenAM(pk, kTone * kGain, cellK, angK, tooth * rough), clamp((kSolid * kGain - .5) * 1.7 + .5 + tooth * rough * .8, 0., 1.));
  float cr = max(screenAM(pr, rTone * rGain, cellR, angR, -tooth * rough), clamp((rSolid * rGain - .5) * 1.7 + .5 - tooth * rough * .8, 0., 1.));
  return mix(vec3(1.), inkR, cr) * mix(vec3(1.), inkK, ck);
}
`;

export function printUniforms() {
  return {
    tPaper: { value: null }, paperCol: { value: new THREE.Color(...PAPER) }, inkK: { value: new THREE.Color(...INK_K) }, inkR: { value: new THREE.Color(...INK_R) },
    cellK: { value: 6 }, cellR: { value: 6 }, angK: { value: Math.PI / 4 }, angR: { value: 75 * Math.PI / 180 },
    offK: { value: new THREE.Vector2() }, offR: { value: new THREE.Vector2() }, rough: { value: 0.12 },
    kGain: { value: 1 }, rGain: { value: 1 }, pageZoom: { value: 1 }, pagePan: { value: new THREE.Vector2() },
  };
}

// set the common print uniforms. o: {seed, cell, cellR, angK, angR (deg), misreg (design px), rough, kGain, rGain, zoom, pan, paper}
export function setPrint(e, u, o = {}) {
  const seed = o.seed ?? 1;
  u.tPaper.value = paperTexture(e, seed, o.paper);
  if (o.paper) u.paperCol.value.setRGB(...o.paper); else u.paperCol.value.setRGB(...PAPER);
  u.cellK.value = o.cell ?? 6; u.cellR.value = o.cellR ?? (o.cell ?? 6) * 1.05;
  u.angK.value = (o.angK ?? 45) * Math.PI / 180; u.angR.value = (o.angR ?? 75) * Math.PI / 180;
  // misregistration: a fixed, per-shot offset of the red plate (and a hair on the black), never animated
  const m = o.misreg ?? 2.2;
  const a = hash1(seed * 7.13 + 1.1) * Math.PI * 2;
  u.offR.value.set(Math.cos(a) * m, Math.sin(a) * m);
  u.offK.value.set(Math.cos(a + 2.4) * m * 0.25, Math.sin(a + 2.4) * m * 0.25);
  u.rough.value = o.rough ?? 0.12;
  u.kGain.value = o.kGain ?? 1; u.rGain.value = o.rGain ?? 1;
  u.pageZoom.value = o.zoom ?? 1; u.pagePan.value.set(...(o.pan || [0, 0]));
}

// ------------------------------------------------------------------ paper stock, baked once per (seed, colour)
const paperCache = new Map();
let paperMat = null;
export function paperTexture(e, seed = 1, col = PAPER) {
  const key = `${seed}|${col.join(',')}`;
  if (paperCache.has(key)) return paperCache.get(key).texture;
  if (!paperMat) {
    paperMat = e.shader(/* glsl */`
      uniform float seed; uniform vec3 paper;
      void main(){
        vec2 d = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
        vec2 o = vec2(fract(seed * .1731) * 400., fract(seed * .3917) * 400.);
        float m = fbm(d / 420. + o) - .5;                 // slow mottling of the stock
        float cl = vnoise(d / 55. + o * 1.7) - .5;        // formation (cloudiness of the pulp)
        vec2 r1 = rot(.35 + seed) * d, r2 = rot(-1.2 + seed * 2.) * d, r3 = rot(.8 - seed) * d;
        float f1 = smoothstep(.74, .93, vnoise(r1 * vec2(.010, .42) + o));      // long pale fibres
        float f2 = smoothstep(.78, .95, vnoise(r2 * vec2(.018, .55) - o));
        float f3 = smoothstep(.84, .97, vnoise(r3 * vec2(.024, .75) + o * .5)); // a few darker fibres
        float sp = step(.99935, hash12(floor(d / 2.2) + o)) * (.5 + .5 * hash12(floor(d / 2.2) + 7.)); // inclusions
        float tooth = vnoise(d * .62 + o) * .65 + vnoise(d * 1.7 - o) * .35;
        vec3 col = paper * (1. + m * .055 + cl * .022 + (f1 * .6 + f2 * .4) * .022 - f3 * .035 - sp * .32);
        col *= mix(vec3(1.), vec3(1.0, .975, .93), smoothstep(-.1, .35, m) * .55);   // foxing: faint warm patches
        fragColor = vec4(col, tooth);
      }`, { seed: { value: 0 }, paper: { value: new THREE.Color() } });
  }
  const rt = new THREE.WebGLRenderTarget(e.W, e.H, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  paperMat.uniforms.seed.value = seed; paperMat.uniforms.paper.value.setRGB(...col);
  e.pass(paperMat, rt);
  paperCache.set(key, rt);
  if (paperCache.size > 6) { const [k0, v0] = paperCache.entries().next().value; v0.dispose(); paperCache.delete(k0); }
  return rt.texture;
}

// ------------------------------------------------------------------ multiply pass (overprint onto rtScene)
export function passMultiply(e, mat, target) {
  mat.transparent = true; mat.blending = THREE.CustomBlending;
  mat.blendEquation = THREE.AddEquation; mat.blendSrc = THREE.DstColorFactor; mat.blendDst = THREE.ZeroFactor;
  e.renderer.autoClear = false;
  e.quadMesh.material = mat;
  e.renderer.setRenderTarget(target || e.rtScene);
  e.renderer.render(e.quadScene, e.quadCam);
  e.renderer.autoClear = true;
}

// ------------------------------------------------------------------ the canvas press
// The press canvas is painted like paper: white = no ink. Channels: R = 1 - black tone, G = 1 - black solid, B = 1 - red tone.
// `ink(k, s, r)` gives the fill colour for a mark with those densities; painting white erases (occludes) what is beneath.
let pressCv = null, pressCtx = null, pressTex = null, pressMat = null;
export function ink(k = 0, s = 0, r = 0, a = 1) {
  const q = (v) => Math.round(255 * (1 - Math.max(0, Math.min(1, v))));
  return `rgba(${q(k)},${q(s)},${q(r)},${a})`;
}
export const WHITE = 'rgb(255,255,255)';

export function pressBegin(e) {
  if (!pressCv) {
    pressCv = document.createElement('canvas'); pressCv.width = e.W; pressCv.height = e.H;
    pressCtx = pressCv.getContext('2d');
    pressTex = new THREE.CanvasTexture(pressCv);
    pressTex.colorSpace = THREE.NoColorSpace; pressTex.generateMipmaps = false; pressTex.minFilter = THREE.LinearFilter; pressTex.magFilter = THREE.LinearFilter;
  }
  const c = pressCtx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.fillStyle = WHITE; c.fillRect(0, 0, e.W, e.H);
  c.setTransform(e.S, 0, 0, e.S, 0, 0);
  return c;
}

// screen the press canvas onto paper. o: setPrint options + {mode:'replace'|'multiply', field: texture (RGBA densities kTone,kSolid,rTone,rSolid added), fieldGain}
export function pressPrint(e, o = {}) {
  if (!pressMat) {
    pressMat = e.shader(/* glsl */`
      ${PRINT_GLSL}
      uniform sampler2D tPress; uniform float hasPress; uniform sampler2D tField; uniform float hasField; uniform float mul;
      vec4 dens(vec2 page, vec2 off){
        vec2 uv = pageUv(page + off);
        vec4 d = vec4(0.);
        if (hasPress > .5 && uv.x >= 0. && uv.x <= 1. && uv.y >= 0. && uv.y <= 1.) { vec3 c = 1. - texture(tPress, uv).rgb; d = vec4(c.r, c.g, c.b, 0.); }
        if (hasField > .5) { vec4 f = texture(tField, uv); d = clamp(d + f, 0., 1.); }
        return d;
      }
      void main(){
        vec2 page = toPage(fragDesign());
        vec4 dk = dens(page, -offK), dr = dens(page, -offR);
        if (mul > .5) fragColor = vec4(printFactor(page, dk.x, dk.y, dr.z, dr.w), 1.);
        else fragColor = vec4(printPixel(page, dk.x, dk.y, dr.z, dr.w), 1.);
      }`, { ...printUniforms(), tPress: { value: null }, hasPress: { value: 0 }, tField: { value: null }, hasField: { value: 0 }, mul: { value: 0 } });
  }
  const u = pressMat.uniforms;
  setPrint(e, u, o);
  if (pressTex && o.press !== false) { pressTex.needsUpdate = true; u.tPress.value = pressTex; u.hasPress.value = 1; } else u.hasPress.value = 0;
  u.tField.value = o.field || null; u.hasField.value = o.field ? 1 : 0;
  const mul = o.mode === 'multiply';
  u.mul.value = mul ? 1 : 0;
  if (mul) passMultiply(e, pressMat, o.target || e.rtScene);
  else e.pass(pressMat, o.target || e.rtScene);
}
