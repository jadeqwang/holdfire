// t2_mirror (drop, 3:03.88-3:21): the white void and the infinitely large mirror plane that divides the frame, used as the stage
// the generated Jade plates composite onto. Jade's side (left) is drawn in Rare Earth signal-print inks, teal-tips Jade's side
// (right) in cool teal and silver. The scene drives what happens to the PLANE; the people are the plates':
//   the camera swing round the plane at the drop impact (3:08.355): a two-tone impact frame, then a whip in which the plane's
//     vanishing line runs off one side of the frame and comes back from the other (the camera has gone round it) and settles;
//   the palms-meet ripple on "too" (3:13.38): rings spreading over the glass from the palm point, refracting both worlds;
//   the mirror vanishing (3:18.93): the plane flares, thins and is gone; the two halves give way to one picture (p.both).
// Layers: p.full {scene, p} (one generated frame holding both sides, the plane at x = 960, as the DR keyframes are made), or
// p.left / p.right {scene, p} (one per side; each side shows its own half of its frame), and p.both (after the vanish). A layer
// whose scene is missing or whose prepare() fails (no plate yet) is replaced by a stand-in drawn here: the void in that side's
// palette and a flat cel figure in that Jade's colours, posed for the phase, so the drop reads with every plate missing.
// p: {phase 'approach' | 'reflection' | 'swing' | 'hands_rise' | 'palms_meet' | 'ripple' | 'gone', x (960: the plane),
//     impactT (swing), swingDur (0.3), rippleT (default: the shot start for 'ripple'), palm ([960, 470]: where the palms meet),
//     vanishT (default: the shot start for 'gone'), vanishDur (0.45), full, left, right, both, label (true: name a missing plate)}
import * as THREE from 'three';
import { SCENES } from '../../index.js';
import { rt, copy } from '../plate/lib.js';
import { clamp, lerp, smooth, smoother, range, easeOutCubic, easeInOutCubic, hash1, rng } from '../../../util.js';
import { P, css } from '../../../palette.js';

const PAPER_A = [0.965, 0.955, 0.935];      // Jade's side: warm print paper
const PAPER_B = [0.925, 0.955, 0.965];      // teal-tips' side: cool, silvered
const KLEIN = [0.0, 0.184, 0.655], ORANGE = [1.0, 0.45, 0.12], PALE = [0.62, 0.8, 1.0];
const TEAL = [0.1, 0.62, 0.62], SILVER = [0.72, 0.78, 0.82];

