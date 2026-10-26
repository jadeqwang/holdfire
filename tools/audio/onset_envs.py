"""5 ms onset-strength envelopes + band envelopes for the mix and stems (adapted from merge-me-back-to-main
tools/analysis/onset_envs.py). All signals are analysed at 48 kHz, hop 240 (5.000 ms), so frame k = k*0.005 s.
Output: work/audio/env.npz  T, onset_<src>, rms_<src> (dBFS, 20 ms window), kick/snare/hat band envelopes (drum stem),
and low/mid/high band energies of the mix.
Sources: mix = work/audio/song.wav; inst/vocals = work/stems/{inst,vocals}.wav (BS-RoFormer) if present, else Kim;
vocals_kim = Kim_Vocal_2 stem; drums = KUIELab drums stem (separated from the Kim instrumental)."""
import os, numpy as np, librosa, soundfile as sf, scipy.signal as ss
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'work')
SR = 48000; HOP = 240
def load(p):
    y, sr = sf.read(p, dtype='float32'); y = y.mean(1) if y.ndim > 1 else y
    return librosa.resample(y, orig_sr=sr, target_sr=SR, res_type='soxr_hq') if sr != SR else y
rf = os.path.exists(os.path.join(W, 'stems/vocals.wav'))
srcs = dict(mix=os.path.join(W, 'audio/song.wav'),
            inst=os.path.join(W, 'stems/inst.wav' if rf else 'stems/mdx_kim/instrumental.wav'),
            vocals=os.path.join(W, 'stems/vocals.wav' if rf else 'stems/mdx_kim/vocals.wav'),
            vocals_kim=os.path.join(W, 'stems/mdx_kim/vocals.wav'),
            drums=os.path.join(W, 'stems/mdx_drums/drums.wav'))
out = {}
for k, p in srcs.items():
    y = load(p)
    o = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP, lag=1, max_size=1, n_mels=128)
    out['onset_' + k] = o
    r = np.sqrt(np.convolve(y.astype(np.float64)**2, np.ones(HOP*4)/(HOP*4), mode='same'))[::HOP]
    out['rms_' + k] = 20*np.log10(r[:len(o)] + 1e-9)
    bands = dict(kick=(30, 120), snare=(1500, 6000), hat=(7000, 15000)) if k == 'drums' else \
            dict(low=(20, 150), mid=(150, 2500), high=(2500, 16000)) if k == 'mix' else {}
    for nm, (lo, hi) in bands.items():
        sos = ss.butter(4, [lo, hi], btype='band', fs=SR, output='sos'); z = ss.sosfilt(sos, y.astype(np.float64))
        e = np.sqrt(np.convolve(z**2, np.ones(HOP*2)/(HOP*2), mode='same'))[::HOP]
        out[(k + '_' if k == 'mix' else '') + nm] = e[:len(o)]
    print(k, p, len(o))
n = min(len(v) for v in out.values())
out = {k: v[:n] for k, v in out.items()}
out['T'] = np.arange(n)*HOP/SR
out['sources'] = np.array([f'{k}={os.path.relpath(p, ROOT)}' for k, p in srcs.items()])
np.savez(os.path.join(W, 'audio/env.npz'), **out)
