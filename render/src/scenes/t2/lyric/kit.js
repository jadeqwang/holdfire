// Take two, "lyric" group: the toolkit under render/src/lyrics2.js (the in-world lyric layer, docs/take2/LYRICS.md).
// Canvas2D only, drawn into the engine's type canvas (design px, 1920x1080, scaled by S). Everything here is a pure function
// of (song time, inputs): patterns are seeded and baked once, nothing reads the clock.
//   fonts      the faces this group adds (OFL, assets/fonts/OFL-*.txt), loaded by the group's init
//   scratch    pooled CPU canvases (the type canvas is CPU-backed; GPU scratch would force readbacks)
//   warpQuad   corner pin: draw a canvas block onto a quad (projective, as a mesh of affine triangles; affine when the quad is a
//              parallelogram, so the common case is a single drawImage)
//   layout     word rows inside a width, forced breaks, alignment
//   wordState  per-word timing state: before (ghost), the reveal, the hot flash after the onset
//   patterns   paper grain, halftone dots, scanlines (tiles baked once)
import { clamp, hash1, hash2 } from '../../../util.js';

// ------------------------------------------------------------------------------------------------ fonts
export const FONTS2 = [
  ['L2Anton', 'assets/fonts/Anton-Regular.ttf', {}],                       // poster, impact, war display
  ['L2VT', 'assets/fonts/VT323-Regular.ttf', {}],                          // CRT text mode, VHS OSD
  ['L2Hand', 'assets/fonts/ReenieBeanie.ttf', {}],                         // chalk / pencil on the scoresheet
  ['L2Brush', 'assets/fonts/MaShanZheng-latin-subset.ttf', {}],            // brushed English (Ma Shan Zheng's Latin)
  ['L2Fell', 'assets/fonts/IMFeENrm28P.ttf', {}],                          // engraved / etched serif
  ['L2FellI', 'assets/fonts/IMFeENit28P.ttf', {}],
  ['L2Inst', 'assets/fonts/InstrumentSerif-Regular.ttf', {}],              // light in the sky, the mirror
  ['L2InstI', 'assets/fonts/InstrumentSerif-Italic.ttf', {}],
  ['L2Board', 'assets/fonts/BigShouldersDisplay-VF.ttf', { weight: '100 900' }],   // factory safety board
];
let fontsP = null;
export function loadLyricFonts() {
  if (!fontsP) {
    fontsP = Promise.all(FONTS2.map(async ([name, url, desc]) => {
      const f = new FontFace(name, `url(${url})`, desc);
      await f.load(); document.fonts.add(f);
    })).then(() => true);
  }
  return fontsP;
}
// family aliases used by the plan (type.js faces + this group's)
export const FAM = {
  archivo: 'Archivo', open: 'OpenSans', plex: 'PlexM', plexR: 'Plex', michroma: 'Michroma', corm: 'Cormorant', cormI: 'CormorantI',
  anton: 'L2Anton', vt: 'L2VT', hand: 'L2Hand', brush: 'L2Brush', fell: 'L2Fell', fellI: 'L2FellI', inst: 'L2Inst', instI: 'L2InstI', board: 'L2Board',
};
const ST = { '62%': 'extra-condensed', '75%': 'condensed', '87.5%': 'semi-condensed', '100%': 'normal', '112.5%': 'semi-expanded', '125%': 'expanded' };
export function setFont(g, f) {
  g.font = `${f.italic ? 'italic ' : ''}${f.weight || 400} ${f.px}px ${FAM[f.family] || f.family}`;
  try { g.fontStretch = ST[f.stretch] || f.stretch || 'normal'; } catch (e) { /* */ }
  g.letterSpacing = `${(f.track || 0) * f.px}px`;
}

// ------------------------------------------------------------------------------------------------ scratch canvases
const pool = new Map();
export function scratch(name, w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  let c = pool.get(name);
  if (!c) { c = document.createElement('canvas'); c.g = c.getContext('2d', { willReadFrequently: true }); pool.set(name, c); }
  if (c.width < w || c.height < h || c.width > w * 2 + 64 || c.height > h * 2 + 64) { c.width = w; c.height = h; }
  const g = c.g;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)'; g.shadowOffsetX = 0; g.shadowOffsetY = 0; g.setLineDash([]); g.letterSpacing = '0px';
  g.clearRect(0, 0, c.width, c.height);
  c.w = w; c.h = h;
  return c;
}

