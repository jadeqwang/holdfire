// Pre-chorus 2, "coin flips, all heads, a hundred in a row, / the only road from here to you." — two scenes sharing one 3D world.
// Adapted from take one's coins.js (render/src/scenes/signal/coins.js): same engraved gold coin, same faces.
//
// t2_coins (1:48.00-1:50.61): straight down over a 10 x 10 grid. A hundred coins flip and land HEADS, faster and faster, in
//   reading order. The first 27 are stamped with the years of the fact-checked list (render/data/t2/nearmisses.json, in the
//   list's order); the rest carry no year (the true number is unknown). The odds type across the bottom on teletype mono:
//   1 / 1,267,650,600,228,229,401,496,703,205,376 (= 2^100, computed with BigInt). Ends on the still grid.
// t2_cointree (1:50.61-1:53.15): continuous with that last frame. The camera pulls up and tilts forward; the coins stream out of
//   the grid into a line, and turn out to be the forks of a binary tree laid on the ground, one fork per flip, running away to
//   the horizon. Every tails branch goes dark and ends in a tiny red SIGNAL LOST; one gold path threads all hundred forks. On
//   each beat (1:51.25, 1:51.88, 1:52.52) the lit depth doubles (12 -> 25 -> 50 -> 100 forks) and the camera smashes out to show
//   it. On "you" (1:52.40) the gold path leaves the top of the tree as one link toward a far star; the chorus lands at 1:53.15.
// p (t2_coins):    {t0 (first landing; default "coin" + 0.12), t1 (100th landing; default "row"), type0/type1 (the number types)}
// p (t2_cointree): {beats:[3 times] (default the beats after the shot start), you (default the word "you"), end (default shot end),
//                   sky (0.5 exposure of the star field)}
import * as THREE from 'three';
import { P, css, mix } from '../../../palette.js';
import { clamp, lerp, smooth, smoother, easeOutCubic, easeInOutCubic, easeOutExpo, range, hash1, hash2 } from '../../../util.js';
import { drawSky } from '../../sky.js';
import { ensureList, listNow, lineByText, wordT, canvasTex, hotPoint, commas } from './lib.js';

const NC = 100, GRID = 10, SP = 2.32, RAD = 1.0, THK = 0.13;
const TWO100 = (2n ** 100n);
export const ODDS = '1 / ' + commas(TWO100.toString());          // 1 / 1,267,650,600,228,229,401,496,703,205,376
const GZ = -1.6;                                                  // grid centre z (puts the grid a little above frame centre)
const CAM_H = 54;                                                 // top-down camera height
const SKY = { density: 0.5, band: 0.3, bandAng: -0.3, bandOff: 40, neb: 0.3, nebCol: [0.03, 0.04, 0.08], nebCol2: [0.05, 0.035, 0.02], seed: 21 };
let three = null;

const NY = 27;                    // stamped coins
function atlas(yrs) {
  const T = 256, G = 8;
  const cv = document.createElement('canvas'); cv.width = cv.height = T * G;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  const tile = (k, fn) => { const x = (k % G) * T, y = Math.floor(k / G) * T; c.save(); c.translate(x + T / 2, y + T / 2); fn(T / 2); c.restore(); };
  const rim = (r) => {
    c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, r * 0.93, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3; c.beginPath();
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; c.moveTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); c.lineTo(Math.cos(a) * r * 0.89, Math.sin(a) * r * 0.89); }
    c.stroke();
  };
  const heads = (r, year) => {
    rim(r);
    c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.arc(0, year ? -r * 0.12 : 0, r * 0.42, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, year ? -r * 0.12 : 0, r * 0.075, 0, Math.PI * 2); c.fill();
    if (year) { c.font = `500 ${Math.round(r * 0.36)}px PlexM`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(year, 0, r * 0.6); }
  };
  yrs.forEach((y, i) => tile(i, (r) => heads(r, y)));
  tile(NY, (r) => heads(r, null));
  tile(NY + 1, (r) => {
    rim(r);
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, r * 0.5, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 5; c.beginPath();
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(ux * r * 0.14, uy * r * 0.14); c.lineTo(ux * r * 0.72, uy * r * 0.72); }
    c.stroke();
  });
  const tex = canvasTex(cv, { mip: true }); tex.flipY = false; tex.needsUpdate = true;
  return tex;
}

