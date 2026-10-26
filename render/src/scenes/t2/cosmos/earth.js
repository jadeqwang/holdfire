// Night-side Earth for the cosmos scenes: a per-pixel ray-cast globe seen from a true perspective camera (so the same code
// draws the ISS horizon and the whole disc over the pole), lit by the group's baked light map (assets/t2/earth_lights.png:
// Natural Earth populated places as metro glows, towns and roads of light; see tools/bake_lights.py), faint moonlit land
// and clouds (a 3D-noise cloud map baked once on the GPU), a thin pale-blue limb with the gold airglow line above it, and,
// for t2_war, up to 48 detonations (white flash, a red burning disc, the lights around it going out).
//
// World units: Earth radii, centre at the origin, +y = north pole, lon 0 on +z, lon 90E on +x.
// earthCam(c): c = {lat, lon (deg, the point under the camera), alt (km), heading (deg, 0 = north), pitch (deg below the
//   horizontal: 90 looks straight down), roll (deg), fov (deg, vertical), off [x, y] (design px shift)}
import * as THREE from 'three';
import { clamp } from '../../../util.js';
import { C } from './common.js';
import { SpriteBatch, LineBatch, setCommon } from './gfx.js';

const D2R = Math.PI / 180, RKM = 6371;
let mat = null, texL = null, cloudRT = null, CITIES = null, scene3 = null;

export const vecLL = (lat, lon, r = 1) => [r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

export function earthCam(c) {
  const lat = c.lat ?? 70, lon = c.lon ?? -40, alt = (c.alt ?? 8000) / RKM;
  const upL = vecLL(lat, lon);
  let north = [-Math.sin(lat * D2R) * Math.sin(lon * D2R), Math.cos(lat * D2R), -Math.sin(lat * D2R) * Math.cos(lon * D2R)];
  const east = nrm(cross(north, upL)); north = nrm(cross(upL, east));
  const hd = (c.heading ?? 0) * D2R, pt = (c.pitch ?? 90) * D2R;
  const horiz = add(north.map((x) => x * Math.cos(hd)), east, Math.sin(hd));
  const fwd = nrm(add(horiz.map((x) => x * Math.cos(pt)), upL, -Math.sin(pt)));
  // camera up: the component of the local "ahead" (or north when looking straight down) orthogonal to fwd
  let ref = pt > 89.5 * D2R ? horiz : upL;
  let up = nrm(add(ref, fwd, -dot(ref, fwd)));
  let right = nrm(cross(fwd, up));
  const rl = (c.roll ?? 0) * D2R;
  if (rl) { const u2 = add(up.map((x) => x * Math.cos(rl)), right, Math.sin(rl)); right = nrm(cross(fwd, u2)); up = u2; }
  const pos = vecLL(lat, lon, 1 + alt);
  const fov = c.fov ?? 40;
  const cam = new THREE.PerspectiveCamera(fov, 16 / 9, Math.max(2e-5, alt * 0.05), 200);
  cam.position.set(...pos); cam.up.set(...up); cam.lookAt(pos[0] + fwd[0], pos[1] + fwd[1], pos[2] + fwd[2]);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  return { pos, fwd, up, right, tanH: Math.tan(fov * D2R / 2), cam, off: c.off || [0, 0], alt };
}

// design px (y down) of a world point, and whether it is in front of the camera and not hidden by the globe
export function projectE(ec, X) {
  const d = [X[0] - ec.pos[0], X[1] - ec.pos[1], X[2] - ec.pos[2]];
  const z = dot(d, ec.fwd);
  const x = dot(d, ec.right) / (z * ec.tanH), y = dot(d, ec.up) / (z * ec.tanH);
  const px = 960 + x * 540 + ec.off[0], py = 540 - y * 540 + ec.off[1];
  return [px, py, z > 0 && visibleE(ec, X)];
}
export function visibleE(ec, X) {
  const d = [X[0] - ec.pos[0], X[1] - ec.pos[1], X[2] - ec.pos[2]];
  const L = Math.hypot(d[0], d[1], d[2]); const rd = [d[0] / L, d[1] / L, d[2] / L];
  const b = dot(ec.pos, rd), c = dot(ec.pos, ec.pos) - 1, disc = b * b - c;
  if (disc <= 0) return true;
  const t0 = -b - Math.sqrt(disc);
  return !(t0 > 0 && t0 < L - 1e-4);
}

function loadTex(url, mip = true) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
    t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.generateMipmaps = mip;
    t.anisotropy = 1; t.needsUpdate = true; res(t);
  }, undefined, rej));
}