// ------------------------------------------------------------------------------------------------ corner pin
function homography(q) {   // unit square -> quad (TL, TR, BR, BL)
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g7 = (sx * dy2 - dx2 * sy) / den, h8 = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g7 * x1, b = x3 - x0 + h8 * x3, c = x0, d = y1 - y0 + g7 * y1, e = y3 - y0 + h8 * y3, f = y0;
  return (u, v) => { const w = g7 * u + h8 * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
}
export function isParallelogram(q, tol = 0.75) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  return Math.abs((x0 + x2) - (x1 + x3)) < tol && Math.abs((y0 + y2) - (y1 + y3)) < tol;
}
// draw src (its region sw x sh, canvas px) onto quad (design px, in g's current transform)
export function warpQuad(g, src, quad, { nx = 10, ny = 4, sw = src.w || src.width, sh = src.h || src.height } = {}) {
  if (isParallelogram(quad)) {
    const [[x0, y0], [x1, y1], , [x3, y3]] = quad;
    g.save(); g.transform((x1 - x0) / sw, (y1 - y0) / sw, (x3 - x0) / sh, (y3 - y0) / sh, x0, y0);
    g.drawImage(src, 0, 0, sw, sh, 0, 0, sw, sh); g.restore(); return;
  }
  const H = homography(quad), P = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) P.push(H(i / nx, j / ny));
  const tri = (s0, s1, s2, d0, d1, d2) => {
    const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2, [u0, v0] = d0, [u1, v1] = d1, [u2, v2] = d2;
    const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1); if (Math.abs(den) < 1e-9) return;
    const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den, b = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
    const c = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
    const d = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den, e = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
    const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
    const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
    const gr = (p) => { const dx = p[0] - cx, dy = p[1] - cy, m = Math.hypot(dx, dy) || 1; return [p[0] + dx / m * 0.7, p[1] + dy / m * 0.7]; };
    const A = gr(d0), B = gr(d1), C = gr(d2);
    g.save(); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.closePath(); g.clip();
    g.transform(a, d, b, e, c, f); g.drawImage(src, 0, 0); g.restore();
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const s = (ii, jj) => [ii / nx * sw, jj / ny * sh], d = (ii, jj) => P[jj * (nx + 1) + ii];
    tri(s(i, j), s(i + 1, j), s(i + 1, j + 1), d(i, j), d(i + 1, j), d(i + 1, j + 1));
    tri(s(i, j), s(i + 1, j + 1), s(i, j + 1), d(i, j), d(i + 1, j + 1), d(i, j + 1));
  }
}
// a quad that holds a w x h block: the block's aspect is kept and it is fitted to the quad's width (the quad gives the plane;
// align 'center' | 'left' places it inside, vAlign 'top' | 'middle' | 'bottom')
export function fitInQuad(quad, w, h, align = 'center', vAlign = 'middle') {
  const H = homography(quad);
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const qw = (Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x3, y2 - y3)) / 2, qh = (Math.hypot(x3 - x0, y3 - y0) + Math.hypot(x2 - x1, y2 - y1)) / 2;
  const k = Math.min(qw / w, qh / h);
  const uw = (w * k) / qw, vh = (h * k) / qh;
  const u0 = align === 'left' ? 0 : align === 'right' ? 1 - uw : (1 - uw) / 2;
  const v0 = vAlign === 'top' ? 0 : vAlign === 'bottom' ? 1 - vh : (1 - vh) / 2;
  return [H(u0, v0), H(u0 + uw, v0), H(u0 + uw, v0 + vh), H(u0, v0 + vh)];
}
// transform a quad by a plate's centred zoom + pan (the t2_plate convention: zoom about (960, 540), then pan)
export function zoomQuad(q, zoom = 1, pan = [0, 0]) {
  return q.map(([x, y]) => [960 + (x - 960) * zoom + pan[0], 540 + (y - 540) * zoom + pan[1]]);
}

// ------------------------------------------------------------------------------------------------ layout
// words: [{text, ...}] -> rows [{items: [{w, x, width}], width}]; g has the font set. breaks: indices that start a new row.
export function layout(g, words, maxW, space, breaks = []) {
  const rows = [{ items: [], width: 0 }];
  words.forEach((w, i) => {
    const width = g.measureText(w.text).width;
    let R = rows[rows.length - 1];
    const forced = breaks.includes(i) && R.items.length;
    if (forced || (R.items.length && R.width + space + width > maxW)) { R = { items: [], width: 0 }; rows.push(R); }
    const x = R.items.length ? R.width + space : 0;
    R.items.push({ w, x, width }); R.width = x + width;
  });
  return rows.filter((r) => r.items.length);
}

