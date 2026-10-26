// SEEDS: "seeds in the dark for the waking flood." (V1f) A low camera over a black plowed field, its furrows engraved
// in perspective, converging on the horizon. On "seeds" 610 seeds are sown into the troughs (engraved: almond outline,
// spine, stripes); "in the dark" they lie dim; on "waking flood" light floods down every furrow from the horizon toward
// us, and as it reaches each seed the seed wakes, glows and lifts. The camera tilts up with them: the last frame is a
// still star field of 610 gold points, the first sight of the galaxy's worlds.
// p (optional): tSow, tDark, tFor, tWaking, tFlood (word times; defaults from the lyric), tEnd (default shot.t1),
//   n (610), horizon (pitch at start, deg, 13), tiltTo (deg, -27), sky (deep sky behind the risen seeds, 1)
import { drawSky } from '../sky.js';
import { P, css } from '../../palette.js';
import { clamp, lerp, smooth, smoother, range, easeInOutCubic, easeOutCubic, easeInCubic, hash1, hash2, noise1, rng } from '../../util.js';
import { wordT, ad, env, pick, Buckets, glowSprite, drawGlow, soft2d } from './common.js';

const F = 1158;                // focal length (design px): ~50 deg vertical fov
const H = 1.6;                 // camera height above the soil
let SEEDS = null;

