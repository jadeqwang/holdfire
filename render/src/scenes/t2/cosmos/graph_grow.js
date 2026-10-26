// t2_graph_grow (post-chorus 1, 1:12.4-1:22.6): the contact graph grows from Earth.
//   One! One! Two! Three! Five! (1:13.03-1:15.59) among the nearest stars (fiction: unnamed stars within ~75 light-years):
//     one node (Earth), then 1, 2, 3, 5 new links, one set per shout;
//   Counting on you! (1:16.24): eight more links, the last one closing a loop (the edit sets the giant 8);
//   One! One! Two! Three! Five! (1:18.18-1:20.73): the same count one scale up: across the Orion Arm (links of the contact
//     graph, ~1000 light-years), then half the galaxy (hub links, 7000-11000 light-years) while the dim web spreads;
//   Counting on you! (1:21.35): the whole web flashes; the snare roll to 1:22.64 fills the frame with warm grey smoke for
//     the cut into the ink-wash verse.
// Every event is a pure function of t, so the edit can cut this into several shots (p.phase pins the camera to one scale).
//
// p (all optional): shouts [12 times] (timing.json post_chorus_1 hits), tFlash (= shouts[11]), smoke [t0, t1]
//   (81.55, 82.64), phase 'near' | 'arm' | 'galaxy' | 'auto', cam (overrides), off, smokeCol [r,g,b], stars, glow
//   mode 'first_line' (chorus 1, "I'm counting on you": Earth alone among the near stars, one faint line leaving it over
//   the shot) | 'eight' (= t2_graph_flash). The edit's {stage, scale} are accepted and ignored: the picture follows t.
import * as THREE from 'three';
import { initCore, renderGalaxy, G, W3 } from './core.js';
import { MW, LY } from './mw.js';
import { StarCloud, setCommon } from './gfx.js';
import { drawWeb, drawLink } from './web.js';
import { C, mixc, shoutTimes, ad, env } from './common.js';
import { clamp, lerp, smooth, smoother, range, easeOutCubic, easeInOutCubic } from '../../../util.js';
import graph_flash from './graph_flash.js';

const SETS_NEAR = [0, 1, 2, 3, 5, 8];
let LOCAL = null, smokeMat = null;

function localCloud() {
  if (LOCAL) return LOCAL;
  const st = MW.local.stars, n = st.length, sun = MW.sun;
  const a = new Float32Array(n * 8);
  st.forEach((s, i) => { const o = i * 8; a[o] = sun[0] + s.x * LY; a[o + 1] = s.h * LY; a[o + 2] = -(sun[1] + s.y * LY); a[o + 3] = 1.0; a[o + 4] = s.col[0]; a[o + 5] = s.col[1]; a[o + 6] = s.col[2]; a[o + 7] = s.b; });
  LOCAL = new StarCloud(a, n);
  LOCAL.mesh.renderOrder = 2.5; LOCAL.mesh.visible = false;   // shown only by this scene's draw
  G.scene.add(LOCAL.mesh);
  return LOCAL;
}
// the lit part of the near web at time t: weighted centre and reach (kpc), each node easing in after its shout
function nearFrame(t, S) {
  const lit = new Map([[-1, S[0] - 1]]);
  for (const l of MW.local.links) if (!lit.has(l.b)) lit.set(l.b, S[l.set]);
  let c = [0, 0, 0], ws = 0; const P = [];
  for (const [i, ts] of lit) { const w = smooth(range(t, ts - 0.05, ts + 0.7)); if (w <= 0) continue; const q = lpos(i); P.push([q, w]); c[0] += q[0] * w; c[1] += q[1] * w; c[2] += q[2] * w; ws += w; }
  c = c.map((x) => x / ws);
  let r = 4 * LY; for (const [q, w] of P) r = Math.max(r, w * Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]));
  return { c, r };
}
const lpos = (i) => { if (i < 0) return W3(MW.sun[0], MW.sun[1], 0); const s = MW.local.stars[i]; return W3(MW.sun[0] + s.x * LY, MW.sun[1] + s.y * LY, s.h * LY); };

