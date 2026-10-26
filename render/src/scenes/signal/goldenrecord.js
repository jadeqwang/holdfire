// C1b "message in a bottle, a mantra, a prayer": the Voyager Golden Record's cover diagram engraves itself in light.
// Points of light cut the lines the way a stylus cuts a groove: first the rim, then four heads, one per diagram:
//   upper left  — the record seen from above, with the stylus at the outer groove; around it, in binary, one rotation
//                 (3.6 s at 16 2/3 rpm) counted in hydrogen-transition time units (0.704 ns); below, the side view with
//                 the playing time of one side (~1 hour) in the same units;
//   upper right — how to rebuild a picture: the signal with lines 1, 2, 3 marked, one line's ~8 ms, the interlaced vertical
//                 scan, the 512-line raster, and the circle that checks the aspect ratio;
//   lower left  — the pulsar map: 14 pulsars by galactic longitude from the Sun, each period in binary, and the long line to
//                 the galactic centre;
//   lower right — hydrogen in its two lowest states (the unit of time for every number on the cover).
// All binary numbers are computed (period / 0.704024 ns); pulsar periods from catalogue values. Line lengths of the pulsar map
// are illustrative (the real map scales them by distance).
// p: {t0 (engraving start; default shot start), dur (default to just before the shot ends), cx, cy, R, caption (bool)}
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, easeInOutCubic, easeOutCubic, range } from '../../util.js';
import { arcPts, ellipsePts, hotPoint , blitGold } from './lib.js';

const TAU_H = 1 / 1420.405751768e6;      // s, the hydrogen hyperfine period
const hbin = (s) => Math.round(s / TAU_H).toString(2);
// [name, period s, galactic longitude deg] — the 14 pulsars of the Pioneer/Voyager map
const PULSARS = [
  ['B1727-47', 0.82983, 342.57], ['B1451-68', 0.26338, 313.88], ['B1240-64', 0.38848, 302.05], ['B0833-45', 0.08932, 263.55],
  ['B0950+08', 0.25307, 228.91], ['B0823+26', 0.53066, 196.96], ['B0531+21', 0.03309, 184.56], ['B0525+21', 3.74554, 183.86],
  ['B0329+54', 0.71452, 145.0], ['B2217+47', 0.53847, 98.38], ['B2016+28', 0.55795, 68.1], ['B1933+16', 0.35874, 52.44],
  ['B1929+10', 0.22652, 47.38], ['B1642-03', 0.38769, 14.11],
];
const RELD = [0.55, 0.3, 0.9, 0.25, 0.22, 0.28, 0.62, 0.45, 0.4, 0.7, 0.35, 0.95, 0.33, 0.42];   // illustrative lengths

