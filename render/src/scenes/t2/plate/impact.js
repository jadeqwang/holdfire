// T2_IMPACT: anime impact frames and speed lines over what is beneath (multi layer, p.over) or over a flat ground.
// p: {centre [960, 540] (design px), lines 'radial'|'parallel'|null, count (radial: 140 lines / parallel: rows density 1),
//     amount (1: line opacity), inner (300 px: clear zone radius), aspect (1: clear-zone squash, >1 = wider), lineW (0.45: of each
//     angular slot), lineCol ([1,1,1]), angle (parallel, degrees), speed (parallel px/s, 2600), reach (radial taper length 260 px),
//     impact (0..1: two-tone impact frame of the image beneath), neg (false: true swaps ink and paper), thresh (0.45),
//     ink [r,g,b], paper [r,g,b], flash (0..1), flashCol, zoom (1: smash-zoom scale of the beneath image about the centre),
//     zoomBlur (0..1: radial blur toward the centre), bg ([0,0,0] when not over), seed, ones (false: lines redrawn on twos)}
// Every numeric param may be a fn(t, lt). smashZoom() and impactPulse() are exported helpers for shot p / look functions.
import { rt, copy, seedOf } from './lib.js';

// zoom that slams from `from` to `peak` at tHit (attack s), then settles to `to` (decay s): use in p.zoom or look.zoom
export function smashZoom(t, tHit, { from = 1, peak = 1.6, to = 1.35, attack = 0.06, decay = 0.35 } = {}) {
  if (t < tHit) return from;
  const x = t - tHit;
  if (x < attack) { const u = x / attack; return from + (peak - from) * (1 - Math.pow(1 - u, 3)); }
  return to + (peak - to) * Math.exp(-(x - attack) / Math.max(1e-3, decay));
}
// 1 on the hit frame(s), 0 otherwise: frames = how many film frames the impact holds (2 = on twos)
export function impactPulse(t, hits, frames = 2) {
  for (const h of [].concat(hits)) { const d = t - h; if (d >= -1e-4 && d < frames / 24 - 1e-4) return 1; }
  return 0;
}

