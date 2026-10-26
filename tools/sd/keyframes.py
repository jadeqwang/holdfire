#!/usr/bin/env python3
"""First-frame stills for Seedance shots (tools/sd/shots.py), via the relay.
  keyframes.py SHOT [SHOT ...] [--model=nbp|gpt] [--v=2] [--extra="..."]   -> media/kf/<SHOT>_<model>[_v].png"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools", "gen")); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cf
from plates_spec import SHOTS
os.environ["GEN_IMAGES_VIA_RELAY"] = "1"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
opt = {a[2:].split("=", 1)[0]: a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--") and "=" in a}
model = opt.get("model", "nbp"); v = opt.get("v", "")
for sid in args:
    s = SHOTS[sid]
    refs = [r for r in s["refs"] if os.path.exists(os.path.join(ROOT, r))]
    if any("other_sheet_v2" in r for r in s["refs"]) and not any("other_sheet" in r for r in refs):
        refs = ["media/design/other_sheet_v1_nbp.jpg"] + refs
    prompt = s["kf"] + (" " + opt["extra"] if "extra" in opt else "")
    out = f"media/kf/{sid}_{model}{'_' + v if v else ''}.png"
    if model == "nbp":
        inp = {"prompt": prompt, "aspect_ratio": "16:9", "image_size": "2K"}
        if refs: inp["image_input"] = ["file:" + r for r in refs[:3]]
        m = "google/nano-banana-pro"
    else:
        inp = {"prompt": prompt, "size": "1536x1024", "quality": "high"}
        if refs: inp["images"] = ["file:" + r for r in refs]
        m = "openai/gpt-image-2.5-sunburst"
    for attempt in range(3):
        try:
            print(cf.generate(m, inp, out, tag=f"kf_{sid}_{model}{v}")); break
        except (cf.CFError, RuntimeError, SystemExit) as e:
            if attempt == 2: print("FAILED", sid, e); break
            print("retry", sid, str(e)[:200], file=sys.stderr)
