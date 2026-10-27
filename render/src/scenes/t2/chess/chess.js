// t2_chess: the bridge's chess game (Fischer–Tal, Leipzig 1960, ½–½) as an anime battle. A real 3D board and lathe-turned
// pieces with cel shading (three-tone ramp, hard spec and rim) and inverted-hull ink outlines; a twin chess clock with LCD faces
// that count down for real; a scoresheet with the pause-frame credit; the hall's lights going down to one pool on the board;
// eyes in the dark; speed lines, impact frames, smash zooms; captured pieces flying past the lens as a chain; and a dive into
// the black queen that ends on a flat black square on cream (handoff to t2_poster_morph).
//
// p: {
//   mode: 'set' | 'game' | 'dive'   (board state is always the pure function of t; mode picks defaults)
//   cam: 'auto' | 'wide' | 'top' | 'topB' | 'threeq' | 'threeqB' | 'low' | 'piece' | 'clock' | 'sheet' | {pos,target,fov} | [{t, cam, cut}]
//   focus: 'g4' | 'mover' | 'queen'  (for cam 'piece');  az, azSpeed, r, y, fov (for 'low' / 'piece');  az0 (rotate any preset)
//   swingAt, swingDur, swingAngle   (an extra swing about the board)
//   fx: 1 (all effects), smash, shake, speed (speed-line gain), impact (impact frames on/off), lights (override room level 0..1),
//   eyes (gain), sparks (gain)
//   dive: d0 = 157.8, d1 = 158.7, size = 360 (side of the final black square, design px; = t2_poster_morph square0), cream '#F1E8D6', ink '#111010'
//   hand shots: handTracks [{side, move: '5...Ba5'} | {side, press: 'start' | '1.e4' | t} | {side, hold: 'g4', hover?, release: t}]
//   (hands.js: cut-out arm sprites over the true board; the moving piece is the one state.js carries, the hand holds its head),
//   twos (the whole shot on twos, phase-locked to its first frame), smear 0 (no smear on a piece in a hand), handLook {size, gain, rotAmt}
// }
// Recommended look: CHESS_LOOK (no tone map: the colours are authored display-referred; the dive needs tonemap 0, bloom 0).
import * as THREE from 'three';
import { buildGeometries, linkGeometry, PROFILES, QUEEN_BALLS, HEIGHT } from './pieces.js';
import { GAME } from './pgn.js';
import { buildSchedule } from './schedule.js';
import { boardState, sqPos, FALL } from './state.js';
import { cameraAt, cameraFx, CLOCK_POS, SHEET_POS } from './camera.js';
import { loadHands, handsAt, drawHands, handShadowOf } from './hands.js';
import { borderTexture, clockCanvas, drawClock, sheetCanvas, drawSheet, BORDER } from './textures.js';
import { clamp, lerp, smooth, smoother, hash1, hash2, noise1, easeOutCubic, easeInCubic, easeInOutCubic } from '../../../util.js';

export const CHESS_LOOK = { tonemap: 0, bloom: 0.42, bloomThreshold: 0.92, halation: 0.1, halCol: [1, 0.55, 0.3], vignette: 0.22, grain: 0.018, typeGlow: 0 };
export const DIVE_LOOK = { tonemap: 0, bloom: 0, halation: 0, vignette: 0, grain: 0, typeGlow: 0 };

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const C3 = (a) => new THREE.Color(a[0], a[1], a[2]);
const CREAM = hex('#F1E8D6'), INK = [0.035, 0.035, 0.05];

const PAL = {
  white: { light: [1.0, 0.975, 0.93], mid: [0.87, 0.8, 0.73], shadow: [0.5, 0.48, 0.64], rim: [1.0, 0.62, 0.32], spec: [1.25, 1.22, 1.15] },
  black: { light: [0.4, 0.42, 0.55], mid: [0.18, 0.19, 0.27], shadow: [0.07, 0.07, 0.11], rim: [0.3, 0.95, 0.82], spec: [1.0, 1.05, 1.1] },
  wood: { light: [0.48, 0.27, 0.16], mid: [0.33, 0.18, 0.11], shadow: [0.16, 0.08, 0.06], rim: [0.6, 0.35, 0.2], spec: [0.7, 0.5, 0.35] },
  case: { light: [0.93, 0.9, 0.84], mid: [0.75, 0.72, 0.68], shadow: [0.42, 0.42, 0.5], rim: [1, 1, 1], spec: [1.1, 1.1, 1.1] },
  orange: { light: [1.0, 0.52, 0.2], mid: [0.86, 0.36, 0.12], shadow: [0.5, 0.16, 0.1], rim: [1, 0.8, 0.5], spec: [1.2, 1.1, 1] },
  teal: { light: [0.32, 0.9, 0.8], mid: [0.16, 0.66, 0.6], shadow: [0.06, 0.3, 0.32], rim: [0.7, 1, 0.95], spec: [1.1, 1.2, 1.2] },
  floor: { light: [0.16, 0.13, 0.13], mid: [0.12, 0.1, 0.1], shadow: [0.07, 0.06, 0.07], rim: [0.2, 0.2, 0.2], spec: [0.2, 0.2, 0.2] },
  boardFar: { light: [0.86, 0.82, 0.72], mid: [0.7, 0.66, 0.58], shadow: [0.36, 0.38, 0.4], rim: [1, 1, 1], spec: [1, 1, 1] },
  chain: { light: [1.0, 0.86, 0.55], mid: [0.8, 0.6, 0.3], shadow: [0.36, 0.24, 0.2], rim: [1, 0.95, 0.8], spec: [1.6, 1.5, 1.3] },
};
const SQ_LIGHT = CREAM, SQ_DARK = [0.2, 0.39, 0.37];

const LIB = /* glsl */`
uniform float room; uniform vec4 hand; uniform float uFlat; uniform float spotGain;
float lightAt(vec3 w){
  float d = length(w.xz - vec2(.2, 0.));
  float spot = smoothstep(8.6, 5.4, d) * (.93 + .07 * smoothstep(5.4, 0., d));
  return max(spot * spotGain, room);
}
float handShadow(vec3 w){
  if (hand.z <= .001) return 0.;
  vec2 a = hand.xy, b = hand.xy + vec2(0., hand.w * 6.);
  vec2 p = w.xz, pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  float d = length(pa - ba * h) - mix(.36, .3, h);
  float palm = (length((p - a - vec2(0., hand.w * .15)) / vec2(.5, .62)) - 1.) * .45;
  d = min(d, palm);
  return hand.z * smoothstep(.1, -.1, d) * (1. - smoothstep(1.2, 1.9, w.y));
}`;

const TOON_VS = /* glsl */`
in float ink; uniform vec3 smear; uniform float smearJag;
out vec3 vN; out vec3 vW; out float vInk;
void main(){
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 w = m * vec4(position, 1.);
  vec3 n = normalize(mat3(m) * normal);
  float sl = length(smear);
  if (sl > 1e-4) { float k = dot(n, smear / sl); if (k < 0.) w.xyz -= smear * (-k) * mix(1., .5 + .5 * fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453), smearJag); }
  vN = n; vW = w.xyz; vInk = ink;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const TOON_FS = /* glsl */`
