#!/usr/bin/env python3
"""Round-based video generation on top of tools/gen/gen.py (relay queue), with the project hard spend cap.
Adapted from moongazing/tools/vgen.py; the shot registry now lives in tools/gen/shots.py.

Every take lives in media/gen/<SHOT>/:
    take_N.spec.json   the exact gen.py spec submitted
    take_N.json        sidecar: job id, model, resolution, est cost, state, probe, notes, verdict
    take_N.mp4         the collected clip (h3's AAC track stripped; raw file stays in media/gen/)
    take_N_sheet.jpg   6-frame contact sheet
Spend log: media/gen/spend.jsonl (one line per submit / error-refund). The cap is the PROJECT cap from
tools/gen/spend.py (REWIND_CAP / VGEN_CAP env, default $400), counted across images and video.

    PY=~/Documents/moongazing/.venv/bin/python
    $PY tools/gen/vgen.py submit SHOT [SHOT ...] [--takes=N] [--res=480p|720p] [--dry-run] [--note=...] [--prompt=...]
    $PY tools/gen/vgen.py collect [SHOT ...]       # collect finished jobs, link take_N.mp4, make sheets
    $PY tools/gen/vgen.py wait [SHOT ...]          # collect until nothing is pending
    $PY tools/gen/vgen.py sheet OUT.jpg [SHOT/take_N ...]   # overview sheet (default: every done take)
    $PY tools/gen/vgen.py spend

Shot entries (tools/gen/shots.py): SHOTS["NAME"] = dict(model=..., image="media/....jpg" (first frame, repo-relative),
duration=5, prompt="...", [camera_fixed=False], [aspect="16:9"], [avatar=False], [refs=[...]], [audio="media/...mp3"]).
"""
import glob
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen  # noqa: E402
import spend  # noqa: E402
from shots import SHOTS  # noqa: E402

ROOT = gen.ROOT
GEN = os.path.join(ROOT, "media", "gen")
SPEND = os.path.join(GEN, "spend.jsonl")
CAP_USD = spend.CAP_USD
FFMPEG = gen.FFMPEG


def shot_dir(shot):
    d = os.path.join(GEN, shot)
    os.makedirs(d, exist_ok=True)
    return d


def takes(shot):
    out = []
    for p in glob.glob(os.path.join(shot_dir(shot), "take_*.json")):
        if p.endswith(".spec.json") or p.endswith(".sync.json") or p.endswith(".mouth.json"):
            continue
        try:
            n = int(os.path.basename(p)[5:-5])
        except ValueError:
            continue
        out.append((n, p))
    return sorted(out)


def next_take(shot):
    t = takes(shot)
    used = {n for n, _ in t} | {int(os.path.basename(p)[5:].split(".")[0]) for p in
                                 glob.glob(os.path.join(shot_dir(shot), "take_*.spec.json"))}
    return max(used) + 1 if used else 1


def spend_total():
    """Project-wide running total (images + video), see tools/gen/spend.py."""
    return spend.total()


def log_spend(rec):
    os.makedirs(GEN, exist_ok=True)
    with open(SPEND, "a") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def build_spec(shot, res, note="", over=None):
    s = {**SHOTS[shot], **(over or {})}
    model = s["model"]
    inp = {"prompt": s["prompt"], "image": "file:" + os.path.relpath(gen.ref_image(os.path.join(ROOT, s["image"])), ROOT),
           "duration": s["duration"]}
    if model == "bytedance/seedance-2.0-mini":
        inp.update(resolution=res, aspect_ratio=s.get("aspect", "16:9"), generate_audio=False, fps=24,
                   camera_fixed=True, watermark=False, use_virtual_avatar=bool(s.get("avatar")))
        if s.get("audio"):
            inp["reference_audio"] = "file:" + s["audio"]
    elif model in ("bytedance/seedance-2.0", "bytedance/seedance-2.0-fast"):
        inp.update(resolution=res, aspect_ratio=s.get("aspect", "16:9"), generate_audio=False, fps=24,
                   camera_fixed=bool(s.get("camera_fixed", True)), watermark=False, use_virtual_avatar=bool(s.get("avatar")))
    elif model.startswith("bytedance/seedance"):
        # "adaptive" gave 21:9 / 4:3 / 9:16 outputs in round 1 -> 16:9 explicitly (override with aspect=)
        inp.update(resolution=res, aspect_ratio=s.get("aspect", "16:9"), generate_audio=False,
                   use_virtual_avatar=bool(s.get("avatar")), camera_fixed=bool(s.get("camera_fixed", False)))
        if s.get("refs"):
            inp["reference_images"] = ["file:" + os.path.relpath(gen.ref_image(os.path.join(ROOT, r) if not r.startswith("/") else r), ROOT)
                                       for r in s["refs"]]
        if s.get("audio"):
            inp["reference_audios"] = ["file:" + s["audio"]]
    else:  # minimax/h3*
        inp.update(resolution="768P" if res in ("480p", "768P") else "2K", ratio=s.get("aspect", "adaptive"))
    return {"model": model, "tag": shot.replace(".", "_"), "notes": f"{shot} {res} {note}".strip(), "input": inp}