let G = null;
// cover geometry in cover-local px (origin at the centre, R = 430): four groups of polylines (+ the rim)
function geometry() {
  if (G) return G;
  const R = 430;
  const rim = [arcPts(0, 0, R, -Math.PI / 2, Math.PI * 1.5, 260)];
  const ul = [], ur = [], ll = [], lr = [];
  // ---- UL: the record from above
  const rx = -178, ry = -200, rr = 116;
  ul.push(arcPts(rx, ry, rr, -Math.PI / 2, Math.PI * 1.5, 120));
  ul.push(arcPts(rx, ry, rr - 14, -Math.PI / 2, Math.PI * 1.5, 110));
  ul.push(arcPts(rx, ry, 40, -Math.PI / 2, Math.PI * 1.5, 50));
  ul.push(arcPts(rx, ry, 4, 0, Math.PI * 2, 10));
  // the stylus: cartridge on the outer groove, arm to its pivot
  { const a = -0.55; const cx = rx + Math.cos(a) * (rr - 8), cy = ry + Math.sin(a) * (rr - 8); const tx = -Math.sin(a), ty = Math.cos(a);
    const L = 30, Wd = 7;
    ul.push([[cx - tx * L - Math.cos(a) * Wd, cy - ty * L - Math.sin(a) * Wd], [cx + tx * L * 0.3 - Math.cos(a) * Wd, cy + ty * L * 0.3 - Math.sin(a) * Wd], [cx + tx * L * 0.3 + Math.cos(a) * Wd, cy + ty * L * 0.3 + Math.sin(a) * Wd], [cx - tx * L + Math.cos(a) * Wd, cy - ty * L + Math.sin(a) * Wd], [cx - tx * L - Math.cos(a) * Wd, cy - ty * L - Math.sin(a) * Wd]]);
    ul.push([[cx - tx * L, cy - ty * L], [cx - tx * L - 6, cy - ty * L - 92]]);
    ul.push(arcPts(cx - tx * L - 6, cy - ty * L - 98, 6, 0, Math.PI * 2, 12)); }
  // binary around the record: one rotation (3.6 s) in hydrogen units
  { const b = hbin(3.6), n = b.length; const r0 = rr + 16;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + 0.25 + i * (Math.PI * 1.55 / (n - 1)); const ux = Math.cos(a), uy = Math.sin(a);
      if (b[i] === '1') ul.push([[rx + ux * (r0 - 6), ry + uy * (r0 - 6)], [rx + ux * (r0 + 6), ry + uy * (r0 + 6)]]);
      else { const tx = -uy, ty = ux; ul.push([[rx + ux * r0 - tx * 4, ry + uy * r0 - ty * 4], [rx + ux * r0 + tx * 4, ry + uy * r0 + ty * 4]]); } } }
  // side view: the record edge-on, the stylus on it, and one side's playing time (~1 h) in binary below
  { const y = ry + rr + 62, x0 = rx - 125, x1 = rx + 125;
    ul.push([[x0, y], [x1, y], [x1, y + 7], [x0, y + 7], [x0, y]]);
    ul.push([[x0 + 10, y], [x0 + 16, y - 16], [x0 + 46, y - 16], [x0 + 46, y - 9], [x0 + 16, y - 9]]);
    const b = hbin(3600); const st = 5.6;
    for (let i = 0; i < b.length; i++) { const x = x0 + 2 + i * st; if (b[i] === '1') ul.push([[x, y + 20], [x, y + 32]]); else ul.push([[x - 2, y + 26], [x + 2, y + 26]]); } }
  // ---- UR: decoding a picture
  { const x0 = 62, x1 = 330, by = -292;
    // the signal: three lines, each opening with a sync pulse (marked 1, 10, 11 in binary above)
    const sig = []; const per = (x1 - x0) / 3;
    for (let k = 0; k < 3; k++) { const xs = x0 + k * per;
      sig.push([xs, by], [xs + 2, by - 42], [xs + 9, by - 42], [xs + 11, by]);
      for (let j = 1; j <= 18; j++) { const xx = xs + 11 + j * (per - 14) / 18; sig.push([xx, by - 6 - 22 * Math.abs(Math.sin(j * 1.7 + k * 2.1)) * (0.4 + 0.6 * Math.sin(j * 0.45 + k))]); }
      const lab = (k + 1).toString(2);
      for (let i = 0; i < lab.length; i++) { const x = xs + 4 + i * 9; if (lab[i] === '1') ur.push([[x, by - 62], [x, by - 50]]); else ur.push([[x - 3, by - 56], [x + 3, by - 56]]); } }
    ur.push(sig);
    // one line's duration (~8 ms) in binary under a bracket
    ur.push([[x0 + 11, by + 10], [x0 + 11, by + 16], [x0 + per, by + 16], [x0 + per, by + 10]]);
    { const b = hbin(0.008); for (let i = 0; i < b.length; i++) { const x = x0 + per + 14 + i * 5.6; if (b[i] === '1') ur.push([[x, by + 10], [x, by + 22]]); else ur.push([[x - 2, by + 16], [x + 2, by + 16]]); } }
    // interlace: vertical lines drawn top to bottom, staggered
    const iy0 = -238, iy1 = -176, ix0 = 92, ix1 = 300;
    ur.push([[ix0, iy0], [ix1, iy0], [ix1, iy1], [ix0, iy1], [ix0, iy0]]);
    for (let i = 0; i < 8; i++) { const x = ix0 + 14 + i * 25; ur.push([[x, iy0 + 6], [x, iy1 - 6]]); if (i < 7) ur.push([[x, iy1 - 6], [x + 12.5, iy0 + 6]]); }
    // the raster: 512 vertical lines (drawn as a field), with 512 in binary
    const ry0 = -160, ry1 = -96, rx0 = 112, rx1 = 280;
    ur.push([[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1], [rx0, ry0]]);
    for (let x = rx0 + 7; x < rx1 - 3; x += 7) ur.push([[x, ry0 + 4], [x, ry1 - 4]]);
    { const b = (512).toString(2); for (let i = 0; i < b.length; i++) { const x = rx0 + 30 + i * 11; if (b[i] === '1') ur.push([[x, ry1 + 9], [x, ry1 + 21]]); else ur.push([[x - 3, ry1 + 15], [x + 3, ry1 + 15]]); } }
    // the first picture: a circle in its frame
    const cy0 = -62, cy1 = 2, cx0 = 150, cx1 = 242;
    ur.push([[cx0, cy0], [cx1, cy0], [cx1, cy1], [cx0, cy1], [cx0, cy0]]);
    ur.push(arcPts((cx0 + cx1) / 2, (cy0 + cy1) / 2, 24, -Math.PI / 2, Math.PI * 1.5, 40)); }
  // ---- LL: the pulsar map
  { const sx = -170, sy = 200;
    ll.push([[sx, sy], [sx + 300, sy]]);                         // to the galactic centre (l = 0)
    PULSARS.forEach(([, per, l], i) => {
      const a = -l * Math.PI / 180; const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const b = hbin(per); const st = 5.2;
      const L = 26 + b.length * st + 24 * RELD[i];
      ll.push([[sx + ux * 8, sy + uy * 8], [sx + ux * L, sy + uy * L]]);
      for (let k = 0; k < b.length; k++) { const d = 20 + k * st; const px = sx + ux * d, py = sy + uy * d;
        if (b[k] === '1') ll.push([[px - nx * 3.5, py - ny * 3.5], [px + nx * 3.5, py + ny * 3.5]]);
        else ll.push([[px - ux * 1.6, py - uy * 1.6], [px + ux * 1.6, py + uy * 1.6]]); } });
    ll.push(arcPts(sx, sy, 4, 0, Math.PI * 2, 10)); }
  // ---- LR: hydrogen, two lowest states (spins parallel / antiparallel), the transition marked |
  { const y = 236, xa = 150, xb = 290, r = 30;
    for (const [x, up] of [[xa, true], [xb, false]]) {
      lr.push(arcPts(x, y, r, -Math.PI / 2, Math.PI * 1.5, 48));
      lr.push(arcPts(x, y, 3.5, 0, Math.PI * 2, 10));
      lr.push([[x, y - 10], [x, y + 10]]); lr.push([[x - 4, y - 5], [x, y - 10], [x + 4, y - 5]]);         // proton spin
      const ex = x, ey = y - r;                                                                        // electron on the orbit
      lr.push(arcPts(ex, ey, 4, 0, Math.PI * 2, 10));
      if (up) { lr.push([[ex, ey - 6], [ex, ey - 18]]); lr.push([[ex - 4, ey - 13], [ex, ey - 18], [ex + 4, ey - 13]]); }
      else { lr.push([[ex, ey - 6], [ex, ey - 18]]); lr.push([[ex - 4, ey - 11], [ex, ey - 6], [ex + 4, ey - 11]]); }
    }
    lr.push([[xa + r + 4, y], [xb - r - 4, y]]);
    lr.push([[(xa + xb) / 2, y + 14], [(xa + xb) / 2, y + 30]]); }
  const lenOf = (pl) => { let L = 0; for (let i = 1; i < pl.length; i++) L += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]); return L; };
  const pack = (list) => { const lens = list.map(lenOf); let cum = 0; const starts = lens.map((l) => { const s = cum; cum += l; return s; }); return { list, lens, starts, total: cum }; };
  G = { R, rim: pack(rim), groups: [pack(ul), pack(ur), pack(ll), pack(lr)] };
  return G;
}

