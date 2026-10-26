// t2_seed_spiral (cold open, 0:00-2:80): over the extreme close-up of Jade's eye (a multi overlay on the t2_plate), gold seeds
// drift in out of the dark, swirl into the iris and settle into a sunflower head: Vogel's phyllotaxis, seed k at r = R sqrt(k/N),
// angle k x 137.508 deg (the golden angle), centred on the pupil. Once they settle, the 21 and 34 parastichies (seed k to k+21,
// k+34: the sunflower's real spiral families) glow faintly, so the next cut (the romanesco's spiral centre on the same point)
// reads as one zoom. Pure function of t: each seed's start, swirl and arrival come from hash(k).
// p: {center [960, 523] (the pupil, design px, before the plate's zoom), R (268: the iris radius), n (377 seeds), t0 (0.2: the
//     drift starts with the sub), settle (2.4: the last seed lands), swirl (0.9 turns), size (1), parastichies (true),
//     zoom / push / pan (the plate's camera, so the spiral stays locked to the pupil), gain (1.0)}, r0 (0.36 R: the pupil, left dark)
import { clamp, lerp, smooth, range, easeInOutCubic, easeOutCubic, hash1 } from '../../../util.js';
import { follow } from './lib.js';

const GA = Math.PI * (3 - Math.sqrt(5));   // 137.508 deg

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const N = p.n ?? 377, R = p.R ?? 268, r0 = p.r0 ?? R * 0.36;
    const spacing = Math.sqrt((Math.PI * (R * R - r0 * r0)) / N);
    const C = p.center || [960, 523];
    const t0 = p.t0 ?? 0.2, settle = p.settle ?? 2.4;
    const F = follow(p, lt);
    const c = e.c2dBegin();
    c.globalCompositeOperation = 'lighter';
    const fadeIn = smooth(range(t, t0, t0 + 0.6));
    const span = Math.max(0.3, settle - t0);
    const sz = (p.size ?? 1) * F.z;
    const pos = new Float32Array(N * 2);
    const done = new Float32Array(N);
    for (let k = 1; k <= N; k++) {
      const s = Math.sqrt(k / N);
      // Vogel in the iris annulus (equal area per seed), so the pupil stays dark and the head reads as the iris itself
      const rf = Math.sqrt(r0 * r0 + (R * R - r0 * r0) * (k / N)), af = k * GA;
      // where the seed starts: out in the dark, all around the eye, drifting slowly inward
      const h1 = hash1(k * 1.37 + 0.11), h2 = hash1(k * 2.71 + 0.53), h3 = hash1(k * 0.913 + 0.77);
      const a0 = h1 * Math.PI * 2, rs = 520 + 760 * h2;
      // arrival: inner seeds first (a head grows from its centre), with a little scatter
      const d = 0.62 * (0.25 * s + 0.75 * h3) * span;
      const u = easeInOutCubic(clamp((t - t0 - d) / (span - d + 1e-3)));
      const turns = Math.round((p.swirl ?? 1) * (0.6 + 0.9 * h1));   // whole turns, so every seed lands on its Vogel angle
      let da = af - a0; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
      const a = a0 + (da + 2 * Math.PI * turns) * u;
      const r = lerp(rs * (1 + 0.04 * Math.sin(t * 1.7 + k)), rf, u);
      const x = C[0] + Math.cos(a) * r, y = C[1] + Math.sin(a) * r;
      const [X, Y] = F(x, y);
      pos[(k - 1) * 2] = X; pos[(k - 1) * 2 + 1] = Y; done[k - 1] = u;
    }
    // parastichies once the head has formed
    const formed = smooth(range(t, settle - 0.35, settle + 0.25));
    if ((p.parastichies ?? true) && formed > 0) {
      // the spiral families: neighbours k -> k + F (F a Fibonacci number) that sit next to each other in the head
      const lim = spacing * 1.9 * F.z;
      c.strokeStyle = `rgba(255,196,110,${0.2 * formed * fadeIn})`; c.lineWidth = 1.5 * sz;
      c.beginPath();
      for (const F2 of [21, 34]) {
        for (let k = 1; k + F2 <= N; k++) {
          const i = (k - 1) * 2, j = (k - 1 + F2) * 2;
          if (Math.hypot(pos[j] - pos[i], pos[j + 1] - pos[i + 1]) > lim) continue;
          c.moveTo(pos[i], pos[i + 1]); c.lineTo(pos[j], pos[j + 1]);
        }
      }
      c.stroke();
    }
    const PC = F(C[0], C[1]);
    // the seeds: small gold ovals, long axis along the radius, larger toward the rim; a short streak while they move
    for (let k = 1; k <= N; k++) {
      const i = (k - 1) * 2, X = pos[i], Y = pos[i + 1], u = done[k - 1];
      const s = Math.sqrt(k / N);
      const big = (2.0 + 2.6 * s) * sz;
      const tw = 0.82 + 0.18 * Math.sin(t * 3.1 + k * 0.7);
      const a = fadeIn * (0.35 + 0.65 * u) * tw;
      const ang = Math.atan2(Y - PC[1], X - PC[0]);
      const warm = 0.75 + 0.25 * hash1(k * 5.1);
      c.fillStyle = `rgba(255,${Math.round(150 + 40 * warm)},${Math.round(50 + 30 * warm)},${0.1 * a})`;
      c.beginPath(); c.ellipse(X, Y, big * 1.9, big * 1.5, ang, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,${Math.round(180 + 40 * warm)},${Math.round(80 + 50 * warm)},${0.85 * a})`;
      c.beginPath(); c.ellipse(X, Y, big, big * 0.62, ang, 0, Math.PI * 2); c.fill();
      if (u > 0.02 && u < 0.97) {
        // streak toward where it came from (a hint of the swirl)
        const dx = Math.cos(ang + Math.PI / 2), dy = Math.sin(ang + Math.PI / 2);
        const L = 26 * sz * (1 - u) * (0.5 + hash1(k * 9.3));
        c.strokeStyle = `rgba(255,210,140,${0.35 * a})`; c.lineWidth = big * 0.7;
        c.beginPath(); c.moveTo(X, Y); c.lineTo(X - dx * L, Y - dy * L); c.stroke();
      }
    }
    e.blit2d('add', p.gain ?? 1.0);
  },
};
