"""Verification plots (adapted from merge-me-back-to-main tools/analysis/plot_check.py):
analysis/check_overview.png (whole song) and analysis/check_<NN>_<section>.png (per section, split into <= 11 s panels):
spectrogram of the BS-RoFormer vocal stem (0-6 kHz), vocal RMS envelope (dB) + vocal onset strength, beat lines (bars bold),
lyric word starts (red = line start, green = word start, label = word) and count hits (orange triangles)."""
import json, os, re, sys
import numpy as np, soundfile as sf, librosa, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AN = os.path.join(ROOT, 'analysis'); W = os.path.join(ROOT, 'work')
TJ = json.load(open(os.path.join(AN, 'timing.json')))
E = np.load(os.path.join(W, 'audio/env.npz')); T = E['T']
v, sr = sf.read(os.path.join(W, 'stems/vocals.wav')); v = v.mean(1)
y, _ = sf.read(os.path.join(W, 'audio/song.wav')); y = y.mean(1)
beats = np.array(TJ['beats']); secs = TJ['sections']; lines = TJ['lines']
hits = [h for grp in (TJ.get('hits') or {}).values() if isinstance(grp, list) for h in grp if isinstance(h, dict) and 't' in h]
COL = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac']
only = sys.argv[1:]
def panel(a, b, fname, title):
    seg = v[int(a * sr):int(b * sr)]
    S = librosa.amplitude_to_db(np.abs(librosa.stft(seg, n_fft=1024, hop_length=120)), ref=np.max)
    f = librosa.fft_frequencies(sr=sr, n_fft=1024)
    fig, ax = plt.subplots(3, 1, figsize=(17, 8.6), sharex=True, gridspec_kw=dict(height_ratios=[2.2, 1.1, 1.0]))
    ax[0].imshow(S[f < 6000], origin='lower', aspect='auto', extent=[a, b, 0, 6000], cmap='magma', vmin=-75)
    m = (T >= a) & (T < b)
    ax[1].plot(T[m], E['rms_vocals'][m], lw=.8, color='purple', label='vocal RMS dB'); ax[1].plot(T[m], E['rms_mix'][m], lw=.5, color='k', alpha=.6, label='mix RMS dB')
    ax[1].set_ylim(-70, 0); ax[1].legend(loc='lower right', fontsize=7)
    on = E['onset_vocals'][m]; ax[2].plot(T[m], on / (np.percentile(E['onset_vocals'], 99.5)), lw=.8, color='tab:purple')
    ax[2].set_ylim(0, 1.3)
    for i, t in enumerate(beats):
        if a <= t <= b:
            for k, x in enumerate(ax): x.axvline(t, color='cyan' if k == 0 else 'k', lw=1.4 if i % 4 == 0 else .4, alpha=.8 if i % 4 == 0 else .35)
            if i % 4 == 0: ax[2].text(t + 0.02, 1.2, f'bar {i // 4 + 1}', fontsize=7)
    for l in lines:
        for k, w in enumerate(l['words']):
            if a <= w['start'] <= b:
                c = 'red' if k == 0 else 'lime'
                ax[0].axvline(w['start'], color=c, lw=1.3 if k == 0 else 0.9, alpha=.9)
                ax[1].axvline(w['start'], color=c, lw=1.0, alpha=.8)
                ax[0].text(w['start'] + 0.01, 5600 - 450 * (k % 3), w['w'], fontsize=8, color='white',
                           bbox=dict(facecolor='black', alpha=.55, pad=1, lw=0))
                ax[1].plot([w['start'], w['end']], [-66 + 3 * (k % 2)] * 2, lw=3, color='tab:green', solid_capstyle='butt')
    for h in hits:
        if a <= h['t'] <= b: ax[2].plot([h['t']], [1.05], marker='v', color='orange', ms=8)
    ax[2].set_xticks(np.arange(np.ceil(a * 10) / 10, b, 0.1), minor=True); ax[2].set_xticks(np.arange(np.ceil(a * 2) / 2, b, 0.5))
    ax[2].tick_params(axis='x', labelsize=7); ax[2].grid(which='minor', axis='x', alpha=.12); ax[2].grid(which='major', axis='x', alpha=.35)
    ax[2].set_xlim(a, b); ax[0].set_title(title, fontsize=10, loc='left')
    plt.tight_layout(); plt.savefig(fname, dpi=72); plt.close()
if not only:
    fig, ax = plt.subplots(3, 1, figsize=(26, 9), sharex=True, gridspec_kw=dict(height_ratios=[1.5, 1, 1]))
    n = 8000; k = len(y) // n; mx = y[:k * n].reshape(n, k); tt = np.linspace(0, len(y) / sr, n)
    ax[0].fill_between(tt, mx.min(1), mx.max(1), color='#333', lw=0)
    vv = v[:k * n].reshape(n, k); ax[1].fill_between(tt, vv.min(1), vv.max(1), color='purple', lw=0)
    for i, s in enumerate(secs):
        for x in ax: x.axvspan(s['start'], s['end'], color=COL[i % 10], alpha=.18, lw=0)
        ax[0].text(s['start'] + .3, .9, f"{s['name']}\nbar {s['start_bar']}", fontsize=8, va='top')
    for i, t in enumerate(beats[::4]):
        ax[0].axvline(t, color='k', lw=.4, alpha=.25)
    for l in lines:
        yy = l['n'] % 3
        ax[2].plot([l['start'], l['end']], [yy, yy], lw=5, color={'lead': 'tab:green', 'gang': 'tab:red', 'whisper': 'tab:blue'}[l['kind']], solid_capstyle='butt')
        ax[2].text(l['start'], yy + .25, l['text'][:22], fontsize=6, rotation=25)
    for e in TJ.get('events') or []:
        ax[0].axvline(e['t'], color='red', lw=.8, ls='--')
    ax[2].set_ylim(-.5, 3.3); ax[2].set_yticks([]); ax[0].set_ylim(-1, 1.05)
    ax[2].set_xticks(np.arange(0, 250, 10)); ax[2].set_xticklabels([f'{int(x // 60)}:{int(x % 60):02d}' for x in np.arange(0, 250, 10)])
    ax[2].set_xlim(0, len(y) / sr); plt.suptitle('Hold Fire - timing overview (mix / vocal stem / lines: green lead, red gang, blue whisper; red dashed = events)')
    plt.tight_layout(); plt.savefig(os.path.join(AN, 'check_overview.png'), dpi=60); plt.close()
for i, s in enumerate(secs):
    name = re.sub(r'[^a-z0-9]+', '_', s['name'].lower()).strip('_')
    if only and name not in only: continue
    a0, b0 = max(0, s['start'] - 0.8), min(len(v) / sr, s['end'] + 0.5)
    npan = int(np.ceil((b0 - a0) / 11.0)); edges = np.linspace(a0, b0, npan + 1)
    for p in range(npan):
        suffix = f'_{chr(97 + p)}' if npan > 1 else ''
        panel(edges[p], edges[p + 1], os.path.join(AN, f'check_{i + 1:02d}_{name}{suffix}.png'),
              f"{s['name']}  {s['start']:.3f}-{s['end']:.3f}  bars {s['start_bar']}-{s['end_bar']}   panel {p + 1}/{npan}   (vocal stem; red = line start, green = word start)")
print('ok')
