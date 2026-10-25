#!/usr/bin/env python3
"""Async generation queue for video (and any long) jobs via the existing relay Worker.

Why a relay: video models take minutes; there is no run-status endpoint usable with our token
(GET /ai/runs/{id} -> 405) and background runs only report to a webhook. We therefore reuse the
user's existing Worker `rare-earth-v3-relay` (cron "* * * * *", bindings AI + KV JOBS). We never
deploy, modify or delete Workers or KV namespaces; we only write/read our own keys in its KV:

    client  --KV PUT-->  job:<minuteBucket>:<jobId>  = {"model", "input"}
    relay cron for exactly that minute: deletes job key, writes state:<jobId>, runs env.AI.run (no
    HTTP timeout), mirrors output files into media:<jobId>:<n>[:<chunk>] (20 MB chunks, TTL 21 d) and
    writes res:<jobId> = {state: done|error, result, media[], t0, t1}
    client  --KV GET-->  res: / media:

All our job ids start with "holdfire/" so they never collide with other projects' keys
(moongazing/, rewind/, rewind2/, mergemain/ are taken). The KV namespace id lives in work/gen_kv_ns.txt (gitignored).

CLI (run with ~/Documents/moongazing/.venv/bin/python tools/gen/gen.py ...):
    gen.py spec TAG MODEL --prompt "..." [--image IMG] [--last-frame IMG] [--ref-image IMG ...]
                [--audio SRC@START+DUR ...] [--set key=json ...]     # writes media/gen/specs/TAG.json
    gen.py submit SPEC.json [...] [--dry-run]     # validate + estimate (+ queue unless --dry-run)
    gen.py estimate SPEC.json [...]               # same as submit --dry-run
    gen.py status [ID ...]                        # refresh + table + running total
    gen.py collect [ID ...]                       # download finished media -> media/gen/<tag>_<id>.mp4
    gen.py wait ID [ID ...] [--timeout=1800]      # poll until done, then collect
    gen.py requeue ID                             # only for 'stale' jobs (cron minute missed)
    gen.py audio-ref SRC START DUR OUT.mp3        # exact audio window -> mp3 (for reference_audios)
    gen.py ref-image SRC OUT.jpg [--max=2048]     # re-encode a reference image (smaller job body)

Spec: {"model": ..., "tag": ..., "notes": ..., "input": {...}}. Any string "file:<path>" (repo-relative or
absolute) becomes a data: URI at submit time. For minimax/h3* you may write the simple keys
prompt / image / last_frame_image / reference_images / reference_audios: they are converted to the
model's `content` list. Missing required keys get sane defaults (see DEFAULTS).
"""
import base64
import fcntl
import io
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from contextlib import contextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cf  # noqa: E402
import cfauth  # noqa: E402
import spend  # noqa: E402

ROOT = cf.ROOT
API = cfauth.API
RELAY = "rare-earth-v3-relay"                     # existing Worker, cron "* * * * *", bindings AI + JOBS
NS = cfauth.kv_namespace()                        # its JOBS namespace (rare-earth-v3-jobs); local file, never committed
PREFIX = "holdfire/"
OUT = os.path.join(ROOT, "media", "gen")
SPECS = os.path.join(OUT, "specs")
REFS = os.path.join(OUT, "refs")
MANIFEST = os.path.join(OUT, "manifest.json")
FFMPEG = os.environ.get("FFMPEG", "/home/jade/Documents/1-music-shipped/moongazing/.venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2")  # static v7.0.2, no drawtext
if not os.path.exists(FFMPEG):   # cloud session / another machine: system ffmpeg
    import shutil; FFMPEG = shutil.which("ffmpeg") or FFMPEG
PER_BUCKET = int(os.environ.get("GEN_PER_MINUTE", "2"))   # jobs started per cron minute
LEAD_MIN = 2              # first bucket = now + 2 min (KV list is eventually consistent, ~60 s)
MAX_JOB_BYTES = 24 * 1024 * 1024

