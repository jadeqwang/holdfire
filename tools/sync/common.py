"""Shared paths and helpers for the anime lip-sync tools (ported from Rare Earth pipeline/sync/).

Convention (pipeline_lessons §2): clip time = song time - S0 + lag; lag > 0 = the take's mouth runs late.
The renderer plays takes on twos: the frame shown at song time t is f = floor((t - S0 + lag) * 24), f -= f % 2.
"""
import json
import os

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'work')
CASCADE = os.path.join(W, 'models', 'lbpcascade_animeface.xml')   # nagadomi/lbpcascade_animeface (MIT)
VOCALS = os.path.join(W, 'stems', 'vocals.wav')                     # tools/audio/stems.py (BS-RoFormer, 48 kHz)
TIMING = os.path.join(ROOT, 'render', 'data', 'timing.json')        # master clock: lines[].words[] {w, start, end}
FPS = 24


def frame_on_twos(t, s0, lag, fps=FPS):
    """Clip frame index the renderer shows at song time t (array ok)."""
    f = np.floor((np.asarray(t, float) - s0 + lag) * fps + 1e-3).astype(int)
    return f - f % 2


def read_frames(path, lo=0, hi=None):
    """Frames [lo, hi) of a clip (BGR), plus the clip's fps and total frame count."""
    import cv2
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or FPS
    out, i = [], 0
    while True:
        ok = cap.grab()
        if not ok:
            break
        if i >= lo and (hi is None or i < hi):
            ok, f = cap.retrieve()
            out.append(f)
        i += 1
    return out, fps, i


def vocal_env(a, b, voc=None, fps=FPS):
    """RMS envelope of the vocal stem at exactly `fps` frames/s over song time [a, b] (frame k centred at a + k/fps).
    (RE's lag_curve used librosa at 22050 Hz with hop 22050//24 = 918, i.e. 24.02 frames/s against a 24 fps time axis:
    0.08 % drift, ~0.1 s late by t = 120 s. Here the hop is exact.)"""
    voc = voc or VOCALS
    info = sf.info(voc)
    sr = info.samplerate
    hop = sr / fps
    a = max(0.0, a)
    i0 = int(round(a * sr - hop))
    i1 = int(round(b * sr + hop))
    y, _ = sf.read(voc, start=max(0, i0), stop=min(info.frames, i1), dtype='float32', always_2d=True)
    y = y.mean(1)
    if i0 < 0:
        y = np.concatenate([np.zeros(-i0, np.float32), y])
    ts = np.arange(a, b + 1e-9, 1 / fps)
    c = np.round(ts * sr).astype(int) - i0              # y[0] is sample i0 (zero-padded when i0 < 0)
    half = int(hop)                                   # window = 2 hops, centred (librosa frame_length=2*hop)
    y2 = np.concatenate([[0.0], np.cumsum(y.astype(np.float64) ** 2)])
    lo = np.clip(c - half, 0, len(y)); hi = np.clip(c + half, 0, len(y))
    rms = np.sqrt((y2[hi] - y2[lo]) / np.maximum(1, hi - lo))
    return ts, rms


def load_words(a, b, src=None):
    """Words with onset in [a, b): [(word, t)]. src: timing.json (lines[].words[].start) or a RE-style audio.json
    (lines[].words[].t) or a JSON list of {w|word, t|start}."""
    d = json.load(open(src or TIMING))
    ws = []
    if isinstance(d, dict):
        for ln in d.get('lines', []):
            for w in ln.get('words', []):
                ws.append((w.get('w', w.get('word')), float(w.get('start', w.get('t')))))
    else:
        for w in d:
            ws.append((w.get('w', w.get('word')), float(w.get('start', w.get('t')))))
    ws = sorted(set(x for x in ws if a <= x[1] < b), key=lambda x: x[1])
    return ws


def hp(x, k=12):
    """High-pass: subtract a 0.5 s moving average (edge-padded)."""
    x = np.asarray(x, float)
    p = np.pad(x, (k // 2, k - k // 2 - 1), mode='edge')
    return x - np.convolve(p, np.ones(k) / k, mode='valid')
