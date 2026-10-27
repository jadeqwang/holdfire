// Take two, "lyric" group: the lyric treatments (docs/take2/LYRICS.md has the per-section design).
// A style draws one laid-out lyric line into a block canvas whose transform is design px x res (so style code works in design
// px); lyrics2.js then places the block in the frame (flat, rotated, mirrored, or corner-pinned onto a surface of the plate).
//   style = { font(o) -> {family, px, weight, stretch, track, italic, caps}, pad(o) (design px around the text),
//             extra(o) -> {top, bottom} (room for rules, banners), draw(env) }
//   env   = { g, res, rows, items (flat, with ax/ay baselines and state st), size, lead, t, o, L (line), bw, bh, line (0..1 in/out) }
// Every style shows the whole line from its first word (unsung words at half strength or more, GHOST, so the line reads whole
// while it is up) and lights each word on its onset, the word being sung brightest.
import { clamp, lerp, hash1, hash2, easeOutCubic, easeOutExpo, smooth, range } from '../../../util.js';
import { setFont, grainTile, mottleTile, dotsTile, scanTile, knock, maskIn, scratch, rgba, mixc, hex } from './kit.js';

const fillWord = (g, it, x = it.ax, y = it.ay) => g.fillText(it.w.text, x, y);
const clipWrite = (g, it, k, size, pad = 4) => { g.beginPath(); g.rect(it.ax - pad, it.ay - size * 1.15, (it.width + pad * 2) * k, size * 1.6); g.clip(); };
// polish 4 (phone legibility at 540p): a line reads whole while it is up. Unsung words wait at GHOST (>= 0.5) in the line's own ink,
// sung words are full, the word being sung is brighter. boldWord thickens thin faces (a same-ink stroke under the fill), so serif
// hairlines and script strokes survive the 1920 -> 480 px downscale of a phone view.
const GHOST = 0.5;
const ghostA = (o, d = GHOST) => Math.max(GHOST, o.ghost ?? d);
const boldWord = (g, it, w, x = it.ax, y = it.ay) => {
  if (w > 0) { g.save(); g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = g.fillStyle; g.strokeText(it.w.text, x, y); g.restore(); }
  g.fillText(it.w.text, x, y);
};

// ================================================================================================ verse 1: blueprint lettering
// Drafting caps in white (or cyanotype ink on pale plates): unsung words wait as dashed construction outlines; each word is
// inked left to right as it is sung, a pen point riding the stroke; a running dimension line under the row grows word by word,
// ticked at every word boundary (the verse measures the climb from fin to rocket).
const blueprint = {
  font: (o) => ({ family: o.family || 'archivo', px: o.size || 58, weight: o.weight || 600, stretch: o.stretch || '87.5%', track: o.track ?? 0.07, caps: o.caps ?? true }),
  pad: (o) => 26, extra: (o) => ({ bottom: o.dims === false ? 0 : 26 }),
  draw(E) {
    const { g, size, o, items, rows } = E;
    const ink = o.ink || '#f2f8ff', halo = o.halo, ghost = ghostA(o, 0.55) * E.line;
    g.lineJoin = 'round';
    // halo first (a cheap soft ground so white ink holds on a pale plate)
    if (halo) {
      g.save(); g.strokeStyle = halo; g.lineWidth = size * 0.22; g.globalAlpha = (o.haloA ?? 0.4) * E.line;
      for (const it of items) {
        if (it.st.write < 1) { g.save(); g.globalAlpha = (o.haloA ?? 0.4) * E.line * 0.8; g.strokeText(it.w.text, it.ax, it.ay); g.restore(); }   // the ghost gets its ground too
        if (!it.st.pre) { g.save(); clipWrite(g, it, it.st.write, size, 12); g.strokeText(it.w.text, it.ax, it.ay); g.restore(); }
      }
      g.restore();
    }
    for (const it of items) {
      const s = it.st;
      if (s.write < 1 && ghost > 0) {   // unsung: the word in half-strength ink under a dashed construction outline (reads ahead)
        g.save(); g.fillStyle = ink; g.globalAlpha = ghost; fillWord(g, it);
        g.setLineDash([size * 0.09, size * 0.07]); g.lineWidth = Math.max(1.5, size * 0.03); g.strokeStyle = ink; g.globalAlpha = Math.min(1, ghost * 1.5);
        g.strokeText(it.w.text, it.ax, it.ay); g.restore();
      }
      if (!s.pre) {
        g.save(); clipWrite(g, it, s.write, size); g.globalAlpha = E.line; g.fillStyle = ink; fillWord(g, it); g.restore();
        if (s.write < 1) {   // the pen point
          g.save(); g.globalAlpha = E.line; g.fillStyle = o.pen || '#ffffff';
          g.beginPath(); g.arc(it.ax + it.width * s.write, it.ay - size * 0.36, size * 0.07, 0, 7); g.fill(); g.restore();
        }
      }
    }
    if (o.dims !== false) {   // running dimension line per row
      g.save(); g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = Math.max(1.2, size * 0.03);
      for (const r of rows) {
        const lit = r.items.filter((it) => !it.st.pre);
        const y = r.y + size * 0.3;
        // dashed guide for the whole row
        g.save(); g.globalAlpha = ghost * 0.6; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(r.x0, y); g.lineTo(r.x0 + r.width, y); g.stroke(); g.restore();
        if (!lit.length) continue;
        const last = lit[lit.length - 1];
        const xe = last.ax + last.width * last.st.write;
        g.globalAlpha = E.line * 0.9;
        g.beginPath(); g.moveTo(r.x0, y); g.lineTo(xe, y); g.stroke();
        const tick = (x, h) => { g.beginPath(); g.moveTo(x, y - h); g.lineTo(x, y + h); g.stroke(); };
        tick(r.x0, size * 0.16);
        for (const it of lit) { if (it.st.write >= 1) tick(it.ax + it.width, size * 0.1); }
        // arrowheads at both ends of the drawn dimension
        const ah = size * 0.11;
        g.beginPath(); g.moveTo(r.x0, y); g.lineTo(r.x0 + ah, y - ah * 0.45); g.lineTo(r.x0 + ah, y + ah * 0.45); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(xe, y); g.lineTo(xe - ah, y - ah * 0.45); g.lineTo(xe - ah, y + ah * 0.45); g.closePath(); g.fill();
      }
      g.restore();
    }
  },
};

