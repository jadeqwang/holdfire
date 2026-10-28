// The players' hands for t2_chess hand shots (Jade's note at 2:26.5: the board is the game's true position, and she picks up the
// real piece and makes the move). Cut-out anime arm sprites (nano-banana-pro on green, keyed: render/assets/t2/hands/, anchors in
// hands.json) composited over the 3D board, animated along the move on twos. Every pose is a pure function of song time t.
//
// A track is one hand's choreography (p.handTracks on the shot):
//   { side: 'w'|'b', move: '5...Ba5' }           hover over the piece (a full beat for moves 5-6), grip, carry it on the ply's own arc
//                                                (state.js moves the piece; the hand holds its head), set it down on the ply time,
//                                                open and withdraw
//   { side, move: '5...Ba5', press: true }        the same, and then the same hand goes on to its clock button and presses it at the
//                                                ply's press time (schedule.js tp), then lifts away
//   { side, press: t | 'start' | '1.e4' }        slap the side's clock button at song time t (the start press, or a ply's press time), lift away
//   hand: 'L' | 'R' on any track                 which of her hands (default: the clock-side hand, the one that presses: the clock is on
//                                                White's right = Black's left, so Jade plays with her right hand, teal-tips with her left)
//   { side, hold: 'g4', release: t }             fingers on the piece on that square (pinch), or hovering over it ('hover': true);
//                                                at `release` the hand opens and lifts off ("let go")
// The arm runs from the grip point toward the player's shoulder (projected), so it always enters the frame from her side; the sprite
// is mirrored when her side is on the right of the frame.
import { GAME, sqOf } from './pgn.js';
import { sqPos } from './state.js';
import { HEIGHT } from './pieces.js';
import { CLOCK_POS } from './camera.js';
import { clamp, lerp, smooth, easeOutCubic, easeInCubic, easeInOutCubic, noise1 } from '../../../util.js';

const BASE = 'assets/t2/hands/';
let SPR = null;

export async function loadHands() {
  if (SPR) return SPR;
  try {
    const meta = await (await fetch(BASE + 'hands.json')).json();
    const out = {};
    await Promise.all(Object.entries(meta).filter(([, m]) => m && m.file).map(([k, m]) => new Promise((res) => {
      const img = new Image();
      img.onload = () => { out[k] = { ...m, img }; res(); };
      img.onerror = () => res();
      img.src = BASE + m.file;
    })));
    SPR = out;
  } catch (e) { SPR = {}; }
  return SPR;
}

