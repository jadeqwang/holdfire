// placeholder for look-dev
import { initCore, renderGalaxy, G } from './core.js';
export default {
  async init(ctx) { await initCore(ctx); },
  draw(ctx, shot, t, lt, p) {
    G.sprites.reset(); G.lines.reset();
    renderGalaxy(ctx, { cam: { dist: p.dist ?? 42, az: p.az ?? 0, el: p.el ?? 0.6, fov: 30 }, stars: p.stars ?? 1, glow: p.glow ?? 1, bulge: p.bulge ?? 1 });
  },
};
