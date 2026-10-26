// t2_ink_weapons (1:30.00-1:32.60, "an end with no life that could level the ground."). The alchemists' smoke drifts across the
// paper, and through it gunpowder grows into heavier weapons, one per beat, still ink wash but with harder, ruled, mechanical lines:
//   1:30.00 "an"    the fire lance (first recorded in battle at the siege of De'an, 1132): a spear with a powder tube spitting fire
//   1:30.28         a bronze hand cannon (the oldest surviving one, Heilongjiang, no later than 1288) on its tiller
//   1:30.92         the bombards breaking the walls of Constantinople (1453): a great gun in the foreground, a breach in the towers
//   1:31.61 "level" the shell-flattened ground of the Somme (1916): craters to the horizon, stumps, wire, bursts on the skyline
//   1:32.15 "ground" a white flash at the top of a shot tower on a flat horizon, the Trinity test (16 July 1945), burns through the
//                   paper from a white-hot centre: the paper scorches, chars, glows at its edge and opens onto p.under. No cloud.
// Each image carries its year, small and brushed (1132 · 1288 · 1453 · 1916 · 1945), top left inside the 4:5 safe area.
// Images are drawn procedurally once (fine ruled lines + soft wash + cinnabar fire) and dissolve in and out of the smoke. If
// p.imgs[i] is given (URL or THREE.Texture, full-frame ink-wash still), it is ink-composited in place of procedural image i.
// p: {t: [5 times], under ({scene, p} | scene name | THREE.Texture: what the burn reveals; default a dark umber oil placeholder),
//     imgs: [5], burnC ([960, 436]: the flash point), burnDur (0.42), smoke (1), years (true), seed}
import * as THREE from 'three';
import { clamp, smooth, range, easeOutCubic, easeInOutCubic, hash1, hash2, rng } from '../../../util.js';
import { loadT2HistoryFonts, NUM } from './fonts.js';
import { INK_GLSL, ricePaper, inkc, makeCanvas, loadTex } from './ink.js';

export const YEARS = ['1132', '1288', '1453', '1916', '1945'];
export function weaponTimes(A, p = {}) {
  const l = A.lines.find((x) => /^an end with no life/.test(x.text));
  const w = (j, d) => (l && l.words[j] ? l.words[j].t : d);
  return { t: p.t || [w(0, 90.0), 90.28, 90.92, w(7, 91.61), w(9, 92.15)] };
}

