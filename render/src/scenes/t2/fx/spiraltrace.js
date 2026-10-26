// t2_spiral_trace: traces a plant's REAL spiral count in gold over its plate (a multi overlay). The cold open's spiral aloe (Aloe
// polyphylla, 0:05.30 "five") has five spiral rows of leaves; each row is drawn as a logarithmic arm from the rosette's centre out
// to its rim, the five drawing on together from the centre, a bright head riding the front and a small node at every leaf it
// passes. Use only on phyllotaxis (aloe, sunflower 34/55, artichoke 5/8, romanesco): never on the hurricane or the galaxy, which
// are logarithmic spirals with no Fibonacci count (plan, "Keeping the science straight").
// p: {center [960, 540] (design px, before the plate's zoom), count (5; alias arms), hand (1: arms wind clockwise outward on
//     screen, -1 anticlockwise), r0 (55), r1 (470), turns (0.42: how far round each arm winds from r0 to r1), phase (0, rad),
//     t0 (draw start; default the shot start + 0.04), dur (0.42), leaves (6 nodes per arm), col ([1, 0.8, 0.42]), w (3.2),
//     hold (0.8 alpha after drawing), zoom / push / pan (the plate's camera), gain (1.3)}
import { clamp, smooth, range, easeOutCubic } from '../../../util.js';
import { follow, glowStroke, glowDot } from './lib.js';

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const n = p.count ?? p.arms ?? 5;
    const C = p.center || [960, 540];
    const r0 = p.r0 ?? 55, r1 = p.r1 ?? 470, turns = p.turns ?? 0.42, hand = p.hand ?? 1;
    const t0 = p.t0 ?? shot.t0 + 0.04, dur = p.dur ?? 0.42;
    const col = p.col || [1, 0.8, 0.42];
    const F = follow(p, lt);
    const c = e.c2dBegin();
    c.globalCompositeOperation = 'lighter';
    const at = (i, s) => {
      const a = (p.phase ?? 0) + (i * 2 * Math.PI) / n + hand * turns * 2 * Math.PI * s;
      const r = r0 * Math.pow(r1 / r0, s);
      return F(C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r);
    };
    const fadeOut = 1 - smooth(range(t, shot.t1 - 0.08, shot.t1));
    for (let i = 0; i < n; i++) {
      const prog = easeOutCubic(clamp((t - t0 - i * 0.03) / dur));
      if (prog <= 0) continue;
      const path = new Path2D();
      const steps = Math.max(2, Math.ceil(60 * prog));
      for (let k = 0; k <= steps; k++) { const [x, y] = at(i, (k / steps) * prog); if (k) path.lineTo(x, y); else path.moveTo(x, y); }
      const a = (prog < 1 ? 1 : (p.hold ?? 0.8) + (1 - (p.hold ?? 0.8)) * Math.exp(-(t - t0 - dur) / 0.25)) * fadeOut;
      glowStroke(c, path, col, (p.w ?? 3.2) * F.z, a);
      const L = p.leaves ?? 6;
      for (let j = 1; j <= L; j++) {
        const s = j / (L + 0.5);
        if (s > prog) break;
        const [x, y] = at(i, s);
        glowDot(c, x, y, (2.4 + 2.2 * s) * F.z, col, 0.85 * a, 3);
      }
      if (prog < 1) { const [x, y] = at(i, prog); glowDot(c, x, y, 4.5 * F.z, [1, 0.95, 0.8], 1, 5); }
    }
    e.blit2d('add', p.gain ?? 1.3);
  },
};
