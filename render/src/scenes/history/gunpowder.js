// GUNPOWDER (V2a/V2b: "Priests in the smoke wanted never to die, / sulfur and saltpeter, thunder in the sky"). A printed page:
// incense smoke rises; a brush writes 长生不老 (chángshēng bùlǎo, "long life, never growing old": what the Taoist alchemists
// sought); then 硫 (sulfur) and 硝 (saltpeter) in big strokes; on "thunder" the first blast throws the ink off the page as smoke,
// with red sparks (fire) and black ash; out of the smoke condenses 火药, huǒyào, "fire medicine" (the name still records its
// origin in elixir alchemy). Facts: docs/research/facts.md §3. The characters are a brush face (Ma Shan Zheng, OFL), not a
// historical manuscript; no recipe is implied (gunpowder also needs charcoal; the 9th-century text is a warning).
//
// drawGunpowder(ctx, shot, t, p) overprints onto rtScene (multiply), so it can sit on an archival plate; the 'gunpowder' scene
// prints its own paper first (or p.plate: {clip, s0, ...archival params} to print over a redrawn plate).
// p: {glyphs (layout, see GLYPHS), tLife: [t0, step], tSulfur, tSaltpeter, tBurst, tFire, burst: [x, y], smoke (1: incense),
//     smokeSrc [x, y], sparks (110), gloss (true), seed, cell (6), misreg, lamp (print.js setLamp), redGlow (0.9: sparks burn)}
// Times default to the word onsets of lines 22-23 in timing.json.
import * as THREE from 'three';
import { P } from '../../palette.js';
import { clamp, lerp, smooth, range, easeOutCubic, hash1, hash2 } from '../../util.js';
import { PRINT_GLSL, printUniforms, setPrint, passMultiply, pressBegin, pressTexture, ink, INK_K } from './print.js';
import { prepareArchival, drawArchival, seedFor } from './archival.js';
import { loadHistoryFonts, BRUSH } from './fonts.js';

export const GLYPHS = [
  { ch: '长', x: 1652, y: 250, size: 124, key: 'life', i: 0 }, { ch: '生', x: 1652, y: 380, size: 124, key: 'life', i: 1 },
  { ch: '不', x: 1652, y: 510, size: 124, key: 'life', i: 2 }, { ch: '老', x: 1652, y: 640, size: 124, key: 'life', i: 3 },
  { ch: '硫', x: 610, y: 470, size: 360, key: 'sulfur' }, { ch: '硝', x: 1140, y: 470, size: 360, key: 'saltpeter' },
  { ch: '火', x: 730, y: 470, size: 300, key: 'fire', i: 0, layer: 1 }, { ch: '药', x: 1040, y: 470, size: 300, key: 'fire', i: 1, layer: 1 },
];

export function gunTimes(A, p = {}) {
  const l22 = A.lines.find((l) => /^Priests in the smoke/.test(l.text)), l23 = A.lines.find((l) => /^sulfur and saltpeter/.test(l.text));
  const w = (l, j, d) => (l && l.words[j] ? l.words[j].t : d);
  const tBurst = p.tBurst ?? w(l23, 3, 86.44);
  return {
    tLife: p.tLife || [w(l22, 4, 83.56), 0.25],      // "wanted ..."
    tSulfur: p.tSulfur ?? w(l23, 0, 85.12),
    tSaltpeter: p.tSaltpeter ?? w(l23, 2, 85.76),
    tBurst,
    tFire: p.tFire ?? tBurst + 0.24,
  };
}

