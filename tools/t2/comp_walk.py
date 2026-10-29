#!/usr/bin/env python3
"""Composite verse 1's walk plates V108, V109, V110: one continuous green-screen walk over a painted era plate per shot.

The walk is Veo take t2_WALK_veo_t1 (media/gen/t2_WALK_veo_t1_8f93e107ff.mp4, Jade on green), keyed and scaled into the frame
the same way in all three shots (figure ~770 px tall, feet at y ~1016, x ~790); each shot's painted plate (Nano Banana Pro,
upscaled, a 2.36:1 panorama) is fitted to 1080 px high and scrolls left at 300 px/s from x 390, so she walks on through three
eras without breaking stride: the take runs on from 0.4 s (V108), 1.046 s (V109) and 1.691 s (V110), the shots' own starts.
The parameters were fitted to RC4's frames of these shots (the originals were made by a scratchpad script that is not in git).

    python3 tools/t2/comp_walk.py [V108 V109 V110]      # writes work/plates/<ID>/f_00000.jpg ... and meta.json
Needs OpenCV and numpy.
"""
import json
import os
import sys

import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WALK = 'media/gen/t2_WALK_veo_t1_8f93e107ff.mp4'
SHOTS = {   # id: (painted plate, walk take time at the shot's first frame)
    'V108': ('media/kf2/kf_V108_nbp_v1_up_c933dc2975.jpg', 0.4),
    'V109': ('media/kf2/kf_V109_nbp_v1_up_b4b1d995c8.jpg', 1.046),
    'V110': ('media/kf2/kf_V110_nbp_v1_up_a6d9fc2388.jpg', 1.691),
}
S, AX, AY, TX, TY = 0.84, 790, 1016, 930, 1020   # scale; the take's point (TX, TY) (feet, figure centre) lands on (AX, AY)
GREEN = (10, 246, 10)                            # BGR, the take's screen
X0, SPEED, N = 390, 300.0, 17                    # plate x at the shot start (px), scroll (px/s), frames per shot (each is ~16)


def key(f):
    """soft green key (alpha 1 = subject) and despill, on a float BGR frame"""
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    dom = (g - np.maximum(r, b)) / 255.
    a = 1 - np.clip((dom - 0.06) / 0.14, 0, 1)
    f = f.copy(); f[..., 1] = np.minimum(g, (r + b) * 0.5 + 5)
    return f, a


def main(ids):
    cap = cv2.VideoCapture(os.path.join(ROOT, WALK))
    M = np.float32([[S, 0, AX - TX * S], [0, S, AY - TY * S]])
    for sid in ids:
        bgf, t0 = SHOTS[sid]
        bg = cv2.imread(os.path.join(ROOT, bgf))
        bg = cv2.resize(bg, (round(bg.shape[1] * 1080 / bg.shape[0]), 1080), interpolation=cv2.INTER_AREA).astype(np.float32)
        out = os.path.join(ROOT, 'work', 'plates', sid); os.makedirs(out, exist_ok=True)
        for k in range(N):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t0 * 24)) + k)
            ok, f = cap.read()
            if not ok: raise SystemExit(f'{WALK}: no frame at {t0 * 24 + k}')
            # the take has 5 black rows top and bottom: painted green, and the frame's outside is green too, so both key out
            f = f.astype(np.float32); f[:6] = f[-6:] = GREEN
            w = cv2.warpAffine(f, M, (1920, 1080), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=GREEN)
            w, a = key(w)
            x = X0 + k * SPEED / 24
            xi = int(np.floor(x)); fr = x - xi
            B = bg[:, xi:xi + 1921]
            B = B[:, :1920] * (1 - fr) + B[:, 1:1921] * fr
            c = B * (1 - a[..., None]) + w * a[..., None]
            cv2.imwrite(os.path.join(out, f'f_{k:05d}.jpg'), np.clip(c, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93])
        meta = {'fps': 24.0, 'n': N, 'w': 1920, 'h': 1080, 'src': WALK, 'start': t0, 'dur': N / 24, 'fit': 'cover', 'kind': 'video', 'key': None,
                'comp': f'tools/t2/comp_walk.py: {bgf} scrolling {SPEED:g} px/s from x {X0}, walk keyed x{S} to ({AX}, {AY})'}
        json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'), indent=1)
        print(sid, N, 'frames ->', out)


if __name__ == '__main__':
    main(sys.argv[1:] or list(SHOTS))
