// P1b "a chord that's searching through the fog": rings of sound and light leave a point (the station's dishes) and travel
// out through sea fog. Each emission is a chord: three close rings whose spacings are the wavelengths of a major triad
// (frequencies 4:5:6, so wavelengths 15:12:10). The fog carries them: rings are bright where the fog is thick (light scatters),
// faint in the clear gaps, and they thin out with distance.
//
// Two ways to use it:
//   * as an overlay over any plate: `drawChordRings(ctx, p)` adds into ctx.engine.rtScene (call it at the end of your draw);
//   * as the scene `chordrings` (draws its own minimal fog plate + dish silhouettes, then the rings).
// p: {origin:[x,y] design px, t0 (first emission; default shot start), emits:[t...] (default: the beats from t0),
//     speed (px/s, default 520), squash (ellipse y/x for a ground-plane view; 1 = facing us), gain (1), color ([r,g,b], gold),
//     fog (0..1 density of the carrying fog, 0.8), fogScale (1), maxR (px, 1900), drift ([x,y] fog drift px/s), chord ([15,12,10])}
import * as THREE from 'three';
import { P } from '../../palette.js';
import { clamp, smooth, range, lerp } from '../../util.js';
import { beatsIn } from './lib.js';

const MAXE = 10;
let ringMat = null, plateMat = null;

function rings(e) {
  if (ringMat) return ringMat;
  ringMat = e.shader(/* glsl */`
    uniform vec2 origin; uniform float squash; uniform float S; uniform float t; uniform float speed; uniform float gain; uniform vec3 color;
    uniform float emits[${MAXE}]; uniform int nE; uniform float fogD; uniform float fogScale; uniform vec2 drift; uniform float maxR; uniform vec3 chord;
    float fogAt(vec2 px, float t, vec2 drift, float sc){
      vec2 fp = (px + drift * t) * vec2(.0011, .0024) / sc;
      float f = fbm3(fp + vec2(0., t * .02));
      return smoothstep(.32, .78, f);
    }
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 d = px - origin; d.y /= squash;
      float r = max(length(d), 1e-3);
      float gr = length(vec2(d.x, d.y / squash)) / r;   // |grad r| per design px (ellipse)
      // fog density (the medium that makes the rings visible): two octaves drifting
      float fog = fogAt(px, t, drift, fogScale);
      float carry = mix(1., .03 + 2.1 * fog * fog * fog, fogD);
      float acc = 0.;
      float ppx = 1. / max(S, 1e-3);  // screen px in design px
      for (int i = 0; i < ${MAXE}; i++) {
        if (i >= nE) break;
        float age = t - emits[i];
        if (age < 0.) continue;
        // the wavefront decelerates a little as it spreads (it is searching)
        float R = speed * (age - .18 * age * age / (1. + age));
        float fade = exp(-R / (maxR * .42)) * smoothstep(0., .08, age) * (.25 + .75 * smoothstep(20., 260., R));
        for (int k = 0; k < 3; k++) {
          float rk = R - (k == 0 ? 0. : (k == 1 ? chord.x : chord.x + chord.y)) * (.55 + R / 900.);
          if (rk <= 0.) continue;
          float dd = abs(r - rk) / max(gr, 1e-3);
          // thin engraved line (>= 2 px) + a soft scatter halo
          float line = 1. - smoothstep(1.1, 1.1 + 1.4 * ppx, dd);
          float hs = 6. + R * .02;
          float halo = exp(-dd * dd / (2. * hs * hs)) * (.04 + .45 * fog * fogD);
          float wk = k == 0 ? 1. : (k == 1 ? .78 : .6);
          acc += (line + halo) * wk * fade;
        }
      }
      // the source glows faintly in the fog
      float src = exp(-length(px - origin) / 70.) * .22 * smoothstep(0., .2, t - emits[0]);
      vec3 col = color * (acc * carry + src * (.4 + fog)) * gain;
      fragColor = vec4(col, 1.);
    }`, {
    origin: { value: new THREE.Vector2(960, 700) }, squash: { value: 0.32 }, S: { value: e.S }, t: { value: 0 }, speed: { value: 520 }, gain: { value: 1 },
    color: { value: new THREE.Color() }, emits: { value: new Array(MAXE).fill(1e9) }, nE: { value: 0 }, fogD: { value: 0.8 }, fogScale: { value: 1 },
    drift: { value: new THREE.Vector2(-14, 0) }, maxR: { value: 1900 }, chord: { value: new THREE.Vector3(15, 12, 10) },
  });
  return ringMat;
}

