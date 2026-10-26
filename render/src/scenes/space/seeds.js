// SEEDS: "seeds in the dark for the waking flood." (V1f) A low camera over black soil drawn as engraved furrow lines.
// On "seeds" 610 seeds are sown across it (gold, engraved: almond outline, spine, stripes); "in the dark" they lie dim;
// on "waking flood" a flood of light washes across from the left (an irregular bright edge, ripples behind it, the furrows
// lit gold), and as it passes each seed wakes, glows and lifts. The camera tilts up with them: the last frame is a star
// field of 610 gold points, the first sight of the galaxy's worlds.
// p (optional): tSow, tDark, tFor, tWaking, tFlood (word times; defaults from the lyric), tEnd (default shot.t1),
//   n (610), horizon (pitch at start, deg, 13), tiltTo (deg, -27), sky (deep sky behind the risen seeds, 1)
import { drawSky } from '../sky.js';
import { P, css } from '../../palette.js';
import { clamp, lerp, smooth, smoother, range, easeInOutCubic, easeOutCubic, easeInCubic, hash1, hash2, noise1, rng } from '../../util.js';
import { wordT, ad, env, pick } from './common.js';

const F = 1158;                // focal length (design px): ~50 deg vertical fov
const H = 1.6;                 // camera height above the soil
let SEEDS = null;

