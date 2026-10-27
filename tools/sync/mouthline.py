#!/usr/bin/env python3
"""Mouth line for a lip-synced pick: every drawing's mouth along the take's own clock, against the vocal it heard.

  work/venv/mp312/bin/python tools/sync/mouthline.py PICK [PICK ...] [--lag=L] [--out=work/t2/lips]

Top: the mouth crop of every even clip frame from (A - s0 - 0.75) to (B - s0 + 1.5) s of clip time (two rows if long).
Below, on the same clip-time axis: the take's openness (lipmeasure.py, black), the vocal stem's voiced loudness (remouth's
target, orange) and RMS (grey) drawn at clip time = song time - s0 + LAG, and the sung words at their onsets (+ LAG).
With the right LAG the black peaks sit on the orange ones, b/m/p and rests line up with closed crops, and they keep
lining up to the last word (drift shows as a growing offset). LAG defaults to the pick's lag; the shot's window is shaded.
Needs OUT/PICK.measure.json (lipmeasure.py) for the boxes and openness.
"""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import FPS, ROOT, load_words, vocal_env  # noqa: E402
import remouth  # noqa: E402

PX = 64      # px per drawing (2 frames)


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
    outdir = o.get('out', os.path.join(ROOT, 'work', 't2', 'lips'))
    P = json.load(open(os.path.join(ROOT, 'render', 'data', 'picks2.json')))
    for pick in a:
        m = json.load(open(os.path.join(outdir, f'{pick}.measure.json')))
        s0, (A, B) = m['s0'], m['win']
        lag = float(o['lag']) if 'lag' in o else float(P.get(pick, {}).get('lag', 0) or 0)
        frames = remouth.read_clip(os.path.join(ROOT, m['take']))
        n = len(frames)
        boxes = np.array(m['boxes']); op = np.array(m['open'], float)
        c0 = max(0.0, A - s0 + lag - 0.75); c1 = min((n - 1) / FPS, B - s0 + lag + 1.0)
        ks = [k for k in range(int(c0 * FPS) // 2 * 2, int(c1 * FPS) + 1, 2) if k < n]
        Wd = PX * len(ks)
        x_of = lambda ct: (ct - ks[0] / FPS) * FPS / 2 * PX + PX / 2
        tiles = []
        for k in ks:
            cx, cy, w, h = boxes[k]; s = max(w, h) * 1.05
            x0, y0 = int(max(0, cx - s)), int(max(0, cy - 0.75 * s))
            c = frames[k][y0:int(cy + 1.0 * s), x0:int(cx + s)]
            t = cv2.resize(c, (PX, PX), interpolation=cv2.INTER_CUBIC) if c.size else np.zeros((PX, PX, 3), np.uint8)
            tiles.append(t)
        strip = np.hstack(tiles)
        GH = 170
        g = np.full((GH, Wd, 3), 255, np.uint8)
        # window shading (clip time of the song window at this lag)
        cv2.rectangle(g, (int(x_of(A - s0 + lag)), 0), (int(x_of(B - s0 + lag)), GH), (235, 245, 235), -1)
        ct = np.arange(ks[0], min(n, ks[-1] + 2)) / FPS
        song = ct + s0 - lag
        et, e = vocal_env(song[0] - 1, song[-1] + 1)
        remouth._VOC = None
        tv = remouth.target_at(song, (song[0] + 0.5, song[-1] - 0.5))
        ev = np.interp(song, et, e)
        def poly(v, col, th):
            v = np.asarray(v, float); lo, hi = np.nanpercentile(v, 3), np.nanpercentile(v, 97)
            y = GH - 30 - np.clip((v - lo) / (hi - lo + 1e-9), 0, 1.05) * (GH - 50)
            pts = np.stack([x_of(ct), y], 1).astype(np.int32)
            cv2.polylines(g, [pts], False, col, th, cv2.LINE_AA)
        poly(ev, (170, 170, 170), 1)
        poly(tv, (0, 140, 255), 2)
        poly(op[ks[0]:ks[0] + len(ct)], (0, 0, 0), 2)
        for wd, t in load_words(song[0], song[-1]):
            x = int(x_of(t - s0 + lag)); cv2.line(g, (x, 0), (x, GH - 22), (0, 0, 200), 1)
            cv2.putText(g, wd[:9], (x + 2, 12), 0, 0.4, (0, 0, 200), 1)
        for k in ks[::6]:
            x = int(x_of(k / FPS)); cv2.putText(g, f'{k / FPS:.2f}', (x - 12, GH - 6), 0, 0.36, (90, 90, 90), 1)
        img = np.vstack([strip, g])
        bar = np.full((20, Wd, 3), 0, np.uint8)
        cv2.putText(bar, f'{pick}  {os.path.basename(m["take"])}  s0 {s0}  lag {lag:+.3f} ({lag * FPS:+.0f} f)  black=mouth open  orange=voiced loudness  grey=rms'
                    f'  axis = clip seconds', (4, 14), 0, 0.42, (255, 255, 255), 1)
        img = np.vstack([bar, img])
        # wrap long lines into rows of <= 1900 px
        rows = []
        step = (1900 // PX) * PX
        for x0 in range(0, img.shape[1], step):
            r = img[:, x0:x0 + step]
            if r.shape[1] < step: r = np.hstack([r, np.full((r.shape[0], step - r.shape[1], 3), 40, np.uint8)])
            rows.append(r)
        out = os.path.join(outdir, f'{pick}{o.get("tag", "")}.mouthline.jpg')
        cv2.imwrite(out, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
        print(out)


if __name__ == '__main__':
    main()
