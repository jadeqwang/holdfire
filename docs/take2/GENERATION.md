# Take two: generation workflow (keyframes → takes → picks)

Read [`CONVENTIONS.md`](CONVENTIONS.md) and [`../research/pipeline_lessons.md`](../research/pipeline_lessons.md) §1, §2, §6 first.
The shot list is `docs/take2/shots.json` (from the edit, `render/src/timeline.js`; regenerate with `node render/tools/shots_json.mjs`).
Every shot whose `method` is `video`, `seedance_sung` or `still` needs generated picture; `procedural` and `reuse` shots are JS
(but a procedural shot may still want a generated texture underneath; its `notes`/`want` say so).

## Canon

- **Jade (voice A)**: `refs/dot_character_sheet.jpg`, 16:9 crop `design/take2/dot_ref_16x9.jpg`. Long straight black hair,
  centre-parted curtain bangs (never a hime cut or a blunt fringe), pale-blue dot catchlight.
- **Teal-tips Jade (voice B)**: `design/take2/teal_tips_sheet.jpg`, 16:9 crop `design/take2/teal_ref_16x9.jpg`. Shoulder-length
  straight black hair with teal ends, teal dot catchlight, the same jacket and outfit.
- Both: cropped white jacket, orange band across the chest and upper arms, pale-blue dot on the left chest, round 1420 MHz patch on
  the left sleeve, RARE EARTH + pale-blue circle on the back, black high-neck crop top, navy cargo trousers with orange straps,
  chunky white sneakers, orange-foam 1977 headphones. Flat cel shading, crisp black lineart, on model in every era: only the world
  is painted in the era's style (the ink-wash grotto, the oil painting, the poster) and the Jade inside it stays cel-shaded anime.
- Sets: `design/take2/set_control_room_A.jpg` (Jade, warm), `set_control_room_B.jpg` (teal-tips, mirrored, cool),
  `room_A_jade.jpg`, `room_B_teal.jpg`, `set_dish_field_night.jpg`, `set_mirror_void.jpg`; era style frames `design/take2/style_*.jpg`;
  prompts in `design/take2/prompts/` (incl. `style_frames.md`).

## Steps per shot

1. **Keyframe** (the first frame, 16:9): `google/nano-banana-pro` (≤ 3 refs, `image_size` 2K) or `openai/gpt-image-2.5-sunburst`
   (more refs, 3:2 → crop). Refs: the character's 16:9 sheet crop + the set or style frame. Compose for the type the shot carries
   (`type` in shots.json; big type sits in the centre 4:5 area, subtitles in the lower third: keep faces out of those zones) and for
   the JS overlay the shot gets (blueprint lines, CRT tracks, brushed characters: leave the space). Look at it at full size. Reroll or
   edit until it is on model and on style. Save to `media/kf2/<SHOT>_<model>[_vN].jpg` (JPEG q88, ≤ 1 MB) and the prompt to
   `media/kf2/<SHOT>_<model>[_vN].txt`.
2. **Take**: `tools/gen/gen.py spec` → `submit` → `wait` (relay; 2 jobs start per cron minute, shared). Tag `t2_<SHOT>_<model>_tN`.
   - `seedance_sung`: `bytedance/seedance-2.5`, 720p, 16:9, fps 24, `generate_audio: false`, first-frame mode (`image` = keyframe,
     the `PIN` line; never name a shot size; `use_virtual_avatar: false` for anime), `reference_audios` = the vocal-stem slice from
     `tools/t2/aref.py <SHOT>` (records S0), duration = integer seconds covering `lipsync_window` + ≈ 1 s handle. Use the prompt
     structure of pipeline_lessons §1.2 (situation + subtext, one shift; the sync sentence; the face/eye/no-grin guards; "No text").
     Split-screen shots need two takes (one per Jade, each in her own room) unless one frame holds both.
   - `video` (no singing): `google/veo-3.1` (`image_input` = keyframe, `resolution` 1080p, `duration` 4/6/8, `generate_audio: false`),
     or `bytedance/seedance-2.5` / `seedance-2.0` when Veo drifts off model. Mouth closed unless the plan says otherwise. Describe the
     motion and the camera, the style lock ("a painted image comes to life and stays the same painting in every frame"), "No text".
   - `still`: the keyframe is the shot (the renderer moves the camera).
   - Durations: shots are often < 2 s; generate ≥ 4 s and pick the best window. One generation may serve several adjacent shots
     (e.g. Jade's walk across the era beats) — note that in the pick.
3. **Intake**: check w×h and the first frame matches; make a 10-frame strip (`ffmpeg ... tile`) and look at it; for sung takes run
   `tools/sync/t2sync.py TAKE S0 A B` and look at the word strip; choose the lag (multiple of 1/24 s). Reject: off-model faces or
   hair, extra people, invented text, a grin at the end, wrong aspect, frozen bodies. Budget 2 takes for sung shots, 1–2 for others;
   **bake-off** (a second model on the same keyframe) for hero shots whose first take is good but not great.
4. **Pick**: `python3 tools/t2/plates.py media/gen/<file>.mp4 <SHOT>` (frames to `work/plates/<SHOT>/`), then record the pick in
   `docs/take2/picks_<group>.json` → `{SHOT: {dir: 'work/plates/<SHOT>', kind, src, s0?, lag?, in?, rate?, twos?, zoom?, pan?, style?,
   styleAmt?, grade?, flipX?, key?}}` and run `python3 tools/t2/merge_picks.py`. Pick fields are the plate's defaults; the edit's own
   p overrides them. Lip-synced takes carry `s0` (+ `lag`): clip time = song time − s0 + lag. Others carry `in` (clip seconds at
   the shot's start).
5. **Log** every paid take in `docs/take2/takes_<group>.json`: `{SHOT: [{tag, model, job, kf, prompt_file, s0, dur, file, dims,
   verdict, lag, pick}]}`. Check `python3 tools/gen/spend.py` before each batch and stay inside your group's budget.
6. **Check in the edit**: `cd render && node tools/render.mjs --stills <t…> --w 960 --h 540 --outdir ../work/t2/<group>` at a few
   times per shot and look at them with the type and the overlays on. If a shot needs a different framing to work with its type, fix
   the keyframe, not the type.

## Concurrency

At most **one** image call in flight per generation agent (four agents share the relay), one at a time for edits. Video jobs can be
queued in batches. Never edit `render/src/timeline.js`, another group's picks/takes files, or scene code; write requests for the
director (type collisions, a shot that should change scene or timing) into your report.