const PITCH = 0.62;            // furrow spacing (m)
const furrowX = (j, Z) => j * PITCH + 0.07 * Math.sin(Z * 0.21 + j * 1.3) + 0.04 * Math.sin(Z * 0.53 + j * 0.7);
function makeSeeds(n) {
  const R = rng(27);
  const out = [];
  for (let i = 0; i < n; i++) {
    const z = 2.4 + Math.pow(R(), 1.25) * 34;
    const span = 2.0 + z * 0.9;
    const j = Math.round(((R() * 2 - 1) * span) / PITCH);
    // a sky elevation for each seed: the risen seeds cover the sky evenly
    const el = (3 + Math.pow(R(), 0.9) * 50) * Math.PI / 180;
    out.push({ j, z, dx: (R() - 0.5) * 0.12, ang: (R() - 0.5) * 1.2, len: 0.095 + R() * 0.05, sow: R(), drift: (R() - 0.5) * 0.6, el, az: (R() - 0.5) * 0.25, rise: 0.8 + R() * 0.5, stag: R(), b: 0.45 + Math.pow(R(), 3) * 1.6 });
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
    const fr0 = tFor - 0.1, fr1 = Math.min(tWake + 0.6, tEnd - 0.8);           // flood front sweep
    const tilt = smoother(range(t, tWake - 0.05, Math.min(tEnd - 0.05, tFlood + 0.25)));
    const pitch = lerp(p.horizon ?? 9, p.tiltTo ?? -27, tilt) * Math.PI / 180 + 0.004 * Math.sin(t * 0.7);
    const drift = lt * 0.12;     // slow dolly forward
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const proj = (X, Y, Z) => {
      const zr = Z - drift, yr = Y - H;
      const y1 = yr * cp + zr * sp, z1 = zr * cp - yr * sp;
      if (z1 < 0.15) return null;
      return [960 + F * X / z1, 540 - F * y1 / z1, z1];
    };
    // the flood: light runs down each furrow from the horizon toward the camera (per-furrow stagger)
    const ZF0 = 70, ZF1 = 0.5;
    const stag = (j) => 0.22 * noise1(j * 0.37 + 5) + 0.06 * hash1(j * 3.7);
    const frontZ = (j, tt) => lerp(ZF0, ZF1, Math.pow(clamp((tt - fr0 - stag(j)) / (fr1 - fr0)), 0.85));
    const wakeT = (j, Z) => fr0 + stag(j) + (fr1 - fr0) * Math.pow(clamp((ZF0 - Z) / (ZF0 - ZF1)), 1 / 0.85);

    // ---- the deep sky (only once we look up)
    const skyA = smooth(range(tilt, 0.35, 1)) * (p.sky ?? 1);
    if (skyA > 0.01) drawSky(ctx, { density: 0.42, band: 0.25, bandAng: -0.5, bandOff: -200, neb: 0.25, nebCol: [0.02, 0.035, 0.07], nebCol2: [0.05, 0.03, 0.015], seed: 31, exposure: skyA * 0.7, pan: [0, -tilt * 260] });
    else e.clear(e.rtScene, ...P.void);

    const SC = p.soft === false ? null : soft2d(e);
    const c = SC ? SC.begin() : e.c2dBegin();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // ---- the soil: a plowed field. Ridges are lines of constant x running to the vanishing point; width carries tone.
    const groundA = 1 - smooth(range(tilt, 0.55, 0.95));
    if (groundA > 0.01) {
      const JN = 64;
      const BR = new Buckets(16), BT = new Buckets(16);
      const heads = [];
      for (let j = -JN; j <= JN; j++) {
        // the ridge: dark steel, thicker and lighter near (batched by quantised tone)
        const pts = [];
        for (let s2 = 0; s2 <= 40; s2++) {
          const Z = 0.9 + Math.pow(s2 / 40, 1.8) * 72 + drift;
          const q = proj(furrowX(j, Z), 0.0, Z); if (!q) continue;
          pts.push([q[0], q[1], Z]);
        }
        if (pts.length < 2) continue;
        let mnx = 1e9, mxx = -1e9; for (const q of pts) { mnx = Math.min(mnx, q[0]); mxx = Math.max(mxx, q[0]); }
        if (mxx < -50 || mnx > 1970) continue;
        for (let k = 1; k < pts.length; k++) {
          const a = pts[k - 1], b = pts[k];
          const near = clamp(1 - a[2] / 40), far = smooth(range(a[2], 70, 40));
          BR.line(a[0], a[1], b[0], b[1], P.steel, (0.07 + 0.24 * near * near) * far * groundA, 1.2 + 1.8 * near);
        }
        // the trough: lit by the flood behind its front (front -> horizon), hottest at the front
        const fz = frontZ(j, t);
        if (fz < ZF0 - 0.1) {
          let prev = null;
          for (let s2 = 0; s2 <= 32; s2++) {
            const Z = fz + Math.pow(s2 / 32, 1.6) * (72 - fz);
            const q = proj(furrowX(j, Z) + PITCH / 2, -0.02, Z); if (!q) { prev = null; continue; }
            if (prev) {
              const d = prev[2] - fz;
              const hot = Math.exp(-d / 1.6), body = Math.exp(-d / 22) * smooth(range(prev[2], 72, 45));
              const near = clamp(1 - prev[2] / 40);
              BT.line(prev[0], prev[1], q[0], q[1], hot > 0.3 ? P.goldPale : P.gold, clamp((0.12 + 0.22 * near) * body + 0.75 * hot) * groundA, 1.3 + 1.6 * near + 1.2 * hot);
            } else if (fz > ZF1 + 0.2) heads.push([q[0], q[1], q[2]]);
            prev = [q[0], q[1], Z];
          }
        }
      }
      const dbg = p.dbg || 0;
      if (dbg === 2) c.lineCap = 'butt';
      BR.flush(c);
      if (dbg !== 1) c.globalCompositeOperation = 'lighter';
      if (dbg !== 4) BT.flush(c);
      // the leading edges of the water of light
      const hs = glowSprite(P.goldPale);
      if (dbg !== 3) for (const h0 of heads) drawGlow(c, hs, h0[0], h0[1], (1.2 + 2.2 * clamp(1 - h0[2] / 30)) * 3, 0.7 * groundA);
      c.globalCompositeOperation = 'source-over';
      // dawn on the horizon line, as the flood comes
      const hz = proj(0, 0, 400);
      if (hz) {
        const ha = smooth(range(t, fr0 - 0.3, fr0 + 0.4)) * (1 - smooth(range(t, fr1, fr1 + 0.6))) * groundA;
        if (ha > 0.01) {
          c.globalCompositeOperation = 'lighter';
          const g = c.createLinearGradient(0, hz[1] - 34, 0, hz[1] + 4);
          g.addColorStop(0, css(P.gold, 0)); g.addColorStop(0.9, css(P.gold, 0.08 * ha)); g.addColorStop(1, css(P.goldPale, 0.0));
          c.fillStyle = g; c.fillRect(0, hz[1] - 34, 1920, 38);
          c.strokeStyle = css(P.goldPale, 0.3 * ha); c.lineWidth = 2;
          c.beginPath(); c.moveTo(0, hz[1]); c.lineTo(1920, hz[1]); c.stroke();
          c.globalCompositeOperation = 'source-over';
        }
      }
    }

    // ---- the seeds (batched: outlines, cores and trails bucketed by tone; halos from one pre-rendered sprite)
    c.globalCompositeOperation = 'lighter';
    const BS = new Buckets(16), halo = glowSprite([1.0, 0.8, 0.45]);
    let woke = 0;
    for (let i = 0; i < SEEDS.length; i++) {
      const s = SEEDS[i];
      // sown: each falls in on a short arc, staggered across the field from the left
      const Z = s.z;
      const X0 = furrowX(s.j, Z) + PITCH / 2 + s.dx;
      const ts = tSow - 0.2 + (0.3 * s.sow + 0.7 * clamp((X0 + 25) / 50)) * 1.1;
      if (t < ts) continue;
      const fall = clamp((t - ts) / 0.32);
      const tw = wakeT(s.j, Z);
      const awake = t > tw ? 1 : 0; woke += awake;
      const wake = smooth(range(t, tw, tw + 0.15));
      // lift: an ease-out to its place in the sky (elevation el, seen from the camera)
      const u = range(t, tw + 0.05, tw + 0.05 + 0.62 * s.rise);
      const lift = easeOutCubic(u);
      const Yf = H + (Z - drift) * Math.tan(s.el);
      const up = lift * Yf;
      const vel = u > 0 && u < 1 ? (1 - u) * (1 - u) : 0;
      const Y = (1 - easeOutCubic(fall)) * 1.4 + Math.abs(Math.sin(fall * Math.PI)) * 0.04 * (fall < 1 ? 1 : 0) + up;
      const X = X0 + s.drift * (1 - fall) + lift * s.az * Z;
      const shrink = clamp(1 - lift * 3);
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
        const pth = BS.sp(col, a * shrink, Math.min(2.4, 1.2 + size / 30));
        if (pth) { pth.moveTo(pA[0], pA[1]); pth.quadraticCurveTo(cC[0], cC[1], pB[0], pB[1]); pth.quadraticCurveTo(cD[0], cD[1], pA[0], pA[1]); }
        if (size > 14) {
          for (const k of [-0.45, 0, 0.45]) {
            const ox = (pC[0] - px) * k, oy = (pC[1] - py) * k;
            BS.line(lerp(pA[0], px, 0.25) + ox, lerp(pA[1], py, 0.25) + oy, lerp(pB[0], px, 0.25) + ox, lerp(pB[1], py, 0.25) + oy, col, a * 0.55 * shrink, 1);
          }
        }
      }
      // the seed's light: dim in the dark, a glint on landing, waking into a star
      const core = 0.25 * glintS + wake * lerp(0.6, Math.min(1, 0.35 + 0.5 * s.b), 1 - shrink);
      const r = Math.max(1.1, Math.min(3.2, 0.9 + size / 18)) * lerp(0.75, 0.55 + 0.45 * s.b, 1 - shrink);
      if (core > 0.01 || size <= 5) {
        const cc = wake > 0 ? P.goldPale : P.bookGold;
        BS.dot(px, py, r, cc, clamp(size <= 5 ? Math.max(a * 0.8, core) : core));
        if (wake > 0) drawGlow(c, halo, px, py, r * (3 + 2 * s.b), 0.22 * wake * Math.min(1, s.b));
      }
      // rising: a short trail beneath, proportional to its speed (gone once it hangs still as a star)
      if (vel > 0.02) {
        const q0 = proj(X - lift * 0, Math.max(0, Y - Math.min(0.5, vel * Yf * 0.18)), Z);
        if (q0) BS.line(q0[0], q0[1], px, py, P.gold, 0.16 * wake * vel, Math.max(1.1, r * 0.55));
      }
    }
    BS.flush(c);
    c.globalCompositeOperation = 'source-over';
    if (SC) SC.blit('over', 2.0); else e.blit2d('over', 2.0);
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
