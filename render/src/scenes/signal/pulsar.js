// P1e "a pattern no dead star could make.": a plaque-style split diagram.
//   LEFT  — PSR B1919+21 (CP 1919, "LGM-1"; Bell & Hewish, Cambridge, 1967), ticking at its true period, 1.3373 s, on its own
//           clock (a dead star does not listen to the music). Its pulses stack into the ridgeline plot that made it famous.
//           DEAD STAR · PERIODIC · NATURAL.
//   RIGHT — the count, 1 1 2 3 5 8, as bursts of pulses locked to the song's eighth-note grid, each written beneath in binary the
//           way the Arecibo message wrote its numbers (a column of bits, least significant at the bottom) and in the Pioneer/Voyager
//           tick notation (| = 1, — = 0). NOT NATURAL.
// p: {t0 (first count burst; default the eighth at/after the word "pattern"), phase (song time of a pulsar pulse; default shot
//     start + 0.25), period (1.3373), draw0 (when the diagram engraves on; default shot start)}
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, easeOutCubic, range, hash1, hash2 } from '../../util.js';
import { lineByText, wordT, eighthsIn, strokePartial, binTicks , blitGold } from './lib.js';

const PERIOD = 1.3373;          // s, PSR B1919+21 (facts.md §5)
const FIB = [1, 1, 2, 3, 5, 8];
const LEFT = 500, RIGHT = 1420;

