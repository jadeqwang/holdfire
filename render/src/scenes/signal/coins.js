// Pre-chorus 2 "coin flips, all heads, a hundred in a row, / the only road from here to you.":
//  1. A hundred engraved gold coins flip and land HEADS, one after another, faster and faster, filling a 10 × 10 grid.
//     Heads is the ring of light around the pale dot (the film's last image); tails, glimpsed mid-flip, is the reticle.
//     The first 39 coins are stamped with the year of each sourced near-miss (render/data/nearmisses.json, in date order);
//     the other 61 carry no year: a hundred is the lyric's metaphor, the true number is unknown (facts.md §4).
//     Caption: P(100 HEADS) = 1 / 2^100 = 1 / 1,267,650,600,228,229,401,496,703,205,376.
//  2. The coins stand on their edges and roll into a single file that runs away into deep space; a road of light runs
//     down the line to one far star, the Other's world, 89 light-years off.
// p: {t0 (first landing; default the word "coin"), t1 (100th landing; default the word "row"),
//     r0 (roll start; default the word "the" of "the only road"), r1 (road reaches the star; default the word "you")}
import * as THREE from 'three';
import { P, css, mix } from '../../palette.js';
import { clamp, lerp, smooth, smoother, easeOutCubic, easeInOutCubic, easeOutExpo, range, hash1, hash2 } from '../../util.js';
import { drawSky } from '../sky.js';
import { lineByText, wordT, canvasTex, hotPoint, commas } from './lib.js';

const NC = 100, GRID = 10, SP = 2.32, RAD = 1.0, THK = 0.13;
const TWO100 = 2n ** 100n;
let three = null, years = null;

async function loadYears() {
  if (years) return years;
  const d = await (await fetch('data/nearmisses.json')).json();
  years = d.incidents.slice().sort((a, b) => a.date.localeCompare(b.date)).map((x) => x.date.slice(0, 4));
  return years;
}

// face atlas: 8 x 8 tiles of 256 px. tiles 0..38: heads with a year; 39: heads, no year; 40: tails (the reticle)
function atlas(yrs) {
  const T = 256, G = 8;
  const cv = document.createElement('canvas'); cv.width = cv.height = T * G;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  const tile = (k, fn) => { const x = (k % G) * T, y = Math.floor(k / G) * T; c.save(); c.translate(x + T / 2, y + T / 2); fn(T / 2); c.restore(); };
  const rim = (r) => {
    c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, r * 0.93, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3; c.beginPath();
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; c.moveTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); c.lineTo(Math.cos(a) * r * 0.89, Math.sin(a) * r * 0.89); }
    c.stroke();
  };
  const heads = (r, year) => {
    rim(r);
    c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.arc(0, year ? -r * 0.12 : 0, r * 0.42, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, year ? -r * 0.12 : 0, r * 0.075, 0, Math.PI * 2); c.fill();
    if (year) { c.font = `500 ${Math.round(r * 0.34)}px PlexM`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(year, 0, r * 0.6); }
  };
  yrs.forEach((y, i) => tile(i, (r) => heads(r, y)));
  tile(39, (r) => heads(r, null));
  tile(40, (r) => {
    rim(r);
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, r * 0.5, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 5; c.beginPath();
    for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(ux * r * 0.14, uy * r * 0.14); c.lineTo(ux * r * 0.72, uy * r * 0.72); }
    c.stroke();
  });
  const tex = canvasTex(cv, { mip: true }); tex.flipY = false; tex.needsUpdate = true;
  return tex;
}

