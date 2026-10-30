# derived/

Source files for plates that cloud sessions cannot rebuild from the generation relay, so the take-two edit can be rendered from GitHub. `media/` and `work/` are gitignored; these files keep their paths under `derived/` (copy `derived/media` and `derived/work` over the repo root, then conform with `tools/t2/plates.py`).

Made 30 Oct 2026 from a cloud session, which has no copy of Jade's local `work/`. Keyframes were restored from the relay's KV mirror (`tools/t2/restore_media.py`; jobs from `docs/spend_ledger.jsonl`).

| File | Size | Used by (render/data/picks2.json) | Note |
|---|---|---|---|
| `derived/media/kf2/BR14_nbp_v1.jpg` | 1.8 MB | BR13 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/BR15_nbp_v1.jpg` | 1.3 MB | BR15 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/BR16_nbp_v1.jpg` | 1.4 MB | BR16, BU10 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/BR17_nbp_v1.jpg` | 1.4 MB | BR17 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/C208b_switch_A_nbp_v2.jpg` | 1.7 MB | C208b | Nano Banana Pro, this session (adversary pass) |
| `derived/media/kf2/C208c_switch_B_nbp_v3.jpg` | 1.7 MB | C209b | Nano Banana Pro, this session (adversary pass) |
| `derived/media/kf2/CO02_nbp_v2.jpg` | 2.5 MB | CO02 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/CO03_nbp_v2.jpg` | 2.7 MB | CO03 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/CO04_nbp_v1.jpg` | 0.9 MB | CO04 | P-Image upscale (inferred: the raw output is a PNG and the pick names a `.jpg`) |
| `derived/media/kf2/CO04_nbp_v1_1k.png` | 1.5 MB | (CO04) | raw 1K generation; the pick uses the upscale (the `.jpg` beside it) |
| `derived/media/kf2/CO05_nbp_v1.jpg` | 3.9 MB | CO05 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/CO06_nbp_v1.jpg` | 3.2 MB | CO06 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/CO07_nbp_v1.jpg` | 3.6 MB | CO07 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/CO08_nbp_v1.jpg` | 1.3 MB | CO08 | P-Image upscale (inferred: the raw output is a PNG and the pick names a `.jpg`) |
| `derived/media/kf2/CO08_nbp_v1_1k.png` | 1.7 MB | (CO08) | raw 1K generation; the pick uses the upscale (the `.jpg` beside it) |
| `derived/media/kf2/CO13_nbp_v1.jpg` | 1.2 MB | CO13 | P-Image upscale (inferred: the raw output is a PNG and the pick names a `.jpg`) |
| `derived/media/kf2/CO13_nbp_v1_1k.png` | 1.7 MB | (CO13) | raw 1K generation; the pick uses the upscale (the `.jpg` beside it) |
| `derived/media/kf2/CO14_nbp_v1.jpg` | 3.5 MB | CO14 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/DR14_nbp.jpg` | 0.3 MB | DR14 | JPEG q95 of the PNG beside it (the conversion that made the original `.jpg` is not recorded) |
| `derived/media/kf2/DR14_nbp.png` | 1.3 MB | – | raw generation (PNG); the pick names the `.jpg`, written from this at JPEG q95 |
| `derived/media/kf2/P102_nbp.jpg` | 0.7 MB | P102 | JPEG q95 of the PNG beside it (the conversion that made the original `.jpg` is not recorded) |
| `derived/media/kf2/P102_nbp.png` | 2.6 MB | – | raw generation (PNG); the pick names the `.jpg`, written from this at JPEG q95 |
| `derived/media/kf2/V115_nbp_v1.jpg` | 1.5 MB | V115 | P-Image upscale (inferred: the raw output is a PNG and the pick names a `.jpg`) |
| `derived/media/kf2/V115_nbp_v1_1k.png` | 1.6 MB | (V115) | raw 1K generation; the pick uses the upscale (the `.jpg` beside it) |
| `derived/media/kf2/V123_nbp_v1.jpg` | 0.5 MB | V123 | P-Image upscale (inferred: the raw output is a PNG and the pick names a `.jpg`) |
| `derived/media/kf2/V123_nbp_v1_1k.png` | 1.0 MB | (V123) | raw 1K generation; the pick uses the upscale (the `.jpg` beside it) |
| `derived/media/kf2/V206_nbp_v1.jpg` | 2.6 MB | V206 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/V208_nbp_v2.jpg` | 3.4 MB | V208 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/V209_nbp_v2.jpg` | 3.3 MB | V209 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/X201_nbp.jpg` | 0.3 MB | X201 | JPEG q95 of the PNG beside it (the conversion that made the original `.jpg` is not recorded) |
| `derived/media/kf2/X201_nbp.png` | 1.5 MB | – | raw generation (PNG); the pick names the `.jpg`, written from this at JPEG q95 |
| `derived/media/kf2/X202_nbp.jpg` | 2.5 MB | X202 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/X203_nbp.jpg` | 0.4 MB | X203 | JPEG q95 of the PNG beside it (the conversion that made the original `.jpg` is not recorded) |
| `derived/media/kf2/X203_nbp.png` | 1.9 MB | – | raw generation (PNG); the pick names the `.jpg`, written from this at JPEG q95 |
| `derived/media/kf2/X204_nbp.jpg` | 4.0 MB | X204 | raw generation (Nano Banana Pro), as restored |
| `derived/media/kf2/candidates/DR03_mir_v3__maybe_t2d_mirror_v3.png` | 1.5 MB | – | candidate only, not used by any pick (see below) |
| `derived/media/kf2/candidates/DR03_mir_v3__maybe_t2d_mirror_v3e2.jpg` | 0.2 MB | – | candidate only, not used by any pick (see below) |
| `derived/media/kf2/candidates/V207_nbp_v2__before_fix.jpg` | 2.4 MB | – | candidate only, not used by any pick (see below) |
| `derived/reconstructed/work/g4/derived/DR05_mirror_t1.mp4` | 6.7 MB | (DR05, DR06) | **Reconstruction**, kept beside the original (see below) (28 Oct, cloud session), not the original: checked against RC4. Recipe: `tools/t2/derived/rebuild_DR05_mirror.py` (reproduces this file byte for byte). |
| `derived/reconstructed/work/t2/mirror/P107_push.mp4` | 4.9 MB | (P107) | **Reconstruction**, kept beside the original (see below) (28 Oct, cloud session), not the original: fitted to RC4. Recipe: `tools/t2/derived/rebuild_P107_push.py`. |

