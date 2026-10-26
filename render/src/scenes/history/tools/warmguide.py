#!/usr/bin/env python3
"""Warm-light guide for the archival (printed matter) material: per drawing of an existing guide dir, a grayscale map of where
the source plate is lit by red / orange light (fire, alarm lamps, embers). archival.js prints those regions in the red spot ink.

  python3 warmguide.py SRC GUIDE_DIR [--start=S] [--lo=0.25] [--sat=0.5] [--blur=2.5] [--hmax=24]

SRC is the plate video (or still) the guides were made from; GUIDE_DIR holds meta.json (drawings[k].frame = source frame index).
Writes GUIDE_DIR/warm_NNNN.png (1280x720, L) and GUIDE_DIR/warm.json (which archival.js checks before loading warm maps).
Warmth = hue within [-25, hmax] deg of red (gold light, ~40 deg, is light, not fire, and stays black ink), weighted by saturation and value, soft-thresholded and lightly blurred.
"""
import json, os, sys
import numpy as np, cv2

PW, PH = 1280, 720


def opts():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = {x[2:].split('=')[0]: (x.split('=', 1)[1] if '=' in x else '1') for x in sys.argv[1:] if x.startswith('--')}
    return a, o


def warmth(bgr, lo=0.25, sat=0.5, blur=2.5, hmax=24.0):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV_FULL).astype(np.float32)
    h = hsv[..., 0] * (360.0 / 256.0); s = hsv[..., 1] / 255.0; v = hsv[..., 2] / 255.0
    d = np.where(h <= 180, h, h - 360)                               # signed hue: + towards orange, - towards magenta
    hue_w = np.clip(1 - np.maximum(d - hmax, -25 - d).clip(0) / 12.0, 0, 1)  # 1 inside [-25, hmax]; gold (~40+) stays out
    sat_w = np.clip((s - sat * 0.6) / (sat * 0.8), 0, 1)
    val_w = np.clip((v - 0.12) / 0.3, 0, 1)
    w = hue_w * sat_w * val_w
    w = np.clip((w - lo * 0.5) / (1 - lo * 0.5), 0, 1)
    if blur > 0: w = cv2.GaussianBlur(w, (0, 0), blur)
    return (w * 255).astype(np.uint8)


def main():
    a, o = opts()
    src, gdir = a[0], a[1]
    m = json.load(open(os.path.join(gdir, 'meta.json')))
    frames = [d['frame'] for d in m['drawings']]
    lo, sat, blur, hmax = float(o.get('lo', 0.25)), float(o.get('sat', 0.5)), float(o.get('blur', 2.5)), float(o.get('hmax', 24))
    if src.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        im = cv2.resize(cv2.imread(src), (PW, PH), interpolation=cv2.INTER_AREA)
        for k in range(len(frames)): cv2.imwrite(os.path.join(gdir, f'warm_{k:04d}.png'), warmth(im, lo, sat, blur, hmax))
    else:
        cap = cv2.VideoCapture(src)
        fps = cap.get(cv2.CAP_PROP_FPS) or 24
        n0 = int(round(float(o.get('start', m.get('start', 0))) * fps))
        want = {n0 + f: k for k, f in enumerate(frames)}
        cap.set(cv2.CAP_PROP_POS_FRAMES, n0)
        i, last = n0, max(want)
        while i <= last:
            ok, im = cap.read()
            if not ok: break
            if i in want:
                im = cv2.resize(im, (PW, PH), interpolation=cv2.INTER_AREA)
                cv2.imwrite(os.path.join(gdir, f'warm_{want[i]:04d}.png'), warmth(im, lo, sat, blur, hmax))
            i += 1
    json.dump({'warm': True, 'src': src, 'lo': lo, 'sat': sat, 'blur': blur, 'hmax': hmax, 'n': len(frames)}, open(os.path.join(gdir, 'warm.json'), 'w'))
    print('wrote', len(frames), 'warm maps to', gdir)


if __name__ == '__main__':
    main()
