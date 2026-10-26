// ARCHIVAL: a generated plate redrawn as PRINTED MATTER (the history material): the same guide maps as engraved.js
// (work/guides/<clip>/tone_k, edge_k, matte_k, on twos via drawingAt), printed on cream stock in a black AM halftone, with ink
// contours from the edge map and a second, red spot ink where the light is fire or alarm. The rostrum camera (zoom, pan) moves
// over the page: dots, fibres and plate are one object, as if a print were filmed. Paper grain and misregistration are fixed
// per shot (seed). Footage never appears; only its guides are read.
//
// p: {clip, s0, lag, zoom (1), pan [x,y] (design px), seed (paper + registration; default from shot id),
//     cell (6, design px of the black screen), misreg (2.2 px), rough (0.2),
//     levels [black, white, gamma] ([0.03, 0.62, 1.3]: tone levels before screening), sharpen (1.2) / sharpR (10 px): the repro
//     house's unsharp mask, kMax (0.94), bgInk (1: ink on the background where the matte is 0; 0.4-0.5 fades the background
//     to a vignetted cut-out, the old picture-desk look), edge (0.75: contour ink), edgeLo/edgeHi (0.18/0.55), bgEdge (0.35),
//     redMask (0: strength of the red spot ink), redLight (0: 1 = the whole scene lit red, e.g. Petrov's room),
//     redZones [[x, y, rx, ry], ...] (design px, page coords, up to 4: where the red light falls), redSoft (0.5),
//     redLo/redHi (0.06/0.55: tone range that takes red), redKnock (0.25: black lightened under red light, so the red reads),
//     warm (true: use warm_k.png from the clip dir when present; see tools/warmguide.py),
//     lamp (the page seen by lamplight, print.js setLamp: {x, y, rx, ry, peak 0.44, floor, k}; false = flat daylight page),
//     redGlow (0.3: the red light glows a little instead of only being printed)}
// Exports drawArchival / prepareArchival so other history scenes can print over a plate.
import * as THREE from 'three';
import { meta, texture, drawingAt } from '../../plates.js';
import { PRINT_GLSL, printUniforms, setPrint } from './print.js';
import { hash1 } from '../../util.js';

let mat = null;
const pad = (k) => String(k).padStart(4, '0');
const hasWarmCache = new Map();
const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;

async function hasWarm(clip) {
  if (hasWarmCache.has(clip)) return hasWarmCache.get(clip);
  let ok = false;
  try { const m = await meta(clip); ok = !!(m.warm || (m.guides && m.guides.includes && m.guides.includes('warm'))); } catch (e) { /* */ }
  if (!ok) { try { const r = await fetch(`work/guides/${clip}/warm.json`); ok = r.ok; } catch (e) { ok = false; } }
  hasWarmCache.set(clip, ok); return ok;
}

export function seedFor(shot, p) { return p.seed ?? Math.floor(hash1(String(shot && shot.id || 'x').split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 9973) * 997) + 1; }

function build(e) {
  if (mat) return;
  mat = e.shader(/* glsl */`
    ${PRINT_GLSL}
    uniform sampler2D tTone; uniform sampler2D tEdge; uniform sampler2D tMatte; uniform sampler2D tWarm;
    uniform float hasMatte; uniform float hasWarm;
    uniform vec3 levels; uniform float kMax; uniform float bgInk;
    uniform float edgeK; uniform float edgeLo; uniform float edgeHi; uniform float bgEdge;
    uniform float redMask; uniform float redLight; uniform vec4 zones[4]; uniform float nZones; uniform float redSoft;
    uniform float redLo; uniform float redHi; uniform float redKnock;
    bool inPlate(vec2 uv){ return uv.x >= 0. && uv.x <= 1. && uv.y >= 0. && uv.y <= 1.; }
    uniform float sharpen; uniform float sharpR;
    float levelsOf(float t){ return pow(clamp((t - levels.x) / (levels.y - levels.x), 0., 1.), levels.z); }
    float lightAt(vec2 uv){ return levelsOf(texture(tTone, uv).r); }
    // local contrast (an unsharp mask, as repro houses did before screening) so faces survive the dot
    float lightSharp(vec2 uv){
      float t = texture(tTone, uv).r;
      vec2 r = vec2(sharpR / 1920., sharpR / 1080.);
      float m = 0.;
      m += texture(tTone, uv + r * vec2( 1.,  0.)).r + texture(tTone, uv + r * vec2(-1.,  0.)).r;
      m += texture(tTone, uv + r * vec2( 0.,  1.)).r + texture(tTone, uv + r * vec2( 0., -1.)).r;
      m += texture(tTone, uv + r * vec2( .7,  .7)).r + texture(tTone, uv + r * vec2(-.7,  .7)).r;
      m += texture(tTone, uv + r * vec2( .7, -.7)).r + texture(tTone, uv + r * vec2(-.7, -.7)).r;
      m /= 8.;
      return levelsOf(t + (t - m) * sharpen);
    }
    float matteAt(vec2 uv){ return hasMatte > .5 ? texture(tMatte, uv).r : 1.; }
    float redAt(vec2 page, vec2 uv){
      float m = redLight;
      if (hasWarm > .5) m = max(m, texture(tWarm, uv).r);
      for (int i = 0; i < 4; i++) {
        if (float(i) >= nZones) break;
        vec4 z = zones[i]; vec2 d = (page - z.xy) / max(z.zw, vec2(1.));
        m = max(m, 1. - smoothstep(1. - redSoft, 1., length(d)));
      }
      return clamp(m * redMask, 0., 1.);
    }
    void main(){
      vec2 page = toPage(fragDesign());
      // black plate: sampled with its own registration
      vec2 uk = pageUv(page - offK), ur = pageUv(page - offR);
      float kT = 0., kS = 0., rT = 0.;
      float redK = 0.;
      if (inPlate(ur)) {
        float L = lightAt(ur);
        float red = redAt(page - offR, ur);
        // red light: the lit tones take red ink (the hottest highlight keeps a little paper)
        rT = red * smoothstep(redLo, redHi, L) * (1. - .45 * smoothstep(.82, 1., L));
        redK = red;
      }
      if (inPlate(uk)) {
        float L = lightSharp(uk), m = matteAt(uk);
        float red = redK;
        kT = min(1. - L, kMax) * mix(bgInk, 1., m);
        kT *= 1. - redKnock * red * smoothstep(.15, .6, L);
        float e = texture(tEdge, uk).r;
        kS = smoothstep(edgeLo, edgeHi, e) * edgeK * mix(bgEdge, 1., m);
      }
      fragColor = vec4(printPixel(page, kT, kS, rT, 0.), 1.);
    }`, {
    ...printUniforms(),
    tTone: { value: null }, tEdge: { value: null }, tMatte: { value: blank }, tWarm: { value: blank }, hasMatte: { value: 0 }, hasWarm: { value: 0 },
    levels: { value: new THREE.Vector3(0.02, 0.8, 0.85) }, kMax: { value: 0.93 }, bgInk: { value: 0.8 },
    edgeK: { value: 0.75 }, edgeLo: { value: 0.18 }, edgeHi: { value: 0.55 }, bgEdge: { value: 0.35 },
    redMask: { value: 0 }, redLight: { value: 0 }, zones: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, nZones: { value: 0 }, redSoft: { value: 0.5 },
    redLo: { value: 0.06 }, redHi: { value: 0.55 }, redKnock: { value: 0.25 }, sharpen: { value: 0.8 }, sharpR: { value: 10 },
  });
}

