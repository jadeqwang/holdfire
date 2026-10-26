// FOREST RETICLES: the bridge's single held shot ("They say the forest's dark, / every hunter holds its breath, / any world that
// lights a spark / is lighting its own death."). Red reticles open in the dark among the trees like eyes, one by one, small and
// far, breathing; on "holds its breath" they go still. On "lights a spark" a tiny warm match flame strikes at p.match; on
// "its own death" every reticle snaps onto it and tightens into a lock, leaving its sight-line behind (the next shot, chainhands,
// starts from those lines).
//
// drawForestReticles(ctx, p) draws ADDITIVELY into rtScene (over the director's redrawn forest plate).
// p (all optional): {reticles: [[x, y, r], ...] (design px; default RETICLES), tOpen: [first, last] (eyes open between, eased),
//   tHold (breath held), tMatch (the strike), tSnap (snap onto the flame), match: [x, y], matchSize (1), stagger (0.045 s),
//   breathe (0.035), gain (1.6), alpha (1), lines (true: sight-lines), flame (true)}
// Defaults come from the bridge lines in timing.json (A.findLine('Bridge', 0..3)).
// The 'forestreticles' scene draws a procedural dark-forest backdrop under the overlay (for testing; p.backdrop: false skips it).
import * as THREE from 'three';
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, range, easeOutCubic, easeOutExpo, easeOutBack, hash1, hash2, noise1 } from '../../util.js';
import { drawReticle } from './reticle.js';

export const RETICLES = [
  [1312, 468, 21], [640, 512, 27], [1022, 432, 18], [1532, 566, 32], [418, 604, 38], [826, 612, 21], [1184, 646, 28],
  [262, 418, 46], [1708, 352, 52], [962, 528, 16], [1446, 380, 20], [560, 334, 30], [1112, 520, 17],
];
export const MATCH = [906, 694];

// times from the lyric (word onsets), overridable
export function forestTimes(A, p = {}) {
  const L = (k) => A.findLine('Bridge', k);
  const w = (k, j, d) => { const l = L(k); return l && l.words[j] ? l.words[j].t : d; };
  return {
    tOpen: p.tOpen || [w(0, 3, 144.9), w(1, 4, 148.0)],      // "forest's" .. "breath"
    tHold: p.tHold ?? w(1, 2, 147.36),                       // "holds"
    tMatch: p.tMatch ?? w(2, 3, 149.84),                     // "lights"
    tSnap: p.tSnap ?? w(3, 2, 152.56),                       // "its (own death)"
    tDeath: p.tDeath ?? w(3, 4, 153.08),                     // "death"
  };
}

// where every reticle is at time t (shared with chainhands, which starts from the converged state)
export function forestState(t, p, T) {
  const ret = p.reticles || RETICLES;
  const n = ret.length;
  const match = p.match || MATCH;
  const stag = p.stagger ?? 0.045;
  const hold = smooth(range(t, T.tHold - 0.1, T.tHold + 0.35));
  // on the flame they nest as one target: the far (small) ones inside, the near ones outside, >= 7 px apart
  const order = ret.map((q, i) => [q[2], i]).sort((a, b) => a[0] - b[0]).map((q) => q[1]);
  const rank = new Array(n); order.forEach((i, k) => { rank[i] = k; });
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0, r0] = ret[i];
    const u = n > 1 ? i / (n - 1) : 0;
    const ti = lerp(T.tOpen[0], T.tOpen[1], Math.pow(u, 0.78));
    const open = clamp((t - ti) / 0.55);
    // breath: a slow swell, frozen when the hunters hold their breath
    const ph = hash1(i * 7.7) * 6.283, per = 2.8 + hash1(i * 3.1) * 1.6;
    const tb = Math.min(t, T.tHold + 0.2);
    const br = (p.breathe ?? 0.035) * Math.sin(tb * 6.283 / per + ph) * (1 - hold * 0.85);
    const drift = [Math.sin(tb * 0.5 + ph) * 2.5, Math.cos(tb * 0.43 + ph) * 1.8];
    // the snap: by distance, nearest first; fast, with a small overshoot
    const d = Math.hypot(x0 - match[0], y0 - match[1]);
    const ts = T.tSnap + stag * (i % 7) + d * 0.00012;
    const k = t < ts ? 0 : easeOutBack(clamp((t - ts) / 0.3), 1.2);
    const x = lerp(x0 + drift[0], match[0], k), y = lerp(y0 + drift[1], match[1] - 6, k);
    const tight = smooth(range(t, ts + 0.15, T.tDeath + 0.25));
    const lock = smooth(range(t, T.tDeath, T.tDeath + 0.12));
    const rNest = lerp(20 + 10.5 * rank[i], 15 + 7 * rank[i], tight);
    const r = lerp(r0 * (1 + br), rNest, clamp(k));
    const master = rank[i] === n - 1;
    const spin = (Math.min(t, T.tHold) * 0.12 + i) * (i % 2 ? 1 : -1);
    out.push({ i, x0, y0, x, y, r, open, tight, lock: master ? lock : 0, spin, k, ts, detail: master ? 1 : 1 - 0.92 * clamp(k) });
  }
  return out;
}

