// t2_signal_link: C210's crane (2:11.84): the faint signal each Jade hears visibly comes from the other control room, a thin line of
// light between the two buildings (adversary-arc pass). The line arcs a little above the dish field; pulses run along it both ways,
// warm from Jade's building, cold from teal-tips', one each way per beat, and the line is drawn on twos.
// p: {track: [[clipT, xL, yL, xR, yR], ...] (the two roofs in design px, measured on the plate per plate time), in (0), rate (1: the
//     plate's clock), lift (0.12: the arc's rise as a fraction of the span), cols ([warm, cold]), beats (default the song's), gain (1.5)}
import { clamp, lerp } from '../../../util.js';

function at(track, ct) {
  if (ct <= track[0][0]) return track[0].slice(1);
  for (let i = 0; i + 1 < track.length; i++) {
    const [a, ...A] = track[i], [b, ...B] = track[i + 1];
    if (ct <= b) { const k = (ct - a) / (b - a); return A.map((v, j) => lerp(v, B[j], k)); }
  }
  return track[track.length - 1].slice(1);
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const tq = Math.floor(t * 12 + 1e-3) / 12, lq = tq - shot.t0;
    const [xL, yL, xR, yR] = at(p.track, (p.in || 0) + Math.max(0, lq) * (p.rate || 1));
    const span = Math.hypot(xR - xL, yR - yL);
    const mx = (xL + xR) / 2, my = (yL + yR) / 2 - span * (p.lift ?? 0.12);
    const pt = (u) => [(1 - u) ** 2 * xL + 2 * (1 - u) * u * mx + u * u * xR, (1 - u) ** 2 * yL + 2 * (1 - u) * u * my + u * u * yR];
    const [warm, cold] = p.cols || [[255, 196, 120], [170, 235, 255]];
    const c = e.c2dBegin();
    c.globalCompositeOperation = 'lighter';
    const fadeIn = clamp(lq / 0.25);
    // the line: wide faint, then the core
    for (const [w, a] of [[10, 0.08], [4, 0.22], [1.6, 0.75]]) {
      const g = c.createLinearGradient(xL, yL, xR, yR);
      g.addColorStop(0, `rgba(${warm},${a * fadeIn})`); g.addColorStop(1, `rgba(${cold},${a * fadeIn})`);
      c.strokeStyle = g; c.lineWidth = w; c.beginPath(); c.moveTo(xL, yL); c.quadraticCurveTo(mx, my, xR, yR); c.stroke();
    }
    // pulses: each beat sends one each way; they cross at the middle
    const beats = p.beats || ctx.audio.beats || [];
    for (const b of beats) {
      const u = (tq - b) / 0.6;
      if (u < 0 || u > 1) continue;
      for (const [col, uu] of [[warm, u], [cold, 1 - u]]) {
        const [x, y] = pt(uu);
        const g = c.createRadialGradient(x, y, 0, x, y, 22);
        g.addColorStop(0, `rgba(${col},${0.9 * fadeIn})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
      }
    }
    e.blit2d('add', p.gain ?? 1.5);
  },
};
