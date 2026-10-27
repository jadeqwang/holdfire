# Take two: QA of the 1080p master, RC1

File: `work/out/hold_fire_t2_master_rc1.mp4` (1920×1080, 24 fps, 5,932 frames, 247.17 s, H.264 CRF 14 at ~27.9 Mb/s, AAC
48 kHz stereo ~313 kb/s; 872 MB). Checked 27 Oct 2026.

**Method.** One frame every 2 s (124 frames) on five 30-tile contact sheets; 22 full-size frames at the key moments
(0:00, 0:06.7, 0:08, 0:13.5, 0:33.9, 0:47.7, 1:03.9, 1:25.5, 1:28.5, 1:35.5, 1:49, 2:25, 2:26.5, 2:30.3, 2:43.3, 2:52, 3:08.4,
3:15, 3:22, 3:24, 3:48.5, 4:05, 4:06.5, last frame), with 1:1 crops of faces, type, screens and dark gradients (levels ×3–4
to expose banding); every frame of 4:04–4:07.2 and 3:49–3:50.2; every 4th frame round 2:29.6–2:30.9; `blackdetect` (d ≥ 1
frame, pixel threshold 0.06) and `freezedetect` (−66 dB, ≥ 0.5 s) over the whole film at 480×270; audio cross-correlated
against `inputs/Hold Fire.mp3`. Sheets and crops were scratch files (not kept).

## Findings, most important first

1. **3:49.4 the days counter reads 0041.** That is the 26 Oct value (15 Sep 2026 → 26 Oct). Today (27 Oct) it is 42. Recompute
   it for the release date before the final render (plan fact sheet, "Days counter").
2. **4:04–4:07.2 the end card is readable for under a second.** The song credits arrive one per beat from 4:04.1, the model
   lines one per 32nd; the whole card is complete at about 4:06.2 and starts dissolving back to the opening frame at 4:06.85
   (the loop: the last frame matches frame 0). So the full card stands about 0.6 s, which holds for pause-readers only.
   Acceptable for the loop; if Jade wants the credits read in play, the YouTube upload could carry a longer card (a variant
   with the card held), or the credits go in the description.
3. **Sung shots are soft at 1080p** (0:13–0:16 V101, 0:46–0:50 P105/P106, 0:56–1:02 and 1:58–2:10 the splits, 1:04–1:07
   C108, 3:08–3:30 DR04/DR11/DR16). They are 720p Seedance takes Lanczos-scaled to 1080p: the cel lineart is soft and carries
   faint ringing halos, next to the crisp JS type. This is inherent to the takes (no 1080p sung model), not a render fault.
   An upscale pass on these plates (the P-Image upscaler only does stills) would be the fix if it matters.
4. **1:35.5 Petrov's display reads ВЕРНОСТЬ ВЫСШАЯ.** The occlusion matte that puts his head in front of the board hides the
   first five letters of ДОСТОВЕРНОСТЬ ВЫСШАЯ ("reliability: highest"), so a Russian reader sees "loyalty: highest". Shift the
   line right of his head (the board has room to x ≈ 1500) or shorten it to ВЫСШАЯ.
5. **2:26.5 the knights read as blank slabs at board height.** The knight head is a flat extrusion of a side profile; in the
   low orbit (and the hand insert) it faces the lens edge-on and looks like a white tombstone. From the high ¾ view (2:25) it
   reads fine. A bevel or a second cross-profile (or turning knights 30° off the lens in these shots) would fix it.
6. **3:22–3:25 and 0:36–0:39, 2:38–2:43: screen moiré on small displays.** The riso/halftone screens (7 px cells) are clean at
   1080p, but scaled to phone size (tested at 640×360, bilinear) the cloud plate under AND YOU WERE SEEN TOO beats into a faint
   moiré. The poster at 2:41–2:43 holds. If it shows on a phone in the X file, a slightly larger cell (≥ 9 px) on DR14 fixes it.
