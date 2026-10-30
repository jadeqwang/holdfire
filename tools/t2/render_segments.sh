#!/usr/bin/env bash
# Restart-safe full render: the film in 12 s segments (frame-exact boundaries), each its own file, skipped when already
# rendered, then concatenated without re-encoding and muxed with the audio. Re-run the same command after an interruption.
#   tools/t2/render_segments.sh NAME W H CRF [AUDIO]
#   tools/t2/render_segments.sh preview_540p_v7 960 540 23
#   tools/t2/render_segments.sh hold_fire_t2_master_rc2 1920 1080 14 media/audio/hold_fire_t2_mix.wav
# Renders to render/data/timing.json's duration (END=<s> overrides).
set -euo pipefail
NAME=$1; W=$2; H=$3; CRF=$4; AUDIO=${5:-"inputs/Hold Fire.mp3"}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
# the film's length (238.64 since the minor-fixes song), up to its last whole frame: ceil(duration * 24) frames, so the final frame
# (the loop frame, frame 0 again) is rendered; render.mjs rounds (to - from) * fps, which dropped it when the length is not on a frame
SEG=12; END=${END:-$(python3 -c "import json,math;print(math.ceil(json.load(open('$ROOT/render/data/timing.json'))['duration']*24-1e-6)/24)")}
DIR="$ROOT/work/out/seg_$NAME"; mkdir -p "$DIR"
n=$(python3 -c "import math;print(math.ceil($END/$SEG))")
: > "$DIR/list.txt"
for ((i = 0; i < n; i++)); do
  a=$((i * SEG)); b=$(python3 -c "print(min($END, $(((i + 1) * SEG))))")
  f="$DIR/s_$(printf %03d $i).mp4"
  if [ ! -s "$f.done" ]; then
    (cd "$ROOT/render" && node tools/render.mjs --from "$a" --to "$b" --fps 24 --w "$W" --h "$H" --jobs 3 --crf "$CRF" --noaudio 1 --out "$f.part.mp4" > "$DIR/s_$i.log" 2>&1)
    mv "$f.part.mp4" "$f"; echo ok > "$f.done"
  fi
  echo "file '$f'" >> "$DIR/list.txt"
  echo "segment $i/$n done"
done
ffmpeg -loglevel error -y -f concat -safe 0 -i "$DIR/list.txt" -c copy "$DIR/video.mp4"
cd "$ROOT"
ffmpeg -loglevel error -y -i "$DIR/video.mp4" -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -t "$END" -movflags +faststart "work/out/$NAME.mp4"
echo "wrote work/out/$NAME.mp4"
