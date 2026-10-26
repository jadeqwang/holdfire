#!/usr/bin/env python3
"""Cut the reference-audio slice for a Seedance take: media/aref/<SHOT_ID>.mp3 (+ .json sidecar).

  python3 tools/t2/aref.py SHOT_ID [--pre 0.3] [--post 1.0] [--src vocals|inst|mix]
  python3 tools/t2/aref.py SHOT_ID --start A --end B [...]          # window by hand (no docs/take2/shots.json entry)
      [--s0 S] [--dur D] [--mute a:b,a:b] [--no-mute] [--out PATH]

Window [A, B] = the shot's `lipsync_window` in docs/take2/shots.json (else [t0, t1]); entries are
{id, t0, t1, lyric, lipsync_window: [a, b], method}, as a list or under "shots".
S0 = (onset of the first word in the window, render/data/timing.json) - pre, i.e. the take starts in a gap ~0.3 s before
its first word. Other words still sounding inside that pre-roll are muted (vocal stem only; 10 ms fades), so the take's
mouth stays shut until its own first word (pipeline_lessons §1.1: RW2 E3 muted 119.14-119.38).
Duration = integer seconds 4..15 covering the window + `post` s of handle (Seedance: 24*D + 1 frames).

S0 printed and stored is the exact song time of the first sample of the cut (ms grid, sample-exact at 48 kHz). Use it in
    clip time = song time - S0 + lag            (lag measured at intake: tools/sync/t2sync.py TAKE S0 A B)
The mp3 carries LAME's encoder delay (~25 ms, 1105 samples at 44.1 kHz) with a gapless tag: ffmpeg/browsers trim it,
so the decoded file starts exactly at S0 (checked here by cross-correlation). If Seedance's decoder ignores the tag, the
take simply sings ~25 ms late and the measured lag absorbs it: never shift S0 by hand.
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.path.join(ROOT, 'docs', 'take2', 'shots.json')
TIMING = os.path.join(ROOT, 'render', 'data', 'timing.json')
OUTDIR = os.path.join(ROOT, 'media', 'aref')
SRC = {'vocals': os.path.join(ROOT, 'work', 'stems', 'vocals.wav'),
       'inst': os.path.join(ROOT, 'work', 'stems', 'inst.wav'),
       'mix': os.path.join(ROOT, 'work', 'audio', 'song.wav')}
GUARD = 0.03          # keep this much before the first word unmuted (onset labels can be a few ms late)
FADE = 0.010


def rel(p):
    r = os.path.relpath(os.path.abspath(p), ROOT)
    return os.path.abspath(p) if r.startswith('..') else r


def probe_sr(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate',
                        '-of', 'csv=p=0', path], capture_output=True, text=True, check=True)
    return int(r.stdout.strip())


def read_samples(path, i0, n, sr):
    """Samples [i0, i0+n) of path at its native rate, stereo float64 (sample-exact via atrim), zero-padded at the end."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', f'atrim=start_sample={i0}:end_sample={i0 + n}',
                          '-ac', '2', '-ar', str(sr), '-f', 'f64le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float64).reshape(-1, 2)
    if len(x) < n:
        x = np.vstack([x, np.zeros((n - len(x), 2))])
    return x[:n]


def shot_window(sid):
    if not os.path.exists(SHOTS):
        return None
    d = json.load(open(SHOTS))
    rows = d.get('shots', d) if isinstance(d, dict) else d
    if isinstance(rows, dict):
        rows = [dict(v, id=k) for k, v in rows.items()]
    for r in rows:
        if r.get('id') == sid:
            w = r.get('lipsync_window') or [r['t0'], r['t1']]
            return float(w[0]), float(w[1]), r
    return None


