// Take-two style treatments: reusable GLSL that turns any texture (a graded plate, a still, or a procedural scene's render) into a
// printed or painted surface. Every style is deterministic (seeded paper, screens anchored to the frame or to the image) and costs at
// most ~3 texture-heavy passes at 1080p (RENDERER.md budget). Paper, canvas tooth and ink grain are baked once per seed into a
// texture (cache misses re-bake the same pixels, so cache timing never changes output).
//
//   import { applyStyle, stylize, STYLES } from '../plate/styles.js';
//   applyStyle(engine, 'riso', srcTexture, targetRT, {amt: 1, seed: 7, t, over: false, pat: {zoom, rot, pan}, ...params});
//   stylize(engine, 'ink', engine.rtScene, {amt: 0.6});         // in place: copies the target first, then styles it back
//
// styles (params in o, all optional):
//   riso      Rare Earth "signal print": 3 ink separations (subtractive density solve), AM screens at 3 angles, per-ink
//             misregistration, ink mottle, paper. {inks: 'earth'|'echo'|'mirror'|[[r,g,b] x3], paper, cell 7, mis 1 (x the seeded
//             2-3 px offsets), levels [black, white, gamma], density 0.92, angles [deg x3]}
//   halftone  grey newsprint: one black screen at 45 deg, unsharp mask, newsprint stock. {cell 7, levels, sharp 0.8, ink, paper, angle}
//   newsprint red-black-cream: black + poster-red screens (red from the image's reds). {cell 8, levels, red [r,g,b], redGain 1, redAll 0,
//             paper, ink, mis 1}
//   ink       Chinese ink wash on rice paper: fibrous bleed, pooled wash edges, soft wash layers, dry brush; cinnabar kept.
//             {bleed 5 (px), layers 4, levels, ink, paper, cinnabar, keepRed 1}
//   oil       Russian realist oil: brush smear along image structure (structure tensor + LIC), bristle impasto, canvas weave,
//             umber shadows, varnish. {stroke 9 (px half length), umber [r,g,b], warm 1, canvas 1, impasto 1}
//   gouache   painted-over documentary: Kuwahara-flattened colour, soft value bands, opaque paint edges, paper tooth/dry brush.
//             {radius 1 (x ~12 px window), bands 7, edge 1, tooth 1, paper, sat 1.08}
//   blueprint cyanotype (or sepia) print of a painted plate, with a faint grid. {tone 'cyan'|'sepia', dark, light, levels, grid 0.05,
//             gridStep 48}
//   vhs       the t2_vhs look as a style. {rewind 0, speed 1, ...} (see vhsPass)
// amt (0..1) is meaningful: 1 = full treatment; 0.3-0.5 = a light touch for plates that are already painted (the source colour stays,
// the surface - paper, screen, misregistration, smear - comes through).
// pat: where the paper and screens live. Identity = fixed to the frame (each frame printed); pass the camera's {zoom, rot, pan} to
// make paper and dots move with the image (a filmed print).
import * as THREE from 'three';
import { rt, copy } from './lib.js';

export const STYLES = ['riso', 'halftone', 'newsprint', 'ink', 'oil', 'gouache', 'blueprint', 'vhs'];

const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
export const INKS = {
  klein: hex(0x002fa7), kleinRE: hex(0x1f2bd1), orange: hex(0xff5a1f), pale: hex(0x9ccbff), pink: hex(0xff48b0), mint: hex(0x3fe0c5),
  yellow: hex(0xffe14d), black: hex(0x0b0b14), paper: hex(0xf3efe6), violet: hex(0x2a105a), teal: hex(0x1f8a8a), silver: hex(0xb8c4cc),
  newsInk: hex(0x161514), newsPaper: hex(0xe4dfd1), posterRed: hex(0xc8202a), cream: hex(0xefe4c9),
  rice: hex(0xefe8d6), sumi: hex(0x15130f), cinnabar: hex(0xd23a22),
  prussian: hex(0x123a78), cyanPaper: hex(0xe4ecee), sepiaDark: hex(0x3a2416), sepiaLight: hex(0xecdcbc),
};
export const RISO_SETS = {
  earth: [INKS.klein, INKS.orange, INKS.pale],
  echo: [INKS.violet, INKS.pink, INKS.mint],
  mirror: [INKS.teal, INKS.silver, INKS.pale],
};