// ------------------------------------------------------------------ drawing helpers ("white = no ink" channel canvases, darken)
const LN = (k = 1) => inkc(0, k, 0), WA = (k) => inkc(k, 0, 0), RD = (k = 0.9) => inkc(0, 0, k);
function path(c, pts, close = false) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (close) c.closePath(); }
function stroke(c, pts, w = 3, k = 1, close = false) { c.strokeStyle = LN(k); c.lineWidth = w; c.lineJoin = 'miter'; c.lineCap = 'butt'; path(c, pts, close); c.stroke(); }
function fill(c, pts, col) { c.fillStyle = col; path(c, pts, true); c.fill(); }
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
// a turned body along an axis: profile r(s), s 0..1; draws its wash (shaded: light top, dark underside) and its outline
function turned(ln, wa, A, B, prof, o = {}) {
  const N = 80, d = [B[0] - A[0], B[1] - A[1]], len = Math.hypot(...d), u = [d[0] / len, d[1] / len], n = [-u[1], u[0]];
  const P = (s, w) => [A[0] + d[0] * s + n[0] * w, A[1] + d[1] * s + n[1] * w];
  const top = [], bot = [], mid = [], low = [];
  for (let i = 0; i <= N; i++) { const s = i / N, r = prof(s); top.push(P(s, -r)); bot.push(P(s, r)); mid.push(P(s, r * 0.15)); low.push(P(s, r * 0.62)); }
  const tone = o.tone ?? 0.22;
  fill(wa, [...top, ...bot.slice().reverse()], WA(tone));
  fill(wa, [...mid, ...bot.slice().reverse()], WA(tone + 0.18));
  fill(wa, [...low, ...bot.slice().reverse()], WA(tone + 0.38));
  stroke(ln, top, o.w ?? 3); stroke(ln, bot, o.w ?? 3);
  // rings / bands: a pair of lines across the body at each s
  for (const s of o.rings || []) { const r = prof(s); stroke(ln, [P(s, -r), P(s, r)], o.w ?? 3); stroke(ln, [P(s + 0.008, -r), P(s + 0.008, r)], 2); }
  if (o.capEnd) { const r = prof(1); const C = P(1, 0); ln.beginPath(); ln.ellipse(C[0], C[1], r * 0.32, r, Math.atan2(u[1], u[0]), 0, Math.PI * 2); ln.strokeStyle = LN(); ln.lineWidth = o.w ?? 3; ln.stroke(); wa.beginPath(); wa.ellipse(C[0], C[1], r * 0.22, r * 0.72, Math.atan2(u[1], u[0]), 0, Math.PI * 2); wa.fillStyle = WA(0.85); wa.fill(); }
  if (o.capStart) { const r = prof(0); stroke(ln, [P(0, -r), P(0, r)], o.w ?? 3); }
  return { P, u, n, len };
}
// cinnabar fire jet in the painters' manner: tongues with curling ink outlines; from M along direction u
function fireJet(ln, wa, M, u, L, W, seed, o = {}) {
  const n = [-u[1], u[0]], R = rng(seed);
  const NT = o.tongues ?? 5;
  for (let k = 0; k < NT; k++) {
    // outer tongues first (full cinnabar), then smaller, hotter ones inside: the core is paler, as fire is drawn
    const inner = k / Math.max(1, NT - 1);
    const off = (R() - 0.5) * W * 0.5 * (1 - inner * 0.6), len = L * (0.95 - 0.5 * inner) * (0.85 + 0.15 * R()), w = W * (0.55 - 0.32 * inner) * (0.85 + 0.3 * R()), ph = R() * 6;
    const side = [], other = [];
    for (let i = 0; i <= 28; i++) {
      const f = i / 28, wid = w * Math.sin(Math.PI * Math.pow(f, 0.62)) * (1 - 0.35 * f);
      const wv = Math.sin(f * 8 + ph) * W * 0.14 * f;
      const c0 = add(add(M, u, f * len), n, off * f + wv);
      side.push(add(c0, n, wid * (1 + 0.15 * Math.sin(f * 23 + ph)))); other.push(add(c0, n, -wid * (1 + 0.15 * Math.cos(f * 19 + ph))));
    }
    const pts = [...side, ...other.reverse()];
    ln.save(); ln.globalCompositeOperation = k === 0 ? 'darken' : 'source-over';
    fill(ln, pts, RD(0.95 - 0.62 * inner));
    ln.restore();
    if (k === 0) { ln.strokeStyle = LN(0.9); ln.lineWidth = 2.5; path(ln, pts, true); ln.stroke(); }
    else if (k === 1) { ln.strokeStyle = LN(0.7); ln.lineWidth = 2; path(ln, side, false); ln.stroke(); }
  }
  // curls at the tips
  for (let k = 0; k < 4; k++) {
    const f = 0.7 + 0.35 * R(), side = (R() - 0.5) * W * 0.9, C = add(add(M, u, L * f), n, side), r = 10 + 14 * R();
    ln.beginPath(); ln.arc(C[0], C[1], r, R() * 6, R() * 6 + 4.2); ln.strokeStyle = LN(); ln.lineWidth = 2.5; ln.stroke();
  }
  // smoke behind the fire
  for (let k = 0; k < (o.smoke ?? 8); k++) {
    const C = add(add(M, u, L * (0.6 + 0.8 * R())), n, (R() - 0.5) * W * 2.2 - W * 0.8 * (o.rise ?? 1)), r = W * (0.4 + 0.7 * R());
    wa.beginPath(); wa.arc(C[0], C[1], r, 0, Math.PI * 2); wa.fillStyle = WA(0.18 + 0.2 * R()); wa.fill();
  }
}
function smokeCloud(wa, ln, cx, cy, rx, ry, seed, k = 0.35, lines = true) {
  const R = rng(seed);
  for (let i = 0; i < 44; i++) {
    const x = cx + (R() - 0.5) * rx * 1.6, y = cy + (R() - 0.5) * ry * 1.4, r = Math.min(rx, ry) * (0.2 + 0.35 * R());
    wa.beginPath(); wa.arc(x, y, r, 0, Math.PI * 2); wa.fillStyle = WA(k * (0.35 + 0.5 * R())); wa.fill();
    if (lines && R() < 0.12) { ln.beginPath(); ln.arc(x, y, r, Math.PI * (1.0 + R() * 0.3), Math.PI * (1.7 + R() * 0.3)); ln.strokeStyle = LN(0.8); ln.lineWidth = 2; ln.stroke(); }
  }
}

