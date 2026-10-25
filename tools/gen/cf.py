#!/usr/bin/env python3
"""Synchronous Cloudflare AI client (unified catalog + Workers AI) for Hold Fire. Adapted from moongazing.

Auth: the wrangler OAuth token, read at call time by tools/cfauth.py (auto-refreshed via
`npx -y wrangler whoami`). Tokens are never printed or written anywhere.

Endpoints
  * unified catalog (google/*, openai/*, xai/*, bytedance/*, elevenlabs/*, ...):
        POST /accounts/{acc}/ai/run   {"model": ..., "input": {...}}
        -> {"result": {"state": "Completed", "result": {"image"|"video"|"audio"|...: url|data-uri}}}
  * Workers AI (@cf/...): POST /accounts/{acc}/ai/run/@cf/...  body = input

Every call (ok or failed) is appended to media/genlog.jsonl:
  {ts, model, tag, prompt_sha, prompt (first 300 chars), input (blobs summarised), est_usd, est_basis,
   out[], secs, ok, error, usage, request_id}

Video models are long-running: use tools/gen/gen.py (async relay queue). GEN_IMAGES_VIA_RELAY=1 sends generate()'s image calls
through that queue too (cloud sessions, whose direct calls time out at ~30 s); the default stays the direct call. cf.py refuses them unless
--allow-video / allow_video=True (a direct sync call can hang for minutes and is billed anyway).
Every call is checked against the project spend cap first (tools/gen/spend.py, $400 default).

Python:
    import sys; sys.path.insert(0, "tools/gen"); import cf
    paths = cf.generate("google/nano-banana-pro", {"prompt": "...", "aspect_ratio": "16:9", "image_size": "2K"},
                        "media/tests/x_nbp.jpg", tag="test")
    # any string "file:<path>" in the input becomes a data: URI (path relative to the repo root)

CLI:
    ~/Documents/moongazing/.venv/bin/python tools/gen/cf.py MODEL OUT_PATH '<json input>' [--tag=x] [--dry-run] [--allow-video]
    ~/Documents/moongazing/.venv/bin/python tools/gen/cf.py MODEL OUT_PATH --prompt "..." [--set key=value ...]
"""
import base64
import hashlib
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfauth  # noqa: E402
import spend  # noqa: E402

ROOT = cfauth.ROOT
CATALOG = os.path.join(ROOT, "docs", "gen_catalog")
LOG = os.path.join(ROOT, "media", "genlog.jsonl")
API = cfauth.API

VIDEO_TASKS = ("Text-to-Video", "Image-to-Video", "video-to-video")


class CFError(RuntimeError):
    pass


# ----------------------------------------------------------------------------- catalog / validation / cost
def catalog(model):
    p = os.path.join(CATALOG, model.replace("/", "-") + ".json")
    return json.load(open(p)) if os.path.exists(p) else None


def is_video(model):
    c = catalog(model)
    return bool(c and c.get("task") in VIDEO_TASKS)


