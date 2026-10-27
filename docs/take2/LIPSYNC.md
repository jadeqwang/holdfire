# Take two: lip sync (pass of 27 Oct, after Jade's preview-v2 notes)

Jade flagged lip sync at 0:13.6 (V101), 0:46.6 (P105), 0:57.4 (C103 L+R), 1:05.1 (C108), 1:58.8 (C203 L+R), 3:19.6 (DR11),
3:29.1 (DR16). Reel to judge by ear: `work/t2/lips/all_sung.mp4` (every sung shot from the actual renderer at its chosen lag,
song muxed, labelled with the takes and lags); one clip per shot in `work/t2/lips/<SHOT>.mp4`.

## The systematic finding

**There is no time offset in the chain.** Checked end to end:
- every `media/aref/*.mp3` decodes sample-exact onto `work/stems/vocals.wav` at its S0 (0.00 ms, corr ≥ 0.91; the 25 ms LAME delay
  is trimmed by the gapless tag); stems, `work/audio/song.wav`, `inputs/Hold Fire.mp3` as `render.mjs` muxes it, and the preview
  v2 audio all line up to the sample; the review page's HLS adds only the 21 ms AAC priming it already compensates;
- every s0 plate has `start` 0 and the take's full frame count, and plate frame k is take frame k (image match 0.9999);
- the renderer draws exactly `plateFrame`'s frame: rendered stills matched to plate frames, and `render/tools/lipcheck.mjs` logs the
  frame t2_plate drew at every word onset of every s0 pick through splits and mirrors (0 mismatches).

**Bug fixed (tools/sync):** the sync tools held drawings on even *clip* frames (`f = floor((t − s0 + lag)·24); f −= f % 2`), while
the renderer holds even *film* frames and then maps into the clip (`ff −= ff % 2; f = floor((ff/24 − s0 + lag)·24)`). With S0 off
the 24 fps grid (11 of the 12 arefs), every lag curve, word strip and remouth unit was scored on frames up to one frame away from
what is played, changing drawing on the other film frame. `tools/sync/common.frame_on_twos` is now the renderer's rule (plus plate
`start` and clamp), used by `lag_curve`, `wordstrip`, `t2sync`, `remouth` and the new tools.

**Measurement bias (the reason most notes landed):** the previous lags came from the anime-cascade / skin-colour mouth metrics
(they miss teal-tips under the cool fluorescents, so those lags were picked by eye on fixed-box strips) and from envelope
correlation on legato lines (twin peaks). Re-measured with a hand-placed, ECC-tracked mouth box, every pick whose take was kept
moved **the same way, +1 to +6 frames** (V101 +1, DR16 +1, C103R +4, P105 +6, C209R +6): the played mouths were *late*, audio
leading. Viewers notice that direction first (audio-early asynchrony shows at ≈ 45 ms, audio-late only at ≈ 125 ms). **Rule:** when
the strip can't decide between two lags, take the larger one, so the mouth is a frame early and never late.

**The rest are take failures that no lag fixes:** C103L never sang "you" (the 0:57.4 note), C203R idles with its mouth open through
"if you" (1:58.8), C108 flaps on a ≈ 0.25 s cycle that doesn't follow the words (1:05.1), and DR16 opens slowly into "you" and
holds open through "are" (3:29.1).

## Shots

Lag = clip t − (song t − s0), in s (frames at 24 fps). Method: *lag* = same take, new or confirmed lag; *regen* = new Seedance take
(labial-cue prompt, same keyframe and aref); *keep* = unchanged. Confidence is from the mouth line (closures on b/m/p and in rests,
open vowels, one lag holding from the first to the last word), not from r.

| shot | voice | take | method | lag | was | conf. | note |
|---|---|---|---|---|---|---|---|
| V101 | A | t2 | lag | +0.042 (+1) | 0 | med-high | r 0.60, same lag in every sub-window; the s-closures on "sea"/"salt" sit on the stem. Mouth only half-open on "Out of the" (the likely 0:13.6 complaint). Regens t5/t6 and a remouth were not better; alt t6 at +1.125 articulates "of the sea" best but never sings "Out" |
| P105 | B | t1 | lag | +0.250 (+6) | 0 | medium | it / know / we're line up; little articulation on "Hear it and you'll" |
| P106 | B | t3 | keep | +1.263 (+30) | | medium | held "awake": lag set by the eyes opening |
| C103L | A | **t4** | regen | −0.375 (−9) | t1 −0.25 | medium | sings "you" on time (r 0.40, was 0.17); closes part-way through the held "are"; holds frame 0 for 2 film frames |
| C103R | B | t2 | lag | −0.083 (−2) | −0.25 | low-med | "you" was 0.17 s late; later lines drift as she turns |
| C108 | B | t2 | keep | +0.125 (+3) | | low | flaps out of phase: regen (teal-tips agent) |
| V201 | B | t2 | keep | −0.125 (−3) | | high | r 0.52, no drift (re-scored on the RoFormer stem; the Kim-stem aref is sample-aligned) |
| C203L | A | **t3** | regen | −0.042 (−1) | t1 −0.375 | medium | "you" lands on the frame (1:58.8); brief closure mid "are", "I'm counting" held open |
| C203R | B | t1 | keep | +0.917 (+22) | | low | idles open on "if you": regen (teal-tips agent) |
| C208L | A | t2 | keep | +0.042 (+1) | | med-high | closures on the b of "breathe" and the m of "somewhere"; regens t3/t4 not better |
| C208R | B | t1 | keep | 0 | | medium | same pattern as C208L |
| C209L | A | t2 | keep | +0.833 (+20) | | low | open through "If you" with no closure between words; t3 pushes in, t4 shuts on "are", remouth no gain |
| C209R | B | t1 | lag | +0.083 (+2) | −0.167 | low | "you" was 0.25 s late; held "are" unarticulated |
| DR04 | B | t2 | keep | +0.583 (+14) | | low-med | profiles; metric noisy |
| DR11 | A | **t4** | regen | −0.167 (−4) | t1 −0.125 | med-high | closures on "we" and the w of "would've", open on "never"/"here" (t1 was late on "never"); aref `DR11_v2.mp3` mutes the "Fifty-five" choir |
| DR16 | B | t2 | lag | +1.000 (+24) | +0.958 | med-low | the "-ev-" closure was 0.1 s late; legato: regen (teal-tips agent) |

