#!/usr/bin/env python3
"""Rebuild work/g4/derived/DR05_mirror_t1.mp4 (picks DR05 and DR06): the palms meeting at the glass.

This is the 28 Oct cloud-session reconstruction (the original was made on Jade's machine and is not in git), checked against RC4's
frames at 191.5-193.6 s. Input (restore with tools/t2/restore_media.py): media/gen/t2_DR05_veo_t1_1099c66960.mp4 (Veo).
Each of the take's first 96 frames: the glass line (a grey, low-saturation vertical bar right of x 700) is found per frame and
smoothed over 7 frames; the 960 px left of it go into the frame's left half (padded with paper white, 245), and the right half is
that left half mirrored with a cool grade (x 0.90, 0.99, 1.04). The take is played in reverse, so the palms approach and meet at
x 960. 96 frames at 24 fps, H.264 CRF 12. Then: python3 tools/t2/plates.py work/g4/derived/DR05_mirror_t1.mp4 DR05
    python3 tools/t2/derived/rebuild_DR05_mirror.py
"""
import os, subprocess
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
os.chdir(ROOT)
os.makedirs('work/dr05/out', exist_ok=True); os.makedirs('work/g4/derived', exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'media/gen/t2_DR05_veo_t1_1099c66960.mp4', '-vsync', '0', 'work/dr05/v_%03d.png'], check=True)
xs = []
for i in range(1, 97):   # track the glass line
    band = np.asarray(Image.open(f'work/dr05/v_{i:03d}.png').convert('RGB'), float)[100:1000]
    l = band.mean(-1); sat = band.max(-1) - band.min(-1)
    sc = ((l > 90) & (l < 215) & (sat < 25)).mean(0); sc[:700] = 0
    xs.append(int(np.argmax(np.convolve(sc, np.ones(9) / 9, 'same'))))
k = np.convolve(np.pad(np.array(xs, float), 3, mode='edge'), np.ones(7) / 7, 'valid')
for o in range(96):
    i = 95 - o   # reversed
    a = np.asarray(Image.open(f'work/dr05/v_{i + 1:03d}.png').convert('RGB'), float)
    xl = int(round(k[i])); lo = max(0, xl - 960); w = xl - lo
    src = np.full((1080, 960, 3), 245.); src[:, 960 - w:] = a[:, lo:xl]
    out = np.concatenate([src, src[:, ::-1] * np.array([0.9, 0.99, 1.04])], 1).clip(0, 255).astype(np.uint8)
    Image.fromarray(out).save(f'work/dr05/out/{o:03d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', 'work/dr05/out/%03d.png', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', 'work/g4/derived/DR05_mirror_t1.mp4'], check=True)
print('wrote work/g4/derived/DR05_mirror_t1.mp4')
