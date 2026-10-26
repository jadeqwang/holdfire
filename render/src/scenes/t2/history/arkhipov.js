// t2_arkhipov (2:38.76-2:43.8, "sixty-two, depth charges falling, / two said fire. Arkhipov said no."). 27 October 1962: B-59
// (Captain Valentin Savitsky), batteries nearly dead, one nuclear torpedo aboard, trapped underwater beneath US destroyers, which drop
// practice depth charges (about the size of hand grenades) to make it surface. Drawn as a Soviet poster in red, black and cream,
// printed through a coarse newsprint halftone (poster.js). Beats, selectable with p.mode so the editor can cut them:
//   'charges' (2:38.76) the camera pulls back out of the poster: a tilted sea, the destroyers' hulls on the surface above, the boat
//             below; charges fall as black dots and each one sends a ring through the water when it goes off (the boat shudders)
//   'fire'    (2:41.23) two officers in red silhouette, faces in shadow, unnamed; one points toward the torpedo room (the tube doors)
//   'hand'    (2:42.19) an open hand comes up between them and fills the frame: a raised palm, stop
//   'no'      (2:43.34) NO in heavy poster lettering (Archivo Black weight) fills the frame, cream knocked out of red
//   'surface' (2:43.62) B-59 surfaces among the destroyers at night, in their searchlights; the poster's red drains to grey
// No names, no slogans, no flags, no text but NO. p.img (URL / texture) may lay a generated poster plate under the halftone.
// p: {mode, tFire, tHand, tNo, tSurface, charges: [times], zoom0 (1.3: pull-back start), img, imgMix, drain, seed, cell}
import { clamp, smooth, range, easeOutCubic, easeInOutCubic, easeOutBack, hash1, rng } from '../../../util.js';
import { pressBegin, printPoster, pc, PAPERC, BLACK, RED, poly, quad, destroyer, submarine } from './poster.js';
import { loadTex } from './ink.js';

export const TILT = -0.075;
export const surfY = (x) => 300 + (x - 960) * Math.tan(TILT);
export const LAYOUT = { d1: { x: 150, L: 640 }, d2: { x: 1190, L: 540 }, sub: { x: 960, y: 805, L: 1180, ang: TILT * 0.5 } };

export function arkTimes(A, p = {}) {
  const l50 = A.lines.find((x) => /^sixty-two/.test(x.text)), l51 = A.lines.find((x) => /^two said fire/.test(x.text));
  const w = (l, j, d) => (l && l.words[j] ? l.words[j].t : d);
  const t0 = l50 ? l50.t : 158.76;
  const tNo = p.tNo ?? w(l51, 5, 163.34);
  return {
    t0, tFire: p.tFire ?? w(l51, 0, 161.23), tHand: p.tHand ?? w(l51, 3, 162.19), tNo, tSurface: p.tSurface ?? tNo + 0.28,
    charges: p.charges || [159.38, w(l50, 1, 159.64), w(l50, 2, 159.94), 160.17, w(l50, 3, 160.47), 160.64, 160.86, 161.02],
  };
}
export function modeAt(T, t, p = {}) {
  if (p.mode) return p.mode;
  if (t >= T.tSurface) return 'surface';
  if (t >= T.tNo) return 'no';
  if (t >= T.tHand) return 'hand';
  if (t >= T.tFire) return 'fire';
  return 'charges';
}

// where charge i goes in
function chargeX(i) { const d = i % 2 ? LAYOUT.d2 : LAYOUT.d1; return d.x + d.L * (0.06 + 0.2 * hash1(i * 3.7)); }

