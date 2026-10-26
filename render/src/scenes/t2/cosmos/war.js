// t2_war (build, 2:43.67-2:55.06): the Rare Earth war scene, taken further and made reversible.
//   2:43.67 "Hunters never make it very far": Earth's night side over the North Pole; missile tracks rise from both sides'
//           silo fields and from submarines at sea (red: fire).
//   2:46.93 "fire at the dark, at every star": pull out to the contact graph: elsewhere in the galaxy, worlds (fiction)
//           fire on each other and go dark one by one, faster and faster.
//   2:49.44 "burn, and fall": back on Earth the warheads land; the night side reddens; the city lights go out.
//   2:50.83 p.rewind: VHS rewind: the same animation played backwards fast (warheads lift off the cities, the tracks fall
//           back into the silos and the submarines, the worlds light again, the lights come back on)
//   2:53.25 Earth whole; the camera pulls out and its node on the contact graph lights again.
// Everything is a closed-form function of a war clock w (song seconds): forward, w = t; in rewind, w runs back from 2:50.83
// to before the first launch; so rewind is the forward picture with w reversed (camera included).
//
// p (all optional): rewind (bool), w (explicit war clock: overrides both), view 'auto' | 'earth' | 'graph',
//   times {hunt, fire, burn, fall, rw0, whole, end} (default from the lyric), smear (VHS smear 0..1, rewind default 0.3),
//   earthCam {lat, lon, alt, ...} (pins the globe camera), sun
import { initCore, renderGalaxy, G, W3 } from './core.js';
import { MW } from './mw.js';
import { drawWeb } from './web.js';
import { initEarth, earthCam, drawEarth, vecLL, visibleE, earthOverlay, renderOverlay, sunBehind } from './earth.js';
import { C, mixc, wordT, lineT, ad, env, pick, sixteenths, snapTo, vhsSmear } from './common.js';
import { clamp, lerp, smooth, smoother, range, easeOutCubic, easeInCubic, easeInOutCubic, hash1, hash2 } from '../../../util.js';

const D2R = Math.PI / 180;
// launch areas: the missile fields of the Great Plains and of Russia, and submarines at sea (both sides)
const SITES_A = [[47.5, -111.2], [48.4, -101.4], [41.1, -104.8], [47.9, -106.2]];
const SUBS_A = [[42, -48], [55, -25], [46, -150], [36, -132]];
const SITES_B = [[54.0, 35.8], [51.7, 45.6], [55.3, 89.8], [51.0, 59.8], [56.6, 47.9], [52.6, 77.4]];
const SUBS_B = [[73, 35], [69, 10], [57, 158], [62, -176]];
const TARGETS_A = [[40.72, -74.0], [34.05, -118.23], [41.85, -87.64], [38.9, -77.0], [29.76, -95.37], [47.6, -122.3],
  [37.77, -122.42], [42.36, -71.06], [39.74, -104.99], [33.75, -84.39], [25.79, -80.23], [43.66, -79.39], [45.5, -73.57],
  [49.28, -123.12], [32.77, -96.8], [44.98, -93.27], [39.95, -75.18], [51.5, -0.12], [48.86, 2.35], [52.52, 13.4],
  [47.5, -111.0], [48.3, -101.2]];
const TARGETS_B = [[55.75, 37.61], [59.94, 30.31], [55.03, 82.92], [56.84, 60.6], [53.2, 50.15], [54.99, 73.37], [43.12, 131.9],
  [56.33, 44.0], [48.72, 44.5], [55.8, 49.1], [52.29, 104.3], [47.23, 39.7], [58.0, 56.25], [51.67, 39.2], [69.0, 33.1],
  [54.1, 35.7], [51.6, 45.8], [55.2, 89.6]];

function times(A, p) {
  const q = p.times || {};
  return {
    hunt: pick(q.hunt, lineT(A, 'Hunters never make it', 163.67)),
    fire: pick(q.fire, lineT(A, 'fire at the dark', 166.93)),
    burn: pick(q.burn, wordT(A, 'burn, and fall', 'burn', 169.44)),
    fall: pick(q.fall, wordT(A, 'burn, and fall', 'fall', 170.07)),
    rw0: pick(q.rw0, lineT(A, 'Only the ones who held', 170.83)),
    whole: pick(q.whole, lineT(A, 'are out there at all', 173.25)),
    end: pick(q.end, lineT(A, 'Hold your fire! Show your light', 175.06)),
  };
}