const L3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// rotate v by unit quaternion q [x, y, z, w]
function qRot(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
// the point the fingers pinch: just under the top of the piece (the bishop's mitre, the queen's coronet, the pawn's ball)
const GRIP_H = { P: 0.6, R: 0.7, N: 0.78, B: 0.92, Q: 1.12, K: 1.24 };
function headOf(ps) { return add(ps.pos, qRot(ps.q, [0, GRIP_H[ps.type] * ps.scale[1], 0])); }

const sideZ = (s) => (s === 'w' ? 1 : -1);
// which hand: the clock-side one by default (the clock is at +x: White's right, Black's left); +x shoulder for White's right hand and
// for Black's left hand
const clockHand = (side) => (side === 'w' ? 'R' : 'L');
const handX = (side, hand = clockHand(side)) => ((hand === 'R') === (side === 'w') ? 1.2 : -1.2);
// where the arm comes from: the player's shoulder, beyond her edge of the board
const shoulder = (side, grip, hand) => [grip[0] * 0.35 + handX(side, hand), 3.4, sideZ(side) * 8.6];
const retreat = (side, grip, hand) => [lerp(grip[0], shoulder(side, grip, hand)[0], 0.35), grip[1] + 1.6, grip[2] + sideZ(side) * 3.6];

const BTN = (side) => [CLOCK_POS[0] + 0.18, 0.72, CLOCK_POS[2] + sideZ(side) * 0.68];

// a slap on the side's button at tp, coming from `from` (a point, or null: from her shoulder side) -> pose or null (not yet / gone)
function pressAt(side, hand, tp, t, from, t0 = tp - 0.3) {
  const B = BTN(side), top = add(B, [0, 0.62, sideZ(side) * 0.1]);
  const src = from || retreat(side, B, hand);
  if (t < t0) return null;
  if (t < tp - 0.05) {   // from a piece: an arc over the pieces in between (a king is 1.6 tall)
    const u = easeOutCubic((t - t0) / Math.max(1e-3, tp - 0.05 - t0)), g = L3(src, top, u);
    if (from) g[1] += 0.9 * 4 * u * (1 - u);
    return { pose: from ? 'reach' : 'press', grip: g };
  }
  if (t < tp) { const u = easeInCubic((t - (tp - 0.05)) / 0.05); return { pose: 'press', grip: L3(top, B, u) }; }
  const a = t - tp;
  if (a < 0.09) return { pose: 'press', grip: [B[0], B[1] - 0.06 * Math.exp(-a / 0.03), B[2]] };
  const u = easeInCubic((a - 0.09) / 0.38);
  if (u >= 1) return null;
  return { pose: u < 0.2 ? 'press' : 'reach', grip: L3(B, retreat(side, B, hand), u) };
}

// one hand at time t -> {pose, grip [x,y,z], amt (0..1 presence), side, hand} or null
function trackAt(S, tr, t, st) {
  const side = tr.side, hand = tr.hand || clockHand(side);
  const r = trackPose(S, tr, t, st, side, hand);
  return r ? { side, hand, amt: 1, ...r } : null;
}
function trackPose(S, tr, t, st, side, hand) {
  const retreat_ = (s, g) => retreat(s, g, hand);
  const tpOf = (lbl) => { const q = S.plies.find((x) => x.label === lbl); return q.tp ?? q.t; };
  if (tr.move) {
    const i = S.plies.findIndex((p) => p.label === tr.move || p.san === tr.move);
    if (i < 0) return null;
    const P = S.plies[i];
    const ps = st.pieces.find((o) => o.id === P.id);
    const type = ps.type;
    const fr = sqPos(P.from);
    const restHead = add(fr, [0, GRIP_H[type], 0]);
    const toHead = add(sqPos(P.to), [0, GRIP_H[type], 0]);
    const t0 = P.t0, t1 = P.t, h0 = Math.min(P.hover0, t0 - 0.18);
    const tA = h0 - (tr.approach ?? 0.3);
    const above = add(restHead, [0, 0.55, sideZ(side) * 0.15]);
    if (t < tA) return null;
    if (t < h0) { const u = easeOutCubic((t - tA) / (h0 - tA)); return { side, pose: 'reach', grip: L3(retreat_(side, restHead), above, u), amt: 1 }; }
    if (t < t0 - 0.09) {   // hovering: a held breath, the slightest drift
      const bob = 0.05 * (noise1(t * 2.1 + i) - 0.5);
      return { side, pose: 'reach', grip: add(above, [bob, 0.04 * Math.sin((t - h0) * 5), 0]), amt: 1 };
    }
    if (t < t0) { const u = smooth((t - (t0 - 0.09)) / 0.09); return { side, pose: u > 0.55 ? 'pinch' : 'reach', grip: L3(above, restHead, u), amt: 1 }; }
    if (t < t1) return { side, pose: 'pinch', grip: headOf(ps), amt: 1 };
    const a = t - t1;
    if (a < 0.1) return { side, pose: a < 0.04 ? 'pinch' : 'release', grip: add(toHead, [0, 0.5 * easeOutCubic(a / 0.1), 0]), amt: 1 };
    // and on to the clock: the same hand presses her button at the ply's press time
    if (tr.press === true && P.tp != null) return pressAt(side, hand, P.tp, t, add(toHead, [0, 0.5, 0]), t1 + 0.1);
    const u = easeInCubic((a - 0.1) / 0.36);
    if (u >= 1) return null;
    return { side, pose: 'release', grip: L3(add(toHead, [0, 0.5, 0]), retreat_(side, toHead), u), amt: 1 };
  }
  if (tr.press != null) {
    const tp = tr.press === 'start' ? S.startPress : typeof tr.press === 'string' ? tpOf(tr.press) : tr.press;
    return pressAt(side, hand, tp, t, null);
  }
  if (tr.hold) {
    const sq = sqOf(tr.hold), id = GAME.boards[st.k + 1][sq];
    const ps = st.pieces.find((o) => o.id === id);
    if (!ps) return null;
    const head = tr.hover ? add(headOf(ps), [0, 0.45, sideZ(side) * 0.15]) : headOf(ps);
    const tr0 = tr.release;
    if (t < tr0) return { side, pose: tr.hover ? 'reach' : 'pinch', grip: add(head, [0, 0.02 * Math.sin(t * 7), 0]), amt: 1 };
    const a = t - tr0;
    const lift = add(head, [0, 0.55 * easeOutCubic(a / 0.12), sideZ(side) * 0.2 * easeOutCubic(a / 0.12)]);
    if (a < 0.12) return { side, pose: 'release', grip: lift, amt: 1 };
    const u = easeInCubic((a - 0.12) / 0.4);
    if (u >= 1) return null;
    return { side, pose: 'release', grip: L3(lift, retreat_(side, head), u), amt: 1 };
  }
  return null;
}

export function handsAt(S, tracks, t, st) {
  const out = [];
  for (const tr of tracks || []) { const h = trackAt(S, tr, t, st); if (h) out.push(h); }
  return out;
}

// draw the hands over the frame. cam: the THREE camera (matrices updated); v: a scratch THREE.Vector3. o: {gain, size}
export function drawHands(e, hands, cam, v, o = {}) {
  if (!SPR || !hands.length) return false;
  const proj = (p) => { v.set(p[0], p[1], p[2]).project(cam); return [(v.x * 0.5 + 0.5) * 1920, (0.5 - v.y * 0.5) * 1080, v.z]; };
  const right = [cam.matrixWorld.elements[0], cam.matrixWorld.elements[1], cam.matrixWorld.elements[2]];
  const c = e.c2dBegin();
  let drew = false;
  for (const h of hands) {
    const spr = SPR[h.pose] || SPR.reach;
    if (!spr) continue;
    const g = proj(h.grip);
    if (g[2] > 1) continue;
    // toward her shoulder: a probe a short way up the arm (the shoulder itself can be behind the lens)
    const S0 = shoulder(h.side, h.grip, h.hand), dl = Math.hypot(S0[0] - h.grip[0], S0[1] - h.grip[1], S0[2] - h.grip[2]);
    const sh = proj(L3(h.grip, S0, 0.35 / dl));
    const g1 = proj([h.grip[0] + right[0], h.grip[1] + right[1], h.grip[2] + right[2]]);
    const pxu = Math.hypot(g1[0] - g[0], g1[1] - g[1]);          // design px per world unit at the hand
    let ang = Math.atan2(sh[1] - g[1], sh[0] - g[0]);              // screen direction from the fingers to her shoulder
    const flip = Math.cos(ang) > 0;                                 // her side is on the right: mirror the (left-entering) sprite
    // the sprite's own arm axis: from the grip point to the sleeve's cut edge
    const ax = Math.atan2(spr.cut[1] - spr.grip[1], spr.cut[0] - spr.grip[0]);
    const axS = flip ? Math.PI - ax : ax;
    // keep the forearm near the drawn angle (a sprite rotated far off its drawing reads wrong): soften the rotation
    let rot = ang - axS; rot = Math.atan2(Math.sin(rot), Math.cos(rot)); rot *= o.rotAmt ?? 0.75;
    const len = spr.len ?? Math.hypot(spr.grip[0] - spr.wrist[0], spr.grip[1] - spr.wrist[1]);
    const k = (o.size ?? 1.35) * pxu / len;
    c.save();
    c.translate(g[0], g[1]); c.rotate(rot); c.scale(flip ? -k : k, k);
    c.globalAlpha = clamp(h.amt);
    c.filter = `brightness(${o.gain ?? 0.94})`;
    c.drawImage(spr.img, -spr.grip[0], -spr.grip[1]);
    // carry the sleeve past the frame edge: stretch its cut column outward
    const ext = 2400 / k;
    c.drawImage(spr.img, 0, 0, 2, spr.img.height, -spr.grip[0] - ext, -spr.grip[1], ext + 1, spr.img.height);
    c.restore();
    drew = true;
  }
  if (drew) e.blit2d('over', 1);
  return drew;
}

// the hand's shadow on the board (chess.js's handShadow uniform): the first hand over the board
export function handShadowOf(hands) {
  const h = hands.find((x) => x.grip[1] < 3.2 && Math.abs(x.grip[0]) < 5 && Math.abs(x.grip[2]) < 5);
  if (!h) return null;
  return { x: h.grip[0], z: h.grip[2] + sideZ(h.side) * 0.35, amt: clamp(1.2 - h.grip[1] / 2.4) * h.amt, side: h.side };
}
