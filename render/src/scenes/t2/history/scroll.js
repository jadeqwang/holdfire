// t2_scroll_warning (1:27.39-1:30.00, "looked for a life with no end, and they found"). A brush writes the warning from the Daoist
// Zhenyuan miaodao yaolüe (真元妙道要略, mid-9th century) down a scroll in ONE vertical column, top to bottom, character by character:
//   有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。
// (sulfur, realgar and saltpeter heated with honey: flames rose, burning their hands and faces, and even burned down their houses).
// The paper is ruled in cinnabar like a manuscript, laid on the calligrapher's dark felt; the camera tilts down with the brush, which
// stays at about y 560 so the lower third is always blank paper (room for the editor's English line). On "found" (1:29.97) a square
// cinnabar seal stamps beside the end of the column: white-text (carved) seal reading 真元妙道, the first four characters of the
// text's title (right column 真元, left column 妙道), cut procedurally (ink.js bakeSeal) in Ma Shan Zheng's brush forms, not in seal script.
// Characters are baked at 1.5x and revealed stroke by stroke; on a paused frame they are as sharp as type.
// p: {t0 (87.42: first stroke), t1 (89.82: last stroke), tSeal (89.97), colX (1200), size (64), cell (72), brushY (560: screen y the
//     camera keeps the brush at), seal ('真元妙道'), sealSize (118), brush (true), zoom (1), seed}
import * as THREE from 'three';
import { clamp, smooth, range, easeOutCubic, easeInOutCubic, easeInCubic } from '../../../util.js';
import { loadT2HistoryFonts, BRUSH, SEAL } from './fonts.js';
import { INK_GLSL, ricePaper, glyphUniforms, setGlyphUniforms, bakeGlyphs, tipAt, drawBrush, bakeSeal } from './ink.js';

export const WARNING = '有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。';
const PUNCT = '、，。';

export function scrollTimes(A, p = {}) {
  const l = A.lines.find((x) => /^looked for a life/.test(x.text));
  const t0 = p.t0 ?? (l ? l.t + 0.03 : 87.42);
  return { t0, t1: p.t1 ?? 89.82, tSeal: p.tSeal ?? 89.97 };
}

function layout(p) {
  const colX = p.colX ?? 1110, size = p.size ?? 82, cell = p.cell ?? 90;
  let y = 132; const G = [];
  for (const ch of WARNING) {
    if (PUNCT.includes(ch)) { G.push({ ch, x: colX + size * 0.36, y: y + cell * 0.14, size, punct: true }); y += cell * 0.5; }
    else { G.push({ ch, x: colX, y: y + cell / 2, size }); y += cell; }
  }
  return { G, colX, size, cell, end: y };
}

let mat = null;
function build(e) {
  if (mat) return;
  mat = e.shader(/* glsl */`
    ${INK_GLSL}
    uniform sampler2D tObj; uniform float camY; uniform float zoom; uniform float colX; uniform vec2 paperX; uniform float cell;
    uniform sampler2D tSeal; uniform vec4 sealR; uniform float sealOn; uniform float sealShadow; uniform float seed;
    void main(){
      vec2 d = fragDesign();
      vec2 page = (d - vec2(960., 540.)) / zoom + vec2(960., 540. + camY);
      vec4 pp = rice(page);
      // the paper's deckled edges over the felt
      float wob = (vnoise(vec2(page.y * .02, seed)) - .5) * 7. + (vnoise(vec2(page.y * .13, seed + 4.)) - .5) * 2.5;
      float inL = smoothstep(paperX.x - 1., paperX.x + 1., page.x + wob), inR = smoothstep(paperX.y + 1., paperX.y - 1., page.x - wob);
      float onPaper = inL * inR;
      // felt: dark, fuzzy, darker in the paper's shadow
      float fz = fbm3(page * .045 + seed) * .6 + vnoise(page * .6) * .4;
      vec3 felt = vec3(.1, .094, .088) * (.75 + .5 * fz);
      float edgeD = min(abs(page.x - paperX.x), abs(page.x - paperX.y));
      felt *= .55 + .45 * smoothstep(0., 26., edgeD);
      // cinnabar ruling: column lines either side of each column, and the top margin rule
      float k = 0., r = 0.;
      float lx = mod(page.x - (colX + cell * .75) + 1000. * cell * 1.5, cell * 1.5);
      lx = min(lx, cell * 1.5 - lx) + (vnoise(vec2(page.y * .01, page.x * .01)) - .5) * .8;
      float rule = (1. - smoothstep(.6, 1.5, lx)) * step(96., page.y);
      rule += (1. - smoothstep(.9, 1.9, abs(page.y - 96. + (vnoise(vec2(page.x * .01, 2.)) - .5)))) * step(paperX.x + 40., page.x) * step(page.x, paperX.y - 40.);
      rule *= step(paperX.x + 40., page.x) * step(page.x, paperX.y - 40.);
      r += clamp(rule, 0., 1.) * .3 * (.6 + .8 * pp.a);
      // the warning
      vec2 gi = glyphInk(page, pp.a);
      k += gi.x + gi.y * .35;
      // the seal: paste taken unevenly by the paper's tooth
      vec2 su = (page - sealR.xy) / sealR.zw;
      if (sealOn > 0. && su.x > 0. && su.y > 0. && su.x < 1. && su.y < 1.) r = max(r, texture(tSeal, su).r * sealOn * (.86 + .28 * (pp.a - .5)));
      vec3 col = lay(pp.rgb, k, r);
      // the stamp's shadow as it comes down
      if (sealShadow > 0.) {
        vec2 sc = sealR.xy + sealR.zw * .5 + vec2(10., 8.) * sealShadow; vec2 q = abs(page - sc) - sealR.zw * (.5 + .35 * sealShadow);
        float sd = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
        col *= 1. - (1. - smoothstep(-20., 30. + 40. * sealShadow, sd)) * .35 * (1. - sealShadow * .6);
      }
      col = mix(felt, col, onPaper);
      vec4 o = texture(tObj, vec2(d.x / 1920., 1. - d.y / 1080.));
      col = mix(col, o.rgb, o.a);
      fragColor = vec4(col, 1.);
    }`, {
    tRice: { value: null }, ...glyphUniforms(), tObj: { value: e.c2dTex }, camY: { value: 0 }, zoom: { value: 1 }, colX: { value: 1200 },
    paperX: { value: new THREE.Vector2(330, 1330) }, cell: { value: 72 }, tSeal: { value: null }, sealR: { value: new THREE.Vector4() },
    sealOn: { value: 0 }, sealShadow: { value: 0 }, seed: { value: 0 },
  });
}