// additive overlay into ctx.engine.rtScene
export function drawChordRings(ctx, p = {}) {
  const e = ctx.engine; const m = rings(e); const u = m.uniforms;
  const t = p.t ?? ctx.t;
  const t0 = p.t0 ?? (ctx.shot ? ctx.shot.t0 : t);
  let emits = p.emits;
  if (!emits) { emits = beatsIn(ctx.audio, t0 - 0.05, t0 + 8); if (!emits.length || emits[0] - t0 > 0.2) emits = [t0, ...emits]; }
  emits = emits.slice(0, MAXE);
  for (let i = 0; i < MAXE; i++) u.emits.value[i] = i < emits.length ? emits[i] : 1e9;
  u.nE.value = emits.length;
  const o = p.origin || [960, 700];
  u.origin.value.set(o[0], o[1]); u.squash.value = p.squash ?? 0.32; u.S.value = e.S; u.t.value = t;
  u.speed.value = p.speed ?? 520; u.gain.value = p.gain ?? 1; u.color.value.setRGB(...(p.color || P.gold));
  u.fogD.value = p.fog ?? 0.9; u.fogScale.value = p.fogScale ?? 1; const dr = p.drift || [-14, 0]; u.drift.value.set(dr[0], dr[1]);
  u.maxR.value = p.maxR ?? 1900; const ch = p.chord || [15, 12, 10]; u.chord.value.set(ch[0], ch[1], ch[2]);
  e.passOver(m, e.rtScene, 'add');
}

// stand-in plate: night sea fog, a cliff edge, and the dishes (minimal engraved silhouettes), so the overlay can be judged alone
function plate(e) {
  if (plateMat) return plateMat;
  plateMat = e.shader(/* glsl */`
    uniform float t; uniform vec3 night; uniform vec3 fogC; uniform vec3 voidC; uniform float S; uniform vec2 drift; uniform float fogScale;
    float fogAt(vec2 px, float t, vec2 drift, float sc){
      vec2 fp = (px + drift * t) * vec2(.0011, .0024) / sc;
      float f = fbm3(fp + vec2(0., t * .02));
      return smoothstep(.32, .78, f);
    }
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      float h = px.y / 1080.;
      vec3 col = mix(night * .8, voidC, smoothstep(.0, .8, 1. - h));
      float fog = fogAt(px, t, drift, fogScale);
      col += fogC * fog * (.45 + .55 * smoothstep(.2, .7, h)) * .75;
      // the sea's horizon, lost in the fog
      col += fogC * .3 * exp(-pow((px.y - 610.) / 50., 2.));
      fragColor = vec4(col, 1.);
    }`, { t: { value: 0 }, night: { value: new THREE.Color() }, fogC: { value: new THREE.Color() }, voidC: { value: new THREE.Color() }, S: { value: e.S }, drift: { value: new THREE.Vector2(-14, 0) }, fogScale: { value: 1 } });
  return plateMat;
}

