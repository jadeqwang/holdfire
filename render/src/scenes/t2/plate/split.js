// T2_SPLIT: two scenes side by side with a hard vertical line. Each side renders into its own target, then the halves composite.
// p: {left: {scene, p (object | fn(t, lt, ctx))}, right: {...}, x (960: the split, design px), line (2 px), lineCol ([0.96, 0.96, 0.94]),
//     slice 'centre' (each half shows the middle of its scene, so centred subjects stay centred) | 'half' (each half shows its own
//     half of the frame), offL / offR ([x, y] design px: extra shift of what each half shows), dim ([1, 1]: per-side brightness)}
// Works with t2_plate / t2_still / any procedural scene (sub-scenes draw into engine.rtScene as usual).
import { SCENES } from '../../index.js';
import { rt, copy } from './lib.js';

let mat = null;
let depth = 0;
function build(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform sampler2D tL; uniform sampler2D tR; uniform float X; uniform float lineW; uniform vec3 lineCol;
    uniform vec2 offL; uniform vec2 offR; uniform vec2 dim;
    void main(){
      vec2 q = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec3 col;
      if (q.x < X) { vec2 s = q + offL; col = texture(tL, vec2(s.x / 1920., 1. - s.y / 1080.)).rgb * dim.x; }
      else { vec2 s = q + offR; col = texture(tR, vec2(s.x / 1920., 1. - s.y / 1080.)).rgb * dim.y; }
      float d = abs(q.x - X);
      col = mix(col, lineCol, 1. - smoothstep(lineW * .5 - .5, lineW * .5 + .5, d));
      fragColor = vec4(col, 1.);
    }`, { tL: { value: null }, tR: { value: null }, X: { value: 960 }, lineW: { value: 2 }, lineCol: { value: [1, 1, 1] },
    offL: { value: [0, 0] }, offR: { value: [0, 0] }, dim: { value: [1, 1] } });
  return mat;
}

const sideP = (S, t, lt, ctx) => (typeof S.p === 'function' ? S.p(t, lt, ctx) : (S.p || {}));

export default {
  async prepare(ctx, shot, t, lt, p) {
    const sides = [];
    for (const k of ['left', 'right']) {
      const S = p[k]; if (!S) { sides.push(null); continue; }
      const sc = SCENES[S.scene];
      if (!sc) throw new Error(`t2_split: unknown scene ${S.scene}`);
      const sp = { ...sideP(S, t, lt, ctx), over: false };
      if (sc.prepare) await sc.prepare(ctx, shot, t, lt, sp);
      sides.push({ sc, sp, st: { ...ctx.state } });
    }
    ctx.state.t2split = sides;
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const sides = ctx.state.t2split;
    const lvl = depth++;
    try {
      const tg = [rt(e, `splitL${lvl}`), rt(e, `splitR${lvl}`)];
      sides.forEach((s, i) => {
        e.clear(e.rtScene, 0, 0, 0);
        if (s) { Object.assign(ctx.state, s.st); s.sc.draw(ctx, shot, t, lt, s.sp); }
        copy(e, e.rtScene.texture, tg[i]);
      });
      const X = p.x ?? 960;
      const centre = (p.slice || 'centre') === 'centre';
      const oL = p.offL || [0, 0], oR = p.offR || [0, 0];
      const m = build(e); const u = m.uniforms;
      u.tL.value = tg[0].texture; u.tR.value = tg[1].texture; u.X.value = X; u.lineW.value = p.line ?? 2;
      u.lineCol.value = p.lineCol || [0.96, 0.96, 0.94];
      u.offL.value = [(centre ? 960 - X / 2 : 0) + oL[0], oL[1]];
      u.offR.value = [(centre ? 960 - (X + (1920 - X) / 2) : 0) + oR[0], oR[1]];
      u.dim.value = p.dim || [1, 1];
      e.pass(m, e.rtScene);
    } finally { depth--; }
  },
  type(ty, t, lt, shot, ctx) {
    for (const s of ctx.state.t2split || []) if (s && s.sc.type) { const save = ctx.p; ctx.p = s.sp; s.sc.type(ty, t, lt, shot, ctx); ctx.p = save; }
  },
};