// ------------------------------------------------------------------ 'charges' (also the morph's target frame, with t < first drop)
export function drawCharges(c, T, t, o = {}) {
  const ys = surfY;
  // the sea: poster red, darkening with depth; light shafts from the surface on the diagonal
  const g = c.createLinearGradient(0, 200, 0, 1080);
  g.addColorStop(0, pc(0.02, 1)); g.addColorStop(0.55, pc(0.35, 1)); g.addColorStop(1, pc(0.8, 1));
  c.fillStyle = g; poly(c, [[-40, ys(-40)], [1960, ys(1960)], [1960, 1120], [-40, 1120]], g);
  c.globalCompositeOperation = 'lighten';
  for (const [x0, w, k] of [[280, 120, 0.55], [560, 60, 0.62], [1320, 150, 0.5], [1640, 70, 0.6]]) {
    poly(c, [[x0, ys(x0)], [x0 + w, ys(x0 + w)], [x0 + w - 520, 1100], [x0 - 520 - w * 0.8, 1100]], pc(0.12, k));
  }
  c.globalCompositeOperation = 'source-over';
  // the boat, shuddering when a charge goes off
  let shock = 0;
  T.charges.forEach((tc, i) => { const a = t - (tc + detAt(i)); if (a > 0) shock += Math.exp(-a / 0.12) * Math.sin(a * 70 + i); });
  // charges: dots dropped from the destroyers, sinking, then a ring through the water
  T.charges.forEach((tc, i) => {
    const x0 = chargeX(i), a = t - tc, det = detAt(i);
    if (a < -0.12) return;
    if (a < 0) { const y = ys(x0) - 46 * (-a / 0.12); c.fillStyle = BLACK; c.beginPath(); c.arc(x0, y, 13, 0, 6.283); c.fill(); return; }
    const sway = Math.sin(a * 9 + i) * 6;
    if (a < 0.16) { c.strokeStyle = PAPERC; c.lineWidth = 4; c.beginPath(); c.ellipse(x0, ys(x0) + 2, 16 + a * 160, 5 + a * 24, TILT, 0, 6.283); c.stroke(); }   // entry splash ring
    if (a < det) {
      const y = ys(x0) + 300 * a + 40 * a * a;
      c.fillStyle = PAPERC; c.beginPath(); c.arc(x0 + sway, y, 17, 0, 6.283); c.fill(); c.fillStyle = BLACK; c.beginPath(); c.arc(x0 + sway, y, 13, 0, 6.283); c.fill();
      for (let b = 0; b < 3; b++) { const ba = a - 0.06 * (b + 1); if (ba > 0) { c.fillStyle = PAPERC; c.beginPath(); c.arc(x0 + sway * 0.5 + (b % 2 ? 6 : -6), ys(x0) + 300 * ba + 40 * ba * ba - 10, 3.5 - b * 0.6, 0, 6.283); c.fill(); } }
    } else {
      const da = a - det, yD = ys(x0) + 300 * det + 40 * det * det;
      const R = 18 + 520 * (1 - Math.exp(-da / 0.32));
      const fade = Math.exp(-da / 0.55);
      if (fade > 0.03) {
        c.globalCompositeOperation = 'lighten';
        c.strokeStyle = pc(0, 1 - 0.95 * fade); c.lineWidth = 3 + 12 * fade;
        c.beginPath(); c.arc(x0, yD, R, 0, 6.283); c.stroke();
        c.lineWidth = 2 + 4 * fade; c.beginPath(); c.arc(x0, yD, R * 0.72, 0, 6.283); c.stroke();
        c.globalCompositeOperation = 'source-over';
        if (da < 0.09) { c.fillStyle = PAPERC; c.beginPath(); c.arc(x0, yD, 40 * (1 - da / 0.09) + 10, 0, 6.283); c.fill(); c.fillStyle = BLACK; c.beginPath(); c.arc(x0, yD, 18 * (1 - da / 0.09), 0, 6.283); c.fill(); }
      }
    }
  });
  const S = LAYOUT.sub;
  submarine(c, S.x + shock * 5, S.y + shock * 3, S.L, S.ang, BLACK, pc(0, 0.35));
  // the surface: a heavy rule; the sky above is the paper; the destroyers sit on the line, hulls hanging into the sea
  c.fillStyle = BLACK; poly(c, [[-40, ys(-40) - 6], [1960, ys(1960) - 6], [1960, ys(1960) + 6], [-40, ys(-40) + 6]], BLACK);
  for (const d of [LAYOUT.d1, LAYOUT.d2]) destroyer(c, d.x, ys(d.x), d.L, TILT, BLACK);
  // a red bar in the sky, the poster's diagonal
  poly(c, [[1480, 0], [1920, 0], [1920, 40], [1480, 70]], RED);
  poly(c, [[0, 0], [380, 0], [380, 26], [0, 56]], BLACK);
  return shock;
}
const detAt = (i) => 0.62 + 0.22 * hash1(i * 5.3);