const NOISE3 = /* glsl */`
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fb3(vec3 p, int o){ float v = 0., a = .5; for (int i = 0; i < 7; i++) { if (i >= o) break; v += a * vn3(p); p = p * 2.07 + vec3(11.3, 7.1, 3.7); a *= .5; } return v; }
`;

// equirect map baked once on the GPU (2048x1024, mipmapped): r = clouds (Earth), g/b = Echo's islands and clouds
function bakeClouds(e) {
  const rt = new THREE.WebGLRenderTarget(2048, 1024, { type: THREE.UnsignedByteType, depthBuffer: false, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
  const m = e.shader(NOISE3 + /* glsl */`
    void main(){
      float lon = (vUv.x - .5) * 6.2831853, lat = (vUv.y - .5) * 3.14159265;   // vUv.y = 1 is the north (flipY off on sample)
      vec3 n = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
      // Earth: banded weather, warped
      vec3 q = n * 3.1; q += vec3(fb3(q * 1.3, 4), fb3(q * 1.3 + 5.2, 4), fb3(q * 1.3 + 9.1, 4)) * 1.4;
      float band = .55 + .45 * cos(lat * 6.);
      float cl = smoothstep(.48, .78, fb3(q * 1.7, 6) * (.75 + .35 * band));
      // Echo: an ocean world: archipelagos and violet weather
      vec3 r = n * 2.3; r += vec3(fb3(r + 2.1, 4), fb3(r + 7.7, 4), fb3(r + 4.4, 4)) * 1.1;
      float isl = smoothstep(.6, .66, fb3(r * 1.6, 6));
      vec3 s = n * 2.8 + vec3(fb3(n * 4.1 + 1.7, 4)) * 1.6;
      float ecl = smoothstep(.45, .8, fb3(s * vec3(1., 2.2, 1.), 6));
      fragColor = vec4(cl, isl, ecl, 1.);
    }`, {});
  e.pass(m, rt);
  rt.texture.generateMipmaps = true;
  // three regenerates mipmaps after rendering into a target whose texture asks for them
  return rt;
}

export async function initEarth(ctx) {
  const e = ctx.engine;
  if (mat) return;
  const [L, cj] = await Promise.all([loadTex('assets/t2/earth_lights.png'), fetch('assets/t2/earth_cities.json').then((r) => r.json())]);
  texL = L; CITIES = cj.cities;
  cloudRT = bakeClouds(e);
  mat = e.shader(NOISE3 + /* glsl */`
    uniform sampler2D tL; uniform sampler2D tCl;
    uniform vec3 camPos; uniform vec3 cF; uniform vec3 cR; uniform vec3 cU; uniform float tanH; uniform vec2 off;
    uniform vec3 sunDir; uniform float gain; uniform vec3 colA; uniform vec3 colB; uniform float landK; uniform float cloudK;
    uniform vec3 atmoCol; uniform float atmoK; uniform float airK; uniform float detail; uniform float time;
    uniform sampler2D tImp; uniform float useImp; uniform vec4 sweep; uniform float S; uniform float dark; uniform float redK; uniform float flashK; uniform vec2 spin;
    const float PI = 3.14159265;
    vec4 samp(sampler2D t, vec2 uv, vec2 dx, vec2 dy){ return textureGrad(t, uv, dx, dy); }
    void main(){
      vec2 px = vUv * vec2(1920., 1080.);
      vec2 q = (px - vec2(960., 540.) - vec2(off.x, -off.y)) / 540.;
      vec3 rd = normalize(cF + (q.x * cR + q.y * cU) * tanH);
      float b = dot(camPos, rd), c = dot(camPos, camPos) - 1., disc = b * b - c;
      vec3 sunN = normalize(sunDir);
      vec3 col = vec3(0.);
      float hit = step(0., disc) * step(b, 0.);
      // ---- the limb: thin pale-blue atmosphere, the airglow line above it, both brighter toward the sun
      float dmin = sqrt(max(c - b * b + 1., 0.));          // closest approach of the ray to the centre (radii)
      vec3 cp = camPos + rd * max(-b, 0.);                  // that point
      float sunSide = clamp(dot(normalize(cp), sunN) * .5 + .5, 0., 1.);
      float hh = dmin - 1.;
      if (hit < .5 || hh > -1e-4) {
        float h = max(hh, 0.);
        float limb = exp(-h / .0085) * .9 + exp(-h / .035) * .12;
        float air = exp(-pow((h - .0165) / .0028, 2.));
        col += atmoCol * limb * atmoK * (.1 + 1.6 * pow(sunSide, 4.));
        col += vec3(1., .86, .5) * air * airK * (.6 + .4 * sunSide);
        col = mix(col, vec3(1., .1, .06) * limb * atmoK * 1.2, redK * .8);
      }
      if (hit > .5) {
        float tt = -b - sqrt(disc);
        vec3 n = normalize(camPos + rd * tt);
        // spin: the globe turns under the camera (deg of longitude), applied to the lookup only
        vec3 g = n; float ca = cos(spin.x), sa = sin(spin.x); g = vec3(ca * n.x - sa * n.z, n.y, sa * n.x + ca * n.z);
        float lat = asin(clamp(g.y, -1., 1.)), lon = atan(g.x, g.z);
        vec2 uv = vec2(lon / (2. * PI) + .5, .5 - lat / PI);
        vec2 dx = dFdx(uv), dy = dFdy(uv);
        if (abs(dx.x) > .5) dx.x -= sign(dx.x); if (abs(dy.x) > .5) dy.x -= sign(dy.x);
        vec4 la = samp(tL, uv, dx, dy);
        float L = la.r, land = la.a;
        float cl = samp(tCl, vec2(uv.x, 1. - uv.y), vec2(dx.x, -dx.y), vec2(dy.x, -dy.y)).r * cloudK;
        float mu = max(dot(n, -rd), 0.);
        float day = smoothstep(-.06, .3, dot(n, sunN));
        // ---- city detail below ~3 km a pixel: districts of street grids and sodium points under the baked glow
        vec2 qk = vec2(lon * cos(lat), lat) * 6371.;
        vec2 qx = dFdx(qk), qy = dFdy(qk);
        if (abs(qx.x) > 20000.) qx.x = 0.; if (abs(qy.x) > 20000.) qy.x = 0.;
        float fw = max(length(qx), length(qy)) * S;   // km per design px (resolution independent)
        float Ld = pow(L, 1.35);
        if (detail > 0. && fw < .2) {
          // magnified, the baked map becomes an urban density (a smoother mip) and the picture is drawn as discrete
          // lights: three octaves of points strung on street lattices (each district its own orientation), every
          // octave mean-preserving, so the city keeps its brightness while it resolves into streets and lamps
          float Ls = textureLod(tL, uv, 2.).r;
          float org = smoothstep(.2, .75, vnoise(qk / 3.3 + 7.) * .7 + vnoise(qk / 1.1 + 2.) * .3);
          float densM = clamp(Ls * 1.2, 0., 1.), dens = densM * (.65 + .45 * org);
          // districts: each its own street orientation
          vec2 dc = floor(qk / 6.5 + vnoise(qk / 5.) * .7);
          vec2 r = rot(.35 + (hash12(dc) - .5) * .7) * qk;
          float acc = 0.;
          for (int o = 0; o < 2; o++) {
            float s = o == 0 ? .11 : .66;
            vec2 g = r / s; vec2 li = floor(g + .5);
            vec2 dl = abs(g - li) * s;                                   // km to the nearest line in each family
            vec2 keep = step(vec2(o == 0 ? .3 : .1), vec2(hash12(vec2(li.x, dc.x * 7. + float(o))), hash12(vec2(li.y + 50., dc.y * 7. + float(o)))));
            float w = max(fw * 1.05, s * .03);
            float af = min(1., s * .045 / w);
            float lamp = 1.;
            if (fw < .0045) { vec2 al = fract(r / .035); lamp = mix(1., .35 + 1.6 * exp(-pow(min(abs(al.y - .5), abs(al.x - .5)) / .18, 2.)), smoothstep(.0045, .0025, fw)); }
            float ln = max((1. - smoothstep(0., w, dl.x)) * keep.x, (1. - smoothstep(0., w, dl.y)) * keep.y) * af * lamp;
            float vis = smoothstep(s / 6., s / 11., fw);
            float mean = .09 * (o == 0 ? .7 : .9);
            acc += mix(mean * (o == 0 ? densM : sqrt(densM)), ln * (o == 0 ? dens : sqrt(dens)), vis) * (o == 0 ? 2.2 : 3.2);
          }
          // a scatter of bright points: stadiums, yards, towers
          vec2 c2 = floor(qk / .5); vec2 hp = hash22(c2) - .5;
          float pd = length(fract(qk / .5) - .5 - hp * .7) * .5;
          float rp = max(fw * .8, .02);
          acc += step(.93, hash12(c2 + 9.)) * exp(-pd * pd / (rp * rp)) * min(6., .02 / (rp * rp) * .1) * dens;
          acc += .06 * densM;
          acc *= .4;
          float dk = smoothstep(.2, .08, fw) * detail;
          Ld = mix(Ld, acc, dk);
        }
        float kill = 0., fire = 0., flash = 0.;
        if (useImp > .5) {
          vec4 im = texture(tImp, vec2(uv.x, 1. - uv.y));
          kill = im.r; flash = im.b * 8.;
          if (im.g > .002) fire = im.g * 4. * (vnoise(g.xy * 900. + g.z * 300.) * .6 + .4);
        }
        float on = 1., front = 0.;
        if (sweep.w > -.5) { float sd = (1. - dot(g, normalize(sweep.xyz))) * .5; on = 1. - smoothstep(sweep.w - .03, sweep.w + .03, sd); front = exp(-pow((sd - sweep.w) / .012, 2.)) * step(sweep.w, 1.); }
        kill = max(kill, 1. - on);
        float lights = Ld * gain * (1. - day * .92) * (1. - .55 * cl) * (1. - kill) * (1. - dark) * (1. + 2.5 * front);
        vec3 lc = mix(colA, colB, clamp(Ld * 1.1 - .1, 0., 1.) * (1. - .7 * smoothstep(.2, .08, fw) * detail));
        col = lc * lights;
                col += colA * L * gain * .18 * cl * (1. - day) * (1. - kill) * (1. - dark);   // light under cloud scatters
        // moonlit land and cloud, faint; the day side (if any) deep blue
        col += vec3(.03, .042, .065) * land * landK * (.4 + .6 * mu);
        col += vec3(.06, .075, .1) * cl * landK * 1.4;
        col += mix(vec3(.004, .012, .03), vec3(.03, .04, .045), land) * day * 1.6 + vec3(.5, .55, .6) * cl * day * .6;
        // the self-destruct look: the night side reddens, the fires burn
        col = mix(col, vec3(1., .07, .04) * (land * .2 + cl * .08 + .03) * (.6 + .4 * mu), redK);
        col += vec3(1., .2, .08) * fire * 1.6 + vec3(1., .9, .75) * flash;
        col += vec3(1., .35, .2) * flashK * (land * .5 + .2);
        // atmosphere seen through, toward the limb
        float rim = pow(1. - mu, 5.);
        col += atmoCol * rim * atmoK * .5 * (.08 + 1.4 * pow(clamp(dot(n, sunN) * .5 + .5, 0., 1.), 4.)) * (1. - redK * .7);
      }
      fragColor = vec4(col, 1.);
    }`, {
    tL: { value: texL }, tCl: { value: cloudRT.texture },
    camPos: { value: new THREE.Vector3() }, cF: { value: new THREE.Vector3() }, cR: { value: new THREE.Vector3() }, cU: { value: new THREE.Vector3() },
    tanH: { value: 0.4 }, off: { value: new THREE.Vector2() }, sunDir: { value: new THREE.Vector3(0, 0, -1) },
    gain: { value: 1.7 }, colA: { value: new THREE.Color(...C.sodium) }, colB: { value: new THREE.Color(1.0, 0.9, 0.7) },
    landK: { value: 1 }, cloudK: { value: 1 }, atmoCol: { value: new THREE.Color(...C.pale) }, atmoK: { value: 1 }, airK: { value: 0.35 },
    detail: { value: 1 }, time: { value: 0 }, tImp: { value: null }, useImp: { value: 0 },
    S: { value: e.S }, dark: { value: 0 }, sweep: { value: new THREE.Vector4(0, 0, 1, -1) }, redK: { value: 0 }, flashK: { value: 0 }, spin: { value: new THREE.Vector2() },
  });
  scene3 = new THREE.Scene();
}

// the detonations as an equirect field (r = lights killed, g = fire / 4, b = flash / 8), one pass at 1024x512 per frame:
// a fraction of the cost of looping every impact for every screen pixel
let impRT = null, impMat = null;
function impactField(e, imps) {
  if (!impRT) {
    impRT = new THREE.WebGLRenderTarget(1024, 512, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
    impMat = e.shader(/* glsl */`
      uniform vec4 imp[48]; uniform int nImp;
      void main(){
        float lon = (vUv.x - .5) * 6.2831853, lat = (vUv.y - .5) * 3.14159265;
        vec3 g = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
        float kill = 0., fire = 0., flash = 0.;
        for (int i = 0; i < 48; i++) {
          if (i >= nImp) break;
          vec4 m = imp[i]; float d = distance(g, m.xyz), age = m.w;
          if (d > .1) continue;
          float rb = .006 + .022 * (1. - exp(-age / .9));
          kill = max(kill, smoothstep(rb * 3.2, rb * 1.2, d) * clamp(age / .25, 0., 1.));
          fire += smoothstep(rb, rb * .3, d) * (.5 + 1.5 * exp(-age / .5)) * (.35 + .65 * exp(-age / 4.));
          flash += exp(-d * d / pow(.006 + .042 * clamp(age / .2, 0., 1.), 2.)) * exp(-age / .13) * 6.;
        }
        fragColor = vec4(kill, fire * .25, flash * .125, 1.);
      }`, { imp: { value: Array.from({ length: 48 }, () => new THREE.Vector4(0, 0, 0, -1)) }, nImp: { value: 0 } });
  }
  const u = impMat.uniforms;
  for (let i = 0; i < 48; i++) { const m = imps[i]; if (m) u.imp.value[i].set(m[0], m[1], m[2], m[3]); else u.imp.value[i].set(0, 0, 0, -1); }
  u.nImp.value = Math.min(48, imps.length);
  e.pass(impMat, impRT);
}

export const earthCities = () => CITIES;
export const earthTexture = () => cloudRT;

// o: {gain, landK, cloudK, atmoK, airK, detail, sun [x,y,z] world, impacts [[x,y,z,age]...], dark, red, flash, colA, colB, spin (deg)}
export function drawEarth(ctx, ec, o = {}, blend = 'replace') {
  const e = ctx.engine, u = mat.uniforms;
  u.camPos.value.set(...ec.pos); u.cF.value.set(...ec.fwd); u.cR.value.set(...ec.right); u.cU.value.set(...ec.up);
  u.tanH.value = ec.tanH; u.off.value.set(ec.off[0], ec.off[1]);
  u.sunDir.value.set(...(o.sun || [0, -0.3, -1]));
  u.gain.value = o.gain ?? 1.7; u.landK.value = o.landK ?? 1; u.cloudK.value = o.cloudK ?? 1; u.atmoK.value = o.atmoK ?? 1; u.airK.value = o.airK ?? 0.35;
  u.detail.value = o.detail ?? 1; u.time.value = ctx.t;
  u.colA.value.setRGB(...(o.colA || C.sodium)); u.colB.value.setRGB(...(o.colB || [1.0, 0.9, 0.7]));
  if (o.atmoCol) u.atmoCol.value.setRGB(...o.atmoCol); else u.atmoCol.value.setRGB(...C.pale);
  const imps = (o.impacts || []).filter((m) => m[3] >= 0);
  u.useImp.value = imps.length ? 1 : 0;
  if (imps.length) { impactField(e, imps); u.tImp.value = impRT.texture; }
  if (o.sweep) u.sweep.value.set(o.sweep[0], o.sweep[1], o.sweep[2], o.sweep[3]); else u.sweep.value.set(0, 0, 1, -1);
  u.dark.value = clamp(o.dark ?? 0); u.redK.value = clamp(o.red ?? 0); u.flashK.value = o.flash ?? 0;
  u.spin.value.set((o.spin ?? 0) * D2R, 0);
  if (blend === 'replace') e.pass(mat, e.rtScene); else e.passOver(mat, e.rtScene, blend);
}

// world-space lines and sprites over the globe (tracks, launch blooms, city nodes), drawn with the globe's camera
let OV = null;
export function earthOverlay() {
  if (OV) return OV;
  OV = { lines: new LineBatch(6000), sprites: new SpriteBatch(3000) };
  OV.lines.mesh.renderOrder = 1; OV.sprites.mesh.renderOrder = 2;
  scene3.add(OV.lines.mesh, OV.sprites.mesh);
  return OV;
}
export function renderOverlay(ctx, ec) {
  const e = ctx.engine, O = earthOverlay();
  const offU = [ec.off[0], -ec.off[1]];
  setCommon(O.lines.mat, e.S, offU); setCommon(O.sprites.mat, e.S, offU);
  O.lines.commit(); O.sprites.commit();
  const r = e.renderer;
  r.autoClear = false; r.setRenderTarget(e.rtScene); r.render(scene3, ec.cam); r.autoClear = true;
}

// a sun mostly behind the globe as the camera sees it: `a` deg off the anti-view direction, toward the camera's right
// (side = 1) or left (side = -1), tilted by `up` deg. The night side faces us with a thin crescent on that side.
export function sunBehind(ec, a = 30, side = 1, up = 0) {
  const p = nrm(ec.pos); const A = a * D2R, U = up * D2R;
  let s = add(p.map((x) => -x * Math.cos(A)), ec.right, side * Math.sin(A));
  s = add(s, ec.up, Math.sin(U));
  return nrm(s);
}
// a sun ahead of the camera below its horizon (dawn on the limb ahead), b deg below the local horizontal
export function sunAhead(ec, b = 28) {
  const upL = nrm(ec.pos);
  let h = add(ec.fwd, upL, -dot(ec.fwd, upL)); h = nrm(h);
  return nrm(add(h.map((x) => x * Math.cos(b * D2R)), upL, -Math.sin(b * D2R)));
}