// ================================================================================================ verse 1: pressed into clay / dust
// The words are pressed into the surface: a dark recess, a lit lower lip, the surface colour in the floor of each letter; a
// reed wedge is pressed before each word as it lands (writing began as counting). Unsung words are faint scratches.
const incise = {
  font: (o) => ({ family: o.family || 'corm', px: o.size || 64, weight: o.weight || 700, track: o.track ?? 0.08, caps: o.caps ?? true }),
  pad: () => 22,
  draw(E) {
    const { g, size, o, items } = E;
    const dark = o.dark || 'rgba(38,24,12,0.9)', lite = o.lite || 'rgba(255,238,205,0.6)', core = o.core || 'rgba(96,66,40,0.85)';
    for (const it of items) {
      const s = it.st;
      if (s.pre || s.k < 1) { g.save(); g.globalAlpha = ghostA(o) * E.line; g.fillStyle = core; fillWord(g, it); g.strokeStyle = dark; g.lineWidth = Math.max(1.5, size * 0.02); g.strokeText(it.w.text, it.ax, it.ay); g.restore(); }
      if (s.pre) continue;
      const sc = lerp(1.12, 1, easeOutExpo(s.k)), a = E.line * clamp(s.k * 1.6);
      g.save(); g.globalAlpha = a;
      g.translate(it.ax + it.width / 2, it.ay - size * 0.35); g.scale(sc, sc); g.translate(-(it.ax + it.width / 2), -(it.ay - size * 0.35));
      g.fillStyle = lite; fillWord(g, it, it.ax - size * 0.018, it.ay - size * 0.026);
      g.fillStyle = dark; fillWord(g, it, it.ax + size * 0.03, it.ay + size * 0.04);
      g.fillStyle = core; fillWord(g, it);
      if (o.wedges) {   // the reed wedge before the word
        const x = it.ax - size * 0.34, y = it.ay - size * 0.42, w = size * 0.2;
        g.fillStyle = dark; g.beginPath(); g.moveTo(x - w, y - w * 0.7); g.lineTo(x + w, y); g.lineTo(x - w, y + w * 0.7); g.closePath(); g.fill();
        g.fillStyle = lite; g.beginPath(); g.moveTo(x - w, y - w * 0.7); g.lineTo(x + w * 0.2, y - w * 0.1); g.lineTo(x - w * 0.8, y - w * 0.35); g.closePath(); g.fill();
      }
      g.restore();
    }
    knock(g, grainTile(), o.grain ?? 0.28, E.pw, E.ph);
  },
};

