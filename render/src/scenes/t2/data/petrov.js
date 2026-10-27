// t2_petrov_screen — overlays for verse 2's Petrov oil painting (Serpukhov-15, just after midnight, 26 September 1983).
// The painting is a generated plate underneath (layered with the multi scene, so this layer gets p.over = true); each p.mode
// draws one of its screens into a content canvas, maps it onto p.rect ([x, y, w, h], design px) or p.quad ([[x,y] x4], top-left,
// top-right, bottom-right, bottom-left; a true perspective mapping), and paints it in: soft mip glow and a spill of light past
// the glass, brush-stroke modulation and edge wobble, graded toward umber and CRT red, feathered edges.
//   'map'      (1:32.60) the big wall map: a polar map of the northern hemisphere (Natural Earth outlines, take one's
//              history/data/land_north.js); one missile track rises from the United States, then four more (on "saw" / "five").
//   'start'    (1:35.36) the light box burns СТАРТ in big red letters (Petrov's own account, KP.ru: «большие красные буквы:
//              «СТАРТ»»; docs/research/facts.md §1, grade A). Beneath it a smaller box reads ДОСТОВЕРНОСТЬ ВЫСШАЯ. That panel is a
//              RECONSTRUCTION: Petrov's words were "the machine shows that the reliability is highest" (facts.md §1, grade B); the
//              real display's layout and field label are undocumented. p.reliability: false drops it.
//   'ghost'    (1:37.88) the map with its five tracks, and over them a ghost of what a real first strike would look like (hundreds
//              of tracks from the missile fields and the oceans), which fades and leaves five.
//   'protocol' (1:40.31) a typed protocol sheet beside him, struck through line by line with a pen on "ignored all previous
//              instructions". The sheet's wording is INVENTED for the picture (a generic duty-officer procedure); it is not a
//              transcription of any real document.
//   'backdrop' a stand-in umber "painting" for the test timeline (a dark room, a dark wall screen, a lit desk).
// p: {mode, rect, quad, over, t0 (mode's start; default the lyric line), tracks:[5 times] (map), strike:[times] (protocol),
//     reliability (true), relX ([0.08, 0.92]: the reliability panel's extent across the screen), glow (1), grade (1), seed, light ([r, g, b]: the light on the protocol sheet; default lamp + screen red),
//     occ ([x0, y0, x1, y1] design px: a box round whatever stands in front of the screen, e.g. his head; inside it the overlay is
//          held back wherever the painting under it is not screen red (a chroma matte of the plate, per frame), so the screen
//          lights up BEHIND him; needs p.over)}
import * as THREE from 'three';
import land from '../../history/data/land_north.js';
import { P, css, mix } from '../../../palette.js';
import { clamp, lerp, smooth, smoother, easeOutCubic, easeInOutCubic, easeOutExpo, range, hash1, hash2, rng } from '../../../util.js';
import { lineByText, wordT } from './lib.js';
import { rt, copy } from '../plate/lib.js';

const D2R = Math.PI / 180;
const LATMIN = 20;                                  // the polar disc is cut here (Florida and the Sahara's edge stay on)
// launch areas: the northern Great Plains missile fields (as in take one's oko.js; no base is named on screen)
const FIELDS = [[47.4, -109.4], [48.4, -101.6], [41.2, -104.8], [44.5, -97.5], [38.8, -94.5]];

// ---------------------------------------------------------------- content canvases
const CV = new Map();
function canvasFor(key, w, h) {
  let o = CV.get(key);
  if (!o || o.cv.width !== w || o.cv.height !== h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    o = { cv, c: cv.getContext('2d', { willReadFrequently: true }), tex };
    CV.set(key, o);
  }
  return o;
}

