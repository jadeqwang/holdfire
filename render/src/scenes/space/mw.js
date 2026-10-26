// The Milky Way model shared by the space scenes (galaxy, phyllo): a star field built from the Reid et al. 2019 arm model
// (data/milkyway.json), the 610 civilizations (fiction, seeded), the hunters of the Build, the contact graph, and the
// Vogel phyllotaxis layout the worlds glide into at the drop.
//
// Units: kpc. Galactic (x, y) as in milkyway.json (GC at origin, Sun at (0, 8.15), viewed from the North Galactic Pole the
// disk turns clockwise). World (three.js) = (x, h, -y): a camera above (+Y) with up = -Z sees the data's map with y up.
// The measured arm segments come straight from the data; beyond the maser-traced beta range the arms are extrapolated
// (pitch blending to 13 deg outward, 22 deg inward to the bar). That part is artistic, as the data file says.
import { rng, clamp, lerp } from '../../util.js';

const D2R = Math.PI / 180;
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

export const MW = { ready: false };

// ---------------------------------------------------------------- arms
function armCurve(a, o = {}) {
  const PS = o.PS ?? 13, PSin = o.PSin ?? 22, blend = o.blend ?? 30, rmin = o.rmin ?? 3.2, rmax = o.rmax ?? 15.5;
  const ext = o.ext ?? 170, extin = o.extin ?? 110;
  const bk = a.beta_kink;
  const psi = (b) => {
    const p = b < bk ? a.psi_lt : a.psi_gt;
    if (b < a.beta_min) return p + (PS - p) * sm((a.beta_min - b) / blend);
    if (b > a.beta_max) return p + (PSin - p) * sm((b - a.beta_max) / blend);
    return p;
  };
  let pts = [];
  for (const dir of [-1, 1]) {
    let b = bk, l = Math.log(a.R_kink); const seg = [];
    for (;;) {
      const R = Math.exp(l);
      const meas = b >= a.beta_min && b <= a.beta_max;
      // strength: full on the measured segment, fading along the extrapolation
      const out = b < a.beta_min ? (a.beta_min - b) / ext : b > a.beta_max ? (b - a.beta_max) / extin : 0;
      seg.push({ b, R, meas, s: 1 - 0.6 * sm(out), x: R * Math.sin(b * D2R), y: R * Math.cos(b * D2R) });
      if (R > rmax || R < rmin || b < a.beta_min - ext || b > a.beta_max + extin) break;
      const db = 0.5 * dir;
      l += -Math.tan(psi(b) * D2R) * db * D2R;
      b += db;
    }
    if (dir < 0) pts = seg.reverse(); else pts = pts.concat(seg.slice(1));
  }
  // arc length
  let L = 0; pts[0].u = 0;
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].u = L; }
  return { key: a.key, name: a.name, major: a.major, width: a.width, pts, L };
}

// point on an arm at arc length u: position, unit tangent, unit normal pointing toward the galactic centre, strength
function armAt(arm, u) {
  const P = arm.pts; let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].u <= u) lo = m; else hi = m; }
  const a = P[lo], b = P[hi]; const f = clamp((u - a.u) / Math.max(1e-6, b.u - a.u));
  const x = lerp(a.x, b.x, f), y = lerp(a.y, b.y, f);
  let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
  let nx = -ty, ny = tx; if (nx * x + ny * y > 0) { nx = -nx; ny = -ny; }   // inward normal
  return { x, y, tx, ty, nx, ny, s: lerp(a.s, b.s, f), R: Math.hypot(x, y), meas: a.meas && b.meas };
}

function gauss(R) { let u = 0; while (u === 0) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }

// ---------------------------------------------------------------- build
export async function loadMW() {
  if (MW.ready) return MW;
  const d = await fetch('data/milkyway.json').then((r) => r.json());
  build(d);
  MW.ready = true;
  return MW;
}