// ================================================================================================ signal print: riso type
// Two inks printed off register (the Rare Earth signal print): the light ink as a halftone screen, the strong ink solid with
// mottle; each word prints in two frames (light plate, then the key plate). Unsung words show only a pale first impression.
const riso = {
  font: (o) => ({ family: o.family || 'archivo', px: o.size || 70, weight: o.weight || 800, stretch: o.stretch || '100%', track: o.track ?? 0.02, caps: o.caps ?? true }),
  pad: (o) => 24 + Math.abs((o.mis || [5, 3])[0]),
  draw(E) {
    const { g, size, o, items } = E;
    const [A, B] = o.inks || ['#f3efe6', '#ff5a1f'];
    const mis = o.mis || [5, 3];
    // light ink (screened) into its own layer
    const LB = scratch('l2_risoB', E.pw, E.ph), gb = LB.g; gb.setTransform(E.res, 0, 0, E.res, 0, 0); setFont(gb, E.f); gb.textBaseline = 'alphabetic';
    gb.fillStyle = B;
    for (const it of items) { if (it.st.pre) continue; gb.globalAlpha = E.line; fillWord(gb, it, it.ax + mis[0], it.ay + mis[1]); }
    maskIn(gb, dotsTile(o.cell || 5), E.pw, E.ph);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LB, 0, 0); g.restore();
    // key ink
    const LA = scratch('l2_risoA', E.pw, E.ph), ga = LA.g; ga.setTransform(E.res, 0, 0, E.res, 0, 0); setFont(ga, E.f); ga.textBaseline = 'alphabetic';
    for (const it of items) {
      const s = it.st;
      if (s.pre || s.f < 1) { ga.globalAlpha = ghostA(o, 0.55) * E.line; ga.fillStyle = o.ghostInk || A; fillWord(ga, it); continue; }
      ga.globalAlpha = E.line; ga.fillStyle = s.hot > 0.5 && o.hotInk ? o.hotInk : A; fillWord(ga, it);
    }
    knock(ga, mottleTile(), o.mottle ?? 0.35, E.pw, E.ph);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(LA, 0, 0); g.restore();
  },
};

// ================================================================================================ screens: CRT text mode
// Text mode on a phosphor tube: words type on character by character across their sung length, a block cursor rides the
// typing and blinks at the end of the line; scanlines and a faint horizontal ghost. Optional dark panel (the screen face).
const crt = {
  font: (o) => ({ family: o.family || 'vt', px: o.size || 76, weight: o.weight || 400, track: o.track ?? 0.02, caps: o.caps ?? false }),
  pad: (o) => (o.panel ? 30 : 18),
  draw(E) {
    const { g, size, o, items, rows } = E;
    const col = o.col || '#a8f0ff';
    if (o.panel) {
      g.save(); g.globalAlpha = E.line * (o.panelA ?? 0.72); g.fillStyle = o.panel; g.beginPath(); g.roundRect(4, 4, E.bw - 8, E.bh - 8, 16); g.fill();
      g.globalAlpha = E.line * 0.4; g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); g.restore();
    }
    let cursor = null;
    for (const it of items) {
      const s = it.st, txt = it.w.text;
      if (s.write < 1) { g.globalAlpha = ghostA(o) * E.line; g.fillStyle = col; fillWord(g, it); }
      if (s.pre) continue;
      const n = Math.ceil(s.write * txt.length), shown = txt.slice(0, n);
      g.globalAlpha = E.line * 0.3; g.fillStyle = col; g.fillText(shown, it.ax + 3, it.ay);     // horizontal ghost
      g.globalAlpha = E.line; g.fillStyle = s.hot > 0.6 && o.hotCol ? o.hotCol : col; g.fillText(shown, it.ax, it.ay);
      const wShown = g.measureText(shown).width;
      cursor = { x: it.ax + wShown + size * 0.08, y: it.ay, typing: n < txt.length };
    }
    if (cursor && o.cursor !== false && (cursor.typing || Math.floor(E.t * 3.2) % 2 === 0)) {
      g.globalAlpha = E.line; g.fillStyle = col; g.fillRect(cursor.x, cursor.y - size * 0.62, size * 0.36, size * 0.7);
    }
    knock(g, scanTile(o.scan || 3), 0.45, E.pw, E.ph);
  },
};

