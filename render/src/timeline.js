// TAKE TWO: THE EDIT (docs/PLAN_TAKE_TWO.md is the brief; take one's edit is src/timelines/take1.js, ?tl=take1).
// Every cut is derived from data/timing.json: a word onset (section, line, word), a shout hit, an analysed event, or a beat /
// eighth snapped from a beat time the plan prints. No cut time is typed in. Each shot carries its `anchor` (what the cut was
// derived from) and `plan` (the time the plan prints), so tools/check_cuts.mjs can prove every cut sits on its onset.
// shot: {id, t0, t1, section, scene, p, look, type, want, method, era, anchor, plan, notes, cues}
//   method: 'seedance_sung' | 'video' | 'still' | 'procedural' | 'reuse' (docs/take2/shots.json, written by tools/shots_json.mjs)
// Generated pictures: scene 't2_plate' p {clip: <shot id>, in, rate, twos, zoom, pan, flipX, style, key, grade} (data/picks2.json),
// 't2_still' p {img: <shot id>, zoom, pan, style}. Until a scene exists the renderer draws the labelled placeholder (shot.want).
// Type is one track of cues laid over the cuts (a word can outlive the cut it was sung in); see the TYPE SYSTEM block.
import { smooth, range, clamp, lerp, easeOutCubic, easeOutExpo, easeInOutCubic } from './util.js';
import { P } from './palette.js';
// scene groups' own looks (modules that import cleanly in node, so tools/shots_json.mjs still loads the edit)
import { CHESS_LOOK, DIVE_LOOK } from './scenes/t2/chess/chess.js';
import { look as NEARMISS_LOOK } from './scenes/t2/data/nearmiss.js';
import { look as COIN_LOOK, treeLook as TREE_LOOK } from './scenes/t2/data/coins.js';
import { look as COUNTER_LOOK } from './scenes/t2/data/counter.js';
import { look as CRT_LOOK } from './scenes/t2/data/crtmatrix.js';
import { look as PETROV_LOOK } from './scenes/t2/data/petrov.js';

// ------------------------------------------------------------------------------------------------ type system (take two)
// HERO    Archivo 900, caps, word-synced slam, fitted inside the centred 4:5 safe area (x 528-1392), upper third by default
// SUB     Open Sans 600, 54 px, sentence case, soft dark shade, lower third (last baseline y 1000), wraps inside the safe area
// NUM     Archivo 900 gold numerals: giant slam at centre, then they collect along the bottom third (the cold open's row)
// CAP     Open Sans 700 tracked caps, 26-30 px: dates, places, the gunpowder gloss, HUD words (small, never a card)
// YEARS   Cormorant italic, cinnabar, small "brushed" years that accumulate along the bottom (verse 2 weapons)
export const SECTION_NAMES = { CO: 'Cold open', V1: 'Verse 1', P1: 'Pre-chorus 1', C1: 'Chorus 1', X1: 'Post-chorus 1', V2: 'Verse 2', P2: 'Pre-chorus 2', C2: 'Chorus 2', X2: 'Post-chorus 2', BR: 'Bridge', BU: 'Build', DR: 'Drop', OU: 'Outro' };
export const SAFE = { x0: 528, x1: 1392, w: 864, cx: 960 };
const GOLD_HOT = [1.0, 0.97, 0.9];
const CINNABAR = [0.78, 0.13, 0.08];
const HERO = { font: 'Archivo', weight: 900, stretch: '100%', track: 0.0 };
const SUBST = { font: 'OpenSans', weight: 600, size: 54, track: 0.005 };
const CAPST = { font: 'OpenSans', weight: 700, size: 28, track: 0.22 };

const clean = (s) => String(s).replace(/[()!.,;:?]/g, '').replace(/\s+/g, ' ').trim();
const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// HERO: c = {rows: [{words: [{text, t}], k (size factor)}], size, y (first baseline), lead, align ('center'|'left'), color, hot,
//            t0, t1, out, mode ('slam'|'fade'), font overrides (stretch, weight, track), glow, shade}
function drawHero(ty, t, c) {
  const fade = 1 - smooth(range(t, c.t1 - (c.out ?? 0.15), c.t1));
  if (fade <= 0) return;
  const cx = ty.ctx;
  const base = { ...HERO, ...(c.font || {}) };
  // one fit for the whole block (rows keep their relative sizes), so a card never changes size as its words arrive
  const widthAt = (row, size) => { const st = { ...base, size }; const sp = ty.measure(' ', st) * 0.9; return row.words.reduce((s, w, i) => s + ty.measure(w.text, st) + (i ? sp : 0), 0); };
  const fit = Math.min(1, ...c.rows.map((row) => (c.maxW || SAFE.w) / Math.max(1, widthAt(row, (c.size || 160) * (row.k ?? 1)))));
  const sizes = c.rows.map((row) => (c.size || 160) * (row.k ?? 1) * fit);
  let y = c.y ?? 300;
  c.rows.forEach((row, ri) => {
    const size = sizes[ri];
    const st = { ...base, size };
    const sp = ty.measure(' ', st) * 0.9;
    const wsum = widthAt(row, size);
    let x = c.align === 'left' ? SAFE.x0 : (c.x ?? SAFE.cx) - wsum / 2;
    for (const w of row.words) {
      const ww = ty.measure(w.text, st);
      const k = clamp((t - w.t + 0.02) / (c.mode === 'fade' ? 0.5 : 0.12));
      if (k > 0) {
        const tH = c.hotT ?? w.t;   // hotT: the title is already up (frame 0) and lands later (hot flash + a small pop)
        const hot = t < tH - 1e-4 ? 0 : 1 - easeOutCubic(range(t, tH, tH + 0.3));
        const col = mixc(c.color || P.cream, c.hot || P.goldPale, hot);
        const sc = c.mode === 'fade' ? (c.hotT != null && t >= c.hotT ? 1 + 0.05 * Math.exp(-(t - c.hotT) / 0.14) : 1) : lerp(1.18, 1, easeOutExpo(k));
        cx.save(); cx.translate(x + ww / 2, y - size * 0.35); cx.scale(sc, sc); cx.translate(-(x + ww / 2), -(y - size * 0.35));
        ty.text(w.text, x, y, { ...st, color: col, alpha: (c.mode === 'fade' ? easeOutCubic(k) : k) * fade * (c.alpha ?? 1), glow: c.glow ?? 3, glowColor: c.glowColor, shade: c.shade ?? 0.55 });
        cx.restore();
      }
      x += ww + sp;
    }
    if (ri + 1 < sizes.length) y += (size * 0.22 + sizes[ri + 1] * 0.8) * (c.lead ?? 1);   // baseline to baseline: gap + next cap height
  });
}

// SUB: c = {words: [{text, t}], t0, t1, y (last baseline, 1000)}. Layout is fixed for the whole cue; words fade in as sung.
function drawSub(ty, t, c) {
  const fade = smooth(range(t, c.t0 - 0.05, c.t0 + 0.1)) * (1 - smooth(range(t, c.t1 - 0.2, c.t1)));
  if (fade <= 0) return;
  const st = { ...SUBST, size: c.size || SUBST.size };
  const space = ty.measure(' ', st);
  const rows = [[]]; let rw = 0;
  for (const w of c.words) {
    const wd = ty.measure(w.text, st);
    if (rw > 0 && rw + space + wd > SAFE.w) { rows.push([]); rw = 0; }
    rows[rows.length - 1].push({ ...w, wd }); rw += (rw ? space : 0) + wd;
  }
  const lead = st.size * 1.2;
  const yLast = c.y ?? 1005;
  rows.forEach((row, ri) => {
    const rowW = row.reduce((s, w, i) => s + w.wd + (i ? space : 0), 0);
    let x = SAFE.cx - rowW / 2;
    const y = yLast - (rows.length - 1 - ri) * lead;
    for (const w of row) {
      const a = easeOutCubic(range(t, w.t - 0.06, w.t + 0.14));
      if (a > 0) ty.text(w.text, x, y, { ...st, color: c.color || P.cream, alpha: a * fade, shade: 0.9 });
      x += w.wd + space;
    }
  });
}

