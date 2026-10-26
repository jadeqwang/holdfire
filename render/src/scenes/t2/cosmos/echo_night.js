// t2_echo_night (drop, 3:22.89 "And you were seen too, wherever you are"): Echo (fiction: the Rare Earth video's world,
// never a real exoplanet) from orbit at night, after refs/world_echo_sheet.jpg panel 03 "From orbit": an ocean world of
// archipelagos under violet weather, its cities linked like a constellation (mint light on the night side), a fluo-pink
// sunrise rim, faint planetary rings, the spire of the signal tower rising from one city into a ring of stations in orbit.
// On p.tRing the tower's ring lights and the light runs round the orbital ring, station by station; the constellation
// draws itself out from the tower city.
//
// p (all optional): tRing (202.89 "And"), tLinks [t0, t1] (links draw out from the tower: 203.0-206.5),
//   cam {dist, az, el, look [x,y,z], fov, roll} (default: a slow drift, planet lower left as in the sheet), rings (0.5),
//   cities (1), over
import * as THREE from 'three';
import { SpriteBatch, LineBatch, setCommon } from './gfx.js';
import { initEarth, earthTexture } from './earth.js';
import { drawSky } from '../../sky.js';
import { C, mixc, lineT, ad, pick } from './common.js';
import { rng, clamp, lerp, smooth, smoother, range, easeOutCubic, hash1 } from '../../../util.js';

let E = null;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ll = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
const slerp = (p, q, s) => { const d = clamp(dot(p, q), -1, 1), w = Math.acos(d); if (w < 1e-6) return p; const A = Math.sin((1 - s) * w) / Math.sin(w), B = Math.sin(s * w) / Math.sin(w); return [A * p[0] + B * q[0], A * p[1] + B * q[1], A * p[2] + B * q[2]]; };

