"""Independent spot-check of word starts (adapted from merge-me-back-to-main tools/analysis/spotcheck.py): for every word that
starts with a plosive/fricative/affricate consonant, measure the acoustic onset on the *Kim_Vocal_2* stem (a different
separation from the BS-RoFormer stem used for snapping): the steepest rise of 2-8 kHz energy or of broadband RMS within
+-150 ms of the predicted start, backtracked to where the slope first exceeds 30 % of its maximum. Reports predicted - measured.
Output: work/audio/spotcheck.json"""
import json, os
import numpy as np, librosa, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W = os.path.join(ROOT, 'work')
sr = 22050; hop = 110
y, s0 = sf.read(os.path.join(W, 'stems/mdx_kim/vocals.wav')); y = librosa.resample(y.mean(1), orig_sr=s0, target_sr=sr)
S = np.abs(librosa.stft(y, n_fft=512, hop_length=hop)); f = librosa.fft_frequencies(sr=sr, n_fft=512)
hf = 10 * np.log10(S[(f > 2000) & (f < 8000)].sum(0) ** 2 + 1e-9); bb = 10 * np.log10((S ** 2).sum(0) + 1e-9)
k = np.ones(6) / 6; hf = np.convolve(hf, k, 'same'); bb = np.convolve(bb, k, 'same'); t = np.arange(len(hf)) * hop / sr
dh, db = np.gradient(hf), np.gradient(bb)
TJ = json.load(open(os.path.join(ROOT, 'analysis/timing.json')))
rows = []
for l in TJ['lines']:
    for w in l['words']:
        c = w['w'].lower()[:2]
        if not (c[0] in 'ptkbdgfsvzc' or c in ('sh', 'ch', 'th')): continue
        p = w['start']; m = (t >= p - 0.15) & (t <= p + 0.15)
        if m.sum() < 10: continue
        jh, jb = np.argmax(dh[m]), np.argmax(db[m])
        use_h = dh[m][jh] >= db[m][jb]; g = dh if use_h else db; j0 = np.where(m)[0][jh if use_h else jb]
        while j0 > 0 and g[j0 - 1] > 0.3 * g[j0] and t[j0 - 1] > p - 0.2: j0 -= 1
        rows.append(dict(line=l['n'], w=w['w'], predicted=p, measured=round(float(t[j0]), 3), err_ms=int(round(1000 * (p - t[j0]))),
                         feature='hf' if use_h else 'rms', conf=w.get('conf', 'high')))
e = np.array([r['err_ms'] for r in rows])
summ = dict(n=len(e), median_abs_ms=float(np.median(np.abs(e))), p75_abs_ms=float(np.percentile(np.abs(e), 75)),
            p90_abs_ms=float(np.percentile(np.abs(e), 90)), within_50ms_pct=round(float(np.mean(np.abs(e) <= 50) * 100), 1),
            within_100ms_pct=round(float(np.mean(np.abs(e) <= 100) * 100), 1), bias_ms=float(np.median(e)))
json.dump(dict(method=__doc__, summary=summ, rows=rows), open(os.path.join(W, 'audio/spotcheck.json'), 'w'), indent=1)
print(summ)
print('worst:', sorted(rows, key=lambda r: -abs(r['err_ms']))[:12])
