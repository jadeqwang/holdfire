// The Soviet-poster press for the take-two bridge (t2_poster_morph, t2_arkhipov): flat shapes painted on a canvas in two inks,
// black and poster red, printed on cream newsprint (#F1E8D6) through a coarse amplitude-modulated halftone (black 45°, red 15°,
// 11 px cells: dots of 6-8 px and more at 1080p), the red plate slightly out of register, ink edges eaten by the paper.
// Canvas channels ("white = no ink"): r = 1 - black, g = 1 - red; painting white knocks out to bare paper (painter's order).
//   pressBegin(e)  -> 2D context in page px (1920 x 1080)
//   printPoster(e, {zoom, pan, screen (0: flat, 1: halftone), drain (0..1: the red goes grey), img (texture: densities added),
//                   imgMix, seed, cell, flash})
import * as THREE from 'three';
import { clamp } from '../../../util.js';
import { ricePaper, makeCanvas } from './ink.js';

export const NEWS = [241 / 255, 232 / 255, 214 / 255];   // #F1E8D6, the chess dive's cream
export const pc = (k = 0, r = 0, a = 1) => `rgba(${Math.round(255 * (1 - clamp(k)))},${Math.round(255 * (1 - clamp(r)))},255,${a})`;
export const PAPERC = 'rgb(255,255,255)';
export const BLACK = pc(1, 0), RED = pc(0, 1);

let press = null, mat = null;
export function pressBegin(e) {
  if (!press) press = makeCanvas(e.W, e.H);
  const c = press.c;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.fillStyle = PAPERC; c.fillRect(0, 0, e.W, e.H);
  c.setTransform(e.S, 0, 0, e.S, 0, 0);
  return c;
}

function build(e) {
  if (mat) return;
  mat = e.shader(/* glsl */`
    uniform sampler2D tPress; uniform sampler2D tPaper; uniform sampler2D tImg; uniform float hasImg; uniform float imgMix;
    uniform float zoom; uniform vec2 pan; uniform float screen; uniform float drain; uniform float cell; uniform vec2 offR; uniform float seed;
    uniform vec3 paperCol; uniform float flash;
    float spotE(vec2 q){ vec2 f = abs(fract(q) - .5) * 2.;
      return (f.x + f.y <= 1.) ? (f.x * f.x + f.y * f.y) * .5 : 1. - ((1. - f.x) * (1. - f.x) + (1. - f.y) * (1. - f.y)) * .5; }
    float am(vec2 page, float v, float ang, float n){
      vec2 q = rot(ang) * page / cell;
      float s = spotE(q) + n * smoothstep(0., .3, v) * smoothstep(1., .7, v);
      float w = max(fwidth(s), 1e-4) * .8;
      v = clamp(v, 0., 1.);
      return v < .02 ? 0. : 1. - smoothstep(v - w, v + w, s);
    }
    vec2 dens(vec2 page){
      vec2 uv = vec2(page.x / 1920., 1. - page.y / 1080.);
      vec2 d = vec2(0.);
      if (uv.x >= 0. && uv.y >= 0. && uv.x <= 1. && uv.y <= 1.) d = 1. - texture(tPress, uv).rg;
      if (hasImg > .5) {
        vec3 c = texture(tImg, uv).rgb;
        float k = clamp(1. - c.r / .93, 0., 1.);
        float r = clamp(1. - (c.g / .9) / max(1. - k * .9, .05), 0., 1.) * (1. - k);
        d = max(d * (1. - imgMix), vec2(k, r) * imgMix);
      }
      return d;
    }
    void main(){
      vec2 dd = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 page = (dd - vec2(960., 540.) - pan) / zoom + vec2(960., 540.);
      vec4 pp = texture(tPaper, abs(mod(vec2(page.x / 1920., 1. - page.y / 1080.) + 1., 2.) - 1.));
      vec3 paper = mix(paperCol, pp.rgb, screen);
      float tooth = (pp.a - .5) * .35;
      vec2 dk = dens(page), dr = dens(page - offR);
      float k = dk.x, r = dr.y;
      // newsprint: uneven ink take
      float mott = .9 + .14 * fbm3(page * .01 + seed);
      float ck = mix(k, am(page, k * mott, .7854, tooth), screen);
      float cr = mix(r, am(page - offR, r * mott, .2618, -tooth), screen);
      vec3 red = mix(vec3(.86, .14, .12), vec3(.56, .55, .54), drain);
      vec3 col = paper * mix(vec3(1.), red, cr) * mix(vec3(1.), vec3(.1, .095, .1), ck);
      col += vec3(1., .97, .92) * flash;
      fragColor = vec4(col, 1.);
    }`, {
    tPress: { value: null }, tPaper: { value: null }, tImg: { value: null }, hasImg: { value: 0 }, imgMix: { value: 1 },
    zoom: { value: 1 }, pan: { value: new THREE.Vector2() }, screen: { value: 1 }, drain: { value: 0 }, cell: { value: 11 },
    offR: { value: new THREE.Vector2(2.5, -2) }, seed: { value: 0 }, paperCol: { value: new THREE.Color(...NEWS) }, flash: { value: 0 },
  });
}

