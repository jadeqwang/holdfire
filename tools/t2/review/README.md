# Hold Fire Review page

Source of the review artifact. Current: https://claude.ai/artifact/5zJ9QMYwzPzPhzZ5Dx5PUx (v16, RC11, 29 Oct; v10 RC5 to v15 RC10 before it on the same page;
published from a cloud session that could not write to the earlier page, so its notes start empty). Earlier: https://claude.ai/artifact/5TxMNc1VqDJAwm8h3V4oQj
(v1 to v9; Jade's notes on those cuts stay there). An HLS player of the
current preview with time-stamped notes kept in the artifact's `db` (collection `notes`: `{t, text, version, by, at}`).
To publish a new cut: encode the preview into `media/` as 6 s fMP4 HLS segments (H.264 main, no B-frames, keyframe per
segment; e.g. `ffmpeg -i PREVIEW -c:v libx264 -profile:v main -bf 0 -b:v 1500k -g 144 -sc_threshold 0 -force_key_frames
"expr:gte(t,n_forced*6)" -c:a copy -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_type fmp4 -hls_fmp4_init_filename
init.mp4 -hls_segment_filename media/s%03d.mp4 media/film.m3u8`, then copy film.m3u8 to film.txt), update `VERSION`, `SEGS` in the page, and republish to the same URL in ≤ 64 MB batches (page + init + first half,
then the rest). Read Jade's notes back with the ArtifactData tool (`list` on `notes`).
