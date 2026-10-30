#!/usr/bin/env python3
"""Rebuild work/t2/mirror/P107_push.mp4 (pick P107): a digital push into teal-tips Jade's near eye that ends on the crisp eye still.

This is the 28 Oct cloud-session reconstruction (the original was made by a scratchpad p107_push.py on Jade's machine and is not in
git); its push was fitted to RC4's frames at 49.27 s and 50.125 s. Inputs (restore with tools/t2/restore_media.py):
  media/gen/t2_P107_veo31_m1_705bb64fe9.mp4   the Veo take (frames 0-30 are used; the lips stay shut)
  media/gen/t2mir_P107_eye_up_5a818767b5.jpg  the upscaled eye still (Nano Banana Pro t2mir_P107_eye_nbp_v1, then P-Image Upscale)
Frames 0-45: the take's frame min(f, 30), zoomed 1 + 5.88 (f/46)^3 about (800, 550) (plate px, before the renderer's flip);
frames 46-48: the eye still. 49 frames at 24 fps, H.264 CRF 12. Then: python3 tools/t2/plates.py work/t2/mirror/P107_push.mp4 P107
    python3 tools/t2/derived/rebuild_P107_push.py
"""
import os, subprocess
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
os.chdir(ROOT)
os.makedirs('work/p107/push', exist_ok=True); os.makedirs('work/t2/mirror', exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'media/gen/t2_P107_veo31_m1_705bb64fe9.mp4', '-vf', "select='lte(n,30)'", '-vsync', '0', 'work/p107/v_%03d.png'], check=True)

def zoom(im, z, c):   # zoom about c (plate px), output 1920x1080
    w, h = im.size; x0 = c[0] - c[0] / z; y0 = c[1] - c[1] / z
    return im.crop((x0, y0, x0 + w / z, y0 + h / z)).resize((1920, 1080), Image.LANCZOS)

eye = Image.open('media/gen/t2mir_P107_eye_up_5a818767b5.jpg').convert('RGB')
eyec = Image.new('RGB', (1920, 1080)); eyec.paste(eye.resize((1934, 1080), Image.LANCZOS).crop((7, 0, 1927, 1080)))
for f in range(49):
    if f < 46:
        im = zoom(Image.open(f'work/p107/v_{min(f, 30) + 1:03d}.png').convert('RGB'), 1 + 5.88 * (f / 46) ** 3, (800, 550))
    else:
        im = eyec
    im.save(f'work/p107/push/{f:03d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', 'work/p107/push/%03d.png', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', 'work/t2/mirror/P107_push.mp4'], check=True)
print('wrote work/t2/mirror/P107_push.mp4')
