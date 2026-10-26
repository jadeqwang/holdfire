"""Speech-to-text helpers for the Hold Fire analysis: Workers AI Whisper (large-v3-turbo) on short windows of a stem.

    import stt; words, res = stt.whisper(y, sr, prompt=None)      # y mono float array; returns [{w,start,end}], raw result
    python3 tools/audio/stt.py WAV START END [--prompt="..."]      # print a window's transcription

Direct sync calls die after ~30 s in the cloud container, so callers send windows <= 30 s (mp3 64 kb/s mono 16 kHz,
peak-normalized). Every call is appended to media/genlog.jsonl (+ docs/spend_ledger.jsonl via cf.log when est_usd > 0).
Workers AI Whisper turbo list price: $0.00051 / audio minute. Tokens are handled by tools/gen/cfauth.py and never printed.
"""
import base64, json, os, subprocess, sys, tempfile, time
import numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools/gen'))
import cf  # noqa: E402
MODEL = "@cf/openai/whisper-large-v3-turbo"


def _mp3(y, sr):
    y = np.asarray(y, np.float32)
    if y.ndim > 1: y = y.mean(1)
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.89
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, 'a.wav'); m = os.path.join(d, 'a.mp3')
        sf.write(w, y, sr)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w, '-ac', '1', '-ar', '16000', '-b:a', '64k', m], check=True)
        return open(m, 'rb').read()


def whisper(y, sr, prompt=None, tag='hf-analysis', offset=0.0, retries=2):
    """Transcribe a window. Returns (words [{w,start,end}] with times + offset, raw result dict)."""
    dur = len(y) / sr
    inp = {"audio": base64.b64encode(_mp3(y, sr)).decode(), "language": "en", "task": "transcribe", "vad_filter": False}
    if prompt: inp["initial_prompt"] = prompt
    est = round(0.00051 * dur / 60, 6)
    t0 = time.time()
    try:
        res, meta = cf.run_model(MODEL, inp, timeout=45, retries=retries, verbose=False)
    except Exception as e:
        cf.log({"model": MODEL, "tag": tag, "prompt": (prompt or '')[:300], "input": {"audio_s": round(dur, 2), "offset": offset},
                "est_usd": est, "ok": False, "error": str(e)[:500], "secs": round(time.time() - t0, 1)})
        raise
    cf.log({"model": MODEL, "tag": tag, "prompt": (prompt or '')[:300], "input": {"audio_s": round(dur, 2), "offset": offset},
            "est_usd": est, "est_basis": f"{dur:.1f}s x $0.00051/min", "ok": True, "secs": round(time.time() - t0, 1),
            "request_id": meta.get("request_id")})
    words = []
    for s in res.get('segments') or []:
        for w in s.get('words') or []:
            words.append(dict(w=w['word'].strip(), start=round(w['start'] + offset, 3), end=round(w['end'] + offset, 3)))
    return words, res


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = dict(x[2:].split('=', 1) for x in sys.argv[1:] if x.startswith('--') and '=' in x)
    y, sr = sf.read(a[0]); s, e = float(a[1]), float(a[2])
    words, res = whisper(y[int(s * sr):int(e * sr)], sr, prompt=o.get('prompt'), offset=s)
    print(res.get('text'))
    print(' '.join(f"{w['w']}@{w['start']:.2f}" for w in words))


def catalog_stt(model, y, sr, prompt=None, tag='hf-verify', offset=0.0):
    """Unified-catalog STT (openai/gpt-4o-transcribe: text only; xai/grok-stt: text + word times). Returns (text, words)."""
    dur = len(y) / sr
    uri = "data:audio/mpeg;base64," + base64.b64encode(_mp3(y, sr)).decode()
    inp = {"file": uri, "language": "en"}
    if prompt and model.startswith('openai/'): inp["prompt"] = prompt
    c = cf.catalog(model) or {}
    rate = (c.get('pricing') or {}).get('Per audio minute', 0)
    est = round(rate * max(dur, 1) / 60, 6)
    cf.spend.check(est, f"{model} {tag}")
    t0 = time.time()
    try:
        res, meta = cf.run_model(model, inp, timeout=45, retries=1, verbose=False)
    except Exception as e:
        cf.log({"model": model, "tag": tag, "input": {"audio_s": round(dur, 2), "offset": offset}, "est_usd": est, "ok": False,
                "error": str(e)[:500], "secs": round(time.time() - t0, 1)})
        raise
    cf.log({"model": model, "tag": tag, "input": {"audio_s": round(dur, 2), "offset": offset}, "est_usd": est,
            "est_basis": f"{dur:.1f}s x ${rate}/min", "ok": True, "secs": round(time.time() - t0, 1), "request_id": meta.get("request_id")})
    if isinstance(res, dict) and 'result' in res and isinstance(res['result'], dict): res = res['result']
    words = [dict(w=w.get('text', w.get('word', '')).strip(), start=round(w['start'] + offset, 3), end=round(w['end'] + offset, 3))
             for w in (res.get('words') or [])] if isinstance(res, dict) else []
    return (res.get('text', '') if isinstance(res, dict) else str(res)), words