// ------------------------------------------------------------------------------------------------ word timing state
// lead: the word begins to arrive this long before its onset (the eye needs the word on or before the voice)
export function wordState(w, t, o = {}) {
  const lead = o.lead ?? 0.04, rev = o.rev ?? 0.18;
  const dur = Math.max(0.12, (w.end ?? w.t + 0.3) - w.t);
  const u = (t - (w.t - lead)) / rev;
  return {
    pre: u <= 0,
    k: clamp(u),                                        // reveal 0..1
    write: clamp((t - (w.t - lead)) / Math.min(o.writeMax ?? 0.32, Math.max(0.1, dur))),   // a writing/typing sweep over the sung duration
    hot: t < w.t - lead ? 0 : Math.exp(-Math.max(0, t - w.t) / (o.hotDecay ?? 0.3)),        // 1 at the onset, decaying
    sung: t >= w.t && t < (w.end ?? w.t + 0.3) + 0.05,
    f: Math.floor((t - w.t + lead) * 24),               // film frames since it began (twos-friendly)
    dur,
  };
}

// ------------------------------------------------------------------------------------------------ patterns (baked once)
const tiles = {};
function tile(name, size, fill) {
  if (!tiles[name]) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const q = c.getContext('2d', { willReadFrequently: true }); const im = q.createImageData(size, size);
    fill(im.data, size); q.putImageData(im, 0, 0); tiles[name] = c;
  }
  return tiles[name];
}
// alpha holes where a dry tool skips the surface (pencil, chalk, dry brush, worn print)
export function grainTile() {
  return tile('grain', 256, (d, n) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = hash2(x * 0.731 + 3, y * 1.37 + 11), streak = 0.5 + 0.5 * Math.sin((x * 0.9 + y * 0.35) * 0.8 + hash1(Math.floor(y / 3) + 5) * 6);
      d[(y * n + x) * 4 + 3] = Math.round(clamp((v * 0.75 + streak * 0.45 - 0.62) * 2.2) * 255);
    }
  });
}
// mottle: low-frequency ink density (riso, worn enamel)
export function mottleTile() {
  return tile('mottle', 256, (d, n) => {
    const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; const h = (a, b) => hash2(((a % 16) + 16) % 16, ((b % 16) + 16) % 16);
      const s = (t) => t * t * (3 - 2 * t); return (h(xi, yi) * (1 - s(fx)) + h(xi + 1, yi) * s(fx)) * (1 - s(fy)) + (h(xi, yi + 1) * (1 - s(fx)) + h(xi + 1, yi + 1) * s(fx)) * s(fy); };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const m = v(x / 16, y / 16) * 0.6 + v(x / 5.3, y / 5.3) * 0.25 + hash2(x + 0.5, y + 0.25) * 0.15;
      d[(y * n + x) * 4 + 3] = Math.round(clamp((m - 0.45) * 1.6) * 255);
    }
  });
}
// halftone dots at 45 degrees (a riso screen); alpha = dot
export function dotsTile(cell = 7) {
  return tile(`dots${cell}`, cell * 16, (d, n) => {
    const c = cell, r = c * 0.42;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = (x + y) / Math.SQRT2, v = (x - y) / Math.SQRT2;
      const fu = ((u % c) + c) % c - c / 2, fv = ((v % c) + c) % c - c / 2;
      d[(y * n + x) * 4 + 3] = Math.round(clamp(r - Math.hypot(fu, fv) + 0.5) * 255);
    }
  });
}
// scanlines: one dark line every `period` output px
export function scanTile(period = 3) {
  return tile(`scan${period}`, 64, (d, n) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) d[(y * n + x) * 4 + 3] = (y % period === period - 1) ? 255 : 0;
  });
}
// fill a rect of g with a pattern in destination-out (knock out alpha), in g's pixel space
export function knock(g, pat, alpha, w, h) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = alpha;
  g.fillStyle = g.createPattern(pat, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
}
export function maskIn(g, pat, w, h) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in';
  g.fillStyle = g.createPattern(pat, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
}

export const rgba = (c, a = 1) => (typeof c === 'string' ? c : `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`);
export const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
