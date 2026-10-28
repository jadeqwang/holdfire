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
    uniform int fixN; uniform vec4 fixA[4]; uniform vec4 fixB[4]; uniform vec4 fixC[4];   // plate-space fixes: A = (cx, cy, rx, ry) image px, B = (rgb, mode), C = (core, glow, rot, 0)
    uniform sampler2D tPatch;   // mode 4 (patch): the lettering, drawn in the unit disc (white on transparent)
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
      // fixes in image px (they ride the plate's zoom/pan/rot): mode 1 = a catchlight recoloured (the bright pixels inside the ellipse
      // take the colour, shading kept); mode 2 = an iris recoloured (teal/green pixels inside the ellipse turn to the colour at the
      // same luma; the bright catchlight stays)
      vec2 ipx = st * imgSize;
      for (int i = 0; i < 4; i++) {
        if (i >= fixN) break;
        vec2 d = (ipx - fixA[i].xy) / fixA[i].zw;
        float l = luma(col);
        if (fixB[i].w < 1.5) {
          // dot: the catchlight recoloured in place - only inside its own measured disc (r = the disc's edge, 1.5 image px soft),
          // so its size and shape are the plate's; a tiny white core of radius core * r stays at its centre
          float rr = length(d), rpx = rr * min(fixA[i].z, fixA[i].w);
          float r0 = min(fixA[i].z, fixA[i].w);
          float m = 1. - smoothstep(r0 - 1.5, r0 + 1.5, rpx);
          float glow = fixC[i].y;   // the plate's soft glow just outside the disc takes the dot's hue at its own luma
          if (glow > 0.) col = mix(col, fixB[i].rgb * (l / luma(fixB[i].rgb)), (1. - m) * (1. - smoothstep(r0, r0 * (1. + glow), rpx)) * .9);
          if (m <= 0.) continue;
          float w = smoothstep(.42, .72, l) * m;
          vec3 dotc = fixB[i].rgb;
          float core = fixC[i].x;
          if (core > 0.) dotc = mix(dotc, vec3(1.), 1. - smoothstep(core - .045, core + .045, rr));
          col = mix(col, dotc, w);
          continue;
        }
        if (fixB[i].w > 3.5) {
          // patch (RC3, QA_RC2 #3): the lettering inside a printed patch's inner disc (an ellipse turned by rot) is repainted:
          // the disc is refilled with its own paper (below), then tPatch's lettering is laid in, in col
          vec2 dd = (rot(fixC[i].z) * (ipx - fixA[i].xy)) / fixA[i].zw;   // rot(a) turns by -a: back into the disc frame
          float rr = length(dd);
          float me = 1. - smoothstep(.84, .93, rr);
          if (me <= 0.) continue;
          // paper: the inner disc's own rim (16 samples at r .8; samples darker than the brightest by > .3 are letters touching
          // the rim and are dropped), spread across the disc by inverse-distance weights: a smooth fill with the rim's shading
          vec3 rim[16]; float lmax = 0.;
          for (int j = 0; j < 16; j++) {
            vec2 pl = vec2(cos(float(j) * .3927), sin(float(j) * .3927)) * .8;
            vec2 sp = (fixA[i].xy + rot(-fixC[i].z) * (pl * fixA[i].zw)) / imgSize;
            rim[j] = texture(tImg, vec2(sp.x, 1. - sp.y)).rgb; lmax = max(lmax, luma(rim[j]));
          }
          vec3 paper = vec3(0.); float pw = 0.;
          for (int j = 0; j < 16; j++) {
            if (luma(rim[j]) < lmax - .3) continue;
            vec2 pl = vec2(cos(float(j) * .3927), sin(float(j) * .3927)) * .8;
            float w = 1. / (dot(dd - pl, dd - pl) + .04);
            paper += rim[j] * w; pw += w;
          }
          col = mix(col, paper / max(pw, 1e-4), me);
          float ink = texture(tPatch, vec2(dd.x, -dd.y) * .5 + .5).a * (1. - smoothstep(.97, 1.0, rr));
          col = mix(col, fixB[i].rgb, ink);
          continue;
        }
        float m = 1. - smoothstep(.82, 1.08, length(d));
        if (m <= 0.) continue;
        if (fixB[i].w > 2.5) {
          float lk = luma(fixB[i].rgb);
          col = mix(col, fixB[i].rgb, smoothstep(lk + .02, lk + .14, l) * m);
        } else {
          float teal = min(col.g - col.r, col.b - col.r * .92);
          float w = smoothstep(.015, .09, teal) * (1. - smoothstep(.66, .8, l)) * m;
          col = mix(col, fixB[i].rgb * (min(l * .8, .42) / max(.05, luma(fixB[i].rgb))), w);   // a darker, warm iris, never amber
        }
      }
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
    fixN: { value: 0 }, fixA: { value: new Float32Array(16).fill(1) }, fixB: { value: new Float32Array(16).fill(1) },
    fixC: { value: new Float32Array(16).fill(0) }, tPatch: { value: null },
  });
  return mat;
}

