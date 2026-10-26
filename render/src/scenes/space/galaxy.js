// GALAXY: the Milky Way from outside, at an oblique angle (Reid 2019 arms, 58k stars, a warm bar/bulge), with the 610
// civilizations (fiction, seeded) in the galactic habitable zone along the arms, and 377 hunters (fiction) for the Build.
//
// p.mode:
//   'build'  — "Hunters never make it very far, fire at the dark, at every star, burn, and fall. / Only the ones who held
//              their fire are out there at all." Hunters flare red, fire red tracers (at each other, at the dark), burn
//              out one after another (on a 16th-note grid, accelerating like the snare roll); then the red dies away and
//              the 610 come up gold. One continuous closed-form story in t: cut it anywhere, re-enter anywhere.
//   'outro'  — slow orbit + pull-out, the 610 gold worlds linked (contact graph: MST + 2-NN, revealed outward from
//              Earth); a red ghost on every world on "burned"; a gold wave on "Every one held its fire"; a small Plex
//              counter that falls from 89 to the whispered 1, 1, 2, 3 and climbs past 610 on "The count goes higher".
//   'plain'  — just the galaxy (p.cam or the outro orbit), worlds optional (p.worlds 0..1).
// Common p: cam {target, dist, az, el, fov} (overrides the mode's camera), off [x,y] design px, stars, glow, bulge,
//   hud (0..1), all times optional (derived from the lyric word times in ctx.audio; see TIMES below).
import { initCore, renderGalaxy, G, project, W3 } from './core.js';
import { MW } from './mw.js';
import { P } from '../../palette.js';
import { clamp, lerp, smooth, smoother, range, easeInOutCubic, easeOutCubic, hash1, hash2 } from '../../util.js';
import { wordT, lineT, eighths, env, ad, pick } from './common.js';

const RED = P.red, GOLD = P.gold, GOLDP = P.goldPale, CREAM = [1.0, 0.95, 0.86], EARTH = [0.72, 0.84, 1.0];
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368];

// ---------------------------------------------------------------- times (from the lyric; every one overridable via p)
export function buildTimes(A, p = {}) {
  const T = {};
  T.hunt = pick(p.tHunt, lineT(A, 'Hunters never make it', 164.04));
  T.fire = pick(p.tFire, wordT(A, 'fire at the dark', 'fire', 166.92));
  T.star = pick(p.tStar, wordT(A, 'fire at the dark', 'star', 168.8, 0, 0, 'end'));
  T.burn = pick(p.tBurn, wordT(A, 'burn, and fall', 'burn', 169.44));
  T.fall = pick(p.tFall, lineT(A, 'burn, and fall', 170.4, 0, 'end'));
  T.held = pick(p.tHeld, lineT(A, 'Only the ones who held', 170.8));
  T.all = pick(p.tAll, wordT(A, 'are out there at all', 'all', 174.0));
  // outro
  T.six = pick(p.tSix, lineT(A, 'Six hundred worlds', 213.0));
  T.burned = pick(p.tBurned, wordT(A, "could've burned", 'burned', 219.88));
  T.every = pick(p.tEvery, wordT(A, "could've burned", 'every', 221.48, 1));
  T.heldFire = pick(p.tHeldFire, wordT(A, "could've burned", 'fire', 224.32));
  const wl = A.lines.find((l) => l.section === 'Outro' && /One/.test(l.text) && l.t > T.heldFire - 1);
  T.whisper = p.tWhisper || (wl ? wl.words.slice(0, 4).map((w) => w.t) : [224.92, 225.64, 226.2, 226.72]);
  T.count = pick(p.tCount, wordT(A, 'The count goes higher', 'count', 228.2));
  T.higher = pick(p.tHigher, lineT(A, 'The count goes higher', 229.84, 0, 'end'));
  return T;
}

