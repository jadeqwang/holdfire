# Hold Fire Lip Sync (artifact source)

Jade picks, for each sung shot, the song offset at which mouth and voice match. Not published yet.

## Files

| path | what |
|---|---|
| `hold_fire_lipsync.html` | the page (artifact content only; fetches `shots.json`, plays `clips/…` by relative URL) |
| `shots.json` | the page's data: `{fps, version, shots: [...]}`, one entry per sung pick, film order |
| `clips/<ID>_k<±NN>.mp4` | 13 variants per shot, k ∈ {−24, −16, −10, −6, −4, −2, 0, +2, +4, +6, +10, +16, +24} |
| `clips/<ID>_poster.jpg` | a frame on the first sung word (frame 0 is the previous shot's tail) |
| `work/build.py` | renders and encodes everything; `work/verify.mjs` checks the k → lag formula on the renderer |

Each clip is the sung window from the real renderer at the current lag (first word − 0.5 s to min(last word end, shot end) + 0.5 s,
on the 24 fps grid), silent at 640×360 (split halves cropped to 320×360), encoded once (H.264 main, yuv420p, no B-frames, ~700 kb/s,
faststart), then muxed with `work/audio/song.wav` (AAC 96k mono, 48 kHz) at each offset. Choirs are left out of the lyric
(DR11's "Fifty-five").

## k → lag

Variant k plays song time `v + k/24` at film time v: the voice arrives k frames earlier than in the film, so the **mouth looks k
frames later** (k < 0: mouth earlier). With `clipT = t − s0 + lag`, a smaller lag shows each clip frame at a later song time
(a later mouth), so the film reproduces variant k when

    lag' = lag − k / 24

Worked example: P105 has lag +0.333 (+8 f). Jade picks **+6** ("mouth 6 frames later"): lag' = 0.333 − 6/24 = 0.333 − 0.250 =
**+0.083**. Set it with `python3 tools/t2/picks.py -g <group> set P105 P105 --s0 45.715 --lag 0.083`. If she picks −10:
lag' = 0.333 + 0.417 = 0.750. "None match" (`none: true`, `k: null`) means retake.

Every k is even, so the shift keeps the renderer's twos phase (it holds even film frames) and the re-rendered film matches the
variant frame for frame.

**Verified** (`node work/verify.mjs P105 6 -10`, `… DR11 4 -2`): the renderer was run with the pick's lag overridden in the page to
lag − k/24 (3 decimals, as picks.py stores it), and the plate frame it drew at film frame v + k was compared with the current lag's
frame at v over the whole shot: P105 k=+6 (lag 0.083) 35/35 equal, k=−10 (0.750) 31/31; DR11 k=+4 (−0.334) 59/59, k=−2 (−0.084)
61/61. The opposite sign (lag + k/24) matched 0 frames in each case. Face pixels agree too (only the song-timed lyric type differs).
The muxed audio was cross-correlated with song.wav: every variant checked starts at song time `from + k/24` to the sample.

## Choices (db)

Collection `lagpicks`, doc id = pick id: `{shot, k, note, none, by, at}` (`by` = `user.id()`, null without identity). One doc per
shot, overwritten on every change. Read them with ArtifactData `list` on `lagpicks`.

## Adding shots (second pass: C103L/R, C203L/R, C209L/R)

Run `python3 work/build.py C103L C103R …` once their picks are final: it renders the new clips and posters into `clips/` and
merges the entries into `shots.json` in film order (existing entries are kept). For a hand-made entry, append to `shots[]`:
`{id, t (first word, s), from, to, lyric, singer ("Jade" | "teal-tips"), conf, lag, aspect ("16/9" | "8/9"), k: [...], poster}`
and add `clips/<id>_k<±NN>.mp4` for every k. Then republish with the new files. Before building split halves, check `CONF` and
`VOICE` in build.py, and whether the new splits still use `t2_split` (halves are cropped by the L/R suffix).

## Publish

capabilities `{"db": {}, "user": {}}`, `file_path` = `hold_fire_lipsync.html`, `files` = `shots.json` plus every file in `clips/`
(140 files, 47 MB: one publish). On republish, pass only new or changed files.