def validate(model, inp):
    """Validate an input against the catalog's JSON schema. Raises CFError listing all violations."""
    c = catalog(model)
    sch = (c or {}).get("schema", {}).get("input")
    if not sch:
        return False
    import jsonschema
    errs = sorted(jsonschema.Draft202012Validator(sch).iter_errors(inp), key=lambda e: list(e.absolute_path))
    if errs:
        raise CFError(f"{model} input fails catalog schema: " + "; ".join(
            f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message[:200]}" for e in errs[:8]))
    return True


# Typical output-token counts for token-priced image models (OpenAI / Google published tables).
_GPT_IMG_TOKENS = {  # (quality, square?) -> output image tokens
    ("low", True): 272, ("low", False): 408, ("medium", True): 1056, ("medium", False): 1584,
    ("high", True): 4160, ("high", False): 6240,
}
_NB_TOKENS = {"1K": 1120, "2K": 1120, "4K": 2000}


def estimate(model, inp):
    """Return (usd or None, basis). List-price estimate from the catalog card."""
    c = catalog(model)
    if not c or not isinstance(c.get("pricing"), dict):
        return None, "no catalog pricing"
    p = c["pricing"]
    n = inp.get("n") or inp.get("num_images") or 1
    if "Per image" in p:
        img = inp.get("image")
        n_in = len(inp.get("images") or []) + (len(img) if isinstance(img, list) else (1 if img else 0))
        usd = p["Per image"] * n + p.get("Per input image", 0) * n_in
        return round(usd, 4), f"{n} x {p['Per image']}/image" + (f" + {n_in} input imgs" if n_in else "")
    if "Output tokens (per 1M)" in p and model.startswith("google/nano-banana"):
        toks = _NB_TOKENS.get(inp.get("image_size", "1K"), 1120)
        return round(toks * p["Output tokens (per 1M)"] / 1e6 * n, 4), f"~{toks} out tokens x {p['Output tokens (per 1M)']}/1M (approx)"
    if "Output image tokens (per 1M)" in p:
        q = inp.get("quality", "auto")
        q = {"auto": "high", "xhigh": "high", "max": "high"}.get(q, q)
        sq = inp.get("size", "auto") in ("1024x1024", "auto")
        toks = _GPT_IMG_TOKENS.get((q, sq), 6240)
        mult = {"xhigh": 1.5, "max": 2.0}.get(inp.get("quality"), 1.0)
        n_img = len(inp.get("images") or [])
        in_usd = n_img * 1600 * p.get("Input image tokens (per 1M)", 0) / 1e6   # ~1600 tokens per input image (approx)
        return round(toks * mult * p["Output image tokens (per 1M)"] / 1e6 * n + in_usd, 4), \
            f"~{int(toks*mult)} out image tokens x {p['Output image tokens (per 1M)']}/1M" + \
            (f" + {n_img} input imgs (~1600 tok each)" if n_img else "") + " (approx)"
    if "First output megapixel" in p:
        return p["First output megapixel"], "1 MP (approx)"
    if "Per character" in p:
        chars = len(inp.get("text", ""))
        return round(chars * p["Per character"], 5), f"{chars} chars x {p['Per character']}"
    if "Per track" in p:
        return p["Per track"], "per track"
    # ---- per-second (video / music)
    dur = inp.get("duration", inp.get("seconds"))
    if inp.get("music_length_ms"):
        dur = inp["music_length_ms"] / 1000
    if dur in (None, -1, "-1"):
        dur = 15 if dur in (-1, "-1") else 5
        auto = True
    else:
        auto = False
    dur = float(str(dur).rstrip("s"))
    res = str(inp.get("resolution") or "").lower()
    if not res and isinstance(inp.get("size"), str):
        res = inp["size"].lower()
    has_vid = bool(inp.get("reference_videos") or inp.get("video") or inp.get("reference_video")
                   or any(isinstance(x, dict) and x.get("type") == "video_url" for x in inp.get("content", [])))
    audio = bool(inp.get("generate_audio"))
    cand = []
    if res:
        fixed = f"{dur:g}s @{res}" + (" w/ audio" if audio else "")
        if fixed in p:
            return p[fixed], f"fixed price '{fixed}'"
        cand.append(f"@{res} {'video' if has_vid else 'non-video'} input (per second)")
        if audio:
            cand.append(f"@{res} w/ audio (per second)")
        cand.append(f"@{res} (per second)")
    cand.append("Default (per second)")
    for k in cand:
        if k in p:
            return round(p[k] * dur, 4), f"{dur:g}s x {p[k]} ({k})" + (" [duration auto -> assumed]" if auto else "")
    return None, f"unrecognised pricing keys {list(p)}"


# ----------------------------------------------------------------------------- inputs
def to_data_uri(path):
    mt = mimetypes.guess_type(path)[0] or "application/octet-stream"
    if path.endswith(".mp3"):
        mt = "audio/mpeg"
    elif path.endswith(".wav"):
        mt = "audio/wav"
    with open(path, "rb") as f:
        return f"data:{mt};base64,{base64.b64encode(f.read()).decode()}"


def resolve_files(v):
    """Replace every "file:<path>" string (repo-relative or absolute) by a data: URI."""
    if isinstance(v, str) and v.startswith("file:"):
        p = v[5:]
        return to_data_uri(p if os.path.isabs(p) else os.path.join(ROOT, p))
    if isinstance(v, list):
        return [resolve_files(x) for x in v]
    if isinstance(v, dict):
        return {k: resolve_files(x) for k, x in v.items()}
    return v


def summarise(v):
    if isinstance(v, str) and v.startswith("data:"):
        return f"<data {v[5:].split(';')[0]} {len(v)//1024}KB>"
    if isinstance(v, list):
        return [summarise(x) for x in v]
    if isinstance(v, dict):
        return {k: summarise(x) for k, x in v.items()}
    return v


def prompt_of(inp):
    if isinstance(inp.get("prompt"), str):
        return inp["prompt"]
    if isinstance(inp.get("text"), str):
        return inp["text"]
    for c in inp.get("content", []) if isinstance(inp.get("content"), list) else []:
        if isinstance(c, dict) and c.get("type") == "text":
            return c.get("text", "")
    return ""


LEDGER = os.path.join(ROOT, "docs", "spend_ledger.jsonl")   # committed, union-merged: the cap holds across the box and cloud sessions
LEDGER_KEYS = ("ts", "model", "tag", "job", "event", "ok", "est_usd", "where")


def log(entry):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), **entry}
    with open(LOG, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    if entry.get("job") or entry.get("est_usd"):              # billing-relevant: a compact copy (no prompts/inputs) for spend.py
        row = {k: entry[k] for k in LEDGER_KEYS if k in entry}
        row["where"] = "cloud" if (os.environ.get("CLAUDE_CODE_REMOTE") or os.environ.get("CLAUDE_CODE_REMOTE_SESSION_ID")) else "box"
        with open(LEDGER, "a") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


# ----------------------------------------------------------------------------- http
def _post(url, body, timeout):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers=cfauth.headers({"Content-Type": "application/json"}))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.headers.get("content-type", ""), r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        raise CFError(f"HTTP {e.code}: {e.read()[:2000].decode('utf-8', 'replace')}") from None


