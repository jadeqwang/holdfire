"""Syllable-onset candidates in a vocal stem (adapted from merge-me-back-to-main tools/analysis/syllable_onsets.py):
spectral-flux onsets (backtracked to the energy rise), pyin voicing starts / pitch jumps (> 0.8 st), and high-band (>3.5 kHz)
rises for fricative/sibilant/breathy-whisper starts. Also a 5 ms vocal RMS (dB) and voiced-probability track for word ends.
    python3 tools/audio/syllable_onsets.py VOCALS_WAV TAG   -> work/audio/onsets_<TAG>.npz"""
import os, sys, numpy as np, librosa, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
voc, tag = sys.argv[1], sys.argv[2]
sr = 22050; hop = 110
y, s0 = sf.read(voc); y = y.mean(1) if y.ndim > 1 else y
v = librosa.resample(y, orig_sr=s0, target_sr=sr, res_type='soxr_hq')
o = librosa.onset.onset_strength(y=v, sr=sr, hop_length=hop, lag=2)
eon = librosa.onset.onset_detect(onset_envelope=o, sr=sr, hop_length=hop, units='frames', delta=0.03, wait=12, backtrack=False)
eon_bt = librosa.onset.onset_backtrack(eon, o)
estr = o[eon] / (np.percentile(o, 99) + 1e-9)
f0, vf, vp = librosa.pyin(v, fmin=100, fmax=1100, sr=sr, hop_length=hop * 4, frame_length=2048)
midi = librosa.hz_to_midi(f0); tt = np.arange(len(midi)) * hop * 4 / sr
pon = []
for i in range(4, len(midi) - 3):
    if vf[i] and (not vf[i - 1] or (not np.isnan(midi[i - 4]) and abs(np.nanmedian(midi[i:i + 3]) - np.nanmedian(midi[i - 4:i - 1])) > 0.8)):
        if not pon or tt[i] - pon[-1] > 0.08: pon.append(tt[i])
S = np.abs(librosa.stft(v, n_fft=512, hop_length=hop)); f = librosa.fft_frequencies(sr=sr, n_fft=512)
hf = 10 * np.log10((S[f > 3500] ** 2).sum(0) + 1e-10); hf = np.convolve(hf, np.ones(4) / 4, 'same')
dh = np.diff(hf, prepend=hf[0]); hon = []
for i in librosa.util.peak_pick(np.maximum(dh, 0), pre_max=8, post_max=8, pre_avg=20, post_avg=20, delta=1.5, wait=16):
    j = i
    while j > 0 and dh[j - 1] > 0.3 * dh[i]: j -= 1
    hon.append(j * hop / sr)
rms = 20 * np.log10(librosa.feature.rms(y=v, frame_length=441, hop_length=hop)[0] + 1e-9)
T = np.arange(len(rms)) * hop / sr
np.savez(os.path.join(ROOT, f'work/audio/onsets_{tag}.npz'), energy=eon * hop / sr, energy_bt=eon_bt * hop / sr, energy_str=estr,
         pitch=np.array(pon), hf=np.array(hon), f0=f0, voiced=vf, vprob=vp, f0_t=tt, rms=rms, rms_t=T, onset_env=o)
print(tag, 'energy', len(eon), 'pitch', len(pon), 'hf', len(hon))
