// OKO: the Soviet early-warning command post, Serpukhov-15, just after midnight on 26 September 1983 (docs/research/facts.md §1).
// A wall of back-lit glass tiles carries a north-polar map (the threat comes over the pole); above it hangs the long light box.
// The satellite system reports one Minuteman launch from the USA, then four more (1 + 4 = 5). With the first, the box burns
// «СТАРТ» in big red letters (Petrov's own account); as further launches appear the label changes to «РАКЕТНОЕ НАПАДЕНИЕ»
// ("missile attack"; Rodina / Rossiyskaya Gazeta). A smaller box, «ДОСТОВЕРНОСТЬ ВЫСШАЯ», stands for "the machine shows that the
// reliability is highest": the meaning is Petrov's, the panel's wording is a reconstruction (p.reliability: false drops it).
// Launches are drawn as what the satellite saw: the boost, a short red rise out of the missile fields, not a flight path.
// The map is the film's diagram of the geography (Natural Earth), not a copy of the real display, whose layout is undocumented.
// p: {tLaunch:[5 song times], tAttack (banner changes), tRel (reliability box lights), tPush:[t0,t1] (camera rises to the board),
//     lon0 (80: meridian at the top; puts the USA below the pole, the USSR above), reliability (true), gloss (true), caption (true)}
import land from './data/land_north.js';
import { P, css } from '../../palette.js';
import { clamp, lerp, smooth, range, easeOutCubic, easeInOutCubic, easeOutExpo, hash1, hash2 } from '../../util.js';

const D2R = Math.PI / 180;
const POLE = [960, 636], SCALE = 8.0;
const LATMIN = 24;                                  // the polar disc is cut at 24N (Florida's tip stays on)               // design px per degree of colatitude
// launch points spread over the northern Great Plains missile fields (no base is named: the reports' exact origin isn't in facts.md)
const FIELDS = [[47.4, -109.4], [48.4, -101.6], [47.7, -97.9], [46.4, -104.6], [49.2, -105.8]];
const BOX = { x: 300, y: 50, w: 1320, h: 190 };     // the long light box
const REL = { x: 1150, y: 260, w: 470, h: 50 };     // the small reliability box
const MAP = { x: 170, y: 340, w: 1580, h: 650 };    // the glass map wall (6 x 3 tiles)

function proj(lat, lon, lon0) {
  const r = (90 - lat) * SCALE, th = (lon - lon0) * D2R;
  return [POLE[0] - r * Math.sin(th), POLE[1] - r * Math.cos(th)];
}

let paths = null, pathsLon0 = null, dotPat = null;
function buildPaths(lon0) {
  if (paths && pathsLon0 === lon0) return paths;
  const landP = new Path2D();
  for (const ring of land) {
    for (let i = 0; i < ring.length; i += 2) {
      const [x, y] = proj(Math.max(ring[i + 1], -10), ring[i], lon0);
      if (i === 0) landP.moveTo(x, y); else landP.lineTo(x, y);
    }
    landP.closePath();
  }
  const grat = new Path2D();
  for (let lat = 30; lat <= 80; lat += 10) { const r = (90 - lat) * SCALE; grat.moveTo(POLE[0] + r, POLE[1]); grat.arc(POLE[0], POLE[1], r, 0, Math.PI * 2); }
  for (let lon = 0; lon < 360; lon += 30) { const [x0, y0] = proj(80, lon, lon0), [x1, y1] = proj(LATMIN, lon, lon0); grat.moveTo(x0, y0); grat.lineTo(x1, y1); }
  const disc = new Path2D(); disc.arc(POLE[0], POLE[1], (90 - LATMIN) * SCALE, 0, Math.PI * 2);
  paths = { land: landP, grat, disc }; pathsLon0 = lon0;
  return paths;
}

function dotPattern(c) {
  if (dotPat) return dotPat;
  const cv = document.createElement('canvas'); cv.width = 9; cv.height = 9;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(150,160,150,1)'; g.beginPath(); g.arc(4.5, 4.5, 1.3, 0, Math.PI * 2); g.fill();
  dotPat = c.createPattern(cv, 'repeat');
  return dotPat;
}

// the launch as the satellite saw it: a short boost trail rising out of the field, leaning north (toward the pole)
function launchTrail(lat, lon, lon0, age, k) {
  const L = 34 + 80 * easeOutCubic(clamp(age / 2.2));
  const p0 = proj(lat, lon, lon0);
  const az = Math.atan2(POLE[1] - p0[1], POLE[0] - p0[0]) + (hash1(k * 3.7 + 1) - 0.5) * 0.7;
  const dir = [Math.cos(az), Math.sin(az)];
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const s = i / 20, d = L * s;
    // steep off the pad, then leaning over: a curve that bends toward its heading
    const lean = Math.pow(s, 1.6);
    pts.push([p0[0] + dir[0] * d * lean + 0, p0[1] + dir[1] * d * lean - d * (1 - lean) * 0.9]);
  }
  return { p0, pts };
}

