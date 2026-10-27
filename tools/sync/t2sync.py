#!/usr/bin/env python3
"""Take-two lip-sync intake for an anime take: best lag as played on twos (two metrics) + a mouth word strip.

  tools/sync/t2sync.py TAKE.mp4 S0 A B          (re-executes itself under work/venv/mp312 when needed)
  tools/sync/t2sync.py TAKE.mp4 S0 A B [--voc=work/stems/vocals.wav] [--words=render/data/timing.json]
                               [--lags=-0.75,1.25] [--rows=3] [--out=PREFIX] [--facemesh]

S0 = song time of the take's audio-ref start (tools/t2/aref.py prints it: the exact cut start; the mp3's ~25 ms LAME
delay is trimmed by gapless decoders, and if Seedance ignores it the lag absorbs it), [A, B] = the song-time window the edit plays.
Convention: clip time = song time - S0 + lag (lag > 0: the take's mouth runs late); shown frame = common.frame_on_twos (the
renderer's plateFrame: film frame held on twos, then mapped into the clip). Lags are swept in 1/24 s steps.

Metrics (Rare Earth pipeline/sync, ported here): `face` = mouth-interior area in the anime face cascade's mouth ROI
(mouth.py), `colour` = dark-red mouth pixels in the lower half of the largest skin blob (mouth_color.py); optional
`facemesh` = MediaPipe inner-lip gap / face height (needs the work/venv/mp312 interpreter; rarely finds anime faces).
Each is high-passed and correlated with the vocal-stem RMS envelope over [A, B]. The reported best lag maximises the
mean of the metrics' curves; it is flagged [metrics agree] when every metric peaks within a drawing of it (or scores
within 0.08 of its own peak there). Periodic phrasing gives twin peaks ~0.6 s apart: always confirm on the strip.
Tested on Rare Earth takes (Kim stem): sd02 -> -0.042 and sd06 -> +0.333, the lags RE picked by eye.

Writes PREFIX.t2sync.json (curves, best, per-metric bests, hit rates) and PREFIX.t2sync.jpg (rows = lags best-3f..best+3f,
columns = word onsets in [A, B]), PREFIX defaulting to the take's path without .mp4.
"""
import json
import os
import sys

_VENV = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'work', 'venv', 'mp312', 'bin', 'python')
try:
    import cv2  # noqa: F401
    import soundfile
except ImportError:          # system python lacks soundfile/mediapipe: re-run under the 3.12 venv (pipeline_lessons §0)
    if os.path.exists(_VENV) and os.path.realpath(sys.executable) != os.path.realpath(_VENV):
        os.execv(_VENV, [_VENV] + sys.argv)
    raise
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import FPS, VOCALS, load_words, read_frames, vocal_env  # noqa: E402
import lag_curve  # noqa: E402
import mouth  # noqa: E402
import mouth_color  # noqa: E402
import wordstrip  # noqa: E402


