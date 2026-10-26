#!/usr/bin/env python3
"""Write render/data/picks.json (plate -> {clip, s0, lag, kind}) from docs/takes.json entries with "pick": true.
  picks.py                      # rewrite
  picks.py pick K4 2 [--lag=0.0] [--kind=keeper]   # mark take 2 of K4 as the pick (and its lag)"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = os.path.join(ROOT, 'docs', 'takes.json')
OUT = os.path.join(ROOT, 'render', 'data', 'picks.json')
KIND = lambda s: {'K': 'keeper', 'L': 'listener', 'O': 'other', 'E': 'env', 'H': 'archival', 'C': 'keeper'}[s[0]]
t = json.load(open(T))
if len(sys.argv) > 1 and sys.argv[1] == 'pick':
    sid, n = sys.argv[2], int(sys.argv[3])
    o = {a[2:].split('=')[0]: a.split('=', 1)[1] for a in sys.argv[4:] if a.startswith('--')}
    for tk in t[sid]:
        tk['pick'] = tk['take'] == n
        if tk['pick']:
            if 'lag' in o: tk['lag'] = float(o['lag'])
            tk['kind'] = o.get('kind', KIND(sid))
    json.dump(t, open(T, 'w'), indent=1)
picks = {}
for sid, ts in t.items():
    for tk in ts:
        if tk.get('pick') and tk.get('file'):
            clip = os.path.basename(tk['file']).rsplit('_', 1)[0]     # K4_t2_f4c2db5a84.mp4 -> K4_t2
            picks[sid] = {'clip': clip, 's0': tk.get('s0') or 0, 'lag': tk.get('lag') or 0, 'kind': tk.get('kind', KIND(sid)), 'file': tk['file']}
json.dump(picks, open(OUT, 'w'), indent=1)
print(json.dumps(picks, indent=1))
