#!/usr/bin/env python3
"""Quick look at engraving guides without the browser: preview_engrave.py GUIDEDIR K OUT.jpg [--wmax=4.2] [--edge=0.6]"""
import sys, struct, numpy as np, cv2
a = [x for x in sys.argv[1:] if not x.startswith('--')]; o = {x[2:].split('=')[0]: float(x.split('=')[1]) for x in sys.argv[1:] if x.startswith('--')}
d, k, out = a[0], int(a[1]), a[2]
wmax = o.get('wmax', 4.2); SS = 2
buf = open(f'{d}/lines_{k:04d}.bin', 'rb').read(); n = struct.unpack_from('<i', buf, 0)[0]; p = 4
img = np.zeros((1080 * SS, 1920 * SS, 3), np.float32)
gold = np.array([67, 180, 244], np.float32) / 255  # BGR of #f4b443
hot = np.array([163, 226, 255], np.float32) / 255
for _ in range(n):
    m = struct.unpack_from('<i', buf, p)[0]; p += 4
    rec = np.frombuffer(buf, dtype=[('x', '<i2'), ('y', '<i2'), ('w', 'u1')], count=m, offset=p); p += m * 5
    xs = rec['x'] / 8 * SS; ys = rec['y'] / 8 * SS; ws = rec['w'] / 255
    for i in range(m - 1):
        w = (ws[i] + ws[i + 1]) / 2
        if w < 0.04: continue
        th = max(1, int(round(w * wmax * SS)))
        col = gold * (0.55 + 0.45 * w) + (hot - gold) * max(0, w - 0.7) * 2
        cv2.line(img, (int(xs[i]), int(ys[i])), (int(xs[i + 1]), int(ys[i + 1])), col.tolist(), th, cv2.LINE_AA)
e = cv2.imread(f'{d}/edge_{k:04d}.png', 0).astype(np.float32) / 255
e = cv2.resize(e, (1920 * SS, 1080 * SS))
img = np.maximum(img, e[..., None] * hot[None, None] * o.get('edge', 0.6))
img = cv2.resize(img, (1920, 1080), interpolation=cv2.INTER_AREA)
bloom = cv2.GaussianBlur(img, (0, 0), 6) * 0.6 + cv2.GaussianBlur(img, (0, 0), 24) * 0.4
img = img + bloom * 0.7 + np.array([13, 7, 5], np.float32) / 255
cv2.imwrite(out, (np.clip(img, 0, 1) * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92]); print(out)
