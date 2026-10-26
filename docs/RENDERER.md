# HOLD FIRE renderer — guide for scene authors

Every frame is a pure function of song time `t`: `window.renderAt(t)` (render/src/main.js). Headless Chromium + SwiftShader
(CPU WebGL2), three.js r186 + Canvas 2D. Read `docs/STYLE_BIBLE.md` (the look) and `docs/SHOTLIST.md` (the shots) first.

## Files
| file | what | who edits |
|---|---|---|
| `src/main.js` | boot, `renderAt(t)`: shot lookup → `scene.prepare` → `scene.draw` → type → post | director |
| `src/engine.js` | WebGL context, render targets, `shader()`, `pass()`, `passOver()`, `clear()`, `c2dBegin()`, `blit2d()`, compositor (`composite(post)`) | director |
| `src/type.js` | `TypeLayer`: `text`, `label`, `mono`, `decode`, `lyric`, `numeral`, `excerpt`, `subtitle`, `glyphs` | director |
| `src/palette.js` | `P` colour tokens (display sRGB 0..1), `css(c, a)`, `mix`, `scale` | director |
| `src/glyphs.js` | the Other's circular logograms; `drawGlyph`, `drawNumberGlyph`, `drawGlyphWord` | director |
| `src/util.js` | `clamp lerp smooth smoother ease* range pulse hash1 hash2 rng(seed) noise1` | anyone (additive only) |
| `src/audio.js` | `AudioMap`: `beat(t)`, `bar(t)`, `B(i)` bar start, `beatT(k)`, `snap(t)`, `kick/snare(t)`, `feat(name,t)`, `lines`, `findLine(section,k)`, `hits` | director |
| `src/scenes/*.js` | shared scenes: `sky` (`drawSky(ctx,p)`), `coldopen`, `engraved` (Keeper plates), `constellation` (Listener plates) | director |
| `src/scenes/<group>/` | **your scenes**; register them in `src/scenes/<group>/index.js` (`export const SCENES = {name: module}`) | that group's author |
| `src/timelines/test_<group>.js` | **your test timeline** (`export function buildTimeline(A)`), loaded with `?tl=test_<group>` | that group's author |
| `src/timeline.js` | the edit | director |
| `data/*.json` | `timing.json` (sections, beats, bars, lines/words), `milkyway.json`, `nearmisses.json`, `fibonacci.json`, `hud_captions.json` | read-only |

## A scene
```js
export default {
  async init(ctx) {},                       // optional, once at boot (build geometry, bake static textures)
  async prepare(ctx, shot, t, lt, p) {},    // optional, per frame, await any assets (so cache timing never changes pixels)
  draw(ctx, shot, t, lt, p) {},             // required: draw into ctx.engine.rtScene (HDR; values > 1 bloom)
  type(ty, t, lt, shot, ctx) {},            // optional: scene-owned typography (ty = TypeLayer, design px)
};
```
`ctx`: `{engine, audio, type, W, H, S (=H/1080), state, t, lt, shot, p}`. `lt = t - shot.t0`. `p` is the shot's params
(object, or `shot.p(t, lt, ctx)`).

A shot: `{id, t0, t1, scene, p, look, type, post}`. `look` is the post block for the compositor (`engine.composite`):
`bloom` (0.6), `bloomThreshold` (0.8), `halation` (0.3), `halCol`, `streak` (0), `streakThreshold` (1.6), `streakCol`, `exposure`,
`lift/gamma/gain` [r,g,b], `sat`, `shadowTint/highTint/split`, `grain` (0.035), `vignette` (0.35), `letterbox` (fraction), `ca`,
`zoom`, `spin`, `shakeX/Y`, `flash` (+`flashCol`), `invert` (+`invertInk/invertPaper`), `fade`, `typeGlow` (0.35), `tonemap` (1).

## Drawing
* **WebGL**: `const m = e.shader(glslBody, uniforms)` (GLSL3 fullscreen; `vUv` with y up; `GLSL_LIB` gives `hash12 hash22 vnoise fbm fbm3 rot luma aces`),
  `e.pass(m, e.rtScene)` overwrites; `e.passOver(m, e.rtScene, 'add'|'normal'|'screen')` blends. Your own three.js scenes:
  `e.renderer.autoClear = false; e.renderer.setRenderTarget(e.rtScene); e.renderer.render(scene, camera); e.renderer.autoClear = true;`
  Instanced quads with `side: THREE.DoubleSide` (the y-flip to design px reverses winding; culling hides them otherwise).