precision highp float;
${LIB}
uniform vec3 cLight, cMid, cShadow, cRim, cSpec, cInk, flatCol, glowCol;
uniform vec3 lightDir, rimDir, camPos; uniform float glow, specAmt, rimAmt, dim;
in vec3 vN; in vec3 vW; in float vInk;
out vec4 fragColor;
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(camPos - vW);
  if (!gl_FrontFacing) N = -N;
  float hl = dot(N, lightDir) * .5 + .5;
  float sh = handShadow(vW);
  hl -= sh * .55;
  float aa = max(fwidth(hl), 1e-3);
  vec3 col = mix(cShadow, cMid, smoothstep(.42 - aa, .42 + aa, hl));
  col = mix(col, cLight, smoothstep(.74 - aa, .74 + aa, hl));
  vec3 H = normalize(lightDir + V);
  float sp = pow(max(dot(N, H), 0.), 70.); float aas = max(fwidth(sp), 1e-3);
  col = mix(col, cSpec, smoothstep(.45 - aas, .45 + aas, sp) * specAmt * (1. - sh));
  float fr = 1. - max(dot(N, V), 0.);
  float rimMask = smoothstep(.6, .63, fr) * smoothstep(-.1, .25, dot(N, rimDir));
  col = mix(col, cRim, rimMask * rimAmt);
  if (vInk > .5) col = cInk;
  col *= lightAt(vW) * dim;
  col += glowCol * glow * (.03 + .9 * smoothstep(.66, .7, fr));
  col = mix(col, flatCol, uFlat);
  fragColor = vec4(col, 1.);
}`;
// big flat surfaces (table, floor, far tables): one tone from the top/side normal, no spec/rim/derivatives
const FLATS_FS = /* glsl */`
precision highp float;
${LIB}
uniform vec3 cLight, cMid, cShadow, flatCol; uniform float dim;
in vec3 vN; in vec3 vW; in float vInk;
out vec4 fragColor;
void main(){
  vec3 col = vN.y > .5 ? cLight : (vN.y < -.5 ? cShadow : cMid);
  col *= lightAt(vW) * dim * (1. - .58 * handShadow(vW));
  fragColor = vec4(mix(col, flatCol, uFlat), 1.);
}`;
const HULL_VS = /* glsl */`
in vec3 onormal; uniform vec3 smear; uniform float smearJag; uniform float width; uniform vec2 res;
void main(){
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 w = m * vec4(position, 1.);
  vec3 n = normalize(mat3(m) * onormal);
  float sl = length(smear);
  if (sl > 1e-4) { float k = dot(normalize(mat3(m) * normal), smear / sl); if (k < 0.) w.xyz -= smear * (-k) * mix(1., .5 + .5 * fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453), smearJag); }
  vec4 c = projectionMatrix * viewMatrix * w;
  vec4 cn = projectionMatrix * viewMatrix * vec4(n, 0.);
  vec2 dir = cn.xy; float l = length(dir); dir = l > 1e-6 ? dir / l : vec2(0.);
  c.xy += dir * width * 2. / res * c.w;
  c.z += .0004 * c.w;
  gl_Position = c;
}`;
const HULL_FS = /* glsl */`
precision highp float; uniform vec3 cInk; uniform vec3 flatCol; uniform float uFlat; uniform float flatKeep;
out vec4 fragColor;
void main(){ fragColor = vec4(mix(cInk, flatCol, uFlat * (1. - flatKeep)), 1.); }`;

let G = null;

// box with ink + welded radial outline normals (for the hull)
function boxGeo(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.deleteAttribute('uv');
  const n = g.attributes.position.count, p = g.attributes.position.array, on = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = p[i * 3] / w, b = p[i * 3 + 1] / h, c = p[i * 3 + 2] / d; const l = Math.hypot(a, b, c); on[i * 3] = a / l; on[i * 3 + 1] = b / l; on[i * 3 + 2] = c / l; }
  g.setAttribute('onormal', new THREE.Float32BufferAttribute(on, 3));
  g.setAttribute('ink', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
  g.translate(x, y, z);
  return g;
}

function makeShared(e) {
  return {
    room: { value: 1 }, hand: { value: new THREE.Vector4(0, 0, 0, 1) }, uFlat: { value: 0 }, spotGain: { value: 1 },
    lightDir: { value: new THREE.Vector3(-0.42, 0.85, 0.32).normalize() }, rimDir: { value: new THREE.Vector3(0.5, 0.35, -0.8).normalize() },
    camPos: { value: new THREE.Vector3() }, res: { value: new THREE.Vector2(e.W, e.H) }, width: { value: 3.2 * e.S },
    cInk: { value: C3(INK) },
  };
}

function toonMat(sh, pal, o = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: TOON_VS, fragmentShader: TOON_FS,
    uniforms: {
      room: sh.room, hand: sh.hand, uFlat: sh.uFlat, spotGain: sh.spotGain, lightDir: sh.lightDir, rimDir: sh.rimDir, camPos: sh.camPos, cInk: sh.cInk,
      cLight: { value: C3(pal.light) }, cMid: { value: C3(pal.mid) }, cShadow: { value: C3(pal.shadow) }, cRim: { value: C3(pal.rim) }, cSpec: { value: C3(pal.spec) },
      flatCol: { value: C3(o.flatCol || CREAM) }, glowCol: { value: C3(o.glowCol || [1, 0.6, 0.3]) }, glow: { value: 0 },
      specAmt: { value: o.spec ?? 1 }, rimAmt: { value: o.rim ?? 1 }, dim: { value: o.dim ?? 1 }, smear: o.smear || { value: new THREE.Vector3() }, smearJag: { value: 1 },
    },
  });
}
function flatSurfMat(sh, pal, dim = 1) {
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: TOON_VS, fragmentShader: FLATS_FS,
    uniforms: { room: sh.room, hand: sh.hand, uFlat: sh.uFlat, spotGain: sh.spotGain, cLight: { value: C3(pal.mid) }, cMid: { value: C3(pal.shadow) }, cShadow: { value: C3(pal.shadow) },
      flatCol: { value: C3(CREAM) }, dim: { value: dim }, smear: { value: new THREE.Vector3() }, smearJag: { value: 0 } } });
}
function hullMat(sh, smear, o = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: HULL_VS, fragmentShader: HULL_FS, side: THREE.BackSide,
    uniforms: { cInk: sh.cInk, uFlat: sh.uFlat, res: sh.res, width: o.width || sh.width, smear: smear || { value: new THREE.Vector3() }, smearJag: o.jag || { value: 1 },
      flatCol: { value: C3(o.flatCol || CREAM) }, flatKeep: { value: o.keep ? 1 : 0 } },
  });
}
function withHull(mesh, sh, o = {}) {
  const h = new THREE.Mesh(mesh.geometry, hullMat(sh, mesh.material.uniforms.smear, { ...o, jag: mesh.material.uniforms.smearJag }));
  h.frustumCulled = false; mesh.add(h); mesh.userData.hull = h; return mesh;
}

// ------------------------------------------------------------------------------------------------------------- build
function build(e, audio) {
  const sh = makeShared(e);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 300);
  const geo = buildGeometries();

  // dome: the hall, then the dark; battle tint
  const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, depthFunc: THREE.LessEqualDepth,
    uniforms: { room: sh.room, uFlat: sh.uFlat, battle: { value: 0 }, flatCol: { value: C3(CREAM) }, seed: { value: 0 } },
    vertexShader: `out vec3 vD; void main(){ vD = position; vec4 c = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); gl_Position = c.xyww; }`,
    fragmentShader: `precision highp float; uniform float room, uFlat, battle, seed; uniform vec3 flatCol; in vec3 vD; out vec4 fragColor;
      void main(){ vec3 d = normalize(vD);
        vec3 hall = mix(vec3(.16, .12, .1), vec3(.05, .055, .08), smoothstep(-.05, .45, d.y));
        hall += vec3(.05, .035, .02) * smoothstep(.25, 0., abs(d.y - .05));
        vec3 dark = mix(vec3(.012, .014, .025), vec3(.004, .005, .01), smoothstep(-.2, .5, d.y));
        vec3 col = mix(dark, hall, room);
        float a = atan(d.z, d.x);
        vec3 bat = mix(vec3(.11, .03, .2), vec3(.02, .02, .09), smoothstep(-.3, .6, d.y));
        col = mix(col, bat, battle);
        fragColor = vec4(mix(col, flatCol, uFlat), 1.); }`,
  }));
  dome.frustumCulled = false; dome.renderOrder = 3; scene.add(dome);   // drawn after the opaque geometry, at the far plane: only uncovered pixels shade

  // table: dark wood disc under the board, lit by the spot
  // the hall: our table, the floor, and rows of other tables (each under its own lamp) that go dark with the lights
  const table = withHull(new THREE.Mesh(boxGeo(16.5, 0.34, 12.8, 0, -0.45, 0), flatSurfMat(sh, PAL.wood, 0.85)), sh);
  scene.add(table);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2).translate(0, -3.2, 0), flatSurfMat(sh, PAL.floor));
  scene.add(floor);
  const others = [];
  for (const x of [-38, -19, 19, 38]) for (const z of [-30, -12, 12, 30]) others.push([x, z]);
  for (const z of [-30, -12, 12, 30]) others.push([0, z + (z > 0 ? 6 : -6)]);
  const tGeo = boxGeo(11, 0.34, 5.6, 0, -0.45, 0), bGeo = boxGeo(3.4, 0.18, 3.4, 0, -0.19, 0);
  const tables = new THREE.InstancedMesh(tGeo, flatSurfMat(sh, PAL.wood, 0.85), others.length);
  const tHull = new THREE.InstancedMesh(tGeo, hullMat(sh, null), others.length);
  const boards2 = new THREE.InstancedMesh(bGeo, flatSurfMat(sh, PAL.boardFar), others.length * 2);
  const m4 = new THREE.Matrix4();
  others.forEach(([x, z], i) => { m4.makeTranslation(x, 0, z); tables.setMatrixAt(i, m4); tHull.setMatrixAt(i, m4); m4.makeTranslation(x - 2.7, 0, z); boards2.setMatrixAt(i * 2, m4); m4.makeTranslation(x + 2.7, 0, z); boards2.setMatrixAt(i * 2 + 1, m4); });
  for (const m of [tables, tHull, boards2]) { m.frustumCulled = false; scene.add(m); }

  // board: frame box (wood, outlined) and the top (procedural squares, highlights, coordinates)
  const BW = 8 + 2 * BORDER;
  const frameMesh = withHull(new THREE.Mesh((() => { const g = new THREE.BoxGeometry(BW, 0.28, BW).toNonIndexed(); g.translate(0, -0.14, 0); return g; })(), toonMat(sh, PAL.wood, { spec: 0.4, rim: 0.3 })), sh);
  { const g = frameMesh.geometry; const n = g.attributes.position.count; g.setAttribute('ink', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('onormal', new THREE.Float32BufferAttribute(Float32Array.from(g.attributes.position.array, (v, i) => v), 3)); // box: radial normals
    const p = g.attributes.position.array, on = g.attributes.onormal.array; for (let i = 0; i < n; i++) { const x = p[i * 3], y = p[i * 3 + 1] + 0.14, z = p[i * 3 + 2]; const l = Math.hypot(x, y * 6, z); on[i * 3] = x / l; on[i * 3 + 1] = y * 6 / l; on[i * 3 + 2] = z / l; } }
  scene.add(frameMesh);
  const topMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, extensions: {},
    uniforms: { room: sh.room, hand: sh.hand, uFlat: sh.uFlat, spotGain: sh.spotGain, tBorder: { value: borderTexture() },
      cL: { value: C3(SQ_LIGHT) }, cD: { value: C3(SQ_DARK) }, cWood: { value: C3(PAL.wood.light) }, cInk: sh.cInk, flatCol: { value: C3(CREAM) },
      hiFrom: { value: new THREE.Vector2(-9, -9) }, hiTo: { value: new THREE.Vector2(-9, -9) }, hiAmt: { value: 0 },
      chk: { value: new THREE.Vector2(-9, -9) }, chkAmt: { value: 0 }, cHi: { value: C3([1.0, 0.78, 0.28]) }, cChk: { value: C3([1.0, 0.25, 0.12]) } },
    vertexShader: `out vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; ${LIB}
      uniform sampler2D tBorder; uniform vec3 cL, cD, cWood, cInk, flatCol, cHi, cChk; uniform vec2 hiFrom, hiTo, chk; uniform float hiAmt, chkAmt;
      in vec3 vW; out vec4 fragColor;
      void main(){
        vec2 b = vec2(vW.x + 4., 4. - vW.z);         // files 0..8 (a..h), ranks 0..8 (1..8)
        vec2 uv = vec2((vW.x + ${(BW / 2).toFixed(2)}) / ${BW.toFixed(2)}, (${(BW / 2).toFixed(2)} - vW.z) / ${BW.toFixed(2)});
        float inside = step(0., b.x) * step(b.x, 8.) * step(0., b.y) * step(b.y, 8.);
        vec2 cell = floor(b);
        float dark = mod(cell.x + cell.y, 2.) < .5 ? 1. : 0.;
        // anti-aliased square edges
        vec2 f = fract(b), fw = fwidth(b);
        vec2 edge = smoothstep(vec2(0.), fw * 1.2, f) * smoothstep(vec2(0.), fw * 1.2, 1. - f);
        vec3 col = mix(cL, cD, dark);
        float hf = (all(equal(cell, hiFrom)) ? .55 : 0.) + (all(equal(cell, hiTo)) ? 1. : 0.);
        col = mix(col, mix(col, cHi, .55), clamp(hf, 0., 1.) * hiAmt);
        float dc = length(b - chk - .5);
        col = mix(col, cChk, chkAmt * smoothstep(.75, .1, dc) * .85);
        float grid = 1. - min(edge.x, edge.y);
        col = mix(col, col * .55, grid * .5);
        vec3 wood = cWood * (.8 + .2 * smoothstep(.2, .8, uv.y));
        float lab = texture(tBorder, uv).a;
        wood = mix(wood, vec3(.96, .9, .78), lab);
        col = mix(wood, col, inside);
        float sh = handShadow(vW);
        col *= lightAt(vW) * (1. - .58 * sh);
        fragColor = vec4(mix(col, flatCol, uFlat), 1.);
      }`,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BW, BW).rotateX(-Math.PI / 2), topMat);
  scene.add(top);

  // blob shadows (cel-hard ellipses, offset away from the key light)
  const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowA = new THREE.InstancedBufferAttribute(new Float32Array(64 * 4), 4); shadowA.setUsage(THREE.DynamicDrawUsage);
  shadowGeo.setAttribute('iS', shadowA);
  const shadowMesh = new THREE.InstancedMesh(shadowGeo, new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: false,
    uniforms: { uFlat: sh.uFlat },
    vertexShader: `in vec4 iS; out vec2 vP; out float vA; void main(){ vP = position.xz * 2.; vA = iS.w; vec3 w = vec3(iS.x + position.x * iS.z * 2.4, .004, iS.y + position.z * iS.z * 2.); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `precision highp float; uniform float uFlat; in vec2 vP; in float vA; out vec4 fragColor; void main(){ float d = length(vP); float a = smoothstep(1., .9, d) * .5 + smoothstep(1., .3, d) * .15; fragColor = vec4(.02, .03, .07, a * vA * (1. - uFlat)); }`,
  }), 64);
  shadowMesh.frustumCulled = false; shadowMesh.renderOrder = 1; scene.add(shadowMesh);

  // pieces
  const pieces = GAME.pieces.map((pc) => {
    const P = pc.p.toUpperCase(), white = pc.p === P;
    const isQ = pc.p === 'q';
    const m = new THREE.Mesh(geo[P], toonMat(sh, white ? PAL.white : PAL.black, { flatCol: isQ ? INK : CREAM, glowCol: white ? [1, 0.55, 0.25] : [0.3, 1, 0.85] }));
    m.frustumCulled = false; withHull(m, sh, { keep: isQ });
    scene.add(m);
    return m;
  });

  // chain links (instanced, outlined)
  const LN = 420;
  const lg = linkGeometry();
  const linkMat = toonMat(sh, PAL.chain, { spec: 1, rim: 1 });
  const links = new THREE.InstancedMesh(lg, linkMat, LN); links.frustumCulled = false; links.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const linksHull = new THREE.InstancedMesh(lg, hullMat(sh, null, { width: { value: 2.2 * e.S } }), LN); linksHull.frustumCulled = false; linksHull.instanceMatrix = links.instanceMatrix;
  links.count = 0; linksHull.count = 0;
  scene.add(links); scene.add(linksHull);

  // the clock: wedge case, two LCD faces (one canvas), two buttons; faces toward +x and up
  const clock = new THREE.Group(); clock.position.set(...CLOCK_POS); scene.add(clock);
  const prof = new THREE.Shape([[-0.42, -0.28], [0.62, -0.28], [0.6, -0.2], [0.08, 0.5], [-0.38, 0.58], [-0.45, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)));
  const caseG = new THREE.ExtrudeGeometry(prof, { depth: 2.5, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 }); caseG.translate(0, 0, -1.25);
  const caseGeo = (() => { const g = caseG.toNonIndexed(); g.deleteAttribute('uv'); g.computeVertexNormals(); const n = g.attributes.position.count; g.setAttribute('ink', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); return g; })();
  { const p = caseGeo.attributes.position.array, n = p.length / 3, on = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const x = p[i * 3] - 0.08, y = p[i * 3 + 1] - 0.12, z = p[i * 3 + 2]; const l = Math.hypot(x, y, z * 0.4); on[i * 3] = x / l; on[i * 3 + 1] = y / l; on[i * 3 + 2] = z * 0.4 / l; } caseGeo.setAttribute('onormal', new THREE.Float32BufferAttribute(on, 3)); }
  const caseMesh = withHull(new THREE.Mesh(caseGeo, toonMat(sh, PAL.case, { spec: 0.6 })), sh); clock.add(caseMesh);
  const cc = clockCanvas();
  const faceN = new THREE.Vector3(0.7, 0.52, 0).normalize();
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.674), new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { t: { value: cc.tex }, room: sh.room, hand: sh.hand, uFlat: sh.uFlat, spotGain: sh.spotGain, flatCol: { value: C3(CREAM) }, gain: { value: 1 } },
    vertexShader: `out vec2 vUv; out vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; ${LIB} uniform sampler2D t; uniform vec3 flatCol; uniform float gain; in vec2 vUv; in vec3 vW; out vec4 fragColor;
      void main(){ vec3 c = texture(t, vUv).rgb; c *= max(lightAt(vW), .55) * gain; fragColor = vec4(mix(c, flatCol, uFlat), 1.); }`,
  }));
  { const X = new THREE.Vector3(0, 0, -1), Z = faceN.clone(), Y = Z.clone().cross(X).normalize(); const m = new THREE.Matrix4().makeBasis(X, Y, Z); lcd.quaternion.setFromRotationMatrix(m); lcd.position.set(0.34, 0.15, 0).addScaledVector(faceN, 0.055); }
  clock.add(lcd);
  clock.rotation.y = Math.PI;   // faces toward the board (the players and most cameras)
  const btnGeo = (() => { const g = new THREE.CylinderGeometry(0.17, 0.19, 0.16, 20).toNonIndexed(); g.deleteAttribute('uv'); const n = g.attributes.position.count; g.setAttribute('ink', new THREE.Float32BufferAttribute(new Float32Array(n), 1));
    const p = g.attributes.position.array, on = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const l = Math.hypot(p[i * 3], p[i * 3 + 1] * 1.5, p[i * 3 + 2]); on[i * 3] = p[i * 3] / l; on[i * 3 + 1] = p[i * 3 + 1] * 1.5 / l; on[i * 3 + 2] = p[i * 3 + 2] / l; } g.setAttribute('onormal', new THREE.Float32BufferAttribute(on, 3)); return g; })();
  const btnW = withHull(new THREE.Mesh(btnGeo, toonMat(sh, PAL.orange)), sh); btnW.position.set(-0.18, 0.62, -0.68); clock.add(btnW);
  const btnB = withHull(new THREE.Mesh(btnGeo, toonMat(sh, PAL.teal)), sh); btnB.position.set(-0.18, 0.62, 0.68); clock.add(btnB);
  clock.position.y = 0.0;

  // scoresheet
  const sc = sheetCanvas();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { t: { value: sc.tex }, room: sh.room, hand: sh.hand, uFlat: sh.uFlat, spotGain: sh.spotGain, flatCol: { value: C3(CREAM) } },
    vertexShader: `out vec2 vUv; out vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; ${LIB} uniform sampler2D t; uniform vec3 flatCol; in vec2 vUv; in vec3 vW; out vec4 fragColor;
      void main(){ vec3 c = texture(t, vUv).rgb; c *= lightAt(vW); fragColor = vec4(mix(c, flatCol, uFlat), 1.); }`,
  }));
  sheet.position.set(SHEET_POS[0], -0.272, SHEET_POS[2]); sheet.rotation.y = 0.06; scene.add(sheet);

  // billboards: lamps, eyes, sparks, glints (additive, stretched along a world vector)
  const BN = 400;
  const bbGeo = new THREE.PlaneGeometry(1, 1);
  const bbP = new THREE.InstancedBufferAttribute(new Float32Array(BN * 4), 4); bbP.setUsage(THREE.DynamicDrawUsage);   // pos, size
  const bbC = new THREE.InstancedBufferAttribute(new Float32Array(BN * 3), 3); bbC.setUsage(THREE.DynamicDrawUsage);   // colour (HDR)
  const bbS = new THREE.InstancedBufferAttribute(new Float32Array(BN * 3), 3); bbS.setUsage(THREE.DynamicDrawUsage);   // stretch
  bbGeo.setAttribute('iP', bbP); bbGeo.setAttribute('iC', bbC); bbGeo.setAttribute('iS', bbS);
  const bbMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { asp: { value: 16 / 9 }, uFlat: sh.uFlat },
    vertexShader: `in vec4 iP; in vec3 iC; in vec3 iS; uniform float asp; out vec2 vQ; out vec3 vC;
      void main(){
        vec4 c0 = projectionMatrix * viewMatrix * vec4(iP.xyz, 1.);
        vec4 c1 = projectionMatrix * viewMatrix * vec4(iP.xyz - iS, 1.);
        if (c0.w < .06 || iP.w <= 0.) { gl_Position = vec4(2., 2., 2., 1.); return; }
        if (c1.w < .06) c1 = c0;
        vec2 s0 = c0.xy / c0.w * vec2(asp, 1.), s1 = c1.xy / c1.w * vec2(asp, 1.);
        vec2 d = s1 - s0; float L = length(d); vec2 dir = L > 1e-5 ? d / L : vec2(1., 0.); vec2 nr = vec2(-dir.y, dir.x);
        float r = iP.w * projectionMatrix[1][1] / c0.w;
        float along = position.x + .5;
        vec2 s = s0 + d * along + dir * sign(position.x) * r + nr * position.y * 2. * r;
        vQ = vec2(position.x * 2., position.y * 2.); vC = iC;
        gl_Position = vec4(s / vec2(asp, 1.) * c0.w, c0.z, c0.w);
      }`,
    fragmentShader: `precision highp float; uniform float uFlat; in vec2 vQ; in vec3 vC; out vec4 fragColor;
      void main(){ float a = exp(-vQ.y * vQ.y * 5.) * smoothstep(1., .55, abs(vQ.x)); float core = exp(-vQ.y * vQ.y * 22.) * smoothstep(1., .3, abs(vQ.x)); fragColor = vec4(vC * (a * .5 + core) * (1. - uFlat), 1.); }`,
  });
  const bb = new THREE.InstancedMesh(bbGeo, bbMat, BN); bb.frustumCulled = false; bb.renderOrder = 5; scene.add(bb);

  // slam rings
  const RN = 40;
  const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const ringA = new THREE.InstancedBufferAttribute(new Float32Array(RN * 4), 4); ringA.setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('iR', ringA);
  const rings = new THREE.InstancedMesh(ringGeo, new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {},
    vertexShader: `in vec4 iR; out vec2 vP; out vec2 vA; void main(){ float R = .3 + iR.z * 5.5; vP = position.xz * 2. * (R + .2); vA = vec2(iR.z, iR.w); vec3 w = vec3(iR.x, .02, iR.y) + vec3(position.x, 0., position.z) * 2. * (R + .2); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `precision highp float; in vec2 vP; in vec2 vA; out vec4 fragColor; void main(){ float R = .3 + vA.x * 5.5; float d = abs(length(vP) - R); float w = mix(.12, .03, clamp(vA.x * 2.5, 0., 1.)); float a = smoothstep(w, w * .5, d) * (1. - clamp(vA.x / .38, 0., 1.)) * vA.y; fragColor = vec4(vec3(1.4, 1.3, 1.15) * a, 1.); }`,
  }), RN);
  rings.frustumCulled = false; rings.renderOrder = 4; scene.add(rings);

  // post: speed lines and impact frames (rtTmp -> rtScene)
  const post = e.shader(/* glsl */`
    uniform sampler2D tSrc; uniform vec2 res; uniform float S; uniform vec2 focus; uniform float speedR, speedL, seed, impact, lineAng; uniform vec3 lineCol;
    void main(){
      vec3 c = texture(tSrc, vUv).rgb;
      vec2 px = vec2(vUv.x, 1. - vUv.y) * vec2(1920., 1080.);
      if (speedR > 0.) {
        vec2 d = px - focus; float r = length(d); float a = atan(d.y, d.x) / 6.2831853 + .5;
        float N = 150.; float id = floor(a * N); float fa = fract(a * N);
        float h = hash12(vec2(id, seed)), h2 = hash12(vec2(id + 31.7, seed * 1.3));
        float w = .1 + .34 * h2;
        float r0 = mix(430., 820., hash12(vec2(id, seed + 7.1)));
        float on = step(.42, h) * smoothstep(w, w * .55, abs(fa - .5) * 2.) * smoothstep(r0, r0 + 140., r);
        c = mix(c, lineCol, clamp(on * speedR, 0., 1.));
      }
      if (speedL > 0.) {
        vec2 q = vec2(cos(lineAng) * px.x + sin(lineAng) * px.y, -sin(lineAng) * px.x + cos(lineAng) * px.y);
        float row = floor(q.y / 7.); float h = hash12(vec2(row, seed));
        float x0 = hash12(vec2(row, seed + 3.)) * 2600. - 340.; float len = 160. + 700. * hash12(vec2(row, seed + 5.));
        float on = step(.74, h) * smoothstep(len, len * .7, abs(q.x - x0)) * smoothstep(0., 1.5, min(q.y - row * 7., row * 7. + 7. - q.y));
        c = mix(c, lineCol, clamp(on * speedL, 0., 1.));
      }
      if (impact > .5) {
        float l = luma(c); float b = step(.52, l);
        vec3 ink = vec3(.02, .02, .035), paper = vec3(1.04, 1.0, .94);
        c = impact < 1.5 ? mix(paper, ink, b) : mix(ink, paper, b);
      }
      fragColor = vec4(c, 1.);
    }`, { tSrc: { value: null }, res: { value: new THREE.Vector2(e.W, e.H) }, S: { value: e.S }, focus: { value: new THREE.Vector2(960, 540) },
    speedR: { value: 0 }, speedL: { value: 0 }, seed: { value: 0 }, impact: { value: 0 }, lineAng: { value: 0 }, lineCol: { value: new THREE.Color(1.1, 1.08, 1.02) } });

  // lamps of the hall: 48 pendant lamps in rings, switched off in 8 banks by the 8 opening plies
  const lamps = [];
  for (let i = 0; i < 56; i++) {
    const ring = i % 3, a = (i / 56) * Math.PI * 2 + hash1(i) * 0.08;
    const r = 15 + ring * 5 + hash1(i * 3.3) * 2;
    lamps.push({ pos: [Math.sin(a) * r, 6.2 + ring * 1.1 + hash1(i * 7.1) * 0.4, Math.cos(a) * r], bank: Math.floor(hash1(i * 11.7) * 8) });
  }

  const S = buildSchedule(audio);
  G = { sh, scene, cam, pieces, links, linksHull, linkMat, clock, btnW, btnB, lcd, cc, sheet, sc, bb, bbP, bbC, bbS, rings, ringA, shadowMesh, shadowA,
    topMat, dome, post, lamps, S, tmp: new THREE.Object3D(), m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3() };
  return G;
}

// ------------------------------------------------------------------------------------------------------------- timing helpers
function lampOn(S, lamp, t) { return t < S.plies[lamp.bank].t ? 1 : 0; }

// impact frames: captures (and the two checks), at least 0.45 s apart (a strobe guard)
function impactList(S) {
  const out = []; let last = -9;
  for (const p of S.plies) {
    if (!(p.capId >= 0 || p.check)) continue;
    const big = p.k === 16 || p.check || p.k >= 27;
    if (p.t - last < 0.45 && !(p.k === 41)) continue;
    if (!big && p.t < S.anchors.spark - 0.1) continue;
    out.push(p.t); last = p.t;
  }
  return out;
}

function speedAt(S, t, p) {
  const A = S.anchors; let r = 0, l = 0;
  const bat0 = A.back, bat1 = S.plies[41].t + 0.35;
  if (t >= bat0 && t < bat1) r = 0.55 + 0.25 * Math.exp(-(t - bat0) / 0.3);
  const sw = (t - A.chain) / 0.5;
  if (sw >= -0.05 && sw < 1.1) { l = Math.sin(Math.PI * clamp(sw)) * 1.0; r *= 0.3; }
  const ks = t - A.spark; if (ks >= 0 && ks < 0.45) r = Math.max(r, 1 - ks / 0.45);
  const kc = t - A.hand; if (kc >= 0 && kc < 0.55) r = Math.max(r, 1 - kc / 0.55);
  const kd = t - A.death; if (kd >= 0 && kd < 0.35) r = Math.max(r, 0.7 * (1 - kd / 0.35));
  const g = (p.speed ?? 1) * (p.fx ?? 1);
  return { r: r * g, l: l * g };
}

// ------------------------------------------------------------------------------------------------------------- dive (2D)
const DIVE_N = 240;
function resample(poly, n) {   // closed polygon -> n points by arc length
  const L = [0]; for (let i = 1; i <= poly.length; i++) { const a = poly[i - 1], b = poly[i % poly.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[L.length - 1], out = [];
  let j = 0;
  for (let i = 0; i < n; i++) { const s = tot * i / n; while (L[j + 1] < s) j++; const a = poly[j], b = poly[(j + 1) % poly.length]; const u = (s - L[j]) / ((L[j + 1] - L[j]) || 1); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
  return out;
}
// queen silhouette (units, y up, centred on x = 0), starting at the top centre, clockwise on screen
function queenOutline() {
  const pr = PROFILES.Q.filter(([r]) => r >= 0);
  const right = pr.slice().reverse().map(([r, y]) => [r, y]);          // top -> base on the right
  const left = pr.map(([r, y]) => [-r, y]);                               // base -> top on the left
  const poly = [...right, ...left];
  return resample(poly, DIVE_N);
}
function squareOutline(half) {
  const pts = [[0, half], [half, half], [half, -half], [-half, -half], [-half, half]];
  return resample(pts, DIVE_N);
}

function drawDive2D(ctx, u, p, frame) {
  const e = ctx.engine, c = e.c2dBegin();
  c.lineJoin = 'miter'; c.lineCap = 'butt'; c.miterLimit = 10; c.setLineDash([]);   // canvas state persists between frames: set it
  const cream = p.cream || '#F1E8D6', ink = p.ink || '#111010';
  c.fillStyle = cream; c.fillRect(0, 0, 1920, 1080);
  const k = frame.k, cx = 960, cy = frame.cy;     // px per unit, screen centre of the queen's mid-height
  const QH = HEIGHT.Q;
  // the board: edge-on line at the queen's foot that unfolds into a flat grid, then its squares slide out
  const unfold = smoother(u / 0.26);
  const out = (u - 0.16) / 0.62;
  const sq = 112 * (1 + 0.15 * unfold);
  const gy = cy + (QH / 2) * k;                           // board line (foot of the queen) in px
  const g4 = [6, 3];                                       // g4: the queen's square
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const dark = (f + r) % 2 === 0;
    const dx = (f - g4[0]) * sq, dy = -(r - g4[1]) * sq * unfold;
    let x = cx + dx, y = lerp(gy, cy + dy, unfold);
    const h = hash2(f * 1.7 + 3, r * 2.3 + 1);
    const near = Math.max(Math.abs(f - g4[0]), Math.abs(r - g4[1]));
    const delay = h * 0.35 + 0.12 * (1 - near / 7);         // outer tiles go first, the ones round the queen last
    const v = clamp((out - delay) / 0.4);
    const ang = Math.atan2(dy + (r === g4[1] ? 0.001 : 0), dx + 0.001) + (h - 0.5) * 0.9;
    const dist = easeInCubic(v) * 2400;
    x += Math.cos(ang) * dist; y += Math.sin(ang) * dist;
    if (v >= 1) continue;
    const s = sq * (1 - 0.25 * v);
    c.save(); c.translate(x, y); c.rotate((h - 0.5) * 2.2 * easeInCubic(v)); c.scale(1, Math.max(0.02, unfold));
    c.fillStyle = dark ? ink : '#E3D6BC';
    c.fillRect(-s / 2, -s / 2, s, s);
    if (!dark) { c.strokeStyle = ink; c.lineWidth = 3 / Math.max(0.25, unfold); c.strokeRect(-s / 2, -s / 2, s, s); }
    c.restore();
  }
  // the queen's silhouette morphing into the square
  const m = smoother((u - 0.12) / 0.7);
  const qo = queenOutline(), so = squareOutline((p.size ?? 360) / 2);
  c.fillStyle = ink; c.beginPath();
  for (let i = 0; i < DIVE_N; i++) {
    const q = qo[i], s = so[i];
    const qx = cx + q[0] * k, qy = cy - (q[1] - QH / 2) * k;
    const x = lerp(qx, cx + s[0], m), y = lerp(qy, cy - s[1] * 1 + 0, m);
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.closePath();
  const key = clamp(unfold * 1.4) * (1 - smooth((u - 0.85) / 0.1));
  if (key > 0.01) { c.strokeStyle = cream; c.lineJoin = 'round'; c.lineWidth = 22 * key; c.stroke(); }   // a cream keyline off the tiles
  c.fill();
  if (m < 1) { c.strokeStyle = ink; c.lineJoin = 'round'; c.lineWidth = 5.2 * (1 - m); c.stroke(); }   // the 3D ink outline's width
  // crown balls sink into the shape
  for (let i = 0; i < QUEEN_BALLS.n; i++) {
    const a = i / QUEEN_BALLS.n * Math.PI * 2;
    const bx = Math.cos(a) * QUEEN_BALLS.r, by = QUEEN_BALLS.y;
    const x = lerp(cx - bx * k, cx, m), y = lerp(cy - (by - QH / 2) * k, cy, m);
    const r = (QUEEN_BALLS.size * k + 2.6) * (1 - m);
    if (r > 0.5) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  }
  // final frames: exactly the square
  if (u >= 0.97) { c.fillStyle = cream; c.fillRect(0, 0, 1920, 1080); c.fillStyle = ink; const h = (p.size ?? 360) / 2; c.fillRect(cx - h, cy - h, h * 2, h * 2); }
  e.blit2d('replace', 1);
}

// ------------------------------------------------------------------------------------------------------------- draw
function camBasis(c) {
  const f = [c.target[0] - c.pos[0], c.target[1] - c.pos[1], c.target[2] - c.pos[2]]; const fl = Math.hypot(...f); const fwd = f.map((x) => x / fl);
  const up0 = c.up || [0, 1, 0];
  let r = [fwd[1] * up0[2] - fwd[2] * up0[1], fwd[2] * up0[0] - fwd[0] * up0[2], fwd[0] * up0[1] - fwd[1] * up0[0]]; const rl = Math.hypot(...r) || 1; r = r.map((x) => x / rl);
  const up = [r[1] * fwd[2] - r[2] * fwd[1], r[2] * fwd[0] - r[0] * fwd[2], r[0] * fwd[1] - r[1] * fwd[0]];
  return { pos: c.pos, fwd, right: r, up };
}

function diveCam(S, t, p, st, d0, d1) {
  const u = clamp((t - d0) / (d1 - d0));
  const qid = GAME.pieces.find((x) => x.p === 'q').id;
  const qp = st.pieces.find((x) => x.id === qid).pos;
  const qh = HEIGHT.Q;
  // from high on Black's side, swooping down to her height, looking up the g-file (g5-g8 are empty; whatever is behind her
  // goes cream when the frame flattens)
  const start = p.from ? cameraAt(S, d0, { ...p, cam: p.from }, st) : { pos: [qp[0] + 1.6, 8.2, qp[2] - 6.8], target: [qp[0], 0.4, qp[2]], fov: 40 };
  const F = 16, Hvis = qh * 1080 / (p.qpx ?? 560);
  const D = Hvis / (2 * Math.tan(F / 2 * Math.PI / 180));
  const end = { pos: [qp[0], qh / 2, qp[2] - D], target: [qp[0], qh / 2, qp[2]], fov: F };
  const v = smoother(u / 0.42);
  // dolly-zoom flavoured: position eases late, fov narrows early (the perspective flattens)
  const pv = easeInOutCubic(v), fv = 1 - Math.pow(1 - v, 2.2);
  const c = { pos: start.pos.map((x, i) => lerp(x, end.pos[i], pv)), target: start.target.map((x, i) => lerp(x, end.target[i], Math.min(1, pv * 1.4))), fov: lerp(start.fov, F, fv) };
  return { c, u, k: 1080 / Hvis, cy: 540 };
}

export default {
  async init(ctx) { build(ctx.engine, ctx.audio); await loadHands(); },
  draw(ctx, shot, t, lt, p) {
    drawImpl(ctx, shot, t, lt, p);
  },
};

function drawImpl(ctx, shot, t, lt, p) {
    const e = ctx.engine; const S = G.S;
    // hand shots run on twos (the hands are drawings; the board holds with them so the grip never slips)
    // (phase locked to the shot's first frame, so the cut frame is a drawing and a press on the cut shows on it)
    if (p.twos) { const f0 = Math.ceil((shot?.t0 ?? 0) * 24 - 1e-6), f = Math.floor(t * 24 + 1e-6); t = (f0 + 2 * Math.floor((f - f0) / 2)) / 24 + 1e-4; }
    const mode = p.mode || 'game';
    const d0 = p.d0 ?? 157.8, d1 = p.d1 ?? 158.7;
    // camera (the chain flights need it; it needs the mover's position: resolve twice)
    const st0 = boardState(S, t, { pos: [0, 5, 10], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] });
    let c, dive = null;
    if (mode === 'dive') { dive = diveCam(S, t, p, st0, d0, d1); c = dive.c; if (dive.u >= 0.42) { drawDive2D(ctx, (dive.u - 0.42) / 0.58, p, dive); return; } }
    else c = cameraAt(S, t, p, st0);
    const fx = mode === 'dive' ? { punch: 0, shake: 0 } : cameraFx(S, t, p);
    const fov = c.fov * (1 - 0.2 * fx.punch);
    const sk = fx.shake * 0.12;
    const shk = [sk * (noise1(t * 37) - 0.5), sk * (noise1(t * 41 + 9) - 0.5), sk * (noise1(t * 43 + 17) - 0.5)];
    const cam = G.cam;
    cam.position.set(c.pos[0] + shk[0], c.pos[1] + shk[1], c.pos[2] + shk[2]);
    cam.up.set(...(c.up || [0, 1, 0]));
    cam.lookAt(c.target[0] + shk[0] * 0.5, c.target[1] + shk[1] * 0.5, c.target[2]);
    cam.fov = fov; cam.aspect = 16 / 9; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const st = boardState(S, t, camBasis(c));
    const sh = G.sh;
    sh.camPos.value.copy(cam.position);

    // lights
    let room = p.lights ?? (t < S.plies[0].t - 0.001 ? 1 : 0);
    if (p.lights == null && t >= S.plies[0].t) { let on = 0; for (let i = 0; i < 8; i++) if (t < S.plies[i].t) on++; room = on / 8 * 0.9; }
    sh.room.value = room * 0.78;
    const battle = p.lights == null ? clamp((t - S.anchors.back + 0.05) / 0.12) * (1 - clamp((t - S.anchors.letgo) / 0.6)) : 0;
    G.dome.material.uniforms.battle.value = battle * (p.fx ?? 1);
    sh.spotGain.value = 1 + 0.08 * battle;
    const flat = dive ? smooth((dive.u - 0.26) / 0.15) : 0;
    sh.uFlat.value = flat;
    const hands = p.handTracks ? handsAt(S, p.handTracks, t, st) : [];
    const hd = p.handTracks ? handShadowOf(hands) : st.hand;
    sh.hand.value.set(hd ? hd.x : 0, hd ? hd.z : 0, hd ? hd.amt * (p.hands ?? 1) : 0, hd ? (hd.side === 'w' ? 1 : -1) : 1);

    // pieces
    const tmp = G.tmp; let ns = 0;
    const sA = G.shadowA.array;
    for (const ps of st.pieces) {
      const m = G.pieces[ps.id];
      m.visible = ps.visible;
      if (!ps.visible) continue;
      m.position.set(...ps.pos); m.quaternion.set(...ps.q); m.scale.set(...ps.scale);
      const sp = Math.hypot(...ps.vel);
      const sm = m.material.uniforms.smear.value;
      m.material.uniforms.smearJag.value = (ps.pos[1] > 1.2 && !ps.flying) ? 0 : 1;
      if (sp > 2.5 && (p.smear ?? 1) > 0) { const k = Math.min(0.03, (ps.pos[1] > 1.2 && !ps.flying ? 0.4 : 0.75) / sp); sm.set(ps.vel[0] * k, ps.vel[1] * k, ps.vel[2] * k); } else sm.set(0, 0, 0);
      // glow: the checked king, the black queen giving the last check
      let glow = 0;
      if (st.check && st.check.sq !== undefined && GAME.boards[st.k + 1][st.check.sq] === ps.id) glow = 0.6 + 0.4 * Math.exp(-st.check.age / 0.25);
      if (st.hand && st.hand.hover && st.moving == null && S.plies[st.k + 1] && S.plies[st.k + 1].id === ps.id) glow = 0.25;
      m.material.uniforms.glow.value = glow;
      m.material.uniforms.glowCol.value.setRGB(...(glow > 0.5 ? [1.0, 0.3, 0.12] : (ps.white ? [1, 0.6, 0.3] : [0.3, 1, 0.85])));
      // blob shadow
      if (ns < 64 && ps.pos[1] < 3) {
        const h = ps.pos[1];
        sA[ns * 4] = ps.pos[0] + 0.1 + h * 0.3; sA[ns * 4 + 1] = ps.pos[2] - 0.08 - h * 0.2; sA[ns * 4 + 2] = 0.3 * (1 + h * 0.25); sA[ns * 4 + 3] = clamp(1 - h / 3); ns++;
      }
    }
    G.shadowMesh.count = ns; G.shadowA.needsUpdate = true;

    // chain links
    const nl = Math.min(st.links.length, 420);
    for (let i = 0; i < nl; i++) { const L = st.links[i]; tmp.position.set(...L.pos); tmp.quaternion.set(...L.q); tmp.scale.setScalar(1); tmp.updateMatrix(); G.links.setMatrixAt(i, tmp.matrix); }
    G.links.count = nl; G.linksHull.count = nl; G.links.instanceMatrix.needsUpdate = true;

    // board highlights
    const tu = G.topMat.uniforms;
    if (st.hi) { tu.hiFrom.value.set(st.hi.from & 7, st.hi.from >> 3); tu.hiTo.value.set(st.hi.to & 7, st.hi.to >> 3); tu.hiAmt.value = 0.75 + 0.25 * Math.exp(-st.hi.age / 0.2); }
    else tu.hiAmt.value = 0;
    if (st.check && st.check.sq !== undefined) { tu.chk.value.set(st.check.sq & 7, st.check.sq >> 3); tu.chkAmt.value = 0.6 + 0.4 * Math.exp(-st.check.age / 0.2); } else tu.chkAmt.value = 0;

    // clock: buttons, slap jolt, faces
    const ck = st.clock;
    const lastSide = ck.last ? ck.last.side : null;
    const pressAge = ck.last ? t - ck.last.t : 9;
    const dn = (side) => (lastSide === side ? -0.09 : 0) + (lastSide === side && pressAge < 0.06 ? -0.03 : 0);
    G.btnW.position.y = 0.62 + dn('w'); G.btnB.position.y = 0.62 + dn('b');
    const jolt = pressAge < 0.25 ? Math.exp(-pressAge / 0.05) * 0.04 : 0;
    G.clock.position.y = -0.28 + 0.28 - jolt * 0.5; G.clock.rotation.x = (lastSide === 'w' ? 1 : -1) * jolt * 0.5;
    drawClock(G.cc, ck);
    drawSheet(G.sc, st.k + 1);

    // billboards
    const P4 = G.bbP.array, C = G.bbC.array, SS = G.bbS.array; let nb = 0;
    const push = (pos, size, col, str = [0, 0, 0]) => { if (nb >= 400) return; P4.set([pos[0], pos[1], pos[2], size], nb * 4); C.set(col, nb * 3); SS.set(str, nb * 3); nb++; };
    for (const L of G.lamps) { const on = p.lights != null ? p.lights : lampOn(S, L, t); if (on > 0.01) push(L.pos, 0.55, [1.6 * on, 1.15 * on, 0.7 * on]); }
    // eyes in the dark: two pairs, faint, blinking
    const eyeAmt = (1 - room) * (p.eyes ?? 1) * clamp((t - S.plies[6].t) / 1.2) * (1 - battle * 0.7) * (1 - flat);
    if (eyeAmt > 0.01) {
      const pairs = [{ pos: [-8.6, 1.9, -6.8], seed: 1, col: [0.9, 1.0, 0.55] }, { pos: [9.4, 1.5, -5.2], seed: 2, col: [1.0, 0.8, 0.4] }];
      for (const E of pairs) {
        const blink = (Math.sin(t * 0.9 + E.seed * 5) > 0.985 || (t * 0.37 + E.seed * 0.3) % 1 < 0.035) ? 0.05 : 1;
        const look = 0.06 * Math.sin(t * 0.4 + E.seed);
        const right = [Math.cos(0.6 * E.seed + look), 0, -Math.sin(0.6 * E.seed + look)];
        const g = eyeAmt * blink * 1.6;
        for (const s of [-1, 1]) push([E.pos[0] + right[0] * 0.09 * s, E.pos[1], E.pos[2] + right[2] * 0.09 * s], 0.05, E.col.map((x) => x * g));
      }
    }
    // sparks off the clock on 9.Qxg7 (White's button)
    const sparkT = S.anchors.spark, sa = t - sparkT;
    if (sa >= 0 && sa < 1.0 && (p.sparks ?? 1) > 0) {
      const btn = [CLOCK_POS[0] + 0.18, 0.75, CLOCK_POS[2] + 0.68];
      for (let i = 0; i < 70; i++) {
        const life = 0.35 + 0.6 * hash1(i * 1.3); if (sa > life) continue;
        const a = hash1(i * 2.7) * Math.PI * 2, el = 0.25 + hash1(i * 3.1) * 1.1, sp = 3 + 7 * hash1(i * 5.9);
        const v = [Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp, Math.sin(a) * Math.cos(el) * sp];
        const pos = [btn[0] + v[0] * sa, btn[1] + v[1] * sa - 4.9 * sa * sa, btn[2] + v[2] * sa];
        if (pos[1] < -0.27) continue;
        const vel = [v[0], v[1] - 9.8 * sa, v[2]];
        const fade = 1 - sa / life, hot = 2.6 * fade * (p.sparks ?? 1);
        push(pos, 0.014 + 0.012 * hash1(i), [hot * 1.0, hot * 0.7, hot * 0.32], vel.map((x) => x * 0.026));
      }
      if (sa < 0.12) push(btn, 0.9 * (1 - sa / 0.12), [3, 2.2, 1.2]);
    }
    // check glint over the checked king
    G.bb.count = nb; G.bbP.needsUpdate = true; G.bbC.needsUpdate = true; G.bbS.needsUpdate = true;

    // slam rings
    const RA = G.ringA.array; let nr = 0;
    for (const s of st.slams) { if (nr >= 40 || s.age > 0.4) continue; RA.set([s.pos[0], s.pos[2], s.age, s.s], nr * 4); nr++; }
    for (const ply of S.plies) { const a = t - ply.t; if (nr < 40 && a >= 0 && a < 0.4 && (ply.capId >= 0 || ply.check)) { const q = sqPos(ply.to); RA.set([q[0], q[2], a, 0.8], nr * 4); nr++; } }
    G.rings.count = nr; G.ringA.needsUpdate = true;

    // speed lines / impact frames need a post pass (3D -> rtTmp -> rtScene); otherwise the 3D goes straight into rtScene
    const sp = mode === 'dive' ? { r: 0, l: 0 } : speedAt(S, t, p);
    let imp = 0;
    if ((p.impact ?? true) && mode !== 'dive') for (const ti of impactList(S)) { const f = Math.floor((t - ti) * 24 + 1e-3); if (f === 0) imp = 1; else if (f === 1) imp = 2; }
    const needPost = sp.r > 0.001 || sp.l > 0.001 || imp > 0;
    const r = e.renderer;
    r.setRenderTarget(needPost ? e.rtTmp : e.rtScene); r.setClearColor(0x000000, 1); r.clear(true, true, false);
    r.autoClear = false; r.render(G.scene, cam); r.autoClear = true;
    if (needPost) postPass(e, st, sp, imp, t, cam);
    if (hands.length) drawHands(e, hands, cam, G.v, p.handLook || {});
}

function postPass(e, st, sp, imp, t, cam) {
    const pu = G.post.uniforms;
    pu.tSrc.value = e.rtTmp.texture;
    pu.speedR.value = sp.r; pu.speedL.value = sp.l; pu.seed.value = Math.floor(t * 12 + 1e-4) % 97;
    pu.lineAng.value = 0.08;
    // focus: the last move's square on screen
    if (st.last) { const q = sqPos(st.last.to); G.v.set(q[0], 0.5, q[2]).project(cam); pu.focus.value.set(clamp((G.v.x * 0.5 + 0.5) * 1920, 300, 1620), clamp((0.5 - G.v.y * 0.5) * 1080, 200, 880)); }
    pu.impact.value = imp;
    e.pass(G.post, e.rtScene);
}
