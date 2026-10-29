#!/bin/bash
set -e
cd /home/user/holdfire
O=work/assess/media
enc() { # id src crop(x:y:w:h) [extra vf before]
  id=$1; src=$2; crop=$3; pre=${4:-}
  ffmpeg -v error -y -i "$src" -vf "${pre}scale=960:540:flags=lanczos,format=yuv420p" -an -c:v libx264 -crf 24 -preset slow -g 4 -bf 0 -movflags +faststart -r 24 $O/${id}_full.mp4
  ffmpeg -v error -y -i "$src" -vf "${pre}scale=1920:1080,crop=$crop,scale=iw*1.5:ih*1.5:flags=lanczos,format=yuv420p" -an -c:v libx264 -crf 20 -preset slow -g 4 -bf 0 -movflags +faststart -r 24 $O/${id}_tip.mp4
  ffmpeg -v error -y -i $O/${id}_full.mp4 -vf "select=eq(n\,0)" -vsync 0 -frames:v 1 -q:v 4 $O/${id}_poster.jpg
}
R=480:300:600:450       # the far framing: the end of the row
C=480:300:820:400       # the close-up
enc cur   media/gen/t2_V113_veof_t1_a076292c94.mp4 480:300:620:460
enc t1    media/gen/t2_V113_veof_2s_t1_f5e7040693.mp4 $R
enc t1rev media/derived/V113_t1rev.mp4 $R
enc t2    media/gen/t2_V113_veof_2s_t2_a4ec83aaae.mp4 $R
enc t3    media/gen/t2_V113_veof_2s_t3_75dc303699.mp4 $R
enc q1    media/gen/t2_V113_veof_2s_q1_c6833f8144.mp4 $R
enc q2    media/gen/t2_V113_veof_2s_q2_d77d9d7aee.mp4 $R
enc q3    media/gen/t2_V113_veof_2s_q3_34ff08ced2.mp4 480:300:700:420
enc c1    media/gen/t2_V113c_veof_c1_b34a4b3c6b.mp4 $C
enc c2    media/gen/t2_V113c_veof_c2_e9cce3d6db.mp4 $C
enc c3    media/gen/t2_V113c_veof_c3_338f9293d4.mp4 $C
# the shot as it plays in the film now (RC11, 25.37-27.32 s)
ffmpeg -v error -y -ss 25.375 -t 1.95 -i previews/hold_fire_t2_rc11_540p.mp4 -an -c:v libx264 -crf 22 -g 4 -bf 0 -movflags +faststart -vf format=yuv420p $O/film_full.mp4
ffmpeg -v error -y -ss 25.375 -t 1.95 -i previews/hold_fire_t2_rc11_540p.mp4 -an -vf "crop=240:150:310:230,scale=720:450:flags=lanczos,format=yuv420p" -c:v libx264 -crf 20 -g 4 -bf 0 -movflags +faststart $O/film_tip.mp4
ffmpeg -v error -y -i $O/film_full.mp4 -vf "select=eq(n\,0)" -vsync 0 -frames:v 1 -q:v 4 $O/film_poster.jpg
# stills: the two keyframes made for the close-up
for f in V113_close_nbp_v1.png V113_close_end_nbp_v1.jpg kf_V113_nbp_v5_up_ae46d8df4f.jpg; do
  ffmpeg -v error -y -i media/kf2/$f -vf scale=960:-2:flags=lanczos -q:v 4 $O/kf_${f%.*}.jpg
done