# Required-by-validator keys get these defaults (catalog schemas use additionalProperties:false).
DEFAULTS = {
    "bytedance/seedance-2.5": {"duration": 5, "resolution": "480p", "aspect_ratio": "16:9", "fps": 24,
                               "camera_fixed": False, "watermark": False, "output_format": "mp4",
                               "use_virtual_avatar": False, "generate_audio": False},
    "bytedance/seedance-2.0": {"duration": 5, "resolution": "480p", "aspect_ratio": "16:9", "fps": 24,
                               "camera_fixed": False, "watermark": False, "use_virtual_avatar": False,
                               "generate_audio": False},
    "minimax/h3": {"duration": 6, "resolution": "768P", "ratio": "16:9"},
    "minimax/h3-max": {"duration": 6, "resolution": "480P", "ratio": "16:9",
                       "extra": {"prompt_expansion_mode": "balanced"}},
    "minimax/hailuo-2.3": {"duration": 6, "resolution": "768P", "prompt_optimizer": True, "fast_pretreatment": False},
    "minimax/hailuo-2.3-fast": {"duration": 6, "resolution": "768P", "prompt_optimizer": True, "fast_pretreatment": False},
}
UNSUPPORTED = {
    "xai/grok-imagine-video": "ZDR account: needs output.upload_url (a presigned PUT) and the relay has none",
    "xai/grok-imagine-video-1.5-preview": "ZDR account: needs output.upload_url (a presigned PUT) and the relay has none",
}


# ----------------------------------------------------------------------------- http / kv
def _req(method, url, data=None, headers=None, timeout=60):
    req = urllib.request.Request(url, data=data, method=method, headers=cfauth.headers(headers or {}))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def _kv_url(key):
    return f"{API}/storage/kv/namespaces/{NS}/values/{urllib.parse.quote(key, safe='')}"


def kv_get(key, raw=False, tries=3):
    for a in range(tries):
        try:
            st, b = _req("GET", _kv_url(key), timeout=120 if raw else 30)
        except Exception:  # noqa: BLE001
            if a == tries - 1:
                raise
            time.sleep(3 * (a + 1)); continue
        if st == 404:
            return None
        if st == 200:
            return b if raw else json.loads(b.decode())
        if a == tries - 1:
            raise RuntimeError(f"kv get {key} -> {st}: {b[:300]!r}")
        time.sleep(3 * (a + 1))


def kv_put(key, body: bytes):
    st, b = _req("PUT", _kv_url(key), body, {"Content-Type": "application/octet-stream"}, timeout=120)
    if st != 200:
        raise RuntimeError(f"kv put {key} -> {st}: {b[:300]!r}")


def kv_delete(key):
    _req("DELETE", _kv_url(key))


def kv_keys(prefix):
    st, b = _req("GET", f"{API}/storage/kv/namespaces/{NS}/keys?prefix={urllib.parse.quote(prefix)}&limit=1000")
    return [k["name"] for k in json.loads(b)["result"]] if st == 200 else []


# ----------------------------------------------------------------------------- manifest (locked)
@contextmanager
def locked():
    os.makedirs(OUT, exist_ok=True)
    with open(MANIFEST + ".lock", "w") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        try:
            m = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
            m.setdefault("relay", {"worker": RELAY, "kv_namespace": NS, "prefix": PREFIX})
            m.setdefault("jobs", {})
            yield m
            m["total_est_usd"] = round(sum(j.get("est_usd") or 0 for j in m["jobs"].values()
                                           if j.get("state") not in ("rejected",)), 4)
            m["total_est_usd_done"] = round(sum(j.get("est_usd") or 0 for j in m["jobs"].values()
                                                if j.get("state") == "done"), 4)
            tmp = MANIFEST + ".tmp"
            with open(tmp, "w") as f:
                json.dump(m, f, indent=1)
            os.replace(tmp, MANIFEST)
        finally:
            fcntl.flock(lk, fcntl.LOCK_UN)


def read_manifest():
    with locked() as m:
        return json.loads(json.dumps(m))