// ---------------------------------------------------------------- the exchange (closed form, cached per timing)
let XK = '', X = null;
function exchange(T) {
  const key = [T.hunt, T.burn, T.fall].join();
  if (key === XK) return X;
  const out = []; let k = 0;
  const add = (sites, subs, targets, t0, spread) => {
    for (let i = 0; i < targets.length; i++, k++) {
      const sub = hash2(k, 7) < 0.3;
      const pool = sub ? subs : sites;
      const s = pool[Math.floor(hash2(k, 1) * pool.length)];
      const jit = sub ? [s[0] + (hash2(k, 8) - 0.5) * 6, s[1] + (hash2(k, 9) - 0.5) * 10] : [s[0] + (hash2(k, 8) - 0.5) * 1.6, s[1] + (hash2(k, 9) - 0.5) * 3];
      const tl = t0 + Math.pow(hash2(k, 2), 1.4) * spread;
      // impacts land through "burn, and fall", the ones launched first landing first
      const ti = lerp(T.burn - 0.02, T.fall + 0.42, clamp((tl - T.hunt) / (spread + 1.0) + (hash2(k, 3) - 0.5) * 0.25));
      out.push({ from: jit, to: targets[i], tl, ti, h: 0.15 + 0.08 * hash2(k, 4), k, sub, P: vecLL(...jit), Q: vecLL(...targets[i]) });
    }
  };
  add(SITES_A, SUBS_A, TARGETS_B, T.hunt + 0.02, 1.5);    // the first launches...
  add(SITES_B, SUBS_B, TARGETS_A, T.hunt + 0.55, 1.6);    // ...and the answer
  XK = key; X = out; return out;
}
function slerp(p, q, s) {
  const d = clamp(p[0] * q[0] + p[1] * q[1] + p[2] * q[2], -1, 1), w = Math.acos(d);
  if (w < 1e-6) return p;
  const A = Math.sin((1 - s) * w) / Math.sin(w), B = Math.sin(s * w) / Math.sin(w);
  return [A * p[0] + B * q[0], A * p[1] + B * q[1], A * p[2] + B * q[2]];
}
const trackPt = (m, s) => { const v = slerp(m.P, m.Q, s); const r = 1 + m.h * 4 * s * (1 - s); return [v[0] * r, v[1] * r, v[2] * r]; };
const flightS = (m, w) => { const u = clamp((w - m.tl) / (m.ti - m.tl)); return easeInCubic(u) * 0.3 + u * 0.7; };

// ---------------------------------------------------------------- the hunters elsewhere (fiction), closed form in w
let HK = '', HP = null;
function hunterPlan(A, T) {
  const key = [T.fire, T.burn].join();
  if (key === HK) return HP;
  const grid = sixteenths(A).filter((g) => g >= T.fire - 0.3 && g <= T.burn + 0.1);
  const H = MW.hunters, n = H.length;
  const order = [...Array(n).keys()].sort((a, b) => hash1(a * 7.31 + 1) - hash1(b * 7.31 + 1));
  const all = [...MW.worlds.map((w) => [w.x, w.y, w.h]), ...H.map((h) => [h.x, h.y, h.h])];
  HP = new Array(n);
  order.forEach((i, rank) => {
    const kk = rank / n;
    const ig = snapTo(grid, lerp(T.fire - 0.25, T.burn - 0.9, Math.pow(kk, 0.8)));
    // they go dark one by one, the gaps shrinking like a snare roll; a third never fire at all before the end
    let die = snapTo(grid, ig + 0.35 + 0.9 * hash1(i * 3.1 + 5));
    if (die > T.burn - 0.1) die = snapTo(grid, T.burn - 0.5 + 0.45 * hash1(i * 9.7 + 2));
    const h = H[i], shots = [];
    const m = 1 + Math.floor(hash1(i * 1.7 + 3) * 2);
    for (let j = 0; j < m; j++) {
      const ts = snapTo(grid, ig + 0.06 + j * (0.2 + 0.15 * hash2(i, j)));
      if (ts > die - 0.04) break;
      let tx, ty, th;
      if (hash2(i, j + 11) < 0.35) { const a = hash2(i, j + 21) * Math.PI * 2, d = 1.2 + 2.5 * hash2(i, j + 31); tx = h.x + Math.cos(a) * d; ty = h.y + Math.sin(a) * d; th = h.h; }
      else { let best = 0, bd = 1e9; for (let q = 0; q < 24; q++) { const c = Math.floor(hash2(i * 13 + q, j * 7 + 3) * all.length); const d = Math.hypot(all[c][0] - h.x, all[c][1] - h.y); if (d > 0.4 && d < bd) { bd = d; best = c; } } [tx, ty, th] = all[best]; }
      shots.push({ ts, te: ts + 0.14 + Math.hypot(tx - h.x, ty - h.y) / 12, tx, ty, th });
    }
    HP[i] = { ig, die, shots };
  });
  HK = key; return HP;
}

