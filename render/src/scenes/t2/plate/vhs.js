// T2_VHS: VHS rewind look over whatever is beneath (a multi layer, p.over) - tape wobble, line jitter, rewind bands with snow and
// tracking lines, head-switching noise at the bottom, YIQ chroma bleed, scanlines and a rolling band. Deterministic in t.
// p: {amt (0..1), rewind (0..1: the fast-scan bands and skew), speed (1), bleed (1), noise (1), head (1: head-switch band), seed}
// Standalone (no p.over) it plays over black tape. Also available as p.vhs on t2_plate / t2_still, and as the 'vhs' style.
import { rt, copy, seedOf } from './lib.js';
import { vhsPass } from './styles.js';

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const src = rt(e, 'vhsIn');
    if (p.over) copy(e, e.rtScene.texture, src); else e.clear(src, 0.02, 0.02, 0.05);
    const amt = typeof p.amt === 'function' ? p.amt(t, lt) : (p.amt ?? 1);
    const rewind = typeof p.rewind === 'function' ? p.rewind(t, lt) : (p.rewind ?? 0);
    vhsPass(e, src.texture, e.rtScene, { ...p, amt, rewind, seed: seedOf(shot, p), t, over: false });
  },
};
