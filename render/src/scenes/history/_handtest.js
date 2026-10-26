import { handSide, clasp, handTop } from './hands.js';
import { P } from '../../palette.js';
export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, c = e.c2dBegin();
    c.fillStyle = 'rgb(5,7,13)'; c.fillRect(0, 0, 1920, 1080);
    const st = { col: P.gold, lw: 2.2, fill: 'rgb(5,7,13)' };
    c.save(); c.translate(260, 200); c.scale(1.3, 1.3); handSide(c, { curl: 0 }, st); c.restore();
    c.save(); c.translate(260, 520); c.scale(1.3, 1.3); handSide(c, { curl: 1 }, st); c.restore();
    clasp(c, 1000, 330, 1.2, 1, st);
    clasp(c, 1000, 800, 1.2, 0.3, st);
    c.save(); c.translate(1650, 880); c.scale(1.4, 1.4); handTop(c, { curl: 0.2 }, { ...st, col: P.cream }); c.restore();
    e.blit2d('replace', 1.0);
  },
};
