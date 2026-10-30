// t2_brush_chars (1:25.00-1:27.39, "sulfur and saltpeter, thunder in the sky;"). 硫黃 · 硝石, sulfur and saltpeter, brushed large on
// rice paper in two columns read right to left (硫黃 on the right, 硝石 on the left), stroke by stroke: each glyph's ink runs along
// its strokes (ink.js bakeGlyphs: approximate stroke order, a convincing reveal rather than the canonical one), the brush tip
// riding the front. On "thunder" the mixture flashes (white-hot, then cinnabar) and the ink splatters off the page: a lobed splash,
// drops thrown along rays with tails and satellites, cinnabar sparks that land as red, a fine mist (deterministic, closed form).
// p: {layout ('columns' | 'row'), t: [4 start times], dur: [4], tFlash, flash: [x, y], brush (true), zoom, pan, seed,
//     splat {n, reach, red, mist}, dry (0.55: dry-brush streaks), smoke (0.6: a faint drift of the alchemists' smoke)}
// Times default to line 23's words in timing.json (found by text; fallbacks are v1 times: sulfur 85.00, saltpeter 85.73, thunder 86.42).
import * as THREE from 'three';
import { clamp, smooth, range, easeOutCubic, easeInOutCubic, hash1 } from '../../../util.js';
import { loadT2HistoryFonts, BRUSH } from './fonts.js';
import { INK_GLSL, ricePaper, glyphUniforms, setGlyphUniforms, bakeGlyphs, tipAt, drawBrush, splatter, blobPath, inkc, makeCanvas } from './ink.js';

const LAYOUTS = {
  columns: [{ ch: '硫', x: 1132, y: 352, size: 330 }, { ch: '黃', x: 1132, y: 722, size: 330 }, { ch: '硝', x: 788, y: 352, size: 330 }, { ch: '石', x: 788, y: 722, size: 330 }],
  row: [{ ch: '硫', x: 620, y: 540, size: 232 }, { ch: '黃', x: 836, y: 540, size: 232 }, { ch: '硝', x: 1086, y: 540, size: 232 }, { ch: '石', x: 1302, y: 540, size: 232 }],
};

export function brushTimes(A, p = {}) {
  const l = A.lines.find((x) => /^sulfur,? (and )?saltpeter/.test(x.text));   // the new song sings "sulfur, saltpeter" (no "and")
  const w = (word, d) => { const W = l && l.words.find((x) => x.w.toLowerCase().replace(/[^a-z]/g, '') === word); return W ? W.t : A.v1(d); };
  const s = w('sulfur', 85.0), sp = w('saltpeter', 85.73), th = w('thunder', 86.42);
  return { t: p.t || [s, s + 0.32, sp, sp + 0.33], dur: p.dur || [0.31, 0.31, 0.32, 0.29], tFlash: p.tFlash ?? th };
}

let mat = null, marks = null;
function build(e) {
  if (mat) return;
  marks = makeCanvas(e.W, e.H);
  mat = e.shader(/* glsl */`
    ${INK_GLSL}
    uniform sampler2D tMarks; uniform sampler2D tObj; uniform float zoom; uniform vec2 pan; uniform vec2 flashP; uniform float fAge;
    uniform float time; uniform float smoke; uniform float seed;
    vec2 cuv(vec2 page){ return vec2(page.x / 1920., 1. - page.y / 1080.); }
    void main(){
      vec2 d = fragDesign();
      vec2 page = (d - vec2(960., 540.) - pan) / zoom + vec2(960., 540.);
      vec4 pp = rice(page);
      vec2 gi = glyphInk(page, pp.a);
      vec3 m = 1. - texture(tMarks, cuv(page)).rgb;              // wash, solid, cinnabar
      // wet marks: a darker rim where the drop's edge dried first; the paper's tooth shows in the thin parts
      float solid = m.g * (.92 + .16 * (pp.a - .5));
      float k = max(gi.x, solid) + gi.y * .4 + m.r * .55;
      // the alchemists' smoke, a faint wash drifting over the page
      if (smoke > 0.) {
        vec2 q = page * vec2(.0016, .0028) + vec2(-time * .05, time * .02) + seed;
        float s = fbm3(q + vec2(fbm3(q * 1.7 + time * .04), 0.)) ;
        k += smoke * .16 * smoothstep(.45, .85, s) * smoothstep(1080., 300., page.y + 200. * s);
      }
      vec3 col = lay(pp.rgb, k, m.b);
      // the flash: white-hot, then cinnabar, then a warm afterglow on the paper
      if (fAge >= 0. && fAge < 1.5) {
        float r = length((d - flashP) * vec2(1., 1.15));
        col += vec3(1., .96, .9) * (exp(-r / 260.) * 4. * exp(-fAge / .035) + exp(-fAge / .02));
        col += vec3(1., .3, .1) * exp(-r / 360.) * 1.25 * exp(-fAge / .11) * smoothstep(0., .02, fAge);
        col *= 1. + vec3(.12, .04, .01) * exp(-r / 600.) * exp(-fAge / .25);
      }
      // objects above the paper: the brush (and sparks still in the air, which glow)
      vec4 o = texture(tObj, cuv(page));
      float hot = o.a * step(.85, o.r) * step(o.b, .55);
      col = mix(col, o.rgb * (1. + 2.5 * hot), o.a);
      fragColor = vec4(col, 1.);
    }`, {
    tRice: { value: null }, ...glyphUniforms(), tMarks: { value: marks.tex }, tObj: { value: e.c2dTex }, zoom: { value: 1 }, pan: { value: new THREE.Vector2() },
    flashP: { value: new THREE.Vector2(960, 540) }, fAge: { value: -1 }, time: { value: 0 }, smoke: { value: 0.6 }, seed: { value: 0 },
  });
}

