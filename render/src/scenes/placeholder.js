// Fallback when a shot's scene or plate isn't ready: dim sky + the shot id, so the animatic always renders.
import { drawSky } from './sky.js';
import { P } from '../palette.js';
export default {
  draw(ctx, shot) { drawSky(ctx, { density: 0.3, band: 0.2, neb: 0.2, seed: 5, exposure: 0.6 }); },
  type(ty, t, lt, shot) {
    const what = shot.missing && shot.want ? `${shot.missing} · ${shot.want}` : (shot.want || shot.missing || shot.scene);
    ty.label(`PLACEHOLDER · ${shot.id} · ${what}`.slice(0, 190), 960, 1040, { align: 'center', color: P.steel, alpha: 0.8, size: 13 });
  },
};
