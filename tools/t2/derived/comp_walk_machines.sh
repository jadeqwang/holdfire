#!/usr/bin/env bash
# The verse 1 machines (picks V118-V121): the keyed green-screen walk (work/plates/WALK_key = plates.py --key green on
# media/gen/t2_WALK_veo_t1_8f93e107ff.mp4) composited over the painted era plates by comp_walk.py.
# These are the exact final command lines from the session transcript (26 Oct, 22:56-23:03 UTC); comp_walk.py is the version
# they ran with. Run from the repo root.
set -euo pipefail
W=work/plates/WALK_key; C=tools/t2/derived/comp_walk.py
python3 tools/t2/plates.py media/gen/t2_WALK_veo_t1_8f93e107ff.mp4 WALK_key --key green   # if work/plates/WALK_key is missing
python3 $C --walk $W --bg media/kf2/V118_nbp_v1.jpg --bgflip --bgzoom 1.25 --bgy 0.7 --out V118 --t0 3.5 --dur 0.4 --scroll 700 --figh 470 --cx 760 --feet 1045 --bgx 0.1 --ref 24
python3 $C --walk $W --bg media/kf2/V119_nbp_v1.jpg --bgzoom 1.25 --bgy 1.0 --out V119 --t0 3.823 --dur 0.4 --scroll 700 --figh 400 --cx 1290 --feet 1060 --bgx 0.2 --ref 24
python3 $C --walk $W --bg media/kf2/V120_nbp_v1.jpg --bgzoom 1.4 --bgy 0.5 --out V120 --t0 4.146 --dur 0.4 --scroll 700 --figh 420 --cx 1150 --feet 1050 --bgx 0.35 --ref 24
python3 $C --walk $W --bg media/kf2/V121_nbp_v1.jpg --bgzoom 1.2 --bgy 0.8 --out V121 --t0 4.469 --dur 0.55 --scroll 400 --figh 340 --cx 760 --feet 1060 --bgx 0.3 --ref 24
# V108-V110 (the same walk over the first eras), final run 26 Oct 21:41 UTC, with the script as it stood then (before --bgzoom/--bgy/--bgflip were added; the current script's defaults reproduce it):
# for x in "V108 0.40 0.75 V108_nbp_v1" "V109 1.046 0.75 V109_nbp_v1" "V110 1.691 0.70 V110_nbp_v1"; do set -- $x
#   python3 $C --walk $W --bg media/kf2/$4.jpg --out $1 --t0 $2 --dur $3 --scroll 300 --figh 760 --cx 800 --feet 1010 --bgx 0.62 --ref 24; done
