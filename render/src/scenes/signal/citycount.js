// Post-chorus "Counting on you!": a night city seen from far above (street grids of districts at their own angles, avenues,
// a ring road, a river, the harbour), every light a point. On the shout, lights all over the city come on and brighten in the
// shape of a giant numeral (8 by default: the number the singers leave out, so the viewer completes 1, 1, 2, 3, 5, ... 8).
// The numeral is set in Archivo Expanded Black (the count's face), rasterised once into a mask; the wave of lights spreads
// from the numeral's centre in ~0.25 s, the rest of the city dims so the shape is unmistakable.
// p: {hit (song time of the shout; default the word "Counting" of the nearest "(Counting on you!)" line), numeral ('8'),
//     view (0 | 1: framing/rotation variant for the second shout), seed, size (numeral height px, 900)}
import * as THREE from 'three';
import { P } from '../../palette.js';
import { clamp, lerp, smooth, easeOutCubic, easeOutExpo, range } from '../../util.js';
import { canvasTex } from './lib.js';

let mat = null, fontOK = false;
const masks = new Map();

async function loadFont() {
  if (fontOK) return;
  try {
    const f = new FontFace('ArchivoX', 'url(assets/fonts/Archivo-VF.ttf)', { weight: '100 900', stretch: '62% 125%' });
    await f.load(); document.fonts.add(f); fontOK = true;
  } catch (e) { fontOK = true; /* falls back to Michroma */ }
}