// ---------------------------------------------------------------- the hunters' plan (closed form, cached per timing)
let planKey = '', plan = null;
function sixteenths(A) {
  const e = eighths(A), out = [];
  for (let i = 0; i + 1 < e.length; i++) out.push(e[i], (e[i] + e[i + 1]) / 2);
  return out;
}
function hunterPlan(A, T, p = {}) {
  const key = JSON.stringify([T.hunt, T.fire, T.star, T.burn, T.fall, p.cascade]);
  if (key === planKey) return plan;
  const grid = sixteenths(A).filter((g) => g >= T.hunt - 0.05 && g <= T.fall + 0.05);
  const snap = (t) => { let b = grid[0] ?? t, d = 1e9; for (const g of grid) { const dd = Math.abs(g - t); if (dd < d) { d = dd; b = g; } } return b; };
  const H = MW.hunters, n = H.length;
  const order = [...Array(n).keys()].sort((a, b) => hash1(a * 7.31 + 1) - hash1(b * 7.31 + 1));
  const all = [...MW.worlds.map((w) => [w.x, w.y, w.h]), ...H.map((h) => [h.x, h.y, h.h])];
  plan = new Array(n);
  order.forEach((i, rank) => {
    const k = rank / n;
    const ig = snap(lerp(T.hunt - 0.1, T.star - 0.35, Math.pow(k, 0.75)));
    // burn: 0.9-2.4 s after igniting, accelerating; whatever is left burns in the final cascade on "burn, and fall"
    // ~45% burn one after another through the verse; the rest go together in the cascade on "burn, and fall"
    let die = ig + 0.6 + 1.1 * hash1(i * 3.1 + 5);
    if (die > T.burn || hash1(i * 5.3 + 1) < (p.cascade ?? 0.45)) die = T.burn - 0.05 + (T.fall - T.burn + 0.1) * Math.pow(hash1(i * 9.7 + 2), 0.7);
    die = snap(die);
    // shots: 1-3 tracers, at neighbours (any world, any hunter) or at the dark
    const h = H[i];
    const shots = [];
    const m = 1 + Math.floor(hash1(i * 1.7 + 3) * 3) + (die > T.burn - 0.1 ? 2 : 0);
    for (let j = 0; j < m; j++) {
      const ts = snap(ig + 0.1 + j * (0.25 + 0.2 * hash2(i, j)));
      if (ts > die - 0.05) break;
      let tx, ty, th;
      if (hash2(i, j + 11) < 0.3) {   // at the dark
        const a = hash2(i, j + 21) * Math.PI * 2, d = 1.5 + 3 * hash2(i, j + 31);
        tx = h.x + Math.cos(a) * d; ty = h.y + Math.sin(a) * d; th = h.h + (hash2(i, j + 41) - 0.5) * 0.6;
      } else {                        // at a star: one of the nearer worlds
        let best = -1, bd = 1e9;
        for (let q = 0; q < 24; q++) {
          const c = Math.floor(hash2(i * 13 + q, j * 7 + 3) * all.length);
          const d = Math.hypot(all[c][0] - h.x, all[c][1] - h.y);
          if (d > 0.4 && d < bd) { bd = d; best = c; }
        }
        [tx, ty, th] = all[best];
      }
      const d = Math.hypot(tx - h.x, ty - h.y);
      shots.push({ ts, te: ts + 0.18 + d / 11, tx, ty, th });
    }
    plan[i] = { ig, die, shots };
  });
  planKey = key;
  return plan;
}

// ---------------------------------------------------------------- cameras
export function buildCam(t, T, p) {
  const k = easeInOutCubic(range(t, T.hunt - 0.5, T.all + 1));
  return { target: [lerp(0.6, 0.3, k), 0, lerp(-1.2, -0.6, k)], dist: lerp(40, 33.5, k), az: lerp(3.86, 4.14, k), el: lerp(0.74, 0.64, k), fov: 30 };
}
// the outro orbit: pure function of absolute t (phyllo's relax lands on it)
export function outroCam(t, T) {
  const u = t - T.six;
  const k = smooth(range(u, -10, 24));
  return { target: [0.4, 0, lerp(-1.0, -0.3, k)], dist: lerp(31, 43, k), az: 3.62 + u * 0.021, el: lerp(0.62, 0.86, k), fov: 30 };
}
export const OUTRO_OFF = [110, 40];

