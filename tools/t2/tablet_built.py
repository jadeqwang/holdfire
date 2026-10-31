#!/usr/bin/env python3
"""Build V113's plate: the hand of take t2_V113_ltr_veof_t1 moved along a designed path, so the stylus presses exactly the last two
wedges of 89 (no model takes coordinates; method from Moongazing's calli_take.py, where the brush writes the last two strokes of 月).

From the take: a clean plate (each pixel's bright end over the frames), the hand and stylus cut out of one frame, and their shadow.
Per plate frame the cut-out moves so the tip is on the path; the sleeve gives toward the frame's edge, the shadow parts from a lifted
stylus. Writes work/plates/V113/ (meta as a conform of the take, so tablet_clay.py applies) and prints the TIP table for tablet.js.

    python3 tools/t2/tablet_built.py && python3 tools/t2/tablet_clay.py --also 5,20,51 --also-until 3
"""
import json, math, shutil, subprocess
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
TAKE = 'media/gen/t2_V113_ltr_veof_t1_330fef02c0.mp4'
OUT = ROOT / 'work/plates/V113'
N, START = 53, 1.5
F0, TIP0 = 76, np.float32([908, 603])                 # the take's frame the cut-out comes from, and its tip (plate px)
AXIS = np.float32([0.62, -0.78])                       # the shaft, from the tip up
# tablet space, as tablet.js: size 42, P1 the sixties head, P2 the last wedge's head, V_AXIS
SZ, P1, P2, V = 42, np.float32([782, 640]), np.float32([908, 601]), np.float32([0.2, 0.8])
SPAN = float(np.linalg.norm(P2 - P1)); U = (P2 - P1) / SPAN; HEAD_Y = 0.69; LAST = 0.7; TILT = 0.52
LAL_U = SPAN - 0.38 * SZ                               # LAL's origin, u measured from the sixties head
scr = lambda u, v: P1 + u * U + (v + HEAD_Y * SZ) * V
ROOF_A, ROOF_B = scr(LAL_U + 0.33 * SZ, -0.73 * SZ), scr(LAL_U + 0.45 * SZ, -0.73 * SZ)   # the press leans right, the wedge opens under it
LAST_A = scr(SPAN, -0.58 * SZ)
LAST_B = scr(SPAN + LAST * 0.85 * SZ * math.sin(TILT), -0.58 * SZ + LAST * 0.85 * SZ * math.cos(TILT))
HOVER, AWAY = ROOF_A + np.float32([-38, -16]), LAST_B + np.float32([16, -12])
sm = lambda u: (lambda v: v * v * (3 - 2 * v))(min(1.0, max(0.0, u)))
ROOF_F, ROOF_E, LAST_F, LAST_E = 16, 24, 30, 38       # plate frames: landings and ends


def pose(f):
    """tip (plate px), lift 0..1"""
    if f < ROOF_F:
        u = sm((f - 4) / (ROOF_F - 4)); return HOVER + (ROOF_A - HOVER) * u, 1 - u
    if f <= ROOF_E:
        return ROOF_A + (ROOF_B - ROOF_A) * sm((f - ROOF_F) / (ROOF_E - ROOF_F)), 0.0
    if f < LAST_F:
        v = (f - ROOF_E) / (LAST_F - ROOF_E); return ROOF_B + (LAST_A - ROOF_B) * sm(v), math.sin(math.pi * v)
    if f <= LAST_E:
        return LAST_A + (LAST_B - LAST_A) * sm((f - LAST_F) / (LAST_E - LAST_F)), 0.0
    return LAST_B + (AWAY - LAST_B) * sm((f - LAST_E) / 12), sm((f - LAST_E) / 5)