// one pulse profile of CP 1919 (drifting sub-pulses inside a fixed window), deterministic per pulse index
function profile(n, x) {
  const a = 0.75 + 0.5 * hash1(n * 3.1), b = 0.4 + 0.7 * hash1(n * 7.7), drift = (hash1(n * 1.3) - 0.5) * 0.25;
  const g = (m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  let v = a * g(-0.12 + drift, 0.07) + b * g(0.1 + drift * 0.6, 0.06) + 0.35 * g(0.0, 0.16);
  v += 0.05 * (hash2(n, Math.round(x * 60)) - 0.5) * g(0, 0.5);
  return v;
}

function timesOf(ctx, shot, p) {
  const L = lineByText(ctx.audio, 'pattern no dead star');
  const tp = wordT(L, 'pattern', shot.t0 + 0.2);
  const ei = eighthsIn(ctx.audio, (p.t0 ?? tp) - 0.08, shot.t1 + 2);
  const onsets = FIB.map((_, i) => ei[i] ?? ((p.t0 ?? tp) + i * 0.32));
  const phase = p.phase ?? (shot.t0 + 0.25);
  return { onsets, phase, period: p.period ?? PERIOD, draw0: p.draw0 ?? shot.t0 };
}

// brightness of the burst pulse j of group i at time t (flash, then settle to an engraved line)
function burst(t, on, j) { const tj = on + j * 0.045; if (t < tj) return -1; return Math.exp(-(t - tj) / 0.12); }

export const look = { bloom: 0.7, bloomThreshold: 0.75, halation: 0.15, vignette: 0.25, grain: 0.03, typeGlow: 0.3 };

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const T = timesOf(ctx, shot, p);
    e.clear(e.rtScene, ...P.void);
    const c = e.c2dBegin();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const dk = (a, b) => smooth(range(t, T.draw0 + a, T.draw0 + b));     // engrave-on progress
    const cream = P.cream, steel = mix(P.steel, P.cream, 0.45);

    // ---------------- frame: plaque rules
    c.strokeStyle = css(P.bookGold, 0.55); c.lineWidth = 2;
    strokePartial(c, [[960, 150], [960, 900]], dk(0, 0.4));
    for (const x0 of [140, 1040]) strokePartial(c, [[x0, 222], [x0 + 740, 222]], dk(0.05, 0.45));

    // ---------------- LEFT: the pulsar
    const nNow = Math.floor((t - T.phase) / T.period);           // index of the latest pulse
    const since = t - (T.phase + nNow * T.period);
    // ridgeline stack (newest at the bottom, sliding up as each new pulse arrives)
    const NL = 19, sp = 17, W0 = 210, W1 = 790, base = 640;
    const slide = easeOutCubic(clamp(since / 0.35));
    c.save();
    c.beginPath(); c.rect(W0 - 10, 262, W1 - W0 + 20, base - 262 + 6); c.clip();
    for (let k = NL; k >= 0; k--) {
      const n = nNow - k;
      const y = base - (k - 1 + slide) * sp;
      if (y < 345) continue;
      const age = k - 1 + slide;
      const a = (k === 0 ? slide : 1) * smooth(range(y, 345, 420)) * dk(0.02 + 0.012 * (NL - k), 0.2 + 0.012 * (NL - k));
      if (a <= 0.01) continue;
      const pts = [];
      for (let i = 0; i <= 120; i++) { const x = i / 120; const xx = (x - 0.5) * 2; pts.push([W0 + x * (W1 - W0), y - 74 * profile(n, xx * 0.9)]); }
      // hidden line: occlude what is behind
      c.beginPath(); c.moveTo(pts[0][0], y + 4); for (const q of pts) c.lineTo(q[0], q[1]); c.lineTo(pts[pts.length - 1][0], y + 4); c.closePath();
      c.fillStyle = css(P.void, 1); c.fill();
      const fresh = k === 0 ? Math.exp(-since / 0.25) : 0;
      c.strokeStyle = css(mix(steel, P.cream, fresh), a * (0.55 + 0.45 * (1 - age / NL)) + fresh * 0.4); c.lineWidth = 2;
      c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
    }
    c.restore();
    // live trace: the last ~3 periods scroll left into the stack; the playhead is "now"
    const ty0 = 740, tx0 = 270, tx1 = 800, win = 3.2;
    c.strokeStyle = css(steel, 0.85 * dk(0.05, 0.3)); c.lineWidth = 2;
    const tr = [];
    for (let i = 0; i <= 260; i++) {
      const x = i / 260; const tt = t - win * (1 - x);
      const n = Math.floor((tt - T.phase) / T.period + 0.5); const dt = tt - (T.phase + n * T.period);
      const v = Math.abs(dt) < 0.12 ? profile(n, dt / 0.06 * 0.45) : 0;
      tr.push([tx0 + x * (tx1 - tx0), ty0 - 70 * v]);
    }
    strokePartial(c, tr, dk(0.05, 0.4));
    // the neutron star: a lighthouse; the beam sweeps once per period and the pulse is recorded when it points at us (the trace)
    const ang = 2 * Math.PI * (t - T.phase) / T.period;
    const sx = 190, sy = ty0 - 10;
    const sa = dk(0.05, 0.3);
    c.strokeStyle = css(steel, 0.9 * sa); c.lineWidth = 2;
    c.beginPath(); c.arc(sx, sy, 11, 0, Math.PI * 2); c.stroke();
    for (const s of [0, Math.PI]) {
      const a0 = ang + s;
      c.beginPath(); c.moveTo(sx + Math.cos(a0 - 0.22) * 16, sy + Math.sin(a0 - 0.22) * 16); c.lineTo(sx + Math.cos(a0 - 0.16) * 54, sy + Math.sin(a0 - 0.16) * 54);
      c.moveTo(sx + Math.cos(a0 + 0.22) * 16, sy + Math.sin(a0 + 0.22) * 16); c.lineTo(sx + Math.cos(a0 + 0.16) * 54, sy + Math.sin(a0 + 0.16) * 54); c.stroke();
    }
    const flashL = Math.exp(-Math.max(0, since) / 0.1);
    c.fillStyle = css(P.cream, 0.5 + 0.5 * flashL); c.beginPath(); c.arc(sx, sy, 3.2 + 2 * flashL, 0, Math.PI * 2); c.fill();

    // ---------------- RIGHT: the count (bursts on the song's grid), with Arecibo bits and Pioneer ticks
    const gx0 = 1090, gx1 = 1770, gy = 560;
    // layout: pulses 13 px apart inside a group, 44 px between groups
    const pulsesX = []; let x = gx0;
    FIB.forEach((n, i) => { const g = []; for (let j = 0; j < n; j++) { g.push(x); x += 14; } pulsesX.push(g); x += 44; });
    const span = x - 44 - 14 - gx0, off = (gx1 - gx0 - span) / 2;
    c.strokeStyle = css(P.gold, 0.5 * dk(0.1, 0.5)); c.lineWidth = 2;
    strokePartial(c, [[gx0, gy], [gx1, gy]], dk(0.1, 0.5));
    FIB.forEach((n, i) => {
      const on = T.onsets[i];
      const cx = (pulsesX[i][0] + pulsesX[i][n - 1]) / 2 + off;
      for (let j = 0; j < n; j++) {
        const b = burst(t, on, j); if (b < 0) continue;
        const px = pulsesX[i][j] + off;
        const h = 150 + 40 * hash1(i * 10 + j);
        c.strokeStyle = css(mix(P.gold, P.goldPale, b), 0.95); c.lineWidth = 2.4 + 1.5 * b;
        c.beginPath(); c.moveTo(px, gy); c.lineTo(px, gy - h * (0.6 + 0.4 * easeOutCubic(clamp((t - on - j * 0.045) / 0.08)))); c.stroke();
        if (b > 0.02) { c.fillStyle = css(P.goldPale, b); c.beginPath(); c.arc(px, gy - h, 4 + 6 * b, 0, Math.PI * 2); c.fill(); }
      }
      // Arecibo column: bits of n, least significant at the bottom, with the marker square beneath
      const lit = t >= on;
      const bits = n.toString(2).padStart(4, '0');
      const sq = 15, by = 690;
      for (let r = 0; r < 4; r++) {
        const yy = by + r * 21;
        c.strokeStyle = css(P.gold, (lit ? 0.85 : 0.3) * dk(0.1, 0.4)); c.lineWidth = 2;
        c.strokeRect(cx - sq / 2, yy, sq, sq);
        if (lit && bits[r] === '1') { c.fillStyle = css(P.goldPale, 0.95); c.fillRect(cx - sq / 2 + 3, yy + 3, sq - 6, sq - 6); }
      }
      c.fillStyle = css(P.gold, (lit ? 0.8 : 0.25) * dk(0.1, 0.4)); c.fillRect(cx - sq / 2, by + 4 * 21 + 6, sq, 5);
      // Pioneer ticks (| = 1, — = 0), most significant first
      if (lit) {
        c.strokeStyle = css(P.goldPale, 0.9); c.lineWidth = 2;
        const bstr = n.toString(2);
        binTicks(c, bstr, cx - (bstr.length - 1) * 5, 838, 0, { step: 10, len: 14 });
      }
      ctx.state.pulsarCols = ctx.state.pulsarCols || []; ctx.state.pulsarCols[i] = cx;
    });
    blitGold(e, 'over', 1.45);
    ctx.state.pulsar = T;
  },

  type(ty, t, lt, shot, ctx) {
    const T = ctx.state.pulsar; if (!T) return;
    const cols = ctx.state.pulsarCols || [];
    const a = smooth(range(t, T.draw0, T.draw0 + 0.35));
    const steel = mix(P.steel, P.cream, 0.55);
    // left
    ty.text('PSR B1919+21', 140, 190, { font: 'Plex', size: 34, track: 0.04, color: P.cream, alpha: a });
    const notes = !(ctx.p && ctx.p.notes === false);   // p.notes false: drop the two micro captions (take two, polish 4; take one unchanged)
    if (notes) ty.label("CP 1919 · 'LGM-1' · BELL & HEWISH, CAMBRIDGE, 1967", 140, 252, { size: 12, color: steel, alpha: a * 0.85 });
    ty.text('P = 1.3373 s', 140, 815, { font: 'Plex', size: 26, track: 0.02, color: P.cream, alpha: a * 0.9 });
    ty.label('DEAD STAR · PERIODIC · NATURAL', 140, 878, { size: 26, weight: 600, track: 0.3, color: steel, alpha: a });
    // right
    { let x = 1040; FIB.forEach((n, i) => { const on = t >= T.onsets[i] - 0.02; const w = ty.text(String(n), x, 190, { font: 'Plex', size: 34, color: P.gold, alpha: a * (on ? 1 : 0.3), glow: on ? 6 : 0 }); x += w + 20; }); }
    if (notes) ty.label('EACH THE SUM OF THE TWO BEFORE · IN BINARY, AS ARECIBO (1974) AND PIONEER (1972) WROTE NUMBERS', 1040, 252, { size: 11, track: 0.2, color: P.bookGold, alpha: a * 0.85 });
    FIB.forEach((n, i) => {
      const on = T.onsets[i]; if (t < on - 0.02 || cols[i] == null) return;
      const k = easeOutCubic(range(t, on, on + 0.15));
      ty.text(String(n), cols[i], 640 - 10 * (1 - k), { font: 'Michroma', size: 34, align: 'center', color: P.goldPale, alpha: k, glow: 12 });
    });
    const last = T.onsets[FIB.length - 1];
    const na = smooth(range(t, last + 0.05, last + 0.4));
    ty.label('NOT NATURAL', 1040, 878, { size: 26, weight: 700, track: 0.3, color: P.gold, alpha: Math.max(0.0, na), glow: 14 });
  },
};
