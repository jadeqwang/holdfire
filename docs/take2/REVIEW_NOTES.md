# Take two: director's review notes (open items for the polish pass)

## Verse 2 (from g3's stills)
- V211–V217 Petrov: the map / СТАРТ / ghost overlays must fill the painted screen (pick `screen` quad ≈ [[358,164],[1530,164],[1530,652],[358,652]]) and sit BEHIND his head (occlusion: x ≈ 620–830, y ≥ 510).
- V217: the struck protocol sheet floats mid-room and covers the subtitle "ignored all previous instructions". Put it on the desk at the pick's `paper` quad (or a close-up), and never let a scene layer draw over the subtitle.
- V218 "WE'RE ALIVE": white type over a bright autumn sky is low-contrast; give it a shade or move it into the darker band.
- V206–V209 weapons: the brushed years (1132, 1288…) don't show when plate images are used (`p.imgs`); fix in `t2_ink_weapons`.
- V214: Veo drew a jagged red line on the screen from 0.75 s; zoom ≈ 1.12 crops it.
- V201: the audio ref was cut from the Kim stem; re-score its lag against work/stems/vocals.wav.
- Bridge: g3's poster plates (BR13–BR17) are unused; the procedural `t2_arkhipov` reads well, keep it unless a plate adds something (use style `newsprint`, not `halftone`, to keep the red).

## Bridge
- "let go" (2:38.10): needs the hands-off plate `BR_LETGO` (g2) cut in before the queen dive.
- The red seal on "found" (89.97) lands one frame before the cut to the weapons: let the scroll hold through the first weapon beat, or carry the sealed scroll under the smoke into V206.