let mat = null;
const layers = [{ cv: null, tex: null, key: '' }, { cv: null, tex: null, key: '' }];
// glyphs that overlap in space (硫 硝 then 火药 in the same place) live on separate layers (textures)
function bakeGlyphs(e, glyphs, li) {
  const L = layers[li];
  glyphs = glyphs.filter((g) => (g.layer || 0) === li);
  const key = JSON.stringify(glyphs.map((g) => [g.ch, g.x, g.y, g.size]));
  if (L.tex && key === L.key) return L.tex;
  if (!L.cv) { L.cv = document.createElement('canvas'); L.cv.width = e.W; L.cv.height = e.H; }
  const c = L.cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, e.W, e.H);
  c.setTransform(e.S, 0, 0, e.S, 0, 0);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.globalCompositeOperation = 'lighter';
  for (const g of glyphs) {
    c.font = `400 ${g.size}px ${BRUSH}`;
    c.filter = 'none'; c.fillStyle = 'rgb(255,0,0)'; c.fillText(g.ch, g.x, g.y + g.size * 0.04);
    c.filter = `blur(${Math.round(g.size * 0.03 * e.S)}px)`; c.fillStyle = 'rgb(0,255,0)'; c.fillText(g.ch, g.x, g.y + g.size * 0.04);
    c.filter = `blur(${Math.round(g.size * 0.012 * e.S)}px)`; c.fillStyle = 'rgb(0,0,255)'; c.fillText(g.ch, g.x, g.y + g.size * 0.04);
  }
  c.filter = 'none'; c.globalCompositeOperation = 'source-over';
  if (!L.tex) {
    L.tex = new THREE.CanvasTexture(L.cv); L.tex.colorSpace = THREE.NoColorSpace; L.tex.generateMipmaps = false;
    L.tex.minFilter = THREE.LinearFilter; L.tex.magFilter = THREE.LinearFilter;
  }
  L.tex.needsUpdate = true; L.key = key;
  return L.tex;
}

