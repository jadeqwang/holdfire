// t2_counter — Outro, 3:44.33-3:53.17+: a factory safety board, "[ N ] DAYS SINCE LAST RESET".
// An enamel sign bolted to a dark wall under a work lamp; a steel panel of roller digits; a small card beside the number holds
// the year of the last reset. Day 0 is 9 August 1945 (Nagasaki). The counter runs the calendar forward and snaps back to zero
// on the real date of every entry of the fact-checked list (render/data/t2/nearmisses.json `date`, sorted by date; entries on the
// same day share one reset), each reset a two-frame red SIGNAL LOST and a flicker of VHS rewind lines. The resets land on a
// 32nd-note grid taken from the beat list and come faster through the whispered count (one per sixteenth by 3:47.8), stuttering
// to the last one, the 15 Sep 2026 entry. Past it the counter climbs to the release-date value (default 2026-10-27 -> 42),
// digits rolling upward on "higher" (3:49.44), and keeps climbing a day per beat after that.
// p: {release ('2026-10-27'), b0 (first grid point; default the beat at the shot start), gaps ([32nds] between resets, one per
//     reset date; default accelerating 8,8,4,3,3, 2 x13, 1 x10, then a 2 before the last), higher (default the word "higher"), climbEnd (default its end),
//     perBeat (days added per beat after the climb, 1), hold (s the release value is held first, 1.0), push (0.06),
//     countRate (12: between resets the board counts up from zero, a whole count every two frames, right-aligned in the ones place)}
import { P, css, mix } from '../../../palette.js';
import { clamp, lerp, smooth, smoother, easeInOutCubic, easeOutCubic, range, hash1, hash2, rng } from '../../../util.js';
import { ensureList, listNow, dayOf, gridT, beatK, lineByText, wordT, drawWheel, odoPos, vhsPass } from './lib.js';

const SIGN = { x: 500, y: 214, w: 920, h: 650 };
const DR = { n: 4, w: 132, h: 214, gap: 10, y: 286 };
const FRAME = 1 / 24;

// reset schedule: sorted unique dates -> song times
let SCHED = null;
export function schedule(audio, p, shotT0) {
  const key = JSON.stringify([p.gaps, p.b0, p.release, p.higher, p.climbEnd, shotT0]);
  if (SCHED && SCHED.key === key) return SCHED;
  const list = listNow();
  const epoch = dayOf(list.epoch.date);
  const byDate = new Map();
  for (const it of list.entries) { if (!byDate.has(it.date)) byDate.set(it.date, []); byDate.get(it.date).push(it); }
  const dates = [...byDate.keys()].sort();
  const n = dates.length;
  // the last gap is a two-32nd stutter, so the last reset (the newest entry) gets its own flash (with the default run it lands on "higher")
  const run = [8, 8, 4, 3, 3, ...Array(13).fill(2), ...Array(Math.max(0, n - 19)).fill(1)];
  const gaps = p.gaps || [...run.slice(0, n - 1), 2];
  const k0 = p.b0 != null ? beatK(audio, p.b0) : Math.round(beatK(audio, shotT0));
  let u = 0;
  const resets = dates.map((d, i) => { u += gaps[i] ?? 1; return { date: d, day: dayOf(d), year: Number(d.slice(0, 4)), t: gridT(audio, k0 + u / 8), items: byDate.get(d) }; });
  const L = lineByText(audio, 'count goes higher');
  const higher = p.higher ?? wordT(L, 'higher', resets[n - 1].t + 0.3);
  const climbEnd = p.climbEnd ?? (L && L.words.length ? (L.words[L.words.length - 1].end ?? higher + 0.58) : higher + 0.58);
  const release = dayOf(p.release || list.release_default || '2026-10-27');
  const target = release - resets[n - 1].day;
  SCHED = { key, epoch, t0: gridT(audio, k0), resets, higher, climbEnd, target, release };
  return SCHED;
}

// red-flash start frames: the first film frame at or after each reset, skipping a reset whose flash would start less than two
// clean frames after the previous flash ended (so: <= 2 red frames each, >= 2 clean frames between)
function flashFrames(S) {
  if (S.flash) return S.flash;
  const F = []; let next = -1e9;
  for (const r of S.resets) { const f = Math.ceil(r.t / FRAME - 1e-3); if (f >= next) { F.push(f); next = f + 4; } }
  S.flash = F;
  return F;
}

