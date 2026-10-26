// END CARD: the last frame rhymes with the first. The same pale dot, the reticle now only a ring of light; the count still
// pulsing on (it goes higher); credits in the books' small caps; the Hyperstition lines.
// p: {start, holdT (the last whispered "Hold your fire")}
import { drawSky } from './sky.js';
import { P, css } from '../palette.js';
import { smooth, range, easeOutCubic, clamp } from '../util.js';

const DOT = [960, 420];
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const k = smooth(range(t, p.start, p.start + 6));
    drawSky(ctx, { pan: [t * 2, 0], zoom: 1.12 - 0.1 * k, density: 0.55, band: 0.55, bandAng: -0.42, bandOff: -120, neb: 0.5, nebCol: [0.03, 0.05, 0.11], nebCol2: [0.06, 0.04, 0.02], seed: 3, exposure: 0.9 });
    const c = e.c2dBegin();
    const [dx, dy] = DOT;
    // the count goes on: slow gold pulses, each a little brighter
    const per = 1.15, ph = (t - p.start) / per;
    const pv = Math.exp(-((ph % 1) * per) / 0.08) * smooth(range(t, p.start + 0.5, p.start + 1.5));
    c.save(); c.globalCompositeOperation = 'lighter';
    let g = c.createRadialGradient(dx, dy, 0, dx, dy, 26);
    g.addColorStop(0, 'rgba(190,215,255,0.95)'); g.addColorStop(0.15, 'rgba(120,160,255,0.35)'); g.addColorStop(1, 'rgba(60,90,200,0)');
    c.fillStyle = g; c.beginPath(); c.arc(dx, dy, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(235,245,255,1)'; c.beginPath(); c.arc(dx, dy, 3.2, 0, Math.PI * 2); c.fill();
    if (pv > 0.01) {
      g = c.createRadialGradient(dx, dy, 0, dx, dy, 18 + 110 * pv);
      g.addColorStop(0, css(P.goldPale, Math.min(1, pv))); g.addColorStop(0.25, css(P.gold, 0.45 * pv)); g.addColorStop(1, css(P.gold, 0));
      c.fillStyle = g; c.beginPath(); c.arc(dx, dy, 18 + 110 * pv, 0, Math.PI * 2); c.fill();
    }
    // the ring of light (what the reticle became)
    const R = 290;
    const ra = smooth(range(t, p.start, p.start + 1.2));
    for (let i = 0; i < 3; i++) { c.strokeStyle = css(P.gold, 0.22 * ra / (i + 1)); c.lineWidth = 6 + i * 14; c.beginPath(); c.arc(dx, dy, R, 0, Math.PI * 2); c.stroke(); }
    c.strokeStyle = css(P.goldPale, 0.85 * ra); c.lineWidth = 2; c.beginPath(); c.arc(dx, dy, R, 0, Math.PI * 2); c.stroke();
    // fibonacci ticks around the ring, lighting one by one as the count climbs
    const lit = Math.floor((t - p.start) / per);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2 - Math.PI / 2;
      const isF = FIB.includes(i);
      if (!isF) continue;
      const on = FIB.indexOf(i) <= lit;
      c.strokeStyle = css(on ? P.goldPale : P.gold, (on ? 0.95 : 0.25) * ra); c.lineWidth = 2;
      c.beginPath(); c.moveTo(dx + Math.cos(a) * R, dy + Math.sin(a) * R); c.lineTo(dx + Math.cos(a) * (R - 18), dy + Math.sin(a) * (R - 18)); c.stroke();
    }
    c.restore();
    e.blit2d('over', 2.0);
    ctx.state.endcard = { lit };
  },
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p; const lit = (ctx.state.endcard || {}).lit ?? 0;
    const n = FIB[Math.max(0, Math.min(FIB.length - 1, 14 + Math.max(0, lit - 2)))];
    // the counter keeps climbing past 610
    ty.text(lit < 0 ? '' : `${Math.max(610, n).toLocaleString('en-US')} WORLDS · HOLDING`, 960, 420 + 290 + 50, { font: 'Plex', size: 18, track: 0.18, align: 'center', color: P.goldPale, alpha: 0.8 * smooth(range(t, p.start + 1, p.start + 2)) });
    const a = smooth(range(t, p.holdT + 1.2, p.holdT + 2.4));
    ty.text('HOLD  FIRE', 960, 470, { font: 'Michroma', size: 64, track: 0.5, align: 'center', base: 'middle', color: P.cream, alpha: a * 0, glow: 0 });
    const cr = [
      ['WORDS', 'JADE WANG · FOUND IN HER POEMS · RHYMED WITH CLAUDE'],
      ['MUSIC', 'JADE WANG · ARRANGEMENT REALIZED WITH SUNO'],
      ['PICTURE', 'DRAWN IN JAVASCRIPT BY CLAUDE · OVER MOTION FROM SEEDANCE 2.5'],
      ['', 'THE 610 WORLDS ARE FICTIONAL · THE NEAR-MISSES ARE REAL'],
    ];
    cr.forEach(([k, v], i) => {
      const ai = a * smooth(range(t, p.holdT + 1.6 + i * 0.25, p.holdT + 2.4 + i * 0.25));
      if (k) ty.label(k, 640, 950 + i * 30, { align: 'right', color: P.bookGold, alpha: ai, size: 13 });
      ty.label(v, 660, 950 + i * 30, { color: P.cream, alpha: ai * 0.85, size: 13 });
    });
    ty.excerpt('Hyperstition', ['plant all the right words at all the right times', 'and compile this into a universe', 'where not everyone dies'], 110, 110, t, p.start + 0.8, 9999, { size: 30, kicker: 'EXCERPT FROM · DAY ONE' });
  },
};