// camera keys: [t, log10(dist kpc), elevation, target blend toward the inner galaxy]
function camAt(t, S, phase) {
  const K = [[S[0] - 0.7, -1.5, 0.42, 0], [S[3], -1.42, 0.46, 0], [S[5] + 0.5, -1.2, 0.5, 0], [S[6] - 0.15, 0.48, 0.6, 0], [S[8] + 0.2, 0.9, 0.66, 0.1],
    [S[10] - 0.1, 1.42, 0.78, 0.7], [S[11] + 0.1, 1.56, 0.82, 0.85], [S[11] + 1.4, 1.6, 0.84, 0.9]];
  let q = K[0];
  if (phase === 'near') q = [0, -1.3, 0.46, 0];
  else if (phase === 'arm') q = [0, 0.75, 0.64, 0.05];
  else if (phase === 'galaxy') q = [0, 1.56, 0.82, 0.85];
  else if (t >= K[K.length - 1][0]) q = K[K.length - 1];
  else if (t > K[0][0]) {
    let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], u = smoother(range(t, a[0], b[0]));
    q = [t, lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
  }
  const dist = Math.pow(10, q[1]);
  const sun = W3(MW.sun[0], MW.sun[1], 0);
  // the near web's centre of light, followed while it grows, handed back to the Sun as the camera pulls out
  const nf = nearFrame(t, S), kc = 1 - smooth(range(q[1], -1.0, -0.2)), cn = nf.c;
  if (phase === 'auto' || phase === 'near') {
    // while the near web grows, the camera frames what is lit (its centre, its reach); then the keyed pull-out takes over
    const auto = Math.log10(Math.max(0.02, nf.r * 3.4));
    const ka = 1 - smooth(range(t, S[5] + 0.45, S[6] - 0.3));
    q = [q[0], lerp(q[1], Math.min(q[1] + 0.25, auto), ka * (phase === 'near' ? 1 : 1)), q[2], q[3]];
  }
  const dist2 = Math.pow(10, q[1]);
  const tg = [lerp(lerp(sun[0], cn[0], kc), 0.8, q[3]), lerp(sun[1], cn[1], kc) * (1 - q[3]), lerp(lerp(sun[2], cn[2], kc), -3.2, q[3])];
  return { target: tg, dist: dist2, el: q[2], az: 3.35 + (t - S[0]) * 0.045, fov: 30 };
}

function smoke(e, k, t, col, puff) {
  if (k <= 0.001) return;
  if (!smokeMat) {
    smokeMat = e.shader(/* glsl */`
      uniform float k; uniform float time; uniform vec3 col; uniform float puff;
      void main(){
        vec2 p = vec2(vUv.x * 1.777, vUv.y);
        vec2 q = p * 2.2 + vec2(0., -time * .35);
        vec2 w = vec2(fbm3(q + vec2(1.7, 9.2) + time * .05), fbm3(q * 1.3 + vec2(8.3, 2.8) - time * .04));
        float d = fbm(q * 1.15 + w * 1.6 + vec2(0., -time * .2));
        // the smoke rolls in from below and the edges first
        float edge = (1. - vUv.y) * .35 + pow(abs(vUv.x - .5) * 2., 2.) * .25;
        float th = 1. - k * 1.55 - edge * (1. - k);
        float a = smoothstep(th, th + .32, d + edge * k * .5);
        a = clamp(a + smoothstep(.8, 1., k) * 1.2, 0., 1.);
        float sh = smoothstep(.2, .85, d + w.x * .3);
        vec3 c = mix(col * .55, col, sh) * (1. + puff * .25 * sh);
        fragColor = vec4(c, a);
      }`, { k: { value: 0 }, time: { value: 0 }, col: { value: [0.6, 0.57, 0.52] }, puff: { value: 0 } });
  }
  const u = smokeMat.uniforms; u.k.value = k; u.time.value = t; u.col.value = col; u.puff.value = puff;
  e.passOver(smokeMat, e.rtScene, 'normal');
}