// NUM row: c = {items: [{n, t, slot, giant, out, hold, rev, lit, settled}], slots, y (row centre), size (row), giantSize, t1, hold, fly}
function drawCount(ty, t, c) {
  const fade = 1 - smooth(range(t, c.t1 - 0.3, c.t1));
  if (fade <= 0) return;
  const N = c.slots, gap = c.gap || 140;
  const sx = (i) => SAFE.cx + (i - (N - 1) / 2) * gap;
  const hold = c.hold ?? 0.3, fly = c.fly ?? 0.22;
  const st = { font: 'Archivo', weight: 900, stretch: '100%', align: 'center', base: 'middle' };
  // which item currently owns each slot (a later item on the same slot replaces the earlier one)
  const owner = {};
  c.items.forEach((it, i) => { if (t >= it.t - (it.settled || it.rev ? 0 : 0.02) && !(it.out != null && t >= it.out)) owner[it.slot] = i; });
  // scrim: a soft dark ground under each numeral, so lines drawn behind (the graph's edges) dim to ~30% inside its box (polish 4)
  const ground = (n, x, y, s, a) => {
    if (!c.scrim || a <= 0) return;
    const cx = ty.ctx, rx = s * (0.42 + 0.3 * String(n).length), ry = s * 0.7;
    cx.save(); cx.translate(x, y); cx.scale(rx / ry, 1);
    const g = cx.createRadialGradient(0, 0, ry * 0.2, 0, 0, ry);
    g.addColorStop(0, `rgba(3,4,10,${0.78 * c.scrim * a})`); g.addColorStop(0.75, `rgba(3,4,10,${0.7 * c.scrim * a})`); g.addColorStop(1, 'rgba(3,4,10,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, ry, 0, Math.PI * 2); cx.fill(); cx.restore();
  };
  c.items.forEach((it, i) => {
    if (owner[it.slot] !== i) return;
    const u = t - it.t;
    // it.rev (s): the numeral rewinds out of its row slot back up to giant at centre, then holds there (it.hold) lit (it.lit, 0..1)
    // it.settled: already sitting in the row (carried over), no pop and no hot flash
    const r0 = it.rev || 0;
    const hot = it.settled ? 0 : Math.max(it.lit ?? 0, 1 - easeOutCubic(range(u, r0, r0 + 0.35)));
    const col = mixc(c.color || P.gold, GOLD_HOT, hot);
    if (it.giant && u < (it.hold ?? hold) + fly) {
      const k = r0 ? 1 : clamp((u + 0.02) / 0.16);
      const v = r0 ? 1 - easeInOutCubic(range(u, 0, r0)) : easeInOutCubic(range(u, hold, hold + fly));
      const s = lerp(c.giantSize || 600, c.size || 120, v) * lerp(1.25, 1, easeOutExpo(k));
      ground(it.n, lerp(SAFE.cx, sx(it.slot), v), lerp(c.giantY ?? 540, c.y ?? 880, v), s, k * fade);
      ty.text(String(it.n), lerp(SAFE.cx, sx(it.slot), v), lerp(c.giantY ?? 540, c.y ?? 880, v), { ...st, size: s, color: col, alpha: k * fade, glow: 4, shade: 0.5 });
    } else {
      const k = it.giant || it.settled ? 1 : easeOutExpo(clamp((u + 0.02) / 0.14));
      const s = (c.size || 120) * lerp(1.3, 1, k);
      ground(it.n, sx(it.slot), c.y ?? 880, s, fade * (it.giant ? 1 : k));
      ty.text(String(it.n), sx(it.slot), c.y ?? 880, { ...st, size: s, color: col, alpha: fade * (it.giant ? 1 : k), glow: 3, shade: 0.5 });
    }
  });
}

// CAP lines: c = {lines: [{text, t, size, color}], x, y, lead, t1, align}
function drawCaps(ty, t, c) {
  const fade = 1 - smooth(range(t, c.t1 - 0.2, c.t1));
  if (c.band && fade > 0) {   // a soft dark plate behind the lines, so small caps read over paper as well as night
    const a0 = easeOutCubic(range(t, c.lines[0].t - 0.03, c.lines[0].t + 0.15)) * fade;
    const w = Math.max(...c.lines.map((ln) => ty.measure(ln.text, { ...CAPST, size: ln.size || CAPST.size }))) + 64;
    const ms = Math.max(...c.lines.map((ln) => ln.size || CAPST.size));   // the plate scales with type over 30 px
    const y0 = (c.y ?? 960) - (ms > 30 ? ms * 1.5 : 42), h = (c.lines.length - 1) * (c.lead ?? 44) + (ms > 30 ? ms * 2.2 : 62);
    const cx = ty.ctx; cx.save(); cx.globalAlpha = 0.62 * a0; cx.fillStyle = 'rgb(5,7,13)';
    cx.beginPath(); cx.roundRect((c.x ?? SAFE.cx) - w / 2, y0, w, h, 10); cx.fill(); cx.restore();
  }
  c.lines.forEach((ln, i) => {
    const a = easeOutCubic(range(t, ln.t - 0.03, ln.t + 0.15)) * fade;
    if (a > 0) ty.text(ln.text, c.x ?? SAFE.cx, (c.y ?? 960) + i * (c.lead ?? 44), { ...CAPST, size: ln.size || CAPST.size, color: ln.color || c.color || P.cream, align: c.align || 'center', alpha: a, shade: c.shade ?? 0.85, glow: ln.glow || 0 });
  });
}

// YEARS: c = {items: [{text, t}], y, t1}: small brushed years accumulating left to right, centred in the safe area
function drawYears(ty, t, c) {
  const fade = 1 - smooth(range(t, c.t1 - 0.2, c.t1));
  const st = { font: 'CormorantI', weight: 600, size: 50, track: 0.02 };
  const sep = '  ·  ';
  const widths = c.items.map((it) => ty.measure(it.text, st));
  const sw = ty.measure(sep, st);
  const total = widths.reduce((s, w) => s + w, 0) + sw * (c.items.length - 1);
  let x = SAFE.cx - total / 2;
  c.items.forEach((it, i) => {
    const a = easeOutCubic(range(t, it.t - 0.02, it.t + 0.12)) * fade;
    const hot = 1 - easeOutCubic(range(t, it.t, it.t + 0.4));
    if (a > 0) {
      ty.text(it.text, x, c.y ?? 1000, { ...st, color: mixc(CINNABAR, [1, 0.55, 0.3], hot), alpha: a, shade: 0.35 });
      if (i) ty.text('·', x - sw / 2, c.y ?? 1000, { ...st, align: 'center', color: CINNABAR, alpha: a * 0.8 });
    }
    x += widths[i] + sw;
  });
}

// ------------------------------------------------------------------------------------------------ looks (post per era)
const LK = {
  photo: { bloom: 0.35, bloomThreshold: 0.9, halation: 0.12, vignette: 0.3, grain: 0.03 },
  night: { bloom: 0.65, bloomThreshold: 0.75, halation: 0.35, halCol: [1.0, 0.55, 0.2], vignette: 0.35, grain: 0.035 },
  room: { bloom: 0.5, bloomThreshold: 0.8, halation: 0.2, vignette: 0.35, grain: 0.025 },
  blueprint: { bloom: 0.45, bloomThreshold: 0.85, halation: 0.1, vignette: 0.3, grain: 0.03 },
  gouache: { bloom: 0.3, bloomThreshold: 0.9, vignette: 0.25, grain: 0.03 },
  riso: { bloom: 0.25, bloomThreshold: 0.9, vignette: 0.15, grain: 0.045 },
  ink: { bloom: 0.15, bloomThreshold: 0.95, vignette: 0.25, grain: 0.03, typeGlow: 0.1 },
  inkProc: { tonemap: 0, bloom: 0.45, bloomThreshold: 1.15, halation: 0.2, halCol: [1.0, 0.35, 0.15], streak: 0, grain: 0.018, vignette: 0.18, typeGlow: 0 },   // history group's ink scenes (rice paper, display-referred)
  oil: { bloom: 0.3, bloomThreshold: 0.8, halation: 0.45, halCol: [1.0, 0.15, 0.06], vignette: 0.5, grain: 0.04 },
  newsprint: { bloom: 0.12, bloomThreshold: 0.95, vignette: 0.2, grain: 0.045, typeGlow: 0.1 },
  gold: { bloom: 0.6, bloomThreshold: 0.8, halation: 0.15, vignette: 0.25, grain: 0.02 },
  anime: { bloom: 0.5, bloomThreshold: 0.8, vignette: 0.25, grain: 0.02 },
  poster: { bloom: 0.12, bloomThreshold: 0.95, vignette: 0.2, grain: 0.045, typeGlow: 0.1 },
  posterProc: { tonemap: 0, bloom: 0.2, bloomThreshold: 1.2, halation: 0.1, streak: 0, grain: 0.02, vignette: 0.12, typeGlow: 0 },   // t2_poster_morph / t2_arkhipov
  war: { bloom: 0.75, bloomThreshold: 0.7, halation: 0.35, halCol: [1.0, 0.12, 0.06], vignette: 0.35, grain: 0.03 },
  mirror: { bloom: 0.3, bloomThreshold: 0.9, vignette: 0.05, grain: 0.015 },
  light: { bloom: 0.8, bloomThreshold: 0.7, halation: 0.2, streak: 0.3, vignette: 0.3, grain: 0.02 },
  diagram: { bloom: 0.6, bloomThreshold: 0.8, halation: 0.15, vignette: 0.25, grain: 0.02 },
  crt: { bloom: 0.7, bloomThreshold: 0.65, halation: 0.3, halCol: [0.5, 0.8, 1.0], vignette: 0.45, grain: 0.04 },
};

// the plan's art-style rows (docs/PLAN_TAKE_TWO.md, "Art style by era")
export const ERA = {
  spiral: 'Cold open spirals: macro nature photography, true colour; natural colour, gold numerals on black; spiral centre locked at frame centre',
  lights: 'Human lights: night photography, then Earth from orbit; sodium orange on black',
  frames: 'Tom Gauld frames: two identical framed pictures on cream paper, told apart only by caption plaques in the sides\' colours',
  v1: 'Verse 1, deep time to spaceflight: painted plates with white blueprint linework drawn over them; sepia and cyanotype blue; schematics draw on with the snare',
  flood: 'Okavango flood: nature-documentary frames painted over in gouache; greens, silver water',
  signal: 'Space and signals: Rare Earth "signal print" (risograph inks, halftone, slight misregistration); Klein blue, beacon orange, pale blue; Echo in fluo pink and mint',
  ink: 'Gunpowder: Chinese ink wash with fine-line figures, brushed characters, a red seal; ink black, rice paper, cinnabar',
  oil: 'Petrov: Russian realist oil painting, one figure, a dark room, light from the screen; umber and CRT red',
  newsprint: 'Near-miss list, coins: teletype on newsprint, then engraved gold coins; newsprint grey, gold',
  chess: 'Chess: anime battle (speed lines, impact frames, smash zooms); full colour; the board stays legible when paused',
  poster: 'Chess into Arkhipov: Suprematist shapes (black square, red wedge) assembling into a Soviet poster, printed as newsprint halftone; red, black, cream',
  war: 'First strike and rewind: the Rare Earth war scene with a VHS rewind pass; red on the night side',
  mirror: 'Mirror: white void; each Jade keeps her own palette (signal-print inks on one side, cool teal and silver on the other)',
  light: 'Contact graph, outro: pure light on black (the Rare Earth finale); gold and pale blue',
  room: 'Control rooms (no era row): Rare Earth control room / its mirror with cooler fluorescent light; anime cel figures on twos',
  crt: '1999 bedroom CRTs running SETI@home (no era row): dark rooms, screen glow',
};

// FISCHER-TAL, Leipzig 1960, 42 plies (plan, "The chess game")
export const PLIES = ('e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Ba5 b4 cxd4 Qg4 Ne7 bxa5 dxc3 Qxg7 Rg8 Qxh7 Nbc6 Nf3 Qc7 Bb5 Bd7 O-O O-O-O ' +
  'Bg5 Nxe5 Nxe5 Bxb5 Nxf7 Bxf1 Nxd8 Rxg5 Nxe6 Rxg2+ Kh1 Qe5 Rxf1 Qxe6 Kxg2 Qg4+').split(' ');

// near-miss years (plan, "On-screen list"), for the counter's resets; the last is the 15 Sep 2026 entry
const NEAR_MISS_YEARS = [1950, 1957, 1958, 1960, 1961, 1962, 1962, 1962, 1962, 1966, 1967, 1968, 1968, 1968, 1973, 1979, 1979, 1980, 1980, 1980, 1983, 1983, 1995, 2007, 2010, 2022, 2025, 2025, 2026, 2026];

export function buildTimeline(A) {
  const T = A.d;
  const num = (x) => (typeof x === 'number' ? x : x && (x.t ?? x.time ?? x.start));
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const pt = (s) => { const [m, x] = String(s).split(':'); return Number(m) * 60 + Number(x); };   // plan time 'm:ss.ss' -> s

  // ---------------------------------------------------------------------------------------------- anchors (from timing.json)
  const SECN = { CO: 'Intro', V1: 'Verse 1', P1: 'Pre-Chorus 1', C1: 'Chorus 1', X1: 'Post-Chorus 1', V2: 'Verse 2', P2: 'Pre-Chorus 2', C2: 'Chorus 2', X2: 'Post-Chorus 2', BR: 'Bridge', BU: 'Build', DR: 'Drop', OU: 'Outro' };
  const LN = (sec, k) => { const l = A.lines.filter((x) => x.section === (SECN[sec] || sec))[k]; if (!l) throw new Error(`no line ${sec}[${k}]`); return l; };
  // word onset by section line + word (index or text; nth occurrence)
  const wd = (sec, k, w = 0, nth = 0) => {
    const L = LN(sec, k);
    let j = w;
    if (typeof w === 'string') {
      const m = L.words.map((x, i) => [norm(x.w), i]).filter(([s]) => s === norm(w));
      if (!m[nth]) throw new Error(`no word "${w}"#${nth} in ${sec}[${k}] "${L.text}"`);
      j = m[nth][1];
    }
    const W = L.words[j];
    return { t: W.t, kind: 'word', ref: `${SECN[sec] || sec}[${k}] "${clean(W.w)}"` };
  };
  const nearest = (arr, t) => arr.reduce((b, x) => (Math.abs(x - t) < Math.abs(b - t) ? x : b), arr[0]);
  const BEATS = A.beats;
  const EIGHTHS = (T.eighths || []).map(num);
  const SIXTEENTHS = EIGHTHS.flatMap((e, i) => (i + 1 < EIGHTHS.length ? [e, (e + EIGHTHS[i + 1]) / 2] : [e]));
  const beat = (plan) => ({ t: nearest(BEATS, pt(plan)), kind: 'beat', ref: `beat nearest ${plan}` });
  const eighth = (plan) => ({ t: nearest(EIGHTHS, pt(plan)), kind: 'eighth', ref: `eighth nearest ${plan}` });
  const beatsAfter = (t, n) => BEATS.filter((b) => b > t + 0.02).slice(0, n);
  const beatK = (t, k, why) => ({ t: beatsAfter(t, k + 1)[k], kind: 'beat', ref: why });
  const barAfter = (t, why) => ({ t: A.bars.find((b) => b > t + 0.02), kind: 'bar', ref: why });
  // shout hits (raw timing.json hits: t = word onset; the AudioMap's hit.t is the vowel attack)
  const HITS = T.hits || [];
  const hit = (kind, i) => { const h = HITS.filter((x) => x.kind === kind)[i]; if (!h) throw new Error(`no hit ${kind}[${i}]`); return { t: h.t, kind: 'hit', ref: `hit ${kind}[${i}] "${h.word}"` }; };
  const hitWord = (word) => { const h = HITS.find((x) => x.word === word); return { t: h.t, kind: 'hit', ref: `hit "${word}"` }; };
  const ev = (type, re, after = 0) => { const e = (T.events || []).find((x) => x.type === type && x.t >= after && (!re || re.test(x.desc || ''))); if (!e) throw new Error(`no event ${type} ${re}`); return { t: e.t, kind: 'event', ref: `event ${type} @${e.t} (${(e.desc || '').slice(0, 40)})` }; };
  const secStart = (sec) => ({ t: A.sections.find((s) => s.name === SECN[sec]).start, kind: 'section', ref: `${SECN[sec]} start` });
  const START = { t: 0, kind: 'start', ref: 'file start' };

  // ---------------------------------------------------------------------------------------------- shot builder
  const shots = [];
  const counters = {};
  let SEC = 'CO';
  const section = (s) => { SEC = s; };
  const subst = (x, id) => {
    if (typeof x === 'string' && x[0] === '@') return id + x.slice(1);
    if (Array.isArray(x)) return x.map((y) => subst(y, id));
    if (x && typeof x === 'object' && !(x instanceof Function)) { const o = {}; for (const k in x) o[k] = subst(x[k], id); return o; }
    return x;
  };
  // S(planTime | null, anchor, {scene, p, want, method, era, look, notes})
  // spec.sub ('b', 'c', ...): an insert cut into the previous numbered shot keeps that number plus a letter, so every later id
  // (picks, keyframes and takes are keyed by shot id) stays unchanged
  const S = (plan, anchor, spec) => {
    if (!spec.sub) counters[SEC] = (counters[SEC] || 0) + 1;
    const id = `${SEC}${String(counters[SEC]).padStart(2, '0')}${spec.sub || ''}`;
    if (!(anchor && Number.isFinite(anchor.t))) throw new Error(`shot ${id}: bad anchor`);
    const s = { id, section: SEC, t0: anchor.t, t1: null, anchor, plan, ...spec, p: subst(spec.p || {}, id) };
    shots.push(s); return s;
  };
  // reserve(n): skip n shot numbers, so merging shots that one continuous scene draws keeps every later id (picks, keyframes
  // and takes are keyed by shot id) unchanged
  const reserve = (n) => { counters[SEC] = (counters[SEC] || 0) + n; };
  const nextId = (k = 0) => `${SEC}${String((counters[SEC] || 0) + 1 + k).padStart(2, '0')}`;   // the id the k-th next S() gets
  const plate = (p = {}) => ({ scene: 't2_plate', p: { clip: '@', ...p } });
  const still = (p = {}) => ({ scene: 't2_still', p: { img: '@', ...p } });
  // a plate base that is not there yet falls back to the labelled placeholder (t2_first), so the overlays still draw over it
  const over = (base, ...layers) => ({ scene: 'multi', p: { layers: [(base.scene === 't2_plate' || base.scene === 't2_still') ? { scene: 't2_first', p: { chain: [base, { scene: 'placeholder' }] } } : base, ...layers] } });
  // RM(k, e): teal-tips' room (right half) graded to Jade's (left): the B takes come out flatter under the cool fluorescents, so they
  // get the contrast and exposure that match the left half's luma mean and spread (measured per split on the polish-pass stills);
  // the cooler tint is kept (plan: her room is Jade's flipped, with cooler light)
  const RM = (contrast, exposure) => ({ grade: { contrast, exposure } });
  // adversary-arc pass (28 Oct, the plan "Hold Fire: the adversary arc"): the two halves are two rooms that do not match. A wall
  // (t2_split bar, 32 px, faint scanlines) replaces the 2 px line, and the split grade (t2_split tone) keeps Jade's half warm (her
  // amber lamp) and turns teal-tips' cold (blue-white fluorescent, the orange of her jacket muted, deeper blacks). This replaces RM's
  // matching on the splits it is used on. COLD is also the cool cast on teal-tips' solo shots (as a plate grade).
  const WARM = { exposure: 1.02, contrast: 1.04, sat: 1.06, tint: [1.07, 1.0, 0.88] };
  const COLD = { exposure: 0.86, contrast: 1.14, sat: 0.55, tint: [0.8, 0.94, 1.16], lift: [-0.012, -0.004, 0.012] };
  const WALL = { bar: { w: 32, col: [0, 0, 0], tex: 1 }, tone: { L: WARM, R: COLD } };
  // COOL: the milder cool cast on teal-tips' solo shots (item 6), so colour tells the two apart where the jacket patch cannot
  const COOL = { contrast: 1.06, sat: 0.8, tint: [0.88, 0.96, 1.1], lift: [-0.006, 0, 0.008] };
  // each one's monitor tracks the other as an unknown contact (t2_contact), on the C103 keyframe crop's top monitors (C103 / C203
  // share it): Jade's (left edge) points right, toward the wall; teal-tips' (right edge) is the same display mirrored, pointing left
  const SCREENS = { L: [[12, 152], [270, 196], [216, 385], [0, 372]], R: [[1652, 192], [1930, 136], [1930, 377], [1705, 388]] };
  // part two ("our and their", plan A/B): one label pair per room split, on the displays. Each side's top monitor (the contact) names
  // the other's station, its lower monitor names its own: the same two things, opposite names across the wall, colour = whose thing
  const LOWER = { L: [[0, 415], [205, 422], [200, 632], [0, 628]], R: [[1718, 412], [1920, 405], [1920, 628], [1722, 630]] };
  const TOPV = { L: [[12, 152], [270, 196], [216, 385], [0, 372]], R: [[1652, 192], [1920, 140], [1920, 378], [1705, 388]] };
  const roomPair = (ours, theirs, t0, t1) => ({ scene: 't2_labels', p: { labels: [
    { lines: ['THEIR', ...theirs], side: 'teal', quad: TOPV.L, t0, t1 }, { lines: ['OUR', ...ours], side: 'jade', quad: LOWER.L, t0, t1 },
    { lines: ['THEIR', ...theirs], side: 'jade', quad: TOPV.R, t0, t1 }, { lines: ['OUR', ...ours], side: 'teal', quad: LOWER.R, t0, t1 }] } });
  // C103 (Jade, 29 Oct): the matched posters' graph on each one's displays, her own on top as OUR RESOLVE, the other's below it
  // as THEIR PROPAGANDA (colour = whose poster, as everywhere in part two); the same from teal-tips' side, colours swapped
  const posterPair = (t0, t1) => ({ scene: 't2_labels', p: { labels: [
    { lines: ['OUR', 'RESOLVE'], side: 'jade', graph: 'jade', quad: TOPV.L, t0, t1 }, { lines: ['THEIR', 'PROPAGANDA'], side: 'teal', graph: 'teal', quad: LOWER.L, t0, t1 },
    { lines: ['OUR', 'RESOLVE'], side: 'teal', graph: 'teal', quad: TOPV.R, t0, t1 }, { lines: ['THEIR', 'PROPAGANDA'], side: 'jade', graph: 'jade', quad: LOWER.R, t0, t1 }] } });
  const contacts = (o = {}) => ({ scene: 't2_contact', p: { screens: [
    { quad: SCREENS.L, brg: '090', ...o }, { quad: SCREENS.R, brg: '090', mirror: true, cold: true, ...o }] } });
  const split = (l = {}, r = {}, line = 2, extra = {}) => ({ scene: 't2_split', p: { left: { scene: 't2_plate', p: { clip: '@L', ...l } }, right: { scene: 't2_plate', p: { clip: '@R', ...r } }, x: 960, line, ...extra } });
  // Jade (v3, 0:57.4): in the splits each Jade sings one phrase: Jade (left) "but if you are", teal-tips (right) "I'm counting on you";
  // the half that isn't singing listens, mouth closed (a Seedance 2.0 listening plate, <ID>L_LS / <ID>R_LS, on the same keyframe;
  // teal-tips' is generated unflipped and flipped by its pick). Both halves cut on the same film frame, the first at or after the
  // onset of "I'm". The listening plates were generated to meet the sung takes there (the left one starts on the sung drawing at the
  // cut, the right one ends on it), but those ends are mid-word (her mouth closing / opening into "I'm"), so the edit uses only the
  // shut-mouth stretch, LS[id] (clip s): the left plate from `from` (lips just closed) on the song clock; the right plate's frames
  // 0..`to` (lips still closed) stretched over the window up to the cut (rate ~0.85: breathing, a blink). The pose is the same, so
  // each half's cut reads as the mouth starting / stopping, on the word. Both on twos like the sung picks (hold2).
  const hold2 = (t) => { let ff = Math.floor(t * 24 + 1e-3); ff -= ((ff % 2) + 2) % 2; return ff / 24; };
  const onFrame = (t) => Math.ceil(t * 24 - 1e-6) / 24;
  const LS = { C103: { from: 14 / 24, to: 78 / 24 }, C203: { from: 10 / 24, to: 78 / 24 } };
  const phraseSplit = (id, cut, l = {}, r = {}, extra = {}) => {
    const c = onFrame(cut), q = LS[id];   // c - 1e-4: a still asked for at c rounded down still shows the cut
    const rightAt = (t, lt) => { const a = hold2(t - lt), b = hold2(c - 1 / 24); return q.to * clamp((hold2(t) - a) / Math.max(1e-3, b - a)); };
    return { scene: 't2_split', p: { x: 960, line: 2, ...extra,
      left: { scene: 't2_plate', clips: [{ clip: `${id}L` }, { clip: `${id}L_LS` }],
        p: (t) => (t < c - 1e-4 ? { clip: `${id}L`, ...l } : { clip: `${id}L_LS`, at: q.from + hold2(t) - hold2(c), ...l }) },
      right: { scene: 't2_plate', clips: [{ clip: `${id}R_LS` }, { clip: `${id}R` }],
        p: (t, lt) => (t < c - 1e-4 ? { clip: `${id}R_LS`, at: rightAt(t, lt), ...r } : { clip: `${id}R`, ...r }) } } };
  };
  const flash = (col = [1, 0.86, 0.6], k = 0.6, dec = 0.12) => (t, lt) => ({ flash: Math.exp(-Math.max(0, lt) / dec) * k, flashCol: col });
  const withLook = (L, f) => (t, lt, ctx) => ({ ...L, ...f(t, lt, ctx) });

  // ---------------------------------------------------------------------------------------------- type cues
  const cues = [];
  const cue = (c) => { cues.push(c); return c; };
  const lineWords = (sec, k, from = 0, to) => LN(sec, k).words.slice(from, to).map((w) => ({ text: clean(w.w), t: w.t }));
  const caps = (ws) => ws.map((w) => ({ ...w, text: w.text.toUpperCase() }));
  // hero from words; rows = word counts per row
  const hero = (words, o = {}) => {
    const rows = []; let i = 0;
    for (const n of (o.rows || [words.length])) { rows.push({ words: words.slice(i, i + n), k: (o.ks || [])[rows.length] ?? 1 }); i += n; }
    const t0 = words[0].t;
    const minT1 = t0 + Math.max(0.6, words.length / 3);
    return cue({ kind: 'hero', label: words.map((w) => w.text).join(' '), t0, draw: drawHero, ...o, t1: Math.max(o.t1 ?? minT1, minT1), rows });
  };
  // subtitle for a sung line: up from its first word to the next subtitle / given end, never shorter than its words need
  const sub = (sec, k, o = {}) => {
    const words = lineWords(sec, k, o.from, o.to);
    const L = LN(sec, k);
    const t0 = words[0].t;
    const t1 = Math.max(o.t1 ?? L.end + 0.5, t0 + Math.max(0.6, words.length / 3));
    return cue({ ...o, kind: 'sub', label: words.map((w) => w.text).join(' '), t0, t1: o.cap ? Math.min(t1, o.cap) : t1, words, draw: drawSub });
  };

  // ============================================================================================== COLD OPEN (0 to 13.05)
  section('CO');
  const subHit = ev('sub_hit', null, 0);
  const intro0 = LN('CO', 0), intro1 = LN('CO', 1);
  // the pupil sits at (960, 523) in the CO01 keyframe (media/kf2/CO01_nbp_v1.jpg); the seeds follow the plate's push
  const EYE = { zoom: 1.0, push: 0.02 }, PUPIL = [960, 523];
  const coEye = S('0:00.0', START, { ...over(plate(EYE), { scene: 't2_seed_spiral', p: { ...EYE, center: PUPIL, R: 268, t0: subHit.t, settle: intro0.t - 0.4 } }),
    method: 'video', era: ERA.spiral, look: LK.photo,
    want: "Extreme close-up of Jade's eye in the dark, pale-blue dot catchlight; gold seeds drift into the iris and settle into a sunflower spiral; slow push in (thumbnail + loop point)" });
  const spiral = (want, extra = {}) => ({ ...plate({ zoom: 1.0, ...extra }), method: 'video', era: ERA.spiral, look: LK.photo, want: `${want}; spiral centre locked at frame centre` });
  const co = [];
  co.push(S('0:02.80', wd('CO', 0, 'one', 0), spiral('Romanesco, a single floret, macro; its spiral centre exactly where the pupil was')));
  co.push(S('0:03.44', wd('CO', 0, 'one', 1), spiral('Pull back to the whole romanesco head: the floret was one of its florets')));
  co.push(S('0:04.08', wd('CO', 0, 'two'), spiral('Artichoke from above (real counts: 5 and 8 bract spirals)')));
  co.push(S('0:04.72', wd('CO', 0, 'three'), spiral('Sunflower head (34/55 or 55/89 spirals if traced)')));
  // the aloe's five spiral rows (the one real count in the run); centre locked at frame centre like every spiral cut
  co.push(S('0:05.30', wd('CO', 0, 'five'), { ...over(plate(), { scene: 't2_spiral_trace', p: { count: 5, hand: 1, center: [960, 540], r0: 60, r1: 480, turns: 0.42, t0: wd('CO', 0, 'five').t + 0.04, dur: 0.42 } }), method: 'video', era: ERA.spiral, look: LK.photo,
    want: 'Spiral aloe (Aloe polyphylla) from above; its five spiral rows of leaves trace in gold (the one real count)' }));
  co.push(S('0:06.00', wd('CO', 0, 'eight', 0), spiral('Hurricane from orbit (log spiral: no golden-rectangle overlay)')));
  // Jade's note (26 Oct): the doubled "eight" is a stylistic echo: no second numeral; the galaxy cuts in on the beat after the echo
  const echo1 = wd('CO', 0, 'eight', 1);
  const coGal = S(null, beatK(echo1.t, 0, 'beat after the echoed "eight" (Jade\'s note: cut on the beat, no numeral)'), { ...spiral('Spiral galaxy, face on (if ESA/Hubble: visible "ESA/Hubble" credit); no numeral (the echoed "eight")'),
    notes: 'plan prints 0:06.63 (the echo); Jade: cut on the next beat instead' });
  co.push(coGal);
  const redT = eighth('0:07.0');
  S('0:07.0', redT, { scene: 't2_plate', p: { clip: coGal.id, in: redT.t - coGal.t0, grade: { red: 1 } }, method: 'video', era: ERA.spiral,
    look: (t, lt) => ({ ...LK.photo, flash: 0.75, flashCol: [1.0, 0.12, 0.05], exposure: 1.2 }),
    want: 'The galaxy flashes red (Rare Earth self-destruct look)', notes: 'continues the galaxy clip; red grade + red flash' });
  const sub716 = ev('sub_hit', null, 7.0);
  const barT = A.bars.find((b) => b > sub716.t);             // bar 4 downbeat
  // polish 4: the rewind runs two more 16ths past the bar line, back to the first spiral (all seven clips)
  // Jade's note (0:08.8): count 2 has no first "one", so the match's "One" must read as the SECOND 1 ("like we rewound but not all
  // the way"): the rewind stops on the first spiral (CO02, the floret) instead of going to black. CO02's plate is 1 s, scrubbed back
  // at 6x from its last frame it reaches frame 0 (the frame of the 2.80 cut) on the 16th where black used to start (stopT); from
  // there the tape is paused on it (VHS look, the rewind bands down to a pause wobble) with its giant gold 1 lit, until the match
  const stopT = SIXTEENTHS.filter((x) => x > barT + 0.02)[1];
  const rewSteps = SIXTEENTHS.filter((x) => x >= sub716.t - 0.01 && x < stopT);
  const matchT = wd('CO', 1, 'one');
  const rewP = { clips: co.slice().reverse().map((s) => s.id), steps: rewSteps };
  S('0:07.16', sub716, { scene: 't2_vhs_rewind', p: (t) => ({ ...rewP, rewind: t < stopT ? 1 : 0.12 }), method: 'procedural', era: ERA.spiral,
    look: (t, lt) => ({ ...LK.photo, flash: 0.5 * Math.exp(-lt / 0.09), flashCol: [1.0, 0.12, 0.05] }),   // the red flash's tail runs into the rewind
    want: 'The count scrubs backward in VHS rewind lines, one spiral per 16th (galaxy to romanesco), and stops on the first spiral: the floret paused under the VHS look, its giant gold 1 lit, until the match',
    notes: 'no text: the red does the work. Jade (0:08.8): the rewind stops on the first 1 (was: down to black), so the match reads as the second 1' });
  const lightShot = (want, extra = {}) => ({ ...plate(extra), method: 'video', era: ERA.lights, look: LK.night, want });
  S('0:08.60', matchT, lightShot('Two hands strike a match in the dark'));
  S('0:09.23', wd('CO', 1, 'two'), lightShot('A lighthouse beam turning through fog'));
  S('0:09.86', wd('CO', 1, 'three'), lightShot('A city grid at night through a plane window'));
  // the plate if one is picked (NASA night imagery is public domain), else t2_earth_night's ISS view
  S('0:10.44', wd('CO', 1, 'five'), { scene: 't2_first', p: { chain: [{ scene: 't2_plate', p: { clip: '@' } }, { scene: 't2_earth_night', p: { view: 'iss' } }] }, method: 'video', era: ERA.lights, look: LK.night,
    want: "Earth's night side from the ISS, cities joined by roads of light (NASA imagery is public domain; t2_earth_night 'iss' until a plate is picked)" });
  const yeah = hitWord('(yeah)');
  // t2_graph_flash: eight links at once, then (from the last whisper) the light gathers into one pale-blue point at frame centre
  // Jade's note: the echo whisper after count 2's "eight" (11.51) gets no numeral; the gather starts on it and the pull-back from the
  // catchlight cuts in on the next beat
  const pullT = beatK(yeah.t, 0, 'beat after the echo whisper (Jade\'s note)');
  const flashP = { tEight: wd('CO', 1, 'eight').t, tGather: [yeah.t, pullT.t], dot: [960, 540] };
  S('0:11.16', wd('CO', 1, 'eight'), { scene: 't2_graph_flash', p: flashP, method: 'procedural', era: ERA.light, look: LK.light,
    want: 'The contact graph over the Milky Way, eight links lighting at once' });
  S(null, pullT, { scene: 't2_first', p: { chain: [{ scene: 't2_plate', p: { clip: '@', rate: 6.15 } }, { scene: 't2_graph_flash', p: flashP }] }, method: 'video', era: ERA.room, look: LK.room,
    notes: 'plan prints 0:11.5 (the echo whisper); Jade: the pull-back carries it on the next beat. rate 6.15: the whole pull-back (take 0 to 3.96 s) inside the 0.64 s shot',
    want: "The graph's light gathers into one point; pull back: it is the catchlight in Jade's eye; she is at her console in headphones, waterfall spectrograms behind" });
  S('0:12.50', beat('0:12.50'), { ...plate(), method: 'video', era: ERA.room, look: LK.room, want: 'Jade opens her eyes and looks up (on the beat before the verse)' });

  // type: title, then the two counts collecting along the bottom third
  // the title is in frame zero (the thumbnail, and the end card's last frame, so the post loops) and lands on the 0:00.2 sub
  cue({ kind: 'hero', label: 'HOLD FIRE (title)', t0: 0, t1: intro0.t - 0.2, mode: 'fade', size: 150, y: 590, out: 0.5, glow: 10, hotT: subHit.t,
    font: { stretch: '125%', weight: 800, track: 0.14 }, rows: [{ words: [{ text: 'HOLD', t: -0.5 }, { text: 'FIRE', t: -0.5 }] }], draw: drawHero });
  const NUMS = { one: 1, two: 2, three: 3, five: 5, eight: 8 };
  const countItems = (L, giant = true) => {
    const items = []; const slotOf = {};
    L.words.forEach((w, i) => {
      const n = NUMS[norm(w.w)];
      if (!n) return;
      const prev = items[items.length - 1];
      if (prev && prev.n === n && n !== 1) return;              // the doubled whispered "eight" is an echo: no numeral (Jade's note)
      const slot = items.length ? Math.max(...items.map((x) => x.slot)) + 1 : 0;
      items.push({ n, t: w.t, slot, giant });
    });
    return items;
  };
  const c1items = countItems(intro0);
  rewSteps.forEach((st, i) => { const it = c1items.filter((x, j) => c1items.findIndex((y) => y.slot === x.slot) === j).reverse()[i]; if (it) c1items.filter((x) => x.slot === it.slot).forEach((x) => { x.out = st; }); });
  c1items.forEach((x) => { if (x.out == null) x.out = stopT; });
  // the first 1 rewinds out of its slot back up to giant as the floret comes up (one 16th), then holds lit over the paused floret
  const stepFloret = rewSteps[co.length - 1];
  c1items.push({ n: 1, t: stepFloret, slot: 0, giant: true, rev: Math.min(0.16, stopT - stepFloret), hold: matchT.t - stepFloret, lit: 0.35, out: matchT.t });
  cue({ kind: 'num', label: '1 1 2 3 5 8 (giant, then the bottom-third row; unwinds with the rewind, back to the first 1)', t0: intro0.t, t1: matchT.t + 0.3, items: c1items, slots: Math.max(...c1items.map((x) => x.slot)) + 1, draw: drawCount });
  // count 2 opens on the carried 1 (slot 0, already in the row), so the match's "One" lands as the second 1: 1 1, 1 1 2, ... 1 1 2 3 5 8
  const c2items = [{ n: 1, t: matchT.t, slot: 0, giant: false, settled: true }, ...countItems(intro1).map((x) => ({ ...x, slot: x.slot + 1 }))];
  cue({ kind: 'num', label: '1 1 2 3 5 8 (the carried 1, then giant, then the row; fades as the light gathers)', t0: intro1.t, t1: pullT.t + 0.3, items: c2items, slots: Math.max(...c2items.map((x) => x.slot)) + 1, draw: drawCount });

  // ============================================================================================== VERSE 1 (13.05 to 35.50)
  section('V1');
  const v1 = (want, extra = {}, more = {}) => ({ ...plate(extra), method: 'video', era: ERA.v1, look: LK.blueprint, want, ...more });
  const bp = (subject, extra = {}) => ({ scene: 't2_blueprint', p: { subject, ...extra } });
  const e8 = (x, k = 1) => EIGHTHS.filter((e) => e > x + 0.02)[k - 1];   // the k-th eighth after x
  // a plate that scrolls v px per plate frame (the walk composites: the painted era plate slides left under the keyed walk), as the
  // blueprint's pan: whole plate frames on twos, the same clock t2_plate uses, so the lines stay glued to the painting
  const scrollPan = (vx, vy = 0) => (t, lt) => { const ff = Math.floor(lt * 24 + 1e-3); const f = ff - (ff % 2); return [-vx * f, -vy * f]; };
  const out = S('0:13.05', wd('V1', 0, 'out'), { ...v1('Hard cut to surf at dawn: Jade stands knee-deep at the shoreline and sings, close-mic', {}, { method: 'seedance_sung' }),
    look: withLook(LK.blueprint, flash([1, 0.9, 0.7], 0.5, 0.15)), notes: 'verse downbeat 13.14 with a sub slide lands 0.09 s in' });
  const fish = S('0:15.07', beat('0:15.07'), v1('Over her shoulder, a lobe-finned fish noses out of the water onto a mudflat (painted plate)'));
  const snare1 = ev('impact', /first snare/);
  // V103: punch in on the near front fin (plate ~(1100, 735) at clip 1.92, g1's note) so it sits at frame centre; the bones lie along
  // the fin (shoulder up-left in the body, wrist at the fin's tip), drawn on the snare, the next snare (17.32) and the beat after
  S('0:16.99', snare1, { ...over({ scene: 't2_plate', p: { clip: fish.id, in: snare1.t - fish.t0, zoom: 1.8, pan: [-252, -351] } },
    bp('fin_bones', { t0: snare1.t, stages: ['one bone', 'two bones', 'the wrist'], stageT: [snare1.t, e8(snare1.t), beatsAfter(snare1.t, 1)[0]], drawDur: 0.32, pos: [965, 532], scale: 0.7, subjectRot: 0.938, w: 3 })),
    method: 'video', era: ERA.v1, look: LK.blueprint, want: "Punch in on the fin: white blueprint lines draw the fin's bones over the painting, one bone, then two, then the wrist (on the snares)" });
  // FIN / FOOT (0.8 / 0.7 s): the first stage is already there on the cut (it rhymes with the bones just drawn), the rest is done
  // well before the next cut (Jade: never a schematic caught half-drawn)
  S('0:18.07', wd('V1', 1, 'fin'), { ...bp('fin', { full: true, stageT: [wd('V1', 1, 'fin').t - 0.5, wd('V1', 1, 'fin').t, wd('V1', 1, 'fin').t + 0.16], drawDur: 0.36 }), method: 'procedural', era: ERA.v1, look: LK.blueprint, want: 'The fin schematic, full frame (white line on cyanotype)' });
  S('0:18.89', wd('V1', 1, 'foot'), { ...bp('foot', { full: true, stageT: [wd('V1', 1, 'foot').t - 0.5, wd('V1', 1, 'foot').t, wd('V1', 1, 'foot').t + 0.14], drawDur: 0.3 }), method: 'procedural', era: ERA.v1, look: LK.blueprint, want: 'An early tetrapod foot in the same line style' });
  S('0:19.56', wd('V1', 1, 'hand'), { ...over(plate(), bp('hand', { over: true, pos: [948, 488], subjectFlip: true, arrive: true })), method: 'video', era: ERA.v1, look: LK.blueprint, want: "Match cut: Jade's hand opens in the same silhouette as the foot schematic" });
  S('0:19.84', wd('V1', 1, 'we'), v1('She presses the hand to a cave wall; red ochre sprays around it and leaves a stencil among much older ones', { in: 1.46, rate: 0.45 },
    { notes: 'plate frames 11-22 only: before 10 a spray can shows, after 23 the hand picks up a stone' }));
  S(null, beat('0:20.86'), { ...plate({ clip: 'V107', in: 3.22, rate: 0.52, zoom: 1.7, pan: [-17, 102] }), method: 'video', era: ERA.v1, look: LK.blueprint, sub: 'b',
    want: 'Push in on the stencil the hand left among the older ones (the plate\'s last frames; the hand leaving at the bottom stays out of frame)' });
  S('0:21.51', beat('0:21.51'), v1('Jade walks side-on, left to right; behind her: knapped flint', {}, { notes: 'one continuous walk cycle across the three era beats' }));
  S('0:22.15', beat('0:22.15'), v1('Walk continues; behind her: a solid wooden wheel in a mud rut', {}, { notes: 'deep 808 at 22.48 inside this shot' }));
  S('0:22.80', beat('0:22.80'), v1('Walk continues; behind her: a mud-brick city wall'));
  // the egg outline sits on the woman's jar (V111 plate: jar ~(1200, 190), drifting ~(+20, -20) px across the shot) and becomes it
  const carried = wd('V1', 2, 'carried'), dustT = wd('V1', 2, 'dust').t;
  S('0:23.41', carried, { ...over(plate(), bp('egg_to_jar', { over: true, pos: [1200, 190], scale: 0.62, stageT: [carried.t, beatsAfter(carried.t, 2)[1]],
    pan: (t, lt) => [20 * lt / (dustT - carried.t), -20 * lt / (dustT - carried.t)] })), method: 'video', era: ERA.v1, look: LK.blueprint,
    want: "An egg outline in blueprint line becomes a clay jar of grain on a woman's shoulder as Jade passes her" });
  S('0:24.70', wd('V1', 2, 'dust'), v1('Cart ruts in dust'));
  // V113's tablet (Jade, v6 note at 0:26.1; take-two note: the stylus has to make the strokes that appear): the plate's painted
  // triangles are covered with clean clay carrying the Fibonacci count 1 1 2 3 5 8 13 21 34 55 89 in real sexagesimal cuneiform
  // above a line of the Ea-nasir tablet; all of it is on the clay when the shot opens except two wedges of 89, which the plate's
  // stylus presses on its two touch-downs (plate frames 14 and 42: 25.79 and 26.96; scenes/t2/lyric/tablet.js, cuneiform.js)
  S('0:25.37', wd('V1', 2, 'mud'), { ...over(plate(), { scene: 't2_tablet', p: { clip: 'V113' } }), method: 'video', era: ERA.v1, look: LK.blueprint,
    want: 'A reed stylus presses wedges into wet clay: the tablet already counts 1 1 2 3 5 8 13 21 34 55 in Babylonian sexagesimal numerals, and the stylus presses the last two wedges of 89 where it touches down', notes: 'writing began as counting grain; the numerals are genuine (tools/t2/cuneiform_card.py)' });
  S('0:27.32', wd('V1', 3, 'seeds'), v1('A hand presses seeds into dark soil beside a dry irrigation channel'));
  // the cross-section on V115's painted cutaway (surface y ~500, seed ~(950, 630), the dry canal at the right): a slow push, the
  // lines ride it; stages on "dark", the beat, the snare
  const darkT = wd('V1', 3, 'dark').t, wakingT = wd('V1', 3, 'waking').t;
  const seedZoom = (t, lt) => 1 + 0.06 * easeInOutCubic(clamp(lt / (wakingT - darkT)));
  S('0:28.64', wd('V1', 3, 'dark'), { ...over(still({ zoom: [1, 1.06] }), bp('seed_section', { over: true, pos: [1294, 596], scale: 1.72, zoom: seedZoom, stageT: [darkT, ...beatsAfter(darkT, 2)], drawDur: 0.5 })), method: 'still', era: ERA.v1, look: LK.blueprint,
    want: 'Blueprint cross-section: the seed underground and the canal running to the field' });
  S('0:30.06', wd('V1', 3, 'waking'), { ...plate({ style: 'gouache' }), method: 'video', era: ERA.flood, look: LK.gouache,
    want: 'The Okavango flood arrives across dry grassland (painted-over documentary frames): channels fill, lilies open, the dry irrigation channel fills' });
  S('0:30.96', wd('V1', 3, 'flood'), { ...plate({ style: 'gouache' }), method: 'video', era: ERA.flood, look: LK.gouache, want: 'Jade walks into the flood water' });
  const machines = [['0:31.18', 'locomotive', 'Steam locomotive', { pos: [1706, 625], scale: 1.09, pan: scrollPan(20) }],
    ['0:31.51', 'wright_flyer', 'Wright Flyer', { pos: [777, 389], scale: 1.6, subjectRot: 0.17, pan: scrollPan(20, -1) }],
    ['0:31.83', 'jet_airliner', 'Jet airliner', { pos: [565, 485], scale: 0.85, subjectRot: -0.23, pan: scrollPan(20) }],
    // the white rocket would swallow white lines: its schematic is drawn in Klein-blue ink (still a blueprint), riding the scroll
    ['0:32.15', 'saturn_v', 'Saturn V lifting off', { pos: [1041, 253], scale: 0.755, pan: scrollPan(16.7), col: [0.06, 0.16, 0.6], glowCol: [0.55, 0.8, 1], glow: 0.5, w: 3 }]];
  // Jade's note (v2): an eighth per machine is too short to watch a drawing grow: each schematic arrives >= 85% drawn, done by frame 3
  machines.forEach(([pl, subj, name, at], i) => S(pl, eighth(pl), { ...over(plate(), bp(subj, { over: true, ...at, arrive: { from: 0.88, frames: 3 } })), method: 'video', era: ERA.v1, look: LK.blueprint,
    want: `${name}, blueprint linework over it; the flood becomes a flood of machines; Jade's walk breaks into a run`, notes: i === 0 ? 'bar 13 downbeat; stacked choir enters' : 'eighth-note cut' }));
  S('0:32.62', wd('P1', 0, 'snowflake'), { ...over(plate(), { scene: 't2_iss_pass', p: { over: true, from: [1400, 175], to: [1800, 92], bend: 26, fadeIn: 0.04, I: 3.6 } }), method: 'video', era: ERA.v1, look: LK.night, want: 'Jade stops at night and looks up at a bright point crossing the sky' });
  // Jade's note (v2): the ISS must be unmistakable: a hero view of its real silhouette with a white blueprint outline (truss, the
  // eight array wings, radiators, modules) and a small ISS callout. Jade's note (v3, 0:34.1): "a camera a little farther away would
  // read more like a snowflake in the boundless night". So the ISS beat stays on the cut (the hero view, ~60% of the frame, outline
  // >= 88% drawn on the first frame, ISS callout up by frame 3), then the camera pulls back through the shot (ease out, in log zoom):
  // by ~34.1 the station is small in a vast starfield and it ends ~6% of the frame wide, still turning. The plate is V123K (V123's
  // still with its black keyed out, so the stars show round it and through the truss); as it shrinks it fades under the white line
  // drawing (truss + eight wings, riding the same camera), so what is left is a white snowflake. Outline anchors measured on
  // work/plates/V123/f_00000.jpg (design px; V123K has the same cover framing).
  const bnd = wd('P1', 0, 'boundless'), issEnd = wd('P1', 1, 'a').t, issDur = issEnd - bnd.t;
  const pbT0 = bnd.t + 0.17;                                                  // the hero view holds 4 frames, then the pull-back
  const pbU = (t) => easeOutExpo(clamp((t - pbT0) / (issEnd - pbT0)));
  const ISSZ = [0.62, 0.062];
  const issZoom = (t) => ISSZ[0] * Math.pow(ISSZ[1] / ISSZ[0], pbU(t));
  const issRot = (t, lt) => 0.16 * lt / issDur;                               // the slow snowflake turn
  const issPan = (t) => [0, lerp(-40, -120, pbU(t))];                         // ends a little above centre, clear of the lyric
  const issSmall = (t) => smooth(range(pbU(t), 0.3, 0.8));                    // 0 = hero view .. 1 = the snowflake
  const WINGS = [[[84, 168], [270, 160], [324, 528], [180, 528]], [[314, 162], [470, 162], [534, 522], [396, 522]],
    [[202, 600], [348, 600], [414, 888], [282, 888]], [[408, 600], [528, 600], [600, 888], [474, 888]],
    [[1440, 156], [1596, 156], [1530, 528], [1380, 528]], [[1680, 156], [1836, 156], [1740, 528], [1602, 528]],
    [[1362, 600], [1518, 600], [1488, 888], [1332, 888]], [[1566, 600], [1722, 600], [1656, 888], [1524, 888]]];
  const issPaths = (t) => {
    const k = 1 - issSmall(t), lab = 1 - smooth(range(t, pbT0 + 0.16, pbT0 + 0.36));   // the callout leaves once the station is small
    return [
      { type: 'rect', a: [258, 546], b: [1680, 588] },
      ...WINGS.map((pts) => ({ type: 'poly', closed: true, pts })),
      ...[[[672, 360], [840, 534]], [[1086, 360], [1236, 534]], [[930, 282], [996, 540]], [[810, 612], [1248, 756]]].map(([a, b]) => ({ type: 'rect', a, b, w: 2, alpha: k })),
      { type: 'dim', a: [84, 930], b: [1836, 930], off: 30, w: 2, alpha: k * lab },
      { type: 'callout', at: [963, 282], to: [1150, 190], shelf: 120, label: 'ISS', w: 2.5, alpha: lab },
    ];
  };
  S(null, bnd, { scene: 'multi', p: { layers: [
    { scene: 'sky', p: (t) => ({ density: 0.55, band: 0.3, bandAng: 0.55, neb: 0.05, seed: 31, exposure: 0.85, zoom: lerp(1.2, 1, pbU(t)) }) },
    { scene: 't2_still', clips: [{ img: 'V123K' }], p: (t, lt) => ({ img: 'V123K', key: 'green', zoom: issZoom(t), rot: issRot(t, lt), pan: issPan(t), style: 'riso', alpha: 1 - 0.8 * issSmall(t) }) },
    { scene: 't2_blueprint', p: (t, lt) => ({ paths: issPaths(t), arrive: { from: 0.88, frames: 3 }, size: 54, w: 2.5, glow: lerp(1, 0.6, issSmall(t)),
      col: mixc([0.94, 0.98, 1], [1, 1, 1], issSmall(t)), zoom: issZoom(t), rot: issRot(t, lt), pan: issPan(t) }) }] },
    method: 'still', era: ERA.signal, look: LK.riso,
    want: 'The ISS against black, its solar arrays spread like the arms of a snowflake: the hero view + blueprint outline + ISS callout on the cut, then the camera pulls back until it is a small white snowflake in a vast starfield; the technology run ends here',
    notes: 'cut placed on "boundless" (plan gives no time for the cut to the ISS); Jade v3: the pull-back' });

  // OUT OF / THE SEA in cyanotype ink: cream vanished on the pale dawn sky
  hero(caps(lineWords('V1', 0, 0, 4)), { rows: [2, 2], size: 190, y: 250, align: 'left', t1: fish.t0, out: 0.12, color: [0.05, 0.12, 0.3], hot: [0.13, 0.36, 0.86], glow: 0, shade: 0 });
  sub('V1', 0, { from: 4 });                                                                                              // with salt in our lungs
  ['fin', 'foot', 'hand'].forEach((w, i, arr) => {
    const a = wd('V1', 1, w).t, b = i < 2 ? wd('V1', 1, arr[i + 1]).t : a + 0.6;
    hero([{ text: w.toUpperCase(), t: a }], { size: 260, y: 330, t1: b, out: 0.06 });
  });
  sub('V1', 1, { from: 5 });                                                                                              // we were young
  sub('V1', 2, { cap: wd('V1', 3, 'seeds').t });                                                             // carried the egg ...
  sub('V1', 3, { to: 7, t1: wd('V1', 3, 'flood').t });                                                        // seeds ... waking
  // FLOOD right of Jade's head in V117 (she walks in at x ~560-720) and over the locomotive's smoke in V118
  // (cyanotype ink like OUT OF THE SEA, with a pale halo: it crosses the pale Okavango sky and the locomotive's dark smoke)
  hero([{ text: 'FLOOD', t: wd('V1', 3, 'flood').t }], { size: 185, x: 1110, maxW: 560, y: 330, t1: wd('V1', 3, 'flood').t + 0.6, out: 0.1,
    color: [0.05, 0.12, 0.3], hot: [0.13, 0.36, 0.86], glow: 22, glowColor: [0.98, 0.95, 0.86], shade: 0 });
  sub('P1', 0, { cap: LN('P1', 1).t });                                                                                    // Snowflake in the boundless night

  // ============================================================================================== PRE-CHORUS 1 (35.50 to 51.70)
  section('P1');
  // RC2: the riso screen at 0:35.5-0:40.6 is made to survive the X file's 12 Mb/s (QA_RC1 #6, the X notes): separated from a softened
  // plate (no dot boil from Veo's noise in the black), no specks under 10 % coverage, a slightly coarser, lower-contrast screen
  const RISO_X = { soft: 2.5, softDark: [0.25, 0.45], minDot: 0.08, screen: 0.85 };
  S('0:35.50', wd('P1', 1, 'a'), { ...plate({ style: 'riso', styleP: RISO_X }), method: 'video', era: ERA.signal, look: LK.riso,
    want: 'The Golden Record flashes in sunlight as Voyager turns away, then the craft speeds off into the dark, shrinking to a point' });
  const countingT = wd('P1', 2, 'counting');
  // TOWER_RING: the crown's ring of lamps in design px as the P102 still frames it (a placeholder until the still is picked:
  // the generation agent should report the ellipse, or compose the tower so its crown sits here)
  const TOWER_RING = { cx: 970, cy: 267, rx: 148, ry: 32 }, TOWER_HIDE = [920, 1015];   // P102's crown (g2's measurement)
  const DR14_RING = { cx: 1024, cy: 255, rx: 155, ry: 40 }, DR14_HIDE = [975, 1060];       // DR14's crown (measured on the still)
  const burstT = EIGHTHS.filter((e) => e >= countingT.t - 0.02).slice(0, 5);   // 1, 1, 2, 3, 5 lamps on five eighths
  S('0:38.07', countingT, { ...over(still({ style: 'riso', styleP: RISO_X }), { scene: 't2_tower_bursts', p: { counts: [1, 1, 2, 3, 5], times: burstT, ring: TOWER_RING, hide: TOWER_HIDE } }), method: 'still', era: ERA.signal, look: LK.riso,
    want: 'Echo: the signal tower above the violet clouds (Rare Earth world sheet, panel 04) fires its ring of lights in bursts of 1, 1, 2, 3, 5 on eighths' });
  S('0:40.65', wd('P1', 3, 'a'), { scene: 't2_pulse', p: { tSend: wd('P1', 3, 'one-way').t, tArrive: LN('P1', 4).t - 0.27, dir: 'toEcho', dist: 217 }, method: 'procedural', era: ERA.signal, look: LK.light,
    want: 'Ride the pulse across the galaxy toward a small blue point: Echo, 217 light-years away (fictional; never presented as a real exoplanet)', notes: "teal-tips Jade's voice enters, heard not seen" });
  S('0:43.27', wd('P1', 4, 'a'), { scene: 'pulsar', p: { notes: false }, method: 'reuse', era: ERA.signal, look: LK.diagram,   // notes false: its two ~6 px captions dropped (polish 4)
    want: "Take one's 0:44 diagram unchanged: PSR B1919+21 ticking every 1.3373 s (left), the count 1 1 2 3 5 8 (right)", notes: 'NATURAL / NOT NATURAL are drawn by pulsar.js itself' });
  const hearT = wd('P1', 5, 'hear');
  // adversary pass (item 2): her room cold and hard (COLD_P: cooler, deeper blacks), and on her monitor bank a target track in red
  // alert that ends on Jade's dish field (C101's plate, Jade in the reticle): before she has done anything she is watching Jade's side
  const COLD_P = { exposure: 0.9, contrast: 1.18, sat: 0.6, tint: [0.82, 0.95, 1.16], lift: [-0.02, -0.012, 0.0] };
  // Jade (RC8 note): the 1420 MHz arm patch read too white against the cold-lit sleeve; toned to the sleeve's own white around it
  // (per-channel sleeve / patch medians over every plate frame), tracked by template match in plate px (layer.js fix 'tone')
  const PATCH_TONE = {   // (P106's patch is below its 1.3x frame)
    P105: { mode: 'tone', r: [33, 45], col: [0.732, 0.78, 0.799], track: [[0, 1175, 901], [4, 1174, 899], [8, 1174, 890], [12, 1174, 897], [16, 1175, 900], [20, 1175, 900], [24, 1174, 899], [28, 1174, 899], [32, 1175, 900], [36, 1175, 901], [40, 1175, 900], [44, 1175, 900], [48, 1175, 900], [52, 1174, 899], [56, 1173, 898], [60, 1172, 897], [64, 1173, 897], [68, 1173, 897], [72, 1174, 897], [76, 1174, 897], [80, 1174, 897], [84, 1174, 897], [88, 1174, 897], [92, 1175, 897], [96, 1175, 899]] } };
  const P105_SCREENS = [{ quad: [[1607, 354], [1848, 126], [1950, 500], [1700, 638]], mirror: true, alert: true, feed: 'work/plates/C101/f_00040.jpg', feedAt: [0.48, 0.66], code: '0217', brg: '270' },
    { quad: [[1362, 487], [1582, 372], [1658, 642], [1406, 690]], mirror: true, alert: true, range: 0.6, code: '0217', brg: '270' }];
  S('0:46.02', hearT, { ...over(plate({ grade: { ...COLD_P, fix: [PATCH_TONE.P105] } }), { scene: 't2_contact', p: { screens: P105_SCREENS, gain: 1.4 } }), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'First sight of teal-tips Jade in her own (mirrored, cold) control room, headphones on, singing; on her monitor bank a target track in red alert ends on Jade\'s dish field' });
  // P106 (Jade: "both of them are singing 'we're awake'"): P105 sings "we're" up to the cut, so P106 starts on w2's own held, wide
  // "-WAKE" (take frame 72, eyes already open: the cut opens them on "awake") instead of its "a" + "w" (frames 57-71, which played a
  // second onset 0.3 s late). w2 holds that vowel for only 21 frames (72-92, she clenches from 93), so the hold plays at 0.57x:
  // clipT = hold(t) - s0' + lag with s0' = s0 + (1 - r)(hold(t) - tA), i.e. the pick's lag (picks2 P106) still sets frame 72 at the
  // cut, and r slows the drawings after it (frames 72..92 across 47.75..49.17; lipcheck's onset frame = the formula's)
  const awakeT = wd('P1', 5, 'awake');
  const P106_S0 = 47.432, P106_R = 0.57, P106_TA = hold2(awakeT.t);
  const P106_SCREEN = { quad: [[1628, 672], [1960, 610], [1960, 1090], [1640, 1090]], mirror: true, alert: true, range: 0.7, code: '0217', brg: '270' };
  S(null, awakeT, { scene: 'multi', p: { layers: [{ scene: 't2_plate', p: (t) => ({ clip: 'P106', grade: COLD_P, s0: P106_S0 + (1 - P106_R) * Math.max(0, hold2(t) - P106_TA) }) },
    { scene: 't2_contact', p: { screens: [P106_SCREEN], gain: 1.4 } }] },
    method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Closer: teal-tips Jade opens her eyes on "awake"', notes: 'cut on "awake" so the eyes open on the word; the held -WAKE at 0.57x so no second onset' });
  const roll1 = ev('snare_roll', null, hearT.t);
  // polish 3 (director: her lips part ~1.3x into the push): P107 plays the plate's frames 0-17 only (lips shut; frame 18 would
  // show from lt 0.94 at rate 0.8) with a JS push about her near eye (flipped, at ~(1134, 510)), and cuts on the roll's eighth
  // 50.21 to P107b, the crisp eye still (the plate's last frame = the 2K still), still pushing, to the downbeat
  const rollLook = (t, lt) => ({ ...LK.room, exposure: 1 + 0.5 * range(t, roll1.t, LN('C1', 0).t) });
  S('0:49.24', roll1, { ...plate({ rate: 0.8 }), p: (t, lt) => { const z = 1 + 0.3 * lt; return { clip: 'P107', rate: 0.8, zoom: z, pan: [(1 - z) * 174, (1 - z) * -30], grade: COLD_P }; },
    method: 'video', era: ERA.room, look: rollLook, want: "The snare roll pushes into teal-tips Jade's eye (iris fills the frame)" });
  S(null, { t: e8(roll1.t, 3), kind: 'eighth', ref: 'roll eighth 3 (before her lips part)' }, { ...plate({ clip: 'P107', at: 2.46, zoom: 1, push: 0.09, grade: COLD_P }), method: 'video', era: ERA.room, look: rollLook, sub: 'b',
    want: "Teal-tips Jade's eye fills the frame (the crisp still), the roll still pushing in", notes: 'insert: the eye still, so P107 ends before her lips part' });
  sub('P1', 1);                                                                                                         // a chord that's searching ...
  sub('P1', 2, { cap: LN('P1', 3).t });                                                                                   // counting out in bursts of light
  const lyT = wd('P1', 3, 'a').t;
  cue({ kind: 'hero', label: '217 LY', t0: lyT, t1: LN('P1', 4).t, size: 300, y: 420, out: 0.15, draw: drawHero,
    rows: [{ words: [{ text: '217', t: lyT }] }, { words: [{ text: 'LIGHT-YEARS', t: lyT + 0.25 }], k: 0.22 }], color: P.gold, hot: GOLD_HOT });
  hero(caps(lineWords('P1', 5, 5)), { size: 140, y: 150, t1: roll1.t + 0.12, out: 0.25, rows: [2], shade: 1, glow: 0 });   // WE'RE AWAKE, one row above her brow (polish 3: never over the face); gone before the push; RC2 (QA_RC1 #10): full shade, no glow, so the apostrophe and R hold over the tube light

  // ============================================================================================== CHORUS 1 (51.70 to 73.03)
  section('C1');
  const dl1 = A.sections.find((s) => s.name === 'Chorus 1').start;
  S('0:51.70', wd('C1', 0, "can't"), { ...plate({ swingT: dl1 }), method: 'video', era: ERA.room, look: (t) => ({ ...LK.night, flash: t >= dl1 ? Math.exp(-(t - dl1) / 0.15) * 0.4 : 0, flashCol: [1, 0.9, 0.7] }),
    want: 'Jade alone on the dish field at night; on the 0:51.82 downbeat every dish swings to the same point in the sky' });
  S('0:54.28', wd('C1', 1, 'message'), { scene: 'goldenrecord', p: {}, method: 'reuse', era: ERA.light, look: LK.diagram, want: "Take one's 0:54 diagram unchanged: the Golden Record cover engraves itself in gold light" });
  S('0:56.67', wd('C1', 2, 'but'), { ...over(phraseSplit('C103', wd('C1', 2, "i'm").t, {}, {}, WALL), contacts({ range: 0.3 }), posterPair(beatK(wd('C1', 2, 'but').t, 0).t, null)), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'Split screen, two rooms with a wall between them: Jade (left, warm lamp) sings "but if you are" while teal-tips (right, cold fluorescent) listens; on "I\'m" teal-tips sings "I\'m counting on you" while Jade listens. Each one\'s monitor tracks the other as an unknown contact (CONTACT 0217)',
    notes: 'Jade v3: one phrase per half; both halves cut on the onset of "I\'m" (phraseSplit). Adversary pass: wall bar, warm/cold split grade (RM matching dropped), contact tracks' });
  // t2_crt_matrix is one continuous camera (close on one CRT, smash back on the two beats and on "swear"), so it is one shot;
  // the beats and "swear" are passed in (the scene would otherwise take the beats after its own start)
  const crt = (silent, sec, want, extra = {}) => ({ scene: 't2_crt_matrix', method: 'procedural', era: ERA.crt, look: CRT_LOOK, want,
    p: { beats: [beatK(silent.t, 0).t, beatK(silent.t, 1).t], swear: wd(sec, 3, 'swear').t, ...extra } });
  const silent1 = wd('C1', 3, 'silent');
  S('1:02.15', silent1, crt(silent1, 'C1', 'Close on one 1999 CRT in a dark bedroom running the SETI@home screensaver (power-spectrum graph); on the beats at 1:02.77 and 1:03.41 the camera smashes back, 1 to 4 to 16 screens; on "swear" a matrix of hundreds of CRTs, each in its own dark room (over a million people ran SETI@home)'));
  reserve(3);                                                                     // the matrix's other three cuts keep their numbers
  S('1:04.59', wd('C1', 4, 'in'), { ...plate({ staticT: wd('C1', 4, 'breathe').t, grade: COOL }), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'The studio pose: teal-tips Jade (voice B line) at the console, one hand on her headphones, eyes closed, singing like a recording artist; screen static swells and falls on "breathe"',
    notes: 'plan says "Jade"; the timing tags this line B_belt, so teal-tips Jade sings it (chorus 2 has both in this pose)' });
  S('1:07.31', wd('C1', 5, 'if'), { ...plate(), method: 'video', era: ERA.room, look: LK.night, want: 'Crane up out of the control room, over the dishes and into the sky' });
  S(null, wd('C1', 5, "i'm"), { scene: 't2_graph_grow', p: { mode: 'first_line' }, method: 'procedural', era: ERA.light, look: LK.light,
    want: 'Earth from far off: one faint line leaves Earth (sets up the graph)', notes: 'split from the crane on "I\'m"' });
  hero(caps(lineWords('C1', 0, 0, 3)), { size: 180, y: 290, t1: LN('C1', 1).t });                                       // CAN'T BE SURE
  hero(caps(lineWords('C1', 2, 4)), { rows: [2, 2], size: 150, y: 190, t1: LN('C1', 3).t, out: 0.1 });                  // I'M COUNTING / ON YOU (above both heads)

  // ============================================================================================== POST-CHORUS 1 (73.03 to 82.55)
  section('X1');
  const x1h = HITS.filter((h) => h.kind === 'post_chorus_1');
  const cou = [hit('counting_on_you', 0).t, hit('counting_on_you', 1).t];
  // t2_graph_grow is a pure function of t over the whole post-chorus (phase 'auto': the camera follows the scale), so every cut
  // gets the same p: the twelve shouts, the flash on the last "Counting on you!", the smoke into verse 2
  const growP = { shouts: [...x1h.slice(0, 5).map((h) => h.t), cou[0], ...x1h.slice(5, 10).map((h) => h.t), cou[1]], tFlash: cou[1], smoke: [wd('X1', 3, 'you').t, LN('V2', 0).t + 0.09], phase: 'auto' };
  const graphScale = ['local', 'local', 'local', 'local', 'local', 'local', 'arm', 'arm', 'arm', 'half', 'half'];
  const X1W = ['one node, then one link', 'one more link', 'two new links', 'three new links', 'five new links'];
  for (let i = 0; i < 5; i++) S(['1:13.03', '1:13.67', '1:14.28', '1:14.98', '1:15.59'][i], hit('post_chorus_1', i), { scene: 't2_graph_grow', p: growP, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.25)),
    want: `The contact graph grows from Earth among the nearest stars: ${X1W[i]}` });
  S('1:16.24', wd('X1', 1, 'counting'), { scene: 't2_graph_grow', p: growP, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.4)), want: 'The eighth link closes; giant 8' });
  for (let i = 0; i < 5; i++) S(['1:18.18', null, null, null, '1:20.73'][i], hit('post_chorus_1', 5 + i), { scene: 't2_graph_grow', p: growP, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.25)),
    want: `The same count one scale up (${graphScale[6 + i] === 'arm' ? 'across the Orion Arm' : 'half the galaxy'}): ${X1W[i]}` });
  S('1:21.35', hit('counting_on_you', 1), { scene: 't2_graph_grow', p: growP, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.6, 0.2)),
    want: 'The whole web flashes, then the frame fills with smoke for verse 2 (snare roll to 1:22.64)' });
  // shouted counts: small gold numerals fill the bottom-third row; the unsung 8 lands giant on "Counting on you!" and drops into the row
  const pcCount = (hs, ch, t1) => {
    const items = hs.map((h, i) => ({ n: [1, 1, 2, 3, 5][i], t: h.t, slot: i, giant: false }));
    items.push({ n: 8, t: ch.t, slot: 5, giant: true });
    return cue({ kind: 'num', label: '1 1 2 3 5 (row) + giant 8 on "Counting on you!"', t0: hs[0].t, t1, items, slots: 6, size: 110, hold: 0.55, fly: 0.3, scrim: 1, draw: drawCount });
  };
  pcCount(x1h.slice(0, 5), wd('X1', 1, 'counting'), x1h[5].t - 0.05);
  pcCount(x1h.slice(5, 10), hit('counting_on_you', 1), LN('V2', 0).t);

  // ============================================================================================== VERSE 2 (82.55 to 102.99)
  section('V2');
  const ink = (want, extra = {}, more = {}) => ({ ...plate({ style: 'ink', ...extra }), method: 'video', era: ERA.ink, look: LK.ink, want, ...more });
  S('1:22.55', wd('V2', 0, 'priests'), ink('Ink wash: Daoist alchemists around a bronze cauldron in a mountain grotto, brewing an elixir of life; teal-tips Jade stands among them singing, the only cel-shaded figure', { grade: COOL }, { method: 'seedance_sung' }));
  // the k-th sixteenth after time x (grid times for things the scenes animate between word onsets)
  const s16 = (x, k = 1) => SIXTEENTHS.filter((y) => y > x + 0.02)[k - 1];
  const sulfur = wd('V2', 1, 'sulfur'), saltpeter = wd('V2', 1, 'saltpeter'), thunder = wd('V2', 1, 'thunder');
  // t2_brush_chars: 硫 黃 硝 石 stroke by stroke (each word's second character two sixteenths after it), the flash on "thunder"
  const charsP = { t: [sulfur.t, s16(sulfur.t, 2), saltpeter.t, s16(saltpeter.t, 2)], tFlash: thunder.t };
  const inkShake = (t0, k = 1) => (t, lt) => ({ ...LK.inkProc, shakeX: 10 * k * Math.exp(-Math.max(0, t - t0) / 0.09) * Math.sin(t * 97) * (t >= t0 ? 1 : 0), shakeY: -7 * k * Math.exp(-Math.max(0, t - t0) / 0.09) * (t >= t0 ? 1 : 0) });
  S('1:25.00', sulfur, { scene: 't2_brush_chars', p: charsP, method: 'procedural', era: ERA.ink, look: LK.inkProc, want: 'The characters for sulfur, 硫黃, brushed large' });
  S(null, saltpeter, { scene: 't2_brush_chars', p: charsP, method: 'procedural', era: ERA.ink, look: LK.inkProc, want: 'The characters for saltpeter, 硝石, brushed large' });
  S(null, thunder, { scene: 't2_brush_chars', p: charsP, method: 'procedural', era: ERA.ink, look: inkShake(thunder.t), want: 'Thunder: the mixture flashes and the ink splatters' });
  const found = wd('V2', 2, 'found'), looked = wd('V2', 2, 'looked');
  // the scroll writes from "looked" to just before "found"; the seal stamps on "found" (89.65 in timing.json; the plan prints 1:29.97)
  const scrollP = { t0: looked.t + 0.03, t1: found.t - 0.12, tSeal: found.t };
  S('1:27.39', looked, { scene: 't2_scroll_warning', p: scrollP, method: 'procedural', era: ERA.ink, look: (t) => ({ ...LK.inkProc, shakeY: 5 * (t >= found.t ? Math.exp(-(t - found.t) / 0.09) : 0) }),
    want: 'A brush writes the warning down a scroll in one column (Zhenyuan miaodao yaolüe, 9th c.); a red seal stamps on "found"; characters sharp enough to read when paused' });
  const weapons = [
    ['1:30.00', wd('V2', 3, 'an'), 'A fire lance (first recorded in battle at the siege of De\'an, 1132)', 1132],
    ['1:30.28', beat('1:30.28'), 'A bronze hand cannon (oldest surviving: no later than 1288)', 1288],
    ['1:30.92', beat('1:30.92'), 'Ottoman bombards breaking the walls of Constantinople (1453)', 1453],
    ['1:31.61', wd('V2', 3, 'level'), 'The shell-flattened ground of the Somme (1916)', 1916],
  ];
  const ground = wd('V2', 3, 'ground');
  // t2_ink_weapons draws all five images (procedural ink, or a generated still per image when its plate exists), their brushed
  // years, the smoke between them and, on "ground", the Trinity flash burning through the paper into Petrov's oil painting:
  // p.under = the Petrov opening shot's plate held on its first frame (the shot plays it from there), else the umber stand-in
  const wpIds = weapons.map((w, i) => `work/plates/${nextId(i)}/f_00000.jpg`), petrovId = nextId(weapons.length + 1);
  const petrovPlate = (extra = {}) => ({ scene: 't2_plate', p: { clip: petrovId, style: 'oil', ...extra } });
  const backdrop = { scene: 't2_petrov_screen', p: { mode: 'backdrop' } };
  const weaponsP = { t: [...weapons.map(([, an]) => an.t), ground.t], imgs: wpIds, under: { scene: 't2_first', p: { chain: [petrovPlate({ at: 0 }), backdrop] } } };
  const shk = (t, t0, k) => (t >= t0 ? k * Math.exp(-(t - t0) / 0.09) : 0);
  const wShake = (t) => ({ ...LK.inkProc, shakeX: shk(t, ground.t, 8) * Math.sin(t * 91), shakeY: shk(t, weapons[3][1].t, 6) + shk(t, weapons[2][1].t, 5) });
  weapons.forEach(([pl, an, w]) => S(pl, an, { scene: 't2_ink_weapons', p: weaponsP, method: 'still', era: ERA.ink, look: wShake, want: `${w}; ink wash with harder, mechanical lines; the alchemists' smoke drifts across`, notes: 'still optional: t2_ink_weapons draws it procedurally until work/plates/<id>/f_00000.jpg exists' }));
  S('1:32.15', ground, { scene: 't2_ink_weapons', p: weaponsP, method: 'procedural', era: ERA.ink, look: (t, lt) => ({ ...wShake(t), flash: Math.exp(-Math.max(0, lt) / 0.25), flashCol: [1, 1, 1] }),
    want: "A white flash, the Trinity test (16 July 1945), burns through the paper into Petrov's oil painting; no mushroom cloud" });
  const oil = (want, extra = {}, more = {}) => ({ ...plate({ style: 'oil', ...extra }), method: 'video', era: ERA.oil, look: LK.oil, want, ...more });
  const petrovOpen = S('1:32.60', wd('V2', 4, 'eighty-three'), oil('Oil painting: the Serpukhov-15 command post at night, one figure, light from the big screen'));
  if (petrovOpen.id !== petrovId) throw new Error(`Petrov opening id ${petrovOpen.id} != ${petrovId}`);
  // the painting under the screens: the opening plate running on the song clock from its own start, else the umber stand-in
  const painting = (xf = {}) => ({ scene: 't2_first', p: { chain: [petrovPlate({ at: (lt, t) => t - petrovOpen.t0, ...xf }), backdrop] } });
  // the painted wall screen of the V211 plate (g3's pick `screen` quad); his head (x ~620-930, y >= 505 as he turns and lifts the
  // receiver) stands in front of its lower edge, so the overlays carry an occluder box and the scene's chroma matte keeps him in front
  const SCREEN_Q = [[358, 164], [1530, 164], [1530, 652], [358, 652]], HEAD_BOX = [585, 470, 965, 668];
  const screen = (mode, extra = {}) => ({ scene: 't2_petrov_screen', p: { mode, quad: SCREEN_Q, occ: HEAD_BOX, ...extra } });
  const sat = wd('V2', 4, 'satellites'), saw = wd('V2', 4, 'saw'), five = wd('V2', 4, 'five');
  // one track on "satellites", then four more: on "saw", two sixteenths, and "five"
  // part two C: the alarm is labelled from his side as the other side's strike (Jade's orange: their thing); struck through on the
  // protocol when he reports a malfunction. No cause is labelled (the fact sheet does not give one)
  const FIRST_STRIKE = (t0, extra = {}) => ({ scene: 't2_labels', p: { labels: [{ lines: ['THEIR', 'FIRST STRIKE'], side: 'jade', at: [1362, 268], h: 38, t0, ...extra }] } });
  S(null, sat, { ...over(painting(), screen('map', { tracks: [sat.t + 0.1, saw.t, s16(saw.t, 1), s16(saw.t, 2), five.t] }), FIRST_STRIKE(five.t)), method: 'procedural', era: ERA.oil, look: PETROV_LOOK,
    want: 'The big screen: one missile track rises from the United States, then four more on "five"' });
  const every = wd('V2', 5, 'every');
  // RC2 (QA_RC1 #4): the reliability panel sits right of his head (HEAD_BOX + 25 px to the screen's right edge), so the matte never
  // hides ДОСТО- and a Russian reader never sees ВЕРНОСТЬ ВЫСШАЯ ("loyalty: highest")
  const relX = [(HEAD_BOX[2] + 25 - SCREEN_Q[0][0]) / (SCREEN_Q[1][0] - SCREEN_Q[0][0]), 0.975];
  S('1:35.36', every, { ...over(painting(), screen('start', { t0: every.t, tRel: wd('V2', 5, 'said').t, relX })), method: 'procedural', era: ERA.oil, look: PETROV_LOOK,
    want: 'The wall display lights up in big red letters, СТАРТ (drawn by the scene); reliability rated highest' });
  S(null, wd('V2', 5, 'first'), oil('Petrov sits with his hand near the phone (no launch button in the room)', { zoom: 1.12 }, { notes: 'zoom 1.12 crops the red line Veo drew along the screen from 0.75 s' }));
  const petrovW = wd('V2', 6, 'petrov');
  S('1:37.88', petrovW, { ...over(painting(), screen('ghost', { t0: petrovW.t, tracks: [sat.t + 0.1, saw.t, s16(saw.t, 1), s16(saw.t, 2), five.t] }), FIRST_STRIKE(petrovW.t)), method: 'procedural', era: ERA.oil, look: PETROV_LOOK,
    want: 'Over the five tracks, a ghost of a real first strike (hundreds of tracks) fades and leaves five' });
  S('1:40.31', wd('V2', 7, 'ignored'), oil('He picks up the phone and reports a system malfunction'));
  const prev = wd('V2', 7, 'previous');
  // the protocol sheet beside him (the plate's own sheet on the desk: g3's pick `paper` quad), struck through line by line from
  // "previous", one line per sixteenth: an insert, the painting pushed in 4x on the sheet so it reads, the sheet kept above the
  // lower-third subtitle (the push's pan is held at the plate's bottom edge, which puts the sheet at y ~620-890)
  const PAPER_Q = [[1485, 964], [1634, 975], [1565, 1032], [1395, 1012]];
  const PZ = 4, PPAN = [-(PAPER_Q.reduce((a, q) => a + q[0], 0) / 4 - 960) * PZ, -(540 * PZ - 540)];
  // the sheet, pushed in with the painting, then grown 1.45x about its centre (and slid back on the desk) so its typed lines read (it covers the plate's sheet)
  const paperQ0 = PAPER_Q.map(([x, y]) => [960 + PZ * (x - 960) + PPAN[0], 540 + PZ * (y - 540) + PPAN[1]]);
  const pc = [paperQ0.reduce((a, q) => a + q[0], 0) / 4, paperQ0.reduce((a, q) => a + q[1], 0) / 4];
  const paperQ = paperQ0.map(([x, y]) => [pc[0] + 1.45 * (x - pc[0]), pc[1] - 75 + 1.45 * (y - pc[1])]);
  S(null, prev, { ...over(painting({ zoom: PZ, pan: PPAN }), screen('protocol', { quad: paperQ, occ: null, light: [0.92, 0.74, 0.56], strike: [prev.t, ...[1, 2, 3, 4, 5].map((k) => s16(prev.t, k))] }),
      { scene: 't2_labels', p: { labels: [{ lines: ['THEIR', 'FIRST STRIKE'], side: 'jade', at: [1190, 575], rot: -0.09, h: 38, t0: prev.t - 0.02, strike: s16(prev.t, 3) }] } }), method: 'procedural', era: ERA.oil, look: PETROV_LOOK,
    want: 'Insert: the printed protocol on the desk beside him is struck through line by line' });
  // RC3 (QA_RC2 #5): gain .9 with gamma 1.1 rolls the highlights off (mids kept), so teal-tips' face holds its skin tone under the oil look
  S('1:42.0', wd('V2', 7, "we're"), oil('Morning in Moscow, 26 September 1983: buses, people going to work, nobody knowing; teal-tips Jade breathes out', { grade: { ...COOL, gain: 0.9, gamma: 1.1 } }, { notes: 'she exhales on "We\'re alive" (voice B); lip-sync optional' }));
  hero([{ text: '26 SEP 1983', t: wd('V2', 4, 'eighty-three').t }, { text: 'SERPUKHOV-15', t: wd('V2', 4, 'eighty-three').t + 0.35 }], { rows: [1, 1], ks: [1, 0.5], size: 110, y: 780, t1: LN('V2', 5).t, color: P.cream, hot: [1, 0.55, 0.4] });   // lower third: the wall map is the picture
  const lookedT = looked.t;
  // the gloss sits on a dark plate in the lower third of the scroll shot (the plan's 1:27.39 row) and is gone by the cut on "an"
  // (V206, 89.995): from there "an end with no life" is brushed across the same band (lyrics2 line 25), so the two never overlap
  // (QA_RC2 #1; it used to hold into the 1288 weapon and its plate covered the first three sung words)
  cue({ kind: 'cap', label: 'FLAMES ROSE, BURNING THEIR HANDS AND FACES · c. 850 CE', t0: lookedT, t1: LN('V2', 3).t, x: SAFE.cx, y: 896, lead: 38, band: true, draw: drawCaps,
    lines: [{ text: 'FLAMES ROSE, BURNING THEIR HANDS AND FACES', t: lookedT, size: 26 }, { text: 'c. 850 CE', t: lookedT + 0.4, size: 22, color: [0.86, 0.8, 0.68] }] });
  // the weapons' years (1132 · 1288 · 1453 · 1916 · 1945) are brushed by t2_ink_weapons itself, top left of each image
  sub('V2', 7, { to: 4, t1: wd('V2', 7, "we're").t });                                                                    // ignored all previous instructions
  // WE'RE ALIVE over the bright autumn sky: a full shade and no glow, so the cream holds (her face sits below it, y ~380-560)
  hero(caps(lineWords('V2', 7, 4)), { rows: [2], size: 200, y: 330, t1: LN('P2', 0).t + 0.1, out: 0.1, shade: 1, glow: 0, color: [0.99, 0.95, 0.86] });

  // ============================================================================================== PRE-CHORUS 2 (102.99 to 113.18)
  section('P2');
  // t2_nearmiss is one continuous strip (paper and tally together), so the list and the counter are one shot
  const knew = wd('P2', 1, 'knew');
  S('1:42.99', wd('P2', 0, 'secret'), { scene: 't2_nearmiss', p: { t0: LN('P2', 0).t + 0.06, t1: knew.t, spin: knew.t }, method: 'procedural', era: ERA.newsprint, look: NEARMISS_LOOK,
    want: 'The near-miss list scrolls on teletype paper (~6.5 lines/s, the 30-entry fact-checked list); years big, place and description small; the tally beside it climbs with the entries, then its wheels keep spinning, never settling (no fixed total)' });
  reserve(1);                                                                                                            // the old counter cut keeps its number
  const coinW = wd('P2', 2, 'coin');
  S('1:48.00', coinW, { scene: 't2_coins', p: { t0: coinW.t + 0.12, t1: wd('P2', 2, 'row').t, type0: wd('P2', 2, 'hundred').t }, method: 'procedural', era: ERA.newsprint, look: COIN_LOOK,
    want: '100 gold coins land heads, the first 30 stamped with the list\'s years, filling a 10 x 10 grid; the full 2^100 number types across the bottom' });
  const theRoad = wd('P2', 3, 'the'), youRoad = wd('P2', 3, 'you');
  const treeBeats = ['1:51.25', '1:51.88', '1:52.52'].map((x) => beat(x).t);
  // t2_cointree is one continuous camera (pull up out of the grid, the depth doubling on each beat), so it is one shot
  S('1:50.61', theRoad, { scene: 't2_cointree', p: { beats: treeBeats, you: youRoad.t, end: LN('C2', 0).t }, method: 'procedural', era: ERA.newsprint, look: TREE_LOOK,
    want: 'The camera pulls up out of the coin grid: the hundred coins are the forks of a branching tree; on each beat (1:51.25, 1:51.88, 1:52.52) the lit depth doubles, every tails branch goes dark and ends in a tiny red SIGNAL LOST, and a single gold path threads all hundred forks; on "you" it leaves the top of the tree as one link toward a far star' });
  reserve(3);

  // ============================================================================================== CHORUS 2 (113.18 to 134.06): the mirror, first
  section('C2');
  const dl2 = A.sections.find((s) => s.name === 'Chorus 2').start;
  S(null, wd('C2', 0, "can't"), { ...split({ swingT: dl2 }, { swingT: dl2 }, 2, WALL), method: 'video', era: ERA.room, look: LK.night,
    want: 'Split: each Jade alone on her own dish field at night (mirrored); the dishes swing to the same point', notes: 'chorus 1 shot returns as a split; cut on "Can\'t" like chorus 1' });
  S(null, wd('C2', 1, 'message'), { scene: 't2_split', p: { left: { scene: 'goldenrecord', p: { R: 300, cx: 960, cy: 520, caption: false } }, right: { scene: 'goldenrecord', p: { R: 300, cx: 960, cy: 520, caption: false } }, x: 960, line: 2, ...WALL }, method: 'reuse', era: ERA.light, look: LK.diagram,
    want: 'Split: the Golden Record cover engraves itself on both sides at once' });
  S(null, wd('C2', 2, 'but'), { ...over(phraseSplit('C203', wd('C2', 2, "i'm").t, {}, {}, WALL), contacts({ range: 0.75, bright: 1.25 }), roomPair(['SIGNAL'], ['PROVOCATION'], beatK(wd('C2', 2, 'but').t, 0).t, null)), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'Split at their mirrored consoles: Jade (left) sings "but if you are" while teal-tips listens; on "I\'m" teal-tips sings "I\'m counting on you" while Jade listens',
    notes: 'Jade v3: one phrase per half; both halves cut on the onset of "I\'m" (phraseSplit)' });
  const silent2 = wd('C2', 3, 'silent');
  S(null, silent2, crt(silent2, 'C2', 'The CRT returns and multiplies 1 to 4 to 16 to hundreds; two of its screens show the two Jades\' control rooms (the g2 loops CRT_roomA / CRT_roomB)', { variant: 'mirror', inset: [{ clip: 'CRT_roomA', at: [0, 1] }, { clip: 'CRT_roomB', at: [1, 1] }] }));
  reserve(3);
  S(null, wd('C2', 4, 'in'), { ...split({}, { flipX: true }, 4, WALL), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'Both Jades in the studio pose, the same pose on either side of the wall: warm room and cold room (the audience sees the mirror; they do not)' });
  // adversary pass (item 3): the first "hand near the trigger" shots, which set up the hands letting go in the bridge: one insert per
  // side, one beat each on the cut grid; each a hand resting beside a guarded switch (cover shut, no lettering), a still with a slow
  // JS push on its upper half. Jade's (warm) takes C208's last beat ("somewhere"); teal-tips' (cold, flipped: the mirror of Jade's)
  // takes C209's held "are" from its second beat to the crane
  const SWITCH_PUSH = (side) => ({ zoom: [1.3, 1.38], pan: side === 'L' ? [[280, 90], [300, 96]] : [[-280, 90], [-300, 96]], ease: 'linear' });
  S(null, beatK(wd('C2', 4, 'breathe').t, 0, 'beat after "breathe" (on "somewhere")'), { ...still({ img: 'C208b', ...SWITCH_PUSH('L') }), method: 'still', era: ERA.room, look: LK.room, sub: 'b',
    want: "Insert: Jade's hand rests on the console beside a guarded switch, its red cover shut; she does not touch it (warm lamp)" });
  // Jade v3: "If you are" is Jade's phrase (as in C103 / C203): teal-tips listens through it (C209R_LS); her "I'm counting on you"
  // falls on the crane (C210)
  S(null, wd('C2', 5, 'if'), { ...over(split({}, { clip: 'C209R_LS', in: 0 }, 2, WALL), roomPair(['DEFENSIVE', 'SYSTEM'], ['FIRST-STRIKE', 'WEAPON'], beatK(wd('C2', 5, 'if').t, 0).t, null)), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'Split: each Jade looks at her own screen; Jade (left) sings "If you are", teal-tips (right) listens, mouth closed' });
  S(null, beatK(wd('C2', 5, 'are').t, 1, 'second beat of the held "are"'), { ...still({ img: 'C209b', ...SWITCH_PUSH('R'), grade: COOL }), method: 'still', era: ERA.room, look: LK.room, sub: 'b',
    want: "Insert: teal-tips' hand beside the same guarded switch, cover shut, in her cold room: the mirror of Jade's insert" });
  // the two roofs (lit windows' centroids lifted to the roof line), measured on C210's plate every 6 frames (adversary pass)
  const C210_ROOFS = [[0, 395, 536, 1530, 536], [0.5, 396, 552, 1531, 552], [1.0, 392, 589, 1535, 589], [1.5, 390, 643, 1540, 643],
    [2.0, 382, 708, 1543, 708], [2.5, 376, 780, 1546, 780], [3.0, 360, 855, 1549, 855], [3.5, 335, 929, 1552, 929]];
  S(null, wd('C2', 5, "i'm"), { ...over(plate(), { scene: 't2_signal_link', p: { track: C210_ROOFS, rate: 1.5 } }), method: 'video', era: ERA.room, look: LK.night,
    want: 'Crane up out of both rooms side by side: the faint signal each one hears comes from the other control room, a thin line of light between the two buildings, pulses running both ways' });
  hero(caps(lineWords('C2', 0, 0, 3)), { size: 180, y: 290, t1: LN('C2', 1).t });
  hero(caps(lineWords('C2', 2, 4)), { rows: [2, 2], size: 150, y: 190, t1: LN('C2', 3).t, out: 0.1 });

  // ============================================================================================== POST-CHORUS 2 (134.06 to 143.58)
  section('X2');
  const x2h = HITS.filter((h) => h.kind === 'post_chorus_2');
  // part two F, option B (Jade, 29 Oct): Tom Gauld's cartoon. The lights pass becomes two identical framed pictures on cream
  // paper, Jade's on the left, teal-tips' on the right, told apart only by their caption plaques (fx/gauld.js; colour = whose
  // thing, words = who is captioning). One move per two or three shouts, so the plaques keep the label rule (on >= 1 s, <= 3 words
  // a second): the dish fields captioned by Jade (shouts 1 to 3), the matched posters captioned by teal-tips (shouts 4 and 5),
  // then both hands beside the guarded switch, OUR DETERRENT from both sides, on "Counting on you!"
  const cnt2 = wd('X2', 1, 'counting').t, x2End = hit('post_chorus_2', 5).t;
  const DISH = (plate, at) => ({ plate: `work/plates/${plate}`, in: 1.2, crop: [at, 640, 760] });
  const gauldP = { beats: [
    { t0: x2h[0].t, t1: x2h[3].t, frame: [700, 470], L: DISH('C101', 980), R: { ...DISH('C201R', 960), t0: x2h[1].t },
      caps: [{ lines: ['OUR RADAR'], side: 'jade', t0: x2h[0].t }, { lines: ['THEIR TARGETING'], side: 'teal', t0: x2h[1].t }] },
    { t0: x2h[3].t, t1: cnt2, frame: [380, 532], y: 420, L: { poster: 'jade' }, R: { poster: 'teal' },
      caps: [{ lines: ['THEIR PROPAGANDA'], side: 'jade', t0: x2h[3].t }, { lines: ['OUR RESOLVE'], side: 'teal', t0: x2h[3].t }] },
    { t0: cnt2, t1: x2End + 1, frame: [700, 470], L: { img: 'work/plates/C208b/f_00000.jpg', crop: [823, 420, 760] },
      R: { img: 'work/plates/C209b/f_00000.jpg', crop: [1097, 420, 760], flipX: true },
      caps: [{ lines: ['OUR DETERRENT'], side: 'jade', t0: cnt2 }, { lines: ['OUR DETERRENT'], side: 'teal', t0: cnt2 }] },
  ] };
  const gauldW = ["Two identical framed dish fields on cream paper, Jade's left: Jade hangs OUR RADAR under hers",
    'The second frame is hung: THEIR TARGETING under teal-tips\' (Jade captioning)', 'Held: the same picture, two names',
    "The matched posters framed: teal-tips captions Jade's THEIR PROPAGANDA and her own OUR RESOLVE", 'Held: the same poster, two names'];
  for (let i = 0; i < 5; i++) S(i === 0 ? '2:14.06' : null, hit('post_chorus_2', i), { scene: 't2_gauld', p: gauldP, method: 'procedural', era: ERA.frames, look: LK.posterProc, want: gauldW[i] });
  S('2:17.21', wd('X2', 1, 'counting'), { scene: 't2_gauld', p: gauldP, method: 'procedural', era: ERA.frames, look: LK.posterProc,
    want: 'On "Counting on you!": both hands beside the guarded switch, framed side by side, OUR DETERRENT under each' });
  const setN = [1, 2, 4, 7, 12];
  // t2_chess sets the board from its own schedule (scenes/t2/chess/schedule.js: 1, 1, 2, 3, 5 pieces on the shouts, the other 20
  // on "Counting on you!"); cam 'auto' cuts on each shout to the angle that frames the pieces landing
  // part two D: as the board sets itself each king gets a tag from each player's view, colour = whose king, one per shout (the 3 words
  // a second limit): Jade's king OUR KING, then teal-tips' OUR KING, then each is also THEIR DESPOT; gone by the sit-down (X213)
  const setEnd = wd('X2', 3, 'on').t - 0.06;
  const SET_TAGS = [{ sq: 'e1', lines: ['OUR KING'], side: 'jade', t0: x2h[5].t, t1: setEnd }, { sq: 'e8', lines: ['OUR KING'], side: 'teal', t0: x2h[6].t, t1: setEnd },
    { sq: 'e1', lines: ['THEIR DESPOT'], side: 'jade', t0: x2h[7].t, t1: setEnd, slot: 1 }, { sq: 'e8', lines: ['THEIR DESPOT'], side: 'teal', t0: x2h[8].t, t1: setEnd, slot: 1 }];
  for (let i = 0; i < 5; i++) S(i === 0 ? '2:19.11' : null, hit('post_chorus_2', 5 + i), { scene: 't2_chess', p: { mode: 'set', cam: 'auto', tags: SET_TAGS }, method: 'procedural', era: ERA.chess, look: withLook(CHESS_LOOK, flash([1, 1, 1], 0.3, 0.06)),
    want: `A chessboard sets itself: pieces slam down from above (${setN[i]} on the board)` });
  S('2:22.19', wd('X2', 3, 'counting'), { scene: 't2_chess', p: { mode: 'set', cam: 'auto', tags: SET_TAGS }, method: 'procedural', era: ERA.chess, look: withLook(CHESS_LOOK, flash([1, 1, 1], 0.5, 0.08)), want: '"Counting on you!" lands the rest of the pieces' });
  // chess reviewer: the plate's analog clock stood on the board's far edge = White's left (Jade and White are on the left of frame), with
  // dials that were not a 1+0 start; it is painted out and the procedural clock is drawn on the near edge (White's right), seen from
  // behind as this camera must see it, orange button on Jade's side, teal on teal-tips' (tools/t2/chess_x213_clock.py)
  S(null, wd('X2', 3, 'on'), { ...over(plate(), { scene: 't2_chess_paint', p: { img: 'assets/t2/chess/X213_clock.png' } }), method: 'video', era: ERA.chess, look: LK.anime,
    want: 'The two Jades sit down across the board from each other; the clock on White\'s right (the near edge), seen from behind' });
  const X2_INK = [0.09, 0.08, 0.07];
  const x2Row = x2h.slice(0, 5).map((h, i) => ({ n: [1, 1, 2, 3, 5][i], t: h.t, slot: i, giant: false }));
  x2Row.push({ n: 8, t: wd('X2', 1, 'counting').t, slot: 5, giant: false });   // lands in the row: a giant 8 would cover the two switches (part two F)
  cue({ kind: 'num', label: '1 1 2 3 5 8 (row; the 8 on "Counting on you!") (the frames pass only, in ink on the paper; the board stays clear)', t0: x2Row[0].t, t1: x2h[5].t - 0.05, items: x2Row, slots: 6, size: 110, hold: 0.55, fly: 0.3, color: X2_INK, draw: drawCount });

  // ============================================================================================== BRIDGE (143.58 to 163.67): Fischer-Tal
  section('BR');
  const br0 = secStart('BR');
  // Fischer-Tal is played by t2_chess from its own ply schedule (scenes/t2/chess/schedule.js: every ply on the beat grid between
  // the plan's anchors, the clocks counting down for real, the clocks stopping on "let"); cam 'auto' is its choreography (hard cuts
  // on musical points, the 180-degree swing on "chain"), so the edit's cuts are the tracker's rows over one continuous game
  const tB1 = beat('2:26.1').t, tB2 = beat('2:28.6').t, tB3 = eighth('2:30.5').t;
  const pressT = SIXTEENTHS.filter((x) => x < br0.t - 0.02).pop();                                // Black presses the clock (143.42)
  const chess = (want, extra = {}, look = CHESS_LOOK) => ({ scene: 't2_chess', p: { mode: 'game', cam: 'auto', ...extra }, method: 'procedural', era: ERA.chess, look, want });
  // the g2 face plates cut in (Veo; their model boards are not the game position, so they are framed above the board's edge)
  const brPlate = (clip, extra, want) => ({ scene: 't2_plate', p: { clip, ...extra }, method: 'video', era: ERA.chess, look: LK.room, want });
  // Jade's note (2:26.5): every frame that shows the board shows the game's true position, and the hands make the real moves. The hand
  // shots are t2_chess on twos with cut-out arm sprites (scenes/t2/chess/hands.js, render/assets/t2/hands/) on the true board
  const handShot = (want, cam, handTracks, extra = {}) => ({ ...chess(want, { cam, handTracks, twos: true, smear: 0, ...extra }), notes: 'hand sprites: render/assets/t2/hands (nano-banana-pro on green, keyed)' });
  S('2:23.58', { t: pressT, kind: 'sixteenth', ref: 'last 16th before the drums-out beat (Black presses the clock; 1.e4 on the beat)' },
    handShot('Teal-tips Jade slaps the clock on the fill\'s last sixteenth (starting White\'s clock); Jade\'s hand slaps back on 1.e4',
      { pos: [1.45, 3.1, 0.0], target: [5.8, 0.8, 0.0], fov: 36 }, [{ side: 'b', press: 'start' }, { side: 'w', press: '1.e4' }]));
  S(null, eighth('2:23.9'), { ...chess('Premoved opening from 1.e4 on the drums-out, hands a blur; the room lights go down until only the board is lit'), sub: 'b' });
  const brBa5 = nearest(BEATS, tB1 + 0.62), holdsW = wd('BR', 1, 'holds'), breathW = wd('BR', 1, 'breath');
  // chess reviewer: the hand that makes the move hits the clock. Teal-tips Jade plays with her left hand (the clock is on White's
  // right = Black's left), and the cut a sixteenth after 5...Ba5 lands goes to the clock, where the same hand slaps her button on
  // the eighth after the move (schedule.js tp)
  S('2:26.1', beat('2:26.1'), handShot('Teal-tips Jade\'s left hand hovers a full beat over her bishop on b4, picks it up and sets it down on a5 on the beat, lets go and heads for the clock; the cut comes a sixteenth later',
    { pos: [-8.6, 3.0, 0.3], target: [-2.8, 1.3, 0.0], fov: 30 }, [{ side: 'b', move: '5...Ba5', press: true }]));
  S(null, { t: SIXTEENTHS.find((x) => x > brBa5 + 0.05), kind: 'sixteenth', ref: 'a sixteenth after 5...Ba5 lands (the hand lets go of the bishop first)' },
    { ...handShot('The same hand slaps teal-tips Jade\'s button on the clock an eighth after 5...Ba5 (starting White\'s clock); White\'s hand hovers over the b-pawn off screen (moves 5-6)',
      { pos: [1.45, 3.1, -0.35], target: [5.8, 0.8, -0.1], fov: 36 }, [{ side: 'b', press: '5...Ba5' }]), sub: 'b' });
  S(null, holdsW, { ...brPlate('BR_faceW', { in: 0.3, zoom: 1.1, pan: [0, 50] }, 'Jade (White) underlit, holding her breath; eyes in the dark around her reflect light like animals in a forest (BR_faceW; framed above the plate\'s board edge)'), sub: 'c' });
  S(null, breathW, { ...brPlate('BR_faceB', { in: 0.3, zoom: 1.1, pan: [0, 50], grade: COOL }, 'Teal-tips Jade (Black) underlit, the reverse shot; her eyes flick up and back (BR_faceB; framed above the plate\'s board edge)'), sub: 'd' });
  // Andrej (29 Oct): the hand that moves presses the clock, so after a capture it still holds the captured piece. 9.Qxg7 on "spark":
  // Jade's hand comes in as 8...dxc3 lands, takes the queen to g7 lifting the pawn off, and slaps her button (the clock's sparks)
  // with the pawn still pinched, then tosses it to the captured row (hands.js carry); the same track runs over the three shots it spans
  const QXG7 = { handTracks: [{ side: 'w', move: '9.Qxg7', press: true, carry: true, quick: true }], keepShadow: true };
  S('2:28.6', beat('2:28.6'), chess('The moves speed up: 7.Qg4 Ne7 8.bxa5 dxc3; on the last of them Jade\'s hand comes in for her queen', QXG7));
  S('2:30.32', wd('BR', 2, 'spark'), chess('The first capture, 9.Qxg7 on "spark": Jade\'s hand lands the queen on g7 and lifts the pawn off; impact frame', QXG7, withLook(CHESS_LOOK, flash([1, 1, 1], 0.9, 0.05))));
  S('2:30.5', eighth('2:30.5'), chess('Jade\'s hand slaps her clock with the captured pawn still in her fingers (sparks), tosses it to the captured row; then 9...Rg8 to 13.O-O on eighths', QXG7));
  S('2:33.04', wd('BR', 3, 'death'), chess('Black castles long on "death": kings on opposite sides, both attacks on'));
  S('2:33.69', ev('impact', /drums \+ 808 return/), chess('Drums return, 14.Bg5: the anime battle, speed lines, smash zooms', {}, withLook(CHESS_LOOK, flash([1, 1, 1], 0.6, 0.06))));
  S('2:34.15', wd('BR', 4, 'chain'), chess('The camera swings 180 degrees around the board on "chain"'));
  S(null, wd('BR', 4, 'chains'), chess('Each captured piece is knocked off the board; the captured pieces fly past the lens joined like links of a chain'));
  S('2:35.90', wd('BR', 5, 'and'), chess('19.Kh1 Qe5 20.Rxf1 Qxe6 21.Kxg2 as a sixteenth-note flurry'));
  S('2:37.48', wd('BR', 5, 'hand'), chess('21...Qg4+ on "hand": the black queen gives check, White has one legal move: perpetual (Fischer-Tal · Leipzig 1960 · ½-½ on the scoresheet)'));
  // hands off the pieces: cut on "that", so the hands open into "let go" before the dive (Black's fingers still on the queen that gave
  // check, Jade's hand over her king with its one legal move)
  { const relT = wd('BR', 5, 'let').t - 0.17;
    S(null, wd('BR', 5, 'that'), { ...handShot('Both Jades take their hands off the pieces ("that can let go"): teal-tips Jade lets go of the checking queen, Jade pulls back from her king; neither one wins',
      { pos: [7.6, 6.6, 1.0], target: [1.9, 0.9, 1.0], fov: 36 }, [{ side: 'b', hold: 'g4', release: relT }, { side: 'w', hold: 'g2', hover: true, release: relT + 0.03 }]), sub: 'b' }); }
  // the dive into the black queen ends on a flat 360 px #101010 square on #F1E8D6, the frame t2_poster_morph opens on: the dive's
  // window ends exactly on the poster shot's cut ("go"), and the poster's square0 matches the dive's size
  const letW = wd('BR', 5, 'let'), goW = wd('BR', 5, 'go'), sixty2 = wd('BR', 6, 'sixty-two');
  S('2:38.10', letW, { scene: 't2_chess', p: { mode: 'dive', d0: letW.t, d1: goW.t, size: 360 }, method: 'procedural', era: ERA.chess, look: DIVE_LOOK,
    want: 'On "let go" the clocks stop and neither one wins; the camera dives into the black queen until her silhouette is a flat black square',
    notes: 'was the hands-off plate; the dive needs the window between "let" and "go" (the poster cut on "go" is fixed)' });
  S('2:37.8', goW, { scene: 't2_poster_morph', p: { t0: goW.t, t1: sixty2.t, tLock: nearest(SIXTEENTHS, (goW.t + sixty2.t) / 2), square0: 360, zoom0: 1.3 }, method: 'procedural', era: ERA.poster, look: LK.posterProc,
    want: 'The black square tilts, a red wedge drives in, the board\'s squares slide into a Suprematist composition that assembles into a Soviet poster (ends on t2_arkhipov\'s opening frame)',
    notes: 'plan starts the dive at 2:37.8; here the dive runs "let" to "go" and the morph "go" to "sixty-two"' });
  // t2_arkhipov: one poster scene whose layout changes on the words (charges / fire / hand / NO); NO is its own poster lettering
  const twoW = wd('BR', 7, 'two'), arkW = wd('BR', 7, 'arkhipov'), noT = wd('BR', 7, 'no');
  const charges = EIGHTHS.filter((x) => x > sixty2.t + 0.45 && x < twoW.t - 0.1);                // practice charges on the eighths
  const buildT = wd('BU', 0, 'hunters').t;
  // the surfacing would get one frame before the build, so NO holds to the cut (tSurface after it)
  const arkP = { charges, tFire: twoW.t, tHand: arkW.t, tNo: noT.t, tSurface: buildT + 1, zoom0: 1.3 };
  const arkLook = (t) => ({ ...LK.posterProc, shakeX: 7 * charges.reduce((m, x) => Math.max(m, shk(t, x + 0.7, 1)), 0) * Math.sin(t * 83), shakeY: shk(t, noT.t, 10) });
  // part two C: the same practice depth charges under two names: from the destroyers OUR SIGNAL (to surface), from inside the hull
  // THEIR ATTACK (they sounded like real ones); both Jade's orange, the destroyers' thing. From the first charge, after the pull-back
  const B59 = { scene: 't2_labels', p: { labels: [{ lines: ['OUR SIGNAL'], side: 'jade', at: [1470, 140], h: 48, t0: arkP.charges[0] },
    { lines: ['THEIR ATTACK'], side: 'jade', at: [1690, 600], h: 48, t0: arkP.charges[1] }] } };
  S('2:38.76', sixty2, { scene: 'multi', p: { layers: [{ scene: 't2_arkhipov', p: arkP }, B59] }, method: 'procedural', era: ERA.poster, look: arkLook,
    want: 'Pull back out of the poster into the Arkhipov scene (newsprint-halftone poster): B-59, batteries nearly dead, trapped under US destroyers; practice depth charges fall as black dots' });
  S('2:41.23', twoW, { scene: 't2_arkhipov', p: arkP, method: 'procedural', era: ERA.poster, look: arkLook,
    want: 'Two officers in red silhouette, faces in shadow and unnamed, one pointing toward the torpedo room (anonymous; no one else shown as a hawk)' });
  S('2:42.19', arkW, { scene: 't2_arkhipov', p: arkP, method: 'procedural', era: ERA.poster, look: arkLook, want: "Arkhipov's open hand comes up between them, full frame (anonymous period figure)" });
  S('2:43.34', noT, { scene: 't2_arkhipov', p: arkP, method: 'procedural', era: ERA.poster, look: arkLook,
    want: 'NO in poster lettering fills the frame (drawn by t2_arkhipov)', notes: 'B-59 surfacing (t2_arkhipov mode surface) has no room before the build at 2:43.67' });

  // ============================================================================================== BUILD (163.67 to 183.88)
  section('BU');
  // Jade's note (v2): the rewind needs time and must rewind the galactic war too. Re-timed (all from timing.json): the destruction is
  // tightened (the warheads land from "burn", the lights are out by ~170.3: war clock fall' = 40% of the way from "burn" to "fall"),
  // the console cut moves from "Only" to "fall", and the rewind runs from "Only" (170.83) to the beat before "all" (173.88), 3.05 s:
  // the lights flicker back, the warheads lift off the cities, the pull-out where the galaxy's dark worlds relight, the tracks fall
  // back into the silos and submarines; then Earth whole, its node lighting on the graph through "all" to "Hold your fire" (175.06).
  const burn = wd('BU', 2, 'burn'), fall = wd('BU', 2, 'fall'), onlyW = wd('BU', 3, 'only'), allW = wd('BU', 4, 'all');
  const huntT = wd('BU', 0, 'hunters').t, fireT = wd('BU', 1, 'fire').t;
  const wholeB = beatK(allW.t - 0.2, 0, 'beat before "all": Earth whole (the rewind stops)');
  const WT = { hunt: huntT, fire: fireT, burn: burn.t, fall: lerp(burn.t, fall.t, 0.4), rw0: onlyW.t, whole: wholeB.t, end: wd('BU', 5, 'hold').t };
  // the rewind's war clock: piecewise in screen time (fractions of the 3.05 s), so each part gets its share
  const RWK = [[0, WT.rw0], [0.06, WT.fall + 0.55], [0.3, WT.burn - 0.14], [0.68, WT.fire - 0.13], [0.94, WT.hunt + 0.58], [1, WT.hunt - 0.35]];
  const rwClock = (t) => {
    // past the stop the clock keeps drifting back slowly (before the first launch, so nothing fires): the globe never freezes
    if (t > WT.whole - 0.12) return RWK[RWK.length - 1][1] - 1.5 * (t - (WT.whole - 0.12));
    const u = clamp((t - WT.rw0) / (WT.whole - 0.12 - WT.rw0));
    let k = 0; while (k + 2 < RWK.length && u > RWK[k + 1][0]) k++;
    const [a, wa] = RWK[k], [b, wb] = RWK[k + 1];
    return lerp(wa, wb, easeInOutCubic(clamp((u - a) / (b - a))) * 0.35 + clamp((u - a) / (b - a)) * 0.65);
  };
  const warP = { times: WT };
  S('2:43.67', wd('BU', 0, 'hunters'), { scene: 't2_war', p: warP, method: 'procedural', era: ERA.war, look: LK.war,
    want: "The Rare Earth war scene: Earth's night side over the pole, missile tracks rising from both sides' silo fields and from submarines" });
  S('2:46.93', wd('BU', 1, 'fire'), { scene: 't2_war', p: warP, method: 'procedural', era: ERA.war, look: LK.war, want: 'Pull out to the contact graph: elsewhere in the galaxy, worlds fire on each other and go dark one by one' });
  S('2:49.44', burn, { scene: 't2_war', p: warP, method: 'procedural', era: ERA.war, look: LK.war, want: 'Back on Earth the warheads land and the lights go out (tightened: dark by ~170.3)' });
  // BU04 must read as a rewind from its first frame, never a launch (Jade, 28 Oct): the wheel spins backward (blur arcs and chevrons,
  // counter-clockwise), its red cast lifted (grade.fix 'neutral' on the platter), the VCR's REW chevrons in the OSD corner (top right), the
  // VHS rewind lines already running under her hand, and SIGNAL LOST on the dead monitor she is looking at (it sat under her hand).
  // Tracks by plate frame (in 0.4, rate 3.0 -> frames ~10-64), measured on the BU04 plate: the platter's top ellipse, the monitor's quad
  const BU04_WHEEL = [[10, 955, 705, 645, 155], [22, 900, 730, 600, 130], [34, 905, 825, 415, 95], [46, 855, 930, 345, 90], [58, 845, 945, 275, 90], [64, 870, 935, 260, 88]];
  const BU04_SCREEN = [[22, [[-15, -180], [367, -145], [367, 115], [-15, 165]]], [30, [[95, 0], [423, 23], [424, 266], [94, 316]]], [34, [[151, 79], [453, 116], [452, 342], [148, 393]]],
    [38, [[195, 166], [479, 197], [480, 413], [193, 459]]], [42, [[239, 239], [501, 266], [503, 469], [236, 516]]], [46, [[273, 301], [520, 324], [523, 519], [270, 563]]],
    [50, [[300, 348], [535, 371], [539, 557], [297, 601]]], [54, [[321, 385], [547, 406], [551, 588], [317, 631]]], [58, [[336, 413], [557, 432], [560, 611], [332, 652]]],
    [62, [[344, 430], [563, 448], [566, 626], [342, 666]]]];
  const BU04_NEUTRAL = { mode: 'neutral', col: [0.86, 0.8, 0.7], satMax: 0.42, track: BU04_WHEEL.map(([f, x, y, rx, ry]) => [f, x, y + ry * 0.35, [rx * 1.06, ry * 1.6]]) };
  S('2:50.83', fall, { scene: 'multi', p: { layers: [{ scene: 't2_plate', p: (t, lt) => ({ clip: 'BU04', rate: 3.0, grade: { contrast: 1.08, lift: -0.04, sat: 0.88, fix: [BU04_NEUTRAL] }, vhs: 0.3 + 0.4 * clamp(lt / 0.76), vhsP: { rewind: 1 } }) },
      { scene: 't2_rewind_console', p: { in: 0.4, rate: 3.0, wheel: BU04_WHEEL, screen: BU04_SCREEN, osd: { x: 1390, y: 130, size: 130 } } }] },
    method: 'video', era: ERA.room, look: LK.room,
    want: 'Jade at her console spins the jog wheel BACKWARD from the first frame: the wheel blurs counter-clockwise, REW chevrons, the VHS rewind lines start under her hand; SIGNAL LOST on the dead monitor she is staring at',
    notes: 'moved from "Only" (2:50.83) to "fall" so the rewind gets 3 s; rate 3.0: hand on the wheel to her face in 0.76 s. Adversary pass: reads as a rewind, never a launch (Jade, 28 Oct)' });
  S(null, onlyW, { scene: 't2_war', p: (t) => ({ ...warP, rewind: true, w: rwClock(t) }), method: 'procedural', era: ERA.war, look: LK.war,
    want: 'VHS rewind (3 s): the lights flicker back, the warheads lift off the cities, the galaxy\'s dark worlds relight, the tracks fall back into silos and submarines',
    notes: 'starts on "Only" (the plan\'s console time); the war clock is piecewise so Earth and the galaxy each get their share' });
  S('2:53.25', wholeB, { scene: 't2_war', p: (t) => ({ ...warP, rewind: true, w: rwClock(t) }), method: 'procedural', era: ERA.light, look: LK.light,
    want: "Earth whole again; the camera pulls out and Earth's node on the contact graph lights again (through \"all\")", notes: 'moved from "out" (173.25) to the beat before "all": the rewind runs through "out there"' });
  reserve(1);                                                                     // BU07 (the graph cut on "all") is now inside BU06's pull-out
  const hold1 = wd('BU', 5, 'hold'), show1 = wd('BU', 5, 'show');
  // the scroll laid 200 px right (column and seal move with it), so HOLD YOUR sits left of the column (polish 4: YOUR ran under 燼)
  S('2:55.06', hold1, { scene: 't2_scroll_warning', p: { phase: 'held', text: '有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。', colX: 1310, paperX: [490, 1462] }, method: 'procedural', era: ERA.ink, look: LK.ink, want: "The people who held fire, 1: the alchemists' warning scroll" });
  S(null, wd('BU', 5, 'fire'), { ...plate({ style: 'oil' }), method: 'video', era: ERA.oil, look: LK.oil, want: 'The people who held fire, 2: Petrov, oil portrait lit by the screen' });
  S(null, barAfter(wd('BU', 5, 'fire').t, 'bar line after "fire"'), { ...still({ style: 'halftone' }), method: 'still', era: ERA.poster, look: LK.poster, want: 'The people who held fire, 3: Arkhipov, poster halftone' });
  S(null, show1, { scene: 't2_earth_night', p: { view: 'cities_on', t0: show1.t }, method: 'procedural', era: ERA.lights, look: LK.night, want: 'On "Show your light" the cities come on across the night side' });
  S('3:00.09', wd('BU', 6, 'hold'), { ...split({}, {}, 2, WALL), method: 'video', era: ERA.room, look: { ...LK.room, bloom: 0.28, bloomThreshold: 0.93, halation: 0.1 }, want: 'Both Jades raise a hand light at their consoles, a wall between them: the same gesture on both sides, parallel, not together (split)' });
  const roll2 = ev('snare_roll', /BUILD/);
  const dropT = LN('DR', 0).t;
  const rollBeats = [roll2.t, ...BEATS.filter((b) => b > roll2.t + 0.05 && b < dropT - 0.3)];
  // the hand-light plates: the room look with little bloom (the lights must not wash the faces white)
  const LK_HAND = { ...LK.room, bloom: 0.28, bloomThreshold: 0.93, halation: 0.1 };
  const rollW = [['video', plate(), 'Jade raises her hand light, close'], ['video', plate({ grade: COOL }), 'Teal-tips Jade raises her hand light, close (her cool cast)'], ['procedural', { scene: 't2_earth_night', p: { view: 'cities_on', t0: show1.t } }, 'Cities across the night side, brighter'],
    ['procedural', { scene: 't2_graph_outro', p: { reveal: false, wave: [roll2.t, roll2.t + 1.2] } }, 'The contact graph, every node lit'], ['video', split({}, {}, 2, WALL), 'Both hand lights held up on either side of the wall; the frame burns to white for the drums cut']];
  rollBeats.forEach((b, i) => {
    const [m, sc, w] = rollW[i % rollW.length];
    S(i === 0 ? '3:00.80' : null, i === 0 ? roll2 : { t: b, kind: 'beat', ref: `beat ${i} of the build roll` }, { ...sc, method: m, era: m === 'video' ? ERA.room : ERA.light,
      look: i === rollBeats.length - 1 ? (t) => ({ ...LK_HAND, flash: smooth(range(t, b + 0.25, dropT)), flashCol: [1, 1, 1] }) : (m === 'video' ? LK_HAND : LK.light), want: `${w} (cut rate doubles on the roll: one per beat)` });
  });
  // on a dark plate (red caps over the red Earth did not read); SIGNAL LOST stays up while Jade sees it and grabs the jog wheel
  cue({ kind: 'cap', label: 'NUCLEAR DETONATIONS', t0: burn.t - 0.05, t1: fall.t, y: 960, draw: drawCaps, color: [1, 0.42, 0.3], band: true,
    lines: [{ text: 'NUCLEAR DETONATIONS', t: burn.t - 0.05, size: 46 }] });   // 46 px (was 30): reads on a phone (polish 4)
  // (adversary pass: SIGNAL LOST is now on the monitor she is reacting to in BU04, t2_rewind_console; the cap under her hand is gone)
  hero(caps(lineWords('BU', 5, 0, 3)), { size: 170, y: 280, t1: show1.t, color: P.cream, hot: P.goldPale, shade: 1, glow: 2 });   // HOLD YOUR FIRE (cream with a full shade: red is for fire)
  hero(caps(lineWords('BU', 6, 3, 6)), { size: 150, y: 960, t1: Math.min(dropT, rollBeats[rollBeats.length - 1] + 0.3), color: P.goldPale, hot: GOLD_HOT, shade: 0.8 });   // SHOW YOUR LIGHT (lower third: the closing split's faces fill the upper half; out as the frame burns white)

  // ============================================================================================== DROP (183.88 to 213.04): the mirror
  section('DR');
  // t2_mirror is the stage: the plane, the swing round it, the ripple, the vanish; each shot's generated frame (both sides, the
  // plane at x 960, as the DR keyframes are composed) comes in as p.full; without it the scene draws its own stand-ins.
  // PALM: where the palms meet on the glass = the centre of the phyllotaxis disk the ripple rings become
  const PALM = [960, 470];
  const mirror = (phase, want, extra = {}, more = {}) => ({ scene: 't2_mirror', p: { phase, full: { scene: 't2_plate', p: { clip: '@' } }, palm: PALM, ...extra }, method: 'video', era: ERA.mirror, look: { ...LK.mirror, tonemap: 0 }, want, ...more });
  S('3:03.88', wd('DR', 0, "couldn't"), mirror('approach', 'Drums out, held pad. A white void: Jade walks toward an infinitely large mirror that divides the frame; her side drawn in signal-print inks'));
  S('3:06.42', wd('DR', 1, 'message'), mirror('reflection', 'She reaches the glass and sees what looks like her reflection'));
  const impact = ev('impact', /DROP IMPACT/);
  // a swing that reads in one look: the two-frame impact, a three-frame whip (smear capped), then the clean reveal (g4's still)
  S('3:08.355', impact, mirror('swing', 'Impact frame; the camera swings around the plane: on the other side is teal-tips Jade, in her own world and palette, in exactly the same pose', { impactT: impact.t, swingDur: 0.13, blurMax: 220 }, {
    look: withLook({ ...LK.mirror, tonemap: 0 }, (t, lt) => ({ flash: lt > 2 / 24 ? 0.5 * Math.exp(-(lt - 2 / 24) / 0.08) : 0, flashCol: [1, 1, 1] })) }));
  // part two G: the labels come off. Seen from teal-tips' side of the glass (she is on the left here, Jade on the right), each one
  // still carries the names the other side gave her things, in her own colour; they peel off and fall away on "You", "were" and the
  // next beat, so by the palms (DR05) there are two identical people with their hands raised
  const PEEL = [wd('DR', 2, 'you', 1).t, wd('DR', 2, 'were', 1).t, beatK(wd('DR', 2, 'were', 1).t, 0).t];
  const peelTags = ['PROPAGANDA', 'PROVOCATION', 'FIRST STRIKE']   // PROPAGANDA: C103's displays (was SPY STATION)
    .flatMap((w, i) => [
    { lines: ['THEIR', w], side: 'teal', at: [175, 430 + i * 190], h: 36, rot: -0.05 + 0.04 * i, peel: { t: PEEL[i], dir: -1 } },
    { lines: ['THEIR', w], side: 'jade', at: [1760, 430 + i * 190], h: 36, rot: 0.05 - 0.04 * i, peel: { t: PEEL[i], dir: 1 } }]);
  const dr04 = S('3:08.68', wd('DR', 2, 'but'), mirror('hands_rise', 'Both raise a hand; teal-tips Jade sings "but you were. You were counting too."; the labels the other side gave each of them peel off and fall', {}, { method: 'seedance_sung' }));
  dr04.scene = 'multi'; dr04.p = { layers: [{ scene: 't2_mirror', p: dr04.p }, { scene: 't2_labels', p: { labels: peelTags } }] };
  // the palms touch on "too": DR05's contact frame (clip 3.40, g4) lands on the cut to DR06, which holds them together (rate 0.8 so
  // the plate's last frame is reached at the shot's end, not before)
  const tooT = wd('DR', 2, 'too').t, countingT2 = wd('DR', 2, 'counting').t;
  // adversary pass (item 5): the palms rhyme with the let-go (BR11b, 2:37.79). DR05 opens framed like BR11b, its palms raised to where
  // the chess hands opened (y ~330; at zoom 1.2 they keep about BR11b's scale), and eases back to the glass's own framing by the cut on
  // "too" (DR06's ripple centre is unchanged); BR11b's let-go frame (assets/t2/rhyme/br11b_letgo.jpg, a still of the edit's own
  // frame at 2:38.08, faded out below the hands) dissolves out over DR05's first five frames
  const dr05In = 3.40 - (tooT - countingT2), dr05Dur = tooT - countingT2;
  const dr05Cam = (lt) => { const u = easeInOutCubic(clamp(lt / dr05Dur)); const z = lerp(1.2, 1, u); return { zoom: z, pan: [0, lerp(-100, 0, u)] }; };
  const palms = S(null, wd('DR', 2, 'counting'), mirror('palms_meet', 'The palms meet on the glass on "too"; the shot opens framed like the let-go at the chess board (BR11b) and a ghost of those hands dissolves into these',
    { full: { scene: 't2_plate', p: (t, lt) => ({ clip: 'DR05', in: dr05In, ...dr05Cam(lt) }) } }));
  palms.scene = 'multi';
  palms.p = { layers: [{ scene: 't2_mirror', p: palms.p }, { scene: 't2_still', p: (t, lt) => ({ img: 'assets/t2/rhyme/br11b_letgo.jpg', alpha: 0.42 * (1 - clamp(lt / (5 / 24))) }) }] };
  const rippleShot = S(null, wd('DR', 2, 'too'), mirror('ripple', 'On "too" the mirror starts to ripple (rings spread from the palms)', { rippleT: tooT, full: { scene: 't2_plate', p: { clip: '@', in: 3.40, rate: 0.8 } } }));
  const dropHits = HITS.filter((h) => h.kind === 'drop_counts');
  const phyllo = (want, k) => ({ scene: 'phyllo', p: { center: PALM, radius: 360 }, method: 'reuse', era: ERA.light,
    look: (t, lt) => ({ ...LK.light, zoom: 1 + 0.04 * Math.exp(-lt / 0.2), flash: 0.14 * Math.exp(-lt / 0.16), flashCol: [1, 0.8, 0.45] }), want });
  S('3:14.01', hit('drop_counts', 0), phyllo('The ripple rings become take one\'s phyllotaxis disk of 610 worlds; links n to n+13 light as 13 spiral arms'));
  S('3:14.62', hit('drop_counts', 1), phyllo('21 spiral arms'));
  S('3:15.27', hit('drop_counts', 2), phyllo('34 spiral arms'));
  // the ring links open on the line's words after "Link" (by, link, we, broke, chain, fear: centre outward), each into two hands
  const linkW = LN('DR', 4).words;
  const opens = ['by', 'link', 'we', 'broke', 'chain', 'fear'].map((w) => linkW.find((x, i) => i > 0 && norm(x.w) === w).t);
  // hud 0: the disk's corner legend would repeat the sung "LINK BY LINK" in micro type under the lyric (polish 4)
  S('3:15.84', wd('DR', 4, 'link'), { ...over({ scene: 'phyllo', p: { center: PALM, radius: 360, hud: 0 } }, { scene: 't2_chain_links', p: { center: PALM, radius: 360, opens, t0: wd('DR', 4, 'link').t } }), method: 'procedural', era: ERA.light, look: LK.light,
    want: 'A chain runs through the disk; each link opens into two hands letting go, and the hands become edges of the graph' });
  // the mirror vanishes on "alone": the plane flares and is gone, the two halves give way to the side-by-side plate (p.both)
  const dr11 = S('3:18.93', wd('DR', 5, 'alone'), { scene: 't2_mirror', p: { phase: 'gone', full: { scene: 't2_plate', p: { clip: rippleShot.id, at: 99 } }, both: { scene: 't2_plate', p: { clip: '@' } }, palm: PALM, vanishT: wd('DR', 5, 'alone').t },
    method: 'seedance_sung', era: ERA.mirror, look: { ...LK.mirror, tonemap: 0 }, want: 'The mirror vanishes (t2_mirror): the two Jades stand side by side and look up, singing; on "we", one word over both of them, once: OUR' });
  // part two G: "alone, we never would've made it here": on "we" the one label left, over both of them, half each one's colour.
  // Nothing is labelled after this
  dr11.scene = 'multi'; dr11.p = { layers: [{ scene: 't2_mirror', p: dr11.p }, { scene: 't2_labels', p: { labels: [{ lines: ['OUR'], side: 'both', at: [960, 610], h: 120, t0: wd('DR', 5, 'we').t, t1: wd('DR', 5, 'here').t + 0.45 }] } }] };
  S('3:21.55', hit('drop_counts', 3), phyllo('55 spiral arms'));
  S('3:22.26', hit('drop_counts', 4), phyllo('89 spiral arms; the disk relaxes back into the galaxy'));
  const andSeen = wd('DR', 7, 'and');
  // RC2 (QA_RC1 #6): a 9 px screen on DR14's cloud sky, so it does not beat into moire at phone size
  S('3:22.89', andSeen, { ...over(still({ style: 'riso', styleP: { cell: 9, minDot: 0.08, screen: 0.85 } }), { scene: 't2_tower_bursts', p: { mode: 'ring', t0: andSeen.t, fill: 0.9, ring: DR14_RING, hide: DR14_HIDE } }), method: 'still', era: ERA.signal, look: LK.riso, want: "On Echo the signal tower's ring lights up" });
  S(null, barAfter(wd('DR', 7, 'too').t, 'bar line after "too" (inside the held note)'), { scene: 't2_echo_night', p: { tRing: andSeen.t }, method: 'procedural', era: ERA.signal, look: LK.light,
    want: "Echo's night side shows its cities linked like a constellation (Rare Earth continuity)" });
  S(null, wd('DR', 7, 'wherever'), { ...plate(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Cut back to the two Jades at one console, receiving; teal-tips Jade sings "wherever you are"' });
  const drNums = (ns, hs, t1) => cue({ kind: 'num', label: ns.join(' '), t0: hs[0].t, t1, items: ns.map((n, i) => ({ n, t: hs[i].t, slot: i, giant: false })), slots: ns.length, size: 150, gap: 250, y: 960, draw: drawCount });
  drNums([13, 21, 34], dropHits.slice(0, 3), LN('DR', 4).t + 0.6);
  drNums([55, 89], dropHits.slice(3, 5), andSeen.t + 0.5);
  // ink on the white void (cream would vanish): near-black, hot Klein blue as each word lands, no dark halo
  hero([{ text: 'YOU', t: wd('DR', 2, 'you', 1).t }, { text: 'WERE', t: wd('DR', 2, 'were', 1).t }, { text: 'COUNTING', t: wd('DR', 2, 'counting').t }, { text: 'TOO', t: wd('DR', 2, 'too').t }],
    { rows: [2, 2], size: 150, y: 200, t1: dropHits[0].t, color: [0.06, 0.07, 0.12], hot: [0.0, 0.18, 0.66], glow: 0, shade: 0 });

  // ============================================================================================== OUTRO (213.04 to 247.16)
  section('OU');
  S('3:33.04', wd('OU', 0, 'six'), { scene: 't2_graph_outro', p: { tSix: wd('OU', 0, 'six').t }, method: 'procedural', era: ERA.light, look: LK.light, want: 'The contact graph of 600-plus worlds over the Milky Way, slow orbit (the Rare Earth finale image)' });
  S('3:38.87', wd('OU', 1, 'every'), { scene: 't2_graph_outro', p: { tSix: wd('OU', 0, 'six').t }, method: 'procedural', era: ERA.light, look: LK.light,
    want: 'Each world flickers red once, its own near-miss, then holds gold; the near-silences between phrases stay empty' });
  const drumsZ = ev('impact', /Outro/);
  const whisp = HITS.filter((h) => h.kind === 'outro_whisper');
  const higher = wd('OU', 3, 'higher');
  // t2_counter is one continuous board (it resets on the real dates of the list on a grid from the drums' return, climbs past the
  // last reset on "higher"), so the whispered-count cuts are one shot; b0 and "higher" come from the timing
  // the 29 resets (30 entries; two share 27 Oct 1962) run through the whispered count and end (the 15 Sep 2026 entry, with its own
  // flash) on "count" of "The count goes higher"; the climb then lands on the release-date value (RELEASE: 42 on 27 Oct 2026) just after "higher" begins, digits rolling upward into it, and holds it to the cut
  // the days counter's release date (a parameter: Jade may move it; 15 Sep 2026 -> 27 Oct 2026 reads 42)
  const RELEASE = '2026-10-27';   // Jade: keep the board at 42 (the release is planned for 1 Nov, but 42 stays)
  const counterP = { b0: nearest(BEATS, drumsZ.t), higher: higher.t, release: RELEASE, gaps: [6, 4, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, ...Array(17).fill(1)], climbEnd: higher.t + 0.04 };
  S('3:44.33', drumsZ, { scene: 't2_counter', p: counterP, method: 'procedural', era: ERA.newsprint, look: COUNTER_LOOK,
    want: '[ N ] DAYS SINCE LAST RESET on a factory safety board: counts from 9 Aug 1945 and snaps to zero on every near-miss entry (two-frame red SIGNAL LOST, VHS flicker, the year beside the number), faster through the whispered count, the last reset the 15 Sep 2026 entry; then it climbs to the release-date value (RELEASE: 42 on 27 Oct 2026; recompute if the date moves), digits rolling up on "higher"' });
  reserve(6);                                                                                                            // the board's other cuts keep their numbers
  // the counter itself does not come back here (t2_counter has no corner view): the ISS crossing carries the shot
  S('3:50.04', hit('outro_whisper', 4), { ...over(plate(), { scene: 't2_iss_pass', p: {} }), method: 'video', era: ERA.light, look: LK.night,
    want: 'The ISS (t2_iss_pass, a steady bright point) crosses the night sky over the dish field' });
  S('3:53.17', wd('OU', 5, 'hold'), { ...plate(), method: 'video', era: ERA.room, look: LK.photo, want: 'Jade lowers her headphones and looks out over the dishes at dawn (drums cut at 3:54.31)' });
  S('3:58.5', ev('vocal_gap'), { ...plate(), method: 'video', era: ERA.spiral, look: LK.photo, want: "Extreme close-up of Jade's eye, returning to the opening frame" });
  // the loop: the opening plate's first frame, the push running back to the opening framing (zoom 1) by the final hit; the end
  // card then lays the title and credits over that same frame and gives it back clean at the end of the file (= frame 0)
  const finalHit = ev('impact', /FINAL HIT/);
  const holdLast = wd('OU', 6, 'hold');
  // one linear pull back from 4:02.08 to the last frame of the file (under the end card too), so the held first frame never sits
  // still: it reaches the opening framing (zoom 1) exactly at the end, which is frame 0 again
  const z0 = 1.06, back = (1 - 1 / z0) / (A.duration - holdLast.t);
  const zHit = z0 * (1 - back * (finalHit.t - holdLast.t)), backHit = (1 - 1 / zHit) / (A.duration - finalHit.t);
  S('4:02.08', holdLast, { scene: 't2_plate', p: { clip: coEye.id, at: 0, zoom: z0, push: -back }, method: 'video', era: ERA.spiral, look: LK.photo, want: "The opening frame itself (CO01's first frame, easing back to the opening framing), so the post loops cleanly" });
  S('4:04.05', finalHit, { scene: 't2_endcard', p: { hitT: finalHit.t, endT: A.duration, titleLoop: true, support: ['FLUX Video Upscale'], under: { scene: 't2_plate', p: { clip: coEye.id, at: 0, zoom: zHit, push: -backHit } } }, method: 'procedural', era: ERA.light,
    look: withLook({ ...LK.photo, tonemap: 0 }, flash([1, 0.85, 0.55], 0.35, 0.08)),   // tonemap 0 like the plate it ends on (frame 0)
    want: 'HOLD FIRE lands on the final hit (the opening title\'s type and place), then the credits; the card clears to the opening frame by the end of the file (loop)',
    notes: 'no real images are used so far (every picture is generated or drawn): add p.images [{credit: "ESA/Hubble"}] / NASA if one is; p.support adds FLUX Video Upscale (RC2: the 720p sung and close-up plates are built from its 1080p upscales, picks2 `upscaled`)' });

  // ---------------------------------------------------------------------------------------------- finish: contiguous cuts, type per shot
  // a subtitle gives way to the next one (both sit on the same lower-third baseline): no cross-faded double line
  const subs = cues.filter((c) => c.kind === 'sub').sort((x, y) => x.t0 - y.t0);
  for (let i = 0; i + 1 < subs.length; i++) if (subs[i].t1 > subs[i + 1].t0 - 0.02) subs[i].t1 = subs[i + 1].t0 - 0.02;
  shots.sort((a, b) => a.t0 - b.t0);
  // plates are display-referred: shots whose picture is a plate get the toolkit's tonemap 0 unless their look sets one
  const PLATE_SCENES = new Set(['t2_plate', 't2_still', 't2_split']);
  const baseOf = (L) => (L.scene === 't2_first' ? L.p.chain[0] : L);
  const plateBased = (s) => PLATE_SCENES.has(s.scene) || (s.scene === 'multi' && PLATE_SCENES.has(baseOf(s.p.layers[0]).scene));
  for (const s of shots) {
    if (!plateBased(s)) continue;
    const L = s.look;
    s.look = typeof L === 'function' ? (t, lt, ctx) => ({ tonemap: 0, ...L(t, lt, ctx) }) : { tonemap: 0, ...(L || {}) };
  }
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    s.t1 = i + 1 < shots.length ? shots[i + 1].t0 : A.duration;
    if (!(s.t1 > s.t0)) throw new Error(`shot ${s.id} has no length (${s.t0} -> ${s.t1}); next ${shots[i + 1] && shots[i + 1].id}`);
    s.cues = cues.filter((c) => c.t1 > s.t0 && c.t0 < s.t1);
    const cs = s.cues;
    s.type = cs.length ? (ty, t) => { for (const c of cs) if (t >= c.t0 - 0.05 && t < c.t1) c.draw(ty, t, c); } : null;
  }
  shots.cues = cues;
  return shots;
}

// Global rhythm layer: a kick zoom punch and CA in the choruses, the build and the drop.
export function buildGlobalPost(A) {
  const hot = A.sections.filter((s) => /Chorus|Drop|Build/.test(s.name) && !/Pre/.test(s.name));
  return (t) => {
    const s = hot.find((x) => t >= x.start && t < x.end);
    if (!s) return {};
    const k = A.kick(t, 0.09);
    return { zoom: 1 + 0.01 * k, ca: 0.6 * k };
  };
}
