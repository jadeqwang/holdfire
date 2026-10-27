// T2_PLATE: a generated clip (or still) shown on screen, graded and styled, on twos by default.
// p: {clip: picks2 id | dir: 'work/plates/NAME', in?: source-clip seconds at the shot start (default the pick's `in`, else the
//     plate's first frame), s0? / lag? (lip-synced takes: clipT = t - s0 + lag, song clock), rate (1), twos (true for video: hold each
//     drawing 2 film frames), reverse (false), at?: source seconds (number | fn(lt, t)) overriding the clock,
//     zoom (1), push (0: zoom grows by this fraction per second), pan [x, y] design px, rot (radians, + = clockwise), flipX,
//     fit 'cover'|'contain', style null|'riso'|'halftone'|'newsprint'|'ink'|'oil'|'gouache'|'blueprint'|'vhs', styleAmt (1),
//     styleP {style params}, printSpace 'screen'|'image' (paper/screens fixed to the frame, or moving with the plate), seed,
//     key null|'green' (the plate's m_ mattes when plates.py --key wrote them, else an in-shader key), keyLoHi,
//     grade {exposure, contrast, sat, lift, gamma, gain, tint, red}, alpha (1), bg [r,g,b] (black; ignored when over),
//     vhs (0..1, a VHS pass after the style) + vhsP {rewind, speed, ...}, over (from multi: draw over what is there)}
// The pick entry's fields (picks2.json) are defaults: the shot's p overrides every key it sets. The clip clock clamps into [0, n-1]
// and never loops. Use PLATE_LOOK (lib.js) as the shot's look: tonemap off, light bloom.
import { resolveSource, plateMeta, plateFrame, withPick, loadTex, pad5, rt, seedOf } from './lib.js';
import { drawLayer } from './layer.js';
import { applyStyle, vhsPass } from './styles.js';

// load what one plate layer needs for this frame: {tex, matte, w, h, f, n, q (effective params: pick defaults + p)}
export async function prepareLayer(ref, p, lt, t = lt) {
  const src = await resolveSource(ref);
  const q = withPick(src, p);
  if (src.file) {
    const tex = await loadTex(src.file);
    return { tex, matte: null, w: tex.image.width, h: tex.image.height, f: 0, n: 1, q };
  }
  const meta = await plateMeta(src.dir);
  const f = plateFrame(meta, q, lt, t);
  if (globalThis.__plateLog) globalThis.__plateLog.push({ dir: src.dir, f, t, lt });   // render/tools/lipcheck.mjs: the frame shown
  const [tex, matte] = await Promise.all([
    loadTex(`${src.dir}/f_${pad5(f)}.jpg`),
    q.key && meta.key ? loadTex(`${src.dir}/m_${pad5(f)}.png`) : Promise.resolve(null),
  ]);
  return { tex, matte, w: meta.w, h: meta.h, f, n: meta.n, q };
}

// draw one or more prepared layers -> style -> vhs -> engine.rtScene. layers: [{L (prepared), p, xf {zoom, pan, rot}}]; the first one
// sets the frame, later ones (parallax) draw over it. base: the shot-level params (style, vhs, over, bg, seed).
export function drawLayers(ctx, shot, t, layers, base, pat) {
  const e = ctx.engine;
  const over = !!base.over;
  const style = base.style || null;
  const vhs = base.vhs || 0;
  const direct = !style && !vhs;
  const target = direct ? e.rtScene : rt(e, 'plateA');
  layers.forEach(({ L, p, xf }, i) => {
    const flat = i === 0 && !over;
    drawLayer(e, target, {
      tex: L.tex, matte: L.matte, key: p.key, keyLoHi: p.keyLoHi, w: L.w, h: L.h, fit: p.fit, zoom: xf.zoom, pan: xf.pan, rot: xf.rot,
      flipX: p.flipX, grade: p.grade, alpha: p.alpha, f: L.f, bg: flat ? (base.bg || [0, 0, 0]) : null,
    }, i > 0 || (direct && over));
  });
  if (direct) return;
  const seed = seedOf(shot, base);
  const so = { ...(base.styleP || {}), amt: base.styleAmt ?? 1, seed, t, pat };
  if (style && !vhs) { applyStyle(e, style, target.texture, e.rtScene, { ...so, over }); return; }
  let cur = target.texture;
  if (style) { const B = rt(e, 'plateB'); applyStyle(e, style, cur, B, { ...so, over: false }); cur = B.texture; }
  vhsPass(e, cur, e.rtScene, { ...(base.vhsP || {}), amt: vhs, seed, t, over });
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    const L = await prepareLayer(p.dir ? { dir: p.dir } : (p.clip ?? p.img), p, lt, t);
    ctx.state.t2plate = { L };
  },
  draw(ctx, shot, t, lt) {
    const { L } = ctx.state.t2plate; const q = L.q;
    const xf = { zoom: (q.zoom ?? 1) * (1 + (q.push || 0) * lt), pan: q.pan || [0, 0], rot: q.rot || 0 };
    const pat = q.printSpace === 'image' ? xf : null;
    drawLayers(ctx, shot, t, [{ L, p: q, xf }], q, pat);
  },
};
