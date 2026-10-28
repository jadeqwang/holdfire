// t2_contact: an unknown-contact track drawn onto a monitor in the plate (a multi overlay), so each Jade is seen tracking the other
// across the wall of the split (adversary-arc pass, 28 Oct: C103, C203, P105-P107b). The display is a dark scope: range rings round
// the console's own position, a dashed bearing line, the contact's history trail and a pulsing blip in a bracket, labelled only with
// a code and a bearing (CONTACT 0217 / BRG 090 / UNKNOWN: no country, no flag). The blip pulses on every beat; the drawing advances
// on twos. mirror: true draws the same display flipped left-right (teal-tips' room is Jade's mirrored and her lettering reads
// reversed, README "The mirror rule"), so her track points the other way: at Jade.
// p: {screens: [{quad: [[x,y] x4] (TL, TR, BR, BL design px, as the frame shows the screen), mirror (false), range (0..1: how close
//       the contact is, 0 far / 1 at the edge; default 0.35), bright (1), cold (false: a blue-white scope instead of amber),
//       target (false: the track ends on a dish-field glyph, the contact being Jade's station: P105-P107b), code ('0217'),
//       brg ('090'), alpha (0.92)}], from (shot start: the track's motion starts here), beats (default the song's beats)}
import { clamp } from '../../../util.js';

const CW = 640, CH = 400;
let cv = null;
function canvas() {
  if (!cv) { cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; }
  return cv;
}

// the display in content space (CW x CH), own position on the left, contact toward the right edge
function drawDisplay(c, s, tq, pulse, age) {
  const amber = s.cold ? [190, 225, 255] : [255, 178, 84];
  const grid = s.cold ? [120, 170, 230] : [90, 170, 200];
  const rgba = (k, a) => `rgba(${k[0]},${k[1]},${k[2]},${a})`;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, CW, CH);
  c.fillStyle = s.cold ? 'rgba(5,12,24,0.95)' : 'rgba(8,14,22,0.95)';
  c.fillRect(0, 0, CW, CH);
  if (s.mirror) { c.translate(CW, 0); c.scale(-1, 1); }
  const ox = CW * 0.16, oy = CH * 0.62;
  // range rings and bearing ticks
  c.lineWidth = 2.5;
  for (let r = 1; r <= 5; r++) { c.strokeStyle = rgba(grid, 0.24 + (r === 5 ? 0.08 : 0)); c.beginPath(); c.arc(ox, oy, r * 110, -Math.PI * 0.5, Math.PI * 0.5); c.stroke(); }
  for (let a = -80; a <= 80; a += 20) {
    const t = a * Math.PI / 180;
    c.strokeStyle = rgba(grid, 0.14); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(t) * 600, oy + Math.sin(t) * 600); c.stroke();
  }
  // sweep (one turn per 4 s, on twos)
  const sw = ((tq / 4) % 1) * Math.PI - Math.PI / 2;
  const g = c.createLinearGradient(ox, oy, ox + Math.cos(sw) * 560, oy + Math.sin(sw) * 560);
  g.addColorStop(0, rgba(grid, 0.35)); g.addColorStop(1, rgba(grid, 0));
  c.strokeStyle = g; c.lineWidth = 3; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(sw) * 560, oy + Math.sin(sw) * 560); c.stroke();
  // own position
  c.fillStyle = rgba(grid, 0.8); c.beginPath(); c.moveTo(ox, oy - 9); c.lineTo(ox + 8, oy + 6); c.lineTo(ox - 8, oy + 6); c.closePath(); c.fill();
  // the contact: far right, drifting in as range grows; its trail comes in from the edge
  const rg = clamp(s.range ?? 0.35);
  const cx = CW * (0.9 - 0.18 * rg) - 6 * Math.min(age, 6) / 6, cy = CH * (0.36 + 0.04 * Math.sin(tq * 0.7));
  for (let i = 1; i <= 7; i++) {
    const x = cx + i * 26, y = cy - i * 8 + 3 * Math.sin(i * 1.7);
    c.fillStyle = rgba(amber, 0.75 * (1 - i / 8)); c.beginPath(); c.arc(x, y, 7 - i * 0.6, 0, Math.PI * 2); c.fill();
  }
  // bearing line, dashed
  c.setLineDash([14, 10]); c.strokeStyle = rgba(amber, 0.6); c.lineWidth = 4; c.beginPath(); c.moveTo(ox + 14, oy - 5); c.lineTo(cx - 16, cy + 5); c.stroke(); c.setLineDash([]);
  // the blip: a ring on each beat
  const b = s.bright ?? 1;
  const ring = 1 - pulse;
  c.strokeStyle = rgba(amber, 0.85 * pulse * b); c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, 16 + 48 * ring, 0, Math.PI * 2); c.stroke();
  const glow = c.createRadialGradient(cx, cy, 0, cx, cy, 52);
  glow.addColorStop(0, rgba(amber, (0.55 + 0.45 * pulse) * b)); glow.addColorStop(1, rgba(amber, 0));
  c.fillStyle = glow; c.beginPath(); c.arc(cx, cy, 52, 0, Math.PI * 2); c.fill();
  c.fillStyle = rgba([255, 240, 215], (0.75 + 0.25 * pulse) * b); c.beginPath(); c.arc(cx, cy, 12, 0, Math.PI * 2); c.fill();
  // bracket
  c.strokeStyle = rgba(amber, 0.95 * b); c.lineWidth = 5;
  const B = 44, L = 16;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    c.beginPath(); c.moveTo(cx + sx * B, cy + sy * (B - L)); c.lineTo(cx + sx * B, cy + sy * B); c.lineTo(cx + sx * (B - L), cy + sy * B); c.stroke();
  }
  // the target glyph (P105-P107b): the track ends on a dish field, Jade's station: three dishes on a ground line
  if (s.target) {
    const tx = cx, ty = cy + 88;
    c.strokeStyle = rgba(amber, 0.8 * b); c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(tx - 64, ty + 20); c.lineTo(tx + 64, ty + 20); c.stroke();
    for (const dx of [-40, 0, 40]) {
      c.beginPath(); c.arc(tx + dx, ty, 14, Math.PI * 0.95, Math.PI * 1.95); c.stroke();
      c.beginPath(); c.moveTo(tx + dx, ty + 2); c.lineTo(tx + dx, ty + 20); c.stroke();
    }
    c.setLineDash([6, 6]); c.beginPath(); c.moveTo(cx, cy + B); c.lineTo(tx, ty - 18); c.stroke(); c.setLineDash([]);
  }
  // labels: a code and a bearing only
  c.font = '600 50px PlexM';
  c.textBaseline = 'alphabetic';
  c.fillStyle = rgba(amber, 0.95 * b);
  c.textAlign = 'right';
  c.fillText(`CONTACT ${s.code || '0217'}`, CW - 24, 62);
  c.font = '500 36px PlexM';
  c.fillStyle = rgba(amber, 0.75 * b);
  c.fillText(`BRG ${s.brg || '090'}  UNKNOWN`, CW - 24, 108);
  c.textAlign = 'left';
  c.fillStyle = rgba(grid, 0.6);
  c.font = '500 24px PlexM';
  c.fillText('TRACK', 26, CH - 26);
}

