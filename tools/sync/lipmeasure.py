#!/usr/bin/env python3
"""Lip-sync measurement for take-two picks that works under any light (teal-tips' cool rooms included).

  work/venv/mp312/bin/python tools/sync/lipmeasure.py PICK [PICK ...] [--take=FILE --s0=S --win=A,B] [--out=work/t2/lips]
  work/venv/mp312/bin/python tools/sync/lipmeasure.py all

The mouth box comes from docs/take2/mouths.json ({take basename: {ref: frame, box: [cx, cy, w, h]}}, placed by hand on the
take's own 1280x720 frame) and is followed through the take by ECC on the lower face (tools/sync/remouth.boxes_tracked).
Openness = the share of the mouth ellipse darker than 0.7 x the surrounding skin's median luma (lighting-independent; the
skin-colour tests of mouth.py fail on teal-tips' cool fluorescents). It is scored AS PLAYED (common.frame_on_twos: the
renderer's own frame rule) against two targets of the vocal stem over the song window [A, B]:
  rms   = RMS envelope (t2sync's target), and
  voice = log RMS x pYIN voicing (remouth's target: vowels open, stops and unvoiced consonants close).
Both are high-passed. Drift: the same score over 1.4 s sub-windows (hop 0.5 s): one lag should hold from first to last word.
Writes OUT/PICK.measure.json and prints the curves' peaks. Never trust it over the word strip (render/tools/lipcheck.mjs).
"""
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import FPS, ROOT, VOCALS, frame_on_twos, hp, vocal_env  # noqa: E402
import remouth  # noqa: E402

MOUTHS = os.path.join(ROOT, 'docs', 'take2', 'mouths.json')
PICKS = os.path.join(ROOT, 'render', 'data', 'picks2.json')
SHOTS = os.path.join(ROOT, 'docs', 'take2', 'shots.json')
LAGS = np.arange(-18, 37) / FPS          # -0.75 .. +1.5 s


def shot_window(pick):
    d = json.load(open(SHOTS))
    rows = d.get('shots', d) if isinstance(d, dict) else d
    sid = pick[:-1] if pick[-1] in 'LR' and pick[:-1] in {r['id'] for r in rows} else pick
    for r in rows:
        if r['id'] == sid:
            w = r.get('lipsync_window') or [r['t0'], r['t1']]
            return float(w[0]), float(w[1])
    raise SystemExit(f'{pick}: no shot {sid} in shots.json')


def mouth_spec(take):
    m = json.load(open(MOUTHS))
    k = os.path.basename(take)
    if k not in m:
        raise SystemExit(f'{k}: no mouth box in {MOUTHS}')
    return m[k]