function build(d) {
  MW.data = d;
  MW.sun = d.coordinate_frame.sun_xy_kpc;                       // [0, 8.15]
  MW.hz = [d.scale_facts.galactic_habitable_zone.inner_kpc, d.scale_facts.galactic_habitable_zone.outer_kpc];
  const arms = [];
  for (const a of d.arms) {
    if (a.key === '3kpc') continue;
    if (a.major) arms.push(armCurve(a));
    else arms.push(armCurve(a, { ext: 22, extin: 22, rmin: 6, rmax: 11 }));   // the Local Arm: a spur, barely extended
  }
  MW.arms = arms;
  const BAR = 27 * D2R;                                            // bar: near end at positive longitude
  MW.barDir = [Math.sin(BAR), Math.cos(BAR)];

  // ---- stars: Float32Array [x, h, z(world), size, r, g, b, bright]
  const R = rng(1919);
  const N = 58000;
  const st = new Float32Array(N * 8);
  let n = 0;
  const put = (x, y, h, size, col, br) => {
    if (n >= N) return;
    const o = n * 8; st[o] = x; st[o + 1] = h; st[o + 2] = -y; st[o + 3] = size; st[o + 4] = col[0]; st[o + 5] = col[1]; st[o + 6] = col[2]; st[o + 7] = br; n++;
  };
  const ICE = [0.78, 0.87, 1.0], WHITE = [1.0, 0.97, 0.92], CREAM = [1.0, 0.9, 0.74], WARM = [1.0, 0.78, 0.5];
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const bright = () => 0.12 + Math.pow(R(), 8) * 3.2;
  // bulge: a boxy triaxial cloud along the bar, warm
  for (let i = 0; i < 9000; i++) {
    const a = gauss(R) * 1.15, b = gauss(R) * 0.55, h = gauss(R) * 0.42;
    const x = a * MW.barDir[0] + b * MW.barDir[1], y = a * MW.barDir[1] - b * MW.barDir[0];
    const r = Math.hypot(a, b);
    put(x, y, h * Math.exp(-r / 4), 0.9, mixc(WARM, CREAM, R() * 0.6), 0.1 + Math.pow(R(), 7) * 1.2);
  }
  // the long bar
  for (let i = 0; i < 3500; i++) {
    const a = (R() * 2 - 1) * 4.4, b = gauss(R) * 0.38, h = gauss(R) * 0.12;
    const x = a * MW.barDir[0] + b * MW.barDir[1], y = a * MW.barDir[1] - b * MW.barDir[0];
    put(x, y, h, 0.9, mixc(CREAM, WARM, R() * 0.5), 0.1 + Math.pow(R(), 7) * 1.0);
  }
  // old disk: exponential, scale length 2.6 kpc, faint
  for (let i = 0; i < 15000; i++) {
    const r = 1.2 + (-Math.log(1 - R() * 0.995)) * 2.9; if (r > 17) continue;
    const th = R() * Math.PI * 2;
    put(Math.cos(th) * r, Math.sin(th) * r, gauss(R) * 0.22, 0.85, mixc(CREAM, WHITE, R()), 0.1 + Math.pow(R(), 8) * 1.0);
  }
  // arms: young stars, ice-white; a dust lane on the inner (concave) edge thins them
  const ARMW = { sctcen: 1.35, perseus: 1.3, sgrcar: 0.8, norma: 0.75, outer: 0.42, local: 0.45 };
  const W = arms.map((a) => a.L * (ARMW[a.key] ?? 0.6));
  const Wsum = W.reduce((s, x) => s + x, 0);
  const pickArm = () => { let r = R() * Wsum; for (let i = 0; i < arms.length; i++) { r -= W[i]; if (r <= 0) return arms[i]; } return arms[arms.length - 1]; };
  // along-arm clumping: a smooth hashed noise in arc length (kpc), so arms break into knots and gaps
  const hz = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const nz = (u, seed) => { const i = Math.floor(u), f = u - i, w = f * f * (3 - 2 * f); return lerp(hz(i + seed * 57), hz(i + 1 + seed * 57), w); };
  const clump = (arm, u) => { const a = nz(u / 0.9, arms.indexOf(arm) + 1), b = nz(u / 0.33, arms.indexOf(arm) + 11); return 0.25 + 0.75 * Math.pow(a * 0.7 + b * 0.3, 1.6); };
  let guard = 0;
  const NK = 160, knotsAt = N - 600 - NK * 22;
  while (n < knotsAt && guard++ < 600000) {
    const arm = pickArm();
    const u = R() * arm.L;
    const q = armAt(arm, u);
    if (R() > q.s * clump(arm, u)) continue;
    const sig = Math.max(0.2, arm.width * 0.8) * (0.5 + 0.4 * q.R / 8) * (0.6 + 0.8 * nz(u / 1.7, 31));
    const off = gauss(R) * sig;
    const lane = Math.exp(-Math.pow((off / sig - 0.6) / 0.3, 2));    // inner-edge dust lane (off>0 is inward)
    if (R() < lane * 0.92) continue;
    const along = gauss(R) * 0.15;
    const x = q.x + q.nx * off + q.tx * along, y = q.y + q.ny * off + q.ty * along;
    const young = Math.exp(-Math.abs(off) / sig);
    put(x, y, gauss(R) * 0.07, 0.9, mixc(WHITE, ICE, young * 0.7), (0.4 + 0.6 * young) * bright());
  }
  // star-forming knots: tight clusters of young stars strung along the arms' outer edges
  for (let k = 0; k < NK; k++) {
    const arm = pickArm(); const u = R() * arm.L; const q = armAt(arm, u);
    if (q.R < 3.5) continue;
    const off = -Math.abs(gauss(R)) * 0.25;
    const cx = q.x + q.nx * off, cy = q.y + q.ny * off, m = 10 + Math.floor(R() * 22);
    for (let j = 0; j < m; j++) put(cx + gauss(R) * 0.07, cy + gauss(R) * 0.07, gauss(R) * 0.03, 0.8, mixc(WHITE, ICE, 0.8), 0.35 + Math.pow(R(), 4) * 1.6);
  }
  // a sprinkle of bright giants
  for (let i = 0; i < 600 && n < N; i++) {
    const arm = pickArm(); const q = armAt(arm, R() * arm.L);
    const off = gauss(R) * 0.5;
    put(q.x + q.nx * off, q.y + q.ny * off, gauss(R) * 0.08, 1.3, R() < 0.7 ? ICE : CREAM, 1.2 + Math.pow(R(), 2) * 3.0);
  }
  MW.stars = st.subarray(0, n * 8); MW.nStars = n;

  // ---- the 610 worlds (fiction: seeded): in the galactic habitable zone, preferentially on the arms. Node 0 is Earth.
  const RC = rng(610);
  const NW = 610;
  const worlds = [{ x: MW.sun[0], y: MW.sun[1], h: 0.01 }];
  const inHZ = (r) => { const [a, b] = MW.hz; const m = r < a ? (a - r) / 0.7 : r > b ? (r - b) / 0.7 : 0; return Math.exp(-m * m); };
  const minSep = 0.32;
  guard = 0;
  while (worlds.length < NW && guard++ < 200000) {
    let x, y;
    if (RC() < 0.8) {
      const arm = arms[Math.floor(RC() * arms.length)];
      const q = armAt(arm, RC() * arm.L);
      const off = gauss(RC) * Math.max(0.25, arm.width) * 0.9;
      x = q.x + q.nx * off; y = q.y + q.ny * off;
    } else { const r = lerp(6.4, 9.6, RC()), th = RC() * Math.PI * 2; x = Math.cos(th) * r; y = Math.sin(th) * r; }
    const r = Math.hypot(x, y);
    if (RC() > inHZ(r)) continue;
    let ok = true;
    for (const w of worlds) { if ((w.x - x) * (w.x - x) + (w.y - y) * (w.y - y) < minSep * minSep) { ok = false; break; } }
    if (!ok) continue;
    worlds.push({ x, y, h: gauss(RC) * 0.06 });
  }
  MW.worlds = worlds;
  // the hunters (fiction): worlds that fire. Wider radial spread; they never make it very far.
  const RH = rng(377);
  const hunters = [];
  guard = 0;
  while (hunters.length < 377 && guard++ < 200000) {
    const arm = arms[Math.floor(RH() * arms.length)];
    const q = armAt(arm, RH() * arm.L);
    if (q.R < 4.5 || q.R > 13) continue;
    const off = gauss(RH) * Math.max(0.25, arm.width);
    const x = q.x + q.nx * off, y = q.y + q.ny * off;
    let ok = true;
    for (const w of worlds) { if ((w.x - x) ** 2 + (w.y - y) ** 2 < 0.09) { ok = false; break; } }
    if (!ok) continue;
    hunters.push({ x, y, h: gauss(RH) * 0.06, seed: RH() });
  }
  MW.hunters = hunters;

  // ---- contact graph on the galaxy positions: Euclidean MST (every world reachable from Earth) + 2 nearest neighbours
  MW.graph = contactGraph(worlds);
  // ---- phyllotaxis layout (Vogel 1979): node n at r = c*sqrt(n), angle n*137.508 deg. Node 0 (Earth) sits at the centre.
  // Assignment: rank worlds by distance from Earth (radius rank), then within blocks of 34 match by angle around Earth,
  // so the glide is a gentle swirl rather than a scramble.
  phyllotaxis();
}