function build(e, yrs) {
  if (three) return three;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 8000);
  const geo = new THREE.CylinderGeometry(RAD, RAD, THK, 72, 1, false);
  const tileA = new THREE.InstancedBufferAttribute(new Float32Array(NC), 1);
  const glowA = new THREE.InstancedBufferAttribute(new Float32Array(NC), 1); glowA.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('tile', tileA); geo.setAttribute('glow', glowA);
  for (let i = 0; i < NC; i++) tileA.array[i] = i < yrs.length ? i : 39;
  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { tAtlas: { value: atlas(yrs) }, lightDir: { value: new THREE.Vector3(-0.5, 0.75, 0.45).normalize() }, camPos: { value: new THREE.Vector3() },
      gold: { value: new THREE.Color(...P.gold) }, pale: { value: new THREE.Color(...P.goldPale) }, deep: { value: new THREE.Color(...P.goldDeep) }, emis: { value: 1 } },
    vertexShader: /* glsl */`
      in float tile; in float glow;
      out vec3 vN; out vec3 vP; out vec2 vUv; out float vTile; out float vGlow; out float vFace;
      void main(){
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.);
        vN = normalize(mat3(m) * normal); vP = wp.xyz; vUv = uv; vTile = tile; vGlow = glow;
        vFace = normal.y > .5 ? 1. : (normal.y < -.5 ? -1. : 0.);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D tAtlas; uniform vec3 lightDir; uniform vec3 camPos; uniform vec3 gold; uniform vec3 pale; uniform vec3 deep; uniform float emis;
      in vec3 vN; in vec3 vP; in vec2 vUv; in float vTile; in float vGlow; in float vFace;
      out vec4 fragColor;
      void main(){
        vec3 N = normalize(vN); vec3 V = normalize(camPos - vP); if (dot(N, V) < 0.) N = -N;
        vec3 L = normalize(lightDir);
        float diff = max(dot(N, L), 0.);
        vec3 H = normalize(L + V); float spec = pow(max(dot(N, H), 0.), 70.);
        float fres = pow(1. - max(dot(N, V), 0.), 4.);
        float lines;
        if (abs(vFace) > .5) {
          vec2 uv = vec2(vUv.y, vUv.x);             // cap uv -> tile orientation (year reads upright from the camera)
          if (vFace < 0.) uv.x = 1. - uv.x;
          float tl = vFace > 0. ? vTile : 40.;
          vec2 cell = vec2(mod(tl, 8.), floor(tl / 8.));
          lines = texture(tAtlas, (cell + clamp(uv, .004, .996)) / 8.).r;
        } else {
          lines = (.5 + .5 * sin(vUv.x * 6.2831853 * 110.)) * .35;   // reeded edge
        }
        vec3 col = deep * (.05 + .26 * diff) + gold * spec * 1.1 + pale * pow(spec, 3.) * 1.4 + gold * fres * .3;
        col += mix(gold, pale, .3 + .7 * vGlow) * lines * emis * (.95 + .9 * vGlow);
        fragColor = vec4(col, 1.);
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, NC); mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  // the road of light: a long additive strip on the ground plane, with a pulse that runs to the star
  const roadGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  const roadMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { gold: { value: new THREE.Color(...P.gold) }, pale: { value: new THREE.Color(...P.goldPale) }, reach: { value: 0 }, amp: { value: 0 }, len: { value: 4000 }, t: { value: 0 } },
    vertexShader: /* glsl */`out vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */`
      precision highp float; uniform vec3 gold; uniform vec3 pale; uniform float reach; uniform float amp; uniform float len; uniform float t;
      in vec2 vUv; out vec4 fragColor;
      void main(){
        float across = abs(vUv.x - .5) * 2.;           // 0 centre .. 1 edge
        float along = vUv.y;                            // 0 near .. 1 the star
        float core = exp(-across * across * 60.) * 1.3 + exp(-across * across * 6.) * .25;
        float lit = smoothstep(reach, reach - .02, along);
        float dist = exp(-along * 2.2) * .8 + .2;
        float head = exp(-pow((along - reach) / .012, 2.)) * 2.2 * step(along, reach + .05);
        vec3 c = mix(gold, pale, .4) * core * (lit * dist + head) * amp;
        fragColor = vec4(c, 1.);
      }`,
  });
  const road = new THREE.Mesh(roadGeo, roadMat); road.frustumCulled = false;
  scene.add(road);
  three = { scene, cam, mesh, mat, road, roadMat, dummy: new THREE.Object3D(), q0: new THREE.Quaternion(), q1: new THREE.Quaternion(), qa: new THREE.Quaternion(), v: new THREE.Vector3() };
  return three;
}

