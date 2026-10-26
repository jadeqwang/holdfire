// MULTI: composite several scenes in one shot, in order. The first layer draws normally; later layers get p.over = true
// (scenes that support it draw on top without clearing: constellation, stipple, overlays).
// p: {layers: [{scene, p (object | fn(t, lt, ctx))}]}
import { SCENES } from './index.js';

export default {
  async prepare(ctx, shot, t, lt, p) {
    ctx.state.multi = [];
    for (const [i, L] of (p.layers || []).entries()) {
      let sc = SCENES[L.scene];
      const lp = { ...(typeof L.p === 'function' ? L.p(t, lt, ctx) : (L.p || {})), over: i > 0 };
      // a missing base layer draws the labelled placeholder (so the frame never shows stale pixels); missing overlays are skipped
      if (!sc) { if (i > 0) continue; sc = SCENES.placeholder; shot.missing = L.scene; }
      if (sc.prepare) { await sc.prepare(ctx, shot, t, lt, lp); }
      // scenes keep per-frame state in ctx.state under their own key; snapshot it so layers of the same scene don't collide
      ctx.state.multi.push({ sc, lp, st: { ...ctx.state } });
    }
  },
  draw(ctx, shot, t, lt) {
    for (const { sc, lp, st } of ctx.state.multi) { Object.assign(ctx.state, st); sc.draw(ctx, shot, t, lt, lp); }
  },
  type(ty, t, lt, shot, ctx) {
    for (const { sc, lp, st } of ctx.state.multi || []) if (sc.type) { const save = ctx.p; ctx.p = lp; sc.type(ty, t, lt, shot, ctx); ctx.p = save; }
  },
};