// per-glyph schedule: durations in proportion to the strokes each character has
function schedule(meta, T) {
  const w = meta.map((m) => (m.punct ? 0.25 : 0.55 + 0.11 * Math.min(m.nComp, 9) + 0.9 * m.weight));
  const gap = 0.012, tot = w.reduce((a, b) => a + b, 0);
  const span = T.t1 - T.t0 - gap * (meta.length - 1);
  let s = T.t0; return w.map((x) => { const d = (x / tot) * span; const o = [s, d]; s += d + gap; return o; });
}

export default {
  async init() { await loadT2HistoryFonts(); },
  async prepare() { await loadT2HistoryFonts(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    const T = scrollTimes(ctx.audio, p);
    const L = layout(p);
    const bake = bakeGlyphs(`t2scroll|${L.colX}|${L.size}|${L.cell}`, L.G, { x: L.colX - 80, y: 60, w: 160, h: L.end + 40 - 60 }, 1.5, BRUSH);
    const S = schedule(bake.meta, T);
    const prog = S.map(([s, d]) => { const u = clamp((t - s) / d); return u * 0.7 + u * u * (3 - 2 * u) * 0.3; });
    const u = mat.uniforms;
    const seed = p.seed ?? 23;
    u.tRice.value = ricePaper(e, seed);
    setGlyphUniforms(u, bake, prog, 0, 0.3);
    // the brush: where it is on the page
    const at = (tt) => {
      for (let i = 0; i < S.length; i++) {
        const [s, d] = S[i];
        if (tt < s) {
          if (i === 0) return [...tipAt(bake.meta[0], 0).slice(0, 2), 0];
          const a = tipAt(bake.meta[i - 1], 1), b = tipAt(bake.meta[i], 0), pe = S[i - 1][0] + S[i - 1][1];
          const f = easeInOutCubic(range(tt, pe, s)); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0];
        }
        if (tt <= s + d) { const u2 = clamp((tt - s) / d); return tipAt(bake.meta[i], u2 * 0.7 + u2 * u2 * (3 - 2 * u2) * 0.3); }
      }
      return [...tipAt(bake.meta[S.length - 1], 1).slice(0, 2), 0];
    };
    // the camera follows the writing (smoothed over a window, closed form), keeping the brush at brushY
    const by = p.brushY ?? 560;
    let yAvg = 0; const K = 9;
    for (let k = 0; k < K; k++) yAvg += at(t + (k / (K - 1) - 0.5) * 0.36)[1];
    yAvg /= K;
    const camY = Math.max(0, yAvg - by);
    u.camY.value = camY; u.zoom.value = p.zoom ?? 1; u.colX.value = L.colX; u.cell.value = L.cell;
    u.paperX.value.set(...(p.paperX || [290, 1262])); u.seed.value = (seed % 31) * 1.7;
    // the seal, beside the end of the column
    const last = bake.meta[bake.meta.length - 2];          // 者 (the 。 sits after it)
    const ss = p.sealSize ?? 132;
    const sx = L.colX - L.cell * 0.75 - ss - 12, sy = last.y - ss * 0.35;
    u.tSeal.value = bakeSeal(p.seal || '真元妙道', 256, 7, SEAL);
    u.sealR.value.set(sx, sy, ss, ss);
    u.sealOn.value = t >= T.tSeal ? 1 : 0;
    u.sealShadow.value = t >= T.tSeal - 0.2 && t < T.tSeal ? Math.max(0.001, 1 - easeInCubic(range(t, T.tSeal - 0.2, T.tSeal))) : 0;
    // objects: the brush, in screen space
    const oc = e.c2dBegin();
    if (p.brush ?? true) {
      const out = smooth(range(t, T.t1 + 0.0, T.t1 + 0.16));
      if (out < 1) {
        const [x, y, down] = at(t), [x0] = at(t - 0.03);
        const lean = clamp((x - x0) / 30, -1, 1) * 0.08;
        const z = p.zoom ?? 1;
        drawBrush(oc, (x - 960) * z + 960 + out * 600, (y - camY - 540) * z + 540 - out * 700, { len: 520 * z, ang: 0.48 + lean, lift: 1 - down });
      }
    }
    e.c2dTex.needsUpdate = true; u.tObj.value = e.c2dTex;
    e.pass(mat, e.rtScene);
    ctx.state.scroll = { camY, T };
  },
};
