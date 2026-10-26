// t2_graph_outro (3:33.04-3:44.33): "Six hundred worlds across the Milky Way, / every one could've burned. Every one held
// its fire." The Rare Earth finale image: the contact graph of 610 worlds (fiction) over the Milky Way, pure light on black,
// a slow orbit. The links grow out from Earth through the first line; on "every one could've burned" each world flickers
// red once (its own near-miss), staggered across the disk, then holds gold; on "Every one held its fire" a gold wave runs
// out from Earth. The near-silences between phrases stay calm (nothing fires there).
//
// p (all optional; times default to the lyric in timing.json):
//   tSix (213.04), reveal [t0, t1] (links grow from Earth; false = complete from the start), flicker [t0, t1] (218.87-220.6),
//   wave [t0, t1] ("Every" 221.52 - "fire" 223.94), cam {target, dist, az, el, fov} (overrides the orbit), off [x, y],
//   stars (1), glow (0.3), linkI (0.34), sky (true: faint deep field; false: black), over
import { initCore, renderGalaxy, G } from './core.js';
import { MW } from './mw.js';
import { drawWeb } from './web.js';
import { C, mixc, wordT, lineT, ad, pick } from './common.js';
import { clamp, lerp, smooth, range, hash1 } from '../../../util.js';

export function outroTimes(A, p = {}) {
  const six = pick(p.tSix, lineT(A, 'Six hundred worlds', 213.04));
  const every = wordT(A, "could've burned", 'every', 218.87);
  const burned = wordT(A, "could've burned", 'burned', 219.84);
  const every2 = wordT(A, "could've burned", 'every', 221.52, 1);
  const fire = wordT(A, "could've burned", 'fire', 223.94);
  return {
    six,
    reveal: p.reveal === false ? null : (p.reveal || [six - 0.3, wordT(A, 'Six hundred worlds', 'Milky', 216.7)]),
    flicker: p.flicker || [every - 0.02, burned + 0.75],
    wave: p.wave || [every2 - 0.05, fire + 0.3],
  };
}

export function outroCam(t, six) {
  const u = t - six, k = smooth(range(u, -6, 14));
  return { target: [0, 0, lerp(-0.8, -0.3, k)], dist: lerp(37, 44, k), az: 3.45 + u * 0.017, el: lerp(0.58, 0.74, k), fov: 30 };
}

export default {
  async init(ctx) { await initCore(ctx); },
  draw(ctx, shot, t, lt, p) {
    const T = outroTimes(ctx.audio, p);
    const R = MW.graph.reveal;
    G.sprites.reset(); G.lines.reset();
    const prog = T.reveal ? range(t, T.reveal[0], T.reveal[1]) * 1.04 : 2;
    const [f0, f1] = T.flicker, [w0, w1] = T.wave;
    // each world's own near-miss: a red flicker at a hashed moment (2-3 frames), snapped to nothing: it is a scatter
    const flick = (i) => { const tf = lerp(f0, f1 - 0.25, hash1(i * 7.13 + 2.9)); return t < tf ? 0 : Math.exp(-(t - tf) / 0.07) * (t - tf < 0.03 ? (t - tf) / 0.03 : 1); };
    const wave = (i) => ad(t, w0 + (w1 - w0) * R[i], 0.06, 0.7);
    const linkI = p.linkI ?? 0.34;
    drawWeb({
      link: (e) => {
        const f = clamp((prog - e.r0) / Math.max(1e-3, e.r1 - e.r0)); if (f <= 0) return null;
        const head = f < 1 ? 1 : 0;
        const wv = Math.max(wave(e.a), wave(e.b)), fl = Math.max(flick(e.a), flick(e.b));
        return { I: linkI * (1 + 1.5 * wv + 1.2 * head) * (1 - 0.75 * fl), f, col: mixc(C.gold, C.goldHot, wv * 0.6) };
      },
      node: (i) => {
        const on = T.reveal ? smooth(range(prog, R[i] - 0.01, R[i] + 0.03)) : 1; if (on <= 0) return null;
        const fl = flick(i), wv = wave(i);
        const fresh = T.reveal ? ad(prog, R[i], 0.01, 0.06) : 0;
        if (i === 0) return { I: (1.5 + 0.6 * wv) * on, col: C.pale, r: 2.2, halo: 12, ring: 7.5 };
        return { I: (1.05 + 1.3 * wv + 1.4 * fresh) * on * (1 - 0.9 * fl), col: mixc(C.gold, C.goldHot, wv * 0.5), r: 1.8 + 0.4 * wv, halo: 9 + 9 * wv };
      },
    });
    // the red flickers: a hard red point and a small ring for a few frames, then gold again
    for (let i = 1; i < MW.worlds.length; i++) {
      const fl = flick(i); if (fl < 0.02) continue;
      const w = MW.worlds[i];
      G.sprites.add(w.x, w.h, -w.y, 2.1, C.red[0], C.red[1], C.red[2], 3.0 * fl, 11, 6 * fl + 2.5);
    }
    const cam = p.cam || outroCam(t, T.six);
    renderGalaxy(ctx, { cam, off: p.off || [0, 20], stars: p.stars ?? 1, glow: p.glow ?? 0.3, bulge: p.bulge ?? 0.8, sky: p.sky ?? true, skyExp: 0.55, over: p.over });
  },
};
