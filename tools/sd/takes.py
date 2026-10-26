#!/usr/bin/env python3
"""Seedance 2.5 takes for the plates in tools/sd/plates_spec.py.

  takes.py submit SHOT [SHOT ...] [--n=1] [--kf=media/kf/X.png] [--dry]   first frame = docs/picks.json kf pick (else media/kf/SHOT_nbp.png)
  takes.py collect                                                        download finished takes, write a contact sheet per take
  takes.py list                                                           takes per shot (docs/takes.json)

Sung shots get the vocal stem window as reference audio (work/stems/vocals.wav, the BS-RoFormer stem; falls back to the Kim stem).
A take's song mapping: clip time = song time - s0 + lag (lag measured at intake; tools/sync).
"""
import json, os, subprocess, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools", "gen")); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen
from plates_spec import SHOTS, PIN

TAKES = os.path.join(ROOT, "docs", "takes.json")
PICKS = os.path.join(ROOT, "docs", "picks.json")
VOC = [os.path.join(ROOT, "work", "stems", "vocals.wav"), os.path.join(ROOT, "work", "stems", "mdx_kim", "vocals.wav")]


def load(p, d):
    return json.load(open(p)) if os.path.exists(p) else d


def save(p, v):
    tmp = p + ".tmp"; json.dump(v, open(tmp, "w"), indent=1); os.replace(tmp, p)


def keyframe(sid, opt):
    if opt.get("kf"): return opt["kf"]
    picks = load(PICKS, {})
    if sid in picks and picks[sid].get("kf"): return picks[sid]["kf"]
    for c in (f"media/kf/{sid}_nbp.png", f"media/kf/{sid}_nbp.jpg", f"media/kf/{sid}_gpt.png"):
        if os.path.exists(os.path.join(ROOT, c)): return c
    raise SystemExit(f"{sid}: no keyframe")


def submit(sids, opt):
    T = load(TAKES, {})
    voc = next(v for v in VOC if os.path.exists(v))
    for sid in sids:
        s = SHOTS[sid]
        kf = keyframe(sid, opt)
        inp = {"prompt": (PIN + s["motion"])[:2000], "image": "file:" + gen.ref_image(os.path.join(ROOT, kf)).replace(ROOT + "/", ""),
               "duration": int(s["dur"]), "resolution": opt.get("res", "720p"), "aspect_ratio": "16:9", "fps": 24,
               "camera_fixed": False, "watermark": False, "output_format": "mp4", "use_virtual_avatar": bool(s.get("avatar")),
               "generate_audio": False}
        s0 = None
        if s.get("audio"):
            kind, t0, dur = s["audio"]
            s0 = float(t0)
            ref = gen.audio_ref(voc, t0, dur)
            inp["reference_audios"] = ["file:" + os.path.relpath(ref, ROOT)]
        for i in range(int(opt.get("n", 1))):
            n = len(T.get(sid, [])) + 1
            tag = f"{sid}_t{n}"
            spec = {"model": "bytedance/seedance-2.5", "tag": tag, "notes": f"plate {sid} take {n}; kf {kf}", "input": inp}
            os.makedirs(gen.SPECS, exist_ok=True)
            sp = os.path.join(gen.SPECS, f"{tag}.json"); json.dump(spec, open(sp, "w"), indent=1)
            if opt.get("dry"):
                gen.submit(sp, dry_run=True); continue
            jid = gen.submit(sp)
            T.setdefault(sid, []).append({"take": n, "job": jid, "kf": kf, "s0": s0, "dur": s["dur"], "voc": os.path.relpath(voc, ROOT) if s0 is not None else None,
                                          "submitted": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "file": None, "lag": None, "verdict": None})
            save(TAKES, T)
            print(sid, tag, jid)


def collect():
    T = load(TAKES, {})
    changed = False
    for sid, ts in T.items():
        for tk in ts:
            if tk.get("file") or tk.get("state") in ("error", "dead"): continue
            st = gen.collect_one(tk["job"])
            if st == "done":
                j = gen.read_manifest()["jobs"][tk["job"]]
                f = (j.get("files") or [None])[0]
                tk["file"] = f; changed = True
                if f:
                    p = os.path.join(ROOT, f)
                    dims = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames",
                                           "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip()
                    tk["dims"] = dims
                    sheet = p.replace(".mp4", "_sheet.jpg")
                    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", p, "-vf", "fps=1.5,scale=480:-1,tile=6x2", "-frames:v", "1", sheet])
                    tk["sheet"] = os.path.relpath(sheet, ROOT)
                    print("done", sid, tk["take"], dims, tk["sheet"])
            elif st in ("error", "stale"):
                tk["state"] = st; changed = True; print(st, sid, tk["take"])
    if changed: save(TAKES, T)


if __name__ == "__main__":
    cmd = sys.argv[1]
    args = [a for a in sys.argv[2:] if not a.startswith("--")]
    opt = {a[2:].split("=", 1)[0]: (a.split("=", 1)[1] if "=" in a else "1") for a in sys.argv[2:] if a.startswith("--")}
    if cmd == "submit": submit(args, opt)
    elif cmd == "collect": collect()
    elif cmd == "list":
        for sid, ts in load(TAKES, {}).items():
            print(sid, [(t["take"], bool(t.get("file")), t.get("lag"), t.get("verdict")) for t in ts])