export const look = { bloom: 0.8, bloomThreshold: 0.6, halation: 0.3, vignette: 0.35, grain: 0.035, streak: 0.2, streakThreshold: 1.2, streakCol: [1.0, 0.8, 0.5] };

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine;
    const m = plate(e); const u = m.uniforms;
    u.t.value = t; u.night.value.setRGB(...P.night); u.fogC.value.setRGB(...P.fog); u.voidC.value.setRGB(...P.void);
    const o = p.origin || [1240, 700];
    { const dr = p.drift || [-14, 0]; u.drift.value.set(dr[0], dr[1]); u.fogScale.value = p.fogScale ?? 1; }
    e.pass(m, e.rtScene);
    drawChordRings(ctx, { squash: 0.55, ...p, origin: [o[0], o[1] - 140] });
    // cliff and three dishes, engraved (stand-in for the E3 plate), in front of the rings
    const c = e.c2dBegin();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const gy = o[1] + 10;                       // plateau height
    // the cliff: plateau edge falling to the sea, hachured
    c.strokeStyle = 'rgba(244,180,67,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(1920, gy - 4); c.lineTo(o[0] - 330, gy); c.bezierCurveTo(o[0] - 420, gy + 10, o[0] - 450, gy + 120, o[0] - 520, 1080); c.stroke();
    c.save(); c.beginPath(); c.moveTo(1920, gy); c.lineTo(o[0] - 330, gy); c.bezierCurveTo(o[0] - 420, gy + 10, o[0] - 450, gy + 120, o[0] - 520, 1080); c.lineTo(1920, 1080); c.closePath();
    c.fillStyle = 'rgba(5,7,13,0.94)'; c.fill(); c.clip();
    c.strokeStyle = 'rgba(244,180,67,0.16)';
    for (let x = o[0] - 560; x < 1920; x += 9) { c.beginPath(); c.moveTo(x, gy + 6); c.lineTo(x - 40, 1080); c.stroke(); }
    c.restore();
    for (const [dx, sc, rot] of [[-200, 0.72, -0.42], [0, 1, -0.5], [175, 0.82, -0.36]]) {
      const x = o[0] + dx, base = gy;
      const R = 58 * sc, hgt = 74 * sc;
      const cx = x, cy = base - hgt;
      // mount: post + yoke
      c.strokeStyle = 'rgba(244,180,67,0.85)'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(cx - 14 * sc, base); c.lineTo(cx - 5 * sc, cy + 10 * sc); c.moveTo(cx + 14 * sc, base); c.lineTo(cx + 5 * sc, cy + 10 * sc); c.stroke();
      c.beginPath(); c.moveTo(cx - 22 * sc, base); c.lineTo(cx + 22 * sc, base); c.stroke();
      // dish: tilted ellipse (rim) + back shell, the bowl hatched dark
      c.save(); c.translate(cx, cy); c.rotate(rot);
      c.beginPath(); c.ellipse(0, 0, R, R * 0.34, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(5,7,13,0.96)'; c.fill();
      c.save(); c.clip(); c.strokeStyle = 'rgba(244,180,67,0.3)'; c.lineWidth = 2;
      for (let k = -R; k < R; k += 8) { c.beginPath(); c.moveTo(k, -R); c.lineTo(k + 10, R); c.stroke(); }
      c.restore();
      c.strokeStyle = 'rgba(255,226,163,0.95)'; c.lineWidth = 2.4;
      c.beginPath(); c.ellipse(0, 0, R, R * 0.34, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(244,180,67,0.8)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, R * 0.05, R * 0.98, R * 0.62, 0, 0.05, Math.PI - 0.05); c.stroke();
      // feed legs to the focus
      c.beginPath(); c.moveTo(-R * 0.8, R * 0.18); c.lineTo(0, -R * 0.9); c.lineTo(R * 0.8, R * 0.18); c.moveTo(0, -R * 0.34); c.lineTo(0, -R * 0.9); c.stroke();
      c.fillStyle = 'rgba(255,226,163,0.95)'; c.beginPath(); c.arc(0, -R * 0.9, 3.2, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    e.blit2d('over', 1.4);
  },
};
