// T2_TABLET: V113's clay tablet (0:25.37-27.32, "...and the mud"), a multi layer over the plate. The plate paints its own row of
// generic triangles; this layer covers them with clean wet clay (baked by tools/t2/tablet_clay.py: assets/t2/tablet/) and
// carries real cuneiform: the Fibonacci numbers 1 1 2 3 5 8 13 21 34 55 89 in Old Babylonian sexagesimal numerals
// (cuneiform.js), in two ruled registers; under a double ruling, a line already on the tablet: "um-ma na-an-ni-ma", "thus (says)
// Nanni", from the Ea-nasir complaint tablet.
// Jade (take two notes): the stylus has to make the strokes that appear. So the count is on the clay when the shot opens except
// 89, and the plate's stylus writes that, left to right without going back (B. R. Foster, 31 Oct: the hand "should write continuously
// from left to right, just as we do, ending on that last 1-sign after the LAL"): 𒁹 on its first landing, 𒌍 on the next, 𒇲 on
// the third and the last 1 where the tip slides on from there. 89 = 1;29 is written the scribes' way: 29 = 30 LAL 1, 𒁹 𒌍𒇲𒁹. The last 1
// sits inside LAL under its top wedge, which roofs it, its head pointing at the join of LAL's two wedges at 11 o'clock and not touching
// (Foster, 31 Oct). Each sign grows down from its top on its landing, with a ridge of displaced clay ahead of it.
// The plate's stylus and hand stay on top (a per-plate-frame matte, trimmed to the stylus within 90 px of the tip so the plate's
// own marks and the stylus' contact shadow there do not cut the inscription), and their shadow falls on the new clay.
// p: {clip ('V113'), size (sign px), gain}
import { clamp, lerp } from '../../../util.js';
import { scratch, knock, grainTile } from './kit.js';
import { FIB, cuneiformNumber, EA_NASIR, NANNI, cps } from './cuneiform.js';
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

// ------------------------------------------------------------------------------------------------ the stylus
// The reed tip (design px = plate px) on the even plate frames 4..50 the shot shows (on twos: plate frame 4 + 2 * floor(lt * 12)).
// Hand-marked on 3x crops of work/plates/V113. Landings: frame 6-16 (782, 640), 22-34 (846, 622), 38, sliding right to 44 and off.
const TIP = {
  4: [770, 622], 6: [782, 640], 8: [792, 639], 10: [792, 639], 12: [792, 639], 14: [790, 640], 16: [792, 635], 18: [812, 605],
  20: [829, 595], 22: [840, 625], 24: [846, 622], 26: [850, 622], 28: [853, 622], 30: [853, 622], 32: [853, 622], 34: [857, 618],
  36: [880, 595], 38: [894, 601], 40: [901, 601], 42: [904, 605], 44: [908, 601], 46: [918, 598], 48: [925, 595], 50: [935, 598],
};
const TIP_F0 = 4, TIP_F1 = 50;
const AXIS = [0.78, -0.625];        // the shaft, from the tip up to the hand (screen; it turns by a few degrees over the shot)
function tipAt(f) {
  f = clamp(f, TIP_F0, TIP_F1);
  const a = f - (f % 2), b = Math.min(TIP_F1, a + 2), k = b > a ? (f - a) / (b - a) : 0;
  return [lerp(TIP[a][0], TIP[b][0], k), lerp(TIP[a][1], TIP[b][1], k)];
}
// the presses: the plate frame the tip lands on, which sign it makes, and the frames that sign takes to grow
const PRESSES = [{ f: 6, key: 'sixties', dur: 6 }, { f: 22, key: 'thirty', dur: 8 }, { f: 38, key: 'lal', dur: 4 }, { f: 44, key: 'last', dur: 4 }];

