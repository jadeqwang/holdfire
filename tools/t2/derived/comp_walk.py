#!/usr/bin/env python3
"""Composite a keyed walk plate (plates.py --key green) over a painted era plate that scrolls (camera tracking the walk).
comp_walk.py --walk work/plates/WALKKEY --bg IMG --out NAME --t0 S --dur D [--scroll 420] [--figh 760] [--cx 900] [--feet 1010]
             [--bgx 0.0 (start offset, fraction of the scrollable width)] [--tint 0.12] [--shadow 0.35] [--ref 0 (frame for scale/anchor)]
Writes work/plates/NAME/f_00000.jpg... + meta.json (kind video, 24 fps). Figure scale and anchor are fixed from the reference frame,
so the figure keeps its size and the walk cycle stays as generated; the background slides left at `scroll` px/s."""
import argparse, json, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = '/home/user/holdfire'
ap = argparse.ArgumentParser()
ap.add_argument('--walk'); ap.add_argument('--bg'); ap.add_argument('--out')
ap.add_argument('--t0', type=float, default=0); ap.add_argument('--dur', type=float, default=1)
ap.add_argument('--scroll', type=float, default=420); ap.add_argument('--figh', type=float, default=760)
ap.add_argument('--cx', type=float, default=900); ap.add_argument('--feet', type=float, default=1010)
ap.add_argument('--bgx', type=float, default=0.0); ap.add_argument('--tint', type=float, default=0.06)
ap.add_argument('--shadow', type=float, default=0.35); ap.add_argument('--ref', type=int, default=None)
ap.add_argument('--flip', action='store_true'); ap.add_argument('--bgzoom', type=float, default=1.0); ap.add_argument('--bgy', type=float, default=0.5); ap.add_argument('--bgflip', action='store_true')
a = ap.parse_args()
wd = os.path.join(ROOT, a.walk)
meta = json.load(open(os.path.join(wd, 'meta.json')))
f0 = int(round(a.t0 * 24)); n = int(round(a.dur * 24))
ref = f0 if a.ref is None else a.ref
def load(i):
    i = max(0, min(meta['n'] - 1, i))
    c = np.asarray(Image.open(os.path.join(wd, f'f_{i:05d}.jpg')).convert('RGB'), np.float32) / 255
    m = np.asarray(Image.open(os.path.join(wd, f'm_{i:05d}.png')), np.float32) / 255
    m = m.copy(); B = 10; m[:B] = 0; m[-B:] = 0; m[:, :B] = 0; m[:, -B:] = 0
    return c, m
c, m = load(ref)
ys, xs = np.nonzero(m > 0.5)
top, bot = ys.min(), ys.max()
cxs = xs[ys > bot - (bot - top) * 0.5].mean() if a.cx else xs.mean()   # horizontal anchor: hips/legs centre of mass
cxs = xs.mean()
k = a.figh / (bot - top)
bg = Image.open(a.bg).convert('RGB')
if a.bgflip: bg = bg.transpose(Image.FLIP_LEFT_RIGHT)
bk = 1080 * a.bgzoom / bg.height
bg = bg.resize((round(bg.width * bk), round(bg.height * bk)), Image.LANCZOS)
yo = round((bg.height - 1080) * a.bgy); bg = bg.crop((0, yo, bg.width, yo + 1080))
bgA = np.asarray(bg, np.float32) / 255
span = bg.width - 1920
x0 = a.bgx * span
if x0 + a.scroll * a.dur > span:
    print(f'warning: scroll runs off the plate ({x0 + a.scroll * a.dur:.0f} > {span}); clamping')
mean = bgA.reshape(-1, 3).mean(0)
od = os.path.join(ROOT, 'work/plates', a.out); os.makedirs(od, exist_ok=True)
for f in os.listdir(od): os.remove(os.path.join(od, f))
for i in range(n):
    t = i / 24
    xo = min(span, x0 + a.scroll * t)
    xi = int(xo); fr = xo - xi
    B = bgA[:, xi:xi + 1921]
    B = B[:, :1920] * (1 - fr) + B[:, 1:1921] * fr if B.shape[1] > 1920 else B[:, :1920]
    out = B.copy()
    c, m = load(f0 + i)
    H, W = m.shape
    sw, sh = round(W * k), round(H * k)
    ci = np.asarray(Image.fromarray((c * 255).astype(np.uint8)).resize((sw, sh), Image.LANCZOS), np.float32) / 255
    mi = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((sw, sh), Image.LANCZOS), np.float32) / 255
    if a.flip: ci, mi = ci[:, ::-1], mi[:, ::-1]
    ox = round(a.cx - (cxs if not a.flip else W - cxs) * k); oy = round(a.feet - bot * k)
    # shadow: a soft ellipse under the feet
    if a.shadow > 0:
        sh_ = Image.new('L', (1920, 1080), 0)
        from PIL import ImageDraw
        dd = ImageDraw.Draw(sh_); r = a.figh * 0.22
        dd.ellipse([a.cx - r, a.feet - r * 0.09, a.cx + r, a.feet + r * 0.09], fill=255)
        s = np.asarray(sh_.filter(ImageFilter.GaussianBlur(r * 0.12)), np.float32)[..., None] / 255
        out = out * (1 - a.shadow * s)
    # paste
    x1, y1 = max(0, ox), max(0, oy); x2, y2 = min(1920, ox + sw), min(1080, oy + sh)
    if x2 > x1 and y2 > y1:
        cc = ci[y1 - oy:y2 - oy, x1 - ox:x2 - ox]; mm = mi[y1 - oy:y2 - oy, x1 - ox:x2 - ox][..., None]
        lum = cc.mean(-1, keepdims=True); lo = cc.min(-1, keepdims=True)
        wk = np.clip((lo - 0.55) / 0.25, 0, 1) * 0.8           # near-white (sneakers, jacket): remove the despill's magenta cast
        cc = cc * (1 - wk) + lum * wk
        cc = cc * (1 - a.tint) + cc * mean / max(1e-3, mean.mean()) * a.tint
        out[y1:y2, x1:x2] = out[y1:y2, x1:x2] * (1 - mm) + np.clip(cc, 0, 1) * mm
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(od, f'f_{i:05d}.jpg'), quality=90)
json.dump({'fps': 24, 'n': n, 'w': 1920, 'h': 1080, 'src': f'composite {a.walk} t0={a.t0} over {os.path.relpath(a.bg, ROOT)}', 'start': 0,
           'dur': round(n / 24, 4), 'fit': 'cover', 'kind': 'video', 'key': None}, open(os.path.join(od, 'meta.json'), 'w'), indent=1)
print(od, n, 'frames; figure scale', round(k, 3))
