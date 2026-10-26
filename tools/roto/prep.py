#!/usr/bin/env python3
"""Guide maps for a picked take -> work/guides/<CLIP>/ (CLIP = take tag, e.g. K4_t2).
  prep.py TAKE.mp4 CLIP KIND [--start=S --dur=D]
KIND: keeper|env (engraving + face), listener (constellation + face), other (stipple: dense stars + colour), archival (engraving guides + colour)"""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP = os.environ.get('MP312', '/tmp/claude-0/-home-user-holdfire/3058437c-9a4e-56a8-86e0-5050098e0aa6/scratchpad/mp312/bin/python')
take, clip, kind = sys.argv[1:4]
extra = [a for a in sys.argv[4:] if a.startswith('--start') or a.startswith('--dur')]
out = os.path.join(ROOT, 'work', 'guides', clip)
os.makedirs(out, exist_ok=True)
py = sys.executable
R = os.path.join(ROOT, 'tools', 'roto')
if kind in ('keeper', 'env', 'archival'):
    subprocess.run([py, os.path.join(R, 'engrave.py'), take, out, '--sep=6', *extra] + (['--matte=0'] if kind == 'env' else []), check=True)
if kind == 'listener':
    subprocess.run([py, os.path.join(R, 'constellation.py'), take, out, '--n=2600', *extra], check=True)
if kind == 'other':
    subprocess.run([py, os.path.join(R, 'constellation.py'), take, out, '--n=6500', '--color=1', *extra], check=True)
if kind == 'archival':
    subprocess.run([py, os.path.join(R, 'constellation.py'), take, out + '_col', '--n=10', '--color=1', *extra], check=True)
if kind in ('keeper', 'listener', 'archival'):
    subprocess.run([MP, os.path.join(R, 'face.py'), take, os.path.join(out, 'face.json'), *extra], check=True)
print('prepped', clip, kind)
