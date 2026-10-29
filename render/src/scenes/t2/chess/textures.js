// Canvas textures for t2_chess: the board's coordinate border, the clock's two LCD faces (seven-segment digits),
// and the scoresheet (the pause-frame credit "Fischer–Tal · Leipzig 1960 · ½–½" plus the moves written so far).
import * as THREE from 'three';
import { GAME } from './pgn.js';

function tex(cv, mip = true) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  return t;
}

// board border: 9 x 9 units (8 squares + 0.5 border), White at the bottom; letters drawn white on transparent
export const BORDER = 0.5;
export function borderTexture() {
  const N = 2048, U = N / (8 + 2 * BORDER);
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, N, N);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `600 ${Math.round(U * 0.3)}px OpenSans`;
  const files = 'abcdefgh';
  for (let i = 0; i < 8; i++) {
    const x = (BORDER + i + 0.5) * U;
    c.fillText(files[i], x, N - BORDER * U * 0.5);
    c.save(); c.translate(x, BORDER * U * 0.5); c.rotate(Math.PI); c.fillText(files[i], 0, 0); c.restore();
    const y = (BORDER + 7 - i + 0.5) * U;
    c.fillText(String(i + 1), BORDER * U * 0.5, y);
    c.save(); c.translate(N - BORDER * U * 0.5, y); c.rotate(Math.PI); c.fillText(String(i + 1), 0, 0); c.restore();
  }
  // inlay line around the playing area
  c.strokeStyle = '#fff'; c.lineWidth = U * 0.035;
  c.strokeRect(BORDER * U - U * 0.09, BORDER * U - U * 0.09, 8 * U + U * 0.18, 8 * U + U * 0.18);
  const t = tex(cv); t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------------------------------------------------- clock LCDs
// seven-segment digit, slanted. x, y top-left; w, h digit box
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function seg7(c, d, x, y, w, h, on, off) {
  const th = w * 0.2, sl = 0.1;
  const P = (px, py) => [x + px + (h - py) * sl, y + py];
  const hseg = (py) => [P(th * 0.6, py), P(th * 1.1, py - th / 2), P(w - th * 1.1, py - th / 2), P(w - th * 0.6, py), P(w - th * 1.1, py + th / 2), P(th * 1.1, py + th / 2)];
  const vseg = (px, y0, y1) => [P(px, y0 + th * 0.6), P(px + th / 2, y0 + th * 1.1), P(px + th / 2, y1 - th * 1.1), P(px, y1 - th * 0.6), P(px - th / 2, y1 - th * 1.1), P(px - th / 2, y0 + th * 1.1)];
  const segs = {
    a: hseg(th / 2), g: hseg(h / 2), d: hseg(h - th / 2),
    f: vseg(th / 2, 0, h / 2), b: vseg(w - th / 2, 0, h / 2), e: vseg(th / 2, h / 2, h), c: vseg(w - th / 2, h / 2, h),
  };
  const lit = SEG[d] || '';
  for (const k of 'abcdefg') {
    c.fillStyle = lit.includes(k) ? on : off;
    c.beginPath(); segs[k].forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill();
  }
}
const colon = (c, x, y, h, col) => { c.fillStyle = col; const r = h * 0.055; for (const f of [0.32, 0.7]) { c.beginPath(); c.arc(x + (1 - f) * h * 0.1, y + h * f, r, 0, 7); c.fill(); } };

export function clockCanvas() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 300;
  return { cv, c: cv.getContext('2d'), tex: tex(cv, false), key: '' };
}

