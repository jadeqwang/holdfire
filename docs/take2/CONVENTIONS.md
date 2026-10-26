# Take two: production conventions

The brief is [`docs/PLAN_TAKE_TWO.md`](../PLAN_TAKE_TWO.md). Its times, art styles and fact sheet are binding. `docs/take1/` is
history, not the brief. Renderer basics are in [`docs/RENDERER.md`](../RENDERER.md); generation lessons are in
[`docs/research/pipeline_lessons.md`](../research/pipeline_lessons.md) (read §1 before any Seedance call, §6 before anything else).

## Picture

- 1920×1080 design px, 24 fps, song time `t` in seconds (`analysis/timing.json` = `render/data/timing.json` is the master clock).
  Cut on `beats[]`, word `start`s and `hits`, never on a fixed BPM. Every cut lands within one frame of its onset.
- **What the viewer sees is the art.** Unlike take one, generated stills and video ARE shown (graded and composited), with
  JavaScript painted over them: blueprint linework, halftone and riso misregistration, brushed type, VHS rewind, speed lines,
  impact frames, data displays. Procedural scenes (pulsar, golden record, coins, phyllotaxis, the contact graph, war, chess,
  the near-miss list, the counter) stay pure JS.
- The two Jades are anime, flat cel shading, on twos (hold each drawing two frames: `f -= f % 2`), on model in every era.
  Jade (voice A) = DOT design (`refs/dot_character_sheet.jpg`, curtain bangs, not hime). Teal-tips Jade (voice B) =
  `design/take2/teal_tips_sheet.jpg` once it exists, same jacket. Only the world changes style.
- Keep faces and big type inside the centred 4:5 safe area (x 528–1392 at 1080p) so the vertical crop works.
- Text on screen: only sung words, numbers, dates, a few place names (plan § "Text on screen"). ≥ 0.6 s per word, ≈ 3 words/s max.
- Determinism: no `Math.random`/`Date`/`performance.now` in pixels; seeded `rng`/`hash`. A frame never depends on earlier frames.

## Files

| what | where | committed |
|---|---|---|
| take two edit | `render/src/timeline.js` (take one's edit is `render/src/timelines/take1.js`, `?tl=take1`) | yes |
| take two scenes | `render/src/scenes/t2/<group>/` (groups: `plate`, `cosmos`, `chess`, `data`, `history`), each with its own `index.js`; scene names start with `t2_` | yes |
| test timelines | `render/src/timelines/t2_<group>.js`, loaded with `TL=t2_<group>` | yes |
| sheets, style frames | `design/take2/*.jpg` (≤ 2 MB each) and their prompts in `design/take2/prompts/*.txt` | yes |
| keyframes (first frames for video) | `media/kf2/<shot>_<model>.jpg` | yes (≤ 1 MB each, JPEG q88) |
| generated video / raw images | `media/gen/` (relay output; also mirrored in KV for 21 days) | no |
| shot status, takes, picks | `docs/take2/shots.json` (one entry per shot), `docs/take2/takes.json` (every paid take), `render/data/picks2.json` (picked clip, in/out, lag) | yes |
| plate frames for the renderer | `work/plates/<clip>/f_00000.jpg…` + `meta.json {fps, n, w, h, src}` | no (regenerate with `tools/t2/plates.py`) |
| scratch renders | `work/` | no |

Never commit or push: the director does that. Never edit another group's directory; shared files (`engine.js`, `type.js`,
`main.js`, `palette.js`, `util.js`, `scenes/index.js`, `timeline.js`) are additive-only and only when your brief says so.

## Generation

- `export GEN_IMAGES_VIA_RELAY=1` before any call. At most 3 image calls in parallel (1 for edits). Every paid call is logged by
  `tools/gen/spend.py`; check `python3 tools/gen/spend.py` before a batch. Take two has about $650 of the $950 cap.
- Images: `google/nano-banana-pro` (≤ 3 refs, 2K 16:9 ≈ $0.13) and `openai/gpt-image-2.5-sunburst` (up to 16 refs, 3:2) for sheets
  and first frames; `bytedance/seedream-5-pro` / `krea/krea-3` for cheap alternates in bake-offs.