// ------------------------------------------------------------------ 'fire'
function officer(c, x, hy, R, o = {}) {
  const dir = o.dir ?? 1, col = o.col ?? RED;
  const top = hy + 1.65 * R;
  poly(c, [[x - 2.7 * R, top + 0.4 * R], [x - 2.2 * R, top], [x + 2.2 * R, top], [x + 2.7 * R, top + 0.4 * R], [x + 2.3 * R, 1100], [x - 2.3 * R, 1100]], col);
  // the shadow side of the coat (black screened over the red), a button line
  c.globalCompositeOperation = 'darken';
  poly(c, [[x - dir * 0.2 * R, top + 1.4 * R], [x - dir * 2.7 * R, top + 0.4 * R], [x - dir * 2.3 * R, 1100], [x - dir * 0.6 * R, 1100]], pc(0.5, 0));
  c.globalCompositeOperation = 'source-over';
  for (let b = 0; b < 4; b++) { c.fillStyle = BLACK; c.beginPath(); c.arc(x + dir * 0.35 * R, top + (1.9 + b * 0.9) * R, 0.12 * R, 0, 6.283); c.fill(); }
  poly(c, [[x - 0.45 * R, hy + 0.5 * R], [x + 0.45 * R, hy + 0.5 * R], [x + 0.5 * R, top + 0.1 * R], [x - 0.5 * R, top + 0.1 * R]], col);
  // collar and lapels (black), shoulder boards
  poly(c, [[x - 0.9 * R, top], [x, top + 1.5 * R], [x + 0.9 * R, top]], BLACK);
  poly(c, [[x - 0.35 * R, top], [x, top + 0.9 * R], [x + 0.35 * R, top]], col);
  for (const s of [-1, 1]) poly(c, [[x + s * 1.3 * R, top - 0.02 * R], [x + s * 2.35 * R, top + 0.04 * R], [x + s * 2.4 * R, top + 0.28 * R], [x + s * 1.3 * R, top + 0.22 * R]], BLACK);
  // head: the face in shadow (black), the back of the head red
  c.fillStyle = col; c.beginPath(); c.ellipse(x, hy, 0.86 * R, R, 0, 0, 6.283); c.fill();
  c.fillStyle = BLACK; c.beginPath(); c.ellipse(x + dir * 0.16 * R, hy + 0.06 * R, 0.74 * R, 0.96 * R, 0, 0, 6.283); c.fill();
  // peaked cap: crown, black band, brim toward where he looks
  poly(c, [[x - 1.1 * R, hy - 0.62 * R], [x + 1.1 * R, hy - 0.62 * R], [x + 1.35 * R, hy - 1.15 * R], [x - 1.35 * R, hy - 1.15 * R]], col);
  poly(c, [[x - 1.05 * R, hy - 0.62 * R], [x + 1.05 * R, hy - 0.62 * R], [x + 1.02 * R, hy - 0.42 * R], [x - 1.02 * R, hy - 0.42 * R]], BLACK);
  poly(c, [[x + dir * 0.1 * R, hy - 0.45 * R], [x + dir * 1.45 * R, hy - 0.36 * R], [x + dir * 1.05 * R, hy - 0.2 * R], [x + dir * 0.05 * R, hy - 0.3 * R]], BLACK);
  c.fillStyle = PAPERC; c.beginPath(); c.arc(x + dir * 0.15 * R, hy - 0.9 * R, 0.16 * R, 0, 6.283); c.fill();   // cap badge as bare paper
  if (o.point != null) {
    // the pointing arm: shoulder -> hand, cuff stripes, an index finger
    const a = o.point, sx = x + dir * 2.15 * R, sy = top + 0.35 * R, L = (o.reach ?? 6) * R;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, w = 0.55 * R;
    const ex = sx + ux * L, ey = sy + uy * L;
    poly(c, [[sx + nx * w * 1.15, sy + ny * w * 1.15], [ex + nx * w * 0.8, ey + ny * w * 0.8], [ex - nx * w * 0.8, ey - ny * w * 0.8], [sx - nx * w * 1.15, sy - ny * w * 1.15]], col);
    for (const f of [0.82, 0.9]) { const px = sx + ux * L * f, py = sy + uy * L * f; poly(c, [[px + nx * w * 0.86, py + ny * w * 0.86], [px + ux * 0.07 * R + nx * w * 0.86, py + uy * 0.07 * R + ny * w * 0.86], [px + ux * 0.07 * R - nx * w * 0.86, py + uy * 0.07 * R - ny * w * 0.86], [px - nx * w * 0.86, py - ny * w * 0.86]], BLACK); }
    const hx = ex + ux * 0.35 * R, hy2 = ey + uy * 0.35 * R;
    quad(c, hx, hy2, 0.8 * R, 0.85 * R, a, BLACK);
    quad(c, hx + ux * 0.75 * R - nx * 0.18 * R, hy2 + uy * 0.75 * R - ny * 0.18 * R, 1.0 * R, 0.24 * R, a, BLACK);
  }
}
function drawFire(c, T, t) {
  const a = t - T.tFire;
  const push = 1 + 0.03 * easeOutCubic(clamp(a / 1));
  c.save(); c.translate(960, 540); c.scale(push, push); c.translate(-960, -540);
  // the torpedo room: a black bulkhead with six tube doors, one swung open (the torpedo being readied)
  poly(c, [[-60, 1100], [-60, 760], [1980, 180], [1980, 520]], BLACK);
  poly(c, [[1380, 210], [1990, 160], [1990, 900], [1380, 860]], BLACK);
  const doors = [[1500, 340], [1680, 330], [1860, 320], [1500, 560], [1680, 555], [1860, 550]];
  doors.forEach(([x, y], i) => {
    c.fillStyle = i === 3 ? RED : pc(0.45, 0); c.beginPath(); c.arc(x, y, 72, 0, 6.283); c.fill();
    c.fillStyle = BLACK; c.beginPath(); c.arc(x, y, i === 3 ? 44 : 56, 0, 6.283); c.fill();
    if (i !== 3) { c.fillStyle = pc(0.45, 0); c.fillRect(x - 60, y - 5, 120, 10); }
  });
  // sight lines toward the open door, like a poster's rays
  for (let k = 0; k < 5; k++) poly(c, [[1500, 560], [700 + k * 40, 1100], [740 + k * 40 + 14, 1100]], BLACK);
  // two officers, red, faces in shadow; the nearer one points to the torpedo room
  const rise = easeOutCubic(clamp(a / 0.16));
  officer(c, 610, 450 + (1 - rise) * 60, 58, { dir: 1 });
  officer(c, 960, 392 + (1 - rise) * 40, 68, { dir: 1, point: -0.1 - 0.05 * smooth(clamp(a / 0.3)), reach: 5.6 });
  c.restore();
}

