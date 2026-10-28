// T2_CHESS_PAINT: a straight-alpha paint-over image laid over the frame (a multi layer over a plate), in design px.
// For a generated plate whose chess clock disagrees with the procedural board (X213: the clock painted out of the far edge and the
// procedural clock drawn on White's right, tools/t2/chess_x213_clock.py builds the image). The plate must be locked off over the
// frames shown (X213: 0 px motion), or the image would need tracking.
// p: {img (path served by the renderer, 1920x1080 RGBA), alpha (1), over (from multi)}
const cache = new Map();
function load(url) {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(`t2_chess_paint: ${url}`)); im.src = url; }));
  return cache.get(url);
}

export default {
  async prepare(ctx, shot, t, lt, p) { ctx.state.t2paint = { img: await load(p.img), alpha: p.alpha ?? 1 }; },
  draw(ctx) {
    const e = ctx.engine, P = ctx.state.t2paint; if (!P) return;
    const c = e.c2dBegin();
    c.globalAlpha = P.alpha;
    c.drawImage(P.img, 0, 0, 1920, 1080);
    e.blit2d('over', 1);
  },
};
