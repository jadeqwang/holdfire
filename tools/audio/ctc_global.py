"""Global CTC forced alignment of the whole SUNG script (tools/audio/sung.py) to a vocal stem, one Viterbi pass over the song
(NeMo conformer-CTC-large log-probs computed on 30 s windows, 10 s overlap, centre parts stitched; 40 ms frames).
A single global pass cannot put a line in the wrong chorus, and instrumental gaps are absorbed by blanks.
    python3 tools/audio/ctc_global.py VOCALS_WAV TAG     -> work/asr/ctc_<TAG>.json  [{id, words:[{w,start,end,score}]}]"""
import json, os, sys
import numpy as np, soundfile as sf, librosa
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ctc, sung
ROOT = ctc.ROOT
def song_logprobs(y16, win=30.0, hop=20.0):
    dur = len(y16) / 16000; nF = int(np.ceil(dur / ctc.FRAME)); out = np.zeros((nF, len(ctc.VOC)), np.float32); filled = np.zeros(nF, bool)
    a = 0.0
    while a < dur:
        b = min(dur, a + win); lp = ctc.logprobs(y16, a, b)
        f0 = int(round(a / ctc.FRAME)); n = min(len(lp), nF - f0)
        keep_from = 0 if a == 0 else int((win - hop) / 2 / ctc.FRAME)
        keep_to = n if b >= dur else n - int((win - hop) / 2 / ctc.FRAME)
        out[f0 + keep_from:f0 + keep_to] = lp[keep_from:keep_to]; filled[f0 + keep_from:f0 + keep_to] = True
        if b >= dur: break
        a += hop
    out[~filled] = np.log(np.eye(len(ctc.VOC))[ctc.BLANK] * 0.999 + 1e-6)
    return out
if __name__ == '__main__':
    voc, tag = sys.argv[1], sys.argv[2]
    y, sr = sf.read(voc); y = y.mean(1) if y.ndim > 1 else y
    y16 = librosa.resample(y, orig_sr=sr, target_sr=16000, res_type='soxr_hq').astype(np.float32)
    lp_path = os.path.join(ROOT, f'work/asr/ctc_lp_{tag}.npy')
    lp = np.load(lp_path) if os.path.exists(lp_path) else song_logprobs(y16); np.save(lp_path, lp)
    L = sung.build()
    toks, owner = [], []
    for li, l in enumerate(L):
        for wi, w in enumerate(l['words']):
            p = ctc.tokenize(w); toks += p; owner += [(li, wi)] * len(p)
    path, ext = ctc.viterbi(lp, np.array(toks))
    first, last, sc = {}, {}, {}
    for t, s in path:
        if s % 2 == 1:
            k = owner[(s - 1) // 2]; first.setdefault(k, t); last[k] = t; sc.setdefault(k, []).append(lp[t, ext[s]])
    res = []
    for li, l in enumerate(L):
        ws = []
        for wi, w in enumerate(l['words']):
            k = (li, wi)
            ws.append(dict(w=w, start=round(first[k] * ctc.FRAME, 3), end=round((last[k] + 1) * ctc.FRAME, 3),
                           score=round(float(np.exp(np.mean(sc[k]))), 3)))
        res.append(dict(id=l['id'], words=ws))
        print(f"{l['id']:3d} {ws[0]['start']:7.2f}-{ws[-1]['end']:7.2f} " + ' '.join(f"{x['w']}@{x['start']:.2f}" for x in ws), flush=True)
    json.dump(res, open(os.path.join(ROOT, f'work/asr/ctc_{tag}.json'), 'w'), indent=1)
