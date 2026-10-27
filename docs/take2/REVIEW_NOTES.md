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


## Director, after polish pass 2
- CO01/OU12 catchlight: the new pale-blue disc sits on top of the plate's white catchlight and reads as a big double bubble. Recolour the existing white catchlight to pale blue #8EC5FF in place (same size and shape, keep a tiny white core), no extra disc.

## Director, on the lyric layer (first look)
- V101: "WITH SALT IN OUR LUNGS" tucks under THE SEA; give it its own clear line below the hero.
- 24.0–25.4 the words pressed into the dusty road read low-contrast on a phone; deepen the emboss/shadow or add a faint ink fill.
- 27.9 "SEEDS I…" sits on the bottom edge; lift it into the safe area.
- Check every lyric line at 540p on the next full render: legible in under a second, never over a face.

## After the mirror regeneration
- Director: accepted the two-shot exception: in frames that hold both Jades (DR03, DR04, DR16) nothing is flipped; teal-tips wears the mirrored jacket (dot and patch on her right) in the keyframe itself.
- C209: grade the right half like C103's right half (it's lit hotter than C209L).
- P107: her lips part slightly at ~1.3× into the push; end the push before that or hold the eye still sooner.
- Weak lip sync still: C209R, C209L, DR04, C103R (low/medium); C203R, DR16 medium.

## Polish pass 3 (finishing editor, 27 Oct)
Preview: `work/out/preview_540p_v3.mp4`; sung-shot reel for Jade: `work/out/sung_reel_v3.mp4` (every shot that uses an s0 pick,
window ±0.5 s cut from v3 with the song, labelled shot · time · lyric). Sheets: `work/t2/polish3_sheets/` (`full_sheet_00…13`:
the whole film every 0.5 s at 960×540; `lyrics_sheet_00…05`: every lyric line at 960×540 at its start, middle and end;
`catchlight.jpg`, `p107.jpg`). check_cuts: 0 cuts off onset, coverage OK, no type rule breaks; chess_check OK; lipcheck: 16 picks,
0 mismatches (no lag changed); plate_windows: C103L (1 held frame, the take's head; as LIPSYNC.md) and DR11's vanish hold
(deliberate). $0 generation.

**Fixed**
- CO01/OU12 catchlight: the `dot` fix now recolours only the plate's own white disc, inside its measured edge (centre and radius
  measured every 4 plate frames, r 75→84 px through the push), to #8EC5FF on screen (measured 144,200,252), with a tiny white core
  (0.12 r) and the plate's soft halo tinted to the same hue. No disc is added; size and shape are the plate's. (`layer.js`: `core`,
  `glow`.) The small secondary glint beside it is the plate's own drawing, left as painted; if it still reads as a double bubble,
  an `erase`-style fix on it is the next step.
