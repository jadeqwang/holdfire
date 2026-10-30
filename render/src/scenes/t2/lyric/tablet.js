// T2_TABLET: V113's clay tablet (0:25.37-27.32, "...and the mud"), a multi layer over the plate. The plate paints its own row of
// generic triangles; this layer covers them with clean wet clay (baked by tools/t2/tablet_clay.py: assets/t2/tablet/) and
// carries real cuneiform: the Fibonacci numbers 1 1 2 3 5 8 13 21 34 55 89 in Old Babylonian sexagesimal numerals
// (cuneiform.js), in two ruled registers; under a double ruling, a line already on the tablet: "um-ma na-an-ni-ma", "thus (says)
// Nanni", from the Ea-nasir complaint tablet.
// Jade (take two notes): the stylus has to make the strokes that appear. So the count is on the clay when the shot opens except
// two wedges of 89 (= 1;29, 𒁹 𒎙𒐎), and those are pressed by the plate's stylus: the tip is tracked on every plate frame the
// shot shows (TIP), the plate's two touch-downs are frames 14 and 42, and the rows are laid out so that 89's sixties wedge 𒁹
// has its head where the first touch lands and the last unit wedge of 𒐎 (its tall right column) where the second one lands.
// Each impression grows down from its head as the tip slides down the clay, with a ridge of displaced clay ahead of it, and is
// whole once the tip moves off it. (The sixties wedge goes in before the last unit wedge, so 89 reads 28, 1;28, 1;29 over the
// shot; the other 9 wedges of 89 are already there.)
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
// The reed tip (design px = plate px) on V113's even plate frames 4..50, the frames the shot shows (on twos: plate frame
// 4 + 2 * floor(lt * 12)). Hand-marked on 3x crops of work/plates/V113 and checked on a strip with the marks drawn in.
// In the air 4-12; first touch-down 14 at (745, 617), the tip slides 25 px down the clay to 26, then right along the bottom to
// 32; lifted 34-40; second touch-down 42 at (858, 590), sinks to 46, slides off to the right by 48-50.
const TIP = {
  4: [836, 587], 6: [807, 563], 8: [783, 575], 10: [762, 592], 12: [752, 603], 14: [745, 617], 16: [745, 622], 18: [750, 625],
  20: [748, 627], 22: [750, 632], 24: [753, 637], 26: [748, 642], 28: [760, 647], 30: [778, 648], 32: [773, 648], 34: [780, 593],
  36: [812, 563], 38: [845, 565], 40: [859, 581], 42: [858, 590], 44: [857, 593], 46: [863, 597], 48: [877, 600], 50: [898, 602],
};
const TIP_F0 = 4, TIP_F1 = 50;
const AXIS = [0.78, -0.625];        // the shaft, from the tip up to the hand (screen; it turns by a few degrees over the shot)
function tipAt(f) {
  f = clamp(f, TIP_F0, TIP_F1);
  const a = f - (f % 2), b = Math.min(TIP_F1, a + 2), k = b > a ? (f - a) / (b - a) : 0;
  return [lerp(TIP[a][0], TIP[b][0], k), lerp(TIP[a][1], TIP[b][1], k)];
}
// the two presses: the plate frame the tip lands on, and which wedge it makes
const PRESSES = [{ f: 14, key: 'sixties' }, { f: 42, key: 'last' }];

// ------------------------------------------------------------------------------------------------ the inscription
// tablet space: u along a row, v down the tablet (row 2's baseline at v = 0, row 1's at -ROW, the letter's lines at EDGE's v)
const GAP = 30, SIGN_GAP = 3, ROW = 58, NANNI_PX = 28;
// the letter's lines under the ruling: obverse 1 "to Ea-nasir" (added 30 Oct, the s,i sign confirmed by B. R. Foster), then 3, Nanni
const EDGE = [[EA_NASIR, 46], [NANNI, 94]];
// Noto Sans Cuneiform geometry (em): a vertical wedge's head centre is 0.69 above the baseline; DISH's head centre is 0.208 from
// its origin; NINE DISH is four columns of two short wedges and a tall fifth column at 1.096-1.331 (head centre 1.2135)
const HEAD_Y = 0.69, DISH_HX = 0.208, NINE_SPLIT = 1.089, NINE_HX = 1.2135, WEDGE_W = 0.24;
const V_AXIS = [0.2, 0.8];          // a tablet unit down the tablet, on screen (u is a unit along the stylus' two landings)

