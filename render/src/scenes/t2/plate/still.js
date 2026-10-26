// T2_STILL: a still (path or picks2 id) with an eased Ken Burns move, optional parallax layer, graded and styled.
// p: {img: picks2 id | 'work/plates/NAME' | an image path served by the renderer,
//     zoom: number | [from, to] (| more keys), pan: [x, y] | [[x0, y0], [x1, y1]] (design px), rot: number | [from, to] (radians),
//     ease 'inOut' (lib.js EASES: linear smooth smoother inOut out in expo sine), dur (the shot's length), delay (0),
//     fit, flipX, grade, style, styleAmt, styleP, printSpace ('image' default: the paper moves with the print), vhs, vhsP, bg, seed, over,
//     parallax: {img, depth (1.5: how much more it moves than the base), zoom, pan (added to the scaled base move), key ('green' when
//                its plate has a matte), grade, alpha, fit}}
import { EASES, animNum, animVec } from './lib.js';
import { clamp } from '../../../util.js';
import { prepareLayer, drawLayers } from './plate.js';

function move(p, shot, lt) {
  const dur = p.dur ?? Math.max(1e-3, (shot.t1 ?? (shot.t0 + 4)) - shot.t0);
  const ez = EASES[p.ease || 'inOut'] || EASES.inOut;
  const u = ez(clamp((lt - (p.delay || 0)) / dur));
  return { u, zoom: animNum(p.zoom, u, 1), pan: animVec(p.pan, u, [0, 0]), rot: animNum(p.rot, u, 0) };
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    const base = await prepareLayer(p.img ?? p.clip ?? p.dir, { ...p, twos: true }, lt);
    const par = p.parallax ? await prepareLayer(p.parallax.img, p.parallax, lt) : null;
    ctx.state.t2still = { base, par };
  },
  draw(ctx, shot, t, lt, p) {
    const { base, par } = ctx.state.t2still;
    const m = move(p, shot, lt);
    const layers = [{ L: base, p, xf: m }];
    if (par) {
      const q = p.parallax; const k = q.depth ?? 1.5;
      const z0 = animNum(p.zoom, 0, 1);
      const pz = animNum(q.zoom, m.u, 1);
      const pp = animVec(q.pan, m.u, [0, 0]);
      layers.push({ L: par, p: { key: q.key, grade: q.grade, alpha: q.alpha, fit: q.fit, flipX: q.flipX },
        xf: { zoom: pz * (1 + (m.zoom / z0 - 1) * k) * z0, pan: [m.pan[0] * k + pp[0], m.pan[1] * k + pp[1]], rot: m.rot * k } });
    }
    const pat = p.printSpace === 'screen' ? null : m;
    drawLayers(ctx, shot, t, layers, p, pat);
  },
};
