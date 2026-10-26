// The Other's script: circular logograms, built like the eye-spots on its wings (concentric rings, arcs, radial strokes).
// One glyph per English word (deterministic from the word), drawn as strokes so it can be revealed, glow and boil.
// Numbers are written as nested rings: one ring of n dots per digit (so the count is legible in their script too).
import { hash2, clamp } from './util.js';

function wordSeed(w) { let h = 2166136261; for (const ch of w.toUpperCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h % 100000; }

// draw one logogram centred at (cx, cy) of diameter size
export function drawGlyph(c, word, cx, cy, size, col, o = {}) {
  const sd = wordSeed(word) + (o.seed || 0) * 7919;
  const h = (k) => hash2(sd, k);
  const r = size * 0.46;
  const rev = clamp(o.reveal ?? 1);
  c.save();
  c.translate(cx, cy);
  c.rotate((h(99) - 0.5) * 0.6);
  c.strokeStyle = col; c.fillStyle = col;
  c.lineWidth = Math.max(1, size * (o.lw || 0.055)); c.lineCap = 'round';
  // outer ring with 1-2 gaps
  const nGap = 1 + Math.floor(h(1) * 2);
  const a0 = h(2) * Math.PI * 2;
  const seg = (Math.PI * 2) / nGap;
  for (let i = 0; i < nGap; i++) {
    const s = a0 + i * seg, e = s + seg * (0.62 + 0.3 * h(3 + i));
    c.beginPath(); c.arc(0, 0, r, s, s + (e - s) * rev); c.stroke();
  }
  // inner arcs (1-3 concentric partial rings)
  const nIn = 1 + Math.floor(h(10) * 3);
  for (let i = 0; i < nIn; i++) {
    const rr = r * (0.35 + 0.42 * (i + 1) / (nIn + 1));
    const s = h(11 + i) * Math.PI * 2, span = Math.PI * (0.35 + 1.3 * h(15 + i));
    c.beginPath(); c.arc(0, 0, rr, s, s + span * rev); c.stroke();
  }
  // radial strokes crossing the ring
  const nR = Math.floor(h(20) * 4);
  for (let i = 0; i < nR; i++) {
    const a = h(21 + i) * Math.PI * 2, l0 = r * (0.25 + 0.4 * h(25 + i)), l1 = r * (1.0 + 0.22 * h(29 + i));
    const l = l0 + (l1 - l0) * rev;
    c.beginPath(); c.moveTo(Math.cos(a) * l0, Math.sin(a) * l0); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke();
  }
  // a pupil (filled dot) or an iris ring
  if (h(40) > 0.45) { c.beginPath(); c.arc((h(41) - 0.5) * r * 0.3, (h(42) - 0.5) * r * 0.3, size * 0.07 * rev, 0, Math.PI * 2); c.fill(); }
  else { c.beginPath(); c.arc(0, 0, r * 0.16, 0, Math.PI * 2 * rev); c.stroke(); }
  // satellites (small dots on the ring)
  const nD = Math.floor(h(50) * 4);
  for (let i = 0; i < nD; i++) {
    const a = h(51 + i) * Math.PI * 2;
    c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, size * 0.045 * rev, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// a number as nested rings of dots: units innermost
export function drawNumberGlyph(c, n, cx, cy, size, col, o = {}) {
  const digits = String(n).split('').reverse().map(Number);
  const rev = clamp(o.reveal ?? 1);
  c.save(); c.translate(cx, cy);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(1, size * 0.03);
  c.beginPath(); c.arc(0, 0, size * 0.5, 0, Math.PI * 2 * rev); c.stroke();
  digits.forEach((d, k) => {
    const rr = size * (0.16 + 0.13 * k);
    for (let i = 0; i < d; i++) {
      if (i / Math.max(1, d) > rev) break;
      const a = -Math.PI / 2 + (i / d) * Math.PI * 2;
      c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, size * 0.035, 0, Math.PI * 2); c.fill();
    }
    if (d === 0) { c.beginPath(); c.arc(0, 0, rr, 0, Math.PI * 2 * rev); c.stroke(); }
  });
  c.restore();
}

// a phrase: one glyph per word, laid left to right; returns width
export function drawGlyphWord(c, phrase, x, y, size, col, o = {}) {
  const words = String(phrase).split(/\s+/).filter(Boolean);
  let cx = x + size / 2;
  words.forEach((w, i) => {
    const rev = clamp((o.reveal ?? 1) * words.length - i);
    if (rev <= 0) return;
    if (/^\d+$/.test(w)) drawNumberGlyph(c, Number(w), cx, y, size, col, { reveal: rev });
    else drawGlyph(c, w, cx, y, size, col, { reveal: rev, seed: o.seed, lw: o.lw });
    cx += size * 1.18;
  });
  return cx - x - size * 0.18;
}
