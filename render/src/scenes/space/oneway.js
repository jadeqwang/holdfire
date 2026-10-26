// ONE-WAY: "a one-way dialogue" (P1d). A pulse of light leaves the pale blue dot and the camera pulls back through nine
// and a half decades of distance: the Moon's orbit, the planets (true orbit radii, an engraved orrery), the Kuiper belt,
// Voyager 1, the Oort cloud, the nearest stars, to the 89-light-year scale where the Other's world waits (fiction, the
// film's 89 LY). A rolling odometer counts the light-years the pulse has travelled; the far star is labelled ARRIVES IN
// 89 YEARS. Each object flashes as the light reaches it. Time is compressed; distances and light-times are true.
// p (optional): tStart ('a', 40.64), tSend ('one-way', 40.88), tArrive ('dialogue', 42.28), earth [x,y] (620,700),
//   target [x,y] (1500,372), hud (0..1)
import { drawSky } from '../sky.js';
import { P, css } from '../../palette.js';
import { clamp, lerp, smooth, smoother, range, easeInOutCubic, easeOutCubic, hash1, hash2, rng } from '../../util.js';
import { wordT, ad, env, pick, Buckets } from './common.js';

const LY_AU = 63241.08, LS_LY = 1 / 31557600, AU_LY = 1 / 63241.08;
const TILT = Math.cos(63 * Math.PI / 180);             // the ecliptic seen obliquely
const PLANETS = [['MERCURY', 0.387, 40], ['VENUS', 0.723, 200], ['EARTH', 1.0, 110], ['MARS', 1.524, 300], ['JUPITER', 5.203, 20],
  ['SATURN', 9.537, 250], ['URANUS', 19.19, 160], ['NEPTUNE', 30.07, 330]];
const NEAR = [['ALPHA CENTAURI', 4.37, [0.55, 0.62]], ['BARNARD\'S STAR', 5.96, [-0.2, -0.9]], ['WOLF 359', 7.86, [-0.85, 0.2]], ['SIRIUS', 8.6, [0.25, 0.8]]];

let STARS = null, KUIPER = null, OORT = null;
const COOL = [0.82, 0.88, 1], WARM = [1, 0.93, 0.82];
function build() {
  const R = rng(4242);
  // a sample of stars out to ~140 ly (not to density: a legible field), with magnitudes
  STARS = [];
  for (let i = 0; i < 1150; i++) {
    const r = 2 + Math.pow(R(), 0.55) * 140, th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1);
    STARS.push({ x: r * Math.sin(ph) * Math.cos(th), y: r * Math.sin(ph) * Math.sin(th), b: 0.25 + Math.pow(R(), 6) * 2.2, w: R() });
  }
  KUIPER = []; for (let i = 0; i < 420; i++) { const a = R() * Math.PI * 2, r = 30 + R() * 20 + (R() - 0.5) * 6; KUIPER.push([a, r, R()]); }
  OORT = []; for (let i = 0; i < 900; i++) { const r = (2000 + Math.pow(R(), 0.7) * 98000) * AU_LY, th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1); OORT.push([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), R()]); }
}