Regeneration: 12 Seedance 2.5 takes (V101 t5–t6, C103L t3–t4, C203L t3–t4, C208L t3–t4, C209L t3–t4, DR11 t3–t4), $14.33,
logged in `takes_g1/g2/g4.json`, prompts in `media/kf2/prompts/t2_<SHOT>_sd25_tN.txt`. All keyframes were canon (dot on her left
chest, the 1420 patch on her left sleeve's band; the backs aren't visible), so none were edited.

## Tools

- `render/tools/lipcheck.mjs [--picks A,B] [--lag A=x]`: steps the real edit through each s0 pick's lipsync window, records the
  frame t2_plate drew (`globalThis.__plateLog`, a hook in `scenes/t2/plate/plate.js`), grabs the film frame at each word onset, then
  `tools/sync/lipstrip.py` builds `work/t2/lips/<PICK>.lipcheck.jpg` (film / renderer mouth / lag −0.25…+0.5 rows) and checks the
  formula against the renderer.
- `tools/sync/lipmeasure.py PICK [--take --s0 --name]`: mouth box from `docs/take2/mouths.json`, ECC-tracked; openness = share of
  the mouth ellipse darker than 0.7 × the surrounding skin (works under any light); scored as played against RMS and voiced loudness
  (log RMS × pYIN), plus 1.4 s sub-windows for drift.
- `tools/sync/mouthline.py PICK --lag=L`: every drawing's mouth along clip time, with the openness, the stem's voiced loudness
  and RMS, and the words drawn at that lag. This is the view to decide by.
- `tools/sync/intake_sung.py SHOT=TAKE.mp4`: intake for a new take made on an existing pick's keyframe (box seeded at frame 0).
- `tools/t2/lipreel.py [SHOT…] [--reuse]`: the labelled reel.

## For the teal-tips (mirror-world) regeneration

1. Cut the aref with `python3 tools/t2/aref.py SHOT` (RoFormer vocal stem, S0 = first word − 0.3 s, pre-roll muted). Mute any
   other voice that falls inside the take with `--mute a:b` (choir, gang shouts, the other Jade's line). Use the S0 it prints.
   An off-grid S0 is fine (the renderer and the tools now agree).
2. Seedance 2.5's lag is random per take: across these 12 takes, best lags ran from −0.42 to +1.13 s (one idled 1.1 s before
   singing). Make 2 takes per shot and measure every one. Reject takes whose best lag is below about −0.3 s (the window would start
   before frame 0, freezing it), takes that keep the mouth open through a multi-word phrase, and takes that shut during a held note.
   Remouth can't rescue small, cool-lit faces (its skin-colour mouth finder fails); fix those by regenerating.
3. Prompt: the §1.2 structure plus per-word labial cues ("lips pressing closed on the 'b' of 'but', … rounding forward on 'you', her
   mouth open and held through the long 'are'"). The cues made both new chorus takes sing "you" on time; both still closed briefly
   inside "are", so add "she never closes her mouth during a held note".
4. Score as played: add the take's mouth box (centre + size on the 1280×720 take, the frame given as `ref`) to
   `docs/take2/mouths.json`, run `lipmeasure.py` then `mouthline.py --lag=<best>`, and decide on the mouth line (b/m/p closures, rests,
   open vowels; the same lag from the first word to the last). For a mirrored shot (`flipX` in the renderer), measure on the
   unflipped source; the lag doesn't change. After the pick, `cd render && node tools/lipcheck.mjs --picks <ID>` confirms the
   renderer's frames. When two lags tie, take the larger.

## What's left

- C209L (+0.833) and C103L / C203L (held "are") are only medium-to-low: a third regen with "never closes during a held note" is
  ≈ $1.2–1.6 a take.
- The teal-tips shots stay on their old takes at the lags above until the mirror-world regeneration lands: C108, C203R and DR16
  can't be fixed by a lag.
- V101: if Jade still hears 0:13.6 as off, try alt t6 at +1.125 (it doesn't sing "Out") or a new take; the current pick is in sync
  by every check I have.
- `render/src/timeline.js` needs no change.
