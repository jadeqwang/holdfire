// Kinetic typography. Draws into engine.typeCtx in 1920x1080 design pixels (straight alpha), composited over the graded image;
// its colour also feeds the bloom (post.typeGlow), so bright type glows without blurring the letterforms.
//
// Type system (docs/STYLE_BIBLE.md):
//   Cormorant Garamond  — the human voice and the poems (the Spaces Left Blank books' face); italic for the hinge word
//   Open Sans (tracked caps) — labels, "EXCERPT FROM", credits (the books' small caps)
//   IBM Plex Mono       — the Listener (AI) voice, HUDs, terminals, data
//   Michroma            — the title and the count's machine labels (wide, NASA/2001 lineage)
import { clamp, lerp, easeOutCubic, easeOutExpo, easeOutBack, hash1, hash2, range, smooth } from './util.js';
import { P, css } from './palette.js';
import { drawGlyphWord } from './glyphs.js';

export const FONTS = [
  ['Cormorant', 'assets/fonts/CormorantGaramond-VF.ttf', { weight: '300 700' }],
  // the same face with lining figures (canvas can't set font-feature-settings, the FontFace descriptor can)
  ['CormorantN', 'assets/fonts/CormorantGaramond-VF.ttf', { weight: '300 700', featureSettings: '"lnum" 1' }],
  ['Bodoni', 'assets/fonts/BodoniModa-VF.ttf', { weight: '400 900' }],
  ['Archivo', 'assets/fonts/Archivo-VF.ttf', { weight: '100 900', stretch: '62% 125%' }],
  ['CormorantI', 'assets/fonts/CormorantGaramond-Italic-VF.ttf', { weight: '300 700', style: 'normal' }],
  ['OpenSans', 'assets/fonts/OpenSans-VF.ttf', { weight: '300 800', stretch: '75% 100%' }],
  ['Plex', 'assets/fonts/IBMPlexMono-Regular.ttf', {}],
  ['PlexM', 'assets/fonts/IBMPlexMono-Medium.ttf', {}],
  ['JetBrains', 'assets/fonts/JetBrainsMono-VF.ttf', { weight: '100 800' }],
  ['Michroma', 'assets/fonts/Michroma-Regular.ttf', {}],
];

export async function loadFonts() {
  await Promise.all(FONTS.map(async ([name, url, desc]) => {
    const f = new FontFace(name, `url(${url})`, desc);
    await f.load();
    document.fonts.add(f);
  }));
}

const SCRAMBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/';

export class TypeLayer {
  constructor(engine, audio) {
    this.e = engine; this.a = audio;
    this.ctx = engine.typeCtx;
  }