// where the brush is at time t: [x, y, down, glyph index]
function brushPos(meta, T, t) {
  const n = meta.length;
  for (let i = 0; i < n; i++) {
    const t0 = T.t[i], t1 = t0 + T.dur[i];
    if (t < t0) {
      if (i === 0) return [...tipAt(meta[0], 0).slice(0, 2), 0, 0];
      const pe = T.t[i - 1] + T.dur[i - 1];
      const a = tipAt(meta[i - 1], 1), b = tipAt(meta[i], 0);
      const f = easeInOutCubic(range(t, pe, t0));
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - Math.sin(Math.PI * f) * 60, 0, i];
    }
    if (t <= t1) { const q = tipAt(meta[i], progOf(t, t0, T.dur[i])); return [q[0], q[1], q[2], i]; }
  }
  const a = tipAt(meta[n - 1], 1);
  return [a[0], a[1], 0, n - 1];
}
const progOf = (t, t0, d) => { const u = clamp((t - t0) / d); return u * u * (3 - 2 * u) * 0.35 + u * 0.65; };

function drawSplatter(c, drops, age, cx, cy, seed) {
  c.globalCompositeOperation = 'darken';
  // the central splash and its wash
  const g = easeOutCubic(clamp(age / 0.05)), spread = 1 + 0.05 * clamp(age / 0.8);
  if (g > 0.01) {
    // a pale wash where the splash soaked in, then the blot: a cluster of pools with fingers thrown out along rays
    c.fillStyle = inkc(0.16, 0, 0); blobPath(c, cx, cy, 120 * g * spread, seed + 3, 9); c.fill();
    c.fillStyle = inkc(0, 1, 0);
    for (let i = 0; i < 7; i++) {
      const a = hash1(seed + i * 3.3) * 6.283, d = (i ? 18 + 42 * hash1(seed + i * 5.1) : 0) * g;
      blobPath(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, (i ? 16 + 26 * hash1(seed + i * 7.7) : 52) * g * spread, seed + i * 1.7, 13); c.fill();
    }
    for (let i = 0; i < 10; i++) {
      // fingers: thick at the root, pinched, ending in a round bead (the way a thrown splash runs out)
      const a = (i / 10) * 6.283 + (hash1(seed * 2 + i) - 0.5) * 0.5, L = (70 + 120 * Math.pow(hash1(seed * 3 + i), 1.3)) * g, w = 13 + 12 * hash1(seed * 5 + i);
      const dx = Math.cos(a), dy = Math.sin(a) * 0.85, nx = -dy, ny = dx, x0 = cx + dx * 30 * g, y0 = cy + dy * 30 * g;
      c.beginPath(); c.moveTo(x0 + nx * w, y0 + ny * w);
      c.quadraticCurveTo(x0 + dx * L * 0.5 + nx * w * 0.25, y0 + dy * L * 0.5 + ny * w * 0.25, x0 + dx * L + nx * w * 0.3, y0 + dy * L + ny * w * 0.3);
      c.lineTo(x0 + dx * L - nx * w * 0.3, y0 + dy * L - ny * w * 0.3);
      c.quadraticCurveTo(x0 + dx * L * 0.5 - nx * w * 0.25, y0 + dy * L * 0.5 - ny * w * 0.25, x0 - nx * w, y0 - ny * w);
      c.fill();
      c.beginPath(); c.arc(x0 + dx * (L + w * 0.35), y0 + dy * (L + w * 0.35), w * 0.62, 0, 6.283); c.fill();
    }
  }
  for (const q of drops) {
    if (age < q.delay - 0.06) continue;
    const dx = Math.cos(q.ang), dy = Math.sin(q.ang) * 0.82;
    if (age < q.delay) continue;                            // in flight: drawn on the objects canvas
    const grow = 0.55 + 0.45 * easeOutCubic(clamp((age - q.delay) / 0.05));
    const spread = 1 + 0.07 * clamp((age - q.delay) / 0.7);
    const r = q.r * grow * spread;
    const col = q.red ? inkc(0, 0, 0.95) : inkc(0, 1, 0);
    c.fillStyle = col;
    if (!q.mist) { c.save(); c.fillStyle = q.red ? inkc(0, 0, 0.25) : inkc(0.22, 0, 0); c.beginPath(); c.ellipse(q.x, q.y, r * 1.7, r * 1.35, q.ang, 0, Math.PI * 2); c.fill(); c.restore(); c.fillStyle = col; }
    c.beginPath(); c.ellipse(q.x, q.y, r * 1.18, r * 0.86, q.ang, 0, Math.PI * 2); c.fill();
    if (q.tail > 0) {                                        // the tear runs on in the direction it flew
      const L = q.tail * grow;
      c.beginPath();
      c.moveTo(q.x - dy * r * 0.7, q.y + dx * r * 0.7);
      c.quadraticCurveTo(q.x + dx * L * 0.6 - dy * r * 0.25, q.y + dy * L * 0.6 + dx * r * 0.25, q.x + dx * (r + L), q.y + dy * (r + L));
      c.quadraticCurveTo(q.x + dx * L * 0.6 + dy * r * 0.25, q.y + dy * L * 0.6 - dx * r * 0.25, q.x + dy * r * 0.7, q.y - dx * r * 0.7);
      c.fill();
    }
    for (let s = 0; s < q.sat; s++) {                        // satellites further out along the ray
      const f = 1.6 + s * 1.1 + hash1(q.s + s) * 0.8, rr = r * (0.38 - s * 0.07);
      if (rr < 1) continue;
      const off = (hash1(q.s * 3 + s) - 0.5) * r * 1.4;
      c.beginPath(); c.arc(q.x + dx * (r + q.tail) * f - dy * off, q.y + dy * (r + q.tail) * f + dx * off, rr, 0, Math.PI * 2); c.fill();
    }
  }
  c.globalCompositeOperation = 'source-over';
}