function fmtElapsed(ly) {
  const s = ly / LS_LY;
  if (s < 60) return `${s.toFixed(1)} S`;
  if (s < 3600) return `${(s / 60).toFixed(1)} MIN`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} HOURS`;
  if (ly < 1) return `${(s / 86400).toFixed(0)} DAYS`;
  return `${ly.toFixed(2)} YEARS`;
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine, A = ctx.audio;
    if (!STARS) build();
    const tStart = pick(p.tStart, wordT(A, 'a one-way dialogue', 'a', 40.64));
    const tSend = pick(p.tSend, wordT(A, 'a one-way dialogue', 'one-way', 40.88));
    const tArr = pick(p.tArrive, wordT(A, 'a one-way dialogue', 'dialogue', 42.28));
    const E = p.earth || [620, 700], TG = p.target || [1500, 372];
    // ---- the zoom: log10 of the half-width of the frame, in ly
    const lw0 = Math.log10(1.7 * 299792.458 / 9.4607e12), lw1 = Math.log10(960 / Math.hypot(TG[0] - E[0], TG[1] - E[1]) * 89);
    const u = range(t, tSend + 0.08, tArr + 0.35);
    const lw = lerp(lw0, lw1, easeInOutCubic(u)) + 0.04 * Math.max(0, t - tArr - 0.35);
    const W = Math.pow(10, lw);
    const K = 960 / W;                                    // px per ly
    // ---- the pulse: leads the camera through the solar system, then the camera outruns it
    const kk = easeOutCubic(range(t, tSend, tSend + 0.4));
    let ld = lw + Math.log10(Math.max(1e-6, 0.46 * kk));
    if (lw > -0.4) ld = Math.log10(0.46) - 0.4 + (lw + 0.4) * 0.6 + 0.25 * Math.max(0, t - tArr - 0.35);
    ld = Math.min(ld, Math.log10(0.46) + lw);
    const D = t >= tSend ? Math.pow(10, ld) : 0;          // ly travelled
    const Rpx = D * K;

    drawSky(ctx, { density: 0.22, band: 0.2, bandAng: 0.35, bandOff: 140, neb: 0.18, nebCol: [0.02, 0.03, 0.06], seed: 41, exposure: 0.42 });
    const c = e.c2dBegin();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalCompositeOperation = 'lighter';
    const scr = (x, y) => [E[0] + x * K, E[1] + y * K];   // diagram space (ly, screen axes) -> px
    const lit = (dist) => (D >= dist && dist > 0 ? Math.exp(-Math.log10(D / dist) * 6) : 0);   // flashes as the light reaches it
    const label = [];

    // ---- solar system (AU), the Sun up-right of Earth, orbits in the tilted ecliptic
    const thE = 110 * Math.PI / 180;
    const sun = [-Math.cos(thE) * AU_LY, -Math.sin(thE) * TILT * AU_LY];
    const orb = (rAU, th) => [sun[0] + Math.cos(th) * rAU * AU_LY, sun[1] + Math.sin(th) * rAU * AU_LY * TILT];
    const sunPx = scr(...sun);
    // the Moon's orbit (384,400 km = 1.28 light-seconds)
    const moonR = 384400 / 9.4607e12;
    const mR = moonR * K;
    if (mR > 12 && mR < 4000) {
      const a = smooth(range(mR, 12, 60)) * (1 - smooth(range(mR, 1600, 4000)));
      c.strokeStyle = css(P.steel, 0.55 * a); c.lineWidth = 2;
      c.beginPath(); c.ellipse(E[0], E[1], mR, mR * TILT, 0, 0, Math.PI * 2); c.stroke();
      const ma = -0.9; const mp = [E[0] + Math.cos(ma) * mR, E[1] + Math.sin(ma) * mR * TILT];
      c.fillStyle = css(P.cream, 0.8 * a + 0.8 * lit(moonR) * a); c.beginPath(); c.arc(mp[0], mp[1], Math.max(1.6, 1737 / 9.4607e12 * K), 0, Math.PI * 2); c.fill();
      if (mR > 120 && mR < 1200) label.push(['MOON · 1.3 LIGHT-SECONDS', mp[0] + 12, mp[1] - 10, a]);
    }
    // planets
    for (const [name, rAU, deg] of PLANETS) {
      const r = rAU * AU_LY * K;
      if (r < 8 || r > 6000) continue;
      const a = smooth(range(r, 8, 40)) * (1 - smooth(range(r, 2400, 6000)));
      c.strokeStyle = css(name === 'EARTH' ? P.ice : P.bookGold, (name === 'EARTH' ? 0.5 : 0.38) * a); c.lineWidth = 2;
      c.beginPath(); c.ellipse(sunPx[0], sunPx[1], r, r * TILT, 0, 0, Math.PI * 2); c.stroke();
      if (name !== 'EARTH') {
        const q = scr(...orb(rAU, deg * Math.PI / 180));
        const dist = Math.hypot(q[0] - E[0], q[1] - E[1]) / K;
        c.fillStyle = css(P.cream, a * (0.75 + 0.8 * lit(dist))); c.beginPath(); c.arc(q[0], q[1], 2.2, 0, Math.PI * 2); c.fill();
        if ((name === 'JUPITER' || name === 'NEPTUNE' || name === 'MARS') && r > 70 && r < 900) label.push([name, q[0] + 10, q[1] - 8, a]);
      }
    }
    // the Sun
    {
      const r = AU_LY * K;
      if (r > 6) {
        const a = smooth(range(r, 6, 30));
        const g = c.createRadialGradient(sunPx[0], sunPx[1], 0, sunPx[0], sunPx[1], 22);
        g.addColorStop(0, css(P.goldPale, 0.95 * a)); g.addColorStop(0.25, css(P.gold, 0.35 * a)); g.addColorStop(1, css(P.gold, 0));
        c.fillStyle = g; c.beginPath(); c.arc(sunPx[0], sunPx[1], 22, 0, Math.PI * 2); c.fill();
        if (r > 60 && r < 700) label.push(['SUN · 8.3 LIGHT-MINUTES', sunPx[0] + 16, sunPx[1] - 14, a]);
      }
    }
    // Kuiper belt
    {
      const r = 40 * AU_LY * K;
      if (r > 20 && r < 5000) {
        const a = smooth(range(r, 20, 80)) * (1 - smooth(range(r, 1800, 5000)));
        c.fillStyle = css(P.bookGold, 0.45 * a);
        for (const [an, ra] of KUIPER) { const q = scr(...orb(ra, an)); c.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
      }
    }
    // Voyager 1 (~1 light-day out in 2026), its track
    {
      const dV = 173 * AU_LY, dir = [0.55, -0.835];
      const q = scr(sun[0] + dir[0] * dV, sun[1] + dir[1] * dV);
      const r = dV * K;
      if (r > 30 && r < 6000) {
        const a = smooth(range(r, 30, 90)) * (1 - smooth(range(r, 2200, 6000)));
        c.strokeStyle = css(P.ice, 0.35 * a); c.lineWidth = 2; c.setLineDash([3, 7]);
        c.beginPath(); c.moveTo(sunPx[0], sunPx[1]); c.lineTo(q[0], q[1]); c.stroke(); c.setLineDash([]);
        const f = lit(dV);
        c.strokeStyle = css(P.ice, (0.85 + f) * a); c.lineWidth = 2;
        c.beginPath(); c.moveTo(q[0] - 6, q[1]); c.lineTo(q[0] + 6, q[1]); c.moveTo(q[0], q[1] - 6); c.lineTo(q[0], q[1] + 6); c.stroke();
        if (r > 90 && r < 1400) label.push(['VOYAGER 1 · LAUNCHED 1977 · ~1 LIGHT-DAY', q[0] + 14, q[1] - 10, a]);
      }
    }
    // Oort cloud (2,000-100,000 AU)
    {
      const r = 0.5 * K;
      if (r > 30 && r < 8000) {
        const a = smooth(range(r, 30, 120)) * (1 - smooth(range(r, 2500, 8000))) * 0.5;
        c.fillStyle = css(P.steel, 0.8 * a);
        for (const [x, y] of OORT) { const q = scr(sun[0] + x, sun[1] + y); if (q[0] > -5 && q[0] < 1925 && q[1] > -5 && q[1] < 1085) c.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
      }
    }
    // the nearest stars and the field beyond
    if (K < 2e4) {
      const fa = smooth(range(Math.log10(K), Math.log10(2e4), Math.log10(1500)));
      const BS = new Buckets(12);
      for (const s of STARS) {
        const q = scr(s.x, s.y);
        if (q[0] < -5 || q[0] > 1925 || q[1] < -5 || q[1] > 1085) continue;
        const f = lit(Math.hypot(s.x, s.y));
        BS.dot(q[0], q[1], Math.round((0.9 + 0.7 * s.b) * 2) / 2, s.w < 0.7 ? COOL : WARM, clamp(fa * (0.22 + 0.36 * s.b) + 0.6 * f * fa));
      }
      BS.flush(c);
      for (const [name, d, dir] of NEAR) {
        const n = Math.hypot(dir[0], dir[1]);
        const q = scr(dir[0] / n * d * 0.92, dir[1] / n * d * 0.92);
        const r = d * K;
        if (r < 20 || r > 4000) continue;
        const a = smooth(range(r, 20, 70)) * (1 - smooth(range(r, 1800, 4000)));
        const f = lit(d);
        c.fillStyle = css(P.cream, a * (0.85 + f)); c.beginPath(); c.arc(q[0], q[1], 2.4, 0, Math.PI * 2); c.fill();
        if (name === 'ALPHA CENTAURI' ? r > 34 : (r > 160 && r < 900)) label.push([`${name} · ${d} LY`, q[0] + 12, q[1] - 9, a * (name === 'ALPHA CENTAURI' ? 1 : 0.8)]);
      }
    }
    // ---- the Other's world: 89 light-years (the film's fiction); the one-way path to it
    const ta = smooth(range(t, tArr - 0.25, tArr + 0.35));
    if (ta > 0) {
      c.strokeStyle = css(P.goldPale, 0.38 * ta); c.lineWidth = 2; c.setLineDash([2, 9]);
      const ux = TG[0] - E[0], uy = TG[1] - E[1], L = Math.hypot(ux, uy);
      const drawn = easeOutCubic(range(t, tArr - 0.2, tArr + 0.5));
      c.beginPath(); c.moveTo(E[0] + ux / L * 20, E[1] + uy / L * 20); c.lineTo(E[0] + ux * drawn - ux / L * 22, E[1] + uy * drawn - uy / L * 22); c.stroke(); c.setLineDash([]);
      // one-way: a single arrowhead
      if (drawn > 0.98) {
        const hx = TG[0] - ux / L * 24, hy = TG[1] - uy / L * 24, nx = -uy / L, ny = ux / L;
        c.beginPath(); c.moveTo(hx - ux / L * 11 + nx * 6, hy - uy / L * 11 + ny * 6); c.lineTo(hx, hy); c.lineTo(hx - ux / L * 11 - nx * 6, hy - uy / L * 11 - ny * 6); c.stroke();
      }
      const g = c.createRadialGradient(TG[0], TG[1], 0, TG[0], TG[1], 26);
      g.addColorStop(0, css([0.9, 1, 0.92], 0.95 * ta)); g.addColorStop(0.2, css(P.luna, 0.35 * ta)); g.addColorStop(1, css(P.luna, 0));
      c.fillStyle = g; c.beginPath(); c.arc(TG[0], TG[1], 26, 0, Math.PI * 2); c.fill();
      c.strokeStyle = css(P.gold, 0.9 * ta); c.lineWidth = 2;
      c.beginPath(); c.arc(TG[0], TG[1], 15 + 6 * (1 - ta), 0, Math.PI * 2); c.stroke();
    }
    // ---- the pale blue dot
    {
      const rE = Math.max(2.4, 6371 / 9.4607e12 * K);
      const g = c.createRadialGradient(E[0], E[1], 0, E[0], E[1], rE * 2 + 8);
      g.addColorStop(0, css([0.6, 0.75, 1], 0.7)); g.addColorStop(0.4, css([0.4, 0.55, 1], 0.18)); g.addColorStop(1, css([0.3, 0.45, 1], 0));
      c.fillStyle = g; c.beginPath(); c.arc(E[0], E[1], rE * 2 + 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = css([0.62, 0.76, 1], 1); c.beginPath(); c.arc(E[0], E[1], rE, 0, Math.PI * 2); c.fill();
      if (rE > 4) { c.strokeStyle = css(P.ice, 0.5); c.lineWidth = 1.5; c.beginPath(); c.arc(E[0], E[1], rE + 2.5, 0, Math.PI * 2); c.stroke(); }
      // the send: a gold flash
      const fl = ad(t, tSend, 0.03, 0.22);
      if (fl > 0.01) {
        const gg = c.createRadialGradient(E[0], E[1], 0, E[0], E[1], 60 * fl + 12);
        gg.addColorStop(0, css([1, 0.97, 0.88], fl)); gg.addColorStop(0.18, css(P.goldPale, 0.45 * fl)); gg.addColorStop(1, css(P.gold, 0));
        c.fillStyle = gg; c.beginPath(); c.arc(E[0], E[1], 60 * fl + 12, 0, Math.PI * 2); c.fill();
        c.fillStyle = css(P.goldPale, 0.6 * fl); c.fillRect(E[0] - 300 * fl, E[1] - 1.2, 600 * fl, 2.4);
      }
    }
    // ---- the pulse: a ring of light (a sphere's edge), two faint echoes behind it
    if (t >= tSend && Rpx > 1) {
      for (const [k, a, w] of [[1, 0.8, 2.2], [0.972, 0.18, 2]]) {
        const r = Rpx * k; if (r < 2) continue;
        c.strokeStyle = css(k === 1 ? P.goldPale : P.gold, a); c.lineWidth = w;
        c.beginPath(); c.arc(E[0], E[1], r, 0, Math.PI * 2); c.stroke();
      }
      c.strokeStyle = css(P.gold, 0.06); c.lineWidth = 8;
      c.beginPath(); c.arc(E[0], E[1], Rpx, 0, Math.PI * 2); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    e.blit2d('over', 2.0);
    ctx.state.oneway = { D, label, ta, tSend, tArr, E, TG, W };
  },
  type(ty, t, lt, shot, ctx) {
    const st = ctx.state.oneway; if (!st) return;
    const hud = ctx.p.hud ?? 1; if (hud <= 0) return;
    for (const [s, x, y, a] of st.label) ty.label(s, x, y, { color: P.bookGold, alpha: a * 0.85 * hud, size: 12 });
    ty.label('EARTH', st.E[0] - 14, st.E[1] + 34, { align: 'right', color: P.ice, alpha: 0.75 * hud * (1 - smooth(range(t, st.tSend + 0.2, st.tSend + 0.6))) + 0.75 * hud * st.ta, size: 12 });
    // the odometer: light-years travelled, rolling digits
    const x = 1840, y = 1000;
    const a0 = hud * smooth(range(t, st.tSend - 0.1, st.tSend + 0.15));
    if (a0 > 0) {
      ty.label('PULSE · DISTANCE TRAVELLED', x, y - 74, { align: 'right', color: P.bookGold, alpha: a0 * 0.85, size: 12 });
      const v = st.D;
      const s = v.toFixed(9).padStart(13, '0');           // 000.000000031
      const cw = 22.8, digits = s.split('');
      let xx = x - 58 - digits.length * cw;
      const c = ty.ctx;
      for (let i = 0; i < digits.length; i++) {
        const ch = digits[i];
        if (ch === '.') { ty.text('.', xx + cw * 0.5, y - 26, { font: 'Plex', size: 38, align: 'center', color: P.goldPale, alpha: a0 }); xx += cw; continue; }
        // rolling wheel: the continuous position of this digit
        const place = i < s.indexOf('.') ? s.indexOf('.') - 1 - i : -(i - s.indexOf('.'));
        const pos = (v / Math.pow(10, place)) % 10;
        const d0 = Math.floor(pos), fr = pos - d0;
        const lead = Math.floor(Math.log10(Math.max(v, 1e-12)));
        const slow = place >= lead - 2;
        const roll = slow && fr > 0.85 ? (fr - 0.85) / 0.15 : 0;
        const dim = place > lead ? 0.45 : (slow ? 1 : 0.7);
        c.save(); c.beginPath(); c.rect(xx, y - 62, cw, 46); c.clip();
        ty.text(String(d0), xx + cw / 2, y - 26 - roll * 40, { font: 'Plex', size: 38, align: 'center', color: P.goldPale, alpha: a0 * dim * (1 - roll * 0.5), glow: dim > 0.9 ? 6 : 0 });
        if (roll > 0) ty.text(String((d0 + 1) % 10), xx + cw / 2, y - 26 + (1 - roll) * 40, { font: 'Plex', size: 38, align: 'center', color: P.goldPale, alpha: a0 * (0.5 + roll * 0.5), glow: 6 });
        c.restore();
        xx += cw;
      }
      ty.text('LY', x, y - 26, { font: 'Plex', size: 22, align: 'right', color: P.gold, alpha: a0 * 0.9 });
      ty.text(`T + ${fmtElapsed(v)}`, x, y + 6, { font: 'Plex', size: 18, track: 0.06, align: 'right', color: P.cream, alpha: a0 * 0.7 });
    }
    // the far world
    if (st.ta > 0) {
      const [X, Y] = st.TG;
      ty.text('89 LIGHT-YEARS', X + 34, Y - 6, { font: 'Plex', size: 20, track: 0.06, color: P.cream, alpha: st.ta * hud * 0.9 });
      ty.text('ARRIVES IN 89 YEARS', X + 34, Y + 22, { font: 'Plex', size: 20, track: 0.06, color: P.gold, alpha: st.ta * hud, glow: 10 });
      ty.label('A REPLY: 178 YEARS AFTER SENDING', X + 34, Y + 48, { color: P.bookGold, alpha: st.ta * hud * 0.7 * smooth(range(t, st.tArr + 0.4, st.tArr + 0.9)), size: 11 });
    }
  },
};
