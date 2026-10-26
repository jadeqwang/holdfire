"""Fuse word timings -> work/audio/words.json.
Estimates per sung word (tools/audio/sung.py):
  * CTC forced alignment (NeMo conformer-CTC-large): global pass over the whole song + local pass per line window,
    each on the BS-RoFormer ('rf') and Kim_Vocal_2 ('kim') stems  -> up to 4 estimates (primary);
  * parakeet-tdt-0.6b-v2 ASR words and Whisper large-v3-turbo ASR words (overlapping windows, both stems), mapped to the
    sung words with difflib on normalised tokens -> medians (secondary, used to arbitrate when the CTC runs disagree).
Start = robust centre of the estimates, CTC bias-corrected, then snapped to a syllable onset of the vocal stems (backtracked
spectral-flux onset, pyin voicing start / pitch jump, or high-band rise) within [-120, +80] ms. Starts are forced strictly
increasing (>= 40 ms) inside a line. End = next word start (inside a line) or the vocal-activity offset (last word).
Manual overrides (tools/audio/overrides.json, from inspection of the check plots) are applied last and flagged."""
import json, os, sys, difflib
import numpy as np, soundfile as sf, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sung, ctc, textnorm
ROOT = ctc.ROOT; W = os.path.join(ROOT, 'work')
L = sung.build()
STEMS = {k: p for k, p in (('rf', 'work/stems/vocals.wav'), ('kim', 'work/stems/mdx_kim/vocals.wav')) if os.path.exists(os.path.join(ROOT, p))}
def jl(p): return json.load(open(os.path.join(W, p))) if os.path.exists(os.path.join(W, p)) else None
G = {k: {l['id']: l for l in jl(f'asr/ctc_{k}.json')} for k in STEMS if jl(f'asr/ctc_{k}.json')}
gkey = 'rf' if 'rf' in G else 'kim'
gl = {l['id']: (G[gkey][l['id']]['words'][0]['start'], G[gkey][l['id']]['words'][-1]['end']) for l in L}
# ---- local CTC per line
local_path = os.path.join(W, 'asr/ctc_local.json')
LOC = jl('asr/ctc_local.json') or {}
for k, p in STEMS.items():
    if k in LOC: continue
    y, sr = sf.read(os.path.join(ROOT, p)); y = y.mean(1) if y.ndim > 1 else y
    y16 = librosa.resample(y, orig_sr=sr, target_sr=16000, res_type='soxr_hq').astype(np.float32)
    LOC[k] = {}
    for i, l in enumerate(L):
        s, e = gl[l['id']]
        a = max(s - 0.6, gl[L[i - 1]['id']][1] - 0.1 if i else 0)
        b = min(e + 0.8, gl[L[i + 1]['id']][0] + 0.1 if i + 1 < len(L) else len(y16) / 16000)
        if b - a < 0.6: a, b = s - 0.3, e + 0.3
        LOC[k][str(l['id'])] = dict(win=[round(a, 3), round(b, 3)], words=ctc.align(y16, a, b, l['words']))
    json.dump(LOC, open(local_path, 'w'), indent=0)
