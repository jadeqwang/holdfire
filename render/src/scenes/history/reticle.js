// A small red reticle in the cold open's design language (outer ring with ticks, four rotating inner arcs, a crosshair with a
// gap, corner lock brackets, the lock triangle), simplified for distance: every line stays >= 2 px and >= 6 px apart at 1080p.
// It can open like an eye (the ring parts from a closed lid), breathe, tighten and lock.
import { css } from '../../palette.js';
import { clamp, lerp, smooth, easeOutCubic } from '../../util.js';

// o: {open 0..1 (eyelid), tight 0..1, lock 0..1, alpha, col [r,g,b], spin (rad), lw (design px)}
export function drawReticle(c, x, y, r, o = {}) {
  const open = clamp(o.open ?? 1), tight = clamp(o.tight ?? 0), lock = clamp(o.lock ?? 0);
  const a = o.alpha ?? 1; if (a <= 0.003 || open <= 0.001) return;
  const col = o.col || [1, 0.18, 0.12];
  const lw = Math.max(2, o.lw ?? r * 0.02);
  c.save();
  c.translate(x, y);
  c.strokeStyle = css(col, a); c.fillStyle = css(col, a);
  c.lineCap = 'butt';
  // the lid: a closed line that parts into the ring (an eye opening in the dark)
  const lid = easeOutCubic(range01(open, 0, 0.6));
  const ry = Math.max(0.5, r * lid), rx = r * lerp(0.82, 1, lid);
  c.lineWidth = lw;
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
  const inner = smooth(range01(open, 0.45, 1));
  if (inner > 0) {
    // ticks every 30 deg, the quarters longer
    c.globalAlpha = inner;
    const spin = o.spin ?? 0;
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const ang = i * Math.PI / 6 + spin * 0.2;
      const l = i % 3 === 0 ? Math.max(8, r * 0.16) : Math.max(5, r * 0.08);
      c.moveTo(Math.cos(ang) * r, Math.sin(ang) * r * lid); c.lineTo(Math.cos(ang) * (r - l), Math.sin(ang) * (r - l) * lid);
    }
    c.stroke();
    // four inner arcs, counter-rotating
    const r1 = r * lerp(0.52, 0.4, tight);
    if (r1 > 10) {
      c.lineWidth = lw * 1.25;
      for (let i = 0; i < 4; i++) {
        const a0 = i * Math.PI / 2 + Math.PI / 4 - spin;
        c.beginPath(); c.arc(0, 0, r1, a0 + 0.22, a0 + Math.PI / 2 - 0.22); c.stroke();
      }
    }
    // the crosshair: a gap at the centre that closes as it tightens
    const gap = r * lerp(0.26, 0.1, tight);
    const reach = r * lerp(1.3, 1.45, tight);
    c.lineWidth = lw;
    c.beginPath();
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(ux * gap, uy * gap); c.lineTo(ux * reach, uy * reach); }
    c.stroke();
    // lock brackets converge as it tightens
    if (tight > 0.02) {
      const bk = r * lerp(1.2, 0.72, easeOutCubic(tight)), bl = Math.max(8, r * 0.18);
      c.globalAlpha = inner * smooth(tight * 2);
      c.lineWidth = lw * 1.3;
      c.beginPath();
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.moveTo(sx * bk, sy * (bk - bl)); c.lineTo(sx * bk, sy * bk); c.lineTo(sx * (bk - bl), sy * bk); }
      c.stroke();
    }
    if (lock > 0.01) {
      c.globalAlpha = lock * inner;
      const tr = Math.max(6, r * 0.09);
      c.beginPath(); c.moveTo(0, -r - tr * 0.8); c.lineTo(-tr, -r - tr * 2.4); c.lineTo(tr, -r - tr * 2.4); c.closePath(); c.fill();
    }
  }
  c.restore();
}

function range01(x, a, b) { return clamp((x - a) / (b - a)); }
