// PHYLLO: the drop's maths reveal. The 610 worlds glide out of the galaxy into a Vogel phyllotaxis disk centred on Earth
// (world n at r ∝ √n, angle n × 137.508°): a sunflower seed head, the "seeds in the dark" of verse 1 come back. On each
// shouted number F the links n → n+F light, and they draw exactly F spiral arms (the chains n ≡ k mod F):
//   Thirteen! Twenty-one! Thirty-four!  ->  13, 21, 34 arms
//   "Link by link, we broke the chain of fear; alone, we never would've made it here"  ->  the lattice network forms,
//      breadth-first from Earth (node 0, the centre), node by node
//   Fifty-five! Eighty-nine!  ->  55 and 89 arms
// then the disk relaxes back into the galaxy and the contact graph comes up, landing on the outro's camera.
// p (all optional; times default to the Drop's word times in ctx.audio):
//   fam: [{F, t}] · tGlide:[t0,t1] · tNet:[t0,t1] · tRelax:[t0,t1] · center:[x,y] (design px, 1180,540) · radius (px, 430)
//   curve (true: Catmull-Rom arms through the nodes; false: straight segments) · seeds (0..1 engraved seed outlines)
//   famStyle {F: {col, I, w}} · spin (rad/s of the disk) · stars (galaxy starlight while the disk holds, 0.0)
import { initCore, renderGalaxy, setCam, G, W3 } from './core.js';
import { MW, familyChains } from './mw.js';
import { buildTimes, outroCam, OUTRO_OFF } from './galaxy.js';
import { P } from '../../palette.js';
import { clamp, lerp, smooth, smoother, range, easeInOutCubic, easeOutCubic } from '../../util.js';
import { wordT, lineT, env, ad, pick } from './common.js';
import * as THREE from 'three';

const GOLD = P.gold, GOLDP = P.goldPale, GOLDD = P.goldDeep, EARTH = [0.72, 0.84, 1.0];
const FAMS = [13, 21, 34, 55, 89];
// each family its own gold: the 34 is the poster
const STYLE = {
  13: { col: [1.0, 0.86, 0.6], I: 0.95, w: 2.2 },
  21: { col: GOLD, I: 0.85, w: 2.0 },
  34: { col: [1.0, 0.78, 0.36], I: 1.1, w: 2.2 },
  55: { col: GOLDD, I: 0.8, w: 2.0 },
  89: { col: [0.86, 0.62, 0.3], I: 0.7, w: 2.0 },
};

function times(A, p) {
  const gang = A.lines.filter((l) => l.section === 'Drop' && /Thirteen|Fifty/i.test(l.text));
  const W1 = gang.find((l) => /Thirteen/i.test(l.text)), W2 = gang.find((l) => /Fifty/i.test(l.text));
  const fb = { 13: 194.0, 21: 194.68, 34: 195.32, 55: 201.56, 89: 202.32 };
  const ws = [...(W1 ? W1.words : []), ...(W2 ? W2.words : [])];
  const names = { 13: /thirteen/i, 21: /twenty/i, 34: /thirty/i, 55: /fifty/i, 89: /eighty/i };
  const fam = p.fam || FAMS.map((F) => { const w = ws.find((x) => names[F].test(x.w)); return { F, t: w && Number.isFinite(w.t) ? w.t : fb[F] }; });
  const tf = (F) => fam.find((f) => f.F === F)?.t ?? fb[F];
  const T = { fam, tf };
  T.glide = p.tGlide || [tf(13) - 1.0, tf(13) - 0.04];
  T.net = p.tNet || [lineT(A, 'Link by link', 195.92), lineT(A, 'alone, we never', 201.2, 0, 'end')];
  T.relax = p.tRelax || [tf(89) + 1.1, 212.0];
  return T;
}

const tmp = new THREE.Vector3();
function toScreen(x, y, z, off) {
  tmp.set(x, y, z).project(G.cam);
  return [(tmp.x * 0.5 + 0.5) * 1920 + off[0], (tmp.y * 0.5 + 0.5) * 1080 - off[1]];   // y up
}

// camera blend helpers
const mixCam = (a, b, k) => ({
  target: [lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k)],
  dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), k)), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), fov: lerp(a.fov ?? 30, b.fov ?? 30, k),
});

let PX = null, PY = null, PZ = null, MM = null;

