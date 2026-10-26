"""Independent per-line check: re-transcribe each sung line's exact window ([start-0.25, end+0.25] s, >= 1.6 s) of the
BS-RoFormer vocal stem with Whisper large-v3-turbo (no prompt) and parakeet-tdt-0.6b-v2, and score how many of the line's
words each one hears (difflib on normalised tokens). A line whose window is wrong scores ~0 on both.
Output: work/audio/verify_lines.json  {id: {win, whisper, parakeet, match_whisper, match_parakeet, match}}"""
import json, os, sys, difflib
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stt, sung, textnorm, asr_parakeet
from concurrent.futures import ThreadPoolExecutor
ROOT = stt.ROOT; W = os.path.join(ROOT, 'work')
y, sr = sf.read(os.path.join(W, 'stems/vocals.wav')); y = y.mean(1)
y16 = asr_parakeet.load16(os.path.join(W, 'stems/vocals.wav'))
WD = {l['id']: l for l in json.load(open(os.path.join(W, 'audio/words.json')))}
L = sung.build()
def score(ref_words, hyp_text):
    r = [p for w in ref_words for p in textnorm.parts(w)]; h = [p for w in hyp_text.split() for p in textnorm.parts(w)]
    if not r: return 0.0
    sm = difflib.SequenceMatcher(a=r, b=h, autojunk=False)
    return round(sum(b.size for b in sm.get_matching_blocks()) / len(r), 2)
def win(l):
    ws = WD[l['id']]['words']; a, b = ws[0]['start'] - 0.25, ws[-1]['end'] + 0.25
    if b - a < 1.6: c = (a + b) / 2; a, b = c - 0.8, c + 0.8
    return max(0, a), min(len(y) / sr, b)
def job(l):
    a, b = win(l)
    _, res = stt.whisper(y[int(a * sr):int(b * sr)], sr, tag='hf-verify-line', offset=a)
    return l['id'], a, b, (res.get('text') or '').strip()
out = {}
with ThreadPoolExecutor(4) as ex:
    for lid, a, b, txt in ex.map(job, L):
        out[lid] = dict(win=[round(a, 3), round(b, 3)], whisper=txt)
for l in L:
    o = out[l['id']]; a, b = o['win']
    o['parakeet'] = asr_parakeet.transcribe(y16, a, b)[0].strip()
    o['match_whisper'] = score(l['words'], o['whisper']); o['match_parakeet'] = score(l['words'], o['parakeet'])
    o['match'] = max(o['match_whisper'], o['match_parakeet'])
    print(f"{l['id']:3d} {o['match']:.2f} | {' '.join(l['words'])} | W: {o['whisper'][:70]} | P: {o['parakeet'][:70]}", flush=True)
json.dump(out, open(os.path.join(W, 'audio/verify_lines.json'), 'w'), indent=1)
m = np.array([o['match'] for o in out.values()])
print(f'lines {len(m)}  match>=0.8: {(m >= 0.8).sum()}  0.5-0.8: {((m >= 0.5) & (m < 0.8)).sum()}  <0.5: {(m < 0.5).sum()}  mean {m.mean():.2f}')
