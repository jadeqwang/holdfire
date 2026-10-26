// t2_earth_night: Earth's night side, its cities joined by roads of light, a thin pale-blue limb with the airglow above it.
// Used for 0:10.44 "five" (from the ISS), post-chorus 2 (2:14.06-2:17.21: the lights at increasing scale, ending on the
// whole night side), and the build/drop (the whole night side; "Show your light": the cities come on in a wave).
//
// p (all optional):
//   view   'iss' | 'scale' | 'whole' (default: 'iss' before 0:20, 'scale' in post-chorus 2, else 'whole')
//   cam    {lat, lon, alt km, heading, pitch, roll, fov, off} — overrides the view's camera entirely
//   iss    {lat, lon, heading, alt, pitch, fov, drift (deg/s along the heading)}      ('iss' view)
//   target [lat, lon] (Cairo and the Nile), shouts [6 times] (timing.json post_chorus_2 hits), alts [6 km]   ('scale')
//   whole  {lat, lon, alt, spin (deg/s), off}                                                                 ('whole')
//   on     [t0, t1] or 0..1: the lights come on as a wave from `onFrom` [lat, lon] (default: off = all lit)
//   gain (lights), detail (street detail at close range), sunA (deg: crescent width), sunSide (1 | -1), clouds, over
import { initEarth, earthCam, drawEarth, sunBehind, sunAhead, vecLL } from './earth.js';
import { clamp, lerp, smooth, range, easeInOutCubic, easeOutCubic } from '../../../util.js';
import { shoutTimes, pick } from './common.js';

const D2R = Math.PI / 180;
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -9 * clamp(x)));

// a log-altitude zoom out over a target, one jump per shout, a slow creep between
function scaleCam(t, p, A) {
  const S = p.shouts || shoutTimes(A, 'Post-Chorus 2', [134.06, 134.66, 135.29, 135.89, 136.6, 137.16]);
  const alts = p.alts || [40, 110, 330, 1100, 3600, 17500];
  const tg = p.target || [30.06, 31.24];
  let la = Math.log(alts[0] * 0.8);
  for (let i = 0; i < S.length; i++) {
    const a0 = i === 0 ? Math.log(alts[0] * 0.8) : Math.log(alts[i - 1]), a1 = Math.log(alts[i]);
    if (t >= S[i]) la = lerp(a0, a1, expoOut((t - S[i]) / 0.42));
  }
  const creep = (t - S[0]) * 0.035;                         // a slow continuous pull between jumps
  const alt = Math.exp(la + Math.max(0, creep));
  // as the frame widens, the view centre slides north-west so the whole night side frames with Europe and Africa in it
  const w = smooth(range(Math.log(alt), Math.log(300), Math.log(18000)));
  return { lat: lerp(tg[0], 34, w), lon: lerp(tg[1], 22, w), alt, heading: lerp(-18, 0, w), pitch: 90, fov: lerp(46, 34, w), off: [0, 0] };
}

function issCam(t, p) {
  const q = { lat: 41.0, lon: 11.0, heading: 52, alt: 410, pitch: 21, fov: 58, drift: 0.9, ...(p.iss || {}) };
  const d = (t - (p.t0 ?? 10.0)) * q.drift;                // degrees travelled along the heading
  return { lat: q.lat + Math.cos(q.heading * D2R) * d, lon: q.lon + Math.sin(q.heading * D2R) * d / Math.cos(q.lat * D2R), alt: q.alt, heading: q.heading, pitch: q.pitch, fov: q.fov, roll: q.roll ?? -4 };
}

function wholeCam(t, p) {
  const q = { lat: 34, lon: 20, alt: 17500, spin: 0.35, fov: 34, ...(p.whole || {}) };
  return { lat: q.lat, lon: q.lon - (t - 130) * q.spin, alt: q.alt, pitch: 90, heading: q.heading ?? 0, fov: q.fov, off: q.off || [0, 0] };
}

export default {
  async init(ctx) { await initEarth(ctx); },
  draw(ctx, shot, t, lt, p) {
    const A = ctx.audio;
    const view = p.view || (t < 20 ? 'iss' : (t > 133 && t < 139.1) ? 'scale' : 'whole');
    const c = p.cam || (view === 'iss' ? issCam(t, p) : view === 'scale' ? scaleCam(t, p, A) : wholeCam(t, p));
    const ec = earthCam(c);
    const sun = view === 'iss' && !p.cam ? sunAhead(ec, p.sunB ?? 24) : sunBehind(ec, p.sunA ?? 28, p.sunSide ?? 1, 8);
    let sweep = null;
    if (p.on !== undefined) {
      const k = Array.isArray(p.on) ? range(t, p.on[0], p.on[1]) : p.on;
      const fr = p.onFrom || [c.lat, c.lon];
      sweep = [...vecLL(fr[0], fr[1]), k >= 1 ? 2 : easeInOutCubic(k) * 1.02];
    }
    // closer than ~600 km the atmosphere is a band at the horizon; the airglow reads; far out it is a hairline
    const altK = smooth(range(Math.log(ec.alt * 6371), Math.log(600), Math.log(12000)));
    drawEarth(ctx, ec, {
      sun, gain: (p.gain ?? 1.7) * lerp(1.15, 1, altK), detail: p.detail ?? 1, cloudK: p.clouds ?? 0.9,
      atmoK: lerp(1.2, 1.0, altK), airK: lerp(0.5, 0.25, altK), landK: 1, sweep,
    }, p.over ? 'add' : 'replace');
  },
};
