"""Visual lip-sync check: mouth crops at each sung word onset, one row per candidate lag (as played, on twos).
(Ported from Rare Earth pipeline/sync/wordstrip.py: words now come from render/data/timing.json, the crop follows the
anime-face-cascade box frame by frame, rows = lags and columns = words.) The most reliable check (pipeline_lessons §2):
pick the row where b/m/p close, vowels open and the mouth is shut in the gaps.

  python3 tools/sync/wordstrip.py CLIP.mp4 S0 A B OUT.jpg [--lags=-0.125,0,0.125] [--box=x,y,w,h] [--words=timing.json]
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import FPS, frame_on_twos, load_words, read_frames  # noqa: E402

TH = 112            # tile height px
MAXW = 18           # at most this many word columns (evenly thinned)


def mouth_crop_box(fbox):
    """Lower face from a cascade face box (x, y, w, h): the mouth with nose tip and chin for context."""
    x, y, w, h = fbox
    return x + 0.18 * w, y + 0.40 * h, 0.64 * w, 0.52 * h


def strip(frames, f0, words, s0, lags, out, boxes=None, fixed=None, best=None, title=None):
    """frames[i] is clip frame f0 + i; boxes[i] its face box (x, y, w, h) or None; fixed = crop box for all frames.
    Writes OUT.jpg: rows = lags, columns = words."""
    H, W = frames[0].shape[:2]
    if len(words) > MAXW:
        words = [words[int(round(k))] for k in np.linspace(0, len(words) - 1, MAXW)]
    if fixed is None:
        good = [b for b in (boxes or []) if b is not None]
        fixed = mouth_crop_box(np.median(np.array(good), 0)) if good else (W / 3, H / 3, W / 3, H / 3)
    aspect = fixed[2] / max(1.0, fixed[3])
    tw = int(np.clip(TH * aspect, 72, 200))
    lab_w = 74
    head = np.full((34, lab_w + tw * len(words), 3), 24, np.uint8)
    for j, (wd, t) in enumerate(words):
        cv2.putText(head, wd[:10], (lab_w + j * tw + 3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
        cv2.putText(head, f'{t:.2f}', (lab_w + j * tw + 3, 29), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (170, 170, 170), 1)
    rows = [head]
    for lag in lags:
        lab = np.full((TH, lab_w, 3), 24, np.uint8)
        col = (0, 255, 0) if best is not None and abs(lag - best) < 1e-6 else (200, 200, 200)
        cv2.putText(lab, f'{lag:+.3f}', (4, TH // 2 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 1)
        cv2.putText(lab, f'{lag * FPS:+.0f}f', (4, TH // 2 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, col, 1)
        tiles = [lab]
        for wd, t in words:
            fi = int(frame_on_twos(t, s0, lag))
            k = fi - f0
            tile = np.zeros((TH, tw, 3), np.uint8)
            if 0 <= k < len(frames):
                b = boxes[k] if boxes is not None and boxes[k] is not None else None
                x, y, w, h = mouth_crop_box(b) if b is not None else fixed
                x0, y0 = int(max(0, x)), int(max(0, y))
                c = frames[k][y0:int(min(H, y + h)), x0:int(min(W, x + w))]
                if c.size:
                    tile = cv2.resize(c, (tw, TH), interpolation=cv2.INTER_AREA)
            else:
                cv2.putText(tile, 'out', (4, TH // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 255), 1)
            cv2.putText(tile, f'f{fi}', (3, TH - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (0, 255, 255), 1)
            tiles.append(tile)
        row = np.hstack(tiles)
        if best is not None and abs(lag - best) < 1e-6:
            cv2.rectangle(row, (0, 0), (row.shape[1] - 1, TH - 1), (0, 200, 0), 2)
        rows.append(row)
    img = np.vstack(rows)
    if title:
        bar = np.full((22, img.shape[1], 3), 0, np.uint8)
        cv2.putText(bar, title[:int(img.shape[1] / 7)], (4, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
        img = np.vstack([bar, img])
    cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return out


if __name__ == '__main__':
    import mouth
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
    clip, s0, A, B, out = a[0], float(a[1]), float(a[2]), float(a[3]), a[4]
    lags = [float(v) for v in o.get('lags', '-0.25,-0.125,0,0.125,0.25').split(',')]
    frames, fps, n = read_frames(clip)
    words = load_words(A, B, o.get('words'))
    fixed = tuple(float(v) for v in o['box'].split(',')) if 'box' in o else None
    boxes = None
    if fixed is None:
        fb, hit = mouth.detect_faces(frames)
        boxes = [tuple(b) for b in fb] if fb is not None else None
    strip(frames, 0, words, s0, lags, out, boxes=boxes, fixed=fixed, title=f'{os.path.basename(clip)}  S0 {s0}')
    print(f'{out}: {len(words)} words x {len(lags)} lags')