- Video: **sung shots** = `bytedance/seedance-2.5` 720p with the vocal-stem slice as `reference_audios` (lip sync), first-frame
  avatar mode or reference mode (pipeline_lessons §1). **Non-sung shots** = `google/veo-3.1` at 1080p without audio ($0.20/s) or
  Seedance 2.5; `minimax/h3-max` ($0.08/s at 768p) for cheap bake-off takes. Always `generate_audio: false`.
- No model-made lettering: every word, number and seal on screen is drawn by the renderer. Say "No text, no letters, no logos"
  in every prompt (but keep the sanctioned jacket marks: RARE EARTH on the back and the 1420 MHz patch).
- Historical people are not likenesses: Petrov, Arkhipov and the officers are painted as anonymous period figures.

## Plate toolkit

Code: `render/src/scenes/t2/plate/` (scenes in `index.js`); tools: `tools/t2/`; test timeline `TL=t2_plate` (shot i at [2i, 2i+2)).
Contact sheet of every style: `work/t2/plate/contact_styles.jpg` (regenerate with the stills in `render/src/timelines/t2_plate.js`).

**Getting a clip on screen**
```bash
python3 tools/t2/plates.py media/gen/X.mp4 NAME [--start S --dur D] [--fit cover|contain|keep] [--q 90] [--key green]
python3 tools/t2/plates.py design/take2/still.jpg NAME --fit keep          # a still (keep = no crop, for Ken Burns)
python3 tools/t2/picks.py -g GROUP set SHOT_ID NAME --in 1.2 --style riso --styleAmt 0.4   # then merges picks2.json
python3 tools/t2/picks.py -g GROUP set SHOT_ID NAME --s0 52.30 --lag 0.04  # a lip-synced take (audio ref started at song time s0)
```
- `plates.py` conforms to 24 fps CFR, Lanczos-covers 1920×1080 with a centre crop, writes `work/plates/NAME/f_00000.jpg…` +
  `meta.json {fps, n, w, h, src, start, dur, fit, kind, key}`; `--key green` also writes `m_00000.png` mattes and despills `f_`.
- Picks live in `docs/take2/picks_<group>.json` (never edit `render/data/picks2.json`: `tools/t2/merge_picks.py` builds it).
  `picks.py` writes the group file under an fcntl lock and runs the merge. Test plates are in `docs/take2/picks_test.json` (`TEST_*`).
- A pick entry is `{dir, kind, src, s0?, lag?, in?, rate?, twos?, zoom?, pan?, rot?, flipX?, fit?, style?, styleAmt?, grade?, key?,
  reverse?}`. **Pick fields are defaults; the shot's `p` overrides every key it sets.**