// map the content canvas onto a quad: a grid of cells, each drawn with its own affine transform (canvas has no perspective)
function mapQuad(c, img, q, alpha) {
  const N = 10, M = 7;
  const at = (u, v) => {
    const top = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
    const bot = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
    return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
  };
  c.save(); c.globalAlpha = alpha;
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, v0 = j / M, v1 = (j + 1) / M;
    const p00 = at(u0, v0), p10 = at(u1, v0), p01 = at(u0, v1), p11 = at(u1, v1);
    c.save();
    c.beginPath();   // the cell, grown by 0.6 px so no seams show
    const cxm = (p00[0] + p11[0]) / 2, cym = (p00[1] + p11[1]) / 2;
    const grow = (p) => { const dx = p[0] - cxm, dy = p[1] - cym, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.6, p[1] + dy / l * 0.6]; };
    [p00, p10, p11, p01].map(grow).forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath(); c.clip();
    // affine from content cell (u0..u1, v0..v1) to (p00, p10, p01)
    const sx = (u1 - u0) * CW, sy = (v1 - v0) * CH;
    const a = (p10[0] - p00[0]) / sx, b = (p10[1] - p00[1]) / sx, cc = (p01[0] - p00[0]) / sy, d = (p01[1] - p00[1]) / sy;
    c.transform(a, b, cc, d, p00[0] - a * u0 * CW - cc * v0 * CH, p00[1] - b * u0 * CW - d * v0 * CH);
    c.drawImage(img, 0, 0);
    c.restore();
  }
  c.restore();
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const tq = Math.floor(t * 12 + 1e-3) / 12;   // on twos
    const beats = p.beats || ctx.audio.beats || [];
    let last = -1e9; for (const b of beats) { if (b <= tq + 1e-4) last = b; else break; }
    const pulse = Math.exp(-Math.max(0, tq - last) / 0.22);
    const age = tq - (p.from ?? shot.t0);
    const img = canvas(); const ic = img.getContext('2d');
    const c = e.c2dBegin();
    for (const s of p.screens || []) {
      drawDisplay(ic, s, tq, pulse, age);
      mapQuad(c, img, s.quad, s.alpha ?? 0.92);
    }
    e.blit2d('over', p.gain ?? 1.3);
  },
};
