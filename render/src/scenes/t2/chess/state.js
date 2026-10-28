// Board state at song time t: a pure function of t (and of the camera, which only the chain flights read).
// Returns every piece's transform, the chain links, the last-move/check highlights, the hand shadow and the clock state.
import { GAME } from './pgn.js';
import { plyIndexAt } from './schedule.js';
import { clamp, smooth, easeOutCubic, easeInCubic, hash1 } from '../../../util.js';

export const sqPos = (s) => [(s & 7) - 3.5, 0, 3.5 - (s >> 3)];
const BASE_R = { P: 0.25, R: 0.3, N: 0.29, B: 0.28, Q: 0.32, K: 0.33 };
export const FALL = 0.2, DROP_H = 6.5;
export const CHAIN_FIRST = 27, CHAIN_LAST = 35;   // 14...Nxe5 .. 18...Rxg2+: the captured pieces fly past the lens as a chain
export const CHAIN_T = 0.78;

const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// quaternion helpers [x, y, z, w]
export const qAxis = (ax, ang) => { const s = Math.sin(ang / 2); const n = norm(ax); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)]; };
export const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const qFromTo = (a, b) => {   // unit vectors
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (d < -0.9999) return qAxis(Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1], Math.PI);
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const q = [c[0], c[1], c[2], 1 + d]; const l = Math.hypot(...q); return q.map((x) => x / l);
};
const qY = (a) => qAxis([0, 1, 0], a);
const qRot = (q, v) => { const [x, y, z, w] = q; const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx]; };

// default facing: knights look to their owner's left (profile reads from both players' 3/4 views), turned 0.5 rad (~29 deg) back
// toward their own player (RC2, QA_RC1 #5): each side's 3/4 view sees its knights 3/4 front, and no file-side camera (the 2:26
// hand insert from the a-file) meets a knight face-on
export const KNIGHT_TURN = 0.5;
export const restYaw = (pc) => (pc.p.toUpperCase() === 'N' ? (pc.p === 'N' ? Math.PI + KNIGHT_TURN : KNIGHT_TURN) : (pc.p.toUpperCase() === 'K' ? 0 : hash1(pc.id * 7.3) * 6.283));

// capture flights -------------------------------------------------------------------------------------------------------------
// graveyards: captured black pieces line up on the table in front of White (z > 0), white ones in front of Black, lying down
function graveSpot(S, capPly) {
  const p = S.plies[capPly];
  const sameSide = S.plies.filter((q, i) => i < capPly && q.capId >= 0 && q.side === p.side && (i < CHAIN_FIRST || i > CHAIN_LAST)).length;
  const blackCaptured = p.side === 'w';
  const x = blackCaptured ? 3.4 - sameSide * 0.62 : -3.4 + sameSide * 0.62;
  return [x, 0, blackCaptured ? 5.4 : -5.4];
}

function sideFlight(S, capPly, pc, t) {
  const p = S.plies[capPly];
  const tc = p.t, dur = 0.5, u = clamp((t - tc) / dur);
  const a = sqPos(p.capSq), b = graveSpot(S, capPly);
  const pos = lerp3(a, b, easeOutCubic(u));
  const r = BASE_R[pc.p.toUpperCase()];
  pos[1] = 1.6 * 4 * u * (1 - u) + (r - 0.28) * smooth(u * 1.5);   // lands lying on the table (0.28 below the board top)
  const dir = norm([b[0] - a[0], 0, b[2] - a[2]]);
  const axis = [dir[2], 0, -dir[0]];
  const ang = (Math.PI / 2 + Math.PI * 2) * easeOutCubic(u);
  const q = qMul(qAxis(axis, -ang), qY(restYaw(pc)));
  const vel = [(b[0] - a[0]) / dur * 3 * (1 - u) * (1 - u), 1.6 * 4 * (1 - 2 * u) / dur, (b[2] - a[2]) / dur * 3 * (1 - u) * (1 - u)];
  return { pos, q, vel, done: u >= 1 };
}

// chain flight: launched off the board, then pulled into a path that runs past the lens (in camera space, so it passes the
// lens whatever the camera does)
export function chainPath(S, capPly, tau, cam) {
  const p = S.plies[capPly];
  const a = sqPos(p.capSq);
  const fromP = sqPos(p.from);
  let k = norm([a[0] - fromP[0] + 1e-3, 0, a[2] - fromP[2]]);
  const u = clamp(tau / CHAIN_T);
  const W = add(add(a, [0, 0.25 + 3.2 * u - 1.2 * u * u, 0]), k, 1.4 * u);
  const side = (capPly % 2 ? 1 : -1);
  const C = add(add(add(cam.pos, cam.right, side * (0.62 + 0.25 * hash1(capPly))), cam.up, -0.12 + 0.3 * (hash1(capPly * 3.1) - 0.5)), cam.fwd, 3.2 - 6.0 * u);
  const w = smooth((u - 0.05) / 0.75);
  return lerp3(W, C, w);
}

