"""CTC forced alignment of known text with NVIDIA NeMo stt_en_conformer_ctc_large (ONNX export from the k2-fsa/sherpa-onnx
GitHub release 'asr-models', 128 BPE pieces + blank, 40 ms output frames). Features exactly as the model's sherpa test.py
(kaldi-native-fbank, 80 mel bins, 16 kHz, per-feature normalisation). Viterbi over the standard CTC topology, numpy.
Independent of Whisper/parakeet: it never chooses words, it only places the given ones.

    import ctc; words = ctc.align(y16, a, b, ["out", "of", "the", "sea"])   # -> [{w, start, end, score}] seconds
"""
import os, numpy as np, onnxruntime as ort, kaldi_native_fbank as knf
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = os.path.join(ROOT, 'work/models/sherpa-onnx-nemo-ctc-en-conformer-large/')
FRAME = 0.04
_sess = None
VOC = {}
for line in open(M + 'tokens.txt', encoding='utf-8'):
    s, i = line.rstrip('\n').rsplit(' ', 1); VOC[s] = int(i)
BLANK = VOC['<blk>']
NUM = {'0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'}
def sess():
    global _sess
    if _sess is None:
        o = ort.SessionOptions(); o.intra_op_num_threads = 2
        _sess = ort.InferenceSession(M + 'model.onnx', o, providers=['CPUExecutionProvider'])
    return _sess
def feats(seg):
    opts = knf.FbankOptions(); opts.frame_opts.dither = 0; opts.frame_opts.snip_edges = False
    opts.frame_opts.samp_freq = 16000; opts.mel_opts.num_bins = 80
    fb = knf.OnlineFbank(opts); fb.accept_waveform(16000, (seg * 32768).tolist()); fb.input_finished()
    f = np.stack([fb.get_frame(i) for i in range(fb.num_frames_ready)])
    return (f - f.mean(0, keepdims=True)) / (f.std(0, keepdims=True) + 1e-5)
def logprobs(y16, a, b, gain=True):
    seg = y16[int(a * 16000):int(b * 16000)].astype(np.float32)
    if gain: seg = seg / (np.abs(seg).max() + 1e-9) * 0.5
    f = feats(seg)[None].transpose(0, 2, 1).astype(np.float32)
    s = sess(); lp = s.run(None, {s.get_inputs()[0].name: f, s.get_inputs()[1].name: np.array([f.shape[2]], np.int64)})[0][0]
    return lp
def tokenize(word):
    w = word.lower().replace('-', ' ').replace('’', "'")
    pieces = []
    for k, part in enumerate(w.split()):
        part = ''.join(c for c in part if c.isalpha() or c == "'")
        i = 0; first = True
        while i < len(part):
            best = None
            for j in range(len(part), i, -1):
                cand = ('▁' if first else '') + part[i:j]
                if cand in VOC: best = (j, VOC[cand]); break
            if best is None:
                if first: pieces.append(VOC['▁']); first = False; continue
                i += 1; continue
            pieces.append(best[1]); i = best[0]; first = False
    return pieces
def viterbi(lp, toks):
    """Standard CTC forced alignment. Returns list of (token_index, frame) for each frame on the best path."""
    T = lp.shape[0]; L = len(toks); S = 2 * L + 1
    ext = np.full(S, BLANK); ext[1::2] = toks
    NEG = -1e30
    dp = np.full((T, S), NEG); bp = np.zeros((T, S), np.int8)
    dp[0, 0] = lp[0, BLANK]; dp[0, 1] = lp[0, ext[1]]
    skip_ok = np.zeros(S, bool)
    for s in range(2, S):
        skip_ok[s] = ext[s] != BLANK and ext[s] != ext[s - 2]
    for t in range(1, T):
        prev = dp[t - 1]
        c0 = prev; c1 = np.r_[NEG, prev[:-1]]; c2 = np.where(skip_ok, np.r_[NEG, NEG, prev[:-2]], NEG)
        st = np.stack([c0, c1, c2]); k = st.argmax(0)
        dp[t] = st[k, np.arange(S)] + lp[t, ext]; bp[t] = k
    s = S - 1 if dp[-1, S - 1] >= dp[-1, S - 2] else S - 2
    path = []
    for t in range(T - 1, -1, -1):
        path.append((t, s)); s -= int(bp[t, s])
    return path[::-1], ext
def align(y16, a, b, words, gain=True):
    lp = logprobs(y16, a, b, gain)
    toks, owner = [], []
    for wi, w in enumerate(words):
        p = tokenize(w)
        toks += p; owner += [wi] * len(p)
    path, ext = viterbi(lp, np.array(toks))
    first, last, sc = {}, {}, {}
    for t, s in path:
        if s % 2 == 1:
            ti = (s - 1) // 2; wi = owner[ti]
            first.setdefault(wi, t); last[wi] = t; sc.setdefault(wi, []).append(lp[t, ext[s]])
    out = []
    for wi, w in enumerate(words):
        if wi not in first: out.append(dict(w=w, start=None, end=None, score=None)); continue
        out.append(dict(w=w, start=round(a + first[wi] * FRAME, 3), end=round(a + (last[wi] + 1) * FRAME, 3),
                        score=round(float(np.exp(np.mean(sc[wi]))), 3)))
    return out
