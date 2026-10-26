// Guide-map loader for redrawn plates. A guide directory (served at /work/guides/<clip>/) holds, per drawing k:
//   lines_k.bin  engraving streamlines (tools/roto/engrave.py): int32 nlines, per line int32 n, n*(int16 x*8, int16 y*8, uint8 w)
//   tone_k.png   bilateral tone, edge_k.png XDoG contours, matte_k.png subject matte (1280x720)
// plus meta.json {start, step, n, drawings[]}. Assets load miss-driven (await in prepare), LRU-cached.
import * as THREE from 'three';

const metaCache = new Map();
const texCache = new Map();
const binCache = new Map();
const LRU = 60;

function touch(map, key, val) { map.delete(key); map.set(key, val); while (map.size > LRU) { const [k, v] = map.entries().next().value; if (v && v.dispose) v.dispose(); map.delete(k); } }

export async function meta(clip) {
  if (metaCache.has(clip)) return metaCache.get(clip);
  const m = await (await fetch(`work/guides/${clip}/meta.json`)).json();
  metaCache.set(clip, m); return m;
}

export function texture(url) {
  if (texCache.has(url)) { const t = texCache.get(url); touch(texCache, url, t); return Promise.resolve(t); }
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const t = new THREE.Texture(img); t.needsUpdate = true; t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
      touch(texCache, url, t); res(t);
    };
    img.onerror = () => rej(new Error('missing ' + url));
    img.src = url;
  });
}

// parse a lines bin into Float32Array segments [x0,y0,x1,y1,w0,w1] (design px)
export async function lines(url) {
  if (binCache.has(url)) { const v = binCache.get(url); touch(binCache, url, v); return v; }
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  let p = 0; const n = dv.getInt32(p, true); p += 4;
  const segs = [];
  let count = 0;
  const chunks = [];
  for (let i = 0; i < n; i++) {
    const m = dv.getInt32(p, true); p += 4;
    const xs = new Float32Array(m), ys = new Float32Array(m), ws = new Float32Array(m);
    for (let j = 0; j < m; j++) { xs[j] = dv.getInt16(p, true) / 8; ys[j] = dv.getInt16(p + 2, true) / 8; ws[j] = dv.getUint8(p + 4) / 255; p += 5; }
    chunks.push([xs, ys, ws]); count += m - 1;
  }
  const out = new Float32Array(count * 6); let q = 0;
  for (const [xs, ys, ws] of chunks) for (let j = 0; j < xs.length - 1; j++) {
    out[q++] = xs[j]; out[q++] = ys[j]; out[q++] = xs[j + 1]; out[q++] = ys[j + 1]; out[q++] = ws[j]; out[q++] = ws[j + 1];
  }
  const v = { segs: out, count, nlines: n };
  touch(binCache, url, v); return v;
}

// drawing index for song time t in a clip: clipTime = t - s0 + lag (+ offset of the guide's own start), on twos
export function drawingAt(m, t, s0, lag = 0) {
  const clipT = t - s0 + lag - (m.start || 0);
  let f = Math.floor(clipT * 24 + 1e-3);
  const step = m.step || 2;
  const k = Math.floor(f / step);
  return Math.max(0, Math.min(m.n - 1, k));
}