function build(yrs) {
  if (three) return three;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 9000);
  const geo = new THREE.CylinderGeometry(RAD, RAD, THK, 72, 1, false);
  const tileA = new THREE.InstancedBufferAttribute(new Float32Array(NC), 1);
  const glowA = new THREE.InstancedBufferAttribute(new Float32Array(NC), 1); glowA.setUsage(THREE.DynamicDrawUsage);
  const litA = new THREE.InstancedBufferAttribute(new Float32Array(NC).fill(1), 1); litA.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('tile', tileA); geo.setAttribute('glow', glowA); geo.setAttribute('lit', litA);
  for (let i = 0; i < NC; i++) tileA.array[i] = i < yrs.length ? i : NY;
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { tAtlas: { value: atlas(yrs) }, lightDir: { value: new THREE.Vector3(-0.5, 0.75, 0.45).normalize() }, camPos: { value: new THREE.Vector3() },
      gold: { value: new THREE.Color(...P.gold) }, pale: { value: new THREE.Color(...P.goldPale) }, deep: { value: new THREE.Color(...P.goldDeep) }, emis: { value: 1 } },
    vertexShader: /* glsl */`
      in float tile; in float glow; in float lit;
      out vec3 vN; out vec3 vP; out vec2 vUv; out float vTile; out float vGlow; out float vFace; out float vLit;
      void main(){
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.);
        vN = normalize(mat3(m) * normal); vP = wp.xyz; vUv = uv; vTile = tile; vGlow = glow; vLit = lit;
        vFace = normal.y > .5 ? 1. : (normal.y < -.5 ? -1. : 0.);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D tAtlas; uniform vec3 lightDir; uniform vec3 camPos; uniform vec3 gold; uniform vec3 pale; uniform vec3 deep; uniform float emis;
      in vec3 vN; in vec3 vP; in vec2 vUv; in float vTile; in float vGlow; in float vFace; in float vLit;
      out vec4 fragColor;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(camPos - vP); if (dot(N, V) < 0.) N = -N;
        vec3 L = normalize(lightDir);
        float diff = max(dot(N, L), 0.);
        vec3 H = normalize(L + V); float spec = pow(max(dot(N, H), 0.), 70.);
        float fres = pow(1. - max(dot(N, V), 0.), 4.);
        float lines;
        if (abs(vFace) > .5) {
          vec2 uv = vec2(vUv.y, vUv.x);
          if (vFace < 0.) uv.x = 1. - uv.x;
          float tl = floor((vFace > 0. ? vTile : ${NY + 1}.) + .5);
          float cy = floor((tl + .5) / 8.);
          vec2 cell = vec2(tl - cy * 8., cy);              // exact cell (interpolated tile ids sit a hair off integers)
          lines = texture(tAtlas, (cell + clamp(uv, .004, .996)) / 8.).r;
        } else {
          lines = (.5 + .5 * sin(vUv.x * 6.2831853 * 110.)) * .35;
        }
        vec3 col = deep * (.05 + .26 * diff) + gold * spec * 1.1 + pale * pow(spec, 3.) * 1.4 + gold * fres * .3;
        col += mix(gold, pale, .3 + .7 * vGlow) * lines * emis * (.95 + .9 * vGlow);
        col *= mix(.16, 1., vLit);
        fragColor = vec4(col, 1.);
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, NC); mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  three = { scene, cam, mesh, mat, dummy: new THREE.Object3D(), v: new THREE.Vector3(), q: new THREE.Quaternion() };
  return three;
}

const slot = (i) => { const r = Math.floor(i / GRID), c = i % GRID; return [(c - (GRID - 1) / 2) * SP, GZ + (r - (GRID - 1) / 2) * SP]; };
const years = () => listNow().entries.slice(0, NY).map((x) => String(x.year));

// ---------------------------------------------------------------- the tree (ground plane, receding along -z)
const STEP = 2.7, Z0 = 9.5;
let TREE = null;
function tree() {
  if (TREE) return TREE;
  const nodes = [], side = [], tails = [], ghosts = [];
  let x = 0, z = Z0, alt = 1;
  for (let k = 0; k < NC; k++) {
    nodes.push([x, z]);
    alt = hash1(k * 7.3 + 1) < 0.72 ? -alt : alt;      // tails mostly alternate sides
    const s = alt; side.push(s);
    // the path leans a little away from the tails branch; a gentle meander keeps it near the centre line
    const lean = -s * 0.26 - x * 0.05;
    x += Math.sin(lean) * STEP; z -= Math.cos(lean) * STEP;
    // the tails branch: out to its side, then a dead fan of futures that never happened
    const a = s * (1.22 + 0.2 * hash1(k * 3.1 + 5));
    const L = STEP * (2.4 + 0.9 * hash1(k * 1.7 + 2));
    const tx = nodes[k][0] + Math.sin(a) * L, tz = nodes[k][1] - Math.cos(a) * L;
    tails.push([tx, tz, a]);
    const fan = [];
    const grow = (px, pz, ang, len, depth, out) => {
      if (depth > 3) return;
      for (const d of [-1, 1]) {
        const an = ang + d * (0.5 + 0.12 * hash2(k, depth * 2 + d));
        const qx = px + Math.sin(an) * len, qz = pz - Math.cos(an) * len;
        out.push([px, pz, qx, qz, depth]);
        grow(qx, qz, an, len * 0.7, depth + 1, out);
      }
    };
    grow(tx, tz, a, L * 0.55, 1, fan);
    ghosts.push(fan);
  }
  TREE = { nodes, side, tails, ghosts, top: [x, z] };
  return TREE;
}

function coinTimes(ctx, shot, p) {
  const L1 = lineByText(ctx.audio, 'coin flips');
  const t0 = p.t0 ?? wordT(L1, 'coin', shot.t0) + 0.12;
  const t1 = p.t1 ?? wordT(L1, 'row', t0 + 1.9);
  const type0 = p.type0 ?? wordT(L1, 'hundred', t0 + 1.2);
  const type1 = p.type1 ?? type0 + 0.8;   // typed fast so the whole number holds (polish 4)
  return { t0, t1, type0, type1 };
}
const landT = (T, k) => T.t0 + (T.t1 - T.t0) * Math.pow(k / (NC - 1), 0.52);

function treeTimes(ctx, shot, p) {
  const A = ctx.audio;
  const L2 = lineByText(A, 'only road');
  const beats = p.beats || A.beats.filter((b) => b > shot.t0 + 0.3 && b < shot.t1).slice(0, 3);
  while (beats.length < 3) beats.push((beats[beats.length - 1] ?? shot.t0 + 0.6) + 0.635);
  const you = p.you ?? wordT(L2, 'you', beats[2] - 0.12);
  return { t0: shot.t0, beats, you, end: p.end ?? shot.t1 };
}

// camera keyframes for the tree: [pos, target, fov]; k0 is the top-down grid view
const KEYS = [
  [[0, CAM_H, GZ + 0.001], [0, 0, GZ], 30],
  [[0, 34, Z0 + 22], [0, 0, Z0 - 18], 40],
  [[0, 27, Z0 + 24], [0, 0, Z0 - 52], 44],
  [[0, 17, Z0 + 20], [0, 0, Z0 - 105], 48],
  [[0, 9.5, Z0 + 15], [0, 0, Z0 - 230], 52],
];

function setCam(S, pos, tgt, fov, upK) {
  S.cam.position.set(...pos);
  S.cam.up.copy(new THREE.Vector3(0, 0, -1).lerp(new THREE.Vector3(0, 1, 0), upK).normalize());
  S.cam.lookAt(new THREE.Vector3(...tgt));
  S.cam.aspect = 16 / 9; S.cam.fov = fov; S.cam.updateProjectionMatrix(); S.cam.updateMatrixWorld();
  S.mat.uniforms.camPos.value.set(...pos);
}

function renderCoins(e, S) {
  S.mesh.instanceMatrix.needsUpdate = true;
  S.mesh.geometry.attributes.glow.needsUpdate = true; S.mesh.geometry.attributes.lit.needsUpdate = true;
  e.renderer.autoClear = false; e.renderer.setRenderTarget(e.rtScene); e.renderer.clearDepth();
  e.renderer.render(S.scene, S.cam); e.renderer.autoClear = true;
}

export const look = { bloom: 0.8, bloomThreshold: 0.8, halation: 0.25, vignette: 0.35, grain: 0.03, streak: 0.35, streakThreshold: 1.5, streakCol: [1.0, 0.82, 0.55], typeGlow: 0.3 };
export const treeLook = { ...look, streak: 0.3, bloom: 0.85 };

// ================================================================ t2_coins
const coins = {
  async init() { await ensureList(); build(years()); },
  async prepare() { await ensureList(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const S = build(years()); const T = coinTimes(ctx, shot, p);
    const drift = smooth(range(t, shot.t0, shot.t1));
    setCam(S, [0, CAM_H + 2.5 * (1 - drift), GZ + 0.001], [0, 0, GZ], 30, 0);
    drawSky(ctx, { pan: [0, 300], zoom: 1.3, ...SKY, exposure: 0.3 });
    const d = S.dummy; const ga = S.mesh.geometry.attributes.glow, la = S.mesh.geometry.attributes.lit;
    const fly = 0.42;
    for (let i = 0; i < NC; i++) {
      const [sx, sz] = slot(i);
      const tau = t - landT(T, i);
      la.array[i] = 1;
      if (tau < -fly) { d.position.set(0, -1e4, 0); d.quaternion.identity(); d.updateMatrix(); S.mesh.setMatrixAt(i, d.matrix); ga.array[i] = 0; continue; }
      const ax = S.v.set(1, 0, (hash1(i * 3.7) - 0.5) * 0.5).normalize();
      let x = sx, y = THK / 2, z = sz, glow = 0;
      if (tau < 0) {
        const u = 1 + tau / fly;
        const spins = 3 + Math.floor(hash1(i * 1.9) * 2);
        const th = (1 - Math.pow(1 - u, 1.6)) * spins * Math.PI * 2;
        y = THK / 2 + 9 * (1 - u) * (1 - u) + 1.2 * Math.sin(u * Math.PI);
        z = sz + 5.5 * (1 - u) * (1 - u); x = sx + (hash1(i * 5.1) - 0.5) * 2 * (1 - u);
        d.quaternion.setFromAxisAngle(ax, th);
      } else {
        const b = Math.exp(-tau / 0.07);
        y = THK / 2 + 0.35 * Math.abs(Math.sin(tau * 26)) * b;
        d.quaternion.setFromAxisAngle(ax, 0.22 * Math.sin(tau * 34) * Math.exp(-tau / 0.09));
        glow = Math.exp(-tau / 0.22);
      }
      d.position.set(x, y, z); d.updateMatrix(); S.mesh.setMatrixAt(i, d.matrix); ga.array[i] = glow;
    }
    renderCoins(e, S);
    ctx.state.t2coins = { T };
  },
  type(ty, t, lt, shot, ctx) {
    const st = ctx.state.t2coins; if (!st) return;
    typeOdds(ty, t, st.T.type0, st.T.type1, 1);
  },
};

// the odds, typed on teletype mono across the bottom (a character per tick, a block cursor, a strike flash on the newest).
// polish 4: the number is the shot's key fact: 52 px (it was 36), bright, on a dark band drawn over the coins (they no longer
// show through it), so it reads on a phone
function typeOdds(ty, t, t0, t1, alpha) {
  if (t < t0 || alpha <= 0) return;
  const n = Math.floor(clamp((t - t0) / (t1 - t0)) * ODDS.length + 1e-6);
  const s = ODDS.slice(0, Math.max(1, n));
  const size = 52, wFull = ty.measure(ODDS, { font: 'PlexM', size }), x0 = 960 - wFull / 2, y = 1030;
  const cx = ty.ctx; cx.save(); cx.globalAlpha = 0.82 * alpha * clamp((t - t0) / 0.08); cx.fillStyle = 'rgb(4,4,8)';
  cx.beginPath(); cx.roundRect(x0 - 28, y - size * 0.95, wFull + 56, size * 1.38, 12); cx.fill(); cx.restore();
  ty.text(s, x0, y, { font: 'PlexM', size, color: mix(P.cream, P.goldPale, 0.3), alpha: alpha, glow: 4, shade: 0.6 });
  if (n < ODDS.length && Math.floor(t * 6) % 2 === 0) {
    const w = ty.measure(s, { font: 'PlexM', size });
    ty.text('▍', x0 + w, y, { font: 'PlexM', size, color: P.goldPale, alpha: 0.9 * alpha });
  }
}

// ================================================================ t2_cointree
const cointree = {
  async init() { await ensureList(); build(years()); tree(); },
  async prepare() { await ensureList(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const S = build(years()); const TR = tree(); const T = treeTimes(ctx, shot, p);
    const [b1, b2, b3] = T.beats;
    // ---- camera: morph off the grid (tilt and rise), then a smash out on each beat
    const kf = (() => {
      const m = easeInOutCubic(range(t, T.t0 + 0.02, b1 - 0.02));
      const smash = (b) => easeOutExpo(range(t, b - 0.03, b + 0.34));
      return [m, smash(b1), smash(b2), smash(b3)];
    })();
    let pos = KEYS[0][0].slice(), tgt = KEYS[0][1].slice(), fov = KEYS[0][2];
    for (let k = 0; k < 4; k++) {
      const u = kf[k];
      pos = pos.map((v, j) => lerp(v, KEYS[k + 1][0][j], u)); tgt = tgt.map((v, j) => lerp(v, KEYS[k + 1][1][j], u)); fov = lerp(fov, KEYS[k + 1][2], u);
    }
    // a slow drift forward to the end
    const tail = smooth(range(t, b3, T.end));
    pos[2] -= 6 * tail; pos[1] += 2 * tail;
    setCam(S, pos, tgt, fov, smooth(range(kf[0], 0.05, 0.6)));
    drawSky(ctx, { pan: [lerp(0, 0, kf[0]), lerp(300, -40, smooth(kf[0] * 0.4 + kf[3] * 0.6))], zoom: lerp(1.3, 1.0, kf[0]), ...SKY, exposure: lerp(0.3, p.sky ?? 0.75, smooth(range(kf[0], 0.2, 1))) });

    // ---- the lit depth (forks), doubling on each beat; the light runs out along the path
    const lit = lerp(lerp(lerp(lerp(0, 12.5, smooth(range(t, T.t0 + 0.3, b1))), 25, easeInOutCubic(range(t, b1, b1 + 0.32))), 50, easeInOutCubic(range(t, b2, b2 + 0.32))), 100, easeInOutCubic(range(t, b3 - 0.14, b3 + 0.3)));
    // ---- coins: grid slot -> fork, departing in order, arcing over the grid
    const d = S.dummy; const ga = S.mesh.geometry.attributes.glow, la = S.mesh.geometry.attributes.lit;
    const arrive = new Float32Array(NC);
    for (let i = 0; i < NC; i++) {
      const [sx, sz] = slot(i); const [nx, nz] = TR.nodes[i];
      const dep = T.t0 + 0.04 + i * 0.0045;
      const dist = Math.hypot(nx - sx, nz - sz);
      const dur = 0.32 + dist / 520;
      const u = smoother(range(t, dep, dep + dur));
      arrive[i] = u;
      const x = lerp(sx, nx, u), z = lerp(sz, nz, u);
      const y = THK / 2 + Math.sin(u * Math.PI) * Math.min(7, 1.5 + dist * 0.06);
      const flip = Math.sin(u * Math.PI) * 0.6;
      d.position.set(x, y, z); d.quaternion.setFromAxisAngle(S.v.set(1, 0, 0), flip); d.updateMatrix(); S.mesh.setMatrixAt(i, d.matrix);
      const litK = clamp(lit - i + 1);
      la.array[i] = u < 1 ? 1 : lerp(0.22, 1, litK);
      ga.array[i] = 0.5 * Math.exp(-Math.pow((lit - i) / 1.6, 2)) * (lit < 99.5 ? 1 : 0) + (i === NC - 1 ? 0.8 * smooth(range(t, T.you - 0.05, T.you + 0.2)) : 0);
    }

    // ---- 2D: branches, labels, the link, the star (projected from the ground plane)
    const c = e.c2dBegin();
    const cam = S.cam, V = S.v;
    const fpx = 540 / Math.tan(cam.fov * Math.PI / 360);
    const proj = (x, z, y = 0) => {
      V.set(x, y, z).project(cam);
      const sx = (V.x * 0.5 + 0.5) * 1920, sy = (1 - (V.y * 0.5 + 0.5)) * 1080;
      const w = new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse);
      return [sx, sy, -w.z, V.z];
    };
    const PN = TR.nodes.map(([x, z], i) => proj(x, z));
    const ppu = (dpt) => fpx / Math.max(0.5, dpt);                // design px per world unit at that depth
    const fogK = (dpt) => clamp(1.2 - dpt / 300, 0.25, 1);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // dead futures (very dark) and the tails branches, under everything
    for (let k = 0; k < NC; k++) {
      if (arrive[k] < 1) continue;
      const on = clamp(lit - k);                                       // this fork has been reached by the light
      const grow = smooth(range(lit - k, 0, 1.2));
      if (grow <= 0) continue;
      const [tx, tz] = TR.tails[k];
      const [x0, y0, d0] = PN[k];
      const [x1, y1, d1] = proj(tx, tz);
      const fk = fogK(d0);
      // ghosts
      c.strokeStyle = `rgba(120,110,95,${0.24 * fk * grow})`;
      for (const [ax, az, bx, bz, dep] of TR.ghosts[k]) {
        const A = proj(ax, az), B = proj(bx, bz);
        c.lineWidth = Math.max(0.8, 0.09 * ppu(A[2]) / dep);
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(lerp(A[0], B[0], grow), lerp(A[1], B[1], grow)); c.stroke();
      }
      // tails: gold at the fork, dying to ash
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, css(P.goldDeep, 0.75 * fk)); g.addColorStop(0.35, `rgba(90,70,45,${0.55 * fk})`); g.addColorStop(1, `rgba(45,40,36,${0.5 * fk})`);
      c.strokeStyle = g; c.lineWidth = Math.max(1.2, 0.2 * ppu(d0));
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, grow), lerp(y0, y1, grow)); c.stroke();
      // SIGNAL LOST at the dead end: text when it is big enough to read, else a red point
      if (grow > 0.95) {
        const px = ppu(d1) * 0.5;
        const a = fk * smooth(range(lit - k, 1.1, 1.5));
        if (px >= 6.5) {
          c.font = `600 ${px.toFixed(1)}px PlexM`; c.textBaseline = 'middle';
          const s = TR.side[k];
          c.textAlign = s > 0 ? 'left' : 'right';
          c.fillStyle = css(P.red, 0.95 * a);
          c.beginPath(); c.arc(x1, y1, Math.max(1.6, px * 0.22), 0, Math.PI * 2); c.fill();
          c.fillText('SIGNAL LOST', x1 + s * px * 0.55, y1);
        } else {
          c.fillStyle = css(P.red, 0.9 * a);
          c.beginPath(); c.arc(x1, y1, clamp(px * 0.3, 1.3, 2.4), 0, Math.PI * 2); c.fill();
        }
      }
    }
    // the gold path: lit to `lit`, a dim thread beyond; a bright head where the light is running
    for (let k = 0; k < NC - 1; k++) {
      if (arrive[k + 1] < 1 || arrive[k] < 1) continue;
      const A = PN[k], B = PN[k + 1];
      const on = clamp(lit - k);
      const w = Math.max(2.2, 0.34 * ppu(A[2]));
      const fk = fogK(A[2]);
      c.strokeStyle = css(P.goldDeep, 0.22 * fk); c.lineWidth = w * 0.7;
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
      if (on > 0) {
        c.strokeStyle = css(mix(P.gold, P.goldPale, 0.25), Math.min(1, 0.95 * fk + 0.25)); c.lineWidth = w;
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(lerp(A[0], B[0], on), lerp(A[1], B[1], on)); c.stroke();
      }
    }
    // the link: from the last fork up out of the tree toward the far star
    const star = [960, 132];
    const lk = easeInOutCubic(range(t, T.you, T.you + 0.42));
    const top = PN[NC - 1];
    if (lk > 0 && arrive[NC - 1] >= 1) {
      const hx = lerp(top[0], star[0], lk), hy = lerp(top[1], star[1], lk);
      const g = c.createLinearGradient(top[0], top[1], star[0], star[1]);
      g.addColorStop(0, css(P.goldPale, 1)); g.addColorStop(1, css(P.gold, 0.85));
      c.strokeStyle = g; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(top[0], top[1]); c.lineTo(hx, hy); c.stroke();
      hotPoint(c, hx, hy, 0.9 * (1 - lk * 0.5));
    }
    // the far star: there all along, faint; it answers when the link arrives, and flares on the chorus
    const sa = smooth(range(kf[3], 0.2, 1));
    if (sa > 0) {
      const ans = smooth(range(t, T.you + 0.38, T.you + 0.5)) * Math.exp(-Math.max(0, t - T.you - 0.5) / 0.6);
      const flare = smooth(range(t, T.end - 0.22, T.end));
      hotPoint(c, star[0], star[1], sa * (0.45 + 0.7 * ans + 1.0 * flare), [0.75, 0.95, 0.85]);
    }
    blitAdd(e);
    renderCoins(e, S);
    ctx.state.t2tree = { T, lit };
  },
  type(ty, t, lt, shot, ctx) {
    // the odds, still on screen from the coin shot, clear as the camera lifts
    const a = 1 - smooth(range(t, shot.t0 + 0.7, shot.t0 + 1.0));   // held 0.7 s into the lift (polish 4), then it clears
    if (a > 0) typeOdds(ty, t, shot.t0 - 10, shot.t0 - 9, a);
  },
};

function blitAdd(e) { e.blit2d('add', 1.5); }

export default coins;
export { coins, cointree };
