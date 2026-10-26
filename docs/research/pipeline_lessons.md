# Pipeline lessons for "Hold Fire" (production brief)

Compiled 2026-10-26 from read-only clones in `/home/user/jadeqwang/` (MM = merge-me-back-to-main, RW2 = rewind-take-two,
OS = orbital-sunrise-video, RE = rare-earth-techno-remix, MGP = moongazing-public-version) plus MM's
`docs/prior_pipeline_brief.md`, which digests vibesong (VS), Moongazing (MG) and Rewind take one (RW1). Paths in older docs
that start with `/home/jade/...` describe Jade's GPU box and do not exist here. Rows marked **(measured here)** were run in this
container today; everything else is quoted from the project docs.

## 0. This container (measured here)

| thing | value |
|---|---|
| CPU / RAM / GPU | 4 × Xeon @ 2.1 GHz, 15 GB, no GPU |
| **Disk** | **11 GB free on `/`**. A 1080p JPEG q94 halftone frame is 1.35 MB, so the whole film (247.2 s = 5,933 frames) would be ≈ 8 GB. Roto guides are ≈ 0.5 MB per 720p frame. Plan for this (§6 #20). |
| Chromium | `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` (global `playwright`; `chromium.launch()` finds it). RE/OS/MGP hard-code `chromium-1194/chrome-linux/chrome`, which does not exist here |
| Python | 3.13 system (numpy, cv2 5.0, librosa 1.0, av, jsonschema, fontTools). **mediapipe works in a 3.12 venv**: `python3.12 -m venv V && V/bin/pip install "mediapipe==0.10.21" "numpy<2" opencv-python-headless pillow` (≈ 1 min, 1.1 GB; a copy is at `<scratchpad>/mp312`). The legacy `mp.solutions.face_mesh` API that the MM/RE tools use works there |
| ffmpeg | 6.1.1 with **drawtext**, libass, xstack, libx264/x265/svtav1, plus a real ffprobe (the box's static build had none of these) |
| Hosts | reachable: PyPI, npm, github.com releases (UVR `Kim_Vocal_2.onnx`, rembg `isnet-general-use.onnx`), raw.githubusercontent.com (`lbpcascade_animeface.xml`), storage.googleapis.com (`face_landmarker.task`). **Blocked (403)**: huggingface.co and download.pytorch.org (so no Depth-Anything, BiRefNet, faster-whisper or demucs weights), and `*.workers.dev` |
| Gen env | `GEN_KV_NS`, `CLOUDFLARE_ACCOUNT_ID` and `CF_AUTH_VIA_PROXY` are set (`cfauth.py` copies the account id into `CF_ACCOUNT_ID`). `GEN_IMAGES_VIA_RELAY` is unset: **export it as 1**, because direct `/ai/run` calls die at ≈ 30 s in a cloud container. Spend cap `HOLDFIRE_CAP` (default $950; `tools/gen/spend.py`). Job prefix `holdfire/` |

## 1. Seedance 2.5 (`bytedance/seedance-2.5`)

### 1.1 Two modes that worked
| | **Reference mode** (RE) | **First-frame avatar mode** (OS, RW2, MM, VS) |
|---|---|---|
| inputs | `reference_images` = the character sheet cropped to 16:9, plus at most one environment ref (RE `seedance_shots.py`: `refs=[DOT, TOWER]`). No `image` | `image` = an approved still, chest-up and centred, as a JPEG of 2048 px or less (`gen.py ref-image SRC OUT --max=2048`) |
| `use_virtual_avatar` | `false` (anime character) | **`true`**. It beat `false` in every A/B (OS "take b", VS). It routes the faces through ByteDance's avatar library, so they pass the face and deepfake check |
| framing words | allowed: "Close-up", "Medium shot", "Full-body" | **never name a shot size**. Pin the frame: `"Animate the first frame exactly: same framing, composition, lighting, setting and character. "` (MM `tools/sd/batch.py` `PIN`). VS card 03: "Close-up of…" recomposed all 6 takes ($3 wasted) |
| best for | stylized or anime characters whose look is redrawn anyway; green-screen performance plates | likeness-critical faces and exact set continuity |

Common settings: `generate_audio: false` (**always**: with the song as a reference, generated audio trips the copyright filter);
720p, 16:9, fps 24. `camera_fixed` is accepted but ignored, so say the camera move in the prompt. `seed` doesn't reproduce.
480p synced better in VS. RE, RW2 and MM were fine at 720p, so use 720p.
**Duration**: an integer from 4 to 30. Cover the used window plus about 1 s of handle (RE 4–6 s; MM 5–13 s; a take of s seconds has 24·s + 1 frames).
Reference images must have an aspect between 0.39 and 2.5. Wider ones are rejected, so crop sheets (RE cropped its 1536×1024 sheet to 16:9).
`nano-banana-pro` takes at most 3 refs, GPT Image 2.5 up to 16. Seedance takes up to 30 `reference_images`, but RE never used more than 2.
`reference_videos` (to keep a take's motion) **fails with 7003 on data URIs**. It needs a public URL (OS hosted on raw.githubusercontent) and costs about 4×.
The job body must be 24 MiB or less.

**Audio reference**: cut the **vocal stem** (RE `voc`, MM `VOC2`, RW2 BS-Roformer) to the window, starting about 0.3 s before the first word in a gap
(`gen.py audio-ref SRC START DUR OUT.mp3`; mp3 adds about 25 ms of LAME delay). Mute chops or other words that fall inside the pre-roll
(RW2 E3 muted 119.14–119.38). For dance or action, pass the **instrumental** or the mix and name the hit in seconds ("On the big hit of the reference
audio, the drop, about 1.7 seconds in…", MM `dr_dl_wide`). RE `sd17` used `inst` for the K-pop break.

### 1.2 Prompt structure (60–120 words of action, plus fixed guards; ≤ 2000 characters, asserted in RW2 `takes.py`)
1. `PIN` (first-frame mode) or a framing line (reference mode).
2. **Situation + objective + one line of subtext, at most one shift (usually in the eyes)**. Singing *to* someone reads best. **Never key gestures to
   lyric words** ("charades", VS v4.8). Jade picks takes by eye, not by gesture energy.
3. Sync: one sentence, `"She sings the words of the reference audio with precise lip sync, shaping each word clearly and holding the long sustained notes
   with her mouth open."` RW2 added labial cues ("lips closing on the 'b' of 'before' and the 'm' of 'my'").
   Silent shots: `"Her mouth stays gently closed; she does not sing or speak."`
4. Guards: MM `EYES` + `GUARD` (keep the eye size, "natural lips, no gloss, no makeup", "Do not redraw, beautify, slim or restyle her face",
   "Her hands stay relaxed and natural", "One continuous shot, no cuts. No captions, no text.").
   Groups: `"Exactly six copies… stay in frame for the whole shot; nobody leaves, merges, splits or disappears."`
5. Style lock: RE `STYLE` (anime) / `ENV_STYLE` (environments; **don't append the character style to environment plates**, RE pass 3),
   RW2 `"A drawing comes to life and stays the same drawing in every frame…"`. Avoid "cinematic / epic / anamorphic" (MG).

### 1.3 Failure modes and fixes
| failure | where seen | fix |
|---|---|---|
| Invented lettering ("PACE EARTH", "D20 IHz", gibberish 1420 patch, stray trouser text) | RE sd04/sd05/sd13, MM orch_keys t52 | "No text, no subtitles, no logos" in every prompt. Repair the plate before guide extraction (RE `pipeline/plate_fixes/fix_lettering.py` + `ringtrack.py`: ellipse-tracked patch, inpaint, set Archivo through the ellipse), or draw lettering in the renderer. A blanket "No text" in an **image** prompt erased the sanctioned patch (MM `gen_plates.py` tail exempts it) |
| Idles before or after the phrase | RE (all), VS | Score sync **only over the window the edit uses** (RE `score.py`/`lag_curve.py` window args; MM intake `--win=s0+.2,s0+dur-.1`) |
| Pure profile instead of ¾ | RE sd02 v3 | "three-quarter front view with her face clearly visible to the camera" |
| Angry extreme close-up | RE sd11 | reframe to MCU; "pleading and warm rather than angry" |
| Grin or teeth at the end; too smiley | MM ch2_gone_close t52/t53, out_main t12 | "She does not smile broadly, grin or show her teeth"; end on a slow eye close. Interim fix: cut before the grin |
| Eyes grow ("huge, alien eyes") | MM v4 | the guard said "large very dark brown eyes"; v5 `EYES` says "keep the exact eye size… do not enlarge, round or widen" |
| Wrong outfit details: patch on the wrong arm, extra back band, orange cuffs, a lane colour repainted orange, a second chest dot | MM, RE sheets | describe the canon in the prompt; edit the still, not the take (`tools/plates/fix_patch.py`). Pin every lane colour in edits ("the jacket bands … stay ROSE"). Paste the still's chest back (VS `pb_dotfix.py`); never a rigid disc |
| Extra people appear (8–10 fighters instead of 6) | MM dr_dl_wide t51/t52/t55 | state the count and the roles of the background figures; 2–5 takes |
| Ignores the first frame (other sky, missing props) | MM orch_guitar t52, dr_dl_wide t57/t59 | first-frame check at intake; reroll |
| Returns portrait / 4:3 / 21:9 at random (480×854, 560×752, 1112×834, 1470×630) | VS, RW2 V3S (3 of 4) | check dimensions at intake; budget 2 takes; busy backgrounds raise the risk; fallback = a paper-card frame (VS `card.py`) |
| Face redrawn smaller or averaged; forehead lowered; doll-like at the end of push-ins | OS, RW1, VS | arms down in the still and let the video move them (OS); spell out the forehead and hairline; "Static locked-off camera… never a face close-up"; check head scale with FaceMesh (`face_h_ratio` in `.sync.json`) |
| Copyright filter | all | `generate_audio: false` |
| `PrivacyInformation` (probabilistic) | VS | reshuffle refs, drop face close-ups |
| `2047: Invalid User Credentials` | MM cloud | intermittent on every model; errored = refunded; resubmit |
| Stale cron minute / stuck jobs | MM cloud | the relay runs only its own minute's keys. `gen.py status` shows `stale` after > 10 min → `gen.py requeue ID`. A job `running` > 30 min hit the wall limit: count it and resubmit. Provider deaths after about 3 h (VS) |
| Image calls 502 at 30 s | MM cloud: 3 of 44 returned | `GEN_IMAGES_VIA_RELAY=1` (`gen.run_image`, 2–7 min per image). At most 3 image calls in parallel, 1 for edits (6 parallel gave 6001/HTTP 500) |
| KV 401 | MM cloud | the token needs "Workers KV Storage: Edit". Probe first: `python3 -c "import sys; sys.path.insert(0,'tools/gen'); import gen; print(gen.kv_get('res:holdfire/__probe__', tries=1))"` → `None` |

### 1.4 Cost and turnaround
- Seedance 2.5 list prices: **720p $0.2312/s** (5 s $1.16, 6 s $1.39, 8 s $1.85, 13 s $3.01); 480p $0.1028/s; any video ref $0.9676/s at 720p.
  Seedance 2.0 (no audio ref; first and last frame lock; RW2's non-sung workhorse) costs $0.15/s at 720p.
- Images: nano-banana-pro ≈ $0.134 (2K, 2752×1536), $0.24 at 4K; GPT Image 2.5 sunburst high 1536×1024 ≈ $0.19–0.24 with refs (3:2 only: crop or pad).
- Projects: RE $147 (Seedance $142: 103 runs / 478 s through the v3 reshoot, 128 takes in its manifest); MM $388.47 (Seedance $304 for 181 takes,
  images $87 for 433 calls); RW2 singing $17.10 for 10 takes; VS $153.
- **Turnaround** (MM ledger, 210 relay jobs): median **8.9 min** from submit to file, p90 15.6, max 30.8 min. The relay starts 2 jobs per cron minute
  (`GEN_PER_MINUTE`), shared with other projects. A 40-take batch therefore takes ≈ 20 min to start and ≈ 40–60 min to finish. A 5 s 480p smoke test took 295 s.

### 1.5 Prompts that produced keepers (verbatim as sent)
**A. RE `sd02_cu_yearning`**: reference mode, refs = DOT sheet + tower, 4 s, vocal stem; keeper `c8b3647c99`, r = 0.73 as played.
```
Close-up of DOT on the top platform of a red-and-white antenna tower at night far above the fog, three-quarter front view with her face clearly visible to the camera; she looks up and off to the left at the stars, singing with longing, wind lifting her long black hair and curtain bangs, orange foam headphones around her neck, cool blue night light and warm orange city glow from below. Slow push-in. She sings the words of the reference audio with precise, clearly articulated lip sync. Clean modern anime style, crisp black lineart, flat cel shading, faithful to the character reference sheet (DOT: long straight black hair with a centre part, long curtain bangs framing her face, long layered slightly choppy ends past her shoulders, no blunt fringe; orange foam headphones, cropped white flight jacket with orange stripe and a big pale-blue dot on the back, black crop top, navy cargo pants). No text, no subtitles, no logos.
```
**B. RE `sd17_dance_a`**: green screen, 6 s, instrumental ref; keeper `e8980134c1` (keyed with despill in `roto_extract.py`).
```
Full-body shot of DOT performing an energetic, razor-sharp K-pop dance break that hits every beat of the reference music: powerful arm hits, a quick spin, hair flying; her whole body stays in frame. Background: a plain, flat, evenly lit solid chroma-key green screen (#00FF00) filling the whole frame, with nothing else in it. Clean modern anime style, crisp black lineart, flat cel shading, faithful to the character reference sheet (DOT: long straight black hair with a centre part, long curtain bangs framing her face, long layered slightly choppy ends past her shoulders, no blunt fringe; orange foam headphones, cropped white flight jacket with orange stripe and a big pale-blue dot on the back, black crop top, navy cargo pants). No text, no subtitles, no logos.
```
**C. MM `ch2_catch_t52`**: first-frame avatar mode, 8 s, 720p, vocal stem from 207.84; preferred (calm, eyes closed, no grin).
```
Animate the first frame exactly: same framing, composition, lighting, setting and character. She has just received something precious from very far away and holds it against her chest. She sings with her eyes closed, inward and contemplative, as if listening to everything it carried home; her face stays calm and serious, lips soft. On the long final note she keeps her mouth open and sings until the sound fades, then lowers her chin slightly and keeps her eyes closed, still and thoughtful. She does not smile broadly, grin or show her teeth. She sings the words of the reference audio with precise lip sync, shaping each word clearly and holding the long sustained notes with her mouth open. Same face and eyes as the first frame: keep the exact eye size, eye shape and very dark brown irises; natural double-eyelid crease; white of the eye visible on both sides of the iris; do not enlarge, round or widen the eyes, no eyeliner, no tears. Natural lips, no gloss, no makeup. Do not redraw, beautify, slim or restyle her face. Her hands stay relaxed and natural. One continuous shot, no cuts. No captions, no text.
```
**D. MM `dr_dl_wide_t58`**: group action keyed to the music, 6 s, song ref from 151.43; "exactly six fighters at every sampled frame".
```
Animate the first frame exactly: same framing, composition, lighting, setting and character. Wushu duilian, a rehearsed sparring set performed as a show: three pairs of copies face off on the wet mirror salt flat, the orange copy against the violet copy in front, the rose copy against the sky copy in the middle behind them, the mint copy against the gold copy at the two sides. For the first moment every pair holds its guard, coiled and still. On the big hit of the reference audio, the drop, about 1.7 seconds in, all three pairs explode into a fast exchange with one strike on every beat: a lunging bow-stance punch met by a rising forearm block, a palm strike parried and countered, a low snap kick checked with a raised knee, then about 4.3 seconds in a high spinning kick that the partner ducks under. The front pair is the clearest; the pairs behind trade the same rhythm. Sharp, fast and powerful, focused faces, hair whipping, water spraying from every step. Low camera pushing slowly in between the two front fighters. Every strike is controlled and stops just short; nothing lands and nobody is hurt; they are partners showing a rehearsed set. Exactly six copies, three pairs, stay in frame for the whole shot; nobody leaves, merges, splits or disappears. Their mouths stay closed; nobody sings or speaks. Every copy keeps the same face and outfit as in the first frame, only the band colours differ. One continuous shot, no cuts. No captions, no text.
```
**E. RW2 `S1` take_1**: first frame = a pencil figure over an engraved plate, 8 s, vocal slice from 12.90; pick, 16:9, r .58, lag +1.04 (`tools/sing/takes.py`).
```
A drawing comes to life and stays the same drawing in every frame: the woman is a soft colored-pencil drawing and the world around her a black-and-white wood engraving, with the same lines, hatching and paper as the first frame. The woman sings the words 'The night before my dissertation defense' from the reference audio, her lips shaping each syllable in time with the voice: lips closing on the 'b' of 'before' and the 'm' of 'my', and moving quickly through 'dissertation defense', the last syllable held softly. She sings it quietly, as if remembering a dream, looking into the camera, open and calm, her eyes alive. Her forehead stays smooth and unlined for the whole clip: her brows stay relaxed and never knit, no frown, no creases, no grimace. Her head keeps the angle of the first frame: it does not tip back or turn; it sways only a very little. Her mouth opens naturally, as in gentle singing, never a wide shout. She stays the same person as in the first frame: the same large head, wide heart-shaped face with its tapering chin, high forehead, the two slightly different eyebrows, wide glasses, centre-parted hair. Do not redraw, beautify, slim, age or restyle her face; no makeup, no added lines. The hairline stays at the same height above her brows, and the top of her head stays in frame. Static locked-off camera, no zoom, never a face close-up: she stays framed chest-up exactly as in the first frame. She stands at night right in front of the mirror of Cloud Gate in Chicago. Everything behind her stays exactly as engraved in the first frame: the curved reflection of the city, the plaza, the lamps, the rooftop; only the tiny pair of headlights on the road in the reflection at the right moves slowly along it. The air is still; only a few loose hairs stir. No text.
```

## 2. Lip-sync verification

**Convention everywhere:** `clip time = song time − S0 + lag`, where S0 is the song time of the audio-ref start and lag > 0 means the take's mouth runs late.
Lags are per take and are never 0 by default: RE −0.29…+0.33 s, MM −0.375…+0.62, RW2 +0.45…+1.04 (drifting), OS 0.2–1.5, VS card 06 sang a whole line
0.92 s late. **Jade's ear beats every metric** (RW2: she picked +0.90 against a measured +0.10). Show her switchable variants in a browser, never on her Debian player.

| tool | method | in → out | CPU here? |
|---|---|---|---|
| MM `tools/sync/lipsync.py CLIP S0 [--win=A,B] [--out=P]` | FaceMesh inner-lip gap (13/14) ÷ face height (10–152); a FaceDetection crop fallback for small faces; correlated with the vocal-stem RMS over lags −1…+2.4 s | mp4 + stem → `P.sync.json` (`best_lag_s`, `corr`, `top5`, `face_found`, `face_h_ratio_min_max`, `eye_dist_ratio_min_max`) + `P.sync.png` | **yes** (3.12 venv). **Measured here: 145 frames in 3.3 s**, reproduced the box's 0.542 on `review/cloud/takes/ch1_main_t11_647f537e3a.mp4` S0 69.12. Edit the hard-coded `FF`/`VOC` |
| MM `tools/sync/labial.py TAKE S0 [--lo --hi]` | syllable map: gap at m/b/p/w onsets (should be small) vs vowel nuclei (large) | → `work/takes/<base>.labial.json` | yes (mediapipe). "Often disagrees; trust the strips" (MM HANDOFF) |
| MM `tools/sync/pb_wordstrip.py TAKE S0 LAGS OUT.jpg "w@t,…" [CROP]` (generic), `wordstrip.py` (VS-hardcoded) | mouth crops at each word onset, one row per candidate lag | → jpg | yes. **The most reliable check** (envelope correlation is useless on legato or doubled lines: VS card 03, all takes 0.15–0.18) |
| MM `tools/sync/lagreel.py BASE S0 L1,L2,L3 OUT.mp4` | side-by-side panels at 3 lags, song audio, PIL labels | → mp4 | yes (fix `FF`, the song path) |
| RE `pipeline/sync/mouth.py` | anime LBP cascade (`/tmp/work/lbpcascade_animeface.xml`, from nagadomi on GitHub) + skin-ratio test + median-track rejection; openness = non-skin area in a mouth ellipse | mp4 → `{fps, open[], hit}` | yes (OpenCV only). Fails on profiles, push-ins, hands at the face |
| RE `pipeline/sync/mouth_color.py CLIP T0 A B` | largest skin blob = face; dark-red mouth-interior pixels in its lower half | independent second metric | yes |
| RE `pipeline/sync/lag_curve.py CLIP T0 A B` | **scores as played**: resamples openness at `t − t0 + lag` per song time in the window, both curves high-passed, lags ±11 frames, both metrics | → curves. "A lag is trusted when both curves peak together" | yes (librosa). Better than `score.py`, which slides curves and dropped edge samples (sd06: −0.33 vs +0.29) |
| RE `pipeline/sync/remouth.py [sdNN…]` | **mouth transplant**: target = log RMS × pYIN voicing; DP picks, per drawing (on twos), a mouth from the same take; ECC affine registration, feathered mask, the body frame's low-frequency shading | take → `base_clips/<take>_sync.mp4` | yes (cv2, scipy, librosa). r 0.10 → 0.78, 0.19 → 0.91 (RE §3d). Fixes **drift inside a take** that one lag can't |
| RE `mouthline.py`, `wordstrip.py`, `sync_report.py` | crops every 1/8 s over a window with envelope and onsets; per-shot USED windows | jpg / json | yes |
| OS `tools/mouth_track.py` + MGP `render/src/roto/mouth.js` | **drawn mouth**: openness from the vocal stem (attack 20 ms, release 90 ms, −44…−16 dB, 40 ms lead, forced shut on b/m/p); the renderer paints out the take's mouth and draws lips rigid to the eye-corner frame | stem → `mouth.json` | yes. In sync by construction; looks puppet-like if overused |
| OS `tools/lipsync.py id:s0`, `plate_meta.py` (Tasks `face_landmarker.task` + jawOpen blendshape) | | → `sync.json` / `meta.json` | yes (model from storage.googleapis.com) |
| GPU-only / blocked here | MM `tools/prep/prep.py` (Depth-Anything-V2-L + BiRefNet, CUDA, Hugging Face), RW2 `tools/engrave` (BiRefNet, Real-ESRGAN), faster-whisper large-v3, demucs, `flux-video-upscale` is paid (not GPU) | | no: use rembg isnet / green screen, Workers AI Whisper, Kim_Vocal_2 ONNX |

**Recommended minimal loop for us (all CPU):**
1. Stem: Kim_Vocal_2 ONNX (OS `tools/vocal_stem.py`, 1–2× real time on 4 cores; the model is already at `work/models/Kim_Vocal_2.onnx`).
2. At intake, per sung take: `lipsync.py TAKE S0 --win=<used window>` (gate: `face_found` ≥ 90 % and `face_h_ratio` within ±8 %),
   then `pb_wordstrip.py` over the used words at lags −0.25…+0.5 in 1/24 steps around `best_lag_s`.
   For anime faces add RE `lag_curve.py` (cascade + colour). Pick the lag where the strips show closures on b/m/p and open vowels.
3. Write the take, S0 and lag into one JSON (`docs/picks.json`, MM `picks_manual.json` + `lags.json` style) that the timeline imports. Lags are multiples of 1/24 s.
4. Score again **as played on twos** (RE pass 2: "of a star" scored 0.45 on twos against 0.70 on ones). If a take drifts (one stretch in sync, the next not),
   run `remouth.py`. Use the drawn mouth only for tiny or back-lit faces.
5. Jade's ear: a 540p page with 5 lag variants 1–4 frames apart (`lagreel.py`, or a variant page like MM `out/final/watch.html` clocked by `requestVideoFrameCallback`).

## 3. Rotoscope → JS renderer

### 3.1 How each project read the footage (never shown raw)
| | guide maps | matte | format to browser | look |
|---|---|---|---|---|
| **RE** `pipeline/roto_extract.py` | per frame `g_%04d.png` (R = XDoG line, σ .9, k 1.6, τ .985, ε −.012, φ 60; G = tone, a Gaussian on bilateral grey; B = matte) + `c_%04d.jpg` (bilateral colour, used **only** to classify inks: orange / blue / skin) + `meta.json {frames,w,h,fps,key}` | chroma green (`key: auto` from border hue) with despill + the matte edge as an outline | PNG + JPG pairs at 1280×720 → `new Image()` → `THREE.Texture`, LRU 90 (`render/src/roto.js` `getTex`); served at `/work/guides/<clip>/` from `WORK_DIR` | halftone riso print, neon light mode, 1-bit data; on twos with line boil |
| **OS** `tools/extract_plates.py` + `plate_masks.py` + `plate_meta.py` | `video/plates/<id>/f%04d.jpg` 960×540; the JS analyses each frame itself (`plateF` → getImageData → structure tensor, tone) | rembg `isnet-general-use` 512×288, odd frames only | JPEG + PNG, Canvas2D | coloured-pencil hatch layers, tone thresholds .13/.36/.58/.78 |
| **MGP** `render/src/roto/` (prep tool not in the public repo) | `c_NNNN.jpg`, `g_NNNN.png`, optional `s_` + `key.jpg` (the painted keyframe) + `mask.png` + `meta.face.pts` | motion mask vs the painting | WebGL textures, LRU 6 | ink / silk / gold line; keeps the painted keyframe where the take matches it |
| **MM** `tools/prep/prep.py` (**GPU, HF**) | `rgb/000000.jpg`, `depth/*.png` (16-bit), `matte/*.png`, `meta.json` | BiRefNet | `fetch → createImageBitmap(flipY)` ×3 per frame, cache 900, prefetch 4, frame blend below 0.9× (`engine/src/plateseq.js`) | glyph/ASCII + LED lattice with depth parallax |
| RW2 (compositor; shows engraved footage) | `media/engine_cache/` CFR JPEG sequences pre-decoded by ffmpeg | BiRefNet matte dirs | JPEG | engraving + colour isolation |

No project decoded video in the browser: every one pre-extracts frame images. Flow fields were never precomputed. OS computes structure-tensor flow in JS;
VS/RW2 used optical-flow time warps offline. Landmarks came from FaceMesh or the face landmarker in Python into `meta.json`.

### 3.2 Determinism pattern
`window.renderAt(t)` (RE/OS), `ENGINE.render(t)` (MM): every pixel is a pure function of song time. Serialise calls (`busy = busy.then(run, run)`, RE `main.js`).
Seeded hashes only (`rng(2011)`, `hash12`); no `Math.random`, no `Date`. The VS engine's global seeded RNG was consumed during lazy scene setup, so a 5 s slice
differed from the master by 23–35 dB. **Seed per scene or per shot.** Load assets miss-driven: draw → await whatever was missing → draw again (RW2), so cache timing
never changes pixels. Drawings on twos: `f = floor(clipT·fps + 1e-3); f -= f % 2` (RE `frameIndex`; the 1e-3 stops a −0.291667 lag from landing a frame off).
For retimed clips count twos in **film** frames (MGP `drawingAt`: rate 0.9 on take-twos stutters 2,2,2,2,3). OS clocks its whole frame on twos per shot;
`opts.ones` for impacts. Grain is seeded per shot and static within it (RE: per-frame grain cost 16 % more bits).
Determinism check: RW2 `--verify N` renders in two browsers in opposite orders and compares hashes. MG renders twice with a majority vote, because frames rendered under load were silently wrong.

### 3.3 Timeline / shot table
RE `render/src/timeline.js` `buildTimeline(A)` returns `[{id, t0, t1, scene, p (object or fn(t, lt, ctx)), look, type(ty, t, lt), post}]`. Times come from
`A.W(line, word)` word onsets and `A.bars` (a tracked, accelerating grid), with no overlaps. `R(clip, extra)` pulls `{start, lag}` from `selects.js`, which
`extract_selects.py` generates from `pipeline/selects.json`. A missing guide falls back to a sky scene, so the edit always renders (good for animatics).
`window.__shots` exports the table (`tools/shots.mjs`), so changed shots can be re-rendered by id. A global rhythm layer adds a kick zoom punch, CA, misregistration
on the snare and 2-frame impact frames (`buildGlobalPost`). Audio features come from `render/data/audio.json`
(`beats[{t,i,down}], bars, kicks, snares, lines[{i,t,end,text,words[{w,t,end}]}], sections, features`), written by `pipeline/audio_map.py`.
MM: `engine/show/main.js` EDL with `B(n)`/`bb(n,beats)`/`ws(id,k)` helpers and `clip.js fit` (a clock that never runs off the take).
RW2: time strings `"25:1"`, `"word:reload#2"`, `"section:drop1+1bar"`.

### 3.4 Type layer
RE `render/src/type.js` `TypeLayer` draws on a Canvas2D composited by the engine: `stack`, `subtitle`, `line` (the whole line stays up, each word lights as sung),
`keyword`, `terminal`, `decode`, `title`, `hud`, `censor`, `plateText` (misregistered plates), auto-fit. OS: Anton hooks + Oswald Cyrillic echo + Instrument
Serif intimate lines + JetBrains Mono telemetry; drawn knockouts where big words sit. MM: `ledtext.js` LED lyric type with a scrim. RW2: `lowerthird`, `slam`,
`pin` (corner-pinned signs), `pencil` handwriting, `terminal`, `iteration` odometer. Rules from reviews: **one idea per frame, at most one HUD layer** (RW1 died
of 3–5 stacked layers); never over the eyes or mouth; big at hooks, subtitle-size in verses.

### 3.5 CLIs
- RE `render/tools/render.mjs --stills 3.2,10 --w 1920 --h 1080 --outdir D` · `--from A --to B --fps 24 --jobs N [--resume] [--framedir D] [--noenc 1] [--audio F] [--crf 17 | --bitrate 12M] --out X.mp4`.
  Playwright, one browser process per job, `page.screenshot` JPEG q94, frames `f_%05d.jpg`, ffmpeg mux with `-ss from`. Also `tools/encode_release.sh FRAMEDIR AUDIO OUT [kbps]` (2-pass, copies `.m4a` audio), `tools/profile.mjs`, `tools/serve.mjs` (`?play=1&fit=1`).
- OS `video/render.mjs --sheet=t1,t2 --stills= --clip=A:B --frames=A:B --workers=4 [--format=png] --encode --source= (making-of pairs) --list`; a resumable atomic per-frame queue; reopens a crashed page.
- MM `engine/render.mjs --stills t:f.png --sheet out.jpg --from --to --every --res WxH --mp4 --audio --workers N`; pipes `readPixels` RGBA → ffmpeg `vflip`; contiguous chunks + concat.

### 3.6 Throughput
| measured | number |
|---|---|
| **RE renderer, SwiftShader, here, 1080p** | stills 0.64–0.85 s each (1.46 s on a shot's first frame: texture loads); `profile.mjs`: `renderAt` 10–1,400 ms + screenshot 0.8–2.4 s |
| **RE range, 96 frames at 1080p, here** | `--jobs 1` 0.72 s/frame (72 s); `--jobs 3` 0.64 s/frame (66 s). **Parallel browsers barely help on 4 vCPUs**: SwiftShader already uses every core. ≈ 1.5 fps → **the whole film ≈ 65–70 min at 1080p** |
| **RE at 540p, here** | `--jobs 1` 0.44 s/frame, `--jobs 2` 0.30 s/frame → whole film ≈ 30 min |
| **Guide extraction, here** | `roto_extract.process`, 720p, one process: 150–170 ms/frame (sd02: 97 frames in 16.4 s), ≈ 0.55 MB/frame |
| **x264 on halftone 1080p frames, here** | preset slow 8.3 fps, medium 16 fps; CRF 17 → **28 Mb/s** (RE: CRF 20 needed 27–30 Mb/s in the opening) |
| prior, other machines | MM GPU 3 workers × 4.2 fps → 13 min for 4:57; RW2 GPU 1080p 38 fps / 4 workers; OS ~21 min for 5,837 frames on 4 workers (Canvas2D) |

### 3.7 Encodes
- **X/Twitter**: 1080p24, 2-pass libx264 `-b:v 12M -maxrate 16M -bufsize 24M -profile:v high -level:v 4.1 -refs 4 -preset slow -tune grain`, AAC 256k
  (or copied), `+faststart` (OS `tools/encode_uploads.py x`; MM X file 455 MB for 4:57). A 4K 35 Mb/s X upload failed (OS).
- **YouTube**: 4K, Lanczos up from 1080p frames (`scale=3840:2160:flags=lanczos:out_color_matrix=bt709`), 2-pass H.264 45 Mb/s, `-tune grain`; archival master CRF 12 (OS). Upload the master, not the X file.
- **GitHub < 100 MB**: 2-pass ≈ 5.5 Mb/s (RE, 2:08). For 4:07 use ≈ 3 Mb/s H.264, or HEVC 1080p (OS: 94 MB for 4:03), or 720p parts under 75–100 MB.
- Review: 540p CRF 20–23; Gemini copy 480×270 at 380 kb/s, mono AAC 64k, with a burned-in film-time strip.
- Always: an explicit `-r 24` / `-framerate 24` on every intermediate; frames + audio slice with `-ss first_frame/24`; copy the AAC stream for picture-only revisions.

### 3.8 Which renderer to start from
| | RE `render/` | OS `video/` | MGP `render/` | MM `engine/` |
|---|---|---|---|---|
| runs in this container | **yes, measured** (after `npm install` and `CHROME=`) | probably (CPU Canvas2D, puppeteer-core) | **no**: no `render.mjs`, no prep tool, no analysis/media in the public repo | **no**: Vulkan flags, `/usr/bin/google-chrome`, plates need CUDA + HF |
| core | three r186 WebGL2 + Canvas2D type, one compositor (`engine.js`: bloom, halftone, grain, misreg, CA) | Canvas2D pencil engine (624-line `pencil.js`), per-frame JS image analysis | raw WebGL (`gl.js`), paper and ink fields | three 0.170, depth lattice, glyph atlas |
| guide prep on CPU | XDoG/tone/matte in plain OpenCV | ffmpeg + rembg | missing | GPU models |
| scenes worth reusing | `galaxy.js` (42k seeded stars, contact graph = MST + kNN revealed by Dijkstra distance), `war.js` (night side over the pole, missile tracks, cities burning, lights out), `earth.js` (Natural Earth globe, day/night, city blink), `data.js` (SETI waterfall, Wow! printout, pulsing star, transits: the "pattern no dead star could make" split), `inserts.js` (Drake equation, split screens, end card), `sky.js`, `burst.js` (speed lines + rings on kicks), `array.js` (42 beat-choreographed dishes) | tether, capsule, pencil hatch | moon, ink washes, drawn mouth | dronetree, forktree, lattice, LED type |
| size | 6.4k lines | 4.0k | 2.1k + sections | 3.6k + a 1,070-line EDL |

**Recommendation: fork RE `render/` + `pipeline/roto_extract.py` + `pipeline/sync/`.** It was built in a cloud container with the same blocked hosts, its renderer
is deterministic on SwiftShader, and it has the cleanest licensed font set. Its scenes are on-theme: Hold Fire's 610-world contact graph is `galaxy.js`'s web,
Petrov's Oko display and "Earth's night side catching fire" are `war.js`, NATURAL vs NOT NATURAL is `data.js`'s pulsing star, and the Drake equation is `inserts.js`.
Port in: OS's resumable atomic frame queue, `--sheet` and `--source` (making-of); MM `tools/edl_check.mjs` (held-clock and non-finite-argument check) and `clip.js fit`;
MGP `drawingAt` twos-on-rated-clips; RW2 time strings and `--verify`. Fix first: the `CHROME` default, the `/tmp/work` paths, `serve.mjs` `REPO`, and the RE-only `--audio` default.

## 4. Review loop
- **Contact sheets**: RE whole film at 540p every 0.5 s (every 0.25 s through changed shots) plus full-size crops of every fix. RW2 929 frames on 39 labelled sheets
  (every 0.25 s for 0–30 s, ±1 s around every shot boundary) plus automatic checks: luma for black or white frames, a forbidden-colour mask, frame-difference
  cut detection against beats. MM `--sheet ... --every 4 --res 480x270` (cells are sized in pixels, so judge the look at 1080p). OS `--sheet` / `--source`.
  **2 fps sheets miss one-frame dropouts.** Look at frames yourself: subagent verdicts were wrong more than once (RW2 P2, F4).
- **Outside model**: `google/gemini-3.8-flash`, called through the Cloudflare unified catalog, `POST .../ai/run`, body
  `{"model":"google/gemini-3.8-flash","input":{"contents":[{"role":"user","parts":[{"inline_data":{"mime_type":"video/mp4","data":"<base64>"}},{"text":"<prompt>"}]}]}}`
  (RE `pipeline/ledger.jsonl`; RW2 via `cf.run_model`, which exists in our `tools/gen/cf.py`). Input: 480×270, 380 kb/s, mono, a film-time strip; RW2 sent
  4 overlapping 60 s chunks plus the whole film: 45.7k in / 14.6k out tokens ≈ $0.05–0.10. It has **no catalog card**, so `spend.py` logs $0: log it by hand.
  In this container a sync call may hit the ≈ 30 s cut-off: send ≤ 60 s chunks. A relay job with `"est_usd"` in the spec passes `gen.py` validation (no card = no
  schema), but text results through the relay are untested. Prompt (RE): the director persona, scores 1–10 on hook, lyric legibility, cut rhythm, lip sync, story clarity
  and polish, "the 8 most important concrete problems, each with a timestamp (mm:ss) and a specific fix", broken frames, "No praise padding."
- **What reviewers caught**: lip sync 2–3 frames late (RE yearning, fixed); line boil strobing under bloom (light-mode boil halved, 1.2 → 0.5); type colliding with
  hands and faces (BEATING / BLINKING); an unmotivated white flash; a face with no features for 2 s (RW2 V2m); the colour payoff spoiled in the teaser; ghosts not
  reading as Jade; illegible lyrics laid into textures; red in a no-red world; a webcam-like selfie hold breaking the style. Treat each finding as one opinion and verify
  it (RW2 lists Gemini's wrong claims). Jade's own catches (MM): frozen frames (50 held clocks), a smile or grin at the end of takes, alien eyes, an extra jacket band,
  the "boring" end card, an orchestra not playing to the music.
- **Jade's process**: keyframes or sheets before any long or expensive run; one card per decision with variants in one page; timestamps + descriptions, not IDs;
  she reviews on her phone and in the browser; no commit or push until she asks; log every paid call.

## 5. Reusable assets (all read-only; copy before editing)
**Characters** (canon Jade: white cropped racer jacket, ONE orange band per upper arm + one across the chest, a pale-blue dot on her LEFT chest, a round b/w
"1420 MHz" patch on the LEFT sleeve, RARE EARTH + a big pale-blue circle on the back, black high-neck crop top, navy cargo pants with orange straps, chunky white sneakers, orange headphones):
- `rare-earth-techno-remix/design/dot_character_sheet.jpg`: **DOT v3**, anime: long straight black hair, centre part, curtain bangs; turnaround, expressions,
  jacket details, Yagi antenna (GPT Image 2.5, 1536×1024, labels fact-fixed). `dot_character_sheet_v2_hime.jpg` (hime cut), `dot_character_sheet_alt.jpg`.
  DOT is Jade signalling the world **Echo** (217 ly), which is close kin to Hold Fire's "Other".
- `merge-me-back-to-main/inputs/character_sheet.png`: the newest 4-view anime Jade, hair down, full costume canon (1536×1024).
- `merge-me-back-to-main/review/cloud/refs/`: `canon_v4__canon_face.jpg` (the AAA-3D canon face Jade locked: "for everything"), `canon_v4__canon_face_crop.jpg`,
  `canon_v4__canon_eyes_crop.jpg`, `r7__turn_gpt_patch.jpg` (3D turnaround + patch inset), `r7__patch_34.jpg`, `r7__bun_nbp.jpg` (bun + two pencils),
  `r6__canon_face_{front,34}.jpg`, 16 `face_v4__<shot>.jpg` stills. Rules: `docs/canon_face_v4.md`. Photo rule: her own photos MAY go to models, **never her kids'**.
- `rewind-take-two/inputs/jade_in_outfit.png`: anime 4-view (same costume).
- `orbital-sunrise-video/media/chars/jade_src/jade_trace_{base,jacket_hp_1,jacket_hp_2,jacket_plain_1}.jpg`: **her approved pencil traces** of real photos (glasses,
  pink headphones), 1792×2400. Boards: `media/boards/char_jade_v{2..5}_{turnaround,faces,hero}.jpg`. **Historical-figure precedent**:
  `char_leonov_{turnaround,faces}.jpg`, `char_belyayev_*` (for Petrov/Arkhipov, the treatment wants archival inserts, not likeness).
- `merge-me-back-to-main/review/cloud/takes/*.mp4` (22 picked takes) + `review/takes/*.mp4` (41 v5 takes) + `sync/*.sync.json`: test material for the lip tools.
  RE `pipeline/base_clips/*.mp4`: 40 archived takes (with `_lettering` / `_sync` fixes), which ran through `roto_extract.py` here.

**Style boards / worlds**: RE `design/style_board_signal_print.jpg` + `_flat.jpg` (SIGNAL PRINT: inks Klein blue, beacon orange, pale-blue dot, pink, mint signal,
yellow, ink, paper; type specimens incl. Russian), `world_earth_sheet.jpg` / `_alt.jpg` (ATA dishes, Sutro), `world_echo_sheet.jpg` (ringed ocean world, petal dishes,
signal tower), `design/sources/ata_hat_creek_gpt_image_2_5.jpg`; prompts in `pipeline/prompts/*.txt`. OS `media/boards/style_sf0{1..4}_*.jpg`, `set_env_*.jpg`
(capsule, taiga, Voskhod-2 orbit). MM `docs/style_bible.md` (palette, lanes).

**Fonts** (all SIL OFL; licence texts only in RE and RW2; ✓ = has Cyrillic, needed for the Oko / Serpukhov-15 and B-59 text):
`rare-earth-techno-remix/render/assets/fonts/`: Anton, Archivo-VF, BigShouldersDisplay-VF, InstrumentSerif Reg/Italic, JetBrainsMono-VF ✓, NotoSerifDisplay-VF ✓,
SpaceMono, Unbounded-VF ✓, VT323, NotoSansSC-Black-**subset (6 glyphs only: subset again for any Chinese, e.g. the Tang alchemy text)** + `OFL-*.txt`.
`orbital-sunrise-video/video/fonts/`: Oswald 500/700 ✓, Cormorant Garamond Italic ✓, Anton, Instrument Serif, JetBrains Mono 400/700/800 ✓ (no licence files; add the OFL).
`rewind-take-two/render/fonts/`: IBM Plex Mono ✓, Overpass ✓, Press Start 2P ✓, CMU Serif Italic ✓, IM Fell English, Reenie Beanie + licence files.
`merge-me-back-to-main/engine/fonts/`: Archivo, Bricolage Grotesque, Space Grotesk, Unbounded ✓, JetBrains Mono ✓, Instrument Serif (no licence files).

**Data**: `rare-earth-techno-remix/render/assets/geo/` Natural Earth (public domain) `ne_110m_land`, `ne_50m_land`, `ne_{110,50}m_populated_places_simple.geojson`,
`cities.json`, `land_4k.png`, `lights_4k.png` (the night side). The galaxy is procedural (`galaxy.js`, N = 42000, `rng(2011)`): make 610 linked worlds by changing
the civ count. `render/data/audio.json` is the schema to copy. OS `docs/data/era5_landing_1965-03-18_20.json` (an example of sourced data). MM `analysis/timing.json` (VS/MM schema).

**Sound / voice**: RE `pipeline/sound_design.py` (receiver static, pings, FSK burst, a ring-modulated "light-years echo", ElevenLabs v3 premade voice
`XB0fDUnXU5powFXDhCwa` via `gen.run_sync("elevenlabs/eleven-v3", {text, voice_id, output_format:"mp3_44100_128"})`, `[whispers]` tags, a Whisper check of every
processed line, the song never normalised, peak −4.4 dBFS). RW2 `tools/sfx/{generate,build,dsp,verify}.py` (cues only in the song's holes, bit-identical song
outside the cues, LUFS/true-peak checks, `music-v2` as SFX at $0.0025/s, eleven-v3 at $0.0001/char). MM `tools/mix.py`. Stems: OS `tools/vocal_stem.py` (numpy + onnxruntime Kim_Vocal_2).
**Setup script model**: OS `tools/setup_env.sh` (fix its `chrome-linux/` glob for `chrome-linux64/`).

## 6. Top 20 pitfalls (and the fix)
| # | mistake | fix |
|---|---|---|
| 1 | Assuming lag 0, or one lag per take when the take drifts | measure per take over the used window; strips + as-played curves; `remouth.py` or a flow warp for drift; Jade picks by ear from variants |
| 2 | Naming a shot size in a first-frame prompt | the `PIN` line; shot size only in reference mode |
| 3 | Taking the output aspect for granted | check w×h at intake; 2 takes; a card-frame fallback |
| 4 | Model-made lettering (signs, patches, seals, HUD) | all text procedural in the renderer; fix plates before guides; sanctioned-lettering clause in image prompts |
| 5 | Prompt words that push the face ("large eyes", "raise hairline" → bald) | guards that *keep* ("exact eye size", "large tall broad forehead"); verify with FaceMesh metrics |
| 6 | Gestures keyed to lyrics; frozen bodies with moving mouths; grins at the end | subtext + one shift; "does not smile broadly, grin or show teeth"; hands relaxed |
| 7 | `generate_audio: true` | always false |
| 8 | Direct sync calls in the cloud (30 s 502), parallel image storms (6001), parallel intake/collect races | `GEN_IMAGES_VIA_RELAY=1`; ≤ 3 image calls, 1 for edits; one intake at a time; the manifest file lock |
| 9 | Coordinate conventions: 1920×1080 design px, y-down canvas vs y-up shaders, `flipY`, `readPixels` needs `vflip` (RE: moon at the top, flipped textures, upside-down type) | one helper for design px ↔ uv; an asymmetric test card in stills on day 1 |
| 10 | NaN geometry → black blobs (RE link geometry without normals) | NaN guards; MM `edl_check.mjs` reports non-finite draw args under node with a mock canvas |
| 11 | Type over faces and eyes | face boxes from landmarks into the shot table; type in the calm third; re-check after every re-pick (RE moved "ALONE?" when a new take craned in) |
| 12 | Line boil strobing (under bloom especially); a flickering hatch layout | boil 1.2 print / 0.5 light (RE); a stable hatch layout nudged ±12 % (OS); boil per drawing (twos), not per frame |
| 13 | Encode bitrate: halftone and grain need 27–30 Mb/s at CRF 17–20; per-frame grain +16 % | per-shot static grain; 2-pass to target; 12 Mb/s X, 45 Mb/s 4K YouTube |
| 14 | Frame-rate drift (VS 25 fps intermediates drifted 1–3 frames over 3 s); `ffmpeg -ss` landing a frame late | explicit `-r 24` everywhere; compare by frame index; conform Seedance's 24 fps deliberately |
| 15 | Stale assets: caches keyed by path or name (RW2 cache, RE `.src` stamp), lags changed without re-running picks, stale hard-coded paths (`/home/jade/...`, `chromium-1194`) | new filename per redraw; `--force`; re-run picks + checks after any lag change; resolve Chrome via playwright; grep for `/home/jade` after copying tools |
| 16 | Held / frozen frames when a take is shorter than its shot (MM found 50) | `fit` clocks (slow ≥ 0.9× with frame blending), trim sung takes at their own first and last frame, never loop; `edl_check` after every pick |
| 17 | Twos quantise lag; rated clips on twos stutter | tune lags as played on twos; MGP `drawingAt`; 1e-3 frame tolerance |
| 18 | Non-determinism: a global RNG during lazy setup, renders under load saving wrong frames, half-written shared files | per-shot seeds; `--verify` / double render on finals; edit files atomically (copy, `node --check`, `mv`) |
| 19 | Whole-clip sync scores (Seedance idles); profiles and push-ins defeating trackers; hands at the face | windowed scoring; two independent metrics; hand-placed ROI for ECUs (RE `sync_report.py` `ROI`); reject push-in takes for lip shots |
| 20 | Disk and temp: 11 GB free here, 1080p q94 frames ≈ 8 GB, guides ≈ 2 GB; Chrome/ffmpeg temp | render 30–60 s segments → CRF 12 mezzanine → delete JPEGs (or q88, or pipe frames into ffmpeg); extract guides only for used windows; `TMPDIR` on disk |

Also remember: image models return the old picture when it is among the inputs (give a reference, not the target); edits repaint lane colours toward the canon
(pin them); `reference_videos` needs a public URL and Jade's OK to publish her likeness; unquoted heredocs execute backticks; `pkill -f` matches your own shell.

## 7. Recommended pipeline for "Hold Fire" here (247.2 s, 5,933 frames at 24 fps)
Budget guide: ≈ $220–300 of the $950 `HOLDFIRE_CAP`. Times are wall clock in this container.

| step | what | tools | time | cost |
|---|---|---|---|---|
| 0 Setup | the 3.12 mediapipe venv; fork RE `render/` → `holdfire/render/` (`npm i three@0.186.1 playwright-core`), set `CHROME`/`WORK_DIR` defaults, copy RE fonts + OFL; `export GEN_IMAGES_VIA_RELAY=1`; KV probe; `gen.py submit --dry-run` on one spec | §0 | 30 min | $0 |
| 1 Audio map | Kim_Vocal_2 stem (in progress in `work/stems/`); words via `@cf/openai/whisper-large-v3-turbo` or `xai/grok-stt` ($0.0017/min), aligned to the lyrics (RE `lyrics_align.py`: difflib + onset snap, ≥ 70 ms apart, hand pins); beat grid as a polyfit (RE `audio_map.py`; Suno tempos drift, so never a fixed BPM); tag lines as Voice A / B; time every shouted numeral (One! One! Two!… 13! 21! 34! 55! 89!) as an event; click check | → `render/data/audio.json`, `analysis/timing.json` | 2–3 h | < $0.10 |
| 2 Look and characters | Beacon Keeper, Listener, Other sheets (GPT Image 2.5, 2–3 candidates each); a style board (nano-banana-pro); 16:9 crops for Seedance; fix every label; Jade's OK before any video spend | `cf.generate` via relay (2–7 min each) | ½ day | $5–10 |
| 3 Shot table + animatic | `timeline.js` on bars and word onsets with placeholders (RE's roto fallback); type pass; 540p animatic at `--jobs 2` (≈ 30 min); Gemini review #1 + Jade | RE `render.mjs`, §4 | ½–1 day | ≈ $0.10 |
| 4 First frames | ≈ 35–45 plates for first-frame shots (or sheet crops for reference-mode shots); ≤ 3 parallel; look at each | gpt-image / nano-banana via relay | 4–6 h | $15–25 |
| 5 Seedance batch 1 | ≈ 18 sung shots × 2 takes × 5–8 s (vocal stem refs) + ≈ 20 non-sung × 2 × 5 s (instrumental refs for count hits; green screen for the Listener's constellation body and the Other so the JS draws their worlds); tags `<shot>_t1..`; `gen.py wait` | `tools/sd`-style batch from MM `batch.py` | 1–2 h | $100–150 |
| 6 Intake + lip-sync | per take: dimension and first-frame check, 10-frame strip, `lipsync.py` + word strips (+ `lag_curve.py`); lag page for Jade; ≈ 30 % re-rolls | §2 loop | 1–2 h + review | $30–50 |
| 7 Guides | `roto_extract.py` on picked windows only, 4 processes (≈ 160 ms/frame/process; ≈ 3,500 frames ≈ 3 min, ≈ 1.9 GB); lettering fixes first | RE pipeline | 15–30 min | $0 |
| 8 Scenes | reticle → ring-of-light aperture; giant numerals; `galaxy.js` → the 610-world contact graph; `war.js` → the Oko display / five tracks / burning night side; new sonar (B-59) and dark-forest scenes; coin-flip counter; Cyrillic in JetBrains Mono / Unbounded | RE engine | 2–4 days of agent time | $0 |
| 9 Review passes | 540p full render (≈ 30 min) → sheets every 0.5 s + crops → Gemini (4 chunks) → fixes; repeat 2–3× | §4 | ≈ 1 h per pass | ≈ $0.10 per pass |
| 10 Sound (optional) | only in the song's holes (cold-open static, the bridge's near-silence, a tail after the last "hold your fire"); song bit-identical | RE `sound_design.py`, RW2 `tools/sfx` | 2–3 h | ≈ $1 |
| 11 Masters | 1080p render ≈ 65–70 min in 60 s segments → CRF 12 mezzanines (frames deleted per segment); X 2-pass 12 Mb/s (≈ 25 min); YouTube 4K Lanczos 2-pass 45 Mb/s (estimate 1.5–2.5 h of CPU, not measured); a GitHub copy < 100 MB; `--verify` on 20 frames | §3.7 | ≈ 4–5 h | $0 |
