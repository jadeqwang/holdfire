// The contact graph drawn into the galaxy batches (core.js): 610 worlds (fiction), links of the Euclidean MST + 2 nearest
// neighbours, revealed by graph distance from Earth. Callers pass per-link and per-world functions so every scene can
// light, flicker, burn or gather it in its own way.
import { G, W3 } from './core.js';
import { MW } from './mw.js';
import { C } from './common.js';

// o.link(e, k) -> null | {I, f (draw fraction), col, w, ga, gb}; o.node(i) -> null | {I, col, r, halo, ring}
export function drawWeb(o) {
  const W = MW.worlds, L = G.lines, S = G.sprites;
  if (o.link) {
    const E = MW.graph.edges;
    for (let k = 0; k < E.length; k++) {
      const e = E[k]; const q = o.link(e, k); if (!q || q.I <= 0.002) continue;
      const a = W[e.a], b = W[e.b];
      const A = W3(a.x, a.y, a.h), B = W3(b.x, b.y, b.h);
      const col = q.col || C.gold;
      L.add(A[0], A[1], A[2], B[0], B[1], B[2], q.w ?? 2.0, col[0], col[1], col[2], q.I, q.f ?? 1, q.ga ?? 1, q.gb ?? 1);
    }
  }
  if (o.node) {
    for (let i = 0; i < W.length; i++) {
      const q = o.node(i); if (!q || q.I <= 0.002) continue;
      const w = W[i]; const [x, y, z] = W3(w.x, w.y, w.h);
      const col = q.col || (i === 0 ? C.pale : C.gold);
      S.add(x, y, z, q.r ?? (i === 0 ? 2.1 : 1.8), col[0], col[1], col[2], q.I, q.halo ?? 9, q.ring ?? 0);
    }
  }
}

// a long link (hub graph, or any two worlds) with a bright travelling head while it draws on
export function drawLink(ia, ib, f, I, col = C.gold, w = 2.2, head = 0) {
  const W = MW.worlds, a = W[ia], b = W[ib];
  const A = W3(a.x, a.y, a.h), B = W3(b.x, b.y, b.h);
  G.lines.add(A[0], A[1], A[2], B[0], B[1], B[2], w, col[0], col[1], col[2], I, f, 1, 1);
  if (head > 0 && f > 0 && f < 1) {
    const x = A[0] + (B[0] - A[0]) * f, y = A[1] + (B[1] - A[1]) * f, z = A[2] + (B[2] - A[2]) * f;
    G.sprites.add(x, y, z, 1.6, C.goldHot[0], C.goldHot[1], C.goldHot[2], head, 12);
  }
}

// rank of each world in reveal order (graph distance from Earth)
export function revealRank() {
  if (MW.__rank) return MW.__rank;
  const R = MW.graph.reveal; const o = [...R.keys()].sort((a, b) => R[a] - R[b]);
  const rk = new Int32Array(o.length); o.forEach((w, r) => { rk[w] = r; });
  MW.__rank = rk; return rk;
}