// counter value (continuous, days) and the index of the last reset at time t
function valueAt(S, audio, t, p) {
  const R = S.resets; const n = R.length;
  if (t < S.t0) return { v: 0, last: -1, rate: 0 };
  let i = -1; for (let k = 0; k < n; k++) if (t >= R[k].t) i = k;
  if (i < n - 1) {
    const ta = i < 0 ? S.t0 : R[i].t, tb = R[i + 1].t;
    const da = i < 0 ? S.epoch : R[i].day, db = R[i + 1].day;
    // Jade's note (3:45): after each snap to zero the board counts up like a real roller counter, the small numbers in the ones
    // place (1, 2, 3 ...), low wheels rolling and the high ones at 0: a readable count (p.countRate, 24 a second = one a frame),
    // capped at the real number of days to the next entry
    // whole counts held for two frames each (on twos), so every number reads crisp
    const f = clamp((t - ta) / (tb - ta)), cr = p.countRate ?? 12;
    const vt = (db - da) * f, vc = Math.floor(cr * (t - ta) + 1e-3);
    return vc < vt ? { v: vc, last: i, rate: 0 } : { v: vt, last: i, rate: (db - da) / (tb - ta) };
  }
  // past the last reset: climb to the release-date value, accelerating into "higher", then a day per beat
  const ta = R[n - 1].t + 0.06, tb = S.climbEnd;
  if (t < tb) {
    const f = clamp((t - ta) / (tb - ta));
    const g = Math.pow(f, 2.6);
    const df = 2.6 * Math.pow(Math.max(f, 1e-3), 1.6) / (tb - ta);
    return { v: S.target * g, last: n - 1, rate: S.target * df };
  }
  // hold the release-date value for a moment (it is the number to read), then a day per beat
  const kb = beatK(audio, tb + (p.hold ?? 1.0));
  if (beatK(audio, t) < kb) return { v: S.target, last: n - 1, rate: 0 };
  const kk = beatK(audio, t) - kb;
  const steps = Math.floor(kk), fr = kk - steps;
  const per = p.perBeat ?? 1;
  return { v: S.target + per * (steps + smoother(range(fr, 0, 0.25))), last: n - 1, rate: 0 };
}