7. **3:08.4 impact frame (DR03, negative).** The threshold turns the plate's background into hard white blobs (lower left), and
   the glass lyric "message in a bottle / a mantra / a prayer" and its mirrored copy cross both Jades' hair and teal-tips' face.
   It lasts two frames, so it reads as a flash; worth a look only if paused.
8. **1:28.5 the warning column runs off the top of the frame.** The scroll's first character (有) and part of 合 are cut by the
   frame edge while the brush writes lower down. Intentional if the scroll is meant to be panning; otherwise start it 60 px lower.
9. **2:30.3 "LIGHTS aSPARK".** For the frames where the impact treatment slams "SPARK" in, the scaled word eats the space
   after "a". Two or three frames; the line reads "A SPARK" otherwise.
10. **0:47.7 WE'RE.** Cream type over the fluorescent tube behind it is low-contrast for the apostrophe and the R (the rest of the
    word sits on the dark ceiling). Minor.
11. **1:03.9 CRT matrix micro type.** The SETI@home panels' UI text is ~4 px and reads as noise; fine as texture.

## Checks that passed

- **A/V sync: the audio is the song, sample-aligned.** Cross-correlation of the master's AAC (mono mix) against
  `inputs/Hold Fire.mp3`, first 30 s: lag 0 samples, normalised correlation 0.9998, gain 0.998 (residual −34.6 dB, codec
  noise). Repeated at 3:20–3:50: lag 0, correlation 0.9992. No drift; level matches the MP3.
- **Black frames**: 0:08.33–0:08.63 (7 frames, the cold open's rewind to black, by design); 1:13.00, 1:13.25–1:13.71 and
  1:14.08–1:14.29 (the post-chorus graph growing from one star on black, by design); one dark frame on the cuts at 0:43.29
  (217 LY → pulsar) and 1:48.04 (list → coins, the coin scene's first frame), both dips at a cut, not dropouts. No other.
- **Frozen frames**: none of 0.5 s or longer (freezedetect, −66 dB). The film grain would hide a held plate under the threshold;
  the known holds are C203L (3 frames) and DR11's vanish (0.45 s, deliberate), as in REVIEW_NOTES.
- **Loop**: the last frame is the opening frame (HOLD FIRE over the eye), as planned.
- **Type**: JS type is pixel-crisp at 1080p, glows clean, no aliasing on thin strokes (Ma Shan Zheng, IM Fell, Plex Mono,
  VT323, the 610-world legend at 3:15).
- **Banding**: none in the dark gradients (eye at 0:00, CRT rooms at 1:03, the galaxy); the grain dithers them at CRF 14.
- **Procedural scenes**: the phyllotaxis disk (3:15), the coins (1:49), the contact graph and war (2:52) show no stair-stepping
  at 1:1; fine lines are anti-aliased.
- **Render log** (`work/out/master_rc1.log`): 5,932/5,932 frames in 54.3 min; three `404 (Not Found)` page errors, the same
  three as in previews v3–v6 (not traced; no missing picture was seen).

## Encodes made from RC1

| file | size | check |
|---|---|---|
| `hold_fire_t2_x.mp4` | 378.4 MB (11.98 Mb/s video, AAC 256k), High@4.1, faststart | PSNR against the master: **43.2 dB** average (Y 41.9, U 47.9, V 48.0), min 27.8 dB |
| `hold_fire_t2_hook_31s.mp4` | 46.7 MB, 31.00 s, same settings | picture fades to black and sound to silence over 30.5–31.0 s |

Where the X file loses most (2 s windows): 0:36 Voyager riso print 29.6 dB, 0:38 Echo tower riso 34.9, 2:38 the Suprematist
dive 37.9, 2:40 the poster 39.8, 0:06 the galaxy 40.2; everything else ≥ 40 dB. At 0:36–0:39 the 7 px riso dot screen is
smoothed into mottle at 12 Mb/s (it still reads as print, not as blocks). 108 frames are under 35 dB: 79 at 0:35.5–0:39.5,
16 at 2:39 (the dive into the poster), 11 at 3:23–3:24 (the tower's halftone sky), 2 in the 0:08 rewind. Upload the master (not the X file) wherever the bitrate is not capped.
