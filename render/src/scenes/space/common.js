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
