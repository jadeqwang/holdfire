// Camera presets and the default choreography for t2_chess. A camera is {pos, target, fov, up?}; every preset is a pure
// function of t. p.cam = preset name | {pos, target, fov} | [{t, cam, cut?}, ...] keyframes (eased between keys; cut: true jumps).
import { clamp, lerp, smooth, smoother, easeInOutCubic, easeInCubic, hash1, noise1 } from '../../../util.js';
import { sqPos } from './state.js';
import { GAME, sqOf } from './pgn.js';

const rotY = (v, a, c = [0, 0, 0]) => { const x = v[0] - c[0], z = v[2] - c[2]; const cs = Math.cos(a), sn = Math.sin(a); return [c[0] + x * cs + z * sn, v[1], c[2] - x * sn + z * cs]; };
const L3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
export const CLOCK_POS = [5.75, 0, 0.0];
export const SHEET_POS = [-5.7, 0, 1.3];

// orbit helper: azimuth 0 = White's side (+z), positive = toward the h-file (+x)
const orbit = (az, r, y, target = [0, 0, 0]) => [target[0] + Math.sin(az) * r, y, target[2] + Math.cos(az) * r];

function focusSq(p, st) {
  const f = p.focus ?? 'mover';
  if (typeof f === 'string' && /^[a-h][1-8]$/.test(f)) return sqPos(sqOf(f));
  if (f === 'mover' && st) { const ply = st.moving || st.last; if (ply) { const pc = st.pieces.find((o) => o.id === ply.id); return pc ? pc.pos : sqPos(ply.to); } }
  if (f === 'queen' && st) { const pc = st.pieces.find((o) => o.id === GAME.pieces.find((q) => q.p === 'q').id); return pc.pos; }
  return [0, 0, 0];
}

export const PRESETS = {
  // establishing: board, clock and scoresheet, from White's side and above
  wide: (t, p) => ({ pos: [7.0, 9.6, 12.4], target: [0.3, -0.6, 0.2], fov: 37 }),
  // straight down, White at the bottom: every square, the clock (right) and the scoresheet (left) readable
  top: () => ({ pos: [0, 26, 0.0001], target: [0, 0, 0], fov: 25.5, up: [0, 0, -1] }),
  topB: () => ({ pos: [0, 26, -0.0001], target: [0, 0, 0], fov: 25.5, up: [0, 0, 1] }),
  // three-quarter views, ~50° down: every square readable
  threeq: () => ({ pos: [0, 11.6, 9.6], target: [0, -0.4, 0.55], fov: 40 }),
  threeqB: () => ({ pos: [0, 11.6, -9.6], target: [0, -0.4, -0.55], fov: 40 }),
  // low orbit at board height (p.az start azimuth rad, p.azSpeed rad/s, p.t0 orbit start)
  low: (t, p) => { const az = (p.az ?? 0.3) + (p.azSpeed ?? 0.22) * (t - (p.orbitT0 ?? 146.1)); return { pos: orbit(az, p.r ?? 7.2, p.y ?? 1.05, [0, 0, 0]), target: [0, 0.45, 0], fov: p.fov ?? 34 }; },
  // close on a piece (p.focus: square 'g4' | 'mover' | 'queen'; p.az side to look from)
  piece: (t, p, st) => { const f = focusSq(p, st); const az = p.az ?? 0.6; return { pos: [f[0] + Math.sin(az) * 3.1, 1.25, f[2] + Math.cos(az) * 3.1], target: [f[0], 0.62, f[2]], fov: p.fov ?? 30 }; },
  // the clock faces
  clock: () => ({ pos: [CLOCK_POS[0] + 3.6, 2.05, CLOCK_POS[2] + 0.35], target: [CLOCK_POS[0], 0.42, CLOCK_POS[2]], fov: 30 }),
  // the scoresheet (pause-frame credit)
  sheet: () => ({ pos: [SHEET_POS[0] - 0.2, 4.6, SHEET_POS[2] + 2.0], target: [SHEET_POS[0], 0, SHEET_POS[2] - 0.1], fov: 34 }),
};

function resolve(c, t, p, st) {
  if (!c) return null;
  if (typeof c === 'string') return (PRESETS[c] || PRESETS.wide)(t, p, st);
  if (typeof c === 'function') return c(t, p, st);
  return c;
}
function blendCam(a, b, u) {
  return { pos: L3(a.pos, b.pos, u), target: L3(a.target, b.target, u), fov: lerp(a.fov, b.fov, u), up: u < 0.5 ? a.up : b.up };
}

