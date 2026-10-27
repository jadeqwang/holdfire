"""Lip-sync lag curves, measured the way the renderer plays a take: clip time = t - S0 + lag, on twos.
(Ported from Rare Earth pipeline/sync/lag_curve.py; RE sampled on ones with round(); take two plays on twos.)

For each lag in the range, the clip's mouth-openness curve is resampled at the drawing shown at song time t
(common.frame_on_twos: film frame held on twos, then f = floor((ff/24 - S0 + lag) * 24)) for every 24 fps song time t inside the window the edit uses, and
correlated with the vocal-stem RMS envelope (both high-passed). Two independent openness metrics are reported:
the anime-face-cascade mouth ROI (mouth.py) and the skin-blob + mouth-interior colour metric (mouth_color.py).
A lag is trusted when both curves peak together.

  python3 tools/sync/lag_curve.py CLIP.mp4 S0 A B [--voc=work/stems/vocals.wav] [--ones]
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import FPS, VOCALS, frame_on_twos, hp, vocal_env  # noqa: E402

LAGS = np.arange(-18, 31) / FPS                    # -0.75 .. +1.25 s (take lags seen: -0.375 .. +1.04)


def curve(v, s0, win, lags=LAGS, voc=None, twos=True, env=None):
    """[(lag, r)] for openness v (indexed by clip frame) against the vocal envelope over song window win."""
    v = np.asarray(v, float)
    ok = np.isfinite(v)
    if ok.sum() < 8:
        return [(float(l), np.nan) for l in lags]
    v = hp(np.where(ok, v, np.nanmedian(v)))
    if env is None:
        env = vocal_env(win[0] - 1, win[1] + 1, voc)
    et, e = env
    e = hp(e)
    ts = np.arange(np.ceil(win[0] * FPS), np.floor(win[1] * FPS) + 1) / FPS
    E = np.interp(ts, et, e)
    out = []
    for lag in lags:
        if twos:
            fi = frame_on_twos(ts, s0, lag)
        else:
            fi = np.round((ts - s0 + lag) * FPS).astype(int)
        good = (fi >= 0) & (fi < len(v))
        if good.sum() < 8 or np.std(v[fi[good]]) < 1e-9:
            out.append((float(lag), np.nan)); continue
        out.append((float(lag), float(np.corrcoef(v[fi[good]], E[good])[0, 1])))
    return out


if __name__ == '__main__':
    import mouth, mouth_color
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
    f, s0, A, B = a[0], float(a[1]), float(a[2]), float(a[3])
    voc = o.get('voc', VOCALS)
    twos = 'ones' not in o
    r = mouth.track(f)
    col, _ = mouth_color.openness(f)
    env = vocal_env(A - 1, B + 1, voc)
    print('lags  ', ' '.join(f'{l:+.2f}' for l in LAGS))
    if r['hit'] >= 0.3:
        c = curve(r['open'], s0, (A, B), env=env, twos=twos)
        print('face  ', ' '.join(f'{x:+.2f}' for _, x in c), f'(hit {r["hit"]:.2f})')
    c = curve(col, s0, (A, B), env=env, twos=twos)
    print('colour', ' '.join(f'{x:+.2f}' for _, x in c))