const FRAG = /* glsl */`
  ${PRINT_GLSL}
  uniform sampler2D tGlyph0; uniform sampler2D tGlyph1; uniform sampler2D tPress; uniform float hasPress; uniform float mul;
  uniform vec4 gBox[8]; uniform vec4 gSt[8]; uniform float nG;     // gSt: prog, mode (0 brush, 1 condense), blown, layer
  uniform vec2 burstP; uniform float bAge; uniform float time; uniform vec2 smokeSrc; uniform float wisps; uniform float seed;
  // ink of the glyphs at design point d; which = 0: glyphs not (yet) blown, 1: blown glyphs only. returns (solid, tone)
  vec2 glyphAt(vec2 d, float which){
    vec2 uv = vec2(d.x / 1920., 1. - d.y / 1080.);
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec2(0.);
    vec3 g0 = textureLod(tGlyph0, uv, 0.).rgb, g1 = textureLod(tGlyph1, uv, 0.).rgb;  // r sharp, g wide blur (cores), b slight blur
    if (g0.g + g1.g < .002 && g0.r + g1.r < .002) return vec2(0.);
    vec2 acc = vec2(0.);
    for (int i = 0; i < 8; i++) {
      if (float(i) >= nG) break;
      vec4 b = gBox[i];
      if (d.x < b.x || d.x > b.z || d.y < b.y || d.y > b.w) continue;
      vec4 s = gSt[i];
      if (abs(s.z - which) > .5) continue;
      vec3 g = s.w > .5 ? g1 : g0;
      if (g.g < .002 && g.r < .002) continue;
      vec2 u = (d - b.xy) / (b.zw - b.xy);
      float n = vnoise(d * .045 + seed) * .1;
      if (s.y < .5) {
        // the brush: top to bottom, left to right, the stroke cores before the edges
        float a = u.y * .6 + u.x * .26 + (1. - g.g) * .2 + n;
        float on = smoothstep(a - .05, a + .05, s.x * 1.3);
        // dry brush: thin parts and stroke ends break up along the stroke
        float dry = smoothstep(.3, .62, vnoise(rot(-.7) * d * vec2(.05, .55) + seed));
        float edge = 1. - smoothstep(.15, .5, g.g);
        float solid = g.r * on * (1. - edge * .55 * (1. - dry));
        // wet ink feathers into the fibres while fresh, and stays as a grey bleed
        float bleed = clamp(g.b - g.r * .9, 0., 1.) * on * .5;
        acc = max(acc, vec2(solid, bleed));
      } else {
        // condensing out of the smoke: first as a screened grey, then solid ink
        float a = (1. - g.g) * .55 + n * 2.5 + .12;
        float tone = smoothstep(a - .2, a + .2, s.x * 1.45) * max(g.g, g.r);
        float solid = smoothstep(.5, .95, s.x) * g.r;
        acc = max(acc, vec2(solid, tone * (1. - solid) * .85));
      }
    }
    return acc;
  }
  // incense smoke: thin soft ribbons curling up from below, widening and thinning as they rise, broken by turbulence
  float wispsAt(vec2 d){
    float h = smokeSrc.y - d.y; if (h < 0.) return 0.;
    float acc = 0.;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float ph = fi * 2.7 + seed;
      float x0 = smokeSrc.x + (fi - 1.) * 90.;
      float f1 = .0048 + fi * .0021, f2 = .0017 + fi * .0007;
      float sway = sin(h * f1 - time * (.8 + fi * .37) + ph) * (10. + h * (.06 + fi * .03))
                 + sin(h * f2 + time * (.3 + fi * .11) + ph * 1.7) * h * (.12 + fi * .07) * (fi == 1. ? -1. : 1.);
      float wd = 5. + h * (.022 + fi * .008);
      float x = d.x - x0 - sway;
      float band = exp(-x * x / (wd * wd));
      float br = fbm3(vec2(x * .015 + ph, (d.y + time * 80.) * .007));
      acc += band * (.1 + .9 * smoothstep(.3, .75, br)) * (1. - smoothstep(220., 760., h)) * smoothstep(0., 80., h) * .5;
    }
    return clamp(acc, 0., .6);
  }
  float blastSmoke(vec2 d){
    if (bAge < 0.) return 0.;
    vec2 q = d - burstP; q.y += bAge * bAge * 40. + bAge * 50.;      // the cloud rises as it spreads
    float R = 640. * (1. - exp(-bAge / .28));
    float s = .25 + R / 640.;
    float r = length(q);
    float tb = fbm3(q * .0042 / s + seed * 3.1 + vec2(0., bAge * .25)) * 1.1 + vnoise(q * .03 / s) * .08 - .04;
    float edge = R * (.78 + .5 * tb);
    float body = 1. - smoothstep(edge * .8, edge, r);
    // the centre clears (the smoke is blown outward), so what remains can be read
    float hole = edge * clamp((bAge - .06) * 1.7, 0., .8);
    float hollow = smoothstep(hole * .7, hole + 60., r + 70. * (tb - .5));
    float puff = smoothstep(.34, .72, tb + .1 * hollow);
    return body * hollow * puff * exp(-bAge / 1.0) * 1.05;
  }
  void main(){
    vec2 page = toPage(fragDesign());
    vec2 dk = page - offK, dr = page - offR;
    float kT = 0., kS = 0., rT = 0.;
    // glyphs, as written
    vec2 g0 = glyphAt(dk, 0.); kS += g0.x; kT += g0.y;
    // glyphs, blown off the page: layer 0 (all written by now) smeared outward along the blast, turning into screened smoke
    if (bAge > 0. && bAge < 2.5) {
      vec2 q = dk - burstP; float r = max(length(q), 1.); vec2 dir = q / r;
      float push = (1. - exp(-bAge / .22)) * (240. + 260. * vnoise(dk * .006 + seed)) * exp(-r / 900.);
      vec2 rise = vec2(0., bAge * 40.);
      float g1 = 0.;
      float jit = hash12(floor(dk * .5) + seed);          // dithered taps: a smear, not three copies
      for (int j = 0; j < 4; j++) { float f = (float(j) + jit) / 4.; vec2 sp = dk - dir * push * (1. - .8 * f) + rise; g1 += textureLod(tGlyph0, vec2(sp.x / 1920., 1. - sp.y / 1080.), 0.).r; }
      g1 /= 4.;
      kS += g1 * smoothstep(.12, 0., bAge);
      kT += g1 * exp(-bAge / .55) * 1.1;
    }
    if (wisps > .01) kT += wisps * wispsAt(dk);
    if (bAge > 0. && bAge < 4.) kT += blastSmoke(dk);
    // the flash (red: fire): a hot core and a ring that runs out fast
    if (bAge > 0.) {
      float r = length(dr - burstP);
      float core = exp(-r / 110.) * exp(-bAge / .16) * 1.4;
      float glow = max(exp(-r / 160.) * .9 - .12, 0.) * max(exp(-bAge / .28) - .04, 0.) * .65;   // falls to nothing by ~320 px
      rT += core + glow;
    }
    if (hasPress > .5) {
      vec3 ck = 1. - texture(tPress, pageUv(dk)).rgb, cr = 1. - texture(tPress, pageUv(dr)).rgb;
      kT += ck.r; kS += ck.g; rT += cr.b;
      // knock the black out under the sparks, as a printer would, so the red reads even inside the smoke
      float ko = smoothstep(.2, .7, ck.b);
      kT *= 1. - ko; kS *= 1. - ko * .9;
    }
    kT = clamp(kT, 0., 1.); kS = clamp(kS, 0., 1.); rT = clamp(rT, 0., 1.);
    if (mul > .5) fragColor = vec4(printFactor(page, kT, kS, rT, 0.), 1.);
    else fragColor = vec4(printPixel(page, kT, kS, rT, 0.), 1.);
  }`;