export async function prepareArchival(ctx, shot, t, p, key = 'arch') {
  const m = await meta(p.clip);
  const k = drawingAt(m, t, p.s0 ?? shot.t0, p.lag || 0);
  const base = `work/guides/${p.clip}/`;
  const [tone, edge] = await Promise.all([texture(base + `tone_${pad(k)}.png`), texture(base + `edge_${pad(k)}.png`)]);
  let matte = null; try { matte = await texture(base + `matte_${pad(k)}.png`); } catch (e) { /* optional */ }
  let warm = null;
  if (p.warm !== false && await hasWarm(p.clip)) { try { warm = await texture(base + `warm_${pad(k)}.png`); } catch (e) { /* optional */ } }
  ctx.state[key] = { tone, edge, matte, warm, k };
}

export function drawArchival(ctx, shot, p, key = 'arch', target = null) {
  const e = ctx.engine; build(e);
  const g = ctx.state[key];
  const u = mat.uniforms;
  setPrint(e, u, { seed: seedFor(shot, p), cell: p.cell ?? 6, cellR: p.cellR, misreg: p.misreg ?? 2.2, rough: p.rough ?? 0.2, zoom: p.zoom ?? 1, pan: p.pan || [0, 0], kGain: p.kGain ?? 1, rGain: p.rGain ?? 1, paper: p.paper, lamp: p.lamp, redGlow: p.redGlow ?? 0.3 });
  u.tTone.value = g.tone; u.tEdge.value = g.edge;
  u.tMatte.value = g.matte || blank; u.hasMatte.value = g.matte ? 1 : 0;
  u.tWarm.value = g.warm || blank; u.hasWarm.value = g.warm ? 1 : 0;
  const lv = p.levels || [0.03, 0.62, 1.3]; u.levels.value.set(lv[0], lv[1], lv[2]);
  u.sharpen.value = p.sharpen ?? 1.2; u.sharpR.value = p.sharpR ?? 10;
  u.kMax.value = p.kMax ?? 0.94; u.bgInk.value = p.bgInk ?? 1.0;
  u.edgeK.value = p.edge ?? 0.75; u.edgeLo.value = p.edgeLo ?? 0.18; u.edgeHi.value = p.edgeHi ?? 0.55; u.bgEdge.value = p.bgEdge ?? 0.35;
  u.redMask.value = p.redMask ?? 0; u.redLight.value = p.redLight ?? 0; u.redSoft.value = p.redSoft ?? 0.5;
  u.redLo.value = p.redLo ?? 0.06; u.redHi.value = p.redHi ?? 0.55; u.redKnock.value = p.redKnock ?? 0.25;
  const zs = (p.redZones || []).slice(0, 4);
  zs.forEach((z, i) => u.zones.value[i].set(z[0], z[1], z[2], z[3] ?? z[2]));
  u.nZones.value = zs.length;
  e.pass(mat, target || e.rtScene);
}

export default {
  async prepare(ctx, shot, t, lt, p) { await prepareArchival(ctx, shot, t, p); },
  draw(ctx, shot, t, lt, p) { drawArchival(ctx, shot, p); },
};
