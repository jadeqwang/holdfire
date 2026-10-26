// T2_BLUEPRINT: white schematic linework drawn ON over whatever is beneath (a multi layer), with a slight cyan glow and a faint grid.
// Reference: the Star Trek: Enterprise titles (schematics lightly over painted craft). Data-driven, so any shot can supply a drawing.
// p: {paths: [PATH...], grid: {step 60, alpha 0.06, major 5, t0, t1 (fade in), x0, y0, x1, y1 (area)} | null,
//     col ([0.94, 0.98, 1]), glowCol ([0.35, 0.85, 1]), glow (1), w (2.5 px), alpha (1 | fn(t, lt)), abs (false: path times are
//     shot-local lt; true: song time t), zoom (1) / pan ([0,0]) / rot (0): the same transform as the plate under it, so lines stick to
//     the painting, gain (1.3: lifts the core line into bloom), font ('Plex'), size (18 px labels), pen (true: bright pen tip)}
// PATH: {type, t0, t1 (draw-on window, s), ease ('inOut'|'out'|'linear'...), w, col, alpha, dash ([on, off] px), ...shape}:
//   poly    {pts: [[x,y]...], closed, smooth (Catmull-Rom)}     line {a, b}       rect {a, b} | {x, y, w, h}
//   circle  {c, r, a0 (-90 deg: where the stroke starts), dir (1 = clockwise), cross (centre mark)}
//   arc     {c, r, a0, a1 (degrees, clockwise from 3 o'clock)}   cross {c, size (14)}
//   dim     {a, b, off (36: perpendicular offset, sign picks the side), label, ext (8: extension overshoot)}   (dimension line)
//   callout {at, to, shelf (110: signed horizontal shelf length), label, r (7: ring at the anchor)}
//   ticks   {a, b, n (10), len (10), major (5)}                  (a ruler / scale)
// Labels (numbers, dates, a few names only; plan "Text on screen") type on at the end of their path's window.
// drawBlueprint(c2d, paths, time, opts) is exported for scenes that draw on their own canvas.
import { EASES } from './lib.js';
import { clamp } from '../../../util.js';

const D2R = Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };

function catmull(pts, closed, seg = 8) {
  const out = []; const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(closed ? pts[0] : pts[n - 1]);
  return out;
}
function arcPts(c, r, a0, a1) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 4));
  const out = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D2R; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
  return out;
}

