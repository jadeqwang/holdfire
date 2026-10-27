// Shared helpers for the take-two "data" group: the fact-checked near-miss list (render/data/t2/nearmisses.json), calendar
// arithmetic for the reset counter (proleptic Gregorian day numbers, no Date object), odometer/roller digits for Canvas 2D,
// baked paper textures, and a small VHS/flash compositor pass. Everything is a pure function of its arguments.
import * as THREE from 'three';
import { clamp, hash1, hash2, rng } from '../../../util.js';
export { lineByText, wordT, commas, canvasTex, hotPoint } from '../../signal/lib.js';

// ---------------------------------------------------------------- the list
let LIST = null;
export async function loadList() {
  if (!LIST) LIST = fetch('data/t2/nearmisses.json').then((r) => { if (!r.ok) throw new Error('missing data/t2/nearmisses.json'); return r.json(); });
  return LIST;
}
let LISTV = null;
export function listNow() { return LISTV; }
export async function ensureList() { if (!LISTV) LISTV = await loadList(); return LISTV; }

// ---------------------------------------------------------------- calendar
// days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's days_from_civil)
export function dayNum(y, m, d) {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}
export const dayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return dayNum(y, m, d); };
export function civil(z) {                     // inverse of dayNum -> [y, m, d]
  z += 719468; const era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp + (mp < 10 ? 3 : -9);
  return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
}

// ---------------------------------------------------------------- rhythm
// sub-beat grid point: beat index k (fractional), interpolated on the beat list (follows tempo drift)
export function gridT(audio, k) {
  const b = audio.beats; const i = Math.floor(k), f = k - i;
  const t0 = audio.beatT(i), t1 = audio.beatT(i + 1);
  return t0 + (t1 - t0) * f;
}
// fractional beat index of time t
export function beatK(audio, t) { const B = audio.beat(t); return B.k + B.phase; }

// ---------------------------------------------------------------- odometer digits (Canvas 2D)
// continuous odometer: wheel k's position (0..10) for a continuous value v (carry rolls only while the lower wheels pass 9 -> 0)
export function odoPos(v, k) {
  const p = Math.pow(10, k);
  const base = Math.floor(v / p);
  if (k === 0) return (v % 10 + 10) % 10;
  const lower = v - base * p;                  // 0..p
  const f = lower > p - 1 ? lower - (p - 1) : 0;
  return ((base % 10) + f + 10) % 10;
}
// a roller wheel in a window at (x,y,w,h); pos 0..10 continuous; blur (digit units smeared across the shutter).
// o: {font, size, ink, drum, shade (0..1 cylinder darkening), sub (motion samples)}
export function drawWheel(c, x, y, w, h, pos, o = {}) {
  const size = o.size || h * 0.72;
  const n = Math.max(1, o.blur > 0.05 ? Math.min(9, Math.ceil(o.blur * 6)) : 1);
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = o.drum || '#111'; c.fillRect(x, y, w, h);
  c.font = o.font || `600 ${size}px PlexM`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const pitch = h * (o.pitch || 0.92);
  for (let s = 0; s < n; s++) {
    const pp = pos + (n > 1 ? (s / (n - 1) - 0.5) * o.blur : 0);
    const d0 = Math.floor(pp), fr = pp - d0;
    c.globalAlpha = (o.alpha ?? 1) / n * (n > 1 ? 1.25 : 1);
    c.fillStyle = o.ink || '#eee';
    for (let j = -1; j <= 1; j++) {
      const dig = (((d0 + j) % 10) + 10) % 10;
      const yy = y + h / 2 - (j - fr) * pitch + (o.dy || 0);
      // drum curvature: digits squash toward the window edges
      const off = (yy - (y + h / 2)) / (h / 2);
      if (Math.abs(off) > 1.6) continue;
      c.save(); c.translate(x + w / 2, yy); c.scale(1, Math.max(0.15, Math.cos(clamp(off * 0.9, -1.5, 1.5))));
      c.fillText(String(dig), 0, 0); c.restore();
    }
  }
  c.globalAlpha = 1;
  // cylinder shading
  const g = c.createLinearGradient(0, y, 0, y + h);
  const sh = o.shade ?? 0.85;
  g.addColorStop(0, `rgba(0,0,0,${sh})`); g.addColorStop(0.22, `rgba(0,0,0,${sh * 0.25})`); g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(0.78, `rgba(0,0,0,${sh * 0.25})`); g.addColorStop(1, `rgba(0,0,0,${sh})`);
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.restore();
}