function build(e) {
  if (mat) return;
  mat = e.shader(FRAG, {
    ...printUniforms(), tGlyph0: { value: null }, tGlyph1: { value: null }, tPress: { value: null }, hasPress: { value: 0 }, mul: { value: 1 },
    gBox: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, gSt: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, nG: { value: 0 },
    burstP: { value: new THREE.Vector2() }, bAge: { value: -1 }, time: { value: 0 }, smokeSrc: { value: new THREE.Vector2(900, 1080) }, wisps: { value: 1 }, seed: { value: 0 },
  });
}

// sparks and ash: closed-form ballistic flight with drag (no state), drawn on the press canvas
function drawSparks(c, T, t, burst, n) {
  const age = t - T.tBurst; if (age < 0 || age > 2.2) return;
  const k = 3.4, g = 820;
  const pos = (i, a) => {
    const ang = -Math.PI / 2 + (hash1(i * 1.7) - 0.5) * Math.PI * 1.9;
    const v = 520 + 1700 * Math.pow(hash1(i * 3.3), 1.4);
    const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
    const e = (1 - Math.exp(-k * a)) / k;
    return [burst[0] + vx * e, burst[1] + vy * e + g / k * (a - e)];
  };
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const life = 0.35 + 1.1 * hash1(i * 5.9);
    if (age > life) continue;
    const ash = hash1(i * 9.1) < 0.3;
    const a0 = Math.max(0, age - 0.045), p0 = pos(i, a0), p1 = pos(i, age);
    const fade = 1 - smooth(range(age, life * 0.6, life));
    const fl = hash2(i, Math.floor(t * 24)) > 0.18 ? 1 : 0.35;
    if (ash) { c.fillStyle = ink(0, fade, 0); c.beginPath(); c.arc(p1[0], p1[1], 2 + 2.5 * hash1(i * 2.2), 0, Math.PI * 2); c.fill(); }
    else {
      c.strokeStyle = ink(0, 0, fade * fl); c.lineWidth = 2.6 + 2.2 * hash1(i * 4.4);
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0] + 0.01, p1[1]); c.stroke();
    }
  }
}

function glyphState(G, T, t) {
  return G.map((g) => {
    if (g.key === 'life') { const t0 = T.tLife[0] + T.tLife[1] * g.i; return [clamp((t - t0) / 0.42), 0, 1]; }
    if (g.key === 'sulfur') return [clamp((t - T.tSulfur) / 0.5), 0, 1];
    if (g.key === 'saltpeter') return [clamp((t - T.tSaltpeter) / 0.5), 0, 1];
    if (g.key === 'fire') { const t0 = T.tFire + 0.12 * (g.i || 0); return [clamp((t - t0) / 0.42), 1, 0]; }
    return [1, 0, 0];
  });
}

export async function prepareGunpowder(ctx) { await loadHistoryFonts(); }