let mat = null;
function build(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform sampler2D tL; uniform sampler2D tR; uniform sampler2D tB;
    uniform float X; uniform float whip; uniform float blur; uniform float impact; uniform float lineA; uniform float lineFlare;
    uniform vec2 palm; uniform float rAge; uniform float rAmp; uniform float both; uniform float t;
    vec3 side(vec2 q) {
      vec2 s = q + vec2(whip, 0.);
      vec2 uv = vec2(s.x / 1920., 1. - s.y / 1080.);
      vec3 a = q.x < X ? texture(tL, uv).rgb : texture(tR, uv).rgb;
      return a;
    }
    void main(){
      vec2 q = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      // ripple: rings over the glass, refracting both worlds (radial displacement) and catching light
      float ring = 0.;
      if (rAge > 0.) {
        float r = length(q - palm);
        for (int i = 0; i < 4; i++) {
          float R = 900. * (rAge - float(i) * 0.11);
          if (R <= 0.) continue;
          float w = 26. + 0.05 * R;
          float g = exp(-pow((r - R) / w, 2.)) * rAmp * exp(-float(i) * 0.35);
          ring += g;
          q += normalize(q - palm + 1e-3) * g * 14. * sin((r - R) / w * 3.1);
        }
      }
      vec3 col;
      if (blur > 0.5) {               // the whip: a horizontal smear along the camera's motion
        col = vec3(0.);
        for (int k = 0; k < 9; k++) { float o = (float(k) / 8. - .5) * blur; col += side(q + vec2(o, 0.)); }
        col /= 9.;
      } else col = side(q);
      if (both > 0.) col = mix(col, texture(tB, vec2(q.x / 1920., 1. - q.y / 1080.)).rgb, both);
      // the plane: a thin silver line with a cool sheen on the glass side; flares white as it goes
      float d = abs(q.x - X);
      float ln = (1. - smoothstep(1.2, 2.4, d)) * lineA;
      float sheen = exp(-max(0., q.x - X) / 90.) * step(X, q.x) * 0.06 * lineA;
      col = mix(col, vec3(0.78, 0.84, 0.9), ln * 0.9);
      col += vec3(0.6, 0.7, 0.8) * sheen;
      col += vec3(1.) * lineFlare * exp(-d / 26.) * 1.4;
      col += vec3(0.9, 0.95, 1.0) * ring * 0.22 + vec3(1.0, 0.85, 0.55) * ring * 0.08;
      // impact frame: two-tone, ink on paper
      if (impact > 0.) { float l = dot(col, vec3(.299, .587, .114)); vec3 tw = l > 0.72 ? vec3(0.02, 0.02, 0.04) : vec3(0.98, 0.97, 0.94); col = mix(col, tw, impact); }
      fragColor = vec4(col, 1.);
    }`, { tL: { value: null }, tR: { value: null }, tB: { value: null }, X: { value: 960 }, whip: { value: 0 }, blur: { value: 0 }, impact: { value: 0 },
    lineA: { value: 1 }, lineFlare: { value: 0 }, palm: { value: new THREE.Vector2(960, 470) }, rAge: { value: -1 }, rAmp: { value: 1 }, both: { value: 0 }, t: { value: 0 } });
  return mat;
}

// ------------------------------------------------------------------ stand-ins (no plate yet)
function voidSide(c, x0, x1, paper, specks, seed) {
  c.fillStyle = css(paper); c.fillRect(x0, 0, x1 - x0, 1080);
  // a soft floor: the faintest horizon and the shadow pool, no hard line (the void has no horizon)
  const g = c.createLinearGradient(0, 720, 0, 1080);
  g.addColorStop(0, css(paper, 0)); g.addColorStop(1, css([paper[0] * 0.9, paper[1] * 0.9, paper[2] * 0.92], 1));
  c.fillStyle = g; c.fillRect(x0, 720, x1 - x0, 360);
  // print specks / silver motes, seeded (deterministic)
  const R = rng(seed);
  for (let i = 0; i < 260; i++) {
    const x = x0 + R() * (x1 - x0), y = R() * 1080, k = R();
    const col = specks[Math.floor(R() * specks.length)];
    c.fillStyle = css(col, 0.08 + 0.18 * k); c.beginPath(); c.arc(x, y, 1.4 + 2.2 * k, 0, Math.PI * 2); c.fill();
  }
}
// a flat cel figure, facing the plane (+1: facing right). pose: {x (feet), lift (0..1: the near arm up to the palm), look (0..1 up)}
function figure(c, o) {
  const { x, f, lift = 0, look = 0, hair, hairTip, jacket, band, dot, trousers, skin, ink } = o;
  const H = 640, foot = 905, top = foot - H;
  c.save(); c.translate(x, 0); c.scale(f, 1);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = css(ink);
  // shadow
  c.fillStyle = css(ink, 0.12); c.beginPath(); c.ellipse(10, foot + 6, 120, 16, 0, 0, Math.PI * 2); c.fill();
  // legs (wide cargo trousers)
  c.fillStyle = css(trousers);
  c.beginPath(); c.moveTo(-58, top + 330); c.lineTo(58, top + 330); c.lineTo(66, foot - 18); c.lineTo(8, foot - 18); c.lineTo(0, top + 420); c.lineTo(-8, foot - 18); c.lineTo(-66, foot - 18); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = css(band); c.fillRect(-60, top + 470, 52, 9); c.fillRect(8, top + 470, 52, 9);
  // sneakers
  c.fillStyle = css([0.97, 0.97, 0.96]);
  c.beginPath(); c.roundRect(-74, foot - 24, 72, 28, 12); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(4, foot - 24, 80, 28, 12); c.fill(); c.stroke();
  // far arm, down
  c.fillStyle = css(jacket);
  c.beginPath(); c.moveTo(-50, top + 176); c.lineTo(-74, top + 310); c.lineTo(-52, top + 316); c.lineTo(-30, top + 200); c.closePath(); c.fill(); c.stroke();
  // torso: cropped jacket over a black top
  c.fillStyle = css([0.06, 0.06, 0.08]); c.fillRect(-46, top + 262, 92, 72);
  c.fillStyle = css(jacket);
  c.beginPath(); c.moveTo(-58, top + 170); c.lineTo(58, top + 170); c.lineTo(64, top + 270); c.lineTo(-64, top + 270); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = css(band); c.fillRect(-60, top + 214, 122, 14);
  c.fillStyle = css(dot); c.beginPath(); c.arc(30, top + 196, 8, 0, Math.PI * 2); c.fill();
  // near arm: from down (lift 0) to raised, the palm forward at palm height (lift 1)
  const sh = [44, top + 186];
  const a = lerp(1.38, -0.12, easeInOutCubic(lift));
  const el = [sh[0] + Math.cos(a) * 118, sh[1] + Math.sin(a) * 118];
  const a2 = lerp(1.5, -0.9, easeInOutCubic(lift));
  const wr = [el[0] + Math.cos(a2) * 108, el[1] + Math.sin(a2) * 108];
  c.strokeStyle = css(ink); c.lineWidth = 40; c.beginPath(); c.moveTo(...sh); c.lineTo(...el); c.lineTo(...wr); c.stroke();
  c.strokeStyle = css(jacket); c.lineWidth = 32; c.beginPath(); c.moveTo(...sh); c.lineTo(...el); c.lineTo(...wr); c.stroke();
  c.strokeStyle = css(band); c.lineWidth = 32; c.beginPath(); c.moveTo(sh[0] + (el[0] - sh[0]) * 0.3, sh[1] + (el[1] - sh[1]) * 0.3); c.lineTo(sh[0] + (el[0] - sh[0]) * 0.45, sh[1] + (el[1] - sh[1]) * 0.45); c.stroke();
  c.lineWidth = 4; c.strokeStyle = css(ink);
  c.fillStyle = css(skin); c.beginPath(); c.ellipse(wr[0] + 6, wr[1] - 10 * lift, 17, 24, -0.2 + 0.2 * lift, 0, Math.PI * 2); c.fill(); c.stroke();
  // neck and head
  c.fillStyle = css(skin); c.fillRect(-12, top + 140, 24, 36);
  c.save(); c.translate(0, top + 92); c.rotate(-0.25 * look);
  c.beginPath(); c.ellipse(4, 0, 50, 60, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  // hair: long and straight, centre-parted curtain bangs; the tips in hairTip
  c.fillStyle = css(hair);
  c.beginPath(); c.moveTo(-54, 8); c.quadraticCurveTo(-60, -70, 4, -68); c.quadraticCurveTo(66, -70, 58, 8); c.lineTo(52, -20); c.quadraticCurveTo(24, -44, 4, -52); c.quadraticCurveTo(-20, -44, -46, -16); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-54, -10); c.lineTo(-62, 200); c.lineTo(-30, 206); c.lineTo(-40, 20); c.closePath(); c.fill();
  c.fillStyle = css(hairTip); c.beginPath(); c.moveTo(-61, 170); c.lineTo(-62, 200); c.lineTo(-30, 206); c.lineTo(-33, 176); c.closePath(); c.fill();
  // headphones round the neck (orange foam)
  c.fillStyle = css(ORANGE); c.beginPath(); c.ellipse(-36, 76, 14, 20, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(40, 76, 14, 20, 0, 0, Math.PI * 2); c.fill();
  // the eye, facing the plane, with its catchlight
  c.fillStyle = css(ink); c.beginPath(); c.ellipse(30, -4 - 6 * look, 7, 10, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = css(dot); c.beginPath(); c.arc(32, -8 - 6 * look, 2.6, 0, Math.PI * 2); c.fill();
  c.restore();
  c.restore();
}
const JADE = { hair: [0.05, 0.05, 0.07], hairTip: [0.05, 0.05, 0.07], jacket: [0.97, 0.97, 0.96], band: ORANGE, dot: PALE, trousers: [0.12, 0.16, 0.33], skin: [1.0, 0.88, 0.8], ink: [0.05, 0.06, 0.12] };
const TEALJ = { ...JADE, hairTip: TEAL, dot: [0.35, 0.85, 0.85], ink: [0.08, 0.14, 0.17] };

// where the stand-in figures stand in each phase (distance of the feet from the plane), how high the near arm is
function standinPose(phase, u) {
  switch (phase) {
    case 'approach': return { d: lerp(560, 300, easeInOutCubic(u)), lift: 0, look: 0 };
    case 'reflection': return { d: lerp(300, 150, easeOutCubic(u)), lift: 0, look: 0 };
    case 'swing': return { d: 150, lift: 0.1, look: 0 };
    case 'hands_rise': return { d: 132, lift: easeInOutCubic(clamp(u * 1.3)) * 0.85, look: 0 };
    case 'palms_meet': return { d: 122, lift: lerp(0.85, 1, easeOutCubic(u)), look: 0 };
    case 'ripple': return { d: 122, lift: 1, look: 0.15 * u };
    default: return { d: 122, lift: 0, look: 0 };
  }
}
function drawStandin(e, which, phase, u, x, both) {
  const c = e.c2dBegin();
  if (both) {      // after the vanish: one white world, the two of them side by side, looking up
    voidSide(c, 0, 1920, [0.95, 0.955, 0.95], [KLEIN, ORANGE, TEAL, SILVER], 17);
    const look = 0.4 + 0.6 * smooth(u * 2);
    figure(c, { x: x - 150, f: 1, lift: 0, look, ...JADE });
    figure(c, { x: x + 150, f: -1, lift: 0, look, ...TEALJ });
    e.blit2d('replace', 1);
    return;
  }
  const A = which === 'left';
  voidSide(c, 0, 1920, A ? PAPER_A : PAPER_B, A ? [KLEIN, ORANGE, PALE] : [TEAL, SILVER, [0.55, 0.85, 0.85]], A ? 7 : 11);
  const ps = standinPose(phase, u);
  if (A) figure(c, { x: x - ps.d - 40, f: 1, ...ps, ...JADE });
  else figure(c, { x: x + ps.d + 40, f: -1, ...ps, ...TEALJ });
  e.blit2d('replace', 1);
}

const sideP = (S, t, lt, ctx) => (typeof S.p === 'function' ? S.p(t, lt, ctx) : (S.p || {}));
async function prepSide(ctx, shot, t, lt, S) {
  if (!S) return null;
  const sc = SCENES[S.scene]; if (!sc) return null;
  const sp = { ...sideP(S, t, lt, ctx), over: false };
  try { if (sc.prepare) await sc.prepare(ctx, shot, t, lt, sp); } catch (err) { return null; }
  return { sc, sp, st: { ...ctx.state } };
}

export function mirrorTimes(shot, p) {
  const phase = p.phase || 'approach';
  return {
    phase,
    impactT: p.impactT ?? (phase === 'swing' ? shot.t0 : null),
    rippleT: p.rippleT ?? (phase === 'ripple' ? shot.t0 : null),
    vanishT: p.vanishT ?? (phase === 'gone' ? shot.t0 : null),
  };
}

export default {
  async prepare(ctx, shot, t, lt, p) {
    const full = await prepSide(ctx, shot, t, lt, p.full);
    const L = p.left ? await prepSide(ctx, shot, t, lt, p.left) : full;
    const R = p.right ? await prepSide(ctx, shot, t, lt, p.right) : full;
    const B = p.both ? await prepSide(ctx, shot, t, lt, p.both) : null;
    ctx.state.t2mirror = { L, R, B, same: !p.left && !p.right };
  },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const m = build(e); const u = m.uniforms;
    const S = ctx.state.t2mirror;
    const T = mirrorTimes(shot, p);
    const X0 = p.x ?? 960;
    const dur = Math.max(1e-3, (shot.t1 ?? shot.t0 + 1) - shot.t0);
    const uu = clamp(lt / dur);
    const tg = [rt(e, 'mirrorL'), rt(e, 'mirrorR'), rt(e, 'mirrorB')];
    const vanish = T.vanishT != null ? smoother(range(t, T.vanishT, T.vanishT + (p.vanishDur ?? 0.45))) : 0;
    const render = (side, i, which) => {
      if (side) { e.clear(e.rtScene, 0, 0, 0); Object.assign(ctx.state, side.st); side.sc.draw(ctx, shot, t, lt, side.sp); }
      else drawStandin(e, which, T.phase, uu, X0, which === 'both');
      copy(e, e.rtScene.texture, tg[i]);
    };
    if (S.same && S.L) { render(S.L, 0, 'left'); u.tR.value = tg[0].texture; }
    else { render(S.L, 0, 'left'); render(S.R, 1, 'right'); u.tR.value = tg[1].texture; }
    u.tL.value = tg[0].texture;
    if (T.phase === 'gone') { render(S.B, 2, 'both'); u.tB.value = tg[2].texture; } else u.tB.value = tg[0].texture;
    // the swing: an impact frame (two drawings, on twos), then the camera whips round the plane
    let X = X0, whip = 0, blur = 0, impact = 0;
    if (T.impactT != null) {
      const a = t - T.impactT;
      impact = a >= 0 && a < 2 / 24 ? 1 : 0;
      const sd = p.swingDur ?? 0.3;
      const k = clamp((a - 2 / 24) / sd);
      if (a >= 2 / 24 && k < 1) {
        const psi = Math.PI * easeInOutCubic(k);                 // camera azimuth relative to the plane: 0 -> pi (round it)
        const tn = Math.tan(psi);
        X = Math.abs(tn) > 50 ? -1e4 : X0 + 640 * tn;          // the plane's vanishing line runs off and comes back
        whip = 760 * Math.sin(psi);
        const dk = Math.PI * (easeInOutCubic(clamp(k + 0.02)) - easeInOutCubic(clamp(k - 0.02))) / 0.04 / sd;   // dpsi/dt
        blur = Math.min(520, dk * 70);
      }
    }
    u.X.value = X; u.whip.value = whip; u.blur.value = blur; u.impact.value = impact;
    u.lineA.value = 1 - vanish;
    u.lineFlare.value = T.vanishT != null ? Math.exp(-Math.max(0, t - T.vanishT) / 0.12) * (t >= T.vanishT ? 1 : 0) : 0;
    const palm = p.palm || [960, 470];
    u.palm.value.set(palm[0], palm[1]);
    u.rAge.value = T.rippleT != null && t >= T.rippleT ? t - T.rippleT : -1;
    u.rAmp.value = T.rippleT != null ? Math.exp(-Math.max(0, t - T.rippleT) / 1.2) : 0;
    u.both.value = vanish; u.t.value = t;
    e.pass(m, e.rtScene);
    ctx.state.t2mirror.missing = [!S.L && 'left', !S.R && !S.same && 'right', T.phase === 'gone' && !S.B && 'both'].filter(Boolean);
  },
  type(ty, t, lt, shot, ctx) {
    const S = ctx.state.t2mirror; const p = ctx.p || {};
    if (!S || p.label === false) return;
    const miss = S.missing || [];
    if (miss.length) ty.label(`STAND-IN · ${shot.id} · plate pending (${miss.join(', ')})`, 960, 1062, { align: 'center', color: P.steel, alpha: 0.7, size: 11 });
  },
};