// a path -> {strokes: [[pt...]...], labels: [{at, text, align, base}]} in content px
function shape(P) {
  const S = [], L = [];
  switch (P.type) {
    case 'line': S.push([P.a, P.b]); break;
    case 'poly': { let pts = P.pts || []; if (P.smooth && pts.length > 2) pts = catmull(pts, P.closed); else if (P.closed) pts = [...pts, pts[0]]; S.push(pts); break; }
    case 'rect': { const a = P.a || [P.x, P.y], b = P.b || [P.x + P.w, P.y + P.h]; S.push([a, [b[0], a[1]], b, [a[0], b[1]], a]); break; }
    case 'circle': { const a0 = P.a0 ?? -90, dir = P.dir ?? 1; S.push(arcPts(P.c, P.r, a0, a0 + 360 * dir));
      if (P.cross) { const s = P.r * 0.25 + 6; S.push([[P.c[0] - s, P.c[1]], [P.c[0] + s, P.c[1]]], [[P.c[0], P.c[1] - s], [P.c[0], P.c[1] + s]]); } break; }
    case 'arc': S.push(arcPts(P.c, P.r, P.a0 ?? 0, P.a1 ?? 90)); break;
    case 'cross': { const s = P.size ?? 14; S.push([[P.c[0] - s, P.c[1]], [P.c[0] + s, P.c[1]]], [[P.c[0], P.c[1] - s], [P.c[0], P.c[1] + s]]); break; }
    case 'dim': {
      const d = nrm(sub(P.b, P.a)); const n = [-d[1], d[0]]; const off = P.off ?? 36; const ext = P.ext ?? 8;
      const a2 = add(P.a, mul(n, off)), b2 = add(P.b, mul(n, off));
      const sgn = Math.sign(off) || 1;
      S.push([add(P.a, mul(n, 6 * sgn)), add(a2, mul(n, ext * sgn))]);
      S.push([add(P.b, mul(n, 6 * sgn)), add(b2, mul(n, ext * sgn))]);
      // the dimension line grows from the middle out, then architectural ticks at both ends
      const mid = mul(add(a2, b2), 0.5);
      S.push([mid, a2], [mid, b2]);
      const tk = mul(nrm(add(d, n)), 7);
      S.push([sub(a2, tk), add(a2, tk)], [sub(b2, tk), add(b2, tk)]);
      if (P.label !== undefined) L.push({ at: add(mid, mul(n, 16 * sgn)), text: String(P.label), align: 'center', ang: Math.atan2(d[1], d[0]) });
      break;
    }
    case 'callout': {
      const r = P.r ?? 7; const dir = nrm(sub(P.to, P.at));
      S.push(arcPts(P.at, r, -90, 270));
      const start = add(P.at, mul(dir, r));
      const shelf = P.shelf ?? (P.to[0] >= P.at[0] ? 110 : -110);
      const end = [P.to[0] + shelf, P.to[1]];
      S.push([start, P.to, end]);
      if (P.label !== undefined) L.push({ at: [P.to[0] + shelf * 0.5, P.to[1] - 10], text: String(P.label), align: 'center', ang: 0 });
      break;
    }
    case 'ticks': {
      const n = P.n ?? 10, tl = P.len ?? 10, maj = P.major ?? 5;
      const d = nrm(sub(P.b, P.a)); const nn = [-d[1], d[0]];
      S.push([P.a, P.b]);
      for (let i = 0; i <= n; i++) { const p = add(P.a, mul(sub(P.b, P.a), i / n)); const l = i % maj === 0 ? tl * 1.8 : tl; S.push([p, add(p, mul(nn, l))]); }
      break;
    }
    default: break;
  }
  return { strokes: S, labels: L };
}

function partial(strokes, f) {
  let total = 0; const lens = strokes.map((s) => { let l = 0; for (let i = 1; i < s.length; i++) l += len(sub(s[i], s[i - 1])); total += l; return l; });
  let left = f * total; const out = []; let tip = null;
  for (let k = 0; k < strokes.length && left > 0; k++) {
    const s = strokes[k];
    if (left >= lens[k]) { out.push(s); left -= lens[k]; tip = s[s.length - 1]; continue; }
    const o = [s[0]];
    for (let i = 1; i < s.length; i++) {
      const l = len(sub(s[i], s[i - 1]));
      if (left >= l) { o.push(s[i]); left -= l; } else { const p = add(s[i - 1], mul(sub(s[i], s[i - 1]), left / (l || 1))); o.push(p); tip = p; left = 0; break; }
    }
    out.push(o); if (left > 0) tip = o[o.length - 1];
  }
  return { out, tip };
}

const css = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;

