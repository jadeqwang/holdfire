// t2_nearmiss — Pre-chorus 2, "Secret list of every near-miss and disaster, running total no one ever knew:" (1:42.99-1:47.98).
// The plan's fact-checked 27-entry list (render/data/t2/nearmisses.json, in the plan's order) prints on teletype paper: newsprint
// grey roll, IBM Plex Mono struck through a worn ribbon (per-glyph strike jitter, density and voids, the odd double strike),
// years big, place and description small. The paper advances one line per entry in a quick line feed (about five a second), so
// between feeds every line stands still and is crisp in a pause. A mechanical tally beside the paper counts the entries as they
// pass; after the last one its wheels keep spinning and never settle: the real total is unknown (never 39, never a fixed number).
// p: {t0 (first line strikes; default the shot start + 0.06), t1 (last line; default t0 + 4.55), spin (when the tally starts to
//     spin; default the word "knew"), push (camera push-in, 0.035), seed}
import { P, css, mix } from '../../../palette.js';
import { clamp, lerp, smooth, smoother, easeOutCubic, easeInOutCubic, range, hash1, hash2, rng } from '../../../util.js';
import { ensureList, listNow, lineByText, wordT, bakePaper, inkVoids, drawWheel, odoPos } from './lib.js';

// layout (design px)
const PX0 = 490, PX1 = 1470, PW = PX1 - PX0;      // the paper
const YEAR_X = 42, TEXT_X = 305;                    // inside the paper
const PITCH = 140, PRINT_Y = 862;                   // line pitch, baseline of the line being printed
const YEAR_SZ = 98, PLACE_SZ = 21, DESC_SZ = 25;
const STRIP_TOP = 1000;                             // blank paper above the first line in the strip
const INK = [27, 26, 31];
const TEAR = STRIP_TOP - 640;                       // the roll's torn start, in strip rows

