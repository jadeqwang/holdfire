// SONAR (B3: "sixty-two, depth charges falling,"). 27 October 1962, the western Atlantic: B-59 under the USS Randolph group's
// destroyers USS Beale (DD-471) and USS Cony (DD-508), which dropped practice depth charges (hand-grenade-sized) as a signal to
// surface — a signal the submarine had never been told about (facts.md §2). Drawn as a stylised 1962 plan-position scope in P1
// phosphor green: the hunted boat at the centre, the two destroyers circling as surface tracks, a sweep that paints and fades,
// and each charge arriving as a ping that blooms on the glass. Not a copy of any one instrument; the labels are the film's.
// p: {charges: [song times] (default: the words "depth", "charges", "falling" + a beat), period (sweep, s; default 2 beats),
//     caption (true), labels (true), cx, cy, R}
import * as THREE from 'three';
import { P } from '../../palette.js';
import { clamp, smooth, range, hash1 } from '../../util.js';

let mat = null;
const DEST = [{ name: 'DD-471  BEALE', r: 0.52, a0: -0.6, w: 0.16 }, { name: 'DD-508  CONY', r: 0.62, a0: 2.3, w: 0.13 }];
// charge splash points (fractions of the scope radius, around the boat)
const SPLASH = [[0.16, -0.09], [-0.11, 0.14], [0.07, 0.19], [-0.18, -0.12], [0.2, 0.08], [-0.04, -0.2]];

export function sonarTimes(A, p = {}) {
  const l = A.lines.find((x) => /^sixty-two/.test(x.text));
  const w = (j, d) => (l && l.words[j] ? l.words[j].t : d);
  const bp = A.beat(w(0, 158.8)).period || 0.635;
  return { charges: p.charges || [w(1, 159.6), w(2, 160.0), w(3, 160.56), w(3, 160.56) + bp * 0.5], period: p.period ?? bp * 2, t0: l ? l.t : 158.76 };
}

function build(e) {
  if (mat) return;
  mat = e.shader(/* glsl */`
    uniform vec2 C; uniform float R; uniform float sweep; uniform float omega; uniform float time; uniform vec3 phos;
    uniform vec4 dest[2]; uniform vec4 pings[6]; uniform float nP; uniform float shock;
    // brightness left on the phosphor by the sweep at bearing a (rad): it paints when it passes, then decays
    float painted(float a, float tau){ float d = mod(sweep - a, 6.28318); return exp(-d / omega / tau); }
    void main(){
      vec2 d = vec2(vUv.x * 1920., (1. - vUv.y) * 1080.);
      vec2 q = d - C; float r = length(q) / R; float a = atan(q.x, -q.y);    // bearing: 0 = up, clockwise
      vec3 col = vec3(.012, .014, .016);
      // bezel: a dark steel ring with a soft inner lip
      float bz = smoothstep(1.13, 1.12, r) * smoothstep(1.0, 1.012, r);
      col = mix(col, vec3(.07, .075, .08) * (.8 + .4 * smoothstep(.6, -.6, q.y / R)), bz);
      if (r < 1.) {
        // the glass: very dark green, a little phosphor grain, curvature falloff
        vec3 g = phos * (.018 + .012 * hash12(floor(d * .7) + floor(time * 12.)));
        g *= 1. - .5 * r * r;
        // graticule: range rings every quarter, bearing lines every 30 deg
        float rr = abs(fract(r * 4. + .5) - .5) / 4. * R;
        float ring = (1. - smoothstep(.8, 1.8, rr)) * step(.12, r);
        float ba = abs(mod(a + .2618, .5236) - .2618) * r * R;
        float spoke = (1. - smoothstep(.6, 1.5, ba)) * step(.12, r);
        g += phos * (ring * .1 + spoke * .055);
        // the sweep's afterglow, and grass (noise) painted with it
        float glow = painted(a, .35);
        g += phos * .16 * glow * (.6 + .4 * r);
        float grass = step(.93, hash12(floor(d / 3.) + floor(time * 8.))) * painted(a, .25) * smoothstep(.15, .9, r);
        g += phos * grass * .22;
        // the sweep line itself
        float sd = mod(sweep - a + 3.14159, 6.28318) - 3.14159;
        g += phos * (1. - smoothstep(0., .012, abs(sd))) * smoothstep(.0, .05, r) * 1.4;
        // the boat at the centre: a steady echo (we're on it)
        float b = exp(-pow(length(q) / 7., 2.)) + .35 * exp(-pow(length(q) / 18., 2.));
        g += phos * b * (1.1 + .6 * painted(0., .5));
        // destroyer tracks: an elongated echo, painted by the sweep
        for (int i = 0; i < 2; i++) {
          vec2 p = C + dest[i].xy; vec2 dq = d - p;
          float pa = atan(dest[i].x, -dest[i].y);
          vec2 hd = vec2(cos(dest[i].z), sin(dest[i].z));
          float along = dot(dq, hd), across = dot(dq, vec2(-hd.y, hd.x));
          float echo = exp(-along * along / 220. - across * across / 22.);
          g += phos * echo * (.3 + 1.8 * painted(pa, .7));
          // its wake: a faint trail of older echoes behind it
          float wk = exp(-across * across / 40.) * smoothstep(0., -120., along) * smoothstep(-260., -120., along);
          g += phos * wk * .1 * painted(pa, .9);
        }
        // pings: each charge arrives as a bright splash, then a ring that runs out and fades (the echo of the blast)
        for (int i = 0; i < 6; i++) {
          if (float(i) >= nP) break;
          vec4 pg = pings[i]; float age = pg.z; if (age < 0.) continue;
          float dd = length(d - (C + pg.xy));
          float splash = exp(-pow(dd / (10. + age * 30.), 2.)) * exp(-age / .25) * 2.4;
          float rr2 = 18. + age * 260.;
          float ringp = exp(-pow((dd - rr2) / (3.5 + age * 6.), 2.)) * exp(-age / .45) * 1.3;
          g += phos * (splash + ringp);
        }
        // the shock of each blast: the whole screen flares and the trace wavers
        g += phos * .05 * shock;
        col = g;
      }
      // the lip of the glass catches a little of the phosphor
      col += phos * .02 * exp(-pow((r - 1.) / .01, 2.));
      fragColor = vec4(col, 1.);
    }`, {
    C: { value: new THREE.Vector2(960, 520) }, R: { value: 440 }, sweep: { value: 0 }, omega: { value: 1 }, time: { value: 0 }, phos: { value: new THREE.Color(...P.phosphor) },
    dest: { value: [new THREE.Vector4(), new THREE.Vector4()] }, pings: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -1, 0)) }, nP: { value: 0 }, shock: { value: 0 },
  });
}

