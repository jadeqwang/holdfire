// GPU primitives for the space scenes (three.js r186, GLSL3, additive, no depth test):
//   StarCloud   — tens of thousands of fixed world-space points (one draw call, gl_PointSize)
//   SpriteBatch — instanced world-space sprites: crisp core + halo, optional ring, optional engraved seed outline
//   LineBatch   — instanced world-space segments drawn at a constant width in design px (>= 2 px), partial draw-on,
//                 alpha gradient along the segment
// All project with the camera, then work in design px (1920x1080, y up inside the shader), so widths survive any render
// size. `off` shifts the whole picture in design px (frames the subject off-centre without skewing the perspective).
import * as THREE from 'three';

const COMMON = /* glsl */`
uniform vec2 off; uniform float S;
vec2 toPx(vec4 c){ return (c.xy / c.w * .5 + .5) * vec2(1920., 1080.) + off; }
vec4 fromPx(vec2 p, vec4 c){ return vec4((p / vec2(960., 540.) - 1.) * c.w, c.z, c.w); }
`;

export class StarCloud {
  constructor(stars, nStars) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(nStars * 3), col = new Float32Array(nStars * 3), sb = new Float32Array(nStars * 2);
    for (let i = 0; i < nStars; i++) {
      const o = i * 8;
      pos[i * 3] = stars[o]; pos[i * 3 + 1] = stars[o + 1]; pos[i * 3 + 2] = stars[o + 2];
      sb[i * 2] = stars[o + 3]; sb[i * 2 + 1] = stars[o + 7];
      col[i * 3] = stars[o + 4]; col[i * 3 + 1] = stars[o + 5]; col[i * 3 + 2] = stars[o + 6];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSB', new THREE.BufferAttribute(sb, 2));
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { off: { value: new THREE.Vector2() }, S: { value: 1 }, gain: { value: 1 }, sizeK: { value: 1 }, refDist: { value: 40 }, hot: { value: 1 } },
      vertexShader: COMMON + /* glsl */`
        in vec3 aCol; in vec2 aSB; uniform float gain; uniform float sizeK; uniform float refDist; uniform float hot;
        out vec3 vC; out float vR;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          vec4 c = projectionMatrix * mv;
          float d = max(-mv.z, .01);
          // design-px radius of the core: brighter stars are a touch larger; nearer stars grow (clamped)
          float r = clamp(aSB.x * sizeK * (.62 + .3 * sqrt(aSB.y)) * pow(refDist / d, .5), .6, 4.);
          vR = r;
          gl_PointSize = (r * 3.2 + 1.) * S;
          // brightest few go HDR (bloom/streak pick them up); the rest stay < 1
          float b = aSB.y < 1.2 ? aSB.y * .6 : .72 + (aSB.y - 1.2) * .5 * hot;
          vC = aCol * b * gain;
          vec2 p = toPx(c); gl_Position = fromPx(p, c);
          if (gain <= 0.) gl_Position = vec4(2., 2., 2., 1.);
        }`,
      fragmentShader: /* glsl */`
        precision highp float; in vec3 vC; in float vR; out vec4 fragColor;
        void main(){ vec2 d = (gl_PointCoord - .5) * (vR * 3.2 + 1.); float q = dot(d, d) / (vR * vR);
          float a = exp(-q * 1.6) + exp(-q * .25) * .05; fragColor = vec4(vC * a, 1.); }`,
    });
    this.mesh = new THREE.Points(g, this.mat);
    this.mesh.frustumCulled = false;
  }
}