// ================================================================================================ light in the sky / the graph
// Words as starlight: a thin serif in gold (or pale blue) that ignites on its onset with a four-point flare; unsung words wait
// as faint pale light. nodes: each word hangs on a node, lit nodes join edge to edge (the contact graph).
const light = {
  font: (o) => ({ family: o.family || 'inst', px: o.size || 70, weight: o.weight || 400, track: o.track ?? 0.03, caps: o.caps ?? false, italic: o.italic }),
  pad: (o) => (o.nodes ? 40 : 30), extra: (o) => ({ bottom: o.nodes ? 24 : 0 }),
  draw(E) {
    const { g, size, o, items } = E;
    const col = o.col || [1, 0.84, 0.52], ghostCol = o.ghostCol || [0.7, 0.82, 1];
    const lit = [], bw = size * (o.bold ?? 0.03);
    for (const [i, it] of items.entries()) {
      const s = it.st;
      if (s.k < 1) { g.globalAlpha = ghostA(o, 0.55) * E.line * (1 - s.k); g.fillStyle = rgba(mixc(col, ghostCol, 0.3)); boldWord(g, it, bw); }
      if (s.pre) continue;
      const tw = o.twinkle === false ? 1 : 0.92 + 0.08 * hash2(i + 1, Math.floor(E.t * 12));
      g.globalAlpha = E.line * s.k * tw; g.fillStyle = rgba(mixc(col, [1, 1, 1], 0.7 * Math.max(s.hot, s.sung ? 0.4 : 0))); boldWord(g, it, bw);
      lit.push(it);
      if (o.flare !== false && s.hot > 0.05) {   // four-point flare at the word's first letter
        const fx = it.ax + Math.min(it.width * 0.12, size * 0.25), fy = it.ay - size * 0.72, L = size * (0.25 + 0.9 * s.hot);
        g.save(); g.globalAlpha = E.line * s.hot; g.strokeStyle = rgba(mixc(col, [1, 1, 1], 0.6)); g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(fx - L, fy); g.lineTo(fx + L, fy); g.moveTo(fx, fy - L * 0.6); g.lineTo(fx, fy + L * 0.6); g.stroke();
        const gr = g.createRadialGradient(fx, fy, 0, fx, fy, size * 0.32); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(fx, fy, size * 0.32, 0, 7); g.fill(); g.restore();
      }
    }
    if (o.nodes) {   // a node under each word, edges between consecutive lit words
      const ny = (it) => it.ay + size * 0.36, nx = (it) => it.ax + it.width / 2;
      g.save(); g.strokeStyle = rgba(col); g.lineWidth = 1.6;
      for (let i = 1; i < lit.length; i++) { g.globalAlpha = E.line * 0.75 * lit[i].st.k; g.beginPath(); g.moveTo(nx(lit[i - 1]), ny(lit[i - 1])); g.lineTo(nx(lit[i - 1]) + (nx(lit[i]) - nx(lit[i - 1])) * lit[i].st.k, ny(lit[i - 1]) + (ny(lit[i]) - ny(lit[i - 1])) * lit[i].st.k); g.stroke(); }
      for (const it of items) { g.globalAlpha = E.line * (it.st.pre ? 0.3 : 1); g.fillStyle = it.st.pre ? rgba(ghostCol) : rgba(mixc(col, [1, 1, 1], 0.5 * it.st.hot)); g.beginPath(); g.arc(nx(it), ny(it), size * (it.st.pre ? 0.035 : 0.06), 0, 7); g.fill(); }
      g.restore();
    }
  },
};

// ================================================================================================ verse 2: brushed ink
// English brushed in Ma Shan Zheng's Latin: each word lands as a soaked blot for a frame, settles the next, then dries crisp
// with dry-brush gaps; the brush sweeps left to right across the sung length. seal: a cinnabar seal stamps after the line.
const brush = {
  font: (o) => ({ family: o.family || 'brush', px: o.size || 80, weight: 400, track: o.track ?? 0.01, caps: false }),
  pad: () => 28,
  draw(E) {
    const { g, size, o, items } = E;
    const ink = o.ink || '#16120e';
    for (const it of items) {
      const s = it.st;
      const gh = ghostA(o, 0.45);
      if (s.write < 1) { g.globalAlpha = gh * E.line; g.fillStyle = ink; boldWord(g, it, size * 0.03); }
      if (s.pre) continue;
      g.save(); clipWrite(g, it, s.write, size, 8);
      g.globalAlpha = E.line; g.fillStyle = ink; g.strokeStyle = ink;
      g.lineWidth = size * 0.035; g.lineJoin = 'round'; g.strokeText(it.w.text, it.ax, it.ay);
      if (s.f < 2) {   // soaked blot, then settling
        g.filter = `blur(${((s.f === 0 ? 2.6 : 0.9) * E.res).toFixed(2)}px)`; g.lineWidth = s.f === 0 ? 3 : 1.2; g.strokeText(it.w.text, it.ax, it.ay);
      }
      fillWord(g, it); g.filter = 'none';
      if (s.f === 0) for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(it.ax + it.width * hash2(it.i, k), it.ay - size * (0.1 + 0.7 * hash2(k, it.i + 3)), 0.8 + 2.4 * hash2(k + 9, it.i), 0, 7); g.fill(); }
      g.restore();
    }
    knock(g, grainTile(), o.dry ?? 0.22, E.pw, E.ph);
    if (o.seal) {
      const last = items[items.length - 1];
      if (last && !last.st.pre) {
        const k = easeOutExpo(clamp((E.t - (last.w.end ?? last.w.t + 0.3)) / 0.12));
        if (k > 0) {
          const s = size * 0.62, x = last.ax + last.width + size * 0.3, y = last.ay - s * 0.85;
          g.save(); g.globalAlpha = E.line * 0.92; g.translate(x + s / 2, y + s / 2); g.scale(lerp(1.4, 1, k), lerp(1.4, 1, k)); g.rotate(-0.04);
          g.fillStyle = '#c0281a'; g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * 0.12); g.fill();
          g.strokeStyle = 'rgba(255,240,220,0.85)'; g.lineWidth = s * 0.07; g.strokeRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6);
          g.restore();
        }
      }
    }
  },
};

