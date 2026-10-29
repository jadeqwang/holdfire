#!/usr/bin/env python3
"""Bake the clean clay under V113's tablet inscription (render/src/scenes/t2/lyric/tablet.js).

The V113 plate (Veo take) paints its own row of six generic triangles on the tablet. The renderer covers them with clean wet
clay and presses the real cuneiform into it, while the plate's stylus and hand stay on top. This tool writes, for the
region R of the plate:
  clay.png   RGBA: the plate's temporal median with the painted triangles inpainted (+ grain from the clay below), alpha =
             the feathered triangle mask (where the patch replaces the plate)
  maps.png   grey sprite, one column per plate frame (half res): top half = shadow (1 - the frame's smooth luminance over the
             median's), bottom half = the stylus/hand matte (255 where the plate must show through)
  tablet.json  region, sprite layout, frame count and the plate's src (the scene skips the cover if the plate changes)

  work/venv/mp312/bin/python tools/t2/tablet_clay.py [--plate work/plates/V113] [--preview work/t2/tablet/clay_preview.jpg] [--also 0,2]
  --also: plate frames whose painted marks are covered too (a mark the take makes or unmakes mid-shot is not in the median;
  V113's reversed take shows its new wedge until the stylus arrives: --also 0 --also-until 9, which also keeps that mark out of
  the stylus matte before frame 9, where the stylus lands on it)
(needs OpenCV; the system python has none here, the mediapipe venv does)
"""
import argparse, json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
X0, Y0, X1, Y1 = 420, 500, 1000, 790          # region R (design px = plate px, plate is 1920x1080 cover)
ROW_A, ROW_B = (460, 712), (905, 578)          # the painted triangle row, first to last (global px)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plate', default=str(ROOT / 'work/plates/V113'))
    ap.add_argument('--out', default=str(ROOT / 'render/assets/t2/tablet'))
    ap.add_argument('--preview', default=str(ROOT / 'work/t2/tablet/clay_preview.jpg'))
    ap.add_argument('--also', default='', help='comma-separated plate frames whose marks are covered too')
    ap.add_argument('--also-until', type=int, default=0, help='before this plate frame, those marks are not part of the stylus matte')
    a = ap.parse_args()
    plate = Path(a.plate)
    meta = json.loads((plate / 'meta.json').read_text())
    n = meta['n']
    F = np.stack([cv2.imread(str(plate / f'f_{i:05d}.jpg'))[Y0:Y1, X0:X1] for i in range(n)]).astype(np.float32)
    med = np.median(F, axis=0)
    h, w = med.shape[:2]

    # the painted triangles: strokes (high-pass of the median) inside a band along the row
    yy, xx = np.mgrid[0:h, 0:w]
    A = np.array([ROW_A[0] - X0, ROW_A[1] - Y0], float); B = np.array([ROW_B[0] - X0, ROW_B[1] - Y0], float)
    L = np.linalg.norm(B - A); u = (B - A) / L; nv = np.array([-u[1], u[0]])
    s = (xx - A[0]) * u[0] + (yy - A[1]) * u[1]; r = (xx - A[0]) * nv[0] + (yy - A[1]) * nv[1]
    band = (s > -34) & (s < L + 34) & (np.abs(r) < 50)
    lum = med.mean(axis=2)
    hp = np.abs(lum - cv2.GaussianBlur(lum, (0, 0), 9))
    tri = ((hp > 11) & band).astype(np.uint8)
    extra = np.zeros((h, w), np.uint8)
    for k in [int(x) for x in a.also.split(',') if x.strip()]:
        lk = F[k].mean(axis=2)
        extra |= ((np.abs(lk - cv2.GaussianBlur(lk, (0, 0), 9)) > 11) & band).astype(np.uint8)
    extra = cv2.dilate(cv2.morphologyEx(extra, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), np.ones((9, 9), np.uint8)) & band.astype(np.uint8)
    tri |= extra
    tri = cv2.morphologyEx(tri, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    tri = cv2.dilate(tri, np.ones((5, 5), np.uint8), iterations=2) & band.astype(np.uint8)
    clean = cv2.inpaint(np.clip(med, 0, 255).astype(np.uint8), tri, 15, cv2.INPAINT_TELEA).astype(np.float32)
    # grain: the clay 150 px below the row (clean, same light), high-passed, added inside the inpainted area
    ref = cv2.imread(str(plate / 'f_00030.jpg')).astype(np.float32)[Y0 + 150:Y1 + 150, X0:X1]
    grain = ref - cv2.GaussianBlur(ref, (0, 0), 4)
    tf = cv2.GaussianBlur(tri.astype(np.float32), (0, 0), 3)[..., None]
    clean = np.clip(clean + grain * tf * 0.9, 0, 255)
    alpha = np.clip(cv2.GaussianBlur(cv2.dilate(tri, np.ones((7, 7), np.uint8)).astype(np.float32), (0, 0), 5) * 1.4, 0, 1)
    # the rows of cuneiform are pressed outside the patch too: the patch only has to hide the painted marks

    # per frame: shadow (smooth luminance ratio) and the stylus/hand matte (what the median cannot explain, connected to the
    # region's top edge or the top of its right edge, where the stylus and the fingers come in)
    lm = cv2.GaussianBlur(lum, (0, 0), 10) + 1
    hw, hh = w // 2, h // 2
    sprite = np.zeros((hh * 2, hw * n), np.uint8)
    prev = None
    for k in range(n):
        f = F[k]
        lk = cv2.GaussianBlur(f.mean(axis=2), (0, 0), 10) + 1
        shade = np.clip(lk / lm, 0.35, 1.0)
        res = np.abs(f - med * shade[..., None]).max(axis=2)
        m = (res > 34).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        nl, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        keep = np.zeros_like(m)
        for j in range(1, nl):
            x, y, bw, bh, area = st[j]
            # the stylus comes in at the top, the fingers at the top right; a blob on the right edge lower down is the hand's
            # moving shadow (the shadow map darkens the clay there instead)
            if area > 60 and (y <= 1 or (x + bw >= w - 1 and y < h * 0.3)):
                keep[lab == j] = 1
        keep = cv2.dilate(keep, np.ones((5, 5), np.uint8))
        if k < a.also_until:
            keep[extra > 0] = 0
        keepf = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 1.2)
        sprite[:hh, k * hw:(k + 1) * hw] = cv2.resize(((1 - shade) * 255).astype(np.uint8), (hw, hh), interpolation=cv2.INTER_AREA)
        sprite[hh:, k * hw:(k + 1) * hw] = cv2.resize((np.clip(keepf, 0, 1) * 255).astype(np.uint8), (hw, hh), interpolation=cv2.INTER_AREA)

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    rgba = np.dstack([clean.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    cv2.imwrite(str(out / 'clay.png'), rgba, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    cv2.imwrite(str(out / 'maps.png'), sprite, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    (out / 'tablet.json').write_text(json.dumps({'region': [X0, Y0, X1, Y1], 'mapScale': 0.5, 'mapW': hw, 'mapH': hh, 'n': n,
                                                 'plate': {'src': meta.get('src'), 'start': meta.get('start'), 'n': n}}, indent=1) + '\n')
    print('wrote', out / 'clay.png', out / 'maps.png', out / 'tablet.json')

    if a.preview:   # what the renderer does, without the inscription: frames 4..50 on twos
        tiles = []
        for k in range(4, min(n, 52), 8):
            f = F[k]
            sh = 1 - cv2.resize(sprite[:hh, k * hw:(k + 1) * hw], (w, h)).astype(np.float32) / 255
            kp = cv2.resize(sprite[hh:, k * hw:(k + 1) * hw], (w, h)).astype(np.float32) / 255
            al = (alpha * (1 - kp))[..., None]
            comp = f * (1 - al) + clean * sh[..., None] * al
            tiles.append(np.vstack([f, comp]))
        Path(a.preview).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(a.preview, np.hstack(tiles).astype(np.uint8))
        print('preview ->', a.preview)


if __name__ == '__main__':
    main()
