# Hold Fire take two: handoff (30 Oct 2026)

For the next session picking up the video. State of the work, how to rebuild everything in a fresh cloud container, what is
still open, and the traps that cost time. The detailed record is the last three sections of `REVIEW_NOTES.md`.

## Where things are

| what | where |
|---|---|
| The work | branch `claude/sharp-bohr-isipl3`, open as [jadeqwang/holdfire#1](https://github.com/jadeqwang/holdfire/pull/1) into `claude/hold-fire-take-two` |
| Derived plates the relay can't rebuild | branch `derived-plates`: `derived/` (originals of CRT_roomA/B, DR01, DR05, P107, V102, keyframes, the V118-V121 machine plate folders) and `tools/t2/derived/` (their scripts) |
| The song | `inputs/Hold Fire.mp3` = "Hold Fire (minor fixes)" (Google Drive, folder "Hold Fire"; the WAV there is over the Drive connector's 10 MB download limit, so the MP3 is used, as always). v1: `inputs/Hold Fire (v1).mp3` |
| Lyrics | Google Doc "Hold Fire (lyrics and suno prompt)" (minor-fixes wording); `tools/t2/subtitles_lyrics.json` has them per sung line |
| Mix with sound design | `deliverables/Hold Fire (minor fixes, with sfx).mp3` (320k). The WAV (`media/audio/hold_fire_t2_mix.wav`) is not committed: rebuild it |
| Subtitles | `deliverables/subtitles/hold_fire.{en,zh-Hans,ru,uk,fr}.srt` |
| Previews | `previews/hold_fire_t2_minor_fixes_1080p_github.mp4` (the full film from the 1080p master, 89 MB); `previews/hold_fire_t2_rcv2_minor_fixes_540p.mp4` |
| Streaming page | https://claude.ai/artifact/3xHnfB3znu7LV2f5LUHeS3 (HLS 1080p, section marks, the five caption tracks; Jade's, private) |
| Sent to Jade in chat | the X file (12 Mb/s, 364 MB), the 31 s hook, the MP3, the subtitles, the tablet clip |
| Not anywhere persistent | the CRF 14 master (845 MB) and the 456 MB YouTube copy: they were in the reclaimed container; re-render if needed |

## Rebuilding in a fresh cloud session (about 2.5 h, mostly unattended)

```sh
pip install numpy scipy librosa soundfile soxr pyloudnorm matplotlib opencv-python-headless audioread "audio-separator[cpu]" fonttools
cd render && npm ci && cd ..
# 1. derived files: copy derived/ from the derived-plates branch over the repo root
git fetch origin derived-plates && git archive origin/derived-plates derived | tar -x -C /tmp && cp -r /tmp/derived/work/. work/ && mkdir -p media/kf2 && cp /tmp/derived/media/kf2/*.jpg media/kf2/
# 2. every plate (relay + derived; ~40 min), then the walk composites
python3 tools/t2/conform_all.py --jobs 3
python3 tools/t2/restore_media.py media/kf2/kf_V108_nbp_v1_up_c933dc2975.jpg media/kf2/kf_V109_nbp_v1_up_b4b1d995c8.jpg media/kf2/kf_V110_nbp_v1_up_a6d9fc2388.jpg
python3 tools/t2/comp_walk.py
# 3. the mix: the new song's vocal stem (BS-RoFormer on CPU, ~30 min), then the sound design (~1.5 min)
python3 tools/audio/stems.py && python3 tools/audio/sfx_t2.py --no-audition
ffmpeg -i media/audio/hold_fire_t2_mix.wav -af apad=whole_dur=238.6667 -c:a pcm_s24le media/audio/hold_fire_t2_mix_padded.wav
# 4. checks
cd render && node tools/check_cuts.mjs && node tools/chess_check.mjs && node tools/chess_lens.mjs && node tools/shots_json.mjs && node tools/lipcheck.mjs --out ../work/t2/lips && cd ..
python3 tools/sync/lipframes_check.py        # 906 drawn frames, 0 off (lipcheck's own strips fail on the upscales; this is the check)
# 5. the master (~65 min with 3 jobs), then the X file and hook (README "Reproduce")
tools/t2/render_segments.sh hold_fire_t2_master_minor_fixes 1920 1080 14 media/audio/hold_fire_t2_mix_padded.wav
```
Then compare the master with the preview frame by frame (240x136 grey, per shot; `REVIEW_NOTES.md` has the numbers to expect:
median difference ~1.2/255; only fast chess and poster-morph frames and cold-open texture stand out).

**Deadline: the relay's KV mirror expires around 15 Nov 2026** (TTL 21 days). After that `restore_media.py` / `conform_all.py`
cannot fetch the generated takes, and the plates cannot be rebuilt in the cloud. If more renders are likely after that, archive
`media/gen/` (about 1.3 GB, the files `render/data/picks2.json` names) somewhere durable first, e.g. more `derived-plates`
commits in pieces under 95 MB, or the project's Cloudflare account (R2) if Jade agrees.

## How the retime works (read before touching timing)

- `tools/audio/retime_v2.py` + `retime_v2_cfg.json` build `render/data/timing.json` (and `analysis/`) from `analysis/timing_v1.json`
  through a v1 -> new map: beat i -> beat i (`analysis/retime_v2_beats.json`) plus outro knots measured on the new vocal stem, and
  the cfg's edits (the dropped echo "eight", "and", "their", the outro words and events). It also warps `audio.json`.
- `timing.json` carries the map as `v1_map`; `render/src/audio.js` exposes `A.v1(t)` (v1 -> new) and `A.v1inv(t)`.
- **Any time typed into the code is a v1 time.** Plan times (`beat('m:ss')`, `eighth(...)`), `ev(type, re, after)` bounds, the chess
  schedule's search bounds and fallbacks (`V(...)` in `chess/schedule.js`), `chess_check`'s expectations all go through `A.v1`. New
  code should either derive times from `timing.json` or wrap literals in `A.v1`. A literal left unwrapped fails silently: the
  lookup skips to the wrong event (CO10's rewind landed at 26.6 s; the chess swing fell back to v1's 154.15 s). `check_cuts` does
  not catch this (the cut sits on its, wrong, anchor): look at the shot list or render stills.
- Lip-synced plates (picks with `s0`) run on the v1 clock: `plate/lib.js` takes `clipT = v1inv(hold(t)) - s0 + lag`. Picks' `s0`
  and `lag` are unchanged and must stay v1 values. Measured: every sung shot's vocal within 0 to -10 ms of the map
  (`tools/audio/lipsync_v2_check.py`). Not yet ported to the map: `tools/sync/lag_curve.py`, `lipmeasure.py`, `wordstrip.py`,
  `remouth.py` (only matters if lags are re-measured).
- Generated files to regenerate after any timing change: `docs/take2/shots.json` (`node render/tools/shots_json.mjs`; lipcheck reads
  its windows), the mix (`sfx_t2.py`, events read live from the edit), the subtitles (`tools/t2/subtitles.py`).

## Open items

1. **PR #1**: open, not merged; no CI on the repo. It adds two large videos (89 MB and 46 MB) to history.
2. **The ending** (Jade to confirm): the new song has no final hit, so the end card lands 0.13 s after the last whisper and the film
   runs 2.67 s past the song on silence (card held 3.11 s, as before). To end on the song instead: `film_duration` and the last
   knot in `retime_v2_cfg.json`, re-run `retime_v2.py`, then everything downstream.
3. **The tablet** (V113): Benjamin R. Foster (Yale) answered Jade's questions. Done: the letter's first line ("to Ea-nasir", ṣi = ZE₂)
   and 89 = 1;(30 LAL 1) with the 1 tilted left and pressed last. Waiting: his view of the clip (`deliverables/hold_fire_tablet_V113_1080p.mp4`;
   the tilt `LAL_TILT` in `tablet.js` is a guess at "slightly"), and whether he agrees to a credit line on the end card (then add it
   to `t2_endcard`'s credits; wording his choice).
4. **Subtitles**: written by Claude; a native read of uk and zh is worth having. ru/uk address "you" in the masculine (two words to
   change for feminine). zh is Simplified; Traditional not made. The second intro count is subtitled as the lyric sheet has it.
5. **Delivery**: the CRF 14 master and the YouTube copy do not exist anywhere now (see above). Chat attachments cap at 400-500 MiB;
   the Drive connector cannot carry video. An R2 upload with a link was offered to Jade, not done (it would be a public URL).

## Traps

- `pgrep -f NAME` in a wait loop matches the waiting shell's own command line when NAME appears in it; it never exits. Wait on
  the PID (`$!` saved to a file) instead.
- `render.mjs` rounds `(to - from) * fps`; `render_segments.sh` now ends on `ceil(duration * 24) / 24` so the last (loop) frame is
  rendered. Any other range render: check its frame count.
- The upscaled plates' names are not in `docs/take2/mouths.json`, so `lipstrip.py` fails; use `tools/sync/lipframes_check.py`.
- Stems from `audio-separator` are 44.1 kHz: a "5 ms" hop of `int(sr * 0.005)` samples is 4.989 ms, which reads as a growing lag.
- Artifacts serve only some types: HLS goes as `.txt` playlist + `.mp4` segments (hls.js does not care), WebVTT as `.txt` parsed in
  the page. 64 MB and 255 files per publish, 256 MB per version.
- V108-V110 and V118-V121 are composites, not takes: a plain conform of their `src` gives raw green screen.
- Cold-open keyframes CO04/CO08/CO13 (and V115, V123) are P-Image upscales; the relay's raw generations are 1376x768 PNGs.
  Use `derived/media/kf2/`.
