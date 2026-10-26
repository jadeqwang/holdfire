// t2_endcard (4:04.05 to the end of the file, 4:07.16): the title lands on the final hit, then the end card, then the frame gives
// itself back to the opening shot so the post loops: the film opens on the extreme close-up of Jade's eye with HOLD FIRE fading
// in on the 0:00.2 sub, and it ends on that same eye with HOLD FIRE in the same place, the credits gone, the eye at the plate's
// first frame and framing (p.under = the opening plate at at: 0, zoom 1).
// Like take one's end card (scenes/endcard.js): the credits wait for the hit, small tracked caps under the title, gold keys.
// The title uses the opening title's type exactly (Archivo 800 expanded, tracked, 150 px, baseline 590), so frame 0 and the
// last frame rhyme. Credits (docs/PLAN_TAKE_TWO.md fact sheet): song, poetry source, video, picture credits (ESA/Hubble when a
// Hubble image is used; NASA imagery is public domain and credited when used), fonts (SIL OFL), the game, the near-miss sources.
// p: {hitT (the final hit), endT (default the file's end), under ({scene, p} drawn dimmed behind the card; see t2_first),
//     dim (0.28: the under layer's brightness while the card is up), images ([{credit}] real images used; default none: every
//     picture in the film is generated or drawn), credits (override the list), title (true)}
import { pickFirst } from './first.js';
import { P, css } from '../../../palette.js';
import { clamp, smooth, range, easeOutCubic, easeOutExpo, lerp } from '../../../util.js';
import { rt, copy } from '../plate/lib.js';

const TITLE = { font: 'Archivo', weight: 800, stretch: '125%', track: 0.14, size: 150 };

export function credits(p = {}) {
  if (p.credits) return p.credits;
  const img = (p.images || []).map((x) => ['PICTURES', x.credit]);
  return [
    ['SONG', '“HOLD FIRE” — JADE WANG WITH CLAUDE · FROM THE ALBUM RARE EARTH'],
    ['WORDS', 'FOUND IN JADE’S POETRY · SPACES LEFT BLANK (TRILOGY) · VARIATIONS AND METAMORPHOSIS'],
    ['VIDEO', 'JADE WANG AND CLAUDE'],
    ...img,
    ['TYPE', 'FONTS UNDER THE SIL OPEN FONT LICENSE'],
    ['GAME', 'FISCHER–TAL · LEIPZIG 1960 · ½–½'],
    ['', 'SOURCES: NATIONAL SECURITY ARCHIVE, UCS, CHATHAM HOUSE, ATOMIC HERITAGE FOUNDATION'],
    ['', 'ECHO AND THE 610 WORLDS ARE FICTIONAL · THE NEAR-MISSES ARE REAL'],
  ];
}

let dimMat = null;
function times(ctx, shot, p) {
  const hitT = p.hitT ?? shot.t0;
  const endT = p.endT ?? ctx.audio.duration ?? shot.t1;
  const cIn = hitT + 0.55;                       // credits after the hit, so it lands alone
  const cOut = Math.max(cIn + 1.4, endT - 0.75);  // everything but the eye has gone before the loop point
  return { hitT, endT, cIn, cOut };
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    ctx.state.t2end = p.under ? await pickFirst(ctx, shot, t, lt, [p.under], false).catch(() => null) : null;
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const T = times(ctx, shot, p);
    const U = ctx.state.t2end;
    e.clear(e.rtScene, 0, 0, 0);
    if (U) {
      Object.assign(ctx.state, U.st); U.sc.draw(ctx, shot, t, lt, U.lp);
      // dim it under the card, then give it back at full strength for the loop
      const k = smooth(range(t, T.hitT - 0.02, T.hitT + 0.25)) * (1 - smooth(range(t, T.cOut, T.endT - 0.12)));
      const g = lerp(1, p.dim ?? 0.28, k);
      if (!dimMat) dimMat = e.shader('uniform sampler2D tSrc; uniform float g; void main(){ fragColor = vec4(texture(tSrc, vUv).rgb * g, 1.); }', { tSrc: { value: null }, g: { value: 1 } });
      const tmp = rt(e, 'endcardTmp'); copy(e, e.rtScene.texture, tmp);
      dimMat.uniforms.tSrc.value = tmp.texture; dimMat.uniforms.g.value = g; e.pass(dimMat, e.rtScene);
    }
    // a thin gold rule that draws out under the title with the credits
    const c = e.c2dBegin();
    const ra = smooth(range(t, T.cIn - 0.2, T.cIn + 0.5)) * (1 - smooth(range(t, T.cOut - 0.2, T.cOut + 0.3)));
    if (ra > 0) {
      const w = 420 * easeOutCubic(ra);
      c.strokeStyle = css(P.gold, 0.8 * ra); c.lineWidth = 2;
      c.beginPath(); c.moveTo(960 - w, 652); c.lineTo(960 + w, 652); c.stroke();
    }
    e.blit2d('add', 1.2);
    ctx.state.t2endT = T;
  },
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p || {}; const T = ctx.state.t2endT; if (!T) return;
    if (p.title !== false) {
      // the title lands on the hit (slam, hot gold to cream) and holds to the loop point, where the opening fades it in again
      const k = clamp((t - T.hitT + 0.02) / 0.12);
      const hot = 1 - easeOutCubic(range(t, T.hitT, T.hitT + 0.4));
      const out = 1 - smooth(range(t, T.endT - 0.5, T.endT - 0.05));
      const col = [lerp(P.cream[0], 1, hot), lerp(P.cream[1], 0.94, hot), lerp(P.cream[2], 0.78, hot)];
      const sc = lerp(1.15, 1, easeOutExpo(k));
      const cx = ty.ctx; cx.save(); cx.translate(960, 538); cx.scale(sc, sc); cx.translate(-960, -538);
      ty.text('HOLD FIRE', 960, 590, { ...TITLE, align: 'center', color: col, alpha: k * out, glow: 10, shade: 0.55 });
      cx.restore();
    }
    const L = credits(p);
    const a = smooth(range(t, T.cIn, T.cIn + 0.45)) * (1 - smooth(range(t, T.cOut, T.cOut + 0.4)));
    if (a <= 0) return;
    // one centred column (the 4:5 crop keeps it): the key in book gold, then the line
    const ST = { font: 'OpenSans', weight: 600, size: 13, track: 0.2 };
    L.forEach(([k, v], i) => {
      const ai = a * smooth(range(t, T.cIn + i * 0.05, T.cIn + 0.35 + i * 0.05));
      const y = 708 + i * 32;
      const wk = k ? ty.measure(k, ST) + 18 : 0, wv = ty.measure(v, ST);
      const x0 = 960 - (wk + wv) / 2;
      if (k) ty.text(k, x0, y, { ...ST, color: P.bookGold, alpha: ai, shade: 0.6 });
      ty.text(v, x0 + wk, y, { ...ST, color: P.cream, alpha: ai * 0.9, shade: 0.6 });
    });
  },
};
