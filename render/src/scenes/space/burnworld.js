// BURNWORLD: "burn, and fall." The worst outcome, shown plainly: Earth's night side from orbit (Europe and the
// Mediterranean under a dome-shaped limb), drawn as an engraving from true data (Natural Earth coastlines; city lights as
// stipple sized by population, faint threads of light between neighbouring cities). Red tracks rise over the limb and
// come down on the cities; fires spread as red fronts; the gold lights inside them go red, then out; on "fall" the rest
// of the grid fails, and only embers remain. No people, no gore: a planet's lights going out.
// p (optional): tBurn ('burn' 169.44), tFall ('fall' 170.08), tEnd (shot.t1), lat0 (16), lon0 (18), center [960,1560],
//   radius (1250), targets (26), hud (0..1)
import { P, css } from '../../palette.js';
import { clamp, lerp, smooth, range, easeOutCubic, easeInCubic, hash1, hash2, rng } from '../../util.js';
import { wordT, lineT, ad, env, pick, eighths, Buckets, glowSprite, drawGlow, soft2d } from './common.js';
import { drawSky } from '../sky.js';

const D2R = Math.PI / 180;
let GEO = null, LIGHTS = null, THREADS = null;
const HOT = glowSprite([1, 0.62, 0.48], 0.3), WHITE = glowSprite([1, 0.96, 0.9]), REDG = glowSprite(P.red);

const unit = (o) => { const a = o.lat * D2R, b = o.lon * D2R; o.u = [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]; return o; };
async function loadGeo() {
  if (GEO) return GEO;
  GEO = await fetch('src/scenes/space/earth_geo.json').then((r) => r.json());
  // stipple: each city a cluster of points (count ~ sqrt(pop)), plus a rural scatter around it
  const R = rng(1983);
  LIGHTS = [];
  GEO.cities.forEach(([lat, lon, pop], ci) => {
    const n = Math.round(3 + Math.sqrt(pop) / 55);
    const rad = 0.06 + 0.05 * Math.pow(pop / 1e6, 0.35);        // degrees
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, r = rad * Math.sqrt(-Math.log(1 - R() * 0.98)) * 0.7;
      LIGHTS.push(unit({ lat: lat + Math.sin(a) * r, lon: lon + Math.cos(a) * r / Math.max(0.2, Math.cos(lat * D2R)), b: 0.5 + 0.9 * Math.pow(R(), 2) + (k === 0 ? 0.6 : 0), ci, h: R() }));
    }
    const m = Math.round(Math.sqrt(pop) / 140);
    for (let k = 0; k < m; k++) {
      const a = R() * Math.PI * 2, r = 0.25 + R() * 1.4;
      LIGHTS.push(unit({ lat: lat + Math.sin(a) * r, lon: lon + Math.cos(a) * r / Math.max(0.2, Math.cos(lat * D2R)), b: 0.18 + 0.25 * R(), ci, h: R() }));
    }
  });
  // threads between neighbouring cities (< 3 deg): the lit roads, drawn as faint light
  THREADS = [];
  const C = GEO.cities;
  for (let i = 0; i < C.length; i++) {
    let best = []; for (let j = 0; j < C.length; j++) if (j !== i) { const d = Math.hypot(C[i][0] - C[j][0], (C[i][1] - C[j][1]) * Math.cos(C[i][0] * D2R)); if (d < 3.2) best.push([j, d]); }
    best.sort((a, b) => a[1] - b[1]);
    for (const [j] of best.slice(0, 2)) if (i < j) THREADS.push([i, j]);
  }
  return GEO;
}