function drawHunters(w, T, A, alpha) {
  const S = G.sprites, L = G.lines, H = MW.hunters, pl = hunterPlan(A, T);
  for (let i = 0; i < H.length; i++) {
    const h = H[i], q = pl[i]; const [x, y, z] = W3(h.x, h.y, h.h);
    if (w < q.ig) { S.add(x, y, z, 1.25, ...C.cream, 0.5 * alpha); continue; }
    if (w < q.die) {
      const f = ad(w, q.ig, 0.04, 0.3), lock = 1 - range(w, q.ig, q.ig + 0.4);
      S.add(x, y, z, 1.4 + 0.6 * f, ...C.red, (1.1 + 1.6 * f) * alpha, 3 + 6 * f);
      if (lock > 0) S.add(x, y, z, 0.01, ...C.red, 0.9 * smooth(lock * 3) * alpha, 0, 5 + 9 * lock * lock);
    } else {
      const age = w - q.die;
      if (age < 2.4) {
        const fl = ad(w, q.die, 0.03, 0.2), em = Math.exp(-age / 0.6) * (1 - range(age, 1.8, 2.4)), hot = fl * 0.55;
        S.add(x, y - 0.3 * age * age, z, 1.3 + 2.2 * fl, lerp(C.red[0], 1, hot), lerp(C.red[1], 0.92, hot), lerp(C.red[2], 0.8, hot), (3 * fl + 0.5 * em) * alpha, 3 + 16 * fl);
      }
    }
    for (const s of q.shots) {
      if (w < s.ts || w > s.te + 0.45) continue;
      const u = clamp((w - s.ts) / (s.te - s.ts)), head = u, tail = Math.max(0, head - 0.4), fade = 1 - range(w, s.te, s.te + 0.45);
      const Ax = W3(lerp(h.x, s.tx, tail), lerp(h.y, s.ty, tail), lerp(h.h, s.th, tail)), Bx = W3(lerp(h.x, s.tx, head), lerp(h.y, s.ty, head), lerp(h.h, s.th, head));
      L.add(...Ax, ...Bx, 2.0, ...C.red, 1.3 * fade * alpha, 1, 0, 1);
      if (u < 1) S.add(...Bx, 1.3, 1, 0.55, 0.45, 1.8 * alpha, 6);
      else S.add(...Bx, 1.2, ...C.red, 1.8 * ad(w, s.te, 0.02, 0.18) * alpha, 12);
    }
  }
}

// ---------------------------------------------------------------- clocks and views
function warClock(t, T, p) {
  if (p.w !== undefined) return p.w;
  if (!p.rewind) return Math.min(t, T.rw0);
  const u = range(t, T.rw0, T.whole - 0.12);
  // VHS rewind: a quick spin-up, a long fast run, a hard stop
  const g = u < 0.12 ? 0.5 * u * u / 0.12 / 0.94 : u > 0.94 ? 1 - 0.5 * (1 - u) * (1 - u) / 0.06 / 0.94 : (u - 0.06) / 0.94;
  return lerp(T.rw0, T.hunt - 0.35, clamp(g));
}
// 0 = the globe, 1 = the graph
function viewK(w, t, T, p) {
  if (p.view === 'earth') return 0;
  if (p.view === 'graph') return 1;
  let k = smoother(range(w, T.fire - 0.08, T.fire + 0.6)) * (1 - smoother(range(w, T.burn - 0.36, T.burn - 0.02)));
  if (p.rewind && t > T.whole) k = Math.max(k, smoother(range(t, T.whole + 0.15, T.whole + 1.0)));
  return k;
}
function globeCam(w, T, p) {
  if (p.earthCam) return { pitch: 90, ...p.earthCam };
  const back = smooth(range(w, T.burn - 0.4, T.burn + 0.2));
  return { lat: lerp(67, 63, back), lon: -40 + (w - T.hunt) * 1.1, alt: lerp(lerp(14500, 12800, range(w, T.hunt, T.fire)), 11000, back), pitch: 90, heading: 0, fov: 40, off: [0, lerp(70, 40, back)] };
}
function galaxyCam(w, T, k) {
  const sun = W3(MW.sun[0], MW.sun[1], 0);
  const kk = smooth(range(k, 0.15, 1));
  const ld = lerp(Math.log(0.25), Math.log(36), smooth(range(k, 0.05, 0.95)));
  return { target: [lerp(sun[0], 0.6, kk), 0, lerp(sun[2], -1.2, kk)], dist: Math.exp(ld), az: 3.9 + (w - T.fire) * 0.02, el: lerp(1.25, 0.74, kk), fov: 30 };
}