const FONT_STRETCH = { 75: 'condensed', 87: 'semi-condensed', 100: 'normal' };
function setFont(c, weight, size, stretch = 100) { c.font = `${weight} ${size}px OpenSans`; try { c.fontStretch = FONT_STRETCH[stretch] || 'normal'; } catch (er) { /* */ } }

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const lon0 = p.lon0 ?? 80;
    const tl = p.tLaunch || [shot.t0 + 1.0, shot.t0 + 2.0, shot.t0 + 2.16, shot.t0 + 2.3, shot.t0 + 2.46];
    const tAttack = p.tAttack ?? tl[4] + 1.5;
    const nL = tl.filter((x) => t >= x).length;
    const startOn = t >= tl[0], attackOn = t >= tAttack;
    // the light boxes strike like fluorescent tubes: a few flickers, then steady, breathing with the siren
    const strike = (t0) => { if (t < t0) return 0; const a = t - t0; if (a > 0.2) return 1; return [1, 0.1, 0.85, 0.25, 1, 0.6, 1][Math.floor(a / 0.03) % 7]; };
    const siren = 0.86 + 0.14 * Math.cos((t - tl[0]) * Math.PI * 2 * 1.3);
    const bStart = startOn ? strike(tl[0]) * (attackOn ? 1 - smooth(range(t, tAttack - 0.05, tAttack + 0.01)) : 1) : 0;
    const bAttack = attackOn ? strike(tAttack) : 0;
    const boxLit = Math.max(bStart, bAttack) * siren;
    const relOn = (p.reliability ?? true);
    const tRel = p.tRel ?? tl[0] + 0.45;
    const relLit = relOn ? strike(tRel) : 0;

    // camera: a slow drift in on the wall, then the rise to the board for the protocol
    const tp = p.tPush || [tAttack - 1.2, tAttack + 0.2];
    const push = easeInOutCubic(range(t, tp[0], tp[1]));
    const s = lerp(1.0 + 0.03 * smooth(range(t, shot.t0, tp[0])), 1.3, push);
    const fx = 960, fy = lerp(540, 200, push), cy = lerp(540, 300, push);
    const toScreenY = (y) => (y - fy) * s + cy;
    const c = e.c2dBegin();
    c.save();
    c.translate(960, cy); c.scale(s, s); c.translate(-fx, -fy);
    const red = P.red;
    // ---------------------------------------------------------------- the room
    c.fillStyle = 'rgb(6,7,10)'; c.fillRect(-300, -300, 2520, 1680);
    if (boxLit > 0) {     // red light from the board spills down the wall
      const g = c.createRadialGradient(960, 150, 60, 960, 260, 1150);
      g.addColorStop(0, css(red, 0.2 * boxLit)); g.addColorStop(0.45, css(P.redDeep, 0.13 * boxLit)); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(-300, -300, 2520, 1680);
    }

    // ---------------------------------------------------------------- the glass map wall
    const pa = buildPaths(lon0);
    c.save();
    c.beginPath(); c.rect(MAP.x, MAP.y, MAP.w, MAP.h); c.clip();
    // each tile has its own lamp behind it: slightly uneven
    const cols = 6, rows = 3, tw = MAP.w / cols, th = MAP.h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = MAP.x + tw * i, y = MAP.y + th * j, v = 0.85 + 0.3 * hash2(i + 1, j + 7);
      const g = c.createRadialGradient(x + tw * 0.5, y + th * 0.45, 10, x + tw * 0.5, y + th * 0.5, tw * 0.75);
      g.addColorStop(0, `rgb(${Math.round(24 * v)},${Math.round(30 * v)},${Math.round(30 * v)})`); g.addColorStop(1, `rgb(${Math.round(12 * v)},${Math.round(15 * v)},${Math.round(16 * v)})`);
      c.fillStyle = g; c.fillRect(x, y, tw, th);
    }
    // the polar disc: land as a flat screen-printed tint with a coarse dot, plotted coasts, the graticule
    c.save(); c.clip(pa.disc);
    c.fillStyle = 'rgba(30,36,36,0.55)'; c.fill(pa.disc);
    c.fillStyle = 'rgba(70,78,74,0.34)'; c.fill(pa.land);
    c.globalAlpha = 0.3; c.fillStyle = dotPattern(c); c.fill(pa.land); c.globalAlpha = 1;
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(120,130,124,0.3)'; c.stroke(pa.grat);
    c.lineJoin = 'round'; c.lineWidth = 2.1; c.strokeStyle = 'rgba(200,202,186,0.62)'; c.stroke(pa.land);
    c.restore();
    c.lineWidth = 2.4; c.strokeStyle = 'rgba(160,166,154,0.55)'; c.stroke(pa.disc);
    // the rim: a degree scale of longitude every 10, longer every 30
    c.beginPath();
    for (let lon = 0; lon < 360; lon += 10) {
      const r0 = (90 - LATMIN) * SCALE, r1 = r0 + (lon % 30 === 0 ? 16 : 8), th = (lon - lon0) * D2R;
      c.moveTo(POLE[0] - r0 * Math.sin(th), POLE[1] - r0 * Math.cos(th)); c.lineTo(POLE[0] - r1 * Math.sin(th), POLE[1] - r1 * Math.cos(th));
    }
    c.lineWidth = 2; c.strokeStyle = 'rgba(160,166,154,0.5)'; c.stroke();
    c.strokeStyle = 'rgba(200,202,186,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(POLE[0] - 9, POLE[1]); c.lineTo(POLE[0] + 9, POLE[1]); c.moveTo(POLE[0], POLE[1] - 9); c.lineTo(POLE[0], POLE[1] + 9); c.stroke();
    setFont(c, 600, 24, 87); c.letterSpacing = '7px';
    c.fillStyle = 'rgba(200,202,186,0.5)'; c.textAlign = 'center';
    const us = proj(37.5, -97, lon0), su = proj(63, 62, lon0);
    c.fillText('США', us[0], us[1]); c.fillText('СССР', su[0], su[1]);
    c.letterSpacing = '0px';
    // ---------------------------------------------------------------- the launch reports (red: fire)
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let k = 0; k < 5; k++) {
      if (t < tl[k]) continue;
      const age = t - tl[k];
      const [la, lo] = FIELDS[k];
      const tr = launchTrail(la, lo, lon0, age, k);
      const ring = easeOutExpo(clamp(age / 0.7));
      c.strokeStyle = css(red, 0.85 * (1 - ring)); c.lineWidth = 3;
      c.beginPath(); c.arc(tr.p0[0], tr.p0[1], 12 + (k === 0 ? 120 : 64) * ring, 0, Math.PI * 2); c.stroke();
      const ph = ((age * 1.3) % 1);                       // and a ring that keeps calling, like the siren
      c.strokeStyle = css(red, 0.5 * (1 - ph)); c.lineWidth = 2.2;
      c.beginPath(); c.arc(tr.p0[0], tr.p0[1], 16 + 34 * ph, 0, Math.PI * 2); c.stroke();
      for (const [w, a, col] of [[10, 0.16, red], [4.5, 0.55, red], [2.2, 1, [1, 0.42, 0.34]]]) {
        c.strokeStyle = css(col, a); c.lineWidth = w; c.beginPath();
        tr.pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke();
      }
      const hd = tr.pts[tr.pts.length - 1];
      c.fillStyle = 'rgba(255,214,200,1)'; c.beginPath(); c.arc(hd[0], hd[1], 3.6, 0, Math.PI * 2); c.fill();
      const blink = 0.6 + 0.4 * (Math.floor(age * 4) % 2 === 0 ? 1 : 0);
      c.fillStyle = css(red, blink); c.beginPath(); c.arc(tr.p0[0], tr.p0[1], 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = css(red, 0.9); c.lineWidth = 2; c.beginPath(); c.arc(tr.p0[0], tr.p0[1], 13, 0, Math.PI * 2); c.stroke();
    }
    // tile seams, then the glass sheen
    c.strokeStyle = 'rgba(2,3,5,0.85)'; c.lineWidth = 3;
    c.beginPath();
    for (let i = 1; i < cols; i++) { const x = MAP.x + tw * i; c.moveTo(x, MAP.y); c.lineTo(x, MAP.y + MAP.h); }
    for (let j = 1; j < rows; j++) { const y = MAP.y + th * j; c.moveTo(MAP.x, y); c.lineTo(MAP.x + MAP.w, y); }
    c.stroke();
    const sh = c.createLinearGradient(0, MAP.y, 0, MAP.y + MAP.h);
    sh.addColorStop(0, 'rgba(255,255,255,0.03)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.2)');
    c.fillStyle = sh; c.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    c.restore();
    c.strokeStyle = 'rgba(52,56,62,0.9)'; c.lineWidth = 4; c.strokeRect(MAP.x - 3, MAP.y - 3, MAP.w + 6, MAP.h + 6);

    // ---------------------------------------------------------------- the light boxes
    const boxFace = (b, lit) => {
      c.fillStyle = 'rgb(9,6,6)'; c.fillRect(b.x, b.y, b.w, b.h);
      if (lit > 0) { c.fillStyle = css(P.redDeep, 0.38 * lit); c.fillRect(b.x, b.y, b.w, b.h); }
      c.strokeStyle = 'rgba(56,58,64,0.95)'; c.lineWidth = 5; c.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
      c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 2; c.strokeRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    };
    const stencil = (str, b, size, lit, unlitA, stretch = 100, pad = 70) => {
      c.save();
      setFont(c, 800, size, stretch); c.letterSpacing = `${size * 0.06}px`;
      const w = c.measureText(str).width;
      const k = Math.min(1, (b.w - pad) / w);          // fit the stencil to its box
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.translate(b.x + b.w / 2, b.y + b.h / 2 + size * 0.05); c.scale(k, k);
      c.fillStyle = `rgba(52,12,10,${unlitA})`; c.fillText(str, 0, 0);      // unlit: dark red glass
      if (lit > 0) {
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = css(red, 0.14 * lit); for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) c.fillText(str, dx, dy);
        c.fillStyle = css(red, lit); c.fillText(str, 0, 0);
        c.globalCompositeOperation = 'source-over';
      }
      c.restore();
    };
    boxFace(BOX, boxLit);
    if (!attackOn) stencil('СТАРТ', BOX, 150, bStart * siren, 0.9, 100, 200);
    else {
      stencil('СТАРТ', BOX, 150, 0, 0.1 * (1 - bAttack), 100, 200);
      stencil('РАКЕТНОЕ НАПАДЕНИЕ', BOX, 132, bAttack * siren, 0.9, 75, 80);
    }
    if (relOn) { boxFace(REL, relLit * 0.7); stencil('ДОСТОВЕРНОСТЬ  ВЫСШАЯ', REL, 30, relLit * 0.9, 0.7, 75, 40); }
    // a column of report lamps beside the board: one comes on per report
    for (let i = 0; i < 5; i++) {
      const x = BOX.x - 64, y = BOX.y + 22 + i * 38;
      const on = i < nL ? 0.8 + 0.2 * Math.sin(t * 9 + i) : 0;
      c.fillStyle = 'rgb(18,10,10)'; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
      if (on > 0) { c.fillStyle = css(red, on); c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(66,70,78,0.95)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    // a dark sill under the wall seats the captions (screen space)
    const sill = c.createLinearGradient(0, 1000, 0, 1080);
    sill.addColorStop(0, 'rgba(4,5,8,0)'); sill.addColorStop(0.35, 'rgba(4,5,8,0.92)'); sill.addColorStop(1, 'rgba(4,5,8,1)');
    c.fillStyle = sill; c.fillRect(0, 1000, 1920, 80);
    e.blit2d('replace', p.gain ?? 1.5);
    ctx.state.oko = { nL, startOn, attackOn, boxLit, push, glossY: toScreenY(BOX.y + BOX.h + 46), relY: toScreenY(REL.y + REL.h / 2) + 5, relX: (REL.x - 24 - fx) * s + 960, glossX: (760 - fx) * s + 960, relLit };
  },

  type(ty, t, lt, shot, ctx) {
    const p = ctx.p, st = ctx.state.oko || {};
    const capA = (p.caption ?? true) ? smooth(range(lt, 0.05, 0.5)) : 0;
    const y = 1052;
    ty.mono('26 SEP 1983  ·  00:15 MSK (APPROX.)  ·  SERPUKHOV-15  ·  OKO', 170, y, t, { size: 21, color: P.cream, alpha: 0.88 * capA, t0: shot.t0 + 0.05, cps: 70, cursor: false });
    if (st.nL > 0) {
      const w = ty.measure('LAUNCH REPORTS  ', { font: 'Plex', size: 21, track: 0.04 });
      ty.text('LAUNCH REPORTS', 1750 - 160, y, { font: 'Plex', size: 21, track: 0.04, color: P.bookGold, alpha: capA, align: 'right' });
      ty.text(String(st.nL), 1750 - 110, y + 4, { font: 'Plex', size: 40, color: P.red, alpha: capA, glow: 12, align: 'center' });
      if (st.nL === 5) ty.text('1 + 4', 1750, y, { font: 'Plex', size: 21, color: P.bookGold, alpha: capA * 0.8, align: 'right' });
    }
    if ((p.gloss ?? true) && st.startOn) {
      // English glosses of the board, small, under it (they ride the camera)
      ty.label(st.attackOn ? 'MISSILE ATTACK' : 'LAUNCH', st.glossX, Math.min(1000, st.glossY), { align: 'center', color: P.bookGold, alpha: 0.85 * capA, size: 15 });
      if (st.relLit > 0.5) ty.label('RELIABILITY: HIGHEST', st.relX, Math.min(1000, st.relY), { align: 'right', color: P.bookGold, alpha: 0.75 * capA, size: 13 });
    }
  },
};
