// Shared helpers for the take-two "fx" group (gold line art and light painted over plates, the mirror, the end card).
import { clamp } from '../../../util.js';

// Follow a t2_plate / t2_still camera so an overlay stays locked to the picture under it. o: {zoom (1), push (0, zoom growth per
// second, as t2_plate), pan [x, y] (design px)}. Returns (x, y) -> [x', y'] in design px (the plate scales about the frame centre).
export function follow(o = {}, lt = 0) {
  const z = (o.zoom ?? 1) * (1 + (o.push || 0) * lt);
  const pan = o.pan || [0, 0];
  const f = (x, y) => [960 + pan[0] + (x - 960) * z, 540 + pan[1] + (y - 540) * z];
  f.z = z;
  return f;
}

// gold glow stroke: three passes (wide faint, mid, core) on a 'lighter' canvas
export function glowStroke(c, path, col, w = 3, a = 1, wide = 1) {
  const [r, g, b] = col.map((v) => Math.round(clamp(v) * 255));
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = `rgba(${r},${g},${b},${0.1 * a})`; c.lineWidth = w * 5 * wide; c.stroke(path);
  c.strokeStyle = `rgba(${r},${g},${b},${0.28 * a})`; c.lineWidth = w * 2.2 * wide; c.stroke(path);
  c.strokeStyle = `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},${a})`; c.lineWidth = w; c.stroke(path);
  c.restore();
}

export function glowDot(c, x, y, r, col, a = 1, halo = 4) {
  const [R, G, B] = col.map((v) => Math.round(clamp(v) * 255));
  const g = c.createRadialGradient(x, y, 0, x, y, r * halo);
  g.addColorStop(0, `rgba(${R},${G},${B},${0.55 * a})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * halo, 0, Math.PI * 2); c.fill();
  c.fillStyle = `rgba(${Math.min(255, R + 50)},${Math.min(255, G + 50)},${Math.min(255, B + 50)},${a})`;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

export const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