// the match: a sulfur flare at the strike, then a small steady flame that trembles
export function drawMatch(c, x, y, t, tMatch, size = 1) {
  const a = t - tMatch; if (a < 0) return 0;
  const flare = Math.exp(-a / 0.09) * clamp(a / 0.015);
  const live = smooth(clamp(a / 0.25));
  const fl = 0.85 + 0.15 * noise1(t * 11) + 0.08 * noise1(t * 23 + 3);
  c.save(); c.globalCompositeOperation = 'lighter';
  // warm glow on the dark
  const R = (60 + 140 * flare) * size;
  let g = c.createRadialGradient(x, y - 4 * size, 0, x, y - 4 * size, R);
  g.addColorStop(0, css(P.goldPale, 0.5 * live * fl + 0.6 * flare)); g.addColorStop(0.18, css(P.ember, 0.22 * live * fl + 0.3 * flare)); g.addColorStop(1, css(P.ember, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y - 4 * size, R, 0, Math.PI * 2); c.fill();
  // the flame: a teardrop, hot core
  const h = (16 + 6 * flare) * size * fl, w = 4.6 * size;
  const sway = (noise1(t * 3.1) - 0.5) * 2.2 * size;
  c.fillStyle = css(P.ember, 0.75 * live + flare);
  c.beginPath(); c.moveTo(x, y + 3 * size); c.bezierCurveTo(x - w * 1.25, y - h * 0.2, x - w * 0.4 + sway, y - h * 0.75, x + sway * 1.6, y - h);
  c.bezierCurveTo(x + w * 0.4 + sway, y - h * 0.75, x + w * 1.25, y - h * 0.2, x, y + 3 * size); c.fill();
  c.fillStyle = css(P.goldPale, 0.9 * live + flare);
  c.beginPath(); c.ellipse(x + sway * 0.4, y - h * 0.28, w * 0.5, h * 0.3, 0, 0, Math.PI * 2); c.fill();
  // the matchstick
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = css([0.32, 0.22, 0.14], 0.9 * live); c.lineWidth = 2.4 * size; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y + 4 * size); c.lineTo(x + 7 * size, y + 30 * size); c.stroke();
  c.restore();
  return live;
}

export function drawForestReticles(ctx, p = {}) {
  const e = ctx.engine, t = ctx.t;
  const T = forestTimes(ctx.audio, p);
  const st = forestState(t, p, T);
  const match = p.match || MATCH;
  const c = e.c2dBegin();
  // p.view: the plate's slow push, so the eyes stay put among the trees: {zoom, cx, cy}
  if (p.view) { const v = p.view; c.translate(v.cx ?? 960, v.cy ?? 560); c.scale(v.zoom ?? 1, v.zoom ?? 1); c.translate(-(v.cx ?? 960), -(v.cy ?? 560)); }
  const red = P.red, al = p.alpha ?? 1;
  // sight-lines: from where each hunter was to the light, left behind by the snap
  if (p.lines ?? true) {
    for (const s of st) {
      if (s.k <= 0) continue;
      const fade = 1 - smooth(range(t, s.ts + 0.5, s.ts + 2.4)) * (p.linesFade ?? 0);
      c.strokeStyle = css(red, 0.34 * al * fade * clamp(s.k * 3)); c.lineWidth = 2;
      c.beginPath(); c.moveTo(s.x0, s.y0); c.lineTo(s.x, s.y); c.stroke();
    }
  }
  for (const s of st) {
    // far reticles a touch dimmer (atmosphere), all of them hard red
    const depthA = lerp(0.6, 1, clamp((s.r - 16) / 36));
    drawReticle(c, s.x, s.y, s.r, { open: s.open, tight: s.tight, lock: s.lock, spin: s.spin * (1 - clamp(s.k)), alpha: al * lerp(depthA, 0.9, clamp(s.k)), col: red, lw: 2, detail: s.detail });
  }
  if (p.flame ?? true) drawMatch(c, match[0], match[1], t, T.tMatch, p.matchSize ?? 1.25);
  e.blit2d('add', p.gain ?? 1.2);
  return st;
}

