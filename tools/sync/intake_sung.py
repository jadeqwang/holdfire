#!/usr/bin/env python3
"""Intake for new sung takes made on an existing pick's keyframe: dimension check, mouth box seeded from that pick's box at frame
0 (same first frame), lipmeasure + mouthline at the measured lag.

  work/venv/mp312/bin/python tools/sync/intake_sung.py SHOT=media/gen/TAKE.mp4[@S0] [...]
SHOT is the pick whose keyframe the take used (V101, C103L, ...); S0 defaults to that pick's s0 (the same aref).
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from common import ROOT
import lipmeasure
P = json.load(open(os.path.join(ROOT, 'render', 'data', 'picks2.json')))
M = json.load(open(lipmeasure.MOUTHS))
SEED = {'C203L': 'C103L', 'C209L': 'C103L'}       # same keyframe as C103L
for arg in sys.argv[1:]:
    shot, rest = arg.split('=', 1)
    take, s0 = (rest.split('@') + [None])[:2]
    s0 = float(s0) if s0 else float(P[shot]['s0'])
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
                        'stream=width,height,nb_read_frames', '-of', 'csv=p=0', take], capture_output=True, text=True).stdout.strip()
    w, h, n = (int(x) for x in r.split(','))
    name = os.path.basename(take).split('_sd25_')[1].split('_')[0]           # t5
    tag = f'{shot}_{name}'
    if (w, h) != (1280, 720):
        print(f'{tag}: REJECT {w}x{h}'); continue
    src = SEED.get(shot, shot)
    m0 = json.load(open(os.path.join(ROOT, 'work', 't2', 'lips', f'{src}.measure.json')))
    b0 = m0['boxes'][0]
    M[os.path.basename(take)] = {'pick': tag, 'ref': 0, 'box': [round(x) for x in b0], 'note': f'seeded from {src} frame 0 (same keyframe)'}
    json.dump(M, open(lipmeasure.MOUTHS, 'w'), indent=1)
    res = lipmeasure.measure(tag, take, s0, lipmeasure.shot_window(shot), os.path.join(ROOT, 'work', 't2', 'lips'))
    lag = res['best'][0] if res['best'][0] is not None else 0
    subprocess.run([sys.executable, os.path.join(HERE, 'mouthline.py'), tag, f'--lag={lag}'])
