// t2_labels: part two of the adversary plan ("our and their", Jade, 29 Oct; after Tom Gauld's cartoon of two identical sides that
// only the labels tell apart). Short in-world labels drawn by the renderer on surfaces in the picture: a display, a stamp on a
// document, a poster's banner, a tag by a chess piece (never a subtitle). The label rule (plan part two A):
//   - two or three words, on screen >= 1 s, <= 3 words a second, readable on a 480 px wide phone view (cap height >= ~9 px there);
//   - colour says WHOSE thing it is: Jade's things in her orange, teal-tips' in teal; the words say who is speaking (OUR / THEIR).
//     So on Jade's screen her own station is OUR LISTENING POST (orange) and teal-tips' is THEIR SPY STATION (teal), and teal-tips'
//     screen says exactly the same from her side, colours swapped: the same thing gets the opposite name across the wall;
//   - same typeface and layout on both sides (Big Shoulders Display, stamped tags), so the symmetry reads;
//   - labels on teal-tips' side read normally, left to right (an exception to the mirror rule's reversed lettering, labels only);
//   - no country, flag or real organisation, ever.
// p: {labels: [{lines: ['OUR', 'LISTENING POST'], side: 'jade'|'teal' (whose thing: the tag's colour), t0, t1 (song s; t1 null =
//       to the shot's end), at: [x, y] design px (the tag's centre) | quad: [[x,y] x4] (a display: the tag fills it, mapped in
//       perspective), h (cap height, design px; 44), rot (rad), plate (true: a filled tag; false: coloured type on the dark display),
//       strike: t (a hand-drawn strike through the words from t; Petrov), peel: {t, dir} (the tag peels off and falls: the mirror)}
//       | {poster: 'jade'|'teal', quad, t0, t1, alpha} (the matched poster, fx/racepost.js)],
//     gain (0.9: the tags stay their colour, not bloomed)}
import { clamp, easeOutCubic, easeInCubic, hash1 } from '../../../util.js';
import { mapQuad } from './contact.js';
import { posterCanvas } from './racepost.js';

export const LABEL_COL = { jade: '#ff7a2a', teal: '#3fe0c5' };
export const LABEL_INK = '#0d1117';
const FONT = 'L2Board';

