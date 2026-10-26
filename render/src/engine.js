// HOLD FIRE rendering engine: three.js WebGL2 context, render targets, fullscreen passes, and the film compositor
// (bloom, film halation, anamorphic streaks, filmic tone map, split-tone grade, grain, letterbox, impact frames).
// Scenes draw into engine.rtScene (HDR, linear-ish values; >1 blooms). 2D scenes may draw into engine.c2d (a canvas) and
// blit it with engine.blit2d(). Typography draws into engine.typeCtx (straight alpha) and is composited over the graded image.
// Forked from rare-earth-techno-remix/render/src/engine.js.
import * as THREE from 'three';

export const GLSL_LIB = /* glsl */`
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return v; }
float fbm3(vec2 p){ float v=0., a=.5; for(int i=0;i<3;i++){ v+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return v; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float luma(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
`;

const FS_VERT = /* glsl */`
out vec2 vUv;
void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }
`;

const HALF = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };

export class Engine {
  constructor(canvas, W, H) {
    this.W = W; this.H = H;
    this.S = H / 1080; // design-pixel scale (author everything at 1920x1080)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // we author colours directly (display-referred)
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { ...HALF, depthBuffer: true });
    this.rtTmp = new THREE.WebGLRenderTarget(W, H, { ...HALF, depthBuffer: true });
    this.rtTmp2 = new THREE.WebGLRenderTarget(W, H, { ...HALF, depthBuffer: true });
    this.bloomRTs = [];
    let w = W, h = H;
    for (let i = 0; i < 6; i++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); this.bloomRTs.push(new THREE.WebGLRenderTarget(w, h, HALF)); }
    // anamorphic streak buffers: quarter width, eighth height
    this.streakA = new THREE.WebGLRenderTarget(Math.max(1, W >> 2), Math.max(1, H >> 3), HALF);
    this.streakB = new THREE.WebGLRenderTarget(Math.max(1, W >> 2), Math.max(1, H >> 3), HALF);
    this.quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
    this.quadMesh = new THREE.Mesh(this.quadGeo, null);
    this.quadMesh.frustumCulled = false;
    this.quadScene.add(this.quadMesh);

    this.typeCanvas = document.createElement('canvas');
    this.typeCanvas.width = W; this.typeCanvas.height = H;
    this.typeCtx = this.typeCanvas.getContext('2d');
    this.typeTex = this._canvasTex(this.typeCanvas);

    // generic 2D drawing surface for canvas-drawn scenes (blit into rtScene with blit2d)
    this.c2dCanvas = document.createElement('canvas');
    this.c2dCanvas.width = W; this.c2dCanvas.height = H;
    this.c2d = this.c2dCanvas.getContext('2d');
    this.c2dTex = this._canvasTex(this.c2dCanvas);

    this._mkPost();
  }

  _canvasTex(cv) {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = false; t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  }

  // Create a fullscreen shader material (glsl3)
  shader(fragBody, uniforms = {}) {
    return new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FS_VERT,
      fragmentShader: `precision highp float;\nin vec2 vUv;\nout vec4 fragColor;\n${GLSL_LIB}\n${fragBody}`,
      uniforms, depthTest: false, depthWrite: false,
    });
  }

  pass(material, target) {
    this.quadMesh.material = material;
    this.renderer.setRenderTarget(target || null);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  // draw over the existing contents of target (blended, no clear). blending: 'normal' | 'add' | 'screen'
  passOver(material, target, blending = 'normal') {
    material.transparent = true;
    if (blending === 'add') { material.blending = THREE.AdditiveBlending; }
    else if (blending === 'screen') { material.blending = THREE.CustomBlending; material.blendEquation = THREE.AddEquation; material.blendSrc = THREE.OneFactor; material.blendDst = THREE.OneMinusSrcColorFactor; }
    else material.blending = THREE.NormalBlending;
    this.renderer.autoClear = false;
    this.quadMesh.material = material;
    this.renderer.setRenderTarget(target || null);
    this.renderer.render(this.quadScene, this.quadCam);
    this.renderer.autoClear = true;
  }

  clear(target, r = 0, g = 0, b = 0) {
    this.renderer.setRenderTarget(target || this.rtScene);
    this.renderer.setClearColor(new THREE.Color(r, g, b), 1);
    this.renderer.clear(true, true, false);
  }

  // Upload the 2D canvas and draw it into rtScene. gain lifts canvas values (0..1) into HDR so they bloom;
  // mode 'replace' overwrites, 'over' alpha-blends, 'add' adds.
  blit2d(mode = 'replace', gain = 1, target = null) {
    this.c2dTex.needsUpdate = true;
    const u = this.matBlit.uniforms;
    u.tSrc.value = this.c2dTex; u.gain.value = gain;
    if (mode === 'replace') this.pass(this.matBlit, target || this.rtScene);
    else this.passOver(this.matBlit, target || this.rtScene, mode === 'add' ? 'add' : 'normal');
  }

  c2dBegin(clear = true) {
    const c = this.c2d;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
    if (clear) c.clearRect(0, 0, this.W, this.H);
    c.setTransform(this.S, 0, 0, this.S, 0, 0);
    return c;
  }

  _mkPost() {
    this.matBlit = this.shader(/* glsl */`
      uniform sampler2D tSrc; uniform float gain;
      void main(){ vec4 c = texture(tSrc, vUv); vec3 lin = c.rgb; // canvas is display-referred; a soft knee lifts the highlights into HDR
        lin = lin + max(lin - .7, 0.) * (gain - 1.) * 3.;
        fragColor = vec4(lin, c.a); }`, { tSrc: { value: null }, gain: { value: 1 } });

    this.matDown = this.shader(/* glsl */`
      uniform sampler2D tSrc; uniform sampler2D tType; uniform vec2 texel; uniform float threshold; uniform float first; uniform float typeGlow;
      void main(){
        vec4 s = texture(tSrc, vUv) * 4.;
        s += texture(tSrc, vUv + vec2(-texel.x, -texel.y));
        s += texture(tSrc, vUv + vec2( texel.x,  texel.y));
        s += texture(tSrc, vUv + vec2( texel.x, -texel.y));
        s += texture(tSrc, vUv + vec2(-texel.x,  texel.y));
        vec3 c = s.rgb / 8.;
        if (any(isnan(c)) || any(isinf(c))) c = vec3(0.);
        c = min(c, vec3(16.));
        if (first > .5) {
          float l = max(c.r, max(c.g, c.b)); c *= smoothstep(threshold, threshold + .4, l);
          if (typeGlow > 0.) { vec4 ty = texture(tType, vUv); c += ty.rgb * ty.a * typeGlow; }
        }
        fragColor = vec4(c, 1.);
      }`, { tSrc: { value: null }, tType: { value: this.typeTex }, texel: { value: new THREE.Vector2() }, threshold: { value: 0.8 }, first: { value: 0 }, typeGlow: { value: 0 } });
    this.matUp = this.shader(/* glsl */`
      uniform sampler2D tSrc; uniform sampler2D tBase; uniform vec2 texel;
      void main(){
        vec3 s = texture(tSrc, vUv + vec2(-texel.x*2., 0.)).rgb;
        s += texture(tSrc, vUv + vec2(-texel.x, texel.y)).rgb * 2.;
        s += texture(tSrc, vUv + vec2(0., texel.y*2.)).rgb;
        s += texture(tSrc, vUv + vec2(texel.x, texel.y)).rgb * 2.;
        s += texture(tSrc, vUv + vec2(texel.x*2., 0.)).rgb;
        s += texture(tSrc, vUv + vec2(texel.x, -texel.y)).rgb * 2.;
        s += texture(tSrc, vUv + vec2(0., -texel.y*2.)).rgb;
        s += texture(tSrc, vUv + vec2(-texel.x, -texel.y)).rgb * 2.;
        fragColor = vec4(s / 12. + texture(tBase, vUv).rgb, 1.);
      }`, { tSrc: { value: null }, tBase: { value: null }, texel: { value: new THREE.Vector2() } });

    // anamorphic streak: threshold into a squashed buffer, then wide horizontal blurs
    this.matStreakIn = this.shader(/* glsl */`
      uniform sampler2D tSrc; uniform float threshold;
      void main(){ vec3 c = texture(tSrc, vUv).rgb; if (any(isnan(c))) c = vec3(0.);
        float l = max(c.r, max(c.g, c.b)); c = min(c, vec3(12.)) * smoothstep(threshold, threshold + 1.2, l); fragColor = vec4(c, 1.); }`,
    { tSrc: { value: null }, threshold: { value: 1.6 } });
    this.matStreakBlur = this.shader(/* glsl */`
      uniform sampler2D tSrc; uniform vec2 dir;
      void main(){ vec3 s = vec3(0.); float wsum = 0.;
        for (int i = -8; i <= 8; i++) { float w = exp(-float(i*i) / 30.); s += texture(tSrc, vUv + dir * float(i)).rgb * w; wsum += w; }
        fragColor = vec4(s / wsum, 1.); }`, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });

    this.matFinal = this.shader(/* glsl */`
      uniform sampler2D tScene; uniform sampler2D tType; uniform sampler2D tBloom; uniform sampler2D tStreak;
      uniform vec2 res; uniform float time; uniform float S;
      uniform float exposure;   // multiplies scene before tone map
      uniform float bloom;      // bloom mix
      uniform float halation;   // warm film halation around highlights
      uniform vec3 halCol;
      uniform float streak;     // anamorphic streak mix
      uniform vec3 streakCol;
      uniform vec3 lift; uniform vec3 gammaV; uniform vec3 gain; uniform float sat;
      uniform vec3 shadowTint; uniform vec3 highTint; uniform float split;
      uniform float grain; uniform float grainSeed; uniform float grainSize;
      uniform float misreg; uniform float flash; uniform vec3 flashCol;
      uniform float invert; uniform vec3 invertInk; uniform vec3 invertPaper;
      uniform float vignette; uniform vec2 shake; uniform float ca; uniform float fade;
      uniform float zoom; uniform float spin; uniform float letterbox; uniform float typeOver;
      uniform float tonemap;
      void main(){
        vec2 asp = vec2(res.x / res.y, 1.);
        vec2 uv = (rot(spin) * ((vUv - .5) * asp) / asp) / zoom + .5 + shake * S / res;
        vec2 o = vec2(misreg * S) / res;
        vec2 c2 = vec2(ca * S) / res * (uv - .5) * 2.;
        vec3 col;
        col.r = texture(tScene, uv + o + c2).r;
        col.g = texture(tScene, uv).g;
        col.b = texture(tScene, uv - o*.6 - c2).b;
        if (any(isnan(col))) col = vec3(0.);
        vec3 bl = texture(tBloom, uv).rgb; if (any(isnan(bl))) bl = vec3(0.);
        col += bl * bloom;
        // film halation: the red layer scatters back through the base: a warm, wide glow hugging highlights
        col += bl * halCol * halation;
        if (streak > 0.) { vec3 st = texture(tStreak, uv).rgb; if (!any(isnan(st))) col += st * streakCol * streak; }
        col *= exposure;
        // tone map (filmic) then grade in display space
        vec3 tm = tonemap > .5 ? aces(col) : clamp(col, 0., 1.);
        tm = pow(max(tm * gain + lift * (1. - tm), 0.), 1. / gammaV);
        float l = luma(tm);
        tm = mix(vec3(l), tm, sat);
        tm *= mix(vec3(1.), mix(shadowTint, highTint, smoothstep(.05, .7, l)), split);
        // typography (straight alpha), over the graded image (typeOver = 1) — glow already went into the bloom
        vec4 ty = texture(tType, uv);
        tm = mix(tm, ty.rgb, ty.a * typeOver);
        // grain: luminance-dependent, re-drawn on twos (seeded by the caller), grainSize design-px cells
        vec2 gp = floor(vUv * res / (grainSize * S));
        float g = (hash12(gp + fract(grainSeed * .1371) * 1000.) + hash12(gp * 1.7 + 31.7 + grainSeed) - 1.);
        tm += g * grain * (.25 + .75 * (1. - abs(l * 2. - 1.)));
        // impact frame: hard two-tone
        if (invert > 0.) { float li = luma(tm); vec3 hard = mix(invertInk, invertPaper, step(.5, 1. - li)); tm = mix(tm, hard, invert); }
        tm = mix(tm, flashCol, clamp(flash, 0., 1.));
        vec2 vq = vUv - .5; tm *= 1. - vignette * dot(vq * vec2(1., .8), vq * vec2(1., .8)) * 2.2;
        // letterbox bars (fraction of the height covered at top and bottom)
        if (letterbox > 0.) { float b = letterbox * .5; if (vUv.y < b || vUv.y > 1. - b) tm = vec3(0.); }
        tm *= fade;
        fragColor = vec4(clamp(tm, 0., 1.), 1.);
      }`, {
      tScene: { value: null }, tType: { value: this.typeTex }, tBloom: { value: null }, tStreak: { value: null },
      res: { value: new THREE.Vector2(this.W, this.H) }, time: { value: 0 }, S: { value: this.S },
      exposure: { value: 1 }, bloom: { value: 0.6 }, halation: { value: 0.3 }, halCol: { value: new THREE.Color(1.0, 0.35, 0.12) },
      streak: { value: 0 }, streakCol: { value: new THREE.Color(0.55, 0.75, 1.0) },
      lift: { value: new THREE.Vector3(0, 0, 0) }, gammaV: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1 },
      shadowTint: { value: new THREE.Vector3(1, 1, 1) }, highTint: { value: new THREE.Vector3(1, 1, 1) }, split: { value: 0 },
      grain: { value: 0.035 }, grainSeed: { value: 0 }, grainSize: { value: 1.5 },
      misreg: { value: 0 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) },
      invert: { value: 0 }, invertInk: { value: new THREE.Color(0.02, 0.025, 0.05) }, invertPaper: { value: new THREE.Color(0.96, 0.93, 0.88) },
      vignette: { value: 0.35 }, shake: { value: new THREE.Vector2() }, ca: { value: 0 }, fade: { value: 1 },
      zoom: { value: 1 }, spin: { value: 0 }, letterbox: { value: 0 }, typeOver: { value: 1 }, tonemap: { value: 1 },
    });
  }

  bloomChain(src, threshold = 0.8, typeGlow = 0) {
    let prev = src;
    for (let i = 0; i < this.bloomRTs.length; i++) {
      const rt = this.bloomRTs[i];
      const u = this.matDown.uniforms;
      u.tSrc.value = prev.texture; u.texel.value.set(1 / prev.width, 1 / prev.height);
      u.threshold.value = threshold; u.first.value = i === 0 ? 1 : 0; u.typeGlow.value = typeGlow;
      if (i === 0) this.typeTex.needsUpdate = true;
      this.pass(this.matDown, rt);
      prev = rt;
    }
    for (let i = this.bloomRTs.length - 1; i > 0; i--) {
      const small = this.bloomRTs[i], big = this.bloomRTs[i - 1];
      if (!big.__acc) big.__acc = new THREE.WebGLRenderTarget(big.width, big.height, HALF);
      this.matUp.uniforms.tSrc.value = (small.__acc && i < this.bloomRTs.length - 1) ? small.__acc.texture : small.texture;
      this.matUp.uniforms.tBase.value = big.texture;
      this.matUp.uniforms.texel.value.set(0.5 / small.width, 0.5 / small.height);
      this.pass(this.matUp, big.__acc);
    }
    return this.bloomRTs[0].__acc.texture;
  }

  streakChain(src, threshold = 1.6) {
    this.matStreakIn.uniforms.tSrc.value = src.texture; this.matStreakIn.uniforms.threshold.value = threshold;
    this.pass(this.matStreakIn, this.streakA);
    const w = this.streakA.width;
    let a = this.streakA, b = this.streakB;
    for (const step of [1, 3, 9]) {
      this.matStreakBlur.uniforms.tSrc.value = a.texture; this.matStreakBlur.uniforms.dir.value.set(step / w, 0);
      this.pass(this.matStreakBlur, b); [a, b] = [b, a];
    }
    return a.texture;
  }

  // post: every key optional; see defaults in matFinal uniforms.
  composite(post, time) {
    const u = this.matFinal.uniforms;
    u.tScene.value = this.rtScene.texture;
    u.time.value = time;
    this.typeTex.needsUpdate = true;
    u.bloom.value = post.bloom ?? 0.6;
    u.halation.value = post.halation ?? 0.3;
    if (post.halCol) u.halCol.value.setRGB(...post.halCol);
    u.tBloom.value = this.bloomChain(this.rtScene, post.bloomThreshold ?? 0.8, post.typeGlow ?? 0.35);
    u.streak.value = post.streak ?? 0;
    if (u.streak.value > 0) u.tStreak.value = this.streakChain(this.rtScene, post.streakThreshold ?? 1.6);
    if (post.streakCol) u.streakCol.value.setRGB(...post.streakCol);
    u.exposure.value = post.exposure ?? 1;
    u.lift.value.set(...(post.lift || [0, 0, 0]));
    u.gammaV.value.set(...(post.gamma || [1, 1, 1]));
    u.gain.value.set(...(post.gain || [1, 1, 1]));
    u.sat.value = post.sat ?? 1;
    u.shadowTint.value.set(...(post.shadowTint || [1, 1, 1]));
    u.highTint.value.set(...(post.highTint || [1, 1, 1]));
    u.split.value = post.split ?? 0;
    u.grain.value = post.grain ?? 0.035;
    u.grainSeed.value = post.grainSeed ?? Math.floor(time * 12);
    u.grainSize.value = post.grainSize ?? 1.5;
    u.misreg.value = post.misreg || 0;
    u.flash.value = post.flash || 0;
    if (post.flashCol) u.flashCol.value.setRGB(...post.flashCol); else u.flashCol.value.setRGB(1, 1, 1);
    u.invert.value = post.invert || 0;
    if (post.invertInk) u.invertInk.value.setRGB(...post.invertInk);
    if (post.invertPaper) u.invertPaper.value.setRGB(...post.invertPaper);
    u.vignette.value = post.vignette ?? 0.35;
    u.shake.value.set(post.shakeX || 0, post.shakeY || 0);
    u.ca.value = post.ca || 0;
    u.fade.value = post.fade ?? 1;
    u.zoom.value = post.zoom ?? 1;
    u.spin.value = post.spin ?? 0;
    u.letterbox.value = post.letterbox ?? 0;
    u.typeOver.value = post.typeOver ?? 1;
    u.tonemap.value = post.tonemap ?? 1;
    this.pass(this.matFinal, null);
  }
}
