// The matched posters (adversary plan part two E, Jade, 29 Oct): one composition, two palettes, the same slogan on both. The race
// logic in three words, BEFORE THEY DO, reads equally as the bomb, the Moon or the model: a figure on a gantry points at one star,
// and behind it a curve climbs steeply off the top of the sheet (a rocket's trajectory to one viewer, a capability chart to another).
// Printed like the Arkhipov poster (cream stock, black, one colour, a coarse halftone), in Jade's orange or teal-tips' teal. No
// country, no flag, no organisation. Drawn into an offscreen canvas (posterCanvas) that scenes map onto a wall, window or frame.
//   posterCanvas(side) -> canvas 600 x 840; side 'jade' | 'teal'
//   drawGraph(g, x, y, w, h, col): the poster's curve alone (axes, the steep climb with its ticks, the star), as a display draws it
import { LABEL_COL } from './labels.js';

const CACHE = new Map();
const curveY = (u) => Math.pow(u, 3.2);   // the poster's climb: flat, then steeply off the top
const CREAM = '#efe6d2', INK = '#121212';

function halftone(g, x0, y0, w, h, col, k0, k1, cell = 9) {   // dots growing from k0 (top) to k1 (bottom) of the cell
  g.fillStyle = col;
  for (let y = y0; y < y0 + h; y += cell) for (let x = x0 + ((y / cell) % 2) * cell / 2; x < x0 + w; x += cell) {
    const k = k0 + (k1 - k0) * (y - y0) / h, r = cell * 0.5 * Math.sqrt(Math.max(0, k));
    if (r > 0.3) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }
}

export function posterCanvas(side) {
  if (CACHE.has(side)) return CACHE.get(side);
  const W = 600, H = 840, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), col = LABEL_COL[side];
  g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
  // the colour field: a wedge rising from the lower left, halftoned toward the top
  g.save(); g.beginPath(); g.moveTo(0, H); g.lineTo(0, 300); g.lineTo(W, 40); g.lineTo(W, H); g.closePath(); g.clip();
  g.fillStyle = col; g.fillRect(0, 0, W, H); halftone(g, 0, 0, W, H, CREAM, 0.55, 0.0, 10); g.restore();
  // the curve: flat, then climbing steeply off the top (a trajectory / a capability chart), with tick marks along it
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, 600);
  for (let i = 0; i <= 40; i++) { const u = i / 40, x = 40 + u * 520, y = 600 - 560 * curveY(u); g.lineTo(x, y); }
  g.stroke();
  g.lineWidth = 5;
  for (let i = 1; i < 8; i++) { const u = i / 8, x = 40 + u * 520, y = 600 - 560 * curveY(u); g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke(); }
  // the star it points at
  g.fillStyle = INK; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 16 : 40; g.lineTo(505 + Math.cos(a) * r, 92 + Math.sin(a) * r); }
  g.closePath(); g.fill();
  // the gantry: a lattice tower, and the figure on its top platform pointing up at the star
  g.lineWidth = 6;
  const gx = 120, top = 430, base = 690;
  g.beginPath(); g.moveTo(gx, base); g.lineTo(gx + 10, top); g.moveTo(gx + 110, base); g.lineTo(gx + 100, top); g.stroke();
  for (let y = top + 30; y < base; y += 52) { g.beginPath(); g.moveTo(gx + 8, y); g.lineTo(gx + 104, y + 52); g.moveTo(gx + 104, y); g.lineTo(gx + 8, y + 52); g.stroke(); }
  g.fillRect(gx - 20, top - 10, 150, 14);
  // figure: a block silhouette, arm raised toward the star
  g.beginPath(); g.arc(gx + 58, top - 112, 22, 0, 7); g.fill();
  g.beginPath(); g.moveTo(gx + 32, top - 86); g.lineTo(gx + 84, top - 86); g.lineTo(gx + 92, top - 10); g.lineTo(gx + 24, top - 10); g.closePath(); g.fill();
  g.lineWidth = 18; g.beginPath(); g.moveTo(gx + 76, top - 80); g.lineTo(gx + 150, top - 170); g.stroke();
  // the slogan: the same three words on both posters, black on cream
  g.fillStyle = CREAM; g.fillRect(0, 700, W, 140);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '400 112px L2Anton'; g.fillText('BEFORE THEY DO', W / 2, 808, W - 40);
  g.fillStyle = col; g.fillRect(30, 712, W - 60, 10);
  CACHE.set(side, cv);
  return cv;
}

// the poster's graph on a display (C103's monitors, part two, Jade 29 Oct): the same climb and star in the owner's colour on the
// screen's dark, over a faint axis; (x, y, w, h) is the plot box
export function drawGraph(g, x, y, w, h, col) {
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(200,215,230,0.45)'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.lineTo(x + w, y + h); g.stroke();
  const px = (u) => x + 0.04 * w + u * 0.84 * w, py = (u) => y + h - 0.06 * h - 0.86 * h * curveY(u);
  g.strokeStyle = col; g.lineWidth = Math.max(8, h * 0.07); g.shadowColor = col; g.shadowBlur = 14;
  g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40; i ? g.lineTo(px(u), py(u)) : g.moveTo(px(u), py(u)); } g.stroke();
  g.lineWidth = Math.max(3, h * 0.025);
  for (let i = 1; i < 8; i++) { const u = i / 8, d = h * 0.05; g.beginPath(); g.moveTo(px(u), py(u) - d); g.lineTo(px(u), py(u) + d); g.stroke(); }
  g.fillStyle = col; g.beginPath();
  const sx = x + 0.95 * w, sy = y + 0.1 * h, R = h * 0.11;
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.4 : R; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
  g.closePath(); g.fill();
  g.restore();
}
