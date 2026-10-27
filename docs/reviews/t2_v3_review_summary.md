# Take two, preview v3: outside review (Gemini), checked frame by frame

Preview: `work/out/preview_540p_v3.mp4` (247.17 s). Reviewer: `google/gemini-3.8-flash` via `tools/gen/cf.run_model`, five
overlapping chunks (0:00–1:00, 0:50–1:50, 1:40–2:40, 2:30–3:30, 3:15–4:07) at 480×270, ~380 kb/s, mono AAC 64k, burned-in
film-time strip; prompt = the director persona + the plan's idea and per-section beats (`work/t2/review_v3/brief.txt`,
`review.py`). Raw answers: `docs/reviews/t2_gemini_v3_<chunk>.md`. Spend ≈ $0.05, logged by hand in `docs/spend_ledger.jsonl`.

**Method note.** In this container a sync call is cut off at ~30 s (HTTP 502): at the default thinking level every video call
timed out, even 30 s chunks. `generationConfig: {thinkingConfig: {thinkingLevel: "low"}}` brings a 60 s chunk to ~17–20 s. Gemini
samples ~1 frame/s, so its timestamps are ±1 s and it can't judge sync or one-frame events. In chunk 3 (1:40–2:40) it cited times
up to 2:58, outside the clip, so those items are discarded.

**Verification.** For every claim I pulled frames from the preview at the cited times (sheets in `work/t2/review_v3/s_a…s_l.jpg`,
960×540, time-labelled). Motion claims were checked with per-frame difference and luma measurements. Of 58 claims, 18 were confirmed (fully or in part)
and 40 were wrong.

## Scores (Gemini, per chunk)

| chunk | hook | lyric legibility | cut rhythm | lip sync | story | polish |
|---|---|---|---|---|---|---|
| 0:00–1:00 | 7 | 4 | 6 | 5 | 5 | 5 |
| 0:50–1:50 | 8 | 5 | 8 | 6 | 7 | 6 |
| 1:40–2:40 | 8 | 5 | 7 | 4 | 6 | 5 |
| 2:30–3:30 | 7 | 4 | 6 | 4 | 5 | 5 |
| 3:15–4:07 | 6 | 4 | 6 | 4 | 5 | 5 |
| **mean** | **7.2** | **4.4** | **6.6** | **4.6** | **5.6** | **5.2** |