export function printPoster(e, o = {}) {
  build(e);
  const u = mat.uniforms;
  press.tex.needsUpdate = true; u.tPress.value = press.tex;
  u.tPaper.value = ricePaper(e, o.seed ?? 41, NEWS);
  u.tImg.value = o.img || null; u.hasImg.value = o.img ? 1 : 0; u.imgMix.value = o.imgMix ?? 1;
  u.zoom.value = o.zoom ?? 1; u.pan.value.set(...(o.pan || [0, 0]));
  u.screen.value = o.screen ?? 1; u.drain.value = o.drain ?? 0; u.cell.value = o.cell ?? 11;
  u.seed.value = ((o.seed ?? 41) % 17) * 3.1; u.flash.value = o.flash ?? 0;
  const m = o.misreg ?? 3; u.offR.value.set(m * 0.8, -m * 0.6);
  e.pass(mat, e.rtScene);
}

// ------------------------------------------------------------------ poster vocabulary (page px; canvas transforms welcome)
export function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
export function quad(c, cx, cy, w, h, ang, col) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  poly(c, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]), col);
}
// a US destroyer in profile, stern at local 0, bow at L, waterline y = 0 (above: superstructure; below: the hull in the water)
export function destroyer(c, x, y, L, ang, col = BLACK, below = true) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const P = (a, b) => [a * L, b * L];
  poly(c, [P(0, 0.004), P(0.004, -0.04), P(0.6, -0.042), P(0.62, -0.05), P(0.97, -0.062), P(1.03, -0.064), P(0.995, 0.004)], col);
  if (below) poly(c, [P(0, 0), P(0.995, 0), P(0.97, 0.03), P(0.9, 0.05), P(0.12, 0.05), P(0.04, 0.035)], col);
  poly(c, [P(0.66, -0.05), P(0.8, -0.05), P(0.79, -0.1), P(0.7, -0.1)], col);             // bridge
  poly(c, [P(0.715, -0.1), P(0.765, -0.1), P(0.76, -0.135), P(0.72, -0.135)], col);
  poly(c, [P(0.44, -0.042), P(0.5, -0.042), P(0.495, -0.11), P(0.45, -0.115)], col);     // funnels, raked
  poly(c, [P(0.54, -0.042), P(0.6, -0.042), P(0.595, -0.105), P(0.55, -0.11)], col);
  for (const g of [0.86, 0.92, 0.12, 0.2]) poly(c, [P(g - 0.025, -0.05), P(g + 0.025, -0.05), P(g + 0.02, -0.075), P(g - 0.03, -0.072)], col);
  c.fillRect(0.648 * L, -0.24 * L, 0.006 * L, 0.2 * L);                                    // mast
  c.fillRect(0.61 * L, -0.2 * L, 0.08 * L, 0.004 * L);
  c.restore();
}
// B-59, a Foxtrot-class boat in profile: bow to +x. (x, y) centre of the hull, L length
export function submarine(c, x, y, L, ang, col = BLACK, hi = null) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const H = L * 0.1;
  c.fillStyle = col; c.beginPath();
  c.moveTo(-L * 0.5, -H * 0.05);
  c.bezierCurveTo(-L * 0.3, -H * 0.5, L * 0.25, -H * 0.55, L * 0.42, -H * 0.45);
  c.bezierCurveTo(L * 0.52, -H * 0.38, L * 0.52, H * 0.3, L * 0.4, H * 0.45);
  c.bezierCurveTo(L * 0.1, H * 0.55, -L * 0.3, H * 0.45, -L * 0.5, H * 0.05);
  c.closePath(); c.fill();
  poly(c, [[-L * 0.53, -H * 0.35], [-L * 0.47, -H * 0.15], [-L * 0.47, H * 0.15], [-L * 0.53, H * 0.35]], col);   // rudder
  poly(c, [[-L * 0.02, -H * 0.48], [L * 0.17, -H * 0.5], [L * 0.15, -H * 1.25], [L * 0.04, -H * 1.3], [-L * 0.01, -H * 1.05]], col);  // sail
  c.fillRect(L * 0.07, -H * 1.75, L * 0.008, H * 0.5); c.fillRect(L * 0.1, -H * 1.6, L * 0.006, H * 0.35);
  if (hi) { c.fillStyle = hi; c.fillRect(-L * 0.36, -H * 0.42, L * 0.7, H * 0.08); poly(c, [[L * 0.03, -H * 1.22], [L * 0.14, -H * 1.18], [L * 0.135, -H * 1.1], [L * 0.03, -H * 1.14]], hi); }
  c.restore();
}