// the default choreography (p.cam = 'auto' or omitted), hard cuts on musical points (S.anchors)
export function autoCam(S, t, p, st) {
  const A = S.anchors, P0 = S.plies;
  const seg = (t0, t1) => clamp((t - t0) / (t1 - t0));
  if (t < A.count) {                 // the set: wide and high, slow push in
    const u = seg(138.5, A.count);
    return { pos: L3([8.6, 12.5, 14.6], [7.0, 10.2, 12.4], smooth(u)), target: [0.4, -0.6, 0.2], fov: 37 };
  }
  if (t < A.drumsOut) {              // "Counting on you!": the pawns land, low along the White side
    const u = seg(A.count, A.drumsOut);
    return { pos: L3([-8.2, 2.6, 6.6], [-7.2, 3.4, 7.4], smooth(u)), target: [0.6, 0.0, -0.2], fov: 38 };
  }
  if (t < P0[8].t) {                 // the opening: 3/4 from White, drifting; the lights go down
    const u = seg(A.drumsOut, P0[8].t);
    return { pos: L3([-3.0, 8.6, 9.0], [-1.0, 7.4, 8.6], smooth(u)), target: [0, -0.2, 0.5], fov: 40 };
  }
  if (t < P0[12].t) {                // slow orbit at board height
    const u = seg(P0[8].t, P0[12].t);
    const az = lerp(-0.15, 0.95, u);
    return { pos: orbit(az, 7.0, 1.05), target: [0.2, 0.45, -0.2], fov: 33 };
  }
  if (t < P0[16].t) {                // 7.Qg4 .. 9.Qxg7: pushing in on the kingside, the clock in the foreground
    const u = easeInCubic(seg(P0[12].t, P0[16].t));
    return { pos: L3([9.6, 3.4, 5.4], [7.3, 2.15, 3.3], u), target: L3([3.4, 0.3, -0.4], [3.0, 0.5, -1.6], u), fov: lerp(36, 30, u) };
  }
  if (t < P0[24].t) {                // 9...Rg8 .. 13.O-O: high 3/4, every square readable
    const u = seg(P0[16].t, P0[24].t);
    return { pos: L3([1.6, 11.0, 9.8], [0.6, 10.2, 9.4], smooth(u)), target: [0, -0.4, 0.5], fov: 40 };
  }
  if (t < A.back) {                  // 13...O-O-O on "death": low on Black's queenside
    const u = seg(P0[24].t, A.back);
    return { pos: L3([-6.4, 1.7, -7.4], [-5.6, 1.3, -6.2], smooth(u)), target: [-1.4, 0.5, -3.2], fov: 34 };
  }
  if (t < P0[35].t) {                // the battle: low and wide from White's side, 180° swing on "chain"
    const sw = smoother(seg(A.chain, A.chain + 0.5));
    const u = seg(A.back, P0[35].t);
    const az = 0.42 + Math.PI * sw + 0.18 * u;
    return { pos: orbit(az, lerp(8.2, 7.0, u), lerp(2.6, 2.1, u), [0.6, 0, 0.3]), target: [0.8, 0.35, 0.3], fov: 42 };
  }
  if (t < A.hand) {                  // the flurry: high from Black's side, the kingside
    const u = seg(P0[35].t, A.hand);
    return { pos: L3([5.8, 8.6, -6.2], [5.0, 7.8, -5.4], smooth(u)), target: [1.8, 0, 1.0], fov: 38 };
  }
  // 21...Qg4+: low on the black queen with the white king behind her; slow push in
  const u = seg(A.hand, A.letgo + 0.6);
  return { pos: L3([6.2, 1.05, -1.6], [5.3, 0.95, -0.9], smooth(u)), target: [2.5, 0.7, 1.15], fov: 32 };
}

export function cameraAt(S, t, p, st) {
  let c;
  const spec = p.cam ?? 'auto';
  if (spec === 'auto') c = autoCam(S, t, p, st);
  else if (Array.isArray(spec)) {
    const keys = spec;
    if (t <= keys[0].t) c = resolve(keys[0].cam, t, p, st);
    else if (t >= keys[keys.length - 1].t) c = resolve(keys[keys.length - 1].cam, t, p, st);
    else {
      let i = 0; while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
      const a = keys[i], b = keys[i + 1];
      const u = (t - a.t) / (b.t - a.t);
      c = b.cut ? resolve(a.cam, t, p, st) : blendCam(resolve(a.cam, t, p, st), resolve(b.cam, t, p, st), easeInOutCubic(u));
    }
  } else c = resolve(spec, t, p, st);
  c = { ...c, pos: [...c.pos], target: [...c.target] };
  // optional extra swing about the board (p.swingAt: time, p.swingDur, p.swingAngle)
  if (p.swingAt != null) {
    const a = (p.swingAngle ?? Math.PI) * smoother((t - p.swingAt) / (p.swingDur ?? 0.5));
    c.pos = rotY(c.pos, a); c.target = rotY(c.target, a);
    if (c.up) c.up = rotY(c.up, a);
  }
  if (p.az0) { c.pos = rotY(c.pos, p.az0); c.target = rotY(c.target, p.az0); if (c.up) c.up = rotY(c.up, p.az0); }
  return c;
}

// smash zooms and shake: punches on captures/checks/the first capture; small shakes on set slams and clock slaps
export function cameraFx(S, t, p) {
  let punch = 0, shake = 0;
  const battle0 = S.anchors.back - 0.05;
  for (const ply of S.plies) {
    const a = t - ply.t;
    if (a < 0 || a > 0.6) continue;
    const big = ply.k === 16 ? 1.4 : (ply.capId >= 0 || ply.check) ? (ply.t >= battle0 ? 1 : 0.55) : 0;
    punch = Math.max(punch, big * Math.exp(-a / 0.11));
    shake = Math.max(shake, (big ? 0.9 * big : 0.12) * Math.exp(-a / 0.09));
  }
  for (const s of S.set) { const a = t - s.t; if (a >= 0 && a < 0.4) shake = Math.max(shake, (s.shout < 5 ? 0.55 : 0.3) * Math.exp(-a / 0.08)); }
  const f = p.fx ?? 1;
  return { punch: punch * f * (p.smash ?? 1), shake: shake * f * (p.shake ?? 1) };
}