// rows: 1 1 2 3 5 8 13 / 21 34 55 89. 89's place gap is set so its two pressed wedges are exactly as far apart as the landings.
function layoutSigns(g, size, span) {
  g.font = `400 ${size}px L2Cun`;
  const w = (cp) => g.measureText(cps([cp])).width;
  const n89 = cuneiformNumber(89);                                   // [[DISH], [U U, NINE DISH]]
  const placeGap = span - ((w(n89[0][0]) - DISH_HX * size) + SIGN_GAP + w(n89[1][0]) + SIGN_GAP + NINE_HX * size);
  const out = [];
  const rows = [FIB.slice(0, 7), FIB.slice(7)];
  rows.forEach((nums, r) => {
    let u = 0;
    const v = (r - 1) * ROW;
    for (const n of nums) {
      cuneiformNumber(n).forEach((place, pi) => {
        if (pi) u += n === 89 ? placeGap : 20;
        for (const cp of place) {
          const it = { s: cps([cp]), cp, u, v, size, n };
          if (n === 89 && pi === 0) it.press = 'sixties';
          if (n === 89 && pi === 1 && cp === place[place.length - 1]) it.press = 'last';
          out.push(it); u += w(cp) + SIGN_GAP;
        }
      });
      u += GAP - SIGN_GAP;
    }
  });
  return out;
}
// the wedge each press makes: its head (tablet), and its extent in u
function pressWedge(it) {
  const s = it.size;
  if (it.press === 'sixties') return { hu: it.u + DISH_HX * s, u0: it.u - 4, u1: it.u + s * 0.42 };
  return { hu: it.u + NINE_HX * s, u0: it.u + NINE_SPLIT * s, u1: it.u + s * 1.45 };
}

const DARK = 'rgba(30,16,6,1)', CORE = 'rgba(70,44,22,0.98)', LITE = 'rgba(255,236,200,0.9)';
function impress(g, s, u, v, size) {
  g.fillStyle = LITE; g.fillText(s, u - size * 0.03, v - size * 0.035);   // the lit lip
  g.fillStyle = DARK; g.fillText(s, u + size * 0.035, v + size * 0.04);   // the shadowed wall
  g.fillStyle = CORE; g.fillText(s, u, v);                                // the floor of the impression
}
// a sign already on the clay (clip: [u0, u1] of the sign to draw, for NINE DISH without its last column)
function pressed(g, it, clipU) {
  g.save(); g.font = `400 ${it.size}px L2Cun`; g.textBaseline = 'alphabetic';
  if (clipU) { g.beginPath(); g.rect(clipU[0], it.v - it.size * 1.3, clipU[1] - clipU[0], it.size * 1.8); g.clip(); }
  impress(g, it.s, it.u, it.v, it.size);
  g.restore();
}
// one wedge being pressed: grows down from the head to depth dv (tablet v of the impression's lower end), a ridge of displaced
// clay ahead of it while the tip is in it, then the ridge settles; a brief blueprint flash as the tip lands (verse 1's line)
function pressing(g, it, W, st, flash) {
  const s = it.size;
  g.save(); g.font = `400 ${s}px L2Cun`; g.textBaseline = 'alphabetic';
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
// first landing (the last unit wedge's head then lands on the second, by the place gap)
function frameOf(size) {
  const P1 = TIP[PRESSES[0].f], P2 = TIP[PRESSES[1].f];
  const dx = P2[0] - P1[0], dy = P2[1] - P1[1], span = Math.hypot(dx, dy);
  return { U: [dx / span, dy / span], V: V_AXIS, span, P1, size };
}
const toTab = (F, o, [x, y]) => {   // screen -> tablet (u, v)
  const [a, b] = F.U, [c, d] = F.V, det = a * d - b * c, X = x - o[0], Y = y - o[1];
  return [(d * X - c * Y) / det, (-b * X + a * Y) / det];
};
// a press's state on plate frame f: dv (the impression's lower end) follows the deepest the tip has been; done once the tip has
// moved off the wedge along the row (or past its tail)
function pressState(F, o, it, W, landF, f) {
  if (f < landF) return null;
  const s = it.size, top = it.v - HEAD_Y * s, bottom = it.v + 0.13 * s;
  let dv = top + s * 0.14, done = false;
  for (let k = landF; k <= Math.min(f, TIP_F1); k += 2) {
    const [tu, tv] = toTab(F, o, tipAt(k));
    dv = Math.max(dv, tv + s * 0.14);
    if (k > landF && Math.abs(tu - W.hu) > s * 0.3) done = true;
  }
  if (done || f > TIP_F1 || dv >= bottom) return { dv: bottom + s * 0.05, done: true };
  return { dv, done: false };
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
      if (it.press === 'last') pressed(gi, it, [it.u - 4, W.u0]);   // NINE DISH's first four columns are already there
      const ps = pressState(F, o, it, W, pr.f, pf);
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