function build(ctx) {
  const e = ctx.engine, rt = earthTexture();
  const W = rt.width, H = rt.height, buf = new Uint8Array(W * H * 4);
  e.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  const island = (lat, lon) => { const x = Math.floor((lon / (2 * Math.PI) + 0.5) * W) % W, y = Math.floor((lat / Math.PI + 0.5) * H); return buf[(Math.min(H - 1, y) * W + x) * 4 + 1] / 255; };
  // cities: on the islands, spaced out (fiction)
  const R = rng(203), cities = [{ v: ll(1.36, 0.4), b: 2.2 }];   // the tower's city, near the north pole
  for (let g = 0; g < 80000 && cities.length < 420; g++) {
    const lat = Math.asin(R() * 2 - 1) * 0.92, lon = (R() * 2 - 1) * Math.PI;
    if (island(lat, lon) < 0.3 && R() < 0.75) continue;   // mostly on the islands, some on the open sea (floating cities)
    const v = ll(lat, lon);
    if (cities.some((c) => dot(c.v, v) > Math.cos(0.058))) continue;
    cities.push({ v, b: 0.5 + Math.pow(R(), 3) * 1.6 });
  }
  // the constellation: MST + 2 nearest (great-circle), revealed out from the tower city
  const n = cities.length, ang = (a, b) => Math.acos(clamp(dot(cities[a].v, cities[b].v), -1, 1));
  const edges = [], seen = new Set();
  const addE = (a, b) => { const k = a < b ? a * 1024 + b : b * 1024 + a; if (seen.has(k)) return; seen.add(k); edges.push({ a, b, d: ang(a, b) }); };
  // the tower: the city nearest the default view's upper limb
  const tower = 0;
  const inT = new Uint8Array(n), bd = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1); bd[tower] = 0;
  for (let it = 0; it < n; it++) { let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || bd[i] < bd[u])) u = i; inT[u] = 1; if (from[u] >= 0) addE(from[u], u); for (let v = 0; v < n; v++) if (!inT[v]) { const d = ang(u, v); if (d < bd[v]) { bd[v] = d; from[v] = u; } } }
  for (let a = 0; a < n; a++) { const near = []; for (let b = 0; b < n; b++) if (b !== a) near.push([b, ang(a, b)]); near.sort((x, y) => x[1] - y[1]); for (const [b, d] of near.slice(0, 2)) if (d < 0.45) addE(a, b); }
  const adj = Array.from({ length: n }, () => []); for (const ed of edges) { adj[ed.a].push([ed.b, ed.d]); adj[ed.b].push([ed.a, ed.d]); }
  const D = new Float64Array(n).fill(Infinity), done = new Uint8Array(n); D[tower] = 0;
  for (let it = 0; it < n; it++) { let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || D[i] < D[u])) u = i; done[u] = 1; for (const [v, d] of adj[u]) if (D[u] + d < D[v]) D[v] = D[u] + d; }
  const maxD = Math.max(...D);
  for (const ed of edges) { if (D[ed.b] < D[ed.a]) [ed.a, ed.b] = [ed.b, ed.a]; ed.r0 = D[ed.a] / maxD; ed.r1 = (D[ed.a] + ed.d) / maxD; }
  // the orbital ring passes through the top of the tower's spire
  const ringN = [0, 1, 0], side = [1, 0, 0];
  const RR = 1.24;
  const scene = new THREE.Scene();
  const lines = new LineBatch(4000), sprites = new SpriteBatch(900);
  lines.mesh.renderOrder = 1; sprites.mesh.renderOrder = 2; scene.add(lines.mesh, sprites.mesh);
  const mat = e.shader(/* glsl */`
    uniform sampler2D tex; uniform vec3 camPos; uniform vec3 cF; uniform vec3 cR; uniform vec3 cU; uniform float tanH; uniform vec2 off;
    uniform vec3 sunDir; uniform vec3 ringN; uniform float ringK; uniform float time; uniform vec3 cOcean; uniform vec3 cCloud; uniform vec3 cRim; uniform vec3 cAtm;
    const float PI = 3.14159265;
    float bands(float r){ return (.55 + .45 * sin(r * 61.) ) * (.6 + .4 * sin(r * 23. + 1.3)) * smoothstep(1.55, 1.62, r) * (1. - smoothstep(2.3, 2.45, r)) * (1. - .85 * smoothstep(1.93, 1.95, r) * (1. - smoothstep(1.99, 2.01, r))); }
    void main(){
      vec2 px = vUv * vec2(1920., 1080.);
      vec2 q = (px - vec2(960., 540.) - vec2(off.x, -off.y)) / 540.;
      vec3 rd = normalize(cF + (q.x * cR + q.y * cU) * tanH);
      vec3 sunN = normalize(sunDir);
      float b = dot(camPos, rd), c = dot(camPos, camPos) - 1., disc = b * b - c;
      float tP = (disc > 0. && b < 0.) ? -b - sqrt(disc) : 1e9;
      vec3 col = vec3(0.); float alpha = 0.;
      // atmosphere glow outside the disc: violet, fluo pink toward the sun
      float dmin = sqrt(max(c - b * b + 1., 0.)); vec3 cp = camPos + rd * max(-b, 0.);
      float sunSide = clamp(dot(normalize(cp), sunN) * .5 + .5, 0., 1.);
      if (tP > 1e8 && b < 0.) { float h = max(dmin - 1., 0.);
        col += mix(cAtm, cRim, pow(sunSide, 2.)) * (exp(-h / .018) * .9 + exp(-h / .07) * .16) * (.25 + 1.6 * pow(sunSide, 3.)); }
      if (tP < 1e8) {
        vec3 n = normalize(camPos + rd * tP);
        float lat = asin(clamp(n.y, -1., 1.)), lon = atan(n.x, n.z);
        vec4 tx = texture(tex, vec2(lon / (2. * PI) + .5, .5 + lat / PI));
        float isl = tx.g, cl = tx.b;
        float ndl = dot(n, sunN), day = smoothstep(-.05, .35, ndl), mu = max(dot(n, -rd), 0.);
        vec3 night = cOcean * (.6 + .4 * mu) + vec3(.035, .03, .06) * isl + mix(cCloud, vec3(.5, .55, .75), .4) * cl * .26;
        vec3 dayc = mix(vec3(.07, .05, .2), vec3(.16, .12, .18), isl) + mix(cCloud, vec3(1., .72, .88), .55) * (.25 + cl) * .75;
        col = mix(night, dayc, day);
        // the terminator glows pink (the sheet's sunrise rim) and the limb is violet
        col += mix(cRim, vec3(1., .55, .4), .35) * exp(-pow((ndl - .0) / .05, 2.)) * .3 * (.3 + .7 * cl);
        col += mix(cAtm, cRim, pow(clamp(ndl * .5 + .5, 0., 1.), 2.)) * pow(1. - mu, 4.) * .7;
        alpha = 1.;
      }
      // the rings: banded, lit from behind (forward scatter), in the planet's shadow where it falls
      float dn = dot(rd, ringN);
      if (abs(dn) > 1e-4 && ringK > 0.) {
        float tr = -dot(camPos, ringN) / dn;
        if (tr > 0.) {
          vec3 hp = camPos + rd * tr; float rr = length(hp);
          float bd = bands(rr) * ringK;
          if (bd > 0.) {
            float b2 = dot(hp, sunN), c2 = dot(hp, hp) - 1.;
            float shadow = (b2 < 0. && b2 * b2 - c2 > 0.) ? .08 : 1.;
            float fwd = pow(clamp(dot(rd, sunN), 0., 1.), 3.) * 2. + .25;
            vec3 rc = mix(vec3(.55, .45, .85), vec3(1., .7, .9), .4) * bd * fwd * shadow * .28;
            if (tr < tP) col = col * (1. - bd * .35) + rc; else if (tP > 1e8) col += rc;
          }
        }
      }
      fragColor = vec4(col, alpha);
    }`, {
    tex: { value: rt.texture }, camPos: { value: new THREE.Vector3() }, cF: { value: new THREE.Vector3() }, cR: { value: new THREE.Vector3() }, cU: { value: new THREE.Vector3() },
    tanH: { value: 0.4 }, off: { value: new THREE.Vector2() }, sunDir: { value: new THREE.Vector3() }, ringN: { value: new THREE.Vector3(0, 1, 0) }, ringK: { value: 0.5 }, time: { value: 0 },
    cOcean: { value: new THREE.Color(0.012, 0.01, 0.035) }, cCloud: { value: new THREE.Color(0.42, 0.28, 0.85) }, cRim: { value: new THREE.Color(...C.pink) }, cAtm: { value: new THREE.Color(0.42, 0.3, 0.95) },
  });
  E = { cities, edges, tower, ringN, RR, side, scene, lines, sprites, mat, cam: new THREE.PerspectiveCamera(34, 16 / 9, 0.01, 100),
    pRingN: [0, 1, 0] };
}

