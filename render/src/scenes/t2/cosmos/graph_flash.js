// t2_graph_flash (0:11.16-0:13.05): "eight" — the contact graph over the Milky Way, eight long links lighting at once;
// then (from the last whisper, 0:11.51) all its light gathers into one point at frame centre while the camera pulls back,
// and the point settles as a single bright pale-blue dot at p.dot on black: the catchlight the edit composites the eye
// plate around.
//
// p (all optional): tEight (11.165, hit "eight"), tGather [t0, t1] (11.5, 12.3), tDot (12.75: the dot reaches p.dot),
//   dot [x, y] (960, 540), dotR (5: core radius, design px), dotI (2.6), centre [x, y] (960, 540: where the light gathers),
//   cam, off, swirl (1.6 rad), links (8)
import { initCore, renderGalaxy, G, project, W3 } from './core.js';
import { MW } from './mw.js';
import { drawWeb, drawLink } from './web.js';
import { C, mixc, ad, env, drawDot } from './common.js';
import { clamp, lerp, smooth, smoother, range, easeInOutCubic, easeOutCubic, easeInCubic } from '../../../util.js';

export default {
  async init(ctx) { await initCore(ctx); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    const t8 = p.tEight ?? (((A.hits || []).find((h) => h.kind === 'intro_whisper' && /eight/i.test(h.word) && h.t > 10) || {}).t ?? 11.165);
    const [g0, g1] = p.tGather || [11.5, 12.3];
    const tDot = p.tDot ?? 12.75;
    const centre = p.centre || [960, 540], dot = p.dot || [960, 540];
    const g = smoother(range(t, g0, g1));                 // 0..1: the light gathering
    const fade = smooth(range(t, g0 + 0.1, g1 - 0.15));    // the parts that don't gather (disk glow, bulge, sky) fade
    const out = 1 - smooth(range(t, g1 - 0.3, g1 + 0.05));   // what has gathered hands its light to the point
    G.sprites.reset(); G.lines.reset();
    // the web: present, quiet; the eight links blaze up together on "eight"
    const nL = p.links ?? 8, H = MW.hubs, eight = H.order.slice(0, nL).map((k) => H.edges[k]);
    const k8 = easeOutCubic(range(t, t8, t8 + 0.16));
    const hot = ad(t, t8, 0.03, 0.35);
    const touched = new Set(); for (const h of eight) { touched.add(h.a); touched.add(h.b); }
    drawWeb({
      link: () => ({ I: (0.2 + 0.1 * hot) * out, col: C.gold }),
      node: (i) => (i === 0 ? { I: (1.6 + 1.5 * hot) * out, col: C.pale, r: 2.2, halo: 12, ring: 7 } : { I: (touched.has(i) ? 1.2 + 2.0 * hot * k8 : 0.85) * out, r: touched.has(i) ? 2.0 : 1.7, halo: 9 }),
    });
    for (const h of eight) drawLink(h.a, h.b, k8, (1.0 + 2.2 * hot) * (t >= t8 ? 1 : 0) * out, C.goldHot, 2.6, 3.0 * hot);
    // camera: a quiet hold that eases back as the light gathers
    const pull = easeInOutCubic(range(t, g0 - 0.1, g1 + 0.3));
    const cam = p.cam || { target: [-0.6, 0, -2.6], dist: lerp(30, 44, pull), az: 3.62 + (t - 11) * 0.03 + 0.5 * pull, el: lerp(0.66, 0.9, pull), fov: 30 };
    renderGalaxy(ctx, {
      cam, off: p.off || [0, 30], sky: p.sky ?? true, skyExp: 0.6 * (1 - fade),
      stars: (p.stars ?? 1) * (1 - 0.35 * g) * out, glow: (p.glow ?? 0.32) * (1 - fade), bulge: (p.bulge ?? 0.8) * (1 - fade),
      gather: g > 0 ? [centre[0], centre[1], g, p.swirl ?? 1.6] : null, gatherS: 0.6,
    });
    // the point: the gathered light, then the catchlight easing to p.dot
    const m = easeInOutCubic(range(t, g1 - 0.05, tDot));
    const x = lerp(centre[0], dot[0], m), y = lerp(centre[1], dot[1], m);
    const big = smooth(range(t, g0 + 0.15, g1)) * (1 - m);
    const r = lerp(p.dotR ?? 5, 8.5, big);
    const I = (p.dotI ?? 2.4) * smooth(range(t, g0, g0 + 0.5)) * (1 + 0.8 * big);
    drawDot(e, x, y, r, I, mixc(C.pale, C.paleHot, 0.25 * big), 5);
  },
};
