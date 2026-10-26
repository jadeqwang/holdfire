// t2_chain_links (drop, 3:15.84 "Link by link, we broke the chain of fear;"): gold line art over take one's phyllotaxis disk
// (a multi overlay on 'phyllo', which forms its lattice network over the same line). A chain runs through the disk, ring links
// and edge-on links alternating; on each word one ring link opens into two hands hooked together (take one's engraved hands,
// history/hands.js clasp), the hands let go and draw apart, and the gap they leave becomes a straight gold edge of the graph
// with a node at each end. The edge-on links between them fall away once their neighbours have opened.
// p: {center [960, 470], radius (360): the disk, as phyllo's p; angle (-0.32 rad: the chain's direction), span (1.75 x radius
//     each side), links (6 ring links), opens ([times], one per ring link, centre outward; default the words of the line),
//     t0 (chain draws on; default the shot start), scale (0.3: hands), col (gold), gain (1.25)}
import { P, css, mix } from '../../../palette.js';
import { clamp, lerp, smooth, range, easeOutCubic, easeInOutCubic, hash1 } from '../../../util.js';
import { clasp } from '../../history/hands.js';
import { glowDot } from './lib.js';

function ringLink(c, x, y, ang, col, a, s) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = css(col, a); c.lineWidth = 3;
  c.beginPath(); c.ellipse(0, 0, 46 * s, 22 * s, 0, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = css(col, 0.35 * a); c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, 0, 34 * s, 11 * s, 0, 0, Math.PI * 2); c.stroke();
  c.restore();
}
function barLink(c, x, y, ang, col, a, s) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = css(col, a); c.lineWidth = 3;
  c.beginPath(); c.roundRect(-46 * s, -6 * s, 92 * s, 12 * s, 6 * s); c.stroke();
  c.restore();
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const C = p.center || [960, 470], R = p.radius ?? 360;
    const ang = p.angle ?? -0.32;
    const dir = [Math.cos(ang), Math.sin(ang)];
    const nR = p.links ?? 6;
    const t0 = p.t0 ?? shot.t0;
    let opens = p.opens;
    if (!opens) {
      const L = ctx.audio.lines.find((l) => /^link by link/i.test(l.text || ''));
      const ws = L ? L.words.slice(1).map((w) => w.t) : [];
      opens = Array.from({ length: nR }, (_, i) => ws[i] ?? t0 + 0.4 + i * 0.45);
    }
    const col = p.col || P.gold;
    const s = (R / 360) * 1.0;
    const pitch = 2 * 92 * s * 0.82;                     // ring + bar centre spacing
    const span = (p.span ?? 1.75) * R;
    const nAll = Math.floor(span / (pitch / 2)) * 2 + 1;    // links laid symmetrically about the centre
    const c = e.c2dBegin();
    c.globalCompositeOperation = 'lighter';
    const draw = easeInOutCubic(range(t, t0, t0 + 0.35));
    const sag = (u) => 18 * s * Math.sin((u * Math.PI) / 2) * 0;   // straight: the chain is taut across the disk
    // ring links: the ones nearest the centre open first
    const ringIdx = []; for (let k = -(nAll - 1) / 2; k <= (nAll - 1) / 2; k++) if (k % 2 === 0) ringIdx.push(k);
    ringIdx.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const openOf = new Map(ringIdx.slice(0, nR).map((k, i) => [k, opens[i]]));
    const pos = (k) => { const d = k * (pitch / 2); return [C[0] + dir[0] * d, C[1] + dir[1] * d + sag(d / span)]; };
    const fadeOut = 1 - smooth(range(t, shot.t1 - 0.12, shot.t1));
    for (let k = -(nAll - 1) / 2; k <= (nAll - 1) / 2; k++) {
      const d = Math.abs(k * (pitch / 2));
      const reveal = clamp((draw * span * 1.05 - d) / (pitch * 0.5));   // draws on from the centre outward
      if (reveal <= 0) continue;
      const [x, y] = pos(k);
      const edgeFade = 1 - smooth(range(d, R * 1.25, span));
      const a0 = reveal * fadeOut * (0.35 + 0.65 * edgeFade);
      if (k % 2 !== 0) {
        // an edge-on link: falls away once both neighbours have opened
        const tn = Math.max(openOf.get(k - 1) ?? Infinity, openOf.get(k + 1) ?? Infinity);
        const fall = Number.isFinite(tn) ? Math.max(0, t - tn - 0.25) : 0;
        if (fall > 0.6) continue;
        const dy = 0.5 * 1400 * fall * fall;
        barLink(c, x + fall * (hash1(k * 3.1) - 0.5) * 90, y + dy, ang + fall * (hash1(k) - 0.5) * 4, col, a0 * (1 - smooth(range(fall, 0.2, 0.6))), s);
        continue;
      }
      const to = openOf.get(k);
      if (to === undefined || t < to) { ringLink(c, x, y, ang, col, a0, s); continue; }
      // open: link -> two hands hooked (0.18 s) -> let go (0.3 s) -> they draw apart and fade, leaving an edge
      const age = t - to;
      const morph = smooth(range(age, 0, 0.12));
      if (morph < 1) ringLink(c, x, y, ang, col, a0 * (1 - morph), s);
      const grip = 1 - smooth(range(age, 0.16, 0.46));
      const apart = easeOutCubic(range(age, 0.3, 0.9));
      const ha = a0 * morph * (1 - smooth(range(age, 0.6, 1.0)));
      if (ha > 0.01) {
        c.save(); c.translate(x, y); c.translate(-dir[1] * 0, 0);
        clasp(c, 0, 0, (p.scale ?? 0.3) * s, grip, { col: mix(col, [1, 0.95, 0.85], 0.25), lw: 2.4 / ((p.scale ?? 0.3) * s), fill: 'rgb(0,0,0)', arm: 90, draw: easeOutCubic(range(age, 0, 0.2)), alpha: ha }, ang);
        c.restore();
      }
      // the edge: between where the two hands end up, along the chain
      const ek = smooth(range(age, 0.45, 0.85));
      if (ek > 0) {
        const half = lerp(20, pitch * 0.62, apart) * s;
        const ax = x - dir[0] * half, ay = y - dir[1] * half, bx = x + dir[0] * half, by = y + dir[1] * half;
        const ea = ek * fadeOut;
        c.strokeStyle = css(P.goldPale, 0.9 * ea); c.lineWidth = 2.6;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        c.strokeStyle = css(col, 0.25 * ea); c.lineWidth = 9;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        glowDot(c, ax, ay, 4.5, P.goldPale, ea, 4); glowDot(c, bx, by, 4.5, P.goldPale, ea, 4);
      }
    }
    e.blit2d('add', p.gain ?? 1.25);
  },
};