// grid slot of coin i, and its order in the single file (front rows first, centre out)
const slot = (i) => { const r = Math.floor(i / GRID), c = i % GRID; return [(c - (GRID - 1) / 2) * SP, (r - (GRID - 1) / 2) * SP]; };
let ORDER = null;
function order() {
  if (ORDER) return ORDER;
  const idx = [...Array(NC).keys()].sort((a, b) => { const A = slot(a), B = slot(b); return (B[1] - A[1]) || (Math.abs(A[0]) - Math.abs(B[0])) || (A[0] - B[0]); });
  ORDER = new Array(NC); idx.forEach((ci, j) => { ORDER[ci] = j; });
  return ORDER;
}

function times(ctx, shot, p) {
  const A = ctx.audio;
  const L1 = lineByText(A, 'coin flips'), L2 = lineByText(A, 'only road');
  const t0 = p.t0 ?? wordT(L1, 'coin', shot.t0) + 0.12;
  const t1 = p.t1 ?? wordT(L1, 'row', t0 + 1.9);
  const r0 = p.r0 ?? (L2 ? L2.t : t1 + 0.5);
  const r1 = p.r1 ?? wordT(L2, 'you', r0 + 3);
  return { t0, t1, r0, r1 };
}
// landing time of the k-th coin to land (they land in the grid's reading order): faster and faster
const landT = (T, k) => T.t0 + (T.t1 - T.t0) * Math.pow(k / (NC - 1), 0.52);

export const look = { bloom: 0.8, bloomThreshold: 0.8, halation: 0.25, vignette: 0.35, grain: 0.03, streak: 0.35, streakThreshold: 1.5, streakCol: [1.0, 0.82, 0.55] };

