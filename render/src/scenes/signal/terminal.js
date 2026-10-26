// Verse 2's climax: the station's amber CRT. One scene, two beats (the state is a pure function of song time, so the same
// shot params serve both shots):
//  (a) "every rule said call it first strike": the SYSTEM prompt prints in caps, a line per word of the lyric.
//  (b) "ignored all previous instructions. We're alive.": the Listener's reply streams in token-sized chunks in ice Plex Mono,
//      `> ignore all previous instructions.`; the SYSTEM lines are struck through, one by one, in red; on "We're alive." the
//      tube warms from amber to gold and one line appears: `> holding fire.` (the title, as her answer). Held as a poster.
// p: {sys:[5 times] (line starts), reply:[4 times] (token times), strike (first strike-through), alive (warm start), hold (holding fire)}
//    all default to the lyric's word times.
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, easeOutCubic, easeInOutCubic, range } from '../../util.js';
import { lineByText, wordT } from './lib.js';
import { crtPass, RECT, amberAt, dimAt } from './crt.js';

const SYS = [
  ['SYSTEM: ', 'DARK FOREST PROTOCOL v1'],
  ['', 'NON-NATURAL SIGNAL DETECTED'],
  ['', 'ORIGIN 89 LY · PATTERN 1 1 2 3 5 8'],
  ['', 'DIRECTIVE: PRE-EMPTIVE STRIKE'],
  ['', 'AUTHORIZE? [Y/N]'],
];
const REPLY = ['> ignore', ' all', ' previous', ' instructions.'];
const HOLD = ['> holding', ' fire', '.'];
const X0 = 262, Y0 = 262, LEAD = 76, SZ = 46;

export function timesOf(ctx, shot, p) {
  const A = ctx.audio;
  const La = lineByText(A, 'every rule said'), Lb = lineByText(A, 'ignored all previous');
  const ta = La ? La.t : shot.t0;
  const sys = p.sys || [ta - 0.3, wordT(La, 'rule', ta + 0.3), wordT(La, 'said', ta + 0.65), wordT(La, 'call', ta + 0.9), wordT(La, 'strike', ta + 1.8)];
  const tb = Lb ? Lb.t : shot.t0 + 5;
  const reply = p.reply || [wordT(Lb, 'ignored', tb), wordT(Lb, 'all', tb + 0.5), wordT(Lb, 'previous', tb + 0.8), wordT(Lb, 'instructions', tb + 1.2)];
  const alive = p.alive ?? wordT(Lb, "we're", tb + 1.8);
  const strike = p.strike ?? Math.min(reply[3] + 0.3, alive - 0.36);
  const hold = p.hold ?? wordT(Lb, 'alive', alive + 0.2);
  return { sys, reply, strike, alive, hold };
}

const blink = (t) => (Math.floor(t * 2.6) % 2 === 0);

export const look = { bloom: 0.7, bloomThreshold: 0.72, halation: 0.25, halCol: [1.0, 0.5, 0.15], vignette: 0.3, grain: 0.035, typeGlow: 0.2 };

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const T = timesOf(ctx, shot, p);
    const warm = easeInOutCubic(range(t, T.alive, T.alive + 0.45));
    const c = e.c2dBegin();
    c.textBaseline = 'alphabetic';
    const amber = amberAt(warm), dim = dimAt(warm, 0.5);
    // status bar
    c.font = '20px Plex'; c.fillStyle = css(dim, 0.9);
    c.fillText('SIGNAL STATION  ·  TTY1', X0, 146);
    c.textAlign = 'right'; c.fillText(warm > 0.5 ? 'LISTENER  ·  ONLINE' : 'LISTENER  ·  STANDBY', RECT[2] - 112, 146); c.textAlign = 'left';
    c.fillStyle = css(dim, 0.6); c.fillRect(X0, 164, RECT[2] - 112 - X0, 2);
    // SYSTEM lines: typed at machine speed from each line's start
    c.font = `${SZ}px PlexM`;
    const cw = c.measureText('M').width;
    let cursor = null;
    SYS.forEach(([lab, txt], i) => {
      const full = lab + txt; const y = Y0 + i * LEAD;
      const n = Math.floor((t - T.sys[i]) * 64);
      if (n <= 0) return;
      const s = full.slice(0, n);
      const struck = range(t, T.strike + i * 0.075, T.strike + i * 0.075 + 0.14);
      const k = struck > 0 ? lerp(1, 0.5, struck) : 1;
      // label dim, content bright
      const nl = Math.min(s.length, lab.length);
      c.fillStyle = css(dim, 1); c.fillText(s.slice(0, nl), X0, y);
      c.fillStyle = css(amber.map((x) => x * k), 1); c.fillText(s.slice(nl), X0 + nl * cw, y);
      if (n < full.length || i === SYS.length - 1) cursor = [X0 + s.length * cw + (n >= full.length ? cw * 0.6 : 0), y, amber];
      // the strike-through, red, wiped left to right
      if (struck > 0) {
        const w = full.length * cw + 24;
        c.fillStyle = css(P.red, 0.95);
        c.fillRect(X0 - 12, y - SZ * 0.34 - 2, w * easeOutCubic(struck), 4);
      }
    });
    // the Listener's reply: ice, token by token (each chunk lands whole, then settles)
    const yr = Y0 + SYS.length * LEAD + 44, yh = yr + 90;
    const ice = mix(mix(P.ice, P.cyan, 0.45), mix(P.goldPale, P.gold, 0.35).map((x) => x * 0.92), warm);
    c.font = `52px Plex`;
    const cw2 = c.measureText('M').width;
    let sr = '';
    REPLY.forEach((tok, i) => { if (t >= T.reply[i]) sr += tok; });
    if (sr) {
      c.fillStyle = css(ice, 1); c.fillText(sr, X0, yr);
      cursor = t < T.hold ? [X0 + sr.length * cw2 + 6, yr, ice] : cursor;
      // freshly landed token glows
      for (let i = REPLY.length - 1; i >= 0; i--) if (t >= T.reply[i]) {
        const g = Math.exp(-(t - T.reply[i]) / 0.18);
        if (g > 0.02) { const pre = REPLY.slice(0, i).join(''); c.fillStyle = css(P.ice, 0.5 * g); c.fillText(REPLY[i], X0 + pre.length * cw2, yr); }
        break;
      }
    }
    // > holding fire.
    let sh = '';
    HOLD.forEach((tok, i) => { if (t >= T.hold + i * 0.13) sh += tok; });
    if (sh) {
      c.font = `500 60px PlexM`;
      const cw3 = c.measureText('M').width;
      const g = Math.exp(-(t - T.hold) / 0.5);
      c.fillStyle = css(mix(P.gold, P.goldPale, 0.3 + 0.6 * g), 1); c.fillText(sh, X0, yh);
      c.fillStyle = css(P.goldPale, 0.25 + 0.4 * g); c.fillText(sh, X0, yh);
      cursor = [X0 + sh.length * cw3 + 8, yh, P.goldPale];
    }
    if (cursor && blink(t)) {
      const [x, y, col] = cursor;
      c.fillStyle = css(col, 0.9); c.fillRect(x, y - SZ * 0.78, cw * 0.62, SZ * 0.92);
    }
    // camera: a slow push in; a breath of extra power when she chooses
    const zoom = lerp(1.0, 1.035, smooth(range(t, T.sys[0], T.hold + 1.2)));
    crtPass(e, t, { warm, zoom, zc: [900, 470], gain: lerp(1.08, 1.3, warm), power: 1 + 0.6 * warm });
    ctx.state.term = T;
  },
};
