// T2_VHS: VHS rewind look over whatever is beneath (a multi layer, p.over) - tape wobble, line jitter, rewind bands with snow and
// tracking lines, head-switching noise at the bottom, YIQ chroma bleed, scanlines and a rolling band. Deterministic in t.
// p: {amt (0..1), rewind (0..1: the fast-scan bands and skew), speed (1), bleed (1), noise (1), head (1: head-switch band), seed}
// Standalone (no p.over) it plays over black tape. Also available as p.vhs on t2_plate / t2_still, and as the 'vhs' style.
import { rt, copy, seedOf, resolveSource, plateMeta } from './lib.js';
import { prepareLayer, drawLayers } from './plate.js';
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

// T2_VHS_REWIND: scrub backward through a list of clips under the VHS rewind pass, one clip per step, down to black.
// p: {clips: [picks2 ids] (in the order shown), steps: [song times] (clip i shows from steps[i]), blackAt (song time: black from here),
//     speed (6: source seconds scrubbed back per second), amt (1), rewind (1), fade (0.12 s: the fade into black before blackAt),
//     style / styleAmt / grade (applied to every clip)}
// Each clip runs backward from its last frame. A clip without a plate yet shows black tape under the same pass, so the edit renders.
export const t2_vhs_rewind = {
  async prepare(ctx, shot, t, lt, p) {
    const clips = p.clips || [], steps = p.steps || [];
    let i = 0; for (let k = 0; k < steps.length; k++) if (t >= steps[k] - 1e-4) i = k;
    const ref = clips[Math.min(i, clips.length - 1)];
    const t0 = steps[i] ?? shot.t0;
    let L = null;
    if (ref !== undefined && !(p.blackAt !== undefined && t >= p.blackAt)) {
      try {
        const src = await resolveSource(ref);
        let end = 0;
        if (src.dir) { const m = await plateMeta(src.dir); end = (m.start || 0) + (m.n - 1) / (m.fps || 24); }
        const sp = p.speed ?? 6;
        L = await prepareLayer(ref, { style: p.style, styleAmt: p.styleAmt, grade: p.grade, at: () => end - (t - t0) * sp, twos: false }, lt, t);
      } catch (e) { L = null; }
    }
    ctx.state.t2rewind = { L };
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const { L } = ctx.state.t2rewind;
    const fade = p.fade ?? 0.12;
    const k = p.blackAt === undefined ? 1 : Math.max(0, Math.min(1, (p.blackAt - t) / fade));
    const src = rt(e, 'vhsIn');
    if (L && k > 0) {
      const q = { ...L.q, grade: { ...(L.q.grade || {}), exposure: ((L.q.grade || {}).exposure ?? 1) * k }, vhs: 0 };
      drawLayers(ctx, shot, t, [{ L, p: q, xf: { zoom: q.zoom ?? 1, pan: q.pan || [0, 0], rot: q.rot || 0 } }], q, null);
      copy(e, e.rtScene.texture, src);
    } else e.clear(src, 0, 0, 0);
    vhsPass(e, src.texture, e.rtScene, { ...p, amt: (p.amt ?? 1) * Math.max(k, 0.0), rewind: (p.rewind ?? 1) * k, seed: seedOf(shot, p), t, over: false });
  },
};
