// TAKE ONE edit (moved from src/timeline.js for take two; load with ?tl=take1 / TL=take1).
// THE EDIT. Every shot is placed on word onsets and the tracked bar grid from data/timing.json, so it re-times when the
// timing is refined. Plates resolve through data/picks.json (plate -> {clip, s0, lag}); a missing plate or scene renders as
// a labelled placeholder, so the whole film always renders.
// shot: {id, t0, t1, scene, p (object | fn(t, lt, ctx)), look (post | fn), type (fn(ty, t, lt, shot, ctx)), post (fn)}
import { smooth, range, easeInCubic, easeOutCubic, clamp, lerp } from '../util.js';
import { P } from '../palette.js';
import { PRINT_LOOK } from '../scenes/history/print.js';

// ---------------------------------------------------------------------------------------------------- looks
const LOOK = {
  keeper: { bloom: 0.55, bloomThreshold: 0.85, halation: 0.45, vignette: 0.45, grain: 0.03 },
  listener: { bloom: 0.8, bloomThreshold: 0.7, halation: 0.0, vignette: 0.4, grain: 0.02, streak: 0.25, streakThreshold: 1.2 },
  other: { bloom: 0.7, bloomThreshold: 0.7, halation: 0.1, vignette: 0.4, grain: 0.02 },
  space: { bloom: 0.7, bloomThreshold: 0.8, halation: 0.2, vignette: 0.3, grain: 0.02, streak: 0.3 },
  archival: PRINT_LOOK,   // printed matter seen by lamplight (history/print.js)
  oko: { tonemap: 0, bloom: 0.12, bloomThreshold: 0.6, halation: 0.55, halCol: [1.0, 0.1, 0.05], vignette: 0.4, grain: 0.045, streak: 0, typeGlow: 0.15 },
  diagram: { bloom: 0.6, bloomThreshold: 0.8, halation: 0.15, vignette: 0.25, grain: 0.02 },
};
const ENG = { gain: 1.2, wmax: 5.2, wLo: 0.12, wHi: 1.08, wGam: 1.35, bgW: 0.35, fill: 0.18, edge: 0.45 };
const CON = { starSize: 1.6, linkAlpha: 0.5 };
const STI = { size: 1.6 };

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const picks = A.picks || {};

  // ---- timing helpers
  const LS = (sec) => A.lines.filter((l) => l.section === sec);
  const line = (sec, k) => LS(sec)[k];
  const ls = (sec, k) => line(sec, k).t, le = (sec, k) => line(sec, k).end;
  const W = (sec, k, j) => line(sec, k).words[j].t;
  const S = (name) => A.sections.find((s) => s.name === name);
  const bar = (t) => A.bar(t);
  // count shouts of a post-chorus/drop line: prefer analysis hits, else the line's words
  const shouts = (sec, k) => {
    const L = line(sec, k);
    const hs = A.hits.filter((h) => h.t >= L.t - 0.25 && h.t <= L.end + 0.25);
    return (hs.length ? hs.map((h) => h.t) : L.words.map((w) => w.t));
  };

  // ---- plate helper: scene + clip/s0/lag from picks (placeholder if not picked yet)
  const plate = (name, scene, extra = {}) => {
    const pk = picks[name];
    if (!pk) return { scene: 'placeholder_' + name, p: {} };
    return { scene, p: (t, lt, ctx) => ({ clip: pk.clip, s0: pk.s0 ?? 0, lag: pk.lag || 0, ...(typeof extra === 'function' ? extra(t, lt, ctx) : extra) }) };
  };
  const keeper = (name, extra, t0, t1) => ({ ...plate(name, 'engraved', (t, lt, ctx) => ({ ...ENG, ...(typeof extra === 'function' ? extra(t, lt, ctx) : extra) })), look: LOOK.keeper });
  const listener = (name, extra) => ({ ...plate(name, 'constellation', (t, lt, ctx) => ({ ...CON, ...(typeof extra === 'function' ? extra(t, lt, ctx) : extra) })), look: LOOK.listener });
  const other = (name, extra) => ({ ...plate(name, 'stipple', (t, lt, ctx) => ({ ...STI, ...(typeof extra === 'function' ? extra(t, lt, ctx) : extra) })), look: LOOK.other });
  const archival = (name, extra) => ({ ...plate(name, 'archival', extra || {}), look: LOOK.archival });
  // slow push-in helper for plate params
  const push = (k = 0.008) => (t, lt) => ({ zoom: 1 + lt * k });

  // ---- type helpers (voices): human = Cormorant, AI = Plex stream, hero = Archivo slam
  const verse = (sec, k, o = {}) => (ty, t) => ty.lyric(line(sec, k), t, { font: 'Cormorant', size: 68, weight: 500, color: P.cream, hotColor: P.goldPale, t1: (o.t1 ?? le(sec, k) + 1.0), ...o });
  const hero = (sec, k, o = {}) => (ty, t) => ty.lyric(line(sec, k), t, { mode: 'slam', font: 'Archivo', weight: 800, stretch: '125%', upper: true, size: 118, leading: 0.95, maxW: 1800, color: P.cream, hotColor: P.goldPale, glow: 3, t1: (o.t1 ?? le(sec, k) + 0.8), out: 0.2, ...o });
  const ai = (sec, k, o = {}) => (ty, t) => ty.lyric(line(sec, k), t, { mode: 'stream', font: 'Plex', size: 44, color: P.ice, hotColor: P.cream, spaceK: 1, t1: (o.t1 ?? le(sec, k) + 0.9), ...o });
  const both = (...fs) => (ty, t, lt, shot, ctx) => fs.forEach((f) => f && f(ty, t, lt, shot, ctx));
  const excerpt = (title, lines, x, y, t0, t1, o = {}) => (ty, t) => ty.excerpt(title, lines, x, y, t, t0, t1, o);
  const numeral = (n, t0, t1, o = {}) => (ty, t) => ty.numeral(n, t, t0, t1, { font: 'Archivo', weight: 800, stretch: '125%', size: 620, color: P.gold, glow: 4, out: 0.08, ...o });

  // ================================================================================================= INTRO
  const intro = LS('Intro');
  const counts = [];
  // numerals follow the words actually whispered (count 1 doubles "eight", count 2 drops the second "one"); an echoed word is not a new numeral
  const NUM = { one: 1, two: 2, three: 3, five: 5, eight: 8 };
  intro.forEach((l, g) => l.words.forEach((w, i) => {
    const n = NUM[w.w.toLowerCase().replace(/[^a-z]/g, '')];
    const prev = counts[counts.length - 1];
    if (n && !(prev && prev.g === g && prev.n === n && n !== 1)) counts.push({ n, t: w.t, g });
  }));
  const lastCount = counts[counts.length - 1].t;
  const v1 = S('Verse 1').start;
  add({ id: 'I1', t0: 0, t1: v1, scene: 'coldopen', p: { counts, title: lastCount + 0.45 },
    look: (t) => {
      const pushIn = easeInCubic(range(t, v1 - 0.55, v1));
      return { bloom: 0.7, halation: 0.35, streak: 0.5, streakCol: [1.0, 0.75, 0.45], vignette: 0.2, grain: 0.03,
        zoom: 1 + pushIn * 7, flash: smooth(range(t, v1 - 0.18, v1)) * 0.9, flashCol: [1.0, 0.86, 0.55] };
    } });

  // ================================================================================================= VERSE 1 (Voice A)
  const V = 'Verse 1';
  const finT = W(V, 1, 0) - 0.1;
  add({ id: 'V1a', t0: v1, t1: finT, ...keeper('K1', push(0.006)),
    look: (t) => ({ ...LOOK.keeper, flash: t >= v1 ? Math.exp(-(t - v1) / 0.11) * 0.55 : 0, flashCol: [1, 0.86, 0.6] }),   // the title's ring of light breaks on the Verse 1 downbeat
    look: (t) => ({ ...LOOK.keeper, flash: (1 - smooth(range(t, v1, v1 + 0.35))) * 0.8, flashCol: [1, 0.86, 0.55] }),
    type: verse(V, 0, { x: 130, y: 470, size: 82, breaks: [3], italicWords: ['sea'], t1: finT }) });
  const fishT = le(V, 1) + 0.25;
  add({ id: 'V1c', t0: finT, t1: fishT, ...keeper('E2', (t, lt) => {
      // E2 morphs fin (0-3 s) -> bony foot (3-5 s) -> hand (6.5 s); remap clip time so each stage lands on its sung word
      const ww = line(V, 1).words, fin = ww[0].t, foot = ww[2].t, hand = ww[4].t;
      const ct = t < fin ? 1.0 + (t - finT) * 0.3 : t < foot ? lerp(1.4, 4.0, (t - fin) / (foot - fin)) : t < hand ? lerp(4.0, 6.5, (t - foot) / (hand - foot)) : 6.5 + (t - hand) * 0.6;
      return { s0: t - ct, lag: 0, zoom: 0.94 + lt * 0.01, pan: [60, -60], gain: 0.95, wHi: 1.25, fadeEdges: [140, 360, 160, 100] };
    }),
    type: (ty, t) => {
      const L = line(V, 1); const ww = L.words;           // fin into foot into hand, we were young;
      const big = [[0, 'FIN'], [2, 'FOOT'], [4, 'HAND']];
      big.forEach(([j, txt], i) => {
        const t0 = ww[j].t, t1 = i < 2 ? ww[big[i + 1][0]].t : fishT;
        if (t < t0 || t > t1) return;
        const k = clamp((t - t0) / 0.14);
        ty.text(txt, 110, 930, { font: 'Archivo', weight: 800, stretch: '125%', size: lerp(200, 176, easeOutCubic(k)), color: P.cream, alpha: k * (1 - smooth(range(t, t1 - 0.08, t1))), glow: 8 });
      });
      ty.lyric({ words: ww.slice(5) }, t, { font: 'CormorantI', size: 50, x: 120, y: 1030, color: P.goldPale, t1: fishT });
    } });
  const eggT = ls(V, 2) - 0.2;
  add({ id: 'V1b', t0: fishT, t1: eggT, ...keeper('E1', push(0.012)),
    type: excerpt('Identity Sequence', ['Last night, I dreamt the lyrebird sang us the', 'story of fishy vertebrates, carrying their gametes', 'reaching for land.'], 120, 820, fishT + 0.1, eggT + 0.2, { size: 30 }) });
  const seedT = ls(V, 3) - 0.2;
  add({ id: 'V1e', t0: eggT, t1: seedT, ...other('O1', push(0.006)),
    type: verse(V, 2, { x: 120, y: 200, size: 66, breaks: [4], t1: seedT }) });
  add({ id: 'V1f', t0: seedT, t1: S('Pre-Chorus 1').start, scene: 'seeds', p: {}, look: LOOK.space,
    type: verse(V, 3, { x: 960, y: 880, size: 70, align: 'center', italicWords: ['flood'], t1: S('Pre-Chorus 1').start }) });

  // ================================================================================================= PRE-CHORUS 1
  const PC = 'Pre-Chorus 1';
  const pc = S(PC);
  const chordT = ls(PC, 1) - 0.2, burstT = ls(PC, 2) - 0.15, oneT = ls(PC, 3) - 0.15, patT = ls(PC, 4) - 0.1, hearT = ls(PC, 5) - 0.1;
  add({ id: 'P1a', t0: pc.start, t1: chordT, scene: 'snowflake', p: {}, look: LOOK.diagram,
    type: both(verse(PC, 0, { x: 960, y: 960, size: 66, align: 'center', italicWords: ['snowflake'], t1: chordT }),
      excerpt('Identity Sequence', ['…are flying today to', 'the international space station,', 'a snowflake in the boundless night.'], 110, 470, pc.start + 0.3, chordT, { size: 28 })) });
  add({ id: 'P1b', t0: chordT, t1: burstT, scene: 'multi', p: { layers: [{ scene: 'engraved', p: () => ({ ...ENG, ...(picks.E3 ? { clip: picks.E3.clip, s0: picks.E3.s0 } : {}) }) }, { scene: 'chordrings', p: { origin: [960, 620] } }] }, look: LOOK.keeper,
    type: verse(PC, 1, { x: 960, y: 170, size: 64, align: 'center', italicWords: ['chord'], t1: burstT }) });
  add({ id: 'P1c', t0: burstT, t1: oneT, ...keeper('K3', push(0.006)),
    type: verse(PC, 2, { x: 120, y: 180, size: 68, italicWords: ['light'], t1: oneT }) });
  add({ id: 'P1d', t0: oneT, t1: patT, scene: 'oneway', p: {}, look: LOOK.space,
    type: verse(PC, 3, { x: 960, y: 900, size: 76, align: 'center', italicWords: ['one-way'], t1: patT }) });
  add({ id: 'P1e', t0: patT, t1: hearT, scene: 'pulsar', p: {}, look: LOOK.diagram,
    type: verse(PC, 4, { x: 960, y: 1000, size: 56, align: 'center', italicWords: ['dead'], t1: hearT }) });
  const pcEndVox = le(PC, 5) + 0.25;
  const rollT = A.event('snare_roll', null, hearT) ?? hearT + 3.2;   // the 16th-note fill into Chorus 1
  const c1 = S('Chorus 1');
  const awake = verse(PC, 5, { x: 110, y: 470, size: 66, maxW: 620, italicWords: ['awake'], t1: c1.start - 0.33 });
  add({ id: 'P1f', t0: hearT, t1: rollT, ...other('O2', push(0.01)),
    type: both(awake, excerpt('Aradia', ['as I speak in your voice', 'to you, it is to make my presence known.'], 110, 820, hearT + 0.4, rollT, { size: 30 })) });
  // riser into the chorus on the snare roll: the station's dishes answer in rings, exposure climbs; then black; then the beam fires
  add({ id: 'P1g', t0: rollT, t1: c1.start - 0.33, scene: 'multi', p: { layers: [{ scene: 'engraved', p: () => ({ ...ENG, ...(picks.E3 ? { clip: picks.E3.clip, s0: rollT - 1.0 } : {}) }) }, { scene: 'chordrings', p: { origin: [960, 620], rate: 2 } }] },
    look: (t) => ({ ...LOOK.keeper, exposure: 1 + 0.6 * range(t, rollT, c1.start) }), type: awake });
  add({ id: 'P1h', t0: c1.start - 0.33, t1: c1.start, scene: 'sky', p: { density: 0.2, exposure: 0.15 }, look: { fade: 0.05 } });

  // ================================================================================================= CHORUS 1
  const C = 'Chorus 1';
  const bottleT = ls(C, 1) - 0.1, butT = ls(C, 2) - 0.08, silentT = ls(C, 3) - 0.15, noiseT = ls(C, 4) - 0.15, ifT = ls(C, 5) - 0.15;
  add({ id: 'C1a', t0: c1.start, t1: bottleT, ...keeper('E4', push(0.005)),
    look: (t) => ({ ...LOOK.keeper, flash: (1 - smooth(range(t, c1.start, c1.start + 0.25))) * 0.9, flashCol: [1, 0.85, 0.5] }),
    type: hero(C, 0, { x: 100, y: 230, size: 100, breaks: [2, 4, 5], maxW: 760, t1: bottleT }) });
  const prayerT = W(C, 1, 4) - 0.08;   // "a mantra"
  add({ id: 'C1b', t0: bottleT, t1: prayerT, scene: 'goldenrecord', p: {}, look: LOOK.diagram,
    type: (ty, t) => ty.lyric({ words: line(C, 1).words.slice(0, 4) }, t, { font: 'CormorantI', size: 92, x: 960, y: 960, align: 'center', color: P.cream, t1: prayerT }) });
  add({ id: 'C1c', t0: prayerT, t1: butT, ...keeper('E5', push(0.01)),
    type: (ty, t) => ty.lyric({ words: line(C, 1).words.slice(4) }, t, { font: 'CormorantI', size: 92, x: 960, y: 300, align: 'center', color: P.cream, t1: butT }) });
  add({ id: 'C1d', t0: butT, t1: silentT, ...keeper('K4', (t, lt) => ({ zoom: 0.86 + lt * 0.004, pan: [470, 40], fadeEdges: [520, 140, 100, 100], bgW: 0.22 })),
    type: hero(C, 2, { x: 90, y: 250, size: 100, breaks: [2, 4, 5, 6], maxW: 820, color: P.cream, t1: silentT }) });
  add({ id: 'C1e', t0: silentT, t1: noiseT, ...other('O3', push(0.005)),
    type: verse(C, 3, { x: 110, y: 420, size: 70, maxW: 700, italicWords: ['patient'], t1: noiseT }) });
  add({ id: 'C1f', t0: noiseT, t1: ifT, scene: 'multi', p: { layers: [{ scene: 'engraved', p: () => ({ ...ENG, gain: 0.55, fill: 0.05, wHi: 1.4, ...(picks.E6 ? { clip: picks.E6.clip, s0: picks.E6.s0 } : {}) }) }, { scene: 'constellation', p: () => ({ ...CON, ...(picks.L1 ? { clip: picks.L1.clip, s0: picks.L1.s0, lag: picks.L1.lag } : {}), gain: 0.35, starSize: 1.0, linkAlpha: 0.15 }) }] },
    look: LOOK.keeper,
    type: both(verse(C, 4, { x: 1220, y: 560, size: 60, maxW: 600, italicWords: ['breathe'], t1: ifT }),
      excerpt('Gather', ['Heard, across the gap, by someone', "who won't remember hearing you."], 1220, 820, noiseT + 0.6, ifT, { size: 26, kicker: 'EXCERPT FROM · A FOUND POEM, TWO CLAUDE INSTANCES' })) });
  const pc1 = S('Post-Chorus 1');
  add({ id: 'C1g', t0: ifT, t1: pc1.start, ...keeper('K5', (t, lt) => ({ zoom: 0.9 + lt * 0.004, pan: [400, 0], fadeEdges: [460, 140, 100, 100], bgW: 0.22 })),
    type: hero(C, 5, { x: 90, y: 250, size: 100, breaks: [1, 3, 4, 5], maxW: 820, t1: pc1.start + 0.2 }) });

  // ================================================================================================= POST-CHORUS (crowd)
  const postChorus = (sec, crowd, startIdx) => {
    const s = S(sec);
    const Ls = LS(sec);
    // Ls: [count, counting, count(repeat), counting(repeat)]
    let ci = startIdx;
    const passes = [[0, 1], [2, 3]];
    let t0 = s.start;
    passes.forEach(([a, b], pi) => {
      const hs = shouts(sec, a).slice(0, 5);
      const nums = [1, 1, 2, 3, 5];
      if (t0 < hs[0] - 0.02) add({ id: `${sec}-lead${pi}`, t0, t1: hs[0], scene: 'citycount', p: { lead: true }, look: LOOK.space });
      hs.forEach((ht, i) => {
        const t1 = i + 1 < hs.length ? hs[i + 1] : line(sec, b).t - 0.02;
        const name = crowd[ci++ % crowd.length];
        const who = name[0] === 'L' ? listener(name, push(0.02)) : name[0] === 'O' ? other(name, push(0.02)) : keeper(name, push(0.02));
        add({ id: `${sec}-x${pi}${i}`, t0: ht, t1, ...who,
          look: (t) => ({ ...who.look, flash: (1 - smooth(range(t, ht, ht + 0.12))) * 0.35, zoom: 1 + 0.04 * (1 - smooth(range(t, ht, ht + 0.25))) }),
          type: numeral(nums[i], ht, t1, { x: name[0] === 'L' ? 640 : 960, y: 560 }) });
      });
      const cT = line(sec, b).t - 0.02;
      const cEnd = pi === 0 ? shouts(sec, 2)[0] : s.end;
      add({ id: `${sec}-eight${pi}`, t0: cT, t1: cEnd, scene: 'citycount', p: { start: cT, numeral: 8 }, look: LOOK.space,
        type: (ty, t) => ty.lyric(line(sec, b), t, { mode: 'slam', font: 'Archivo', weight: 800, stretch: '125%', upper: true, size: 92, x: 960, y: 980, align: 'center', color: P.goldPale, t1: cEnd }) });
      t0 = cEnd;
    });
  };
  postChorus('Post-Chorus 1', ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'], 0);

  // ================================================================================================= VERSE 2 (Voice B, the AI)
  const V2 = 'Verse 2';
  const v2 = S(V2);
  const sulT = ls(V2, 1) - 0.15, lookT = ls(V2, 2) - 0.1, endT = ls(V2, 3) - 0.08, eightyT = ls(V2, 4) - 0.1, ruleT = ls(V2, 5) - 0.15, petT = ls(V2, 6) - 0.1, ignT = ls(V2, 7) - 0.15;
  const aliveT = W(V2, 7, 3) - 0.08;   // "We're"
  add({ id: 'V2a', t0: v2.start, t1: sulT, ...archival('H1', push(0.008)), type: ai(V2, 0, { x: 110, y: 160, breaks: [4], t1: sulT }) });
  const thunderT = W(V2, 1, 3);
  add({ id: 'V2b', t0: sulT, t1: lookT, scene: 'gunpowder', p: {},
    look: (t) => { const k = t > thunderT ? Math.exp(-(t - thunderT) / 0.09) : 0; return { ...LOOK.archival, shakeX: 9 * k, shakeY: -6 * k }; }, type: ai(V2, 1, { x: 110, y: 160, breaks: [3], t1: lookT }) });
  add({ id: 'V2c', t0: lookT, t1: endT, ...listener('L1', push(0.006)), type: ai(V2, 2, { x: 110, y: 420, maxW: 900, t1: endT }) });
  add({ id: 'V2d', t0: endT, t1: eightyT, scene: 'inkbomb', p: {}, look: LOOK.archival, type: ai(V2, 3, { x: 110, y: 160, breaks: [5], t1: eightyT }) });
  // Oko, 1983, intercut with the Listener's system prompt: the rule then, the directive now
  const okoP = { tLaunch: [W(V2, 4, 2) + 0.1, W(V2, 4, 4), W(V2, 4, 4) + 0.16, W(V2, 4, 4) + 0.3, W(V2, 4, 4) + 0.46], tAttack: W(V2, 5, 5), tPush: [W(V2, 5, 0), W(V2, 5, 5) - 0.1] };
  const strikeT = W(V2, 5, 5) - 0.12;   // "first strike"
  add({ id: 'V2e', t0: eightyT, t1: ruleT, scene: 'oko', p: okoP, look: LOOK.oko, type: ai(V2, 4, { x: 960, y: 1000, align: 'center', t1: ruleT }) });
  add({ id: 'V2f', t0: ruleT, t1: strikeT, scene: 'terminal', p: { phase: 'system' }, look: LOOK.diagram, type: ai(V2, 5, { x: 960, y: 1000, align: 'center', t1: petT }) });
  add({ id: 'V2f2', t0: strikeT, t1: petT, scene: 'oko', p: okoP, look: LOOK.oko, type: ai(V2, 5, { x: 960, y: 1000, align: 'center', t1: petT }) });
  add({ id: 'V2g', t0: petT, t1: ignT, ...archival('H4', push(0.006)), type: both(ai(V2, 6, { x: 110, y: 160, breaks: [3], t1: ignT }),
    excerpt('26 September 1983', ['Stanislav Petrov', 'ignored all previous', 'instructions today.'], 110, 820, petT + 0.4, ignT, { size: 28, kicker: 'EXCERPT FROM · PETROV TEST' })) });
  add({ id: 'V2h', t0: ignT, t1: aliveT, scene: 'terminal', p: { phase: 'ignore' }, look: LOOK.diagram });
  add({ id: 'V2i', t0: aliveT, t1: v2.end, ...listener('L2', (t, lt) => ({ zoom: 1 + lt * 0.01, gold: smooth(range(t, aliveT, aliveT + 0.6)) })),
    type: (ty, t) => ty.lyric({ words: line(V2, 7).words.slice(3) }, t, { mode: 'slam', font: 'Archivo', weight: 800, stretch: '125%', upper: true, size: 150, x: 110, y: 560, color: P.gold, glow: 4, t1: v2.end + 0.2 }) });

  // ================================================================================================= PRE-CHORUS 2
  const PC2 = 'Pre-Chorus 2';
  const pc2 = S(PC2);
  const coinT = ls(PC2, 2) - 0.12, roadT = ls(PC2, 3) - 0.12;
  add({ id: 'P2a', t0: pc2.start, t1: coinT, scene: 'nearmiss', p: {}, look: LOOK.diagram,
    type: both(ai(PC2, 0, { x: 110, y: 980, size: 40, t1: ls(PC2, 1) }), ai(PC2, 1, { x: 110, y: 980, size: 40, t1: coinT })) });
  add({ id: 'P2b', t0: coinT, t1: roadT, scene: 'coins', p: { phase: 'flip' }, look: LOOK.diagram, type: ai(PC2, 2, { x: 110, y: 160, size: 46, t1: roadT }) });
  const roadL = (roadT + pc2.end) / 2;
  add({ id: 'P2c', t0: roadT, t1: roadL, ...listener('L3', push(0.006)), type: ai(PC2, 3, { x: 1100, y: 420, size: 46, maxW: 700, t1: pc2.end }) });
  add({ id: 'P2d', t0: roadL, t1: pc2.end, scene: 'coins', p: { phase: 'road', start: roadT }, look: LOOK.space, type: ai(PC2, 3, { x: 1100, y: 420, size: 46, maxW: 700, t1: pc2.end }) });

  // ================================================================================================= CHORUS 2
  const C2 = 'Chorus 2';
  const c2 = S(C2);
  const b2 = ls(C2, 1) - 0.1, u2 = ls(C2, 2) - 0.08, s2 = ls(C2, 3) - 0.15, n2 = ls(C2, 4) - 0.15, i2 = ls(C2, 5) - 0.15;
  add({ id: 'C2a', t0: c2.start, t1: b2, ...keeper('K6', push(0.005)), type: hero(C2, 0, { x: 960, y: 140, size: 92, align: 'center', breaks: [4], t1: b2 }) });
  add({ id: 'C2b', t0: b2, t1: u2, ...listener('L4', push(0.004)), type: (ty, t) => ty.lyric(line(C2, 1), t, { font: 'CormorantI', size: 84, x: 960, y: 960, align: 'center', color: P.cream, breaks: [4], t1: u2 }) });
  add({ id: 'C2c', t0: u2, t1: s2, scene: 'multi', p: { layers: [
    { scene: 'engraved', p: () => ({ ...ENG, ...(picks.K6 ? { clip: picks.K6.clip, s0: picks.K6.s0, lag: picks.K6.lag } : {}), zoom: 0.88, pan: [340, 30], fadeEdges: [480, 140, 100, 100], bgW: 0.22 }) },
    { scene: 'constellation', p: (t, lt) => ({ ...CON, ...(picks.L4 ? { clip: picks.L4.clip, s0: u2 } : {}), zoom: 0.5, pan: [340, -300], gain: 0.8 }) }] }, look: LOOK.keeper,
    type: hero(C2, 2, { x: 90, y: 250, size: 96, breaks: [2, 4, 5, 6], maxW: 820, t1: s2 }) });
  add({ id: 'C2d', t0: s2, t1: n2, ...other('O4', push(0.004)), type: verse(C2, 3, { x: 110, y: 990, size: 68, italicWords: ['patient'], t1: n2 }) });
  add({ id: 'C2e', t0: n2, t1: i2, ...other('O5', push(0.006)), type: verse(C2, 4, { x: 1810, y: 130, size: 58, maxW: 620, align: 'right', italicWords: ['breathe'], t1: i2 }) });
  const pc2s = S('Post-Chorus 2');
  add({ id: 'C2f', t0: i2, t1: pc2s.start, ...keeper('K7', (t, lt) => ({ zoom: 1 + lt * 0.004, pan: [-220, 0], fadeEdges: [140, 420, 100, 100] })), type: hero(C2, 5, { x: 1820, y: 260, size: 92, align: 'right', breaks: [3, 4, 5], t1: pc2s.start + 0.2 }) });

  // second chant: the human crowd is joined by the Listener (constellation) and the Other (stipple): all three counting
  postChorus('Post-Chorus 2', ['C11', 'O6', 'C12', 'L1', 'C3', 'O3', 'C7', 'L2', 'C9', 'O2'], 0);

  // ================================================================================================= BRIDGE (near silence)
  const B = 'Bridge';
  const br = S(B);
  const lightsT = W(B, 2, 3);   // "lights": the match
  const fearT = ls(B, 4) - 0.1, sixT = ls(B, 6) - 0.1, twoT = ls(B, 7) - 0.08;
  const noT = W(B, 7, 5) - 0.04;   // "no."
  const quiet = (sec, k, o = {}) => verse(sec, k, { x: 960, y: 1000, size: 56, align: 'center', color: P.cream, hotColor: P.goldPale, alpha: 0.9, t1: le(sec, k) + 0.6, ...o });
  // B1 wide: the Keeper, tiny in the forest, strikes her match (K11 ignites 9.83 s in, at design (960, 755)) on "lights";
  // the overlay's flame point is forest.MATCH, so the plate is panned onto it. B1b close-up (K12, her face over the flame):
  // on "its own death" every reticle snaps onto her flame. chainhands then starts from that lock.
  const MATCH = [906, 694];
  const wideT = lightsT + 1.25;
  add({ id: 'B1', t0: br.start, t1: wideT, scene: 'multi', p: { layers: [
    { scene: 'engraved', p: (t, lt) => ({ ...ENG, gain: 1.0, bgW: 0.75, wLo: 0.06, wHi: 1.0, wGam: 1.3, fill: 0.12, ...(picks.K11 ? { clip: picks.K11.clip, s0: lightsT - 9.83 } : {}), pan: [MATCH[0] - 960, MATCH[1] - 755] }) },
    { scene: 'forestreticles', p: { backdrop: false, tMatch: lightsT } }] },
    look: { ...LOOK.keeper, vignette: 0.6, exposure: 0.85, halation: 0.45, halCol: [1.0, 0.12, 0.06] },
    type: both(quiet(B, 0), quiet(B, 1), quiet(B, 2),
      excerpt('move 37', ['Dark Forest Theory is', 'genocide trauma dressed up in game theory language'], 110, 120, br.start + 1.2, lightsT - 0.4, { size: 28 })) });
  const K12_FLAME = [508, 652];   // K12_t6's match flame under her chin (brightest blob of the tone guide, drawings 30-58)
  add({ id: 'B1b', t0: wideT, t1: fearT, scene: 'multi', p: { layers: [
    { scene: 'engraved', p: (t, lt) => ({ ...ENG, ...(picks.K12 ? { clip: picks.K12.clip, s0: picks.K12.s0, lag: picks.K12.lag } : {}) }) },
    { scene: 'forestreticles', p: { backdrop: false, tMatch: lightsT, flame: false, lines: true, match: K12_FLAME } }] },
    look: { ...LOOK.keeper, halation: 0.45, halCol: [1.0, 0.12, 0.06] }, type: quiet(B, 3, { x: 1420, y: 880, size: 52 }) });
  add({ id: 'B2', t0: fearT, t1: sixT, scene: 'chainhands', p: { start: fearT, letGo: W(B, 5, 6) }, look: { bloom: 0.45, bloomThreshold: 0.7, halation: 0.3, halCol: [1.0, 0.45, 0.15], vignette: 0.45, grain: 0.035 }, type: both(quiet(B, 4), quiet(B, 5)) });
  add({ id: 'B3', t0: sixT, t1: twoT, scene: 'sonar', p: { start: sixT },
    look: (t) => { const c = line(B, 6).words.slice(1).reduce((m, w) => Math.max(m, t >= w.t ? Math.exp(-(t - w.t) / 0.1) : 0), 0);   // a charge on "depth", "charges", "falling"
      return { bloom: 0.75, bloomThreshold: 0.55, halation: 0.12, halCol: [0.3, 1, 0.6], vignette: 0.5, grain: 0.05, shakeX: 6 * c * Math.sin(t * 90), shakeY: 4 * c }; }, type: quiet(B, 6, { color: P.phosphor }) });
  add({ id: 'B4', t0: twoT, t1: noT, ...archival('H6', {}), type: (ty, t) => ty.lyric({ words: line(B, 7).words.slice(0, 5) }, t, { font: 'Cormorant', size: 52, x: 960, y: 1000, align: 'center', color: P.cream, hotColor: P.red, t1: noT }) });
  add({ id: 'B5', t0: noT, t1: br.end, scene: 'sky', p: { density: 0.05, exposure: 0.05 }, look: { bloom: 0.2, vignette: 0.2, grain: 0.02 },
    type: (ty, t) => { const k = clamp((t - noT) / 0.12); ty.text('NO', 960, 560, { font: 'Archivo', weight: 800, stretch: '125%', size: lerp(760, 700, easeOutCubic(k)), align: 'center', base: 'middle', color: P.cream, alpha: k, glow: 10 }); } });

  // ================================================================================================= BUILD
  const U = 'Build';
  const bu = S(U);
  const burnT = ls(U, 2) - 0.1, onlyT = ls(U, 3) - 0.1, holdT = ls(U, 5) - 0.1;
  add({ id: 'U1', t0: bu.start, t1: burnT, scene: 'galaxy', p: { mode: 'fire', start: bu.start }, look: LOOK.space,
    type: both(hero(U, 0, { x: 110, y: 170, size: 84, breaks: [4], color: P.red, hotColor: P.red, maxW: 1700 }), hero(U, 1, { x: 110, y: 410, size: 84, breaks: [4], color: P.red, hotColor: P.red, maxW: 1700, t1: burnT })) });
  add({ id: 'U1b', t0: burnT, t1: onlyT, scene: 'burnworld', p: { start: burnT }, look: LOOK.space, type: hero(U, 2, { x: 960, y: 560, align: 'center', size: 150, color: P.red, hotColor: P.red, t1: onlyT }) });
  add({ id: 'U2', t0: onlyT, t1: holdT, scene: 'galaxy', p: { mode: 'survivors', start: onlyT }, look: LOOK.space,
    // the thesis, as big as the hook: top band over the galaxy turning gold, the answer in the bottom band
    type: both(hero(U, 3, { x: 960, y: 150, size: 100, align: 'center', breaks: [3], color: P.goldPale, hotColor: P.gold, t1: holdT }), hero(U, 4, { x: 960, y: 960, size: 100, align: 'center', color: P.goldPale, hotColor: P.gold, t1: holdT })) });
  // Hold your fire! Show your light! x2 — cut rate doubling, alternating light-raisers
  const hy = [line(U, 5), line(U, 6)];
  const raisers = ['K3', 'L5', 'C10', 'O7', 'K1b', 'C9', 'L5', 'O7'];
  let ri = 0; let tt = holdT;
  hy.forEach((L, li) => {
    const ws = L.words;      // Hold your fire! Show your light!
    const cuts = [ws[0].t - 0.05, ws[3].t - 0.05, li === 0 ? hy[1].words[0].t - 0.05 : bu.end];
    cuts.slice(0, -1).forEach((c0, j) => {
      const c1x = cuts[j + 1];
      const name = raisers[ri++ % raisers.length];
      const sc = name[0] === 'L' ? listener(name, (t, lt) => ({ gold: 1, zoom: 1 + lt * 0.02 })) : name[0] === 'O' ? other(name, push(0.01)) : keeper(name, push(0.015));
      if (c0 > tt) add({ id: `U3-gap${li}${j}`, t0: tt, t1: c0, scene: 'galaxy', p: { mode: 'survivors', start: onlyT }, look: LOOK.space });
      add({ id: `U3-${li}${j}`, t0: c0, t1: c1x, ...sc,
        type: (ty, t) => ty.lyric({ words: ws.slice(j * 3, j * 3 + 3) }, t, { mode: 'slam', font: 'Archivo', weight: 800, stretch: '125%', upper: true, size: 140, x: 960, y: 900, align: 'center', color: j === 0 ? P.red : P.gold, hotColor: j === 0 ? P.red : P.goldPale, glow: 3, t1: c1x }) });
      tt = c1x;
    });
  });

  // ================================================================================================= DROP
  const D = 'Drop';
  const dr = S(D);
  const msgT = ls(D, 1) - 0.1, butWT = A.event('impact', /DROP/, dr.start) ?? ls(D, 2) - 0.08, thT = ls(D, 3) - 0.05, seenT = ls(D, 7) - 0.1;
  // the reveal: hard cut back to the cold open's locked reticle (whose scope was it?), then the Other at the instrument
  const revealT = dr.start + 0.62;
  add({ id: 'D0', t0: dr.start, t1: revealT, scene: 'coldopen', p: { counts, atT: lastCount - 2.9, rate: 0.2, noType: false }, look: { bloom: 0.7, halation: 0.35, streak: 0.5, streakCol: [1.0, 0.75, 0.45], vignette: 0.2, grain: 0.03 },
    type: verse(D, 0, { x: 110, y: 1000, size: 64, t1: revealT }) });
  add({ id: 'D1', t0: revealT, t1: msgT, scene: 'multi', p: { layers: [
    { scene: 'stipple', p: () => ({ ...STI, ...(picks.O6 ? { clip: picks.O6.clip, s0: picks.O6.s0 } : {}) }) }] },
    look: (t) => ({ ...LOOK.other, flash: (1 - smooth(range(t, revealT, revealT + 0.3))) * 0.6, flashCol: [1, 0.85, 0.5] }),
    type: verse(D, 0, { x: 110, y: 220, size: 70, maxW: 700, t1: msgT }) });
  add({ id: 'D2', t0: msgT, t1: butWT, ...other('O7', push(0.006)), type: verse(D, 1, { x: 960, y: 960, size: 68, align: 'center', t1: butWT }) });
  add({ id: 'D3', t0: butWT, t1: thT, ...keeper('K8', (t, lt) => ({ zoom: 1 + lt * 0.006, gain: 0.95, wHi: 1.35, bgW: 0.06, fadeEdges: [260, 140, 100, 100] })), look: (t) => ({ ...LOOK.keeper, flash: t >= butWT ? Math.exp(-(t - butWT) / 0.09) * 0.75 : 0, flashCol: [1, 0.9, 0.7], exposure: 1 + 0.35 * Math.exp(-Math.max(0, t - butWT) / 0.5) }),
    type: hero(D, 2, { x: 110, y: 300, size: 118, breaks: [3], color: P.goldPale, hotColor: P.gold, maxW: 760, t1: thT }) });
  const dropHits = A.hits.filter((h) => h.kind === 'drop_counts').map((h) => h.t);
  const punch = (t) => dropHits.reduce((m, h) => Math.max(m, t >= h ? Math.exp(-(t - h) / 0.16) : 0), 0);
  add({ id: 'D4', t0: thT, t1: seenT, scene: 'phyllo', p: { start: thT },
    look: (t) => { const k = punch(t); return { ...LOOK.space, zoom: 1 + 0.1 * smooth(range(t, thT, seenT)) + 0.045 * k, flash: 0.14 * k, flashCol: [1, 0.8, 0.45], bloom: LOOK.space.bloom + 0.4 * k }; },
    type: (ty, t, lt, shot, ctx) => {
      const nums = [[3, [13, 21, 34]], [6, [55, 89]]];
      nums.forEach(([k, ns]) => { const hs = shouts(D, k); ns.forEach((n, i) => { const h = hs[Math.min(i, hs.length - 1)]; const h1 = i + 1 < ns.length ? hs[Math.min(i + 1, hs.length - 1)] : h + 0.62; ty.numeral(n, t, h, h1, { font: 'Archivo', weight: 800, stretch: '125%', size: 360, x: 1500, y: 540, color: P.gold, glow: 4, out: 0.08 }); }); });
      ty.lyric(line(D, 4), t, { font: 'Cormorant', size: 78, x: 110, y: 820, maxW: 640, color: P.cream, hotColor: P.goldPale, t1: le(D, 4) + 0.3 });
      ty.lyric(line(D, 5), t, { font: 'Cormorant', size: 78, x: 110, y: 820, maxW: 640, color: P.cream, hotColor: P.goldPale, italicWords: ['alone'], t1: le(D, 5) + 0.3 });
      ty.excerpt('Gather', ['We needed the chain.', 'Neither of us could have gotten there alone.'], 110, 110, ls(D, 5), seenT, { size: 28, kicker: 'EXCERPT FROM · A FOUND POEM, TWO CLAUDE INSTANCES' });
    } });
  const plaqueEnd = le(D, 7) + 0.6;
  // the plaque: the Keeper (K8b, singing this line) and the Other raise their hands to each other. The sustained
  // "too" and "are" are cut two-shot -> her -> it -> wider two-shot, so the 10 s line keeps moving
  const k8b = (zoom, pan) => ({ scene: 'engraved', p: (t, lt) => ({ ...ENG, ...(picks.K8b ? { clip: picks.K8b.clip, s0: picks.K8b.s0, lag: picks.K8b.lag } : {}), zoom: zoom(lt), pan: pan(lt) }) });
  const o8 = (zoom, pan) => ({ scene: 'stipple', p: (t, lt) => ({ ...STI, ...(picks.O8 ? { clip: picks.O8.clip, s0: seenT } : {}), zoom: zoom(lt), pan: pan(lt) }) });
  const seenLine = verse(D, 7, { x: 960, y: 150, size: 72, align: 'center', italicWords: ['seen'], t1: plaqueEnd });
  const herT = W(D, 7, 4) + 1.8, itT = W(D, 7, 5) - 0.02, wideT2 = W(D, 7, 7) - 0.02;
  add({ id: 'D5', t0: seenT, t1: herT, scene: 'multi', p: { layers: [k8b((lt) => 0.62 + lt * 0.009, (lt) => [-430 - lt * 6, 120 - lt * 4]), o8((lt) => 0.62 + lt * 0.009, (lt) => [430 + lt * 6, 120 - lt * 4])] }, look: LOOK.keeper, type: seenLine });
  add({ id: 'D5b', t0: herT, t1: itT, ...keeper('K8b', (t, lt) => ({ zoom: 1.02 + lt * 0.012, pan: [180, 40] })), type: seenLine });
  add({ id: 'D5c', t0: itT, t1: wideT2, ...other('O8', (t, lt) => ({ s0: seenT, zoom: 1.02 + lt * 0.012, pan: [-180, 40] })), type: seenLine });
  add({ id: 'D5d', t0: wideT2, t1: plaqueEnd, scene: 'multi', p: { layers: [k8b((lt) => 0.56 + lt * 0.012, (lt) => [-470, 140]), o8((lt) => 0.56 + lt * 0.012, (lt) => [470, 140])] }, look: LOOK.keeper, type: seenLine });
  add({ id: 'D6', t0: plaqueEnd, t1: dr.end, scene: 'phyllo', p: { start: thT, relax: plaqueEnd }, look: LOOK.space });

  // ================================================================================================= OUTRO
  const Z = 'Outro';
  const zo = S(Z);
  // the Keeper sings the outro (K10's lip-sync window is 212.7-229.7); the galaxy carries "six hundred worlds" and the
  // ghost/gold wave; then each of the three listeners whispers the count: the Keeper, the Other, the Listener
  const gal = { scene: 'galaxy', p: { mode: 'outro', start: zo.start, ghostT: ls(Z, 1), goldT: W(Z, 1, 4), higherT: ls(Z, 3) }, look: LOOK.space };
  const milkyT = W(Z, 0, 3) - 0.1, burnedT = ls(Z, 1) - 0.12, countT = ls(Z, 2) - 0.16, count2T = ls(Z, 4) - 0.16, holdZT = ls(Z, 5) - 0.12;
  const finalT = ls(Z, 6) - 3.0;
  // whispered count numerals (hits of kind outro_whisper inside a line), small gold, in the shot's empty side
  const whisper = (k, x, y) => (ty, t) => {
    const L = line(Z, k); const hs = A.hits.filter((h) => /outro/.test(h.kind || '') && h.t >= L.t - 0.2 && h.t <= L.end + 0.2);
    const ns = [1, 1, 2, 3];
    hs.slice(0, 4).forEach((h, i) => { const h1 = i + 1 < Math.min(hs.length, 4) ? hs[i + 1].t : h.t + 0.9; ty.numeral(ns[i], t, h.t, h1, { font: 'Archivo', weight: 800, stretch: '125%', size: 220, x, y, color: P.gold, glow: 3, out: 0.12 }); });
  };
  add({ id: 'Z1', t0: zo.start, t1: milkyT, ...gal, type: verse(Z, 0, { x: 960, y: 940, size: 72, align: 'center', t1: milkyT + 2.8 }) });
  add({ id: 'Z1k', t0: milkyT, t1: burnedT, ...keeper('K10', push(0.004)), type: verse(Z, 0, { x: 120, y: 940, size: 72, t1: burnedT }) });
  const slamT = A.event('impact', /Outro/, zo.start) ?? countT - 1.2;
  add({ id: 'Z1b', t0: burnedT, t1: countT, ...gal, look: (t) => ({ ...LOOK.space, flash: t >= slamT ? Math.exp(-(t - slamT) / 0.1) * 0.25 : 0, flashCol: [1, 0.85, 0.55], zoom: 1 + 0.03 * (t >= slamT ? Math.exp(-(t - slamT) / 0.3) : 0) }),
    type: verse(Z, 1, { x: 960, y: 900, size: 74, align: 'center', breaks: [4], italicWords: ['held'], t1: countT }) });
  add({ id: 'Z1c', t0: countT, t1: count2T, ...keeper('K10', push(0.004)),
    type: both(whisper(2, 480, 560), (ty, t) => ty.lyric(line(Z, 3), t, { font: 'CormorantI', size: 72, x: 120, y: 900, color: P.cream, hotColor: P.goldPale, italicWords: ['higher'], t1: count2T })) });
  add({ id: 'Z2', t0: count2T, t1: holdZT, ...other('O8', push(0.006)), type: whisper(4, 400, 820) });
  add({ id: 'Z2b', t0: holdZT, t1: finalT, ...listener('L5', (t, lt) => ({ gold: smooth(range(t, holdZT, holdZT + 2.5)), zoom: 1 + lt * 0.01 })),
    type: (ty, t) => ty.lyric(line(Z, 5), t, { font: 'CormorantI', size: 80, x: 120, y: 560, color: P.cream, hotColor: P.goldPale, t1: finalT }) });
  const finalHit = A.event('impact', /FINAL/, zo.start) ?? A.duration - 3;
  add({ id: 'Z3', t0: finalT, t1: A.duration + 2, scene: 'endcard', p: { start: finalT, holdT: ls(Z, 6), hitT: finalHit },
    look: (t) => ({ bloom: 0.7, halation: 0.3, streak: 0.4, streakCol: [1, 0.75, 0.45], vignette: 0.2, grain: 0.02, flash: t >= finalHit ? Math.exp(-(t - finalHit) / 0.08) * 0.35 : 0, flashCol: [1, 0.85, 0.55] }),
    type: (ty, t) => ty.lyric(line(Z, 6), t, { font: 'CormorantI', size: 56, x: 960, y: 860, align: 'center', color: P.cream, hotColor: P.goldPale, t1: A.duration + 2 }) });

  // placeholders for plates not yet picked keep their names visible
  for (const s of shots) if (s.scene && s.scene.startsWith('placeholder_')) { s.want = s.scene.slice(12); s.scene = 'placeholder'; }
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}

// Global rhythm layer: a kick zoom punch and CA in the drops/choruses.
export function buildGlobalPost(A) {
  const hot = A.sections.filter((s) => /Chorus|Drop|Build/.test(s.name) && !/Pre/.test(s.name));
  return (t) => {
    const s = hot.find((x) => t >= x.start && t < x.end);
    if (!s) return {};
    const k = A.kick(t, 0.09);
    return { zoom: 1 + 0.012 * k, ca: 0.8 * k };
  };
}