def track(take, spec, frames=None):
    frames = frames if frames is not None else remouth.read_clip(take)
    box = tuple(float(v) for v in spec['box'])
    if spec.get('keys'):
        k = np.array(spec['keys'], float)      # [[f, cx, cy, w, h], ...] by hand
        boxes = np.stack([np.interp(np.arange(len(frames)), k[:, 0], k[:, c]) for c in range(1, 5)], 1)
    else:
        boxes = remouth.boxes_tracked(frames, int(spec.get('ref', len(frames) // 2)), box)
    return frames, boxes


def openness(frames, boxes, thr=0.7):
    out = []
    for f, (cx, cy, w, h) in zip(frames, boxes):
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
        ell = remouth.ellipse_mask(f.shape, cx, cy, w, h) > 0
        ring = (remouth.ellipse_mask(f.shape, cx, cy, 2.2 * w, 2.4 * h) > 0) & ~(remouth.ellipse_mask(f.shape, cx, cy, 1.3 * w, 1.5 * h) > 0)
        ref = np.median(g[ring]) if ring.any() else 128
        out.append(float((g[ell] < thr * ref).mean()) if ell.any() else np.nan)
    return np.array(out)


def targets(A, B, voc=VOCALS):
    et, e = vocal_env(A - 1.5, B + 1.5, voc)
    remouth._VOC = None
    ts = np.arange(np.ceil(A * FPS), np.floor(B * FPS) + 1) / FPS
    return ts, {'rms': hp(np.interp(ts, et, e)), 'voice': hp(remouth.target_at(ts, (A, B), voc))}


def score(o, s0, ts, T, lags=LAGS, sel=None):
    n = len(o)
    v = hp(np.where(np.isfinite(o), o, np.nanmedian(o)))
    sel = np.ones(len(ts), bool) if sel is None else sel
    res = {}
    for k, tg in T.items():
        r = []
        for lag in lags:
            fi = frame_on_twos(ts[sel], s0, lag)
            ok = (fi >= 0) & (fi < n)
            if ok.sum() < 8 or np.std(v[fi[ok]]) < 1e-9:
                r.append(np.nan); continue
            r.append(float(np.corrcoef(v[fi[ok]], tg[sel][ok])[0, 1]))
        res[k] = r
    return res


def peak(lags, r):
    r = np.array(r, float)
    if not np.isfinite(r).any():
        return None, None
    i = int(np.nanargmax(r))
    return round(float(lags[i]), 4), round(float(r[i]), 3)


def measure(pick, take, s0, win, outdir):
    spec = mouth_spec(take)
    frames, boxes = track(take, spec)
    o = openness(frames, boxes, spec.get('thr', 0.7))
    A, B = win
    ts, T = targets(A, B)
    full = score(o, s0, ts, T)
    comb = np.nanmean(np.array([full['rms'], full['voice']]), 0)
    best = peak(LAGS, comb)
    sub = []
    a = A
    while a + 1.0 <= B + 1e-6:
        b = min(B, a + 1.4)
        sel = (ts >= a) & (ts < b)
        sc = score(o, s0, ts, T, sel=sel)
        c = np.nanmean(np.array([sc['rms'], sc['voice']]), 0)
        sub.append({'win': [round(a, 2), round(b, 2)], 'best': peak(LAGS, c), 'rms': peak(LAGS, sc['rms']), 'voice': peak(LAGS, sc['voice'])})
        a += 0.5
    res = {'pick': pick, 'take': os.path.relpath(take, ROOT), 's0': s0, 'win': [A, B], 'best': best,
           'rms': peak(LAGS, full['rms']), 'voice': peak(LAGS, full['voice']), 'sub': sub,
           'lags': [round(float(l), 4) for l in LAGS], 'curves': {k: [None if not np.isfinite(x) else round(x, 3) for x in v] for k, v in full.items()},
           'open': [round(float(x), 4) for x in o], 'boxes': [[round(float(x), 1) for x in b] for b in boxes]}
    os.makedirs(outdir, exist_ok=True)
    json.dump(res, open(os.path.join(outdir, f'{pick}.measure.json'), 'w'))
    subs = '  '.join(f"{s['win'][0]:.1f}:{'%+.3f' % s['best'][0] if s['best'][0] is not None else '  .  '}" for s in sub)
    print(f"{pick:7} {os.path.basename(take)[:34]:34} best {best[0]:+.3f} (r {best[1]:.2f})  rms {res['rms'][0]:+.3f}/{res['rms'][1]:.2f}"
          f"  voice {res['voice'][0]:+.3f}/{res['voice'][1]:.2f}\n        drift  {subs}", flush=True)
    return res


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) if '=' in x else (x[2:], '1') for x in sys.argv[1:] if x.startswith('--'))
    outdir = o.get('out', os.path.join(ROOT, 'work', 't2', 'lips'))
    P = json.load(open(PICKS))
    if a == ['all']:
        a = [k for k, v in P.items() if v.get('s0') is not None and not k.startswith('TEST')]
    for pick in a:
        take = o.get('take') or os.path.join(ROOT, P[pick]['src'])
        s0 = float(o['s0']) if 's0' in o else float(P[pick]['s0'])
        win = tuple(float(x) for x in o['win'].split(',')) if 'win' in o else shot_window(pick)
        measure(o.get('name', pick), take, s0, win, outdir)


if __name__ == '__main__':
    main()
