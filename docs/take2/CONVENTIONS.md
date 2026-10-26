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