# ----------------------------------------------------------------------------- reference helpers
def audio_ref(src, start, dur, out=None, bitrate="192k"):
    """Cut exactly [start, start+dur) seconds of src (wav/mp3/...) to an mp3 for reference_audios.
    Returns the output path; use "file:<path>" in a spec or audio_ref_data_uri() in Python.
    Seedance 2.5: <=10 clips, <=30 s total. Note mp3 adds ~25 ms encoder delay (LAME gapless tag)."""
    start, dur = float(start), float(dur)
    if out is None:
        os.makedirs(REFS, exist_ok=True)
        out = os.path.join(REFS, f"{os.path.splitext(os.path.basename(src))[0]}_{start:08.3f}_{dur:g}s.mp3")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    # -ss/-t before -i with re-encoding is sample-accurate in ffmpeg >= 2.1
    subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src,
                    "-vn", "-ac", "2", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", bitrate, out], check=True)
    got = probe(out).get("duration", 0)
    if abs(got - dur) > 0.06:
        print(f"[gen] warning: {out} is {got:.3f}s, wanted {dur:.3f}s", file=sys.stderr)
    return out


def audio_ref_data_uri(src, start, dur):
    """Exact window -> 'data:audio/mpeg;base64,...' string, ready for reference_audios."""
    return cf.to_data_uri(audio_ref(src, start, dur))


def ref_image(src, out=None, max_side=2048, quality=90):
    """Re-encode an image to RGB JPEG with long side <= max_side (keeps job bodies small).
    Checks Seedance's aspect-ratio rule (0.39..2.5). Returns the output path."""
    from PIL import Image
    im = Image.open(src).convert("RGB")
    ar = im.width / im.height
    if not 0.39 <= ar <= 2.5:
        print(f"[gen] warning: {src} aspect {ar:.2f} outside Seedance's 0.39..2.5", file=sys.stderr)
    im.thumbnail((max_side, max_side), Image.LANCZOS)
    if out is None:
        os.makedirs(REFS, exist_ok=True)
        out = os.path.join(REFS, os.path.splitext(os.path.basename(src))[0] + f"_{max_side}.jpg")
    im.save(out, "JPEG", quality=quality)
    return out


def _file(p):
    return p if isinstance(p, str) and p.startswith(("file:", "data:", "http")) else f"file:{p}"


def h3_content(inp):
    """minimax/h3*: convert simple keys to the `content` list the model wants."""
    inp = dict(inp)
    content = list(inp.pop("content", []))
    if inp.get("prompt"):
        content.insert(0, {"type": "text", "text": inp.pop("prompt")})
    inp.pop("prompt", None)
    if inp.get("image"):
        content.append({"type": "image_url", "image_url": {"url": inp.pop("image")}, "role": "first_frame"})
    if inp.get("last_frame_image"):
        content.append({"type": "image_url", "image_url": {"url": inp.pop("last_frame_image")}, "role": "last_frame"})
    for u in inp.pop("reference_images", []) or []:
        content.append({"type": "image_url", "image_url": {"url": u}, "role": "reference_image"})
    for u in inp.pop("reference_videos", []) or []:
        content.append({"type": "video_url", "video_url": {"url": u}, "role": "reference_video"})
    for u in inp.pop("reference_audios", []) or []:
        content.append({"type": "audio_url", "audio_url": {"url": u}, "role": "reference_audio"})
    inp["content"] = content
    return inp


def normalise(model, inp):
    inp = {**DEFAULTS.get(model, {}), **inp}
    if model.startswith("minimax/h3"):
        inp = h3_content(inp)
    return inp


# ----------------------------------------------------------------------------- probing (no ffprobe here)
def probe(path):
    import av
    with av.open(path) as c:
        info = {"duration": round((c.duration or 0) / 1e6, 3), "bytes": os.path.getsize(path), "streams": []}
        for s in c.streams:
            d = {"codec_type": s.type, "codec_name": s.codec_context.name}
            if s.type == "video":
                d.update(width=s.codec_context.width, height=s.codec_context.height,
                         fps=float(s.average_rate) if s.average_rate else None, frames=s.frames or None)
            elif s.type == "audio":
                d.update(sample_rate=s.codec_context.sample_rate, channels=s.codec_context.channels)
            info["streams"].append(d)
    if not any(s["codec_type"] in ("video", "audio") for s in info["streams"]):
        raise RuntimeError("no audio/video stream")
    return info