def submit(shot, res="480p", n=1, dry=False, note="", over=None):
    jobs = []
    over = over or {}
    for _ in range(n):
        spec = build_spec(shot, res, note, over)
        k = next_take(shot)
        sp = os.path.join(shot_dir(shot), f"take_{k}.spec.json")
        json.dump(spec, open(sp, "w"), indent=1, ensure_ascii=False)
        _, model, tag, inp, est, why, body = gen.prepare(sp)
        tot = spend_total()
        if tot + est > CAP_USD:
            os.remove(sp)
            raise SystemExit(f"CAP: {shot} take {k} est ${est} would bring project spend to ${tot + est:.2f} > ${CAP_USD}")
        if dry:
            print(f"{shot} take_{k}: {model} {res} {inp.get('duration')}s est ${est} [{why}] body {len(body)/1024:.0f} KB (dry)")
            os.remove(sp)
            continue
        jid = gen.submit(sp)
        side = {"shot": shot, "take": k, "job": jid, "model": model, "res": res if model.startswith("bytedance") else inp.get("resolution"),
                "duration": inp.get("duration"), "est_usd": est, "est_basis": why, "state": "queued", "submitted": time.time(),
                "spec": os.path.relpath(sp, ROOT), "notes": note, "prompt": over.get("prompt", SHOTS[shot]["prompt"]),
                "first_frame": SHOTS[shot]["image"], "reference_images": SHOTS[shot].get("refs", []),
                "reference_audio": over.get("audio", SHOTS[shot].get("audio"))}
        json.dump(side, open(os.path.join(shot_dir(shot), f"take_{k}.json"), "w"), indent=1, ensure_ascii=False)
        log_spend({"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "event": "submit", "shot": shot, "take": k,
                   "job": jid, "model": model, "res": side["res"], "dur_s": inp.get("duration"), "est_usd": est,
                   "basis": why, "cum_usd": round(tot + est, 4)})
        jobs.append(jid)
    return jobs