40 files, 82.0 MB in all; the largest is 6.7 MB (GitHub's limit is 100 MB).

## Originals from the take-two session (added 30 Oct)

The session that made take two still had its working files, so the originals are here. Copy `derived/work` and
`derived/media` over the repo root as above; the reconstructions moved to `derived/reconstructed/` (same relative paths) and are
no longer needed, but are kept for comparison.

| File | Size | Used by (render/data/picks2.json) | Kind | How it was made |
|---|---|---|---|---|
| `derived/work/t2/g2/crt/CRT_roomA.mp4` | 0.6 MB | CRT_roomA | original | `tools/t2/derived/crt_rooms.sh` (from `t2_C103L_sd25_t1_d610863352`) |
| `derived/work/t2/g2/crt/CRT_roomB.mp4` | 1.0 MB | CRT_roomB | original | `tools/t2/derived/crt_rooms.sh` (from `t2_C103R_sd25_t2_1584d49648`) |
| `derived/work/g4/derived/DR01_mirror_t1.mp4` | 13.3 MB | DR01 | original | `python3 tools/t2/derived/mirror_comp.py media/gen/t2_DR01_veo_t1_6514fc0a3e.mp4 work/g4/derived/DR01_mirror_t1.mp4 --right=pale` |
| `derived/work/g4/derived/DR05_mirror_t1.mp4` | 4.8 MB | DR05, DR06 | original | `python3 tools/t2/derived/mirror_comp.py media/gen/t2_DR05_veo_t1_1099c66960.mp4 work/g4/derived/DR05_mirror_t1.mp4 --right=teal --reverse` |
| `derived/work/t2/mirror/P107_push.mp4` | 6.9 MB | P107 | original | `tools/t2/derived/p107_push.py` (take `t2_P107_veo31_m1`, eye still `media/kf2/P107_eye_nbp_v1_2k.jpg`) |
| `derived/work/t2/mirror/V102_lettered.mp4` | 3.7 MB | V102 | original | `tools/t2/derived/v102_letter.py` on the frames of `t2_V102_sd20_t2_b72e2c06c8` (expects them extracted to `work/t2/mirror/v102/f_*.jpg`; paths are hard-coded) |
| `derived/media/kf2/DR03_mir_v3.jpg` | 0.3 MB | DR03 | original | the keyframe the pick uses (the two `candidates/DR03_*` files are no longer needed) |
| `derived/media/kf2/V207_nbp_v2fix.jpg` | 0.3 MB | V207 | original | `t2g3_V207_nbp_v2` with its bottom band faded to paper (hand fix; no script) |
| `derived/media/kf2/V123_nbp_v1_key.jpg` | 0.6 MB | V123K | original | V123_nbp_v1 with its black ground painted green (see the pick's note; no script survives) |

Scripts added to `tools/t2/derived/`: `mirror_comp.py` (DR01, DR05), `crt_rooms.sh` (CRT_roomA/B, recovered verbatim from the
session transcript), `p107_push.py` (P107), `v102_letter.py` (V102), `letter.py` (paints clean RARE EARTH / 1420 MHz marks on
stills; used for keyframe fixes). They are copied as they ran, with the session's absolute paths.

## Not here (before 30 Oct; superseded by the section above)

**Derived clips with no copy in the cloud session** (Jade's local `work/` has them; nothing in git rebuilds them):

- `work/t2/g2/crt/CRT_roomA.mp4`, `work/t2/g2/crt/CRT_roomB.mp4` (picks CRT_roomA, CRT_roomB): the chorus 2 CRT matrix insets of the two control rooms. No recipe was found.
- `work/g4/derived/DR01_mirror_t1.mp4` (pick DR01): the Veo take `t2_DR01_veo_t1_6514fc0a3e` (left half) plus its own flip, paled, either side of the mirror at x 960. Made by `work/g4/mirror_comp.py`, not in git.
- `work/t2/mirror/V102_lettered.mp4` (pick V102): the Seedance take `t2_V102_sd20_t2_b72e2c06c8` with RARE EARTH baked under the back circle on every frame (tracked, hair-occluded) by a scratchpad `v102_letter.py`, not in git.

**Keyframes with no exact source in the relay:**

- `media/kf2/DR03_mir_v3.jpg` (pick DR03): no job carries that name. Two mirror-reveal generations are candidates, `candidates/DR03_mir_v3__maybe_t2d_mirror_v3.png` and `__maybe_t2d_mirror_v3e2.jpg`; compare them with the DR03 plate before using either.
- `media/kf2/V207_nbp_v2fix.jpg` (pick V207): a hand fix of `t2g3_V207_nbp_v2` (its bottom band faded to paper to remove a leaked figure). The unfixed v2 is `candidates/V207_nbp_v2__before_fix.jpg`.
- `media/kf2/V123_nbp_v1_key.jpg` (pick V123K): derived from V123_nbp_v1 (its black ground keyed to green, see the pick's note); no script in git.
