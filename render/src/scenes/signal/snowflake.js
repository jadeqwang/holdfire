// P1a "Snowflake in the boundless night": a snow crystal grows its six dendritic arms in the dark, drawn in engraved gold
// growth-lines (each line is the crystal's edge at an earlier moment, so the drawing is its own growth record); then the camera
// rises and the six arms resolve into the plan of the signal station: roads along the arms, six dishes at the tips, a ring
// road, the cliff (hachured) and the sea (water-lined), engraved like a survey chart. The snowflake IS the station.
// Physics: Reiter (2005) hex-grid model, baked offline (gen/snowflake_gen.mjs) into the step at which each cell froze;
// the scene indexes that by song time, so every frame is a pure function of t.
// p: {g0, g1 (growth start/end, song s), r0, r1 (camera rise start/end), cx, cy, R (tip radius px at zoom 1),
//     zoomEnd, ang (rad), caption (bool), labels (bool)}
import * as THREE from 'three';
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, easeOutCubic, easeInOutCubic, range } from '../../util.js';
import { loadBin, floatTex, lineByText, wordT, strokePartial, arcPts, hotPoint } from './lib.js';

let field = null, mat = null;

async function loadField() {
  if (field) return field;
  const buf = await loadBin('./assets/snowflake_reiter.bin');
  const [N, steps] = new Uint32Array(buf, 0, 2);
  const raw = new Uint16Array(buf, 8, N * N);
  let kMax = 0; for (const v of raw) if (v !== 65535 && v > kMax) kMax = v;
  const f = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) f[i] = raw[i] === 65535 ? kMax * 1.3 : raw[i];
  // tip radius (cells)
  const c = (N - 1) / 2; let rmax = 0;
  for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) if (raw[r * N + q] !== 65535) { const x = (q - c) + (r - c) / 2, y = (r - c) * 0.8660254; rmax = Math.max(rmax, Math.hypot(x, y)); }
  field = { N, steps, kMax, rmax, tex: floatTex(f, N, N) };
  return field;
}