export function drawBlueprint(c, paths, time, o = {}) {
  const col = o.col || [0.94, 0.98, 1], gcol = o.glowCol || [0.35, 0.85, 1], glow = o.glow ?? 1, W = o.w ?? 2.5, A = o.alpha ?? 1;
  const zoom = o.zoom ?? 1, pan = o.pan || [0, 0], r = o.rot || 0, cr = Math.cos(r), sr = Math.sin(r);
  const X = (p) => { const dx = p[0] - 960, dy = p[1] - 540; return [960 + pan[0] + zoom * (cr * dx - sr * dy), 540 + pan[1] + zoom * (sr * dx + cr * dy)]; };
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  // faint grid
  const g = o.grid;
  if (g) {
    const ga = (g.alpha ?? 0.06) * A * (g.t1 !== undefined ? clamp((time - (g.t0 ?? 0)) / Math.max(1e-3, g.t1 - (g.t0 ?? 0))) : 1);
    if (ga > 0) {
      const st = g.step ?? 60, maj = g.major ?? 5, x0 = g.x0 ?? 0, y0 = g.y0 ?? 0, x1 = g.x1 ?? 1920, y1 = g.y1 ?? 1080;
      c.lineWidth = 2;
      for (let i = 0, x = x0; x <= x1 + 0.1; x += st, i++) { c.strokeStyle = css(gcol, ga * (i % maj === 0 ? 1.8 : 1)); const a = X([x, y0]), b = X([x, y1]); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
      for (let i = 0, y = y0; y <= y1 + 0.1; y += st, i++) { c.strokeStyle = css(gcol, ga * (i % maj === 0 ? 1.8 : 1)); const a = X([x0, y]), b = X([x1, y]); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
    }
  }
  const tips = [];
  for (const P of paths || []) {
    const t0 = P.t0 ?? 0, t1 = P.t1 ?? t0 + 0.6;
    if (time < t0) continue;
    const ez = EASES[P.ease || 'inOut'] || EASES.inOut;
    const f = ez(clamp((time - t0) / Math.max(1e-3, t1 - t0)));
    const { strokes, labels } = shape(P);
    const { out, tip } = partial(strokes, f);
    const w = P.w ?? W, pc = P.col || col, pa = (P.alpha ?? 1) * A;
    if (P.dash) c.setLineDash(P.dash); else c.setLineDash([]);
    const trace = () => { c.beginPath(); for (const s of out) { if (s.length < 2) continue; c.moveTo(...X(s[0])); for (let i = 1; i < s.length; i++) c.lineTo(...X(s[i])); } c.stroke(); };
    if (glow > 0) {
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = css(gcol, 0.07 * glow * pa); c.lineWidth = w * 6; trace();
      c.strokeStyle = css(gcol, 0.16 * glow * pa); c.lineWidth = w * 2.6; trace();
      c.globalCompositeOperation = 'source-over';
    }
    c.strokeStyle = css(pc, 0.95 * pa); c.lineWidth = w; trace();
    if (tip && f < 1 && o.pen !== false) tips.push([X(tip), w, pa]);
    // labels type on over the last 30% of the window
    if (labels.length) {
      const lf = clamp((f - 0.7) / 0.3);
      if (lf > 0) {
        c.font = `500 ${o.size ?? 18}px ${o.font || 'Plex'}`; c.fillStyle = css(pc, pa); c.textBaseline = 'middle';
        for (const L of labels) {
          const txt = L.text.slice(0, Math.ceil(L.text.length * lf));
          const at = X(L.at);
          c.save(); c.translate(at[0], at[1]);
          let ang = (L.ang || 0) + r; if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
          c.rotate(ang); c.textAlign = L.align || 'center';
          if (glow > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = css(gcol, 0.25 * glow * pa); c.fillText(txt, 0.8, 0.8); c.globalCompositeOperation = 'source-over'; c.fillStyle = css(pc, pa); }
          c.fillText(txt, 0, 0); c.restore();
        }
      }
    }
  }
  c.setLineDash([]);
  // pen tips: a hot point where each line is being drawn
  for (const [p, w, pa] of tips) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = css(gcol, 0.25 * pa); c.beginPath(); c.arc(p[0], p[1], w * 3.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = css([1, 1, 1], pa); c.beginPath(); c.arc(p[0], p[1], w * 1.1, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const time = p.abs ? t : lt;
    const c = e.c2dBegin();
    const A = typeof p.alpha === 'function' ? p.alpha(t, lt) : (p.alpha ?? 1);
    const paths = typeof p.paths === 'function' ? p.paths(t, lt) : p.paths;
    drawBlueprint(c, paths, time, { ...p, alpha: A });
    if (!p.over) e.clear(e.rtScene, ...(p.bg || [0.03, 0.08, 0.16]));
    e.blit2d('over', p.gain ?? 1.3);
  },
};
