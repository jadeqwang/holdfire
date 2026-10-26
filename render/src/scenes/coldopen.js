// COLD OPEN: the hunter's scope. A red reticle settles on a pale dot that counts in gold light (1, 1, 2, 3, 5, 8),
// locks on in the silence, hears the count again (it repeats: not a star, a mind), and opens into a ring of light.
// We don't know whose scope this is (the drop reveals it: the Other's). Frame 0 already works as a silent poster.
// p: {counts:[{n, t, g}] (the whispered numbers, g = 0 first pass, 1 repeat), title: t}
import { drawSky } from './sky.js';
import { P, css, mix } from '../palette.js';
import { clamp, lerp, smooth, easeOutCubic, easeInOutCubic, range } from '../util.js';

const DOT = [1040, 540];          // the pale dot (Sol III) in design px

// gold pulse brightness of the dot: each count n flashes n quick pulses from its onset
function pulses(t, counts) {
  let v = 0;
  for (const c of counts) {
    const gap = c.n <= 3 ? 0.15 : (c.n === 5 ? 0.1 : 0.075);
    for (let i = 0; i < c.n; i++) { const ti = c.t + i * gap; if (t >= ti) v = Math.max(v, Math.exp(-(t - ti) / 0.06)); }
  }
  return v;
}
const countIdx = (t, counts) => { let k = -1; for (let i = 0; i < counts.length; i++) if (t >= counts[i].t) k = i; return k; };

function phases(t, counts) {
  const g1 = counts.filter((c) => !c.g), g2 = counts.filter((c) => c.g);
  const g1end = g1[g1.length - 1].t, g2start = g2.length ? g2[0].t : g1end + 2, last = counts[counts.length - 1].t;
  return {
    g1, g2, g1end, g2start, last,
    lock: smooth(range(t, g1end + 0.35, g1end + 1.2)) * (1 - smooth(range(t, last + 0.2, last + 0.6))),
    open: easeInOutCubic(range(t, last + 0.3, last + 1.5)),
    settle: easeOutCubic(range(t, 0, g1[0].t + 0.3)),
  };
}