// ================================================================================================ Petrov: Soviet terminal
// A console readout in caps, a prompt, characters typed as sung, a blinking block; scanlines. (English words, Plex Mono.)
const terminal = {
  font: (o) => ({ family: o.family || 'plex', px: o.size || 50, weight: 500, track: o.track ?? 0.02, caps: o.caps ?? true }),
  pad: (o) => (o.panel ? 30 : 16),
  draw(E) {
    const { g, size, o, items, rows } = E;
    const col = o.col || '#ffb347';
    if (o.panel) { g.save(); g.globalAlpha = E.line * (o.panelA ?? 0.7); g.fillStyle = o.panel; g.beginPath(); g.roundRect(4, 4, E.bw - 8, E.bh - 8, 10); g.fill(); g.restore(); }
    if (o.prompt) { const r0 = rows[0]; g.globalAlpha = E.line * 0.75; g.fillStyle = col; g.fillText(o.prompt, r0.x0 - g.measureText(o.prompt).width - size * 0.25, r0.y); }
    let cursor = null;
    for (const it of items) {
      const s = it.st, txt = it.w.text;
      if (s.write < 1) { g.globalAlpha = ghostA(o) * E.line; g.fillStyle = col; fillWord(g, it); }
      if (s.pre) continue;
      const n = Math.ceil(s.write * txt.length), shown = txt.slice(0, n);
      g.globalAlpha = E.line; g.fillStyle = s.hot > 0.6 && o.hotCol ? o.hotCol : col; g.fillText(shown, it.ax, it.ay);
      cursor = { x: it.ax + g.measureText(shown).width + 4, y: it.ay, typing: n < txt.length };
    }
    if (o.strike) {   // a rule through the line once it is complete (struck instructions)
      const last = items[items.length - 1];
      if (last && E.t > last.w.t + 0.1) for (const r of rows) { const k = easeOutCubic(clamp((E.t - last.w.t - 0.1) / 0.25)); g.globalAlpha = E.line; g.fillStyle = col; g.fillRect(r.x0 - 6, r.y - size * 0.33, (r.width + 12) * k, Math.max(2, size * 0.07)); }
    }
    if (cursor && o.cursor !== false && (cursor.typing || Math.floor(E.t * 3) % 2 === 0)) { g.globalAlpha = E.line; g.fillStyle = col; g.fillRect(cursor.x, cursor.y - size * 0.74, size * 0.55, size * 0.86); }
    knock(g, scanTile(o.scan || 3), o.scanA ?? 0.4, E.pw, E.ph);
  },
};

// ================================================================================================ teletype / typewriter on paper
// Struck characters in a ribbon ink (red half of a two-colour ribbon by default): uneven inking, each letter lands a few ms
// after the last, the ribbon's texture in the strokes.
const typewriter = {
  font: (o) => ({ family: o.family || 'plex', px: o.size || 46, weight: 500, track: o.track ?? 0.0, caps: o.caps ?? false }),
  pad: () => 16,
  draw(E) {
    const { g, size, o, items } = E;
    const ink = o.ink || '#b0261c';
    if (o.tape) {   // a strip of teletype paper behind the rows, torn at both ends
      g.save(); g.globalAlpha = E.line; g.fillStyle = o.paper || '#ece6d6';
      for (const r of E.rows) {
        const x0 = r.x0 - size * 0.6, x1 = r.x0 + r.width + size * 0.6, y0 = r.y - size * 0.95, y1 = r.y + size * 0.42;
        g.beginPath(); g.moveTo(x0, y0);
        for (let k = 0; k <= 8; k++) g.lineTo(x1 + (hash2(k, r.y) - 0.5) * size * 0.25, y0 + (y1 - y0) * k / 8);
        for (let k = 8; k >= 0; k--) g.lineTo(x0 + (hash2(k + 20, r.y) - 0.5) * size * 0.25, y0 + (y1 - y0) * k / 8);
        g.closePath(); g.fill();
      }
      g.restore();
    }
    for (const it of items) {
      const s = it.st;
      if (s.pre) { g.globalAlpha = ghostA(o, 0.45) * E.line; g.fillStyle = ink; fillWord(g, it); continue; }
      let x = it.ax;
      for (let j = 0; j < it.w.text.length; j++) {
        const ch = it.w.text[j], cw = g.measureText(ch).width;
        if (E.t >= it.w.t - 0.04 + j * (o.cps ? 1 / o.cps : 0.014)) {
          g.globalAlpha = E.line * (0.72 + 0.28 * hash2(it.i * 31 + j, 7)); g.fillStyle = ink;
          g.fillText(ch, x + (hash2(j, it.i) - 0.5) * 1.2, it.ay + (hash2(it.i, j + 5) - 0.5) * 2.2);
        } else { g.globalAlpha = ghostA(o, 0.45) * E.line; g.fillStyle = ink; g.fillText(ch, x, it.ay); }   // not struck yet: the ghost
        x += cw;
      }
    }
    knock(g, grainTile(), o.grain ?? 0.22, E.pw, E.ph);
  },
};