def run_model(model, payload, timeout=600, retries=2, verbose=True):
    """Run a model synchronously. Returns (result dict | bytes, meta dict)."""
    if model.startswith(("@cf/", "@hf/")):
        url, body = f"{API}/ai/run/{model}", payload
    else:
        url, body = f"{API}/ai/run", {"model": model, "input": payload}
    last = None
    for attempt in range(retries + 1):
        t0 = time.time()
        try:
            ctype, raw, hdrs = _post(url, body, timeout)
        except CFError as e:
            msg = str(e)
            if "HTTP 400" in msg or "HTTP 404" in msg or "7003" in msg or "User Input Error" in msg or attempt == retries:
                raise
            last = e
            time.sleep(5 * (attempt + 1))
            continue
        except Exception as e:  # noqa: BLE001  timeouts / resets
            if attempt == retries:
                raise CFError(f"{type(e).__name__}: {e}") from None
            last = e
            time.sleep(5 * (attempt + 1))
            continue
        meta = {"secs": round(time.time() - t0, 1),
                "request_id": hdrs.get("cf-aig-request-id") or hdrs.get("Cf-Aig-Request-Id") or hdrs.get("cf-ray", "")}
        if verbose:
            print(f"[cf] {model} {meta['secs']}s", file=sys.stderr)
        if "json" not in ctype:
            return raw, meta
        d = json.loads(raw)
        if not d.get("success", True):
            raise CFError(json.dumps(d.get("errors"))[:2000])
        res = d.get("result", d)
        if isinstance(res, dict) and "state" in res and "result" in res:
            if str(res["state"]).lower() not in ("completed", "succeeded"):
                raise CFError(f"state={res['state']}: {json.dumps(res)[:1000]}")
            meta["usage"] = res.get("usage")
            res = res["result"]
        return res, meta
    raise CFError(str(last))


# ----------------------------------------------------------------------------- outputs
_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4",
        "video/quicktime": ".mov", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
        "audio/ogg": ".ogg", "image/svg+xml": ".svg"}


