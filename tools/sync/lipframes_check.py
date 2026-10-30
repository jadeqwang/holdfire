#!/usr/bin/env python3
"""Lip sync from the renderer's own records: for every lip-synced pick, the plate frame the renderer drew on each film frame
(render/tools/lipcheck.mjs writes OUT/<PICK>.render.json, even when its strip step fails) against the sync formula
(common.frame_on_twos on the v1 clock: clipT = v1inv(hold(t)) - s0 + lag). Needs no mouth boxes, so it works on the upscaled
plates, whose file names docs/take2/mouths.json does not know (lipstrip.py fails on them).

P106 is checked with its own clock (timeline.js: the held "-WAKE" at 0.57x, s0' = s0 + 0.43 * max(0, hold2(t) - hold2(awake))).
A pick with no drawn frames is not on screen in the edit (C209R: teal-tips only listens in C209, C209R_LS).

    cd render && node tools/lipcheck.mjs --out ../work/t2/lips      # (re-run tools/shots_json.mjs first after any timing change)
    python3 tools/sync/lipframes_check.py [work/t2/lips]
"""
import glob
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402

ROOT = C.ROOT
P106_R = 0.57


def main(argv):
    d = argv[0] if argv else os.path.join(ROOT, 'work', 't2', 'lips')
    inv = C.song_v1inv()
    T = json.load(open(C.TIMING))
    awake = next(w['start'] for l in T['lines'] if l['section'] == 'Pre-Chorus 1' for w in l['words'] if w['w'].lower().startswith('awake'))
    hold2 = lambda t: (np.floor(np.asarray(t) * 24 + 1e-3).astype(int) - np.floor(np.asarray(t) * 24 + 1e-3).astype(int) % 2) / 24
    tot = bad = 0
    for f in sorted(glob.glob(os.path.join(d, '*.render.json'))):
        r = json.load(open(f))
        meta = json.load(open(os.path.join(ROOT, r['dir'], 'meta.json')))
        fr = [x for x in r['frames'] if x['f'] is not None]
        if not fr:
            print(f"{r['pick']:8s} not drawn in its window {r['win']}")
            continue
        t = np.array([x['t'] for x in fr]); got = np.array([x['f'] for x in fr])
        kw = dict(twos=r.get('twos', True), start=meta.get('start', 0), n=meta['n'], v1inv=inv)
        if r['pick'] == 'P106':
            s0 = r['s0'] + (1 - P106_R) * np.maximum(0, hold2(t) - hold2(awake))
            exp = np.array([C.frame_on_twos(a, b, r['lag'], **kw) for a, b in zip(t, s0)])
        else:
            exp = C.frame_on_twos(t, r['s0'], r['lag'], **kw)
        mm = int((got != exp).sum()); tot += len(fr); bad += mm
        print(f"{r['pick']:8s} {r['shot']:6s} {len(fr):4d} drawn frames  off the formula: {mm}")
    print(f'total {tot} drawn frames, {bad} off')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