// ---------------------------------------------------------------- per-frame fill
function worldsBuild(t, T, p) {
  const S = G.sprites, L = G.lines;
  const W = MW.worlds;
  const pl = hunterPlan(p.__A, T, p);
  // the 610: anonymous dim lights until "Only the ones who held their fire": then gold, rippling out from Earth
  const R = MW.graph.reveal;
  const gold = range(t, T.held - 0.1, T.all + 0.4);
  for (let i = 0; i < W.length; i++) {
    const w = W[i];
    const gi = smooth(range(t, T.held + (T.all - T.held) * 0.85 * R[i] - 0.2, T.held + (T.all - T.held) * 0.85 * R[i] + 0.35));
    const pulse = ad(t, T.held + (T.all - T.held) * 0.85 * R[i], 0.05, 0.45);
    const col = i === 0 ? EARTH : [lerp(CREAM[0], GOLD[0], gi), lerp(CREAM[1], GOLD[1], gi), lerp(CREAM[2], GOLD[2], gi)];
    const I = lerp(0.42, 1.35, gi) + 1.1 * pulse;
    const [x, y, z] = W3(w.x, w.y, w.h);
    S.add(x, y, z, lerp(1.25, i === 0 ? 2.2 : 2.0, gi), col[0], col[1], col[2], I, lerp(0, 11, gi), i === 0 ? 7 * gi : 0);
    void gold;
  }
  // hunters
  const H = MW.hunters;
  let firing = 0, burned = 0;
  for (let i = 0; i < H.length; i++) {
    const h = H[i], q = pl[i];
    const [x, y, z] = W3(h.x, h.y, h.h);
    if (t < q.ig) { S.add(x, y, z, 1.25, CREAM[0], CREAM[1], CREAM[2], 0.42); continue; }
    if (t < q.die) {
      firing++;
      // armed: a hard red point; at the lock, a small reticle ring closes on it and goes
      const f = ad(t, q.ig, 0.04, 0.3);
      const lock = 1 - range(t, q.ig, q.ig + 0.42);
      S.add(x, y, z, 1.35 + 0.6 * f, RED[0], RED[1], RED[2], 1.0 + 1.6 * f, 3 + 6 * f);
      if (lock > 0) S.add(x, y, z, 0.01, RED[0], RED[1], RED[2], 0.9 * smooth(lock * 3), 0, 5 + 9 * lock * lock);
    } else {
      burned++;
      const age = t - q.die;
      if (age < 3.2) {
        const fl = ad(t, q.die, 0.03, 0.22);
        const em = Math.exp(-age / 0.8) * (1 - range(age, 2.4, 3.2));
        // the flash: white-hot, then a red ember that falls out of the disk
        const hot = fl * 0.55;
        const fall = 0.35 * age * age;
        S.add(x, y - fall, z, 1.3 + 2.2 * fl, lerp(RED[0], 1, hot), lerp(RED[1], 0.92, hot), lerp(RED[2], 0.8, hot), 3.0 * fl + 0.5 * em, 3 + 16 * fl);
      }
    }
    // tracers
    for (const s of q.shots) {
      if (t < s.ts || t > s.te + 0.5) continue;
      const u = clamp((t - s.ts) / (s.te - s.ts));
      const head = easeOutCubic(u) * 0.15 + u * 0.85;
      const tail = Math.max(0, head - 0.38);
      const fade = 1 - range(t, s.te, s.te + 0.5);
      const ax = lerp(h.x, s.tx, tail), ay = lerp(h.y, s.ty, tail), ah = lerp(h.h, s.th, tail);
      const bx = lerp(h.x, s.tx, head), by = lerp(h.y, s.ty, head), bh = lerp(h.h, s.th, head);
      const A = W3(ax, ay, ah), B = W3(bx, by, bh);
      L.add(A[0], A[1], A[2], B[0], B[1], B[2], 2.0, RED[0], RED[1], RED[2], 1.3 * fade, 1, 0, 1);
      if (u < 1) S.add(B[0], B[1], B[2], 1.3, 1, 0.55, 0.45, 1.8, 6);
      else { const im = ad(t, s.te, 0.02, 0.18); S.add(B[0], B[1], B[2], 1.2, RED[0], RED[1], RED[2], 1.8 * im, 12); }
    }
  }
  return { firing, burned, total: H.length };
}

