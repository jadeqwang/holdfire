// T2_TABLET: V113's clay tablet (0:25.37-27.32, "...and the mud"), a multi layer over the plate. The plate paints its own row of
// generic triangles; this layer covers them with clean wet clay (baked by tools/t2/tablet_clay.py: assets/t2/tablet/) and
// presses real cuneiform into it while the "mud" note holds: the Fibonacci numbers 1 1 2 3 5 8 13 21 34 55 89 in Old Babylonian
// sexagesimal numerals (cuneiform.js), in two ruled registers, one number per press time, each sign pressed in turn; under a
// double ruling, a line already on the tablet: "um-ma na-an-ni-ma", "thus (says) Nanni", from the Ea-nasir complaint tablet.
// The plate's stylus and hand stay on top (a per-plate-frame matte), and their shadow falls on the new clay.
// p: {clip ('V113'), times [11 press times, song s], o [x, y] (row 1's baseline start), size, rows {u, v} axes, flash (s)}
import { clamp, easeOutExpo, lerp } from '../../../util.js';
import { scratch, knock, grainTile } from './kit.js';
import { FIB, cuneiformNumber, NANNI, cps } from './cuneiform.js';
import { picks2, plateMeta, plateFrame, withPick } from '../plate/lib.js';

const ASSET = 'assets/t2/tablet';
let assetsP = null;
function loadImg(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('missing ' + url)); im.src = url; });
}
// the clay patch, and the per-frame maps split into two alpha canvases (shadow, stylus matte), built once
function assets() {
  if (!assetsP) {
    assetsP = (async () => {
      const [meta, clay, maps] = await Promise.all([fetch(`${ASSET}/tablet.json`).then((r) => r.json()), loadImg(`${ASSET}/clay.png`), loadImg(`${ASSET}/maps.png`)]);
      const W = maps.width, H = maps.height / 2;
      const src = document.createElement('canvas'); src.width = maps.width; src.height = maps.height;
      const sg = src.getContext('2d', { willReadFrequently: true }); sg.drawImage(maps, 0, 0);
      const px = sg.getImageData(0, 0, maps.width, maps.height).data;
      const mk = (row) => {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d'); const im = g.createImageData(W, H);
        for (let i = 0; i < W * H; i++) im.data[i * 4 + 3] = px[(row * W * H + i) * 4];
        g.putImageData(im, 0, 0); return c;
      };
      return { meta, clay, dark: mk(0), cut: mk(1) };
    })();
  }
  return assetsP;
}

// the inscription, in tablet space (u along a row, v down the tablet; baselines at v = 0, ROW, NANNI_V)
const GAP = 24, PLACE_GAP = 20, SIGN_GAP = 3, ROW = 58, NANNI_V = 116, NANNI_PX = 36;
function layoutSigns(g, size, times) {
  g.font = `400 ${size}px L2Cun`;
  const out = [];
  const rows = [FIB.slice(0, 7), FIB.slice(7)];
  let k = 0;
  rows.forEach((nums, r) => {
    let u = r * 6;
    for (const n of nums) {
      const places = cuneiformNumber(n), t0 = times[k++];
      let j = 0;
      places.forEach((place, pi) => {
        if (pi) u += PLACE_GAP;
        for (const cp of place) {
          const s = cps([cp]), w = g.measureText(s).width;
          out.push({ s, u, v: r * ROW, size, t: t0 + j * 0.055 }); u += w + SIGN_GAP; j++;
        }
      });
      u += GAP - SIGN_GAP;
    }
  });
  return out;
}

