# How the derived plates were made

Six picks use clips made from a generated take by a one-off script rather than by `tools/t2/plates.py` alone. The files are in
`derived/` where a copy existed (see `derived/README.md`); these notes say how each was made, so a session without them can rebuild
or replace them.

| Clip | Pick | Status | How it was made |
|---|---|---|---|
| `work/t2/mirror/P107_push.mp4` | P107 | Reconstructed 28 Oct; script here | `rebuild_P107_push.py`: Veo take `t2_P107_veo31_m1_705bb64fe9` frames 0-30, a cubic push 1 to 6.88x about (800, 550) over 46 frames, then 3 frames of the upscaled eye still `t2mir_P107_eye_up_5a818767b5`. Jade's original came from a scratchpad `p107_push.py` (it tracked her near eye and crossfaded into the 2K still); the reconstruction was fitted to RC4's frames. Re-running the script matches the committed clip exactly to frame 36 and within 0.3/255 after. |
| `work/g4/derived/DR05_mirror_t1.mp4` | DR05, DR06 | Reconstructed 28 Oct; script here | `rebuild_DR05_mirror.py`: Veo take `t2_DR05_veo_t1_1099c66960` frames 0-95 in reverse, the glass line tracked per frame, the left of it mirrored to the right with a cool grade. Reproduces the committed clip byte for byte. |
| `work/g4/derived/DR01_mirror_t1.mp4` | DR01 | Missing (Jade's machine) | `work/g4/mirror_comp.py` (not in git): Veo take `t2_DR01_veo_t1_6514fc0a3e`, its left half plus its own flip, paled, either side of the mirror at x 960, so Jade and her reflection face each other. Rebuild: the DR05 script's mirror step, without the reverse, on that take. |
| `work/t2/mirror/V102_lettered.mp4` | V102 (V103 continues it) | Missing (Jade's machine) | Scratchpad `v102_letter.py` (not in git): Seedance 2.0 take `t2_V102_sd20_t2_b72e2c06c8` (1280x720) with RARE EARTH lettered under the back circle on every frame, tracked and occluded by her hair. Without it, the raw take works as a stand-in (no lettering). |
| `work/t2/g2/crt/CRT_roomA.mp4`, `CRT_roomB.mp4` | CRT_roomA, CRT_roomB | Missing (Jade's machine) | Chorus 2's CRT matrix insets: short loops of the two control rooms (room A Jade's, room B teal-tips') shown on two of the CRT screens (`timeline.js`, `t2_crt_matrix` `inset`). No recipe survives in git or in the cloud sessions' notes. |

Restore the generated takes with `python3 tools/t2/restore_media.py media/gen/<file>` (the relay keeps them about 21 days).
