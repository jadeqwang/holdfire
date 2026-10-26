// Shared helpers for the space scenes: lyric word times (so every scene re-times itself from data/timing.json), and
// small drawing utilities.
import { clamp } from '../../util.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' -]/g, '').trim();

// the k-th line whose text contains `sub` (case-insensitive)
export function lineBy(A, sub, k = 0) {
  const s = norm(sub);
  const ls = A.lines.filter((l) => norm(l.text).includes(s));
  return ls[k] || null;
}

// time of the `occ`-th occurrence of `word` in the line containing `sub`; `fb` if not found. which: 'start' | 'end'
export function wordT(A, sub, word, fb, occ = 0, lineK = 0, which = 'start') {
  const L = lineBy(A, sub, lineK);
  if (!L) return fb;
  const w = norm(word);
  const hits = L.words.filter((x) => norm(x.w) === w);
  const h = hits[occ];
  if (!h) return fb;
  const v = which === 'end' ? (h.end ?? h.t) : h.t;
  return Number.isFinite(v) ? v : fb;
}

export function lineT(A, sub, fb, lineK = 0, which = 'start') {
  const L = lineBy(A, sub, lineK);
  if (!L) return fb;
  const v = which === 'end' ? L.end : L.t;
  return Number.isFinite(v) ? v : fb;
}

// eighth-note grid (from timing.json; falls back to halving beats)
export function eighths(A) {
  if (A.__eighths) return A.__eighths;
  let e = (A.d && A.d.eighths) || [];
  e = e.map((x) => (typeof x === 'number' ? x : x.t)).filter((x) => Number.isFinite(x));
  if (!e.length) { e = []; for (let i = 0; i + 1 < A.beats.length; i++) { e.push(A.beats[i], (A.beats[i] + A.beats[i + 1]) / 2); } }
  A.__eighths = e;
  return e;
}
export function snapTo(grid, t) {
  let lo = 0, hi = grid.length - 1;
  if (hi < 0) return t;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (grid[m] <= t) lo = m; else hi = m; }
  return Math.abs(grid[lo] - t) < Math.abs(grid[hi] - t) ? grid[lo] : grid[hi];
}

// exponential decay envelope after an onset (0 before)
export const env = (t, t0, dec) => (t < t0 ? 0 : Math.exp(-(t - t0) / dec));
// attack-decay: rises over att, decays over dec
export const ad = (t, t0, att, dec) => (t < t0 ? 0 : t < t0 + att ? (t - t0) / att : Math.exp(-(t - t0 - att) / dec));
export const win = (t, a, b, fi = 0.2, fo = 0.2) => clamp((t - a) / fi) * clamp((b - t) / fo);

// resolve a param that may be given or derived
export const pick = (v, fb) => (v === undefined || v === null ? fb : v);

// ---- Canvas 2D batching (Skia on CPU is slow per stroke/fill call and per style string): segments and dots are
// bucketed by quantised colour/alpha/width into Path2D objects and drawn with one call per bucket.
import { css as cssP } from '../../palette.js';
export class Buckets {
  constructor(levels = 14) { this.L = levels; this.m = new Map(); }
  _get(col, a, w, kind) {
    const al = Math.round(Math.min(1, a) * this.L); if (al <= 0) return null;
    const wq = Math.round(w * 2) / 2;
    const key = `${kind}|${col.join(',')}|${al}|${wq}`;
    let b = this.m.get(key);
    if (!b) { b = { p: new Path2D(), col, a: al / this.L, w: wq, kind }; this.m.set(key, b); }
    return b;
  }
  sp(col, a, w) { const b = this._get(col, a, w, 's'); return b ? b.p : null; }
  fp(col, a) { const b = this._get(col, a, 0, 'f'); return b ? b.p : null; }
  line(x0, y0, x1, y1, col, a, w) { const b = this._get(col, a, w, 's'); if (b) { b.p.moveTo(x0, y0); b.p.lineTo(x1, y1); } }
  poly(pts, col, a, w) { const b = this._get(col, a, w, 's'); if (!b || pts.length < 2) return; b.p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) b.p.lineTo(pts[i][0], pts[i][1]); }
  dot(x, y, r, col, a) { const b = this._get(col, a, 0, 'f'); if (b) { b.p.moveTo(x + r, y); b.p.arc(x, y, r, 0, Math.PI * 2); } }
  rect(x, y, w, h, col, a) { const b = this._get(col, a, 0, 'f'); if (b) b.p.rect(x, y, w, h); }
  flush(c) {
    for (const b of this.m.values()) {
      if (b.kind === 's') { c.strokeStyle = cssP(b.col, b.a); c.lineWidth = b.w; c.stroke(b.p); }
      else { c.fillStyle = cssP(b.col, b.a); c.fill(b.p); }
    }
    this.m.clear();
  }
}
// a soft radial glow, pre-rendered once per colour; draw with c.globalAlpha and drawImage(s, x - r, y - r, 2r, 2r)
const SPR = new Map();
export function glowSprite(col, core = 0.0) {
  const key = col.join(',') + core;
  if (SPR.has(key)) return SPR.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const g = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, cssP(col, 1)); if (core > 0) g.addColorStop(core, cssP(col, 0.45)); g.addColorStop(1, cssP(col, 0));
  g2.fillStyle = g; g2.fillRect(0, 0, 64, 64);
  SPR.set(key, cv);
  return cv;
}
export function drawGlow(c, spr, x, y, r, a) { if (a <= 0.004 || r <= 0.3) return; c.globalAlpha = Math.min(1, a); c.drawImage(spr, x - r, y - r, 2 * r, 2 * r); c.globalAlpha = 1; }