function material(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform sampler2D tHex; uniform float N; uniform float k; uniform float kMax; uniform float dLevel;
    uniform vec2 center; uniform float sc; uniform float ang; uniform float S; uniform float rmax;
    uniform float interior; uniform float front; uniform float fillA; uniform float glowTip;
    uniform float topo; uniform float reveal; uniform vec3 gold; uniform vec3 hot; uniform vec3 bg; uniform float time;
    float Tat(vec2 ij){ ij += (N - 1.) * .5; if (ij.x < 0. || ij.y < 0. || ij.x > N - 1. || ij.y > N - 1.) return kMax * 1.3;
      return texelFetch(tHex, ivec2(ij), 0).r; }
    float aaLine(float d, float hw){ return 1. - smoothstep(hw - .75, hw + .75, d); }
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 v = (px - center) / sc;
      float ca = cos(ang), sa = sin(ang);
      vec2 w = vec2(ca * v.x + sa * v.y, -sa * v.x + ca * v.y);      // world (cells)
      float rr = w.y / .8660254, qq = w.x - rr * .5;
      vec2 b = floor(vec2(qq, rr)), f = vec2(qq, rr) - b;
      float T;
      if (f.x + f.y < 1.) T = Tat(b) * (1. - f.x - f.y) + Tat(b + vec2(1., 0.)) * f.x + Tat(b + vec2(0., 1.)) * f.y;
      else T = Tat(b + vec2(1.)) * (f.x + f.y - 1.) + Tat(b + vec2(1., 0.)) * (1. - f.y) + Tat(b + vec2(0., 1.)) * (1. - f.x);
      vec2 g = vec2(dFdx(T), dFdy(T)); float gl = max(length(g), 1e-4);   // per screen px
      float s1 = S;                                                     // design px -> screen px
      vec3 col = bg;
      float inside = step(T, k);
      // faint body
      col += gold * fillA * inside * (.6 + .4 * exp(-(k - T) / 300.));
      // growth lines: iso-lines of freeze time (older edges of the crystal), faded where they would crowd (< 6 px)
      float fl = T / dLevel; float dd = abs(fract(fl + .5) - .5) * dLevel / gl;
      float spacing = dLevel / gl;
      float crowd = smoothstep(5.5 * s1, 9. * s1, spacing);
      float rec = exp(-(k - T) / 220.);
      float il = aaLine(dd, 1.0 * s1) * crowd * inside * step(T, k - dLevel * .35);
      col += gold * il * interior * (.42 + .58 * rec);
      // the growing edge (iso-line T = k): hot, it blooms
      float df = abs(T - k) / gl;
      float fr = aaLine(df, 1.25 * s1) * step(T, kMax * 1.2);
      col += hot * fr * front * (1.25 + 1.1 * glowTip);
      // ---- the survey chart (station phase)
      if (topo > 0.001) {
        float d = length(w);
        float rv = smoothstep(reveal, reveal - 90., d) * topo;
        // coastline: x' = coastX(y) in world cells (sea to the right of the station)
        float coast = rmax * 1.62 + 38. * sin(w.y * .0062 + 1.3) + 22. * sin(w.y * .017 + .4) + 26. * (fbm3(vec2(w.y * .006, 3.1)) - .5);
        float s = w.x - coast;                      // > 0 sea, < 0 land
        float sgl = max(length(vec2(dFdx(s), dFdy(s))), 1e-4);
        vec3 ink = gold * .72;
        // coastline itself
        float cl = aaLine(abs(s) / sgl, 1.1 * s1);
        col += gold * cl * rv * 1.1;
        // water-lining: lines parallel to the coast, spacing widening seaward
        if (s > 0.) {
          float gw = sqrt(s / 7.); float dw = abs(fract(gw + .5) - .5) / max(length(vec2(dFdx(gw), dFdy(gw))), 1e-4);
          float fade = exp(-s / 260.);
          col += ink * aaLine(dw, .95 * s1) * fade * rv * .85;
        }
        // cliff hachures: short strokes down the slope, along the coast
        float cliffW = 34. + 14. * sin(w.y * .03);
        if (s < 0. && s > -cliffW) {
          float u = w.y / 5.2 + .25 * sin(w.y * .1);
          float du = abs(fract(u + .5) - .5) / max(length(vec2(dFdx(u), dFdy(u))), 1e-4);
          float len = smoothstep(-cliffW, -cliffW * .55, s) * (.6 + .4 * fbm3(vec2(w.y * .05, 1.)));
          col += ink * aaLine(du, .95 * s1) * step(-cliffW * len, s) * rv;
        }
        // land contours from a gentle height field; the station sits on a levelled plateau
        if (s < -cliffW * .6) {
          float h = 24. * fbm3(w * .0042 + 7.) + 10. * fbm3(w * .011 + 2.) + s * -.02;
          h = mix(h, 17., smoothstep(rmax * 1.25, rmax * 1.05, d));
          float hl = h / 2.6; float dh = abs(fract(hl + .5) - .5) / max(length(vec2(dFdx(hl), dFdy(hl))), 1e-4);
          float cs = 1. / max(length(vec2(dFdx(hl), dFdy(hl))), 1e-4);
          col += ink * .8 * aaLine(dh, .95 * s1) * smoothstep(6. * s1, 11. * s1, cs) * rv * smoothstep(rmax * 1.08, rmax * 1.2, d);
        }
      }
      fragColor = vec4(col, 1.);
    }`, {
    tHex: { value: null }, N: { value: 1 }, k: { value: 0 }, kMax: { value: 1 }, dLevel: { value: 20 },
    center: { value: new THREE.Vector2(960, 540) }, sc: { value: 2 }, ang: { value: 0 }, S: { value: e.S }, rmax: { value: 180 },
    interior: { value: 1 }, front: { value: 1 }, fillA: { value: 0.04 }, glowTip: { value: 0 },
    topo: { value: 0 }, reveal: { value: 0 }, gold: { value: new THREE.Color() }, hot: { value: new THREE.Color() }, bg: { value: new THREE.Color() }, time: { value: 0 },
  });
  return mat;
}

// timing: from params, else from the lyric ("Snowflake in the boundless night,")
function times(ctx, shot, p) {
  const L = lineByText(ctx.audio, 'snowflake');
  const night = wordT(L, 'night', shot.t0 + 3.2);
  const g0 = p.g0 ?? shot.t0 + 0.12;
  const g1 = p.g1 ?? Math.min(night - 0.25, shot.t1 - 1.2);
  const r0 = p.r0 ?? g1 - 0.05;
  const r1 = p.r1 ?? shot.t1 - 0.12;
  return { g0, g1, r0, r1 };
}

function cam(ctx, shot, t, p, F) {
  const { g0, g1, r0, r1 } = times(ctx, shot, p);
  const R = p.R ?? 400;
  const rise = easeInOutCubic(range(t, r0, r1));
  const zoom = lerp(lerp(1.0, 1.035, smooth(range(t, g0, g1))), p.zoomEnd ?? 0.37, rise);
  const ang = Math.PI / 2 + (p.ang ?? 0) + 0.05 * range(t, shot.t0, r0) - 0.16 * rise;
  const cx = p.cx ?? 960, cy = lerp(p.cy ?? 492, (p.cy ?? 492) + 10, rise);
  const sc = (R / F.rmax) * zoom;           // screen px per cell
  // growth: fast first (the six arms read at once), slowing as the side branches fill in
  const u = range(t, g0, g1);
  const k = F.kMax * (0.035 + 0.965 * (1 - Math.pow(1 - u, 1.7)));
  return { g0, g1, r0, r1, rise, zoom, ang, cx, cy, sc, k, u };
}

export const look = { bloom: 0.75, bloomThreshold: 0.72, halation: 0.25, vignette: 0.3, grain: 0.03, streak: 0.25, streakThreshold: 1.4, streakCol: [1.0, 0.8, 0.5] };

export default {
  async init(ctx) { await loadField(); },
  async prepare(ctx) { await loadField(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const F = field; const m = material(e); const u = m.uniforms;
    const C = cam(ctx, shot, t, p, F);
    u.tHex.value = F.tex; u.N.value = F.N; u.kMax.value = F.kMax; u.rmax.value = F.rmax;
    u.k.value = C.k; u.center.value.set(C.cx, C.cy); u.sc.value = C.sc; u.ang.value = C.ang; u.S.value = e.S;
    u.dLevel.value = 22;
    u.interior.value = lerp(1, 0.16, smooth(range(C.rise, 0.0, 0.7)));
    u.front.value = lerp(1, 0.5, smooth(range(C.rise, 0.0, 0.8)));
    u.fillA.value = lerp(0.045, 0.02, C.rise);
    u.glowTip.value = 1 - C.u;
    u.topo.value = smooth(range(C.rise, 0.25, 0.95));
    u.reveal.value = lerp(F.rmax * 0.8, F.rmax * 4.2, easeOutCubic(range(C.rise, 0.2, 1.0)));
    u.gold.value.setRGB(...P.gold); u.hot.value.setRGB(...P.goldPale); u.bg.value.setRGB(...P.void);
    e.pass(m, e.rtScene);

    // ---- the station, drawn over the arms (Canvas 2D in the same camera)
    const st = smooth(range(C.rise, 0.12, 1.0));
    const c = e.c2dBegin();
    const W = (x, y) => { const ca = Math.cos(C.ang), sa = Math.sin(C.ang); return [C.cx + (ca * x - sa * y) * C.sc, C.cy + (sa * x + ca * y) * C.sc]; };
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (st > 0) {
      const Rt = F.rmax * 0.985;
      const gold = css(P.gold, 0.95), pale = css(P.goldPale, 0.95);
      // roads along the six arms (double line), drawn outward from the hub
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3; const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        const ro = smooth(range(st, 0.0 + i * 0.03, 0.55 + i * 0.03));
        for (const sgn of [-1, 1]) {
          const off = 3.2 / Math.max(0.6, C.sc) * 1.0 + 2.6;   // ~6-7 px apart on screen
          const pts = [W(ux * 16 + nx * off * sgn, uy * 16 + ny * off * sgn), W(ux * (Rt - 18) + nx * off * sgn, uy * (Rt - 18) + ny * off * sgn)];
          c.strokeStyle = gold; c.lineWidth = 2; strokePartial(c, pts, ro);
        }
      }
      // ring road through the dishes (dashed, like a perimeter track)
      const rr = smooth(range(st, 0.35, 0.9));
      c.strokeStyle = css(P.gold, 0.7); c.lineWidth = 2; c.setLineDash([10, 8]);
      const ring = arcPts(0, 0, Rt * 1.1, -Math.PI / 2, Math.PI * 1.5, 220).map(([x, y]) => W(x, y));
      strokePartial(c, ring, rr);
      c.setLineDash([]);
      // the dishes: seen from above, a paraboloid is a set of concentric rings, with a quadripod and the feed at its focus
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3; const k = smooth(range(st, 0.3 + i * 0.05, 0.8 + i * 0.05));
        if (k <= 0) continue;
        const [x, y] = W(Math.cos(a) * Rt, Math.sin(a) * Rt);
        const rd = 23 * C.sc * 0.9 + 6;           // dish radius (screen px)
        const tilt = C.ang + a;                   // dishes look outward along their arm (foreshortened slightly)
        c.save(); c.translate(x, y); c.rotate(tilt);
        c.strokeStyle = pale; c.lineWidth = 2.2;
        strokePartial(c, arcPts(0, 0, rd, 0, Math.PI * 2, 72), k);
        c.strokeStyle = gold; c.lineWidth = 2;
        for (const f of [0.62]) if (k > 0.5) strokePartial(c, arcPts(0, 0, rd * f, 0, Math.PI * 2, 48), (k - 0.5) * 2);
        if (k > 0.7) {
          c.globalAlpha = (k - 0.7) / 0.3;
          c.beginPath();
          for (let j = 0; j < 4; j++) { const b = j * Math.PI / 2 + Math.PI / 4; c.moveTo(Math.cos(b) * rd * 0.95, Math.sin(b) * rd * 0.95); c.lineTo(Math.cos(b) * rd * 0.16, Math.sin(b) * rd * 0.16); }
          c.stroke();
          c.fillStyle = pale; c.beginPath(); c.arc(0, 0, Math.max(2.6, rd * 0.13), 0, Math.PI * 2); c.fill();
          c.globalAlpha = 1;
        }
        c.restore();
      }
      // the hub: control house (hexagon, hatched), and the beacon lamp at its centre
      const hk = smooth(range(st, 0.1, 0.6));
      const hr = 15 * C.sc + 7;
      const [hx, hy] = W(0, 0);
      c.save(); c.translate(hx, hy); c.rotate(C.ang);
      c.strokeStyle = pale; c.lineWidth = 2.2;
      strokePartial(c, arcPts(0, 0, hr, Math.PI / 6, Math.PI / 6 + Math.PI * 2, 6), hk);
      if (hk > 0.6) {
        c.save(); c.beginPath(); for (let j = 0; j < 6; j++) { const b = Math.PI / 6 + j * Math.PI / 3; j ? c.lineTo(Math.cos(b) * hr, Math.sin(b) * hr) : c.moveTo(Math.cos(b) * hr, Math.sin(b) * hr); } c.closePath(); c.clip();
        c.strokeStyle = css(P.gold, 0.55 * (hk - 0.6) / 0.4); c.lineWidth = 2;
        c.beginPath(); for (let yy = -hr; yy <= hr; yy += 7) { c.moveTo(-hr, yy); c.lineTo(hr, yy); } c.stroke();
        c.restore();
      }
      c.restore();
      // north arrow + scale bar (bottom right), chart furniture
      const fk = smooth(range(st, 0.55, 1.0));
      if (fk > 0) {
        c.globalAlpha = fk;
        c.strokeStyle = css(P.bookGold, 0.9); c.fillStyle = css(P.bookGold, 0.9); c.lineWidth = 2;
        const nx0 = 1700, ny0 = 860;
        const na = C.ang - Math.PI / 2 - 0.35;      // north drifts with the camera's yaw
        c.save(); c.translate(nx0, ny0); c.rotate(na);
        c.beginPath(); c.moveTo(0, 30); c.lineTo(0, -34); c.stroke();
        c.beginPath(); c.moveTo(0, -40); c.lineTo(-8, -20); c.lineTo(0, -25); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(0, -40); c.lineTo(8, -20); c.lineTo(0, -25); c.closePath(); c.stroke();
        c.restore();
        const sx0 = 1560, sy0 = 960, Lb = 160;
        c.beginPath(); c.moveTo(sx0, sy0); c.lineTo(sx0 + Lb, sy0);
        for (let j = 0; j <= 4; j++) { c.moveTo(sx0 + j * Lb / 4, sy0 - (j % 2 ? 6 : 10)); c.lineTo(sx0 + j * Lb / 4, sy0); }
        c.stroke();
        c.globalAlpha = 1;
      }
    }
    // the seed: a point of light before the first arms
    const seed = 1 - smooth(range(t, C.g0, C.g0 + 0.5));
    if (seed > 0) hotPoint(c, C.cx, C.cy, seed * 0.9);
    e.blit2d('over', 1.8);
    ctx.state.snow = C;
  },

  type(ty, t, lt, shot, ctx) {
    const p = ctx.p; const C = ctx.state.snow; if (!C) return;
    // a single annotation (top left): the physics, so order is not mistaken for mind (the argument the pulsar continues)
    if (p.caption !== false) {
      const a = smooth(range(t, C.g0 + 0.6, C.g0 + 1.2)) * (1 - smooth(range(C.rise, 0.0, 0.35)));
      ty.label('SNOW CRYSTAL · HEXAGONAL ICE · REITER MODEL', 96, 104, { alpha: a * 0.9, size: 14, color: P.bookGold });
      ty.label('SIX-FOLD ORDER FROM PHYSICS ALONE. NO MIND REQUIRED.', 96, 130, { alpha: a * 0.7, size: 12, color: P.bookGold });
    }
    if (p.labels !== false) {
      const a = smooth(range(C.rise, 0.6, 1.0));
      ty.label('SIGNAL STATION · PLAN', 96, 104, { alpha: a * 0.95, size: 14, color: P.bookGold });
      ty.label('SIX DISHES ON THE CLIFF', 96, 130, { alpha: a * 0.7, size: 12, color: P.bookGold });
      ty.label('N', 1700, 806, { alpha: a * 0.9, size: 13, align: 'center', color: P.bookGold });
      ty.label('0', 1560, 990, { alpha: a * 0.8, size: 11, align: 'center', color: P.bookGold });
      ty.label('200 M', 1720, 990, { alpha: a * 0.8, size: 11, align: 'center', color: P.bookGold });
    }
  },
};
