# Take two: QA of the 1080p master, RC2

File: `work/out/hold_fire_t2_master_rc2.mp4` (1920×1080, 24 fps, 5,932 frames, 247.17 s, H.264 CRF 14 at ~28.5 Mb/s, AAC
48 kHz stereo ~313 kb/s; 889.6 MB). Rendered in 12 s segments (`tools/t2/render_segments.sh`), audio
`media/audio/hold_fire_t2_mix.wav` (song + sound layer). Checked 28 Oct 2026.

**Verdict: not ready yet. Two cheap must-fixes.** All the RC2 fixes listed in QA_RC1.md are in and hold at 1:1. So do the
three new checks: the counter climbs, snaps and lands on 0042; the tablet shows one phrase per clip, all on the clay, with the
stylus pressing its wedges; the end card stays up to the end. The technical side is clean: sync, loudness, no drops or
freezes, segment joins invisible. The two must-fixes are a caption box that covers a sung lyric at 1:30.0 (also in RC1, missed
there) and a new one-frame black flash on the BR09 cut at 2:34.83, introduced by the new knights. Both are one-line edit or
camera fixes. After them, RC3 can go out without another full pass: a check of those two moments is enough.

**Method.** Cut list from `node tools/check_cuts.mjs` (171 shots; 0 cuts off onset, coverage OK, no type rule breaks). For every
shot, full-res frames at its first frame, 1/3, 2/3 and last frame (684 frames), on 29 sheets with the 4:5 lines marked. Every
lyric line at 35 % and 80 % of its sung window (148 frames, 25 sheets at 780 px per tile). Every frame of the counter
(3:44.00–3:50.30) and the tablet (0:25.37–0:27.32) at 1:1 and 2×. 1:1 crops of faces, patches, type and screens. `blackdetect`
(d ≥ 1 frame, pixel threshold 0.06), `freezedetect` (−66 dB, ≥ 0.5 s), `signalstats` YDIF and `scdet` over the whole film at
480×270. `ebur128` on RC2, RC1, the mix WAV and the MP3. RC2 audio cross-correlated against the mix WAV and the MP3 (four
30 s windows). Per-frame RC1-vs-RC2 difference (240×136 luma) to find every changed span, each changed span then looked at.
Frames went to the scratchpad and the bulk was deleted. The cited evidence (31 files) is in
`/tmp/claude-0/-home-user-holdfire/ded4b9cf-0527-5e2c-b4d7-9f3c07b3ec7f/scratchpad/qa_rc2/evidence/` (below: `evidence/…`).
The scratchpad is temporary, so re-pull any frame you want to keep.

## Technical

| check | RC1 | RC2 |
|---|---|---|
| container / video | 5,932 frames, 24/1 CFR, 247.167 s, High@4.0 yuv420p, 27.9 Mb/s | same; 28.5 Mb/s (+2 %) |
| audio | AAC LC 48 kHz stereo 313 kb/s, 247.160 s | same (320k asked, 313 delivered) |
| integrated loudness | −15.7 LUFS | −15.7 LUFS (mix WAV −15.7, MP3 −15.7; SOUND_T2: +0.0075 LU) |
| loudness range | 8.4 LU | 8.3 LU |
| true peak | −3.4 dBFS | −3.3 dBFS |
| A/V vs source | MP3: lag 0, r 0.9998 | **mix WAV: lag 0 samples** in all four windows (0–30, 100–130, 200–230, 217–247 s), r 0.9997–0.9999, residual −31.8 to −35.4 dB (codec). MP3: lag 0, r 0.997–0.9995 (the sound layer is the difference) |
| sound-layer sync | – | all 29 counter clunks start 0–17 ms after their reset time (the board snaps on the next film frame, ≤ 42 ms): in sync |
| black frames | 0:08.33–0:08.63, 1:13.00, 1:13.25–1:13.71, 1:14.08–1:14.29, 0:43.29, 1:48.04 | the same, **except the 0:08 rewind no longer reaches black** (by design since ea67304: it stops on the first spiral with its 1 lit) |
| frozen ≥ 0.5 s | none | none |
| segment joins (every 12 s) | – | no dropped or doubled frames. YDIF runs on across all 20 joins. `scdet` flags 3:24.00, which is DR14's burst on "too" (3:23.98), not the join |
| loop | last frame vs frame 0: 1.7/255 | 1.9/255 (grain) |
| render log | three `404 (Not Found)` | the same three per segment (63 lines in 21 logs), still not traced |
| colour tags | matrix bt470bg, primaries/transfer untagged | same |

