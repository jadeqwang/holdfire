// t2_iss_pass (0:32.62 "Snowflake" and 3:50.04): the ISS as the naked eye sees it: a bright, steady point (no blinking,
// no trail) crossing a starry night sky in a slow arc. With p.over (multi layer over a plate) only the point is drawn,
// additively, so it can cross a generated sky.
//
// p (all optional): from [x, y], to [x, y] (design px; default a shallow rising arc left to right), t0, t1 (the crossing:
//   default the shot), bend (px, the arc's sag), I (2.2), r (2.6 px core), col, fadeIn / fadeOut (s; the station comes
//   out of the horizon haze and fades into Earth's shadow), over, sky {density, band, exposure}
import { drawSky } from '../../sky.js';
import { C, mixc, drawDot } from './common.js';
import { clamp, lerp, smooth, range } from '../../../util.js';

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const t0 = p.t0 ?? shot.t0, t1 = p.t1 ?? shot.t1;
    const a = p.from || [180, 760], b = p.to || [1760, 330];
    const u = clamp((t - t0) / Math.max(1e-3, t1 - t0));
    const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - (p.bend ?? 120) * 4 * u * (1 - u);
    if (!p.over) drawSky(ctx, { density: 0.3, band: 0.4, bandAng: 0.9, neb: 0.1, nebCol: [0.01, 0.02, 0.04], nebCol2: [0.02, 0.016, 0.012], seed: 23, exposure: 0.6, ...(p.sky || {}) });
    const fi = p.fadeIn ?? 0.35, fo = p.fadeOut ?? 0;
    const k = smooth(range(t, t0, t0 + fi)) * (fo > 0 ? 1 - smooth(range(t, t1 - fo, t1)) : 1);
    drawDot(e, x, y, p.r ?? 3.0, (p.I ?? 4.5) * k, p.col || mixc(C.cream, C.goldHot, 0.25), 4);
  },
};