// ---------------------------------------------------------------- the test scene: a procedural dark forest in fog
let forestMat = null;
function forestBackdrop(e, t, p) {
  if (!forestMat) {
    forestMat = e.shader(/* glsl */`
      uniform float time; uniform float zoom; uniform vec3 cVoid; uniform vec3 cNight; uniform vec3 cFog; uniform float flame; uniform vec2 matchP;
      float trunks(vec2 d, float depth, float seed){
        float sc = mix(3.4, .55, depth);           // near trunks are wide
        float cw = 120. * sc;
        float xi = floor(d.x / cw);
        float h = hash12(vec2(xi, seed));
        if (h < .28) return 0.;
        float cx = (xi + .2 + .6 * hash12(vec2(xi, seed + 3.))) * cw;
        float w = (5. + 9. * hash12(vec2(xi, seed + 7.))) * sc * (1. + .12 * (d.y / 1080.));
        float lean = (hash12(vec2(xi, seed + 11.)) - .5) * .05;
        float x = d.x - cx - (d.y - 540.) * lean;
        float bark = vnoise(vec2(x * .25, d.y * .02) + seed) * .25;
        return 1. - smoothstep(w * (.85 + bark), w * (1. + bark) + 1.2, abs(x));
      }
      void main(){
        vec2 d = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
        d = (d - vec2(960., 560.)) / zoom + vec2(960., 560.);
        float y = d.y / 1080.;
        // sky through the canopy, fog band at the horizon, black ground
        vec3 col = mix(cNight * .9, cFog * .55, smoothstep(.15, .5, y));
        col = mix(col, cVoid, smoothstep(.58, .9, y));
        float mist = fbm(vec2(d.x * .0016 + time * .012, d.y * .004)) ;
        col += cFog * .22 * smoothstep(.35, .8, mist) * (1. - smoothstep(.3, .75, abs(y - .5) * 2.));
        // trunks, back to front: far ones lost in fog, near ones black
        for (int i = 0; i < 6; i++) {
          float depth = 1. - float(i) / 5.;
          float m = trunks(d + vec2(float(i) * 311., 0.), depth, float(i) * 17.3);
          vec3 tc = mix(cVoid * .7, mix(cFog * .5, cNight, .4), depth * .85);
          col = mix(col, tc, m);
        }
        // the match's warm light reaches a little way into the dark
        float dl = length(d - matchP);
        col += vec3(1., .55, .25) * .05 * flame * exp(-dl / 160.);
        fragColor = vec4(col, 1.);
      }`, { time: { value: 0 }, zoom: { value: 1 }, cVoid: { value: new THREE.Color(...P.void) }, cNight: { value: new THREE.Color(...P.night) }, cFog: { value: new THREE.Color(...P.fog) }, flame: { value: 0 }, matchP: { value: new THREE.Vector2() } });
  }
  const u = forestMat.uniforms;
  u.time.value = t; u.zoom.value = p.zoom ?? 1;
  u.flame.value = p._flame ?? 0;
  const m = p.match || MATCH; u.matchP.value.set(m[0], m[1]);
  e.pass(forestMat, e.rtScene);
}

export default {
  draw(ctx, shot, t, lt, p) {
    const T = forestTimes(ctx.audio, p);
    const zoom = p.zoom ?? (1 + 0.035 * smooth(range(t, shot.t0, shot.t1)));
    if (p.backdrop ?? true) forestBackdrop(ctx.engine, t, { ...p, zoom, _flame: smooth(range(t, T.tMatch, T.tMatch + 0.3)) });
    drawForestReticles(ctx, { view: { zoom, cx: 960, cy: 560 }, ...p });
  },
};
