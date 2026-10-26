// Staunton-ish chess pieces: lathe-turned bodies (one profile per piece), a knight head extruded from a side profile, and
// top details that keep the pieces legible from straight above (king's cross, queen's coronet, rook's merlons, bishop's slit).
// Units: one board square = 1. Every geometry is non-indexed with attributes position, normal, ink (1 = drawn in ink),
// onormal (welded smooth normals for the inverted-hull outline). PROFILES are also used flat for the dive's 2D silhouette.
import * as THREE from 'three';

const SEG = 32;

function arc(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}
const D = Math.PI / 180;

// [radius, height] from the base up the outside to the axis at the top
function base(R, h) {   // shared foot: wide plinth, cove, torus
  return [[0, 0], [R, 0], [R, h * 0.28], [R * 0.97, h * 0.42], ...arc(R * 0.86, h * 0.62, h * 0.24, -40 * D, 70 * D, 4).slice(1), [R * 0.78, h * 0.9], [R * 0.7, h]];
}
export const PROFILES = {
  P: [...base(0.25, 0.13), [0.2, 0.16], [0.13, 0.36], [0.11, 0.44], [0.17, 0.47], [0.175, 0.5], [0.1, 0.53], ...arc(0, 0.64, 0.13, -58 * D, 90 * D, 9).slice(0)],
  R: [...base(0.3, 0.15), [0.23, 0.2], [0.19, 0.6], [0.24, 0.63], [0.25, 0.68], [0.25, 0.82], [0.17, 0.82], [0.17, 0.77], [0, 0.77]],
  N: [...base(0.29, 0.15), [0.24, 0.19], [0.22, 0.24], [0, 0.24]],
  B: [...base(0.28, 0.15), [0.21, 0.19], [0.13, 0.62], [0.12, 0.68], [0.19, 0.71], [0.2, 0.745], [0.12, 0.77],
    ...arc(0, 0.9, 0.15, -55 * D, 30 * D, 5), [0.07, 1.04], [0.03, 1.08], ...arc(0, 1.115, 0.045, -45 * D, 90 * D, 4)],
  Q: [...base(0.32, 0.16), [0.25, 0.21], [0.14, 0.78], [0.13, 0.85], [0.21, 0.88], [0.215, 0.92], [0.14, 0.95], [0.16, 1.05],
    [0.23, 1.17], [0.2, 1.19], [0.12, 1.16], ...arc(0, 1.17, 0.12, 0, 60 * D, 3).slice(1), [0.05, 1.27], ...arc(0, 1.31, 0.055, -60 * D, 90 * D, 4)],
  K: [...base(0.33, 0.16), [0.26, 0.21], [0.15, 0.86], [0.14, 0.93], [0.22, 0.96], [0.225, 1.0], [0.15, 1.03], [0.17, 1.13],
    [0.24, 1.26], [0.22, 1.29], [0.12, 1.3], [0.12, 1.33], [0.06, 1.35], [0, 1.35]],
};
// crown balls of the queen (8 around the rim) and the king's cross, for the silhouette
export const QUEEN_BALLS = { n: 8, r: 0.2, y: 1.2, size: 0.042 };
export const KING_CROSS = { y0: 1.33, y1: 1.62, w: 0.075, arm: 0.21, armY: 1.5, armH: 0.07 };
export const HEIGHT = { P: 0.77, R: 0.82, N: 1.0, B: 1.16, Q: 1.37, K: 1.62 };

function lathe(pts) {
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)), SEG);
  return g;
}

function withInk(g, v) {
  const n = g.attributes.position.count;
  g.setAttribute('ink', new THREE.Float32BufferAttribute(new Float32Array(n).fill(v), 1));
  return g;
}

function prep(g, ink = 0) {
  let x = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
  if (!x.attributes.normal) x.computeVertexNormals();
  return withInk(x, ink);
}

export function merge(list) {
  const parts = list.map((g) => (g.attributes.ink ? g : prep(g)));
  const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const [k, sz] of [['position', 3], ['normal', 3], ['ink', 1]]) {
    const arr = new Float32Array(n * sz); let o = 0;
    for (const g of parts) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.Float32BufferAttribute(arr, sz));
  }
  return out;
}