- Lyric layer (director's first look): V101 WITH SALT / IN OUR LUNGS has its own block under the hero, left of her hair; the
  dusty-road words (V112) and the clay tablet (V113) are ink-filled recesses with a deeper shadow and a dark ground (they read on a
  phone); SEEDS IN THE DARK on V114 lifted to y 760; on V116/V117 it sits above her head.
- Legibility pass, every line at 540p: bigger type on the one-way dialogue, the pulsar line (lifted off the bottom), the C101
  sky, the record legend, the Petrov terminal, the ticker tape, the chalk, the war display, Link by link (moved to the top,
  clear of the edit's 13 21 34); the C103/C203/C209 CRT readout moved to chest height (it sat beside both mouths); the C108
  monitor-bank text moved off her headphones; V201 brush on a paper halo; BURN, AND FALL on a dark panel (the console is lit
  red); BR01/BR02 chalk moved off teal-tips' head, BR02c/d on one row above the face; DR01's glass copies moved outside each
  walker (they crossed both heads; outside the 4:5 area, like DR02's); DR02's mirrored copy off the ghost's head; DR04 on a
  white halo; DR14 lifted above the edit's 55 89 with a stronger ground; HOLD YOUR FIRE (BU12) given a ground. Lines that leaked
  into the next picture now end at the cut (29 → WE'RE ALIVE, 33 → chorus 2, 56 → the HOLD shot, 72 → the eye). The edit's
  heroes too: 26 SEP 1983 raised so the terminal no longer covers SERPUKHOV-15; WE'RE AWAKE on one row above her brow (it sat on
  her forehead).
- C209: right half graded exactly as C103's right half (RM 1.18 / 1.02, was 1.25 / 1.18).
- P107: plays the plate's frames 0–17 only (her lips stay shut; they part on frame 18) with a JS push about her near eye, and
  cuts on the roll's third eighth (50.21) to the new insert P107b, the crisp eye still (the plate's last frame) pushing in to
  the downbeat. No later id changes.
- Full-film check (495 stills): every flipped teal-tips shot (P105–P107, C103R, C108, V201, V218, C201R, C203R, C208R, C209R,
  BR_handB/faceB/clock, BU12R/14/17R) shows dot and patch on her right with reversed lettering and the mirrored room; DR03/DR04/
  DR16 unflipped. No placeholders, black frames (except the cold open's rewind-to-black, by design) or freezes.
- `plate_windows.mjs`: P106's usable window was the old take's (its tail was the P107 push); the m5 take is clean to its end.

**Left**
- **DR11 (3:19–3:21) breaks the mirror rule**: both Jades wear the canon jacket (teal-tips' dot and 1420 patch on HER LEFT,
  lettering readable). It is a two-shot (not flipped, like DR03/DR04/DR16), but its keyframe was never repainted. Needs the
  keyframe's teal-tips repainted with the mirrored jacket and a new Seedance take on the same aref (≈ $1.5), or accept it.
- Weak lip sync still as listed after the mirror regeneration (C209R/L, DR04, C103R; C203R, DR16): no lag changed in this pass.

## Polish pass 4 (finishing editor, 27 Oct): the confirmed findings of the v3 outside review
Source: `docs/reviews/t2_v3_review_summary.md` (DR11 was already fixed there). Stills: `work/t2/polish4/fixed/` + sheets
`work/t2/polish4_sheets/fixed_0…1.jpg` (every fixed moment, 960×540, laid out at 480 px wide = a phone); every lyric line at a
quarter and at 70 % of its window (134 stills, phone-width sheets); full pass every 1 s (247 stills, sheets of 36); 12-frame motion
strips `work/t2/polish4_sheets/m_225.0 … m_227.6.jpg` (counter) and `m_110.0 … m_111.9.jpg` (coins / tree). check_cuts: 0 cuts off
onset, coverage OK, no type rule breaks; chess_check OK; plate_windows: C103L (1 frame) and DR11's vanish hold, as before; lipcheck:
16 picks, 0 mismatches. No lag changed, $0 generation.

**Fixed**
- Lyric legibility (systemic, `lyric/styles.js`): unsung words now wait at ≥ 50 % in the line's own ink (`GHOST`; was 13–32 %, or
  nothing for impact / OSD / typewriter / whisper), so a line reads whole while it is up; sung words are full and the word being
  sung is brightest (light: whitened while sung). Thin faces are thickened with a same-ink stroke (`boldWord`): light, glass,
  whisper, engrave, brush; chalk 1.6× thicker with less tooth; blueprint ghosts are half-ink fills under the dashed outline; incise
  ghosts are filled; the `shade` ground now sits under unsung words too. Every treatment checked at 540p on a 480 px view.
- Placements (`lyrics2.js`): 0:53 line off the galactic core (two rows under the hero, x 548, shade 2); 3:04 white-void line above
  both walkers' heads (they cross x 400–840 during DR01), DR02's copies 30 px further out; Petrov terminal raised 40 px (title-safe),
  26 SEP 1983 / SERPUKHOV-15 raised 50 px to stay clear of it; 0:46.7 "Hear it…" 40 px left (off her hair); 3:16 Link by link
  lifted 50 px off the disk; 3:25 constellation line on a dark ground; 3:28 CRT readout moved onto the window glass top right
  (clear of both figures; outside the 4:5 area); chorus-2 CRT line 64 px, anchored by its last baseline.
- 1:50–1:52 (`data/coins.js`, line 33): the 2^100 number is 52 px (was 36), bright, on a dark band over the coins, typed in 0.8 s and
  held 0.7 s into the lift (fully readable ~1.1 s); "the only road from here to you" on a soft dark plate (new `plate` option) so
  the coins flying up no longer cover it.
- 3:46.9–3:48.1 counter (`data/counter.js`, `data/lib.js`): the red flash is frame-indexed, ≤ 2 frames each with ≥ 2 clean frames
  between (a reset that lands sooner snaps the board without a flash; measured on every frame 3:44.25–3:48.5: max red run 2, min gap 2);
  the tear's tail is one faint frame; the digits and the year card sit in an untorn window (`keep`) through every flash, and SIGNAL
  LOST moved above the sign, so the count and the year read on any paused frame.
- Type collisions: 0:26 tally bracket above the wedges (it crossed CARRIED); 1:16 numerals get a soft dark ground (`scrim`), the
  graph edges dim under them; 2:55 BU08's scroll laid 200 px right (colX 1310) so HOLD YOUR sits left of the kanji column; 3:16 the
  disk's corner legend is off for DR10 (`hud: 0`: it repeated LINK BY LINK in micro type); 3:25 as above.
- 2:14–2:16 Earth lights (X201–X203, picks_g2.json → picks2.json): a light riso pass (earth inks, amt 0.4) so the photographic
  lamp / window / street plates read as the film's signal print into t2_earth_night.
- Micro type: the pulsar diagram's two ~6 px captions dropped (`pulsar.js` p.notes false; take one unchanged); SIGNAL LOST at 2:50
  is 72 px (was 30), NUCLEAR DETONATIONS 46 px, their plates scale with the type; end card model lines 32–34 px (names), 28 px
  (support), arriving one per 32nd so the last is in ~0.7 s after the first beat, and the small print now stays inside the frame.
- 0:08 black: the rewind runs two more 16ths (back to the first spiral, all seven clips) and reaches black 7 frames before the match
  (was 15). Plan-time deviation: the plan says black "on the bar line".

**Left**
- Lip sync on C103 / C203 / DR16 (item 8): needs the regenerations LIPSYNC.md lists (paid); not touched.
- The CRT readouts at 0:57 / 1:58 stay at chest height (only 3:28 was asked to move).

## Jade's notes on v3 and sung reel v4 (27 Oct)
- Lip sync still off: 0:14.4 (V101), 0:46.6 (P105), 0:57.4 (C103: teal-tips synced, Jade not), 1:05.1 (C108, words right but slightly off), 1:58.8 (C203 both), 2:06.3 (C208: teal-tips off, Jade in sync), 3:08.8 (DR04), 3:19.6 (DR11), 3:21.0, 3:28.6 (DR16: she's already singing "you are" at the cut instead of "wherever"). Many were fixed in sung reel v4, not all → a lip-sync picker artifact: per shot, lag variants a little earlier/later; Jade picks the one that matches.
- 0:57.4 suggestion: in the splits, the left sings one line and the right the other.
- Lyrics: drop the comma after "if you are"; generally drop punctuation (1:50.2, 1:52.9 period, 2:00.7 comma); no exclamation marks (1:16.8 "counting on you", 2:58.3, 3:01.2); 2:10.1 "if you are" on one screen, "I'm counting on you" on the next; 3:24.3 "you were seen too" and "wherever you are" on two different clips; 2:20.6 no "One! One! Two!" subtitles in the chess section.
- 0:34.1 the snowflake: a camera a little farther away would read more like "a snowflake in the boundless night".
- 1:43.5 the near-miss list: check the news between the last entry (May 2025) and today, e.g. something at the Strait of Hormuz about a hallucinated target.
- 2:26.5 chess: the board must match the previous frame's position, and she picks up an actual piece and makes the next move.

## Jade's notes on v6 (27 Oct)
- 0:26.1 the cuneiform should say something real if someone pauses: the lyrics, Fibonacci, or Ea-nasir's copper complaint → Fibonacci in real sexagesimal cuneiform numerals (Ea-nasir only if verifiable).
- 0:48.2 "awake" reads like "awaawake" → P106 retake.
- 1:50.5 stamp the non-validated years on the coins too, so a pause shows we're nearly halfway through the hundred flips.
- 4:05.9 keep the credits on screen (no fade); put the video models on one line or two per line.
- Approved: spend on sharpening/upscaling the 720p sung takes.
