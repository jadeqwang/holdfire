// COLD OPEN: the hunter's scope. A red reticle settles on a pale dot that counts in gold light (1, 1, 2, 3, 5, 8).
// On 8 the crosshair retracts, the reticle opens into a ring of light, and the title lands. We don't know whose scope this is
// (the drop reveals it: the Other's). Every frame works as a silent poster: frame 0 already shows the scope and the premise.
// p: {counts:[{n, t}] (song times of the whispered numbers), title: t, end: t}
import { drawSky } from './sky.js';
import { P, css, mix } from '../palette.js';
import { clamp, lerp, smooth, easeOutCubic, easeInOutCubic, easeOutExpo, range, hash1, hash2, pulse } from '../util.js';
import { drawGlyph, drawNumberGlyph } from '../glyphs.js';

const DOT = [1030, 560];          // the pale dot (Sol III) in design px

// gold pulse brightness of the dot at time t: each count n flashes n quick pulses starting at its onset
function pulses(t, counts) {
  let v = 0;
  for (const c of counts) {
    const gap = c.n <= 3 ? 0.16 : (c.n === 5 ? 0.11 : 0.085);
    for (let i = 0; i < c.n; i++) { const ti = c.t + i * gap; if (t >= ti) v = Math.max(v, Math.exp(-(t - ti) / 0.07)); }
  }
  return v;
}