// face: {w, b (seconds left), running: 'w'|'b'|null, stopped}. Whole seconds (m:ss) like a tournament clock (DGT 3000); under
// TENTHS_BELOW seconds the tenths digit lights, as online clocks do in a scramble (Andrej, 29 Oct)
const TENTHS_BELOW = 20;
export function drawClock(cc, s, flagW = 0, flagB = 0) {
  const fmt = (x) => { x = Math.max(0, x); const tenths = Math.floor(x * 10 + 1e-6); const m = Math.floor(tenths / 600), sec = Math.floor(tenths / 10) % 60, d = x < TENTHS_BELOW ? tenths % 10 : -1; return [m, Math.floor(sec / 10), sec % 10, d]; };
  const key = `${fmt(s.w).join('')}|${fmt(s.b).join('')}|${s.running}|${s.stopped}`;
  if (key === cc.key) return;
  cc.key = key;
  const c = cc.c, W = 1024, H = 300;
  c.fillStyle = '#1a1c20'; c.fillRect(0, 0, W, H);
  const face = (x0, secs, run, accent) => {
    const fw = 470, fh = 236, y0 = 32;
    const g = c.createLinearGradient(0, y0, 0, y0 + fh);
    g.addColorStop(0, '#c9d6c2'); g.addColorStop(1, '#aebdab');
    c.fillStyle = g; c.beginPath(); c.roundRect(x0, y0, fw, fh, 22); c.fill();
    const on = '#141812', off = 'rgba(20,24,18,0.07)';
    const [m, s1, s2, d] = fmt(secs);
    const dh = 150, dw = 82, top = y0 + 46;
    seg7(c, m, x0 + 34, top, dw, dh, on, off);
    colon(c, x0 + 128, top, dh, on);
    seg7(c, s1, x0 + 150, top, dw, dh, on, off);
    seg7(c, s2, x0 + 248, top, dw, dh, on, off);
    // tenths, smaller: only under TENTHS_BELOW (d = -1 above: the point and the digit stay unlit)
    c.fillStyle = d >= 0 ? on : off; c.beginPath(); c.arc(x0 + 347, top + dh - 8, 8, 0, 7); c.fill();
    seg7(c, d >= 0 ? d : 8, x0 + 362, top + dh * 0.42, dw * 0.58, dh * 0.58, d >= 0 ? on : off, off);
    // running indicator and side accent
    c.fillStyle = accent; c.fillRect(x0 + 34, y0 + 16, 100, 12);
    if (run) { c.fillStyle = on; c.beginPath(); c.moveTo(x0 + fw - 60, y0 + 14); c.lineTo(x0 + fw - 30, y0 + 22); c.lineTo(x0 + fw - 60, y0 + 30); c.closePath(); c.fill(); }
  };
  // the faces look toward the board: seen from there, Black's end (-z) is on the left
  face(28, s.b, s.running === 'b', '#3fe0c5');     // left face: Black (teal-tips Jade)
  face(526, s.w, s.running === 'w', '#ff7a2a');    // right face: White (Jade, orange band)
  cc.tex.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------------- scoresheet
export function sheetCanvas() {
  const cv = document.createElement('canvas'); cv.width = 768; cv.height = 1024;
  return { cv, c: cv.getContext('2d'), tex: tex(cv), key: null };
}

export function drawSheet(sc, nPlies) {
  if (sc.key === nPlies) return;
  sc.key = nPlies;
  const c = sc.c, W = 768, H = 1024;
  c.fillStyle = '#f4eddc'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#1b2233'; c.textBaseline = 'alphabetic';
  // the credit (the only claim on the sheet)
  c.textAlign = 'center';
  c.font = '600 50px Cormorant';
  c.fillText('Fischer–Tal · Leipzig 1960 · ½–½', W / 2, 92);
  c.fillStyle = 'rgba(27,34,51,0.85)'; c.fillRect(48, 118, W - 96, 3);
  // ruled grid
  const top = 176, rows = 21, rh = (H - top - 40) / rows;
  c.font = '700 22px OpenSans'; c.fillStyle = 'rgba(27,34,51,0.75)';
  c.textAlign = 'left'; c.fillText('WHITE', 140, top - 18); c.fillText('BLACK', 450, top - 18);
  c.strokeStyle = 'rgba(40,70,140,0.35)'; c.lineWidth = 2;
  for (let i = 0; i <= rows; i++) { c.beginPath(); c.moveTo(48, top + i * rh); c.lineTo(W - 48, top + i * rh); c.stroke(); }
  for (const x of [118, 430]) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, top + rows * rh); c.stroke(); }
  c.font = '500 24px PlexM'; c.fillStyle = 'rgba(27,34,51,0.6)'; c.textAlign = 'right';
  for (let i = 0; i < rows; i++) c.fillText(String(i + 1), 104, top + i * rh + rh * 0.72);
  // the moves so far, handwritten
  c.textAlign = 'left'; c.fillStyle = '#1a2a5c'; c.font = '600 34px CormorantI';
  for (let k = 0; k < nPlies; k++) {
    const p = GAME.plies[k];
    const row = k >> 1, x = (k & 1) ? 452 : 140;
    c.fillText(p.san.replace('O-O-O', '0-0-0').replace('O-O', '0-0'), x, top + row * rh + rh * 0.74);
  }
  sc.tex.needsUpdate = true;
}
