// t2_pulse (0:40.65-0:43.27): "a one-way dialogue": ride a pulse of light across 217 light-years toward a small blue
// point (Echo, the fictional world of the Rare Earth video; the edit sets "217 LY"). The pulse is a train of five beads
// spaced 1, 1, 2, 3, 5 (the signal's count) with a gold wake back to the pale-blue dot it left; the camera flies just
// behind it through the Sun's neighbourhood (fiction: unnamed stars), near stars streaking past (a 180-degree shutter on
// the camera's motion), the Milky Way band behind. It decelerates into Echo and ends close on the point as it arrives.
//
// p (all optional): tSend (40.86 "one-way"), tArrive (43.0), dir 'toEcho' | 'toEarth' (which world is the blue point
//   at the end: Echo by default, per the brief), dist (217, light-years), shutter (1/48 s), band (0.55), over
import * as THREE from 'three';
import { StarCloud, SpriteBatch, LineBatch, setCommon } from './gfx.js';
import { drawSky } from '../../sky.js';
import { C, mixc, wordT, ad, env, pick, drawDot } from './common.js';
import { rng, clamp, lerp, smooth, smoother, range, easeOutCubic, easeInOutCubic } from '../../../util.js';

let Q = null;
function build() {
  const R = rng(217);
  const N = 14000, a = new Float32Array(N * 8), near = [];
  let n = 0;
  const put = (x, y, z, b, col) => { const o = n * 8; a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = 1; a[o + 4] = col[0]; a[o + 5] = col[1]; a[o + 6] = col[2]; a[o + 7] = b; n++; };
  const COL = () => { const c = R(); return c < 0.1 ? [1, 0.75, 0.5] : c < 0.4 ? [1, 0.92, 0.8] : c < 0.75 ? [1, 0.98, 0.95] : [0.8, 0.88, 1]; };
  for (let i = 0; i < 10000; i++) {             // a cylinder around the path, denser near it (parallax)
    const r = 1.2 + Math.pow(R(), 0.8) * 70, th = R() * Math.PI * 2, z = 30 - R() * 290;
    const x = Math.cos(th) * r, y = Math.sin(th) * r * 0.8, b = 0.2 + Math.pow(R(), 6) * 2.6;
    put(x, y, z, b, COL()); if (r < 22) near.push([x, y, z, b]);
  }
  for (let i = 0; i < 4000; i++) {              // the farther field
    const r = 80 + R() * 420, th = R() * Math.PI * 2, u = R() * 2 - 1, s = Math.sqrt(1 - u * u);
    put(Math.cos(th) * s * r, u * r * 0.5, Math.sin(th) * s * r - 110, 0.2 + Math.pow(R(), 5) * 2.2, COL());
  }
  Q = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(48, 16 / 9, 0.01, 2000) };
  Q.stars = new StarCloud(a.subarray(0, n * 8), n); Q.stars.mesh.renderOrder = 1;
  Q.lines = new LineBatch(2500); Q.lines.mesh.renderOrder = 2;
  Q.sprites = new SpriteBatch(200); Q.sprites.mesh.renderOrder = 3;
  Q.scene.add(Q.stars.mesh, Q.lines.mesh, Q.sprites.mesh);
  Q.near = near;
}

const BEADS = [0, 1, 2, 4, 7, 12];               // cumulative 1, 1, 2, 3, 5 spacings behind the head

