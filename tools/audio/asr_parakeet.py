"""Independent local ASR: NVIDIA parakeet-tdt-0.6b-v2 (int8 ONNX, sherpa-onnx 2.0; model from the k2-fsa/sherpa-onnx GitHub
release 'asr-models') on overlapping windows of a vocal stem. TDT token timestamps (80 ms encoder frames) -> words.
    python3 tools/audio/asr_parakeet.py VOCALS_WAV TAG [WIN=20] [HOP=10]   -> work/asr/parakeet_<TAG>.json"""
import json, os, sys
import numpy as np, soundfile as sf, librosa, sherpa_onnx
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = os.path.join(ROOT, 'work/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8/')
_rec = None
def rec():
    global _rec
    if _rec is None:
        _rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=M + 'encoder.int8.onnx', decoder=M + 'decoder.int8.onnx',
                    joiner=M + 'joiner.int8.onnx', tokens=M + 'tokens.txt', num_threads=2, model_type='nemo_transducer',
                    decoding_method='greedy_search')
    return _rec
def load16(path):
    y, sr = sf.read(path); y = y.mean(1) if y.ndim > 1 else y
    return librosa.resample(y, orig_sr=sr, target_sr=16000, res_type='soxr_hq').astype(np.float32)
def transcribe(y16, a, b):
    seg = y16[int(a*16000):int(b*16000)]; seg = seg/(np.abs(seg).max() + 1e-9)*0.9
    s = rec().create_stream(); s.accept_waveform(16000, seg); rec().decode_stream(s); r = s.result
    words = []
    for tok, ts in zip(r.tokens, r.timestamps):
        t = round(float(ts) + a, 3)
        if tok.startswith(' ') or not words:
            if tok.strip() == '': continue
            words.append(dict(w=tok.strip(), start=t, toks=[t]))
        else:
            words[-1]['w'] += tok; words[-1]['toks'].append(t)
    for w in words:
        w['end'] = round(w['toks'][-1] + 0.08, 3)
    return r.text, words
if __name__ == '__main__':
    voc, tag = sys.argv[1], sys.argv[2]
    WIN = float(sys.argv[3]) if len(sys.argv) > 3 else 20.0; HOP = float(sys.argv[4]) if len(sys.argv) > 4 else 10.0
    y = load16(voc); dur = len(y)/16000
    out = []
    for a in np.arange(0, max(dur - 4, 1), HOP):
        b = min(dur, a + WIN); text, words = transcribe(y, float(a), float(b))
        out.append(dict(start=float(a), end=float(b), text=text, words=words)); print(f'{a:6.1f}-{b:6.1f} {text}', flush=True)
    json.dump(out, open(os.path.join(ROOT, f'work/asr/parakeet_{tag}.json'), 'w'), indent=1)