function contactGraph(W) {
  const n = W.length, edges = [], seen = new Set();
  const dist = (a, b) => Math.hypot(W[a].x - W[b].x, W[a].y - W[b].y);
  const add = (a, b) => { const k = a < b ? a * 4096 + b : b * 4096 + a; if (seen.has(k)) return; seen.add(k); edges.push({ a, b, d: dist(a, b) }); };
  const inT = new Uint8Array(n), best = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1);
  best[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i;
    inT[u] = 1; if (from[u] >= 0) add(from[u], u);
    for (let v = 0; v < n; v++) if (!inT[v]) { const dd = dist(u, v); if (dd < best[v]) { best[v] = dd; from[v] = u; } }
  }
  for (let a = 0; a < n; a++) {
    const near = [];
    for (let b = 0; b < n; b++) if (b !== a) near.push([b, dist(a, b)]);
    near.sort((x, y) => x[1] - y[1]);
    for (const [b, dd] of near.slice(0, 2)) if (dd < 1.6) add(a, b);
  }
  // reveal order: graph distance from Earth (Dijkstra)
  const adj = Array.from({ length: n }, () => []);
  for (const e of edges) { adj[e.a].push([e.b, e.d]); adj[e.b].push([e.a, e.d]); }
  const D = new Float64Array(n).fill(Infinity), done = new Uint8Array(n); D[0] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || D[i] < D[u])) u = i;
    done[u] = 1; for (const [v, dd] of adj[u]) if (D[u] + dd < D[v]) D[v] = D[u] + dd;
  }
  const maxD = Math.max(...D);
  for (const e of edges) {
    // draw each link from the end nearer to Earth
    if (D[e.b] < D[e.a]) { const t = e.a; e.a = e.b; e.b = t; }
    e.r0 = D[e.a] / maxD; e.r1 = (D[e.a] + e.d) / maxD;
  }
  return { edges, reveal: Array.from(D, (x) => x / maxD) };
}