function drawInFlight(c, drops, age, cx, cy) {
  c.lineCap = 'round';
  for (const q of drops) {
    if (age >= q.delay || age < 0 || q.mist) continue;
    const f = age / q.delay, f0 = Math.max(0, (age - 0.025) / q.delay);
    const x0 = cx + (q.x - cx) * f0, y0 = cy + (q.y - cy) * f0, x1 = cx + (q.x - cx) * f, y1 = cy + (q.y - cy) * f;
    c.strokeStyle = q.red ? 'rgba(255,190,110,1)' : 'rgba(10,9,8,1)';
    c.lineWidth = Math.max(2, q.r * 0.9);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 + 0.01, y1); c.stroke();
  }
}

let drops = null, dropsKey = '';
export default {
  async init() { await loadT2HistoryFonts(); },
  async prepare() { await loadT2HistoryFonts(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    const T = brushTimes(ctx.audio, p);
    const G = LAYOUTS[p.layout || 'columns'];
    const bake = bakeGlyphs(`t2bc|${p.layout || 'columns'}`, G, { x: 0, y: 0, w: 1920, h: 1080 }, 1, BRUSH);
    const prog = G.map((g, i) => progOf(t, T.t[i], T.dur[i]));
    const u = mat.uniforms;
    const seed = p.seed ?? 11;
    u.tRice.value = ricePaper(e, seed);
    setGlyphUniforms(u, bake, prog, p.dry ?? 0.4, 0.4);
    const fp = p.flash || [960, 520];
    const age = t - T.tFlash;
    u.flashP.value.set(fp[0], fp[1]); u.fAge.value = age;
    const zoom = p.zoom ?? (1 + 0.035 * smooth(range(t, T.t[0], T.tFlash + 1)) + 0.03 * easeOutCubic(clamp(age / 0.4)) * (age > 0 ? 1 : 0));
    u.zoom.value = zoom; u.pan.value.set(...(p.pan || [0, 0]));
    u.time.value = t; u.smoke.value = p.smoke ?? 0.6; u.seed.value = (seed % 37) * 1.37;
    // marks: the splatter
    const key = JSON.stringify([seed, fp, p.splat || {}]);
    if (key !== dropsKey) { drops = splatter(seed, fp[0], fp[1], p.splat || {}); dropsKey = key; }
    const mc = marks.c;
    mc.setTransform(1, 0, 0, 1, 0, 0); mc.fillStyle = '#fff'; mc.fillRect(0, 0, e.W, e.H); mc.setTransform(e.S, 0, 0, e.S, 0, 0);
    if (age >= 0) drawSplatter(mc, drops, age, fp[0], fp[1], seed);
    marks.tex.needsUpdate = true;
    // objects: the brush while writing, then it leaves; sparks in flight
    const oc = e.c2dBegin();
    if (p.brush ?? true) {
      const tEnd = T.t[3] + T.dur[3];
      const out = smooth(range(t, tEnd + 0.02, tEnd + 0.22));
      if (out < 1) {
        const [bx, by, down] = brushPos(bake.meta, T, t);
        const [ax] = brushPos(bake.meta, T, t - 0.03);
        const lean = clamp((bx - ax) / 60, -1, 1) * 0.1;
        drawBrush(oc, bx + out * 700, by - out * 900, { len: 600, ang: 0.5 + lean, lift: 1 - down });
      }
    }
    if (age >= 0) drawInFlight(oc, drops, age, fp[0], fp[1]);
    e.c2dTex.needsUpdate = true;
    u.tObj.value = e.c2dTex;
    e.pass(mat, e.rtScene);
  },
};