// ------------------------------------------------------------------ 'hand'
function palm(c, cx, cy, s, col = BLACK) {
  const P = (x, y) => [cx + x * s, cy + y * s];
  // forearm and sleeve
  poly(c, [P(-0.38, 0.5), P(0.38, 0.5), P(0.46, 2.2), P(-0.46, 2.2)], col);
  poly(c, [P(-0.42, 0.85), P(0.42, 0.85), P(0.43, 0.93), P(-0.43, 0.93)], PAPERC);
  poly(c, [P(-0.43, 0.99), P(0.43, 0.99), P(0.44, 1.04), P(-0.44, 1.04)], PAPERC);
  // palm
  c.fillStyle = col; c.beginPath();
  c.moveTo(...P(-0.5, -0.2)); c.lineTo(...P(0.5, -0.22)); c.quadraticCurveTo(...P(0.56, 0.2), ...P(0.4, 0.58)); c.lineTo(...P(-0.36, 0.6));
  c.quadraticCurveTo(...P(-0.56, 0.3), ...P(-0.5, -0.2)); c.fill();
  // fingers, slightly spread; rounded tips
  const F = [[-0.37, 0.6, -0.07], [-0.12, 0.7, -0.02], [0.13, 0.66, 0.03], [0.36, 0.5, 0.1]];
  for (const [x, L, a] of F) {
    const w = 0.105, bx = x, by = -0.18, tx = bx + Math.sin(a) * L, ty = by - Math.cos(a) * L;
    const nx = Math.cos(a) * w, ny = Math.sin(a) * w;
    poly(c, [P(bx - nx, by - ny), P(tx - nx, ty - ny), P(tx + nx, ty + ny), P(bx + nx, by + ny)], col);
    c.beginPath(); c.arc(...P(tx, ty), w * s, 0, 6.283); c.fill();
    // knuckle creases as bare paper
    for (const f of [0.35, 0.65]) { const kx = bx + (tx - bx) * f, ky = by + (ty - by) * f; poly(c, [P(kx - nx * 0.7, ky - ny * 0.7 - 0.008), P(kx + nx * 0.7, ky + ny * 0.7 - 0.008), P(kx + nx * 0.7, ky + ny * 0.7 + 0.008), P(kx - nx * 0.7, ky - ny * 0.7 + 0.008)], PAPERC); }
  }
  // thumb, out to the left
  { const a = -0.95, L = 0.5, w = 0.12, bx = -0.42, by = 0.22, tx = bx + Math.sin(a) * L, ty = by - Math.cos(a) * L, nx = Math.cos(a) * w, ny = Math.sin(a) * w;
    poly(c, [P(bx - nx, by - ny), P(tx - nx, ty - ny), P(tx + nx, ty + ny), P(bx + nx, by + ny)], col); c.beginPath(); c.arc(...P(tx, ty), w * s, 0, 6.283); c.fill(); }
  // palm creases
  c.strokeStyle = PAPERC; c.lineWidth = Math.max(5, s * 0.016); c.lineCap = 'round';
  c.beginPath(); c.moveTo(...P(-0.3, 0.02)); c.quadraticCurveTo(...P(0.05, 0.1), ...P(0.42, -0.04)); c.stroke();
  c.beginPath(); c.moveTo(...P(-0.36, 0.12)); c.quadraticCurveTo(...P(-0.15, 0.4), ...P(-0.05, 0.52)); c.stroke();
}
function drawHand(c, T, t) {
  const a = t - T.tHand;
  // a red sunburst behind, the officers pushed to the edges
  const cx = 960, cy = 1180;
  for (let k = 0; k < 22; k++) { const a0 = Math.PI + (k / 22) * Math.PI, a1 = a0 + Math.PI / 44; if (k % 2 === 0) poly(c, [[cx, cy], [cx + Math.cos(a0) * 2600, cy + Math.sin(a0) * 2600], [cx + Math.cos(a1) * 2600, cy + Math.sin(a1) * 2600]], RED); }
  const side = easeOutCubic(clamp(a / 0.25));
  officer(c, 260 - 120 * side, 470, 62, { dir: 1, col: RED });
  officer(c, 1660 + 120 * side, 500, 56, { dir: -1, col: RED });
  // the hand rises between them and fills the frame
  const up = easeOutBack(clamp(a / 0.3), 1.2);
  const s = 520 + 240 * easeOutCubic(clamp(a / 1.2));
  palm(c, 960, 640 + (1 - up) * 900, s);
}

