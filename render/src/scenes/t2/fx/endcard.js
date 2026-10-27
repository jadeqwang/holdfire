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

// Jade's wording (docs/take2/REVIEW_NOTES.md, "End card"; modelled on rewind-take-two's tools/sectionF/edl.py CREDIT / CREDIT_R).
// A credit is a list of rows; a row is a list of [text, style] segments (style: 'title' italic book face, 'line', 'dim', 'small').
// SONG sits above the title, one credit per beat after the final hit; MODELS sits below the rule, one row per sixteenth.
const SONG = [
  [[['Hold Fire', 'title'], ['  ·  from the album ', 'line'], ['Rare Earth', 'title']]],
  [[['Lyrics \u201cby\u201d Jade Wang', 'line']]],
  [[['assembled by Opus 5.5 from a corpus of four books', 'dim']], [['of poetry written by Jade Wang:', 'dim']],
    [['Inference', 'ititle'], [', ', 'dim'], ['Petrov Test', 'ititle'], [', ', 'dim'], ['Tao of Totality', 'ititle'], [' (the Spaces Left Blank trilogy)', 'dim']],
    [['and ', 'dim'], ['Variations and Metamorphosis', 'ititle']]],
];
const SMALL = ['Fischer\u2013Tal · Leipzig 1960 · \u00bd\u2013\u00bd   ·   fonts under the SIL Open Font License', 'near-miss sources: National Security Archive, Union of Concerned Scientists,', 'Chatham House, Atomic Heritage Fdn., Arms Control Assn., NPR, CNN, Bloomberg'];   // 850 px at 22 px: fits the 864 px safe width unscaled
// rows of names joined with " · ", wrapped to the safe width
function nameRows(ty, names, st, maxW) {
  const rows = []; let cur = [];
  for (const n of names) {
    const test = [...cur, n].join('  ·  ');
    if (cur.length && ty.measure(test, st) > maxW) { rows.push(cur.join('  ·  ')); cur = [n]; } else cur.push(n);
  }
  if (cur.length) rows.push(cur.join('  ·  '));
  return rows;
}
// credits.json (tools/t2/credits.py): the models that made the cut, read at render time
let creditsP = null;
const creditsJSON = () => (creditsP = creditsP || fetch('data/t2/credits.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
export function credits(p = {}, cj = null) {
  if (p.credits) return p.credits;
  const img = (p.images || []).map((x) => x.credit);
  return { song: SONG, animated: (cj && cj.animated_by) || 'Opus 5.5', cast: (cj && cj.cast) || [], support: (cj && cj.support) || [], images: img };
}

let dimMat = null;
function times(ctx, shot, p) {
  const hitT = p.hitT ?? shot.t0;
  const endT = p.endT ?? ctx.audio.duration ?? shot.t1;
  // the beats after the hit carry the song credit (the title lands alone on the hit); everything but the eye is gone by the end
  const B = (ctx.audio.beats || []).filter((b) => b > hitT + 0.05);
  const bp = B.length > 1 ? B[1] - B[0] : 0.64;
  const beats = [0, 1, 2].map((i) => B[i] ?? hitT + (i + 1) * bp);
  // RC2 (QA_RC1 #2): the card must stand complete for >= 2.5 s before it dissolves, and the hit and the loop frame (the file's end)
  // stay put, so the time comes from the card's own cascade: every credit arrives with the title, staggered by 1/64 notes over the
  // hit's first sixteenth (all in by hitT + 0.21 s), and the dissolve back to the opening frame is 0.24 s (credits) inside the
  // last 0.33 s (the eye is back at full strength 0.06 s before the end): the card stands complete 4:04.26-4:06.83
  // (2.57 s). p.cascade: 'beats' restores the old one-per-beat arrival.
  if (p.cascade === 'beats') return { hitT, endT, cIn: beats[0], cOut: Math.max(beats[2] + 0.7, endT - 0.42), beats, s16: bp / 4, fade: 0.3, legacy: true };
  const s64 = bp / 16;
  const arr = [0, 1, 2].map((i) => hitT + 0.03 + i * s64);
  return { hitT, endT, cIn: arr[0], cOut: endT - 0.33, beats: arr, s16: s64 * 0.35, fade: 0.24, dimIn: 0.15 };
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    ctx.state.t2end = p.under ? await pickFirst(ctx, shot, t, lt, [p.under], false).catch(() => null) : null;
    ctx.state.t2credits = await creditsJSON();
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const T = times(ctx, shot, p);
    const U = ctx.state.t2end;
    e.clear(e.rtScene, 0, 0, 0);
    if (U) {
      Object.assign(ctx.state, U.st); U.sc.draw(ctx, shot, t, lt, U.lp);
      // dim it under the card, then give it back at full strength for the loop
      const k = smooth(range(t, T.hitT - 0.02, T.hitT + (T.dimIn ?? 0.25))) * (1 - smooth(range(t, T.cOut, T.endT - (T.legacy ? 0.08 : 0.06))));
      const g = lerp(1, p.dim ?? 0.28, k);
      if (!dimMat) dimMat = e.shader('uniform sampler2D tSrc; uniform float g; void main(){ fragColor = vec4(texture(tSrc, vUv).rgb * g, 1.); }', { tSrc: { value: null }, g: { value: 1 } });
      const tmp = rt(e, 'endcardTmp'); copy(e, e.rtScene.texture, tmp);
      dimMat.uniforms.tSrc.value = tmp.texture; dimMat.uniforms.g.value = g; e.pass(dimMat, e.rtScene);
    }
    // a thin gold rule that draws out under the title with the credits
    const c = e.c2dBegin();
    const ra = (T.legacy ? smooth(range(t, T.cIn - 0.2, T.cIn + 0.5)) : smooth(range(t, T.hitT, T.hitT + 0.2))) * (1 - smooth(range(t, T.cOut - (T.legacy ? 0.1 : 0), T.cOut + (T.legacy ? 0.25 : T.fade))));
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
      // p.titleLoop: frame 0 carries the title too, so it holds to the last frame (the loop); else it fades out for the opening's fade-in
      const out = p.titleLoop ? 1 : 1 - smooth(range(t, T.endT - 0.5, T.endT - 0.05));
      const col = [lerp(P.cream[0], 1, hot), lerp(P.cream[1], 0.94, hot), lerp(P.cream[2], 0.78, hot)];
      const sc = lerp(1.15, 1, easeOutExpo(k));
      // set exactly as the opening title (the edit's hero layout): two words, fitted inside the centred 4:5 area (864 px)
      const sp = ty.measure(' ', TITLE) * 0.9, wH = ty.measure('HOLD', TITLE), wF = ty.measure('FIRE', TITLE);
      const fit = Math.min(1, 864 / (wH + sp + wF)), st = { ...TITLE, size: TITLE.size * fit };
      const x0 = 960 - (wH + sp + wF) * fit / 2;
      const cx = ty.ctx; cx.save(); cx.translate(960, 538); cx.scale(sc, sc); cx.translate(-960, -538);
      ty.text('HOLD', x0, 590, { ...st, color: col, alpha: k * out, glow: 10, shade: 0.55 });
      ty.text('FIRE', x0 + (wH + sp) * fit, 590, { ...st, color: col, alpha: k * out, glow: 10, shade: 0.55 });
      cx.restore();
    }
    const C = credits(p, ctx.state.t2credits);
    const a = smooth(range(t, T.cIn - 0.03, T.cIn + (T.legacy ? 0.2 : 0.1))) * (1 - smooth(range(t, T.cOut, T.cOut + T.fade)));
    if (a <= 0) return;
    // sizes for a 540p phone: nothing under 22 design px (11 px on the phone), the main lines 30-40
    const STY = {
      title: { font: 'CormorantI', weight: 600, size: 44, color: P.cream },
      line: { font: 'OpenSans', weight: 600, size: 32, color: P.cream },
      dim: { font: 'OpenSans', weight: 500, size: 25, color: [0.86, 0.82, 0.74] },
      ititle: { font: 'CormorantI', weight: 600, size: 32, color: P.cream },
      key: { font: 'OpenSans', weight: 700, size: 32, color: P.cream },          // polish 4: the model lines read on a phone (were 26/27/23)
      name: { font: 'OpenSans', weight: 600, size: 34, color: P.goldPale },
      support: { font: 'OpenSans', weight: 500, size: 28, color: P.bookGold },
      small: { font: 'OpenSans', weight: 500, size: 22, color: P.bookGold },
    };
    const W = 864;   // the centred 4:5 safe area
    const row = (segs, y, al) => {
      const ws = segs.map(([s, k]) => ty.measure(s, STY[k]));
      const tot = ws.reduce((s, w) => s + w, 0);
      const f = Math.min(1, W / tot);
      let x = 960 - (tot * f) / 2;
      segs.forEach(([s, k], i) => { const st = { ...STY[k], size: STY[k].size * f }; ty.text(s, x, y, { ...st, alpha: al, shade: 0.75 }); x += ws[i] * f; });
    };
    const ain = (t0) => a * smooth(range(t, t0 - 0.03, t0 + (T.legacy ? 0.16 : 0.1)));
    // SONG: above the title, one credit per beat after the hit
    let y = 170;
    C.song.forEach((cr, i) => {
      const al = ain(T.beats[i]);
      cr.forEach((segs, r) => { if (al > 0) row(segs, y, al); y += r + 1 < cr.length ? 40 : 62; });
    });
    // MODELS: below the rule, one row per 32nd from the first beat (polish 4: all in by ~0.7 s, so the last line is not still
    // fading in while the card is read)
    const lines = [[['Music by Jade Wang and Suno', 'line']], null, [[`Animated by ${C.animated}`, 'key']], [['and a supporting cast of models:', 'dim']]];
    nameRows(ty, C.cast, STY.name, W).forEach((s) => lines.push([[s, 'name']]));
    nameRows(ty, C.support, STY.support, W).forEach((s) => lines.push([[s, 'support']]));
    C.images.forEach((s) => lines.push([[s, 'support']]));
    y = 692; let k = 0;
    lines.forEach((segs) => {
      if (!segs) { y += 10; return; }
      const al = ain(T.cIn + T.s16 * 0.5 * (1 + k++));
      if (al > 0) row(segs, y, al);
      y += 40;
    });
    const asm = ain(T.beats[2]);
    if (asm > 0) SMALL.forEach((x, i) => row([[x, 'small']], Math.min(Math.max(y + 12, 990), 994) + i * 27, asm * 0.9));   // the last small line stays inside the frame
  },
};
