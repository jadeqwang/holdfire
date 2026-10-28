// LYRICS 2: the in-world lyric layer for take two (docs/take2/LYRICS.md). Every sung line, shout and whisper is on screen while
// it is sung, set into the world of the shot it is sung over (blueprint lettering in verse 1, riso print in the signal
// sections, phosphor text on the control-room screens, brushed ink beside the alchemists, a Soviet terminal for Petrov, a
// ticker tape among the near-misses, coin legends, chalk and anime impact type at the chessboard, poster banners for Arkhipov,
// the war display and the VCR's OSD in the build, marker on the mirror glass, starlight on the graph, the safety board).
// The edit's hero words and numerals (FIN / FOOT / HAND, FLOOD, WE'RE AWAKE, WE'RE ALIVE, HOLD YOUR FIRE, SHOW YOUR LIGHT,
// YOU WERE COUNTING TOO, the counts...) stay the loud moments: a word an edit cue already shows is left out here (found at
// init from the timeline's cues, by onset and text), and this layer carries the rest of the line, quieter but always there.
//
// Integration (one hook, in main.js): init(ctx, shots) after the timeline is built; draw(type, t, ctx) after the shot's own
// type. Off with ?lyrics2=0 or window.__lyrics2 = false (the edit's subtitles then come back: the sub cues for these lines are
// muted only while this layer is on). LYRIC_LINES: the timing.json line numbers this layer carries (the edit's sub() reads it).
//
// PLAN entry: {n (timing line), style, ...options, segs: {'SHOTID[,SHOTID]': {...options for that shot} | false}}
//   placement  x, y (anchor: first baseline; align 'left'|'center'|'right' sets both the text alignment and the anchor), maxW,
//              br [word indices that start a row], rot (deg), skew, scale, mirror, quad [[x,y]x4] (corner pin: the block is
//              fitted into the quad, qAlign / vAlign), zoom / pan (numbers or fn(lt) -> the plate's centred zoom and pan, applied
//              to x, y and quad, lt from the segment's shot start), copies [{...overrides}] (draw the line again, e.g. mirrored)
//   words      all (also show words the edit's cues carry), only [indices], from (first word index)
//   time       hold (s after the last word, default 1.1), endAt / startAt (absolute song times), handover (s the line stays
//              after an edit hero carries the rest of it, default 0.4)
//   a shot listed with false hides the line in that shot; a shot not listed uses the entry's own options; the line ends at the
//   first cut after its last word into a shot the entry does not list (so it never leaks into an unrelated picture)
import { clamp, smooth, range } from './util.js';
import { STYLES } from './scenes/t2/lyric/styles.js';
import { setFont, scratch, warpQuad, fitInQuad, layout, wordState, loadLyricFonts } from './scenes/t2/lyric/kit.js';

const SAFE = { x0: 528, x1: 1392, cx: 960 };
const INK = { navy: '#0d2a5c', white: '#f2f8ff', klein: '#1f2bd1', orange: '#ff5a1f', pale: '#9ccbff', pink: '#ff48b0', mint: '#3fe0c5', violet: '#2a105a', paper: '#f3efe6', cream: '#f2e9d8', red: '#c9261c', teal: '#2aa198' };
const GOLD = [1, 0.84, 0.52], PALE = [0.72, 0.84, 1];
const NAVY_HALO = 'rgba(232,240,255,0.95)';