function counterValue(t, T, mode) {
  if (t < T.whisper[0]) return { v: 89, k: 10, t0: -1 };
  let k = -1, t0 = 0;
  const wv = [0, 1, 2, 3];   // indices into FIB for the whispered 1, 1, 2, 3
  for (let i = 0; i < T.whisper.length; i++) if (t >= T.whisper[i]) { k = wv[i]; t0 = T.whisper[i]; }
  if (mode === 'int') {
    if (t < T.count) return { v: FIB[k], k, t0 };
    const u = range(t, T.count, T.higher);
    let v = Math.round(lerp(3, 610, Math.pow(u, 2.2)));
    if (t > T.higher) v = 610 + Math.floor((t - T.higher) * 6);
    return { v, k: -1, t0: T.count };
  }
  // 'fib': the count climbs the sequence: 5 .. 610 across "The count goes higher", then one term per beat past 610
  if (t >= T.count) {
    const steps = 11;   // 5, 8, ..., 610 = FIB[4..14]
    const u = range(t, T.count, T.higher);
    const j = Math.min(steps - 1, Math.floor(Math.pow(u, 0.8) * steps));
    k = 4 + j; t0 = T.count + (T.higher - T.count) * Math.pow(j / steps, 1 / 0.8);
    if (t > T.higher) { const b = Math.floor((t - T.higher) / 0.633); k = 14 + 1 + b; t0 = T.higher + b * 0.633; }
    k = Math.min(k, FIB.length - 1);
  }
  return { v: FIB[k], k, t0 };
}