// polar projection into a content box of size (w, h): pole at (w/2, h*0.42), USA below the pole, the USSR above
function projector(w, h) {
  const lon0 = 80, R = Math.min(w * 0.47, h * 0.47) / (90 - LATMIN);
  const pole = [w / 2, h * 0.5];
  return (lat, lon) => { const r = (90 - lat) * R, th = (lon - lon0) * D2R; return [pole[0] - r * Math.sin(th), pole[1] - r * Math.cos(th)]; };
}
let landCache = null;
function landPath(w, h) {
  if (landCache && landCache.w === w && landCache.h === h) return landCache.p;
  const pr = projector(w, h); const p = new Path2D();
  for (const ring of land) {
    for (let i = 0; i < ring.length; i += 2) { const [x, y] = pr(Math.max(ring[i + 1], -5), ring[i]); if (i === 0) p.moveTo(x, y); else p.lineTo(x, y); }
    p.closePath();
  }
  landCache = { w, h, p };
  return p;
}
// a launch track: a boost arc from (lat, lon) bending toward the pole; u 0..1 grown
function trackPts(pr, lat, lon, k, u, len = 1) {
  const p0 = pr(lat, lon), pole = pr(90, 0);
  const pts = [];
  const n = 24;
  const dx = pole[0] - p0[0], dy = pole[1] - p0[1], L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const bend = (hash1(k * 3.7 + 1) - 0.5) * 1.1;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * u;
    const d = L * 0.55 * len * s;
    const side = Math.sin(s * Math.PI) * L * 0.09 * (bend + 0.25 * Math.sign(bend || 1));
    pts.push([p0[0] + ux * d + nx * side, p0[1] + uy * d + ny * side]);
  }
  return pts;
}
function strokePts(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }

