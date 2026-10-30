#!/usr/bin/env python3
"""mirror_comp.py IN.mp4 OUT.mp4 [--axis=auto|N] [--right=pale|teal|none] [--left=none|warm] [--reverse] [--start=S --dur=D]
Per frame: find the mirror line (darkest thin vertical column near the centre, rows 60..400) or use a fixed axis,
take the 960 px left of it, put it at x 0..960, and its horizontal flip at 960..1920 (graded), plus a 3 px silver line at 960."""
import sys, subprocess, numpy as np, json
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = {a[2:].split('=')[0]: (a.split('=', 1)[1] if '=' in a else '1') for a in sys.argv[1:] if a.startswith('--')}
src, out = args
W, H = 1920, 1080
ss = ['-ss', opt['start']] if 'start' in opt else []
tt = ['-t', opt['dur']] if 'dur' in opt else []
dec = subprocess.Popen(['ffmpeg', '-v', 'error', *ss, '-i', src, *tt, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
frames = []
while True:
    b = dec.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    frames.append(np.frombuffer(b, np.uint8).reshape(H, W, 3))
if 'reverse' in opt: frames = frames[::-1]
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                        '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
axes = []
prev = None
for f in frames:
    if opt.get('axis', 'auto') == 'auto':
        g = f[60:400].astype(np.float32).mean(axis=(0, 2))
        lo, hi = (prev - 60, prev + 60) if prev is not None else (700, 1500)
        x = int(np.argmin(g[lo:hi])) + lo
        # the line is ~15-30 px wide with two dark edges: centre between the darkest edges
        dark = np.where(g[x - 40:x + 40] < g[x] + 40)[0] + x - 40
        x = int(round((dark.min() + dark.max()) / 2))
        prev = x
    else:
        x = int(opt['axis'])
    axes.append(x)
    L = np.full((H, 960, 3), 250, np.uint8)
    lw = min(960, x)
    L[:, 960 - lw:] = f[:, x - lw:x]
    R = L[:, ::-1].astype(np.float32)
    mode = opt.get('right', 'pale')
    if mode == 'pale': R = R * 0.55 + np.array([232, 240, 248]) * 0.45
    elif mode == 'teal':   # cool teal and silver: desaturate toward luma, tint
        y = R @ np.array([0.299, 0.587, 0.114])
        R = 0.35 * R + 0.65 * (y[..., None] * np.array([0.90, 1.0, 1.02]))
        R = R * 0.92 + np.array([20, 34, 36])
    if opt.get('left') == 'warm':
        L = np.clip(L.astype(np.float32) * np.array([1.0, 0.985, 0.95]) + np.array([4, 2, 0]), 0, 255).astype(np.uint8)
    o = np.concatenate([L, np.clip(R, 0, 255).astype(np.uint8)], axis=1)
    o[:, 958:962] = [196, 204, 212]; o[:, 957] = [120, 126, 132]; o[:, 962] = [120, 126, 132]
    enc.stdin.write(o.tobytes())
enc.stdin.close(); enc.wait()
print(json.dumps({'n': len(frames), 'axis_min': min(axes), 'axis_max': max(axes), 'axis_first': axes[0], 'axis_last': axes[-1]}))