def main():
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / TAKE), '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True).stdout
    F = np.frombuffer(p, np.uint8).reshape(-1, 1080, 1920, 3)
    clean = np.percentile(F[::3].astype(np.float32), 97, axis=0).astype(np.float32)
    f0 = F[F0].astype(np.float32)
    res = np.abs(f0 - clean).max(axis=2)
    m = cv2.morphologyEx((res > 26).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    yy, xx = np.mgrid[0:1080, 0:1920].astype(np.float32)
    m[((xx - TIP0[0]) * AXIS[0] + (yy - TIP0[1]) * AXIS[1]) < -2] = 0     # nothing past the tip: the marks it touches stay behind
    m[(yy > 640) & (xx < 1180)] = 0                                        # the tablet's own edge and marks, not the sleeve
    nl, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for j in range(1, nl):
        if st[j][4] > 800 and st[j][1] <= 1: keep[lab == j] = 1
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    h, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); keep[:] = 0; cv2.drawContours(keep, h, -1, 1, -1)
    alpha = cv2.GaussianBlur(cv2.dilate(keep, np.ones((3, 3), np.uint8)).astype(np.float32), (0, 0), 1.0)
    # under the cut-out the clean plate may still hold hand: fill it from the lightest frame there, the shadow from the rest
    shade = np.clip(cv2.GaussianBlur(f0.mean(axis=2), (0, 0), 7) / (cv2.GaussianBlur(clean.mean(axis=2), (0, 0), 7) + 1), 0.4, 1)
    shade = shade * (1 - alpha) + alpha * cv2.GaussianBlur(shade, (0, 0), 14)
    shade = 1 + (shade - 1) * cv2.GaussianBlur(cv2.dilate(keep, np.ones((161, 161), np.uint8)).astype(np.float32), (0, 0), 30)
    # the take's own picture everywhere the hand does not uncover; the clean plate only round the hand
    near = cv2.GaussianBlur(cv2.dilate(keep, np.ones((91, 91), np.uint8)).astype(np.float32), (0, 0), 16)[..., None]
    base = f0 * (1 - near) + clean * near
    fall = np.clip((xx - 1250) / 420, 0, 1); fall = fall * fall * (3 - 2 * fall)
    WX = 1 - 0.7 * fall
    OUT.mkdir(parents=True, exist_ok=True)
    for x in OUT.glob('f_*.jpg'): x.unlink()
    tips = {}
    for f in range(N):
        tip, lift = pose(f)
        d = tip - TIP0 + np.float32([3, -9]) * lift
        rm = lambda im, b, dd=d: cv2.remap(im, xx - dd[0] * WX, yy - dd[1] * WX, cv2.INTER_LINEAR, borderMode=b, borderValue=1)
        a = rm(alpha, cv2.BORDER_REPLICATE)[..., None]
        s = rm(shade, cv2.BORDER_CONSTANT, d + np.float32([14, 10]) * lift)[..., None]
        fr = base * s * (1 - a) + rm(f0, cv2.BORDER_REPLICATE) * a
        cv2.imwrite(str(OUT / f'f_{f:05d}.jpg'), np.clip(fr, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 96])
        if f % 2 == 0 and 4 <= f <= 50: tips[f] = [round(float(tip[0]), 1), round(float(tip[1]), 1)]
    (OUT / 'meta.json').write_text(json.dumps({'fps': 24.0, 'n': N, 'w': 1920, 'h': 1080, 'src': TAKE, 'start': START, 'dur': N / 24, 'fit': 'cover', 'kind': 'video', 'key': None, 'built': 'tools/t2/tablet_built.py'}, indent=1) + '\n')
    cv2.imwrite(str(ROOT / 'work/t2/tablet/built_clean.jpg'), clean[380:830, 500:1400])
    cv2.imwrite(str(ROOT / 'work/t2/tablet/built_alpha.jpg'), (alpha[380:830, 500:1400] * 255).astype(np.uint8))
    print(json.dumps(tips)); print('ROOF', ROOF_A, ROOF_B, 'LAST', LAST_A, LAST_B, 'xs monotonic:', all(tips[a][0] <= tips[a + 2][0] + 0.01 for a in range(4, 50, 2)))


main()
