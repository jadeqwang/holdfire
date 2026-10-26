// t2_poster_morph (2:37.8-2:38.76). Continues the chess dive, which ends on a centred flat black square on cream #F1E8D6. The square
// tilts, a red wedge drives in at it (El Lissitzky's "Beat the Whites with the Red Wedge" vocabulary; Malevich's black square), and
// the board's squares slide in from the edges into a Suprematist composition, locked on the beat (2:38.11). Then every shape finds
// its place in a Soviet-poster layout: the wedge opens into the red sea, the square stretches into the hull of B-59, the bars become
// the surface rule and the destroyers' hulls, the small squares their upperworks; the halftone screen comes up as it assembles.
// It ends on exactly the frame t2_arkhipov opens on (its 'charges' layout at zoom p.zoom0), which then pulls back out of the poster.
// Flat shapes only, red, black, cream; no text, no star, no flag.
// p: {t0 (157.8), t1 (158.76), tLock (beat, 158.114), square0 (360: the chess square's size on screen, px), zoom0 (1.3), seed, cell}
import { clamp, smooth, range, easeOutCubic, easeInOutCubic, easeOutBack, hash1 } from '../../../util.js';
import { pressBegin, printPoster, pc, PAPERC, BLACK, RED, poly } from './poster.js';
import { drawCharges, arkTimes, surfY, LAYOUT, TILT } from './arkhipov.js';

const lerp = (a, b, f) => a + (b - a) * f;
const lq = (a, b, f) => a.map((v, i) => lerp(v, b[i], f));                 // [cx, cy, w, h, ang, k, r]
function drawQ(c, q) {
  const [cx, cy, w, h, ang, k, r] = q, ca = Math.cos(ang), sa = Math.sin(ang);
  poly(c, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]), pc(k, r));
}

function elements(p) {
  const Z0 = p.zoom0 ?? 1.3, S = (p.square0 ?? 360) / Z0;
  const g = (i, j) => [960 + i * S, 540 + j * S];        // the board's grid around the square (page px)
  const ys = surfY, d1 = LAYOUT.d1, d2 = LAYOUT.d2, sb = LAYOUT.sub;
  const hull = (d) => [d.x + d.L * 0.5, ys(d.x + d.L * 0.5) - 0.012 * d.L, d.L * 0.98, 0.07 * d.L, TILT, 1, 0];
  const sup = (d, f, w, h) => [d.x + d.L * f, ys(d.x + d.L * f) - d.L * 0.075, d.L * w, d.L * h, TILT, 1, 0];
  // each: A (from the board), B (Suprematist), C (poster); delay staggers the slide
  return [
    { A: [...g(0, 0), S, S, 0, 1, 0], B: [880, 500, 300, 300, -0.22, 1, 0], C: [sb.x, sb.y, sb.L * 0.92, sb.L * 0.1, sb.ang, 1, 0], d: 0 },                   // the black square -> B-59
    { A: [...g(-3, -1), S, S, 0, 1, 0], B: [420, 860, 760, 24, -0.62, 1, 0], C: [960, ys(960), 2100, 12, TILT, 1, 0], d: 0.05 },                              // bar -> the surface rule
    { A: [...g(3, 1), S, S, 0, 1, 0], B: [1320, 830, 280, 64, -0.22, 1, 0], C: hull(d2), d: 0.08 },                                                         // -> destroyer 2
    { A: [...g(-3, 1), S, S, 0, 1, 0], B: [560, 300, 96, 96, 0.36, 0, 1], C: hull(d1), d: 0.03 },                                                           // red square -> destroyer 1
    { A: [...g(2, -2), S, S, 0, 1, 0], B: [1480, 220, 54, 54, -0.22, 1, 0], C: sup(d2, 0.72, 0.12, 0.08), d: 0.1 },
    { A: [...g(-2, 2), S, S, 0, 1, 0], B: [760, 930, 420, 26, -0.22, 0, 1], C: [1700, 22, 440, 50, -0.06, 0, 1], d: 0.06 },                                 // red bar -> the red bar in the sky
    { A: [...g(-1, -2), S, S, 0, 1, 0], B: [300, 520, 40, 40, 0.1, 1, 0], C: sup(d1, 0.72, 0.12, 0.08), d: 0.12 },
    { A: [...g(1, 2), S, S, 0, 1, 0], B: [1180, 640, 36, 36, -0.5, 1, 0], C: sup(d1, 0.5, 0.1, 0.07), d: 0.09 },
    { A: [...g(-2, -2), S, S, 0, 1, 0], B: [1040, 940, 30, 30, 0.3, 0, 1], C: sup(d2, 0.5, 0.1, 0.07), d: 0.11 },
    { A: [...g(3, -1), S, S, 0, 1, 0], B: [210, 160, 300, 40, -0.22, 1, 0], C: [190, 18, 390, 46, -0.07, 1, 0], d: 0.07 },                                  // -> the black bar top left
  ];
}