// ------------------------------------------------------------------------------------------------ the inscription
// tablet space: u along a row, v down the tablet (row 2's baseline at v = 0, row 1's at -ROW, the letter's lines at EDGE's v)
const GAP = 30, SIGN_GAP = 3, ROW = 58, NANNI_PX = 28;
// the letter's lines under the ruling: obverse 1 "to Ea-nasir" (added 30 Oct, the s,i sign confirmed by B. R. Foster), then 3, Nanni
const EDGE = [[EA_NASIR, 46], [NANNI, 94]];
// Noto Sans Cuneiform geometry (em): a vertical wedge's head centre is 0.69 above the baseline; DISH's head centre is 0.208 from
// its origin
const HEAD_Y = 0.69, DISH_HX = 0.208, WEDGE_W = 0.24;
// the last 1 leans so its head points at LAL's join at 11 o'clock: turned about its head, the tail swung right (radians; canvas
// rotation, negative = counter-clockwise). Scaled to fit under LAL's top wedge; LAST_IN is its head centre in LAL's em box (the join,
// from the font's outline, is at about 0.31, 0.72). THIRTY_AT: 𒌍's centre past the sixties head, on the second landing.
const LAL_TILT = -0.52, LAST_SCALE = 0.7, LAST_IN = [0.38, 0.58], THIRTY_AT = 66;
const V_AXIS = [0.2, 0.8];          // a tablet unit down the tablet, on screen (u is a unit along the stylus' two landings)

// rows: 1 1 2 3 5 8 13 / 21 34 55 89. 89 is set from the landings: its last wedge's head is `span` past the sixties wedge's head.
function layoutSigns(g, size, span) {
  g.font = `400 ${size}px L2Cun`;
  const w = (cp) => g.measureText(cps([cp])).width;
  const out = [];
  const rows = [FIB.slice(0, 7), FIB.slice(7)];
  rows.forEach((nums, r) => {
    let u = 0;
    const v = (r - 1) * ROW;
    for (const n of nums) {
      if (n === 89) {
        const [[one], [thirty, lal, last]] = cuneiformNumber(89);
        const hu = u + DISH_HX * size, lalU = hu + span - LAST_IN[0] * size, ls = size * LAST_SCALE;
        out.push({ s: cps([one]), cp: one, u, v, size, n, press: 'sixties', w: w(one) });
        out.push({ s: cps([thirty]), cp: thirty, u: hu + THIRTY_AT - w(thirty) / 2, v, size, n, press: 'thirty', w: w(thirty) });
        out.push({ s: cps([lal]), cp: lal, u: lalU, v, size, n, press: 'lal', w: w(lal) });
        out.push({ s: cps([last]), cp: last, u: hu + span - DISH_HX * ls, v: v + HEAD_Y * ls - LAST_IN[1] * size, size: ls, n, press: 'last', tilt: LAL_TILT, w: w(last) * LAST_SCALE });
        continue;
      }
      cuneiformNumber(n).forEach((place, pi) => {
        if (pi) u += 20;
        for (const cp of place) { out.push({ s: cps([cp]), cp, u, v, size, n }); u += w(cp) + SIGN_GAP; }
      });
      u += GAP - SIGN_GAP;
    }
  });
  return out;
}
// the sign each press makes: where the tip is on it, and its extent in u
function pressWedge(it) {
  return { hu: it.u + it.w / 2, u0: it.u - 4, u1: it.u + it.w + 4 };
}
// a tilted sign (the 1 after LAL) is drawn turned about its wedge's head
function tiltAbout(g, it) {
  if (!it.tilt) return;
  const hu = it.u + DISH_HX * it.size, hv = it.v - HEAD_Y * it.size;
  g.translate(hu, hv); g.rotate(it.tilt); g.translate(-hu, -hv);
}