## Build, drop, outro (from g4's stills)
- BU12–BU17 ("Hold your fire! Show your light!" roll): several frames render as the black placeholder ("t2_split (asset missing)") at 180.4, 181.7, 183.6 although g4 picked takes A/B: fix the split's plate resolution. Bloom washes the faces white (181.1): use the room look / lower bloom on these plates.
- BU09/BU10 "HOLD YOUR FIRE" is set in red over red/grey plates: red is for fire; set it cream/gold with a shade.
- DR03 (drop impact swing) reads as a ghosted smear under the whip: decide between g4's reveal still with a clean impact frame and the generated Seedance 2.0 orbit (DR03_swing); a swing must read in one look.
- DR11 lost the two-palette background (white with light rays). Acceptable — the mirror is gone — but check it against DR10.
- Lip-sync lags to confirm by eye on word strips: DR04 (+0.583, measured with g4's own mouth-crop script), DR16 (+0.958, legato).
- Off-model: teal-tips' irises read teal in DR03/DR04 (should be brown with a teal catchlight); BU04 hair reads brown under the red light (grade toward black).
- CO01/OU12 eye: the catchlight is a white disc; canon is a pale-blue dot catchlight (Jade). Check g1's CO01 and tint it in the plate grade if needed.

## Signal, choruses, post-choruses, bridge intercuts (from g2)
- P102: pass `ring: {cx: 970, cy: 267, rx: 148, ry: 32}` and `hide: [920, 1015]` to `t2_tower_bursts`.
- Chorus 2 CRT matrix: `variant: 'mirror'`, `inset: [{clip: 'CRT_roomA', at: [0, 1]}, {clip: 'CRT_roomB', at: [1, 1]}]`.
- Bridge: cut in BR_faceW / BR_faceB, BR_handW / BR_handB, BR_clock (slap at ≈ 0.5 s into the clip; cut before 2 s) and BR_LETGO (usable from clip 2.0 s for ≈ 1.9 s; short, on "let").
- Lags to confirm on word strips: all teal-tips lags were picked by eye from fixed-box strips (mouth detector failed under cool light), C203R especially (+0.917).
- Teal-tips' 1420 patch is on her right sleeve in P105, C103R, C108 (consistent with the mirrored room); accepted as the mirror logic.
- P107: the 5× push into her eye is soft at the end (720p source); end the push earlier or cross into a crisp eye still.

## End card (Jade, 26 Oct): credit humans and robots alike, as in rewind-take-two
rewind-take-two's model is its `tools/sectionF/edl.py` CREDIT / CREDIT_R: the song credit in one corner, one line per beat,
and in the other corner "Animated by Opus 5.5 / and a supporting cast of models:" with the models that actually made the cut.
Take two's end card (`t2_endcard`) should read, set on the beats after the final hit:
- **Hold Fire** · from the album *Rare Earth*
- Lyrics "by" Jade Wang (the quotation marks are Jade's)
- assembled by Opus 5.5 from a corpus of four books of poetry written by Jade Wang:
  *Inference*, *Petrov Test*, *Tao of Totality* (the Spaces Left Blank trilogy) and *Variations and Metamorphosis*
- Music by Jade Wang and Suno (Jade, 26 Oct: this replaces "Instruments arranged by Suno")
- Animated by Opus 5.5 and a supporting cast of models: the `cast` list in `render/data/t2/credits.json`, which
  `python3 tools/t2/credits.py` computes from the picks the edit actually uses (re-run it after the last pick change; bake-off
  losers don't appear), then the `support` list (stems, face tracking, transcription, the renderer).
- small: Fischer–Tal · Leipzig 1960 · ½–½; near-miss sources (National Security Archive, UCS, Chatham House, Atomic Heritage
  Foundation); fonts under the SIL Open Font License; no NASA/ESA imagery is used unless credits.json lists it.

## Polish pass 1 (35.5 s → 247.16 s; finishing editor, 26 Oct)
Final sheets: `work/t2/polish2_sheets/sheet_*.jpg` (0.5 s grid, 30 tiles each; before: `work/t2/polish0_sheets/`). Motion strips
(12 frames at 24 fps round 29 cuts): `work/t2/motion1/m_*.jpg`. New check: `render/tools/plate_windows.mjs` walks every frame of
every plate layer against plate meta `n` and the picks' usable windows. check_cuts: 0 cuts off onset, coverage OK, no type
rule breaks; chess_check OK (42 plies legal, final position as planned).

**Fixed**
- V211–V217: overlays mapped onto g3's `screen` quad; new `p.occ` in `t2_petrov_screen` (a chroma matte of the plate inside a
  head box) keeps his head and the lifted receiver in front of the map / СТАРТ / ghost. V217 protocol is now an insert on the
  desk (painting pushed 4× on g3's `paper` quad, sheet above the subtitle, lamp-lit); nothing draws over the subtitle.
- V214 zoom 1.12 (Veo's red line). V218 WE'RE ALIVE: full shade, no glow, warmer cream.
- V206–V209: `t2_ink_weapons` now brushes the year over generated stills too (1132 · 1288 · 1453 · 1916).
- V201 re-scored on vocals.wav: −0.125 confirmed (metrics agree). DR04 +0.583 and DR16 +0.958 confirmed on fixed-box word strips
  (`work/t2/sync/*_strip.jpg`); C203L −0.375 / C203R +0.917 / C208L / C209L / C209R re-scored: unchanged. P106 lag 1.18 → 1.263
  (eyes open 2 frames after "awake"), recorded in picks_g2.json + merged.
- P102 / DR14 tower rings from the measured crowns (+ `hide`). Chorus 2 CRT insets CRT_roomA / CRT_roomB. P107 rate 0.8 (stops
  short of the softest push frames); WE'RE AWAKE now leaves before the push.
- Bridge: BR_clock (press on the cut), BR_handB, BR_faceW / BR_faceB, BR_LETGO (from clip 2.0, on "that can") cut in as lettered
  inserts (BR01, BR02b–d, BR11b) so every later id is kept.
- Build: BU12–BU17 were not missing in this render (the g4 placeholders came from an earlier picks merge); hand-light shots use
  a low-bloom room look; BU04 graded toward black. HOLD YOUR FIRE cream with a full shade; SHOW YOUR LIGHT moved to the lower
  third; NUCLEAR DETONATIONS / SIGNAL LOST on dark plates, SIGNAL LOST held while Jade grabs the jog wheel.
- DR03: the swing is now two impact frames, a 3-frame capped whip and the clean reveal still (reads in one look). DR05/DR06:
  the palms touch on "too" (DR05 contact frame on the cut; DR06 at rate 0.8 no longer runs off its plate).
- Splits: teal-tips' half contrast/exposure matched to Jade's per split (C103, C203, C208, C209, BU12; cool tint kept).
- Counter: the 26 resets end on "The count"; 534 lands on "higher" (229.48) and holds.
- Subtitles never cross-fade into a double line. I'M COUNTING ON YOU raised above both heads.
- End card (Jade's wording, Music by Jade Wang and Suno): song credits above the title one per beat, models below from
  `render/data/t2/credits.json` (read at render time), ≥ 22 design px, eye frame clean at the end.

**Left**
- C203L starts 3 frames before its plate (lag −0.375 is right; the take's head is short): a held first frame.
- DR11's vanish holds DR06's last frame for 0.45 s under the flare (deliberate).
- DR11 lag −0.125 not confirmable (metrics disagree); C103L/R metrics disagree, strips agree with −0.25 (left as is).
- Teal-tips' teal irises in DR03/DR04 and the CO01/OU12 white catchlight disc are not graded (needs a matte or a regen).
- Plan-time notes: BR01 press at the fill's last 16th, BR13 dive "let"→"go", V218 on "We're" (all deliberate).

## Cold open and verse 1 (from g1)
- V103: pan [-270,-270] (zoom 1.5): the fin sits near the bottom edge now.
- V101 "OUT OF THE SEA": cream type barely reads on the pale dawn sky: darker type or a stronger shade.
- V117 FLOOD sits over the back of Jade's head: y ≈ 700 or smaller.
- OU12/OU13 reuse of CO01: the clip is 2.88 s, so the outro holds its last frame: play it slower, or ping-pong, or hold on the still `media/kf2/CO01_nbp_v1.jpg` with a JS push so nothing visibly freezes.
- Blueprint layers (fin bones, foot, egg → jar, seed cross-section, tally wedges, machines): wire the anchors recorded in each g1 pick's note.
- V122: the bright point barely moves in the plate: draw the ISS crossing with `t2_iss_pass` over it.
- V107: a stray hand with an object crosses at the end of the window, and the hand peels: trim the window or regenerate.

## Jade's notes
- (26 Oct, on preview v2) Cold open: the whispered "eight" is echoed (sung twice). Don't show a second 8 on screen; cut to the next image (the galaxy) on the beat instead. Same for the second count's echo.
- (27 Oct, 3:45) The days-since-last-reset board must count like a real roller counter: small numbers right-aligned in the ones
  place, leading wheels at 0, the low wheels rolling during the fast reset run while the high ones stay at 0. (Done in polish pass 2.)
- (27 Oct, on preview v2, timestamped)
  - Lip sync off at 0:13.6 (V101), 0:46.6 (P105), 0:57.4 (C103, both), 1:05.1 (C108), 1:58.8 (C203, both), 3:19.6 (DR11), 3:29.1 (DR16).
  - Jacket canon: 0:15.4 RARE EARTH missing from the back (V102); 0:46.6 decide whether teal-tips lives in a full mirror world; the arm patch sits on the same side as the blue dot and, when visible, in the middle of the orange stripe; 0:48.9 erase the arm patch; 1:05.1 blue dot on the other side, arm patch not visible; 1:54.9 teal-tips' back is missing the text and the blue circle; 1:58.8 and 2:09.0 teal-tips' patch placement; 2:08.4 "a good argument for making them actual mirror images of each other".
  - 0:15.5 the words go by fast: make every lyric visible, woven into the scenery the way rewind-take-two does it.
  - 0:31.8 the technology diagrams look unfinished: show them nearly complete rather than the first strokes.
  - 0:33.3 the ISS isn't recognisable to anyone who doesn't already know.
  - 2:47.1 more time on the rewind, galactic war included, so nobody misses it.
- Director's decision on the mirror (from Jade's 2:08.4 note): **teal-tips is Jade's true mirror image**. Every teal-tips shot is generated with the canon jacket (dot on the left chest, 1420 MHz patch centred on the left sleeve's orange band, RARE EARTH + pale-blue circle on the back) and then flipped left-right in the renderer, so her dot and patch sit on her right, her room is A mirrored, and her lettering reads reversed, as in a mirror. Jade's world is never flipped.

## Polish pass 2 (whole film, special care 0:00–0:35; finishing editor, 27 Oct)
Final sheets: `work/t2/polish2_sheets/p2final_00.jpg` … `_18.jpg` (0–35 s every 0.25 s, then every 0.5 s; stills in
`work/t2/polish2/final/`). Before: `p2before_*.jpg`. Build re-time: `p2build_*.jpg`; counter, every frame 3:44.3–3:53.2 at 1080p:
`p2counter_0…3.jpg`; motion strips (12 frames): `work/t2/polish2_sheets/m_*.jpg`. check_cuts: 0 cuts off onset, coverage OK, no
type rule breaks (5 plan-time deviations, all noted in shot notes); chess_check OK; plate_windows: only C203L / DR11 (as pass 1).
No paid generation in this pass ($0 of the $30).

**Fixed**
- Jade's echo note: no numeral on either echo; CO08 (galaxy) cuts on the beat after the echoed "eight" (6.706), the pull-back to
  the catchlight (CO16) on the beat after the echo whisper (11.857); CO16 rate 6.15 so the whole pull-back plays in the shot.
- Title in frame zero (HOLD FIRE up from frame 0, landing on the 0:00.2 sub with a hot flash); the end card holds the title to
  the last frame, set exactly as the opening title, tonemap off like the plate: the last frame matches frame 0 (mean diff 1.8/255).
- Outro CO01 reuse never freezes: OU12 plays the plate backward; OU13 + the end card are one linear pull-back (1.06 → 1.00) that
  lands on the opening framing at the last frame.
- Jade's catchlight: CO01 and OU12 carry a tracked plate-space fix (new `grade.fix` in `plate/layer.js`: modes `dot`, `iris`, `erase`,
  keyframed by plate frame, riding zoom/pan/rot): the white disc reads #8EC5FF-ish pale blue (measured 150,203,255 on screen).
- 0:07 red flash carries into the first rewind 16ths; CO12 lighthouse from the plate's first frame (beam, not glare); CO17 in 0.98 so
  her eyes open 3 frames after the 12.50 cut.
- V101 OUT OF THE SEA: cyanotype-ink type (no shade) reads on the pale dawn sky. V117 FLOOD: right of her head (x 830–1390, y 330),
  ink with a pale halo so it holds over the Okavango sky and the locomotive smoke.
- V103: punch-in on the fin (zoom 1.8, pan [−252, −351]); the bones lie along the fin, staged on the snare, the next snare and the beat.
  **V102 is being regenerated (mirror-world agent): re-measure the fin and V103's pan/fin_bones pos/rot on the new plate.**
- Blueprint anchors wired from the g1 notes: hand bones over V106's open hand (mirrored), egg→jar on the woman's jar (riding its
  drift), a tally count (one outline per eighth + a running dimension) over V113's wedges, the seed cross-section on V115 (riding
  the push), the four machines on their machines (riding the composites' 20 px/frame scroll; Saturn V in Klein-blue ink, as white
  lines vanished on the white rocket). New t2_blueprint options: fn zoom/pan/rot, `subjectFlip`, `arrive`.
- Jade's v2 notes: the machines (and HAND) now arrive ≥ 85% drawn and finish by frame 3 (`arrive`); FIN/FOOT have their first stage
  on the cut and finish well before the next cut. ISS (V123): a hero view of the station (~60% of the frame, slow push and a
  snowflake turn) with a white blueprint outline (truss, eight array wings, radiators, modules) and an ISS callout.
- Build re-timed (Jade: the rewind needs time and the galactic war): destruction tightened (impacts from "burn", dark by ~170.3);
  **moved**: BU04 console "Only" → "fall" (170.07, rate 3.0), BU05 rewind starts on "Only" (170.83), BU06 Earth whole "out" (173.25)
  → the beat before "all" (173.88); BU07's graph cut merged into BU06's pull-out (`reserve(1)`). The rewind is 3.05 s on a piecewise
  war clock: lights back, warheads lift off, the galaxy's dark worlds relight, tracks fall into silos and subs; Earth's node lights
  through "all". NUCLEAR DETONATIONS burn−0.05 → fall, SIGNAL LOST fall → "Only".
- V122: the plate's static bright point is erased (`erase` fix, core + spikes) and `t2_iss_pass` starts there and crosses.
- V107: only the clean window (plate frames 11–22: no spray can, no stone pick-up), then V107b on the beat: a push-in on the finished
  stencil (the departing hand cropped out).
- Counter (Jade, 3:45): between resets the board counts whole numbers from 0, 12 a second, in the ones place (capped at the real day
  count); the climb past 2025 rolls the low wheels into 0534 with the thousands wheel at 0. Checked every frame.

**Left / handed over**
- Teal irises (DR03/DR04, also P106/P107): recolour built and tested, then dropped on the director's mirror-world decision (all
  teal-tips plates are being regenerated). If a regenerated take still reads teal, `grade.fix` `{mode: 'iris'}` works; P106's measured
  keyframes were: `[{"mode": "iris", "col": [0.4, 0.26, 0.17], "track": [[37, 1010, 625, [18, 14]], [44, 1000, 600, [25, 24]], [56, 985, 590, [27, 27]], [74, 965, 575, [26, 27]], [96, 960, 570, [26, 27]]], "note": "teal-tips' irises read teal-green: recoloured to canon brown at their luma (catchlights kept); keyframes measured on the plate (polish 2)"}, {"mode": "iris", "col": [0.4, 0.26, 0.17], "track": [[37, 1120, 670, [20, 15]], [44, 1130, 650, [27, 26]], [56, 1135, 630, [29, 29]], [74, 1128, 615, [28, 28]], [96, 1126, 612, [28, 28]]]}]`.
- My subtitle band was reverted (the lyric-design agent owns the lyric type now).
- C203L (3 held frames) and DR11's vanish hold as in pass 1. Plan-time deviations: BU04/BU06 (above), BR01, BR13, V218 (pass 1).
- The locomotive outline is approximate on the painted engine (it reads as a schematic over it, not a trace).