def contact_sheet(mp4, out, n=6, label=""):
    import av
    from PIL import Image, ImageDraw
    frames = []
    with av.open(mp4) as c:
        st = c.streams.video[0]
        allf = [f.to_image() for f in c.decode(st)]
    idx = [round(i * (len(allf) - 1) / (n - 1)) for i in range(n)]
    W = 480
    tiles = []
    for i in idx:
        im = allf[i].convert("RGB")
        im = im.resize((W, round(W * im.height / im.width)))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 120, 14), fill=(0, 0, 0))
        d.text((3, 2), f"{i / 24:.2f}s f{i}", fill=(255, 255, 0))
        tiles.append(im)
    H = tiles[0].height
    sheet = Image.new("RGB", (W * 3, H * 2 + 18), (20, 20, 20))
    ImageDraw.Draw(sheet).text((4, 3), label, fill=(255, 255, 255))
    for k, t in enumerate(tiles):
        sheet.paste(t, ((k % 3) * W, 18 + (k // 3) * H))
    sheet.save(out, quality=85)
    return out


def collect(shots=None, quiet=False):
    pending = 0
    for shot in (shots or sorted(SHOTS)):
        for k, p in takes(shot):
            side = json.load(open(p))
            if side["state"] not in ("queued", "running", "ready", "stale"):
                continue
            st = gen.collect_one(side["job"]) if not quiet else gen.collect_one(side["job"])
            j = gen.read_manifest()["jobs"][side["job"]]
            side["state"] = j["state"]
            if j["state"] == "done":
                src = os.path.join(ROOT, j["files"][0])
                dst = os.path.join(shot_dir(shot), f"take_{k}.mp4")
                if os.path.exists(dst):
                    os.remove(dst)
                if side["model"].startswith("minimax"):
                    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", src, "-an", "-c", "copy", dst], check=True)
                else:
                    os.link(src, dst)
                side.update(file=os.path.relpath(dst, ROOT), raw_file=j["files"][0], probe=gen.probe(dst),
                            gen_secs=j.get("gen_secs"), latency_secs=j.get("latency_secs"))
                contact_sheet(dst, os.path.join(shot_dir(shot), f"take_{k}_sheet.jpg"),
                              label=f"{shot} take_{k}  {side['model']} {side['res']} {side['duration']}s")
            elif j["state"] in ("error", "collected_error"):
                side["error"] = (j.get("error") or "")[:800]
                if not side.get("refunded"):
                    log_spend({"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "event": "error", "shot": shot,
                               "take": k, "job": side["job"], "refund_usd": side["est_usd"],
                               "note": "errored runs are normally not billed", "error": side["error"][:200]})
                    side["refunded"] = True
            elif j["state"] in ("queued", "running", "ready", "stale"):
                pending += 1
            json.dump(side, open(p, "w"), indent=1, ensure_ascii=False)
    return pending


def overview(out, items=None):
    from PIL import Image, ImageDraw
    rows = []
    if items is None:
        items = []
        for shot in sorted(SHOTS):
            for k, p in takes(shot):
                if json.load(open(p)).get("state") == "done":
                    items.append(f"{shot}/take_{k}")
    for it in items:
        sh = os.path.join(GEN, it + "_sheet.jpg")
        if os.path.exists(sh):
            rows.append((it, Image.open(sh)))
    if not rows:
        return
    W = 1440
    rows = [(n, im.resize((W, round(W * im.height / im.width)))) for n, im in rows]
    # 2 columns of half-size sheets
    half = [(n, im.resize((W // 2, im.height // 2))) for n, im in rows]
    H = max(im.height for _, im in half)
    canvas = Image.new("RGB", (W, H * ((len(half) + 1) // 2)), (10, 10, 10))
    for k, (n, im) in enumerate(half):
        canvas.paste(im, ((k % 2) * (W // 2), (k // 2) * H))
    canvas.save(out, quality=82)
    print(out, len(half), "clips")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    args = [a for a in sys.argv[2:] if not a.startswith("--")]
    opts = {a[2:].partition("=")[0]: a[2:].partition("=")[2] or True for a in sys.argv[2:] if a.startswith("--")}
    if cmd == "submit":
        for s in args:
            over = {k: (int(v) if k == "duration" else v) for k, v in opts.items() if k in ("audio", "duration", "prompt", "model", "aspect")}
            for j in submit(s, opts.get("res", "480p"), int(opts.get("takes", 1)), "dry-run" in opts, opts.get("note", ""), over):
                print(j)
        print(f"spend so far (est): ${spend_total()}")
    elif cmd == "collect":
        print("pending:", collect(args or None))
    elif cmd == "wait":
        t0 = time.time()
        while True:
            p = collect(args or None)
            if not p or time.time() - t0 > float(opts.get("timeout", 3600)):
                print("pending:", p); break
            time.sleep(30)
    elif cmd == "sheet":
        overview(os.path.join(ROOT, args[0]) if args else os.path.join(GEN, "SHEET_round1.jpg"), args[1:] or None)
    elif cmd == "spend":
        print(f"${spend_total()} of ${CAP_USD}")
    else:
        print(__doc__)