# ---- ASR word estimates mapped to sung words
flat = [(l['id'], wi, w) for l in L for wi, w in enumerate(l['words'])]
gstart = {(lid, wi): G[gkey][lid]['words'][wi]['start'] for lid, wi, _ in flat}
asr_est = {}
for name in ('parakeet_rf', 'parakeet_rf_b', 'parakeet_kim', 'whisper_rf', 'whisper_kim'):
    d = jl(f'asr/{name}.json')
    if not d: continue
    wins = d if isinstance(d, list) else [w for p in ('noprompt', 'prompt') for w in d.get(p, [])]
    for win in wins:
        a, b = win['start'], win['end']
        cand = [(lid, wi, w) for lid, wi, w in flat if a - 1.5 <= gstart[(lid, wi)] <= b + 1.5]
        if not cand or not win['words']: continue
        cp, cmap = [], []
        for j, (lid, wi, w) in enumerate(cand):
            for q, p in enumerate(textnorm.parts(w)): cp.append(p); cmap.append((j, q))
        ap, amap = [], []
        for w in win['words']:
            ps = textnorm.parts(w['w'])
            for q, p in enumerate(ps):
                ap.append(p); amap.append(w['start'] + (w['end'] - w['start']) * q / len(ps))
        sm = difflib.SequenceMatcher(a=cp, b=ap, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag != 'equal': continue
            for k2 in range(i2 - i1):
                j, q = cmap[i1 + k2]
                if q != 0: continue
                t = amap[j1 + k2]
                if a + 0.3 < t < b - 0.3 or (a == 0 and t < b - 0.3):   # ignore times clamped at window edges
                    lid, wi, _ = cand[j]; asr_est.setdefault((lid, wi), {}).setdefault(name.split('_')[0], []).append(t)
# ---- onset candidates
ONS = []
for k in STEMS:
    p = os.path.join(W, f'audio/onsets_{k}.npz')
    if os.path.exists(p):
        z = np.load(p); ONS += [z['energy_bt'], z['pitch'], z['hf']]
ons = np.sort(np.concatenate(ONS))
rfk = 'rf' if os.path.exists(os.path.join(W, 'audio/onsets_rf.npz')) else 'kim'
Z = np.load(os.path.join(W, f'audio/onsets_{rfk}.npz')); RMS, RT = Z['rms'], Z['rms_t']
# CTC bias: median (ctc - nearest onset) over all words
def nearest(t, lo=-0.15, hi=0.15):
    c = ons[(ons >= t + lo) & (ons <= t + hi)]
    return None if not len(c) else float(c[np.argmin(np.abs(c - t))])
ctc_all = []
for l in L:
    for wi in range(len(l['words'])):
        for k in G: ctc_all.append(G[k][l['id']]['words'][wi]['start'])
        for k in LOC: ctc_all.append(LOC[k][str(l['id'])]['words'][wi]['start'])
diffs = [t - n for t in ctc_all if t is not None for n in [nearest(t)] if n is not None]
BIAS = float(np.median(diffs)); print(f'CTC start bias vs nearest onset: median {BIAS*1000:+.0f} ms over {len(diffs)}')
# fricative/sibilant-initial words: CTC + energy onsets tend to lock onto the vowel; move the start to the beginning of the
# contiguous high-band (> 3.5 kHz) plateau when it starts 20-200 ms earlier and stands >= 6 dB over the preceding context
# (adapted from merge-me-back-to-main fuse.py fric_onset). Uses the BS-RoFormer stem.
_y, _sr = sf.read(os.path.join(ROOT, STEMS.get('rf', STEMS.get('kim')))); _y = librosa.resample(_y.mean(1), orig_sr=_sr, target_sr=16000)
_S = np.abs(librosa.stft(_y, n_fft=512, hop_length=80)); _f = librosa.fft_frequencies(sr=16000, n_fft=512)
HF = np.convolve(10 * np.log10((_S[_f > 3500] ** 2).sum(0) + 1e-9), np.ones(4) / 4, 'same'); THF = np.arange(len(HF)) * 0.005
def fric_onset(c, prev):
    m = (THF >= max(c - 0.22, prev + 0.08)) & (THF <= c + 0.06); idx = np.where(m)[0]
    if not len(idx): return None
    pk = idx[np.argmax(HF[idx])]; ref = HF[pk]
    ctx = HF[(THF >= c - 0.6) & (THF < c - 0.25)]
    if not len(ctx) or ref - np.median(ctx) < 6: return None
    j = pk
    while j - 1 >= idx[0] and HF[j - 1] > ref - 8: j -= 1
    return float(THF[j])
FRIC = ('s', 'f', 'z', 'c', 'th', 'sh', 'ch')
ov = jl('../tools/audio/overrides.json') or {}
out = []
for l in L:
    lid = l['id']; words = []
    for wi, w in enumerate(l['words']):
        C = [G[k][lid]['words'][wi]['start'] for k in G] + [LOC[k][str(lid)]['words'][wi]['start'] for k in LOC]
        C = np.array([c for c in C if c is not None]) - BIAS
        med = float(np.median(C)); spread = float(C.max() - C.min()) if len(C) else 0
        A = asr_est.get((lid, wi), {})
        pk = float(np.median(A['parakeet'])) if 'parakeet' in A else None
        wh = float(np.median(A['whisper'])) if 'whisper' in A else None
        flags = []; est = med; srcs = 'ctc'
        if spread > 0.2:
            flags.append(f'ctc_spread{spread:.2f}')
            ref = pk if pk is not None else wh
            if ref is not None:   # pick the CTC estimate closest to the ASR consensus
                est = float(C[np.argmin(np.abs(C - ref))]); srcs = 'ctc~asr'
        if pk is not None and abs(pk - est) > 0.3:
            flags.append(f'parakeet_diff{pk-est:+.2f}')
            if len(A['parakeet']) >= 2 and np.ptp(A['parakeet']) < 0.12 and spread > 0.2:
                est = pk; srcs = 'parakeet'
        sn = nearest(est, -0.12, 0.08)
        st = sn if sn is not None else est
        if sn is None: flags.append('no_onset')
        lw = w.lower()
        if lw.startswith(FRIC) and not lw.startswith(('ca', 'co', 'cl', 'cr', 'cu')):
            prev = words[-1]['start'] if words else st - 0.6
            fo = fric_onset(st, prev)
            if fo is not None and st - 0.2 <= fo < st - 0.02:
                flags.append(f'fricative_onset{fo - st:+.3f}'); st = fo
        words.append(dict(w=w, start=round(st, 3), est=round(est, 3), src=srcs, ctc=[round(float(c), 3) for c in C],
                          parakeet=None if pk is None else round(pk, 3), whisper=None if wh is None else round(wh, 3), flags=flags))
    for wi in range(1, len(words)):
        if words[wi]['start'] < words[wi - 1]['start'] + 0.04:
            words[wi]['start'] = round(max(words[wi]['est'], words[wi - 1]['start'] + 0.04), 3); words[wi]['flags'].append('monotonic_fix')
    o = ov.get(str(lid), {})
    for k, t in o.get('starts', {}).items():
        words[int(k)]['start'] = t; words[int(k)]['flags'].append('manual_start')
    out.append(dict(id=lid, words=words, _ends=o.get('ends', {}), note=o.get('note')))
# ends
for n, rec in enumerate(out):
    ws = rec['words']; nxt_line = out[n + 1]['words'][0]['start'] if n + 1 < len(out) else 247.16
    for k, w in enumerate(ws):
        if k + 1 < len(ws): w['end'] = round(ws[k + 1]['start'] - 0.005, 3); continue
        ce = max([G[g][rec['id']]['words'][k]['end'] for g in G] + [LOC[g][str(rec['id'])]['words'][k]['end'] or 0 for g in LOC])
        m = (RT >= w['start']) & (RT < min(nxt_line - 0.02, w['start'] + 4.0)); seg = RMS[m]; tt = RT[m]
        if not len(seg): w['end'] = round(w['start'] + 0.15, 3); continue
        thr = max(seg[:40].max() - 22, -48); act = seg > thr; end_i = 0; gap = 0
        for j in range(len(act)):
            if act[j]: end_i = j; gap = 0
            else:
                gap += 1
                if gap >= 16: break
        e = max(float(tt[end_i]) + 0.01, min(ce, nxt_line - 0.02))
        w['end'] = round(min(max(e, w['start'] + 0.1), nxt_line - 0.02), 3)
    for k, t in rec.pop('_ends').items():
        ws[int(k)]['end'] = t; ws[int(k)]['flags'].append('manual_end')
for rec in out:
    print(f"{rec['id']:3d} " + ' '.join(f"{w['w']}@{w['start']:.2f}" + ('*' if w['flags'] else '') for w in rec['words']))
json.dump(out, open(os.path.join(W, 'audio/words.json'), 'w'), indent=1)