let mat = null;
function build(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform sampler2D tSrc; uniform vec2 ctr; uniform float zoomV; uniform float zblur;
    uniform float radialA; uniform float parallelA; uniform float count; uniform float inner; uniform float asp; uniform float lineW; uniform vec3 lineCol;
    uniform float reach; uniform float pAng; uniform float pSpeed; uniform float tt; uniform float fr; uniform float seedI;
    uniform float impact; uniform float neg; uniform float thresh; uniform vec3 inkC; uniform vec3 paperC; uniform float flash; uniform vec3 flashC;
    vec3 at(vec2 q){ return texture(tSrc, vec2(q.x / 1920., 1. - q.y / 1080.)).rgb; }
    void main(){
      vec2 q = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 sq = (q - ctr) / zoomV + ctr;
      vec3 col = at(sq);
      if (zblur > 0.) {
        vec3 acc = col; float ws = 1.;
        for (int i = 1; i <= 7; i++) { float k = float(i) / 7.; float w = 1. - k * .5; acc += at(ctr + (sq - ctr) * (1. - zblur * .09 * k)) * w; ws += w; }
        col = acc / ws;
      }
      if (impact > 0.) {
        float l = luma(col);
        float b = smoothstep(thresh - .03, thresh + .03, l);
        if (neg > .5) b = 1. - b;
        col = mix(col, mix(inkC, paperC, b), impact);
      }
      // radial speed lines: one per angular slot, random start radius, width and presence, redrawn per frame pair
      if (radialA > 0.) {
        vec2 d = q - ctr; d.x /= asp;
        float r = length(d);
        float u = (atan(d.y, d.x) / 6.2831853 + .5) * count;
        float id = floor(u), fu = fract(u);
        float h1 = hash12(vec2(id, fr + seedI)), h2 = hash12(vec2(id + 17.3, fr * 1.31 + seedI)), h3 = hash12(vec2(id + 41.9, fr * .77 + seedI));
        float r0 = inner * (1. + 1.2 * h2 * h2);
        float w = lineW * (.25 + .75 * h3) * smoothstep(r0, r0 + reach * (.6 + .8 * h1), r) * .5;
        float c = .5 + (h2 - .5) * .5;
        float aa = fwidth(u) * .75 + 1e-4;
        float ln = step(.2, h1) * (1. - smoothstep(w - aa, w + aa, abs(fu - c)));
        col = mix(col, lineCol, clamp(ln * radialA, 0., 1.));
      }
      // parallel speed lines: rows at an angle, tapered dashes racing across
      if (parallelA > 0.) {
        vec2 v = rot(pAng) * (q - ctr);
        float rh = 10. / max(count, .05);
        float row = floor(v.y / rh), fy = fract(v.y / rh);
        float h1 = hash12(vec2(row, seedI + fr * .5)), h2 = hash12(vec2(row + 9.1, seedI)), h3 = hash12(vec2(row + 3.7, seedI + 1.));
        float len = 180. + 900. * h2;
        float period = len + 400. + 1400. * h3;
        float xm = mod(v.x - h1 * 4000. + tt * pSpeed * (.7 + .6 * h3), period);
        float along = clamp(xm / len, 0., 1.);
        float th = (.12 + .3 * h3) * sin(3.14159 * along) * step(xm, len);
        float aa = fwidth(v.y / rh) * .8 + 1e-4;
        float ln = step(.45, h1) * (1. - smoothstep(th - aa, th + aa, abs(fy - .5)));
        col = mix(col, lineCol, clamp(ln * parallelA, 0., 1.));
      }
      col = mix(col, flashC, clamp(flash, 0., 1.));
      fragColor = vec4(col, 1.);
    }`, {
    tSrc: { value: null }, ctr: { value: [960, 540] }, zoomV: { value: 1 }, zblur: { value: 0 },
    radialA: { value: 0 }, parallelA: { value: 0 }, count: { value: 140 }, inner: { value: 300 }, asp: { value: 1 }, lineW: { value: 0.45 }, lineCol: { value: [1, 1, 1] },
    reach: { value: 260 }, pAng: { value: 0 }, pSpeed: { value: 2600 }, tt: { value: 0 }, fr: { value: 0 }, seedI: { value: 1 },
    impact: { value: 0 }, neg: { value: 0 }, thresh: { value: 0.45 }, inkC: { value: [0.03, 0.03, 0.04] }, paperC: { value: [0.97, 0.95, 0.9] },
    flash: { value: 0 }, flashC: { value: [1, 1, 1] },
  });
  return mat;
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const V = (k, d) => { const v = p[k]; return v === undefined ? d : (typeof v === 'function' ? v(t, lt) : v); };
    const src = rt(e, 'impactIn');
    if (p.over) copy(e, e.rtScene.texture, src); else { const b = p.bg || [0, 0, 0]; e.clear(src, b[0], b[1], b[2]); }
    const m = build(e); const u = m.uniforms;
    const lines = V('lines', 'radial');
    const ff = Math.floor(lt * 24 + 1e-3);
    u.tSrc.value = src.texture; u.ctr.value = V('centre', [960, 540]); u.zoomV.value = V('zoom', 1); u.zblur.value = V('zoomBlur', 0);
    const amount = V('amount', 1);
    u.radialA.value = lines === 'radial' ? amount : 0; u.parallelA.value = lines === 'parallel' ? amount : 0;
    u.count.value = V('count', lines === 'parallel' ? 1 : 140); u.inner.value = V('inner', 300); u.asp.value = V('aspect', 1);
    u.lineW.value = V('lineW', 0.45); u.lineCol.value = V('lineCol', [1, 1, 1]); u.reach.value = V('reach', 260);
    u.pAng.value = V('angle', 0) * Math.PI / 180; u.pSpeed.value = V('speed', 2600); u.tt.value = lt;
    u.fr.value = p.ones ? ff : ff - (ff % 2); u.seedI.value = seedOf(shot, p);
    u.impact.value = V('impact', 0); u.neg.value = V('neg', false) ? 1 : 0; u.thresh.value = V('thresh', 0.45);
    u.inkC.value = V('ink', [0.03, 0.03, 0.04]); u.paperC.value = V('paper', [0.97, 0.95, 0.9]);
    u.flash.value = V('flash', 0); u.flashC.value = V('flashCol', [1, 1, 1]);
    e.pass(m, e.rtScene);
  },
};