// ------------------------------------------------------------------ 'no'
function drawNo(c, T, t) {
  const a = t - T.tNo;
  c.fillStyle = RED; c.fillRect(-20, -20, 1960, 1120);
  const slam = 1 + 0.22 * Math.exp(-Math.max(0, a) / 0.05);
  c.save(); c.translate(960, 560); c.scale(slam, slam);
  c.font = `900 820px Archivo`; try { c.fontStretch = 'normal'; } catch (err) { /* */ }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText('NO').width, k = Math.min(1, 1560 / w);
  c.scale(k, 1);
  c.fillStyle = BLACK; c.fillText('NO', 26, 30);
  c.fillStyle = PAPERC; c.fillText('NO', 0, 0);
  c.restore();
  // constructivist bars
  poly(c, [[0, 1000], [1920, 940], [1920, 990], [0, 1050]], BLACK);
}

// ------------------------------------------------------------------ 'surface'
function drawSurface(c, T, t) {
  const H = 700, a = t - T.tSurface, sx = 960;
  // night: a red horizon under a heavy black screen, the sea black
  c.fillStyle = pc(0.84, 0.5); c.fillRect(-20, -20, 1960, H + 20);
  const g = c.createLinearGradient(0, H - 300, 0, H);
  g.addColorStop(0, pc(0.84, 0.5)); g.addColorStop(1, pc(0.35, 1));
  c.fillStyle = g; c.fillRect(-20, H - 300, 1960, 300);
  c.fillStyle = pc(0.92, 0.15); c.fillRect(-20, H, 1960, 460);
  const R = rng(5); c.fillStyle = pc(0.15, 0.1);
  for (let k = 0; k < 46; k++) { const x = R() * 1920, y = R() * 360; c.fillRect(x, y, 4, 4); }
  // searchlights from the destroyers' bridges: two raking the sky, two holding the boat
  const L1 = [-90 + 0.75 * 640, H - 0.13 * 640], L2 = [2010 - 0.75 * 580, H - 0.13 * 580];
  const sweep = 0.12 * Math.sin(a * 2.2);
  c.globalCompositeOperation = 'lighten';
  poly(c, [L1, [700 + 400 * sweep, -40], [920 + 400 * sweep, -40]], pc(0.5, 0.45));
  poly(c, [L2, [1100 - 400 * sweep, -40], [1300 - 400 * sweep, -40]], pc(0.5, 0.45));
  for (const L of [L1, L2]) {
    poly(c, [L, [sx - 360, H - 190], [sx + 360, H + 70]].map((q, i) => (i ? q : [q[0], q[1]])), pc(0.3, 0.3));
    poly(c, [L, [sx - 200, H - 130], [sx + 200, H + 30]], pc(0.06, 0.06));
  }
  c.fillStyle = pc(0.25, 0.25); c.beginPath(); c.ellipse(sx, H + 34, 620, 46, 0, 0, 6.283); c.fill();
  c.globalCompositeOperation = 'source-over';
  // the destroyers close on either side, black
  destroyer(c, -90, H, 640, 0, BLACK, false);
  c.save(); c.translate(2010, H); c.scale(-1, 1); destroyer(c, 0, 0, 580, 0, BLACK, false); c.restore();
  // B-59 surfacing: the hull breaking the water, the sail lit
  const rise = easeOutCubic(clamp(a / 0.7));
  c.save(); c.beginPath(); c.rect(-20, -20, 1960, H + 4); c.clip();
  submarine(c, sx, H + 70 - 80 * rise, 980, 0, BLACK, PAPERC);
  c.restore();
  c.fillStyle = PAPERC;
  for (let k = 0; k < 16; k++) { const x = sx - 470 + k * 60 + hash1(k) * 26, w = 20 + 26 * hash1(k * 7); c.fillRect(x, H + 2 + (k % 3) * 8, w, 5); }
}