* **Canvas 2D**: `const c = e.c2dBegin()` (cleared, design-px transform), draw, then `e.blit2d('replace'|'over'|'add', gain)`.
  `gain` > 1 lifts canvas highlights (> 0.7) into HDR so they bloom. Use `ctx.globalCompositeOperation = 'lighter'` for glow.
* **Coordinates**: design px are 1920×1080, y down, in canvas and in your vertex math; convert to NDC with
  `x/960-1, 1-y/540`. Shader `vUv.y = 1` is the top. Images loaded as `THREE.Texture` have `flipY` on: sample with `vec2(x/1920, 1-y/1080)`.
* **Sky**: `import { drawSky } from '../sky.js'` then `drawSky(ctx, {pan:[x,y], zoom, rot, density, band, bandAng, bandOff, neb, nebCol, nebCol2, seed, exposure, fog})`.
  It bakes the static sky once per parameter set and samples it, so it's cheap; vary `pan/zoom/rot/exposure` freely, but keep the
  other keys constant within a shot.

## Rules
1. **Deterministic.** No `Math.random`, `Date`, `performance.now` in pixels. Use `rng(seed)` / `hash1/hash2` seeded per shot or scene.
   A frame must not depend on which frames were rendered before it (renders run out of order, in several browsers).
   Simulations (snowflake growth, fluid) are either closed-form in `t`, or precomputed once in `init` into a timeline you index by `t`.
2. **Fast.** Budget ≤ 0.4 s of GPU+CPU work per 1080p frame on SwiftShader (capture adds ≈ 0.8 s). No more than ~3 full-screen
   fbm evaluations per pixel; bake static layers once; instanced geometry for thousands of items; avoid 2D `shadowBlur` on many items
   (draw glow by layering, or let bloom do it). Measure with `node tools/profile.mjs T1,T2` (uses `TL` env too).
3. **The look** (STYLE_BIBLE): void ground `P.void`, light drawn in lines and points; **red only for fire** (weapons, targeting,
   alarms, burning); **gold is light**; ice/cyan for the Listener; luna/violet for the Other; archival = cream paper `P.cream`, ink
   halftone, one red. Lines ≥ 2 px and spacing ≥ 6 px at 1080p (they must survive X's compression). No raw footage, ever.
   Facts on screen must be true (see `docs/research/facts.md`); fictional data (the 610 worlds) is labelled as such where it reads as data.
4. **Type** goes through `ty` (TypeLayer). Faces: Cormorant (human/poems), Plex (AI, HUD), Archivo (count numerals/hero cards),
   Open Sans tracked caps (labels), Michroma (title), Bodoni (alt numerals). `ty.text(str, x, y, {font, size, weight, color, alpha, align, track, glow})`.
   For Cyrillic use `Plex`/`JetBrains`; for Chinese, tell the director which characters you need (the Noto SC file is a 6-glyph subset).
5. **Motion**: characters on twos are the plates' business; your camera, light and type run on ones. Ease, don't lerp linearly.
   Beat-sync with `ctx.audio.beat(t)` / `bar(t)` / `kick(t)` / word times from `ctx.audio.lines`.

## Testing your scenes
```bash
cd render
TL=test_space node tools/render.mjs --stills 190.5,195.2 --w 1280 --h 720 --outdir ../work/stills/space   # then Read the jpgs
TL=test_space node tools/lookdev.mjs 195.2 ../work/stills/space_lookdev.jpg '[{"label":"a","p":{...}},{"label":"b","p":{...}}]' 1280 720
TL=test_space node tools/profile.mjs 190.5,195.2
TL=test_space node tools/render.mjs --from 194 --to 196 --fps 24 --w 960 --h 540 --framedir ../work/frames/space_test --noenc 1
```
Look at your frames (Read tool) at full size and as sheets (`python3 tools/sheet.py OUT.jpg a.jpg b.jpg --cols=3`). Check motion
by viewing 6–8 consecutive frames side by side. Don't put long renders or frames inside the repo outside `work/`.
