// The station's terminal: a P3 amber CRT. Scenes draw the screen's content flat into the engine's 2D canvas (design px,
// inside RECT), then crtPass() puts it on the tube: slight barrel curvature, rounded glass, phosphor bleed, subtle
// scanlines, a faint flicker, the dark bezel catching the screen's light. `warm` (0..1) turns the phosphor's cast from
// amber to signal gold (the Listener's choice). Content colours are drawn by the scene; the pass lifts them into HDR so they glow.
import * as THREE from 'three';
import { P, mix } from '../../palette.js';

export const RECT = [150, 64, 1770, 872];         // the screen in design px (lyric band left free below, y > 900)
let mat = null;

function material(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform sampler2D tSrc; uniform vec4 rect; uniform float curv; uniform float warm; uniform float gain; uniform float t; uniform float S;
    uniform float zoom; uniform vec2 zc; uniform float scan; uniform vec3 amber; uniform vec3 goldC; uniform vec3 voidC; uniform float power;
    vec3 tap(vec2 d){ vec2 uv = vec2(d.x / 1920., 1. - d.y / 1080.); return texture(tSrc, uv).rgb * texture(tSrc, uv).a; }
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 p = (px - zc) / zoom + zc;
      vec2 c = (rect.xy + rect.zw) * .5, h = (rect.zw - rect.xy) * .5;
      vec2 s = (p - c) / h;                                         // -1..1 across the tube face
      vec2 sd = s * (1. + curv * dot(s, s)) / (1. + curv * .55);    // barrel
      // rounded glass
      vec2 q = abs(sd) - vec2(1. - .07, 1. - .07 * h.x / h.y);
      float sdf = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - .07;
      float inside = 1. - smoothstep(-.002, .004, sdf);
      vec3 tint = mix(amber, goldC, warm);
      vec2 d = c + sd * h;                                          // content coordinate
      // phosphor bleed (horizontal) + a whisper of vertical
      vec3 col = tap(d) * .62 + (tap(d + vec2(1.4, 0.)) + tap(d - vec2(1.4, 0.))) * .15 + (tap(d + vec2(3.2, 0.)) + tap(d - vec2(3.2, 0.))) * .05 + (tap(d + vec2(0., 1.2)) + tap(d - vec2(0., 1.2))) * .04;
      float sl = 1. - scan * (.5 + .5 * cos(6.2831853 * d.y / 3.6));
      float flick = 1. + .012 * sin(t * 61.) + .008 * sin(t * 17.3);
      // the tube's own dark glow (lit phosphor ground), brighter toward the centre
      float r2 = dot(sd, sd);
      vec3 ground = voidC * .6 + tint * (.018 + .02 * (1. - r2 * .5)) * power;
      vec3 scr = ground + col * gain * sl * flick;
      scr *= 1. - .28 * smoothstep(.4, 1.3, r2);                     // tube vignette
      // glass: a faint highlight in the upper left
      scr += vec3(.02, .022, .026) * smoothstep(.9, 0., length(sd - vec2(-.55, -.6))) * inside;
      // bezel: near-black, catching the screen's light near the glass edge
      float edge = max(sdf, 0.);
      vec3 bez = voidC * 1.15 + tint * .05 * power * exp(-edge * 22.);
      vec3 outc = mix(bez, scr, inside);
      outc *= 1. - smoothstep(.12, .6, edge) * .7;
      fragColor = vec4(outc, 1.);
    }`, {
    tSrc: { value: null }, rect: { value: new THREE.Vector4(...RECT) }, curv: { value: 0.045 }, warm: { value: 0 }, gain: { value: 1.6 }, t: { value: 0 }, S: { value: e.S },
    zoom: { value: 1 }, zc: { value: new THREE.Vector2(960, 470) }, scan: { value: 0.1 }, amber: { value: new THREE.Color() }, goldC: { value: new THREE.Color() },
    voidC: { value: new THREE.Color() }, power: { value: 1 },
  });
  return mat;
}

// o: {warm, gain, zoom, zc:[x,y], curv, scan, power}
export function crtPass(e, t, o = {}) {
  const m = material(e); const u = m.uniforms;
  e.c2dTex.needsUpdate = true;
  u.tSrc.value = e.c2dTex; u.t.value = t; u.S.value = e.S;
  u.warm.value = o.warm ?? 0; u.gain.value = o.gain ?? 1.6; u.zoom.value = o.zoom ?? 1; const zc = o.zc || [960, 470]; u.zc.value.set(zc[0], zc[1]);
  u.curv.value = o.curv ?? 0.045; u.scan.value = o.scan ?? 0.1; u.power.value = o.power ?? 1;
  u.amber.value.setRGB(...P.amberCRT); u.goldC.value.setRGB(...P.gold); u.voidC.value.setRGB(...P.void);
  e.pass(m, e.rtScene);
}

// screen colours (display sRGB), warmed by w (0 amber .. 1 gold)
// (authored a touch redder than #ffb000: the filmic tone map pulls bright amber toward yellow, this lands it on P3 amber)
const AMBER_SRC = [1.0, 0.57, 0.03];
export const amberAt = (w) => mix(AMBER_SRC, mix(P.gold, P.goldPale, 0.25), w);
export const dimAt = (w, k = 0.55) => mix(AMBER_SRC, P.gold, w).map((x) => x * k);
