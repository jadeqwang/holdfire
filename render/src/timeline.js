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
        const hot = 1 - easeOutCubic(range(t, w.t, w.t + 0.3));
        const col = mixc(c.color || P.cream, c.hot || P.goldPale, hot);
        const sc = c.mode === 'fade' ? 1 : lerp(1.18, 1, easeOutExpo(k));
        cx.save(); cx.translate(x + ww / 2, y - size * 0.35); cx.scale(sc, sc); cx.translate(-(x + ww / 2), -(y - size * 0.35));
        ty.text(w.text, x, y, { ...st, color: col, alpha: (c.mode === 'fade' ? easeOutCubic(k) : k) * fade * (c.alpha ?? 1), glow: c.glow ?? 3, shade: c.shade ?? 0.55 });
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

// NUM row: c = {items: [{n, t, slot, giant, out}], slots, y (row centre), size (row), giantSize, t1, hold, fly}
function drawCount(ty, t, c) {
  const fade = 1 - smooth(range(t, c.t1 - 0.3, c.t1));
  if (fade <= 0) return;
  const N = c.slots, gap = c.gap || 140;
  const sx = (i) => SAFE.cx + (i - (N - 1) / 2) * gap;
  const hold = c.hold ?? 0.3, fly = c.fly ?? 0.22;
  const st = { font: 'Archivo', weight: 900, stretch: '100%', align: 'center', base: 'middle' };
  // which item currently owns each slot (a later item on the same slot replaces the earlier one)
  const owner = {};
  c.items.forEach((it, i) => { if (t >= it.t - 0.02 && !(it.out != null && t >= it.out)) owner[it.slot] = i; });
  c.items.forEach((it, i) => {
    if (owner[it.slot] !== i) return;
    const u = t - it.t;
    const hot = 1 - easeOutCubic(range(u, 0, 0.35));
    const col = mixc(c.color || P.gold, GOLD_HOT, hot);
    if (it.giant && u < hold + fly) {
      const k = clamp((u + 0.02) / 0.16);
      const v = easeInOutCubic(range(u, hold, hold + fly));
      const s = lerp(c.giantSize || 600, c.size || 120, v) * lerp(1.25, 1, easeOutExpo(k));
      ty.text(String(it.n), lerp(SAFE.cx, sx(it.slot), v), lerp(c.giantY ?? 540, c.y ?? 880, v), { ...st, size: s, color: col, alpha: k * fade, glow: 4, shade: 0.5 });
    } else {
      const k = it.giant ? 1 : easeOutExpo(clamp((u + 0.02) / 0.14));
      const s = (c.size || 120) * lerp(1.3, 1, k);
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
    const y0 = (c.y ?? 960) - 42, h = (c.lines.length - 1) * (c.lead ?? 44) + 62;
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
  oil: { bloom: 0.3, bloomThreshold: 0.8, halation: 0.45, halCol: [1.0, 0.15, 0.06], vignette: 0.5, grain: 0.04 },
  newsprint: { bloom: 0.12, bloomThreshold: 0.95, vignette: 0.2, grain: 0.045, typeGlow: 0.1 },
  gold: { bloom: 0.6, bloomThreshold: 0.8, halation: 0.15, vignette: 0.25, grain: 0.02 },
  anime: { bloom: 0.5, bloomThreshold: 0.8, vignette: 0.25, grain: 0.02 },
  poster: { bloom: 0.12, bloomThreshold: 0.95, vignette: 0.2, grain: 0.045, typeGlow: 0.1 },
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

// near-miss years (plan, "On-screen list"), for the counter's resets; the last is the 2025 entry
const NEAR_MISS_YEARS = [1950, 1957, 1958, 1960, 1961, 1962, 1962, 1962, 1962, 1966, 1967, 1968, 1968, 1968, 1973, 1979, 1979, 1980, 1980, 1980, 1983, 1983, 1995, 2007, 2010, 2022, 2025];

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
  const S = (plan, anchor, spec) => {
    counters[SEC] = (counters[SEC] || 0) + 1;
    const id = `${SEC}${String(counters[SEC]).padStart(2, '0')}`;
    if (!(anchor && Number.isFinite(anchor.t))) throw new Error(`shot ${id}: bad anchor`);
    const s = { id, section: SEC, t0: anchor.t, t1: null, anchor, plan, ...spec, p: subst(spec.p || {}, id) };
    shots.push(s); return s;
  };
  const plate = (p = {}) => ({ scene: 't2_plate', p: { clip: '@', ...p } });
  const still = (p = {}) => ({ scene: 't2_still', p: { img: '@', ...p } });
  const over = (base, ...layers) => ({ scene: 'multi', p: { layers: [base, ...layers] } });
  const split = (l = {}, r = {}, line = 2) => ({ scene: 't2_split', p: { left: { scene: 't2_plate', p: { clip: '@L', ...l } }, right: { scene: 't2_plate', p: { clip: '@R', ...r } }, x: 960, line } });
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
  const coEye = S('0:00.0', START, { ...over(plate({ zoom: 1.0, push: 0.02 }), { scene: 't2_seed_spiral', p: { center: [960, 540], settle: intro0.t - 0.4 } }),
    method: 'video', era: ERA.spiral, look: LK.photo,
    want: "Extreme close-up of Jade's eye in the dark, pale-blue dot catchlight; gold seeds drift into the iris and settle into a sunflower spiral; slow push in (thumbnail + loop point)" });
  const spiral = (want, extra = {}) => ({ ...plate({ zoom: 1.0, ...extra }), method: 'video', era: ERA.spiral, look: LK.photo, want: `${want}; spiral centre locked at frame centre` });
  const co = [];
  co.push(S('0:02.80', wd('CO', 0, 'one', 0), spiral('Romanesco, a single floret, macro; its spiral centre exactly where the pupil was')));
  co.push(S('0:03.44', wd('CO', 0, 'one', 1), spiral('Pull back to the whole romanesco head: the floret was one of its florets')));
  co.push(S('0:04.08', wd('CO', 0, 'two'), spiral('Artichoke from above (real counts: 5 and 8 bract spirals)')));
  co.push(S('0:04.72', wd('CO', 0, 'three'), spiral('Sunflower head (34/55 or 55/89 spirals if traced)')));
  co.push(S('0:05.30', wd('CO', 0, 'five'), { ...over(plate(), { scene: 't2_spiral_trace', p: { arms: 5, t0: wd('CO', 0, 'five').t } }), method: 'video', era: ERA.spiral, look: LK.photo,
    want: 'Spiral aloe (Aloe polyphylla) from above; its five spiral rows of leaves trace in gold (the one real count)' }));
  co.push(S('0:06.00', wd('CO', 0, 'eight', 0), spiral('Hurricane from orbit (log spiral: no golden-rectangle overlay)')));
  const coGal = S('0:06.63', wd('CO', 0, 'eight', 1), spiral('Spiral galaxy, face on (if ESA/Hubble: visible "ESA/Hubble" credit)'));
  co.push(coGal);
  const redT = eighth('0:07.0');
  S('0:07.0', redT, { scene: 't2_plate', p: { clip: coGal.id, in: redT.t - coGal.t0, grade: { red: 1 } }, method: 'video', era: ERA.spiral,
    look: (t, lt) => ({ ...LK.photo, flash: 0.75, flashCol: [1.0, 0.12, 0.05], exposure: 1.2 }),
    want: 'The galaxy flashes red (Rare Earth self-destruct look)', notes: 'continues the galaxy clip; red grade + red flash' });
  const sub716 = ev('sub_hit', null, 7.0);
  const blackT = A.bars.find((b) => b > sub716.t);           // bar 4 downbeat: the rewind reaches black
  const rewSteps = SIXTEENTHS.filter((x) => x >= sub716.t - 0.01 && x < blackT);
  S('0:07.16', sub716, { scene: 't2_vhs_rewind', p: { clips: co.slice().reverse().map((s) => s.id), steps: rewSteps, blackAt: blackT }, method: 'procedural', era: ERA.spiral, look: LK.photo,
    want: 'The count scrubs backward in VHS rewind lines, one spiral per 16th (galaxy to romanesco), down to black on the bar line', notes: 'no text: the red does the work' });
  const lightShot = (want, extra = {}) => ({ ...plate(extra), method: 'video', era: ERA.lights, look: LK.night, want });
  S('0:08.60', wd('CO', 1, 'one'), lightShot('Two hands strike a match in the dark'));
  S('0:09.23', wd('CO', 1, 'two'), lightShot('A lighthouse beam turning through fog'));
  S('0:09.86', wd('CO', 1, 'three'), lightShot('A city grid at night through a plane window'));
  S('0:10.44', wd('CO', 1, 'five'), lightShot("Earth's night side from the ISS, cities joined by roads of light (NASA imagery is public domain)"));
  S('0:11.16', wd('CO', 1, 'eight'), { scene: 't2_graph_grow', p: { mode: 'eight', t0: wd('CO', 1, 'eight').t }, method: 'procedural', era: ERA.light, look: LK.light,
    want: 'The contact graph over the Milky Way, eight links lighting at once' });
  const yeah = hitWord('(yeah)');
  S('0:11.51', yeah, { ...plate(), method: 'video', era: ERA.room, look: LK.room,
    want: "The graph's light gathers into one point; pull back: it is the catchlight in Jade's eye; she is at her console in headphones, waterfall spectrograms behind" });
  S('0:12.50', beat('0:12.50'), { ...plate(), method: 'video', era: ERA.room, look: LK.room, want: 'Jade opens her eyes and looks up (on the beat before the verse)' });

  // type: title, then the two counts collecting along the bottom third
  cue({ kind: 'hero', label: 'HOLD FIRE (title)', t0: subHit.t, t1: intro0.t - 0.2, mode: 'fade', size: 150, y: 590, out: 0.5, glow: 10,
    font: { stretch: '125%', weight: 800, track: 0.14 }, rows: [{ words: [{ text: 'HOLD', t: subHit.t }, { text: 'FIRE', t: subHit.t }] }], draw: drawHero });
  const NUMS = { one: 1, two: 2, three: 3, five: 5, eight: 8 };
  const countItems = (L, giant = true) => {
    const items = []; const slotOf = {};
    L.words.forEach((w, i) => {
      const n = NUMS[norm(w.w)];
      if (!n) return;
      const prev = items[items.length - 1];
      const echo = prev && prev.n === n && n !== 1;            // the doubled whispered "eight" re-slams the same numeral
      const slot = echo ? prev.slot : items.length ? Math.max(...items.map((x) => x.slot)) + 1 : 0;
      items.push({ n, t: w.t, slot, giant });
    });
    return items;
  };
  const c1items = countItems(intro0);
  rewSteps.forEach((st, i) => { const it = c1items.filter((x, j) => c1items.findIndex((y) => y.slot === x.slot) === j).reverse()[i]; if (it) c1items.filter((x) => x.slot === it.slot).forEach((x) => { x.out = st; }); });
  c1items.forEach((x) => { if (x.out == null) x.out = blackT; });
  cue({ kind: 'num', label: '1 1 2 3 5 8 (giant, then the bottom-third row; unwinds with the rewind)', t0: intro0.t, t1: blackT + 0.01, items: c1items, slots: Math.max(...c1items.map((x) => x.slot)) + 1, draw: drawCount });
  const c2items = countItems(intro1);
  cue({ kind: 'num', label: '1 2 3 5 8 (giant, then the row; fades as the light gathers)', t0: intro1.t, t1: yeah.t + 0.6, items: c2items, slots: Math.max(...c2items.map((x) => x.slot)) + 1, draw: drawCount });

  // ============================================================================================== VERSE 1 (13.05 to 35.50)
  section('V1');
  const v1 = (want, extra = {}, more = {}) => ({ ...plate(extra), method: 'video', era: ERA.v1, look: LK.blueprint, want, ...more });
  const bp = (subject, extra = {}) => ({ scene: 't2_blueprint', p: { subject, ...extra } });
  const out = S('0:13.05', wd('V1', 0, 'out'), { ...v1('Hard cut to surf at dawn: Jade stands knee-deep at the shoreline and sings, close-mic', {}, { method: 'seedance_sung' }),
    look: withLook(LK.blueprint, flash([1, 0.9, 0.7], 0.5, 0.15)), notes: 'verse downbeat 13.14 with a sub slide lands 0.09 s in' });
  const fish = S('0:15.07', beat('0:15.07'), v1('Over her shoulder, a lobe-finned fish noses out of the water onto a mudflat (painted plate)'));
  const snare1 = ev('impact', /first snare/);
  S('0:16.99', snare1, { ...over({ scene: 't2_plate', p: { clip: fish.id, in: snare1.t - fish.t0, zoom: 1.5, pan: [-120, 60] } }, bp('fin_bones', { t0: snare1.t, stages: ['one bone', 'two bones', 'the wrist'] })),
    method: 'video', era: ERA.v1, look: LK.blueprint, want: "Punch in on the fin: white blueprint lines draw the fin's bones over the painting, one bone, then two, then the wrist (on the snares)" });
  S('0:18.07', wd('V1', 1, 'fin'), { ...bp('fin', { full: true }), method: 'procedural', era: ERA.v1, look: LK.blueprint, want: 'The fin schematic, full frame (white line on cyanotype)' });
  S('0:18.89', wd('V1', 1, 'foot'), { ...bp('foot', { full: true }), method: 'procedural', era: ERA.v1, look: LK.blueprint, want: 'An early tetrapod foot in the same line style' });
  S('0:19.56', wd('V1', 1, 'hand'), { ...over(plate(), bp('hand', { over: true })), method: 'video', era: ERA.v1, look: LK.blueprint, want: "Match cut: Jade's hand opens in the same silhouette as the foot schematic" });
  S('0:19.84', wd('V1', 1, 'we'), v1('She presses the hand to a cave wall; red ochre sprays around it and leaves a stencil among much older ones'));
  S('0:21.51', beat('0:21.51'), v1('Jade walks side-on, left to right; behind her: knapped flint', {}, { notes: 'one continuous walk cycle across the three era beats' }));
  S('0:22.15', beat('0:22.15'), v1('Walk continues; behind her: a solid wooden wheel in a mud rut', {}, { notes: 'deep 808 at 22.48 inside this shot' }));
  S('0:22.80', beat('0:22.80'), v1('Walk continues; behind her: a mud-brick city wall'));
  S('0:23.41', wd('V1', 2, 'carried'), { ...over(plate(), bp('egg_to_jar', { over: true })), method: 'video', era: ERA.v1, look: LK.blueprint,
    want: "An egg outline in blueprint line becomes a clay jar of grain on a woman's shoulder as Jade passes her" });
  S('0:24.70', wd('V1', 2, 'dust'), v1('Cart ruts in dust'));
  S('0:25.37', wd('V1', 2, 'mud'), v1('A reed stylus presses tally wedges into wet clay; the wedges count while "mud" holds (to 27.3)', { }, { notes: 'writing began as counting grain' }));
  S('0:27.32', wd('V1', 3, 'seeds'), v1('A hand presses seeds into dark soil beside a dry irrigation channel'));
  S('0:28.64', wd('V1', 3, 'dark'), { ...over(still(), bp('seed_section', { over: true })), method: 'still', era: ERA.v1, look: LK.blueprint,
    want: 'Blueprint cross-section: the seed underground and the canal running to the field' });
  S('0:30.06', wd('V1', 3, 'waking'), { ...plate({ style: 'gouache' }), method: 'video', era: ERA.flood, look: LK.gouache,
    want: 'The Okavango flood arrives across dry grassland (painted-over documentary frames): channels fill, lilies open, the dry irrigation channel fills' });
  S('0:30.96', wd('V1', 3, 'flood'), { ...plate({ style: 'gouache' }), method: 'video', era: ERA.flood, look: LK.gouache, want: 'Jade walks into the flood water' });
  const machines = [['0:31.18', 'locomotive', 'Steam locomotive'], ['0:31.51', 'wright_flyer', 'Wright Flyer'], ['0:31.83', 'jet_airliner', 'Jet airliner'], ['0:32.15', 'saturn_v', 'Saturn V lifting off']];
  machines.forEach(([pl, subj, name], i) => S(pl, eighth(pl), { ...over(plate(), bp(subj, { over: true })), method: 'video', era: ERA.v1, look: LK.blueprint,
    want: `${name}, blueprint linework over it; the flood becomes a flood of machines; Jade's walk breaks into a run`, notes: i === 0 ? 'bar 13 downbeat; stacked choir enters' : 'eighth-note cut' }));
  S('0:32.62', wd('P1', 0, 'snowflake'), { ...plate(), method: 'video', era: ERA.v1, look: LK.night, want: 'Jade stops at night and looks up at a bright point crossing the sky' });
  S(null, wd('P1', 0, 'boundless'), { ...plate({ style: 'riso' }), method: 'video', era: ERA.signal, look: LK.riso,
    want: 'The ISS against black, its solar arrays spread like the arms of a snowflake; the technology run ends here', notes: 'cut placed on "boundless" (plan gives no time for the cut to the ISS)' });

  hero(caps(lineWords('V1', 0, 0, 4)), { rows: [2, 2], size: 190, y: 250, align: 'left', t1: fish.t0, out: 0.12 });     // OUT OF / THE SEA
  sub('V1', 0, { from: 4 });                                                                                              // with salt in our lungs
  ['fin', 'foot', 'hand'].forEach((w, i, arr) => {
    const a = wd('V1', 1, w).t, b = i < 2 ? wd('V1', 1, arr[i + 1]).t : a + 0.6;
    hero([{ text: w.toUpperCase(), t: a }], { size: 260, y: 330, t1: b, out: 0.06 });
  });
  sub('V1', 1, { from: 5 });                                                                                              // we were young
  sub('V1', 2, { cap: wd('V1', 3, 'seeds').t });                                                                         // carried the egg ...
  sub('V1', 3, { to: 7, t1: wd('V1', 3, 'flood').t });                                                                    // seeds ... waking
  hero([{ text: 'FLOOD', t: wd('V1', 3, 'flood').t }], { size: 280, y: 360, t1: wd('V1', 3, 'flood').t + 0.6, out: 0.1 });
  sub('P1', 0, { cap: LN('P1', 1).t });                                                                                    // Snowflake in the boundless night

  // ============================================================================================== PRE-CHORUS 1 (35.50 to 51.70)
  section('P1');
  S('0:35.50', wd('P1', 1, 'a'), { ...plate({ style: 'riso' }), method: 'video', era: ERA.signal, look: LK.riso,
    want: 'The Golden Record flashes in sunlight as Voyager turns away, then the craft speeds off into the dark, shrinking to a point' });
  const countingT = wd('P1', 2, 'counting');
  S('0:38.07', countingT, { ...over(still({ style: 'riso' }), { scene: 't2_tower_bursts', p: { counts: [1, 1, 2, 3, 5], t0: EIGHTHS.find((e) => e >= countingT.t - 0.02) } }), method: 'still', era: ERA.signal, look: LK.riso,
    want: 'Echo: the signal tower above the violet clouds (Rare Earth world sheet, panel 04) fires its ring of lights in bursts of 1, 1, 2, 3, 5 on eighths' });
  S('0:40.65', wd('P1', 3, 'a'), { scene: 't2_pulse_ride', p: { ly: 217 }, method: 'procedural', era: ERA.signal, look: LK.light,
    want: 'Ride the pulse across the galaxy toward a small blue point: Echo, 217 light-years away (fictional; never presented as a real exoplanet)', notes: "teal-tips Jade's voice enters, heard not seen" });
  S('0:43.27', wd('P1', 4, 'a'), { scene: 'pulsar', p: {}, method: 'reuse', era: ERA.signal, look: LK.diagram,
    want: "Take one's 0:44 diagram unchanged: PSR B1919+21 ticking every 1.3373 s (left), the count 1 1 2 3 5 8 (right)", notes: 'NATURAL / NOT NATURAL are drawn by pulsar.js itself' });
  const hearT = wd('P1', 5, 'hear');
  S('0:46.02', hearT, { ...plate(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'First sight of teal-tips Jade in her own (mirrored, cooler) control room, headphones on, singing' });
  S(null, wd('P1', 5, 'awake'), { ...plate(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Closer: teal-tips Jade opens her eyes on "awake"', notes: 'cut on "awake" so the eyes open on the word' });
  const roll1 = ev('snare_roll', null, hearT.t);
  S('0:49.24', roll1, { ...plate(), method: 'video', era: ERA.room,
    look: (t, lt) => ({ ...LK.room, exposure: 1 + 0.5 * range(t, roll1.t, LN('C1', 0).t) }), want: "The snare roll pushes into teal-tips Jade's eye (iris fills the frame)" });
  sub('P1', 1);                                                                                                         // a chord that's searching ...
  sub('P1', 2, { cap: LN('P1', 3).t });                                                                                   // counting out in bursts of light
  const lyT = wd('P1', 3, 'a').t;
  cue({ kind: 'hero', label: '217 LY', t0: lyT, t1: LN('P1', 4).t, size: 300, y: 420, out: 0.15, draw: drawHero,
    rows: [{ words: [{ text: '217', t: lyT }] }, { words: [{ text: 'LIGHT-YEARS', t: lyT + 0.25 }], k: 0.22 }], color: P.gold, hot: GOLD_HOT });
  hero(caps(lineWords('P1', 5, 5)), { size: 200, y: 300, t1: LN('C1', 0).t - 0.25, rows: [1, 1] });                       // WE'RE / AWAKE

  // ============================================================================================== CHORUS 1 (51.70 to 73.03)
  section('C1');
  const dl1 = A.sections.find((s) => s.name === 'Chorus 1').start;
  S('0:51.70', wd('C1', 0, "can't"), { ...plate({ swingT: dl1 }), method: 'video', era: ERA.room, look: (t) => ({ ...LK.night, flash: t >= dl1 ? Math.exp(-(t - dl1) / 0.15) * 0.4 : 0, flashCol: [1, 0.9, 0.7] }),
    want: 'Jade alone on the dish field at night; on the 0:51.82 downbeat every dish swings to the same point in the sky' });
  S('0:54.28', wd('C1', 1, 'message'), { scene: 'goldenrecord', p: {}, method: 'reuse', era: ERA.light, look: LK.diagram, want: "Take one's 0:54 diagram unchanged: the Golden Record cover engraves itself in gold light" });
  S('0:56.67', wd('C1', 2, 'but'), { ...split(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Split screen: both Jades sing the line at their own consoles, neither aware of the other (left Jade, right teal-tips)' });
  const crt = (n, want, extra = {}) => ({ scene: 't2_crt_matrix', p: { n, img: 'C104', ...extra }, method: 'still', era: ERA.crt, look: LK.crt, want });
  const silent1 = wd('C1', 3, 'silent');
  S('1:02.15', silent1, crt(1, 'Close on one 1999 CRT in a dark bedroom running the SETI@home screensaver (power-spectrum graph)'));
  S('1:02.77', beatK(silent1.t, 0, '1st beat after "Silent"'), crt(4, 'Pull back: the screens multiply, 1 to 4'));
  S('1:03.41', beatK(silent1.t, 1, '2nd beat after "Silent"'), crt(16, 'Pull back: 4 to 16 screens'));
  S('1:03.99', wd('C1', 3, 'swear'), crt(400, 'A matrix of hundreds of CRTs fills the frame, each glowing in its own dark room (over a million people ran SETI@home)'));
  S('1:04.59', wd('C1', 4, 'in'), { ...plate({ staticT: wd('C1', 4, 'breathe').t }), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'The studio pose: teal-tips Jade (voice B line) at the console, one hand on her headphones, eyes closed, singing like a recording artist; screen static swells and falls on "breathe"',
    notes: 'plan says "Jade"; the timing tags this line B_belt, so teal-tips Jade sings it (chorus 2 has both in this pose)' });
  S('1:07.31', wd('C1', 5, 'if'), { ...plate(), method: 'video', era: ERA.room, look: LK.night, want: 'Crane up out of the control room, over the dishes and into the sky' });
  S(null, wd('C1', 5, "i'm"), { scene: 't2_graph_grow', p: { mode: 'first_line' }, method: 'procedural', era: ERA.light, look: LK.light,
    want: 'Earth from far off: one faint line leaves Earth (sets up the graph)', notes: 'split from the crane on "I\'m"' });
  hero(caps(lineWords('C1', 0, 0, 3)), { size: 180, y: 290, t1: LN('C1', 1).t });                                       // CAN'T BE SURE
  hero(caps(lineWords('C1', 2, 4)), { rows: [2, 2], size: 170, y: 270, t1: LN('C1', 3).t, out: 0.1 });                  // I'M COUNTING / ON YOU

  // ============================================================================================== POST-CHORUS 1 (73.03 to 82.55)
  section('X1');
  const x1h = HITS.filter((h) => h.kind === 'post_chorus_1');
  const graphScale = ['local', 'local', 'local', 'local', 'local', 'local', 'arm', 'arm', 'arm', 'half', 'half'];
  const X1W = ['one node, then one link', 'one more link', 'two new links', 'three new links', 'five new links'];
  for (let i = 0; i < 5; i++) S(['1:13.03', '1:13.67', '1:14.28', '1:14.98', '1:15.59'][i], hit('post_chorus_1', i), { scene: 't2_graph_grow', p: { stage: i + 1, scale: 'local' }, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.25)),
    want: `The contact graph grows from Earth among the nearest stars: ${X1W[i]}` });
  S('1:16.24', wd('X1', 1, 'counting'), { scene: 't2_graph_grow', p: { stage: 6, scale: 'local' }, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.4)), want: 'The eighth link closes; giant 8' });
  for (let i = 0; i < 5; i++) S(['1:18.18', null, null, null, '1:20.73'][i], hit('post_chorus_1', 5 + i), { scene: 't2_graph_grow', p: { stage: 7 + i, scale: graphScale[6 + i] }, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.25)),
    want: `The same count one scale up (${graphScale[6 + i] === 'arm' ? 'across the Orion Arm' : 'half the galaxy'}): ${X1W[i]}` });
  S('1:21.35', hit('counting_on_you', 1), { scene: 't2_graph_grow', p: { stage: 12, scale: 'half', flash: true, smokeT: wd('X1', 3, 'you').t }, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.5], 0.6, 0.2)),
    want: 'The whole web flashes, then the frame fills with smoke for verse 2 (snare roll to 1:22.64)' });
  // shouted counts: small gold numerals fill the bottom-third row; the unsung 8 lands giant on "Counting on you!" and drops into the row
  const pcCount = (hs, ch, t1) => {
    const items = hs.map((h, i) => ({ n: [1, 1, 2, 3, 5][i], t: h.t, slot: i, giant: false }));
    items.push({ n: 8, t: ch.t, slot: 5, giant: true });
    return cue({ kind: 'num', label: '1 1 2 3 5 (row) + giant 8 on "Counting on you!"', t0: hs[0].t, t1, items, slots: 6, size: 110, hold: 0.55, fly: 0.3, draw: drawCount });
  };
  pcCount(x1h.slice(0, 5), wd('X1', 1, 'counting'), x1h[5].t - 0.05);
  pcCount(x1h.slice(5, 10), hit('counting_on_you', 1), LN('V2', 0).t);

  // ============================================================================================== VERSE 2 (82.55 to 102.99)
  section('V2');
  const ink = (want, extra = {}, more = {}) => ({ ...plate({ style: 'ink', ...extra }), method: 'video', era: ERA.ink, look: LK.ink, want, ...more });
  S('1:22.55', wd('V2', 0, 'priests'), ink('Ink wash: Daoist alchemists around a bronze cauldron in a mountain grotto, brewing an elixir of life; teal-tips Jade stands among them singing, the only cel-shaded figure', {}, { method: 'seedance_sung' }));
  S('1:25.00', wd('V2', 1, 'sulfur'), { scene: 't2_ink_characters', p: { chars: '硫黃' }, method: 'procedural', era: ERA.ink, look: LK.ink, want: 'The characters for sulfur, 硫黃, brushed large' });
  S(null, wd('V2', 1, 'saltpeter'), { scene: 't2_ink_characters', p: { chars: '硝石' }, method: 'procedural', era: ERA.ink, look: LK.ink, want: 'The characters for saltpeter, 硝石, brushed large' });
  const thunder = wd('V2', 1, 'thunder');
  S(null, thunder, { scene: 't2_ink_characters', p: { chars: '硫黃硝石', flashT: thunder.t }, method: 'procedural', era: ERA.ink,
    look: (t, lt) => ({ ...LK.ink, shakeX: 8 * Math.exp(-lt / 0.09), shakeY: -5 * Math.exp(-lt / 0.09) }), want: 'Thunder: the mixture flashes and the ink splatters' });
  const found = wd('V2', 2, 'found');
  S('1:27.39', wd('V2', 2, 'looked'), { scene: 't2_scroll_warning', p: { text: '有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。', sealT: found.t }, method: 'procedural', era: ERA.ink, look: LK.ink,
    want: 'A brush writes the warning down a scroll in one column (Zhenyuan miaodao yaolüe, 9th c.); a red seal stamps on "found"; characters sharp enough to read when paused' });
  const weapons = [
    ['1:30.00', wd('V2', 3, 'an'), 'A fire lance (first recorded in battle at the siege of De\'an, 1132)', 1132],
    ['1:30.28', beat('1:30.28'), 'A bronze hand cannon (oldest surviving: no later than 1288)', 1288],
    ['1:30.92', beat('1:30.92'), 'Ottoman bombards breaking the walls of Constantinople (1453)', 1453],
    ['1:31.61', wd('V2', 3, 'level'), 'The shell-flattened ground of the Somme (1916)', 1916],
  ];
  weapons.forEach(([pl, an, w]) => S(pl, an, { ...still({ style: 'ink' }), method: 'still', era: ERA.ink, look: LK.ink, want: `${w}; ink wash with harder, mechanical lines; the alchemists' smoke drifts across` }));
  const ground = wd('V2', 3, 'ground');
  S('1:32.15', ground, { scene: 't2_burn_through', p: { from: 'ink', to: 'oil' }, method: 'procedural', era: ERA.ink, look: withLook(LK.ink, flash([1, 1, 1], 1.0, 0.25)),
    want: "A white flash, the Trinity test (16 July 1945), burns through the paper into Petrov's oil painting; no mushroom cloud" });
  const oil = (want, extra = {}, more = {}) => ({ ...plate({ style: 'oil', ...extra }), method: 'video', era: ERA.oil, look: LK.oil, want, ...more });
  S('1:32.60', wd('V2', 4, 'eighty-three'), oil('Oil painting: the Serpukhov-15 command post at night, one figure, light from the big screen'));
  const five = wd('V2', 4, 'five');
  S(null, wd('V2', 4, 'satellites'), { scene: 't2_petrov_screen', p: { tracks: [{ n: 1, t: wd('V2', 4, 'satellites').t + 0.2 }, { n: 5, t: five.t }] }, method: 'procedural', era: ERA.oil, look: LK.oil,
    want: 'The big screen: one missile track rises from the United States, then four more on "five"' });
  S('1:35.36', wd('V2', 5, 'every'), { scene: 't2_petrov_screen', p: { start: true, tracks: 5 }, method: 'procedural', era: ERA.oil, look: LK.oil,
    want: 'The wall display lights up in big red letters, СТАРТ (drawn by the scene); reliability rated highest' });
  S(null, wd('V2', 5, 'first'), oil('Petrov sits with his hand near the phone (no launch button in the room)'));
  S('1:37.88', wd('V2', 6, 'petrov'), { scene: 't2_petrov_screen', p: { tracks: 5, ghosts: true }, method: 'procedural', era: ERA.oil, look: LK.oil,
    want: 'Over the five tracks, a ghost of a real first strike (hundreds of tracks) fades and leaves five' });
  S('1:40.31', wd('V2', 7, 'ignored'), oil('He picks up the phone and reports a system malfunction'));
  S(null, wd('V2', 7, 'previous'), { scene: 't2_protocol_strike', p: {}, method: 'procedural', era: ERA.oil, look: LK.oil, want: 'The printed protocol beside him is struck through line by line' });
  S('1:42.0', wd('V2', 7, "we're"), oil('Morning in Moscow, 26 September 1983: buses, people going to work, nobody knowing; teal-tips Jade breathes out', {}, { notes: 'she exhales on "We\'re alive" (voice B); lip-sync optional' }));
  hero([{ text: '26 SEP 1983', t: wd('V2', 4, 'eighty-three').t }, { text: 'SERPUKHOV-15', t: wd('V2', 4, 'eighty-three').t + 0.35 }], { rows: [1, 1], ks: [1, 0.5], size: 150, y: 250, t1: LN('V2', 5).t, color: P.cream, hot: [1, 0.55, 0.4] });
  const lookedT = wd('V2', 2, 'looked').t;
  // the gloss sits on a dark plate just above the years row (y 1000) and holds into the first weapons so it reads at < 3 words/s
  cue({ kind: 'cap', label: 'FLAMES ROSE, BURNING THEIR HANDS AND FACES · c. 850 CE', t0: lookedT, t1: weapons[2][1].t, x: SAFE.cx, y: 896, lead: 38, band: true, draw: drawCaps,
    lines: [{ text: 'FLAMES ROSE, BURNING THEIR HANDS AND FACES', t: lookedT, size: 26 }, { text: 'c. 850 CE', t: lookedT + 0.4, size: 22, color: [0.86, 0.8, 0.68] }] });
  const yrs = [...weapons.map(([, an, , y]) => ({ text: String(y), t: an.t })), { text: '1945', t: ground.t }];
  cue({ kind: 'years', label: '1132 · 1288 · 1453 · 1916 · 1945 (small, brushed, accumulating)', t0: yrs[0].t, t1: LN('V2', 4).t, items: yrs, y: 1000, draw: drawYears });
  sub('V2', 7, { to: 4, t1: wd('V2', 7, "we're").t });                                                                    // ignored all previous instructions
  hero(caps(lineWords('V2', 7, 4)), { rows: [2], size: 200, y: 330, t1: LN('P2', 0).t + 0.1, out: 0.1 });                 // WE'RE ALIVE

  // ============================================================================================== PRE-CHORUS 2 (102.99 to 113.18)
  section('P2');
  S('1:42.99', wd('P2', 0, 'secret'), { scene: 't2_nearmiss', p: { phase: 'list', t0: LN('P2', 0).t, t1: LN('P2', 2).t }, method: 'procedural', era: ERA.newsprint, look: LK.newsprint,
    want: 'The near-miss list scrolls on teletype paper (~5 lines/s, fact-checked list); years big, place and description small', notes: 'take one nearmiss re-skinned to newsprint' });
  S('1:46.14', wd('P2', 1, 'running'), { scene: 't2_nearmiss', p: { phase: 'counter', t0: LN('P2', 0).t, t1: LN('P2', 2).t }, method: 'procedural', era: ERA.newsprint, look: LK.newsprint,
    want: 'A counter beside the paper climbs as the entries pass; its digits keep rolling, never settling (no fixed total)' });
  S('1:48.00', wd('P2', 2, 'coin'), { scene: 'coins', p: {}, method: 'reuse', era: ERA.newsprint, look: LK.gold,
    want: 'coins.js: 100 gold coins land heads, the first stamped with the list\'s years, filling a 10 x 10 grid; the full 2^100 number types across the bottom', notes: 'plan: first 27 coins carry the fact-checked list\'s years (coins.js uses take one\'s 39: data update needed)' });
  const theRoad = wd('P2', 3, 'the'), youRoad = wd('P2', 3, 'you');
  const treeBeats = ['1:51.25', '1:51.88', '1:52.52'].map((x) => beat(x).t);
  const tree = (depth, want) => ({ scene: 't2_coin_tree', p: { depth, t0: theRoad.t, beats: treeBeats, youT: youRoad.t }, method: 'procedural', era: ERA.newsprint, look: LK.gold, want });
  S('1:50.61', theRoad, tree(1, 'The camera pulls up out of the coin grid: the hundred coins are the forks of a branching tree, one fork per flip'));
  S('1:51.25', beat('1:51.25'), tree(2, 'Smash zoom out, depth doubles: every tails branch goes dark and ends in a tiny red SIGNAL LOST'));
  S('1:51.88', beat('1:51.88'), tree(4, 'Depth doubles again: a single gold path threads through all hundred forks'));
  S('1:52.40', youRoad, tree(8, 'On "you" the gold path leaves the top of the tree as one link toward a far star (depth doubles once more on the 1:52.52 beat); chorus lands at 1:53.15'));

  // ============================================================================================== CHORUS 2 (113.18 to 134.06): the mirror, first
  section('C2');
  const dl2 = A.sections.find((s) => s.name === 'Chorus 2').start;
  S(null, wd('C2', 0, "can't"), { ...split({ swingT: dl2 }, { swingT: dl2 }), method: 'video', era: ERA.room, look: LK.night,
    want: 'Split: each Jade alone on her own dish field at night (mirrored); the dishes swing to the same point', notes: 'chorus 1 shot returns as a split; cut on "Can\'t" like chorus 1' });
  S(null, wd('C2', 1, 'message'), { scene: 't2_split', p: { left: { scene: 'goldenrecord', p: { R: 200 } }, right: { scene: 'goldenrecord', p: { R: 200 } }, x: 960, line: 2 }, method: 'reuse', era: ERA.light, look: LK.diagram,
    want: 'Split: the Golden Record cover engraves itself on both sides at once' });
  S(null, wd('C2', 2, 'but'), { ...split(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Split: both Jades sing "but if you are, I\'m counting on you" at their mirrored consoles' });
  const silent2 = wd('C2', 3, 'silent');
  const crt2 = (n, want) => crt(n, want, { rooms: n >= 16 ? 2 : 0 });
  S(null, silent2, crt2(1, 'The single CRT returns (SETI@home screensaver)'));
  S(null, beatK(silent2.t, 0, '1st beat after "Silent"'), crt2(4, 'Screens multiply, 1 to 4'));
  S(null, beatK(silent2.t, 1, '2nd beat after "Silent"'), crt2(16, '4 to 16; two of the screens now show the two Jades\' control rooms'));
  S(null, wd('C2', 3, 'swear'), crt2(400, 'The matrix of hundreds; two screens show the two Jades\' control rooms'));
  S(null, wd('C2', 4, 'in'), { ...split({}, { flipX: true }, 4), method: 'seedance_sung', era: ERA.room, look: LK.room,
    want: 'Both Jades in the studio pose; the two halves match exactly, hard vertical line between them' });
  S(null, wd('C2', 5, 'if'), { ...split(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Split: each Jade looks at her own screen, singing "If you are"' });
  S(null, wd('C2', 5, "i'm"), { ...plate(), method: 'video', era: ERA.room, look: LK.night,
    want: 'Crane up out of both rooms side by side: the faint signal each one hears comes from the same direction, the other control room' });
  hero(caps(lineWords('C2', 0, 0, 3)), { size: 180, y: 290, t1: LN('C2', 1).t });
  hero(caps(lineWords('C2', 2, 4)), { rows: [2, 2], size: 170, y: 270, t1: LN('C2', 3).t, out: 0.1 });

  // ============================================================================================== POST-CHORUS 2 (134.06 to 143.58)
  section('X2');
  const x2h = HITS.filter((h) => h.kind === 'post_chorus_2');
  const lightsW = ['A lamp in one window at night', 'A second window lights', 'A street of lit windows', 'A city at night', 'A coastline of city lights'];
  for (let i = 0; i < 5; i++) S(i === 0 ? '2:14.06' : null, hit('post_chorus_2', i), { ...still(), method: 'still', era: ERA.lights, look: withLook(LK.night, flash([1, 0.8, 0.5], 0.2)), want: `Earth's lights at increasing scale: ${lightsW[i]}` });
  S('2:17.21', wd('X2', 1, 'counting'), { scene: 't2_earth_night', p: { view: 'whole' }, method: 'procedural', era: ERA.lights, look: withLook(LK.night, flash([1, 0.8, 0.5], 0.35)), want: "Then the whole night side of Earth" });
  const setN = [1, 2, 4, 7, 12];
  for (let i = 0; i < 5; i++) S(i === 0 ? '2:19.11' : null, hit('post_chorus_2', 5 + i), { scene: 't2_chess', p: { phase: 'set', n: setN[i] }, method: 'procedural', era: ERA.chess, look: withLook(LK.anime, flash([1, 1, 1], 0.3, 0.06)),
    want: `A chessboard sets itself: pieces slam down from above (${setN[i]} on the board)` });
  S('2:22.19', wd('X2', 3, 'counting'), { scene: 't2_chess', p: { phase: 'set', n: 32 }, method: 'procedural', era: ERA.chess, look: withLook(LK.anime, flash([1, 1, 1], 0.5, 0.08)), want: '"Counting on you!" lands the rest of the pieces' });
  S(null, wd('X2', 3, 'on'), { ...plate(), method: 'video', era: ERA.chess, look: LK.anime, want: 'The two Jades sit down across the board from each other' });
  const x2Row = x2h.slice(0, 5).map((h, i) => ({ n: [1, 1, 2, 3, 5][i], t: h.t, slot: i, giant: false }));
  x2Row.push({ n: 8, t: wd('X2', 1, 'counting').t, slot: 5, giant: true });
  cue({ kind: 'num', label: '1 1 2 3 5 (row) + giant 8 on "Counting on you!" (lights pass only; the board stays clear)', t0: x2Row[0].t, t1: x2h[5].t - 0.05, items: x2Row, slots: 6, size: 110, hold: 0.55, fly: 0.3, draw: drawCount });

  // ============================================================================================== BRIDGE (143.58 to 163.67): Fischer-Tal
  section('BR');
  const br0 = secStart('BR');
  // ply schedule: every ply on the eighth or sixteenth grid between the plan's anchors
  const gi = (G, t) => { let b = 0; G.forEach((x, i) => { if (Math.abs(x - t) < Math.abs(G[b] - t)) b = i; }); return b; };
  const spread = (G, a, b, n, fr) => { const ia = gi(G, a), ib = gi(G, b); return Array.from({ length: n }, (_, k) => G[Math.round(ia + (fr ? fr[k] : (n === 1 ? 0 : k / (n - 1))) * (ib - ia))]); };
  const tB1 = beat('2:26.1').t, tB2 = beat('2:28.6').t, spark = wd('BR', 2, 'spark').t, tB3 = eighth('2:30.5').t, death = wd('BR', 3, 'death').t;
  const drumsBack = ev('impact', /drums \+ 808 return/).t, andE = wd('BR', 5, 'and').t, handT = wd('BR', 5, 'hand').t;
  const consec = (G, a, n) => { const i = gi(G, a); return G.slice(i, i + n); };
  const plyT = [
    ...consec(EIGHTHS, br0.t, 8),                                      // 1.e4 .. 4...c5, one per eighth from the drums-out
    ...consec(BEATS, tB1, 4),                                          // 5.a3 .. 6...cxd4, one per beat
    ...spread(SIXTEENTHS, tB2, spark, 5, [0, 0.42, 0.7, 0.88, 1]),     // 7.Qg4 .. 9.Qxg7 speeding up; Qxg7 on "spark"
    ...spread(EIGHTHS, tB3, death, 9),                                 // 9...Rg8 .. 13...O-O-O on eighths; O-O-O on "death"
    ...spread(SIXTEENTHS, drumsBack, andE - 0.1, 10),                  // 14.Bg5 .. 18...Rxg2+ (10 plies do not fit on eighths before 2:35.90)
    ...spread(SIXTEENTHS, andE, handT, 6),                             // 19.Kh1 .. 21...Qg4+ flurry; the last check on "hand"
  ];
  const plies = PLIES.map((san, i) => ({ i, san, t: plyT[i] }));
  const letT = wd('BR', 5, 'let').t;
  const chess = (view, want, extra = {}, look = LK.anime) => ({ scene: 't2_chess', p: { view, plies, clocksStop: letT, ...extra }, method: 'procedural', era: ERA.chess, look, want });
  S('2:23.58', br0, chess('hands_blur', 'Teal-tips Jade presses the clock on the drums-out; premoved opening (1.e4 ...), hands a blur; the room lights go down until only the board is lit', { lightsDown: [br0.t, tB1] }));
  S('2:26.1', beat('2:26.1'), chess('orbit_low', 'Slow orbit at board height; a hand hovers a full beat over its piece; eyes in the dark reflect light like animals in a forest (moves 5-6)'));
  S('2:28.6', beat('2:28.6'), chess('speedup', 'The moves speed up: 7.Qg4 Ne7 8.bxa5 dxc3'));
  S('2:30.32', wd('BR', 2, 'spark'), chess('impact', 'The first capture, 9.Qxg7 on "spark": impact frame, sparks off the clock', {}, withLook(LK.anime, flash([1, 1, 1], 0.9, 0.05))));
  S('2:30.5', eighth('2:30.5'), chess('castle', '9...Rg8 to 13.O-O on eighths'));
  S('2:33.04', wd('BR', 3, 'death'), chess('overhead_castled', 'Black castles long on "death": kings on opposite sides, both attacks on'));
  S('2:33.69', ev('impact', /drums \+ 808 return/), chess('battle', 'Drums return, 14.Bg5: the anime battle, speed lines, smash zooms', {}, withLook(LK.anime, flash([1, 1, 1], 0.6, 0.06))));
  S('2:34.15', wd('BR', 4, 'chain'), chess('swing180', 'The camera swings 180 degrees around the board on "chain"'));
  S(null, wd('BR', 4, 'chains'), chess('chain_of_pieces', 'Each captured piece is knocked off the board; the captured pieces fly past the lens joined like links of a chain'));
  S('2:35.90', wd('BR', 5, 'and'), chess('flurry', '19.Kh1 Qe5 20.Rxf1 Qxe6 21.Kxg2 as a sixteenth-note flurry'));
  S('2:37.48', wd('BR', 5, 'hand'), chess('perpetual', '21...Qg4+ on "hand": the black queen gives check, White has one legal move: perpetual. Fischer-Tal · Leipzig 1960 · ½-½ on the scoresheet'));
  S('2:38.10', wd('BR', 5, 'let'), { ...plate(), method: 'video', era: ERA.chess, look: LK.anime, want: 'On "let go" both Jades take their hands off the pieces; the clocks stop; neither one wins' });
  S('2:37.8', wd('BR', 5, 'go'), { scene: 't2_poster_morph', p: { from: 'black_queen', t1: LN('BR', 6).t + 0.6 }, method: 'procedural', era: ERA.poster, look: LK.poster,
    want: 'The camera dives into the black queen: its silhouette flattens into a black square and a red wedge; the squares slide into a Suprematist composition that assembles into a Soviet poster',
    notes: 'plan starts the dive at 2:37.8, before the "let go" hands (2:38.10); the hands keep their word anchor and the dive starts on "go"' });
  S('2:38.76', wd('BR', 6, 'sixty-two'), { ...over(plate({ style: 'halftone' }), { scene: 't2_depth_charges', p: { t: LN('BR', 6).words.slice(1).map((w) => w.t) } }), method: 'video', era: ERA.poster, look: LK.poster,
    want: 'Pull back out of the poster into the Arkhipov scene (newsprint-halftone poster): B-59, batteries nearly dead, trapped under US destroyers; practice depth charges fall as black dots' });
  S('2:41.23', wd('BR', 7, 'two'), { ...still({ style: 'halftone' }), method: 'still', era: ERA.poster, look: LK.poster,
    want: 'Two officers in red silhouette, faces in shadow and unnamed, one pointing toward the torpedo room (anonymous; no one else shown as a hawk)' });
  S('2:42.19', wd('BR', 7, 'arkhipov'), { ...still({ style: 'halftone' }), method: 'still', era: ERA.poster, look: LK.poster, want: "Arkhipov's open hand comes up between them, full frame (anonymous period figure)" });
  const noT = wd('BR', 7, 'no');
  S('2:43.34', noT, { ...plate({ style: 'halftone' }), method: 'video', era: ERA.poster, look: LK.poster,
    want: 'NO fills the frame; behind it B-59 surfaces among the destroyers at night in their searchlights, and the poster\'s red drains to grey', notes: 'only 0.32 s before the build: the surfacing plays behind NO' });
  cue({ kind: 'hero', label: 'NO (poster lettering)', t0: noT.t, t1: noT.t + 0.6, size: 760, y: 820, out: 0.12, draw: drawHero, font: { stretch: '62%', weight: 900 }, color: P.cream, hot: [1, 0.35, 0.25],
    rows: [{ words: [{ text: 'NO', t: noT.t }] }] });

  // ============================================================================================== BUILD (163.67 to 183.88)
  section('BU');
  S('2:43.67', wd('BU', 0, 'hunters'), { scene: 't2_war', p: { phase: 'launch' }, method: 'reuse', era: ERA.war, look: LK.war,
    want: "The Rare Earth war scene: Earth's night side over the pole, missile tracks rising from both sides' silo fields and from submarines" });
  S('2:46.93', wd('BU', 1, 'fire'), { scene: 't2_graph', p: { mode: 'war' }, method: 'procedural', era: ERA.war, look: LK.war, want: 'Pull out to the contact graph: elsewhere in the galaxy, worlds fire on each other and go dark one by one' });
  const burn = wd('BU', 2, 'burn'), fall = wd('BU', 2, 'fall');
  S('2:49.44', burn, { scene: 't2_war', p: { phase: 'impact' }, method: 'reuse', era: ERA.war, look: LK.war, want: 'Back on Earth the warheads land and the lights go out' });
  S('2:50.83', wd('BU', 3, 'only'), { ...plate(), method: 'video', era: ERA.room, look: LK.room, want: 'Jade at her console sees SIGNAL LOST, grabs the jog wheel and spins it back' });
  S(null, wd('BU', 3, 'held'), { scene: 't2_war', p: { phase: 'rewind', vhs: true }, method: 'reuse', era: ERA.war, look: LK.war,
    want: 'VHS rewind: the warheads lift off the cities, the tracks fall back into silos and submarines, the lights come back on' });
  S('2:53.25', wd('BU', 4, 'out'), { scene: 't2_war', p: { phase: 'whole' }, method: 'reuse', era: ERA.war, look: LK.night, want: 'Earth whole again' });
  S(null, wd('BU', 4, 'all'), { scene: 't2_graph', p: { mode: 'relight' }, method: 'procedural', era: ERA.light, look: LK.light, want: "Earth's node on the contact graph lights again" });
  const hold1 = wd('BU', 5, 'hold'), show1 = wd('BU', 5, 'show');
  S('2:55.06', hold1, { scene: 't2_scroll_warning', p: { phase: 'held', text: '有以硫黃、雄黃合硝石，并蜜燒之，焰起燒手面，及燼屋舍者。' }, method: 'procedural', era: ERA.ink, look: LK.ink, want: "The people who held fire, 1: the alchemists' warning scroll" });
  S(null, wd('BU', 5, 'fire'), { ...plate({ style: 'oil' }), method: 'video', era: ERA.oil, look: LK.oil, want: 'The people who held fire, 2: Petrov, oil portrait lit by the screen' });
  S(null, barAfter(wd('BU', 5, 'fire').t, 'bar line after "fire"'), { ...still({ style: 'halftone' }), method: 'still', era: ERA.poster, look: LK.poster, want: 'The people who held fire, 3: Arkhipov, poster halftone' });
  S(null, show1, { scene: 't2_earth_night', p: { view: 'cities_on', t0: show1.t }, method: 'procedural', era: ERA.lights, look: LK.night, want: 'On "Show your light" the cities come on across the night side' });
  S('3:00.09', wd('BU', 6, 'hold'), { ...split(), method: 'video', era: ERA.room, look: LK.room, want: 'Both Jades raise a hand light at their consoles (split)' });
  const roll2 = ev('snare_roll', /BUILD/);
  const dropT = LN('DR', 0).t;
  const rollBeats = [roll2.t, ...BEATS.filter((b) => b > roll2.t + 0.05 && b < dropT - 0.3)];
  const rollW = [['video', plate(), 'Jade raises her hand light, close'], ['video', plate(), 'Teal-tips Jade raises her hand light, close'], ['procedural', { scene: 't2_earth_night', p: { view: 'cities_on', t0: show1.t } }, 'Cities across the night side, brighter'],
    ['procedural', { scene: 't2_graph', p: { mode: 'relight', bright: true } }, 'The contact graph, every node lit'], ['video', split(), 'Both hand lights held up, split; the frame burns to white for the drums cut']];
  rollBeats.forEach((b, i) => {
    const [m, sc, w] = rollW[i % rollW.length];
    S(i === 0 ? '3:00.80' : null, i === 0 ? roll2 : { t: b, kind: 'beat', ref: `beat ${i} of the build roll` }, { ...sc, method: m, era: m === 'video' ? ERA.room : ERA.light,
      look: i === rollBeats.length - 1 ? (t) => ({ ...LK.light, flash: smooth(range(t, b + 0.25, dropT)), flashCol: [1, 1, 1] }) : LK.light, want: `${w} (cut rate doubles on the roll: one per beat)` });
  });
  cue({ kind: 'cap', label: 'NUCLEAR DETONATIONS · SIGNAL LOST', t0: burn.t, t1: LN('BU', 3).t, y: 960, lead: 44, draw: drawCaps, color: P.red,
    lines: [{ text: 'NUCLEAR DETONATIONS', t: burn.t, size: 30 }, { text: 'SIGNAL LOST', t: fall.t, size: 30, glow: 6 }] });
  hero(caps(lineWords('BU', 5, 0, 3)), { size: 170, y: 280, t1: show1.t, color: [0.95, 0.2, 0.12], hot: [1, 0.6, 0.45], shade: 0.8 });   // HOLD YOUR FIRE (fire red: reads on the scroll's paper and on night)
  hero(caps(lineWords('BU', 6, 3, 6)), { size: 170, y: 280, t1: dropT, color: P.goldPale, hot: GOLD_HOT });                // SHOW YOUR LIGHT

  // ============================================================================================== DROP (183.88 to 213.04): the mirror
  section('DR');
  const mirror = (phase, want, extra = {}, more = {}) => ({ scene: 't2_mirror', p: { phase, clip: '@', ...extra }, method: 'video', era: ERA.mirror, look: LK.mirror, want, ...more });
  S('3:03.88', wd('DR', 0, "couldn't"), mirror('approach', 'Drums out, held pad. A white void: Jade walks toward an infinitely large mirror that divides the frame; her side drawn in signal-print inks'));
  S('3:06.42', wd('DR', 1, 'message'), mirror('reflection', 'She reaches the glass and sees what looks like her reflection'));
  const impact = ev('impact', /DROP IMPACT/);
  S('3:08.355', impact, mirror('swing', 'Impact frame; the camera swings around the plane: on the other side is teal-tips Jade, in her own world and palette, in exactly the same pose', { impactT: impact.t }, {
    look: withLook(LK.mirror, flash([1, 1, 1], 0.9, 0.08)) }));
  S('3:08.68', wd('DR', 2, 'but'), mirror('hands_rise', 'Both raise a hand; teal-tips Jade sings "but you were. You were counting too."', {}, { method: 'seedance_sung' }));
  S(null, wd('DR', 2, 'counting'), mirror('palms_meet', 'The palms meet on the glass'));
  S(null, wd('DR', 2, 'too'), mirror('ripple', 'On "too" the mirror starts to ripple (rings spread from the palms)'));
  const dropHits = HITS.filter((h) => h.kind === 'drop_counts');
  const phyllo = (want, k) => ({ scene: 'phyllo', p: { center: [960, 470], radius: 360 }, method: 'reuse', era: ERA.light,
    look: (t, lt) => ({ ...LK.light, zoom: 1 + 0.04 * Math.exp(-lt / 0.2), flash: 0.14 * Math.exp(-lt / 0.16), flashCol: [1, 0.8, 0.45] }), want });
  S('3:14.01', hit('drop_counts', 0), phyllo('The ripple rings become take one\'s phyllotaxis disk of 610 worlds; links n to n+13 light as 13 spiral arms'));
  S('3:14.62', hit('drop_counts', 1), phyllo('21 spiral arms'));
  S('3:15.27', hit('drop_counts', 2), phyllo('34 spiral arms'));
  S('3:15.84', wd('DR', 4, 'link'), { ...over({ scene: 'phyllo', p: { center: [960, 470], radius: 360 } }, { scene: 't2_chain_links', p: { center: [960, 470], radius: 360 } }), method: 'procedural', era: ERA.light, look: LK.light,
    want: 'A chain runs through the disk; each link opens into two hands letting go, and the hands become edges of the graph' });
  S('3:18.93', wd('DR', 5, 'alone'), { ...plate(), method: 'seedance_sung', era: ERA.mirror, look: LK.mirror, want: 'The mirror is gone: the two Jades stand side by side and look up, singing' });
  S('3:21.55', hit('drop_counts', 3), phyllo('55 spiral arms'));
  S('3:22.26', hit('drop_counts', 4), phyllo('89 spiral arms; the disk relaxes back into the galaxy'));
  const andSeen = wd('DR', 7, 'and');
  S('3:22.89', andSeen, { ...over(still({ style: 'riso' }), { scene: 't2_tower_bursts', p: { ring: true, t0: andSeen.t } }), method: 'still', era: ERA.signal, look: LK.riso, want: "On Echo the signal tower's ring lights up" });
  S(null, barAfter(wd('DR', 7, 'too').t, 'bar line after "too" (inside the held note)'), { scene: 't2_echo_night', p: {}, method: 'procedural', era: ERA.signal, look: LK.light,
    want: "Echo's night side shows its cities linked like a constellation (Rare Earth continuity)" });
  S(null, wd('DR', 7, 'wherever'), { ...plate(), method: 'seedance_sung', era: ERA.room, look: LK.room, want: 'Cut back to the two Jades at one console, receiving; teal-tips Jade sings "wherever you are"' });
  const drNums = (ns, hs, t1) => cue({ kind: 'num', label: ns.join(' '), t0: hs[0].t, t1, items: ns.map((n, i) => ({ n, t: hs[i].t, slot: i, giant: false })), slots: ns.length, size: 150, gap: 250, y: 960, draw: drawCount });
  drNums([13, 21, 34], dropHits.slice(0, 3), LN('DR', 4).t + 0.6);
  drNums([55, 89], dropHits.slice(3, 5), andSeen.t + 0.5);
  hero([{ text: 'YOU', t: wd('DR', 2, 'you', 1).t }, { text: 'WERE', t: wd('DR', 2, 'were', 1).t }, { text: 'COUNTING', t: wd('DR', 2, 'counting').t }, { text: 'TOO', t: wd('DR', 2, 'too').t }],
    { rows: [2, 2], size: 170, y: 270, t1: dropHits[0].t });

  // ============================================================================================== OUTRO (213.04 to 247.16)
  section('OU');
  S('3:33.04', wd('OU', 0, 'six'), { scene: 't2_graph', p: { mode: 'finale' }, method: 'procedural', era: ERA.light, look: LK.light, want: 'The contact graph of 600-plus worlds over the Milky Way, slow orbit (the Rare Earth finale image)' });
  S('3:38.87', wd('OU', 1, 'every'), { scene: 't2_graph', p: { mode: 'flicker', t0: LN('OU', 1).t }, method: 'procedural', era: ERA.light, look: LK.light,
    want: 'Each world flickers red once, its own near-miss, then holds gold; the near-silences between phrases stay empty' });
  const drumsZ = ev('impact', /Outro/);
  const whisp = HITS.filter((h) => h.kind === 'outro_whisper');
  const higher = wd('OU', 3, 'higher');
  const counterP = { years: NEAR_MISS_YEARS, t0: drumsZ.t, lastReset: LN('OU', 3).t, from: '1945-08-09', lastDate: '2025-05-10', today: '2026-10-26', rollT: higher.t };
  const counter = (view, want, extra = {}) => ({ scene: 't2_counter', p: { ...counterP, view, ...extra }, method: 'procedural', era: ERA.newsprint, look: LK.newsprint, want });
  S('3:44.33', drumsZ, counter('wide', '[ 0 ] DAYS SINCE LAST RESET, factory safety board style: counts up from 1945 and snaps to zero at each near-miss entry (two-frame red SIGNAL LOST, VHS flicker, the year small beside the number)'));
  ['digits', 'board_year', 'digits', 'board_year'].forEach((v, i) => S(i === 0 ? '3:45.56' : null, hit('outro_whisper', i), counter(v, `Resets come faster through the whispered count (${['one', 'one', 'two', 'three'][i]}); ${v === 'digits' ? 'tight on the digits' : 'the board with the entry year'}${i === 3 ? '; the last reset is the 2025 entry' : ''}`)));
  S('3:47.79', wd('OU', 3, 'the'), counter('climb', 'Past the last reset the counter climbs to the release-date value (534 days on 26 Oct 2026; recompute for release)'));
  S('3:49.44', higher, counter('roll', 'Digits roll upward on "higher" and keep going'));
  S('3:50.04', hit('outro_whisper', 4), { ...over(plate(), { scene: 't2_counter', p: { ...counterP, view: 'corner' } }), method: 'video', era: ERA.light, look: LK.night,
    want: 'The counter keeps climbing (corner); the ISS crosses the night sky over the dish field' });
  S('3:53.17', wd('OU', 5, 'hold'), { ...plate(), method: 'video', era: ERA.room, look: LK.photo, want: 'Jade lowers her headphones and looks out over the dishes at dawn (drums cut at 3:54.31)' });
  S('3:58.5', ev('vocal_gap'), { ...plate(), method: 'video', era: ERA.spiral, look: LK.photo, want: "Extreme close-up of Jade's eye, returning to the opening frame" });
  S('4:02.08', wd('OU', 6, 'hold'), { scene: 't2_plate', p: { clip: coEye.id, in: 0 }, method: 'video', era: ERA.spiral, look: LK.photo, want: "The opening frame itself (CO01 from its first frame), so the post loops cleanly" });
  const finalHit = ev('impact', /FINAL HIT/);
  S('4:04.05', finalHit, { scene: 't2_endcard', p: { hitT: finalHit.t }, method: 'procedural', era: ERA.light, look: withLook(LK.light, flash([1, 0.85, 0.55], 0.35, 0.08)),
    want: 'Title on the final hit, then the end card with credits (incl. ESA/Hubble credit if used)' });
  cue({ kind: 'hero', label: 'HOLD FIRE (title, final hit)', t0: finalHit.t, t1: A.duration + 0.5, size: 150, y: 590, out: 0.3, glow: 10, draw: drawHero,
    font: { stretch: '125%', weight: 800, track: 0.14 }, rows: [{ words: [{ text: 'HOLD', t: finalHit.t }, { text: 'FIRE', t: finalHit.t }] }] });

  // ---------------------------------------------------------------------------------------------- finish: contiguous cuts, type per shot
  shots.sort((a, b) => a.t0 - b.t0);
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