export const GOLDEN = 137.50776405 * D2R;
function phyllotaxis() {
  const W = MW.worlds, n = W.length;
  const ex = W[0].x, ey = W[0].y;
  const idx = [...Array(n).keys()].slice(1).sort((a, b) => Math.hypot(W[a].x - ex, W[a].y - ey) - Math.hypot(W[b].x - ex, W[b].y - ey));
  const slot = new Int32Array(n); slot[0] = 0;
  const B = 34;
  const angW = (i) => Math.atan2(W[i].y - ey, W[i].x - ex);
  const angS = (k) => { const a = (k * GOLDEN) % (Math.PI * 2); return a > Math.PI ? a - Math.PI * 2 : a; };
  for (let s = 0; s < idx.length; s += B) {
    const nodes = idx.slice(s, s + B).sort((a, b) => angW(a) - angW(b));
    const slots = []; for (let k = 1 + s; k < 1 + s + nodes.length; k++) slots.push(k);
    slots.sort((a, b) => angS(a) - angS(b));
    // rotate the matching to minimise angular travel
    let bestR = 0, bestC = Infinity;
    for (let r = 0; r < nodes.length; r++) {
      let c = 0; for (let i = 0; i < nodes.length; i++) { let d = Math.abs(angW(nodes[i]) - angS(slots[(i + r) % nodes.length])); if (d > Math.PI) d = 2 * Math.PI - d; c += d; }
      if (c < bestC) { bestC = c; bestR = r; }
    }
    for (let i = 0; i < nodes.length; i++) slot[nodes[i]] = slots[(i + bestR) % nodes.length];
  }
  // world -> phyllotaxis index, and back
  const of = new Int32Array(n); for (let i = 0; i < n; i++) of[slot[i]] = i;
  MW.vslot = slot;      // world i sits at Vogel index vslot[i]
  MW.vworld = of;       // Vogel index k is world vworld[k]
  // unit-disk Vogel coordinates (r = sqrt((k + .5) / n)), angle measured in the galactic plane
  const V = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) { const r = Math.sqrt((k + 0.5) / n), a = k * GOLDEN; V[k * 2] = Math.cos(a) * r; V[k * 2 + 1] = Math.sin(a) * r; }
  V[0] = 0; V[1] = 0;
  MW.vogel = V;
  // lattice neighbour graph on the disk (4 nearest), BFS depth from the centre (Earth)
  const nb = Array.from({ length: n }, () => new Set());
  for (let a = 0; a < n; a++) {
    const near = [];
    for (let b = 0; b < n; b++) if (b !== a) near.push([b, (V[a * 2] - V[b * 2]) ** 2 + (V[a * 2 + 1] - V[b * 2 + 1]) ** 2]);
    near.sort((x, y) => x[1] - y[1]);
    for (const [b] of near.slice(0, 4)) { nb[a].add(b); nb[b].add(a); }
  }
  const depth = new Int32Array(n).fill(-1), parent = new Int32Array(n).fill(-1); depth[0] = 0;
  const q = [0]; const tree = [];
  while (q.length) { const u = q.shift(); for (const v of nb[u]) if (depth[v] < 0) { depth[v] = depth[u] + 1; parent[v] = u; tree.push([u, v]); q.push(v); } }
  const lat = [];
  for (let a = 0; a < n; a++) for (const b of nb[a]) if (a < b) { const [u, v] = depth[a] <= depth[b] ? [a, b] : [b, a]; lat.push({ a: u, b: v, d0: depth[u], d1: depth[v] }); }
  MW.lattice = { edges: lat, depth, maxDepth: Math.max(...depth), parent };
}

// family F links on the Vogel indices: chains k, k+F, k+2F, ... (exactly F chains => F spiral arms)
export function familyChains(F, n = 610) {
  const chains = [];
  for (let k = 0; k < F; k++) { const c = []; for (let m = k; m < n; m += F) c.push(m); chains.push(c); }
  return chains;
}

export { armAt };
