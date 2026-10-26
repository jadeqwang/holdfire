// Shared ink-wash kit for the take-two history scenes (docs/PLAN_TAKE_TWO.md, "Art style by era": Gunpowder = Chinese ink wash
// with fine-line figures, brushed characters, a red seal; ink black, rice paper, cinnabar).
//
//   ricePaper(e, seed)            baked xuan paper (rgb = stock, a = tooth), sampled in page px with mirrored wrap
//   INK_GLSL                      rice(page), lay(paper, k, r) (ink and cinnabar multiplied into the paper), glyphInk(page) etc.
//   bakeGlyphs(key, glyphs, rect, scale)
//                                 rasterises brush characters and computes, per pixel, WHEN the brush reaches it: connected
//                                 components in an approximate stroke order (left radical first, then top to bottom), and inside
//                                 each component the geodesic distance from its starting end, so the ink runs along the strokes.
//                                 Returns a DataTexture (r coverage, g time 0..1 in the glyph, b time along the component, a glyph
//                                 index) and per-glyph meta {track: where the brush tip is at each moment, weight}.
//   bakeSeal(chars, px)           a square cinnabar seal, white-text (baiwen) style, carved procedurally: chars knocked out of the
//                                 square, stretched to fill their quarters, edges chipped, paste uneven.
//   drawBrush(c, x, y, o)         a calligraphy brush in fine-line ink style (outline + pale wash), its tip at (x, y).
//   splatter(seed, cx, cy, o)     deterministic ink splatter: drops on rays with satellites and tails (closed form in age).
import * as THREE from 'three';
import { clamp, smooth, range, hash1, hash2, rng } from '../../../util.js';

export const RICE = [0.93, 0.895, 0.82];          // aged xuan paper
export const INK = [0.045, 0.042, 0.04];          // pine-soot ink (multiplied)
export const CINNABAR = [0.84, 0.21, 0.12];       // cinnabar seal paste / ruling (multiplied)
const v3 = (c) => `vec3(${c.map((x) => x.toFixed(4)).join(',')})`;

