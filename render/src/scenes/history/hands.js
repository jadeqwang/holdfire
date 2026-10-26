// Procedural hands as clean engraved line art (the film's motif: the hand that can let go). A kinematic skeleton (palm, four
// fingers of three phalanges, thumb) posed by a few numbers, outlined as tapered tubes, filled with the ground colour for
// occlusion, then a contour, joint creases, nails and a little contour-following hatching on the shadow side.
//   handSide(c, pose, st): a right hand seen from the thumb side; wrist at the origin, fingers along +x, palm toward +y.
//   handTop(c, pose, st):  a right hand from above (back of the hand); wrist at the origin, fingers toward -y.
//   clasp(c, x, y, s, k, st): two hands hooked into each other (k: 1 gripping .. 0 let go and drawn apart), one rotated 180°.
// pose: {curl 0..1 (0 open, 1 hook grip), thumb 0..1 (0 out, 1 closed), spread 0..1}; st: {col, alpha, lw, fill, hatch, arm, draw}
// `draw` (0..1) reveals the line work along each stroke (engraving it on).
import { css } from '../../palette.js';
import { clamp, lerp, smooth } from '../../util.js';

const FING = [   // side view: [mcp x, mcp y, lengths, half-widths at mcp, pip, dip, tip, depth offset]
  { k: 'little', m: [150, -6], L: [56, 34, 28], w: [11.5, 10.5, 9.5, 8.5], off: [-6, -9] },
  { k: 'ring', m: [158, -4], L: [70, 44, 31], w: [13, 12, 11, 9.5], off: [-4, -6] },
  { k: 'middle', m: [164, -2], L: [76, 48, 33], w: [13.5, 12.5, 11, 9.5], off: [-2, -3] },
  { k: 'index', m: [166, 0], L: [70, 43, 31], w: [13.5, 12.5, 11, 9.5], off: [0, 0] },
];

function polyline(p0, a0, L, ang) {
  const pts = [p0]; let a = a0, p = p0;
  for (let i = 0; i < L.length; i++) { a += ang[i]; p = [p[0] + Math.cos(a) * L[i], p[1] + Math.sin(a) * L[i]]; pts.push(p); }
  return pts;
}
// outline of a tube along pts with half-widths w (per point): left side, round tip, right side back
function tube(pts, w) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    L.push([pts[i][0] - dy * w[i], pts[i][1] + dx * w[i]]); R.push([pts[i][0] + dy * w[i], pts[i][1] - dx * w[i]]);
  }
  const tip = pts[n - 1], pr = pts[n - 2], ta = Math.atan2(tip[1] - pr[1], tip[0] - pr[0]);
  const cap = []; for (let k = 1; k < 8; k++) { const a = ta + Math.PI / 2 - Math.PI * k / 8; cap.push([tip[0] + Math.cos(a) * w[n - 1], tip[1] + Math.sin(a) * w[n - 1]]); }
  return { L, R, cap, outline: [...L, ...cap.reverse().reverse(), ...R.reverse()] };
}
function smoothPath(c, pts, closed = true) {
  const n = pts.length; if (n < 3) return;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  c.beginPath();
  if (closed) { let m = mid(pts[n - 1], pts[0]); c.moveTo(m[0], m[1]); for (let i = 0; i < n; i++) { const q = mid(pts[i], pts[(i + 1) % n]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } c.closePath(); }
  else { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n - 1; i++) { const q = mid(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); } c.lineTo(pts[n - 1][0], pts[n - 1][1]); }
}
function strokeOpen(c, pts, st, a = 1) {
  if (pts.length < 2) return;
  const dr = st.draw ?? 1; if (dr <= 0) return;
  let use = pts;
  if (dr < 1) { const k = Math.max(2, Math.ceil(pts.length * dr)); use = pts.slice(0, k); }
  c.globalAlpha = (st.alpha ?? 1) * a; smoothPath(c, use, false); c.stroke(); c.globalAlpha = st.alpha ?? 1;
}
// fill + contour (+ optional hatching along one side) of a closed outline
function part(c, outline, st, hatchSides = []) {
  smoothPath(c, outline, true);
  if (st.fill) { c.fillStyle = st.fill; c.fill(); }
  if ((st.draw ?? 1) >= 1) { c.globalAlpha = st.alpha ?? 1; c.stroke(); }
  else strokeOpen(c, [...outline, outline[0]], st);
  if (st.hatch !== false) for (const h of hatchSides) strokeOpen(c, h, st, 0.75);
}
const offsetLine = (pts, w, f, sgn) => {     // a line inside a tube, at fraction f of the half-width toward side sgn
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    out.push([pts[i][0] - dy * w[i] * f * sgn, pts[i][1] + dx * w[i] * f * sgn]);
  }
  return out;
};

