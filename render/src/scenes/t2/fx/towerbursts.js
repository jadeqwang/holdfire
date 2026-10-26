// t2_tower_bursts: Echo's signal tower (Rare Earth world sheet, panel 04) fires the ring of lights round its crown, over the
// tower plate (a multi overlay). Pre-chorus 1, "counting out in bursts of light" (0:38.07): five bursts on five eighth notes,
// lighting 1, 1, 2, 3, 5 lamps at once, so the count reads with the sound off; each burst flashes, throws a short beam up and a
// ring of light along the crown, and decays. Mode 'ring' (the drop, 3:22.89 "And you were seen too"): the whole ring lights lamp
// by lamp from the front, then holds, breathing. Echo's palette: fluo pink and mint (plan, "Art style by era").
// p: {ring: {cx, cy, rx, ry} (the crown's ellipse in design px, as the plate frames it, before the plate's zoom; default a guess:
//       {cx 960, cy 250, rx 330, ry 46}), n (13 lamps), counts ([1, 1, 2, 3, 5]), times ([one per burst]; default the eighths
//       from t0), t0 (default the shot start), mode 'bursts' | 'ring', fill (1.1 s: the ring mode's sweep), decay (0.3 s),
//     hide [x0, x1] (screen x range where the back half of the ring is behind the tower), cols (['#ff4fb0', '#7dffc9']),
//     base (0.18: the unlit lamps' glow), zoom / push / pan (the plate's camera), gain (1.6)}
import { clamp, smooth, range, easeOutCubic, hash1 } from '../../../util.js';
import { follow, glowDot, hex } from './lib.js';

function eighthsFrom(A, t0, n) {
  const E = (A.d && A.d.eighths ? A.d.eighths : []).map((x) => (typeof x === 'number' ? x : x.t ?? x.time));
  const out = E.filter((x) => x >= t0 - 0.02).slice(0, n);
  while (out.length < n) out.push((out[out.length - 1] ?? t0) + 0.32);
  return out;
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const ring = { cx: 960, cy: 250, rx: 330, ry: 46, ...(p.ring || {}) };
    const n = p.n ?? 13;
    const counts = p.counts || [1, 1, 2, 3, 5];
    const t0 = p.t0 ?? shot.t0;
    const times = p.times || eighthsFrom(ctx.audio, t0, counts.length);
    const cols = (p.cols || ['#ff4fb0', '#7dffc9']).map(hex);
    const F = follow(p, lt);
    const decay = p.decay ?? 0.3;
    const c = e.c2dBegin();
    c.globalCompositeOperation = 'lighter';
    // lamp j sits at angle a_j; front of the ring = lower half of the ellipse (sin a > 0)
    const lamp = (j) => { const a = Math.PI / 2 + (j / n) * Math.PI * 2; return { a, x: ring.cx + Math.cos(a) * ring.rx, y: ring.cy + Math.sin(a) * ring.ry, front: Math.sin(a) > -0.05 }; };
    const hidden = (x, front) => !front && p.hide && x > p.hide[0] && x < p.hide[1];
    const L = Array.from({ length: n }, (_, j) => lamp(j));
    const lit = new Float32Array(n), colOf = new Int8Array(n);
    if (p.mode === 'ring') {
      const fill = p.fill ?? 1.1;
      // light from the front lamp outward both ways
      for (let j = 0; j < n; j++) {
        const d = Math.min(j, n - j) / (n / 2);
        const tj = t0 + d * fill;
        const age = t - tj;
        if (age >= 0) lit[j] = 0.55 + 0.45 * Math.exp(-age / 0.25) + 0.08 * Math.sin((t - t0) * 4.2 + j);
        colOf[j] = j % 2;
      }
    } else {
      times.forEach((tb, i) => {
        const age = t - tb;
        if (age < 0 || age > decay * 6) return;
        const k = counts[i] ?? 1;
        const v = Math.exp(-age / decay);
        // k lamps spread evenly over the front arc, centred on the front lamp
        for (let m = 0; m < k; m++) {
          const off = k === 1 ? 0 : (m - (k - 1) / 2) * Math.max(1, Math.floor((n / 2) / k));
          const j = ((Math.round(off) % n) + n) % n;
          if (v > lit[j]) { lit[j] = v; colOf[j] = i % 2; }
        }
      });
    }
    // the crown's light: a faint ellipse that brightens with the bursts
    const total = lit.reduce((s, v) => s + v, 0);
    {
      const pts = 72; const path = new Path2D();
      for (let k = 0; k <= pts; k++) {
        const a = (k / pts) * Math.PI * 2; const [x, y] = F(ring.cx + Math.cos(a) * ring.rx, ring.cy + Math.sin(a) * ring.ry);
        if (k) path.lineTo(x, y); else path.moveTo(x, y);
      }
      const [r, g, b] = cols[1].map((v) => Math.round(v * 255));
      c.strokeStyle = `rgba(${r},${g},${b},${0.08 + 0.1 * Math.min(1, total / 3)})`; c.lineWidth = 3 * F.z; c.stroke(path);
    }
    for (let j = 0; j < n; j++) {
      const q = L[j]; const [x, y] = F(q.x, q.y);
      if (hidden(x, q.front)) continue;
      const depth = q.front ? 1 : 0.55;
      const col = cols[colOf[j]];
      glowDot(c, x, y, 3.2 * F.z * depth, col, (p.base ?? 0.18) * depth, 3);
      const v = lit[j];
      if (v <= 0.01) continue;
      glowDot(c, x, y, (5 + 4 * v) * F.z * depth, col, Math.min(1, v) * depth, 6);
      // a short beam straight up from a firing lamp
      const bl = (160 + 220 * v) * F.z * depth;
      const gr = c.createLinearGradient(x, y, x, y - bl);
      const [r, g, b] = col.map((u) => Math.round(u * 255));
      gr.addColorStop(0, `rgba(${r},${g},${b},${0.55 * v * depth})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = gr; c.fillRect(x - 3 * F.z, y - bl, 6 * F.z, bl);
      // and a flash ring
      if (p.mode !== 'ring') {
        c.strokeStyle = `rgba(${r},${g},${b},${0.5 * v * v})`; c.lineWidth = 2.2 * F.z;
        c.beginPath(); c.ellipse(x, y, (14 + 70 * (1 - v)) * F.z, (6 + 24 * (1 - v)) * F.z, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    e.blit2d('add', p.gain ?? 1.6);
  },
};