export class SpriteBatch {
  constructor(max) {
    this.max = max; this.n = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // xyz, core radius px
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // rgb, intensity
    this.aFx = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);    // halo, ring radius px, seed (0..1), seed angle
    for (const a of [this.aPos, this.aCol, this.aFx]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPos', this.aPos); g.setAttribute('aCol', this.aCol); g.setAttribute('aFx', this.aFx);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { off: { value: new THREE.Vector2() }, S: { value: 1 } },
      vertexShader: COMMON + /* glsl */`
        in vec4 aPos; in vec4 aCol; in vec4 aFx; out vec2 vQ; out vec4 vC; out vec4 vFx; out float vR; out float vExt;
        void main(){
          vec4 c = projectionMatrix * modelViewMatrix * vec4(aPos.xyz, 1.);
          float r = aPos.w;
          float ext = max(max(r * 6., aFx.x * 1.), max(aFx.y + 4., aFx.z > 0. ? 13. : 0.)) + 2.;
          vec2 p = toPx(c) + position.xy * ext;
          vQ = position.xy * ext; vC = aCol; vFx = aFx; vR = r; vExt = ext;
          gl_Position = fromPx(p, c);
          if (aCol.w <= 0. || c.w <= 0.) gl_Position = vec4(2., 2., 2., 1.);
        }`,
      fragmentShader: /* glsl */`
        precision highp float; in vec2 vQ; in vec4 vC; in vec4 vFx; in float vR; in float vExt; uniform float S; out vec4 fragColor;
        void main(){
          float d = length(vQ);
          float core = exp(-d * d / (vR * vR) * 1.4);
          float halo = vFx.x > 0. ? exp(-d / (vFx.x * .35)) * .18 : 0.;
          float ring = 0.;
          if (vFx.y > 0.) { float w = 1.1; ring = 1. - smoothstep(w - .6 / S, w + .6 / S, abs(d - vFx.y)); ring *= .9; }
          float seed = 0.;
          if (vFx.z > 0.) {
            // an engraved seed: almond outline (two arcs) with a centre spine, pointing along vFx.w
            float ca = cos(vFx.w), sa = sin(vFx.w);
            vec2 q = vec2(ca * vQ.x + sa * vQ.y, -sa * vQ.x + ca * vQ.y);
            float L = 10.5, Wd = L * .42;
            vec2 u = vec2(q.x / L, q.y / Wd);
            float e = length(vec2(u.x, u.y / (1. - .35 * u.x)));    // teardrop: fuller toward +x
            float px = 1. / L;
            float edge = 1. - smoothstep(.05, .05 + 2.2 * px, abs(e - 1.) * .9);
            float spine = (1. - smoothstep(.9 / S, 1.6 / S, abs(q.y))) * step(abs(q.x), L * .62) * .55;
            seed = (edge + spine) * vFx.z;
          }
          vec3 col = vC.rgb * vC.w * (core * 1.6 + halo + ring + seed * .55);
          fragColor = vec4(col, 1.);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false;
  }
  reset() { this.n = 0; }
  // r: core radius (design px); I: intensity (1 = full, > 1 blooms)
  add(x, y, z, r, cr, cg, cb, I, halo = 0, ring = 0, seed = 0, ang = 0) {
    if (this.n >= this.max || I <= 0.0005) return;
    const k = this.n * 4;
    const P = this.aPos.array, C = this.aCol.array, F = this.aFx.array;
    P[k] = x; P[k + 1] = y; P[k + 2] = z; P[k + 3] = r;
    C[k] = cr; C[k + 1] = cg; C[k + 2] = cb; C[k + 3] = I;
    F[k] = halo; F[k + 1] = ring; F[k + 2] = seed; F[k + 3] = ang;
    this.n++;
  }
  commit() {
    this.geo.instanceCount = this.n;
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aFx.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }
}

export class LineBatch {
  constructor(max) {
    this.max = max; this.n = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aA = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // a.xyz, width px
    this.aB = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // b.xyz, draw fraction (0..1)
    this.aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // rgb, intensity
    this.aG = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);   // alpha at a, alpha at b
    for (const a of [this.aA, this.aB, this.aC, this.aG]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aA', this.aA); g.setAttribute('aB', this.aB); g.setAttribute('aC', this.aC); g.setAttribute('aG', this.aG);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { off: { value: new THREE.Vector2() }, S: { value: 1 }, glow: { value: 0.22 } },
      vertexShader: COMMON + /* glsl */`
        in vec4 aA; in vec4 aB; in vec4 aC; in vec2 aG;
        out vec2 vP; out vec4 vSeg; out vec4 vC; out vec2 vG; out float vW;
        void main(){
          mat4 M = projectionMatrix * modelViewMatrix;
          vec4 ca = M * vec4(aA.xyz, 1.), cb = M * vec4(aB.xyz, 1.);
          vec2 a = toPx(ca), b0 = toPx(cb);
          vec2 b = mix(a, b0, aB.w);
          vec2 d = b - a; float L = max(length(d), 1e-3); vec2 t = d / L; vec2 n = vec2(-t.y, t.x);
          float hw = aA.w * .5 + 3.5;   // room for the soft glow skirt
          vec2 p = mix(a, b, position.x) + t * (position.x * 2. - 1.) * hw + n * position.y * hw;
          vP = p; vSeg = vec4(a, b); vC = aC; vW = aA.w;
          vG = vec2(aG.x, mix(aG.x, aG.y, aB.w));
          gl_Position = vec4((p / vec2(960., 540.) - 1.), 0., 1.);
          if (aC.w <= 0. || aB.w <= 0. || ca.w <= 0. || cb.w <= 0.) gl_Position = vec4(2., 2., 2., 1.);
        }`,
      fragmentShader: /* glsl */`
        precision highp float; in vec2 vP; in vec4 vSeg; in vec4 vC; in vec2 vG; in float vW; uniform float S; uniform float glow; out vec4 fragColor;
        void main(){
          vec2 pa = vP - vSeg.xy, ba = vSeg.zw - vSeg.xy;
          float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0., 1.);
          float d = length(pa - ba * h);
          float cov = 1. - smoothstep(vW * .5 - .55 / S, vW * .5 + .55 / S, d);
          float skirt = exp(-d * d / (vW * vW * 1.8 + 2.)) * glow;
          float al = mix(vG.x, vG.y, h);
          fragColor = vec4(vC.rgb * vC.w * al * (cov + skirt), 1.);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false;
  }
  reset() { this.n = 0; }
  // world endpoints, width (design px), colour, intensity, draw fraction, alpha at a / at b
  add(ax, ay, az, bx, by, bz, w, cr, cg, cb, I, frac = 1, ga = 1, gb = 1) {
    if (this.n >= this.max || I <= 0.0005 || frac <= 0) return;
    const k = this.n * 4, A = this.aA.array, B = this.aB.array, C = this.aC.array, G = this.aG.array;
    A[k] = ax; A[k + 1] = ay; A[k + 2] = az; A[k + 3] = w;
    B[k] = bx; B[k + 1] = by; B[k + 2] = bz; B[k + 3] = Math.min(1, frac);
    C[k] = cr; C[k + 1] = cg; C[k + 2] = cb; C[k + 3] = I;
    G[this.n * 2] = ga; G[this.n * 2 + 1] = gb;
    this.n++;
  }
  commit() {
    this.geo.instanceCount = this.n;
    this.aA.needsUpdate = true; this.aB.needsUpdate = true; this.aC.needsUpdate = true; this.aG.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }
}

// set shared uniforms on any of the above
export function setCommon(mat, S, off = [0, 0]) {
  mat.uniforms.S.value = S;
  mat.uniforms.off.value.set(off[0], off[1]);
}
