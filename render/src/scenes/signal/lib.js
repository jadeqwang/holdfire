// Shared helpers for the "signal" group: lyric/beat lookups (so scenes re-time with timing.json), binary assets,
// data textures, and engraved-line drawing for Canvas 2D (partial polylines for "engraving" a path with a point of light).
import * as THREE from 'three';
import { css } from '../../palette.js';

// ---------------------------------------------------------------- timing
// first lyric line whose text contains `needle` (case-insensitive), optionally only lines starting after `after`
export function lineByText(audio, needle, after = -1) {
  const n = needle.toLowerCase();
  return audio.lines.find((l) => (l.text || '').toLowerCase().includes(n) && l.t >= after) || null;
}
// time of the first word of `line` matching `w` (case/punctuation-insensitive); fallback if missing
export function wordT(line, w, fallback) {
  if (!line) return fallback;
  const k = w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
  const hit = line.words.find((x) => (x.w || '').toLowerCase().replace(/[^a-z0-9'-]/g, '') === k);
  return hit ? hit.t : fallback;
}
// beat times inside [t0, t1)
export function beatsIn(audio, t0, t1) { return audio.beats.filter((b) => b >= t0 - 1e-6 && b < t1); }
// eighth-note grid inside [t0, t1) (derived from the beat grid, so it follows tempo drift)
export function eighthsIn(audio, t0, t1) {
  const out = [];
  const b = audio.beats;
  for (let i = 0; i < b.length - 1; i++) {
    for (const x of [b[i], (b[i] + b[i + 1]) / 2]) if (x >= t0 - 1e-6 && x < t1) out.push(x);
  }
  return out;
}

// ---------------------------------------------------------------- assets
const binCache = new Map();
export async function loadBin(rel) {
  const url = new URL(rel, import.meta.url).href;
  if (!binCache.has(url)) binCache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error('missing ' + url); return r.arrayBuffer(); }));
  return binCache.get(url);
}

export function floatTex(data, w, h, { linear = false } = {}) {
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.FloatType);
  t.minFilter = t.magFilter = linear ? THREE.LinearFilter : THREE.NearestFilter;
  t.generateMipmaps = false; t.needsUpdate = true; t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function canvasTex(cv, { mip = false } = {}) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = false;
  t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- engraved lines (Canvas 2D, design px)
// polyline helpers: a "path" is [[x,y],...]; plen() caches cumulative length
export function plen(pts) {
  if (pts._L) return pts._L;
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  pts._L = L; return L;
}
// stroke the first `u` (0..1) of the path; returns the head point
export function strokePartial(c, pts, u) {
  if (u <= 0 || pts.length < 2) return null;
  const L = plen(pts), total = L[L.length - 1], s = Math.min(1, u) * total;
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  let head = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= s) { c.lineTo(pts[i][0], pts[i][1]); head = pts[i]; continue; }
    const k = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    head = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    c.lineTo(head[0], head[1]); break;
  }
  c.stroke();
  return head;
}
export function arcPts(cx, cy, r, a0, a1, n = 0) {
  const k = n || Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 6));
  const out = [];
  for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
export function ellipsePts(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = Math.PI * 2, n = 0) {
  const k = n || Math.max(12, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 6));
  const out = []; const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
  return out;
}
export function seg(x0, y0, x1, y1) { return [[x0, y0], [x1, y1]]; }

// a hot point of light (the engraving tool): core + soft halo, additive
export function hotPoint(c, x, y, k = 1, col = [1, 0.886, 0.64]) {
  if (k <= 0.001) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, 26 * k);
  g.addColorStop(0, css(col, 0.95 * k)); g.addColorStop(0.18, css(col, 0.35 * k)); g.addColorStop(1, css(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 26 * k, 0, Math.PI * 2); c.fill();
  c.fillStyle = css([1, 1, 1], k); c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill();
  c.restore();
}

// Pioneer/Voyager binary: '|' for 1 and '—' for 0, laid along a direction from (x,y). Returns the bit list.
export function binTicks(c, value, x, y, ang, o = {}) {
  const bits = typeof value === 'string' ? value : value.toString(2);
  const step = o.step ?? 9, len = o.len ?? 8, n = bits.length;
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + ux * i * step, py = y + uy * i * step;
    if (bits[i] === '1') { c.moveTo(px - nx * len / 2, py - ny * len / 2); c.lineTo(px + nx * len / 2, py + ny * len / 2); }
    else { c.moveTo(px - ux * step * 0.32, py - uy * step * 0.32); c.lineTo(px + ux * step * 0.32, py + uy * step * 0.32); }
  }
  c.stroke();
  return bits;
}

// format an integer with thousands separators (deterministic, no locale)
export function commas(s) { s = String(s); let out = ''; for (let i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) out += ','; out += s[i]; } return out; }

// ---------------------------------------------------------------- hue-preserving canvas blit
// engine.blit2d's gain lifts each channel past 0.7 on its own, which turns signal gold orange. This lifts by the brightest
// channel instead (ratios kept), so gold stays gold when it blooms. mode: 'over' | 'add'.
let blitMat = null;
export function blitGold(e, mode = 'over', gain = 1.6, knee = 0.55) {
  if (!blitMat) {
    blitMat = e.shader(/* glsl */`
      uniform sampler2D tSrc; uniform float gain; uniform float knee;
      void main(){ vec4 c = texture(tSrc, vUv);
        float m = max(c.r, max(c.g, c.b));
        float k = 1. + (gain - 1.) * smoothstep(knee, 1., m) * 2.2;
        fragColor = vec4(c.rgb * k, c.a); }`, { tSrc: { value: null }, gain: { value: 1 }, knee: { value: 0.55 } });
  }
  e.c2dTex.needsUpdate = true;
  blitMat.uniforms.tSrc.value = e.c2dTex; blitMat.uniforms.gain.value = gain; blitMat.uniforms.knee.value = knee;
  e.passOver(blitMat, e.rtScene, mode === 'add' ? 'add' : 'normal');
}
