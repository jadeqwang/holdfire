"""analysis/audio.json: per-frame features at 24 fps (frame i covers [i/24, (i+1)/24) s) for the whole song, plus kick and
snare onset lists. Adapted from rare-earth-techno-remix/pipeline/audio_map.py; inputs are the 5 ms envelopes in
work/audio/env.npz (mix, BS-RoFormer vocal stem, KUIELab drum stem).
  rms    mix RMS (dB) normalised 0..1 between its 2nd and 99.5th percentile (mean over the frame)
  onset  mix onset strength (max over the frame) / 99th percentile, clipped to 1
  low    mix 20-150 Hz band level, mid 150-2500 Hz, high 2500-16000 Hz: dB, each normalised 0..1 (2nd..99.5th pct)
  vocal  BS-RoFormer vocal-stem RMS (dB) normalised 0..1 (-60 dBFS -> 0, its 99.5th pct -> 1)
  sung   1 when a lyric word is being sung in that frame (from timing.json word spans), else 0
kicks / snares: [t, strength 0..1]. Drum hits = peaks of the KUIELab drum stem's onset envelope (> 5x median, >= 100 ms
apart; 96 % sit within 25 ms of a 16th of the beat grid), classified by the band-level rise across the hit (level 15-40 ms
after minus 5-25 ms before): kick if the 30-120 Hz band rises >= 6 dB, snare if the 1.5-6 kHz band rises >= 6 dB and the
hit is not hat-only (7-15 kHz rise not > 1.5x the snare-band rise). A hit can be both. Strength = onset peak / 99th pct."""
import json, os
import numpy as np, scipy.signal as ss
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W = os.path.join(ROOT, 'work'); AN = os.path.join(ROOT, 'analysis')
E = np.load(os.path.join(W, 'audio/env.npz')); T = E['T']; DUR = 247.16; FPS = 24
n = int(np.ceil(DUR * FPS)); fi = np.minimum((T * FPS).astype(int), n - 1)
def pool(x, how):
    out = np.full(n, np.nan)
    if how == 'max': np.fmax.at(out, fi, x)
    else:
        s = np.bincount(fi, weights=x, minlength=n); c = np.bincount(fi, minlength=n); out = s / np.maximum(c, 1)
    return np.nan_to_num(out, nan=float(np.nanmin(x)))
def norm_db(db, lo=None, hi=None):
    lo = np.percentile(db, 2) if lo is None else lo; hi = np.percentile(db, 99.5) if hi is None else hi
    return np.clip((db - lo) / (hi - lo), 0, 1)
def to_db(x): return 20 * np.log10(np.maximum(x, 1e-9))
rms = norm_db(pool(E['rms_mix'], 'mean'))
on = pool(E['onset_mix'], 'max'); on = np.clip(on / np.percentile(E['onset_mix'], 99), 0, 1)
bands = {k: norm_db(pool(to_db(E['mix_' + k]), 'mean')) for k in ('low', 'mid', 'high')}
voc = norm_db(pool(E['rms_vocals'], 'mean'), lo=-60.0, hi=float(np.percentile(E['rms_vocals'], 99.5)))
TJ = json.load(open(os.path.join(AN, 'timing.json')))
sung = np.zeros(n, int)
for l in TJ['lines']:
    for w in l['words']: sung[int(w['start'] * FPS):int(np.ceil(w['end'] * FPS))] = 1
def band_onsets(env, rise_db=9, gap=0.11):
    db = to_db(env); d = db - np.r_[np.full(6, db[0]), db[:-6]]          # 30 ms rise
    pk, pr = ss.find_peaks(d, height=rise_db, distance=int(gap / 0.005))
    tt = T[pk]; lev = np.array([db[min(i + 6, len(db) - 1)] for i in pk])
    s = np.clip((lev - np.percentile(lev, 5)) / (np.percentile(lev, 99) - np.percentile(lev, 5) + 1e-9), 0, 1)
    # backtrack to the start of the rise
    st = []
    for i in pk:
        j = i
        while j > 0 and d[j - 1] > 0.3 * d[i] and i - j < 8: j -= 1
        st.append(T[j])
    return [[round(float(a), 3), round(float(b), 2)] for a, b in zip(st, s)]
OD = E['onset_drums']; pk, _ = ss.find_peaks(OD, height=5 * np.median(OD), distance=20)
kdb, sdb, hdb = to_db(E['kick']), to_db(E['snare']), to_db(E['hat'])
def rise(db, i): return float(np.max(db[i + 3:i + 8]) - np.mean(db[max(0, i - 5):max(1, i - 1)]))
kicks, snares = [], []
P99D = np.percentile(OD, 99)
for i in pk:
    if i < 6 or i + 8 >= len(T): continue
    kr, sr_, hr = rise(kdb, i), rise(sdb, i), rise(hdb, i); st = round(float(min(1.0, OD[i] / P99D)), 2)
    if kr >= 6: kicks.append([round(float(T[i]), 3), st])
    if sr_ >= 6 and not (hr > 1.5 * sr_): snares.append([round(float(T[i]), 3), st])
r3 = lambda a: [round(float(x), 3) for x in a]
out = dict(doc=__doc__.strip(), fps=FPS, n_frames=n, duration=DUR, time_of_frame='t = i / 24 (frame start)',
           features=dict(rms=r3(rms), onset=r3(on), low=r3(bands['low']), mid=r3(bands['mid']), high=r3(bands['high']), vocal=r3(voc),
                         sung=sung.tolist()), kicks=kicks, snares=snares)
json.dump(out, open(os.path.join(AN, 'audio.json'), 'w'), separators=(',', ':'))
g = np.array(TJ['beats']); six = np.sort(np.r_[g, g[:-1] + np.diff(g) / 4, g[:-1] + np.diff(g) / 2, g[:-1] + 3 * np.diff(g) / 4])
for nm, lst in (('kicks', kicks), ('snares', snares)):
    t = np.array([x[0] for x in lst]); dd = np.array([np.min(np.abs(six - x)) for x in t])
    print(nm, len(lst), f'on 16th grid within 25 ms: {np.mean(dd < 0.025) * 100:.0f}%  median |dev| {np.median(dd) * 1000:.0f} ms')
print('frames', n, 'size', os.path.getsize(os.path.join(AN, 'audio.json')) // 1024, 'KB')
