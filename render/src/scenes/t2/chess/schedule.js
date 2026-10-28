// Ply timing for the bridge (docs/PLAN_TAKE_TWO.md, "Bridge, the game and the submarine"), computed from timing.json so it
// follows the beat list (the tempo drifts). Anchors are word onsets / events; every ply between anchors snaps to the beat grid
// (beats, eighths = beat midpoints, sixteenths = beat quarters).
//
//   startPress  Black (teal-tips Jade) presses the clock, starting White's clock: the last sixteenth of the 16th-note drum fill,
//               one sixteenth before the drums-out beat. (A press has to precede White's first move; the plan puts both at
//               2:23.58, so the press takes the fill's last hit and 1.e4 takes the drums-out beat.)
//   plies 1-8   1.e4 .. 4...c5    one per eighth from the drums-out beat (2:23.58)
//   plies 9-12  5.a3 .. 6...cxd4  one per beat; a hand hovers over the piece for the full beat before each
//   plies 13-17 7.Qg4 .. 9.Qxg7   speeding up (4, 3, 2 sixteenths) into 9.Qxg7 on "spark"
//   plies 18-26 9...Rg8 .. 13...O-O-O  on eighths; 13...O-O-O on "death"
//   plies 27-36 14.Bg5 .. 18...Rxg2+   one per eighth from the drums returning (2:33.69)
//   plies 37-42 19.Kh1 .. 21...Qg4+    sixteenth-note flurry; 21...Qg4+ on "hand"
//   presses     the hand that moved the piece then presses its own side of the clock (one hand does both; the clock is on White's
//               right = Black's left): each press is on the sixteenth grid after its ply lands, an eighth after it when the next
//               ply is a beat away (moves 5-6, the hover beats), never after the opponent's next landing (the flurry: the press and
//               the reply land together). 21...Qg4+ is not pressed: teal-tips Jade keeps her fingers on the queen until both let
//               go, so her clock runs until the stop
//   clocks      1+0 (one minute each, on the chess reviewer's advice: the game is played through in 15 s)
//   stop        clocks stop on "let" of "let go"
// The set (post-chorus 2): pieces slam down on the shouts, 1, 1, 2, 3, 5 of them, and "Counting" lands the other 20 (done by "on").
import { GAME, sqOf } from './pgn.js';

export const TC = 60;   // seconds per side (1+0)

