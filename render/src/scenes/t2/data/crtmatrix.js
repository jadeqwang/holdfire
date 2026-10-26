// t2_crt_matrix — Chorus 1, "Silent and patient, but I swear" (1:02.15-1:04.59), and its chorus 2 return (p.variant 'mirror').
// Close on one beige 1999 CRT in a dark bedroom running a SETI@home-style screensaver (drawn here: the colourful 3D power-
// spectrum graph receding in perspective, the data panels; the product name small in the corner, no logo). On the beats at
// 1:02.77 and 1:03.41 the camera smashes back and the screens multiply 1 -> 4 -> 16; on "swear" (1:03.99) a matrix of hundreds
// of CRTs fills the frame, each glowing in its own dark room: eight room variants (window with blinds or city, posters as
// dark shapes, a shelf, a desk lamp switched off, a bed corner), each lit only by its own screen.
// One fullscreen shader draws the whole matrix: tile -> room (baked albedo + emissive atlases, lit by the tube's glow), the
// monitor (SDF beige bezel, foot, keyboard, power LED) and the tube (barrel curvature, rounded glass, scanlines that fade with
// distance, an aperture mask up close, phosphor values > 1 so the engine's bloom does the glow, a glass reflection).
// The hero tile shows the live screensaver; the others sample six baked variants with their own brightness and flicker.
// p: {variant ('plain' | 'mirror'), inset: [{clip | img, at: [col, row]}] (up to 2; mirror default: the two Jades' control rooms
//     at [0,1] and [1,1], procedural stand-ins when a texture is missing), beats: [b1, b2] (default the beats after the start),
//     swear (default the word), zoom0 (0.44), zoomEnd (plain 18, mirror 9), seed}
import * as THREE from 'three';
import { P, css, mix } from '../../../palette.js';
import { clamp, lerp, smooth, smoother, easeOutExpo, easeInOutCubic, range, hash1, hash2, rng } from '../../../util.js';
import { lineByText, wordT, mipTex } from './lib.js';