// ------------------------------------------------------------------ the five images
function fireLance(ln, wa) {
  const A = [40, 1080], B = [1340, 330];
  const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  // shaft
  const sh = 12;
  fill(wa, [add(A, n, -sh), add(B, n, -sh), add(B, n, sh), add(A, n, sh)], WA(0.28));
  fill(wa, [add(A, n, 2), add(B, n, 2), add(B, n, sh), add(A, n, sh)], WA(0.5));
  stroke(ln, [add(A, n, -sh), add(B, n, -sh)], 3); stroke(ln, [add(A, n, sh), add(B, n, sh)], 3);
  // spearhead
  const tip = add(B, u, 200), hw = 26;
  const leaf = []; for (let i = 0; i <= 20; i++) { const f = i / 20; leaf.push(add(add(B, u, f * 200), n, hw * Math.sin(Math.PI * Math.pow(f, 0.6)) * (1 - f * 0.2))); }
  const leaf2 = leaf.map(([x, y]) => { const q = [x - B[0], y - B[1]]; const a = q[0] * u[0] + q[1] * u[1], b = q[0] * n[0] + q[1] * n[1]; return add(add(B, u, a), n, -b); });
  const blade = [...leaf, ...leaf2.reverse()];
  fill(wa, blade, WA(0.35)); fill(wa, [B, ...leaf.slice(0, 21)], WA(0.6));
  stroke(ln, blade, 3, 1, true); stroke(ln, [B, tip], 2.5);
  stroke(ln, [add(B, n, -14), add(B, n, 14)], 4);
  // the powder tube, lashed along the upper side of the shaft
  const off = -sh - 38, t0 = add(add(B, u, -380), n, off), t1 = add(add(B, u, -40), n, off);
  turned(ln, wa, t0, t1, (s) => 36 - 4 * s, { tone: 0.16, rings: [0.12, 0.38, 0.64, 0.88], capEnd: true, capStart: true });
  for (const f of [0.2, 0.5, 0.8]) {             // cord lashings: tight wraps over tube and shaft
    const C = add(B, u, -380 + 340 * f);
    for (let j = -2; j <= 2; j++) stroke(ln, [add(add(C, u, j * 6), n, off - 30), add(add(C, u, j * 6 + 5), n, sh)], 2);
  }
  // fire from the muzzle
  fireJet(ln, wa, add(t1, u, 6), u, 420, 90, 3, { tongues: 6, smoke: 14 });
}
function handCannon(ln, wa) {
  const A = [400, 640], B = [1470, 520];
  // tiller (wooden pole) into the socket
  const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const T0 = add(A, u, -560), T1 = add(A, u, 40);
  fill(wa, [add(T0, n, -20), add(T1, n, -20), add(T1, n, 20), add(T0, n, 20)], WA(0.32));
  fill(wa, [add(T0, n, 6), add(T1, n, 6), add(T1, n, 20), add(T0, n, 20)], WA(0.52));
  stroke(ln, [add(T0, n, -20), add(T1, n, -20)], 3); stroke(ln, [add(T0, n, 20), add(T1, n, 20)], 3);
  for (let k = 0; k < 7; k++) { const a = -500 + k * 70; stroke(ln, [add(add(A, u, a), n, -8 + (k % 3) * 6), add(add(A, u, a + 50), n, -6 + (k % 3) * 6)], 2, 0.7); }
  const prof = (s) => {
    if (s < 0.17) return 38;
    if (s < 0.2) return 38 + (s - 0.17) / 0.03 * 8;
    if (s < 0.42) { const q = (s - 0.2) / 0.22; return 46 + 34 * Math.sin(Math.PI * q); }
    if (s < 0.93) return 44 - 6 * (s - 0.42) / 0.51 + ([0.5, 0.63, 0.77, 0.88].some((r) => Math.abs(s - r) < 0.012) ? 7 : 0);
    return 38 + 16 * smooth((s - 0.93) / 0.07);
  };
  const G = turned(ln, wa, A, B, prof, { tone: 0.2, rings: [0.06, 0.12, 0.2, 0.42, 0.5, 0.63, 0.77, 0.88, 0.93], capEnd: true, capStart: true });
  // touch hole on the chamber, a spark
  const th = G.P(0.31, -80);
  ln.beginPath(); ln.arc(th[0], th[1], 6, 0, Math.PI * 2); ln.fillStyle = LN(); ln.fill();
  fireJet(ln, wa, th, [0.15, -1], 70, 18, 9, { tongues: 3, smoke: 3 });
  // muzzle blast
  fireJet(ln, wa, add(B, u, 10), u, 300, 90, 5, { tongues: 5, smoke: 10 });
  smokeCloud(wa, ln, B[0] + 330, B[1] - 90, 220, 140, 21, 0.3);
}
function bombard(ln, wa) {
  // the land walls: an inner wall behind (paler, thinner), the outer wall with towers, a breach being opened
  const R = rng(17);
  const wallTop = 480, base = 660;
  fill(wa, [[0, 400], [1920, 400], [1920, base], [0, base]], WA(0.1));
  for (let x = 40; x < 1920; x += 300) { fill(wa, [[x, 300], [x + 110, 300], [x + 110, 420], [x, 420]], WA(0.14)); stroke(ln, [[x, 420], [x, 300], [x + 110, 300], [x + 110, 420]], 2, 0.6); }
  stroke(ln, [[0, 400], [1920, 400]], 2, 0.6);
  fill(wa, [[0, wallTop], [1920, wallTop], [1920, base], [0, base]], WA(0.2));
  stroke(ln, [[0, wallTop], [1920, wallTop]], 3); stroke(ln, [[0, base], [1920, base]], 3);
  for (let x = 0; x < 1920; x += 38) stroke(ln, [[x, wallTop], [x, wallTop - 22], [x + 22, wallTop - 22], [x + 22, wallTop]], 2.5);   // merlons
  for (let y = wallTop + 26; y < base; y += 26) stroke(ln, [[0, y], [1920, y]], 2, y % 78 < 26 ? 0.7 : 0.35);                          // courses, brick bands
  for (let x = 170; x < 1920; x += 330) {           // towers
    fill(wa, [[x, 380], [x + 140, 380], [x + 140, base], [x, base]], WA(0.28));
    fill(wa, [[x + 95, 380], [x + 140, 380], [x + 140, base], [x + 95, base]], WA(0.48));
    stroke(ln, [[x, base], [x, 380], [x + 140, 380], [x + 140, base]], 3);
    for (let m = 0; m < 4; m++) stroke(ln, [[x + m * 38, 380], [x + m * 38, 358], [x + m * 38 + 24, 358], [x + m * 38 + 24, 380]], 2.5);
    stroke(ln, [[x + 60, 450], [x + 60, 490], [x + 80, 490], [x + 80, 450]], 2.5);   // arrow slit
  }
  // the breach: erase a jagged bite out of the wall and a tower, then rubble and falling blocks
  const bite = [[1060, 330], [1090, 372], [1074, 404], [1118, 430], [1132, 470], [1170, 488], [1176, 530], [1222, 548], [1240, 580], [1290, 596], [1318, 572], [1352, 566], [1366, 528], [1402, 506], [1396, 470], [1436, 440], [1430, 396], [1470, 330]];
  for (const c of [ln, wa]) { c.save(); c.globalCompositeOperation = 'source-over'; fill(c, [...bite, [1470, 300], [1060, 300]], '#fff'); c.restore(); }
  stroke(ln, bite, 3);
  for (let i = 0; i < 26; i++) {                     // rubble heap and flying blocks
    const fly = i < 9, x = 1120 + R() * 340, y = fly ? 300 + R() * 220 : 600 + R() * 70, w = 18 + R() * 30, h = 12 + R() * 18, a = R() * 3;
    const ca = Math.cos(a), sa = Math.sin(a), q = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([px, py]) => [x + (px * ca - py * sa) / 2, y + (px * sa + py * ca) / 2]);
    fill(wa, q, WA(0.4)); stroke(ln, q, 2.5, 1, true);
  }
  smokeCloud(wa, ln, 1270, 470, 200, 120, 31, 0.32);
  // the stone ball, in flight toward the breach, with ruled speed lines
  ln.beginPath(); ln.arc(1010, 560, 26, 0, Math.PI * 2); ln.strokeStyle = LN(); ln.lineWidth = 3; ln.stroke();
  wa.beginPath(); wa.arc(1014, 566, 22, 0, Math.PI * 2); wa.fillStyle = WA(0.45); wa.fill();
  for (let k = 0; k < 4; k++) stroke(ln, [[700 + k * 30, 640 - k * 22 + 22], [960 - k * 6, 585 - k * 12 + 12]], 2, 0.8);
  // ground
  fill(wa, [[0, base], [1920, base], [1920, 1080], [0, 1080]], WA(0.08));
  for (let k = 0; k < 18; k++) { const y = 700 + R() * 360, x = R() * 1920; stroke(ln, [[x, y], [x + 60 + R() * 120, y + (R() - 0.5) * 6]], 2, 0.5); }
  // the bombard: an enormous barrel on its timber bed, firing
  const A = [-60, 1040], B = [700, 790];
  const tb = (y0, y1, x0, x1) => { fill(wa, [[x0, y0], [x1, y0 - 60], [x1, y1 - 60], [x0, y1]], WA(0.36)); stroke(ln, [[x0, y0], [x1, y0 - 60], [x1, y1 - 60], [x0, y1]], 3, 1, true); };
  tb(1000, 1060, -40, 640); tb(1040, 1080, 80, 700);
  turned(ln, wa, A, B, (s) => (s < 0.3 ? 96 : 84) + (s > 0.9 ? 16 * smooth((s - 0.9) / 0.1) : 0), { tone: 0.24, rings: [0.08, 0.3, 0.33, 0.52, 0.72, 0.9], capEnd: true, w: 3.5 });
  const d = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
  fireJet(ln, wa, add(B, u, 14), u, 330, 150, 13, { tongues: 7, smoke: 14 });
  smokeCloud(wa, ln, 980, 700, 330, 180, 41, 0.34);
}
function somme(ln, wa) {
  const R = rng(29), H = 470;
  fill(wa, [[0, H - 40], [1920, H - 40], [1920, H], [0, H]], WA(0.08));
  stroke(ln, [[0, H], [1920, H]], 2.5);
  // shell bursts on the skyline
  for (const [x, h, red] of [[420, 260, 0], [1180, 330, 1], [1610, 210, 0]]) {
    for (let k = 0; k < 12; k++) { const f = k / 12, r = 34 + 70 * f * R(); wa.beginPath(); wa.arc(x + (R() - 0.5) * 70 * f, H - h * f, r, 0, Math.PI * 2); wa.fillStyle = WA(0.62 - 0.4 * f); wa.fill(); }
    for (let k = 0; k < 4; k++) stroke(ln, [[x - 30 + k * 18, H], [x - 50 + k * 30 + (R() - 0.5) * 30, H - h * (0.5 + 0.4 * R())]], 2, 0.9);
    if (red) fireJet(ln, wa, [x, H + 4], [0, -1], 90, 60, 51, { tongues: 4, smoke: 0 });
  }
  // craters to the horizon, far first
  const cr = [];
  for (let i = 0; i < 90; i++) { const s = Math.pow(R(), 1.6); cr.push({ y: H + 14 + s * 640, x: R() * 2100 - 90, w: 50 + 420 * s * (0.5 + R()) }); }
  cr.sort((a, b) => a.y - b.y);
  for (const c of cr) {
    const w = c.w, h = w * 0.26;
    wa.beginPath(); wa.ellipse(c.x, c.y, w / 2, h / 2, 0, 0, Math.PI * 2); wa.fillStyle = '#fff'; wa.globalCompositeOperation = 'source-over'; wa.fill(); wa.globalCompositeOperation = 'darken';
    wa.beginPath(); wa.ellipse(c.x, c.y, w / 2, h / 2, 0, 0, Math.PI * 2); wa.fillStyle = WA(0.18); wa.fill();
    wa.beginPath(); wa.ellipse(c.x, c.y - h * 0.12, w * 0.36, h * 0.3, 0, 0, Math.PI); wa.fillStyle = WA(0.5); wa.fill();
    ln.beginPath(); ln.ellipse(c.x, c.y, w / 2, h / 2, 0, Math.PI * 1.02, Math.PI * 1.98); ln.strokeStyle = LN(); ln.lineWidth = Math.max(2, w * 0.012); ln.stroke();
    ln.beginPath(); ln.ellipse(c.x, c.y, w / 2, h / 2, 0, Math.PI * 0.1, Math.PI * 0.9); ln.lineWidth = 2; ln.strokeStyle = LN(0.6); ln.stroke();
    if (w > 200 && R() < 0.5) { ln.beginPath(); ln.ellipse(c.x, c.y + h * 0.08, w * 0.18, h * 0.1, 0, 0, Math.PI * 2); ln.strokeStyle = LN(0.7); ln.lineWidth = 2; ln.stroke(); }  // standing water
  }
  // shattered stumps
  for (const [x, y, h] of [[240, 700, 260], [700, 560, 120], [1020, 610, 170], [1480, 780, 330], [1760, 590, 140]]) {
    const w = h * 0.12, pts = [[x - w, y], [x - w * 0.7, y - h * 0.8], [x - w * 1.1, y - h], [x - w * 0.2, y - h * 0.84], [x + w * 0.3, y - h * 1.08], [x + w * 0.6, y - h * 0.78], [x + w, y]];
    fill(wa, pts, WA(0.5)); stroke(ln, pts, 3);
    stroke(ln, [[x + w * 0.4, y - h * 0.6], [x + w * 3, y - h * 0.82]], 2.5);
  }
  // wire: knife-rest posts and a coil running across the middle ground
  const wy = (x) => 760 + x * 0.04;
  for (let x = -40; x < 1960; x += 170) { stroke(ln, [[x - 22, wy(x) + 30], [x + 22, wy(x) - 50]], 3); stroke(ln, [[x + 22, wy(x) + 30], [x - 22, wy(x) - 50]], 3); }
  ln.strokeStyle = LN(); ln.lineWidth = 2;
  for (let x = -40; x < 1960; x += 26) { ln.beginPath(); ln.ellipse(x, wy(x) - 14, 22, 30, 0.3, 0, Math.PI * 2); ln.stroke(); }
}
function trinity(ln, wa) {
  const H = 640, X = 960;
  fill(wa, [[0, H - 50], [1920, H - 50], [1920, H], [0, H]], WA(0.06));
  // distant ridge
  const R = rng(61); const ridge = []; for (let x = 0; x <= 1920; x += 40) ridge.push([x, H - 30 - 26 * Math.abs(Math.sin(x * 0.004 + 1)) - 10 * R()]);
  fill(wa, [...ridge, [1920, H], [0, H]], WA(0.14)); stroke(ln, ridge, 2, 0.5);
  stroke(ln, [[0, H], [1920, H]], 2.5);
  // the shot tower: a steel lattice, four legs, cross-braced, a cab at the top
  const top = 440, bw = 46, tw = 18;
  const legL = (f) => [X - bw + (bw - tw) * f, H - (H - top) * f], legR = (f) => [X + bw - (bw - tw) * f, H - (H - top) * f];
  stroke(ln, [legL(0), legL(1)], 3); stroke(ln, [legR(0), legR(1)], 3);
  for (let k = 0; k < 7; k++) { const a = k / 7, b = (k + 1) / 7; stroke(ln, [legL(a), legR(b)], 2); stroke(ln, [legR(a), legL(b)], 2); stroke(ln, [legL(b), legR(b)], 2); }
  fill(wa, [[X - 22, top - 2], [X + 22, top - 2], [X + 22, top - 22], [X - 22, top - 22]], WA(0.5)); stroke(ln, [[X - 22, top - 2], [X - 22, top - 22], [X + 22, top - 22], [X + 22, top - 2]], 2.5, 1, true);
  for (let k = 0; k < 9; k++) stroke(ln, [[X - 600 + k * 150 - 20 * (k % 2), H + 40 + 30 * (k % 3)], [X - 560 + k * 150, H + 40 + 30 * (k % 3)]], 2, 0.4);
}
const DRAW = [fireLance, handCannon, bombard, somme, trinity];

