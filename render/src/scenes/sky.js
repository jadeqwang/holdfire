// Procedural deep sky: three parallax layers of hashed stars (HDR cores, so bloom and the anamorphic streak pick them up),
// an optional Milky Way band with dust lanes, and coloured nebular fog. Used as the ground of most space shots.
// drawSky(ctx, p) renders into engine.rtScene. p: {pan:[x,y] (design px), zoom, rot, density, band, bandAng, bandOff,
//   neb, nebCol:[r,g,b], nebCol2, exposure, twinkle, seed, bg:[r,g,b], fog}
import * as THREE from 'three';
import { P } from '../palette.js';

let mat = null;

function material(engine) {
  if (mat) return mat;
  mat = engine.shader(/* glsl */`
    uniform vec2 res; uniform float S; uniform float time;
    uniform vec2 pan; uniform float zoom; uniform float rotA; uniform float density; uniform float band; uniform float bandAng; uniform float bandOff;
    uniform float neb; uniform vec3 nebCol; uniform vec3 nebCol2; uniform float exposure; uniform float twinkle; uniform float seed; uniform vec3 bg; uniform float fog;
    float starLayer(vec2 p, float cell, float thr, float sz, float tw){
      vec2 g = floor(p / cell); vec2 f = p - g * cell;
      float acc = 0.;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 c = g + vec2(i, j);
        vec2 h = hash22(c + seed);
        float on = step(thr, hash12(c * 1.37 + seed * 3.1));
        if (on < .5) continue;
        vec2 sp = (vec2(i, j) + h) * cell;
        float d = length(f - sp);
        float b = pow(hash12(c + 7.7 + seed), 6.) * 3.5 + .15;
        float tws = 1. + tw * sin(time * (2. + 5. * hash12(c + 2.2)) + 6.28 * hash12(c + 9.1)) * .35;
        acc += b * tws * (exp(-d * d / (sz * sz)) * 1.6 + exp(-d / (sz * 3.)) * .08);
      }
      return acc;
    }
    uniform vec2 world;  // baked world size in design px
    void main(){
      vec2 px = (vUv - .5) * world;
      vec3 col = bg;
      // nebular fog
      float n1 = fbm(px * .0011 + seed), n2 = fbm(px * .0024 + 13.1 + seed);
      col += nebCol * pow(n1, 2.2) * neb * .9 + nebCol2 * pow(n2, 3.) * neb * .6;
      // milky way band
      vec2 bd = rot(bandAng) * px;
      float bandProfile = exp(-pow((bd.y - bandOff) / 260., 2.));
      float dust = smoothstep(.45, .75, fbm(bd * vec2(.0016, .006) + 4.2 + seed));
      float glowB = fbm(bd * .003 + 9.) * bandProfile;
      col += vec3(.55, .6, .75) * glowB * band * .35 * (1. - dust * .8);
      // stars: density rises inside the band
      float dens = density * (1. + band * bandProfile * 2.5);
      float s = 0.;
      s += starLayer(px, 34., 1. - .55 * dens, .9, twinkle);
      s += starLayer(px * 1.0 + 500., 90., 1. - .5 * dens, 1.3, twinkle) * 1.5;
      s += starLayer(px * .6 + 1200., 260., 1. - .45 * dens, 1.8, twinkle) * 2.2;
      vec3 starTint = mix(vec3(.75, .85, 1.), vec3(1., .9, .75), hash12(floor(px / 90.)));
      col += starTint * s * (1. - band * dust * bandProfile * .7);
      fragColor = vec4(col, 1.);
    }`, {
    res: { value: [engine.W, engine.H] }, S: { value: engine.S }, time: { value: 0 },
    pan: { value: [0, 0] }, zoom: { value: 1 }, rotA: { value: 0 }, density: { value: 0.5 }, band: { value: 0 }, bandAng: { value: 0.35 }, bandOff: { value: 0 },
    neb: { value: 0.4 }, nebCol: { value: [0.05, 0.07, 0.14] }, nebCol2: { value: [0.12, 0.04, 0.06] }, exposure: { value: 1 }, twinkle: { value: 0.6 },
    seed: { value: 0 }, bg: { value: P.void }, fog: { value: 0 }, world: { value: [3840, 2160] },
  });
  return mat;
}

const cache = new Map();
let sampler = null;
const WORLD = [3840, 2160];

// bake the static sky for these params once (2x the frame in each direction), cached by key
function baked(e, p) {
  const key = JSON.stringify([p.density ?? 0.5, p.band ?? 0, p.bandAng ?? 0.35, p.bandOff ?? 0, p.neb ?? 0.4, p.nebCol, p.nebCol2, p.seed ?? 0, p.bg]);
  if (cache.has(key)) return cache.get(key);
  const rt = new THREE.WebGLRenderTarget(Math.round(WORLD[0] * e.S), Math.round(WORLD[1] * e.S),
    { type: THREE.HalfFloatType, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, wrapS: THREE.MirroredRepeatWrapping, wrapT: THREE.MirroredRepeatWrapping });
  rt.texture.wrapS = rt.texture.wrapT = THREE.MirroredRepeatWrapping;
  const m = material(e); const u = m.uniforms;
  u.density.value = p.density ?? 0.5; u.band.value = p.band ?? 0; u.bandAng.value = p.bandAng ?? 0.35; u.bandOff.value = p.bandOff ?? 0;
  u.neb.value = p.neb ?? 0.4; u.nebCol.value = p.nebCol || [0.05, 0.07, 0.14]; u.nebCol2.value = p.nebCol2 || [0.12, 0.04, 0.06];
  u.seed.value = p.seed ?? 0; u.bg.value = p.bg || P.void; u.twinkle.value = 0; u.time.value = 0; u.world.value = WORLD; u.S.value = e.S;
  e.pass(m, rt);
  cache.set(key, rt);
  return rt;
}

function samplerMat(e) {
  if (sampler) return sampler;
  sampler = e.shader(/* glsl */`
    uniform sampler2D tSky; uniform vec2 pan; uniform float zoom; uniform float rotA; uniform float exposure; uniform float fog; uniform vec3 bg; uniform vec2 world;
    void main(){
      vec2 px = (vUv - .5) * vec2(1920., 1080.);
      px = rot(rotA) * px / zoom + pan;
      vec3 col = texture(tSky, px / world + .5).rgb;
      col = mix(col, col * .4 + bg, fog);
      fragColor = vec4(col * exposure, 1.);
    }`, { tSky: { value: null }, pan: { value: [0, 0] }, zoom: { value: 1 }, rotA: { value: 0 }, exposure: { value: 1 }, fog: { value: 0 }, bg: { value: P.void }, world: { value: WORLD } });
  return sampler;
}

export function drawSky(ctx, p = {}, target = null) {
  const e = ctx.engine;
  const rt = baked(e, p);
  const m = samplerMat(e); const u = m.uniforms;
  u.tSky.value = rt.texture;
  u.pan.value = p.pan || [0, 0]; u.zoom.value = p.zoom ?? 1; u.rotA.value = p.rot ?? 0;
  u.exposure.value = p.exposure ?? 1; u.fog.value = p.fog ?? 0; u.bg.value = p.bg || P.void;
  e.pass(m, target || e.rtScene);
}

export default {
  draw(ctx, shot, t, lt, p) { drawSky(ctx, p); },
};