// ------------------------------------------------------------------ rice paper
const riceCache = new Map();
let riceMat = null;
export function ricePaper(e, seed = 1, col = RICE) {
  const key = `${seed}|${col.join(',')}`;
  if (riceCache.has(key)) return riceCache.get(key).texture;
  if (!riceMat) {
    riceMat = e.shader(/* glsl */`
      uniform float seed; uniform vec3 paper;
      float fib(vec2 d, float a, vec2 o, float th){ vec2 r = rot(a) * d; return smoothstep(th, th + .1, vnoise(r * vec2(.012, .5) + o)); }
      void main(){
        vec2 d = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
        vec2 o = vec2(fract(seed * .1731) * 400., fract(seed * .3917) * 400.);
        float m = fbm(d / 380. + o) - .5;                  // slow mottling
        float cl = fbm3(d / 46. + o * 1.3) - .5;           // formation: the cloudiness of hand-made paper
        float fl = 0., fd = 0.;
        for (int i = 0; i < 4; i++) { float fi = float(i); fl += fib(d, fi * 1.31 + seed, o + fi * 9.1, .82); }   // long pale fibres, every direction
        for (int i = 0; i < 2; i++) { float fi = float(i); fd += fib(d * 1.3, fi * 2.1 - seed, o - fi * 5.3, .88); }  // a few darker ones
        float sp = step(.9993, hash12(floor(d / 2.) + o)) * (.4 + .6 * hash12(floor(d / 2.) + 3.));            // bark specks
        float tooth = vnoise(d * .7 + o) * .6 + vnoise(d * 1.9 - o) * .4;
        vec3 c = paper * (1. + m * .05 + cl * .035 + fl * .018 - fd * .03 - sp * .35);
        c *= mix(vec3(1.), vec3(1., .97, .91), smoothstep(0., .4, m) * .6);    // warm age
        fragColor = vec4(c, tooth);
      }`, { seed: { value: 0 }, paper: { value: new THREE.Color() } });
  }
  const rt = new THREE.WebGLRenderTarget(e.W, e.H, { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  riceMat.uniforms.seed.value = seed; riceMat.uniforms.paper.value.setRGB(...col);
  e.pass(riceMat, rt);
  riceCache.set(key, rt);
  return rt.texture;
}

// ------------------------------------------------------------------ GLSL
export const INK_GLSL = /* glsl */`
const vec3 INK = ${v3(INK)};
const vec3 CINN = ${v3(CINNABAR)};
uniform sampler2D tRice;
vec2 fragDesign(){ return vec2(vUv.x * 1920., (1. - vUv.y) * 1080.); }
vec4 rice(vec2 page){ vec2 uv = vec2(page.x / 1920., 1. - page.y / 1080.); uv = abs(mod(uv + 1., 2.) - 1.); return texture(tRice, uv); }
vec3 lay(vec3 paper, float k, float r){ return paper * mix(vec3(1.), CINN, clamp(r, 0., 1.)) * mix(vec3(1.), INK, clamp(k, 0., 1.)); }
// baked glyphs: r coverage, g time in glyph (0..254/255; 255 = none), b time along the component, a glyph index (255 = none)
uniform sampler2D tG; uniform vec4 gRect; uniform vec2 gSize; uniform float gProg[32]; uniform float gDry; uniform float gBleed;
// ink of the glyphs at page point (x: density, y: bleed halo)
vec2 glyphInk(vec2 page, float tooth){
  vec2 uv = (page - gRect.xy) / gRect.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec2(0.);
  ivec2 ip = ivec2(uv * gSize);
  vec4 gn = texelFetch(tG, ip, 0);
  float idx = floor(gn.a * 255. + .5);
  if (idx > 254.) return vec2(0.);
  float p = gProg[int(idx)];
  if (p <= 0.) return vec2(0.);
  float tm = gn.g * 255. / 254.;
  float on = clamp((p * 1.01 - tm) / .018, 0., 1.);
  if (on <= 0.) return vec2(0.);
  float cov = texture(tG, uv).r;
  float k = cov;
  if (gDry > 0.) {
    // dry brush: the ink thins along each stroke and breaks into hair streaks along the direction of travel near its edges
    float tx = texelFetch(tG, ip + ivec2(2, 0), 0).g - texelFetch(tG, ip - ivec2(2, 0), 0).g;
    float ty = texelFetch(tG, ip + ivec2(0, 2), 0).g - texelFetch(tG, ip - ivec2(0, 2), 0).g;
    vec2 dir = length(vec2(tx, ty)) > 1e-4 ? normalize(vec2(tx, ty)) : vec2(1., 0.);
    vec2 q = vec2(dot(page, vec2(-dir.y, dir.x)), dot(page, dir));
    float hair = smoothstep(.45, .8, vnoise(vec2(q.x * .9, q.y * .012) + idx * 7.));
    float blur = textureLod(tG, uv, 2.).r;
    float edge = 1. - smoothstep(.55, .95, blur);
    float run = smoothstep(.55, 1., gn.b);              // the end of a long stroke runs dry
    k *= 1. - gDry * clamp(edge * .9 + run * .35, 0., 1.) * hair * (.6 + .8 * tooth);
    k *= 1. - gDry * .12 * gn.b;
  }
  float halo = 0.;
  if (gBleed > 0.) { float blur = textureLod(tG, uv, 2.5).r; halo = max(blur - cov, 0.) * gBleed * smoothstep(0., .25, p - tm); }
  return vec2(k * on, halo * on);
}
`;

export function glyphUniforms() {
  return { tG: { value: null }, gRect: { value: new THREE.Vector4(0, 0, 1920, 1080) }, gSize: { value: new THREE.Vector2(1, 1) },
    gProg: { value: new Float32Array(32) }, gDry: { value: 0 }, gBleed: { value: 0.35 } };
}
export function setGlyphUniforms(u, bake, prog, dry = 0, bleed = 0.35) {
  u.tG.value = bake.tex; u.gRect.value.set(bake.rect.x, bake.rect.y, bake.rect.w, bake.rect.h); u.gSize.value.set(bake.W, bake.H);
  for (let i = 0; i < 32; i++) u.gProg.value[i] = prog[i] ?? 0;
  u.gDry.value = dry; u.gBleed.value = bleed;
}

// ------------------------------------------------------------------ glyph bake (stroke-time maps)
const bakeCache = new Map();
let rasterCv = null;
function rasterGlyph(g, s, font) {
  const box = Math.ceil(s * 1.5) + 16;
  if (!rasterCv) rasterCv = document.createElement('canvas');
  rasterCv.width = box; rasterCv.height = box;
  const c = rasterCv.getContext('2d', { willReadFrequently: true });
  c.clearRect(0, 0, box, box);
  c.font = `400 ${s}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
  c.fillText(g.ch, box / 2, box / 2);
  const img = c.getImageData(0, 0, box, box).data;
  const a = new Uint8Array(box * box);
  let x0 = box, y0 = box, x1 = -1, y1 = -1;
  for (let i = 0; i < box * box; i++) { const v = img[i * 4 + 3]; a[i] = v; if (v > 20) { const x = i % box, y = (i / box) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return { a, box, bb: [x0, y0, x1, y1] };
}

// Dial's algorithm (integer weights 5 / 7 on the 8-neighbourhood) over a mask, from one seed; returns max distance
function geodesic(mask, dist, W, H, seed, label, lab) {
  const buckets = [[seed]]; dist[seed] = 0; let maxD = 0;
  for (let d = 0; d < buckets.length; d++) {
    const B = buckets[d]; if (!B) continue;
    for (let k = 0; k < B.length; k++) {
      const i = B[k]; if (dist[i] !== d) continue;
      maxD = d;
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (lab[j] !== label) continue;
        const nd = d + (dx && dy ? 7 : 5);
        if (nd < dist[j]) { dist[j] = nd; (buckets[nd] || (buckets[nd] = [])).push(j); }
      }
    }
  }
  return maxD;
}

function analyseGlyph(R) {
  const { a, box } = R; const W = box, H = box, N = W * H;
  const lab = new Int32Array(N).fill(-1);
  const comps = [];
  for (let i = 0; i < N; i++) {
    if (a[i] < 110 || lab[i] >= 0) continue;
    const id = comps.length, st = [i]; lab[i] = id;
    let n = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; const px = [];
    while (st.length) {
      const j = st.pop(); px.push(j); n++;
      const x = j % W, y = (j / W) | 0; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx; if (a[k] >= 110 && lab[k] < 0) { lab[k] = id; st.push(k); }
      }
    }
    comps.push({ id, n, cx: sx / n, cy: sy / n, bb: [x0, y0, x1, y1], px });
  }
  // left radical? look for a near-empty column band between 25 % and 52 % of the ink box
  const [bx0, by0, bx1, by1] = R.bb; const bw = Math.max(1, bx1 - bx0), bh = Math.max(1, by1 - by0);
  const colSum = new Float32Array(W);
  for (let i = 0; i < N; i++) if (a[i] >= 110) colSum[i % W]++;
  let mean = 0; for (let x = bx0; x <= bx1; x++) mean += colSum[x]; mean /= bw + 1;
  let split = -1, best = 1e9;
  for (let x = Math.round(bx0 + bw * 0.25); x <= Math.round(bx0 + bw * 0.52); x++) { const v = colSum[x] + colSum[x - 1] + colSum[x + 1]; if (v < best) { best = v; split = x; } }
  if (best / 3 > mean * 0.22) split = -1;
  for (const c of comps) {
    const left = split > 0 && c.cx < split ? 0 : 1;
    c.key = (split > 0 ? left * 10 : 0) + (c.bb[1] - by0) / bh + 0.28 * (c.bb[0] - bx0) / bw;
  }
  comps.sort((p, q) => p.key - q.key);
  // geodesic time inside each component, from its starting end
  const dist = new Int32Array(N).fill(1 << 29);
  let T = 0; const tStart = []; const gap = box * 0.06;
  for (const c of comps) {
    const w = c.bb[2] - c.bb[0] + 1, h = c.bb[3] - c.bb[1] + 1;
    const ay = 0.3 + 0.7 * h / (w + h), bx = 0.7 * w / (w + h);
    let s = c.px[0], sb = 1e9;
    for (const j of c.px) { const sc = ((j / W) | 0) * ay + (j % W) * bx; if (sc < sb) { sb = sc; s = j; } }
    c.maxD = Math.max(5, geodesic(null, dist, W, H, s, c.id, lab)) / 5;   // in px
    const len = c.maxD + Math.sqrt(c.n) * 0.15;                              // tiny dots still take a moment
    tStart.push(T); c.t0 = T; c.len = len; T += len + gap;
  }
  T = Math.max(1, T - gap);
  // time per pixel (glyph-normalised), local time along the component
  const tm = new Float32Array(N).fill(-1), loc = new Float32Array(N);
  for (const c of comps) for (const j of c.px) { const l = dist[j] / 5 / c.maxD; loc[j] = l; tm[j] = (c.t0 + l * c.len) / T; }
  // propagate time outward over the anti-aliased edge and a bleed radius (multi-source BFS)
  const rad = Math.max(4, Math.round(box * 0.035));
  let front = []; const depth = new Int16Array(N);
  for (let i = 0; i < N; i++) if (tm[i] >= 0) front.push(i);
  for (let r = 1; r <= rad && front.length; r++) {
    const nf = [];
    for (const i of front) {
      const x = i % W, y = (i / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (tm[j] >= 0) continue;
        tm[j] = tm[i]; loc[j] = loc[i]; depth[j] = r; nf.push(j);
      }
    }
    front = nf;
  }
  // the brush tip's path: centroid of the newest ink at 40 moments
  const NT = 40, track = [];
  for (let k = 0; k < NT; k++) {
    const tau = (k + 0.5) / NT; let sx = 0, sy = 0, sw = 0;
    for (const c of comps) {
      const c0 = c.t0 / T, c1 = (c.t0 + c.len) / T;
      if (tau < c0 - 0.03 || tau > c1 + 0.03) continue;
      for (let q = 0; q < c.px.length; q += 3) { const j = c.px[q]; const dt = tau - tm[j]; if (dt >= 0 && dt < 0.05) { const w = 1 - dt / 0.05; sx += (j % W) * w; sy += ((j / W) | 0) * w; sw += w; } }
    }
    track.push(sw > 0 ? [sx / sw, sy / sw, 1] : null);
  }
  for (let k = 0; k < NT; k++) if (!track[k]) {           // pen lifts: glide between the strokes
    let a0 = k - 1; while (a0 >= 0 && (!track[a0] || track[a0][2] === 0)) a0--;
    let a1 = k + 1; while (a1 < NT && (!track[a1] || track[a1][2] === 0)) a1++;
    const A0 = a0 >= 0 ? track[a0] : (a1 < NT ? track[a1] : [box / 2, box / 2]), A1 = a1 < NT ? track[a1] : A0;
    const f = a1 > a0 ? (k - a0) / (a1 - a0) : 0;
    track[k] = [A0[0] + (A1[0] - A0[0]) * f, A0[1] + (A1[1] - A0[1]) * f, 0];
  }
  let ink = 0; for (const c of comps) ink += c.n;
  return { tm, loc, track, T, ink, nComp: comps.length };
}

// glyphs: [{ch, x, y, size, font}] (x, y: where the INK BOX centre goes, page px). rect: {x, y, w, h} page area of the texture.
export function bakeGlyphs(key, glyphs, rect, scale = 1, font = 'T2Brush') {
  if (bakeCache.has(key)) return bakeCache.get(key);
  const W = Math.ceil(rect.w * scale), H = Math.ceil(rect.h * scale);
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { data[i * 4 + 1] = 255; data[i * 4 + 3] = 255; }
  const meta = [];
  glyphs.forEach((g, gi) => {
    const s = g.size * scale;
    const R = rasterGlyph(g, s, g.font || font);
    const A = analyseGlyph(R);
    const [x0, y0, x1, y1] = R.bb;
    const icx = (x0 + x1) / 2, icy = (y0 + y1) / 2;
    const ox = Math.round((g.x - rect.x) * scale - icx), oy = Math.round((g.y - rect.y) * scale - icy);
    for (let y = 0; y < R.box; y++) {
      const Y = oy + y; if (Y < 0 || Y >= H) continue;
      for (let x = 0; x < R.box; x++) {
        const X = ox + x; if (X < 0 || X >= W) continue;
        const i = y * R.box + x; if (A.tm[i] < 0) continue;
        const o = (Y * W + X) * 4;
        if (data[o + 3] !== 255 && data[o] >= R.a[i]) continue;
        data[o] = R.a[i]; data[o + 1] = Math.round(clamp(A.tm[i]) * 254); data[o + 2] = Math.round(clamp(A.loc[i]) * 255); data[o + 3] = gi;
      }
    }
    const toPage = ([x, y, d]) => [rect.x + (ox + x) / scale, rect.y + (oy + y) / scale, d];
    meta.push({ ...g, track: A.track.map(toPage), weight: A.ink / (s * s), nComp: A.nComp,
      box: [rect.x + (ox + x0) / scale, rect.y + (oy + y0) / scale, rect.x + (ox + x1) / scale, rect.y + (oy + y1) / scale] });
  });
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.NoColorSpace; tex.flipY = false;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const out = { tex, meta, rect, W, H, scale };
  bakeCache.set(key, out);
  return out;
}

// where the brush tip is on glyph m at progress p (0..1): [x, y, down (1 on the paper, 0 lifted)]
export function tipAt(m, p) {
  const tr = m.track, n = tr.length;
  const f = clamp(p) * n - 0.5, i = Math.max(0, Math.min(n - 1, Math.floor(f))), j = Math.min(n - 1, i + 1), u = clamp(f - i);
  return [tr[i][0] + (tr[j][0] - tr[i][0]) * u, tr[i][1] + (tr[j][1] - tr[i][1]) * u, tr[i][2] + (tr[j][2] - tr[i][2]) * u];
}

// ------------------------------------------------------------------ the seal
const sealCache = new Map();
// chars in reading order (right column top-down, then left column): e.g. '真元妙道'. Returns a texture: r = paste density
export function bakeSeal(chars = '真元妙道', px = 256, seed = 7, font = 'T2Brush') {
  const key = `${chars}|${px}|${seed}`;
  if (sealCache.has(key)) return sealCache.get(key);
  const cv = document.createElement('canvas'); cv.width = px; cv.height = px;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.fillStyle = '#fff'; c.fillRect(0, 0, px, px);
  const m = px * 0.035, R = rng(seed);
  // the stone's outline: a square, its corners worn
  c.fillStyle = '#000'; c.beginPath();
  const pts = [];
  for (let side = 0; side < 4; side++) for (let k = 0; k < 12; k++) {
    const f = k / 12, j = (R() - 0.5) * px * 0.012;
    const [x, y] = side === 0 ? [m + f * (px - 2 * m), m + j] : side === 1 ? [px - m + j, m + f * (px - 2 * m)] : side === 2 ? [px - m - f * (px - 2 * m), px - m + j] : [m + j, px - m - f * (px - 2 * m)];
    pts.push([x, y]);
  }
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
  // the characters, carved out: each stretched to fill its quarter (seal style), with a fine border left standing
  const q = (px - 2 * m) / 2, inner = px * 0.075;
  const cells = [[1, 0], [1, 1], [0, 0], [0, 1]];       // right column first (top, bottom), then left
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = Math.round(q * 2);
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  [...chars].slice(0, 4).forEach((ch, i) => {
    tc.clearRect(0, 0, tmp.width, tmp.height);
    tc.font = `400 ${q * 1.1}px ${font}`; tc.textAlign = 'center'; tc.textBaseline = 'middle'; tc.fillStyle = '#fff';
    tc.lineJoin = 'miter'; tc.strokeStyle = '#fff'; tc.lineWidth = q * 0.035;
    tc.fillText(ch, tmp.width / 2, tmp.height / 2); tc.strokeText(ch, tmp.width / 2, tmp.height / 2);
    const d = tc.getImageData(0, 0, tmp.width, tmp.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let k = 0; k < tmp.width * tmp.height; k++) if (d[k * 4 + 3] > 40) { const x = k % tmp.width, y = (k / tmp.width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const [cx, cy] = cells[i];
    const X = m + inner * 0.6 + cx * (q - inner * 0.1), Y = m + inner * 0.6 + cy * (q - inner * 0.1), S = q - inner * 1.05;
    c.drawImage(tmp, x0, y0, x1 - x0 + 1, y1 - y0 + 1, X, Y, S, S);
  });
  // paste: knock-outs are white (the canvas drew white chars over black); now density = 1 - luminance, then wear
  const img = c.getImageData(0, 0, px, px); const d = img.data;
  const den = new Float32Array(px * px);
  for (let k = 0; k < px * px; k++) den[k] = 1 - d[k * 4] / 255;
  const out = new Uint8Array(px * px * 4);
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
    const k = y * px + x;
    let v = den[k];
    // uneven paste and pressure: low-frequency mottle, fine speckled voids where the paper's tooth didn't take the paste
    const n1 = hash2(Math.floor(x / 9) + seed, Math.floor(y / 9)) * 0.5 + hash2(Math.floor(x / 23), Math.floor(y / 23) + seed) * 0.5;
    const sp = hash2(x * 1.37 + seed, y * 0.91);
    v *= 0.82 + 0.18 * n1;
    if (sp > 0.985) v *= 0.25;
    // chips along the outer edge
    const e = Math.min(x, y, px - 1 - x, px - 1 - y);
    if (e < m + px * 0.03 && hash2(Math.floor(x / 5) * 3.1 + seed, Math.floor(y / 5) * 1.7) > 0.93) v *= 0.15;
    out[k * 4] = Math.round(clamp(v) * 255); out[k * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(out, px, px, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.NoColorSpace; tex.flipY = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  sealCache.set(key, tex);
  return tex;
}

// ------------------------------------------------------------------ the brush (objects canvas: real colours, alpha = occlusion)
// o: {len (520), ang (rad from vertical, + = handle to the upper right), lift (0..1: tip raised: the shadow separates), load (ink on the tip)}
export function drawBrush(c, x, y, o = {}) {
  const L = o.len ?? 520, ang = o.ang ?? 0.42, lift = o.lift ?? 0;
  const ux = Math.sin(ang), uy = -Math.cos(ang);          // tip -> end of the handle
  const nx = -uy, ny = ux;
  const P = (s, w) => [x + ux * s + nx * w, y + uy * s + ny * w];
  const poly = (pts) => { c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath(); };
  const tL = L * 0.2, fL = L * 0.06, hw = L * 0.017, tw = L * 0.036;
  const outline = (s0, s1, w0, w1) => [P(s0, -w0), P(s1, -w1), P(s1, w1), P(s0, w0)];
  // shadow on the paper (the brush is above it; the further from the tip, the further the shadow falls)
  c.save();
  c.globalAlpha = 0.11;
  c.fillStyle = 'rgb(20,16,12)';
  c.filter = 'blur(10px)';
  const sd = 0.09 + lift * 0.05;
  c.beginPath();
  c.moveTo(x + 6 * lift, y + 4 * lift);
  c.lineTo(x + ux * L + sd * L, y + uy * L * 0.92 + sd * L * 0.6 - hw);
  c.lineTo(x + ux * L + sd * L + hw * 2, y + uy * L * 0.92 + sd * L * 0.6 + hw);
  c.closePath(); c.fill();
  c.restore();
  c.lineJoin = 'round'; c.lineCap = 'round';
  // handle: pale bamboo in a light wash with a fine ink outline, node rings
  const hx0 = tL + fL, hx1 = L;
  poly(outline(hx0, hx1, hw * 1.08, hw * 0.92));
  const g = c.createLinearGradient(...P(0, -hw), ...P(0, hw));
  g.addColorStop(0, 'rgb(186,170,138)'); g.addColorStop(0.35, 'rgb(222,210,182)'); g.addColorStop(1, 'rgb(150,134,104)');
  c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgb(18,16,14)'; c.lineWidth = Math.max(2, L * 0.0045); c.stroke();
  for (const f of [0.42, 0.74]) {
    const s = hx0 + (hx1 - hx0) * f, w = hw * (1.08 - 0.16 * f);
    c.beginPath(); c.moveTo(...P(s, -w)); c.lineTo(...P(s, w)); c.moveTo(...P(s + L * 0.008, -w)); c.lineTo(...P(s + L * 0.008, w)); c.stroke();
  }
  // end cap and cord loop
  poly(outline(hx1 - L * 0.025, hx1, hw * 0.95, hw * 0.9)); c.fillStyle = 'rgb(40,34,28)'; c.fill();
  c.beginPath(); const [ex, ey] = P(hx1 + L * 0.02, 0); c.ellipse(ex, ey, L * 0.018, L * 0.03, ang, 0, Math.PI * 2); c.lineWidth = Math.max(2, L * 0.004); c.stroke();
  // ferrule
  poly(outline(tL * 0.92, hx0, tw * 0.92, hw * 1.12)); c.fillStyle = 'rgb(58,50,42)'; c.fill(); c.lineWidth = Math.max(2, L * 0.0045); c.stroke();
  // the tuft: loaded with ink, swelling then drawn to a point at the paper
  c.beginPath();
  const N = 14; const side = [];
  for (let i = 0; i <= N; i++) { const f = i / N; const w = tw * Math.pow(Math.sin(Math.PI * 0.5 * Math.min(1, f * 1.25)), 0.8) * (1 - 0.12 * Math.max(0, f - 0.8) / 0.2); side.push([f * tL, w]); }
  side.forEach(([s, w], i) => { const [a, b] = P(s, w); i ? c.lineTo(a, b) : c.moveTo(a, b); });
  for (let i = side.length - 1; i >= 0; i--) { const [s, w] = side[i]; const [a, b] = P(s, -w * 0.96); c.lineTo(a, b); }
  c.closePath();
  const tg = c.createLinearGradient(...P(0, 0), ...P(tL, 0));
  tg.addColorStop(0, 'rgb(8,7,7)'); tg.addColorStop(0.55, 'rgb(14,13,12)'); tg.addColorStop(1, 'rgb(70,62,52)');
  c.fillStyle = tg; c.fill();
  // a wet highlight along the tuft
  c.strokeStyle = 'rgba(150,145,140,0.55)'; c.lineWidth = Math.max(1.5, L * 0.003);
  c.beginPath(); c.moveTo(...P(tL * 0.25, tw * 0.25)); c.quadraticCurveTo(...P(tL * 0.55, tw * 0.45), ...P(tL * 0.85, tw * 0.4)); c.stroke();
}

// ------------------------------------------------------------------ splatter
// deterministic list of drops flying out of (cx, cy). o: {n (70), reach (620), red (0.22: share of cinnabar drops), seed}
export function splatter(seed, cx, cy, o = {}) {
  const R = rng(seed * 7919 + 13);
  const n = o.n ?? 70, reach = o.reach ?? 620, red = o.red ?? 0.22;
  const drops = [];
  for (let i = 0; i < n; i++) {
    const ang = R() * Math.PI * 2;
    const far = Math.pow(R(), 0.75);
    const dist = 40 + reach * far * (0.6 + 0.6 * R());
    const r = (4 + 26 * Math.pow(R(), 2.2)) * (1.15 - 0.7 * far);
    const speed = 2200 + 2600 * R();
    drops.push({ x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist * 0.82, ang, dist, r, delay: dist / speed,
      tail: R() < 0.55 ? (0.4 + 1.8 * R()) * r : 0, red: R() < red, sat: Math.floor(R() * 4), s: R() * 1000 });
  }
  // mist: many tiny specks
  for (let i = 0; i < (o.mist ?? 160); i++) {
    const ang = R() * Math.PI * 2, dist = 60 + reach * 1.15 * Math.sqrt(R());
    drops.push({ x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist * 0.82, ang, dist, r: 1.2 + 2.4 * R(), delay: dist / 3800, tail: 0, red: R() < red * 0.6, sat: 0, s: R() * 1000, mist: true });
  }
  return drops;
}

// the central splash: an irregular lobed blob (closed form in age)
export function blobPath(c, cx, cy, r, seed, lobes = 15) {
  c.beginPath();
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    let k = 1;
    for (let l = 0; l < 3; l++) k += (hash1(seed + l * 9.7) - 0.3) * 0.22 * Math.sin(a * (lobes * (l + 1) * 0.5 + l) + hash1(seed + l) * 6.28);
    // fingers: a few long spikes
    const sp = Math.pow(Math.max(0, Math.cos(a * 7 + seed)), 12) * 0.18 + Math.pow(Math.max(0, Math.cos(a * 11 + seed * 2.3)), 16) * 0.12;
    const rr = r * (k + sp);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.86;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

// canvas colour for ink marks on a "white = no ink" channel canvas: r = 1 - wash, g = 1 - solid ink, b = 1 - cinnabar
export function inkc(wash = 0, solid = 0, red = 0, a = 1) {
  const q = (v) => Math.round(255 * (1 - clamp(v)));
  return `rgba(${q(wash)},${q(solid)},${q(red)},${a})`;
}

// ------------------------------------------------------------------ textures from URLs (p.imgs / p.img)
const texCache = new Map();
export function loadTex(url) {
  if (!url) return Promise.resolve(null);
  if (url.isTexture) return Promise.resolve(url);
  if (!texCache.has(url)) {
    texCache.set(url, new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; res(t); }, undefined, rej)));
  }
  return texCache.get(url);
}

// a canvas + texture pair of a given size (design px * scale)
export function makeCanvas(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.premultiplyAlpha = false;
  return { cv, c, tex };
}

export { smooth, range };