let MACH = null, COVER = null;
function machine() {
  if (MACH) return MACH;
  const W = 1080, H = 620;                           // half-res bake, drawn at 2x (it is dark and soft)
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.fillStyle = 'rgb(24,23,21)'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * 0.5, H * 0.36, 30, W * 0.5, H * 0.45, W * 0.62);
  g.addColorStop(0, 'rgba(98,92,81,0.65)'); g.addColorStop(0.5, 'rgba(52,49,44,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // crinkle finish
  const id = c.getImageData(0, 0, W, H); const d = id.data; const R = rng(77);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const n = (R() - 0.5) * 10 + (hash2(Math.floor(x / 3), Math.floor(y / 3)) - 0.5) * 6; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(id, 0, 0);
  MACH = cv; return cv;
}
function cover() {
  if (COVER) return COVER;
  const W = 1080, H = 160;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0a09'); g.addColorStop(0.05, '#6b665c'); g.addColorStop(0.1, '#3e3b35'); g.addColorStop(0.3, '#2c2a26'); g.addColorStop(1, '#121110');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const id = c.getImageData(0, 0, W, H); const d = id.data; const R = rng(91);
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  c.putImageData(id, 0, 0);
  for (const sx of [130, 950]) { c.fillStyle = '#4d4943'; c.beginPath(); c.arc(sx, 60, 5, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#151413'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx - 3.5, 60); c.lineTo(sx + 3.5, 60); c.stroke(); }
  COVER = cv; return cv;
}

let bake = null;
function bakeStrip(list, seed) {
  if (bake && bake.seed === seed) return bake;
  const n = list.length;
  const H = STRIP_TOP + n * PITCH + 260;
  const paper = bakePaper(PW, H, seed, { base: [196, 191, 178] });
  // a faint fold/roll tension line every so often and the roll's edge shading
  const pc = paper.getContext('2d');
  const eg = pc.createLinearGradient(0, 0, PW, 0);
  eg.addColorStop(0, 'rgba(60,55,45,0.22)'); eg.addColorStop(0.025, 'rgba(60,55,45,0)'); eg.addColorStop(0.975, 'rgba(60,55,45,0)'); eg.addColorStop(1, 'rgba(60,55,45,0.25)');
  pc.fillStyle = eg; pc.fillRect(0, 0, PW, H);
  // ink layer
  const ink = document.createElement('canvas'); ink.width = PW; ink.height = H;
  const c = ink.getContext('2d', { willReadFrequently: true });
  c.textBaseline = 'alphabetic';
  const glyphs = [];                                 // per line: [{x, end}] reveal extents
  list.forEach((it, i) => {
    const yb = STRIP_TOP + i * PITCH;                // baseline of the year
    // ribbon wear varies along the line and from line to line
    const wear = 0.82 + 0.18 * hash1(i * 3.1 + seed);
    const strike = (str, x, y, size, font, track, k0, jitY, darkK) => {
      c.font = `${font} ${size}px PlexM`;
      const cw = c.measureText('M').width + track;
      for (let j = 0; j < str.length; j++) {
        const ch = str[j]; if (ch === ' ') continue;
        const h = hash2(i * 97 + k0 + j, seed);
        const dy = (hash2(i * 31 + j + k0, 7 + seed) - 0.5) * jitY;           // type-strike jitter (vertical)
        const dx = (hash2(i * 13 + j + k0, 11 + seed) - 0.5) * jitY * 0.35;
        const rot = (hash2(i * 17 + j + k0, 19 + seed) - 0.5) * 0.018;
        const a = clamp((0.7 + 0.3 * h) * wear * darkK * (0.88 + 0.12 * Math.sin((x + j * cw) * 0.011 + i)));
        c.save(); c.translate(x + j * cw + dx, y + dy); c.rotate(rot);
        c.fillStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${a})`;
        c.fillText(ch, 0, 0);
        // ink spread: a soft halo at the strike
        c.fillStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${a * 0.16})`;
        c.fillText(ch, 0.7, 0.5); c.fillText(ch, -0.5, -0.4);
        // the odd double strike (the hammer bounced)
        if (h > 0.9) { c.fillStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${a * 0.3})`; c.fillText(ch, 1.6, -1.2); }
        c.restore();
      }
      return str.length * cw;
    };
    const yw = strike(String(it.year), YEAR_X, yb, YEAR_SZ, 500, 2, 0, 3.2, 1.0);
    const place = it.place.toUpperCase();
    const pw = strike(place, TEXT_X, yb - 46, PLACE_SZ, 500, 3.2, 100, 1.6, 0.8);
    const dw = strike(it.text, TEXT_X, yb - 6, DESC_SZ, 400, 0, 200, 1.8, 0.95);
    // the half-ribbon: the top edge of each strike prints lighter
    c.save(); c.globalCompositeOperation = 'destination-out';
    const g = c.createLinearGradient(0, yb - YEAR_SZ * 0.75, 0, yb);
    g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.45, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(YEAR_X - 4, yb - YEAR_SZ, yw + 10, YEAR_SZ + 6);
    c.restore();
    inkVoids(c, YEAR_X - 2, yb - YEAR_SZ * 0.78, yw + 6, YEAR_SZ * 0.82, i * 5 + seed, 1.35);
    inkVoids(c, TEXT_X - 2, yb - 70, Math.max(pw, dw) + 6, 72, i * 5 + 2 + seed, 0.8);
    glyphs.push({ yearEnd: YEAR_X + yw, textEnd: TEXT_X + Math.max(pw, dw) });
  });
  bake = { seed, paper, ink, H, glyphs, n };
  return bake;
}

function times(ctx, shot, p, n) {
  const t0 = p.t0 ?? shot.t0 + 0.06;
  const t1 = p.t1 ?? t0 + 4.55;
  const dt = (t1 - t0) / (n - 1);
  const L = lineByText(ctx.audio, 'running total');
  const spin = p.spin ?? Math.max(t1 + 0.12, wordT(L, 'knew', t1 + 0.2));
  return { t0, t1, dt, spin, T: (i) => t0 + i * dt };
}

export const look = { tonemap: 0, bloom: 0.12, bloomThreshold: 0.95, halation: 0.06, vignette: 0.42, grain: 0.03, typeGlow: 0 };

export default {
  async init() { await ensureList(); },
  async prepare() { await ensureList(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const list = listNow().entries;   // loaded in init/prepare
    const n = list.length;
    const seed = p.seed ?? 3;
    const B = bakeStrip(list, seed);
    const T = times(ctx, shot, p, n);
    // current line (being typed or last typed) and the paper position (in lines)
    let cur = Math.floor((t - T.t0) / T.dt + 1e-6); cur = clamp(cur, -1, n - 1);
    const typeDur = Math.min(0.11, T.dt * 0.62), feedDur = Math.min(0.06, T.dt * 0.32);
    let scroll;   // number of lines the paper has advanced (line i sits on the print line when scroll == i)
    if (t < T.t0) scroll = -1 + smooth(range(t, T.t0 - feedDur - 0.01, T.t0 - 0.01));
    else {
      const ti = T.T(cur);
      scroll = cur + (cur < n - 1 ? smoother(range(t, ti + typeDur + 0.008, ti + typeDur + 0.008 + feedDur)) : 0);
      if (cur === n - 1) scroll = n - 1 + 1.4 * smoother(range(t, ti + typeDur + 0.05, ti + typeDur + 0.35));   // after the last line, the paper runs on
    }
    // typing progress of the current line: the head sweeps 0..1
    const headK = cur >= 0 ? clamp((t - T.T(cur)) / typeDur) : 0;
    // a tiny jolt on each strike (the platen shakes)
    const jolt = cur >= 0 && headK < 1 ? (hash2(Math.floor(t * 96), seed) - 0.5) * 1.2 : 0;

    const c = e.c2dBegin();
    // camera: a slow push toward the paper and the tally
    const push = lerp(1, 1 + (p.push ?? 0.035), smooth(range(t, shot.t0, shot.t1)));
    c.save();
    c.translate(980, 600); c.scale(push, push); c.translate(-980, -600);
    // ---- the room / machine (baked): crinkle-finish enamel housing, lamp pool above the paper
    c.drawImage(machine(), -120, -80, 2160, 1240);
    // paper's shadow on the housing
    { const g = c.createLinearGradient(PX0 - 30, 0, PX1 + 40, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.03, 'rgba(0,0,0,0.5)'); g.addColorStop(0.97, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(PX0 - 30, -200, PW + 70, 1110); }
    // ---- the paper strip: strip row r is at screen y = PRINT_Y - (STRIP_TOP + scroll*PITCH) + r
    const yOff = PRINT_Y - (STRIP_TOP + scroll * PITCH) + jolt * 0.4;
    const top = -40, bot = 960;
    const r0 = top - yOff, r1 = bot - yOff;
    const sr0 = clamp(r0, 0, B.H), sr1 = clamp(r1, 0, B.H);
    c.save();
    c.beginPath(); c.moveTo(PX0 - 2, Math.max(top, TEAR + yOff + 12));
    for (let x = 0; x <= PW; x += 14) c.lineTo(PX0 + x, TEAR + yOff + (hash1(x * 0.37 + seed) - 0.5) * 9 + Math.sin(x * 0.011) * 5);
    c.lineTo(PX1 + 2, bot); c.lineTo(PX0 - 2, bot); c.closePath(); c.clip();
    if (sr1 > sr0) c.drawImage(B.paper, 0, sr0, PW, sr1 - sr0, PX0, sr0 + yOff, PW, sr1 - sr0);
    // ink: every finished line, and the current line up to the print head
    const lineTop = (i) => STRIP_TOP + i * PITCH - YEAR_SZ - 4;
    const lastFull = headK >= 1 ? cur : cur - 1;
    if (lastFull >= 0) {
      const a = clamp(r0, 0, B.H), b = clamp(lineTop(lastFull + 1) - 2, 0, B.H);
      if (b > a) c.drawImage(B.ink, 0, a, PW, b - a, PX0, a + yOff, PW, b - a);
    }
    let headX = null;
    if (cur >= 0 && headK < 1) {
      const gl = B.glyphs[cur];
      // the head prints the year, then the two small lines (a stylised sweep: x advances with the characters)
      const xEnd = gl.textEnd + 8;
      headX = lerp(YEAR_X - 6, xEnd, headK);
      const a = lineTop(cur), b = STRIP_TOP + cur * PITCH + 24;
      c.drawImage(B.ink, 0, a, headX, b - a, PX0, a + yOff, headX, b - a);
    }
    // lighting on the paper: brighter near the lamp, falling toward the top; the curl over the platen darkens the bottom
    c.save();
    c.beginPath(); c.rect(PX0, top, PW, bot - top); c.clip();
    { const g = c.createLinearGradient(0, -40, 0, 960);
      g.addColorStop(0, 'rgba(10,9,8,0.55)'); g.addColorStop(0.35, 'rgba(10,9,8,0.12)'); g.addColorStop(0.72, 'rgba(10,9,8,0)'); g.addColorStop(0.9, 'rgba(10,9,8,0.12)'); g.addColorStop(1, 'rgba(10,9,8,0.6)');
      c.fillStyle = g; c.fillRect(PX0, top, PW, bot - top); }
    { const g = c.createRadialGradient(900, 560, 50, 900, 560, 700); g.addColorStop(0, 'rgba(255,248,232,0.10)'); g.addColorStop(1, 'rgba(255,248,232,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(PX0, top, PW, bot - top); c.globalCompositeOperation = 'source-over'; }
    c.restore();
    c.restore();   // tear clip
    // ---- the machine front: the paper goes down under a clear plastic guide into the cover; the head works under the slot
    const gy = PRINT_Y + 16;
    // clear guide: a faint sheen across the paper with a red index hairline that rides with the print head
    c.fillStyle = 'rgba(210,220,215,0.07)'; c.fillRect(PX0 - 46, gy, PW + 92, 30);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(PX0 - 46, gy, PW + 92, 1.5);
    { const hx = PX0 + (headX ?? (cur >= 0 ? B.glyphs[Math.max(0, cur)].textEnd + 8 : YEAR_X));
      c.fillStyle = 'rgba(170,40,30,0.75)'; c.fillRect(hx - 1, gy + 3, 2.5, 22); }
    // cover lip (baked), with the ribbon's edge just visible in the slot under the head
    c.drawImage(cover(), -120, gy + 30, 2160, 1080 - gy + 60);
    { const hx = PX0 + (headX ?? (cur >= 0 ? B.glyphs[Math.max(0, cur)].textEnd + 8 : YEAR_X));
      const g = c.createLinearGradient(hx - 70, 0, hx + 70, 0); g.addColorStop(0, 'rgba(40,38,34,0)'); g.addColorStop(0.5, 'rgba(70,66,58,0.9)'); g.addColorStop(1, 'rgba(40,38,34,0)');
      c.fillStyle = g; c.fillRect(hx - 70, gy + 32, 140, 5); }
    // ---- the tally (a mechanical counter on a bracket beside the paper)
    const tx = 1530, ty = 470, tw = 300, th = 150;
    { // bracket and box
      c.fillStyle = '#181715'; c.fillRect(PX1 + 6, ty + th * 0.4, tx - PX1 - 6, 26);
      const g = c.createLinearGradient(0, ty - 30, 0, ty + th + 30); g.addColorStop(0, '#4b4842'); g.addColorStop(0.08, '#2c2a27'); g.addColorStop(0.92, '#1e1d1b'); g.addColorStop(1, '#0d0d0c');
      c.fillStyle = g; c.fillRect(tx - 26, ty - 30, tw + 52, th + 60);
      c.fillStyle = 'rgba(230,220,200,0.12)'; c.fillRect(tx - 26, ty - 30, tw + 52, 2);
      for (const [sx, sy] of [[tx - 12, ty - 16], [tx + tw + 12, ty - 16], [tx - 12, ty + th + 16], [tx + tw + 12, ty + th + 16]]) { c.fillStyle = '#5a564f'; c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fill(); }
    }
    // value: entries printed so far (each year's strike adds one), rolling in; after "knew" every wheel spins on its own
    const strikeT = (i) => T.T(i) + typeDur * 0.25;
    let printed = 0; for (let i = 0; i < n; i++) if (t >= strikeT(i)) printed = i + 1;
    const roll = printed > 0 ? smooth(range(t, strikeT(printed - 1), strikeT(printed - 1) + 0.07)) : 1;
    const vCont = printed > 0 ? printed - 1 + roll : 0;
    const spinT = t - T.spin;
    const cw = tw / 3 - 8;
    for (let k = 0; k < 3; k++) {
      const wx = tx + (2 - k) * (cw + 12) - 2, wy = ty + 8, wh = th - 16;
      let pos = odoPos(vCont, k), blur = k === 0 ? (roll < 1 ? 0.5 : 0) : 0;
      if (spinT > 0) {
        // free-running: each wheel at its own (accelerating) rate, never coming to rest
        const rate = [11.3, 6.7, 3.9][k];
        const ramp = Math.min(1, spinT / 0.12);
        const s = rate * (spinT * (0.6 + spinT * 1.2));
        pos = pos + s + 0.5 * ramp;                  // the half-step offset keeps every wheel between numbers
        blur = Math.min(1.5, 0.45 + rate * ramp * spinT * 0.5);
      }
      drawWheel(c, wx, wy, cw, wh, pos, { size: 104, drum: '#0f0f0e', ink: '#e9e4d8', blur, shade: 0.9, font: '500 104px PlexM' });
      c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 3; c.strokeRect(wx, wy, cw, wh);
    }
    // glass glint over the tally window
    { const g = c.createLinearGradient(tx, ty, tx + tw, ty + th); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.35, 'rgba(255,255,255,0.0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.05)'); g.addColorStop(0.55, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(tx, ty, tw, th); }
    c.restore();
    e.blit2d('replace', 1.0);
    ctx.state.t2nm = { T, cur };
  },
};