// a tag at (0, 0) (its centre) in the current transform; h = cap height; a = alpha; plate: filled tag (else coloured type)
export function drawTag(c, lines, h, col, a = 1, plate = true, strikeU = 0) {
  c.save();
  c.font = `800 ${h * 1.36}px ${FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const lead = h * 1.32;
  const ws = lines.map((s) => c.measureText(s).width);
  const W = Math.max(...ws) + h * 0.9, H = lines.length * lead + h * 0.55;
  c.globalAlpha = a;
  if (plate) {
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.roundRect(-W / 2 + h * 0.08, -H / 2 + h * 0.1, W, H, h * 0.16); c.fill();   // its shadow
    if (Array.isArray(col)) {   // two owners (OUR, once, over both): the tag is half one colour, half the other
      const gr = c.createLinearGradient(-W / 2, 0, W / 2, 0);
      gr.addColorStop(0, col[0]); gr.addColorStop(0.5, col[0]); gr.addColorStop(0.5, col[1]); gr.addColorStop(1, col[1]);
      c.fillStyle = gr;
    } else c.fillStyle = col;
    c.beginPath(); c.roundRect(-W / 2, -H / 2, W, H, h * 0.16); c.fill();
    c.strokeStyle = LABEL_INK; c.lineWidth = h * 0.07; c.beginPath(); c.roundRect(-W / 2 + h * 0.14, -H / 2 + h * 0.14, W - h * 0.28, H - h * 0.28, h * 0.1); c.stroke();
  }
  c.fillStyle = plate ? LABEL_INK : col;
  if (!plate) { c.shadowColor = col; c.shadowBlur = h * 0.35; }
  lines.forEach((s, i) => c.fillText(s, 0, -H / 2 + h * 0.3 + lead * (i + 1) - (lead - h) * 0.5));
  c.shadowBlur = 0;
  if (strikeU > 0) {   // struck through by hand: one slightly rising stroke per line, drawn left to right
    c.strokeStyle = plate ? LABEL_INK : '#ff4630'; c.lineWidth = h * 0.22; c.lineCap = 'round';
    lines.forEach((s, i) => {
      const y = -H / 2 + h * 0.3 + lead * (i + 1) - (lead - h) * 0.5 - h * 0.45, w = ws[i] / 2 + h * 0.2;
      const u = clamp(strikeU * lines.length - i);
      if (u <= 0) return;
      c.beginPath(); c.moveTo(-w, y + h * 0.12); c.lineTo(-w + 2 * w * u, y + h * 0.12 - h * 0.24 * u); c.stroke();
    });
  }
  c.restore();
  return [W, H];
}

// a label's alpha at t: a stamp in (0.1 s, with a small overshoot), held, out in 0.15 s
function presence(L, t, shot) {
  const t0 = L.t0 ?? shot.t0, t1 = L.t1 ?? shot.t1 ?? 1e9;
  if (t < t0 || t > t1) return null;
  const ain = clamp((t - t0) / 0.1), aout = clamp((t1 - t) / 0.15);
  return { a: Math.min(ain, aout), pop: 1 + 0.12 * Math.sin(Math.PI * ain) * (ain < 1 ? 1 : 0) };
}

let qcv = null;
function quadCanvas() { if (!qcv) { qcv = document.createElement('canvas'); qcv.width = 640; qcv.height = 400; } return qcv; }

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const tq = Math.floor(t * 12 + 1e-3) / 12;   // on twos, with the plate under it
    const c = e.c2dBegin();
    let drew = false;
    for (const L of p.labels || []) {
      const pr = presence(L, tq, shot);
      if (!pr) continue;
      const col = L.side === 'both' ? [LABEL_COL.jade, LABEL_COL.teal] : (LABEL_COL[L.side] || L.side);
      const strikeU = L.strike != null ? clamp((tq - L.strike) / 0.45) : 0;
      if (L.poster) {   // the matched poster (fx/racepost.js), mapped onto a wall / window quad
        mapQuad(c, posterCanvas(L.poster), L.quad, pr.a * (L.alpha ?? 1), 600, 840);
      } else if (L.quad) {   // a display: the label fills it, in coloured type on the display's dark, mapped in perspective
        const cv = quadCanvas(), g = cv.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 640, 400);
        g.fillStyle = 'rgba(6,10,16,0.94)'; g.fillRect(0, 0, 640, 400);
        g.fillStyle = col; g.globalAlpha = 0.9; g.fillRect(0, 0, 640, 16); g.globalAlpha = 1;   // the panel's colour bar
        g.translate(320, 212);
        // fit: the tag fills the display edge to edge (the widest line inside 600 px, all lines inside its 400 px height)
        g.font = `800 ${100 * 1.36}px ${FONT}`;
        const wmax = Math.max(...L.lines.map((x) => g.measureText(x).width));
        const hh = Math.min(L.h ?? 96, 100 * 600 / wmax, 396 / (L.lines.length * 1.32 + 0.3));
        drawTag(g, L.lines, hh, col, 1, L.plate ?? true, strikeU);
        mapQuad(c, cv, L.quad, pr.a, 640, 400);
      } else {
        let [x, y] = L.at, rot = L.rot || 0, a = pr.a;
        if (L.peel && tq >= L.peel.t) {   // peels off and falls: the corner lifts, then it drops away turning
          const u = tq - L.peel.t, d = L.peel.dir ?? (hash1(x) > 0.5 ? 1 : -1);
          y += 900 * easeInCubic(clamp(u / 0.9)); x += d * 120 * u; rot += d * 1.4 * easeInCubic(clamp(u / 0.9));
          a *= 1 - clamp((u - 0.6) / 0.3);
          if (a <= 0) continue;
        }
        c.save(); c.translate(x, y); c.rotate(rot); c.scale(pr.pop, pr.pop);
        drawTag(c, L.lines, L.h ?? 44, col, a, L.plate ?? true, strikeU);
        c.restore();
      }
      drew = true;
    }
    if (drew) e.blit2d('over', p.gain ?? 0.9);
  },
};