// ---------------------------------------------------------------- paper (baked once per size/seed)
// newsprint: grey ground, mottling, fibres, a few darker flecks. Returns a canvas.
export function bakePaper(w, h, seed = 1, o = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const R = rng(seed * 7919 + 13);
  const base = o.base || [203, 199, 189];
  c.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; c.fillRect(0, 0, w, h);
  // mottling: large soft blotches, light and dark
  const nb = Math.round(w * h / 9000);
  for (let i = 0; i < nb; i++) {
    const x = R() * w, y = R() * h, r = 20 + R() * 90, dark = R() < 0.5;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.03 + R() * 0.05;
    g.addColorStop(0, dark ? `rgba(90,84,70,${a})` : `rgba(255,252,240,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fibres
  const nf = Math.round(w * h / 260);
  c.lineWidth = 0.8;
  for (let i = 0; i < nf; i++) {
    const x = R() * w, y = R() * h, L = 3 + R() * 14, a = R() * Math.PI;
    const dark = R() < 0.55;
    c.strokeStyle = dark ? `rgba(70,64,55,${0.05 + R() * 0.08})` : `rgba(255,255,250,${0.06 + R() * 0.1})`;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (R() - 0.5) * 3, y + Math.sin(a) * L * 0.5 + (R() - 0.5) * 3, x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke();
  }
  // flecks (newsprint's wood specks)
  const nk = Math.round(w * h / 5000);
  for (let i = 0; i < nk; i++) {
    c.fillStyle = `rgba(50,44,36,${0.15 + R() * 0.35})`;
    c.beginPath(); c.arc(R() * w, R() * h, 0.4 + R() * 1.1, 0, Math.PI * 2); c.fill();
  }
  // per-pixel tooth
  const id = c.getImageData(0, 0, w, h); const d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9; }
  c.putImageData(id, 0, 0);
  return cv;
}

// ink irregularity: knock speckled voids out of an ink canvas (destination-out), stronger where the ribbon is worn
export function inkVoids(c, x, y, w, h, seed, density = 1) {
  const R = rng(seed * 104729 + 7);
  c.save(); c.globalCompositeOperation = 'destination-out';
  const n = Math.round(w * h / 60 * density);
  for (let i = 0; i < n; i++) {
    const px = x + R() * w, py = y + R() * h;
    c.fillStyle = `rgba(0,0,0,${0.25 + R() * 0.6})`;
    c.fillRect(px, py, 0.7 + R() * 1.6, 0.7 + R() * 1.3);
  }
  c.restore();
}

// ---------------------------------------------------------------- canvas -> texture with mipmaps (for minified sampling)
export function mipTex(cv) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4; t.needsUpdate = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------------------------------------------------------------- 2D -> HDR pass with VHS rewind lines and a red flash
// Samples the engine's 2D canvas, displaces bands of rows (tracking), adds head-switch noise, chroma bleed, and an optional
// red tint. o: {vhs 0..1, red 0..1, seed, gain (lift highlights), t}
let vhsMat = null;
export function vhsPass(e, t, o = {}) {
  if (!vhsMat) {
    vhsMat = e.shader(/* glsl */`
      uniform sampler2D tSrc; uniform float vhs; uniform float red; uniform float seed; uniform float gain; uniform float t; uniform vec2 res; uniform vec4 keep;
      vec3 tap(vec2 uv){ vec4 c = texture(tSrc, uv); return c.rgb * c.a; }
      void main(){
        vec2 uv = vUv; float y = 1. - uv.y;
        // keep (design px x0 y0 x1 y1): a window that does not tear (the counter's digits read through a reset's flash)
        vec2 dp = vec2(uv.x * 1920., y * 1080.);
        float inK = keep.z > keep.x ? smoothstep(keep.x - 6., keep.x + 6., dp.x) * smoothstep(keep.z + 6., keep.z - 6., dp.x) * smoothstep(keep.y - 6., keep.y + 6., dp.y) * smoothstep(keep.w + 6., keep.w - 6., dp.y) : 0.;
        float k = vhs * (1. - inK);
        // tracking bands: a few horizontal bands slide sideways; one big tear rolls up the frame
        float band = floor(y * 34. + seed * 7.);
        float hb = hash12(vec2(band, seed));
        float shift = (hb - .5) * .06 * k * step(.55, hb);
        float roll = fract(seed * .37 + t * 3.1);
        float tear = exp(-pow((y - roll) / .035, 2.)) * k;
        shift += tear * .09 * (hash12(vec2(floor(y * 400.), seed)) - .2);
        float jit = (hash12(vec2(floor(y * 540.), seed + 3.)) - .5) * .004 * k;
        vec2 u2 = vec2(uv.x + shift + jit, uv.y);
        vec3 col;
        col.r = tap(u2 + vec2(.004 * k, 0.)).r;
        col.g = tap(u2).g;
        col.b = tap(u2 - vec2(.004 * k, 0.)).b;
        // head-switch noise at the bottom, white streak noise inside the tear
        float hs = smoothstep(.93, 1., y) * k;
        float nz = hash12(vec2(floor(uv.x * res.x / 3.), floor(y * res.y / 2.)) + seed * 13.);
        col = mix(col, vec3(nz), hs * .7);
        col += vec3(step(.985 - tear * .2, nz)) * tear * .8;
        col = mix(col, vec3(luma(col)), .35 * k);
        col *= 1. - .25 * k * (.5 + .5 * sin(y * 1080. * .5));
        // red flash: the frame burns signal-lost red
        col = mix(col, vec3(luma(col) * 1.2 + .25, .03, .02), red * .82);
        col = col + max(col - .7, 0.) * (gain - 1.) * 3.;
        fragColor = vec4(col, 1.);
      }`, { tSrc: { value: null }, vhs: { value: 0 }, red: { value: 0 }, seed: { value: 0 }, gain: { value: 1 }, t: { value: 0 }, res: { value: new THREE.Vector2(1920, 1080) }, keep: { value: new THREE.Vector4(0, 0, 0, 0) } });
  }
  const u = vhsMat.uniforms;
  e.c2dTex.needsUpdate = true;
  u.tSrc.value = e.c2dTex; u.vhs.value = o.vhs || 0; u.red.value = o.red || 0; u.seed.value = o.seed || 0; u.gain.value = o.gain ?? 1;
  u.t.value = t; u.res.value.set(e.W, e.H);
  const kp = o.keep || [0, 0, 0, 0]; u.keep.value.set(kp[0], kp[1], kp[2], kp[3]);
  e.pass(vhsMat, e.rtScene);
}

export { clamp, hash1, hash2, rng };