export default {
  async init(ctx) { await initEarth(ctx); if (!E) build(ctx); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    const tR = pick(p.tRing, lineT(A, 'And you were seen too', 202.89));
    const [l0, l1] = p.tLinks || [tR + 0.1, tR + 2.4];
    // camera: ~24 deg above Echo's equator (the ring plane), the planet low and left, the tower's spire at its top
    const q = { dist: 3.4, az: 0.5 + (t - tR) * 0.012, el: 0.34, look: [0.6, 0.22], fov: 38, ...(p.cam || {}) };
    const tv = E.cities[E.tower].v;
    const pos = [Math.sin(q.az) * Math.cos(q.el) * q.dist, Math.sin(q.el) * q.dist, Math.cos(q.az) * Math.cos(q.el) * q.dist];
    const fwdRaw = nrm([-pos[0], -pos[1], -pos[2]]);
    const rgt = nrm(cross(fwdRaw, [0, 1, 0])), upv = nrm(cross(rgt, fwdRaw));
    const lookP = [rgt[0] * q.look[0] + upv[0] * q.look[1], rgt[1] * q.look[0] + upv[1] * q.look[1], rgt[2] * q.look[0] + upv[2] * q.look[1]];
    const cam = E.cam; cam.fov = q.fov; cam.position.set(...pos); cam.up.set(...upv); cam.lookAt(...lookP); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const F = nrm([lookP[0] - pos[0], lookP[1] - pos[1], lookP[2] - pos[2]]), Rv = nrm(cross(F, upv)), Uv = nrm(cross(Rv, F));
    // the sun behind the planet, to the right: a thin pink sunrise rim
    const sun = nrm([-pos[0] * 0.55 + Rv[0] * 1.6 * q.dist / 3 + Uv[0] * 0.3, -pos[1] * 0.55 + Rv[1] * 1.6 * q.dist / 3 + Uv[1] * 0.3, -pos[2] * 0.55 + Rv[2] * 1.6 * q.dist / 3 + Uv[2] * 0.3]);
    if (!p.over) drawSky(ctx, { density: 0.14, band: 0.25, bandAng: -0.5, neb: 0.18, nebCol: [0.03, 0.015, 0.06], nebCol2: [0.04, 0.01, 0.04], seed: 89, exposure: 0.75, pan: [q.az * 300, 0] });
    const u = E.mat.uniforms;
    u.camPos.value.set(...pos); u.cF.value.set(...F); u.cR.value.set(...Rv); u.cU.value.set(...Uv); u.tanH.value = Math.tan(q.fov * Math.PI / 360);
    u.sunDir.value.set(...sun); u.ringN.value.set(...E.pRingN); u.ringK.value = p.rings ?? 0.35; u.time.value = t;
    // the planet is opaque over the sky, its glow and rings add: premultiplied blending (src + dst * (1 - a))
    const m = E.mat; m.transparent = true; m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation;
    m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    e.renderer.autoClear = false; e.quadMesh.material = m; e.renderer.setRenderTarget(e.rtScene); e.renderer.render(e.quadScene, e.quadCam); e.renderer.autoClear = true;
    // ---------------- overlay: the constellation, the spire, the orbital ring
    const L = E.lines, S = E.sprites; L.reset(); S.reset();
    const vis = (X) => { const d = [X[0] - pos[0], X[1] - pos[1], X[2] - pos[2]]; const Ld = Math.hypot(...d); const rd = d.map((x) => x / Ld); const b = dot(pos, rd), c = dot(pos, pos) - 1, di = b * b - c; if (di <= 0) return true; const t0 = -b - Math.sqrt(di); return !(t0 > 0 && t0 < Ld - 1e-4); };
    const front = (v) => { const toC = nrm([pos[0] - v[0], pos[1] - v[1], pos[2] - v[2]]); return dot(v, toC); };
    const nightK = (v) => smooth(range(-dot(v, sun), -0.12, 0.2));
    const prog = range(t, l0, l1) * 1.05;
    const MINT = C.mint, PINK = C.pink, cityK = p.cities ?? 1;
    for (const ed of E.edges) {
      const f = clamp((prog - ed.r0) / Math.max(1e-3, ed.r1 - ed.r0)); if (f <= 0) continue;
      const a = E.cities[ed.a].v, b = E.cities[ed.b].v;
      const N = 8; let prev = a.map((x) => x * 1.003);
      for (let i = 1; i <= N; i++) {
        const s = f * i / N, v = slerp(a, b, s), X = v.map((x) => x * 1.003);
        const fr = front(v), nk = nightK(v);
        if (fr > 0.02) L.add(...prev, ...X, 2.0, ...mixc(MINT, C.pale, 0.25), 0.5 * smooth(range(fr, 0.02, 0.25)) * (0.35 + 0.65 * nk) * cityK, 1, 1, 1);
        prev = X;
      }
    }
    const rev = (i) => { let m = 9; for (const ed of E.edges) if (ed.b === i || ed.a === i) m = Math.min(m, ed.b === i ? ed.r1 : ed.r0); return i === E.tower ? 0 : m; };
    if (!E.rv) E.rv = E.cities.map((_, i) => rev(i));
    E.cities.forEach((ci, i) => {
      const v = ci.v, fr = front(v); if (fr < 0.02) return;
      const on = smooth(range(prog, E.rv[i] - 0.02, E.rv[i] + 0.03)), pop = ad(prog, E.rv[i], 0.01, 0.08);
      const nk = nightK(v), k = smooth(range(fr, 0.02, 0.25)) * (0.3 + 0.7 * nk) * cityK;
      const X = v.map((x) => x * 1.004);
      if (k < 0.04) return;
      S.add(...X, 1.3 + 0.4 * ci.b, ...mixc(mixc(MINT, [0.75, 1, 0.55], 0.3), C.paleHot, 0.3 * pop), (0.7 + 1.0 * on * ci.b + 1.6 * pop) * k, 5 + 4 * ci.b, ci.b > 1.5 ? 5 : 0);
    });
    // the spire and the tower's ring
    const top = tv.map((x) => x * 1.36);
    const lit = ad(t, tR, 0.04, 1.2), litS = smooth(range(t, tR - 0.05, tR + 0.3));
    L.add(...tv.map((x) => x * 1.002), ...top, 2.0, 0.92, 0.95, 1.0, 0.55 + 0.6 * litS, 1, 1, 0.6);
    S.add(...top, 1.6, ...mixc(PINK, MINT, litS), 0.6 + 2.2 * lit + 0.6 * litS, 10 + 10 * lit, 5 + 6 * litS);
    S.add(...tv.map((x) => x * 1.004), 2.2, ...C.paleHot, 1.2 + 1.5 * lit, 12, 0);
    // the orbital ring of stations, lit station by station from the tower round both ways
    const NS = 56, b1 = nrm([pos[0], 0, pos[2]]), b2 = nrm(cross(E.ringN, b1));
    let prevP = null, prevV = false;
    for (let j = 0; j <= NS; j++) {
      const a = (j / NS) * Math.PI * 2;
      const P = [E.RR * (Math.cos(a) * b1[0] + Math.sin(a) * b2[0]), E.RR * (Math.cos(a) * b1[1] + Math.sin(a) * b2[1]), E.RR * (Math.cos(a) * b1[2] + Math.sin(a) * b2[2])];
      const da = Math.min(a, Math.PI * 2 - a) / Math.PI;     // 0 nearest us, 1 behind the planet
      const tj = tR + 0.12 + da * 1.3;
      const on = smooth(range(t, tj - 0.04, tj + 0.08)), fl = ad(t, tj, 0.02, 0.35);
      const v = vis(P);
      if (prevP && v && prevV) L.add(...prevP, ...P, 2.0, ...mixc([0.8, 0.85, 1], MINT, on), 0.14 + 0.55 * on, 1, 1, 1);
      if (v && j < NS && j % 2 === 0) S.add(...P, 1.8, ...mixc([0.85, 0.88, 1], j % 4 === 0 ? PINK : MINT, on), 0.35 + 1.4 * on + 2.5 * fl, 7 + 8 * fl, 0);
      prevP = P; prevV = v;
    }
    for (const m of [L.mat, S.mat]) setCommon(m, e.S, [0, 0]);
    L.commit(); S.commit();
    const r = e.renderer; r.autoClear = false; r.setRenderTarget(e.rtScene); r.render(E.scene, cam); r.autoClear = true;
  },
};
