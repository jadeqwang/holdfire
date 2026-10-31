# Hold Fire: music video (take two)

Jade's music video for "Hold Fire". The current edit is take two on the "minor fixes" song. Read `docs/take2/HANDOFF.md` before
doing anything: where everything is, how to rebuild, open items and traps. The full record is `docs/take2/REVIEW_NOTES.md`; the
plan is `docs/PLAN_TAKE_TWO.md`.

## Branches
- `claude/hold-fire-take-two`: the working branch for take two (PRs merge here). `main` only has the original inputs.
- `derived-plates`: the derived clips, keyframes and composite plate folders the generation relay can't rebuild (`derived/`) and
  their scripts. Never merge it (large media); copy `derived/` over the repo root when setting up a machine.

## The rule that breaks things silently
Every time typed into the code is a **v1 song time** (the song before "minor fixes"). `render/data/timing.json` holds the map
(`v1_map`), and the renderer exposes it as `A.v1(t)` (v1 -> current song) and `A.v1inv(t)` (`render/src/audio.js`). Plan times
(`beat('m:ss')`), `ev()` bounds, the chess schedule's literals (`V(...)`) and lip-synced picks' `s0`/`lag` all go through it. New
code derives times from `timing.json`, or wraps a typed time in `A.v1`. An unwrapped literal makes a lookup skip to the wrong event,
and `check_cuts.mjs` will not notice (the cut sits on its wrong anchor): check the shot list or render stills.

## After any timing or edit change
Regenerate, in order: `python3 tools/audio/retime_v2.py` (if the timing map changed), `cd render && node tools/shots_json.mjs`,
`python3 tools/audio/sfx_t2.py --no-audition` (the mix; sound cues are read from the edit), `python3 tools/t2/subtitles.py`.
Then run `node tools/check_cuts.mjs`, `node tools/chess_check.mjs`, `node tools/chess_lens.mjs`, `node tools/lipcheck.mjs --out
../work/t2/lips` and `python3 tools/sync/lipframes_check.py` (expect 0 off). Render stills of what changed and look at them.

## Media on disk (gitignored)
`media/` (generated takes, keyframes, the mix) and `work/` (plates, stems, renders) are not in git. Rebuild them with
`tools/t2/conform_all.py` (needs `CLOUDFLARE_API_TOKEN` for the relay's KV mirror, account and namespace in
`tools/t2/restore_media.py`), then `tools/t2/comp_walk.py`, then the stems and mix (`HANDOFF.md`). **The relay's mirror expires
around 15 Nov 2026**: after that the takes exist only where they were downloaded. Keep a backup of `media/gen/`.

## This machine (Jade's home computer)
The render tools were written for the cloud container: `render/tools/render.mjs`, `lipcheck.mjs` (and `bench`, `lookdev`, `profile`,
`storyboard`) import Playwright from `/opt/node-tools/node_modules/playwright/index.js` and launch Chromium from
`/opt/pw-browsers/...`. Locally, install Playwright and point these at it (`render.mjs` and `lipcheck.mjs` already honour `CHROME`);
keep the SwiftShader flags (the look was built on them) and confirm with one still. `tools/gen/*` mention an old
`~/Documents/moongazing/.venv`; the generation relay is only needed for new takes (spend is logged in `docs/spend_ledger.jsonl`, cap
in `tools/gen/spend.py`).

## Conventions
- Jade reviews by eye: render stills or a short clip of every change and look before reporting it done.
- Commit messages and notes in the existing plain style (what changed, why, the numbers that prove it).
- Never commit files over 95 MB (GitHub's limit is 100 MB); large media goes to `previews/` only when Jade asks.