// numeral mask: R = sharp glyph, G = soft (blurred) glyph, for fill and glow
function mask(numeral) {
  if (masks.has(numeral)) return masks.get(numeral);
  const N = 1024;
  const mk = (blur) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, N, N);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${Math.round(N * 0.98)}px ArchivoX, Michroma`;
    try { c.fontStretch = 'expanded'; } catch (e) { /* */ }
    if (blur) c.filter = `blur(${blur}px)`;
    c.fillText(numeral, N / 2, N * 0.53);
    return c.getImageData(0, 0, N, N).data;
  };
  const a = mk(0), b = mk(14);
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); const img = c.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { img.data[i * 4] = a[i * 4]; img.data[i * 4 + 1] = b[i * 4]; img.data[i * 4 + 2] = 0; img.data[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0);
  const t = canvasTex(cv); t.flipY = false; t.needsUpdate = true;
  masks.set(numeral, t);
  return t;
}

function material(e) {
  if (mat) return mat;
  mat = e.shader(/* glsl */`
    uniform vec2 camC; uniform float camZ; uniform float camA; uniform float S; uniform float t; uniform float seed;
    uniform sampler2D tMask; uniform vec2 mC; uniform float mH; uniform float mA; uniform float hitT; uniform float hitOn; uniform float glow;
    uniform vec3 gold; uniform vec3 cream; uniform vec3 hot; uniform vec3 bg; uniform vec3 night;
    // a point light of radius r (screen px) at squared distance d2 (world units^2)
    float pt(float d2, float r){ return exp(-d2 * camZ * camZ / (2. * r * r)); }
    // street lights on a rotated grid: (bx, by) block size, sp light spacing; major every 4th street
    float streets(vec2 q, vec2 blk, float sp, float dens, vec2 sd, out float major){
      float acc = 0.; major = 0.;
      for (int ax = 0; ax < 2; ax++) {
        vec2 a = ax == 0 ? q : q.yx; float b = ax == 0 ? blk.x : blk.y;
        float k = floor(a.x / b + .5); float dx = a.x - k * b;
        float m = floor(a.y / sp + .5); float dy = a.y - m * sp;
        float h = hash12(vec2(k, m) + sd + float(ax) * 71.);
        float isMaj = step(.5, 1. - abs(mod(k, 4.)) ) ;
        float on = step(h, dens * (isMaj > .5 ? 1.5 : 1.));
        float br = (.45 + .55 * hash12(vec2(m, k) + sd * 1.3)) * (isMaj > .5 ? 1.7 : 1.);
        acc += on * br * pt(dx * dx + dy * dy, isMaj > .5 ? 1.25 : 1.0);
        major = max(major, isMaj * on * pt(dx * dx, 6.) );
      }
      return acc;
    }
    void main(){
      vec2 px = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 v = (px - vec2(960., 540.)) / camZ;
      float ca = cos(camA), sa = sin(camA);
      vec2 w = camC + vec2(ca * v.x - sa * v.y, sa * v.x + ca * v.y);   // world units
      // land / sea: a coast across the lower left, a river through the middle
      float coast = dot(w, normalize(vec2(-.62, .78))) - 620. - 90. * (fbm3(vec2(dot(w, vec2(.78, .62)) * .0016, 4.)) - .5);
      float land = smoothstep(14., -14., coast);
      float rv = w.y - (-140. + 160. * sin(w.x * .0021 + .7) + 60. * sin(w.x * .0057));
      float river = smoothstep(26., 18., abs(rv));
      // districts (Voronoi of 6 centres), each with its own grid angle and block size
      vec2 wp = w + 90. * vec2(fbm3(w * .0012 + seed), fbm3(w * .0012 + seed + 5.2)) - 45.;
      float best = 1e9; vec3 dist = vec3(0.); vec2 dc = vec2(0.);
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        vec2 c = (vec2(hash12(vec2(fi, seed)), hash12(vec2(seed, fi + 3.))) - .5) * vec2(2600., 1700.);
        float d = length(wp - c);
        if (d < best) { best = d; dc = c; dist = vec3(fi * .7 + hash12(vec2(fi, 9.)) * .9, 22. + 14. * hash12(vec2(fi, 2.)), 8.5 + 3. * hash12(vec2(fi, 4.))); }
      }
      float ra = dist.x; vec2 q = vec2(cos(ra) * (w - dc).x + sin(ra) * (w - dc).y, -sin(ra) * (w - dc).x + cos(ra) * (w - dc).y);
      float r0 = length(w - vec2(-60., 40.));
      float dens = clamp(1.05 - r0 / 1500., 0., 1.) * (.55 + .45 * fbm3(w * .002 + 11.));
      float major;
      float L = streets(q, vec2(dist.y, dist.y * 1.35), dist.z, .38 + .5 * dens, dc, major);
      // windows: a few dim lights inside each block
      vec2 cell = floor(q / vec2(dist.y, dist.y * 1.35));
      float win = 0.;
      for (int i = 0; i < 3; i++) {
        vec2 h = hash22(cell + float(i) * 13.1 + dc);
        vec2 pp = (cell + .2 + .6 * h) * vec2(dist.y, dist.y * 1.35);
        vec2 dd = q - pp; win += step(hash12(cell * 1.7 + float(i)), dens * .8) * .45 * pt(dot(dd, dd), .9);
      }
      // the ring road and two arterials: dense bright sodium lines
      float th = atan(w.y - 40., w.x + 60.);
      float ring = abs(r0 - (560. + 70. * sin(3. * th + 1.) + 45. * sin(5. * th + 2.3))); float art1 = abs(dot(w - vec2(-60., 40.), normalize(vec2(.94, .34))));
      float art2 = abs(dot(w - vec2(-60., 40.), normalize(vec2(-.3, .95))));
      float road = 0.;
      for (int i = 0; i < 3; i++) {
        float dr = i == 0 ? ring : (i == 1 ? art1 : art2);
        float al = i == 0 ? th * 560. : (i == 1 ? dot(w, vec2(.34, -.94)) : dot(w, vec2(.95, .3)));
        float m = floor(al / 6. + .5); float da = al - m * 6.;
        float lane = abs(dr - 3.5); float lane2 = abs(dr + 3.5);
        road += pt(min(lane, lane2) * min(lane, lane2) + da * da, 1.1) * (.8 + .4 * hash12(vec2(m, float(i))));
      }
      road *= smoothstep(1700., 900., r0) * .75;
      float park = smoothstep(.6, .66, fbm3(w * .0042 + 21.));
      float lights = (L * (1. - .85 * park) + win * (1. - park) + road * 1.2) * land * (1. - river);
      // the numeral: a mask in world space; lights inside it come on and flare in a wave from its centre
      vec2 mw = w - mC; mw = vec2(cos(mA) * mw.x + sin(mA) * mw.y, -sin(mA) * mw.x + cos(mA) * mw.y);
      vec2 muv = mw / mH + .5;
      vec2 mk = (muv.x > 0. && muv.x < 1. && muv.y > 0. && muv.y < 1.) ? texture(tMask, muv).rg : vec2(0.);
      float inside = smoothstep(.35, .65, mk.r);
      float wave = smoothstep(0., .12, hitT - length(w - mC) / (mH * 2.4)) * hitOn;
      // extra lights: people raising lights inside the shape (a finer, denser grid)
      vec2 fq = q / 6.4; vec2 fk = floor(fq + .5); vec2 fd = (fq - fk) * 6.4;
      float extra = step(hash12(fk + 3.3), .72) * pt(dot(fd, fd), 1.15) * (.7 + .6 * hash12(fk + 9.));
      float inL = (lights * 1.5 + extra * .85) * inside * wave * land;
      float outDim = 1. - .62 * wave * (1. - inside);
      vec3 lc = mix(gold, cream, .25 * hash12(floor(w / 7.)));
      vec3 col = bg;
      // sky glow over the dense centre, the river's dark ribbon, the sea's faint reflection
      col += night * (.25 + .9 * dens * land) * .35;
      col += gold * .02 * dens * land;
      col += lc * lights * outDim * .95;
      float flash = exp(-max(hitT, 0.) / .3);
      col += mix(gold * 1.1, hot, .55 + .45 * flash) * inL * (.85 + .9 * flash);
      col += gold * mk.g * wave * glow * (.05 + .06 * flash);                       // soft glow of the shape (haze lit from below)
      fragColor = vec4(col, 1.);
    }`, {
    camC: { value: new THREE.Vector2() }, camZ: { value: 1 }, camA: { value: 0 }, S: { value: e.S }, t: { value: 0 }, seed: { value: 1 },
    tMask: { value: null }, mC: { value: new THREE.Vector2() }, mH: { value: 900 }, mA: { value: 0 }, hitT: { value: -1 }, hitOn: { value: 0 }, glow: { value: 1 },
    gold: { value: new THREE.Color() }, cream: { value: new THREE.Color() }, hot: { value: new THREE.Color() }, bg: { value: new THREE.Color() }, night: { value: new THREE.Color() },
  });
  return mat;
}

function hitTime(ctx, shot, p) {
  if (p.hit != null) return p.hit;
  const ls = ctx.audio.lines.filter((l) => /counting on you!/i.test(l.text || '') && /\(/.test(l.text || ''));
  let best = null; for (const l of ls) if (!best || Math.abs(l.t - shot.t0) < Math.abs(best.t - shot.t0)) best = l;
  return best ? best.t : shot.t0 + 0.35;
}

export const look = { bloom: 0.85, bloomThreshold: 0.65, halation: 0.25, vignette: 0.4, grain: 0.03, streak: 0.3, streakThreshold: 1.6, streakCol: [1.0, 0.82, 0.55] };

export default {
  async init() { await loadFont(); },
  async prepare() { await loadFont(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const m = material(e); const u = m.uniforms;
    const hit = hitTime(ctx, shot, p);
    const view = p.view ?? 0;
    const k = smooth(range(t, shot.t0, shot.t1));
    const kick = easeOutExpo(range(t, hit, hit + 0.4));
    const camAt = (tt) => { const kk = smooth(range(tt, shot.t0, shot.t1));
      return { z: (view ? 1.12 : 1.0) * lerp(0.94, 1.0, kk), a: (view ? -0.35 : 0.12) + lerp(-0.02, 0.02, kk), c: [lerp(40, 0, kk) + (view ? 30 : 0), lerp(20, 0, kk)] }; };
    const C = camAt(t), H = camAt(hit);
    const z = C.z * (1 + 0.025 * kick), a = C.a;
    const mH = p.size ?? 900;
    u.camC.value.set(C.c[0], C.c[1]);
    u.camZ.value = z; u.camA.value = a; u.S.value = e.S; u.t.value = t; u.seed.value = p.seed ?? (view ? 7 : 3);
    u.tMask.value = mask(p.numeral ?? '8');
    // keep the numeral upright on screen: its world centre is the camera centre, rotated back by the camera angle
    u.mC.value.set(H.c[0], H.c[1]); u.mH.value = mH / H.z; u.mA.value = H.a;
    u.hitT.value = t - hit; u.hitOn.value = t >= hit ? 1 : 0; u.glow.value = 1;
    u.gold.value.setRGB(...P.gold); u.cream.value.setRGB(...P.cream); u.hot.value.setRGB(...P.goldPale);
    u.bg.value.setRGB(...P.void); u.night.value.setRGB(...P.night);
    e.pass(m, e.rtScene);
  },
};