// chorus 1's last line: Earth among the near stars, one faint line leaving it (the graph's first link, not yet arrived)
function firstLine(ctx, shot, t, p) {
  const e = ctx.engine;
  G.sprites.reset(); G.lines.reset();
  const sunP = lpos(-1), l = MW.local.links[0], b = lpos(l.b);
  const f = 0.62 * easeInOutCubic(range(t, shot.t0 + 0.15, shot.t1 + 0.2));
  G.lines.add(sunP[0], sunP[1], sunP[2], b[0], b[1], b[2], 2.0, ...C.gold, 0.55, f, 0.9, 0.2);
  G.sprites.add(...sunP, 2.3, ...C.pale, 1.5, 12, 6);
  for (let i = 0; i < 70; i++) { const s = MW.local.stars[i]; if (s.r > 90) continue; const q = lpos(i); G.sprites.add(q[0], q[1], q[2], 1.5, ...mixc(s.col, C.cream, 0.4), 0.7 + 0.4 * Math.min(1.5, s.b), 5); }
  const cam = p.cam || { target: [lerp(sunP[0], b[0], 0.3), 0, lerp(sunP[2], b[2], 0.3)], dist: Math.pow(10, -1.72 + 0.05 * (t - shot.t0)), el: 0.44, az: 3.2 + (t - shot.t0) * 0.03, fov: 30 };
  const L = localCloud(); L.mat.uniforms.gain.value = 1; L.mesh.visible = true; L.mat.uniforms.refDist.value = 0.08; L.mat.uniforms.tint.value.set(1, 1, 1); setCommon(L.mat, e.S, [0, 0]);
  renderGalaxy(ctx, { cam, off: [0, 0], stars: 0.35, glow: 0, bulge: 0, sky: true, skyExp: 0.6, refDist: 0.15 });
  L.mesh.visible = false;
}

