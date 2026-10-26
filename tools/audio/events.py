"""Notable musical events -> work/audio/events.json (adapted from merge-me-back-to-main tools/analysis/events.py).
Measured from work/audio/env.npz (5 ms envelopes of mix / BS-RoFormer inst / KUIELab drum stem), the grid and the stems:
  * drums_in / drums_out: per-bar drum-stem level crossing (-40 dB) -> time of the first/last strong drum onset;
  * impacts: strongest instrumental onset within +-120 ms of the expected point, with the low-band (20-150 Hz) jump in dB;
  * sub_hits: 20-150 Hz jumps >= 25 dB within 150 ms that start from a quiet low end (< -50 dB) - 808/sub drops;
  * snare_roll: runs of >= 3 drum onsets per beat (16th notes) lasting >= 4 beats;
  * choir_wide: bars where the vocal stem's side/mid ratio rises above -10 dB (stacked/choir vocals) after a mono stretch;
  * silence: mix RMS < -40 dBFS for >= 0.3 s; vocal_gap: >= 2.5 s without sung words; end: last note decay / file end.
Descriptions are written from the check plots (analysis/check_*.png) and spectrogram zooms."""
import json, os, sys
import numpy as np, soundfile as sf, scipy.signal as ss
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W = os.path.join(ROOT, 'work')
E = np.load(os.path.join(W, 'audio/env.npz')); T = E['T']
g = np.array(json.load(open(os.path.join(W, 'audio/grid.json')))['beats']); bars = g[::4]; DUR = 247.16
OI = E['onset_inst']; OD = E['onset_drums']; low = 20 * np.log10(E['mix_low'] + 1e-9); R = E['rms_mix']
P_OI = np.percentile(OI, 99)
def bb(t):
    i = int(np.searchsorted(g, t, side='right') - 1); i = max(0, min(i, len(g) - 2))
    return dict(bar=i // 4 + 1, beat=round(float(i % 4 + 1 + (t - g[i]) / (g[i + 1] - g[i])), 2))
def snap_inst(t, w=0.12):
    m = (T >= t - w) & (T <= t + w); j = np.argmax(OI[m]); return float(T[m][j]), float(OI[m][j] / P_OI)
def lowjump(t):
    a = low[(T >= t - 0.15) & (T < t - 0.01)]; b = low[(T >= t) & (T < t + 0.15)]
    return round(float(b.max() - np.median(a)), 1) if len(a) and len(b) else None
ev = []
def add(t, typ, desc, **kw):
    ev.append(dict(t=round(float(t), 3), type=typ, desc=desc, **bb(t), **kw))
# --- drums per bar
d, sr = sf.read(os.path.join(W, 'stems/mdx_drums/drums.wav')); d = d.mean(1)
lev = np.array([10 * np.log10(np.mean(d[int(a * sr):int((bars[i + 1] if i + 1 < len(bars) else DUR) * sr)] ** 2) + 1e-12) for i, a in enumerate(bars)])
pk, _ = ss.find_peaks(OD, height=5 * np.median(OD), distance=8); PT = T[pk]
on_in = lev > -35; on_out = lev > -40
for i in range(1, len(bars)):
    if on_in[i] and not on_out[i - 1] and not any(abs(bars[i] - x) < 1.5 for x in (244.05,)):
        c = PT[(PT >= bars[i] - 0.7) & (PT < bars[i] + 2.5)]
        t0 = float(c[0]) if len(c) else bars[i]
        add(t0, 'drums_in', f'drums/808s back in (bar {i + 1}); first hit', bar_line=round(float(bars[i]), 3), level_db=round(float(lev[i]), 1))
    if not on_out[i] and on_in[i - 1]:
        c = PT[(PT >= bars[i] - 2.6) & (PT < bars[i] + 0.3)]
        t0 = float(c[-1]) if len(c) else bars[i]
        add(t0, 'drums_out', f'drums/808s stop: last hit {t0:.3f} (silent from bar {i + 1} on)', level_db=round(float(lev[i]), 1))
# gaps the per-bar level test misses (held pads leak into the drum stem): placed from the check plots, timed on the last hit
for a, b, desc in ((183.0, 184.3, 'PRE-DROP GAP: drums/808s and bass cut on bar 73 (183.94); only a held pad + the lead vocal '
                    '("Couldn\'t be sure ... a prayer") until the drop impact at 188.35'),
                   (233.5, 235.2, 'drums/808s cut after the last full "Hold your fire" (bar 93); held vocal + piano decay')):
    c = PT[(PT >= a) & (PT < b)]
    add(float(c[-1]) if len(c) else a, 'drums_out', desc + (f'; last hit {c[-1]:.3f}' if len(c) else ''))
ev[:] = [e for e in ev if not (e['type'] == 'drums_in' and abs(e['t'] - 244.05) < 0.1)]
# --- impacts (expected points from the check plots), measured on the instrumental onset envelope
for t, desc in ((13.13, 'sub/808 slide on the Verse 1 downbeat (bar 6)'), (16.99, 'first snare/clap hit (bar 7 beat 3)'),
                (22.475, 'deep 808 hit (verse 1)'), (55.04, '808 + hit, chorus 1'), (65.34, '808 + hit, chorus 1 second half'),
                (153.69, 'drums + 808 return inside the Bridge ("But fear\'s a chain")'), (188.35, 'DROP IMPACT: full-spectrum slam on bar 74 '
                 'beat 4 after the 4.4 s drums-out gap, 16th-note fill into bar 75 (188.99) where the full 808/drum groove starts'),
                (224.33, 'Outro: drums + 808 slam back in (bar 89) under the whispered count'),
                (244.05, 'FINAL HIT: 808 + crash on bar 96 beat 4 (strongest onset and largest low-end jump of the song), 16th hits to '
                 '244.69, sub decays to silence')):
    ts, s = snap_inst(t)
    add(ts, 'impact', desc, strength=round(s, 2), low_jump_db=lowjump(ts))
# --- sub hits from a quiet low end
dl = np.r_[np.zeros(30), low[30:] - low[:-30]]
cand, _ = ss.find_peaks(dl, height=25, distance=60)
for i in cand:
    pre = np.median(low[max(0, i - 60):max(1, i - 30)])
    if pre < -58 and dl[i] >= 30 and not any(e['type'] == 'sub_hit' and abs(e['t'] - T[i]) < 1.0 for e in ev):
        j = i - 30 + np.argmax(np.diff(low[i - 30:i + 1]))
        if not any(abs(e['t'] - T[j]) < 0.15 for e in ev):
            add(T[j], 'sub_hit', 'sub-bass / 808 entry from a quiet low end', low_jump_db=round(float(dl[i]), 1))
# --- snare rolls: >= 3 drum onsets per beat for >= 4 consecutive beats
dens = np.array([((PT >= g[i] - 0.02) & (PT < g[i + 1] - 0.02)).sum() for i in range(len(g) - 1)])
i = 0
while i < len(dens):
    if dens[i] >= 3:
        j = i
        while j < len(dens) and dens[j] >= 3: j += 1
        if j - i >= 4:
            big = g[i] > 175 and g[i] < 184
            add(g[i], 'snare_roll', (f'BUILD snare/808 roll: 16th notes for {j - i} beats into the drums-out gap at {g[j]:.3f} '
                                     '(density rises from 2 to 4 hits per beat over bars 68-72)') if big else
                f'16th-note drum/808 fill ({j - i} beats, until {g[j]:.3f})', until=round(float(g[j]), 3))
        i = j
    else: i += 1
# --- choir / wide vocals
v, sr2 = sf.read(os.path.join(W, 'stems/vocals.wav')); M = (v[:, 0] + v[:, 1]) / 2; S = (v[:, 0] - v[:, 1]) / 2
sm = []
for k, a in enumerate(bars):
    b = bars[k + 1] if k + 1 < len(bars) else DUR
    mm = M[int(a * sr2):int(b * sr2)]; s_ = S[int(a * sr2):int(b * sr2)]
    sm.append(10 * np.log10((np.mean(s_ ** 2) + 1e-12) / (np.mean(mm ** 2) + 1e-12)) if np.mean(mm ** 2) > 1e-6 else -40)
sm = np.array(sm); wide = sm > -10
for k in range(1, len(bars)):
    if bars[k] > 13 and wide[k] and not wide[k - 1] and k + 1 < len(bars) and wide[k + 1]:
        add(bars[k], 'choir_wide', f'stacked/choir vocals enter (vocal side/mid {sm[k]:.1f} dB, was {sm[k - 1]:.1f})', side_mid_db=round(float(sm[k]), 1))
    if not wide[k] and wide[k - 1] and k + 1 < len(bars) and not wide[k + 1]:
        add(bars[k], 'mono_lead', f'vocals collapse to a single centred lead (side/mid {sm[k]:.1f} dB)', side_mid_db=round(float(sm[k]), 1))
# --- silences
q = R < -40; i = 0
while i < len(q):
    if q[i]:
        j = i
        while j < len(q) and q[j]: j += 1
        if (j - i) * 0.005 >= 0.3 and T[i] > 1:
            add(T[i], 'silence', f'near-silence: mix below -40 dBFS for {(j - i) * 0.005:.2f} s', until=round(float(T[j - 1]), 3))
        i = j
    else: i += 1
WD = json.load(open(os.path.join(W, 'audio/words.json')))
ws = sorted([(w['start'], w['end']) for l in WD for w in l['words']])
for (s0, e0), (s1, e1) in zip(ws, ws[1:]):
    if s1 - e0 >= 2.5: add(e0, 'vocal_gap', f'no vocals for {s1 - e0:.2f} s', until=round(s1, 3))
add(0.0, 'start', 'file start: pad fade-in (mix below -40 dBFS until 0.92 s)')
fv = next(w['start'] for l in WD for w in l['words'])
add(fv, 'vocal', 'first vocal: whispered "One..."')
lv = max(w['end'] for l in WD for w in l['words'])
add(lv, 'vocal', 'last vocal ends (whispered "fire")')
add(float(T[np.where(R > -40)[0][-1]]), 'end', 'final 808 decays below -40 dBFS')
add(float(T[np.where(R > -60)[0][-1]]), 'end', 'last audible sound (mix below -60 dBFS after this)')
add(DUR, 'end', 'end of file')
ev.sort(key=lambda e: e['t'])
json.dump(ev, open(os.path.join(W, 'audio/events.json'), 'w'), indent=1)
for e in ev: print(f"{e['t']:8.3f} {e['bar']:3d}/{e['beat']:5.2f} {e['type']:11s} {e['desc'][:110]}")