function drawMap(c, w, h, t, T, ghostK) {
  c.fillStyle = 'rgb(10,4,3)'; c.fillRect(0, 0, w, h);
  const pr = projector(w, h);
  // graticule
  c.strokeStyle = 'rgba(150,40,25,0.35)'; c.lineWidth = 1.6;
  const pole = pr(90, 0);
  for (let lat = 30; lat <= 80; lat += 10) { const r = Math.hypot(...[pr(lat, 0)[0] - pole[0], pr(lat, 0)[1] - pole[1]]); c.beginPath(); c.arc(pole[0], pole[1], r, 0, Math.PI * 2); c.stroke(); }
  for (let lon = 0; lon < 360; lon += 30) { const a = pr(80, lon), b = pr(18, lon); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
  // land, inside the disc
  const lp = landPath(w, h);
  const rD = (90 - LATMIN) * Math.min(w * 0.47, h * 0.47) / (90 - LATMIN);
  c.save(); c.beginPath(); c.arc(pole[0], pole[1], rD, 0, Math.PI * 2); c.clip();
  c.fillStyle = 'rgba(110,26,16,0.4)'; c.fill(lp);
  c.strokeStyle = 'rgba(255,105,65,0.7)'; c.lineWidth = 2.2; c.stroke(lp);
  c.restore();
  c.strokeStyle = 'rgba(200,60,35,0.6)'; c.lineWidth = 3; c.beginPath(); c.arc(pole[0], pole[1], rD, 0, Math.PI * 2); c.stroke();
  // the five tracks (one, then four)
  const tr = T.tracks;
  for (let k = 0; k < 5; k++) {
    if (t < tr[k]) continue;
    const u = easeOutCubic(clamp((t - tr[k]) / 1.6));
    const [la, lo] = FIELDS[k];
    const pts = trackPts(pr, la, lo, k, u, 1.0);
    const flash = Math.exp(-(t - tr[k]) / 0.25);
    c.strokeStyle = `rgba(255,${Math.round(60 + 140 * flash)},${Math.round(40 + 120 * flash)},1)`; c.lineWidth = 5;
    strokePts(c, pts);
    const [hx, hy] = pts[pts.length - 1];
    c.fillStyle = 'rgba(255,220,190,1)'; c.beginPath(); c.arc(hx, hy, 6 + 6 * flash, 0, Math.PI * 2); c.fill();
    const [ox, oy] = pts[0];
    c.strokeStyle = 'rgba(255,90,60,0.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(ox, oy, 11, 0, Math.PI * 2); c.stroke();
  }
  // the ghost: what a real first strike would look like
  if (ghostK > 0) {
    const R = rng(4242);
    c.lineWidth = 1.6;
    for (let i = 0; i < 320; i++) {
      let la, lo;
      if (i < 220) { la = 34 + R() * 15; lo = -118 + R() * 34; }                 // missile fields and bomber bases
      else if (i < 270) { la = 25 + R() * 30; lo = -60 + R() * 40; }             // Atlantic submarines
      else { la = 30 + R() * 25; lo = -170 + R() * 30; }                        // Pacific submarines
      const u = clamp(ghostK * 1.4 - R() * 0.4);
      if (u <= 0) continue;
      const pts = trackPts(pr, la, lo, i + 10, u, 0.75 + R() * 0.45);
      c.strokeStyle = `rgba(255,${120 + Math.floor(R() * 60)},90,${0.2 * Math.min(1, ghostK * 1.5)})`;
      strokePts(c, pts);
    }
  }
}

function drawStart(c, w, h, t, T, rel, relX = [0.08, 0.92]) {
  c.fillStyle = 'rgb(8,3,3)'; c.fillRect(0, 0, w, h);
  const strike = (t0) => { if (t < t0) return 0; const a = t - t0; if (a > 0.22) return 1; return [1, 0.1, 0.85, 0.2, 1, 0.55, 1][Math.floor(a / 0.03) % 7]; };
  const siren = 0.85 + 0.15 * Math.cos((t - T.t0) * Math.PI * 2 * 1.3);
  const b = strike(T.t0) * siren;
  const relH = rel ? h * 0.24 : 0;
  const bh = h - relH - (rel ? h * 0.06 : 0);
  // the light box: unlit letters faintly visible in the glass, lit ones burn
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 ${Math.round(bh * 0.62)}px OpenSans`; try { c.fontStretch = 'condensed'; } catch (er) { /* */ }
  c.fillStyle = 'rgba(70,16,12,1)'; c.fillText('СТАРТ', w / 2, bh * 0.53);
  if (b > 0) {
    c.fillStyle = `rgba(255,${Math.round(40 + 40 * b)},${Math.round(25 + 20 * b)},${b})`; c.fillText('СТАРТ', w / 2, bh * 0.53);
  }
  c.strokeStyle = 'rgba(60,20,15,1)'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, bh - 12);
  if (rel) {
    // reconstructed wording (see the header): ДОСТОВЕРНОСТЬ ВЫСШАЯ
    // p.relX [x0, x1] (fractions of the screen's width): the panel's extent, kept clear of whatever stands in front of the screen
    // (RC2: right of Petrov's head, so the word is never cut to ВЕРНОСТЬ); the line is fitted to the panel, and breaks in two
    // (ДОСТОВЕРНОСТЬ / ВЫСШАЯ) rather than shrink by more than 5 %
    const y0 = h - relH, px0 = w * relX[0], pw = w * (relX[1] - relX[0]), cx = px0 + pw / 2;
    const rb = strike(T.tRel) * (0.92 + 0.08 * siren);
    c.fillStyle = 'rgb(12,4,3)'; c.fillRect(px0, y0, pw, relH);
    c.strokeStyle = 'rgba(60,20,15,1)'; c.lineWidth = 4; c.strokeRect(px0, y0, pw, relH);
    const base = relH * 0.36;
    c.font = `600 100px OpenSans`;
    const one = 100 * pw * 0.9 / c.measureText('ДОСТОВЕРНОСТЬ ВЫСШАЯ').width;
    const two = one < base * 0.95;
    const fs = two ? Math.min(relH * 0.36, 100 * pw * 0.9 / c.measureText('ДОСТОВЕРНОСТЬ').width) : Math.min(base, one);
    const rows = two ? [['ДОСТОВЕРНОСТЬ', y0 + relH * 0.32], ['ВЫСШАЯ', y0 + relH * 0.74]] : [['ДОСТОВЕРНОСТЬ ВЫСШАЯ', y0 + relH * 0.54]];
    c.font = `600 ${Math.round(fs)}px OpenSans`;
    for (const [s, y] of rows) {
      c.fillStyle = 'rgba(60,14,10,1)'; c.fillText(s, cx, y);
      if (rb > 0) { c.fillStyle = `rgba(255,${Math.round(70 + 50 * rb)},40,${rb})`; c.fillText(s, cx, y); }
    }
  }
  try { c.fontStretch = 'normal'; } catch (er) { /* */ }
}

// invented wording (see the header): a generic procedure, typed, numbered
const PROTO = [
  ['h', 'ИНСТРУКЦИЯ ОПЕРАТИВНОМУ ДЕЖУРНОМУ'],
  ['h', 'ПРИ СИГНАЛЕ «СТАРТ»'],
  ['l', '1. Принять сигнал системы.'],
  ['l', '2. Подтвердить достоверность.'],
  ['l', '3. Доложить вышестоящему'],
  ['l', '   командованию немедленно.'],
  ['l', '4. Доложить: ракетное нападение.'],
  ['l', '5. Действовать по инструкции.'],
];
function drawProtocol(c, w, h, t, T, seed) {
  // paper (albedo; the composite lights it)
  c.fillStyle = 'rgb(214,200,172)'; c.fillRect(0, 0, w, h);
  const R = rng(seed * 13 + 5);
  for (let i = 0; i < 60; i++) { const x = R() * w, y = R() * h, r = 20 + R() * 120; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(120,90,50,${0.04 + R() * 0.06})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  { const g = c.createRadialGradient(w * 0.45, h * 0.4, w * 0.2, w * 0.5, h * 0.5, w * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,35,15,0.45)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const lh = h / (PROTO.length + 2.2);
  const size = Math.round(lh * 0.42);
  let li = 0;
  PROTO.forEach(([kind, s], i) => {
    const y = lh * (1.35 + i);
    c.font = `${kind === 'h' ? 600 : 400} ${size}px ${kind === 'h' ? 'PlexM' : 'Plex'}`;
    // typewriter: per-glyph density and baseline jitter
    const cw = c.measureText('M').width;
    for (let j = 0; j < s.length; j++) {
      const a = 0.7 + 0.3 * hash2(i * 41 + j, seed);
      c.fillStyle = `rgba(30,22,18,${a})`;
      c.fillText(s[j], w * 0.08 + j * cw, y + (hash2(i * 7 + j, seed + 3) - 0.5) * 2.2);
    }
    if (kind === 'h') return;
    // the pen strike: a quick wavering stroke across the line, drawn left to right
    const ts = T.strike[li++]; if (ts == null || t < ts) return;
    const u = easeOutCubic(clamp((t - ts) / 0.2));
    const x0 = w * 0.06, x1 = w * 0.08 + s.length * cw + w * 0.02;
    const yy = y - size * 0.32;
    c.strokeStyle = 'rgba(25,18,30,0.92)'; c.lineWidth = Math.max(3, size * 0.12); c.lineCap = 'round';
    c.beginPath();
    for (let k = 0; k <= 30; k++) { const s2 = k / 30 * u; const x = lerp(x0, x1, s2); const yk = yy + Math.sin(s2 * 7 + i) * size * 0.05 + (s2 - 0.5) * size * 0.12 * (hash1(i) - 0.5); if (k) c.lineTo(x, yk); else c.moveTo(x, yk); }
    c.stroke();
  });
}

// ---------------------------------------------------------------- homography (unit square -> quad), and its inverse
function homography(q) {
  // q: [[x0,y0] (u=0,v=0), [x1,y1] (1,0), [x2,y2] (1,1), [x3,y3] (0,1)] -> 3x3 (row-major) mapping (u,v,1) to (x,y,w)
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + hh * x3, x0, y1 - y0 + g * y1, y3 - y0 + hh * y3, y0, g, hh, 1];
}
function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

let MAT = null, BACK = null;
function material(e) {
  if (MAT) return MAT;
  MAT = e.shader(/* glsl */`
    uniform sampler2D tSrc; uniform mat3 Hinv; uniform vec2 csize; uniform float emissive; uniform float glow; uniform float grade; uniform float seed; uniform float t;
    uniform vec3 light;    // paper mode: the light falling on the sheet
    uniform sampler2D tBg; uniform vec4 occ; uniform float occOn;   // occluder matte (see p.occ)
    float occluder(vec2 px) {
      if (occOn < .5) return 0.;
      vec2 b0 = occ.xy, b1 = occ.zw;
      float box = smoothstep(b0.x, b0.x + 24., px.x) * (1. - smoothstep(b1.x - 24., b1.x, px.x)) * smoothstep(b0.y, b0.y + 24., px.y) * (1. - smoothstep(b1.y - 24., b1.y, px.y));
      if (box <= 0.) return 0.;
      float m = 0.;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec3 c = texture(tBg, vUv + vec2(float(i), float(j)) * vec2(3. / 1920., 3. / 1080.)).rgb;
        float red = c.r / (max(c.g, c.b) + .02);                     // screen glass: strongly red; hair, skin, cloth: not
        m += 1. - smoothstep(1.5, 1.9, red);
      }
      return box * m / 9.;
    }
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec3 h = Hinv * vec3(px, 1.); vec2 uv = h.xy / h.z;          // content uv, y down
      // painted edge: the boundary wobbles a little, like a brushed edge
      float wob = (fbm3(px * .02 + seed) - .5) * .012;
      vec2 e2 = min(uv, 1. - uv) + wob;
      float inside = smoothstep(-.002, .012, min(e2.x, e2.y));
      // brush strokes: stretched noise, mostly horizontal with a diagonal drift
      vec2 bp = rot(.35) * px;
      float brush = fbm3(bp * vec2(.006, .045) + seed * 3.1);
      vec2 tuv = vec2(uv.x, 1. - uv.y) + (vec2(fbm3(px * .03 + 7.), fbm3(px * .03 + 13.)) - .5) * .004;
      vec3 c0 = textureLod(tSrc, tuv, 0.).rgb;
      vec3 c1 = textureLod(tSrc, clamp(tuv, 0., 1.), 3.).rgb;
      vec3 c2 = textureLod(tSrc, clamp(tuv, 0., 1.), 5.5).rgb;
      vec3 col;
      if (emissive > .5) {
        vec3 base = mix(c0, c1, .3);                              // soften: no screen-sharp edges in a painting
        // grade toward CRT red and umber
        float l = luma(base);
        vec3 g = mix(base, vec3(l * 1.25, l * .42, l * .22) + base * vec3(.4, .2, .1), .55 * grade);
        g *= .78 + .44 * brush;
        col = g * inside * 1.15 + (c1 * .5 + c2 * .9) * vec3(1., .45, .3) * glow * (inside * .5 + .5 * exp(-max(-min(e2.x, e2.y), 0.) * 9.));
        // glass: a faint dark umber film over the screen
        col += vec3(.03, .015, .01) * inside * brush;
        col *= 1. - occluder(px);
        fragColor = vec4(col, 1.);
      } else {
        vec3 alb = mix(c0, c1, .25);
        vec3 lit = alb * light * (.82 + .3 * brush);
        float l = luma(lit);
        lit = mix(lit, vec3(l * 1.1, l * .78, l * .55), .45 * grade);    // into the painting's umber
        fragColor = vec4(lit, inside * .96);
      }
    }`, { tSrc: { value: null }, Hinv: { value: new THREE.Matrix3() }, csize: { value: new THREE.Vector2() }, emissive: { value: 1 }, glow: { value: 1 }, grade: { value: 1 },
    seed: { value: 0 }, t: { value: 0 }, light: { value: new THREE.Vector3(1, 1, 1) },
    tBg: { value: null }, occ: { value: new THREE.Vector4(0, 0, 0, 0) }, occOn: { value: 0 } });
  BACK = e.shader(/* glsl */`
    uniform float seed;
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 bp = rot(.5) * px;
      float br = fbm(bp * vec2(.004, .02) + seed), br2 = fbm(px * .003 + 4.);
      vec3 umber = vec3(.13, .075, .04), dark = vec3(.03, .018, .012);
      vec3 col = mix(dark, umber, smoothstep(.2, .9, br2) * .8) * (.75 + .5 * br);
      // the wall screen (dark glass) and its frame
      vec2 q = abs(px - vec2(960., 455.)) - vec2(500., 315.);
      float scr = smoothstep(4., -4., max(q.x, q.y));
      col = mix(col, vec3(.02, .01, .008) * (.8 + .4 * br), scr);
      // the desk, catching red light
      float desk = smoothstep(820., 840., px.y);
      col = mix(col, vec3(.2, .09, .05) * (.7 + .5 * br), desk * .9);
      // a seated figure in silhouette (lower left), the back of a chair
      vec2 f = (px - vec2(520., 900.)) / vec2(170., 260.);
      col *= 1. - .85 * smoothstep(1.02, .98, length(f));
      col *= 1. - .85 * smoothstep(1.02, .98, length((px - vec2(520., 600.)) / vec2(70., 85.)));
      // red light from the screen falling on the room
      col += vec3(.18, .03, .015) * exp(-length((px - vec2(960., 455.)) / vec2(900., 650.))) * .6;
      fragColor = vec4(col, 1.);
    }`, { seed: { value: 3 } });
  return MAT;
}

function timesOf(ctx, shot, p, mode) {
  const A = ctx.audio;
  if (mode === 'map' || mode === 'ghost') {
    const L = lineByText(A, 'eighty-three'); const Lg = lineByText(A, 'petrov knew');
    const t83 = L ? L.t : shot.t0;
    const saw = wordT(L, 'saw', t83 + 1.5), five = wordT(L, 'five', t83 + 2);
    const tracks = p.tracks || [t83 + 0.25, saw, saw + 0.17, saw + 0.33, five];
    return { tracks, g0: p.t0 ?? (Lg ? Lg.t : shot.t0), g1: wordT(Lg, 'like', shot.t1 - 0.4) };
  }
  if (mode === 'start') {
    const L = lineByText(A, 'every rule said');
    const t0 = p.t0 ?? (L ? L.t : shot.t0);
    return { t0, tRel: p.tRel ?? wordT(L, 'said', t0 + 0.6) };
  }
  if (mode === 'protocol') {
    const L = lineByText(A, 'ignored all previous');
    const w = (x, d) => wordT(L, x, d);
    const t0 = L ? L.t : shot.t0;
    const ig = w('ignored', t0), al = w('all', t0 + 0.45), pr = w('previous', t0 + 0.74), ins = w('instructions', t0 + 1.2);
    return { strike: p.strike || [ig, (ig + al) / 2, al, pr, (pr + ins) / 2, ins] };
  }
  return {};
}

export const look = { tonemap: 1, bloom: 0.5, bloomThreshold: 0.75, halation: 0.45, halCol: [1.0, 0.32, 0.14], vignette: 0.4, grain: 0.035 };

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const mode = p.mode || 'map'; const M = material(e);
    if (mode === 'backdrop') { e.pass(BACK, e.rtScene); return; }
    if (!p.over) e.pass(BACK, e.rtScene);   // standalone: draw onto the stand-in painting
    const rect = p.rect || [460, 140, 1000, 630];
    const quad = p.quad || [[rect[0], rect[1]], [rect[0] + rect[2], rect[1]], [rect[0] + rect[2], rect[1] + rect[3]], [rect[0], rect[1] + rect[3]]];
    const qw = (Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1])) / 2;
    const qh = (Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[1][0], quad[2][1] - quad[1][1])) / 2;
    const cw = 1280, ch = Math.max(64, Math.round(cw * qh / qw));
    const C = canvasFor(mode, cw, ch);
    const T = timesOf(ctx, shot, p, mode);
    const seed = p.seed ?? 2;
    if (mode === 'map') drawMap(C.c, cw, ch, t, T, 0);
    else if (mode === 'ghost') {
      const gk = smooth(range(t, T.g0 + 0.05, T.g0 + 0.6)) * (1 - smooth(range(t, T.g1 - 0.5, T.g1 + 0.2)));
      drawMap(C.c, cw, ch, Math.max(t, T.tracks[4] + 5), T, gk);
    } else if (mode === 'start') drawStart(C.c, cw, ch, t, T, p.reliability ?? true, p.relX);
    else if (mode === 'protocol') drawProtocol(C.c, cw, ch, t, T, seed);
    C.tex.needsUpdate = true;
    const H = homography(quad), Hi = inv3(H);
    const u = M.uniforms;
    u.tSrc.value = C.tex; u.Hinv.value.set(...Hi); u.emissive.value = mode === 'protocol' ? 0 : 1;
    u.glow.value = p.glow ?? 1; u.grade.value = p.grade ?? 1; u.seed.value = seed; u.t.value = t;
    // paper: lit warm by a lamp from one side and red by the screen from the other (and the screen's flicker)
    const fl = 0.9 + 0.1 * Math.cos(t * 8.2);
    const Lc = p.light || [0.52, 0.26, 0.17];
    u.light.value.set(Lc[0] * fl, Lc[1] * fl, Lc[2] * fl);
    if (p.occ && p.over && mode !== 'protocol') {
      const bg = rt(e, 'petrovBg'); copy(e, e.rtScene.texture, bg);
      u.tBg.value = bg.texture; u.occ.value.set(...p.occ); u.occOn.value = 1;
    } else { u.tBg.value = C.tex; u.occOn.value = 0; }
    e.passOver(M, e.rtScene, mode === 'protocol' ? 'normal' : 'add');
  },
};