// ================================================================================================ coins / golden record: engraving
// Roman caps engraved in gold: a gradient fill (light lip to deep floor), a dark cut line, and a glint that sweeps across each
// word on its onset. Unsung words are a dark-gold impression.
const engrave = {
  font: (o) => ({ family: o.family || 'corm', px: o.size || 58, weight: o.weight || 600, track: o.track ?? 0.16, caps: o.caps ?? true }),
  pad: () => 22,
  draw(E) {
    const { g, size, o, items } = E;
    for (const it of items) {
      const s = it.st;
      if (s.k < 1) { g.globalAlpha = ghostA(o, 0.6) * E.line * (1 - s.k * 0.5); g.fillStyle = o.ghostCol || '#d2a65a'; boldWord(g, it, size * 0.02); }
      if (s.pre) continue;
      const gr = g.createLinearGradient(0, it.ay - size * 0.75, 0, it.ay + size * 0.05);
      gr.addColorStop(0, o.top || '#fff3cc'); gr.addColorStop(0.45, o.mid || '#f0b84a'); gr.addColorStop(1, o.bot || '#9a6420');
      g.globalAlpha = E.line * s.k;
      g.fillStyle = 'rgba(30,18,4,0.85)'; fillWord(g, it, it.ax + size * 0.025, it.ay + size * 0.035);
      g.fillStyle = gr; boldWord(g, it, size * 0.02);
      if (s.hot > 0.02) {   // glint
        g.save(); clipWrite(g, it, 1, size, 0);
        const gx = it.ax - size + (it.width + size * 2) * (1 - s.hot);
        const gg = g.createLinearGradient(gx - size * 0.5, 0, gx + size * 0.5, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,240,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = gg; g.fillRect(it.ax - 4, it.ay - size, it.width + 8, size * 1.3); g.restore();
      }
    }
  },
};

// ================================================================================================ bridge: chalk in the dark
// A hand written in chalk (Reenie Beanie, thickened): each letter is drawn left to right across the sung length; the chalk's
// tooth breaks the strokes. Unsung words: a faint smudge to read ahead on.
const chalk = {
  font: (o) => ({ family: 'hand', px: o.size || 96, weight: 400, track: o.track ?? 0.02, caps: false }),
  pad: () => 24,
  draw(E) {
    const { g, size, o, items } = E;
    const col = o.col || '#f1efe6';
    g.lineJoin = 'round'; g.lineWidth = size * (o.bold ?? 0.056); g.strokeStyle = col; g.fillStyle = col;
    for (const it of items) {
      const s = it.st;
      if (s.write < 1) { g.globalAlpha = ghostA(o) * E.line; g.strokeText(it.w.text, it.ax, it.ay); fillWord(g, it); }
      if (s.pre) continue;
      g.save(); clipWrite(g, it, s.write, size, 6); g.globalAlpha = E.line; g.strokeText(it.w.text, it.ax, it.ay); fillWord(g, it); g.restore();
    }
    knock(g, grainTile(), o.grain ?? 0.3, E.pw, E.ph);
  },
};

// ================================================================================================ bridge battle: anime impact type
// Heavy condensed caps with a thick ink outline and a hard offset shadow; each word slams in (overshoot, a tilt) on its onset
// and the line shakes off each landing. Nothing before it is sung.
const impact = {
  font: (o) => ({ family: 'anton', px: o.size || 110, weight: 400, track: o.track ?? 0.015, caps: o.caps ?? true }),
  pad: (o) => 40,
  draw(E) {
    const { g, size, o, items } = E;
    const fill = o.fill || '#ffffff', edge = o.edge || '#0b0b10', acc = o.acc || '#ff5a1f';
    const last = [...items].reverse().find((it) => !it.st.pre);
    const kk = last ? Math.exp(-Math.max(0, E.t - last.w.t) / 0.08) : 0;
    const sx = (hash2(Math.floor(E.t * 24), 1) - 0.5) * 16 * kk, sy = (hash2(Math.floor(E.t * 24), 2) - 0.5) * 12 * kk;
    g.lineJoin = 'round';
    for (const it of items) {
      const s = it.st;
      if (s.pre) {   // unsung: flat and still, half strength (the line reads ahead; the slam is the word's own moment)
        g.globalAlpha = E.line * ghostA(o, 0.45); g.strokeStyle = edge; g.lineWidth = size * 0.1; g.strokeText(it.w.text, it.ax, it.ay);
        g.fillStyle = fill; fillWord(g, it); continue;
      }
      const u = clamp((E.t - it.w.t + 0.04) / 0.13), sc = 1 + 0.75 * Math.pow(1 - u, 3);
      const rot = ((hash2(it.i + 3, 11) - 0.5) * 2 * (o.tilt ?? 4)) * Math.PI / 180;
      const cx = it.ax + it.width / 2, cy = it.ay - size * 0.4;
      g.save(); g.translate(cx + sx, cy + sy); g.rotate(rot); g.scale(sc, sc); g.translate(-cx, -cy);
      g.globalAlpha = E.line * clamp(u * 3);
      g.fillStyle = acc; fillWord(g, it, it.ax + size * 0.07, it.ay + size * 0.07);
      g.strokeStyle = edge; g.lineWidth = size * 0.13; g.strokeText(it.w.text, it.ax, it.ay);
      g.fillStyle = s.hot > 0.7 ? (o.hotFill || '#fff3a8') : fill; fillWord(g, it);
      g.restore();
    }
  },
};

// ================================================================================================ Arkhipov: poster lettering
// Condensed poster caps stamped onto a banner (red or black) that wipes in with the line; halftone in the banner's ink; the
// block is set on the poster's diagonal by the plan's rot.
const poster = {
  font: (o) => ({ family: 'anton', px: o.size || 96, weight: 400, track: o.track ?? 0.03, caps: true }),
  pad: () => 34,
  draw(E) {
    const { g, size, o, items, rows } = E;
    const band = o.band || '#c9261c', ink = o.ink || '#f2e9d8';
    const L0 = E.L.words[0].t;
    const wipe = easeOutCubic(clamp((E.t - (L0 - 0.12)) / 0.22));
    if (band !== 'none') for (const r of rows) {
      const x0 = r.x0 - size * 0.32, w = (r.width + size * 0.64) * wipe, y0 = r.y - size * 0.95, h = size * 1.18, sk = size * 0.22;
      g.save(); g.globalAlpha = E.line; g.fillStyle = band; g.beginPath(); g.moveTo(x0 + sk, y0); g.lineTo(x0 + w + sk, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.closePath(); g.fill();
      g.restore();
    }
    for (const it of items) {
      const s = it.st;
      if (s.pre || s.f < 1) { g.globalAlpha = ghostA(o) * E.line * wipe; g.fillStyle = ink; fillWord(g, it); if (s.pre) continue; }
      const sc = lerp(1.14, 1, easeOutExpo(s.k));
      g.save(); g.translate(it.ax + it.width / 2, it.ay - size * 0.4); g.scale(sc, sc); g.translate(-(it.ax + it.width / 2), -(it.ay - size * 0.4));
      g.globalAlpha = E.line; g.fillStyle = ink; fillWord(g, it); g.restore();
    }
    knock(g, mottleTile(), o.wear ?? 0.25, E.pw, E.ph);
  },
};

// ================================================================================================ build: VHS on-screen display
// The VCR's own lettering: white pixel caps with a hard black drop shadow and chroma fringes, a rewind glyph in front, the
// whole line jittering on twos. Words appear as they are sung.
const osd = {
  font: (o) => ({ family: 'vt', px: o.size || 84, weight: 400, track: o.track ?? 0.04, caps: o.caps ?? true }),
  pad: (o) => 22 + (o.glyph === false ? 0 : (o.size || 84) * 0.9),
  draw(E) {
    const { g, size, o, items, rows } = E;
    const jx = (hash2(Math.floor(E.t * 12), 4) - 0.5) * 4;
    g.save(); g.translate(jx, 0);
    if (o.glyph !== false) {   // two filled triangles: rewind (or play)
      const r0 = rows[0], x = r0.x0 - size * 0.95, y = r0.y - size * 0.34, h = size * 0.27, dir = o.glyph === 'play' ? 1 : -1;
      const tri = (cx) => { g.beginPath(); g.moveTo(cx + dir * h, y); g.lineTo(cx - dir * h, y - h); g.lineTo(cx - dir * h, y + h); g.closePath(); g.fill(); };
      g.globalAlpha = E.line; g.fillStyle = '#000'; tri(x + 4 + h, ); g.fillStyle = '#fff'; tri(x + h); if (o.glyph !== 'play') { g.fillStyle = '#000'; tri(x + 4 + h * 2.6); g.fillStyle = '#fff'; tri(x + h * 2.6); }
    }
    for (const it of items) {
      if (it.st.pre) { g.globalAlpha = E.line * ghostA(o, 0.45); g.fillStyle = '#000'; fillWord(g, it, it.ax + 4, it.ay + 4); g.fillStyle = o.col || '#ffffff'; fillWord(g, it); continue; }
      g.globalAlpha = E.line; g.fillStyle = '#000'; fillWord(g, it, it.ax + 4, it.ay + 4);
      g.globalAlpha = E.line * 0.55; g.fillStyle = '#ff3040'; fillWord(g, it, it.ax - 2.5, it.ay);
      g.fillStyle = '#30e0ff'; fillWord(g, it, it.ax + 2.5, it.ay);
      g.globalAlpha = E.line; g.fillStyle = o.col || '#ffffff'; fillWord(g, it);
    }
    g.restore();
  },
};

// ================================================================================================ the drop: written on the glass
// A marker line on the mirror's glass: the ink, a faint offset double (the glass's second surface), a specular streak across
// each word as it lands. Placed twice by the plan: as-is on Jade's side, mirrored (reversed) in teal on teal-tips' side.
const glass = {
  font: (o) => ({ family: o.family || 'inst', px: o.size || 78, weight: 400, track: o.track ?? 0.01, caps: o.caps ?? false, italic: o.italic }),
  pad: () => 26,
  draw(E) {
    const { g, size, o, items } = E;
    const ink = o.ink || '#1f2bd1', bw = size * (o.bold ?? 0.03);
    if (o.halo) { g.save(); g.lineJoin = 'round'; g.strokeStyle = o.halo; g.lineWidth = size * 0.3; g.globalAlpha = 0.85 * E.line; for (const it of items) g.strokeText(it.w.text, it.ax, it.ay); g.restore(); }
    for (const it of items) {
      const s = it.st;
      if (s.write < 1) { g.globalAlpha = ghostA(o, 0.55) * E.line; g.fillStyle = ink; boldWord(g, it, bw); }
      if (s.pre) continue;
      g.save(); clipWrite(g, it, s.write, size, 6);
      g.globalAlpha = E.line * 0.22; g.fillStyle = ink; fillWord(g, it, it.ax + size * 0.06, it.ay + size * 0.04);
      g.globalAlpha = E.line; boldWord(g, it, bw);
      if (s.hot > 0.05) {
        const gx = it.ax - size + (it.width + size * 2) * (1 - s.hot);
        const gg = g.createLinearGradient(gx - size * 0.4, 0, gx + size * 0.4, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = gg; g.fillRect(it.ax - 4, it.ay - size, it.width + 8, size * 1.3);
      }
      g.restore();
    }
  },
};

// ================================================================================================ outro: factory safety board
// Enamel sign lettering (Big Shoulders, heavy condensed caps) on a painted panel with a rule and rivets; worn enamel.
const board = {
  font: (o) => ({ family: 'board', px: o.size || 74, weight: o.weight || 800, track: o.track ?? 0.05, caps: o.caps ?? true }),
  pad: () => 34,
  draw(E) {
    const { g, size, o, items } = E;
    const panel = o.panel || '#1d5a35', ink = o.ink || '#f1ead6';
    if (panel !== 'none') {
      g.save(); g.globalAlpha = E.line; g.fillStyle = panel; g.beginPath(); g.roundRect(4, 4, E.bw - 8, E.bh - 8, 10); g.fill();
      g.strokeStyle = ink; g.globalAlpha = E.line * 0.8; g.lineWidth = 3; g.beginPath(); g.roundRect(14, 14, E.bw - 28, E.bh - 28, 6); g.stroke();
      g.fillStyle = '#b9b2a0'; for (const [x, y] of [[24, 24], [E.bw - 24, 24], [24, E.bh - 24], [E.bw - 24, E.bh - 24]]) { g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }
      g.restore();
    }
    for (const it of items) {
      const s = it.st;
      g.globalAlpha = E.line * (s.pre ? ghostA(o) : lerp(ghostA(o), 1, s.k)); g.fillStyle = s.hot > 0.6 && !s.pre ? (o.hotCol || '#ffffff') : ink; fillWord(g, it);
    }
    knock(g, mottleTile(), o.wear ?? 0.22, E.pw, E.ph);
  },
};

// ================================================================================================ whispers
// The whispered counts and "hold your fire": a light italic, each word breathing in slowly and settling upward; no ghost.
const whisper = {
  font: (o) => ({ family: o.family || 'instI', px: o.size || 66, weight: 400, track: o.track ?? 0.06, caps: false, italic: false }),
  pad: () => 24,
  draw(E) {
    const { g, size, o, items } = E;
    const col = o.col || [0.86, 0.9, 1];
    for (const it of items) {
      const k = easeOutCubic(clamp((E.t - (it.w.t - 0.08)) / 0.55)), bw = size * (o.bold ?? 0.025);
      g.fillStyle = rgba(col);
      if (k <= 0) { g.globalAlpha = E.line * ghostA(o, 0.45); boldWord(g, it, bw); continue; }   // unsung: waits in place at half strength
      g.globalAlpha = E.line * lerp(ghostA(o, 0.45), o.alpha ?? 0.95, k); boldWord(g, it, bw, it.ax, it.ay + (1 - k) * size * 0.12);
    }
  },
};

// ================================================================================================ fallback: plain lower third
const plain = {
  font: (o) => ({ family: 'open', px: o.size || 54, weight: 600, track: 0.005, caps: false }),
  pad: () => 20,
  draw(E) {
    const { g, size, o, items } = E;
    for (const it of items) {
      g.globalAlpha = E.line * (it.st.pre ? GHOST : 1); g.lineWidth = size * 0.16; g.strokeStyle = 'rgba(5,7,13,0.55)'; g.lineJoin = 'round';
      g.strokeText(it.w.text, it.ax, it.ay); g.fillStyle = o.col || '#f3eee4'; fillWord(g, it);
    }
  },
};

export const STYLES = { blueprint, incise, riso, crt, light, brush, terminal, typewriter, engrave, chalk, impact, poster, osd, glass, board, whisper, plain };
