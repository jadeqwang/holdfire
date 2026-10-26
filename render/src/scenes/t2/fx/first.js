// t2_first: the first scene of a chain whose prepare() succeeds. For plates that may not exist yet: try the generated plate,
// fall back to a procedural stand-in, so a layer (a multi base, a burn-through's p.under) never turns the shot into a placeholder.
// p: {chain: [{scene, p (object | fn(t, lt, ctx))}, ...], over (from multi)}. The chosen layer gets p.over passed through.
// A missing scene name or a prepare() that throws moves on to the next entry; if every entry fails, the last error is thrown.
import { SCENES } from '../../index.js';

const layerP = (L, t, lt, ctx) => (typeof L.p === 'function' ? L.p(t, lt, ctx) : (L.p || {}));

export async function pickFirst(ctx, shot, t, lt, chain, over) {
  let err = null;
  for (const L of chain || []) {
    const sc = SCENES[L.scene];
    if (!sc) { err = new Error(`t2_first: unknown scene ${L.scene}`); continue; }
    const lp = { ...layerP(L, t, lt, ctx), over: !!over };
    try {
      if (sc.prepare) await sc.prepare(ctx, shot, t, lt, lp);
      return { sc, lp, name: L.scene, st: { ...ctx.state } };
    } catch (e) { err = e; }
  }
  throw err || new Error('t2_first: empty chain');
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    // keyed by the p object, so two t2_first layers in one multi don't collide (multi also snapshots state per layer)
    ctx.state.t2first = await pickFirst(ctx, shot, t, lt, p.chain, p.over);
    ctx.state.t2first.key = p;
  },
  draw(ctx, shot, t, lt) {   // returns the inner draw's result (a promise for async scenes), so callers that await still wait
    const f = ctx.state.t2first; if (!f) return undefined;
    Object.assign(ctx.state, f.st);
    return f.sc.draw(ctx, shot, t, lt, f.lp);
  },
  type(ty, t, lt, shot, ctx) {
    const f = ctx.state.t2first;
    if (f && f.sc.type) { const save = ctx.p; ctx.p = f.lp; f.sc.type(ty, t, lt, shot, ctx); ctx.p = save; }
  },
};