# ----------------------------------------------------------------------------- commands
def _pick_bucket(m):
    now = int(time.time() // 60) + LEAD_MIN
    used = {}
    for j in m["jobs"].values():
        if j.get("state") == "queued":
            used[j["bucket"]] = used.get(j["bucket"], 0) + 1
    for k in kv_keys("job:"):           # other projects' queued jobs share the relay
        try:
            b = int(k.split(":")[1])
        except (IndexError, ValueError):
            continue
        if not k.split(":", 2)[2].startswith(PREFIX):
            used[b] = used.get(b, 0) + 1
    b = now
    while used.get(b, 0) >= PER_BUCKET:
        b += 1
    return b


def prepare(spec_path):
    spec = json.load(open(spec_path))
    model, tag = spec["model"], spec.get("tag") or os.path.splitext(os.path.basename(spec_path))[0]
    tag = "".join(ch if ch.isalnum() or ch in "_.-" else "_" for ch in tag)
    if model in UNSUPPORTED:
        raise SystemExit(f"{model} not supported: {UNSUPPORTED[model]}")
    inp = normalise(model, spec["input"])
    raw_inp = cf.resolve_files(inp)
    if model.startswith("google/veo") and str(raw_inp.get("image_input", "")).startswith("data:"):
        # Veo wants RAW base64; a data: URI fails with "Invalid base64 encoded bytes" (tested 2026-10-14)
        raw_inp["image_input"] = raw_inp["image_input"].split(",", 1)[1]
    cf.validate(model, raw_inp)
    est, why = cf.estimate(model, inp)
    if spec.get("est_usd") is not None:
        est, why = float(spec["est_usd"]), "from spec"
    body = json.dumps({"model": model, "input": raw_inp}).encode()
    if len(body) > MAX_JOB_BYTES:
        raise SystemExit(f"job is {len(body)/2**20:.1f} MiB; KV value limit is 25 MiB. Shrink refs (gen.py ref-image).")
    return spec, model, tag, inp, est, why, body


def run_image(model, inp, out_path, tag, timeout=1800):
    """cf.generate() with GEN_IMAGES_VIA_RELAY=1: a sync image call sent through the relay queue instead (the relay's env.AI.run has no
    HTTP timeout; a cloud container's direct /ai/run call dies at ~30 s). Submit + result are logged as a relay job (counted once by
    spend.py); the file lands in media/gen/<tag>_<id>.<ext> and is copied to out_path (extension as in cf.save_media)."""
    os.makedirs(SPECS, exist_ok=True)
    tag = "".join(ch if ch.isalnum() or ch in "_.-" else "_" for ch in tag or os.path.basename(os.path.splitext(out_path)[0]))
    sp = os.path.join(SPECS, f"img_{tag}.json")
    with open(sp, "w") as f:
        json.dump({"model": model, "tag": tag, "notes": f"image via relay -> {os.path.relpath(os.path.abspath(out_path), ROOT)}",
                   "input": inp}, f, indent=1, ensure_ascii=False)
    jid = submit(sp)
    wait([jid], timeout=timeout, every=10)
    j = read_manifest()["jobs"][jid]
    if j["state"] != "done" or not j.get("files"):
        raise cf.CFError(f"relay image {jid}: {j['state']} {(j.get('error') or j.get('collect_errors') or '')!s:.500}")
    stem, ext0 = os.path.splitext(out_path)
    paths = []
    for i, f in enumerate(j["files"]):
        data = open(os.path.join(ROOT, f), "rb").read()
        ext = os.path.splitext(f)[1]
        if ext0 and (ext0.lower() == ext or {ext0.lower(), ext} <= {".jpg", ".jpeg"}):
            ext = ext0
        p = (stem if len(j["files"]) == 1 else f"{stem}_{i}") + ext
        cf._write(p, data)
        paths.append(p)
    return paths


def submit(spec_path, dry_run=False):
    spec, model, tag, inp, est, why, body = prepare(spec_path)
    if dry_run:
        print(f"{spec_path}: OK schema  {model}  est ${est} [{why}]  body {len(body)/1024:.0f} KB  (dry run, nothing queued)")
        return None
    spend.check(est, f"{model} {tag}")
    short = uuid.uuid4().hex[:10]
    jid = f"{PREFIX}{tag}-{short}"
    with locked() as m:
        bucket = _pick_bucket(m)
        kv_put(f"job:{bucket}:{jid}", body)
        m["jobs"][jid] = {"id": short, "job": jid, "tag": tag, "model": model, "notes": spec.get("notes", ""),
                          "spec_file": os.path.relpath(os.path.abspath(spec_path), ROOT),
                          "input": cf.summarise(inp), "est_usd": est, "est_basis": why,
                          "state": "queued", "bucket": bucket, "submitted": time.time(), "bytes": len(body)}
    p = cf.prompt_of(inp)
    cf.log({"model": model, "tag": tag, "job": jid, "via": "relay-queue", "prompt_sha": __import__("hashlib").sha256(p.encode()).hexdigest()[:12],
            "prompt": p[:300], "input": cf.summarise(inp), "est_usd": est, "est_basis": why, "ok": None, "event": "submit"})
    eta = bucket * 60 - time.time()
    print(f"{jid}  queued for cron minute {bucket} (starts in ~{eta:.0f}s)  est ${est} [{why}]", flush=True)
    return jid


def _find(m, ident):
    if ident in m["jobs"]:
        return ident
    hits = [k for k, j in m["jobs"].items() if j["id"] == ident or k.endswith(ident)]
    if len(hits) != 1:
        raise SystemExit(f"unknown/ambiguous job {ident}: {hits}")
    return hits[0]


def refresh(jid):
    rec = kv_get("res:" + jid)
    now = time.time()
    with locked() as m:
        j = m["jobs"][jid]
        if j["state"] in ("done", "error", "collected_error", "done_partial"):
            return rec
        if rec is not None:
            if rec.get("t0") and rec.get("t1"):
                j["gen_secs"] = round((rec["t1"] - rec["t0"]) / 1000, 1)
                j["started"] = rec["t0"] / 1000
            j["finished"] = (rec.get("t1") or now * 1000) / 1000
            j["latency_secs"] = round(j["finished"] - j["submitted"], 1)
            if rec.get("state") != "done":
                j["state"] = "error"
                j["error"] = (rec.get("error") or json.dumps(rec))[:1500]
            else:
                j["state"] = "ready"
            return rec
        st = kv_get("state:" + jid)
        if st:
            j["state"] = "running"
            j["started"] = st.get("t0", 0) / 1000
        elif now > j["bucket"] * 60 + 600:
            j["state"] = "stale"
    return None


def _urls(o):
    """All http(s) URLs anywhere in a (nested) result, in order, de-duplicated."""
    out = []
    def visit(v):
        if isinstance(v, str) and v.startswith(("http://", "https://")):
            out.append(v)
        elif isinstance(v, list):
            for x in v:
                visit(x)
        elif isinstance(v, dict):
            for x in v.values():
                visit(x)
    visit(o)
    return list(dict.fromkeys(out))


def collect_one(jid):
    rec = refresh(jid)
    j = read_manifest()["jobs"][jid]
    if j["state"] == "error" and not j.get("logged"):
        cf.log({"model": j["model"], "tag": j["tag"], "job": jid, "event": "result", "ok": False,
                "error": j.get("error", "")[:1000], "est_usd": 0, "est_basis": "errored (normally not billed)"})
        with locked() as m:
            m["jobs"][jid]["logged"] = True
    if j["state"] not in ("ready", "collected_error", "done_partial") or rec is None:
        return j["state"]
    media = rec.get("media") or []
    if not media or all(f.get("error") for f in media):
        # relay mirrored nothing (e.g. minimax/h3 returns the raw provider task: result.task.content.url)
        media = [{"url": u} for u in _urls(rec.get("result"))] or [{"data": d} for d in cf.media_items(rec.get("result"))] or media
    paths, probes, errs = [], [], []
    for i, f in enumerate(media):
        data = None
        if f.get("key"):
            n = f.get("chunks", 1)
            parts = [kv_get(f["key"] if n == 1 else f"{f['key']}:{c}", raw=True) for c in range(n)]
            if all(p is not None for p in parts):
                data = b"".join(parts)
        if data is None and f.get("data"):
            data, _ = cf.fetch_bytes(f["data"])
        if data is None and f.get("url"):
            try:
                data, _ = cf.fetch_bytes(f["url"])
            except Exception:  # noqa: BLE001
                data = None
        if data is None:
            errs.append(f"file {i}: {f.get('error') or 'not retrievable'}"); continue
        if f.get("bytes") and len(data) != f["bytes"]:
            errs.append(f"file {i}: size {len(data)} != {f['bytes']}"); continue
        p = os.path.join(OUT, f"{j['tag']}_{j['id']}{'' if len(media) == 1 else f'_{i}'}{cf.sniff_ext(data, f.get('type'))}")
        cf._write(p, data)
        try:
            probes.append(probe(p) if not p.endswith((".jpg", ".png", ".webp")) else {"bytes": len(data)})
        except Exception as e:  # noqa: BLE001
            errs.append(f"{p}: {e}"); continue
        paths.append(os.path.relpath(p, ROOT))
    with locked() as m:
        j = m["jobs"][jid]
        j["files"], j["probe"] = paths, probes
        if errs:
            j["collect_errors"] = errs
        j["state"] = "done" if paths and not errs else ("done_partial" if paths else "collected_error")
        j["collected"] = time.time()
        res = rec.get("result")
        if isinstance(res, dict) and res.get("usage"):
            j["usage"] = res["usage"]
        if probes and probes[0].get("duration") and j["input"].get("duration") in (-1, None) and " x " in j.get("est_basis", ""):
            rate = float(j["est_basis"].split(" x ")[1].split(" ")[0])
            j["est_usd"] = round(rate * probes[0]["duration"], 4)
            j["est_basis"] += f" -> refined on actual {probes[0]['duration']}s"
        state, jj = j["state"], dict(j)
    cf.log({"model": jj["model"], "tag": jj["tag"], "job": jid, "event": "result", "ok": state == "done",
            "out": paths, "est_usd": jj.get("est_usd"), "est_basis": jj.get("est_basis"),
            "gen_secs": jj.get("gen_secs"), "secs": jj.get("latency_secs"), "error": "; ".join(errs) or None})
    print(f"{jid}: {state} {paths} {errs or ''}  gen {jj.get('gen_secs')}s, submit->result {jj.get('latency_secs')}s", flush=True)
    return state


def _targets(ids):
    m = read_manifest()
    return [_find(m, i) for i in ids] if ids else [k for k, j in m["jobs"].items()
                                                   if j["state"] in ("queued", "running", "ready", "stale")]


def status(ids):
    targets = _targets(ids)
    for jid in targets:
        refresh(jid)
    m = read_manifest()
    for jid, j in m["jobs"].items():
        if ids and jid not in targets:
            continue
        extra = j.get("files") or (j.get("error") or "")[:160] or ""
        lat = f"{j['latency_secs']}s" if j.get("latency_secs") else f"{time.time() - j['submitted']:.0f}s ago"
        print(f"{j['state']:<15} {jid:<46} {j['model']:<26} ${j.get('est_usd')}  {lat}  {extra}")
    print(f"total est ${m.get('total_est_usd')}  (done ${m.get('total_est_usd_done')})")


def collect(ids):
    return {jid: collect_one(jid) for jid in _targets(ids)}


def wait(ids, timeout=1800, every=15):
    pending = _targets(ids)
    t0 = time.time()
    while pending and time.time() - t0 < timeout:
        for jid in list(pending):
            st = collect_one(jid)
            if st not in ("queued", "running", "ready"):
                pending.remove(jid)
                if st == "stale":
                    print(f"{jid}: STALE (cron minute missed) -> `gen.py requeue {jid}`", flush=True)
        if pending:
            print(f"  .. {len(pending)} pending, {time.time()-t0:.0f}s", file=sys.stderr, flush=True)
            time.sleep(every)
    if pending:
        raise SystemExit(f"timeout; still pending: {pending}")


def requeue(ident):
    with locked() as m:
        jid = _find(m, ident)
        j = m["jobs"][jid]
        if j["state"] not in ("stale", "queued"):
            raise SystemExit(f"{jid} is {j['state']}; only stale/queued jobs can be requeued")
        old = f"job:{j['bucket']}:{jid}"
        body = kv_get(old, raw=True)
        if body is None:
            raise SystemExit(f"{old} no longer in KV (the relay probably picked it up) - not requeuing")
        kv_delete(old)
        b = _pick_bucket(m)
        kv_put(f"job:{b}:{jid}", body)
        j.update(state="queued", bucket=b, requeued=time.time())
    print(f"{jid} requeued for minute {b}")


def make_spec(tag, model, argv):
    """gen.py spec TAG MODEL --prompt ... [--image P] [--last-frame P] [--ref-image P]... [--audio SRC@START+DUR]... [--set k=v]..."""
    inp, notes = {}, ""
    i = 0
    while i < len(argv):
        a, v = argv[i], (argv[i + 1] if i + 1 < len(argv) else None)
        if a == "--prompt":
            inp["prompt"] = v
        elif a == "--notes":
            notes = v
        elif a == "--image":
            inp["image"] = _file(ref_image(v))
        elif a == "--last-frame":
            inp["last_frame_image"] = _file(ref_image(v))
        elif a == "--ref-image":
            inp.setdefault("reference_images", []).append(_file(ref_image(v)))
        elif a == "--audio":
            src, rest = v.rsplit("@", 1)
            start, dur = rest.split("+")
            inp.setdefault("reference_audios", []).append(_file(os.path.relpath(audio_ref(src, start, dur), ROOT)))
        elif a == "--set":
            k, val = v.split("=", 1)
            try:
                inp[k] = json.loads(val)
            except json.JSONDecodeError:
                inp[k] = val
        else:
            raise SystemExit(f"unknown option {a}")
        i += 2
    for k in ("image", "last_frame_image"):
        if k in inp and inp[k].startswith("file:/"):
            inp[k] = "file:" + os.path.relpath(inp[k][5:], ROOT)
    if "reference_images" in inp:
        inp["reference_images"] = ["file:" + os.path.relpath(x[5:], ROOT) if x.startswith("file:/") else x
                                   for x in inp["reference_images"]]
    os.makedirs(SPECS, exist_ok=True)
    path = os.path.join(SPECS, f"{tag}.json")
    with open(path, "w") as f:
        json.dump({"model": model, "tag": tag, "notes": notes, "input": inp}, f, indent=1, ensure_ascii=False)
    print(os.path.relpath(path, ROOT))
    return path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    cmd = sys.argv[1]
    args = [a for a in sys.argv[2:] if not a.startswith("--")]
    opts = {a[2:].partition("=")[0]: a[2:].partition("=")[2] or True for a in sys.argv[2:] if a.startswith("--")}
    if cmd == "submit":
        for s in args:
            submit(s, dry_run="dry-run" in opts)
    elif cmd == "estimate":
        for s in args:
            submit(s, dry_run=True)
    elif cmd == "status":
        status(args)
    elif cmd == "collect":
        collect(args)
    elif cmd == "wait":
        wait(args, timeout=float(opts.get("timeout", 1800)))
    elif cmd == "requeue":
        requeue(args[0])
    elif cmd == "audio-ref":
        print(audio_ref(args[0], args[1], args[2], args[3] if len(args) > 3 else None))
    elif cmd == "ref-image":
        print(ref_image(args[0], args[1] if len(args) > 1 else None, max_side=int(opts.get("max", 2048))))
    elif cmd == "spec":
        make_spec(sys.argv[2], sys.argv[3], sys.argv[4:])
    else:
        print(__doc__); sys.exit(1)