export default {
  draw(ctx, shot, t0, lt, p) {
    const e = ctx.engine;
    // p.atT replays the scope at a moment of the cold open (the drop's reveal cuts back to the locked reticle)
    const t = p.atT != null ? p.atT + lt * (p.rate ?? 0.15) : t0;
    const counts = p.counts;
    const k = countIdx(t, counts);
    const ph = phases(t, counts);
    const { open, lock, settle } = ph;
    const still = 1 - lock;        // during the lock the scope stops breathing
    // the search: the view slews (the dot enters from the right, overshoots, and the scope snaps onto it at ~g1[0].t - 0.2)
    const snapT = ph.g1[0].t - 0.2;
    const u = clamp(t / snapT);
    const ease = 1 - Math.pow(1 - u, 3);
    const spring = t > snapT ? Math.exp(-(t - snapT) * 9) * Math.sin((t - snapT) * 26) * 18 : 0;
    const off = [lerp(760, 0, ease) + spring, lerp(-330, 0, ease) - spring * 0.4];
    const drift = [off[0] + Math.sin(t * 0.7) * 6 * (1 - open) * still, off[1] + Math.cos(t * 0.9) * 4 * (1 - open) * still];
    drawSky(ctx, { pan: [t * 3 + drift[0], drift[1]], zoom: 1.0 + 0.06 * smooth(range(t, 0, 13)), density: 0.55, band: 0.55, bandAng: -0.42, bandOff: -120, neb: 0.5, nebCol: [0.03, 0.05, 0.11], nebCol2: [0.09, 0.03, 0.04], seed: 3 });

    const c = e.c2dBegin();
    const pv = pulses(t, counts);
    const dx = DOT[0] + drift[0], dy = DOT[1] + drift[1];
    const cx0 = DOT[0] + Math.sin(t * 2.1) * 9, cy0 = DOT[1] + Math.cos(t * 1.7) * 7;   // before the snap the reticle sweeps at the scope's centre
    // the scope's field stop: dark outside a big circle, opening to the full frame as the reticle becomes a ring of light
    const R = lerp(470, 1500, open * open);
    c.save();
    c.fillStyle = 'rgba(2,3,6,0.94)';
    c.beginPath(); c.rect(0, 0, 1920, 1080); c.arc(960, 540, R, 0, Math.PI * 2, true); c.fill('evenodd');
    const g = c.createRadialGradient(960, 540, R * 0.8, 960, 540, R);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    c.fillStyle = g; c.beginPath(); c.arc(960, 540, R, 0, Math.PI * 2); c.fill();
    c.restore();

    // the pale dot, with its gold pulses
    c.save(); c.globalCompositeOperation = 'lighter';
    let gg = c.createRadialGradient(dx, dy, 0, dx, dy, 26);
    gg.addColorStop(0, 'rgba(190,215,255,0.95)'); gg.addColorStop(0.15, 'rgba(120,160,255,0.35)'); gg.addColorStop(1, 'rgba(60,90,200,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(dx, dy, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(235,245,255,1)'; c.beginPath(); c.arc(dx, dy, 3.2, 0, Math.PI * 2); c.fill();
    if (pv > 0.01) {
      const rr = 18 + 130 * pv;
      gg = c.createRadialGradient(dx, dy, 0, dx, dy, rr);
      gg.addColorStop(0, css(P.goldPale, Math.min(1, pv * 1.2))); gg.addColorStop(0.2, css(P.gold, 0.55 * pv)); gg.addColorStop(1, css(P.gold, 0));
      c.fillStyle = gg; c.beginPath(); c.arc(dx, dy, rr, 0, Math.PI * 2); c.fill();
      c.fillStyle = css(P.goldPale, 0.6 * pv); c.fillRect(dx - 300 * pv, dy - 1.2, 600 * pv, 2.4);
    }
    c.restore();

    // ---- the reticle (red: fire). Tightens with each count, locks in the silence, opens into a ring of light.
    const tight = clamp((k + 1) / 6) * 0.8 + lock * 0.2;
    const col = mix(P.gold, P.red, 1 - open);
    const a = 0.85 + 0.15 * lock + 0.1 * Math.sin(t * 18) * lock;   // a nervous flicker while locked
    c.save();
    c.beginPath(); c.arc(960, 540, R - 4, 0, Math.PI * 2); c.clip();
    c.translate(t >= snapT ? dx : cx0, t >= snapT ? dy : cy0);
    c.strokeStyle = css(col, a); c.fillStyle = css(col, a);
    const r0 = lerp(300, 226, tight) + open * 150;
    c.lineWidth = 2.2;
    c.beginPath(); c.arc(0, 0, r0, 0, Math.PI * 2); c.stroke();
    const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const spin = (t < snapT ? t * 0.35 : snapT * 0.35 + (t - snapT) * 0.02) * (1 - open) * still + 0.3;
    for (let i = 0; i < 120; i++) {
      const ang = (i / 120) * Math.PI * 2 + spin;
      const major = fib.includes(i % 90);
      const l = major ? 16 : 7;
      c.lineWidth = major ? 2 : 1.2;
      c.beginPath(); c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); c.lineTo(Math.cos(ang) * (r0 - l), Math.sin(ang) * (r0 - l)); c.stroke();
    }
    const r1 = lerp(150, 92, tight) * (1 - open) + open * 60;
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a0 = i * Math.PI / 2 + Math.PI / 4 - t * 0.15 * (1 - open) * still;
      c.beginPath(); c.arc(0, 0, r1, a0 + 0.18, a0 + Math.PI / 2 - 0.18); c.stroke();
    }
    const gap = lerp(70, 24, tight) + open * 900;
    c.lineWidth = 2;
    c.globalAlpha = 1 - open;
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(ux * gap, uy * gap); c.lineTo(ux * (gap + 900), uy * (gap + 900)); c.stroke(); }
    const bk = lerp(210, 112, easeOutCubic(tight)) + open * 320 + (t < snapT ? 140 : 140 * Math.exp(-(t - snapT) * 14));
    c.lineWidth = 3;
    c.globalAlpha = 1 - open;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.beginPath(); c.moveTo(sx * bk, sy * (bk - 34)); c.lineTo(sx * bk, sy * bk); c.lineTo(sx * (bk - 34), sy * bk); c.stroke(); }
    // lock indicator: a filled triangle above the ring pulses during the lock
    if (lock > 0.01) {
      c.globalAlpha = lock;
      c.beginPath(); c.moveTo(0, -r0 - 16); c.lineTo(-11, -r0 - 34); c.lineTo(11, -r0 - 34); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    c.restore();

    if (open > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { c.strokeStyle = css(P.gold, 0.25 * open / (i + 1)); c.lineWidth = 6 + i * 14; c.beginPath(); c.arc(dx, dy, r0, 0, Math.PI * 2); c.stroke(); }
      c.strokeStyle = css(P.goldPale, 0.9 * open); c.lineWidth = 2; c.beginPath(); c.arc(dx, dy, r0, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    e.blit2d('over', 2.2);
    ctx.state.coldopen = { dx, dy, k, open, lock, pv, snapped: t >= snapT };
  },

  type(ty, t0, lt, shot, ctx) {
    const p = ctx.p; const counts = p.counts; const st = ctx.state.coldopen || {};
    const t = p.atT != null ? p.atT + lt * (p.rate ?? 0.15) : t0;
    if (p.atT != null && p.noType) return;
    const k = st.k ?? -1, open = st.open ?? 0, lock = st.lock ?? 0;
    const ph = phases(t, counts);
    const red = mix(P.gold, P.red, 1 - open);
    const titleT = p.title ?? (ph.last + 0.5);
    // premise (frame 0 poster), fades as the first count completes
    const qa = 1 - smooth(range(t, ph.g1[3].t, ph.g1end + 0.4));
    // sized for a phone feed: ~58 px at 1080p is the smallest that stays readable at feed width
    ty.text('THE UNIVERSE IS A DARK FOREST.', 100, 150, { font: 'Plex', size: 58, track: 0.08, color: P.red, alpha: qa, glow: 14 });
    ty.mono('EVERY CIVILIZATION', 100, 226, t, { t0: 0.25, cps: 26, size: 58, track: 0.08, color: P.red, alpha: qa, glow: 14 });
    ty.mono('IS AN ARMED HUNTER.', 100, 302, t, { t0: 0.25 + 18 / 26, cps: 26, size: 58, track: 0.08, color: P.red, alpha: qa, glow: 14 });
    ty.label('LIU CIXIN · THE DARK FOREST · 2008', 100, 360, { size: 22, color: P.bookGold, alpha: qa * 0.85 });

    // the scope's HUD in the Other's script, English beneath
    const g2k = counts.filter((c, i) => c.g && i <= k).length;
    const hud = [
      ['TARGET', st.snapped ? 'SOL III' : 'SCANNING', P.red],
      ['RANGE', '89 LIGHT-YEARS', P.red],
      ['SIGNAL', k < 0 ? 'NONE' : (g2k > 0 ? 'REPEATING' : 'DETECTED'), P.red],
      ['PATTERN', k < 0 ? '—' : (g2k > 0 ? '1 1 2 3 5 8 · AGAIN' : counts.slice(0, k + 1).map((c) => c.n).join(' ')), P.red],
      ['SOURCE', g2k >= 3 ? 'NOT NATURAL' : (k >= 0 ? 'ANALYSING' : '—'), g2k >= 3 ? P.gold : P.red],
      ['WEAPON', open > 0.2 ? 'HOLD' : (lock > 0.5 ? 'LOCKED' : 'ARMED'), open > 0.2 ? P.gold : P.red],
    ];
    const hudA = 1 - smooth(range(t, titleT - 0.2, titleT + 0.5));
    const x0 = 1470, y0 = 340;
    hud.forEach(([key, val, vc], i) => {
      const y = y0 + i * 72;
      const a = smooth(range(t, -1 + i * 0.12, 0.6 + i * 0.12)) * hudA;
      const blink = key === 'WEAPON' && lock > 0.5 ? 0.55 + 0.45 * (Math.sin(t * 14) > 0 ? 1 : 0) : 1;
      ty.glyphs(key, x0, y, 36, t, { color: red, alpha: a * 0.9, seed: 1 });
      ty.label(key, x0 + 56, y - 8, { color: red, alpha: a * 0.75, size: 14 });
      ty.text(val, x0 + 56, y + 18, { font: 'Plex', size: 24, track: 0.06, color: vc, alpha: a * blink, glow: 8 });
    });

    // the count: one giant numeral per whisper (left), the sequence building beneath
    if (k >= 1 && open < 1) {
      const pc = counts[k - 1], cc0 = counts[k];
      const u2 = clamp((t - cc0.t) / 0.2);
      if (u2 < 1) ty.text(String(pc.n), 400 - 330 * easeOutCubic(u2), 520, { font: 'Archivo', weight: 800, stretch: '125%', size: 300, align: 'center', base: 'middle', color: P.gold, alpha: 0.35 * (1 - u2) * (1 - u2) });
    }
    if (k >= 0 && open < 1) {
      const cc = counts[k];
      const t1 = k + 1 < counts.length ? Math.min(counts[k + 1].t, cc.t + 1.6) : cc.t + 1.0;
      ty.numeral(cc.n, t, cc.t, t1, { x: 400, y: 520, size: cc.g ? 340 : 400, font: 'Archivo', weight: 800, stretch: '125%', color: P.gold, glow: 4, out: 0.12, alpha: cc.g ? 0.85 : 1 });
    }
    const seq1 = ph.g1.filter((c) => t >= c.t).map((c) => c.n).join('   ');
    const seq2 = ph.g2.filter((c) => t >= c.t).map((c) => c.n).join('   ');
    ty.text(seq1, 400, 860, { font: 'Michroma', size: 28, track: 0.2, align: 'center', color: P.goldPale, alpha: 0.85 * (1 - open), glow: 10 });
    if (seq2) ty.text(seq2, 400, 910, { font: 'Michroma', size: 28, track: 0.2, align: 'center', color: P.goldPale, alpha: 0.85 * (1 - open), glow: 10 });

    // title in the ring of light
    const a = smooth(range(t, titleT, titleT + 0.9));
    ty.text('HOLD  FIRE', 960, 545, { font: 'Michroma', size: 118, track: 0.5, align: 'center', base: 'middle', color: P.cream, alpha: a, glow: 30, glowColor: P.gold });
    ty.label('JADE WANG  ·  WITH CLAUDE', 960, 650, { align: 'center', color: P.bookGold, alpha: a * smooth(range(t, titleT + 0.5, titleT + 1.3)), size: 16 });
  },
};
