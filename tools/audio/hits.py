"""Count hits -> work/audio/hits.json. Every shouted count word (post-chorus 'One! One! Two! Three! Five!', drop
'Thirteen! ... Eighty-nine!') and every whispered intro/outro count word, at its sharp onset: the fused word start
(work/audio/words.json) refined to the steepest rise of the BS-RoFormer vocal-stem onset envelope (5 ms frames) within
[-60, +80] ms when that peak is a clear transient (> 3x the local median). Reports bar/beat, offset to the nearest beat and a
0-1 strength (vocal onset peak / 99th percentile). t = word onset (consonant start); t_attack = steepest rise of the vocal RMS
(10 ms smoothed dB) within [-30, +150] ms = the loud vowel attack - use t_attack for big visual hits (for 'Three'/'Five' the
fricative comes 40-90 ms earlier). The 'Counting on you!' shouts that follow each count are listed too."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sung
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W = os.path.join(ROOT, 'work')
E = np.load(os.path.join(W, 'audio/env.npz')); T = E['T']; O = E['onset_vocals']; OM = E['onset_mix']
P99 = np.percentile(O, 99); PM = np.percentile(OM, 99)
RV = np.convolve(E['rms_vocals'], np.ones(2) / 2, 'same'); dRV = np.gradient(RV)
def attack(t):
    m = np.where((T >= t - 0.03) & (T <= t + 0.15))[0]
    return float(T[m[np.argmax(dRV[m])]]) if len(m) else t
beats = np.array(json.load(open(os.path.join(W, 'audio/grid.json')))['beats'])
WD = {l['id']: l for l in json.load(open(os.path.join(W, 'audio/words.json')))}
L = sung.build()
def bb(t):
    i = int(np.searchsorted(beats, t) - 1); i = max(0, min(i, len(beats) - 2))
    j = i if abs(t - beats[i]) < abs(t - beats[i + 1]) else i + 1
    return dict(bar=j // 4 + 1, beat=j % 4 + 1, beat_t=round(float(beats[j]), 3), off_ms=int(round((t - beats[j]) * 1000)))
def refine(t):
    m = (T >= t - 0.06) & (T <= t + 0.08)
    if not m.any(): return t, 0.0, False
    j = np.argmax(O[m]); pk = O[m][j]; loc = np.median(O[(T >= t - 1) & (T <= t + 1)])
    if pk > 3 * loc:
        # steepest rise just before the peak = the attack
        idx = np.where(m)[0][j]; k = idx
        while k > 0 and O[k - 1] < O[k] and O[k - 1] > 0.3 * pk: k -= 1
        return float(T[k]), float(pk / P99), True
    return t, float(pk / P99), False
groups = {'intro_whisper': [], 'post_chorus_1': [], 'post_chorus_2': [], 'drop_counts': [], 'outro_whisper': [], 'counting_on_you': []}
for l in L:
    sec = l['section']
    if not (('One' in l['words'] and l['kind'] in ('gang', 'whisper')) or l['cidx'] in (57, 60) or l['cidx'] in (18, 38)): continue
    key = {'Intro': 'intro_whisper', 'Post-Chorus 1': 'post_chorus_1', 'Post-Chorus 2': 'post_chorus_2', 'Drop': 'drop_counts',
           'Outro': 'outro_whisper'}[sec]
    if l['cidx'] in (18, 38): key = 'counting_on_you'
    for wi, w in enumerate(l['words']):
        if key == 'counting_on_you' and wi > 0: continue
        fw = WD[l['id']]['words'][wi]
        t, s, sharp = refine(fw['start']) if l['kind'] == 'gang' else (fw['start'], 0.0, False)
        if l['kind'] == 'whisper':
            m = (T >= t - 0.03) & (T <= t + 0.12); s = float(O[m].max() / P99) if m.any() else 0.0
        mi = (T >= t - 0.03) & (T <= t + 0.05)
        rec = dict(t=round(t, 3), t_attack=round(attack(t), 3), word=('Counting on you' if key == 'counting_on_you' else w), line_n=l['id'], word_idx=wi,
                   kind=l['kind'], strength=round(min(s, 1.5), 2), mix_onset=round(float(OM[mi].max() / PM), 2) if mi.any() else 0,
                   sharp_transient=bool(sharp), **bb(t))
        if wi in l.get('extra', []): rec['extra'] = 'sung extra word, not in the canonical line'
        groups[key].append(rec)
groups['intro_whisper'].append(dict(t=11.51, t_attack=round(attack(11.51), 3), word='(yeah)', line_n=1, word_idx=None, kind='whisper', strength=None,
                                    note='short extra whisper after count #2 "eight" (heard as "yeah"); not a lyric word', **bb(11.51)))
groups['intro_whisper'].sort(key=lambda h: h['t'])
groups['_doc'] = __doc__.split('\n')[0] + ' Times in seconds; off_ms = onset minus nearest beat.'
json.dump(groups, open(os.path.join(W, 'audio/hits.json'), 'w'), indent=1)
for k, v in groups.items():
    if k.startswith('_'): continue
    print(k, ' '.join(f"{h['word']}@{h['t']:.3f}/{h['t_attack']:.3f}({h['bar']}.{h['beat']}{h['off_ms']:+d})" for h in v))