let bakes = null;
function bakeAll() {
  if (bakes) return bakes;
  bakes = DRAW.map((fn, i) => {
    const L = makeCanvas(1920, 1080), Wc = makeCanvas(1920, 1080);
    for (const c of [L.c, Wc.c]) { c.fillStyle = '#fff'; c.fillRect(0, 0, 1920, 1080); c.globalCompositeOperation = 'darken'; }
    fn(L.c, Wc.c);
    // the year, small and brushed
    L.c.font = `400 76px ${NUM}`; L.c.textBaseline = 'alphabetic'; L.c.fillStyle = LN(); L.c.fillText(YEARS[i], 572, 210);
    // the wash, softened as if laid wet
    L.c.filter = 'blur(4.5px)'; L.c.drawImage(Wc.cv, 0, 0); L.c.filter = 'none';
    L.tex.needsUpdate = true;
    return L.tex;
  });
  return bakes;
}

// ------------------------------------------------------------------ shaders
let mat = null, copyMat = null, rtUnder = null, umberMat = null;
function build(e) {
  if (mat) return;
  rtUnder = new THREE.WebGLRenderTarget(e.W, e.H, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  copyMat = e.shader(`uniform sampler2D tSrc; void main(){ fragColor = texture(tSrc, vUv); }`, { tSrc: { value: null } });
  // stand-in for Petrov's oil painting: a dark umber room, a figure's shoulder, one light (the screen's red)
  umberMat = e.shader(/* glsl */`
    void main(){
      vec2 d = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      float n = fbm(d * vec2(.004, .012) + vec2(0., fbm(d * .006) * 2.));
      vec3 c = mix(vec3(.05, .03, .018), vec3(.24, .14, .07), n * .8);
      vec2 s = (d - vec2(1240., 360.)) / vec2(420., 200.); float scr = exp(-dot(s, s) * 1.6);
      c += vec3(.75, .12, .05) * scr * .7;
      float fig = smoothstep(.02, -.02, length((d - vec2(700., 900.)) / vec2(330., 420.)) - 1.);
      c = mix(c, vec3(.03, .02, .015) + vec3(.3, .05, .02) * scr * .3, fig * .9);
      fragColor = vec4(c, 1.);
    }`, {});
  mat = e.shader(/* glsl */`
    ${INK_GLSL}
    uniform sampler2D tA; uniform sampler2D tB; uniform float fA; uniform float fB; uniform float zA; uniform float zB;
    uniform float imgA; uniform float imgB; uniform float time; uniform float smoke; uniform float seed;
    uniform sampler2D tUnder; uniform float bAge; uniform vec2 bC; uniform float bDur;
    vec3 dens(sampler2D t, vec2 page, float isImg){
      vec2 uv = vec2(page.x / 1920., 1. - page.y / 1080.);
      if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec3(0.);
      vec3 c = texture(t, uv).rgb;
      if (isImg > .5) {                // a full-frame ink-wash still: luminance -> wash and line, redness -> cinnabar
        float l = dot(c, vec3(.2126, .7152, .0722));
        float red = clamp((c.r - max(c.g, c.b)) * 1.6, 0., 1.);
        float k = clamp((.92 - l) / .85, 0., 1.) * (1. - red);
        return vec3(k * .8, smoothstep(.72, .92, k), red);
      }
      vec3 m = 1. - c;                 // wash, line, cinnabar
      // pooled edges: the wash dries darker at its rim
      vec2 px = vec2(1. / 1920., 1. / 1080.) * 7.;
      float bl = (texture(t, uv + vec2(px.x, 0.)).r + texture(t, uv - vec2(px.x, 0.)).r + texture(t, uv + vec2(0., px.y)).r + texture(t, uv - vec2(0., px.y)).r) * .25;
      m.r += max(m.r - (1. - bl), 0.) * 1.4;
      // wet-in-wet: the wash pools and thins across a shape, and granulates in the paper's tooth
      m.r *= (.62 + .7 * fbm3(page * .0055 + seed)) * (.82 + .36 * vnoise(page * .11));
      return m;
    }
    float easeOut(float x){ return 1. - pow(1. - x, 3.); }
    float showMask(vec2 page, float f){
      // dissolve in/out of the smoke: the image condenses where the smoke is thick first
      float n = fbm3(page * .0035 + seed + vec2(time * .05, 0.)) * .8 + vnoise(page * .02) * .2;
      return smoothstep(n - .12, n + .12, f * 1.3 - .15);
    }
    void main(){
      vec2 d = fragDesign();
      vec4 pp = rice(d);
      float k = 0., r = 0.;
      if (fA > 0.) { vec2 pa = (d - vec2(960., 540.)) / zA + vec2(960., 540.); vec3 m = dens(tA, pa, imgA) * showMask(pa, fA); k += m.r * .7 + m.g; r += m.b; }
      if (fB > 0.) { vec2 pb = (d - vec2(960., 540.)) / zB + vec2(960., 540.); vec3 m = dens(tB, pb, imgB) * showMask(pb, fB); k = max(k, m.r * .7 + m.g); r = max(r, m.b); }
      k *= .9 + .2 * (pp.a - .5);
      // the alchemists' smoke, drifting left to right across the page
      vec2 q = d * vec2(.0013, .0024) + vec2(-time * .16, time * .03) + seed;
      float s = fbm3(q + vec2(fbm3(q * 1.6 + time * .07), fbm3(q * 1.3 - time * .05)) * .9);
      float sm = smoothstep(.42, .82, s) * smoke;
      k = k + sm * .3 * (1. - k * .6);
      vec3 col = lay(pp.rgb, k, r);
      col += vec3(1., .35, .12) * r * .25;         // fire is its own light
      // Trinity: the flash, then the paper burns open from a white-hot centre
      if (bAge >= 0.) {
        float rr = length(d - bC);
        vec2 dir = (d - bC) / max(rr, 1.);
        float bx = clamp((bAge - .02) / bDur, 0., 1.); float R = 1350. * (1. - (1. - bx) * (1. - bx));
        float edgeN = (fbm3(dir * 2.2 + seed + 3.) - .5) * .5 + (fbm3(d * .012 + seed) - .5) * .35;
        float e = rr - R * (1. + edgeN) - 30.;
        vec3 under = texture(tUnder, vUv).rgb;
        vec3 hot = vec3(1., .97, .9) * 2.2 * exp(-bAge / .1) * exp(-rr / 600.);
        float scorch = smoothstep(220., 40., e) * smoothstep(-1., .05, R / 1350.);
        col *= mix(vec3(1.), vec3(.62, .42, .24), scorch * .8);
        col *= 1. - smoothstep(60., 6., e) * .9;                      // char
        float ember = smoothstep(14., 3., e) * smoothstep(-6., 2., e);
        float fl = .7 + .3 * vnoise(d * .08 + time * 30.);
        col += vec3(2.4, .75, .18) * ember * fl * (R > 1. ? 1. : 0.);
        if (e < 0.) col = under + hot;
        // the flash itself: everything burns white for an instant
        col += vec3(1., .97, .92) * (4. * exp(-bAge / .04) * exp(-rr / 900.) + 1.5 * exp(-bAge / .03));
      }
      fragColor = vec4(col, 1.);
    }
    `, {
    tRice: { value: null }, tA: { value: null }, tB: { value: null }, fA: { value: 0 }, fB: { value: 0 }, zA: { value: 1 }, zB: { value: 1 },
    imgA: { value: 0 }, imgB: { value: 0 }, time: { value: 0 }, smoke: { value: 1 }, seed: { value: 0 },
    tUnder: { value: null }, bAge: { value: -1 }, bC: { value: new THREE.Vector2(960, 436) }, bDur: { value: 0.42 },
  });
}

let SCN = null;
async function underScene(p) {
  if (!p.under || p.under.isTexture) return null;
  if (!SCN) SCN = (await import('../../index.js')).SCENES;
  const name = typeof p.under === 'string' ? p.under : p.under.scene;
  return SCN[name] || null;
}

export default {
  async init() { await loadT2HistoryFonts(); },
  async prepare(ctx, shot, t, lt, p) {
    await loadT2HistoryFonts();
    if (p.imgs) await Promise.all(p.imgs.map((x) => loadTex(x).catch(() => null)));
    const T = weaponTimes(ctx.audio, p);
    if (t >= T.t[4]) {
      const sc = await underScene(p);
      if (sc && sc.prepare) await sc.prepare(ctx, shot, t, lt, p.under.p || {});
    }
  },
  async draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    const T = weaponTimes(ctx.audio, p).t;
    const B = bakeAll();
    const imgs = await Promise.all((p.imgs || []).map((x) => loadTex(x).catch(() => null)));
    const tex = (i) => imgs[i] || B[i];
    const isImg = (i) => (imgs[i] ? 1 : 0);
    const u = mat.uniforms;
    const seed = p.seed ?? 5;
    u.tRice.value = ricePaper(e, seed);
    // which images are up: the current one condenses in over 0.12 s, the previous one dissolves back into smoke
    let cur = -1; for (let i = 0; i < 5; i++) if (t >= T[i] - 0.03) cur = i;
    const fin = (i) => smooth(range(t, T[i] - 0.03, T[i] + 0.11));
    const zoom = (i) => 1 + 0.05 * easeOutCubic(range(t, T[i], T[i] + 0.9)) - (i === 4 ? 0 : 0);
    if (cur < 0) { u.fA.value = 0; u.fB.value = 0; }
    else {
      u.tB.value = tex(cur); u.imgB.value = isImg(cur); u.fB.value = fin(cur); u.zB.value = zoom(cur);
      if (cur > 0) { const fo = 1 - smooth(range(t, T[cur] - 0.03, T[cur] + 0.09)); u.tA.value = tex(cur - 1); u.imgA.value = isImg(cur - 1); u.fA.value = fo; u.zA.value = zoom(cur - 1); }
      else u.fA.value = 0;
    }
    if (cur === 0 && t < T[0]) u.fB.value = fin(0);
    u.time.value = t; u.smoke.value = p.smoke ?? 1; u.seed.value = (seed % 29) * 2.3;
    // the burn-through
    const bAge = t - T[4] - (p.burnDelay ?? 0.02);
    u.bAge.value = t >= T[4] ? Math.max(0, bAge) : -1;
    u.bDur.value = p.burnDur ?? 0.42;
    const bc = p.burnC || [960, 436]; u.bC.value.set(bc[0], bc[1]);
    if (t >= T[4]) {
      if (p.under && p.under.isTexture) { copyMat.uniforms.tSrc.value = p.under; e.pass(copyMat, rtUnder); }
      else {
        const sc = await underScene(p);
        if (sc) {
          const up = (p.under.p && typeof p.under.p === 'function') ? p.under.p(t, lt, ctx) : (p.under.p || {});
          await sc.draw(ctx, shot, t, lt, up);
          copyMat.uniforms.tSrc.value = e.rtScene.texture; e.pass(copyMat, rtUnder);
        } else e.pass(umberMat, rtUnder);
      }
      u.tUnder.value = rtUnder.texture;
    }
    e.pass(mat, e.rtScene);
  },
};