export default {
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; build(e);
    const T = sonarTimes(ctx.audio, p);
    const u = mat.uniforms;
    const cx = p.cx ?? 960, cy = p.cy ?? 520, R = p.R ?? 440;
    u.C.value.set(cx, cy); u.R.value = R; u.time.value = t;
    const omega = Math.PI * 2 / T.period;
    u.omega.value = omega; u.sweep.value = ((t - T.t0) * omega + 0.4) % (Math.PI * 2);
    const st = [];
    DEST.forEach((dd, i) => {
      const a = dd.a0 + (t - T.t0) * dd.w;                 // circling the boat
      const x = Math.sin(a) * dd.r * R, y = -Math.cos(a) * dd.r * R;
      u.dest.value[i].set(x, y, a, 0);                      // heading: the circle's tangent (cos a, sin a) in screen coords
      st.push([cx + x, cy + y, dd.name]);
    });
    let shock = 0;
    T.charges.slice(0, 6).forEach((tc, i) => {
      const s = SPLASH[i % SPLASH.length];
      u.pings.value[i].set(s[0] * R, s[1] * R, t - tc, 0);
      if (t >= tc) shock = Math.max(shock, Math.exp(-(t - tc) / 0.12));
    });
    u.nP.value = Math.min(6, T.charges.length); u.shock.value = shock;
    e.pass(mat, e.rtScene);
    ctx.state.sonar = { st, shock, T, cx, cy, R };
  },
  type(ty, t, lt, shot, ctx) {
    const p = ctx.p, s = ctx.state.sonar; if (!s) return;
    const g = P.phosphor;
    const a = smooth(range(lt, 0.05, 0.4));
    if (p.labels ?? true) {
      ty.text('B-59', s.cx + 22, s.cy - 14, { font: 'Plex', size: 19, color: g, alpha: 0.9 * a, glow: 8 });
      for (const [x, y, name] of s.st) ty.text(name, x + 20, y + 30, { font: 'Plex', size: 16, color: g, alpha: 0.75 * a, glow: 6 });
      const n = s.T.charges.filter((c) => t >= c).length;
      if (n > 0) ty.text(`PDC × ${n}`, s.cx + s.R * 0.72, s.cy + s.R * 0.95, { font: 'Plex', size: 16, color: g, alpha: 0.8 * a, glow: 6 });
    }
    if (p.caption ?? true) {
      ty.mono('27 OCT 1962  ·  B-59  ·  SIGNALLING DEPTH CHARGES', 960, 1036, t, { size: 22, color: P.cream, alpha: 0.88 * a, align: 'center', t0: shot.t0 + 0.05, cps: 70, cursor: false });
    }
  },
};