// RC3 (QA_RC2 #2): a piece tumbles about its base while it passes 0.6-0.9 beside the lens, so a wide one (the thick knight head)
// can reach the lens itself: the near plane then cuts into the mesh and the frame goes black (BR09's first frame). On a frame
// where the lens is inside the piece's bounding capsule (its axis from the base up HULL[P][1], radius HULL[P][0] + 0.1 for the
// near plane and the ink hull: pieces.js's geometry extents) the piece is dropped (its links still trail past). Only BR09's
// first frame meets it; render/tools/chess_lens.mjs checks every chess frame against the real meshes
const HULL = { P: [0.25, 0.77], R: [0.3, 0.93], N: [0.374, 1.09], B: [0.28, 1.16], Q: [0.32, 1.37], K: [0.33, 1.62] };
function lensInside(pos, q, P, cam) {
  const [r, h] = HULL[P];
  const ax = qRot(q, [0, 1, 0]), rel = [cam.pos[0] - pos[0], cam.pos[1] - pos[1], cam.pos[2] - pos[2]];
  const u = clamp(rel[0] * ax[0] + rel[1] * ax[1] + rel[2] * ax[2], 0, h);
  return Math.hypot(rel[0] - ax[0] * u, rel[1] - ax[1] * u, rel[2] - ax[2] * u) < r + 0.1;
}
function chainFlight(S, capPly, pc, t, cam) {
  const tc = S.plies[capPly].t, tau = t - tc;
  if (tau > CHAIN_T) return { gone: true };
  const pos = chainPath(S, capPly, tau, cam);
  const pos2 = chainPath(S, capPly, tau + 1 / 48, cam);
  const vel = [(pos2[0] - pos[0]) * 48, (pos2[1] - pos[1]) * 48, (pos2[2] - pos[2]) * 48];
  const ax = norm([hash1(capPly) - 0.5, 0.4, hash1(capPly + 9) - 0.5]);
  const q = qMul(qAxis(ax, tau * (9 + 4 * hash1(capPly * 2))), qY(restYaw(pc)));
  if (lensInside(pos, q, pc.p.toUpperCase(), cam)) return { gone: true };
  return { pos, q, vel, gone: false };
}