// welded, area-weighted smooth normals (for the outline hull: split normals would crack it at hard edges)
export function addOutlineNormals(g) {
  const p = g.attributes.position.array, n = p.length / 3;
  const key = (i) => `${Math.round(p[i * 3] * 2000)},${Math.round(p[i * 3 + 1] * 2000)},${Math.round(p[i * 3 + 2] * 2000)}`;
  const acc = new Map(); const keys = new Array(n); const nn = g.attributes.normal.array;
  for (let i = 0; i < n; i++) {
    const k = keys[i] = key(i);
    const v = acc.get(k) || [0, 0, 0]; v[0] += nn[i * 3]; v[1] += nn[i * 3 + 1]; v[2] += nn[i * 3 + 2]; acc.set(k, v);
  }
  const on = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = acc.get(keys[i]); const l = Math.hypot(v[0], v[1], v[2]) || 1; on[i * 3] = v[0] / l; on[i * 3 + 1] = v[1] / l; on[i * 3 + 2] = v[2] / l; }
  g.setAttribute('onormal', new THREE.Float32BufferAttribute(on, 3));
  g.computeBoundingSphere();
  return g;
}

function box(w, h, d, x, y, z, ry = 0, rz = 0, ink = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return prep(g, ink);
}
function ball(r, x, y, z, ink = 0, ws = 10, hs = 7) { const g = new THREE.SphereGeometry(r, ws, hs); g.translate(x, y, z); return prep(g, ink); }

// knight head: side profile, x forward (toward the muzzle), y up
export const KNIGHT_HEAD = [
  [-0.2, 0.2], [-0.235, 0.36], [-0.225, 0.52], [-0.17, 0.7], [-0.1, 0.84], [-0.07, 0.97], [-0.03, 1.0], [0.0, 0.93],
  [0.05, 0.89], [0.14, 0.84], [0.23, 0.72], [0.31, 0.6], [0.335, 0.53], [0.31, 0.49], [0.24, 0.48], [0.17, 0.5],
  [0.1, 0.52], [0.06, 0.47], [0.07, 0.38], [0.15, 0.3], [0.2, 0.2],
];

function knight() {
  const sh = new THREE.Shape(KNIGHT_HEAD.map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = 0.2;
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.035, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  const head = prep(g);
  // mane: a ridge of small blocks down the back of the neck; eyes in ink
  const mane = [];
  for (let i = 0; i < 4; i++) { const u = i / 3; mane.push(box(0.05, 0.1, 0.08, -0.2 - 0.035 + u * 0.09, 0.44 + u * 0.3, 0, 0, -0.5 - u * 0.4)); }
  const eyes = [ball(0.026, 0.12, 0.74, 0.145, 1, 8, 6), ball(0.026, 0.12, 0.74, -0.145, 1, 8, 6)];
  return merge([prep(lathe(PROFILES.N)), head, ...mane, ...eyes]);
}

export function buildGeometries() {
  const G = {};
  G.P = merge([prep(lathe(PROFILES.P))]);
  const merl = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; merl.push(box(0.14, 0.11, 0.08, Math.cos(a) * 0.205, 0.875, Math.sin(a) * 0.205, -a + Math.PI / 2)); }
  G.R = merge([prep(lathe(PROFILES.R)), ...merl]);
  G.N = knight();
  // bishop's mitre slit: an ink blade through the head, tilted
  G.B = merge([prep(lathe(PROFILES.B)), box(0.025, 0.2, 0.33, 0.035, 0.94, 0, 0, -0.55, 1)]);
  const crown = [];
  for (let i = 0; i < QUEEN_BALLS.n; i++) { const a = i / QUEEN_BALLS.n * Math.PI * 2; crown.push(ball(QUEEN_BALLS.size, Math.cos(a) * QUEEN_BALLS.r, QUEEN_BALLS.y, Math.sin(a) * QUEEN_BALLS.r, 0, 8, 6)); }
  G.Q = merge([prep(lathe(PROFILES.Q)), ...crown]);
  const C = KING_CROSS;
  G.K = merge([prep(lathe(PROFILES.K)), box(C.w, C.y1 - C.y0, C.w, 0, (C.y0 + C.y1) / 2, 0), box(C.arm, C.armH, C.w, 0, C.armY, 0)]);
  for (const k of Object.keys(G)) addOutlineNormals(G[k]);
  return G;
}

// chain link: an elongated torus
export function linkGeometry() {
  const g = new THREE.TorusGeometry(0.1, 0.032, 6, 14);
  g.scale(1, 1.55, 1);
  return addOutlineNormals(merge([prep(g)]));
}