// ---------------------------------------------------------------- the SETI@home-style screensaver (4:3, design 1280 x 960)
const SW = 1280, SH = 960;
function rainbow(h) {   // 0..1 -> blue, cyan, green, yellow, red (the graph's height ramp)
  const st = [[0.15, 0.2, 0.95], [0.1, 0.8, 1.0], [0.15, 0.95, 0.3], [1.0, 0.95, 0.15], [1.0, 0.25, 0.1]];
  const x = clamp(h) * 4; const i = Math.min(3, Math.floor(x)); const f = x - i;
  return mix(st[i], st[i + 1], f);
}
function drawSaver(c, t, seed, o = {}) {
  c.save();
  c.fillStyle = '#03040b'; c.fillRect(0, 0, SW, SH);
  // the name, small, top left (a real product name; no logo)
  c.font = '600 30px OpenSans'; c.textBaseline = 'alphabetic'; c.fillStyle = '#c9d6ff'; c.fillText('SETI@home', 36, 52);
  c.font = '18px Plex'; c.fillStyle = '#7f89c8'; c.fillText('UNIVERSITY OF CALIFORNIA', 36, 76);
  // three panels
  const R = rng(seed * 31 + 7);
  const panels = [[36, 100, 390, 250], [446, 100, 390, 250], [856, 100, 388, 250]];
  c.lineWidth = 2;
  const pct = ((o.pct ?? (40 + 50 * R())) + t * 0.37) % 100;
  panels.forEach(([x, y, w, h], k) => {
    c.strokeStyle = '#3d3fa8'; c.strokeRect(x, y, w, h);
    c.fillStyle = 'rgba(40,44,130,0.18)'; c.fillRect(x, y, w, h);
    c.font = '600 21px OpenSans'; c.fillStyle = '#e6e9ff';
    c.fillText(['Data Analysis', 'Data Info', 'User Info'][k], x + 14, y + 30);
    c.font = '19px Plex'; c.fillStyle = '#aab4ff';
    const L = k === 0
      ? [`Doppler drift ${(R() * 9 - 4.5).toFixed(4)} Hz/s`, `Resolution ${[0.075, 0.149, 0.298, 1.19][Math.floor(R() * 4)]} Hz`, `Gaussian pwr ${(1 + R() * 3).toFixed(2)}`, `fit ${(1 + R() * 2).toFixed(3)}`]
      : k === 1 ? [`From ${Math.floor(R() * 24)} hr ${Math.floor(R() * 60)} min RA`, `${R() < 0.5 ? '+' : '-'}${Math.floor(R() * 30)} deg ${Math.floor(R() * 60)}' Dec`, 'ARECIBO', `${(1.4185 + (R() - 0.5) * 0.002).toFixed(5)} GHz`]
        : [`Work units ${Math.floor(20 + R() * 900)}`, `CPU ${Math.floor(200 + R() * 4000)} hr ${Math.floor(R() * 60)} min`, `${(1999 + Math.floor(R() * 2))}`, ''];
    L.forEach((s, j) => c.fillText(s, x + 14, y + 70 + j * 36));
  });
  // progress bar in the analysis panel
  c.fillStyle = '#1a1c55'; c.fillRect(50, 318, 360, 16);
  c.fillStyle = '#5aa0ff'; c.fillRect(50, 318, 360 * pct / 100, 16);
  c.font = '18px Plex'; c.fillStyle = '#dfe6ff'; c.fillText(`${pct.toFixed(3)}%`, 300, 312);
  // the 3D power spectrum: rows (time) recede; bars (frequency) rise in a rainbow
  const ROWS = 30, BARS = 72;
  const gx0 = 70, gx1 = 1210, gyF = 900, gyB = 470;                // front and back baselines
  const scroll = t * 9 + seed * 13.7;
  const fr = scroll - Math.floor(scroll);
  // floor grid
  c.strokeStyle = 'rgba(70,80,190,0.45)'; c.lineWidth = 1.2;
  const persp = (z) => { const k = 1 / (1 + z * 2.2); return { y: gyB + (gyF - gyB) * (k - 1 / 3.2) / (1 - 1 / 3.2), s: k }; };
  for (let i = 0; i <= 10; i++) {
    const z = i / 10; const a = persp(z); const w = (gx1 - gx0) * (0.42 + 0.58 * (a.s - 1 / 3.2) / (1 - 1 / 3.2));
    c.beginPath(); c.moveTo(640 - w / 2, a.y); c.lineTo(640 + w / 2, a.y); c.stroke();
  }
  for (let r = ROWS - 1; r >= 0; r--) {
    const z = (r + fr) / ROWS;
    const a = persp(z);
    const sk = (a.s - 1 / 3.2) / (1 - 1 / 3.2);
    const w = (gx1 - gx0) * (0.42 + 0.58 * sk);
    const x0 = 640 - w / 2, bw = w / BARS;
    const row = Math.floor(scroll) - r;
    const dim = 0.35 + 0.65 * sk;
    for (let b = 0; b < BARS; b++) {
      let pw = Math.pow(hash2(row * 0.37 + seed, b * 1.91), 6) * 0.55;
      if (hash2(row + 0.5 + seed, b * 0.13) > 0.988) pw = 0.75 + 0.25 * hash1(row + b);       // spikes
      const base = 0.05 + 0.04 * Math.sin(b * 0.21 + row * 0.07);
      const hgt = clamp(base + pw);
      const col = rainbow(hgt);
      const H = 6 + hgt * 330 * (0.4 + 0.6 * sk);
      c.fillStyle = `rgba(${Math.round(col[0] * 255 * dim)},${Math.round(col[1] * 255 * dim)},${Math.round(col[2] * 255 * dim)},1)`;
      c.fillRect(x0 + b * bw, a.y - H, Math.max(1.2, bw * 0.62), H);
    }
  }
  c.font = '17px Plex'; c.fillStyle = '#7f89c8';
  c.fillText('frequency', 600, 940); c.fillText('time', 1180, 500);
  c.restore();
}