function makeSeeds(n) {
  const R = rng(27);
  const out = [];
  for (let i = 0; i < n; i++) {
    // denser toward the distance (as sown), spread wide
    const z = 2.6 + Math.pow(R(), 1.35) * 34;
    const x = (R() * 2 - 1) * (2.2 + z * 0.95);
    out.push({ x, z, ang: R() * Math.PI, len: 0.095 + R() * 0.05, sow: R(), drift: (R() - 0.5) * 0.6, rise: 0.75 + R() * 0.6, seed: R() });
  }
  return out;
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    const tSow = pick(p.tSow, wordT(A, 'seeds in the dark', 'seeds', 27.24));
    const tDark = pick(p.tDark, wordT(A, 'seeds in the dark', 'dark', 28.76));
    const tFor = pick(p.tFor, wordT(A, 'seeds in the dark', 'for', 29.48));
    const tWake = pick(p.tWaking, wordT(A, 'seeds in the dark', 'waking', 30.08));
    const tFlood = pick(p.tFlood, wordT(A, 'seeds in the dark', 'flood', 31.08));
    const tEnd = pick(p.tEnd, shot.t1);
    const n = p.n ?? 610;
    if (!SEEDS || SEEDS.length !== n) SEEDS = makeSeeds(n);

    // ---- camera: pitch down at the soil, then tilt up with the rising seeds
    const fr0 = tFor - 0.1, fr1 = Math.min(tWake + 0.75, tEnd - 0.55);           // flood front sweep
    const tilt = smoother(range(t, tWake - 0.05, Math.min(tEnd - 0.05, tFlood + 0.25)));
    const pitch = lerp(p.horizon ?? 13, p.tiltTo ?? -27, tilt) * Math.PI / 180 + 0.004 * Math.sin(t * 0.7);
    const drift = lt * 0.12;     // slow dolly forward
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const proj = (X, Y, Z) => {
      const zr = Z - drift, yr = Y - H;
      const y1 = yr * cp + zr * sp, z1 = zr * cp - yr * sp;
      if (z1 < 0.15) return null;
      return [960 + F * X / z1, 540 - F * y1 / z1, z1];
    };
    // flood front position along X (world), irregular along Z
    const fx0 = -40, fx1 = 42;
    const frontAt = (Z, tt) => lerp(fx0, fx1, easeInOutCubic(range(tt, fr0, fr1))) + (noise1(Z * 0.35 + 3) - 0.5) * 6 + Z * 0.25;

    // ---- the deep sky (only once we look up)
    const skyA = smooth(range(tilt, 0.35, 1)) * (p.sky ?? 1);
    if (skyA > 0.01) drawSky(ctx, { density: 0.42, band: 0.25, bandAng: -0.5, bandOff: -200, neb: 0.25, nebCol: [0.02, 0.035, 0.07], nebCol2: [0.05, 0.03, 0.015], seed: 31, exposure: skyA * 0.85, pan: [0, -tilt * 260] });
    else e.clear(e.rtScene, ...P.void);

    const c = e.c2dBegin();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // ---- the soil: engraved furrows (lines of constant depth), width carries tone; skip lines closer than 7 px
    const groundA = 1 - smooth(range(tilt, 0.55, 0.95));
    if (groundA > 0.01) {
      let lastY = 1e9;
      const zs = [];
      for (let k = 0; k < 220; k++) zs.push(1.2 * Math.pow(1.028, k) + drift);
      for (let k = 0; k < zs.length; k++) {
        const Z = zs[k];
        const mid = proj(0, 0, Z); if (!mid) continue;
        if (mid[1] > 1120) continue;
        if (lastY - mid[1] < 7) continue;
        lastY = mid[1];
        const near = clamp(1 - mid[2] / 30);
        const xr = 4 + Z * 1.2;
        const NS = 70;
        // lit by the flood: behind the front the furrow is gold; the front's edge is hot
        let path = [];
        for (let s = 0; s <= NS; s++) {
          const X = -xr + (2 * xr * s) / NS;
          const bump = 0.035 * Math.sin(X * 2.1 + k * 1.7) + 0.05 * (noise1(X * 0.9 + k * 3.1) - 0.5);
          const q = proj(X, bump, Z); if (!q) continue;
          path.push([q[0], q[1], X]);
        }
        if (path.length < 2) continue;
        const fz = frontAt(Z, t);
        // dark pass
        c.strokeStyle = css(P.steel, (0.1 + 0.2 * near) * groundA);
        c.lineWidth = 1.2 + 1.4 * near;
        c.beginPath(); path.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
        // lit pass: the part of the furrow behind the front
        const lit = path.filter((q) => q[2] < fz);
        if (lit.length > 1) {
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(lit[0][0], 0, lit[lit.length - 1][0] + 1, 0);
          g.addColorStop(0, css(P.gold, 0.1 * groundA)); g.addColorStop(0.8, css(P.gold, (0.25 + 0.25 * near) * groundA)); g.addColorStop(1, css(P.goldPale, (0.55 + 0.4 * near) * groundA));
          c.strokeStyle = g; c.lineWidth = 1.3 + 1.5 * near;
          c.beginPath(); lit.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
          c.globalCompositeOperation = 'source-over';
        }
      }
      // the flood's edge: an engraved bright contour with two ripples behind it
      if (t > fr0 && t < fr1 + 0.4) {
        c.globalCompositeOperation = 'lighter';
        const fade = 1 - range(t, fr1, fr1 + 0.4);
        for (const [lag, a, w] of [[0, 0.95, 2.6], [1.4, 0.4, 2], [3.2, 0.18, 2]]) {
          c.strokeStyle = css(lag ? P.gold : P.goldPale, a * fade * groundA); c.lineWidth = w;
          c.beginPath(); let st = false;
          for (let s = 0; s <= 90; s++) {
            const Z = 1.6 + Math.pow(s / 90, 1.6) * 60 + drift;
            const X = frontAt(Z, t) - lag;
            const q = proj(X, 0.02, Z); if (!q) { st = false; continue; }
            if (!st) { c.moveTo(q[0], q[1]); st = true; } else c.lineTo(q[0], q[1]);
          }
          c.stroke();
        }
        c.globalCompositeOperation = 'source-over';
      }
    }

    // ---- the seeds
    c.globalCompositeOperation = 'lighter';
    let woke = 0;
    for (let i = 0; i < SEEDS.length; i++) {
      const s = SEEDS[i];
      // sown: each falls in on a short arc, staggered from the left
      const ts = tSow - 0.2 + (0.25 * s.sow + 0.75 * clamp((s.x + 30) / 60)) * 1.1;
      if (t < ts) continue;
      const fall = clamp((t - ts) / 0.32);
      const Z = s.z;
      // wake when the front passes
      const tw = (() => { // invert frontAt(Z, t) = s.x for t (monotone): bisection
        let lo = fr0 - 0.5, hi = fr1 + 0.5;
        for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (frontAt(Z, m) < s.x) lo = m; else hi = m; }
        return hi;
      })();
      const awake = t > tw ? 1 : 0; woke += awake;
      const wake = smooth(range(t, tw, tw + 0.15));
      const up = t > tw + 0.08 ? Math.pow(t - tw - 0.08, 2) * 9 * s.rise : 0;
      const Y = (1 - easeOutCubic(fall)) * 1.4 + Math.abs(Math.sin(fall * Math.PI)) * 0.04 * (fall < 1 ? 1 : 0) + up;
      const X = s.x + s.drift * (1 - fall);
      const shrink = clamp(1 - up / 1.5);
      const L = s.len * (0.35 + 0.65 * shrink);
      const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      const ctr = proj(X, Y, Z); if (!ctr) continue;
      if (ctr[0] < -40 || ctr[0] > 1960 || ctr[1] < -40 || ctr[1] > 1120) continue;
      const pA = proj(X - ca * L / 2, Y, Z - sa * L / 2), pB = proj(X + ca * L / 2, Y, Z + sa * L / 2);
      const pC = proj(X - sa * L * 0.21, Y, Z + ca * L * 0.21), pD = proj(X + sa * L * 0.21, Y, Z - ca * L * 0.21);
      const px = ctr[0], py = ctr[1];
      const size = pA && pB ? Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) : 0;
      const dark = 0.32 + 0.25 * clamp(1 - ctr[2] / 25);
      const glintS = ad(t, ts + 0.32, 0.02, 0.25);
      const col = wake > 0 ? P.gold : P.bookGold;
      const a = clamp(dark + 0.6 * wake + 0.5 * glintS);
      if (size > 5 && pA && pB && pC && pD && shrink > 0.25) {
        // the engraved seed: an almond (two arcs through the sides), a spine and two stripes
        const qa = (pp) => [2 * pp[0] - px, 2 * pp[1] - py];
        const cC = qa(pC), cD = qa(pD);
        c.strokeStyle = css(col, a * shrink); c.lineWidth = Math.min(2.4, 1.2 + size / 30);
        c.beginPath(); c.moveTo(pA[0], pA[1]); c.quadraticCurveTo(cC[0], cC[1], pB[0], pB[1]); c.quadraticCurveTo(cD[0], cD[1], pA[0], pA[1]); c.stroke();
        if (size > 14) {
          c.lineWidth = 1; c.strokeStyle = css(col, a * 0.55 * shrink);
          for (const k of [-0.45, 0, 0.45]) {
            const ox = (pC[0] - px) * k, oy = (pC[1] - py) * k;
            c.beginPath(); c.moveTo(lerp(pA[0], px, 0.25) + ox, lerp(pA[1], py, 0.25) + oy); c.lineTo(lerp(pB[0], px, 0.25) + ox, lerp(pB[1], py, 0.25) + oy); c.stroke();
          }
        }
      }
      // the seed's light: dim in the dark, a glint on landing, waking into a star
      const core = 0.25 * glintS + wake * (0.55 + 0.45 * (1 - shrink));
      const r = Math.max(1.1, Math.min(3.2, 0.9 + size / 18)) * (0.7 + 0.6 * (1 - shrink));
      if (core > 0.01 || size <= 5) {
        const cc = wake > 0 ? P.goldPale : P.bookGold;
        c.fillStyle = css(cc, clamp(size <= 5 ? Math.max(a * 0.8, core) : core));
        c.beginPath(); c.arc(px, py, r, 0, Math.PI * 2); c.fill();
        if (wake > 0) {
          const g = c.createRadialGradient(px, py, 0, px, py, r * 7);
          g.addColorStop(0, css(P.gold, 0.35 * wake)); g.addColorStop(1, css(P.gold, 0));
          c.fillStyle = g; c.beginPath(); c.arc(px, py, r * 7, 0, Math.PI * 2); c.fill();
        }
      }
      // rising: a short fading trail beneath (the seed's path of light)
      if (up > 0.02 && shrink < 1) {
        const q0 = proj(X, Math.max(0, Y - Math.min(up, 0.9)), Z);
        if (q0) {
          const g = c.createLinearGradient(q0[0], q0[1], px, py);
          g.addColorStop(0, css(P.gold, 0)); g.addColorStop(1, css(P.gold, 0.45 * wake));
          c.strokeStyle = g; c.lineWidth = Math.max(1.2, r * 0.8);
          c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(px, py); c.stroke();
        }
      }
    }
    c.globalCompositeOperation = 'source-over';
    e.blit2d(skyA > 0.01 ? 'over' : 'over', 2.0);
    ctx.state.seeds = { woke, tilt };
  },
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p; if ((p.hud ?? 1) <= 0) return;
    // the true caption, small, bottom-left, while the seeds lie in the dark
    const A = ctx.audio;
    const t0 = pick(p.tSow, wordT(A, 'seeds in the dark', 'seeds', 27.24));
    const t1 = pick(p.tWaking, wordT(A, 'seeds in the dark', 'waking', 30.08));
    const a = smooth(range(t, t0 + 0.6, t0 + 1.2)) * (1 - smooth(range(t, t1 - 0.2, t1 + 0.3))) * (p.hud ?? 1);
    ty.label('FIRST SEEDS · ELKINSIA POLYMORPHA · LATE DEVONIAN (~365 MILLION YEARS AGO)', 80, 1010, { color: P.bookGold, alpha: a * 0.8, size: 12 });
  },
};