// ---------------------------------------------------------------- baked art: the wall and the enamel sign
let ART = null;
function art() {
  if (ART) return ART;
  // wall: painted cinder block in the dark
  const wall = document.createElement('canvas'); wall.width = 960; wall.height = 540;
  {
    const c = wall.getContext('2d', { willReadFrequently: true });
    c.fillStyle = 'rgb(30,33,38)'; c.fillRect(0, 0, 960, 540);
    const R = rng(5);
    for (let row = 0; row < 14; row++) for (let col = -1; col < 11; col++) {
      const bx = col * 100 + (row % 2 ? 50 : 0), by = row * 40;
      const v = 28 + R() * 9;
      c.fillStyle = `rgb(${v},${v + 3},${v + 8})`; c.fillRect(bx + 2, by + 2, 96, 36);
    }
    const id = c.getImageData(0, 0, 960, 540); const d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(id, 0, 0);
  }
  // the sign: enamel field, green border band, chips, grime; type and bolts
  const W = SIGN.w, H = SIGN.h;
  const sign = document.createElement('canvas'); sign.width = W; sign.height = H;
  {
    const c = sign.getContext('2d', { willReadFrequently: true });
    const R = rng(11);
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    // steel backing edge
    c.fillStyle = '#3a3d40'; rr(0, 0, W, H, 26); c.fill();
    // green enamel band
    c.fillStyle = '#1d5a3c'; rr(6, 6, W - 12, H - 12, 22); c.fill();
    // cream field
    c.fillStyle = '#e9e2cf'; rr(30, 30, W - 60, H - 60, 12); c.fill();
    // enamel sheen and grime
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,45,20,0.18)');
    c.fillStyle = g; rr(6, 6, W - 12, H - 12, 22); c.fill();
    for (let i = 0; i < 70; i++) {          // grime blotches
      const x = R() * W, y = R() * H, r = 10 + R() * 60;
      const gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, `rgba(70,55,30,${0.03 + R() * 0.05})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // type: DAYS SINCE / LAST RESET (heavy condensed, enamel green-black)
    c.fillStyle = '#16231b'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = '800 112px Archivo'; try { c.fontStretch = 'condensed'; } catch (er) { /* */ }
    c.fillText('DAYS SINCE', W / 2, 470);
    c.fillText('LAST RESET', W / 2, 586);
    // hairline rule under the drums
    c.fillStyle = '#1d5a3c'; c.fillRect(90, 362, W - 180, 6);
    // chips: dark iron showing through, rust halos (mostly near the edges and bolts)
    for (let i = 0; i < 26; i++) {
      const edge = R() < 0.7;
      let x = R() * W, y = R() * H;
      if (edge) { const s = Math.floor(R() * 4); if (s === 0) y = 10 + R() * 30; else if (s === 1) y = H - 10 - R() * 30; else if (s === 2) x = 10 + R() * 30; else x = W - 10 - R() * 30; }
      const r = 2 + R() * (edge ? 9 : 4);
      const gg = c.createRadialGradient(x, y, 0, x, y, r * 2.4); gg.addColorStop(0, 'rgba(110,60,25,0.5)'); gg.addColorStop(1, 'rgba(110,60,25,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(x, y, r * 2.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1c1b1a'; c.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rk = r * (0.6 + 0.6 * R()); if (k) c.lineTo(x + Math.cos(a) * rk, y + Math.sin(a) * rk); else c.moveTo(x + Math.cos(a) * rk, y + Math.sin(a) * rk); }
      c.closePath(); c.fill();
    }
    // scratches
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const x = R() * W, y = R() * H, a = R() * Math.PI, l = 10 + R() * 50; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    // corner bolts
    for (const [x, y] of [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]]) bolt(c, x, y, 10);
    // enamel tooth
    const id = c.getImageData(0, 0, W, H); const d = id.data;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 0) continue; const n = (R() - 0.5) * 8; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(id, 0, 0);
  }
  ART = { wall, sign };
  return ART;
}
function bolt(c, x, y, r) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#b9b6ae'); g.addColorStop(0.6, '#6c6a65'); g.addColorStop(1, '#2a2927');
  c.fillStyle = g; c.beginPath();
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k) c.lineTo(px, py); else c.moveTo(px, py); }
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1; c.stroke();
}

export const look = { tonemap: 0, bloom: 0.3, bloomThreshold: 0.92, halation: 0.25, halCol: [1.0, 0.3, 0.15], vignette: 0.45, grain: 0.035, typeGlow: 0.25 };

export default {
  async init() { await ensureList(); art(); },
  async prepare() { await ensureList(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const A = ctx.audio;
    const S = schedule(A, p, shot.t0); const R = S.resets; const n = R.length;
    const V = valueAt(S, A, t, p);
    // the newest reset; the red flash and the tear are frame-indexed (polish 4): each flash is at most two frames, with at least
    // two clean frames before the next; a reset that lands sooner still snaps the board and its year card, without a flash (the
    // fast run used to merge into 29 straight red frames and the count vanished where it peaks)
    let ri = -1; for (let k = 0; k < n; k++) if (t >= R[k].t - 1e-4) ri = k;
    const fi = Math.round(t / FRAME);
    const FL = flashFrames(S);
    let f0 = -1e9; for (const f of FL) if (f <= fi) f0 = f;
    const df = fi - f0;
    const red = df >= 0 && df < 2 ? 1 : 0;                                  // two frames of red
    const vhs = red ? 1 : df === 2 ? 0.18 : 0;                              // a faint tail on the first clean frame only
    const AR = art();
    const c = e.c2dBegin();
    const push = 1 + (p.push ?? 0.06) * smooth(range(t, shot.t0, shot.t0 + 12));
    const pz = ([x, y]) => [960 + (x - 960) * push, 540 + (y - 540) * push];
    c.save(); c.translate(960, 540); c.scale(push, push); c.translate(-960, -540);
    // wall and lamp
    c.drawImage(AR.wall, -60, -40, 2040, 1160);
    { const g = c.createRadialGradient(960, 120, 40, 960, 420, 980);
      g.addColorStop(0, 'rgba(255,214,160,0.34)'); g.addColorStop(0.45, 'rgba(160,120,80,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(-60, -40, 2040, 1160); c.globalCompositeOperation = 'source-over'; }
    { const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = g; c.fillRect(-60, -40, 2040, 1160); }
    // the sign's shadow on the wall, then the sign
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(SIGN.x + 14, SIGN.y + 22, SIGN.w, SIGN.h);
    c.drawImage(AR.sign, SIGN.x, SIGN.y);
    // ---- the drum panel (steel, bolted on), four roller digits
    const pw = DR.n * DR.w + (DR.n - 1) * DR.gap + 44, ph = DR.h + 40;
    const px = 960 - pw / 2 - 52, py = SIGN.y + 52;
    { const g = c.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, '#5d5f60'); g.addColorStop(0.08, '#38393a'); g.addColorStop(0.9, '#262728'); g.addColorStop(1, '#151616');
      c.fillStyle = g; c.fillRect(px, py, pw, ph);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(px, py, pw, 2);
      for (const [x, y] of [[px + 12, py + 12], [px + pw - 12, py + 12], [px + 12, py + ph - 12], [px + pw - 12, py + ph - 12]]) bolt(c, x, y, 6); }
    const v = Math.max(0, V.v);
    for (let k = 0; k < DR.n; k++) {
      const wx = px + 22 + (DR.n - 1 - k) * (DR.w + DR.gap), wy = py + 20;
      const pos = odoPos(v, k);
      const blur = clamp(V.rate / Math.pow(10, k) / 24 * 0.9, 0, 1.3);
      drawWheel(c, wx, wy, DR.w, DR.h, pos, { size: 168, font: '700 168px Archivo', drum: '#121314', ink: '#efe9da', blur, shade: 0.9, pitch: 0.95, dy: 6 });
      c.strokeStyle = '#050505'; c.lineWidth = 3; c.strokeRect(wx, wy, DR.w, DR.h);
    }
    // glass glint across the drums
    { const g = c.createLinearGradient(px, py, px + pw, py + ph); g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.48, 'rgba(255,255,255,0.06)'); g.addColorStop(0.52, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(px + 20, py + 20, pw - 40, ph - 40); }
    // ---- the year card beside the number (the last reset's year; 1945 before the first)
    const yr = V.last >= 0 ? R[V.last].year : 1945;
    const cx = px + pw + 22, cy = py + 64, cw = 112, ch = 86;
    c.fillStyle = '#1b1c1d'; c.fillRect(cx, cy, cw, ch);
    c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(cx, cy, cw, 1.5);
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(cx, cy + ch / 2 - 1, cw, 2);      // the flip card's split
    c.font = '600 46px PlexM'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#efe9da';
    c.fillText(String(yr), cx + cw / 2, cy + ch / 2 + 2);
    bolt(c, cx + cw / 2, cy - 12, 5);
    // ---- the lamp's light across the sign (warm top, falling off), and the red spill of a reset
    { const g = c.createRadialGradient(960, SIGN.y - 60, 60, 960, SIGN.y + 200, 900);
      g.addColorStop(0, 'rgba(40,30,20,0.12)'); g.addColorStop(0.5, 'rgba(10,8,6,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.62)');
      c.fillStyle = g; c.fillRect(SIGN.x - 40, SIGN.y - 40, SIGN.w + 80, SIGN.h + 80); }
    c.restore();
    if (red > 0) {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 0, 1920, 1080);
      // SIGNAL LOST above the sign (it used to sit across the board, under the digits)
      c.font = '600 112px PlexM'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const jx = (hash1(ri * 3.3) - 0.5) * 16, jy = (hash1(ri * 5.1) - 0.5) * 8;
      c.fillStyle = 'rgba(255,240,235,1)'; c.fillText('SIGNAL LOST', 960 + jx, 112 + jy);
    }
    // the digits and the year card stay untorn through every flash (only the frame around them tears)
    const k0 = pz([px - 8, py - 8]), k1 = pz([cx + cw + 8, py + ph + 8]);
    vhsPass(e, t, { vhs: Math.max(vhs, red), red: red, seed: (ri + 1) * 1.37 + Math.floor(t * 24) * 0.11, gain: red ? 1.6 : 1.05, keep: [k0[0], k0[1], k1[0], k1[1]] });
    ctx.state.t2counter = { S, V, ri };
  },
};