def words():
    t = json.load(open(TIMING))
    out = []
    for ln in t['lines']:
        for w in ln.get('words', []):
            out.append({'w': w['w'], 'start': float(w['start']), 'end': float(w.get('end', w['start'])),
                        'line': ln.get('n'), 'kind': ln.get('kind')})
    return sorted(out, key=lambda w: w['start'])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('shot')
    ap.add_argument('--pre', type=float, default=0.3)
    ap.add_argument('--post', type=float, default=1.0)
    ap.add_argument('--src', choices=list(SRC), default='vocals')
    ap.add_argument('--start', type=float, help='window start (song s), overrides shots.json')
    ap.add_argument('--end', type=float, help='window end (song s)')
    ap.add_argument('--s0', type=float, help='force the cut start')
    ap.add_argument('--dur', type=int, help='force the duration (4..15)')
    ap.add_argument('--mute', default='', help='extra song-time ranges to mute, a:b,a:b')
    ap.add_argument('--no-mute', action='store_true')
    ap.add_argument('--out')
    o = ap.parse_args()

    if o.start is not None and o.end is not None:
        A, B, row = o.start, o.end, None
    else:
        got = shot_window(o.shot)
        if got is None:
            sys.exit(f'{o.shot}: not in {rel(SHOTS)} (missing file or id); pass --start A --end B')
        A, B, row = got
    if not B > A:
        sys.exit(f'bad window {A}..{B}')
    src = SRC[o.src]
    if not os.path.exists(src):
        sys.exit(f'missing {src} (python3 tools/audio/stems.py)')
    W = words()
    inwin = [w for w in W if A - 0.02 <= w['start'] < B]
    first = inwin[0] if inwin else None
    if o.s0 is not None:
        s0 = o.s0
    elif first is not None:
        s0 = first['start'] - o.pre
    else:
        s0 = A - o.pre
        print(f'note: no word onset in {A:.3f}-{B:.3f}; S0 = A - pre', file=sys.stderr)
    s0 = round(max(0.0, s0), 3)
    if B - s0 > 15:
        sys.exit(f'window {A:.2f}-{B:.2f} is {B - s0:.2f} s from S0 {s0:.3f}: longer than 15 s, split the shot')
    dur = o.dur or min(15, max(4, math.ceil(B + o.post - s0 - 1e-6)))
    if B + o.post - s0 > dur + 1e-6:
        print(f'warning: handle after the window is only {s0 + dur - B:.2f} s', file=sys.stderr)

    sr = probe_sr(src)
    i0 = int(round(s0 * sr)); n = int(round(dur * sr))
    x = read_samples(src, i0, n, sr)
    xm = x.mean(1)
    t = s0 + np.arange(n) / sr

    # mute: other words still sounding in the pre-roll (vocal stem only), plus --mute ranges
    mutes = []
    if first is not None and o.src == 'vocals' and not o.no_mute:
        prev = [w for w in W if w is not first and w['start'] < first['start'] and w['end'] > s0 - 0.05]
        if prev:
            mutes.append((s0, first['start'] - GUARD, ' '.join(w['w'] for w in prev)))
    for r in filter(None, o.mute.split(',')):
        a, b = (float(v) for v in r.split(':'))
        mutes.append((a, b, 'manual'))
    if o.src != 'vocals' and first is not None:
        prev = [w for w in W if w is not first and w['start'] < first['start'] and w['end'] > s0 - 0.05]
        if prev:
            print(f'note: --src {o.src}: words in the pre-roll ({" ".join(w["w"] for w in prev)}) are not muted', file=sys.stderr)
    g = np.ones(n)
    for a, b, _ in mutes:
        if b <= a:
            continue
        # 0 inside [a, b], 10 ms raised-cosine ramps outside it (the ramp before a is skipped at the file start)
        down = np.clip((a - t) / FADE, 0, 1); up = np.clip((t - b) / FADE, 0, 1)
        r = np.maximum(down, up)
        g = np.minimum(g, 0.5 - 0.5 * np.cos(np.pi * r))
    x = x * g[:, None]
    pre_end = first['start'] - GUARD if first is not None else s0
    k = max(1, int((pre_end - s0) * sr))
    pre_db = 20 * np.log10(np.sqrt((x[:k] ** 2).mean()) + 1e-12)

    out = o.out or os.path.join(OUTDIR, f'{o.shot}.mp3')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    # same encode as tools/gen/gen.py audio_ref (44.1 kHz stereo, LAME 192k)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(sr), '-ac', '2', '-i', '-', '-vn', '-ac', '2',
                    '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', out], input=x.astype('<f8').tobytes(), check=True)

    # check: LAME delay in the file, and that a gapless decode starts exactly at S0
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=start_time,duration',
                                    '-of', 'json', out], capture_output=True, text=True).stdout)['streams'][0]
    lame = float(pr.get('start_time', 0) or 0)
    dec = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', out, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'],
                                       capture_output=True, check=True).stdout, np.float32).astype(np.float64)
    m = min(len(dec), int(dur * 8000))
    gs = np.interp(s0 + np.arange(m) / 8000, t, g)
    ref = np.interp(np.arange(m) / 8000, np.arange(len(xm)) / sr, xm) * gs
    lagk = np.arange(-160, 161)
    seg = slice(400, m - 400)
    cc = [np.dot(dec[seg], np.roll(ref, k)[seg]) for k in lagk]
    off_ms = float(lagk[int(np.argmax(cc))]) / 8000 * 1000

    side = {'shot': o.shot, 'file': rel(out), 'src': rel(src), 's0': s0, 'dur': dur,
            'window': [A, B], 'first_word': first and {k: first[k] for k in ('w', 'start', 'end')},
            'pre': round(first['start'] - s0, 3) if first else None, 'muted': [[round(a, 3), round(b, 3), w] for a, b, w in mutes],
            'preroll_rms_db': round(float(pre_db), 1), 'lame_delay_s': round(lame, 4), 'decode_offset_ms': round(off_ms, 2),
            'lyric': row.get('lyric') if row else None,
            'convention': 'clip time = song time - s0 + lag (lag from tools/sync/t2sync.py)'}
    json.dump(side, open(os.path.splitext(out)[0] + '.json', 'w'), indent=1, ensure_ascii=False)

    fw = f'"{first["w"]}" @ {first["start"]:.3f}' if first else 'none'
    print(f'{o.shot}: {rel(out)}  src {o.src}  window {A:.3f}-{B:.3f}  first word {fw}')
    for a, b, w in mutes:
        print(f'  muted {a:.3f}-{b:.3f} ({w})')
    print(f'  pre-roll {pre_end - s0:.3f} s at {pre_db:.0f} dBFS; LAME delay {lame * 1000:.1f} ms (gapless tag; '
          f'ffmpeg decode offset {off_ms:+.1f} ms)')
    print(f'S0 {s0:.3f}  DUR {dur}')
    print(f'  clip time = song time - {s0:.3f} + lag;  window in clip time {A - s0:.3f}-{B - s0:.3f} s (+ lag)')


if __name__ == '__main__':
    main()