**Provenance.** The 21 segments were rendered between 23:24 and 00:36 while commits landed. Segments 0 and 3–8 ran while
`RELEASE` was briefly `2026-11-01` (0fe88df → caba73a), but `RELEASE` only feeds `t2_counter` (segments 18–19, rendered at
00:11–00:15, after the counter code of 86c31da and with `RELEASE` back at 27 Oct). Segments 1–2 (the tablet) were re-rendered
after 5097aca. The file therefore matches 5097aca, and the RC1-vs-RC2 difference map shows changes only where RC2 meant to
change something (plus the BR09 frame below). Next time, clear the `.done` files whenever the code changes mid-render.

## Findings, most important first

1. **1:30.00–1:30.79 a caption box covers the sung lyric.** The V206/V207 caption "FLAMES ROSE, BURNING THEIR HANDS AND FACES
   · c. 850 CE" (`timeline.js` cue `kind: 'cap'`, `t1: weapons[2][1].t`) is still up after the cut to the 1288 weapon. Its dark band
   sits on "an end with no life" for the first 0.8 s of the line, so the first three sung words can't be read. RC1 has the same
   overlap (RC1 QA missed it). Fix: end the cue at the V206 cut (89.995), or move the band above the lyric. The caption also
   carries a comma (it is the warning's gloss, not a lyric, but it is the only punctuation left on screen). Evidence:
   `evidence/v206_overlap.jpg` (rows 1–2 RC2 at 1:30.10 and 1:30.60, row 3 clean at 1:30.90, row 4 RC1).
2. **2:34.83 one near-black frame on the BR09 cut (new in RC2).** The first frame of BR09 (f3716) opens with the camera inside a
   piece's mesh, almost certainly the new, thicker knight head: mean luma 39 against ~95 around it, only speed lines and the
   lyric on black. RC1 showed the board on this frame. In play it reads as a dark flash in the middle of the whip. Fix: start
   BR09's camera a few cm further out, or hide the knight's mesh for that frame. The RC1/RC2 difference map shows this is the only
   knight-and-camera collision in the bridge (every other bridge frame differs from RC1 by ≤ 4/255). Evidence:
   `evidence/br09_first.jpg` (top left RC2 f3716, top right RC1 f3716, bottom left f3715).
3. **3:56.9–3:58.5 Jade's sleeve patch reads "1420 MH5".** In OU11 (the back view at the array) the patch lettering is correct
   until 3:56.7, then the turn redraws the z as a 5 (and the patch slides from above the orange band onto it). This is
   model-made lettering going wrong on a canon mark. RC1 is the same. Fix: an `erase`/repaint fix on the patch for plate frames
   from 3:56.9 on, or end OU11 before 3:56.9. Evidence: `evidence/ou11_strip.jpg`, `evidence/ou11_rc1_rc2.jpg`.
4. **2:24.67–2:24.83 the lifting knight (3.Nc3) breaks up for 4 frames.** While White's knight leaves b1 it is in shadow and
   renders navy with jagged black/white shading bands. It reads as a glitch on a pause, and as a dark smear at speed (RC1 had the
   same with the old head). Related: at 2:25.9 White's a-file rook and a3 pawn sit in the same shadow and read navy, i.e. as
   Black's pieces. A brighter shadow tint for white material (or moving that shadow) fixes both. Evidence:
   `evidence/knight_lift.jpg`, `evidence/chess_rc1_rc2.jpg` (top RC2, bottom RC1).
5. **1:42.1–1:43.0 teal-tips' face is clipped white in V218 ("WE'RE ALIVE").** Cheeks and forehead are at 252/251/251, so the
   face is lineart on white with no skin tone. RC1 is the same (RC2 a touch brighter after the upscale: cheek 177 vs 170). A plate
   grade (gain −10 %, or a highlight roll-off) brings the skin back. Evidence: `evidence/v218_rc1_rc2.jpg` (left RC1, right RC2).
6. **2:30.3–2:33.3 bridge impact lyrics run outside the 4:5 area.** "any world that lights a spark" (BR04) and "is lighting its
   own death" (BR06) are set at 100–104 px and span x ≈ 320–1590, so a 4:5 crop cuts them. RC1 is the same. Also at 2:34.79–2:34.83
   the CHAINS slam now keeps the space after AND (RC1's "ANICHAINS" is fixed) but for 2 frames its S runs into ARE ("CHAINSARE").
   Evidence: `evidence/safe_br.jpg`, `evidence/chains_slam.jpg` (left RC1, right RC2).

## RC2 fixes and the three new checks

- **#1 counter (3:44.33–3:50.04): passes.** Every frame was checked against the 29 reset dates (`nearmisses.json`, grid from
  `counter.js schedule()`). Each interval climbs to the true day gap on the frame before the next reset (1,649 · 2,785 · 129 · 973 · 111 · 639 · 1 · 1 · 1,178 · 491 ·
  243 · 47 · 75 · 1,981 · 1,986 · 221 · 207 · 104 · 4 · … · 4,097 · 4,600 · 1,150 · 4,155 · 1,158 · 123 · 217 · 153), snaps to
  0000 on each reset frame with the right year card, and the roll lands on **0042** (2026) at 3:49.50 and holds to the cut. Red
  flashes are ≤ 2 frames, with ≥ 2 clean frames between. One interval (1980-09-19 → 1983-09-26, 1,102 days) is one frame long, so
  it shows its 0 and never its gap, as `climbAt` intends. Evidence: `evidence/cnt_00.jpg`, `cnt_01.jpg`, `cnt_02.jpg` (every frame).
- **Tablet (0:23.41–0:27.32): passes.** "CARRIED THE EGG THROUGH" in the sky over the mud-brick street (V111), "THE DUST" incised
  in the cart road (V112), "AND THE MUD" pressed into the clay under the Nanni line (V113): one phrase per clip, never two at
  once, all of it on its surface. The first touch-down (25.79, plate frame 14) presses 89's sixties wedge under the tip, growing
  down as the stylus slides. The second (26.96, frame 42) presses the last unit wedge of 29. Glyphs to the right of the first
  touch are under the finger and appear as it lifts (disocclusion, correct). The small reed wedge before AND is the `wedges`
  mark and reads as an impression. Evidence: `evidence/tab_td1.jpg`, `tab_td2.jpg`, `tz1.jpg`, `tz2.jpg`, `tab_upper.jpg`,
  `mud_dust.jpg`, `dust_1x.jpg`.
- **#2 end card: passes.** The whole card is up by 4:04.26 and the credit area holds steady from 4:04.17 to 4:07.08 (no fade; only the slow 1.06 → 1.00 pull-back moves it).
  Only the last frame (4:07.125) is the clean opening frame (loop 1.9/255). The models sit in whole rows: Seedance 2.5 · Seedance
  2.0 · Veo 3.1 / Nano Banana Pro · P-Image Upscale · FLUX Video Upscale / BS-RoFormer · Whisper · Parakeet / GPT-4o Transcribe ·
  Grok STT · MediaPipe. All lines are inside the frame, with no typos. "Hold your fire" ends on OU13 and is not on the card.
  Evidence: `evidence/end_top.jpg`, `end_bot.jpg`, `end_f5930_full.jpg`, `end_f5931_full.jpg`.
- **#3 soft sung shots: fixed.** At 1:1 the FLUX-upscaled faces (V101, P105, P106, C103, C108, C203, DR04, DR11, DR16) have crisp
  black lineart, clean lashes and no ringing halos. The cel look is kept and no detail is invented. The splits' teal-tips halves
  match RC1's grade. Evidence: `evidence/faces_1to1.jpg`, `tealtips_faces.jpg`.
- **#4 Petrov readout: fixed.** ДОСТОВЕРНОСТЬ / ВЫСШАЯ sits right of his head, whole, through 1:35.4–1:36.7. Evidence:
  `evidence/petrov_were.jpg`.
- **#5 knights: fixed** as designed (ears, mane, eyes, 3/4 to the lens on the a-file insert). See finding 2 for the one camera
  collision. Evidence: `evidence/knights.jpg`.
- **#6 riso screens: fixed.** P101's darks no longer boil, and DR14's 9 px screen reads as a regular screen. Evidence:
  `evidence/fixes_1to1.jpg`.
- **#9 LIGHTS A SPARK: fixed** (the space before SPARK holds on every frame). See finding 6 for CHAINS/ARE. Evidence:
  `evidence/spark.jpg`.
- **#10 WE'RE: fixed** (full shade, the apostrophe and R hold over the tube). Evidence: `evidence/petrov_were.jpg`.
- Not touched, as planned: #7 (the DR03 two-frame negative, unchanged), #8 (scroll tilt), #11 (CRT micro type).

## Checks that passed

- **Lyrics:** every sung line was checked at two points. There are no typos and no commas, periods, colons or exclamation marks
  in any lyric. Apostrophes and hyphens are kept. "If you are" and "I'm counting on you" are never on screen together, "And you
  were seen too" and "wherever you are" are on separate clips, and there are no count lyrics on the chess board. Every
  shout is without its "!" (Counting on you, Hold your fire, Show your light). Each line is up ≥ 0.6 s per word (`check_cuts`).
- **Jacket canon:** RARE EARTH and the pale-blue circle are on the back wherever the back is seen (V102, BU, OU11). Flipped
  teal-tips shots carry dot and patch on her right with mirrored lettering (P105–P107, C103R, C203R, C208R, C209R, X213). DR11 is
  now right (teal-tips' dot on her right). DR03/DR04/DR16 two-shots are unflipped, as the director accepted.
- **Faces and big type:** heroes (OUT OF THE SEA, FIN/FOOT/HAND, FLOOD, WE'RE AWAKE, CAN'T BE SURE, I'M COUNTING, WE'RE ALIVE,
  HOLD YOUR FIRE, SHOW YOUR LIGHT, YOU WERE COUNTING TOO, the counts, the counter) and faces are inside x 528–1392, except the
  bridge lines in finding 6 and the exceptions LYRICS.md lists.
- **Cuts:** no seam or flash frame on any of the 171 cuts other than finding 2. The dark dips at 0:43.29 and 1:48.04 and DR03's
  two impact frames (3:08.38–3:08.42) are by design.
- **Compression at 1080p:** no blocking or banding in the dark gradients (CO01 eye, CRT rooms, galaxy), on riso/halftone
  screens or on the fine phyllotaxis/coin/graph lines. Grain dithers the darks at CRF 14.

## Ranked list

| rank | item | time | evidence |
|---|---|---|---|
| **must-fix** | caption box over "an end with no life" (end the cap cue at the V206 cut) | 1:30.00–1:30.79 | `evidence/v206_overlap.jpg` |
| **must-fix** | one near-black frame (camera inside a knight) on the BR09 cut, new in RC2 | 2:34.83 (f3716) | `evidence/br09_first.jpg` |
| should-fix | OU11 sleeve patch garbles to "1420 MH5" | 3:56.9–3:58.5 | `evidence/ou11_strip.jpg`, `evidence/ou11_rc1_rc2.jpg` |
| should-fix | lifting knight (Nc3) breaks into shading bands for 4 frames; White's a-file pieces read as Black's in shadow | 2:24.67–2:24.83, 2:25.9 | `evidence/knight_lift.jpg`, `evidence/chess_rc1_rc2.jpg` |
| should-fix | teal-tips' face clipped white | 1:42.1–1:43.0 | `evidence/v218_rc1_rc2.jpg` |
| should-fix | bridge impact lyrics outside the 4:5 area; CHAINS slam touches ARE for 2 frames | 2:30.3–2:33.3, 2:34.79 | `evidence/safe_br.jpg`, `evidence/chains_slam.jpg` |
| fine as is | golden-record legend carries a ~12 px Sagan quotation with punctuation (texture, unreadable in play; strictly against the plan's no-quotations rule) | 0:54.3–0:56.6 | `evidence/c102_legend.jpg` |
| fine as is | V214: Veo's jagged line still shows top left above zoom 1.12 (reads as a trace on the alarm screen; RC1 same) | 1:36.7–1:37.9 | `evidence/v214_pair.jpg` |
| fine as is | the 1983 Petrov interval is one frame, so the board never shows 1,102 | 3:47.5 | `evidence/cnt_01.jpg` |
| fine as is | the cold-open rewind no longer reaches black (by design, ea67304) | 0:08.2–0:08.6 | – |
| fine as is | colour primaries/transfer untagged (as RC1; tag bt709 on the upload encode if a platform shifts colour) | – | – |
| fine as is | 404s in the render log (three per page load, as RC1; no missing picture seen) | – | `work/out/seg_hold_fire_t2_master_rc2/s_*.log` |

## RC3 fixes (28 Oct 2026)

All seven findings are fixed, none skipped. `check_cuts`, `chess_check` and `lipcheck` pass (exit 0). The new
`render/tools/chess_lens.mjs` also passes: for every frame of every t2_chess shot, the lens is never inside a piece or chain link,
or within 0.07 of one. Before/after sheets are in `work/stills/rc3_compare/` and the 1080p stills in `work/stills/rc3_before/`
and `work/stills/rc3_after/`.

| # | fix | files |
|---|---|---|
| 1 | The FLAMES ROSE cap now ends at the V206 cut (`t1: LN('V2', 3).t` = 89.995) and fades over 89.80–90.00, so it never shares a frame with "an end with no life". The other fact captions were checked and are clear: NUCLEAR DETONATIONS and SIGNAL LOST sit under BURN AND FALL, 26 SEP 1983 / SERPUKHOV-15 sits above the terminal panel, and 217 LIGHT-YEARS sits above "a one-way dialogue". Note: `check_cuts` now lists this cap as a soft type-rule break (10 tokens in 2.61 s = 3.84 w/s; "c. 850 CE" counts as three words). It cannot hold longer without overlapping the lyric, and the plan puts it on the 1:27.39 row only. | `render/src/timeline.js` |
| 2 | BR09's first frame (f3716) had the lens inside captured knight 25 (the chain flight passes 0.59 beside the lens, and the thick head reaches it). `state.js` now drops a chain-flight piece on any frame where the lens is inside its bounding capsule (pieces.js extents + 0.1). Only f3716 meets this condition; the frame now shows the board, chain and links. `chess_lens.mjs` checks every chess frame against the real meshes, with the vertex smear included. Every chess shot's first and last frames now have mean luma ≥ 58 (RC2 f3716: 26). | `render/src/scenes/t2/chess/state.js`, `render/tools/chess_lens.mjs` (new) |
| 3 | OU11 patch: a new `t2_plate` grade fix, `mode: 'patch'`. Each OU11 plate frame (4–140, i.e. the whole shot) has a tracked inner disc: the patch's bright paper region with the lettering filled, fitted as an ellipse from its moments. The track is smooth and never lost. The disc is refilled from its own rim, so the sleeve shading is kept, and the renderer then draws "1420 / MHz" (Archivo 900), squashed and turned with the disc. It follows the arm on twos because it is keyed to the plate frame shown. Set through `picks.py -g g4 set OU11 … --set grade=…`. | `render/src/scenes/t2/plate/layer.js`, `docs/take2/picks_g4.json` → `render/data/picks2.json` |
| 4 | Knight lift: the jagged shading was the vertex smear tearing the flat-shaded mesh. Outside the battle, the piece being moved (and a castling rook) is no longer smeared. Set drops, captured pieces in flight and the battle keep the smear. Hand shadow: a piece in the shadow now keeps its own material (a shallower band step, a shadow band of its own mid tone ×0.62, ×0.75 overall, no rim or spec) instead of dropping to White's lavender shadow band. White's a1 rook and a3 pawn now read as white in shade. | `render/src/scenes/t2/chess/chess.js` |
| 5 | V218 shot `p.grade {gain: 0.9, gamma: 1.1}` rolls off the highlights. Her face goes from 235/225/222 (69 % of pixels ≥ 250) to 224/202/182 (0 % clipped), and her pale-blue dot shows again. | `render/src/timeline.js` |
| 6 | BR04 and BR06 impact lines now use `maxW 860` with breaks ("ANY WORLD THAT / LIGHTS A SPARK", "IS LIGHTING / ITS OWN DEATH"), so they sit inside x 528–1392. | `render/src/lyrics2.js` |
| 7 | Impact slams: while a word's slam overshoots, the unsung words after it go on their own layer, and a 0.12 em gap is cut around the slamming word (stroke and offset shadow). At f3715/f3716, CHAINS and ARE no longer touch. Frames with no landing slam are drawn exactly as before. | `render/src/scenes/t2/lyric/styles.js` |

**Song-time ranges that render differently.** Each segment below was rendered before (HEAD 379c830) and after at 960×540, and
compared frame by frame (luma difference > 24 on > 30 px):

| segment | covers | changed frames |
|---|---|---|
| 7 | 84–96 | 89.875–90.917 (cap gone from V206/V207) |
| 8 | 96–108 | 102.083–103.000 (V218 grade) |
| 11 | 132–144 | 142.917–142.958 and 143.917–144.000 (hand shadow; ≤ 402 px) |
| 12 | 144–156 | 144.000–156.000 in nine spans (moves without smear, hand shadow, BR04/BR06 type, CHAINS slam gap, f3716) |
| 13 | 156–168 | 156.000–157.583 and 157.750–158.167 (slam gaps on line 49, hand shadow in BR11b) |
| 19 | 228–240 | 233.208–238.500 (OU11 patch) |

Re-render segments **7, 8, 11, 12, 13 and 19** (72 s). No other segment changes. Nine stills in other segments (20.5, 47.9,
66.0, 100.9, 118.0, 176.0, 200.0, 215.0, 244.5) are pixel-identical to HEAD. The `layer.js` patch branch only runs for a
`mode: 'patch'` fix.