// links trailing behind each flying piece, spaced by arc length along its path
function chainLinks(S, capPly, t, cam, out) {
  const tc = S.plies[capPly].t, tau = t - tc;
  if (tau <= 0 || tau > CHAIN_T) return;
  const N = 56, pts = [];
  for (let i = 0; i <= N; i++) pts.push(chainPath(S, capPly, tau * (1 - i / N), cam));
  const SP = 0.2;
  let acc = 0, next = 0.32, j = 0;
  for (let i = 1; i <= N && j < 46; i++) {
    const a = pts[i - 1], b = pts[i]; const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    while (acc + L >= next && j < 46) {
      const u = (next - acc) / (L || 1);
      const p = lerp3(a, b, u);
      const tan = norm([a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
      let q = qFromTo([0, 1, 0], tan);
      if (j % 2) q = qMul(qAxis(tan, Math.PI / 2), q);
      out.push({ pos: p, q, ply: capPly, k: j });
      next += SP; j++;
    }
    acc += L;
  }
}

// ------------------------------------------------------------------------------------------------------------------------------
export function boardState(S, t, cam) {
  const pieces = GAME.pieces;
  const k = plyIndexAt(S, t);                // plies landed: 0..k
  const board = GAME.boards[k + 1];          // after k+1 plies
  const sqOfId = new Map(); board.forEach((id, s) => { if (id >= 0) sqOfId.set(id, s); });
  const capPlyOf = new Map(); S.plies.forEach((p, i) => { if (p.capId >= 0) capPlyOf.set(p.capId, i); });
  const next = S.plies[k + 1];
  const moving = next && t >= next.t0 && t < next.t ? next : null;
  const out = [];
  const slams = [];

  for (const pc of pieces) {
    const P = pc.p.toUpperCase();
    const st = { id: pc.id, type: P, white: pc.p === P, pos: v3(), q: qY(restYaw(pc)), vel: v3(), scale: [1, 1, 1], visible: true, flying: false };
    const sq = sqOfId.get(pc.id);
    // the set (post-chorus 2): a pure function of t, before the first move
    const set = S.setBySq.get(pc.home);
    if (k < 0 && !moving && set && t < set.t + 0.6) {
      const L = set.t;
      if (t < L - FALL) { st.visible = false; out.push(st); continue; }
      st.pos = sqPos(pc.home);
      if (t < L) {
        const u = (t - (L - FALL)) / FALL;
        st.pos[1] = DROP_H * (1 - u * u);
        st.vel = [0, -2 * DROP_H * u / FALL, 0];
        st.q = qMul(qY(restYaw(pc) + (1 - u) * (hash1(pc.id) - 0.5) * 2.5), [0, 0, 0, 1]);
        st.scale = [0.92, 1.12, 0.92];
      } else {
        const a = t - L;
        const sq2 = 0.34 * Math.exp(-a * 16) * Math.cos(a * 46);
        st.scale = [1 + sq2 * 0.55, 1 - sq2, 1 + sq2 * 0.55];
        slams.push({ pos: sqPos(pc.home), age: a, s: set.shout === 5 ? 0.7 : 1 });
      }
      out.push(st); continue;
    }
    if (sq !== undefined) {
      st.pos = sqPos(sq);
      // the move in progress
      if (moving && (moving.id === pc.id || (moving.rook && moving.rook.id === pc.id))) {
        const isRook = moving.rook && moving.rook.id === pc.id;
        const fr = sqPos(isRook ? moving.rook.from : moving.from), to = sqPos(isRook ? moving.rook.to : moving.to);
        let u = clamp((t - moving.t0) / (moving.t - moving.t0));
        if (isRook) u = clamp((u - 0.2) / 0.8);
        const e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
        const de = u < 0.5 ? 4 * u : 4 * (1 - u);
        const dist = Math.hypot(to[0] - fr[0], to[2] - fr[2]);
        const lift = (P === 'N' ? 0.75 : 0.32) + 0.06 * dist + (moving.capId >= 0 ? 0.15 : 0);
        st.pos = [fr[0] + (to[0] - fr[0]) * e, lift * 4 * u * (1 - u), fr[2] + (to[2] - fr[2]) * e];
        const dt = moving.t - moving.t0;
        st.vel = [(to[0] - fr[0]) * de / dt, lift * 4 * (1 - 2 * u) / dt, (to[2] - fr[2]) * de / dt];
        // a lean into the move
        const dir = norm([to[0] - fr[0] + 1e-4, 0, to[2] - fr[2]]);
        st.q = qMul(qAxis([dir[2], 0, -dir[0]], -0.35 * Math.sin(Math.PI * u)), st.q);
      } else {
        // landing squash after its last move
        const lastPly = S.plies.slice(0, k + 1).reverse().find((p) => p.id === pc.id || (p.rook && p.rook.id === pc.id));
        if (lastPly) {
          const a = t - lastPly.t;
          if (a < 0.4) { const s2 = 0.2 * Math.exp(-a * 18) * Math.cos(a * 50); st.scale = [1 + s2 * 0.5, 1 - s2, 1 + s2 * 0.5]; }
        }
      }
      out.push(st); continue;
    }
    // captured
    const cp = capPlyOf.get(pc.id);
    st.flying = true;
    if (cp >= CHAIN_FIRST && cp <= CHAIN_LAST) {
      const f = chainFlight(S, cp, pc, t, cam);
      if (f.gone) { st.visible = false; } else { st.pos = f.pos; st.q = f.q; st.vel = f.vel; st.chain = cp; }
    } else {
      const f = sideFlight(S, cp, pc, t);
      st.pos = f.pos; st.q = f.q; st.vel = f.done ? v3() : f.vel; st.flying = !f.done;
    }
    out.push(st);
  }

  const links = [];
  for (let i = CHAIN_FIRST; i <= CHAIN_LAST; i++) if (S.plies[i].capId >= 0) chainLinks(S, i, t, cam, links);

  // highlights: the last landed move (from/to), and the checked king
  const last = k >= 0 ? S.plies[k] : null;
  const hi = last ? { from: last.from, to: last.to, age: t - last.t } : null;
  let check = null;
  if (last && last.check) {
    const kid = GAME.pieces.find((p) => p.p === (last.side === 'w' ? 'k' : 'K')).id;
    check = { sq: sqOfId.get(kid), age: t - last.t };
  }

  // the hand shadow: the mover's hand hovers (moves 5-6: a full beat) then follows its piece and withdraws
  let hand = null;
  const cand = [];
  if (k + 1 < S.plies.length) cand.push(S.plies[k + 1]);
  if (k >= 0) cand.push(S.plies[k]);
  for (const p of cand) {
    if (t < p.hover0 - 0.08 || t > p.t + 0.22) continue;
    const mover = out.find((o) => o.id === p.id);
    const fr = sqPos(p.from);
    let pos = t < p.t0 ? fr : (t < p.t ? mover.pos : sqPos(p.to));
    const into = clamp((t - (p.hover0 - 0.08)) / 0.08), outk = 1 - clamp((t - p.t - 0.04) / 0.18);
    const back = clamp((t - p.t) / 0.22);
    const dz = p.side === 'w' ? 1 : -1;
    hand = { x: pos[0], z: pos[2] + dz * back * 2.2, amt: into * outk, side: p.side, hover: p.hover0 < p.t0 && t < p.t0 };
    break;
  }

  const clock = S.clockAt(t);
  return { pieces: out, links, k, last, hi, check, hand, clock, slams, moving };
}
