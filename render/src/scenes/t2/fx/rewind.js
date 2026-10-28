// t2_rewind_console: BU04 (2:50.07) reads as a rewind from its first frame, never a launch (Jade, 28 Oct; adversary-arc pass item 7).
// Over the plate (a multi overlay), all tracked to the plate's own pull-back by plate frame:
//   wheel   the jog wheel spins BACKWARD: counter-clockwise blur arcs and chevrons on the platter (its red cast is lifted in the plate
//           itself: grade.fix 'neutral'), amber like the rewind's OSD
//   screen  SIGNAL LOST on the dead monitor she is looking at (it used to sit under her hand), in the war display's red, blinking on twos
//   osd     the VCR's rewind chevrons and REW in the OSD corner (VT323, the OSD lyric style's look)
// p: {in, rate (the plate's clock: plate frame = (in + lt * rate) * 24, on twos), wheel: [[f, cx, cy, rx, ry]...], screen: [[f, [[x, y] x4]]...],
//     osd: {x, y, size} (design px), spin (turns per second, 2.2)}
import { clamp, lerp, hash2 } from '../../../util.js';
import { mapQuad } from './contact.js';

function key(track, f) {
  if (f <= track[0][0]) return track[0].slice(1);
  for (let i = 0; i + 1 < track.length; i++) {
    const A = track[i], B = track[i + 1];
    if (f <= B[0]) { const k = (f - A[0]) / (B[0] - A[0]); return A.slice(1).map((v, j) => (Array.isArray(v) ? v.map((pt, q) => pt.map((x, z) => lerp(x, B[j + 1][q][z], k))) : lerp(v, B[j + 1], k))); }
  }
  return track[track.length - 1].slice(1);
}

let scv = null;
function screenCanvas(tq) {
  if (!scv) { scv = document.createElement('canvas'); scv.width = 640; scv.height = 400; }
  const c = scv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 640, 400);
  c.fillStyle = 'rgba(20,0,2,0.55)'; c.fillRect(0, 0, 640, 400);
  for (let y = 0; y < 400; y += 5) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y, 640, 2); }
  const on = Math.floor(tq * 6) % 3 !== 2;   // blinks: two frames pairs on, one off
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '400 150px L2VT';
  c.fillStyle = on ? 'rgba(255,70,52,1)' : 'rgba(255,70,52,0.25)';
  c.shadowColor = 'rgba(255,40,30,0.9)'; c.shadowBlur = 24;
  c.fillText('SIGNAL', 320, 140); c.fillText('LOST', 320, 270);
  return scv;
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const tq = Math.floor(t * 12 + 1e-3) / 12, lq = Math.max(0, tq - shot.t0);
    const f = ((p.in || 0) + lq * (p.rate || 1)) * 24;
    const c = e.c2dBegin();
    // the screen she reacts to
    if (p.screen) {
      const [q] = key(p.screen, f);
      mapQuad(c, screenCanvas(tq), q, 0.95, 640, 400);
    }
    // the wheel, spinning backward
    if (p.wheel) {
      const [cx, cy, rx, ry] = key(p.wheel, f);
      const ang = -tq * Math.PI * 2 * (p.spin ?? 2.2);   // counter-clockwise (backward)
      c.save(); c.translate(cx, cy); c.scale(rx, ry);
      c.globalCompositeOperation = 'lighter';
      for (const [r, n, a] of [[0.5, 3, 0.5], [0.68, 4, 0.6], [0.86, 5, 0.7]]) {
        for (let k = 0; k < n; k++) {
          const a0 = ang + (k / n) * Math.PI * 2 + r * 2, len = 0.9 + 0.3 * r;
          // a blur arc: wide and faint, then the core, thinning toward its tail (the tail trails clockwise: it moves counter-clockwise)
          for (const [w, al] of [[0.11, 0.16], [0.045, 0.4], [0.02, 1]]) {
            c.strokeStyle = `rgba(255,196,120,${al * a})`; c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, a0, a0 + len); c.stroke();
          }
          // chevron at the head (pointing counter-clockwise)
          const hx = Math.cos(a0) * r, hy = Math.sin(a0) * r, tx = Math.sin(a0), ty = -Math.cos(a0);   // tangent, counter-clockwise
          const nx = Math.cos(a0), ny = Math.sin(a0), s = 0.1;
          c.fillStyle = `rgba(255,214,150,${0.9 * a})`; c.beginPath();
          c.moveTo(hx + tx * s, hy + ty * s); c.lineTo(hx - tx * s * 0.6 + nx * s, hy - ty * s * 0.6 + ny * s); c.lineTo(hx - tx * s * 0.6 - nx * s, hy - ty * s * 0.6 - ny * s); c.closePath(); c.fill();
        }
      }
      c.restore();
    }
    // the VCR's OSD: rewind chevrons and REW
    if (p.osd) {
      const { x, y, size = 96 } = p.osd;
      const jx = (hash2(Math.floor(t * 12), 4) - 0.5) * 4, h = size * 0.3;
      c.save(); c.translate(jx, 0); c.globalCompositeOperation = 'source-over';
      c.font = `400 ${size}px L2VT`;
      const bw = h * 4.4 + c.measureText('REW').width + size * 0.5;   // a soft dark backing, so it reads over her white sleeve
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.roundRect(x - size * 0.25, y - size * 0.52, bw, size * 1.04, size * 0.12); c.fill();
      const tri = (tx, col, dx = 0, dy = 0) => { c.fillStyle = col; c.beginPath(); c.moveTo(tx - h + dx, y + dy); c.lineTo(tx + h + dx, y - h + dy); c.lineTo(tx + h + dx, y + h + dy); c.closePath(); c.fill(); };
      for (const [col, dx, dy] of [['#000', 5, 5], ['#fff', 0, 0]]) { tri(x + h, col, dx, dy); tri(x + h * 2.7, col, dx, dy); }
      c.font = `400 ${size}px L2VT`; c.textBaseline = 'middle'; c.textAlign = 'left';
      const tx = x + h * 4.4;
      c.fillStyle = '#000'; c.fillText('REW', tx + 5, y + 5);
      c.globalAlpha = 0.55; c.fillStyle = '#ff3040'; c.fillText('REW', tx - 2.5, y); c.fillStyle = '#30e0ff'; c.fillText('REW', tx + 2.5, y);
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.fillText('REW', tx, y);
      c.restore();
    }
    e.blit2d('over', p.gain ?? 1.2);
  },
};