// ================================================================================================ the plan (design px, 1920x1080)
export const PLAN = [
  // ---------------------------------------------------------------- VERSE 1: white blueprint lettering, dimension lines
  // OUT OF THE SEA is the edit's hero (cyanotype ink, top left): the rest of the line continues under it in the same ink
  { n: 2, style: 'blueprint', ink: INK.navy, size: 50, segs: {
    V101: { x: 548, y: 560, align: 'left', size: 52, br: [6], maxW: 400, halo: NAVY_HALO, haloA: 0.5 },     // its own block under the hero, left of her hair (polish 3)
    V102: { x: 1640, y: 430, align: 'center', maxW: 560, br: [6], halo: NAVY_HALO, haloA: 0.3 } } },                 // a callout over the lobe-finned fish
  { n: 3, style: 'blueprint', all: true, size: 54, x: 548, y: 790, align: 'left', maxW: 430, br: [3, 5], halo: 'rgba(8,16,40,0.9)', haloA: 0.5 },
  { n: 4, style: 'blueprint', size: 50, segs: {
    V111: { only: [0, 1, 2, 3], ink: INK.navy, x: 560, y: 150, align: 'left', maxW: 500, br: [3], halo: NAVY_HALO, haloA: 0.3 },     // in the pale sky over the mud-brick street
    V112: { only: [4, 5], style: 'incise', size: 72, weight: 700, quad: [[767, 725], [1153, 725], [1183, 865], [737, 865]], dark: 'rgba(28,14,4,1)', core: 'rgba(48,28,12,0.97)', lite: 'rgba(255,240,210,0.95)', ghost: 0.45, shade: 0.9, shadeCol: 'rgba(60,36,14,1)' },   // drawn in the dust of the cart road: ink-filled recess, deeper shadow (polish 3: phone legibility)
    V113: { only: [6, 7, 8], style: 'incise', size: 64, maxW: 1500, quad: [[520, 767], [890, 678], [908, 752], [538, 840]], wedges: true, ghost: 0.45, dark: 'rgba(24,12,4,1)', core: 'rgba(46,28,12,0.97)', lite: 'rgba(255,240,210,0.95)', shade: 0.6, shadeCol: 'rgba(60,36,14,1)' } } },   // pressed into the clay under the Nanni line, ruled parallel to the count (t2_tablet's rows), all of it on the clay
  { n: 5, style: 'blueprint', size: 52, segs: {
    V114: { x: 1385, y: 760, align: 'right', maxW: 560, halo: 'rgba(24,14,6,0.9)', haloA: 0.6 },   // on the dark soil by the furrow, inside the safe area (polish 3)
    V115: { x: 600, y: 790, align: 'left', maxW: 760 },                                  // a label in the blueprint cross-section
    'V116,V117': { ink: INK.navy, x: 560, y: 100, align: 'left', maxW: 640, halo: NAVY_HALO, haloA: 0.35 } } },
  // ---------------------------------------------------------------- the ISS: starlight, then the signal print
  { n: 6, style: 'light', size: 72, col: [0.92, 0.95, 1], segs: {
    V122: { x: 1385, y: 330, align: 'right', maxW: 380, br: [1, 3] },
    V123: { style: 'riso', size: 64, inks: [INK.paper, INK.orange], x: 960, y: 905, align: 'center', maxW: 760, br: [3] } } },
  // ---------------------------------------------------------------- PRE-CHORUS 1: riso type on the signal prints
  { n: 7, style: 'riso', size: 66, inks: [INK.paper, INK.orange], x: 960, y: 830, align: 'center', maxW: 820, br: [3] },
  { n: 8, style: 'riso', size: 68, inks: [INK.paper, INK.violet], mis: [5, 4], x: 960, y: 880, align: 'center', maxW: 820, br: [3] },
  { n: 9, style: 'light', size: 86, col: GOLD, shade: 0.8, x: 960, y: 900, align: 'center', italic: false },
  { n: 10, style: 'light', size: 72, col: [0.96, 0.9, 0.78], shade: 0.8, x: 960, y: 1010, align: 'center', maxW: 1000, flare: false },
  // WE'RE AWAKE is the edit's hero: "Hear it, and you'll know" glows on the dark window glass beside her
  { n: 11, style: 'crt', size: 66, col: '#9fe8ff', x: 508, y: 330, align: 'left', maxW: 250, br: [2, 4] },
  // ---------------------------------------------------------------- CHORUS 1: light in the sky, the screens
  { n: 12, style: 'light', size: 80, col: GOLD, shade: 2, x: 548, y: 405, align: 'left', maxW: 560, br: [5] },             // in the dark sky left of the Milky Way, under the hero and off the core (polish 4)
  { n: 13, style: 'engrave', size: 62, x: 770, y: 400, align: 'right', maxW: 620, br: [4, 6] },    // the record's own legend, beside the disc
  { n: 14, style: 'crt', size: 70, col: '#9fe8ff', panel: 'rgba(2,8,16,1)', x: 470, y: 770, align: 'center', handover: 0 },   // adversary pass: Jade's line on Jade's side of the wall (it bridged the split), on her chest, clear of her face   // "but if you are" gives way on the onset of the hero I'M COUNTING ON YOU (Jade's text rules)   // a shared readout across the split, at chest height (clear of both mouths)
  { n: 15, style: 'crt', size: 70, col: '#b8c8ff', panel: 'rgba(3,4,14,1)', x: 960, yLast: 985, align: 'center', maxW: 860, br: [3] },
  { n: 16, style: 'crt', size: 58, col: '#a8f0ff', quad: [[1250, 170], [1850, 140], [1860, 560], [1255, 575]], br: [4, 8], panel: 'rgba(2,10,20,1)', panelA: 0.55 },   // across the monitor bank
  { n: 17, style: 'light', size: 84, col: GOLD, shade: 0.8, segs: {   // one phrase per clip: "If you are" on C109, "I'm counting on you" from the cut on I'm (Jade's text rules)
    C109: { x: 960, y: 280, align: 'center', only: [0, 1, 2] },
    C110: { x: 960, y: 760, align: 'center', nodes: true, only: [3, 4, 5, 6] } } },
  // ---------------------------------------------------------------- POST-CHORUS 1: "Counting on you!" in the graph's light
  { n: 19, style: 'light', size: 86, col: GOLD, x: 960, y: 210, align: 'center', nodes: true },
  { n: 21, style: 'light', size: 86, col: GOLD, shade: 1, x: 960, y: 110, align: 'center' },
  // ---------------------------------------------------------------- VERSE 2: brushed into the ink painting
  { n: 22, style: 'brush', size: 88, shade: 1.6, shadeCol: 'rgba(246,242,232,1)', x: 1060, y: 150, align: 'left', maxW: 640, br: [4] },          // in the smoke over the cauldron
  { n: 23, style: 'brush', size: 84, x: 1330, y: 420, align: 'left', maxW: 560, br: [2, 3, 4] },     // on the bare paper beside the characters
  { n: 24, style: 'brush', size: 86, x: 590, y: 300, align: 'left', maxW: 560, br: [4, 7] },      // on the scroll beside the warning
  { n: 25, style: 'brush', size: 80, yLast: 1045, x: 960, align: 'center', maxW: 1100, br: [5] },
  // ---------------------------------------------------------------- Petrov: the console readout (Plex Mono, phosphor)
  { n: 26, style: 'terminal', size: 46, col: '#ffcf8a', panel: 'rgba(14,6,4,1)', prompt: '>', x: 960, yLast: 1010, align: 'center', maxW: 860, br: [1] },   // title-safe: raised 40 px (polish 4)
  { n: 27, style: 'terminal', size: 52, col: '#ffcf8a', panel: 'rgba(14,6,4,1)', prompt: '>', x: 960, yLast: 990, align: 'center', maxW: 860, br: [3] },
  { n: 28, style: 'terminal', size: 52, col: '#ffcf8a', panel: 'rgba(14,6,4,1)', prompt: '>', x: 960, yLast: 990, align: 'center', maxW: 860, br: [4] },
  { n: 29, style: 'terminal', size: 54, col: '#8dffb0', panel: 'rgba(3,10,6,1)', prompt: '>', x: 960, yLast: 990, align: 'center', maxW: 900, br: [2], segs: { 'V216,V217': {} } },   // ends at the cut to WE'RE ALIVE
  // ---------------------------------------------------------------- PRE-CHORUS 2: ticker tape among the near-misses, the coin legend
  { n: 30, style: 'typewriter', tape: true, size: 54, x: 960, yLast: 1000, align: 'center', maxW: 1400 },
  { n: 31, style: 'typewriter', tape: true, size: 54, x: 960, yLast: 1000, align: 'center', maxW: 1400 },
  { n: 32, style: 'engrave', size: 54, copies: [{ only: [0, 1, 2, 3], x: 505, y: 420, align: 'right', br: [2] }, { only: [4, 5, 6, 7, 8], x: 1415, y: 420, align: 'left', br: [6] }] },
  { n: 33, style: 'engrave', size: 60, shade: 2, plate: 0.8, x: 960, y: 150, align: 'center', maxW: 860, br: [3], segs: { P204: {} } },   // ends at the cut to chorus 2 (CAN'T BE SURE); a dark ground over the coins flying up (polish 4)
  // ---------------------------------------------------------------- CHORUS 2: the mirror, first (as chorus 1, both rooms)
  { n: 34, style: 'light', size: 74, col: GOLD, shade: 1.4, x: 960, yLast: 1015, align: 'center' },
  { n: 35, style: 'engrave', size: 50, x: 960, yLast: 1010, align: 'center', maxW: 860, br: [4, 6] },   // a row per phrase where the commas were
  { n: 36, style: 'crt', size: 70, col: '#9fe8ff', panel: 'rgba(2,8,16,1)', x: 470, y: 770, align: 'center', handover: 0 },   // adversary pass: Jade's line on Jade's side of the wall (it bridged the split), on her chest, clear of her face
  { n: 37, style: 'crt', size: 70, col: '#b8c8ff', panel: 'rgba(3,4,14,1)', x: 960, yLast: 985, align: 'center', maxW: 860, br: [3] },
  { n: 38, style: 'crt', size: 64, col: '#a8f0ff', panel: 'rgba(2,10,20,1)', x: 960, yLast: 1012, align: 'center', maxW: 860, br: [4] },
  { n: 39, style: 'crt', size: 70, col: '#9fe8ff', panel: 'rgba(2,8,16,1)', segs: {   // as n 17: "If you are" on C209, "I'm counting on you" on C210 (the cut is on I'm)
    'C209,C209b': { x: 470, y: 770, align: 'center', only: [0, 1, 2] },   // adversary pass: Jade's line on her side of the wall (held through teal-tips' switch insert)
    C210: { style: 'light', size: 84, col: GOLD, shade: 0.8, x: 960, y: 230, align: 'center', only: [3, 4, 5, 6] } } },
  // ---------------------------------------------------------------- POST-CHORUS 2
  { n: 41, style: 'light', size: 86, col: GOLD, shade: 1, x: 960, y: 150, align: 'center', segs: { X206: {} } },   // ends at the cut to the chess board (no lyric over the set-up)
  // n 42, the shouted "One, one, two, three, five" over the chess board setting itself: no lyric (Jade, sung reel v4); the shouts
  // stay unsubtitled and the edit's numerals stay off the board
  { n: 43, style: 'impact', size: 108, texts: ['Counting', 'on', 'you!'], x: 960, yLast: 1020, align: 'center', maxW: 1000 },
  // ---------------------------------------------------------------- BRIDGE: chalk in the dark, then the battle's impact type
  { n: 44, style: 'chalk', size: 96, shade: 1.6, segs: {
    BR01: { x: 560, y: 170, align: 'left', maxW: 600 },   // left, clear of her head (polish 3)
    BR01b: { x: 960, y: 125, align: 'center', maxW: 1300 },
    BR02: { x: 560, y: 170, align: 'left', maxW: 600 } } },
  { n: 45, style: 'chalk', size: 96, shade: 1.6, segs: {
    BR02: { x: 560, y: 170, align: 'left', maxW: 600 },
    BR02b: { x: 960, y: 125, align: 'center', maxW: 1300 },
    'BR02c,BR02d': { x: 960, y: 110, align: 'center', maxW: 1240, size: 88 },   // one row above her head
    BR03: { x: 960, y: 125, align: 'center', maxW: 1300 } } },
  { n: 46, style: 'chalk', size: 96, shade: 1.6, x: 960, y: 125, align: 'center', maxW: 1300, segs: { 'BR03,BR05': {}, BR04: { style: 'impact', size: 100, x: 960, yLast: 1025, align: 'center', maxW: 860, br: [3] } } },   // RC3 (QA_RC2 #6): two rows inside the 4:5 area
  { n: 47, style: 'chalk', size: 96, shade: 1.6, x: 960, y: 125, align: 'center', maxW: 1300, segs: { BR05: {}, BR06: { style: 'impact', size: 104, x: 960, yLast: 1025, align: 'center', maxW: 860, br: [2] } } },   // RC3 (QA_RC2 #6): two rows inside the 4:5 area
  { n: 48, style: 'impact', size: 100, x: 960, yLast: 1025, align: 'center', maxW: 1000, br: [4] },
  { n: 49, style: 'impact', size: 100, x: 960, yLast: 1025, align: 'center', maxW: 1000, br: [4] },
  // ---------------------------------------------------------------- Arkhipov: poster banners (NO is the poster's own lettering)
  { n: 50, style: 'poster', size: 92, band: '#111111', ink: INK.cream, x: 960, yLast: 1030, align: 'center', rot: -4, br: [1], maxW: 1100 },
  { n: 51, style: 'poster', size: 92, band: '#111111', ink: INK.cream, x: 960, yLast: 1030, align: 'center', rot: -4, only: [0, 1, 2, 3, 4], br: [3], segs: { 'BR15,BR16': {}, BR17: false } },
  // ---------------------------------------------------------------- BUILD: the war display, then the VCR's OSD over the rewind
  { n: 52, style: 'terminal', size: 64, col: '#ff5a44', shade: 1, x: 960, y: 140, align: 'center', maxW: 1000, scanA: 0.25 },
  { n: 53, style: 'terminal', size: 64, col: '#ff5a44', shade: 1, x: 960, y: 140, align: 'center', maxW: 1000, scanA: 0.25, br: [4] },
  { n: 54, style: 'terminal', size: 84, col: '#ff7a62', panel: 'rgba(12,2,2,1)', panelA: 0.82, x: 960, y: 170, align: 'center', maxW: 860, scanA: 0.25, br: [1] },   // a dark war-display panel: the console is lit red (polish 3)
  { n: 55, style: 'osd', size: 80, x: 640, yLast: 960, align: 'left', maxW: 760, br: [4] },
  { n: 56, style: 'osd', size: 80, x: 640, yLast: 960, align: 'left', maxW: 760, segs: { 'BU05,BU06,BU07': {} } },   // the OSD leaves with the rewind
  { n: 57, style: 'light', size: 120, caps: true, track: 0.06, col: GOLD, x: 960, y: 200, align: 'center', maxW: 900 },
  { n: 58, style: 'light', size: 110, caps: true, track: 0.06, col: GOLD, shade: 1.3, x: 960, y: 150, align: 'center', maxW: 900 },
  // ---------------------------------------------------------------- DROP: marker on the mirror glass (mirrored on teal-tips' side)
  { n: 59, style: 'glass', size: 68, ink: INK.klein, br: [3], copies: [{ x: 470, y: 105, align: 'center', maxW: 860 }, { x: 1450, y: 105, align: 'center', maxW: 860, mirror: true, ink: INK.teal }] },   // on the white above each walker's head: the walkers cross x 400-840 during the shot (polish 4)
  { n: 60, style: 'glass', size: 64, ink: INK.klein, br: [4, 6], segs: { 'DR02,DR03': { copies: [{ x: 570, y: 300, align: 'right', maxW: 420 }, { x: 1030, y: 300, align: 'right', maxW: 420, mirror: true, ink: INK.teal }] } } },
  { n: 61, style: 'glass', size: 70, ink: INK.klein, halo: 'rgba(250,250,255,1)', copies: [{ x: 930, y: 1010, align: 'right', maxW: 390 }, { x: 990, y: 1010, align: 'right', maxW: 390, mirror: true, ink: INK.teal }] },
  { n: 63, style: 'light', size: 64, col: GOLD, shade: 0.9, x: 960, y: 100, align: 'center', maxW: 1200, br: [3] },   // top: the edit's 13 21 34 hold at the bottom (polish 3); lifted clear of the disk (polish 4)
  { n: 64, style: 'glass', size: 70, ink: INK.klein, halo: 'rgba(250,250,255,1)', x: 960, yLast: 1030, align: 'center', maxW: 1000, br: [1], segs: { DR11: {} } },
  { n: 66, style: 'riso', size: 62, shade: 1, inks: [INK.paper, INK.pink], x: 960, yLast: 990, align: 'center', maxW: 1100, segs: {   // "And you were seen too" on DR14 and DR15, "wherever you are" on DR16: never the whole sentence at once (Jade's text rules)
    DR14: { yLast: 780, shade: 1.8, only: [0, 1, 2, 3, 4] }, DR15: { only: [0, 1, 2, 3, 4], style: 'light', col: [0.75, 1, 0.92], nodes: true, size: 66, shade: 2 },   // a dark ground: the constellation lines and rings cross it (polish 4)
    DR16: { only: [5, 6, 7], style: 'crt', col: '#a8f0ff', panel: 'rgba(2,10,20,1)', size: 62, shade: 0, x: 1885, y: 112, yLast: null, align: 'right', maxW: 520 } } },   // on the window glass top right, clear of both figures (polish 4; outside the 4:5 area)
  // ---------------------------------------------------------------- OUTRO: starlight on the graph, the safety board, whispers
  { n: 67, style: 'light', size: 74, col: GOLD, x: 960, y: 150, align: 'center', maxW: 1100, br: [3], nodes: true },
  { n: 68, style: 'light', size: 70, col: GOLD, x: 960, y: 160, align: 'center', maxW: 900, br: [4], segs: { OU02: {}, OU03: false } },
  { n: 69, style: 'board', size: 64, panel: '#1d5a35', x: 960, y: 985, align: 'center' },
  { n: 70, style: 'board', size: 72, panel: '#1d5a35', x: 960, y: 985, align: 'center' },
  { n: 71, style: 'whisper', size: 72, x: 960, y: 260, align: 'center' },
  { n: 72, style: 'whisper', size: 76, col: [0.22, 0.24, 0.36], x: 960, y: 190, align: 'center', segs: { OU11: {} } },
  { n: 73, style: 'whisper', size: 64, col: [0.9, 0.93, 1], x: 960, y: 1015, align: 'center', segs: { OU14: false } },   // RC2: gone on the final hit (the end card's credits now land with the title, and its small lines sit at y ~990)
];
export const LYRIC_LINES = new Set(PLAN.map((e) => e.n));

