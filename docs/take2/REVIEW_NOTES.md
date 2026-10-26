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
