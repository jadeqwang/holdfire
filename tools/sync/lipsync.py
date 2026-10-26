#!/usr/bin/env python3
"""Lip lag for a sung take, scored only over the window the edit uses, as played on twos.
  work/venv/mp312/bin/python tools/sync/lipsync.py TAKE.mp4 S0 A B [--voc=work/stems/vocals.wav] [--out=PREFIX] [--words=w@t,...]
S0 = song time of the take's audio-reference start; [A, B] = song-time window the edit plays. Convention: clip time = song time - S0 + lag.
Mouth = FaceMesh inner-lip gap (13/14) / face height (10..152); vocal = log RMS of the vocal stem x voicing (zero-crossing gate).
FaceMesh (realistic faces); for anime takes use tools/sync/t2sync.py (anime cascade + colour metrics).
Writes PREFIX.sync.json {best_lag, corr, curve[[lag, r]], face_found, open[]} and PREFIX.strip.jpg (mouth crops at word onsets, rows = lags)."""
import json, os, subprocess, sys
import numpy as np, cv2, mediapipe as mp

a = [x for x in sys.argv[1:] if not x.startswith('--')]
o = {x[2:].split('=')[0]: x.split('=', 1)[1] for x in sys.argv[1:] if x.startswith('--') and '=' in x}
take, s0, A, B = a[0], float(a[1]), float(a[2]), float(a[3])
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
voc = o.get('voc', os.path.join(ROOT, 'work', 'stems', 'vocals.wav'))
out = o.get('out', os.path.splitext(take)[0])
FPS = 24

# ---- mouth openness per take frame
cap = cv2.VideoCapture(take)
fm = mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=.3, min_tracking_confidence=.3)
opens, boxes, frames = [], [], []
while True:
    ok, f = cap.read()
    if not ok: break
    h, w = f.shape[:2]
    r = fm.process(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    if r.multi_face_landmarks:
        L = r.multi_face_landmarks[0].landmark
        P = np.array([[p.x * w, p.y * h] for p in L])
        fh = np.linalg.norm(P[10] - P[152]) + 1e-6
        opens.append(np.linalg.norm(P[13] - P[14]) / fh)
        mc = (P[13] + P[14]) / 2; boxes.append((mc[0], mc[1], fh))
    else:
        opens.append(np.nan); boxes.append(None)
    frames.append(cv2.resize(f, (w // 2, h // 2)) if len(frames) < 2000 else None)
n = len(opens)
op = np.array(opens, float)
found = float(np.mean(~np.isnan(op))) if n else 0
if np.isnan(op).any():
    idx = np.arange(n); good = ~np.isnan(op)
    op = np.interp(idx, idx[good], op[good]) if good.any() else np.zeros(n)

# ---- vocal target at 24 fps over the window (+ margin)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, A - 2):.3f}', '-t', f'{B - A + 4:.3f}', '-i', voc, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
y = np.frombuffer(raw, np.float32); t0a = max(0, A - 2)
hop = 16000 // FPS
nf = len(y) // hop
fr = y[:nf * hop].reshape(nf, hop)
rms = np.sqrt((fr ** 2).mean(1) + 1e-10); db = 20 * np.log10(rms)
zc = (np.abs(np.diff(np.sign(fr), axis=1)) > 0).mean(1)
voiced = (zc < 0.25).astype(float)          # sibilants/noise have high zero-crossing rates: they shouldn't open the mouth
env = np.clip((db + 50) / 35, 0, 1) * (0.35 + 0.65 * voiced)
env = np.convolve(env, np.ones(2) / 2, mode='same')
tv = t0a + np.arange(nf) / FPS

def hp(x, k=12):
    return x - np.convolve(x, np.ones(k) / k, mode='same')

ts = np.arange(A, B, 1 / FPS)
V = hp(np.interp(ts, tv, env))
curve = []
for lag in np.arange(-0.75, 1.25 + 1e-6, 1 / FPS):
    ct = ts - s0 + lag
    fi = np.floor(ct * FPS + 1e-3).astype(int); fi -= fi % 2          # as played: on twos
    ok = (fi >= 0) & (fi < n)
    if ok.sum() < 8: curve.append((round(float(lag), 4), -1)); continue
    m = hp(op[np.clip(fi, 0, n - 1)])
    r = float(np.corrcoef(m[ok], V[ok])[0, 1]) if np.std(m[ok]) > 1e-6 else -1
    curve.append((round(float(lag), 4), r))
best = max(curve, key=lambda c: c[1])
res = {'take': take, 's0': s0, 'win': [A, B], 'best_lag': best[0], 'corr': round(best[1], 3),
       'corr_at_0': round(dict(curve).get(0.0, -1), 3), 'face_found': round(found, 3), 'curve': curve, 'frames': n}
json.dump(res, open(out + '.sync.json', 'w'), indent=1)

# ---- word strip: mouth crops at word onsets for lags best-2f .. best+2f (rows)
words = [(w.split('@')[0], float(w.split('@')[1])) for w in o.get('words', '').split(',') if '@' in w]
if words and frames:
    rows = []
    lagrows = [float(x) for x in o['lags'].split(',')] if 'lags' in o else [best[0] + d / FPS for d in (-2, -1, 0, 1, 2)]
    for lag in lagrows:
        cells = []
        for wd, wt in words[:12]:
            fi = int(np.floor((wt - s0 + lag) * FPS + 1e-3)); fi -= fi % 2
            cell = np.zeros((120, 120, 3), np.uint8)
            if 0 <= fi < n and boxes[fi] is not None and frames[fi] is not None:
                x, yy, fh = boxes[fi]; s = fh * 0.45
                im = frames[fi]; x, yy, s = x / 2, yy / 2, s / 2
                c = im[int(max(0, yy - s)):int(yy + s), int(max(0, x - s)):int(x + s)]
                if c.size: cell = cv2.resize(c, (120, 120))
            cv2.putText(cell, wd[:9], (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 255), 1)
            cells.append(cell)
        row = np.hstack(cells); cv2.putText(row, f'{lag:+.3f}', (3, 114), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)
        rows.append(row)
    cv2.imwrite(out + '.strip.jpg', np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(json.dumps({k: res[k] for k in ('best_lag', 'corr', 'corr_at_0', 'face_found', 'frames')}))