- Clip clock (source-clip seconds): with `s0`, `clipT = t − s0 + lag` (song clock; a shot's explicit `p.in` still wins); otherwise
  `clipT = (p.in ?? pick.in ?? plate start) + lt·rate` (`reverse` runs it backward; `p.at` = explicit source seconds or `fn(lt, t)`).
  Clamped to the plate's frames, never looped. Twos (default for video unless `twos: false`) count film frames: `f -= f % 2`.
- Textures load miss-driven in `prepare` (awaited, LRU 40), so cache state never changes pixels. Use `PLATE_LOOK`
  (`import { PLATE_LOOK } from '../scenes/t2/plate/index.js'`) as the look: tonemap off, light bloom (plates are display-referred).

**Scenes** (all params optional unless marked)
- `t2_plate` {**clip** (picks2 id) | dir, in, s0, lag, rate, twos, reverse, at, zoom, push (zoom growth per s), pan [x,y] px,
  rot (rad, + clockwise), flipX, fit, style, styleAmt, styleP {style params}, printSpace 'screen'|'image', key 'green', grade
  {exposure, contrast, sat, lift, gamma, gain, tint, red (alarm-red relight)}, alpha, bg, vhs (0..1) + vhsP, seed, over}
- `t2_still` {**img** (picks2 id | work/plates/NAME | path), zoom n | [from, to, …], pan [x,y] | [[x0,y0],[x1,y1]], rot n | [a,b],
  ease ('inOut'; linear smooth smoother out in expo sine), dur, delay, parallax {img, depth 1.5, zoom, pan, key, grade, alpha},
  + every t2_plate look param; paper and screens move with the print (printSpace 'image' by default)}
- `t2_split` {left/right {scene, p (obj | fn)}, x 960, line 2, lineCol, slice 'centre'|'half', offL/offR, dim [l, r]}: any scenes.
- `t2_vhs` (multi layer) {amt, rewind, speed, bleed, noise, head, seed}; also `p.vhs` on plates and the `vhs` style.
- `t2_vhs_rewind` {clips [ids], steps [song times], blackAt, speed 6, amt, rewind, style, grade}: scrubs each clip back from its end
  under the rewind pass; a clip with no plate yet shows black tape.
- `t2_impact` (multi layer) {lines 'radial'|'parallel', centre, count, amount, inner, aspect, lineW, lineCol, angle, speed, reach,
  impact (two-tone impact frame), neg, thresh, ink, paper, flash, flashCol, zoom, zoomBlur, ones}; helpers `smashZoom(t, tHit,
  {from, peak, to, attack, decay})`, `impactPulse(t, hits, frames)`. Lines are redrawn on twos.
- `t2_blueprint` (multi layer) {paths [{type 'poly'|'line'|'rect'|'circle'|'arc'|'dim'|'callout'|'ticks'|'cross', …shape, t0, t1, ease,
  w, col, dash, alpha}], subject (fin_bones fin foot hand egg_to_jar egg jar seed_section locomotive wright_flyer jet_airliner saturn_v)
  + t0 (song time), stages / stageT (default: the snares after t0), pos, scale, drawDur, full (drawing alone on cyanotype),
  grid {step, alpha, t0, t1}, col, glowCol, glow, w 2.5, zoom/pan/rot (follow the plate under it), abs (path times in song time)}.
  `drawBlueprint(ctx2d, paths, time, opts)` for your own canvas. Labels are for numbers and dates only.

**Styles** (`styles.js`: `applyStyle(engine, name, srcTexture, targetRT, {amt, seed, t, over, pat, …})`, `stylize(engine, name,
targetRT, o)` in place, `vhsPass`, `INKS`, `RISO_SETS`). `amt` 1 = full; 0.3–0.5 = a light touch for plates that are already painted.
- `riso`: 3 inks found by a LUT search of the real overprint (inks 'earth' = Klein #002FA7 / beacon orange / pale blue, 'echo' =
  violet / fluo pink / mint, 'mirror', or your own; `INKS.kleinRE` is the Rare Earth board's #1F2BD1), 7 px screens at 45/15/75°,
  seeded 1.5–3 px misregistration, ink mottle, paper. {cell, mis, levels, density, push, angles, paper}
- `halftone` (grey newsprint, 45°, ≥ 6 px) {cell, levels, sharp, ink, paper}; `newsprint` (black + poster red on cream) {cell, red,
  redGain, redAll, mis}.
- `ink` (rice paper, fibrous bleed, pooled wash edges, wash layers, fine contour, cinnabar kept) {bleed, layers, levels, line, keepRed}.
- `oil` (structure-tensor brush smear, dabs and bristles, impasto, canvas weave, umber shadows, varnish) {stroke, umber, warm, canvas,
  impasto}; `gouache` (Kuwahara flats, value bands, opaque edges, paper tooth) {radius, bands, edge, tooth, sat}.
- `blueprint` (cyanotype, or `tone: 'sepia'`, faint grid) {dark, light, levels, grid, gridStep}; `vhs` (as t2_vhs).
Cost: renderAt 17–76 ms per 1080p frame in `profile.mjs`; with a forced GPU sync, `oil` is the heaviest (≈ 2× a plain plate), the
screens ≈ 1.2–1.5×. Paper is baked once per seed. Every style is a pure function of (source, seed, t).