Lyric legibility is the most consistent low score, and the frames back it up. The lip-sync scores come from 1 fps sampling ("generic
open/close loops"). Only the shots that LIPSYNC.md already lists as weak hold up.

## Confirmed findings, ranked by impact

1. **Karaoke-reveal lyric lines are hard to read on a phone (systemic).** Unsung words are ghosted almost to nothing, and many
   lines are small thin serif or script over busy or bright ground. Worst cases seen:
   - 0:53.4: "that anyone is there" sits on the Milky Way core. "is" blooms out and "there" is a dark ghost on dark sky.
   - 3:04.5–3:08: "Couldn't be sure… / message in a bottle…" is pale-blue thin serif on the white void. At 3:04.5 the line runs
     into Jade's hair and arm.
   - 2:25–2:31.6: the chalk script is thin. At 2:31.6 "is lighting its own death" is dim grey over the back rank.
   - 0:18.4, 0:23.7, 3:23.5, 1:36 (second line over the red console): the unsung words can't be read.
   
   *Fix:* keep unsung words at ≥ 45–50 % opacity, not a ghost outline, so the whole line can be read ahead. Set a minimum cap height
   of about 30 design px for serif and script lines, and give serif lines a dark halo or scrim on bright ground. Move 0:53's line to
   the dark sky left of Jade (x 560–900, y ≈ 330), off the core. Set the white-void lines in full-strength Klein blue with a grey
   halo, outside the walker's box. Thicken the chalk 1.5×.
2. **1:50.0–1:52.4: "the only road from here to you" and the 2^100 number are hidden.** The lyric at the top is covered by the
   coins flying up (1:50.8). The 1/1,267,… number at the bottom is tiny, dim and under the coin grid. *Fix:* draw the lyric above
   the coin layer with a shade, or move it to the empty band at y ≈ 980. Set the number ≥ 34 design px above the coins, or drop it
   once the tree starts.
3. **3:46.9–3:48.1: the counter disappears under a solid red block.** The fast resets merge into 29 consecutive red SIGNAL LOST
   frames (1.2 s, measured), so the board can't be read where the count peaks (13 resets in 3:44.3–3:46.9 read fine). *Fix:* cap
   each reset at 2 frames with ≥ 2 clean frames between, or draw the digits and the year above the glitch layer so only the frame
   around them tears.
4. **3:19–3:21 DR11 breaks the mirror rule.** Both Jades wear the canon jacket. **Fixed in this pass:** new keyframe
   `media/kf2/DR11_mir_v3.jpg` and Seedance take m6 (`picks_g4.json`).
5. **Type colliding with graphics.** Each case below is a small layout fix:
   - 1:16.4: the graph edges run through the giant 8 and the running 1 1 2 3 5 row. *Fix:* mask edges inside the numeral boxes, or
     dim them to 30 % under them.
   - 3:16.5–3:17.3: the top of the phyllotaxis disk touches "we broke the chain". The bottom-right legend repeats "LINK BY LINK ·
     FROM EARTH" in micro type. *Fix:* lift the lyric about 40 px or shrink the disk 5 %; drop the legend's lyric line.
   - 3:25: graph lines and rings cross "And you were seen too, wherever you are". *Fix:* move the line to the empty top-left or
     give it a shade.
   - 2:55.5: HOLD YOUR FIRE runs into the scroll's vertical kanji column ("YOUR" under 燼). *Fix:* keep it left of the column
     (x < 1300 design px) or below the seal.
   - 0:26.4: the tally's dimension bracket crosses "CARRIED" on the clay tablet. *Fix:* end the bracket above the inscription.
   - 0:46.7: "Hear it, and you'll" touches teal-tips' hair. *Fix:* shift it about 40 px left.
6. **2:14.5–2:16: the post-chorus-2 Earth-lights plates (one lit window, then a wet street) look photographic** and break the
   painted and cel world. Gemini's "interlacing/noise" is wrong. *Fix:* a `gouache` or `oil` style pass at amt 0.4–0.5, or
   regenerate in the film's painted style.
7. **Micro type that can't be read at 540p.**
   - 0:43–0:45: the pulsar and Fibonacci captions ("CP 1919 · LGM-1…", "EACH THE SUM OF THE TWO BEFORE…") are about 6 px tall.
   - 2:50.6: SIGNAL LOST under the jog wheel is about 12 px.
   - 4:05.5: the end card's model list is about 13 px, and the last line is still fading in.
   
   *Fix:* drop the secondary captions or set them ≥ 2×, set SIGNAL LOST at least as big as BURN, AND FALL, and give the end card's
   model lines ≥ 20 design px or one more beat.
8. **Lip sync on C103 (0:57–1:01), C203 (1:58–2:02) and DR16 (3:28).** These are confirmed by LIPSYNC.md's own measurements
   (C103R low–med, C203R / DR16 medium), not by Gemini's 1 fps view. *Fix:* the regenerations listed in LIPSYNC.md "What's left".
9. **1:34–1:37: the Petrov terminal lyric sits below title-safe.** The second line is about 20 px from the bottom at 540p, and the
   unsung words are lost on the red-lit console. *Fix:* raise the box about 40 px; ghost opacity as in item 1.
10. **0:07.98–0:08.57: 15 frames of pure black** (luma 16) between the rewind and the match. The plan says "down to black", but
    0.6 s of nothing is long for muted autoplay. *Fix:* trim the black to about 6 frames, or let the match flare start on the
    rewind's last 16th.
11. **CRT readout boxes (0:57, 1:58, 3:28) sit over the singers' chests.** At 3:28 the box covers teal-tips' torso, dot and band.
    Low impact: they were moved there deliberately, off the mouths. *Fix:* at 3:28, put the box at the bottom right of the
    console, clear of both figures.

## Every claim, checked

C = confirmed, P = partly confirmed, W = wrong. Times are film time.

| time | claim (Gemini) | verdict | evidence |
|---|---|---|---|
| 0:07–0:08 | dead black for ~1 s | P | 15 black frames 7.98–8.57 (by plan, but long), item 10 |
| 0:18–0:19 | "FIN INTO FOOT…" overlaps the bone line art | W (overlap) / C (legibility) | text sits below the fin, clear of the bones; unsung words near-invisible |
| 0:23–0:24 | EGG lyric thin white on tan sky | W | sung words are dark navy and readable; only the ghost is faint |
| 0:25–0:26 | tablet lyric collides with wedges | P | inscription sits below the wedges; the dimension bracket crosses "CARRIED" at 0:26.4 |
| 0:31–0:32 | walk slides; cuts miss the snares | W (cuts) / unverified (feet) | check_cuts: 0 cuts off onset; foot sliding not judged from stills |
| 0:43–0:45 | pulsar micro type | C | captions ≈ 6 px at 540p |
| 0:46–0:49 | cable clips; 1420 patch a smudge | W | patch is crisp, reversed by design; cable hangs normally |
| 0:46.5 | "Hear it…" over her hair | P | touches the hair's edge, not the face |
| 0:53 | CAN'T BE SURE blown out by bloom | W | the hero reads cleanly; the problem is the serif line below (item 1) |
| 0:53.4 | lyric over the galactic core | C | item 1 |
| 0:57.5 | Jade's panel has mirrored meters and lettering | W | Jade's half is unflipped |
| 0:57–1:01 | teal-tips' dot on screen-left, not mirrored | W | patch is on her right sleeve, reversed; dot hidden by the CRT box |
| 0:57–0:59 | split seam mismatched, looks like a tear | W | the hard vertical line is the plan's; the rooms are separate by design |
| 1:02–1:04 | CRT lyric dark grey on navy | W | sung words are light grey and readable |
| 1:03 | CRT tiling seam | W | no seam in the frames |
| 1:13–1:16 | numerals crowd the graph | C | item 5 (1:16.4) |
| 1:23.4 | "Priests…" over a leftover "OKE" | W | what shows is the same line's own ghost, nothing left from the previous shot |
| 1:25–1:29 | tiny grey Latin text | W | brush-script lines are mid-size and dark |
| 1:34–1:37 | terminal text clipped at the bottom | P | not clipped, but below title-safe, item 9 |
| 1:34 | "SAT LITES" missing letters | W | reads "SATELLITES SAW FIVE" |
| 1:40 | cursor hides the R in IGNORED | W | reads "IGNORED ALL" |
| 1:43–1:47 | near-miss list illegible, too fast | W | years are big and readable; small descriptions are the plan's design |
| 1:47 | counter shows a "Z" glyph | W | wheels mid-roll (motion blur) |
| 1:50–1:51 | 2^100 number microscopic | C | item 2 (also: the lyric is covered by coins) |
| 1:54–2:02 | system-font subtitle box clashes | W | the deliberate CRT readout; see item 11 for placement |
| 1:54 | split seam uneven | W | straight 1 px line |
| 1:58–2:02, 0:57–1:01, 3:28 | lip sync off | C (by docs) | LIPSYNC.md confidences, item 8 |
| 2:27–2:31 | split-screen lip flap | W | no sung face there (chess; Jade close-up with mouth shut) |
| 2:14–2:16 | live-action stock footage | C (look) / W (interlacing) | item 6 |
| 2:18 | Earth polygon faceting | W | clean limb |
| 2:23 | subtitle box frozen | W | nothing frozen in the frames |
| 2:24–2:31 | tiny cursive chalk lyrics | C | item 1 |
| 2:31 | white unmapped card on the table | W | the Fischer–Tal scoresheet, textured |
| 2:40–2:43, 2:54–2:57, 2:58 (chunk 3) | unlit 3D pieces; chain clutter; jump-cut | W | times outside the clip; pieces have ink outlines in the battle; chain is by design |
| 2:40 | officer sleeve fill bleeds | W | clean fills at 2:41.5 |
| 2:44 | red terminal text tiny | W | ≈ 24 px and readable |
| 2:50 | jog wheel static | W | hand region changes 20–47 levels per drawing |
| 2:54 | stuck `<<` icon | W | deliberate VHS rewind OSD |
| 2:55 | cropped kanji at the edge | P | column cut by the frame top (scroll continues); the real issue is the HOLD YOUR collision, item 5 |
| 3:00, 3:03 | teal-tips' patch is backwards gibberish | W | reversed lettering is the mirror rule |
| 3:04–3:08 | low-contrast type in the white void | C | item 1 |
| 3:07 | AI smear on the right figure | W | deliberate stipple dissolve of the reflection |
| 3:09–3:12 | floating hands, no contact | W | mirrored DR05 close-up; palms touch on "too" (pass 1) |
| 3:16–3:18 | "Link by link" twice, lost on the disk | C | item 5 |
| 3:19–3:21 | static plate, no lip sync | W | mouth region changes every drawing (t4 video, lipcheck 0 mismatches) |
| 3:19–3:21 | teal-tips not mirrored | C | fixed this pass, item 4 |
| 3:20 | flat characters clash | W | subjective; same cel look as elsewhere |
| 3:23 | tower plate low-res and noisy | W | deliberate riso halftone |
| 3:24–3:25 | constellation lyric too faint | C | item 5 |
| 3:27–3:31 | monitor loops freeze | W | monitor region changes every drawing |
| 3:28 | "y\| are" text clipped | W | full "wherever you are." with cursor; only the box placement matters (item 11) |
| 3:38 | galaxy type tiny | W | ≈ 25 px gold serif above the galaxy |
| 3:42 | colour fringing | W | none visible |
| 3:46 | SIGNAL LOST hides the counter | C | item 3 (1.2 s solid red) |
| 3:54 | "Hold your fire" fades into the sky | W | dark slate italic, readable |
| 3:56 | lyric drops out early | W | still on screen at 3:56 |
| 4:04 | title pops downward | W | lands 1.5 px over 2 frames, then holds at y 276.3 to the end |
| 4:05 | credits too dense | P | model line ≈ 13 px, last line still fading in, item 7 |