export function drawArkhipovPage(c, T, t, mode) {
  if (mode === 'fire') drawFire(c, T, t);
  else if (mode === 'hand') drawHand(c, T, t);
  else if (mode === 'no') drawNo(c, T, t);
  else if (mode === 'surface') drawSurface(c, T, t);
  else drawCharges(c, T, t);
}

export default {
  async prepare(ctx, shot, t, lt, p) { if (p.img) await loadTex(p.img); },
  async draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const T = arkTimes(ctx.audio, p);
    const mode = modeAt(T, t, p);
    const c = pressBegin(e);
    drawArkhipovPage(c, T, t, mode);
    const z0 = p.zoom0 ?? 1.3;
    const zoom = p.zoom ?? (mode === 'charges' ? z0 + (1 - z0) * easeInOutCubic(range(t, T.t0, T.t0 + 0.7)) : 1);
    const drain = p.drain ?? (mode === 'surface' ? smooth(range(t, T.tSurface + 0.08, T.tSurface + 0.6)) : 0);
    const flash = mode === 'no' ? 0.6 * Math.exp(-Math.max(0, t - T.tNo) / 0.04) : 0;
    const img = p.img ? await loadTex(p.img) : null;
    printPoster(e, { zoom, screen: 1, drain, flash, img, imgMix: p.imgMix ?? 1, seed: p.seed ?? 41, cell: p.cell ?? 11 });
    ctx.state.ark = { mode, T };
  },
};