export function handSide(c, pose = {}, st = {}) {
  const curl = clamp(pose.curl ?? 0), th = clamp(pose.thumb ?? curl);
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = css(st.col || [1, 1, 1], 1); c.lineWidth = st.lw ?? 2;
  c.globalAlpha = st.alpha ?? 1;
  const arm = st.arm ?? 220;
  // forearm (fades out toward the elbow, like an engraving's vignette)
  if (arm > 0) {
    const top = [[-arm, -32], [-arm * 0.55, -30], [-arm * 0.2, -27], [0, -24]], bot = [[0, 25], [-arm * 0.3, 30], [-arm * 0.7, 35], [-arm, 37]];
    if (st.fill) { c.fillStyle = st.fill; c.beginPath(); c.moveTo(-arm, -32); top.forEach((q) => c.lineTo(q[0], q[1])); bot.forEach((q) => c.lineTo(q[0], q[1])); c.closePath(); c.fill(); }
    const g = c.createLinearGradient(-arm, 0, 0, 0); g.addColorStop(0, css(st.col || [1, 1, 1], 0)); g.addColorStop(0.45, css(st.col || [1, 1, 1], 1));
    c.strokeStyle = g;
    strokeOpen(c, top.slice().reverse(), st); strokeOpen(c, bot, st);
    strokeOpen(c, [[-arm * 0.9, 25], [-arm * 0.5, 21], [-arm * 0.15, 17]], st, 0.6);          // hatching on the underside
    c.strokeStyle = css(st.col || [1, 1, 1], 1);
  }
  // fingers, back to front (little behind ... index in front). Flexion rotates toward the palm (+y).
  const k0 = [lerp(0.08, 0.5, curl), lerp(0.05, 1.45, curl), lerp(0.04, 0.95, curl)];
  for (let f = 0; f < 4; f++) {
    const F = FING[f];
    const ang = k0.map((a, j) => a * (1 + (f - 1.5) * 0.06 * (j + 1)));
    const p0 = [F.m[0] + F.off[0], F.m[1] + F.off[1]];
    const pts = polyline(p0, -0.04 + (f - 3) * 0.04 * (1 - curl), F.L, ang);
    const tb = tube(pts, F.w);
    const hatch = [offsetLine(pts.slice(0, 3), F.w, 0.55, 1)];
    part(c, tb.outline, st, f === 3 ? hatch : []);
    // creases on the palm side of the bent joints; the nail on the back of the tip (index only: it's in front)
    if (f === 3 || f === 2) {
      for (const j of [1, 2]) {
        const a = pts[j], b = pts[j + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
        strokeOpen(c, [[a[0] + nx * F.w[j] * 0.95, a[1] + ny * F.w[j] * 0.95], [a[0] + nx * F.w[j] * 0.35, a[1] + ny * F.w[j] * 0.35]], st, 0.8);
      }
      if (f === 3) {
        const a = pts[2], b = pts[3], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, nx = uy, ny = -ux;
        const w = F.w[2] * 0.62;
        strokeOpen(c, [[a[0] + ux * d * 0.35 + nx * w, a[1] + uy * d * 0.35 + ny * w], [a[0] + ux * d * 0.7 + nx * w * 1.05, a[1] + uy * d * 0.7 + ny * w * 1.05], [a[0] + ux * d * 0.92 + nx * w * 0.6, a[1] + uy * d * 0.92 + ny * w * 0.6]], st, 0.9);
      }
    }
  }
  // the hand: back of the hand on top, the heel of the palm and the thenar bulge underneath
  const palm = [[0, -24], [60, -25], [118, -22], [158, -16], [172, -5], [170, 9], [150, 14], [112, 17], [72, 27], [32, 29], [0, 25]];
  part(c, palm, st, [[[38, 20], [86, 16], [136, 10]]]);
  strokeOpen(c, [[146, -18], [158, -21], [170, -12]], st, 0.85);                  // the knuckle
  // thumb, in front: from the thenar along the index side; it closes over the grip
  const ta = [lerp(-0.1, 0.12, th), lerp(-0.05, 0.25, th), lerp(-0.05, 0.3, th)];
  const tw = [12, 10.5, 9, 7.5];
  const tp = polyline([56, 16], lerp(0.12, 0.42, th), [50, 34, 26], ta);
  const ttb = tube(tp, tw);
  part(c, ttb.outline, st, [offsetLine(tp, tw, 0.55, 1)]);
  { const a = tp[2], b = tp[3], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, nx = uy, ny = -ux, w = 5.5;
    strokeOpen(c, [[a[0] + ux * d * 0.3 + nx * w, a[1] + uy * d * 0.3 + ny * w], [a[0] + ux * d * 0.7 + nx * w * 1.1, a[1] + uy * d * 0.7 + ny * w * 1.1], [a[0] + ux * d * 0.95 + nx * w * 0.5, a[1] + uy * d * 0.95 + ny * w * 0.5]], st, 0.9); }
  c.restore();
}

// two hands hooked into each other. k: 1 = gripping; as k falls the fingers open and the hands draw apart.
export function clasp(c, x, y, s, k, st = {}, rot = 0) {
  const curl = clamp(k), apart = (1 - smooth(clamp(k))) * 70;
  const pose = { curl, thumb: curl * 0.8 };
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  // placed so each hook closes around the other's fingers (A's hook interior sits on B's first phalanx, and by symmetry back)
  const tx = -198, ty = -28;
  // B (from the right, palm up): rotated 180°, drawn first (behind)
  c.save(); c.translate(apart, apart * 0.3); c.rotate(Math.PI); c.translate(tx, ty); handSide(c, pose, st); c.restore();
  // A (from the left, palm down), in front
  c.save(); c.translate(-apart, -apart * 0.3); c.translate(tx, ty); handSide(c, pose, st); c.restore();
  c.restore();
}

// back of a right hand from above; fingers toward -y. pose.curl foreshortens the fingers (reaching for a grip), pose.spread
export function handTop(c, pose = {}, st = {}) {
  const curl = clamp(pose.curl ?? 0), spread = clamp(pose.spread ?? 0.2);
  c.save();
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = css(st.col || [0, 0, 0], 1); c.lineWidth = st.lw ?? 2; c.globalAlpha = st.alpha ?? 1;
  const arm = st.arm ?? 260;
  if (arm > 0) {
    if (st.fill) { c.fillStyle = st.fill; c.fillRect(-46, 0, 92, arm); }
    strokeOpen(c, [[-44, 0], [-48, arm * 0.5], [-52, arm]], st); strokeOpen(c, [[44, 0], [49, arm * 0.5], [54, arm]], st);
    strokeOpen(c, [[30, 20], [34, arm * 0.45], [37, arm * 0.9]], st, 0.6);
  }
  // fingers (index on the left for a right hand seen from above: thumb side left)
  const F = [{ x: -40, L: [52, 32, 25], w: 12.5, a: -0.16 }, { x: -13, L: [58, 36, 27], w: 13, a: -0.05 }, { x: 14, L: [54, 34, 26], w: 12.5, a: 0.06 }, { x: 38, L: [42, 27, 22], w: 11, a: 0.18 }];
  for (let i = 3; i >= 0; i--) {
    const f = F[i];
    const a0 = -Math.PI / 2 + f.a * (0.4 + spread * 1.6);
    const fo = [1 - curl * 0.35, 1 - curl * 0.6, 1 - curl * 0.75];           // flexion seen from above: foreshortening
    const pts = polyline([f.x, -122], a0, f.L.map((l, j) => l * fo[j]), [0, 0, 0]);
    const w = [f.w, f.w * 0.94, f.w * 0.86, f.w * 0.76];
    part(c, tube(pts, w).outline, st, [offsetLine(pts, w, 0.55, i < 2 ? -1 : 1)]);
    // nail, visible while the finger points out; knuckle creases
    const tip = pts[3], dip = pts[2];
    if (curl < 0.7) { c.globalAlpha = (st.alpha ?? 1) * (1 - curl); c.beginPath(); c.ellipse(lerp(dip[0], tip[0], 0.55), lerp(dip[1], tip[1], 0.55), w[3] * 0.62, Math.max(2, Math.hypot(tip[0] - dip[0], tip[1] - dip[1]) * 0.32), a0 + Math.PI / 2, 0, Math.PI * 2); c.stroke(); c.globalAlpha = st.alpha ?? 1; }
    for (const j of [1, 2]) strokeOpen(c, [[pts[j][0] - w[j] * 0.5, pts[j][1]], [pts[j][0], pts[j][1] - 2.5], [pts[j][0] + w[j] * 0.5, pts[j][1]]], st, 0.7);
  }
  // back of the hand, knuckles, tendons
  const back = [[-46, 0], [-58, -60], [-54, -112], [-30, -130], [0, -134], [28, -130], [50, -118], [54, -70], [46, 0]];
  part(c, back, st, [[[-30, -20], [-34, -70], [-36, -108]], [[10, -18], [6, -70], [2, -112]]]);
  for (const f of F) strokeOpen(c, [[f.x - 7, -124], [f.x, -130], [f.x + 7, -124]], st, 0.8);
  // thumb, out to the left
  const tp = polyline([-50, -48], lerp(-2.45, -2.0, curl), [44, 32, 26], [0.35, 0.25, 0.2].map((v) => v * (0.4 + curl)));
  part(c, tube(tp, [16, 13.5, 12, 10]).outline, st, [offsetLine(tp, [16, 13.5, 12, 10], 0.5, 1)]);
  c.restore();
}