export default {
  async init(ctx) { await initCore(ctx); await initEarth(ctx); earthOverlay(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    if (p.phase === 'rewind' || p.phase === 'whole') p = { ...p, rewind: true, smear: p.smear ?? (p.vhs === false ? 0 : undefined) };
    const T = times(A, p);
    const w = warClock(t, T, p);
    const k = viewK(w, t, T, p);
    const salvo = exchange(T);
    // ---------------- the globe
    if (k < 0.92) {
      const gc = globeCam(w, T, p);
      gc.alt = gc.alt * Math.exp(Math.log(120) * easeInCubic(range(k, 0, 0.85)));   // the pull-out: Earth falls to a point
      const ec = earthCam(gc);
      const imps = [];
      for (const m of salvo) if (w >= m.ti - 0.001) imps.push([...m.Q, w - m.ti]);
      const burn = smooth(range(w, T.burn, T.burn + 0.5));
      const dark = smooth(range(w, T.fall - 0.1, T.fall + 0.6)) * 0.94;
      const flash = salvo.reduce((s, m) => s + (w >= m.ti ? Math.exp(-(w - m.ti) / 0.08) : 0), 0) * 0.06;
      const recede = 1 - smooth(range(k, 0.2, 0.7));
      drawEarth(ctx, ec, { sun: p.sun || sunBehind(ec, 22, -1, 10), impacts: imps, red: 0.75 * burn * (1 - 0.3 * dark), dark, flash: Math.min(0.22, flash), gain: 1.7 * recede, atmoK: recede, airK: 0.3 * recede, detail: 0, cloudK: 0.8 });
      // tracks: a red trail with a white-hot head, as on an early-warning display; launch blooms at the sites
      const O = earthOverlay(); O.lines.reset(); O.sprites.reset();
      const fadeAll = 1 - smooth(range(k, 0.2, 0.6));
      for (const m of salvo) {
        if (w < m.tl) continue;
        const sH = flightS(m, w);
        const fade = (1 - range(w, m.ti + 0.05, m.ti + 0.7)) * fadeAll;
        if (fade <= 0) continue;
        const N = 30; let prev = trackPt(m, 0), pv = visibleE(ec, prev);
        for (let i = 1; i <= N; i++) {
          const s = sH * i / N, q = trackPt(m, s), qv = visibleE(ec, q);
          const age = (sH - s) / Math.max(1e-3, sH);           // 0 at the head, 1 at the launch site
          if (pv && qv) O.lines.add(...prev, ...q, 2.1, ...C.red, (0.55 + 0.9 * (1 - age)) * fade, 1, 0.5 + 0.5 * (1 - age), 0.5 + 0.5 * (1 - age));
          prev = q; pv = qv;
        }
        if (w < m.ti && pv) O.sprites.add(...prev, 1.6, 1, 0.93, 0.85, 2.4 * fadeAll, 10);
        const la = w - m.tl;
        if (la < 0.35 && visibleE(ec, vecLL(...m.from, 1.001))) O.sprites.add(...vecLL(...m.from, 1.001), 1.5, 1, 0.75, 0.5, 2.2 * (1 - la / 0.35) * fadeAll, 16);
      }
      renderOverlay(ctx, ec);
    } else e.clear(e.rtScene, 0, 0, 0);
    // ---------------- the contact graph
    if (k > 0.3) {
      const al = smooth(range(k, 0.3, 0.75));
      G.sprites.reset(); G.lines.reset();
      const earthDark = smooth(range(w, T.burn, T.burn + 0.3));
      const relight = p.rewind && t > T.whole ? ad(t, T.whole + 0.75, 0.05, 0.8) : 0;
      const relit = p.rewind && t > T.whole ? smooth(range(t, T.whole + 0.7, T.whole + 1.4)) : 0;
      const Dg = MW.graph.D;
      drawWeb({
        link: (ed) => {
          let I = 0.22 * al;
          // Earth's own links light again, running out from it
          if (relit > 0) { const d = Dg[ed.a]; const g = smooth(range(t, T.whole + 0.75 + d * 0.35, T.whole + 0.95 + d * 0.35)); I += 0.9 * g * Math.exp(-d / 2.5) * al; }
          return { I, col: C.gold };
        },
        node: (i) => (i === 0 ? { I: (0.9 * (1 - earthDark) + 0.5 * relit + 1.1 * relight) * al, col: C.pale, r: 2.1, halo: 8 + 8 * relight, ring: 6.5 + 14 * relight } : { I: 0.8 * al, r: 1.6, halo: 7 }),
      });
      drawHunters(w, T, A, al);
      renderGalaxy(ctx, { cam: galaxyCam(w, T, k), off: [0, lerp(60, 0, smooth(range(k, 0.3, 1)))], over: true, stars: al, glow: 0.3 * al, bulge: 0.8 * al, starTint: [0.86, 0.94, 1.08] });
    }
    // ---------------- the rewind smear
    if (p.rewind) {
      const sm = (p.smear ?? 0.3) * smooth(range(t, T.rw0, T.rw0 + 0.15)) * (1 - smooth(range(t, T.whole - 0.25, T.whole)));
      vhsSmear(e, sm, t);
    }
  },
};