export default {
  async init(ctx) { const y = await loadYears(); build(ctx.engine, y); },
  async prepare(ctx) { await loadYears(); },
  draw(ctx, shot, t, lt, p) {
    const e = ctx.engine; const S = build(e, years); const T = times(ctx, shot, p); const ord = order();
    const roll = range(t, T.r0, T.r0 + 1.9);
    const camK = easeInOutCubic(range(t, T.r0 + 0.15, T.r0 + 1.75));
    // ---- camera: top-down over the grid (grid left of centre), then down to the road, looking along it to the star
    const camA = new THREE.Vector3(8.2, 62, 5.0), tgtA = new THREE.Vector3(8.2, 0, 0.9);
    const camB = new THREE.Vector3(5.2, 3.4, 17), tgtB = new THREE.Vector3(-0.4, 1.2, -60);
    const drift = smooth(range(t, shot.t0, T.r0));
    camA.y -= 2.5 * drift;
    const cp = camA.clone().lerp(camB, camK), tg = tgtA.clone().lerp(tgtB, camK);
    // arc the move so it doesn't dive through the coins
    cp.y += Math.sin(camK * Math.PI) * 6; cp.z += Math.sin(camK * Math.PI) * 8;
    S.cam.position.copy(cp);
    S.cam.up.copy(new THREE.Vector3(0, 0, -1).lerp(new THREE.Vector3(0, 1, 0), smooth(range(camK, 0.15, 0.85))).normalize());
    S.cam.lookAt(tg); S.cam.aspect = 16 / 9; S.cam.fov = lerp(30, 38, camK); S.cam.updateProjectionMatrix(); S.cam.updateMatrixWorld();
    S.mat.uniforms.camPos.value.copy(cp);

    // ---- sky (stars rise into view as the camera tilts toward the horizon)
    drawSky(ctx, { pan: [lerp(0, 120, camK), lerp(300, -60, camK)], zoom: lerp(1.3, 1.0, camK), density: 0.5, band: 0.35, bandAng: -0.3, bandOff: 60, neb: 0.35, nebCol: [0.03, 0.045, 0.09], nebCol2: [0.05, 0.035, 0.02], seed: 21, exposure: lerp(0.32, 0.95, camK) });

    // ---- the coins
    const d = S.dummy; const ga = S.mesh.geometry.attributes.glow;
    const fly = 0.42;
    for (let i = 0; i < NC; i++) {
      const [sx, sz] = slot(i);
      const tl = landT(T, i);
      const tau = t - tl;
      let x = sx, y = THK / 2, z = sz;
      let glow = 0;
      const qFlat = S.q0.identity();
      if (tau < -fly) { d.position.set(0, -1e4, 0); d.quaternion.identity(); d.updateMatrix(); S.mesh.setMatrixAt(i, d.matrix); ga.array[i] = 0; continue; }
      const ax = S.v.set(1, 0, (hash1(i * 3.7) - 0.5) * 0.5).normalize();
      if (tau < 0) {
        // in the air: dropping into its slot from above and behind, spinning end over end (heads, tails, heads...)
        const u = 1 + tau / fly;                      // 0 -> 1
        const spins = 3 + Math.floor(hash1(i * 1.9) * 2);
        const th = (1 - Math.pow(1 - u, 1.6)) * spins * Math.PI * 2;
        y = THK / 2 + 9 * (1 - u) * (1 - u) + 1.2 * Math.sin(u * Math.PI);
        z = sz + 5.5 * (1 - u) * (1 - u); x = sx + (hash1(i * 5.1) - 0.5) * 2 * (1 - u);
        d.quaternion.setFromAxisAngle(ax, th);
      } else {
        // landed: a small bounce and wobble, then still. The face flares when it lands.
        const b = Math.exp(-tau / 0.07);
        y = THK / 2 + 0.35 * Math.abs(Math.sin(tau * 26)) * b;
        d.quaternion.setFromAxisAngle(ax, 0.22 * Math.sin(tau * 34) * Math.exp(-tau / 0.09));
        glow = Math.exp(-tau / 0.22);
      }
      // phase 2: stand on edge and roll into the single file
      const j = ord[i];
      const s0 = T.r0 + 0.02 + j * 0.006, sUp = s0 + 0.16;
      if (t > s0) {
        const zt = 8 - j * 2.18;
        // path: a quadratic curve from the slot to its place in the file, arriving along -z
        const P0 = [sx, sz], P1 = [0, Math.max(zt + 6, Math.min(sz, zt + 30))], P2 = [0, zt];
        const L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) + Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
        const dur = clamp(0.45 + L / 130, 0.45, 2.2);
        const u = smoother(range(t, sUp, sUp + dur));
        const bz = (a, b2, c2, k) => (1 - k) * (1 - k) * a + 2 * (1 - k) * k * b2 + k * k * c2;
        const px = bz(P0[0], P1[0], P2[0], u), pz = bz(P0[1], P1[1], P2[1], u);
        const tx = 2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]), tz = 2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]);
        const tl2 = Math.hypot(tx, tz) || 1; const dx = tx / tl2, dz = tz / tl2;
        const up = smooth(range(t, s0, sUp));
        // axle: horizontal, perpendicular to the direction of travel
        const axle = new THREE.Vector3(-dz, 0, dx);   // heads (+y) turns toward the camera's side
        const qStand = S.q1.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axle);
        const dist = L * u;
        const qRoll = S.qa.setFromAxisAngle(axle, -dist / RAD);
        const qS = qRoll.multiply(qStand);
        d.quaternion.slerp(qS, up);
        x = px; z = pz;
        y = lerp(THK / 2, RAD, up);
        // the light passing along the road warms each coin
        glow = Math.max(glow, 0);
      }
      d.position.set(x, y, z); d.updateMatrix(); S.mesh.setMatrixAt(i, d.matrix); ga.array[i] = glow;
    }
    // road of light: appears once the file has formed, its head runs out to the star
    const reach = easeInOutCubic(range(t, T.r0 + 1.3, T.r1 - 0.15));
    const roadLen = 4000;
    S.road.scale.set(1.8, roadLen, 1); S.road.rotation.set(-Math.PI / 2, 0, 0); S.road.position.set(0, 0.02, 8.5 - roadLen / 2);
    // PlaneGeometry: uv.y = 1 at +y (far after rotation) -> the star end
    S.roadMat.uniforms.reach.value = reach; S.roadMat.uniforms.amp.value = smooth(range(t, T.r0 + 1.2, T.r0 + 1.6));
    // coins brighten as the road's head passes them
    if (reach > 0) for (let i = 0; i < NC; i++) { const j = ord[i]; const along = (j * 2.18) / roadLen; ga.array[i] = Math.max(ga.array[i], 0.55 * smooth(range(reach, along, along + 0.004)) * (1 - 0.6 * smooth(range(reach, along + 0.01, along + 0.05)))); }
    S.mesh.instanceMatrix.needsUpdate = true; ga.needsUpdate = true;
    S.mat.uniforms.emis.value = 1;
    e.renderer.autoClear = false; e.renderer.setRenderTarget(e.rtScene); e.renderer.clearDepth();
    e.renderer.render(S.scene, S.cam); e.renderer.autoClear = true;

    // ---- the far star (the Other's world), at the road's vanishing point; drawn in 2D at its projected position
    const star = new THREE.Vector3(0, 70, -roadLen * 1.05).project(S.cam);
    const sxp = (star.x * 0.5 + 0.5) * 1920, syp = (1 - (star.y * 0.5 + 0.5)) * 1080;
    const sa = smooth(range(camK, 0.55, 1.0));
    const c = e.c2dBegin();
    if (sa > 0 && star.z < 1) {
      const pulse = reach >= 0.995 ? Math.exp(-(t - (T.r1 - 0.15)) / 0.5) : 0;
      hotPoint(c, sxp, syp, sa * (0.55 + 0.6 * pulse), [0.75, 0.95, 0.85]);
    }
    e.blit2d('add', 1.6);
    ctx.state.coins = { T, camK, star: [sxp, syp], sa, reach };
  },

  type(ty, t, lt, shot, ctx) {
    const st = ctx.state.coins; if (!st) return; const T = st.T;
    // HEADS counter (top right)
    let n = 0; for (let k = 0; k < NC; k++) if (t >= landT(T, k)) n = k + 1;
    const fadeOut = 1 - smooth(range(st.camK, 0.05, 0.35));
    const a0 = smooth(range(t, shot.t0, shot.t0 + 0.3)) * fadeOut;
    ty.label('HEADS IN A ROW', 1250, 150, { size: 15, color: P.bookGold, alpha: a0 });
    ty.text(String(n).padStart(3, '0'), 1250, 290, { font: 'PlexM', size: 132, color: n >= NC ? P.goldPale : P.gold, alpha: a0, glow: n >= NC ? 20 : 8 });
    ty.label(n > 39 ? '39 OF THEM DATED · THE REST UNKNOWN' : 'EACH STAMPED WITH A NEAR-MISS YEAR', 1250, 330, { size: 12, color: P.bookGold, alpha: a0 * 0.85 });
    // the arithmetic, once the hundredth lands
    const ca = smooth(range(t, T.t1 + 0.02, T.t1 + 0.3)) * fadeOut;
    if (ca > 0) {
      ty.text('P(100 HEADS) = 1 / 2¹⁰⁰', 1250, 830, { font: 'Plex', size: 30, color: P.cream, alpha: ca });
      ty.text('= 1 / ' + commas(TWO100.toString()), 1250, 880, { font: 'Plex', size: 21, track: 0.0, color: P.goldPale, alpha: ca, glow: 6 });
      ty.label('A METAPHOR: CLOSE CALLS ARE NOT COIN TOSSES', 1250, 920, { size: 11, color: P.bookGold, alpha: ca * 0.7 });
    }
    // the far star's label
    if (st.sa > 0.01) {
      const [x, y] = st.star; const a = st.sa * smooth(range(st.reach, 0.6, 0.95));
      ty.label('89 LIGHT-YEARS', x + 22, y - 14, { size: 12, color: P.luna, alpha: a * 0.9 });
    }
  },
};
