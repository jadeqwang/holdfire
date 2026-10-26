// INKBOMB (V2d: "an end with no life that could level the ground."). On the same printed page, ink smoke rises from the ground
// line and spreads into the shape of a mushroom cloud: a stem, a cap whose two lobes roll (a vortex ring seen from the side),
// and on "level" a low base surge that runs out along the ground and flattens the tiny printed houses it passes. No flash,
// no sound made visible: black ink, a little red deep in the cap while it still burns. Silent and terrible, not spectacular.
// Closed form in t: the cloud's geometry is a function of time; turbulence is noise sampled in coordinates that rotate about
// each lobe's core (the roll) and stretch with the cloud's growth (advection), evaluated at half resolution, then screened.
// p: {t0 (start of the rise), tLevel (base surge), x (960), ground (870: y of the ground line), height (610), capR (330),
//     red (0.5: red ink in the cap's core), houses (true), seed, cell (6), misreg}
// Times default to line 25 in timing.json ("an end with no life that could level the ground.").
import * as THREE from 'three';
import { clamp, smooth, range, hash1 } from '../../util.js';
import { pressBegin, pressPrint, ink, WHITE } from './print.js';
import { seedFor } from './archival.js';

let fieldMat = null, fieldRT = null;
function build(e) {
  if (fieldMat) return;
  fieldRT = new THREE.WebGLRenderTarget(Math.max(1, e.W >> 1), Math.max(1, e.H >> 1), { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  fieldMat = e.shader(/* glsl */`
    uniform float age; uniform float sAge; uniform vec2 base; uniform float H; uniform float Rx; uniform float stemW;
    uniform float Wb; uniform float Hb; uniform float seed; uniform float red; uniform float zoom; uniform vec2 pan;
    float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
    void main(){
      vec2 d = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      d = (d - vec2(960., 540.) - pan) / zoom + vec2(960., 540.);
      vec2 capC = vec2(base.x, base.y - H);
      float Ry = Rx * .58;
      // the cap: an ellipse, flattened below, with two rolling lobes
      vec2 qc = (d - capC) / vec2(Rx, Ry);
      qc.y *= qc.y > 0. ? 1.45 : 1.;
      float capD = length(qc) - 1.;
      // the stem: narrow at the waist, flaring into the ground and into the cap
      float yy = clamp((base.y - d.y) / max(H, 1.), 0., 1.);
      float w = stemW * (1. + 1.6 * pow(1. - yy, 4.) + 1.2 * pow(yy, 6.));
      float stemD = (abs(d.x - base.x) - w) / max(w, 1.) * .7;
      stemD = max(stemD, (d.y - base.y) / 30.);
      stemD = max(stemD, (capC.y - d.y) / 60.);
      // the base surge along the ground
      vec2 qb = (d - vec2(base.x, base.y - Hb * .4)) / vec2(max(Wb, 1.), max(Hb, 1.));
      float baseD = Wb > 1. ? length(qb) - 1. : 9.;
      baseD = max(baseD, (d.y - base.y - 4.) / 20.);
      float D = smin(smin(capD, stemD, .35), baseD, .3);
      // turbulence: rolls about each lobe's core (left lobe one way, right the other), stretched with the cloud's growth
      float side = d.x < capC.x ? -1. : 1.;
      vec2 core = capC + vec2(side * Rx * .52, -Ry * .05);
      float ang = side * age * 1.7;
      vec2 rq = rot(ang) * (d - core) / (Rx * .55 + 30.);
      float inCap = smoothstep(.6, -.4, capD);
      vec2 nq = mix((d - base) / vec2(70. + stemW, 120.) + vec2(0., age * 1.4), rq * 2.1, inCap);
      nq = mix(nq, (d - base) / vec2(110., 40.) + vec2(sAge * side * 1.3, 0.), smoothstep(.4, -.6, baseD) * (1. - inCap));
      float n = fbm(nq + seed);
      float n2 = vnoise(d * .03 + seed + age);
      float De = D - (n - .5) * .9 - (n2 - .5) * .12;
      float body = smoothstep(.18, -.22, De);
      // ink: denser in the stem's root and the cap's underside, lighter where the top of the cap catches the light
      float shade = .62 + .38 * n;
      shade *= mix(1., .72, smoothstep(-.2, -.9, qc.y) * inCap);
      shade *= 1. - .25 * smoothstep(.0, -1., capD) * smoothstep(.5, 1., n);
      float k = body * shade * smoothstep(0., .15, age);
      // red: the fire still inside the cap early on, deep in, never at the edge
      float r = red * smoothstep(-.35, -.85, De) * inCap * exp(-age / 1.1) * smoothstep(.15, .45, n);
      fragColor = vec4(clamp(k, 0., 1.), 0., clamp(r, 0., 1.), 0.);
    }`, {
    age: { value: 0 }, sAge: { value: 0 }, base: { value: new THREE.Vector2() }, H: { value: 0 }, Rx: { value: 1 }, stemW: { value: 20 },
    Wb: { value: 0 }, Hb: { value: 0 }, seed: { value: 0 }, red: { value: 0.5 }, zoom: { value: 1 }, pan: { value: new THREE.Vector2() },
  });
}

export function bombTimes(A, p = {}) {
  const l = A.lines.find((x) => /^an end with no life/.test(x.text));
  const w = (j, d) => (l && l.words[j] ? l.words[j].t : d);
  return { t0: p.t0 ?? (l ? l.t - 0.05 : 90.0), tLevel: p.tLevel ?? w(7, 91.6) };
}

// the tiny printed settlement on the ground line: roofs and trees, flattened as the surge front passes
function drawGround(c, p, gx, gy, front) {
  c.fillStyle = ink(0, 1, 0);
  c.fillRect(-20, gy, 1960, 2.6);
  if (p.houses === false) return;
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    const dx = 90 + (i >> 1) * 38 + hash1(i * 3.1) * 26;
    const x = gx + side * dx;
    if (x < 10 || x > 1910) continue;
    const flat = 1 - smooth(range(front - Math.abs(x - gx), -30, 40)) * 0.88;
    const tree = hash1(i * 7.7) < 0.35;
    const h = (tree ? 12 + 9 * hash1(i) : 9 + 7 * hash1(i * 1.9)) * flat, wd = tree ? 7 : 11 + 8 * hash1(i * 2.3);
    c.beginPath();
    if (tree) { c.moveTo(x - wd / 2, gy); c.lineTo(x, gy - h); c.lineTo(x + wd / 2, gy); }
    else { const hw = h * 0.62; c.moveTo(x - wd / 2, gy); c.lineTo(x - wd / 2, gy - hw); c.lineTo(x, gy - h); c.lineTo(x + wd / 2, gy - hw); c.lineTo(x + wd / 2, gy); }
    c.closePath(); c.fill();
  }
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    const T = bombTimes(ctx.audio, p);
    const age = Math.max(0, t - T.t0), sAge = Math.max(0, t - T.tLevel);
    const gx = p.x ?? 960, gy = p.ground ?? 870;
    const Hmax = p.height ?? 610, Rmax = p.capR ?? 330;
    const u = fieldMat.uniforms;
    u.age.value = age; u.sAge.value = sAge;
    u.base.value.set(gx, gy);
    u.H.value = Hmax * (1 - Math.exp(-age / 0.62));
    u.Rx.value = 34 + (Rmax - 34) * (1 - Math.exp(-Math.max(0, age - 0.2) / 0.62));
    u.stemW.value = 22 + 26 * (1 - Math.exp(-age / 0.9));
    const Wb = t > T.tLevel ? 980 * (1 - Math.exp(-sAge / 0.45)) : 0;
    u.Wb.value = Wb; u.Hb.value = 22 + 70 * (1 - Math.exp(-sAge / 0.6));
    const seed = seedFor(shot, p);
    u.seed.value = (seed % 89) * 0.37; u.red.value = p.red ?? 0.5;
    u.zoom.value = 1; u.pan.value.set(0, 0);   // the field is in page coordinates; pressPrint applies the rostrum camera
    e.pass(fieldMat, fieldRT);
    const c = pressBegin(e);
    drawGround(c, p, gx, gy, Wb * 0.92);
    pressPrint(e, { seed, cell: p.cell ?? 6, misreg: p.misreg ?? 2.2, rough: p.rough ?? 0.2, field: fieldRT.texture, zoom: p.zoom ?? 1, pan: p.pan || [0, 0] });
  },
};
