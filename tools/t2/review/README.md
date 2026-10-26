# Hold Fire Review page

Source of the review artifact https://claude.ai/artifact/5TxMNc1VqDJAwm8h3V4oQj (private to Jade): an HLS player of the
current preview with time-stamped notes kept in the artifact's `db` (collection `notes`: `{t, text, version, by, at}`).
To publish a new cut: encode the preview into `media/` as 6 s fMP4 HLS segments (H.264 main, no B-frames, keyframe per
segment), update `VERSION`, `SEGS` in the page, and republish to the same URL in ≤ 64 MB batches (page + init + first half,
then the rest). Read Jade's notes back with the ArtifactData tool (`list` on `notes`).