export function drawGunpowder(ctx, shot, t, p, mode = 'multiply') {
  const e = ctx.engine; build(e);
  const T = gunTimes(ctx.audio, p);
  const G = p.glyphs || GLYPHS;
  const u = mat.uniforms;
  setPrint(e, u, { seed: seedFor(shot, p), cell: p.cell ?? 6, misreg: p.misreg ?? 2.2, rough: p.rough ?? 0.2, zoom: p.zoom ?? 1, pan: p.pan || [0, 0], lamp: p.lamp, redGlow: p.redGlow ?? 0.9 });
  u.tGlyph0.value = bakeGlyphs(e, G, 0); u.tGlyph1.value = bakeGlyphs(e, G, 1);
  const st = glyphState(G, T, t);
  G.forEach((g, i) => {
    const h = g.size * 0.56;
    u.gBox.value[i].set(g.x - h, g.y - h, g.x + h, g.y + h);
    u.gSt.value[i].set(st[i][0], st[i][1], t >= T.tBurst ? st[i][2] : 0, g.layer || 0);
  });
  u.nG.value = Math.min(8, G.length);
  const burst = p.burst || [878, 492];
  u.burstP.value.set(burst[0], burst[1]); u.bAge.value = t - T.tBurst;
  u.time.value = t; u.seed.value = (seedFor(shot, p) % 97) * 0.731;
  const src = p.smokeSrc || [880, 1100]; u.smokeSrc.value.set(src[0], src[1]);
  u.wisps.value = (p.smoke ?? 1) * (1 - 0.6 * smooth(range(t, T.tBurst, T.tBurst + 0.4)));
  // sparks on the press canvas
  const c = pressBegin(e);
  drawSparks(c, T, t, burst, p.sparks ?? 110);
  // (the press canvas texture is shared: pressPrint uploads it; here we bind it ourselves)
  u.tPress.value = pressTexture(); u.hasPress.value = 1;
  u.mul.value = mode === 'multiply' ? 1 : 0;
  if (mode === 'multiply') passMultiply(e, mat, e.rtScene); else e.pass(mat, e.rtScene);
  ctx.state.gun = { T, st };
}


export default {
  async prepare(ctx, shot, t, lt, p) {
    await prepareGunpowder(ctx);
    if (p.plate) await prepareArchival(ctx, shot, t, { ...p.plate, s0: p.plate.s0 ?? shot.t0 }, 'gunPlate');
  },
  draw(ctx, shot, t, lt, p) {
    if (p.plate) { drawArchival(ctx, shot, { ...p.plate }, 'gunPlate'); drawGunpowder(ctx, shot, t, p, 'multiply'); }
    else drawGunpowder(ctx, shot, t, p, 'replace');
  },
  // glosses, set like a museum label under each character (black ink type on the page); they go with the blast
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p; if ((p.gloss ?? true) === false) return;
    const g = ctx.state.gun; if (!g) return;
    const T = g.T, G = p.glyphs || GLYPHS;
    const blow = 1 - smooth(range(t, T.tBurst, T.tBurst + 0.1));
    const sepia = [0.36, 0.31, 0.25];
    const lab = (pin, en, x, y, a, size = 32, enSize = 14) => {
      if (a <= 0.01) return;
      ty.text(pin, x, y, { font: 'CormorantI', size, color: INK_K, alpha: a, align: 'center' });
      ty.label(en, x, y + size * 0.55 + enSize + 4, { color: sepia, alpha: a, size: enSize, align: 'center' });
    };
    const find = (k) => G.find((q) => q.key === k);
    const life = G.filter((q) => q.key === 'life');
    if (life.length) {
      const last = life[life.length - 1], t3 = T.tLife[0] + T.tLife[1] * (life.length - 1);
      const a = smooth(range(t, t3 + 0.25, t3 + 0.6)) * blow;
      lab('chángshēng bùlǎo', 'LONG LIFE,', last.x, last.y + last.size * 0.95, a, 24, 11);
      ty.label('NEVER GROWING OLD', last.x, last.y + last.size * 0.95 + 51, { color: sepia, alpha: a, size: 11, align: 'center' });
    }
    const s = find('sulfur'), x = find('saltpeter');
    if (s) lab('liú', 'SULFUR', s.x, s.y + s.size * 0.66, smooth(range(t, T.tSulfur + 0.3, T.tSulfur + 0.6)) * blow, 36, 14);
    if (x) lab('xiāo', 'SALTPETER', x.x, x.y + x.size * 0.66, smooth(range(t, T.tSaltpeter + 0.3, T.tSaltpeter + 0.6)) * blow, 36, 14);
    const f = G.filter((q) => q.key === 'fire');
    if (f.length) {
      const cx = (f[0].x + f[f.length - 1].x) / 2, y = f[0].y + f[0].size * 0.7;
      lab('huǒyào', 'FIRE MEDICINE', cx, y, smooth(range(t, T.tFire + 0.3, T.tFire + 0.55)), 40, 15);
    }
  },
};