export default {
  async init(ctx) { await initCore(ctx); },
  draw(ctx, shot, t, lt, p) {
    const A = ctx.audio;
    const T = times(A, p), GT = buildTimes(A, p);
    const n = MW.worlds.length;
    if (!PX) { PX = new Float32Array(n); PY = new Float32Array(n); PZ = new Float32Array(n); MM = new Float32Array(n); }
    const RV = p.rv ?? 6.5;                       // disk radius in kpc
    const Rpx = p.radius ?? 430, C = p.center || [1180, 540];
    const fov = 30, D = RV / Math.tan(fov / 2 * Math.PI / 180) * 540 / Rpx;
    const E = MW.worlds[0];
    const [g0, g1] = T.glide, [r0, r1] = T.relax;
    const spin = (p.spin ?? 0.018) * (t - g1);
    // ---- camera: the galaxy (oblique) -> face-on over Earth -> back onto the outro orbit
    const camStart = p.camStart || { target: [0.4, 0, -2.2], dist: 36, az: 3.95, el: 0.74, fov };
    const azF = 3.95 + 0.25;
    const camFace = { target: W3(E.x, E.y, 0), dist: D, az: azF + spin, el: Math.PI / 2 - 1e-4, fov };
    const kin = smoother(range(t, g0 - 0.25, g1 + 0.1));
    const kout = smoother(range(t, r0, r1));
    const camOut = outroCam(t, GT);
    let cam = mixCam(camStart, camFace, kin);
    if (kout > 0) cam = mixCam(camFace, camOut, kout);
    const offFace = [C[0] - 960, C[1] - 540];
    const off0 = p.offStart || OUTRO_OFF;
    let off = [lerp(off0[0], offFace[0], kin), lerp(off0[1], offFace[1], kin)];
    if (kout > 0) off = [lerp(offFace[0], OUTRO_OFF[0], kout), lerp(offFace[1], OUTRO_OFF[1], kout)];
    setCam(cam);

    // ---- node positions: polar glide around Earth (a swirl, not a scramble)
    const V = MW.vogel, slot = MW.vslot;
    for (let i = 0; i < n; i++) {
      const w = MW.worlds[i], k = slot[i];
      const dIn = (k / n) * 0.38 * (g1 - g0), dOut = (0.1 + (k / n) * 0.3) * (r1 - r0);
      const mi = easeInOutCubic(range(t, g0 + dIn, g0 + dIn + (g1 - g0) * 0.62));
      const mo = easeInOutCubic(range(t, r0 + dOut, r0 + dOut + (r1 - r0) * 0.5));
      const m = mi * (1 - mo); MM[i] = m;
      const gx = w.x - E.x, gy = w.y - E.y;
      const vx = V[k * 2] * RV, vy = V[k * 2 + 1] * RV;
      const rg = Math.hypot(gx, gy), rv = Math.hypot(vx, vy);
      const ag = Math.atan2(gy, gx); let av = Math.atan2(vy, vx);
      let da = av - ag; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const r = lerp(rg, rv, m), a = ag + da * m;
      const x = E.x + Math.cos(a) * r, y = E.y + Math.sin(a) * r, h = w.h * (1 - m);
      PX[i] = x; PY[i] = h; PZ[i] = -y;
    }
    const posOf = (vk) => MW.vworld[vk];

    G.sprites.reset(); G.lines.reset();
    const S = G.sprites, L = G.lines;
    const disk = smooth(range(t, g1 - 0.3, g1 + 0.2)) * (1 - smooth(range(t, r0, r0 + (r1 - r0) * 0.25)));
    const famHold = 1 - smooth(range(t, r0 - 0.2, r0 + (r1 - r0) * 0.1));
    const curve = p.curve ?? true;
    const style = { ...STYLE, ...(p.famStyle || {}) };
    const netA = T.net[0], netB = T.net[1];
    // families: draw-on from the centre outward, flash then sustain; earlier families settle lower as new ones light
    const lastF = (tt) => { let f = null; for (const q of T.fam) if (tt >= q.t) f = q; return f; };
    const cur = lastF(t);
    for (const q of T.fam) {
      if (t < q.t) continue;
      const st = style[q.F];
      const draw = easeOutCubic(range(t, q.t, q.t + (p.drawDur ?? 0.42)));
      const flash = ad(t, q.t, 0.05, 0.5);
      const latest = cur && cur.F === q.F;
      const inNet = smooth(range(t, netA - 0.1, netA + 0.8)) * (1 - smooth(range(t, T.tf(55) - 0.3, T.tf(55))));
      const sus = (latest ? (p.susLatest ?? 0.36) : (p.susOld ?? 0.075)) * (1 - 0.75 * inNet);
      const I = st.I * (sus + (p.flashI ?? 0.7) * flash) * famHold * (p.fams ?? 1);
      if (I <= 0.002) continue;
      const chains = familyChains(q.F, n);
      for (const ch of chains) {
        const m = ch.length;
        const P = draw * (m - 1);
        for (let j = 0; j + 1 < m; j++) {
          const fr = clamp(P - j); if (fr <= 0) break;
          const a = posOf(ch[j]), b = posOf(ch[j + 1]);
          // fade the links in the crowded centre a touch, more for the big families
          const rr = Math.sqrt((ch[j] + 0.5) / n);
          const cf = smooth(range(rr, 0.04, 0.04 + q.F / 610 * 0.9));
          const II = I * (0.35 + 0.65 * cf);
          if (!curve) { L.add(PX[a], PY[a], PZ[a], PX[b], PY[b], PZ[b], st.w, st.col[0], st.col[1], st.col[2], II, fr); continue; }
          const a0 = posOf(ch[Math.max(0, j - 1)]), b1 = posOf(ch[Math.min(m - 1, j + 2)]);
          const NS = q.F <= 21 ? 6 : 4;
          let qx = PX[a], qy = PY[a], qz = PZ[a];
          const segs = Math.max(1, Math.ceil(NS * fr));
          for (let s = 1; s <= segs; s++) {
            const u = Math.min(fr, s / NS);
            const u2 = u * u, u3 = u2 * u;
            const c0 = -0.5 * u3 + u2 - 0.5 * u, c1 = 1.5 * u3 - 2.5 * u2 + 1, c2 = -1.5 * u3 + 2 * u2 + 0.5 * u, c3 = 0.5 * u3 - 0.5 * u2;
            const x = c0 * PX[a0] + c1 * PX[a] + c2 * PX[b] + c3 * PX[b1];
            const y = c0 * PY[a0] + c1 * PY[a] + c2 * PY[b] + c3 * PY[b1];
            const z = c0 * PZ[a0] + c1 * PZ[a] + c2 * PZ[b] + c3 * PZ[b1];
            L.add(qx, qy, qz, x, y, z, st.w, st.col[0], st.col[1], st.col[2], II);
            qx = x; qy = y; qz = z;
          }
        }
        // the spark at the head of each arm as it draws out
        if (draw < 1) {
          const j = Math.min(m - 1, Math.floor(P)), b = posOf(ch[Math.min(m - 1, j + 1)]), a = posOf(ch[j]), f = P - j;
          S.add(lerp(PX[a], PX[b], f), lerp(PY[a], PY[b], f), lerp(PZ[a], PZ[b], f), 1.5, GOLDP[0], GOLDP[1], GOLDP[2], 2.2 * (1 - draw), 7);
        }
      }
    }
    // the network: lattice links, breadth-first from Earth, during "Link by link ... made it here"
    const lat = MW.lattice;
    const Dn = (lat.maxDepth + 1.2) * smoother(range(t, netA, netB));
    const netI = (p.netI ?? 0.3) * (1 - 0.6 * smooth(range(t, netB, netB + 0.6))) * (1 - smooth(range(t, r0 - 0.2, r0 + (r1 - r0) * 0.1))) * (t >= netA ? 1 : 0);
    const netCol = p.netCol || [1.0, 0.9, 0.7];
    if (netI > 0) {
      for (const e of lat.edges) {
        const fr = clamp((Dn - e.d0) * 1.0);
        if (fr <= 0) continue;
        const a = posOf(e.a), b = posOf(e.b);
        const head = Math.exp(-Math.pow((Dn - e.d0 - 0.6) * 1.2, 2));
        L.add(PX[a], PY[a], PZ[a], PX[b], PY[b], PZ[b], 2.0, lerp(netCol[0], 0.85, head), lerp(netCol[1], 0.93, head), lerp(netCol[2], 1.0, head), netI * (0.55 + 1.4 * head), fr);
      }
    }
    // the contact graph (galaxy links) comes up as the disk relaxes, so the outro continues seamlessly
    const prog = range(t, r0 + (r1 - r0) * 0.3, r1 - 0.4) * 1.05;
    if (prog > 0) {
      for (const e of MW.graph.edges) {
        const f = clamp((prog - e.r0) / Math.max(1e-3, e.r1 - e.r0)); if (f <= 0) continue;
        L.add(PX[e.a], PY[e.a], PZ[e.a], PX[e.b], PY[e.b], PZ[e.b], 2.0, GOLD[0], GOLD[1], GOLD[2], p.linkI ?? 0.28, f);
      }
    }
    // the worlds: gold points; in the disk they are seeds (engraved outlines, broad end outward)
    const ec = toScreen(PX[0], PY[0], PZ[0], [off[0], -off[1]]);
    const seeds = (p.seeds ?? 1) * disk;
    for (let i = 0; i < n; i++) {
      const k = slot[i];
      const dd = Dn - lat.depth[k] - 0.7; const reached = t >= netA && dd > 0 ? Math.exp(-dd * 1.3) * clamp(dd * 6) : 0;
      const fl = T.fam.reduce((s, q) => s + ad(t, q.t, 0.03, 0.3) * 0.5, 0);
      const I = 1.0 + 0.5 * MM[i] * (1 - kout) + 1.0 * reached + fl * 0.6;
      let ang = 0;
      if (seeds > 0.01 && i !== 0) { const sp = toScreen(PX[i], PY[i], PZ[i], [off[0], -off[1]]); ang = Math.atan2(sp[1] - ec[1], sp[0] - ec[0]); }
      const col = i === 0 ? EARTH : GOLD;
      S.add(PX[i], PY[i], PZ[i], lerp(i === 0 ? 2.4 : 1.7, i === 0 ? 2.1 : 1.85, kout), col[0], col[1], col[2], I * lerp(0.8, 1.05, kout), lerp(6, 9, kout), i === 0 ? 9 : 0, i === 0 ? 0 : seeds * MM[i] * (p.seedI ?? 0.55), ang);
    }
    const starsK = 1 - smooth(range(t, g0 - 0.2, g1 - 0.1)) * (1 - smooth(range(t, r0 + (r1 - r0) * 0.15, r0 + (r1 - r0) * 0.7)));
    const hold = p.stars ?? 0.0;
    const sk = lerp(hold, 1, starsK);
    G.lines.mat.uniforms.glow.value = lerp(p.lineGlow ?? 0.1, 0.22, kout);
    renderGalaxy(ctx, { cam, off, stars: sk, glow: 0.38 * sk, bulge: sk, skyExp: 0.8 });
    G.lines.mat.uniforms.glow.value = 0.22;
    ctx.state.phyllo = { T, disk, off, C, Rpx };
  },
  type(ty, t, lt, shot, ctx) {
    const st = ctx.state.phyllo; if (!st) return;
    const p = ctx.p; const hud = (p.hud ?? 1) * st.disk; if (hud <= 0.01) return;
    const T = st.T;
    const x = 1840, y0 = 900;
    ty.label('SIMULATION · 610 WORLDS (FICTIONAL)', x, y0, { align: 'right', color: P.bookGold, alpha: hud * 0.75, size: 12 });
    ty.text('r ∝ √n    θ = n × 137.508°', x, y0 + 30, { font: 'Plex', size: 18, track: 0.04, align: 'right', color: P.cream, alpha: hud * 0.7 });
    // the current family, as a rule of the diagram
    let cur = null; for (const q of T.fam) if (t >= q.t) cur = q;
    const inNet = t >= T.net[0] && t < T.tf(55);
    let s = null, ka = 0;
    if (inNet) { s = 'LINK BY LINK · FROM EARTH'; ka = smooth(range(t, T.net[0], T.net[0] + 0.3)); }
    else if (cur) { s = `n → n + ${cur.F}  ·  ${cur.F} ARMS`; ka = smooth(range(t, cur.t, cur.t + 0.12)); }
    if (s) ty.text(s, x, y0 + 64, { font: 'Plex', size: 22, track: 0.06, align: 'right', color: P.gold, alpha: hud * ka, glow: 10 });
    if (t >= T.tf(89)) {
      const a = hud * smooth(range(t, T.tf(89) + 0.3, T.tf(89) + 0.8));
      ty.text('89 / 55 = 1.6182 → φ = 1.6180339887', x, y0 + 96, { font: 'Plex', size: 16, track: 0.04, align: 'right', color: P.goldPale, alpha: a * 0.8 });
    }
  },
};