export default {
  async init(ctx) { await initCore(ctx); localCloud(); },
  draw(ctx, shot, t, lt, p) {
    if (p.mode === 'eight') return graph_flash.draw(ctx, shot, t, lt, p);
    const e = ctx.engine, A = ctx.audio;
    if (p.mode === 'first_line') return firstLine(ctx, shot, t, p);
    const S = p.shouts || shoutTimes(A, 'Post-Chorus 1', [73.03, 73.67, 74.28, 74.98, 75.59, 76.24, 78.18, 78.82, 79.39, 80.1, 80.73, 81.35]);
    const tFlash = p.tFlash ?? S[11];
    const [s0, s1] = p.smoke || [S[11] + 0.2, 82.64];
    const cam = p.cam || camAt(t, S, p.phase || 'auto');
    const lgD = Math.log10(cam.dist);
    G.sprites.reset(); G.lines.reset();
    // ---- near phase: the Sun's neighbourhood; Earth's links one set per shout
    const nearK = 1 - smooth(range(lgD, -1.0, -0.35));          // near-star sprites fade as they fall into one point
    const LL = MW.local;
    if (nearK > 0.002) {
      const litAt = new Map([[-1, S[0]]]);
      for (const l of LL.links) if (!litAt.has(l.b)) litAt.set(l.b, S[l.set]);
      for (const l of LL.links) {
        const ts = S[l.set]; if (t < ts) continue;
        const f = easeOutCubic(range(t, ts, ts + 0.22));
        const hot = ad(t, ts, 0.02, 0.5);
        const a = lpos(l.a), b = lpos(l.b);
        G.lines.add(a[0], a[1], a[2], b[0], b[1], b[2], 2.4, C.gold[0], C.gold[1], C.gold[2], (0.85 + 1.8 * hot) * nearK, f, 1, 1);
        if (f < 1) { const x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f), z = lerp(a[2], b[2], f); G.sprites.add(x, y, z, 1.8, ...C.goldHot, 3 * nearK, 12); }
      }
      // the near stars themselves: candidates glow cream; the lit ones turn gold
      for (let i = 0; i < 70; i++) {
        const s = LL.stars[i]; if (s.r > 90) continue;
        const ta = litAt.get(i); const lit = ta !== undefined && t >= ta + 0.15;
        const pop = ta !== undefined ? ad(t, ta + 0.15, 0.03, 0.5) : 0;
        const q = lpos(i);
        const col = lit ? mixc(C.gold, C.goldHot, pop) : mixc(s.col, C.cream, 0.4);
        G.sprites.add(q[0], q[1], q[2], lit ? 2.0 : 1.5, col[0], col[1], col[2], (lit ? 1.3 + 2 * pop : 0.8 + 0.5 * Math.min(1.5, s.b)) * nearK, lit ? 10 + 8 * pop : 5, lit ? 5 * pop : 0);
      }
    }
    // Earth: the first node (pale blue), a ring on its first shout
    const e0 = ad(t, S[0], 0.02, 0.6);
    const sunP = lpos(-1);
    G.sprites.add(sunP[0], sunP[1], sunP[2], 2.3, C.pale[0], C.pale[1], C.pale[2], (t >= S[0] - 0.05 ? 1.6 + 2.5 * e0 : 0.5), 12 + 10 * e0, 6 + 14 * e0);
    // ---- arm and galaxy phase: the dim web spreads from Earth; the counted links blaze over it
    const flash = ad(t, tFlash, 0.03, 0.9);
    const prog = lerp(0, 0.62, smooth(range(t, S[6] - 0.1, S[10] + 0.4))) + (t >= tFlash ? 1.2 * easeOutCubic(range(t, tFlash, tFlash + 0.25)) : 0);
    const farK = smooth(range(lgD, -0.2, 0.5));
    if (farK > 0.002) {
      const R = MW.graph.reveal;
      drawWeb({
        link: (ed) => { const f = clamp((prog - ed.r0) / Math.max(1e-3, ed.r1 - ed.r0)); return f > 0 ? { I: (0.24 + 1.4 * flash) * farK, f, col: mixc(C.gold, C.goldHot, flash * 0.6) } : null; },
        node: (i) => { if (i === 0) return null; const on = smooth(range(prog, R[i] - 0.01, R[i] + 0.03)); return on > 0 ? { I: (0.9 + 1.8 * flash) * on * farK, r: 1.7, halo: 8 + 10 * flash } : null; },
      });
      // the counted sets: 1, 1, 2 links of the web (the Orion Arm), then 3 and 5 hub links (half the galaxy)
      const order = MW.graph.edges.map((ed, k) => k).sort((a, b) => MW.graph.edges[a].r0 - MW.graph.edges[b].r0 || MW.graph.edges[a].d - MW.graph.edges[b].d);
      const sets = [[6, 1, 'web'], [7, 1, 'web'], [8, 2, 'web'], [9, 3, 'hub'], [10, 5, 'hub']];
      let iw = 0, ih = 0;
      for (const [si, m, kind] of sets) {
        for (let j = 0; j < m; j++) {
          const ed = kind === 'web' ? MW.graph.edges[order[iw++]] : MW.hubs.edges[MW.hubs.order[ih++]];
          const ts = S[si]; if (t < ts) continue;
          const f = easeOutCubic(range(t, ts, ts + (kind === 'web' ? 0.2 : 0.3)));
          const hot = ad(t, ts, 0.02, 0.55);
          drawLink(ed.a, ed.b, f, (1.1 + 2.0 * hot + 0.8 * flash) * farK, C.goldHot, kind === 'web' ? 2.4 : 2.8, 3 * hot);
          const wb = MW.worlds[ed.b]; const B = W3(wb.x, wb.y, wb.h);
          if (f >= 1) G.sprites.add(B[0], B[1], B[2], 2.0, ...C.goldHot, (1.4 + 2 * ad(t, ts + 0.25, 0.02, 0.4)) * farK, 12, 0);
        }
      }
    }
    const L = localCloud();
    const lg = nearK * (p.stars ?? 1);
    L.mat.uniforms.gain.value = lg; L.mesh.visible = lg > 0.002;
    L.mat.uniforms.refDist.value = 0.08; L.mat.uniforms.sizeK.value = 1.0; L.mat.uniforms.tint.value.set(1, 1, 1);
    setCommon(L.mat, e.S, [p.off ? p.off[0] : 0, p.off ? -p.off[1] : 0]);
    renderGalaxy(ctx, { cam, off: p.off || [0, 0], stars: (p.stars ?? 1) * (0.35 + 0.65 * farK), glow: (p.glow ?? 0.32) * smooth(range(lgD, 0.2, 0.9)) * (1 + 0.5 * flash),
      bulge: smooth(range(lgD, 0.4, 1.0)) * 0.8, sky: true, skyExp: 0.6, refDist: lerp(0.15, 40, farK) });
    L.mesh.visible = false;   // the shared galaxy scene draws it only here
    // ---- the smoke
    const k = smooth(range(t, s0, s1));
    smoke(e, k, t, p.smokeCol || [0.62, 0.59, 0.54], A.snare ? A.snare(t, 0.1) : 0);
  },
};
