#!/usr/bin/env python3
"""Lag reel for Jade's ear: each sung shot's lipsync window rendered by the actual renderer at 540p (song muxed), labelled,
then concatenated into one file.

  python3 tools/t2/lipreel.py [SHOT ...] [--pad 0.25] [--out work/t2/lips] [--reuse]

Shots default to every shots.json entry with method seedance_sung. Each window [A - pad, B + pad] is rendered with
`node tools/render.mjs --from A --to B --w 960 --h 540 --out work/t2/lips/<SHOT>.mp4`, then labelled (drawtext: shot id, the
lyric and the lag of every pick it plays) and joined into work/t2/lips/all_sung.mp4. --reuse skips shots already rendered.
"""
import argparse
import json
import os
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def esc(s):
    return s.replace('\\', '\\\\').replace(':', '\\:').replace("'", '’').replace('%', '\\%').replace(',', '\\,')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('shots', nargs='*')
    ap.add_argument('--pad', type=float, default=0.25)
    ap.add_argument('--out', default=os.path.join(ROOT, 'work', 't2', 'lips'))
    ap.add_argument('--reuse', action='store_true')
    o = ap.parse_args()
    d = json.load(open(os.path.join(ROOT, 'docs', 'take2', 'shots.json')))
    rows = d.get('shots', d) if isinstance(d, dict) else d
    picks = json.load(open(os.path.join(ROOT, 'render', 'data', 'picks2.json')))
    sel = [r for r in rows if (r['id'] in o.shots) or (not o.shots and r.get('method') == 'seedance_sung')]
    os.makedirs(o.out, exist_ok=True)
    labelled = []
    for r in sel:
        A, B = r.get('lipsync_window') or [r['t0'], r['t1']]
        a, b = round(max(0, A - o.pad), 3), round(B + o.pad, 3)
        raw = os.path.join(o.out, f"{r['id']}.mp4")
        if not (o.reuse and os.path.exists(raw)):
            subprocess.run(['node', 'tools/render.mjs', '--from', str(a), '--to', str(b), '--w', '960', '--h', '540', '--out', raw],
                           cwd=os.path.join(ROOT, 'render'), check=True)
        ids = [k for k in (r['id'], r['id'] + 'L', r['id'] + 'R') if k in picks and picks[k].get('s0') is not None]
        lags = '  '.join(f"{k} lag {picks[k].get('lag', 0):+.3f} ({round(picks[k].get('lag', 0) * 24):+d}f)  {os.path.basename(picks[k]['src'])[:30]}" for k in ids)
        lab = os.path.join(o.out, f".lab_{r['id']}.mp4")
        vf = (f"drawbox=x=0:y=0:w=iw:h=58:color=black@0.62:t=fill,"
              f"drawtext=fontfile={FONT}:text='{esc(r['id'] + '  ' + (r.get('lyric') or ''))}':x=12:y=8:fontsize=20:fontcolor=white,"
              f"drawtext=fontfile={FONT}:text='{esc(lags)}':x=12:y=34:fontsize=14:fontcolor=0xffd28a,"
              f"drawtext=fontfile={FONT}:text='%{{pts\\:hms\\:{a}}}':x=w-tw-12:y=8:fontsize=16:fontcolor=white")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-vf', vf, '-c:v', 'libx264', '-crf', '20', '-preset', 'fast',
                        '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', lab], check=True)
        labelled.append(lab)
        print(f"{r['id']}: {a}-{b}  {lags}", flush=True)
    lst = os.path.join(o.out, '.reel.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in labelled))
    out = os.path.join(o.out, 'all_sung.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', out], check=True)
    for p in labelled:
        os.remove(p)
    os.remove(lst)
    print(out)


if __name__ == '__main__':
    main()