export default {
  async init() { if (!Q) build(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    const tS = pick(p.tSend, wordT(A, 'a one-way dialogue', 'one-way', 40.86));
    const tA = pick(p.tArrive, 43.0);
    const D = p.dist ?? p.ly ?? 217;
    const toEcho = (p.dir || 'toEcho') === 'toEcho';
    const colFrom = toEcho ? C.pale : mixc(C.mint, C.pink, 0.35), colTo = toEcho ? mixc(C.pale, C.mint, 0.3) : C.pale;
    const END = [1.6, -0.9, -D];
    // the head: leaves at tS, cruise at ~150 ly/s, eases into the far world at tA
    const u = range(t, tS, tA);
    const s = u <= 0 ? 0 : u >= 1 ? 1 : (u < 0.18 ? 0.5 * Math.pow(u / 0.18, 2) * 0.18 * 0.9 : 0.081 + (1 - 0.081) * easeOutCubic((u - 0.18) / 0.82) * 0.96 + 0.04 * smooth((u - 0.18) / 0.82));
    const zh = lerp(0, END[2], s), xh = lerp(0, END[0], smooth(s)), yh = lerp(0, END[1], smooth(s));
    const dzdt = (() => { const dt = 1 / 96; const u2 = range(t + dt, tS, tA); const s2 = u2 <= 0 ? 0 : u2 >= 1 ? 1 : (u2 < 0.18 ? 0.5 * Math.pow(u2 / 0.18, 2) * 0.18 * 0.9 : 0.081 + (1 - 0.081) * easeOutCubic((u2 - 0.18) / 0.82) * 0.96 + 0.04 * smooth((u2 - 0.18) / 0.82)); return (lerp(0, END[2], s2) - zh) / dt; })();
    // camera: starts beside Earth; rides behind and above the head; at the end settles close on the far world
    const ride = smooth(range(t, tS - 0.05, tS + 0.35));
    const settle = smoother(range(t, tA - 0.7, tA + 0.25));
    const back = lerp(7, 3.4, ride) * (1 - settle) + 2.2 * settle;
    const cpos = [lerp(2.2, xh + 0.45, ride) * (1 - settle) + (END[0] + 0.45) * settle, lerp(1.2, yh + 0.62, ride) * (1 - settle) + (END[1] + 0.25) * settle, (zh + back) * (1 - settle) + (END[2] + back) * settle];
    const look = [lerp(0, xh, ride) * (1 - settle) + END[0] * settle, lerp(0, yh, ride) * (1 - settle) + END[1] * settle, (zh - 10) * (1 - settle) + END[2] * settle];
    const cam = Q.cam; cam.fov = lerp(52, 40, settle); cam.position.set(...cpos); cam.up.set(0, 1, 0); cam.lookAt(...look);
    cam.rotateZ(0.06 * Math.sin((t - tS) * 1.3)); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    // the deep sky: the Milky Way band, panning with the camera's yaw
    if (!p.over) drawSky(ctx, { density: 0.16, band: p.band ?? 0.55, bandAng: 0.42, neb: 0.12, nebCol: [0.012, 0.02, 0.04], nebCol2: [0.02, 0.016, 0.012], seed: 41, exposure: 0.7, pan: [cpos[0] * 2, -cpos[1] * 2] });
    Q.lines.reset(); Q.sprites.reset();
    // the wake: a gold line from the world it left to the head
    const G0 = C.gold, GH = C.goldHot;
    if (s > 0) {
      Q.lines.add(0, 0, 0, xh, yh, zh, 2.0, G0[0], G0[1], G0[2], 0.55, 1, 0.15, 1.0);
      // the near wake, brighter, so the light trail reads from just behind the head
      const wl = Math.min(-zh, 26), f0 = (zh + wl) / Math.min(-1e-3, zh);
      Q.lines.add(xh * f0, yh * f0, zh + wl, xh, yh, zh, 2.6, GH[0], GH[1], GH[2], 1.1 * (1 - 0.7 * settle), 1, 0, 1);
      // the beads: 1, 1, 2, 3, 5 behind the head along the path
      for (let k = 0; k < BEADS.length; k++) {
        const b = BEADS[k] * 0.42 * Math.min(1, -zh / 12);
        const bz = zh + b; if (bz > 0) continue;
        const f = bz / Math.min(-1e-3, zh);
        Q.sprites.add(xh * f, yh * f, bz, k === 0 ? 3.6 : 2.3, GH[0], GH[1], GH[2], (k === 0 ? 5.0 : 2.6) * (1 - (k > 0 ? 0.6 : 0.85) * settle), k === 0 ? 34 : 14, 0);
      }
    }
    // near stars streak with the camera's motion (a 180-degree shutter)
    const sh = (p.shutter ?? 1 / 64) * Math.abs(dzdt) * ride * (1 - settle);
    if (sh > 0.05) {
      for (const [x, y, z, b] of Q.near) {
        const dz = z - cpos[2]; if (dz > 2 || dz < -45) continue;
        const dd = Math.hypot(x - cpos[0], y - cpos[1], dz); if (dd > 40) continue;
        const I = Math.min(1.6, 0.35 + b * 0.6) * (1 - dd / 40);
        Q.lines.add(x, y, z, x, y, z + sh, 1.6, 0.92, 0.95, 1, I, 1, 1, 0);
      }
    }
    // the two worlds
    Q.sprites.add(0, 0, 0, 2.6, ...colFrom, 2.2, 14, 6);
    const arr = ad(t, tA - 0.05, 0.04, 0.6);
    Q.sprites.add(...END, lerp(2.0, 4.2, settle), ...colTo, 1.6 + 1.6 * settle + 2.5 * arr, 14 + 18 * settle, 0);
    // the arrival: a thin ring running out from the point
    const ra = t - (tA - 0.05);
    if (ra > 0 && ra < 0.8) Q.sprites.add(...END, 0.01, ...colTo, 0.9 * (1 - ra / 0.8), 0, 8 + 150 * easeOutCubic(ra / 0.8));
    // Echo's star, an orange dwarf, close beside it at the end (fiction)
    if (toEcho) Q.sprites.add(END[0] - 0.55, END[1] + 0.12, END[2] - 0.6, 2.0, 1.0, 0.68, 0.36, 1.3 * smooth(range(t, tA - 0.9, tA - 0.2)), 12, 0);
    for (const m of [Q.stars.mat, Q.lines.mat, Q.sprites.mat]) setCommon(m, e.S, [0, 0]);
    Q.stars.mat.uniforms.gain.value = 1; Q.stars.mat.uniforms.refDist.value = 25; Q.stars.mat.uniforms.sizeK.value = 1.05; Q.stars.mat.uniforms.tint.value.set(0.95, 0.97, 1.03);
    Q.lines.commit(); Q.sprites.commit();
    const r = e.renderer;
    if (p.over) { /* additive over a plate */ } else if (!true) e.clear(e.rtScene);
    r.autoClear = false; r.setRenderTarget(e.rtScene); r.render(Q.scene, cam); r.autoClear = true;
  },
};