function countState(t, counts) {
  let k = -1; for (let i = 0; i < counts.length; i++) if (t >= counts[i].t) k = i;
  return k;
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const counts = p.counts;
    const k = countState(t, counts);
    const last = counts[counts.length - 1];
    const open = easeInOutCubic(range(t, last.t + 0.35, last.t + 1.6));          // reticle -> ring of light
    const settle = easeOutCubic(range(t, shot.t0, counts[0].t + 0.2));           // scope drift settles onto the dot
    const drift = [lerp(-140, 0, settle) + Math.sin(t * 0.7) * 6 * (1 - open), lerp(70, 0, settle) + Math.cos(t * 0.9) * 4 * (1 - open)];
    // sky slowly pans as the scope tracks
    drawSky(ctx, { pan: [t * 4 - drift[0] * 0.3, -drift[1] * 0.3], zoom: 1.0 + 0.08 * smooth(range(t, shot.t0, shot.t1)), density: 0.55, band: 0.55, bandAng: -0.42, bandOff: -120, neb: 0.5, nebCol: [0.03, 0.05, 0.11], nebCol2: [0.09, 0.03, 0.04], twinkle: 0.5, seed: 3 });

    const c = e.c2dBegin();
    const pv = pulses(t, counts);
    const dx = DOT[0] + drift[0], dy = DOT[1] + drift[1];
    // the scope's field stop: dark outside a big circle (telescope / rifle scope), opening to full frame with the ring of light
    const R = lerp(470, 1500, open * open);
    c.save();
    c.fillStyle = 'rgba(2,3,6,0.93)';
    c.beginPath(); c.rect(0, 0, 1920, 1080); c.arc(960, 540, R, 0, Math.PI * 2, true); c.fill('evenodd');
    // lens edge falloff
    const g = c.createRadialGradient(960, 540, R * 0.82, 960, 540, R);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    c.fillStyle = g; c.beginPath(); c.arc(960, 540, R, 0, Math.PI * 2); c.fill();
    c.restore();

    // the pale dot: a blue-white point, with gold pulses (the count)
    const dotR = 3.2;
    c.save();
    c.globalCompositeOperation = 'lighter';
    let gg = c.createRadialGradient(dx, dy, 0, dx, dy, 26);
    gg.addColorStop(0, 'rgba(190,215,255,0.95)'); gg.addColorStop(0.15, 'rgba(120,160,255,0.35)'); gg.addColorStop(1, 'rgba(60,90,200,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(dx, dy, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(235,245,255,1)'; c.beginPath(); c.arc(dx, dy, dotR, 0, Math.PI * 2); c.fill();
    if (pv > 0.01) {
      const rr = 18 + 120 * pv;
      gg = c.createRadialGradient(dx, dy, 0, dx, dy, rr);
      gg.addColorStop(0, css(P.goldPale, Math.min(1, pv * 1.2))); gg.addColorStop(0.2, css(P.gold, 0.55 * pv)); gg.addColorStop(1, css(P.gold, 0));
      c.fillStyle = gg; c.beginPath(); c.arc(dx, dy, rr, 0, Math.PI * 2); c.fill();
      // horizontal glint
      c.fillStyle = css(P.goldPale, 0.6 * pv); c.fillRect(dx - 260 * pv, dy - 1.2, 520 * pv, 2.4);
    }
    c.restore();

    // ---- the reticle (red: fire). It tightens with each count, hesitates, then opens into a ring of light.
    const tight = k < 0 ? 0 : (k + 1) / counts.length;
    const redness = 1 - open;
    const col = mix(P.gold, P.red, redness);
    const rc = css(col, 0.95);
    c.save();
    c.beginPath(); c.arc(960, 540, R - 4, 0, Math.PI * 2); c.clip();
    c.translate(dx, dy);
    c.strokeStyle = rc; c.fillStyle = rc; c.lineCap = 'butt';
    // outer ring with Fibonacci-spaced ticks
    const r0 = lerp(300, 236, tight) + open * 140;
    c.lineWidth = 2.2;
    c.globalAlpha = 1;
    c.beginPath(); c.arc(0, 0, r0, 0, Math.PI * 2); c.stroke();
    const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2 + t * 0.02 * (1 - open);
      const major = fib.includes(i % 90);
      const l = major ? 16 : 7;
      c.lineWidth = major ? 2 : 1.2;
      c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * (r0 - l), Math.sin(a) * (r0 - l)); c.stroke();
    }
    // inner segmented ring (rotates against the outer)
    const r1 = lerp(150, 96, tight) * (1 - open) + open * 60;
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a0 = i * Math.PI / 2 + Math.PI / 4 - t * 0.15 * (1 - open);
      c.beginPath(); c.arc(0, 0, r1, a0 + 0.18, a0 + Math.PI / 2 - 0.18); c.stroke();
    }
    // crosshair: four lines with a gap at the centre; they retract outward as it opens
    const gap = lerp(70, 26, tight) + open * 900;
    c.lineWidth = 2;
    c.globalAlpha = 1 - open;
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      c.beginPath(); c.moveTo(ux * gap, uy * gap); c.lineTo(ux * (gap + 900), uy * (gap + 900)); c.stroke();
    }
    // lock brackets converge
    const bk = lerp(210, 120, easeOutCubic(tight)) + open * 300;
    c.lineWidth = 3;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      c.beginPath(); c.moveTo(sx * bk, sy * (bk - 34)); c.lineTo(sx * bk, sy * bk); c.lineTo(sx * (bk - 34), sy * bk); c.stroke();
    }
    c.globalAlpha = 1;
    c.restore();

    // the ring of light (after it opens): a soft gold annulus around the dot
    if (open > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const rr = r0;
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = css(P.gold, 0.25 * open / (i + 1)); c.lineWidth = 6 + i * 14;
        c.beginPath(); c.arc(dx, dy, rr, 0, Math.PI * 2); c.stroke();
      }
      c.strokeStyle = css(P.goldPale, 0.9 * open); c.lineWidth = 2;
      c.beginPath(); c.arc(dx, dy, rr, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    e.blit2d('over', 2.2);
    ctx.state.coldopen = { dx, dy, k, open, pv, tight };
  },

  // HUD + numerals (type layer)
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p; const counts = p.counts; const st = ctx.state.coldopen || {};
    const k = st.k ?? -1, open = st.open ?? 0;
    const red = mix(P.gold, P.red, 1 - open);
    // premise lines: present from frame 0 (silent-autoplay poster), gone as the count begins in earnest
    const qa = 1 - smooth(range(t, counts[1].t, counts[2].t));
    ty.text('THE UNIVERSE IS A DARK FOREST.', 110, 140, { font: 'Plex', size: 34, track: 0.1, color: P.red, alpha: qa, glow: 14 });
    ty.text('EVERY CIVILIZATION IS AN ARMED HUNTER.', 110, 188, { font: 'Plex', size: 34, track: 0.1, color: P.red, alpha: qa, glow: 14 });
    ty.label('LIU CIXIN · THE DARK FOREST · 2008', 110, 232, { color: P.bookGold, alpha: qa * 0.85 });

    // the scope's HUD, in the Other's script with English beneath
    const hud = [
      ['TARGET', 'SOL III', 0],
      ['RANGE', '89 LIGHT-YEARS', 1],
      ['SIGNAL', k < 0 ? 'NONE' : 'DETECTED', 2],
      ['PATTERN', k < 0 ? '—' : counts.slice(0, k + 1).map((c) => c.n).join(' '), 3],
      ['SOURCE', k >= 3 ? 'NOT NATURAL' : 'ANALYSING', 4],
      ['WEAPON', open > 0.2 ? 'HOLD' : 'ARMED', 5],
    ];
    const x0 = 1500, y0 = 360;
    hud.forEach(([key, val, i]) => {
      const y = y0 + i * 64;
      const a = smooth(range(t, -1 + i * 0.12, 0.6 + i * 0.12)) * (1 - smooth(range(t, (p.title ?? 1e9) - 0.3, (p.title ?? 1e9) + 0.4)));
      const valCol = (key === 'WEAPON' && open > 0.2) || (key === 'SOURCE' && k >= 3) ? P.gold : red;
      ty.glyphs(key, x0, y, 30, t, { color: red, alpha: a * 0.9, seed: 1 });
      ty.label(key, x0 + 50, y - 6, { color: red, alpha: a * 0.75, size: 12 });
      ty.text(val, x0 + 50, y + 16, { font: 'Plex', size: 19, track: 0.06, color: valCol, alpha: a, glow: 8 });
    });

    // giant numerals of the count (left), the sequence building beneath
    if (k >= 0 && open < 1) {
      const c = counts[k];
      const t1 = k + 1 < counts.length ? counts[k + 1].t : c.t + 1.2;
      ty.numeral(c.n, t, c.t, t1, { x: 470, y: 560, size: 560, font: p.numFont || 'CormorantN', weight: 500, color: P.gold, glow: 50, out: 0.15 });
    }
    const seq = counts.filter((c) => t >= c.t).map((c) => c.n);
    ty.text(seq.join('   '), 470, 900, { font: 'Michroma', size: 30, track: 0.2, align: 'center', color: P.goldPale, alpha: 0.85 * (1 - open), glow: 10 });

    // title
    if (p.title != null) {
      const a = smooth(range(t, p.title, p.title + 0.9));
      ty.text('HOLD  FIRE', 960, 545, { font: 'Michroma', size: 120, track: 0.5, align: 'center', base: 'middle', color: P.cream, alpha: a, glow: 30, glowColor: P.gold });
      ty.label('JADE WANG  ·  WITH CLAUDE', 960, 650, { align: 'center', color: P.bookGold, alpha: a * smooth(range(t, p.title + 0.5, p.title + 1.4)), size: 16 });
    }
  },
};