const DARK = 'rgba(30,16,6,1)', CORE = 'rgba(70,44,22,0.98)', LITE = 'rgba(255,236,200,0.9)';
function impress(g, s, u, v, size) {
  g.fillStyle = LITE; g.fillText(s, u - size * 0.03, v - size * 0.035);   // the lit lip
  g.fillStyle = DARK; g.fillText(s, u + size * 0.035, v + size * 0.04);   // the shadowed wall
  g.fillStyle = CORE; g.fillText(s, u, v);                                // the floor of the impression
}
// a sign already on the clay (clip: [u0, u1] of the sign to draw)
function pressed(g, it, clipU) {
  g.save(); g.font = `400 ${it.size}px L2Cun`; g.textBaseline = 'alphabetic'; tiltAbout(g, it);
  if (clipU) { g.beginPath(); g.rect(clipU[0], it.v - it.size * 1.3, clipU[1] - clipU[0], it.size * 1.8); g.clip(); }
  impress(g, it.s, it.u, it.v, it.size);
  g.restore();
}
// one wedge being pressed: grows down from the head to depth dv (tablet v of the impression's lower end), a ridge of displaced
// clay ahead of it while the tip is in it, then the ridge settles; a brief blueprint flash as the tip lands (verse 1's line)
function pressing(g, it, W, st, flash) {
  const s = it.size;
  g.save(); g.font = `400 ${s}px L2Cun`; g.textBaseline = 'alphabetic'; tiltAbout(g, it);
  g.save(); g.beginPath(); g.rect(W.u0, it.v - s * 1.3, W.u1 - W.u0, st.dv - (it.v - s * 1.3)); g.clip();
  impress(g, it.s, it.u, it.v, s);
  if (flash > 0) { g.globalAlpha = 0.85 * flash * flash; g.strokeStyle = 'rgba(215,240,255,1)'; g.lineWidth = 1.6; g.strokeText(it.s, it.u, it.v); }
  g.restore();
  // displaced clay: pushed up round the head, and heaped ahead of the tip (or at the tail, once the wedge is whole)
  const ridge = (u, v, rx, ry, a) => {
    const gr = g.createRadialGradient(u, v, 0, u, v, 1);
    gr.addColorStop(0, `rgba(255,238,206,${a})`); gr.addColorStop(0.55, `rgba(240,214,176,${a * 0.55})`); gr.addColorStop(1, 'rgba(240,214,176,0)');
    g.save(); g.translate(u, v); g.scale(rx, ry); g.translate(-u, -v); g.fillStyle = gr; g.beginPath(); g.arc(u, v, 1, 0, Math.PI * 2); g.fill(); g.restore();
  };
  ridge(W.hu - s * 0.02, it.v - s * 0.78, s * WEDGE_W * 0.75, s * 0.07, 0.5);
  if (st.done) ridge(W.hu + s * 0.02, it.v + s * 0.16, s * 0.12, s * 0.06, 0.35);
  else ridge(W.hu + s * 0.01, st.dv + s * 0.05, s * 0.17, s * 0.08, 0.7);
  g.restore();
}
function rule(g, u0, u1, v) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,236,200,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(u0, v - 1.4); g.lineTo(u1, v - 1.4); g.stroke();
  g.strokeStyle = 'rgba(30,16,6,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(u0, v + 0.8); g.lineTo(u1, v + 0.8); g.stroke();
  g.restore();
}

