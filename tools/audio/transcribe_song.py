"""Independent whole-song ASR pass: Whisper turbo on overlapping 24 s windows (12 s hop) of a vocal stem, no lyric
prompt (pass 'noprompt') and with the canonical lyrics as initial prompt (pass 'prompt').
    python3 tools/audio/transcribe_song.py [VOCALS_WAV] [TAG]   -> work/asr/whisper_<TAG>.json"""
import json, os, sys
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stt
from concurrent.futures import ThreadPoolExecutor
ROOT = stt.ROOT
voc = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'work/stems/vocals.wav')
tag = sys.argv[2] if len(sys.argv) > 2 else 'main'
y, sr = sf.read(voc); y = y.mean(1) if y.ndim > 1 else y
dur = len(y) / sr
WIN, HOP = 24.0, 12.0
starts = np.arange(0, max(dur - 6, 1), HOP)
PROMPT = ("Song lyrics. One, one, two, three, five, eight. Out of the sea with salt in our lungs. Snowflake in the boundless night. "
          "Can't be sure that anyone is there, message in a bottle, a mantra, a prayer. Counting on you. Petrov. Arkhipov. Hold your fire.")
out = {}
def job(args):
    p, s = args
    e = min(dur, s + WIN)
    words, res = stt.whisper(y[int(s * sr):int(e * sr)], sr, prompt=PROMPT if p == 'prompt' else None, tag=f'asr-{tag}-{p}', offset=float(s))
    return p, float(s), float(e), words, res.get('text', '')
jobs = [(p, s) for p in ('noprompt', 'prompt') for s in starts]
with ThreadPoolExecutor(4) as ex:
    for p, s, e, words, text in ex.map(job, jobs):
        out.setdefault(p, []).append(dict(start=s, end=e, text=text, words=words))
        print(f'[{p}] {s:6.1f}-{e:6.1f} {text}', flush=True)
json.dump(out, open(os.path.join(ROOT, f'work/asr/whisper_{tag}.json'), 'w'), indent=1)