const clean = (w) => (w || '').toLowerCase().replace(/[^a-z0-9']/g, '');

export function buildSchedule(audio) {
  const beats = audio.beats;
  const words = [];
  for (const l of audio.lines) for (const w of l.words) words.push({ w: clean(w.w), t: w.t, section: l.section || '' });
  const word = (w, after, fb) => { const x = words.find((y) => y.w === w && y.t >= after); return x ? x.t : fb; };
  const bi = (t) => { let k = 0; for (let i = 0; i < beats.length; i++) if (Math.abs(beats[i] - t) < Math.abs(beats[k] - t)) k = i; return k; };
  // grid position g in beats (fractional; multiples of 1/4) relative to beat index k -> time
  const G = (k, g) => { const i = k + Math.floor(g), f = g - Math.floor(g); const a = audio.beatT(i), b = audio.beatT(i + 1); return a + (b - a) * f; };

  const drumsOut = audio.event('drums_out', null, 140) ?? 143.595;
  const k0 = bi(drumsOut);                                       // 143.581
  const spark = word('spark', 148, 150.325);
  const death = word('death', 151, 153.037);
  const back = audio.event('impact', /return/i, 150) ?? 153.695;
  const kb = bi(back);                                           // 153.694
  const hand = word('hand', 156, 157.482);
  const letgo = word('let', 157.5, 158.101);

  const T = [];  // [t, grid]
  for (let i = 0; i < 8; i++) T.push([G(k0, i / 2), i ? '8th' : 'beat']);            // 1.e4 .. 4...c5
  for (let i = 0; i < 4; i++) T.push([G(k0, 4 + i), 'beat']);                       // 5.a3 .. 6...cxd4
  T.push([G(k0, 8), 'beat']);                                                       // 7.Qg4
  T.push([G(k0, 9), 'beat']);                                                       // 7...Ne7   (+4 sixteenths)
  T.push([G(k0, 9.75), '16th']);                                                    // 8.bxa5    (+3)
  T.push([G(k0, 10.25), '16th']);                                                   // 8...dxc3  (+2)
  T.push([spark, 'word']);                                                          // 9.Qxg7 on "spark"
  { // 9...Rg8 .. 13.O-O on the eighths after "spark"; 13...O-O-O on "death"
    let g = Math.ceil((spark - audio.beatT(k0)) / 0.3 * 2) / 2; // first eighth after spark (approx, refined below)
    while (G(k0, g) <= spark + 0.08) g += 0.5;
    while (G(k0, g - 0.5) > spark + 0.08) g -= 0.5;
    for (let i = 0; i < 8; i++) T.push([G(k0, g + i / 2), '8th']);
    T.push([death, 'word']);
  }
  for (let i = 0; i < 10; i++) T.push([G(kb, i / 2), i ? '8th' : 'beat']);         // 14.Bg5 .. 18...Rxg2+
  { // the flurry: five sixteenths leading into "hand"
    const kh = bi(hand);
    let gh = Math.round((hand - audio.beatT(kh)) / (audio.beatT(kh + 1) - audio.beatT(kh)) * 4) / 4;
    for (let i = 5; i >= 1; i--) T.push([G(kh, gh - i / 4), '16th']);
    T.push([hand, 'word']);
  }
  if (T.length !== GAME.plies.length) throw new Error(`schedule has ${T.length} plies`);

  const startPress = G(k0, -0.25);
  // the first sixteenth-grid point at or after t (beat grid: quarters of each beat)
  const grid16 = (t) => {
    let k = bi(t); if (audio.beatT(k) > t) k--;
    const a = audio.beatT(k), b = audio.beatT(k + 1);
    return G(k, Math.ceil((t - a) / (b - a) * 4 - 1e-6) / 4);
  };
  const plies = GAME.plies.map((p, i) => {
    const [t, grid] = T[i];
    const prev = i ? T[i - 1][0] : startPress;
    const gap = t - prev;
    const dur = Math.min(0.34, Math.max(0.085, gap * 0.62));   // travel time: the piece lands at t (its press follows, below)
    const beat = audio.beatT(bi(t) + 1) - audio.beatT(bi(t));
    const hover = (i >= 8 && i < 12) ? beat : 0;                  // moves 5-6: a hand hovers a full beat before the move
    // the press: the same hand goes on to the clock (the sixteenth after landing; an eighth when the reply is a beat away), and
    // never later than the reply lands. The last ply (21...Qg4+) has none: the hand stays on the queen
    let tp = null;
    if (i + 1 < T.length) {
      const next = T[i + 1][0];
      const s16 = beat / 4;
      tp = grid16(t + 0.6 * s16);
      if (next - t > 0.9 * beat) tp = grid16(tp + 0.6 * s16);
      tp = Math.min(tp, next);
    }
    return { ...p, t, grid, gap, t0: t - dur, hover0: hover ? t - hover : t - dur, tp };
  });

  // clocks: 1+0, each side's clock runs only on its own turn: from the opponent's press to its own press
  const presses = [{ t: startPress, side: 'b', label: 'start' }, ...plies.filter((p) => p.tp != null).map((p) => ({ t: p.tp, side: p.side, label: p.label, ply: p.k }))];
  const stop = letgo;
  function clockAt(t) {
    let w = TC, b = TC, running = null, last = null;
    for (let i = 0; i < presses.length; i++) {
      const pr = presses[i];
      if (t < pr.t) break;
      last = pr;
      const next = i + 1 < presses.length ? Math.min(presses[i + 1].t, stop) : stop;
      const run = pr.side === 'w' ? 'b' : 'w';     // pressing your button starts the opponent's clock
      const el = Math.max(0, Math.min(t, next) - pr.t);
      if (run === 'w') w -= el; else b -= el;
      running = t < stop ? run : null;
    }
    return { w, b, running, last, stopped: t >= stop };
  }

  // the set: shouts from timing.json hits (t_attack), squares per shout (1, 1, 2, 3, 5, then 20 on "Counting on you!")
  const shouts = audio.hits.filter((h) => h.t > 138.8 && h.t < 142.0 && /post_chorus/.test(h.kind || '')).map((h) => h.t_attack ?? h.t);
  const cy = audio.hits.find((h) => h.t > 141.9 && h.t < 143 && /counting/.test(h.kind || ''));
  const count = cy ? (cy.t_attack ?? cy.t) : 142.21;
  const on = word('on', count + 0.2, 142.915), you = word('you', count + 0.2, 143.199);
  const S = (n) => sqOf(n);
  const groups = [['e1'], ['e8'], ['d1', 'd8'], ['a1', 'h8', 'h1'], ['a8', 'c1', 'f8', 'f1', 'c8']];
  const set = [];
  groups.forEach((g, i) => g.forEach((n, j) => set.push({ sq: S(n), t: (shouts[i] ?? (139.13 + i * 0.63)) + j * 0.06, shout: i })));
  ['b1', 'g1', 'b8', 'g8'].forEach((n, j) => set.push({ sq: S(n), t: count + j * 0.05, shout: 5 }));
  // both pawn ranks land on "Counting" (interleaved, a2 h7 b2 g7 ...), so the board is whole before the cut on "on" to the plate of
  // the two Jades sitting down at the set board (X213): the plate never shows a position the board has not reached
  const pd = (on - 0.04 - count - 0.26) / 7;
  'abcdefgh'.split('').forEach((f, j) => set.push({ sq: S(f + '2'), t: count + 0.26 + j * pd, shout: 5 }));
  'hgfedcba'.split('').forEach((f, j) => set.push({ sq: S(f + '7'), t: count + 0.26 + (j + 0.5) * pd, shout: 5 }));
  const setBySq = new Map(set.map((x) => [x.sq, x]));

  return { plies, presses, TC, startPress, stop, clockAt, set, setBySq, setEnd: you, anchors: { drumsOut: audio.beatT(k0), spark, death, back: audio.beatT(kb), hand, letgo, chain: word('chain', 153.5, 154.15), count, shouts } };
}

// index of the last ply that has landed at time t (-1 before 1.e4)
export function plyIndexAt(S, t) {
  let k = -1;
  for (let i = 0; i < S.plies.length; i++) if (S.plies[i].t <= t) k = i; else break;
  return k;
}
