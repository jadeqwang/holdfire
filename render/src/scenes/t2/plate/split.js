// T2_SPLIT: two scenes side by side with a hard vertical line. Each side renders into its own target, then the halves composite.
// p: {left: {scene, p (object | fn(t, lt, ctx))}, right: {...}, x (960: the split, design px), line (2 px), lineCol ([0.96, 0.96, 0.94]),
//     slice 'centre' (each half shows the middle of its scene, so centred subjects stay centred) | 'half' (each half shows its own
//     half of the frame), offL / offR ([x, y] design px: extra shift of what each half shows), dim ([1, 1]: per-side brightness),
//     bar ({w (32 design px), col ([0, 0, 0]), tex (1: faint scanlines and a slow interference band, so it reads as distance, not a
//          layout gutter)}: a wall between the halves instead of the hairline; drawn on twos with the rest of the frame),
//     tone ({L, R}: a per-side grade applied after each half is drawn, so it works on plates and procedural scenes alike:
//          {exposure (1), contrast (1, about mid grey), sat (1), tint ([1, 1, 1]), lift ([0, 0, 0], added in the shadows)})}
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
    uniform float barW; uniform vec3 barCol; uniform float barTex; uniform float seed;
    uniform vec4 toneL; uniform vec3 tintL; uniform vec3 liftL; uniform vec4 toneR; uniform vec3 tintR; uniform vec3 liftR;
    // tone = (exposure, contrast, sat, -)
    vec3 tone(vec3 c, vec4 k, vec3 tint, vec3 lift){
      c *= k.x; c = (c - .5) * k.y + .5; c = max(c, 0.);
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(vec3(l), c, k.z) * tint;
      return max(c + lift * (1. - clamp(l, 0., 1.)), 0.);
    }
    float h11(float x){ return fract(sin(x * 127.1 + seed * 311.7) * 43758.5453); }
    void main(){
      vec2 q = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec3 col;
      if (q.x < X) { vec2 s = q + offL; col = tone(texture(tL, vec2(s.x / 1920., 1. - s.y / 1080.)).rgb * dim.x, toneL, tintL, liftL); }
      else { vec2 s = q + offR; col = tone(texture(tR, vec2(s.x / 1920., 1. - s.y / 1080.)).rgb * dim.y, toneR, tintR, liftR); }
      float d = abs(q.x - X);
      if (barW > 0.) {
        // the wall: a solid bar with a soft 1.5 px edge; inside, faint scanlines (3 px) and one slow interference band per frame pair
        float m = 1. - smoothstep(barW * .5 - .75, barW * .5 + .75, d);
        vec3 b = barCol;
        if (barTex > 0.) {
          float row = floor(q.y / 3.);
          float scan = (mod(row, 2.) < 1. ? .022 : .006) * (.6 + .8 * h11(row));
          float band = exp(-pow((q.y - 1080. * h11(7.)) / 60., 2.)) * .05 + exp(-pow((q.y - 1080. * h11(13.)) / 9., 2.)) * .06 * h11(row + 3.);
          float edge = (1. - smoothstep(0., 2.5, barW * .5 - d)) * .045;   // the faintest rim, so the wall has a face on a dark frame
          b += vec3(.55, .62, .7) * (scan + band) * barTex + edge * barTex;
        }
        col = mix(col, b, m);
      } else {
        col = mix(col, lineCol, 1. - smoothstep(lineW * .5 - .5, lineW * .5 + .5, d));
      }
      fragColor = vec4(col, 1.);
    }`, { tL: { value: null }, tR: { value: null }, X: { value: 960 }, lineW: { value: 2 }, lineCol: { value: [1, 1, 1] },
    offL: { value: [0, 0] }, offR: { value: [0, 0] }, dim: { value: [1, 1] },
    barW: { value: 0 }, barCol: { value: [0, 0, 0] }, barTex: { value: 1 }, seed: { value: 0 },
    toneL: { value: [1, 1, 1, 0] }, tintL: { value: [1, 1, 1] }, liftL: { value: [0, 0, 0] },
    toneR: { value: [1, 1, 1, 0] }, tintR: { value: [1, 1, 1] }, liftR: { value: [0, 0, 0] } });
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
      const bar = p.bar || null;
      u.barW.value = bar ? (bar.w ?? 32) : 0; u.barCol.value = (bar && bar.col) || [0, 0, 0]; u.barTex.value = bar ? (bar.tex ?? 1) : 0;
      u.seed.value = Math.floor(t * 12 + 1e-3) % 997;   // on twos
      for (const [k, side] of [['L', 'L'], ['R', 'R']]) {
        const g = (p.tone && p.tone[side]) || {};
        u[`tone${k}`].value = [g.exposure ?? 1, g.contrast ?? 1, g.sat ?? 1, 0];
        u[`tint${k}`].value = g.tint || [1, 1, 1]; u[`lift${k}`].value = g.lift || [0, 0, 0];
      }
      e.pass(m, e.rtScene);
    } finally { depth--; }
  },
  type(ty, t, lt, shot, ctx) {
    for (const s of ctx.state.t2split || []) if (s && s.sc.type) { const save = ctx.p; ctx.p = s.sp; s.sc.type(ty, t, lt, shot, ctx); ctx.p = save; }
  },
};