// stroke [s0, s1] (arc length) of a packed group; returns the point at s1
function strokeRange(c, g, s0, s1) {
  let head = null;
  c.beginPath();
  for (let k = 0; k < g.list.length; k++) {
    const a = g.starts[k], L = g.lens[k]; if (a > s1) break; if (a + L < s0) continue;
    const pl = g.list[k]; let acc = a; let started = false;
    for (let i = 1; i < pl.length; i++) {
      const d = Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]);
      const u0 = clamp((s0 - acc) / Math.max(d, 1e-6)), u1 = clamp((s1 - acc) / Math.max(d, 1e-6));
      if (u1 > u0) {
        const p0 = [lerp(pl[i - 1][0], pl[i][0], u0), lerp(pl[i - 1][1], pl[i][1], u0)];
        const p1 = [lerp(pl[i - 1][0], pl[i][0], u1), lerp(pl[i - 1][1], pl[i][1], u1)];
        if (!started) { c.moveTo(p0[0], p0[1]); started = true; } c.lineTo(p1[0], p1[1]);
        head = p1;
      }
      acc += d;
    }
  }
  c.stroke();
  return head;
}

export const look = { bloom: 0.7, bloomThreshold: 0.7, halation: 0.3, vignette: 0.3, grain: 0.03, streak: 0.35, streakThreshold: 1.3, streakCol: [1.0, 0.8, 0.5] };

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const g = geometry();
    e.clear(e.rtScene, ...P.void);
    const t0 = p.t0 ?? shot.t0 - 0.3, dur = p.dur ?? Math.max(0.8, (shot.t1 - t0) - 0.6);
    const cx = p.cx ?? 1250, cy = p.cy ?? 520, sc = (p.R ?? 430) / g.R;
    const zoom = lerp(1.0, 1.035, smooth(range(t, shot.t0, shot.t1)));
    const rot = lerp(-0.03, 0.0, easeOutCubic(range(t, shot.t0, shot.t1)));
    const c = e.c2dBegin();
    c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(sc * zoom, sc * zoom);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // the cover's face: barely-there gold, so the disc reads before its lines do
    const face = smooth(range(t, t0, t0 + 0.4));
    const fg = c.createRadialGradient(-120, -160, 20, 0, 0, g.R);
    fg.addColorStop(0, css(P.gold, 0.07 * face)); fg.addColorStop(1, css(P.goldDeep, 0.025 * face));
    c.fillStyle = fg; c.beginPath(); c.arc(0, 0, g.R, 0, Math.PI * 2); c.fill();
    const heads = [];
    // the rim: one head runs round the cover
    const ur = easeInOutCubic(range(t, t0, t0 + dur * 0.26));
    c.strokeStyle = css(P.gold, 0.95); c.lineWidth = 2.4;
    const hr = strokeRange(c, g.rim, 0, ur * g.rim.total);
    if (ur > 0 && ur < 1 && hr) heads.push(hr);
    c.lineWidth = 2; c.strokeStyle = css(P.gold, 0.45);
    if (ur >= 1) { c.beginPath(); c.arc(0, 0, g.R - 12, 0, Math.PI * 2); c.stroke(); }
    // four heads, one per diagram; each paces itself to finish together
    const ug = easeInOutCubic(range(t, t0 + dur * 0.12, t0 + dur));
    const lw = [2.1, 2.0, 2.0, 2.1];
    g.groups.forEach((gr, i) => {
      const s = ug * gr.total;
      c.strokeStyle = css(P.gold, 0.92); c.lineWidth = lw[i];
      const h = strokeRange(c, gr, 0, s);
      // the freshly cut groove is hot
      c.strokeStyle = css(P.goldPale, 0.95); c.lineWidth = lw[i] + 0.8;
      strokeRange(c, gr, Math.max(0, s - 140), s);
      if (ug > 0 && ug < 1 && h) heads.push(h);
    });
    // after the last cut: a slow glint of light crosses the engraving (paints only on the lines)
    const sw = range(t, t0 + dur - 0.1, t0 + dur + 1.6);
    if (sw > 0 && sw < 1) {
      c.save(); c.globalCompositeOperation = 'source-atop';
      const x = lerp(-g.R * 1.4, g.R * 1.4, easeInOutCubic(sw));
      const lg = c.createLinearGradient(x - 140, -140, x + 140, 140);
      lg.addColorStop(0, css(P.goldPale, 0)); lg.addColorStop(0.5, css(P.goldPale, 0.85)); lg.addColorStop(1, css(P.goldPale, 0));
      c.fillStyle = lg; c.fillRect(-g.R, -g.R, g.R * 2, g.R * 2);
      c.restore();
    }
    c.restore();
    // the engraving points of light (in screen space so their size doesn't scale)
    for (const h of heads) {
      const ca = Math.cos(rot), sa = Math.sin(rot), k = sc * zoom;
      hotPoint(c, cx + (ca * h[0] - sa * h[1]) * k, cy + (sa * h[0] + ca * h[1]) * k, 1.0);
    }
    blitGold(e, 'over', 2.0);
    ctx.state.grec = { t0, dur };
  },
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p; const st = ctx.state.grec; if (!st || p.caption === false) return;
    const a = smooth(range(t, st.t0 + 0.5, st.t0 + 1.0));
    ty.label('VOYAGER 1 · 1977 · THE GOLDEN RECORD COVER', 120, 952, { size: 14, color: P.bookGold, alpha: a * 0.95 });
    ty.label("“…THE LAUNCHING OF THIS ‘BOTTLE’ INTO THE COSMIC ‘OCEAN’…” — CARL SAGAN", 120, 980, { size: 12, track: 0.2, color: P.bookGold, alpha: a * 0.8 });
  },
};