function worldsOutro(t, T, p) {
  const S = G.sprites, L = G.lines;
  const W = MW.worlds, R = MW.graph.reveal;
  const rev = p.linkReveal;   // [t0, t1]: BFS growth of the contact graph (default: already complete)
  const prog = rev ? range(t, rev[0], rev[1]) * 1.05 : 2;
  const ghost = (i) => ad(t, T.burned + R[i] * (p.ghostSpread ?? 0.06), 0.02, p.ghostDecay ?? 0.13);
  const waveT0 = T.every - 0.05, waveT1 = T.heldFire + 0.3;
  const wave = (i) => ad(t, waveT0 + (waveT1 - waveT0) * R[i], 0.05, 0.55);
  const cnt = counterValue(t, T, p.counterMode || 'fib');
  // each tick of the count flashes the first F worlds (in order of distance from Earth through the graph)
  const tick = cnt.t0 > 0 ? env(t, cnt.t0, 0.35) : 0;
  const fK = cnt.v;
  const order = MW.__revOrder || (MW.__revOrder = (() => { const o = [...R.keys()].sort((a, b) => R[a] - R[b]); const rk = new Int32Array(o.length); o.forEach((w, r) => { rk[w] = r; }); return rk; })());
  const linkI = (p.linkI ?? 0.28) * (p.links ?? 1);
  // links
  for (const e of MW.graph.edges) {
    const a = W[e.a], b = W[e.b];
    const f = clamp((prog - e.r0) / Math.max(1e-3, e.r1 - e.r0));
    if (f <= 0) continue;
    const wv = Math.max(wave(e.a), wave(e.b));
    const A = W3(a.x, a.y, a.h), B = W3(b.x, b.y, b.h);
    const I = linkI * (1 + 1.6 * wv) * (1 - 0.8 * Math.max(ghost(e.a), ghost(e.b)));
    L.add(A[0], A[1], A[2], B[0], B[1], B[2], 2.0, GOLD[0], GOLD[1], GOLD[2], I, f);
  }
  // worlds
  for (let i = 0; i < W.length; i++) {
    const w = W[i];
    const on = rev ? smooth(range(prog, R[i] - 0.02, R[i] + 0.04)) : 1;
    if (on <= 0) continue;
    const [x, y, z] = W3(w.x, w.y, w.h);
    const g = ghost(i), wv = wave(i), tk = order[i] < fK ? tick : 0;
    const I = (1.05 + 0.9 * wv + 0.7 * tk) * on * (1 - 0.85 * g);
    const col = i === 0 ? EARTH : [lerp(GOLD[0], GOLDP[0], wv * 0.5), lerp(GOLD[1], GOLDP[1], wv * 0.5), lerp(GOLD[2], GOLDP[2], wv * 0.5)];
    S.add(x, y, z, i === 0 ? 2.1 : 1.85, col[0], col[1], col[2], I, 9 + 6 * wv, i === 0 ? 8 : 0);
    // the red ghost: what every one of them could have been (a reticle, for a few frames)
    if (g > 0.01) S.add(x, y, z, 1.9, RED[0], RED[1], RED[2], 2.0 * g, 8, 6.5);
  }
  // past 610 the count keeps going: new worlds appear, farther out (fiction)
  if (cnt.v > 610 && MW.extra) {
    const nNew = Math.min(MW.extra.length, cnt.v - 610);
    for (let i = 0; i < nNew; i++) {
      const w = MW.extra[i]; const [x, y, z] = W3(w.x, w.y, w.h);
      const born = cnt.t0 + 0.4 * (i / Math.max(1, nNew));
      const a = smooth(range(t, born - 0.3, born + 0.2));
      S.add(x, y, z, 1.5, GOLD[0], GOLD[1], GOLD[2], 0.9 * a + 1.5 * ad(t, born, 0.04, 0.4), 8);
    }
  }
  return cnt;
}

function extraWorlds() {
  if (MW.extra) return;
  // 377 more worlds (fiction), beyond the habitable-zone ring, for "the count goes higher"
  const out = []; let s = 1;
  const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 2000 && out.length < 377; i++) {
    const arm = MW.arms[Math.floor(R() * MW.arms.length)];
    const P0 = arm.pts[Math.floor(R() * arm.pts.length)];
    const r = Math.hypot(P0.x, P0.y);
    if (r < 4.5 || r > 13.5 || (r > 6.6 && r < 9.4 && R() < 0.8)) continue;
    out.push({ x: P0.x + (R() - 0.5) * 0.7, y: P0.y + (R() - 0.5) * 0.7, h: (R() - 0.5) * 0.1 });
  }
  MW.extra = out;
}

