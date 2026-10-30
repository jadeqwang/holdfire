#!/usr/bin/env python3
"""Preview on the new song without a full re-render: every frame of the new film (t = i / 24) is the v1 preview's frame at
the same musical moment, v1inv(t) (timing.json v1_map, the map the renderer itself uses), unless a re-rendered frame for it
exists in one of the splice dirs (frames rendered on the new timing, f_<i>.jpg with i the new film frame; later dirs win).

Because the renderer's whole edit is a function of timing.json and the plan times go through the same map, a full render on the
new timing differs from this remap only by the dropped frames (one v1 frame in ~50 is skipped where the new song is faster)
and in the ranges that changed (re-rendered and spliced).

    python3 tools/t2/remap_preview.py --v1 work/rc13 --splice work/rcv2/render [--splice ...] --out work/rcv2/frames
"""
import argparse
import json
import os
import shutil

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--v1', required=True)
    ap.add_argument('--splice', action='append', default=[])
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    T = json.load(open(os.path.join(ROOT, 'render', 'data', 'timing.json')))
    m = T['v1_map']; k1, k2 = np.array(m['v1']), np.array(m['v2'])
    n_new = int(np.ceil(T['duration'] * 24 - 1e-6))
    v1n = len([f for f in os.listdir(a.v1) if f.endswith('.jpg')])   # ffmpeg's %05d numbering starts at 1
    os.makedirs(a.out, exist_ok=True)
    src = {'v1': 0, 'splice': 0}
    log = []
    for i in range(n_new):
        f = None
        for d in reversed(a.splice):
            p = os.path.join(d, f'f_{i:05d}.jpg')
            if os.path.exists(p):
                f = p; src['splice'] += 1; break
        if f is None:
            t = i / 24
            seg = np.clip(np.searchsorted(k2, t, side='right') - 1, 0, len(k2) - 2)
            u = k1[seg] + (k1[seg + 1] - k1[seg]) * (t - k2[seg]) / (k2[seg + 1] - k2[seg])
            j = int(np.clip(np.floor(u * 24 + 0.5), 0, v1n - 1))
            f = os.path.join(a.v1, f'f_{j + 1:05d}.jpg'); src['v1'] += 1
            log.append(j)
        dst = os.path.join(a.out, f'f_{i:05d}.jpg')
        if os.path.lexists(dst):
            os.remove(dst)
        os.symlink(os.path.abspath(f), dst)
    rep = np.diff(np.array(log)) if log else np.array([])
    print(f'{n_new} frames: {src["v1"]} remapped from v1, {src["splice"]} re-rendered; v1 frames skipped {int((rep > 1).sum())}, repeated {int((rep == 0).sum())}')


if __name__ == '__main__':
    main()