// ================================================================================================ runtime
let RT = null;
const NUMW = { one: 1, two: 2, three: 3, five: 5, eight: 8, thirteen: 13, 'twenty-one': 21, 'thirty-four': 34, 'fifty-five': 55, 'eighty-nine': 89 };
// Jade's text rules: on-screen lyrics carry no punctuation and never an exclamation mark (apostrophes and hyphens stay)
export const noPunct = (s) => String(s).replace(/[.,;:!?\u2026\u201c\u201d"]+/g, '').trim();
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9'-]/g, '');

export async function init(ctx, shots) {
  RT = null;
  if (!shots || !Array.isArray(shots.cues)) return;          // only the edit (and timelines that carry cues) get the layer
  await loadLyricFonts();
  const A = ctx.audio;
  // words the edit's cues already show (hero words by onset + text, numerals by onset + value)
  const shown = [];
  for (const c of shots.cues) {
    if (c.kind === 'hero') for (const r of c.rows || []) for (const w of r.words || []) shown.push({ t: w.t, key: norm(w.text) });
    if (c.kind === 'num') for (const it of c.items || []) shown.push({ t: it.t, n: it.n });
  }
  const carried = (w) => shown.some((s) => Math.abs(s.t - w.t) < 0.03 && (s.n != null ? NUMW[norm(w.w)] === s.n : s.key === norm(w.w)));
  // the edit's subtitles for these lines go quiet while this layer is on (and come back with ?lyrics2=0)
  for (const c of shots.cues) {
    if (c.kind !== 'sub' || c.lyrics2) continue;
    const L = A.lines.find((l) => l.words.some((w) => c.words.some((cw) => Math.abs(cw.t - w.t) < 1e-3)));
    if (!L || !LYRIC_LINES.has(L.n ?? L.i)) continue;
    const orig = c.draw; c.lyrics2 = true;
    c.draw = (ty, t, cc) => { if (window.__lyrics2 === false) orig(ty, t, cc); };
  }
  const shotList = shots.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 }));
  const shotAt = (t) => shotList.find((s) => t >= s.t0 && t < s.t1) || shotList[shotList.length - 1];
  const entries = [];
  for (const e of PLAN) {
    const L = A.lines.find((l) => (l.n ?? l.i) === e.n); if (!L) continue;
    // display tokens: the lyric sheet's spelling (apostrophes, hyphens, capitals) when its tokens line up with the timed
    // words, with no punctuation (Jade's text rules, LYRICS.md): no commas, periods, semicolons, colons, ellipses, question or
    // exclamation marks anywhere; where the sheet had a mid-line comma or period the plan breaks the row there instead (br)
    const toks = String(L.text).replace(/[()]/g, '').split(/\s+/).filter(Boolean);
    const words = L.words.map((w, i) => {
      const text = noPunct(e.texts ? e.texts[i] : toks.length === L.words.length ? toks[i] : w.w);
      return { i, w: w.w, t: w.t, end: w.end, text, carried: carried(w) };
    });
    const segs = {};
    for (const [k, v] of Object.entries(e.segs || {})) for (const id of k.split(',')) segs[id.trim()] = v;
    entries.push({ e, L, words, segs });
  }
  // windows: from just before the first shown word (never back across a cut) to the hold after the last; a line gives way to
  // the next; it ends at the first cut into a shot it does not list; carried words after it end it soon after they land
  for (const [k, x] of entries.entries()) {
    const { e, words, segs } = x;
    const vis = words.filter((w) => e.all || !w.carried);
    if (!vis.length) { x.skip = true; continue; }
    const first = vis[0], last = vis[vis.length - 1];
    const s0 = shotAt(first.t);
    x.t0 = e.startAt ?? Math.max(first.t - 0.22, s0.t0 - 1e-4);
    let t1 = e.endAt ?? (last.end + (e.hold ?? 1.1));
    const after = words.find((w) => w.t > last.t && w.carried && !e.all);
    if (after) t1 = Math.min(t1, after.t + (e.handover ?? 0.4));
    if (Object.keys(segs).length) {
      const cut = shotList.find((s) => s.t0 > last.t + 0.05 && s.t0 < t1 && !(s.id in segs));
      if (cut) t1 = cut.t0;
    }
    t1 = Math.max(t1, first.t + Math.max(0.6, vis.length / 3));      // reading floor: >= 0.6 s, <= 3 words/s
    x.t1 = t1;
  }
  const live = entries.filter((x) => !x.skip).sort((a, b) => a.t0 - b.t0);
  for (let i = 0; i + 1 < live.length; i++) if (live[i].t1 > live[i + 1].t0) live[i].t1 = Math.max(live[i + 1].t0, live[i].t0 + 0.6);
  RT = { entries: live, shotAt };
  window.__lyrics2Plan = live.map((x) => ({ n: x.e.n, t0: +x.t0.toFixed(3), t1: +x.t1.toFixed(3), text: x.L.text }));
}