def facemesh_open(frames):
    os.environ.setdefault('GLOG_minloglevel', '2'); os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')
    import cv2
    import mediapipe as mp
    fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True,
                                         min_detection_confidence=.3, min_tracking_confidence=.3)
    out = []
    for f in frames:
        h, w = f.shape[:2]
        r = fm.process(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
        if r.multi_face_landmarks:
            P = np.array([[p.x * w, p.y * h] for p in r.multi_face_landmarks[0].landmark])
            out.append(np.linalg.norm(P[13] - P[14]) / (np.linalg.norm(P[10] - P[152]) + 1e-6))
        else:
            out.append(np.nan)
    return np.array(out, float)


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
    if len(a) < 4:
        sys.exit(__doc__)
    take, s0, A, B = a[0], float(a[1]), float(a[2]), float(a[3])
    voc = o.get('voc', VOCALS)
    if not os.path.exists(voc):
        sys.exit(f'missing vocal stem {voc} (python3 tools/audio/stems.py)')
    lo_l, hi_l = (float(v) for v in o.get('lags', '-0.75,1.25').split(','))
    lags = np.arange(round(lo_l * FPS), round(hi_l * FPS) + 1) / FPS
    prefix = o.get('out', os.path.splitext(take)[0])

    # frames the sweep can show (+ margin for the cascade's track smoothing)
    f_lo = max(0, int(np.floor((A - s0 + lags[0]) * FPS)) - 6)
    f_hi = int(np.ceil((B - s0 + lags[-1]) * FPS)) + 6
    frames, fps, n = read_frames(take, f_lo, f_hi)
    if not frames:
        sys.exit(f'{take}: no frames in clip range {f_lo}..{f_hi} (S0/window wrong?)')
    if abs(fps - FPS) > 0.01:
        print(f'warning: {take} is {fps:.3f} fps, the convention assumes {FPS}', file=sys.stderr)

    def full(v):                      # per-clip-frame array, NaN outside the loaded range
        x = np.full(n, np.nan)
        x[f_lo:f_lo + len(v)] = v
        return x

    metrics, hits = {}, {}
    fb, hit = mouth.detect_faces(frames)
    boxes = None
    if fb is not None:
        boxes = [tuple(b) for b in fb]
        metrics['face'] = full([mouth.openness(f, mouth.mouth_roi(b, f.shape))[0] for f, b in zip(frames, fb)])
    hits['face'] = round(float(hit), 3)
    col, cboxes = mouth_color.openness(None, frames)
    hits['colour'] = round(float(np.isfinite(col).mean()), 3)
    if hits['colour'] >= 0.5:
        metrics['colour'] = full(col)
    if 'facemesh' in o:
        fmv = facemesh_open(frames)
        hits['facemesh'] = round(float(np.isfinite(fmv).mean()), 3)
        if hits['facemesh'] >= 0.5:
            metrics['facemesh'] = full(fmv)
    if not metrics:
        sys.exit(f'no mouth found (face hit {hits.get("face")}, colour {hits["colour"]})')

    sdur = soundfile.info(voc).duration
    if B > sdur:
        sys.exit(f'window ends at {B} s but {voc} is only {sdur:.2f} s long')
    env = vocal_env(A - 1.5, B + 1.5, voc)
    if np.std(env[1][(env[0] >= A) & (env[0] <= B)]) < 1e-6:
        sys.exit(f'vocal stem is silent over {A}-{B}: nothing to sync to (instrumental window? wrong stem?)')
    curves = {k: lag_curve.curve(v, s0, (A, B), lags=lags, env=env) for k, v in metrics.items()}
    R = np.array([[r for _, r in c] for c in curves.values()])
    comb = np.nanmean(R, 0) if R.shape[0] > 1 else R[0]
    comb = np.where(np.isfinite(comb), comb, -9)
    if not (comb > -9).any():
        sys.exit('no valid lag: the mouth track does not cover the window at any lag (S0/window wrong?)')
    bi = int(np.argmax(comb))
    best = float(lags[bi])
    per = {k: (float(lags[int(np.nanargmax(np.where(np.isfinite(R[i]), R[i], -9)))]),
               round(float(np.nanmax(R[i])), 3)) for i, k in enumerate(curves)}
    # agreement: every metric peaks within a drawing (2 frames) of the best lag, or is within 0.08 of its own peak there
    agree = all(abs(per[k][0] - best) <= 2 / FPS + 1e-6 or (np.isfinite(R[i][bi]) and R[i][bi] >= per[k][1] - 0.08)
                for i, k in enumerate(curves))

    rows = int(o.get('rows', 3))
    row_lags = [best + k / FPS for k in range(-rows, rows + 1)]
    words = load_words(A, B, o.get('words'))
    jpg = prefix + '.t2sync.jpg'
    if words:
        title = (f'{os.path.basename(take)}  S0 {s0:.3f}  win {A:.2f}-{B:.2f}  best {best:+.3f} '
                 + ' '.join(f'{k} {p[0]:+.3f}/{p[1]:.2f}' for k, p in per.items()))
        if boxes is None:   # no cascade track: crop the colour metric's face blob (median box)
            cb = [b for b in cboxes if b is not None]
            fixed = None
            if cb:
                x, y, w, h = np.median(np.array(cb, float), 0)
                fixed = (x + 0.1 * w, y + 0.45 * h, 0.8 * w, 0.62 * h)
            wordstrip.strip(frames, f_lo, words, s0, row_lags, jpg, fixed=fixed, best=best, title=title)
        else:
            wordstrip.strip(frames, f_lo, words, s0, row_lags, jpg, boxes=boxes, best=best, title=title)
    res = {'take': take, 's0': s0, 'win': [A, B], 'best_lag': round(best, 6), 'best_frames': round(best * FPS),
           'corr': round(float(comb[bi]), 3), 'agree': bool(agree), 'per_metric': per, 'hit': hits,
           'lags': [round(float(l), 6) for l in lags],
           'curves': {k: [None if not np.isfinite(r) else round(r, 3) for _, r in c] for k, c in curves.items()},
           'words': words, 'strip': jpg if words else None, 'frames': n, 'convention': 'clip t = song t - S0 + lag, on twos'}
    json.dump(res, open(prefix + '.t2sync.json', 'w'), indent=1)

    print(f'{os.path.basename(take)}  S0 {s0:.3f}  window {A:.2f}-{B:.2f}  ({n} frames, hit ' +
          ', '.join(f'{k} {v:.0%}' for k, v in hits.items()) + ')')
    print('lag    ' + ' '.join(f'{l * FPS:+4.0f}' for l in lags) + '   (frames)')
    for k, c in curves.items():
        print(f'{k:6} ' + ' '.join('  . ' if not np.isfinite(r) else f'{r:+.2f}'[0] + f'{abs(r):.2f}'[1:] for _, r in c))
    print(f'BEST lag {best:+.3f} s ({best * FPS:+.0f} f) r {comb[bi]:.3f}  per metric: ' +
          ', '.join(f'{k} {p[0]:+.3f} (r {p[1]:.2f})' for k, p in per.items()) +
          ('  [metrics agree]' if agree else '  [metrics DISAGREE: check the strip]'))
    print(f'strip: {jpg if words else "(no words in window)"}   json: {prefix}.t2sync.json')


if __name__ == '__main__':
    main()