// o: {tex, matte (texture | null), key ('green' | null), w, h (image px), fit, zoom, pan, rot, flipX, grade {exposure, contrast, sat, lift,
//     gamma, gain, tint, red (0..1: re-lit in alarm red), fix [FIX]}, alpha, bg ([r,g,b] | null = keep alpha), f (the plate frame shown,
//     for tracked fixes)}; over = alpha-blend into target instead of overwriting
// FIX (image px, so it rides the plate's own framing): {mode 'dot' | 'iris', c [x, y], r (number | [rx, ry]), col [r,g,b] (0..1),
//     track [[f, x, y, r?]...] (keyframes by plate frame, linear between, held past the ends; overrides c / r)}
//     'dot': the catchlight's bright pixels inside r (its own measured edge) take col, flat (Jade's pale-blue dot), with a white
//     core of radius core * r (core 0..1, default none); glow g tints the plate's halo out to r * (1 + g) to the dot's hue; 'iris': teal/green iris pixels take col at their luma;
//     'erase': pixels brighter than col (a star, a glint) are painted back to col (the local sky), darker strokes kept.
//     'patch': a printed patch's lettering repainted inside its inner disc (c, r = [rx, ry], rot rad; track [f, x, y, [rx, ry], rot]):
//     the plate's letters lifted out, lines [{text, y, w, h}] (disc units, y down; default 1420 / MHz) laid in, in col (the ink).
function fixAt(F, f) {
  let c = F.c || [0, 0], r = F.r ?? 10;
  const K = F.track;
  if (K && K.length) {
    let i = 0; while (i + 1 < K.length && K[i + 1][0] <= f) i++;
    const a = K[i], b = K[Math.min(K.length - 1, i + 1)];
    const u = b[0] > a[0] ? Math.max(0, Math.min(1, (f - a[0]) / (b[0] - a[0]))) : 0;
    c = [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    if (a[3] !== undefined) { const ra = [].concat(a[3]), rb = [].concat(b[3] ?? a[3]); r = [0, 1].map((j) => (ra[j] ?? ra[0]) + ((rb[j] ?? rb[0]) - (ra[j] ?? ra[0])) * u); }
  }
  let a = F.rot || 0;
  if (K && K.length) {
    let i = 0; while (i + 1 < K.length && K[i + 1][0] <= f) i++;
    const A = K[i], B = K[Math.min(K.length - 1, i + 1)];
    if (A[4] !== undefined) { const u = B[0] > A[0] ? Math.max(0, Math.min(1, (f - A[0]) / (B[0] - A[0]))) : 0; a = A[4] + ((B[4] ?? A[4]) - A[4]) * u; }
  }
  const rr = Array.isArray(r) ? r : [r, r];
  return [[c[0], c[1], rr[0], rr[1]], [...(F.col || [1, 1, 1]), ({ dot: 1, iris: 2, erase: 3, patch: 4 })[F.mode] || 1], [F.core || 0, F.glow || 0, a, 0]];
}
// the 'patch' lettering: lines of type set in the unit disc (y down), white on transparent, one texture per text (cached)
const patchTex = new Map();
function patchTexture(e, F) {
  const lines = F.lines || [{ text: '1420', y: -0.2, w: 1.42, h: 0.5 }, { text: 'MHz', y: 0.3, w: 1.12, h: 0.47 }];
  const key = JSON.stringify([lines, F.font || '']);
  if (patchTex.has(key)) return patchTex.get(key);
  const N = 160, cv = document.createElement('canvas'); cv.width = cv.height = N;   // ~2x the patch's size on screen (no mipmaps)
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = F.font || '900 64px Archivo';
  for (const L of lines) {   // each line scaled to its box: w x h in disc units (the disc is 2 wide), centred on (0, y)
    const m = g.measureText(L.text), tw = m.width, th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const sx = (L.w * N / 2) / tw, sy = (L.h * N / 2) / th;
    g.save(); g.translate(N / 2, N / 2 + L.y * N / 2); g.scale(sx, sy);
    g.fillText(L.text, 0, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2); g.restore();
  }
  const t = e._canvasTex(cv); patchTex.set(key, t); return t;
}
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
  const fx = (g.fix || []).slice(0, 4);
  u.fixN.value = fx.length;
  fx.forEach((F, i) => { const [A, B, C] = fixAt(F, o.f ?? 0); u.fixA.value.set(A, i * 4); u.fixB.value.set(B, i * 4); u.fixC.value.set(C, i * 4); });
  const pf = fx.find((F) => F.mode === 'patch');   // one lettering per layer
  u.tPatch.value = pf ? patchTexture(e, pf) : (u.tPatch.value || patchTexture(e, {}));
  if (over) e.passOver(m, target, 'normal'); else e.pass(m, target);
}