const DARK = 'rgba(30,16,6,1)', CORE = 'rgba(70,44,22,0.98)', LITE = 'rgba(255,236,200,0.9)';
function pressSign(g, it, t, flash) {
  const k = clamp((t - it.t) / 0.09), sc = lerp(1.18, 1, easeOutExpo(k)), size = it.size;
  g.save(); g.font = `400 ${size}px L2Cun`; g.textBaseline = 'alphabetic';
  g.translate(it.u, it.v - size * 0.35); g.scale(sc, sc); g.translate(-it.u, -(it.v - size * 0.35));
  g.globalAlpha = clamp(k * 2);
  g.fillStyle = LITE; g.fillText(it.s, it.u - size * 0.03, it.v - size * 0.035);   // the lit lip
  g.fillStyle = DARK; g.fillText(it.s, it.u + size * 0.035, it.v + size * 0.04);   // the shadowed wall
  g.fillStyle = CORE; g.fillText(it.s, it.u, it.v);                                // the floor of the impression
  const f = 1 - (t - it.t) / flash;                                                // verse 1's blueprint line, for a moment
  if (f > 0) { g.globalAlpha = 0.85 * f * f; g.strokeStyle = 'rgba(215,240,255,1)'; g.lineWidth = 1.6; g.strokeText(it.s, it.u, it.v); }
  g.restore();
}
function rule(g, u0, u1, v) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,236,200,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(u0, v - 1.4); g.lineTo(u1, v - 1.4); g.stroke();
  g.strokeStyle = 'rgba(30,16,6,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(u0, v + 0.8); g.lineTo(u1, v + 0.8); g.stroke();
  g.restore();
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    const A = await assets();
    let frame = -1;
    try {
      const pk = await picks2(), src = pk[p.clip || 'V113'];
      const meta = await plateMeta(src.dir);
      if (meta.src === A.meta.plate.src && meta.n === A.meta.n && meta.start === A.meta.plate.start) frame = plateFrame(meta, withPick(src, p.plateP || {}), lt, t);
      else if (!globalThis.__t2tabletWarned) { globalThis.__t2tabletWarned = true; console.warn('t2_tablet: the V113 plate changed; re-run tools/t2/tablet_clay.py'); }
    } catch (e) { /* no plate: inscription only */ }
    ctx.state.t2tablet = { A, frame };
  },
  draw(ctx, shot, t, lt, p) {
    const st = ctx.state.t2tablet; if (!st) return;
    const { A, frame } = st;
    const e = ctx.engine, S = e.S;
    const [X0, Y0, X1, Y1] = A.meta.region, RW = X1 - X0, RH = Y1 - Y0;
    const times = p.times;
    const o = p.o || [444, 650], ax = p.u || [1, -0.138], ay = p.v || [0.31, 0.8];
    const size = p.size || 48, flash = p.flash ?? 0.45;

    // the inscription (tablet space -> screen by one affine map), into its own layer so the grain only bites the wedges
    const I = scratch('t2tab_ins', RW * S, RH * S), gi = I.g;
    gi.setTransform(S, 0, 0, S, 0, 0); gi.transform(ax[0], ax[1], ay[0], ay[1], o[0] - X0, o[1] - Y0);
    const items = layoutSigns(gi, size, times);
    const uEnd = Math.max(...items.filter((x) => x.v === 0).map((x) => x.u)) + 60;
    const uEnd2 = Math.max(...items.filter((x) => x.v === ROW).map((x) => x.u)) + 70;
    rule(gi, -14, uEnd, 13);
    rule(gi, -8, Math.max(uEnd, uEnd2), ROW + 13); rule(gi, -8, Math.max(uEnd, uEnd2), ROW + 19);
    // the Nanni line: already on the tablet (dried a little: no flash)
    let u = 8;
    gi.font = `400 ${NANNI_PX}px L2Cun`;
    for (const [, cp] of NANNI.signs) {
      const s = cps([cp]);
      pressSign(gi, { s, u, v: NANNI_V, size: NANNI_PX, t: -1e9 }, t, 0);
      u += gi.measureText(s).width + 10;
    }
    for (const it of items) if (t >= it.t) pressSign(gi, it, t, flash);
    knock(gi, grainTile(), 0.22, I.w, I.h);

    // clean clay + inscription, then the plate frame's shadow and stylus matte
    const C = scratch('t2tab_clay', RW * S, RH * S), g = C.g;
    g.setTransform(S, 0, 0, S, 0, 0);
    if (frame >= 0) g.drawImage(A.clay, 0, 0, RW, RH);
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(I, 0, 0, I.w, I.h, 0, 0, I.w, I.h);
    if (frame >= 0) {
      const mw = A.meta.mapW, mh = A.meta.mapH, f = Math.min(A.meta.n - 1, frame);
      g.setTransform(S, 0, 0, S, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.drawImage(A.dark, f * mw, 0, mw, mh, 0, 0, RW, RH);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(A.cut, f * mw, 0, mw, mh, 0, 0, RW, RH);
      g.globalCompositeOperation = 'source-over';
    }
    const c = e.c2dBegin();
    c.drawImage(C, 0, 0, C.w, C.h, X0, Y0, RW, RH);
    e.blit2d('over', p.gain ?? 1);
  },
};