// the frame of tablet space on screen: u along the two landings, v = V_AXIS, origin so that the sixties wedge's head is on the
// first landing (the last wedge's head then lands on the last, by layoutSigns)
function frameOf(size) {
  const P1 = TIP[PRESSES[0].f], P2 = TIP[PRESSES[PRESSES.length - 1].f];
  const dx = P2[0] - P1[0], dy = P2[1] - P1[1], span = Math.hypot(dx, dy);
  return { U: [dx / span, dy / span], V: V_AXIS, span, P1, size };
}
// a press's state on plate frame f: the sign grows down from its top over pr.dur frames from the landing
function pressState(it, pr, f) {
  if (f < pr.f) return null;
  const s = it.size, top = it.v - HEAD_Y * s, bottom = it.v + 0.13 * s, k = (f - pr.f) / pr.dur;
  if (k >= 1) return { dv: bottom + s * 0.05, done: true };
  return { dv: lerp(top + s * 0.14, bottom, k), done: false };
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    const A = await assets();
    let frame = -1, pf = -1;
    try {
      const pk = await picks2(), src = pk[p.clip || 'V113'];
      const meta = await plateMeta(src.dir);
      pf = plateFrame(meta, withPick(src, p.plateP || {}), lt, t);
      if (meta.src === A.meta.plate.src && meta.n === A.meta.n && meta.start === A.meta.plate.start) frame = pf;
      else if (!globalThis.__t2tabletWarned) { globalThis.__t2tabletWarned = true; console.warn('t2_tablet: the V113 plate changed; re-run tools/t2/tablet_clay.py and re-mark TIP'); }
    } catch (e) { /* no plate: inscription only, whole */ }
    ctx.state.t2tablet = { A, frame, pf: frame >= 0 ? pf : 1e9 };
  },
  draw(ctx, shot, t, lt, p) {
    const st = ctx.state.t2tablet; if (!st) return;
    const { A, frame, pf } = st;
    const e = ctx.engine, S = e.S;
    const [X0, Y0, X1, Y1] = A.meta.region, RW = X1 - X0, RH = Y1 - Y0;
    const size = p.size || 42, flashDur = p.flash ?? 0.45;

    // the inscription (tablet space -> screen by one affine map), into its own layer so the grain only bites the wedges
    const I = scratch('t2tab_ins', RW * S, RH * S), gi = I.g;
    const F = frameOf(size);
    const items = layoutSigns(gi, size, F.span);
    const sx = items.find((x) => x.press === 'sixties');
    const o = [F.P1[0] - (sx.u + DISH_HX * size) * F.U[0] + HEAD_Y * size * F.V[0], F.P1[1] - (sx.u + DISH_HX * size) * F.U[1] + HEAD_Y * size * F.V[1]];
    gi.setTransform(S, 0, 0, S, 0, 0); gi.transform(F.U[0], F.U[1], F.V[0], F.V[1], o[0] - X0, o[1] - Y0);
    const uEnd = Math.max(...items.map((x) => x.u + gi.measureText(x.s).width));
    rule(gi, -14, uEnd + 10, -ROW + 13);
    rule(gi, -8, uEnd + 10, 13); rule(gi, -8, uEnd + 10, 19);
    // the letter's lines: already on the tablet (dried a little)
    gi.font = `400 ${NANNI_PX}px L2Cun`;
    for (const [line, v] of EDGE) {
      let u = 8;
      for (const [, cp] of line.signs) {
        const s = cps([cp]);
        pressed(gi, { s, u, v, size: NANNI_PX });
        u += gi.measureText(s).width + 7;
      }
    }
    for (const it of items) {
      if (!it.press) { pressed(gi, it); continue; }
      const W = pressWedge(it), pr = PRESSES.find((x) => x.key === it.press);
      const ps = pressState(it, pr, pf);
      if (!ps) continue;
      const fl = 1 - (pf - pr.f) / (flashDur * 24);
      pressing(gi, it, W, ps, frame >= 0 ? fl : 0);
    }
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
      // the matte, kept to the stylus near the tip: past the tip, and beside the shaft within 90 px of it, the plate's own
      // marks and the shaft's contact shadow would otherwise punch through the clay and the inscription
      const M = scratch('t2tab_mat', RW * S, RH * S), gm = M.g;
      gm.drawImage(A.cut, f * mw, 0, mw, mh, 0, 0, M.w, M.h);
      const tp = tipAt(f), NEAR = 90;
      gm.globalCompositeOperation = 'destination-out'; gm.filter = `blur(${(1.2 * S).toFixed(2)}px)`;
      gm.setTransform(S, 0, 0, S, 0, 0); gm.translate(tp[0] - X0, tp[1] - Y0); gm.transform(AXIS[0], AXIS[1], -AXIS[1], AXIS[0], 0, 0);
      gm.fillStyle = '#000'; gm.beginPath(); gm.rect(-300, -300, 300 + NEAR, 600);
      gm.moveTo(-2, -6); gm.lineTo(NEAR, -(7 + 0.3 * NEAR)); gm.lineTo(NEAR, 7 + 0.3 * NEAR); gm.lineTo(-2, 6); gm.closePath();
      gm.fill('evenodd');
      gm.filter = 'none'; gm.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(M, 0, 0, M.w, M.h, 0, 0, M.w, M.h);
      g.globalCompositeOperation = 'source-over';
    }
    const c = e.c2dBegin();
    c.drawImage(C, 0, 0, C.w, C.h, X0, Y0, RW, RH);
    e.blit2d('over', p.gain ?? 1);
  },
};
