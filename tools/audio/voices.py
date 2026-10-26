"""Which voice sings each line (best effort) -> work/audio/voices.json.
Per line, on the BS-RoFormer vocal stem inside the line's word spans: median and 90th-percentile pyin f0 (semitones),
voiced fraction, breathiness (energy 4-8 kHz / 0.3-4 kHz, dB), spectral flatness, loudness (RMS dB) and stereo width
(side/mid dB: stacked/choir parts are wide, a single lead is centred). Lead lines are split into two clusters with a
2-means on the standardised features, seeded with Verse 1 (tagged "breathy, close-mic" = A_breathy) and Chorus 1
("full choir" = B_belt). Wide lines (side/mid > -8 dB) with a belted lead are reported as 'both' (lead + stack);
gang/whisper count lines keep 'choir' / 'A_breathy' (whispered). Confidence = margin between the two cluster distances."""
import json, os, sys
import numpy as np, soundfile as sf, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sung
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W = os.path.join(ROOT, 'work')
v, sr = sf.read(os.path.join(W, 'stems/vocals.wav')); M = v.mean(1); Sd = (v[:, 0] - v[:, 1]) / 2
Z = np.load(os.path.join(W, 'audio/onsets_rf.npz')); f0, vf, ft = Z['f0'], Z['voiced'], Z['f0_t']
WD = {l['id']: l for l in json.load(open(os.path.join(W, 'audio/words.json')))}
L = sung.build()
feats, ids = [], []
for l in L:
    ws = WD[l['id']]['words']; a, b = ws[0]['start'], ws[-1]['end']
    m = (ft >= a) & (ft < b) & vf & ~np.isnan(f0)
    st = librosa.hz_to_midi(f0[m]) if m.sum() > 5 else np.array([np.nan])
    seg = M[int(a * sr):int(b * sr)]; sseg = Sd[int(a * sr):int(b * sr)]
    S = np.abs(librosa.stft(seg, n_fft=2048, hop_length=512)) ** 2; fr = librosa.fft_frequencies(sr=sr, n_fft=2048)
    act = S.sum(0) > np.percentile(S.sum(0), 40)
    br = 10 * np.log10(S[(fr > 4000) & (fr < 8000)][:, act].sum() / (S[(fr > 300) & (fr < 4000)][:, act].sum() + 1e-12) + 1e-12)
    flat = float(np.median(librosa.feature.spectral_flatness(S=np.sqrt(S[:, act] + 1e-12)))) if act.any() else 0
    rms = 10 * np.log10(np.mean(seg ** 2) + 1e-12); width = 10 * np.log10(np.mean(sseg ** 2) / (np.mean(seg ** 2) + 1e-12) + 1e-12)
    feats.append(dict(f0_med=float(np.nanmedian(st)), f0_p90=float(np.nanpercentile(st, 90)) if m.sum() > 5 else np.nan,
                      voiced=float(m.sum() / max(1, ((ft >= a) & (ft < b)).sum())), breath_db=float(br), flatness=flat,
                      rms_db=float(rms), width_db=float(width)))
    ids.append(l['id'])
F = feats
keys = ['f0_med', 'f0_p90', 'breath_db', 'rms_db', 'voiced']
lead = [i for i, l in enumerate(L) if l['kind'] == 'lead' and not np.isnan(F[i]['f0_med'])]
X = np.array([[F[i][k] for k in keys] for i in lead]); mu, sd = np.nanmean(X, 0), np.nanstd(X, 0) + 1e-9; Xs = np.nan_to_num((X - mu) / sd)
seedA = [j for j, i in enumerate(lead) if L[i]['section'] == 'Verse 1']; seedB = [j for j, i in enumerate(lead) if L[i]['section'] == 'Chorus 1']
cA, cB = Xs[seedA].mean(0), Xs[seedB].mean(0)
for it in range(10):
    dA = np.linalg.norm(Xs - cA, axis=1); dB = np.linalg.norm(Xs - cB, axis=1); lab = dB < dA
    cA, cB = Xs[~lab].mean(0), Xs[lab].mean(0)
out = {}
for j, i in enumerate(lead):
    l = L[i]; voice = 'B_belt' if lab[j] else 'A_breathy'
    margin = abs(dA[j] - dB[j]) / (dA[j] + dB[j])
    if F[i]['width_db'] > -8 and voice == 'B_belt': voice = 'both'
    out[l['id']] = dict(voice=voice, voice_conf='high' if margin > 0.25 else 'medium' if margin > 0.1 else 'low', **{k: round(F[i][k], 2) for k in F[i]})
for i, l in enumerate(L):
    if l['id'] in out: continue
    voice = 'choir' if l['kind'] == 'gang' else 'A_breathy'
    if l['kind'] == 'gang' and l['cidx'] in (52, 53): voice = 'choir'
    out[l['id']] = dict(voice=voice, voice_conf='medium', **{k: (None if np.isnan(F[i][k]) else round(F[i][k], 2)) for k in F[i]})
cent = {'A_breathy': dict(zip(keys, np.round(cA * sd + mu, 2).tolist())), 'B_belt': dict(zip(keys, np.round(cB * sd + mu, 2).tolist()))}
json.dump(dict(lines=out, cluster_centres=cent, doc=__doc__), open(os.path.join(W, 'audio/voices.json'), 'w'), indent=1)
print('centres', cent)
for l in L:
    o = out[l['id']]
    print(f"{l['id']:3d} {l['section']:14s} {o['voice']:9s} {o['voice_conf']:6s} f0 {o['f0_med']} p90 {o['f0_p90']} br {o['breath_db']} rms {o['rms_db']} w {o['width_db']} | {' '.join(l['words'])[:40]}")
