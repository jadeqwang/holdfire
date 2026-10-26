// Shared helpers for the cosmos scenes: lyric word / hit times (every scene re-times itself from data/timing.json, and every
// time can be overridden through p by the edit), envelopes, the palette of this group, and a VHS smear pass.
import { clamp } from '../../../util.js';
import { P } from '../../../palette.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' -]/g, '').trim();

export function lineBy(A, sub, k = 0) {
  const s = norm(sub);
  return A.lines.filter((l) => norm(l.text).includes(s))[k] || null;
}
// time of the occ-th `word` in the k-th line containing `sub`; fb if not found
export function wordT(A, sub, word, fb, occ = 0, lineK = 0, which = 'start') {
  const L = lineBy(A, sub, lineK); if (!L) return fb;
  const h = L.words.filter((x) => norm(x.w) === norm(word))[occ]; if (!h) return fb;
  const v = which === 'end' ? (h.end ?? h.t) : h.t;
  return Number.isFinite(v) ? v : fb;
}
export function lineT(A, sub, fb, lineK = 0, which = 'start') {
  const L = lineBy(A, sub, lineK); if (!L) return fb;
  const v = which === 'end' ? L.end : L.t;
  return Number.isFinite(v) ? v : fb;
}
// the shouted counts of a post-chorus (timing.json hits, kind post_chorus_N + counting_on_you), in order; fb if missing
export function shoutTimes(A, section, fb) {
  const hs = (A.hits || []).filter((h) => (h.section || '') === section && Number.isFinite(h.t)).map((h) => h.t).sort((a, b) => a - b);
  return hs.length >= fb.length ? hs.slice(0, fb.length) : fb;
}
export function hitT(A, word, kind, fb) {
  const h = (A.hits || []).find((x) => (x.kind || '') === kind && norm(x.word) === norm(word));
  return h && Number.isFinite(h.t) ? h.t : fb;
}
export function sixteenths(A) {
  if (A.__16) return A.__16;
  let e = ((A.d && A.d.eighths) || []).map((x) => (typeof x === 'number' ? x : x.t)).filter(Number.isFinite);
  if (!e.length) { for (let i = 0; i + 1 < A.beats.length; i++) e.push(A.beats[i], (A.beats[i] + A.beats[i + 1]) / 2); }
  const out = []; for (let i = 0; i + 1 < e.length; i++) out.push(e[i], (e[i] + e[i + 1]) / 2);
  A.__16 = out; return out;
}
export function snapTo(grid, t) {
  let lo = 0, hi = grid.length - 1; if (hi < 0) return t;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (grid[m] <= t) lo = m; else hi = m; }
  return Math.abs(grid[lo] - t) < Math.abs(grid[hi] - t) ? grid[lo] : grid[hi];
}

export const env = (t, t0, dec) => (t < t0 ? 0 : Math.exp(-(t - t0) / dec));
export const ad = (t, t0, att, dec) => (t < t0 ? 0 : t < t0 + att ? (t - t0) / att : Math.exp(-(t - t0 - att) / dec));
export const pick = (v, fb) => (v === undefined || v === null ? fb : v);

// ---- the cosmos palette (display sRGB). Pure light on black: gold is contact and held fire, pale blue is Earth and
// the catchlight, ice is starlight; red only for fire. Echo's inks come from the Rare Earth signal print.
export const C = {
  gold: [0.949, 0.757, 0.306],      // #F2C14E: links, worlds
  goldHot: [1.0, 0.86, 0.55],
  goldDeep: P.goldDeep,
  pale: [0.557, 0.773, 1.0],        // #8EC5FF: Earth, the catchlight
  paleHot: [0.82, 0.92, 1.0],
  ice: P.ice,
  cream: [1.0, 0.95, 0.86],
  red: P.red,
  redDeep: P.redDeep,
  sodium: [1.0, 0.70, 0.32],        // city light
  violet: [0.42, 0.26, 0.85],       // Echo
  pink: [1.0, 0.33, 0.72],
  mint: [0.30, 0.94, 0.78],
};
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---- VHS rewind smear over rtScene (optional, built in for t2_war's rewind; the edit's t2_vhs draws the real lines).
// amt 0..1, t drives the band positions.
let smearMat = null, copyMat = null;
export function vhsSmear(e, amt, t) {
  if (amt <= 0.001) return;
  if (!smearMat) {
    copyMat = e.shader(`uniform sampler2D tSrc; void main(){ fragColor = texture(tSrc, vUv); }`, { tSrc: { value: null } });
    smearMat = e.shader(/* glsl */`
      uniform sampler2D tSrc; uniform float amt; uniform float time;
      void main(){
        vec2 uv = vUv;
        float row = floor(uv.y * 270.);
        float band = smoothstep(.0, .02, fract(uv.y * 1.3 + time * 2.7)) * (1. - smoothstep(.06, .1, fract(uv.y * 1.3 + time * 2.7)));
        float j = (hash12(vec2(row, floor(time * 24.))) - .5) * .006 + band * .035;
        uv.x -= j * amt;
        vec3 c; c.r = texture(tSrc, uv + vec2(.004 * amt, 0.)).r; c.g = texture(tSrc, uv).g; c.b = texture(tSrc, uv - vec2(.004 * amt, 0.)).b;
        c += band * amt * .25 * vec3(.8, .85, 1.);
        fragColor = vec4(c, 1.);
      }`, { tSrc: { value: null }, amt: { value: 0 }, time: { value: 0 } });
  }
  copyMat.uniforms.tSrc.value = e.rtScene.texture; e.pass(copyMat, e.rtTmp);
  smearMat.uniforms.tSrc.value = e.rtTmp.texture; smearMat.uniforms.amt.value = clamp(amt); smearMat.uniforms.time.value = t;
  e.pass(smearMat, e.rtScene);
}

// ---- a screen-space point of light (the catchlight, a pulse head): additive radial core + halo at design px (x, y)
let dotMat = null;
export function drawDot(e, x, y, r, I, col, halo = 6) {
  if (I <= 0.001) return;
  if (!dotMat) {
    dotMat = e.shader(/* glsl */`
      uniform vec2 pos; uniform float r; uniform float I; uniform vec3 col; uniform float halo;
      void main(){ vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.); float d = length(px - pos);
        float core = exp(-d * d / (r * r)); float h = exp(-d / (r * halo)) * .22 + exp(-d * d / (r * r * 9.)) * .35;
        vec3 c = mix(col, vec3(1.), core * .55) * (core * 1.4 + h) * I; fragColor = vec4(c, 1.); }`,
    { pos: { value: [0, 0] }, r: { value: 4 }, I: { value: 1 }, col: { value: [1, 1, 1] }, halo: { value: 6 } });
  }
  const u = dotMat.uniforms;
  u.pos.value = [x, y]; u.r.value = Math.max(0.4, r); u.I.value = I; u.col.value = col; u.halo.value = halo;
  e.passOver(dotMat, e.rtScene, 'add');
}
