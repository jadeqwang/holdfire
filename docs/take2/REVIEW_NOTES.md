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