export default {
  async draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const t0 = p.t0 ?? 157.8, t1 = p.t1 ?? 158.76, tL = p.tLock ?? 158.114;
    const T = arkTimes(ctx.audio, p.ark || {});
    const Z0 = p.zoom0 ?? 1.3, S = (p.square0 ?? 360) / Z0;
    const c = pressBegin(e);
    const uL = (tL - t0) / (t1 - t0);
    const u = clamp((t - t0) / (t1 - t0));
    if (u >= 0.9) {
      drawCharges(c, T, T.t0 - 0.5);                      // the poster, as t2_arkhipov opens on it
    } else {
      // the wedge: a triangle driving in from the right, then opening into the sea
      const ys = surfY;
      const wA = [[960 + S * 0.5 + 900, 540], [960 + S * 0.5 + 900, 540], [2300, 200], [2300, 900]];
      const wB = [[1030, 520], [1030, 520], [1760, 300], [1690, 790]];
      const wC = [[-40, ys(-40)], [1960, ys(1960)], [1960, 1120], [-40, 1120]];
      const fw1 = easeOutCubic(range(u, 0.02, uL)), fw2 = easeInOutCubic(range(u, 0.5, 0.88));
      const wedge = wA.map((q, i) => [lerp(lerp(q[0], wB[i][0], fw1), wC[i][0], fw2), lerp(lerp(q[1], wB[i][1], fw1), wC[i][1], fw2)]);
      // the sea darkens with depth as it opens
      const g = c.createLinearGradient(0, 200, 0, 1080);
      g.addColorStop(0, pc(0.02 * fw2, 1)); g.addColorStop(0.55, pc(0.35 * fw2, 1)); g.addColorStop(1, pc(0.8 * fw2, 1));
      poly(c, wedge, g);
      const ELS = elements(p);
      ELS.forEach((el, idx) => {
        const f1 = easeOutBack(range(u, 0.03 + el.d, uL + el.d * 0.3), 1.1), f2 = easeInOutCubic(range(u, 0.5 + el.d * 0.4, 0.88));
        // the board squares come in from the edges (only the black square is on screen at the start)
        if (idx > 0 && f1 <= 0) return;
        let q = idx === 0 ? lq(lq(el.A, el.B, easeOutCubic(range(u, 0, uL))), el.C, easeInOutCubic(range(u, 0.48, 0.86))) : lq(lq(el.A, el.B, f1), el.C, f2);
        // flat inks: a shape changes ink at once, never through a tint
        const ink = f2 > 0.5 ? el.C : f1 > 0.25 ? el.B : el.A;
        q[5] = ink[5]; q[6] = ink[6];
        drawQ(c, q);
      });
    }
    // the screen comes up as the poster assembles; flat at the cut from the chess dive
    const screen = smooth(range(u, 0.04, uL + 0.05));
    printPoster(e, { zoom: Z0, screen, seed: p.seed ?? 41, cell: p.cell ?? 11 });
  },
};
