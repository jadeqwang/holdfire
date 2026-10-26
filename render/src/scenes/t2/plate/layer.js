// The plate layer: one image (a plate frame or a still) placed in the 1920x1080 frame (fit, zoom, pan, rot, flipX), keyed
// (matte texture or an in-shader green key) and graded. Output is straight-alpha RGBA: a = inside-the-image x matte x alpha.
// With bg (an [r,g,b]) the result is flattened onto that colour (a = 1).
import { v3 } from './lib.js';

let mat = null;
function build(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform sampler2D tImg; uniform sampler2D tMatte; uniform float keyMode; // 0 none, 1 matte texture, 2 shader green key
    uniform vec2 imgSize; uniform float fitMode;   // 0 cover, 1 contain
    uniform float zoom; uniform vec2 pan; uniform float rotA; uniform float flipX;
    uniform float exposure; uniform float sat; uniform vec3 lift; uniform vec3 gammaV; uniform vec3 gain; uniform vec3 tint;
    uniform float contrast; uniform float alpha; uniform vec4 bg; uniform vec2 keyLoHi; uniform float redK;
    void main(){
      vec2 q = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);           // design px, y down
      vec2 c = vec2(960., 540.);
      vec2 u = rot(rotA) * (q - c - pan) / zoom;                       // content px about the centre
      float k = fitMode < .5 ? max(1920. / imgSize.x, 1080. / imgSize.y) : min(1920. / imgSize.x, 1080. / imgSize.y);
      vec2 st = u / (imgSize * k) + .5;
      if (flipX > .5) st.x = 1. - st.x;
      // inside test with a 1-px soft edge (no stair-steps when rotated)
      vec2 edge = min(st, 1. - st) * imgSize * k * zoom;
      float inside = clamp(min(edge.x, edge.y) + .5, 0., 1.);
      vec2 tuv = vec2(st.x, 1. - st.y);
      vec3 col = texture(tImg, tuv).rgb;
      float a = inside * alpha;
      if (keyMode > .5 && keyMode < 1.5) a *= texture(tMatte, tuv).r;
      else if (keyMode > 1.5) {
        float dom = col.g - max(col.r, col.b);
        a *= 1. - smoothstep(keyLoHi.x, keyLoHi.y, dom);
        col.g = min(col.g, (col.r + col.b) * .5 + .02);              // despill
      }
      // grade (display space): exposure, contrast about mid grey, lift/gamma/gain, saturation, tint
      col *= exposure;
      col = (col - .5) * contrast + .5;
      col = pow(max(col * gain + lift * (1. - col), 0.), 1. / gammaV);
      float l = luma(col);
      col = mix(vec3(l), col, sat) * tint;
      // red: the Rare Earth self-destruct look - the image re-lit in alarm red (lights stay hot, shadows go to oxblood)
      if (redK > 0.) { float lr = luma(col); vec3 rd = vec3(1.25, .16, .07) * pow(lr, .8) * 1.3 + vec3(.05, 0., 0.); col = mix(col, rd, redK); }
      col = max(col, 0.);
      if (bg.a > .5) { col = mix(bg.rgb, col, a); a = 1.; }
      fragColor = vec4(col, a);
    }`, {
    tImg: { value: null }, tMatte: { value: null }, keyMode: { value: 0 }, imgSize: { value: [1920, 1080] }, fitMode: { value: 0 },
    zoom: { value: 1 }, pan: { value: [0, 0] }, rotA: { value: 0 }, flipX: { value: 0 },
    exposure: { value: 1 }, sat: { value: 1 }, lift: { value: [0, 0, 0] }, gammaV: { value: [1, 1, 1] }, gain: { value: [1, 1, 1] }, tint: { value: [1, 1, 1] },
    contrast: { value: 1 }, alpha: { value: 1 }, bg: { value: [0, 0, 0, 1] }, keyLoHi: { value: [0.06, 0.2] }, redK: { value: 0 },
  });
  return mat;
}

// o: {tex, matte (texture | null), key ('green' | null), w, h (image px), fit, zoom, pan, rot, flipX, grade {exposure, contrast, sat, lift,
//     gamma, gain, tint, red (0..1: re-lit in alarm red)}, alpha, bg ([r,g,b] | null = keep alpha)}; over = alpha-blend into target instead of overwriting
export function drawLayer(e, target, o, over = false) {
  const m = build(e); const u = m.uniforms; const g = o.grade || {};
  u.tImg.value = o.tex; u.tMatte.value = o.matte || o.tex;
  u.keyMode.value = o.key ? (o.matte ? 1 : 2) : 0;
  u.imgSize.value = [o.w || 1920, o.h || 1080];
  u.fitMode.value = o.fit === 'contain' ? 1 : 0;
  u.zoom.value = o.zoom ?? 1; u.pan.value = o.pan || [0, 0]; u.rotA.value = o.rot || 0; u.flipX.value = o.flipX ? 1 : 0;
  u.exposure.value = g.exposure ?? 1; u.contrast.value = g.contrast ?? 1; u.sat.value = g.sat ?? 1;
  u.lift.value = v3(g.lift, 0); u.gammaV.value = v3(g.gamma, 1); u.gain.value = v3(g.gain, 1); u.tint.value = v3(g.tint, 1);
  u.alpha.value = o.alpha ?? 1; u.redK.value = g.red || 0;
  u.keyLoHi.value = o.keyLoHi || [0.06, 0.2];
  u.bg.value = o.bg ? [o.bg[0], o.bg[1], o.bg[2], 1] : [0, 0, 0, 0];
  if (over) e.passOver(m, target, 'normal'); else e.pass(m, target);
}