def sniff_ext(data, ctype=""):
    h = data[:16]
    if h[4:8] == b"ftyp":
        return ".mov" if h[8:10] == b"qt" else ".mp4"
    if h[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if h[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if h[:4] == b"RIFF":
        return ".webp" if data[8:12] == b"WEBP" else ".wav"
    if h[:3] == b"ID3" or h[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return ".mp3"
    if data.lstrip()[:5] in (b"<svg ", b"<?xml"):
        return ".svg"
    return _EXT.get((ctype or "").split(";")[0]) or ".bin"


def fetch_bytes(src, timeout=600):
    """URL / data: URI / bare base64 -> (bytes, content-type)."""
    if src.startswith("data:"):
        head, b64 = src.split(",", 1)
        return base64.b64decode(b64), head[5:].split(";")[0]
    if src.startswith(("http://", "https://")):
        with urllib.request.urlopen(urllib.request.Request(src), timeout=timeout) as r:
            return r.read(), r.headers.get("content-type", "")
    return base64.b64decode(src), ""


def _write(path, data):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path + ".part", "wb") as f:
        f.write(data)
    os.replace(path + ".part", path)


def media_items(result):
    """Yield media strings (url/data/b64) from a model result, in order."""
    if isinstance(result, str):
        yield result
        return
    if isinstance(result, list):
        for x in result:
            yield from media_items(x)
        return
    if not isinstance(result, dict):
        return
    for k in ("image", "images", "video", "videos", "audio", "audios", "data", "output", "url", "b64_json", "svg"):
        v = result.get(k)
        if isinstance(v, str) and (v.startswith(("http", "data:")) or len(v) > 200):
            yield v
        elif isinstance(v, (list, dict)):
            yield from media_items(v)


def save_media(result, out_path):
    """Save all media in result. out_path may have an extension (kept if it matches the content's
    kind, otherwise replaced by the sniffed one) or none. Multiple outputs -> stem_0, stem_1, ..."""
    if isinstance(result, (bytes, bytearray)):
        items = [bytes(result)]
    else:
        items = list(dict.fromkeys(media_items(result)))
    stem, ext0 = os.path.splitext(out_path)
    paths = []
    for i, it in enumerate(items):
        data, ctype = (it, "") if isinstance(it, bytes) else fetch_bytes(it)
        ext = sniff_ext(data, ctype)
        if ext0 and (ext0.lower() == ext or {ext0.lower(), ext} <= {".jpg", ".jpeg"}):
            ext = ext0
        p = (stem if len(items) == 1 else f"{stem}_{i}") + ext
        _write(p, data)
        paths.append(p)
    return paths


# ----------------------------------------------------------------------------- main entry
def generate(model, inp, out_path, tag="", dry_run=False, allow_video=False, timeout=600, check=True):
    """Validate, estimate, run, save, log. Returns list of written paths (or [] on dry-run)."""
    if is_video(model) and not allow_video and not dry_run:
        raise CFError(f"{model} is a video model: use tools/gen/gen.py (async relay) or pass allow_video=True")
    raw_inp = resolve_files(inp)
    if check:
        validate(model, raw_inp)
    est, why = estimate(model, inp)
    p = prompt_of(inp)
    entry = {"model": model, "tag": tag, "prompt_sha": hashlib.sha256(p.encode()).hexdigest()[:12],
             "prompt": p[:300], "input": summarise(inp), "est_usd": est, "est_basis": why}
    if dry_run:
        print(json.dumps({"dry_run": True, "model": model, "est_usd": est, "est_basis": why, "valid": True}))
        return []
    if os.environ.get("GEN_IMAGES_VIA_RELAY") == "1":   # cloud: route through the relay queue (gen.py logs + checks the cap itself)
        import gen
        paths = gen.run_image(model, inp, out_path, tag)
        print(f"[cf] {model} via relay -> {', '.join(os.path.relpath(x, ROOT) for x in paths)}  (${est} est)", file=sys.stderr)
        return paths
    spend.check(est, f"{model} {tag}")
    t0 = time.time()
    try:
        res, meta = run_model(model, raw_inp, timeout=timeout)
        paths = save_media(res, out_path)
        if not paths:
            raise CFError(f"no media in result: {json.dumps(summarise(res))[:500]}")
    except Exception as e:
        log({**entry, "ok": False, "error": str(e)[:1000], "secs": round(time.time() - t0, 1)})
        raise
    extra = {k: v for k, v in res.items() if k not in ("image", "images", "video", "audio", "data")} \
        if isinstance(res, dict) else {}
    log({**entry, "ok": True, "out": [os.path.relpath(x, ROOT) for x in paths], "secs": round(time.time() - t0, 1),
         "gen_secs": meta.get("secs"), "usage": meta.get("usage") or extra.get("usage"), "request_id": meta.get("request_id")})
    print(f"[cf] {model} -> {', '.join(os.path.relpath(x, ROOT) for x in paths)}  (${est} est, {time.time()-t0:.1f}s)",
          file=sys.stderr)
    return paths


def _cli(argv):
    args = [a for a in argv if not a.startswith("--")]
    opts, sets, prompt = {}, {}, None
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--prompt":
            prompt = argv[i + 1]; args.remove(prompt); i += 2; continue
        if a == "--set":
            k, v = argv[i + 1].split("=", 1); args.remove(argv[i + 1])
            try:
                sets[k] = json.loads(v)
            except json.JSONDecodeError:
                sets[k] = v
            i += 2; continue
        if a.startswith("--"):
            k, _, v = a[2:].partition("=")
            opts[k] = v or True
        i += 1
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    model, out = args[0], args[1]
    inp = json.loads(args[2]) if len(args) > 2 else {}
    if prompt is not None:
        inp["prompt"] = prompt
    inp.update(sets)
    paths = generate(model, inp, out, tag=opts.get("tag", ""), dry_run="dry-run" in opts,
                     allow_video="allow-video" in opts)
    print(json.dumps(paths))


if __name__ == "__main__":
    _cli(sys.argv[1:])