// ------------------------------------------------------------------------------------------------------------------ GLSL
export const STYLE_HEAD = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tPaper;
uniform float amt; uniform float seed; uniform float frame; uniform float tt; uniform vec4 pat; uniform vec3 paperC;
vec2 dpx(){ return vec2(vUv.x * 1920., (1. - vUv.y) * 1080.); }
vec2 patPx(vec2 q){ vec2 c = vec2(960., 540.); return rot(pat.y) * (q - c - pat.zw) / pat.x + c; }
vec4 srcAt(vec2 q){ return texture(tSrc, vec2(q.x / 1920., 1. - q.y / 1080.)); }
// baked paper: r = brightness multiplier (~1), g = tooth 0..1, b = fibre 0..1, a = mid-scale mottle 0..1 (ink grain)
vec4 paperAt(vec2 pp){ return texture(tPaper, vec2(pp.x / 1920., 1. - pp.y / 1080.)); }
// AM halftone: coverage a in 0..1 at pattern px p; round dots that merge through a checkerboard at 50%
float screenDot(vec2 p, float a, float cell, float ang, float rough){
  vec2 g = rot(ang) * p / cell;
  float s = .5 - .25 * (cos(6.2831853 * g.x) + cos(6.2831853 * g.y)) + rough;
  float w = fwidth(s) * .7 + 1e-4;
  return a < .004 ? 0. : smoothstep(1. - a - w, 1. - a + w, s);
}
vec3 levelsOf(vec3 c, vec3 lv){ return pow(clamp((c - lv.x) / (lv.y - lv.x), 0., 1.), vec3(lv.z)); }
float levelsOf(float c, vec3 lv){ return pow(clamp((c - lv.x) / (lv.y - lv.x), 0., 1.), lv.z); }
`;

// paper bake (once per seed): formation clouds, tooth, two fibre directions, mid-scale mottle
const PAPER_BAKE = /* glsl */`
uniform float seed; uniform float fibreK;
void main(){
  vec2 p = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
  vec2 so = hash22(vec2(seed, 17.31)) * 731.;
  float mott = fbm3(p * .005 + so) - .5;
  float tooth = vnoise(p * .62 + so) * .62 + vnoise(p * 1.7 + so * 1.31) * .38;
  vec2 r1 = rot(.7) * p, r2 = rot(-.95) * p;
  float f1 = smoothstep(.80, .97, vnoise(vec2(r1.x * .07, r1.y * .6) + so)) * smoothstep(.35, .7, vnoise(p * .02 + so.yx));
  float f2 = smoothstep(.83, .98, vnoise(vec2(r2.x * .06, r2.y * .5) + so.yx)) * smoothstep(.35, .7, vnoise(p * .017 + so));
  float fib = max(f1, f2 * .8);
  float grain = fbm3(p * .09 + so.yx * 1.7);
  float m = 1. + mott * .07 + (tooth - .5) * .07 - fib * fibreK;
  fragColor = vec4(m, tooth, fib, grain);
}`;

export const GLSL = {};

GLSL.riso = /* glsl */`
precision highp sampler3D;
uniform sampler3D tLut; uniform float lutN;
uniform vec3 ink0; uniform vec3 ink1; uniform vec3 ink2;
uniform vec2 off0; uniform vec2 off1; uniform vec2 off2; uniform float mis;
uniform float cell; uniform vec3 levels; uniform float density; uniform vec3 angles; uniform float push;
// separation: a 3D LUT (built in JS by searching the real overprint model) maps a colour to 3 ink coverages
vec3 sep(vec2 q){
  vec3 c = levelsOf(srcAt(q).rgb, levels);
  float l = luma(c); c = clamp(mix(vec3(l), c, push), 0., 1.);
  return texture(tLut, c * (lutN - 1.) / lutN + .5 / lutN).rgb;
}
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q);
  vec4 pa = paperAt(pp);
  vec2 o0 = off0 * mis, o1 = off1 * mis, o2 = off2 * mis;
  float a0 = sep(q + o0).x, a1 = sep(q + o1).y, a2 = sep(q + o2).z;
  // ink mottle: each drum lays ink unevenly (different paper areas -> independent grain per ink)
  float g0 = paperAt(pp * .5 + vec2(311., 97.)).a, g1 = paperAt(pp * .5 + vec2(737., 513.)).a, g2 = paperAt(pp * .5 + vec2(1201., 271.)).a;
  float rough = (pa.g - .5) * .3;
  float i0 = screenDot(pp + o0, a0, cell, angles.x, rough) * density * (.78 + .36 * g0);
  float i1 = screenDot(pp + o1, a1, cell, angles.y, rough) * density * (.78 + .36 * g1);
  float i2 = screenDot(pp + o2, a2, cell, angles.z, rough) * density * (.78 + .36 * g2);
  vec3 paper = paperC * pa.r;
  vec3 col = paper;
  col *= mix(vec3(1.), ink0 / paperC, clamp(i0, 0., 1.));
  col *= mix(vec3(1.), ink1 / paperC, clamp(i1, 0., 1.));
  col *= mix(vec3(1.), ink2 / paperC, clamp(i2, 0., 1.));
  if (amt > .999) { fragColor = vec4(col, s.a); return; }
  // light touch: the plate's own colour, its channels a little out of register, on the same stock, with a whisper of the screen
  vec3 light = vec3(srcAt(q + o1 * .6).r, s.g, srcAt(q + o0 * .6).b) * mix(1., pa.r, .8);
  float scr = screenDot(pp, 1. - luma(s.rgb), cell, angles.x, rough);
  light *= 1. - scr * .12;
  fragColor = vec4(mix(light, col, amt), s.a);
}`;

GLSL.halftone = /* glsl */`
uniform float cell; uniform vec3 levels; uniform vec3 inkC; uniform float sharp; uniform float angle;
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q); vec4 pa = paperAt(pp);
  float l = luma(s.rgb);
  float r = 5.;
  float m = (luma(srcAt(q + vec2(r, 0.)).rgb) + luma(srcAt(q - vec2(r, 0.)).rgb) + luma(srcAt(q + vec2(0., r)).rgb) + luma(srcAt(q - vec2(0., r)).rgb)) * .25;
  l = clamp(l + (l - m) * sharp, 0., 1.);
  l = levelsOf(l, levels);
  float k = screenDot(pp, 1. - l, cell, angle, (pa.g - .5) * .3) * (.8 + .3 * pa.a);
  vec3 paper = paperC * pa.r;
  vec3 col = mix(paper, inkC, clamp(k, 0., 1.) * .96);
  vec3 light = mix(s.rgb, vec3(luma(s.rgb)), .35) * pa.r * mix(1., .78, k);
  fragColor = vec4(mix(light, col, amt), s.a);
}`;

GLSL.newsprint = /* glsl */`
uniform float cell; uniform vec3 levels; uniform vec3 inkC; uniform vec3 redC; uniform float redGain; uniform float redAll;
uniform vec2 offR; uniform float mis;
float redOf(vec3 c){ return clamp(smoothstep(.06, .30, c.r - max(c.g, c.b)) * smoothstep(.12, .35, c.r) * redGain + redAll, 0., 1.); }
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q); vec4 pa = paperAt(pp);
  float l = levelsOf(luma(s.rgb), levels);
  vec3 cr = srcAt(q + offR * mis).rgb;
  float red = redOf(cr);
  float lr = levelsOf(luma(cr), levels);
  // red ink carries the reds (and, with redAll, the whole image's mid-tones); black keeps the drawing
  float aR = red * clamp(1.15 - lr * .55, 0., 1.);
  float aK = (1. - l) * (1. - redOf(s.rgb) * .72);
  float rough = (pa.g - .5) * .3;
  float iK = screenDot(pp, aK, cell, .785398, rough) * (.82 + .26 * pa.a);
  float iR = screenDot(pp + offR * mis, aR, cell, .261799, rough) * (.8 + .28 * paperAt(pp * .5 + 400.).a);
  vec3 paper = paperC * pa.r;
  vec3 col = paper * mix(vec3(1.), redC / paperC, clamp(iR, 0., 1.) * .95);
  col *= mix(vec3(1.), inkC / paperC, clamp(iK, 0., 1.) * .96);
  vec3 light = s.rgb * pa.r * mix(1., .8, iK);
  fragColor = vec4(mix(light, col, amt), s.a);
}`;

GLSL.ink = /* glsl */`
uniform float bleed; uniform float layers; uniform vec3 levels; uniform vec3 inkC; uniform vec3 cinnabar; uniform float keepRed; uniform float lineK;
float densAt(vec2 q){ return 1. - levelsOf(luma(srcAt(q).rgb), levels); }
float redOf(vec3 c){ return smoothstep(.16, .36, c.r - max(c.g, c.b)) * smoothstep(.3, .55, c.r) * smoothstep(-.04, .06, c.g - c.b); }
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q); vec4 pa = paperAt(pp);
  vec2 so = hash22(vec2(seed, 5.7)) * 300.;
  float d0 = densAt(q);
  // wet bleed: ink creeps into the paper along fibres; the creep radius varies (wet and dry passages)
  float wet = vnoise(pp * .011 + so);
  float rad = bleed * (.45 + 1.1 * wet) * (.7 + .6 * pa.b);
  float acc = 0., mx = d0, mn = d0;
  for (int i = 0; i < 6; i++) {
    float an = float(i) * 1.0472 + wet * 2.4 + pa.g * 1.3;
    float d = densAt(q + vec2(cos(an), sin(an)) * rad * (.65 + .5 * hash12(vec2(float(i), seed))));
    acc += d; mx = max(mx, d); mn = min(mn, d);
  }
  float avg = acc / 6.;
  // fine-line drawing: where the image has an edge the brush draws a thin, slightly broken contour
  float contour = smoothstep(.16, .42, mx - mn) * (.75 + .5 * pa.g) * lineK;
  float d = max(d0, mix(avg, mx, .45) * (.82 + .3 * pa.g));
  // the wash pools at its edge as it dries: a darker rim where a wash meets lighter paper
  float rim = clamp((mx - d0) * 1.6, 0., 1.) * smoothstep(.12, .45, mx) * (.6 + .6 * wet);
  // soft wash layers (each a separate pass of the brush)
  float lv = d * layers + (pa.a - .5) * .5; float dq = (floor(lv) + smoothstep(.3, .7, fract(lv))) / layers;
  d = mix(d, dq, .65);
  d = clamp(d + rim * .38, 0., 1.);
  // dry brush in the darks: streaks of paper through the heaviest strokes
  vec2 rb = rot(.35 + (wet - .5) * 1.5) * pp;
  float dry = vnoise(vec2(rb.x * .035, rb.y * .5) + so) * smoothstep(.4, .8, vnoise(pp * .015 + so.yx));
  d *= 1. - smoothstep(.7, .95, d) * smoothstep(.6, .9, dry) * .22;
  d = max(d, contour * .9);
  d *= .9 + .12 * pa.g;
  vec3 paper = paperC * pa.r;
  // dilute ink is a cool grey; full ink a warm black
  vec3 inkTone = mix(vec3(.47, .48, .49), inkC, smoothstep(.25, .9, d));
  vec3 col = mix(paper, inkTone, smoothstep(.0, .75, d) * .97);
  // cinnabar: the image's reds survive as vermilion pigment (seals, robes, flame)
  float red = redOf(s.rgb) * keepRed;
  col = mix(col, cinnabar * (.86 + .18 * pa.g) * mix(1., .75, d0 * .5), clamp(red * 1.1, 0., 1.) * .95);
  vec3 light = mix(s.rgb, vec3(luma(s.rgb)), .45 * (1. - redOf(s.rgb))) * pa.r * mix(1., .85, rim);
  fragColor = vec4(mix(light, col, amt), s.a);
}`;

GLSL.blueprint = /* glsl */`
uniform vec3 darkC; uniform vec3 lightC; uniform vec3 levels; uniform float gridA; uniform float gridStep;
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q); vec4 pa = paperAt(pp);
  float l = levelsOf(luma(s.rgb), levels);
  // cyanotype: uneven sensitiser (brush-coated), blotchy deep blues
  float coat = paperAt(pp * .25 + 123.).a;
  vec3 col = mix(darkC * (.82 + .3 * coat), lightC * pa.r, l);
  vec2 g = abs(fract(pp / gridStep + .5) - .5) * gridStep;
  float gl = 1. - smoothstep(.6, 1.6, min(g.x, g.y));
  col = mix(col, lightC, gl * gridA);
  vec3 light = mix(s.rgb, col, .35);
  fragColor = vec4(mix(light, col, amt), s.a);
}`;

// oil: pass 1 (quarter res) structure tensor; pass 2 (quarter res) tensor blur; pass 3 (full) LIC smear + impasto + canvas + colour
GLSL.oilTensor = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel;
float L(vec2 o){ return luma(texture(tSrc, vUv + o * texel).rgb); }
void main(){
  float a = L(vec2(-1., 1.)), b = L(vec2(0., 1.)), c = L(vec2(1., 1.));
  float d = L(vec2(-1., 0.)), f = L(vec2(1., 0.));
  float g = L(vec2(-1., -1.)), h = L(vec2(0., -1.)), i = L(vec2(1., -1.));
  float gx = (c + 2. * f + i) - (a + 2. * d + g);
  float gy = (a + 2. * b + c) - (g + 2. * h + i);
  fragColor = vec4(gx * gx, gy * gy, gx * gy, 1.);
}`;
GLSL.blur9 = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel;
void main(){
  vec4 s = texture(tSrc, vUv) * 4.;
  s += (texture(tSrc, vUv + vec2(texel.x, 0.)) + texture(tSrc, vUv - vec2(texel.x, 0.)) + texture(tSrc, vUv + vec2(0., texel.y)) + texture(tSrc, vUv - vec2(0., texel.y))) * 2.;
  s += texture(tSrc, vUv + texel) + texture(tSrc, vUv - texel) + texture(tSrc, vUv + vec2(texel.x, -texel.y)) + texture(tSrc, vUv + vec2(-texel.x, texel.y));
  fragColor = s / 16.;
}`;
GLSL.oil = /* glsl */`
uniform sampler2D tT; uniform float stroke; uniform vec3 umber; uniform float warm; uniform float canvasK; uniform float impasto;
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q); vec4 pa = paperAt(pp);
  vec2 so = hash22(vec2(seed, 9.1)) * 400.;
  vec3 T = texture(tT, vUv).xyz;                                  // uv space (y up)
  float E = T.x, G = T.y, F = T.z;
  float disc = sqrt(max((E - G) * (E - G) + 4. * F * F, 0.));
  float l1 = .5 * (E + G + disc), l2 = .5 * (E + G - disc);
  vec2 tang = vec2(l1 - E, -F);                                   // perpendicular to the gradient: along the edges
  tang = dot(tang, tang) < 1e-12 ? vec2(1., 0.) : normalize(tang);
  float aniso = (l1 - l2) / (l1 + l2 + 1e-6);
  float an = vnoise(pp * .0045 + so) * 6.2832 * 1.5;             // painter's hand where the image has no structure
  vec2 free = vec2(cos(an), sin(an));
  if (dot(free, tang) < 0.) free = -free;
  float follow = smoothstep(.05, .35, aniso) * smoothstep(2e-4, 3e-3, l1);
  vec2 dir = normalize(mix(free, tang, follow));
  // dab length varies smoothly across the canvas (a hand, not a filter)
  float len = stroke * (.55 + .9 * vnoise(pp * .02 + so)) * amt;
  // LIC: colour smeared along the stroke; paper noise smeared the same way becomes the dab (broad) and bristle (fine) texture
  vec3 acc = vec3(0.); float ws = 0., br = 0., dab = 0.;
  for (int i = -3; i <= 3; i++) {
    float u = float(i) / 3.; float w = 1. - abs(u) * .55;
    vec2 o = dir * u * len; vec2 od = vec2(o.x, -o.y);
    acc += texture(tSrc, vUv + o / vec2(1920., 1080.)).rgb * w; ws += w;
    vec4 pv = paperAt(pp + od * 1.2);
    br += pv.g * w; dab += pv.a * w;
  }
  vec3 col = acc / ws;
  br /= ws; dab /= ws;
  // broken colour: each dab carries a slightly different mix of the paint
  float dv = smoothstep(.25, .75, dab) - .5;
  col *= 1. + dv * .10;
  col = mix(col, col * vec3(1.03, .99, .95), dv + .5);
  // impasto: ridges lit from the upper left (screen-space derivative of the smooth streak field)
  float ridge = br * .4 + dab * .6;
  vec2 dh = vec2(dFdx(ridge), dFdy(ridge));
  float lit = 1. + clamp(-dh.x + dh.y, -.08, .08) * 2.5 * impasto;
  col *= mix(.975, 1.025, br) * lit;
  // canvas weave (plain weave, ~3.5 px threads) showing through as surface relief
  vec2 gw = pp / 3.4; vec2 fw = fract(gw) - .5; vec2 iw = floor(gw);
  float top = mod(iw.x + iw.y, 2.);
  float th = top > .5 ? 1. - 4. * fw.y * fw.y : 1. - 4. * fw.x * fw.x;
  th *= .75 + .5 * hash12(iw + so);
  col *= 1. + (th - .55) * .09 * canvasK;
  // umber shadows, varnish warmth, a gentle S-curve
  float l = luma(col);
  vec3 um = umber / max(luma(umber), 1e-3) * l;
  col = mix(col, um, (1. - smoothstep(.04, .42, l)) * .72);
  col = mix(col, col * vec3(1.06, 1.0, .82), warm);
  col = mix(vec3(luma(col)), col, .9);
  col = col * col * (3. - 2. * col) * .35 + col * .65;
  fragColor = vec4(mix(s.rgb, col, clamp(amt * 1.25, 0., 1.)), s.a);
}`;

// gouache: pass 1 (half res) 4-sector Kuwahara; pass 2 (full) value bands, opaque edges, paper tooth, matte finish
GLSL.kuwahara = /* glsl */`
uniform sampler2D tSrc; uniform vec2 texel; uniform float sp;
void main(){
  vec3 m[4]; vec3 v[4];
  for (int k = 0; k < 4; k++) { m[k] = vec3(0.); v[k] = vec3(0.); }
  // 3x3 bilinear taps 1.5 texels apart: each quadrant is a 2x2 of them (each tap already averages 4 texels)
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 c = texture(tSrc, vUv + vec2(float(i), float(j)) * texel * sp * 1.5).rgb;
    vec3 c2 = c * c;
    if (i <= 0 && j <= 0) { m[0] += c; v[0] += c2; }
    if (i >= 0 && j <= 0) { m[1] += c; v[1] += c2; }
    if (i <= 0 && j >= 0) { m[2] += c; v[2] += c2; }
    if (i >= 0 && j >= 0) { m[3] += c; v[3] += c2; }
  }
  vec3 acc = vec3(0.); float ws = 0.;
  for (int k = 0; k < 4; k++) {
    vec3 mu = m[k] / 4.; vec3 va = abs(v[k] / 4. - mu * mu);
    float s2 = va.r + va.g + va.b;
    float w = 1. / (1. + s2 * 260.);                       // generalised Kuwahara: smooth sector weights
    acc += mu * w; ws += w;
  }
  fragColor = vec4(acc / ws, texture(tSrc, vUv).a);
}`;
GLSL.gouache = /* glsl */`
uniform sampler2D tK; uniform float bands; uniform float edgeK; uniform float toothK; uniform float satK;
vec3 kAt(vec2 q){ return texture(tK, vec2(q.x / 1920., 1. - q.y / 1080.)).rgb; }
void main(){
  vec2 q = dpx(); vec2 pp = patPx(q);
  vec4 s = srcAt(q); vec4 pa = paperAt(pp);
  vec2 so = hash22(vec2(seed, 2.9)) * 500.;
  vec3 k = kAt(q);
  // keep the drawing: the source's darkest fine lines survive the flattening (a painter paints up to the line)
  float ls = luma(s.rgb), lk = luma(k);
  k = mix(k, s.rgb, smoothstep(.06, .2, lk - ls) * .8);
  // value bands (soft), hue kept
  float l = luma(k);
  float lb = l * bands; float lq = (floor(lb) + smoothstep(.25, .75, fract(lb))) / bands;
  k *= mix(1., lq / max(l, 1e-3), .7);
  // opaque edges: a thin darker seam where two paint areas meet, a lighter body inside
  float e = 1.8;
  float gx = luma(kAt(q + vec2(e, 0.))) - luma(kAt(q - vec2(e, 0.)));
  float gy = luma(kAt(q + vec2(0., e))) - luma(kAt(q - vec2(0., e)));
  float edge = smoothstep(.03, .2, length(vec2(gx, gy)));
  k *= 1. - edge * .3 * edgeK;
  // brush: broad strokes vary the paint film; thin passages let the paper tooth through
  vec2 rb = rot(.5 + vnoise(pp * .003 + so) * 2.) * pp;
  float film = vnoise(vec2(rb.x * .012, rb.y * .09) + so);
  k *= 1. + (film - .5) * .08 * (1. - smoothstep(.6, .9, luma(k)));
  float thin = smoothstep(.55, .9, vnoise(pp * .02 + so.yx)) * (.5 + .5 * film);
  float tooth = smoothstep(.62, .92, pa.g);
  vec3 paper = paperC * pa.r;
  k = mix(k, paper, tooth * thin * .55 * toothK);
  // matte, chalky body colour: lifted blacks, a little more chroma in the mids
  float l2 = luma(k);
  k = mix(vec3(l2), k, satK);
  k = k * .94 + .045;
  k *= mix(1., pa.r, .6);
  fragColor = vec4(mix(s.rgb, k, amt), s.a);
}`;

// VHS: tape wobble, per-line jitter, rewind bands with snow, tracking lines, head-switching noise at the bottom, YIQ chroma bleed and
// delay, scanlines and a rolling brightness band. Deterministic in t (frame = floor(t * 24)).
GLSL.vhs = /* glsl */`
uniform float rewind; uniform float speed; uniform float bleedK; uniform float noiseK; uniform float headK;
vec3 rgb2yiq(vec3 c){ return vec3(dot(c, vec3(.299, .587, .114)), dot(c, vec3(.596, -.274, -.322)), dot(c, vec3(.211, -.523, .312))); }
vec3 yiq2rgb(vec3 y){ return vec3(y.x + .956 * y.y + .621 * y.z, y.x - .272 * y.y - .647 * y.z, y.x - 1.106 * y.y + 1.703 * y.z); }
void main(){
  vec2 q = dpx();
  float fr = frame;
  float A = amt;
  float line = floor(q.y / 2.);
  vec4 s0 = srcAt(q);
  float wob = (vnoise(vec2(q.y * .011, fr * .37 + seed)) - .5) * 4. * A;
  float jit = (hash12(vec2(line, fr + seed)) - .5) * 1.6 * A;
  float shift = 0., snow = 0., track = 0.;
  float R = rewind;
  for (int b = 0; b < 3; b++) {
    float fb = float(b);
    float h = 34. + 70. * hash12(vec2(fb, 3. + seed));
    float v = (160. + fb * 190.) * speed * (.25 + R * 2.2);
    float y0 = mod(hash12(vec2(fb, 1. + seed)) * 1500. - tt * v, 1500.) - 200.;
    float inb = smoothstep(y0, y0 + 10., q.y) * (1. - smoothstep(y0 + h - 10., y0 + h, q.y));
    float k = inb * (A * .3 + R);
    shift += k * (10. + 70. * hash12(vec2(line, fr + fb))) * (.25 + R);
    // snow: short horizontal streaks (tape dropouts), denser toward the band's middle
    float mid = 1. - abs((q.y - y0) / h * 2. - 1.);
    float cellx = 6. + 46. * hash12(vec2(line, fb + fr));
    float sx = hash12(vec2(floor((q.x + hash12(vec2(line, fr)) * 80.) / cellx), line + fr * 7.13 + fb * 31.));
    snow = max(snow, k * mid * step(.8 - R * .14 - mid * .1, sx) * (.55 + .45 * hash12(vec2(sx, line))));
    track = max(track, k * (1. - smoothstep(0., 3., abs(q.y - y0 - h * .5))) * step(.3, hash12(vec2(floor(q.x / 40.), fr + fb))));
  }
  // head switching: the bottom lines tear right and fill with noise
  float hs = smoothstep(1080. - 30. * headK, 1080. - 16. * headK, q.y) * A * step(.01, headK);
  shift += hs * (12. + 26. * hash12(vec2(line, fr)));
  // rewind skew: the frame shears toward the bottom
  shift += R * 30. * pow(q.y / 1080., 3.) * (.6 + .4 * hash12(vec2(fr, 2.)));
  float x = q.x - (wob + jit) - shift;
  float cw = 4. * bleedK * A;
  vec3 y0c = rgb2yiq(srcAt(vec2(x - 1.5, q.y)).rgb), y1c = rgb2yiq(srcAt(vec2(x, q.y)).rgb), y2c = rgb2yiq(srcAt(vec2(x + 1.5, q.y)).rgb);
  vec3 c0 = rgb2yiq(srcAt(vec2(x + 4. * A - 2. * cw, q.y)).rgb), c1 = rgb2yiq(srcAt(vec2(x + 4. * A - cw, q.y)).rgb);
  vec3 c3 = rgb2yiq(srcAt(vec2(x + 4. * A + cw, q.y)).rgb), c4 = rgb2yiq(srcAt(vec2(x + 4. * A + 2. * cw, q.y)).rgb);
  float Y = (y0c.x + 2. * y1c.x + y2c.x) * .25;
  vec2 IQ = (c0.yz + c1.yz * 2. + y1c.yz * 2. + c3.yz * 2. + c4.yz) / 8.;
  vec3 col = yiq2rgb(vec3(Y, IQ * (1. - .18 * A)));
  // tape: lifted blacks, softened whites, a faint magenta-green cast
  col = mix(col, col * .92 + .045, A);
  col *= mix(vec3(1.), vec3(1.02, .985, 1.03), A);
  // scanlines and a slow rolling band
  col *= 1. - .07 * A * step(1., mod(q.y, 3.));
  float ry = mod(tt * 140. * speed, 1400.) - 160.;
  col *= 1. + .07 * A * (1. - smoothstep(0., 90., abs(q.y - ry)));
  // noise: luma grain each frame, snow, tracking streaks, the head-switch band
  float n = hash12(vec2(floor(q.x / 2.), line) + fr * 1.37 + seed) - .5;
  col += n * .07 * A * noiseK;
  col = mix(col, vec3(.8 + .2 * hash12(q + fr)), snow);
  col = mix(col, vec3(1.), track * .7);
  col = mix(col, vec3(luma(col)) * .6 + n * .5 + .2, hs * .65);
  fragColor = vec4(clamp(col, 0., 1.5), s0.a);
}`;

// ------------------------------------------------------------------------------------------------------------------ JS
const mats = {};
function mat(e, key, body, extra = {}, head = true) {
  if (mats[key]) return mats[key];
  const uniforms = {
    tSrc: { value: null }, tPaper: { value: null }, amt: { value: 1 }, seed: { value: 1 }, frame: { value: 0 }, tt: { value: 0 },
    pat: { value: [1, 0, 0, 0] }, paperC: { value: INKS.paper }, texel: { value: [0, 0] }, ...extra,
  };
  mats[key] = e.shader((head ? STYLE_HEAD : '') + body, uniforms);
  return mats[key];
}

// paper bakes, keyed by seed and fibre strength; a small cache (re-baking yields identical pixels)
const paperCache = new Map();
let paperMat = null;
export function paperTex(e, seed = 1, fibre = 0.05) {
  const key = `${seed}|${fibre}`;
  if (paperCache.has(key)) { const v = paperCache.get(key); paperCache.delete(key); paperCache.set(key, v); return v.texture; }
  if (!paperMat) paperMat = e.shader(PAPER_BAKE, { seed: { value: 1 }, fibreK: { value: 0.05 } });
  const target = new THREE.WebGLRenderTarget(e.W, e.H, { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false,
    magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  target.texture.wrapS = target.texture.wrapT = THREE.RepeatWrapping;
  paperMat.uniforms.seed.value = seed; paperMat.uniforms.fibreK.value = fibre;
  e.pass(paperMat, target);
  paperCache.set(key, target);
  while (paperCache.size > 4) { const [k, v] = paperCache.entries().next().value; paperCache.delete(k); v.dispose(); }
  return target.texture;
}

// riso separation LUT: for an N^3 grid of colours, the 3 ink coverages whose overprint on the paper (paper x prod(1 - a_i (1 - ink_i /
// paper))) best matches it, with lightness weighted 3x over chroma and a small cost per unit of ink. Coarse search, then local refine.
// Built once per ink set (~0.2 s), deterministic.
function buildRisoLut(inks, paper, N = 24) {
  const k = inks.map((c) => c.map((v, i) => 1 - v / paper[i]));
  const LW = [0.2126, 0.7152, 0.0722], WL = 3, LAM = 0.03;
  const render = (a0, a1, a2, out) => { for (let ch = 0; ch < 3; ch++) out[ch] = paper[ch] * (1 - a0 * k[0][ch]) * (1 - a1 * k[1][ch]) * (1 - a2 * k[2][ch]); };
  const tmp = [0, 0, 0];
  const cost = (a0, a1, a2, f) => {
    render(a0, a1, a2, tmp); const L = tmp[0] * LW[0] + tmp[1] * LW[1] + tmp[2] * LW[2];
    const d0 = tmp[0] - L - f[0], d1 = tmp[1] - L - f[1], d2 = tmp[2] - L - f[2], dl = WL * L - f[3];
    return d0 * d0 + d1 * d1 + d2 * d2 + dl * dl + LAM * (a0 + a1 + a2);
  };
  const G = 9, combos = [];
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) for (let l = 0; l < G; l++) combos.push([i / (G - 1), j / (G - 1), l / (G - 1)]);
  const data = new Uint8Array(N * N * N * 4);
  const f = [0, 0, 0, 0];
  for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
    const c = [r / (N - 1), g / (N - 1), b / (N - 1)];
    const L = c[0] * LW[0] + c[1] * LW[1] + c[2] * LW[2];
    f[0] = c[0] - L; f[1] = c[1] - L; f[2] = c[2] - L; f[3] = WL * L;
    let best = null, bc = 1e9;
    for (const a of combos) { const v = cost(a[0], a[1], a[2], f); if (v < bc) { bc = v; best = a; } }
    const a = best.slice();
    for (const st of [0.06, 0.03, 0.015, 0.008]) {
      for (let it = 0; it < 2; it++) for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) {
        const old = a[i]; a[i] = Math.min(1, Math.max(0, old + sg * st));
        const v = cost(a[0], a[1], a[2], f); if (v < bc) bc = v; else a[i] = old;
      }
    }
    const o = ((b * N + g) * N + r) * 4;
    data[o] = Math.round(a[0] * 255); data[o + 1] = Math.round(a[1] * 255); data[o + 2] = Math.round(a[2] * 255); data[o + 3] = 255;
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping; tex.unpackAlignment = 1; tex.needsUpdate = true;
  return { tex, N };
}
const lutCache = new Map();
export function risoLut(inks, paper) {
  const key = JSON.stringify([inks, paper]);
  if (!lutCache.has(key)) lutCache.set(key, buildRisoLut(inks, paper));
  return lutCache.get(key);
}

function common(e, m, srcTex, o, paperCol, fibre) {
  const u = m.uniforms;
  u.tSrc.value = srcTex;
  const seed = o.seed ?? 1;
  u.seed.value = seed; u.amt.value = o.amt ?? 1;
  u.frame.value = Math.floor((o.t ?? 0) * 24 + 1e-3); u.tt.value = o.t ?? 0;
  const pt = o.pat || {};
  u.pat.value = [pt.zoom ?? 1, pt.rot ?? 0, (pt.pan || [0, 0])[0], (pt.pan || [0, 0])[1]];
  u.paperC.value = o.paper || paperCol;
  u.tPaper.value = paperTex(e, seed, o.fibre ?? fibre);
}
const deg = (a) => a * Math.PI / 180;
function offsets(seed, n) {   // seeded misregistration, 1.5-3 design px per ink
  const out = [];
  for (let i = 0; i < n; i++) {
    const h1 = Math.abs(Math.sin((seed * 13.7 + i * 71.3) * 12.9898) * 43758.5453) % 1;
    const h2 = Math.abs(Math.sin((seed * 7.1 + i * 19.9) * 78.233) * 43758.5453) % 1;
    const a = h1 * Math.PI * 2, r = 1.5 + 1.5 * h2;
    out.push(i === 0 ? [0, 0] : [Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

function finalPass(e, m, target, over) { if (over) e.passOver(m, target, 'normal'); else e.pass(m, target); }

// the VHS pass on its own (used by the vhs style, t2_vhs and t2_plate p.vhs)
export function vhsPass(e, srcTex, target, o = {}) {
  const m = mat(e, 'vhs', GLSL.vhs, { rewind: { value: 0 }, speed: { value: 1 }, bleedK: { value: 1 }, noiseK: { value: 1 }, headK: { value: 1 } });
  common(e, m, srcTex, o, INKS.paper, 0.05);
  const u = m.uniforms;
  u.rewind.value = o.rewind ?? 0; u.speed.value = o.speed ?? 1; u.bleedK.value = o.bleed ?? 1; u.noiseK.value = o.noise ?? 1; u.headK.value = o.head ?? 1;
  finalPass(e, m, target, o.over);
}

// srcTex: any texture holding display colour (straight alpha). target: a render target (e.g. engine.rtScene). o: see the header.
export function applyStyle(e, name, srcTex, target, o = {}) {
  if (!name) return;
  const over = !!o.over;
  if (name === 'riso') {
    const m = mat(e, 'riso', GLSL.riso, { ink0: { value: null }, ink1: { value: null }, ink2: { value: null }, tLut: { value: null }, lutN: { value: 24 },
      off0: { value: [0, 0] }, off1: { value: [0, 0] }, off2: { value: [0, 0] }, mis: { value: 1 }, cell: { value: 7 }, levels: { value: [0, 1, 1] },
      density: { value: 0.92 }, angles: { value: [0, 0, 0] }, push: { value: 1 } });
    const paper = o.paper || INKS.paper;
    common(e, m, srcTex, o, paper, 0.04);
    const inks = Array.isArray(o.inks) ? o.inks : RISO_SETS[o.inks || 'earth'];
    const L = risoLut(inks, paper);
    const u = m.uniforms; const off = offsets(o.seed ?? 1, 3);
    u.ink0.value = inks[0]; u.ink1.value = inks[1]; u.ink2.value = inks[2]; u.tLut.value = L.tex; u.lutN.value = L.N;
    u.off0.value = off[0]; u.off1.value = off[1]; u.off2.value = off[2]; u.mis.value = o.mis ?? 1;
    u.cell.value = Math.max(6, o.cell ?? 7); u.levels.value = o.levels || [0.03, 0.95, 1.0]; u.density.value = o.density ?? 0.95;
    u.angles.value = (o.angles || [45, 15, 75]).map(deg); u.push.value = o.push ?? 1.15;
    return finalPass(e, m, target, over);
  }
  if (name === 'halftone') {
    const m = mat(e, 'halftone', GLSL.halftone, { cell: { value: 7 }, levels: { value: [0, 1, 1] }, inkC: { value: INKS.newsInk }, sharp: { value: 0.8 }, angle: { value: deg(45) } });
    common(e, m, srcTex, o, INKS.newsPaper, 0.07);
    const u = m.uniforms;
    u.cell.value = Math.max(6, o.cell ?? 7); u.levels.value = o.levels || [0.06, 0.9, 1.1]; u.inkC.value = o.ink || INKS.newsInk;
    u.sharp.value = o.sharp ?? 0.8; u.angle.value = deg(o.angle ?? 45);
    return finalPass(e, m, target, over);
  }
  if (name === 'newsprint') {
    const m = mat(e, 'newsprint', GLSL.newsprint, { cell: { value: 8 }, levels: { value: [0, 1, 1] }, inkC: { value: INKS.newsInk }, redC: { value: INKS.posterRed },
      redGain: { value: 1 }, redAll: { value: 0 }, offR: { value: [0, 0] }, mis: { value: 1 } });
    common(e, m, srcTex, o, INKS.cream, 0.05);
    const u = m.uniforms;
    u.cell.value = Math.max(6, o.cell ?? 8); u.levels.value = o.levels || [0.05, 0.9, 1.05]; u.inkC.value = o.ink || INKS.newsInk;
    u.redC.value = o.red || INKS.posterRed; u.redGain.value = o.redGain ?? 1; u.redAll.value = o.redAll ?? 0;
    u.offR.value = offsets(o.seed ?? 1, 2)[1]; u.mis.value = o.mis ?? 1;
    return finalPass(e, m, target, over);
  }
  if (name === 'ink') {
    const m = mat(e, 'ink', GLSL.ink, { bleed: { value: 5 }, layers: { value: 4 }, levels: { value: [0, 1, 1] }, inkC: { value: INKS.sumi }, cinnabar: { value: INKS.cinnabar }, keepRed: { value: 1 }, lineK: { value: 1 } });
    common(e, m, srcTex, o, INKS.rice, 0.05);
    const u = m.uniforms;
    u.bleed.value = (o.bleed ?? 5) * Math.max(0.2, o.amt ?? 1); u.layers.value = o.layers ?? 4; u.levels.value = o.levels || [0.05, 0.74, 0.8]; u.lineK.value = o.line ?? 1;
    u.inkC.value = o.ink || INKS.sumi; u.cinnabar.value = o.cinnabar || INKS.cinnabar; u.keepRed.value = o.keepRed ?? 1;
    return finalPass(e, m, target, over);
  }
  if (name === 'blueprint') {
    const m = mat(e, 'blueprint', GLSL.blueprint, { darkC: { value: INKS.prussian }, lightC: { value: INKS.cyanPaper }, levels: { value: [0, 1, 1] }, gridA: { value: 0.05 }, gridStep: { value: 48 } });
    const sep = o.tone === 'sepia';
    common(e, m, srcTex, o, sep ? INKS.sepiaLight : INKS.cyanPaper, 0.03);
    const u = m.uniforms;
    u.darkC.value = o.dark || (sep ? INKS.sepiaDark : INKS.prussian); u.lightC.value = o.light || (sep ? INKS.sepiaLight : INKS.cyanPaper);
    u.levels.value = o.levels || [0.04, 0.95, 1.15]; u.gridA.value = o.grid ?? 0.05; u.gridStep.value = o.gridStep ?? 48;
    return finalPass(e, m, target, over);
  }
  if (name === 'oil') {
    const q1 = rt(e, 'oilT', 0.25), q2 = rt(e, 'oilT2', 0.25);
    const mt = mat(e, 'oilTensor', GLSL.oilTensor, {}, false), mb = mat(e, 'blur9', GLSL.blur9, {}, false);
    mt.uniforms.tSrc.value = srcTex; mt.uniforms.texel.value = [1.6 / q1.width, 1.6 / q1.height]; e.pass(mt, q1);
    mb.uniforms.tSrc.value = q1.texture; mb.uniforms.texel.value = [1.5 / q1.width, 1.5 / q1.height]; e.pass(mb, q2);
    const m = mat(e, 'oil', GLSL.oil, { tT: { value: null }, stroke: { value: 9 }, umber: { value: [0.24, 0.15, 0.09] }, warm: { value: 1 }, canvasK: { value: 1 }, impasto: { value: 1 } });
    common(e, m, srcTex, o, INKS.paper, 0.0);
    const u = m.uniforms;
    u.tT.value = q2.texture; u.stroke.value = o.stroke ?? 12; u.umber.value = o.umber || [0.24, 0.15, 0.09];
    u.warm.value = (o.warm ?? 1) * (o.amt ?? 1); u.canvasK.value = (o.canvas ?? 1) * (0.4 + 0.6 * (o.amt ?? 1)); u.impasto.value = (o.impasto ?? 1);
    return finalPass(e, m, target, over);
  }
  if (name === 'gouache') {
    const h = rt(e, 'gouK', 0.5);
    const mk = mat(e, 'kuwahara', GLSL.kuwahara, { sp: { value: 1.5 } }, false);
    mk.uniforms.tSrc.value = srcTex; mk.uniforms.texel.value = [1 / h.width, 1 / h.height];
    mk.uniforms.sp.value = 1.0 * (o.radius ?? 1) * (0.4 + 0.6 * (o.amt ?? 1));
    e.pass(mk, h);
    const m = mat(e, 'gouache', GLSL.gouache, { tK: { value: null }, bands: { value: 7 }, edgeK: { value: 1 }, toothK: { value: 1 }, satK: { value: 1.08 } });
    common(e, m, srcTex, o, INKS.paper, 0.02);
    const u = m.uniforms;
    u.tK.value = h.texture; u.bands.value = o.bands ?? 7; u.edgeK.value = o.edge ?? 1; u.toothK.value = o.tooth ?? 1; u.satK.value = o.sat ?? 1.08;
    return finalPass(e, m, target, over);
  }
  if (name === 'vhs') return vhsPass(e, srcTex, target, o);
  throw new Error(`unknown style ${name}`);
}

// style a render target in place (e.g. a procedural scene's engine.rtScene)
export function stylize(e, name, target, o = {}) {
  const tmp = rt(e, 'stylizeIn');
  copy(e, target.texture, tmp);
  applyStyle(e, name, tmp.texture, target, { ...o, over: false });
}