// stylised control room seen on a monitor (stand-in for the mirror insets). side 'A' (signal-print inks) or 'B' (teal, flipped)
function drawControlRoom(c, side) {
  c.save();
  if (side === 'B') { c.translate(SW, 0); c.scale(-1, 1); }
  const A = side === 'A';
  const wall = A ? '#0b1030' : '#06191c', glow = A ? [0.12, 0.17, 0.82] : [0.25, 0.85, 0.8], hot = A ? [1, 0.35, 0.12] : [0.75, 0.95, 0.95];
  c.fillStyle = wall; c.fillRect(0, 0, SW, SH);
  // three waterfall screens on the back wall
  for (let k = 0; k < 3; k++) {
    const x = 170 + k * 330, y = 150, w = 280, h = 210;
    c.fillStyle = '#020306'; c.fillRect(x - 10, y - 10, w + 20, h + 20);
    for (let r = 0; r < 42; r++) for (let b = 0; b < 56; b++) {
      const v = Math.pow(hash2(r * 1.3 + k * 50, b * 0.77), 4) + (Math.abs(b - 28 - Math.sin(r * 0.2 + k) * 6) < 1.5 ? 0.7 : 0);
      const col = mix(glow, hot, clamp(v));
      c.fillStyle = css(col.map((q) => q * (0.25 + 0.75 * clamp(v + 0.15))), 1);
      c.fillRect(x + b * w / 56, y + r * h / 42, w / 56 + 0.5, h / 42 + 0.5);
    }
  }
  // console desk with lamps
  c.fillStyle = '#101219'; c.beginPath(); c.moveTo(0, 640); c.lineTo(SW, 600); c.lineTo(SW, SH); c.lineTo(0, SH); c.fill();
  for (let i = 0; i < 40; i++) { c.fillStyle = css(i % 3 ? glow : hot, 0.85); c.fillRect(120 + i * 26, 650 - i * 1.2, 10, 5); }
  // the listener from behind: hair, headphones, jacket (white with an orange band for A; same jacket, teal tips for B)
  const cx = 640, cy = 600;
  c.fillStyle = '#ece8e0'; c.beginPath(); c.ellipse(cx, cy + 210, 190, 170, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#ff5a1f'; c.fillRect(cx - 190, cy + 150, 380, 22);
  c.fillStyle = '#0c0c10'; c.beginPath(); c.ellipse(cx, cy - 10, 105, 125, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(cx - 100, cy); c.quadraticCurveTo(cx - 120, cy + 150, cx - 60, cy + 190); c.lineTo(cx + 60, cy + 190); c.quadraticCurveTo(cx + 120, cy + 150, cx + 100, cy); c.fill();
  if (!A) { c.fillStyle = '#3fd6c0'; c.beginPath(); c.ellipse(cx, cy + 185, 62, 16, 0, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = A ? '#ff8a3d' : '#9fe8e0'; c.lineWidth = 16; c.beginPath(); c.arc(cx, cy - 20, 118, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  c.fillStyle = A ? '#ff8a3d' : '#9fe8e0'; c.fillRect(cx - 132, cy - 40, 30, 60); c.fillRect(cx + 102, cy - 40, 30, 60);
  c.restore();
}

// ---------------------------------------------------------------- rooms (8 variants), monitors
const NV = 8, RW = 640, RH = 360;      // room atlas cell (tile at 1/3 design scale)
// per variant: screen centre x, screen half-width (tile design px), desk y
const MON = [
  [960, 300, 790], [900, 260, 770], [1040, 270, 800], [980, 250, 760], [880, 285, 805], [1060, 255, 780], [940, 275, 775], [1010, 245, 795],
];
function monGeom(v) {
  const [sx, hw, desk] = MON[v];
  const hh = hw * 0.75, b = hw * 0.17, chin = b * 1.9, foot = hw * 0.11;
  const sy = desk - foot - chin - hh;
  return { sx, sy, hw, hh, b, chin, foot, desk };
}
function bakeRooms() {
  const alb = document.createElement('canvas'); alb.width = RW * 4; alb.height = RH * 2;
  const emi = document.createElement('canvas'); emi.width = RW * 4; emi.height = RH * 2;
  const a = alb.getContext('2d', { willReadFrequently: true }), m = emi.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, emi.width, emi.height);
  for (let v = 0; v < NV; v++) {
    const ox = (v % 4) * RW, oy = Math.floor(v / 4) * RH;
    const R = rng(v * 977 + 3);
    const G = monGeom(v); const k = RW / 1920;
    a.save(); a.translate(ox, oy); a.scale(k, k); m.save(); m.translate(ox, oy); m.scale(k, k);
    a.beginPath(); a.rect(0, 0, 1920, 1080); a.clip(); m.beginPath(); m.rect(0, 0, 1920, 1080); m.clip();
    // wall (albedo: mid tones, the shader lights it)
    const wallC = [[70, 78, 96], [86, 80, 74], [64, 76, 84], [90, 86, 96], [74, 70, 82], [80, 86, 80], [92, 84, 80], [70, 74, 90]][v];
    a.fillStyle = `rgb(${wallC})`; a.fillRect(0, 0, 1920, 1080);
    // wallpaper / paint texture
    for (let i = 0; i < 400; i++) { a.fillStyle = `rgba(0,0,0,${R() * 0.06})`; a.fillRect(R() * 1920, R() * 1080, 4 + R() * 40, 4 + R() * 40); }
    // window (left or right), with blinds or a city; moonlight / sodium in the emissive layer
    const wl = v % 2 === 0;
    if (v !== 3) {
      const wx = wl ? 120 + R() * 120 : 1500 + R() * 120, wy = 150 + R() * 60, ww = 300, wh = 420;
      a.fillStyle = 'rgb(30,32,40)'; a.fillRect(wx - 16, wy - 16, ww + 32, wh + 32);
      const city = v % 3 === 0;
      m.fillStyle = city ? 'rgb(18,16,30)' : 'rgb(14,22,44)'; m.fillRect(wx, wy, ww, wh);
      if (city) { for (let i = 0; i < 90; i++) { m.fillStyle = `rgba(255,${170 + R() * 60},90,${0.4 + R() * 0.5})`; m.fillRect(wx + R() * ww, wy + wh * 0.55 + R() * wh * 0.45, 3, 3); } }
      else { const g = m.createRadialGradient(wx + ww * 0.7, wy + wh * 0.2, 5, wx + ww * 0.7, wy + wh * 0.2, 260); g.addColorStop(0, 'rgba(120,150,210,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = g; m.fillRect(wx, wy, ww, wh); }
      if (v % 4 !== 0) { m.fillStyle = 'rgba(0,0,0,0.75)'; for (let y = wy; y < wy + wh; y += 26) m.fillRect(wx, y + 15, ww, 11); }   // blinds
      a.fillStyle = 'rgb(40,42,50)'; a.fillRect(wx + ww / 2 - 6, wy, 12, wh); a.fillRect(wx, wy + wh / 2 - 6, ww, 12);
      m.fillStyle = '#000'; m.fillRect(wx + ww / 2 - 6, wy, 12, wh); m.fillRect(wx, wy + wh / 2 - 6, ww, 12);
    }
    // posters as dark shapes
    const np = 1 + Math.floor(R() * 3);
    for (let i = 0; i < np; i++) {
      const px = wl ? 1300 + R() * 400 : 200 + R() * 450, py = 120 + R() * 250, pw = 180 + R() * 120, ph = pw * 1.4;
      a.fillStyle = `rgb(${40 + R() * 30},${40 + R() * 30},${45 + R() * 30})`; a.fillRect(px, py, pw, ph);
      a.fillStyle = `rgba(${120 + R() * 100},${80 + R() * 80},${60 + R() * 100},0.35)`;
      a.beginPath(); a.arc(px + pw / 2, py + ph * 0.4, pw * 0.3, 0, Math.PI * 2); a.fill();
    }
    // shelf with books
    if (v % 3 !== 1) {
      const sx = wl ? 1350 : 160, sy = 560;
      a.fillStyle = 'rgb(70,55,40)'; a.fillRect(sx, sy, 380, 14);
      for (let x = sx + 6; x < sx + 360;) { const bw = 14 + R() * 22, bh = 60 + R() * 60; a.fillStyle = `rgb(${50 + R() * 90},${40 + R() * 60},${40 + R() * 70})`; a.fillRect(x, sy - bh, bw, bh); x += bw + 2; }
    }
    // desk (wood), its front edge
    a.fillStyle = 'rgb(92,70,50)'; a.fillRect(0, G.desk, 1920, 1080 - G.desk);
    a.fillStyle = 'rgb(60,45,32)'; a.fillRect(0, G.desk + 150, 1920, 1080);
    a.fillStyle = 'rgb(120,95,70)'; a.fillRect(0, G.desk, 1920, 4);
    // desk lamp, switched off, on the side away from the window
    { const lx = wl ? G.sx + G.hw + 330 : G.sx - G.hw - 330, ly = G.desk;
      a.fillStyle = 'rgb(55,58,62)'; a.fillRect(lx - 60, ly - 12, 120, 12);
      a.strokeStyle = 'rgb(55,58,62)'; a.lineWidth = 12; a.beginPath(); a.moveTo(lx, ly - 10); a.lineTo(lx + (wl ? -60 : 60), ly - 220); a.lineTo(lx + (wl ? -150 : 150), ly - 260); a.stroke();
      a.fillStyle = 'rgb(62,66,70)'; a.beginPath(); a.moveTo(lx + (wl ? -120 : 120), ly - 300); a.lineTo(lx + (wl ? -230 : 230), ly - 210); a.lineTo(lx + (wl ? -170 : 170), ly - 170); a.closePath(); a.fill(); }
    // mug / speakers / papers
    a.fillStyle = 'rgb(160,150,135)'; a.fillRect(G.sx - G.hw * 1.6, G.desk - 40, 120, 40);
    a.fillStyle = 'rgb(48,48,52)'; a.fillRect(G.sx + G.hw * 1.35, G.desk - 150, 90, 150);
    // bed corner in some rooms
    if (v % 4 === 1) { a.fillStyle = 'rgb(70,70,110)'; a.beginPath(); a.moveTo(1920, 880); a.lineTo(1480, 960); a.lineTo(1480, 1080); a.lineTo(1920, 1080); a.fill(); }
    a.restore(); m.restore();
  }
  return { alb: mipTex(alb), emi: mipTex(emi) };
}

let RES = null;
function resources(e) {
  if (RES) return RES;
  const rooms = bakeRooms();
  // screen atlas: 4 x 2 cells of 512 x 384: 0..5 screensaver variants, 6..7 control rooms A / B
  const at = document.createElement('canvas'); at.width = 2048; at.height = 768;
  const c = at.getContext('2d', { willReadFrequently: true });
  for (let k = 0; k < 8; k++) {
    c.save(); c.translate((k % 4) * 512, Math.floor(k / 4) * 384); c.scale(512 / SW, 384 / SH);
    if (k < 6) drawSaver(c, 3 + k * 7.3, k + 2); else drawControlRoom(c, k === 6 ? 'A' : 'B');
    c.restore();
  }
  const live = document.createElement('canvas'); live.width = SW; live.height = SH;
  const liveTex = new THREE.CanvasTexture(live); liveTex.colorSpace = THREE.NoColorSpace; liveTex.generateMipmaps = true; liveTex.minFilter = THREE.LinearMipmapLinearFilter;
  const mat = e.shader(FRAG, {
    tAlb: { value: rooms.alb }, tEmi: { value: rooms.emi }, tScr: { value: mipTex(at) }, tLive: { value: liveTex },
    tInA: { value: null }, tInB: { value: null }, inA: { value: new THREE.Vector4(0, 1, 0, 6) }, inB: { value: new THREE.Vector4(1, 1, 0, 7) },
    center: { value: new THREE.Vector2(0.5, 0.45) }, zoom: { value: 0.44 }, t: { value: 0 }, seed: { value: 0 }, res: { value: new THREE.Vector2(1920, 1080) },
    mon: { value: MON.map((m) => { const g = monGeom(MON.indexOf(m)); return new THREE.Vector4(g.sx, g.sy, g.hw, g.desk); }) },
  });
  RES = { mat, live, liveCtx: live.getContext('2d', { willReadFrequently: true }), liveTex };
  return RES;
}

const FRAG = /* glsl */`
uniform sampler2D tAlb; uniform sampler2D tEmi; uniform sampler2D tScr; uniform sampler2D tLive; uniform sampler2D tInA; uniform sampler2D tInB;
uniform vec4 inA; uniform vec4 inB;      // (col, row, hasTexture, atlas fallback slot)
uniform vec2 center; uniform float zoom; uniform float t; uniform float seed; uniform vec2 res;
uniform vec4 mon[8];
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
// atlas cell (col, row from the canvas top) of a flipY canvas texture, local uv y down
vec2 cellUv(float slot, vec2 luv){ vec2 cell = vec2(mod(slot, 4.), floor(slot / 4.)); return vec2((cell.x + luv.x) / 4., 1. - (cell.y + luv.y) / 2.); }
vec3 roomTap(sampler2D tx, float v, vec2 luv){ return texture(tx, cellUv(v, clamp(luv, .002, .998))).rgb; }
void main(){
  vec2 f = vec2(vUv.x, 1. - vUv.y);                       // 0..1, y down
  vec2 P = center + (f - .5) * zoom;                       // tile units (one tile = one frame at zoom 1)
  vec2 tile = floor(P); vec2 luv = P - tile;               // local 0..1, y down
  vec2 lp = luv * vec2(1920., 1080.);                      // tile design px
  float px = zoom * 1920. / res.x;                         // tile px per screen px
  float hero = (tile.x == 0. && tile.y == 0.) ? 1. : 0.;
  float h = hash12(tile + seed * 1.31);
  float v = hero > .5 ? 0. : floor(hash12(tile * 1.7 + 4.2 + seed) * 8.);
  vec4 M = mon[int(v)];
  vec2 sc = M.xy + vec2(hero > .5 ? 0. : (hash12(tile + 9.1) - .5) * 160., 0.); float hw = M.z, hh = M.z * .75, b = M.z * .17, chin = b * 1.9, foot = M.z * .11, desk = M.w;
  // which screen content
  float isA = (tile.x == inA.x && tile.y == inA.y && inA.w >= 0.) ? 1. : 0.;
  float isB = (tile.x == inB.x && tile.y == inB.y && inB.w >= 0.) ? 1. : 0.;
  vec3 tint = (isA > .5) ? vec3(.35, .3, .9) : (isB > .5 ? vec3(.25, .8, .75) : mix(vec3(.3, .38, .95), vec3(.42, .32, .9), hash12(tile + 3.3)));
  float bright = .75 + .5 * h;                             // each tube its own brightness
  float flick = 1. + .03 * sin(t * (50. + 20. * h) + h * 40.);
  // ---- room: albedo lit by the tube, plus its own emissive light (window, city)
  vec3 alb = roomTap(tAlb, v, luv) * mix(vec3(1.), vec3(1.15, .95, .85), hash12(tile + 6.6) * .7);
  vec3 emi = roomTap(tEmi, v, luv);
  vec2 dl = (lp - sc) / vec2(hw * 2.2, hw * 1.6);
  float glow = 1. / (1. + dot(dl, dl) * 2.4) * bright * flick;
  float below = smoothstep(sc.y + hh, desk + 20., lp.y);   // the desk catches more of the screen light
  vec3 light = vec3(.02, .022, .03) + tint * glow * (.75 + .5 * below) + emi * .3;
  vec3 col = alb * light + emi * .7;
  // keyboard on the desk
  float kb = sdRound(lp - vec2(sc.x, desk + 70.), vec2(hw * .95, 34.), 10.);
  vec3 beige = vec3(.80, .76, .65);
  col = mix(col, beige * (.05 + tint * glow * .5) * (.8 + .2 * step(0., sin(lp.x * .25)) * step(lp.y, desk + 92.)), smoothstep(px, -px, kb));
  // monitor foot and the back of the case (a trapezoid under the chin)
  float fy = (lp.y - (sc.y + hh + b + chin - 6.)) / (foot + 12.);
  float fw = mix(hw * .55, hw * .85, clamp(fy, 0., 1.));
  float footM = step(0., fy) * step(fy, 1.) * smoothstep(px, -px, abs(lp.x - sc.x) - fw);
  col = mix(col, beige * (.03 + tint * glow * .28) * .8, footM);
  // bezel: rounded beige frame, thicker chin
  vec2 bc = sc + vec2(0., (chin - b) * .5);
  vec2 bh = vec2(hw + b, hh + (b + chin) * .5);
  float dB = sdRound(lp - bc, bh, b * .55);
  float inBz = smoothstep(px, -px, dB);
  if (inBz > 0.) {
    float edge = clamp(-dB / (b * .5), 0., 1.);            // 0 at the outer edge .. 1 inside
    float rim = smoothstep(0., .35, edge) * (1. - .25 * smoothstep(.35, 1., edge));
    vec2 n = normalize(lp - bc + 1e-3);
    float topLight = .5 + .5 * (-n.y);
    float near = exp(-max(sdRound(lp - sc, vec2(hw, hh), 16.), 0.) / (b * .8));   // the bezel's inner lip glows with the tube
    vec3 bez = beige * (.035 + .05 * topLight + tint * glow * .14 + tint * near * .55 * bright) * (.55 + .45 * rim);
    // power LED and button on the chin
    vec2 led = vec2(sc.x + hw * .78, sc.y + hh + b + chin * .45);
    float dl2 = length(lp - led);
    bez += vec3(.3, 1., .35) * smoothstep(9. + px, 9. - px, dl2) * 1.4 + vec3(.3, 1., .35) * exp(-dl2 / 18.) * .15;
    bez *= 1. - .35 * smoothstep(px, -px, sdRound(lp - vec2(sc.x + hw * .62, led.y), vec2(18., 8.), 4.));
    bez *= 1. - .3 * smoothstep(px, -px, sdRound(lp - vec2(sc.x, led.y), vec2(46., 9.), 3.));   // badge (blank)
    col = mix(col, bez, inBz);
  }
  // ---- the tube
  vec2 q = (lp - sc) / vec2(hw, hh);
  float dRec = sdRound(lp - sc, vec2(hw + 10., hh + 10.), 22.);
  col = mix(col, vec3(.012, .013, .016), smoothstep(px, -px, dRec));                    // recess
  vec2 qc = q * (1. + .06 * dot(q, q)) / 1.06;                                            // barrel
  float dS = sdRound(qc * vec2(hw, hh), vec2(hw, hh), 34.);
  float inS = smoothstep(px * 1.2, -px * 1.2, dS);
  if (inS > 0.) {
    vec2 su = qc * .5 + .5;                                 // 0..1, y down
    vec3 s;
    if (hero > .5) s = textureLod(tLive, vec2(su.x, 1. - su.y), log2(max(1., px * 1280. / (hw * 2.)))).rgb;
    else if (isA > .5 && inA.z > .5) s = texture(tInA, vec2(su.x, 1. - su.y)).rgb;
    else if (isB > .5 && inB.z > .5) s = texture(tInB, vec2(su.x, 1. - su.y)).rgb;
    else {
      float slot = isA > .5 ? inA.w : (isB > .5 ? inB.w : floor(h * 6.));
      s = texture(tScr, cellUv(slot, clamp(su, .002, .998))).rgb;
    }
    // scanlines (fade out when a line is under ~2 screen px) and an aperture mask up close
    float lines = su.y * 288.;
    float lw = fwidth(lines);
    float scan = mix(1., .72 + .28 * cos(6.2831853 * lines), clamp(1.6 - lw * 2., 0., 1.));
    float mx = su.x * 640.; float mw = fwidth(mx);
    vec3 mask = mix(vec3(1.), vec3(.82) + .36 * vec3(step(mod(mx, 3.), 1.), step(1., mod(mx, 3.)) * step(mod(mx, 3.), 2.), step(2., mod(mx, 3.))), clamp(1. - mw * 2., 0., 1.) * .6);
    float vig = 1. - .35 * smoothstep(.35, 1.4, dot(q, q));
    vec3 scr = vec3(.012, .014, .02) + s * (hero > .5 ? 1.7 : 1.25) * scan * mask * vig * bright * flick;
    // glass: a soft reflection of the room's window and a highlight
    scr += vec3(.03, .035, .045) * smoothstep(1., 0., length(qc - vec2(-.55, -.6))) + roomTap(tEmi, v, luv) * .05;
    col = mix(col, scr, inS);
  }
  // gutter between rooms (each its own window in the dark)
  vec2 gd = min(lp, vec2(1920., 1080.) - lp);
  float gut = smoothstep(14. - px, 14. + px, min(gd.x, gd.y * 1.0));
  col *= gut;
  fragColor = vec4(col, 1.);
}`;

// ---------------------------------------------------------------- inset textures (img or plate clip), miss -> procedural
const texCache = new Map();
function loadTex(url) {
  if (texCache.has(url)) return texCache.get(url);
  const pr = new Promise((res) => {
    const img = new Image();
    img.onload = () => { const t = new THREE.Texture(img); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; res(t); };
    img.onerror = () => res(null);
    img.src = url;
  });
  texCache.set(url, pr);
  if (texCache.size > 30) texCache.delete(texCache.keys().next().value);
  return pr;
}
const metaCache = new Map();
async function clipFrame(clip, lt) {
  const dir = clip.includes('/') ? clip : `work/plates/${clip}`;
  if (!metaCache.has(dir)) metaCache.set(dir, fetch(`${dir}/meta.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const m = await metaCache.get(dir); if (!m) return null;
  let f = Math.floor(lt * 24 + 1e-3); f -= f % 2;
  const k = Math.max(0, Math.min((m.n || 1) - 1, Math.floor(f / 24 * (m.fps || 24))));
  return loadTex(`${dir}/f_${String(k).padStart(5, '0')}.jpg`);
}

function insetsOf(p) {
  if (p.inset) return p.inset.slice(0, 2);
  if (p.variant === 'mirror') return [{ at: [0, 1] }, { at: [1, 1] }];
  return [];
}

function timesOf(ctx, shot, p) {
  const A = ctx.audio;
  const L = lineByText(A, 'silent and patient', shot.t0 - 0.5);
  const beats = p.beats || A.beats.filter((b) => b > shot.t0 + 0.3 && b < shot.t1).slice(0, 2);
  while (beats.length < 2) beats.push((beats[beats.length - 1] ?? shot.t0) + 0.64);
  const swear = p.swear ?? wordT(L, 'swear', beats[1] + 0.58);
  return { b1: beats[0], b2: beats[1], swear };
}

export const look = { bloom: 0.75, bloomThreshold: 0.75, halation: 0.25, halCol: [0.5, 0.6, 1.0], vignette: 0.4, grain: 0.04, tonemap: 1 };

export default {
  async init(ctx) { resources(ctx.engine); },
  async prepare(ctx, shot, t, lt, p) {
    const ins = insetsOf(p);
    ctx.state.t2crtIns = await Promise.all(ins.map(async (it) => (it.img ? loadTex(it.img) : it.clip ? clipFrame(it.clip, lt) : null)));
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const R = resources(e); const T = timesOf(ctx, shot, p);
    const mirror = p.variant === 'mirror';
    // ---- live screensaver on the hero tube
    drawSaver(R.liveCtx, t, (p.seed ?? 1), { pct: 61.2 });
    R.liveTex.needsUpdate = true;
    // ---- camera: close on the hero screen, then smash out on b1 (x2 tiles), b2 (x4), "swear" (hundreds)
    const z0 = p.zoom0 ?? 0.44, zEnd = p.zoomEnd ?? (mirror ? 9 : 18);
    const sm = (a) => easeOutExpo(range(t, a - 0.02, a + 0.36));
    let lz = Math.log(z0 * (1 - 0.06 * smooth(range(t, shot.t0, T.b1))));
    lz = lerp(lz, Math.log(2), sm(T.b1));
    lz = lerp(lz, Math.log(4), sm(T.b2));
    lz = lerp(lz, Math.log(zEnd), sm(T.swear));
    lz += 0.06 * smooth(range(t, T.swear, shot.t1 + 0.5));
    const z = Math.exp(lz);
    const g0 = monGeom(0);
    const c0 = [g0.sx / 1920, (g0.sy + 12) / 1080];
    const k = smooth(range(lz, Math.log(z0), Math.log(2)));
    const u = R.mat.uniforms;
    u.center.value.set(lerp(c0[0], 1, k), lerp(c0[1], 1, k));
    u.zoom.value = z; u.t.value = t; u.seed.value = p.seed ?? 0; u.res.value.set(e.W, e.H);
    const ins = insetsOf(p); const tx = ctx.state.t2crtIns || [];
    const setIn = (U, TU, i, slot) => {
      if (!ins[i]) { U.value.set(-999, -999, 0, -1); return; }
      U.value.set(ins[i].at[0], ins[i].at[1], tx[i] ? 1 : 0, slot); TU.value = tx[i] || null;
    };
    setIn(u.inA, u.tInA, 0, 6); setIn(u.inB, u.tInB, 1, 7);
    if (!u.tInA.value) u.tInA.value = R.liveTex; if (!u.tInB.value) u.tInB.value = R.liveTex;
    e.pass(R.mat, e.rtScene);
  },
};
