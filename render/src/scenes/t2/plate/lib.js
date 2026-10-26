// Plate toolkit internals shared by t2_plate / t2_still / t2_split / the overlays: picks2.json, plate meta, a miss-driven LRU texture
// cache, scratch render targets, a copy pass, eases and the plate-time maths. Pixels never depend on cache state: prepare() awaits
// every texture a frame needs before draw() runs.
import * as THREE from 'three';
import { clamp, smooth, smoother, easeInOutCubic, easeOutCubic, easeInCubic, easeOutExpo } from '../../../util.js';

// ---------- picks2.json ----------
let picksP = null;
export function picks2() {
  if (!picksP) picksP = fetch('data/picks2.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return picksP;
}

// resolve {clip: ID} | {dir} | {img} (an id or a path) -> {dir, in, lag, kind, file?}
export async function resolveSource(ref) {
  if (!ref) throw new Error('t2 plate: no clip/dir/img');
  if (typeof ref === 'object') return ref;
  const pk = await picks2();
  if (pk[ref]) return { in: 0, lag: 0, ...pk[ref] };
  if (/\.(jpe?g|png|webp)$/i.test(ref)) return { file: ref, kind: 'still', in: 0, lag: 0 };
  if (ref.startsWith('work/') || ref.includes('/')) return { dir: ref, in: 0, lag: 0 };
  return { dir: `work/plates/${ref}`, in: 0, lag: 0 };
}

const metaCache = new Map();
export async function plateMeta(dir) {
  if (metaCache.has(dir)) return metaCache.get(dir);
  const pr = fetch(`${dir}/meta.json`).then((r) => { if (!r.ok) throw new Error(`missing ${dir}/meta.json`); return r.json(); });
  metaCache.set(dir, pr);
  try { return await pr; } catch (e) { metaCache.delete(dir); throw e; }
}

// ---------- textures (LRU, miss-driven) ----------
const LRU = 40;
const texCache = new Map();   // url -> Promise<Texture>
export function loadTex(url) {
  if (texCache.has(url)) { const v = texCache.get(url); texCache.delete(url); texCache.set(url, v); return v; }
  const pr = new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const t = new THREE.Texture(img); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true; res(t);
    };
    img.onerror = () => rej(new Error('missing ' + url));
    img.src = url;
  });
  texCache.set(url, pr);
  pr.catch(() => texCache.delete(url));
  while (texCache.size > LRU) {
    const [k, v] = texCache.entries().next().value; texCache.delete(k);
    v.then((t) => t.dispose()).catch(() => {});
  }
  return pr;
}
export const pad5 = (k) => String(k).padStart(5, '0');

export const BLACK = (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); t.needsUpdate = true; return t; })();
export const WHITE = (() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })();

// ---------- plate time ----------
// Film frame of the shot on twos (MGP drawingAt: count twos in FILM frames, so retimed clips hold evenly), then clip time.
// in: source-clip seconds at the shot start (picks2 `in`, or p.in); lag adds; rate scales; reverse runs backward.
// p.at (source seconds, number or fn(lt)) overrides everything (scrubs, rewinds). Returns a frame index clamped to [0, n-1].
export function plateFrame(meta, src, p, lt) {
  if ((meta.n || 1) <= 1) return 0;
  const fps = meta.fps || 24;
  let clipT;
  if (p.at !== undefined && p.at !== null) clipT = typeof p.at === 'function' ? p.at(lt) : p.at;
  else {
    let ff = Math.floor(lt * 24 + 1e-3);
    if (p.twos !== false) ff -= ((ff % 2) + 2) % 2;
    const lt2 = ff / 24;
    const inT = (p.in ?? src.in ?? meta.start ?? 0) + (p.lag ?? src.lag ?? 0);
    const rate = p.rate ?? 1;
    clipT = inT + (p.reverse ? -1 : 1) * lt2 * rate;
  }
  const f = Math.floor((clipT - (meta.start || 0)) * fps + 1e-3);
  return Math.max(0, Math.min(meta.n - 1, f));
}

// ---------- render targets ----------
const HALF = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };
export function rt(e, key, scale = 1) {
  e.__t2rt = e.__t2rt || {};
  const k = `${key}@${scale}`;
  if (!e.__t2rt[k]) e.__t2rt[k] = new THREE.WebGLRenderTarget(Math.max(1, Math.round(e.W * scale)), Math.max(1, Math.round(e.H * scale)), HALF);
  return e.__t2rt[k];
}
let matCopy = null;
export function copy(e, srcTex, target) {
  if (!matCopy) matCopy = e.shader('uniform sampler2D tSrc; void main(){ fragColor = texture(tSrc, vUv); }', { tSrc: { value: null } });
  matCopy.uniforms.tSrc.value = srcTex;
  e.pass(matCopy, target);
}
// draw a texture into target, as-is (over = alpha blend)
export function put(e, srcTex, target, over = false) {
  if (!matCopy) copy(e, BLACK, rt(e, 'dummy', 0.01));
  matCopy.uniforms.tSrc.value = srcTex;
  if (over) e.passOver(matCopy, target, 'normal'); else e.pass(matCopy, target);
}

// ---------- values over a shot ----------
export const EASES = { linear: (x) => clamp(x), smooth, smoother, inOut: easeInOutCubic, out: easeOutCubic, in: easeInCubic, expo: easeOutExpo,
  sine: (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x)) };
// u: 0..1 progress (already eased). animNum: number | [from, to]. animVec: [x, y] | [[x0, y0], [x1, y1]] (| more keys, evenly spaced)
export function animNum(v, u, def) {
  if (v === undefined || v === null) return def;
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) { const n = v.length - 1; const x = clamp(u) * n; const i = Math.min(n - 1, Math.floor(x)); return v[i] + (v[i + 1] - v[i]) * (x - i); }
  return def;
}
export function animVec(v, u, def) {
  if (v === undefined || v === null) return def;
  if (!Array.isArray(v[0])) return v;
  const n = v.length - 1; if (n < 1) return v[0];
  const x = clamp(u) * n; const i = Math.min(n - 1, Math.floor(x)); const f = x - i;
  return [v[i][0] + (v[i + 1][0] - v[i][0]) * f, v[i][1] + (v[i + 1][1] - v[i][1]) * f];
}

// grade param -> vec3 array
export const v3 = (x, d) => (x === undefined || x === null ? [d, d, d] : typeof x === 'number' ? [x, x, x] : x);

// stable per-shot seed
export function seedOf(shot, p) {
  if (p && p.seed !== undefined) return p.seed;
  const s = String((shot && shot.id) || 'x');
  let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 99991;
  return (h % 997) + 1;
}

// the look block most plate shots want: no ACES (plates are display-referred already), little bloom, light grain
export const PLATE_LOOK = { tonemap: 0, bloom: 0.18, bloomThreshold: 0.92, halation: 0.12, vignette: 0.18, grain: 0.025, typeGlow: 0.2 };