export default {
  async init(ctx) { await initCore(ctx); extraWorlds(); },
  draw(ctx, shot, t, lt, p) {
    const A = ctx.audio;
    const T = buildTimes(A, p);
    p.__A = A;
    G.sprites.reset(); G.lines.reset();
    const mode = p.mode || 'plain';
    let cam = p.cam, off = p.off;
    const st = { mode, T };
    if (mode === 'build') {
      cam = cam || buildCam(t, T, p); off = off || [60, 30];
      st.hunt = worldsBuild(t, T, p);
    } else if (mode === 'outro') {
      cam = cam || outroCam(t, T); off = off || OUTRO_OFF;
      st.cnt = worldsOutro(t, T, p);
    } else {
      cam = cam || outroCam(t, T); off = off || OUTRO_OFF;
      if ((p.worlds ?? 0) > 0) for (const w of MW.worlds) { const [x, y, z] = W3(w.x, w.y, w.h); G.sprites.add(x, y, z, 1.6, GOLD[0], GOLD[1], GOLD[2], p.worlds, 8); }
    }
    // the burning dims the starlight a touch; the drop-back of red lifts it
    const dimB = mode === 'build' ? 1 - 0.4 * smooth(range(t, T.hunt, T.fire)) * (1 - smooth(range(t, T.held, T.all))) : 1;
    renderGalaxy(ctx, { cam, off, stars: (p.stars ?? 1) * dimB, glow: (p.glow ?? 0.38) * dimB, bulge: p.bulge ?? 1, sky: p.sky, skyExp: p.skyExp ?? 0.8 });
    st.cam = cam; st.off = off;
    ctx.state.galaxy = st;
  },
  type(ty, t, lt, shot, ctx) {
    const st = ctx.state.galaxy; if (!st) return;
    const p = ctx.p; const hud = p.hud ?? 1; if (hud <= 0) return;
    const T = st.T;
    const a0 = smooth(range(lt, 0.15, 0.7)) * hud;
    if (st.mode === 'build' && st.hunt) {
      const h = st.hunt;
      const redA = a0 * (1 - smooth(range(t, T.held + 0.6, T.all)));
      const x = 1840, y = 952;
      ty.label('SIMULATION', x, y - 56, { align: 'right', color: P.bookGold, alpha: a0 * 0.75, size: 13 });
      ty.text(`FIRING  ${String(h.firing).padStart(3, '0')}`, x, y - 22, { font: 'Plex', size: 21, track: 0.08, align: 'right', color: P.red, alpha: redA, glow: 8 });
      ty.text(`BURNED  ${String(h.burned).padStart(3, '0')}`, x, y + 8, { font: 'Plex', size: 21, track: 0.08, align: 'right', color: P.red, alpha: redA * 0.85, glow: 6 });
      const ga = a0 * smooth(range(t, T.held + 0.4, T.all - 0.4));
      ty.text('HELD FIRE  610', x, y + 38, { font: 'Plex', size: 21, track: 0.08, align: 'right', color: P.gold, alpha: ga, glow: 10 });
    }
    if (st.mode === 'outro' && st.cnt) {
      const c = st.cnt;
      const x = 1840, y = 968;
      const hot = c.t0 > 0 ? env(t, c.t0, 0.25) : 0;
      ty.label('SIMULATION · FICTIONAL WORLDS', x, y - 50, { align: 'right', color: P.bookGold, alpha: a0 * 0.7, size: 12 });
      ty.text(String(c.v).padStart(3, '0'), x, y, { font: 'Plex', size: 40, track: 0.06, align: 'right', color: [lerp(GOLD[0], 1, hot * 0.6), lerp(GOLD[1], 0.95, hot * 0.6), lerp(GOLD[2], 0.85, hot * 0.6)], alpha: a0, glow: 10 + 14 * hot });
      ty.label(c.v > 610 ? 'THE COUNT GOES ON' : 'THE COUNT', x, y + 30, { align: 'right', color: P.gold, alpha: a0 * 0.6, size: 12 });
      // the scale caption (true), early in the outro
      const ca = hud * smooth(range(t, T.six + 0.8, T.six + 1.8)) * (1 - smooth(range(t, T.burned - 1.2, T.burned - 0.4)));
      ty.label('MILKY WAY · DISK ~100,000 LIGHT-YEARS ACROSS', 80, 1000, { color: P.bookGold, alpha: ca * 0.8, size: 13 });
      // you are here
      const e = project(W3(MW.worlds[0].x, MW.worlds[0].y, 0), st.off);
      const ya = hud * smooth(range(t, T.six + 1.5, T.six + 2.5)) * (1 - smooth(range(t, T.burned - 1.2, T.burned - 0.4)));
      if (e[2] && ya > 0) ty.label('SUN · YOU ARE HERE', e[0] + 16, e[1] + 26, { color: P.ice, alpha: ya * 0.85, size: 11 });
    }
  },
};
