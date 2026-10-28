#!/usr/bin/env python3
"""X213's clock, put right (chess reviewer, Oct 2026): the two-shot plate (both Jades sitting down at the set board, "Counting on
you", 2:22.9-2:23.4) had an analog clock on the board's far edge, i.e. on White's LEFT (Jade and the white pieces are on the left of
frame, so the camera stands on White's right, the h-file side), and its dials did not read a 1+0 start. In every procedural shot the
clock is the digital twin clock on White's right (scenes/t2/chess/camera.js CLOCK_POS, x = +5.75), its faces toward the board.

This builds a straight-alpha RGBA overlay in plate pixels (1920x1080, the plate is 'cover' with no zoom/pan, so plate px = design px)
that render/src/scenes/t2/chess/paint.js lays over the plate:
  1. the far-edge analog clock painted out: each row of its box is refilled by a linear blend between the plate's own columns just
     left and right of it (the wall, the table's back edge and the table top behind it are horizontal bands, so the blend is the
     plate's own background); the plate is a locked-off shot (0 px motion over the frames X213 shows), so one overlay holds;
  2. the procedural clock drawn on the near edge of the table, where White's right is, seen from behind as this camera must see it
     (its LCD faces look toward the board, away from the lens): the cream wedge case's plain back, the roof, and the two buttons, the
     orange one on Jade's (White's) side, the teal one on teal-tips Jade's (Black's) side, both up (before the start press at 2:23.42
     the clocks read 1:00 / 1:00 and nobody has pressed). Sizes follow the plate's board (9 units = 536 px at its near edge) and the
     procedural clock's geometry (2.58 x 0.86 units, buttons r 0.18 at z = +-0.68).
Flat cel shading with the plate's ink line; no lettering.
  python3 tools/t2/chess_x213_clock.py [--frame work/plates/X213/f_00048.jpg] [--out render/assets/t2/chess/X213_clock.png]
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ap = argparse.ArgumentParser()
ap.add_argument('--frame', default=os.path.join(ROOT, 'work/plates/X213/f_00048.jpg'))
ap.add_argument('--out', default=os.path.join(ROOT, 'render/assets/t2/chess/X213_clock.png'))
ap.add_argument('--preview', default=None, help='also write the frame with the overlay laid on (JPEG)')
a = ap.parse_args()

src = np.asarray(Image.open(a.frame).convert('RGB')).astype(np.float32)
H, W = src.shape[:2]
assert (W, H) == (1920, 1080), (W, H)
out = np.zeros((H, W, 4), np.float32)

# ---- 1. the far clock painted out: x 886-1038, y 693-783 in the plate (plungers to 693, bezel on the table to 783)
X0, X1, Y0, Y1 = 879, 1045, 686, 785
L = src[Y0:Y1, X0 - 4:X0].mean(1)          # the plate's own columns either side, per row
R = src[Y0:Y1, X1:X1 + 4].mean(1)
u = (np.arange(X0, X1) - X0 + 0.5) / (X1 - X0)
fill = L[:, None, :] * (1 - u[None, :, None]) + R[:, None, :] * u[None, :, None]
out[Y0:Y1, X0:X1, :3] = fill
out[Y0:Y1, X0:X1, 3] = 255

# ---- 2. the procedural clock from behind, on the near edge of the table (White's right)
SS = 4                                       # supersampled drawing
CX = 961.0                                   # the board's centre line (z = 0, CLOCK_POS z)
PX = 59.6                                    # px per unit at the near edge (board 9 units = 536 px)
BASE = 914.0                                 # the back face meets the table 1.7 units in front of the board's near edge
w2 = 2.58 * PX / 2                           # case half width (2.5 + bevels)
top = BASE - 0.80 * PX                       # back face top edge (0.78 + bevel)
roof = top - 0.13 * PX                       # the roof sliver seen over it (the bevel rises 0.08; the roof runs back nearly level)
INK = (22, 12, 10, 255)
LW = 3.0 * SS
case_mid, case_light, case_shadow = (206, 196, 180, 255), (236, 228, 212, 255), (146, 138, 142, 255)   # chess.js PAL.case, in the plate's light
ORANGE = dict(light=(255, 133, 51, 255), mid=(219, 92, 31, 255), shadow=(128, 41, 26, 255))
TEAL = dict(light=(82, 230, 204, 255), mid=(41, 168, 153, 255), shadow=(15, 77, 82, 255))

lay = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
d = ImageDraw.Draw(lay)
S = lambda pts: [(x * SS, y * SS) for x, y in pts]


def button(cx, col):
    r = 0.185 * PX; ry = r * 0.2               # the top ellipse, seen ~11 degrees from above
    yb = BASE - 0.84 * PX - 0.27 * 0.18 * PX   # its base on the roof (0.27 behind the back face), hidden by the roof line
    yt = yb - 0.16 * PX
    d.rectangle(S([(cx - r, yt), (cx + r, yb)]), fill=col['mid'])
    d.rectangle(S([(cx + r * 0.35, yt), (cx + r, yb)]), fill=col['shadow'])       # cel shadow, away from the lamp
    d.ellipse(S([(cx - r, yt - ry), (cx + r, yt + ry)]), fill=col['light'])
    d.line(S([(cx - r, yt), (cx - r, yb)]), fill=INK, width=int(LW))
    d.line(S([(cx + r, yt), (cx + r, yb)]), fill=INK, width=int(LW))
    d.ellipse(S([(cx - r, yt - ry), (cx + r, yt + ry)]), outline=INK, width=int(LW))


# buttons first: the roof and back face overlap their bases
button(CX - 0.68 * PX, ORANGE)               # +z = White's side = screen left from the h-file side
button(CX + 0.68 * PX, TEAL)                 # -z = Black's side
# roof sliver and back face
d.polygon(S([(CX - w2 + 2, roof), (CX + w2 - 2, roof), (CX + w2, top), (CX - w2, top)]), fill=case_light)
d.rectangle(S([(CX - w2, top), (CX + w2, BASE)]), fill=case_mid)
d.rectangle(S([(CX - w2, BASE - 0.24 * PX), (CX + w2, BASE)]), fill=case_shadow)      # the lower band in the case's own shadow
d.rectangle(S([(CX + w2 - 0.22 * PX, top), (CX + w2, BASE)]), fill=case_shadow)      # the end turned from the lamp
d.rectangle(S([(CX - w2, top + 0.02 * PX), (CX + w2 - 0.22 * PX, top + 0.07 * PX)]), fill=case_light)   # the lamp's rim on the top edge
d.line(S([(CX - w2, top), (CX + w2, top)]), fill=INK, width=int(LW * 0.7))
d.polygon(S([(CX - w2 + 2, roof), (CX + w2 - 2, roof), (CX + w2, top), (CX + w2, BASE), (CX - w2, BASE), (CX - w2, top)]),
          outline=INK, width=int(LW))
lay = lay.resize((W, H), Image.LANCZOS)
clock = np.asarray(lay).astype(np.float32)

# contact shadow on the table under the case (the lamp is overhead): a soft dark band at the base
sh = Image.new('L', (W, H), 0)
ImageDraw.Draw(sh).rectangle([(CX - w2 - 4, BASE - 2), (CX + w2 + 6, BASE + 5)], fill=150)
sh = np.asarray(sh.filter(ImageFilter.GaussianBlur(2.5))).astype(np.float32) / 255
base_rgb = src.copy()
ys, xs = np.nonzero(sh > 0.01)
shadow_rgb = base_rgb * (1 - 0.55 * sh[..., None])
m = sh > 0.01
out[m, :3] = shadow_rgb[m]
out[m, 3] = 255 * np.clip(sh[m] / 0.6, 0, 1)

# the clock over the shadow (straight alpha "over")
ca = clock[..., 3:4] / 255
oa = out[..., 3:4] / 255
na = ca + oa * (1 - ca)
rgb = (clock[..., :3] * ca + out[..., :3] * oa * (1 - ca)) / np.maximum(na, 1e-6)
out = np.concatenate([rgb, na * 255], 2)

os.makedirs(os.path.dirname(a.out), exist_ok=True)
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(a.out, optimize=True)
print('wrote', a.out, os.path.getsize(a.out), 'bytes')
if a.preview:
    al = out[..., 3:4] / 255
    pv = src * (1 - al) + out[..., :3] * al
    Image.fromarray(np.clip(pv, 0, 255).astype(np.uint8)).save(a.preview, quality=92)
    print('preview', a.preview)