function projector(lat0, lon0, cx, cy, R) {
  const s0 = Math.sin(lat0 * D2R), c0 = Math.cos(lat0 * D2R);
  return (lat, lon, h = 0) => {
    const la = lat * D2R, dl = (lon - lon0) * D2R;
    const cl = Math.cos(la), sl = Math.sin(la);
    const x = cl * Math.sin(dl), y = c0 * sl - s0 * cl * Math.cos(dl), z = s0 * sl + c0 * cl * Math.cos(dl);
    const k = 1 + h;
    return [cx + R * x * k, cy - R * y * k, z, x * x + y * y];
  };
}
// great-circle distance (deg)
const gc = (la1, lo1, la2, lo2) => {
  const a = la1 * D2R, b = la2 * D2R, d = (lo2 - lo1) * D2R;
  return Math.acos(clamp(Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(d), -1, 1)) / D2R;
};

export default {
  async init(ctx) { await loadGeo(); },
  async prepare() { await loadGeo(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    const tBurn = pick(p.tBurn, wordT(A, 'burn, and fall', 'burn', 169.44));
    const tFall = pick(p.tFall, wordT(A, 'burn, and fall', 'fall', 170.08));
    const tEnd = pick(p.tEnd, shot.t1);
    const lat0 = p.lat0 ?? 16, lon0 = (p.lon0 ?? 18) + lt * 1.2;
    const C = p.center || [960, 1560], R = (p.radius ?? 1250) * (1 + 0.012 * lt);
    const pr = projector(lat0, lon0, C[0], C[1], R);
    drawSky(ctx, { density: 0.3, band: 0.15, neb: 0.12, seed: 23, exposure: 0.5, pan: [lt * 3, 0] });
    const SC = p.soft ? soft2d(e) : null;
    const c = SC ? SC.begin() : e.c2dBegin();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // the night disc (occludes the sky), limb and airglow
    c.fillStyle = 'rgb(4,6,12)';
    c.beginPath(); c.arc(C[0], C[1], R, 0, Math.PI * 2); c.fill();
    const burnAll = smooth(range(t, tBurn, tFall + 0.4));
    c.globalCompositeOperation = 'lighter';
    {
      // airglow: a few concentric strokes (a full-dome radial gradient is very slow on this canvas)
      const ac = [lerp(0.62, 0.7, burnAll), lerp(0.74, 0.32, burnAll), lerp(1.0, 0.26, burnAll)];
      for (const [k, w, a] of [[1.006, 6, 0.05], [1.012, 10, 0.03], [1.02, 16, 0.015]]) {
        c.strokeStyle = css(ac, a); c.lineWidth = w; c.beginPath(); c.arc(C[0], C[1], R * k, Math.PI * 1.0, Math.PI * 2.0); c.stroke();
      }
      c.strokeStyle = css(P.ice, 0.5 * (1 - 0.6 * burnAll)); c.lineWidth = 2;
      c.beginPath(); c.arc(C[0], C[1], R * 1.004, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
    }
    // graticule: the engraver's globe
    c.strokeStyle = css(P.steel, 0.13); c.lineWidth = 1.5;
    c.lineJoin = 'bevel'; c.lineCap = 'butt';
    c.beginPath();
    for (let la = -20; la <= 80; la += 10) {
      let on = false;
      for (let lo = lon0 - 95; lo <= lon0 + 95; lo += 2) { const q = pr(la, lo); if (q[2] <= 0) { on = false; continue; } if (!on) { c.moveTo(q[0], q[1]); on = true; } else c.lineTo(q[0], q[1]); }
    }
    for (let lo = Math.floor((lon0 - 90) / 15) * 15; lo <= lon0 + 90; lo += 15) {
      let on = false;
      for (let la = -30; la <= 88; la += 2) { const q = pr(la, lo); if (q[2] <= 0) { on = false; continue; } if (!on) { c.moveTo(q[0], q[1]); on = true; } else c.lineTo(q[0], q[1]); }
    }
    c.stroke();
    // coastlines
    const dbg = p.dbg || 0;
    c.strokeStyle = css(P.bookGold, 0.3); c.lineWidth = 1.6;
    c.beginPath();
    if (dbg !== 1) for (const ring of GEO.coast) {
      let on = false;
      for (let i = 0; i < ring.length; i += 2) {
        const q = pr(ring[i + 1], ring[i]);
        if (q[2] <= 0.02 || q[1] < -20 || q[1] > 1100) { on = false; continue; }
        if (!on) { c.moveTo(q[0], q[1]); on = true; } else c.lineTo(q[0], q[1]);
      }
    }
    c.stroke();
    c.lineCap = 'round'; c.lineJoin = 'round';
    // ---- the fires: targets are the largest cities in view, struck on a 16th-note grid around "burn"
    const vis = [];
    GEO.cities.forEach(([la, lo, pop], i) => { const q = pr(la, lo); if (q[2] > 0.08 && q[0] > 40 && q[0] < 1880 && q[1] > 330 && q[1] < 1060) vis.push(i); });
    const NT = Math.min(p.targets ?? 26, vis.length);
    const tg = vis.slice(0, NT);   // cities are sorted by population
    const grid = eighths(A).flatMap((x, i, arr) => (i + 1 < arr.length ? [x, (x + arr[i + 1]) / 2] : [x]));
    const snap = (x) => { let b = x, d = 1e9; for (const g of grid) { const dd = Math.abs(g - x); if (dd < d) { d = dd; b = g; } } return b; };
    const fires = tg.map((ci, k) => {
      const ti = snap(tBurn - 0.08 + 0.6 * Math.pow(hash1(ci * 1.3 + 7), 1.3));
      const f = unit({ ci, ti, lat: GEO.cities[ci][0], lon: GEO.cities[ci][1], rmax: 1.6 + 3.2 * Math.pow(GEO.cities[ci][2] / 2e7, 0.4) + 1.2 * hash1(ci) }); f.cmax = Math.cos(f.rmax * D2R); return f;
    });
    const fireR = (f) => (t < f.ti ? 0 : f.rmax * easeOutCubic(clamp((t - f.ti) / 1.1)));
    // tracks: thin red arcs from over the limb down onto each target
    for (const f of fires) {
      const tl = f.ti - 0.55 - 0.25 * hash1(f.ci * 2.1);
      if (t < tl || t > f.ti + 0.25) continue;
      const fromLat = f.lat + 28 + 10 * hash1(f.ci * 3.3), fromLon = f.lon + (hash1(f.ci * 4.7) - 0.5) * 40;
      const u = clamp((t - tl) / (f.ti - tl));
      const fade = 1 - range(t, f.ti, f.ti + 0.25);
      c.strokeStyle = css(P.red, 0.85 * fade); c.lineWidth = 2;
      c.beginPath(); let on = false, head = null;
      const N = 30;
      for (let s = 0; s <= N; s++) {
        const v = (s / N) * u;
        const la = lerp(fromLat, f.lat, v), lo = lerp(fromLon, f.lon, v), h = 0.09 * Math.sin(Math.PI * v);
        const q = pr(la, lo, h);
        const visQ = q[2] > 0 || q[3] * (1 + h) * (1 + h) > 1;
        if (!visQ) { on = false; continue; }
        if (!on) { c.moveTo(q[0], q[1]); on = true; } else c.lineTo(q[0], q[1]);
        head = q;
      }
      c.stroke();
      if (head && u < 1) { c.fillStyle = css([1, 0.85, 0.8], 0.9 * fade); c.beginPath(); c.arc(head[0], head[1], 2.4, 0, Math.PI * 2); c.fill(); }
    }
    // the lights: gold until a fire front reaches them (red, briefly), then out; on "fall" the rest of the grid fails
    const out = (L) => tFall + 0.05 + 0.55 * L.h;
    const threadsA = 1 - smooth(range(t, tBurn, tFall));
    c.strokeStyle = css(P.gold, 0.1 * threadsA); c.lineWidth = 1.5;
    if (threadsA > 0.01) {
      c.beginPath();
      for (const [i, j] of THREADS) {
        const a = pr(GEO.cities[i][0], GEO.cities[i][1]), b = pr(GEO.cities[j][0], GEO.cities[j][1]);
        if (a[2] < 0.05 || b[2] < 0.05) continue;
        c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
      }
      c.stroke();
    }
    const BL = new Buckets(14);
    const lit = fires.filter((f) => t >= f.ti);
    if (dbg !== 2) for (const L of LIGHTS) {
      const q = pr(L.lat, L.lon); if (q[2] <= 0.03 || q[1] < 300 || q[1] > 1085 || q[0] < -5 || q[0] > 1925) continue;
      // is it inside a fire? (cheap dot-product test first)
      let tb = Infinity;
      for (const f of lit) {
        const dot = L.u[0] * f.u[0] + L.u[1] * f.u[1] + L.u[2] * f.u[2];
        if (dot < f.cmax) continue;
        const d = Math.acos(Math.min(1, dot)) / D2R;
        const tr = f.ti + 1.1 * (1 - Math.cbrt(1 - d / f.rmax));    // when the front reaches it (inverse of easeOutCubic)
        tb = Math.min(tb, tr);
      }
      const fore = Math.max(0.02, Math.sqrt(q[2]));
      let col = P.gold, a = clamp(0.25 + 0.5 * L.b) * fore, r = 1.0 + 0.5 * L.b;
      if (t > tb) {
        const k = t - tb;
        const burn = Math.exp(-k / 0.35);
        col = P.red; a = (0.9 * burn + 0.22 * Math.exp(-k / 1.4)) * fore; r *= 1 + 0.4 * burn;
      } else if (t > out(L)) {
        const k = t - out(L);
        a *= Math.exp(-k / 0.08) * (k < 0.1 ? 0.6 + 0.4 * Math.sin(k * 140) : 1);   // the grid fails: a flicker, then dark
      }
      if (a < 0.01) continue;
      const rq = Math.round(r * 2) / 2, sy = Math.max(0.35, q[2]);
      BL.rect(q[0] - rq, q[1] - rq * sy, 2 * rq, 2 * rq * sy, col, clamp(a));
    }
    BL.flush(c);
    // fire fronts and their glow (projected circles on the sphere)
    for (const f of fires) {
      const rf = fireR(f); if (rf <= 0) continue;
      const q0 = pr(f.lat, f.lon); if (q0[2] <= 0.03) continue;
      const age = t - f.ti;
      const flash = ad(t, f.ti, 0.02, 0.12);
      if (flash > 0.01) { drawGlow(c, HOT, q0[0], q0[1], 46, flash * 0.8); drawGlow(c, WHITE, q0[0], q0[1], 12, flash); }
      // the front: a red ring on the ground, dimming as it slows
      const ringA = 0.32 * Math.exp(-age / 0.45) * (1 - range(t, tEnd - 0.3, tEnd));
      c.strokeStyle = css(P.red, ringA); c.lineWidth = 2;
      c.beginPath(); let on = false;
      for (let k = 0; k <= 40; k++) {
        const az = (k / 40) * Math.PI * 2;
        const la = f.lat + rf * Math.cos(az), lo = f.lon + rf * Math.sin(az) / Math.max(0.2, Math.cos(f.lat * D2R));
        const q = pr(la, lo); if (q[2] <= 0) { on = false; continue; }
        if (!on) { c.moveTo(q[0], q[1]); on = true; } else c.lineTo(q[0], q[1]);
      }
      c.stroke();
      const rpx = rf * D2R * R * Math.max(0.3, q0[2]);
      const gA = 0.3 * Math.exp(-age / 1.4) + 0.06;
      drawGlow(c, REDG, q0[0], q0[1], rpx * 1.1 + 4, gA, Math.max(0.35, q0[2]));
    }
    c.globalCompositeOperation = 'source-over';
    if (SC) SC.blit('over', 2.0); else e.blit2d('over', 2.0);
    ctx.state.burnworld = { tBurn, tFall };
  },
  type(ty, t, lt, shot, ctx) {
    const hud = ctx.p.hud ?? 1; if (hud <= 0) return;
    ty.label('SIMULATION', 1840, 1030, { align: 'right', color: P.bookGold, alpha: 0.7 * hud * smooth(range(lt, 0.1, 0.4)), size: 12 });
  },
};