  begin() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.e.W, this.e.H);
    c.setTransform(this.e.S, 0, 0, this.e.S, 0, 0);
    c.textBaseline = 'alphabetic';
    c.globalAlpha = 1; c.filter = 'none'; c.shadowBlur = 0; c.letterSpacing = '0px';
    c.globalCompositeOperation = 'source-over';
  }

  font(family, px, weight = 400, stretch = 'normal') {
    const c = this.ctx;
    const ST = { '62%': 'extra-condensed', '75%': 'condensed', '87.5%': 'semi-condensed', '100%': 'normal', '112.5%': 'semi-expanded', '125%': 'expanded' };
    c.font = `${weight} ${px}px ${family}`;
    try { c.fontStretch = ST[stretch] || stretch; } catch (e) { /* */ }
  }

  // core text draw. o: {font, size, weight, stretch, color, alpha, align, track (em), glow (px), glowColor, base}
  text(str, x, y, o = {}) {
    const c = this.ctx;
    if ((o.alpha ?? 1) <= 0.001 || !str) return 0;
    c.save();
    this.font(o.font || 'Cormorant', o.size || 64, o.weight || 400, o.stretch || 'normal');
    c.letterSpacing = `${(o.track || 0) * (o.size || 64)}px`;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.base || 'alphabetic';
    c.globalAlpha = clamp(o.alpha ?? 1);
    const col = o.color || P.cream;
    // shade: a soft dark halo under the glyphs so small type holds contrast over busy plates (phone legibility)
    if (o.shade) {
      c.shadowColor = css(P.void, clamp(o.shade)); c.shadowBlur = (o.size || 64) * 0.45;
      c.fillStyle = css(P.void, clamp(o.shade) * 0.7);
      c.fillText(str, x, y); c.fillText(str, x, y);
    }
    if (o.glow) { c.shadowColor = css(o.glowColor || col, 0.9); c.shadowBlur = o.glow; } else c.shadowBlur = 0;
    c.fillStyle = css(col);
    c.fillText(str, x, y);
    const w = c.measureText(str).width;
    c.restore();
    return w;
  }

  measure(str, o = {}) {
    const c = this.ctx; c.save();
    this.font(o.font || 'Cormorant', o.size || 64, o.weight || 400, o.stretch || 'normal');
    c.letterSpacing = `${(o.track || 0) * (o.size || 64)}px`;
    const w = c.measureText(str).width; c.restore(); return w;
  }

  // tracked small caps label (the books' Open Sans breadcrumbs)
  label(str, x, y, o = {}) {
    return this.text(str.toUpperCase(), x, y, { font: 'OpenSans', size: 15, weight: 600, track: 0.28, color: P.bookGold, ...o });
  }

  // mono HUD line; o.cps types it on from o.t0
  mono(str, x, y, t, o = {}) {
    let s = str;
    if (o.t0 != null) {
      const n = Math.floor((t - o.t0) * (o.cps || 40));
      if (n <= 0) return 0;
      s = str.slice(0, n);
      if (n < str.length && o.cursor !== false) s += '▍';
    }
    return this.text(s, x, y, { font: 'Plex', size: 18, track: 0.04, color: P.cream, ...o });
  }

  // scramble-decode: characters resolve from noise over dur
  decode(str, x, y, t, t0, dur, o = {}) {
    const k = clamp((t - t0) / dur);
    if (t < t0) return 0;
    let s = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const r = i / Math.max(1, str.length);
      if (ch === ' ' || k > r * 0.7 + 0.3 * hash1(i + 3)) s += ch;
      else s += SCRAMBLE[Math.floor(hash2(i, Math.floor(t * 24)) * SCRAMBLE.length)];
    }
    return this.text(s, x, y, { font: 'Plex', size: 18, ...o });
  }

  // A lyric line as words that appear as they are sung. line: index into audio.lines, or {words:[{w,t,end}]}.
  // o: {x, y, size, font, weight, stretch, align, color, hotColor, dim (alpha of unsung words; 0 = hidden), rise, maxW, leading,
  //     breaks:[word index to start a new row at], upper, italicWords:[...], italicFont, mode: 'fade'|'slam'|'stream', t1 (fade-out end), out (fade dur), alpha}
  lyric(line, t, o = {}) {
    const L = typeof line === 'number' ? this.a.lines[line] : line;
    if (!L) return 0;
    const words = L.words || [];
    const mode = o.mode || 'fade';
    // lyric lines never go below minSize (60 px at 1080p, the smallest that survives a phone feed); smaller type is for captions
    const size = Math.max(o.size || 72, o.minSize ?? 60), font = o.font || 'Cormorant';
    const style = { font, size, weight: o.weight || 400, stretch: o.stretch, track: o.track || 0, shade: o.shade ?? (o.glow ? 0 : 0.8) };
    const space = this.measure(' ', style) * (o.spaceK || 1);
    const maxW = o.maxW || 1500;
    const rows = [[]]; let rw = 0;
    const clean = (x) => String(x).replace(/[()]/g, '');   // gang/whisper lines carry parentheses in the lyric sheet; never shown
    const ws = words.map((w, i) => ({ ...w, i, text: o.upper ? clean(w.w).toUpperCase() : clean(w.w), wd: 0 }));
    for (const w of ws) {
      const st = (o.italicWords && o.italicWords.includes(w.w.toLowerCase().replace(/[^a-z']/g, ''))) ? { ...style, font: o.italicFont || 'CormorantI' } : style;
      w.st = st; w.wd = this.measure(w.text, st);
      const forced = o.breaks && o.breaks.includes(w.i) && rows[rows.length - 1].length;
      if (forced || (rw > 0 && rw + space + w.wd > maxW)) { rows.push([]); rw = 0; }
      rows[rows.length - 1].push(w); rw += (rw > 0 ? space : 0) + w.wd;
    }
    const lead = (o.leading || 1.08) * size;
    const x0 = o.x ?? 960, y0 = o.y ?? 540;
    const fadeOut = o.t1 != null ? 1 - smooth(range(t, o.t1 - (o.out ?? 0.3), o.t1)) : 1;
    if (fadeOut <= 0) return rows.length * lead;
    const c = this.ctx;
    rows.forEach((row, ri) => {
      const rowW = row.reduce((s, w, i) => s + w.wd + (i ? space : 0), 0);
      let x = (o.align === 'center') ? x0 - rowW / 2 : (o.align === 'right' ? x0 - rowW : x0);
      const y = y0 + ri * lead;
      for (const w of row) {
        const hot = o.hot !== false && t >= w.t && t < (w.end ?? w.t + 0.3) + 0.08;
        const col = hot ? (o.hotColor || o.color || P.cream) : (o.color || P.cream);
        if (mode === 'slam') {
          const k = clamp((t - w.t + 0.02) / 0.16);
          if (k > 0 || (o.dim ?? 0) > 0) {
            const sc = lerp(1.22, 1, easeOutExpo(k));
            c.save(); c.translate(x + w.wd / 2, y - size * 0.35); c.scale(sc, sc); c.translate(-(x + w.wd / 2), -(y - size * 0.35));
            this.text(w.text, x, y, { ...w.st, alpha: (k > 0 ? 1 : o.dim) * (o.alpha ?? 1) * fadeOut, color: col, glow: o.glow });
            c.restore();
          }
        } else if (mode === 'stream') {
          // token streaming: the word arrives in chunks of ~3 characters across its sung duration, with a cursor
          const d = Math.max(0.12, Math.min(0.5, (w.end ?? w.t + 0.3) - w.t));
          const k = clamp((t - w.t + 0.03) / d);
          const n = Math.ceil(Math.floor(k * Math.ceil(w.text.length / 3)) * 3);
          const shown = w.text.slice(0, n);
          if (shown) this.text(shown, x, y, { ...w.st, alpha: (o.alpha ?? 1) * fadeOut, color: col, glow: o.glow });
          if (k > 0 && k < 1) this.text('▍', x + this.measure(shown, w.st), y, { ...w.st, alpha: 0.9 * fadeOut, color: o.cursorColor || col });
        } else {
          const k = easeOutCubic(range(t, w.t - 0.06, w.t + (o.fadeIn || 0.22)));
          const a = lerp(o.dim ?? 0, 1, k) * (o.alpha ?? 1) * fadeOut;
          this.text(w.text, x, y + (1 - k) * (o.rise ?? 14), { ...w.st, alpha: a, color: col, glow: o.glow });
        }
        x += w.wd + space;
      }
    });
    return rows.length * lead;
  }

  // Whole-screen count numeral: slams in at t0 (scale 1.35 -> 1, white-hot flash -> gold), holds, fades by t1.
  numeral(n, t, t0, t1, o = {}) {
    if (t < t0 - 0.02 || t > t1) return;
    const k = clamp((t - t0) / 0.18);
    const s = lerp(o.from ?? 1.32, 1, easeOutExpo(k));
    const fade = 1 - smooth(range(t, t1 - (o.out ?? 0.25), t1));
    const c = this.ctx;
    c.save();
    c.translate(o.x ?? 960, o.y ?? 560);
    c.scale(s, s);
    const hot = 1 - easeOutCubic(range(t, t0, t0 + 0.35));
    const col = [lerp((o.color || P.gold)[0], 1, hot), lerp((o.color || P.gold)[1], 0.97, hot), lerp((o.color || P.gold)[2], 0.9, hot)];
    this.text(String(n), 0, 0, { font: o.font || 'Cormorant', size: o.size || 520, weight: o.weight || 500, stretch: o.stretch || 'normal', align: 'center', base: 'middle', color: col, alpha: fade * (o.alpha ?? 1), glow: o.glow ?? 40 });
    c.restore();
  }

  // "EXCERPT FROM / Title" card in the books' style: lines of a poem, small, with provenance
  excerpt(title, lines, x, y, t, t0, t1, o = {}) {
    if (t < t0 || t > t1) return;
    const a = smooth(range(t, t0, t0 + 0.5)) * (1 - smooth(range(t, t1 - 0.5, t1))) * (o.alpha ?? 1);
    this.label(o.kicker || 'EXCERPT FROM', x, y, { alpha: a * 0.85, size: 13 });
    this.text(title, x, y + 30, { font: 'CormorantI', size: 26, color: P.bookGold, alpha: a });
    const size = o.size || 34;
    lines.forEach((ln, i) => {
      const ai = a * smooth(range(t, t0 + 0.25 + i * 0.35, t0 + 0.75 + i * 0.35));
      const indent = (ln.match(/^\s*/)[0].length) * size * 0.5;
      this.text(ln.trim(), x + indent, y + 30 + 54 + i * size * 1.25, { font: 'Cormorant', size, weight: 400, alpha: ai, shade: 0.8 });
    });
  }

  // simple subtitle (lower-middle), for verse lines when the picture carries the shot
  subtitle(str, t, t0, t1, o = {}) {
    if (t < t0 || t > t1) return;
    const a = smooth(range(t, t0, t0 + 0.15)) * (1 - smooth(range(t, t1 - 0.2, t1)));
    this.text(str, o.x ?? 960, o.y ?? 1000, { font: o.font || 'Cormorant', size: o.size || 40, align: 'center', alpha: a, color: o.color || P.cream, ...o });
  }

  // alien script (logograms), with an optional English gloss beneath in tracked caps
  glyphs(word, x, y, size, t, o = {}) {
    const c = this.ctx;
    const w = drawGlyphWord(c, word, x, y, size, css(o.color || P.red, o.alpha ?? 1), { t, seed: o.seed || 0, reveal: o.reveal ?? 1, lw: o.lw });
    if (o.gloss) this.label(o.gloss, x, y + size * 0.85 + 16, { color: o.glossColor || o.color || P.red, alpha: (o.alpha ?? 1) * 0.85, size: 12 });
    return w;
  }
}
