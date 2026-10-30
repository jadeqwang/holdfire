#!/usr/bin/env python3
"""Word strip from a render/tools/lipcheck.mjs record (OUT/<PICK>.render.json): what the renderer showed at each word onset.

  work/venv/mp312/bin/python tools/sync/lipstrip.py work/t2/lips/V101.render.json [--d=-0.25,0.5]

Rows: "film" (the rendered film frame at the onset), "R" (the mouth of the plate frame the renderer drew), then lag + d for
d in [-0.25, +0.5] s in 1/24 s steps around the record's lagCentre (common.frame_on_twos, the renderer's own rule; the row at
the pick's own lag is checked against R and the mismatch count printed). Mouth crops follow the box tracked by
tools/sync/lipmeasure.py (cached in OUT/<PICK>.measure.json, else tracked here from docs/take2/mouths.json).
Read it as: b/m/p closed, open vowels open, mouth shut in rests; one row should hold from the first to the last word.
"""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import FPS, ROOT, frame_on_twos, song_v1inv  # noqa: E402
V1INV = song_v1inv()   # the renderer runs lip-synced takes on the v1 clock (timing.json v1_map)

TH = 96


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
    rec = json.load(open(a[0]))
    out = o.get('out', a[0].replace('.render.json', '.lipcheck.jpg'))
    d0, d1 = (float(v) for v in o.get('d', '-0.25,0.5').split(','))
    meta = json.load(open(os.path.join(ROOT, rec['dir'], 'meta.json')))
    n, start = meta['n'], meta.get('start', 0) or 0
    src = os.path.join(ROOT, meta['src'])
    mj = os.path.join(os.path.dirname(a[0]), f"{rec['pick']}.measure.json")
    boxes = None
    if os.path.exists(mj):
        m = json.load(open(mj))
        if os.path.basename(m['take']) == os.path.basename(src) and start == 0:
            boxes = np.array(m['boxes'])
    import remouth
    frames = remouth.read_clip(src)
    if boxes is None:
        import lipmeasure
        _, boxes = lipmeasure.track(src, lipmeasure.mouth_spec(src), frames)
        if start:
            boxes = boxes[int(round(start * FPS)):]
    # plate frame k = take frame k + start*fps (plates.py --start)
    off = int(round(start * FPS))
    ws = rec['words']
    lag = rec['lagCentre']
    ds = np.arange(round(d0 * FPS), round(d1 * FPS) + 1) / FPS
    bw = float(np.median(boxes[:, 2]))
    tw = TH
    lab = 70
    def crop(k):
        tile = np.zeros((TH, tw, 3), np.uint8)
        if k is None or not (0 <= k < n):
            cv2.putText(tile, 'off', (4, TH // 2), 0, 0.45, (80, 80, 255), 1)
            return tile
        j = k + off
        cx, cy, w, h = boxes[min(j, len(boxes) - 1)]
        s = max(w, h) * 1.7
        H, W = frames[j].shape[:2]
        x0, y0 = int(max(0, cx - s)), int(max(0, cy - s * 0.85))
        c = frames[j][y0:int(min(H, cy + s * 1.15)), x0:int(min(W, cx + s))]
        if c.size:
            tile = cv2.resize(c, (tw, TH), interpolation=cv2.INTER_CUBIC)
        cv2.putText(tile, f'f{k}', (3, TH - 4), 0, 0.33, (0, 255, 255), 1)
        return tile
    head = np.full((32, lab + tw * len(ws), 3), 24, np.uint8)
    for i, w in enumerate(ws):
        cv2.putText(head, w['w'][:9], (lab + i * tw + 3, 13), 0, 0.42, (255, 255, 255), 1)
        cv2.putText(head, f"{w['t']:.2f}", (lab + i * tw + 3, 27), 0, 0.36, (170, 170, 170), 1)
    def labelled(txt, sub, tiles, col=(200, 200, 200)):
        L = np.full((TH, lab, 3), 24, np.uint8)
        cv2.putText(L, txt, (4, TH // 2 - 4), 0, 0.48, col, 1)
        if sub: cv2.putText(L, sub, (4, TH // 2 + 14), 0, 0.38, col, 1)
        return np.hstack([L] + tiles)
    film = []
    for w in ws:
        im = cv2.imread(w['film']) if w.get('film') and os.path.exists(w['film']) else None
        film.append(cv2.resize(im, (tw, TH * im.shape[0] // im.shape[1] if im is not None else TH))[:TH] if im is not None else np.zeros((TH, tw, 3), np.uint8))
        if film[-1].shape[0] < TH: film[-1] = np.vstack([film[-1], np.zeros((TH - film[-1].shape[0], tw, 3), np.uint8)])
    rows = [head, labelled('film', '', film), labelled('R', f"{rec['lag'] * FPS:+.0f}f", [crop(w['f']) for w in ws], (0, 200, 255))]
    mism = 0
    for d in ds:
        L = lag + d
        fs = [int(frame_on_twos(w['t'], rec['s0'], L, twos=rec.get('twos', True), start=start, n=n, v1inv=V1INV)) for w in ws]
        if abs(L - rec['lag']) < 1e-6:
            mism = sum(1 for w, f in zip(ws, fs) if w['f'] is not None and w['f'] != f)
        row = labelled(f'{L:+.3f}', f'{L * FPS:+.0f}f', [crop(f) for f in fs], (0, 255, 0) if abs(d) < 1e-6 else (200, 200, 200))
        if abs(d) < 1e-6:
            cv2.rectangle(row, (0, 0), (row.shape[1] - 1, TH - 1), (0, 200, 0), 2)
        rows.append(row)
    img = np.vstack(rows)
    bar = np.full((22, img.shape[1], 3), 0, np.uint8)
    cv2.putText(bar, f"{rec['pick']}  {os.path.basename(src)}  s0 {rec['s0']}  pick lag {rec['lag']:+.3f}  centre {lag:+.3f}  "
                f"renderer==formula: {'yes' if mism == 0 else f'NO ({mism} words)'}", (4, 15), 0, 0.42, (255, 255, 255), 1)
    cv2.imwrite(out, np.vstack([bar, img]), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(f"{out}: {len(ws)} words x {len(ds)} lags; renderer frames vs formula at the pick lag: {mism} mismatches")


if __name__ == '__main__':
    main()