const val = (v, lt) => (typeof v === 'function' ? v(lt) : v);

export function draw(ty, t, ctx) {
  if (!RT) return;
  const T0 = performance.now();   // timing only (window.__lyr2ms, for tools/profile); never feeds pixels
  try { drawAll(ty, t, ctx); } finally { window.__lyr2ms = performance.now() - T0; }
}
function drawAll(ty, t, ctx) {
  const shot = ctx.shot;
  for (const x of RT.entries) {
    if (t < x.t0 || t >= x.t1) continue;
    let seg = {};
    if (Object.keys(x.segs).length) {
      seg = x.segs[shot.id];
      if (seg === false) continue;
      if (seg === undefined) seg = {};
    }
    const o = { ...x.e, ...seg };
    delete o.segs;
    const line = smooth(range(t, x.t0, x.t0 + 0.12)) * (1 - smooth(range(t, x.t1 - 0.14, x.t1)));
    if (line <= 0) continue;
    const lt = t - shot.t0;
    const copies = o.copies || [null];
    for (const c of copies) drawLine(ty, t, lt, { ...o, ...(c || {}) }, x, line, ctx);
  }
}

function drawLine(ty, t, lt, o, x, line, ctx) {
  const S = ctx.engine.S;
  const style = STYLES[o.style] || STYLES.plain;
  const f = style.font(o);
  let words = x.words.filter((w) => o.all || !w.carried);
  if (o.only) words = words.filter((w) => o.only.includes(w.i));
  if (o.from != null) words = words.filter((w) => w.i >= o.from);
  if (!words.length) return;
  const disp = words.map((w) => ({ ...w, text: f.caps ? w.text.toUpperCase() : w.text }));
  // layout in design px
  const m = scratch('l2_measure', 8, 8).g; setFont(m, f);
  const space = m.measureText(' ').width * (o.space ?? 1) + f.px * (f.track || 0) * 0.5;
  const brk = (o.br || []).map((bi) => disp.findIndex((w) => w.i === bi)).filter((i) => i > 0);
  const rows = layout(m, disp, o.maxW || 860, space, brk);
  const pad = style.pad(o), ex = style.extra ? style.extra(o) : {};
  const lead = f.px * (o.leading || 1.12);
  const asc = f.px * 0.95, desc = f.px * 0.32;
  const cw = Math.max(...rows.map((r) => r.width));
  const bw = cw + pad * 2, bh = pad * 2 + asc + desc + (rows.length - 1) * lead + (ex.top || 0) + (ex.bottom || 0);
  const align = o.align || 'center';
  const items = [];
  rows.forEach((r, ri) => {
    r.x0 = pad + (align === 'left' ? 0 : align === 'right' ? cw - r.width : (cw - r.width) / 2);
    r.y = pad + (ex.top || 0) + asc + ri * lead;
    for (const it of r.items) { it.ax = r.x0 + it.x; it.ay = r.y; it.i = it.w.i; it.st = wordState(it.w, t, o); items.push(it); }
  });
  // where it goes: a quad (corner pin) or a flat anchor
  const zoom = val(o.zoom, lt) ?? 1, pan = val(o.pan, lt) ?? [0, 0];
  const zp = ([px, py]) => [960 + (px - 960) * zoom + pan[0], 540 + (py - 540) * zoom + pan[1]];
  let quad = null, k = (o.scale ?? 1) * zoom;
  if (o.quad) {
    quad = fitInQuad(o.quad.map(zp), bw, bh, o.qAlign || 'center', o.vAlign || 'middle');
    k = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) / bw;
  }
  const res = clamp(S * k, 0.2, 3);
  const pw = Math.ceil(bw * res), ph = Math.ceil(bh * res);
  const B = scratch('l2_block', pw, ph), g = B.g;
  g.setTransform(res, 0, 0, res, 0, 0); setFont(g, f); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (o.plate) {   // a soft dark plate behind the whole block (busy 3D behind the type, e.g. coins flying up through the line)
    g.save(); g.globalAlpha = o.plate * line; g.filter = `blur(${(10 * res).toFixed(1)}px)`; g.fillStyle = o.plateCol || 'rgba(3,3,8,1)';
    g.beginPath(); g.roundRect(pad * 0.6, pad * 0.6, bw - pad * 1.2, bh - pad * 1.2, 18); g.fill(); g.restore();
  }
  if (o.shade) {   // a soft dark ground under the glyphs (bright skies, busy boards): wide translucent strokes
    g.save(); g.lineJoin = 'round'; g.strokeStyle = o.shadeCol || 'rgba(4,6,14,1)';
    for (const it of items) for (const [lw, a] of [[f.px * 0.36, 0.16], [f.px * 0.2, 0.22]]) { g.globalAlpha = a * o.shade * line; g.lineWidth = lw; g.strokeText(it.w.text, it.ax, it.ay); }
    g.restore();
  }
  style.draw({ g, res, rows, items, size: f.px, lead, t, o, L: x, bw, bh, pw, ph, f, line });
  const c = ty.ctx;
  c.save(); c.globalAlpha = 1;
  if (quad) warpQuad(c, B, quad, { sw: pw, sh: ph });
  else {
    let [ax, ay] = zp([o.x ?? 960, o.yLast != null ? o.yLast - (rows.length - 1) * lead * k : (o.y ?? 900)]);   // yLast: anchor the last baseline
    // anchor point inside the block: the first baseline at the aligned edge
    const bx = align === 'left' ? pad : align === 'right' ? bw - pad : bw / 2, by = rows[0].y;
    const sc = k;
    c.translate(ax, ay);
    if (o.rot) c.rotate(o.rot * Math.PI / 180);
    if (o.skew) c.transform(1, 0, Math.tan(o.skew * Math.PI / 180), 1, 0, 0);
    c.scale(sc * (o.mirror ? -1 : 1), sc);
    c.drawImage(B, 0, 0, pw, ph, -bx, -by, bw, bh);   // mirrored: the scale flips it about the anchor
  }
  c.restore();
}
