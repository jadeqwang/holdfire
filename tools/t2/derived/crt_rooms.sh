#!/usr/bin/env bash
# The chorus 2 CRT wall insets (picks CRT_roomA, CRT_roomB): 4 s of each control-room take, cropped 4:3 and scaled to 640x480.
# Recovered verbatim from the session transcript (26 Oct); run from the repo root with the two Seedance takes in media/gen/.
set -euo pipefail
mkdir -p work/t2/g2/crt
ffmpeg -v error -y -ss 0.5 -t 4 -i media/gen/t2_C103L_sd25_t1_d610863352.mp4 -vf "crop=960:720:200:0,scale=640:480" -r 24 -c:v libx264 -crf 14 work/t2/g2/crt/CRT_roomA.mp4
ffmpeg -v error -y -ss 0.5 -t 4 -i media/gen/t2_C103R_sd25_t2_1584d49648.mp4 -vf "crop=960:720:200:0,scale=640:480" -r 24 -c:v libx264 -crf 14 work/t2/g2/crt/CRT_roomB.mp4
for r in A B; do
  python3 tools/t2/plates.py work/t2/g2/crt/CRT_room$r.mp4 CRT_room$r --w 640 --h 480 --q 88
  python3 tools/t2/picks.py -g g2 set CRT_room$r CRT_room$r --in 0 --src work/t2/g2/crt/CRT_room$r.mp4
done
