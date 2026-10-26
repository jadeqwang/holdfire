#!/usr/bin/env python3
"""Generate a design sheet from tools/design/prompts/<name>.txt with one model, via the relay (cloud).
usage: sheet.py NAME MODEL [--ref=path ...] [--out=media/design/<name>_<model>.png]"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "tools", "gen")); import cf
os.environ["GEN_IMAGES_VIA_RELAY"] = "1"
name, model = sys.argv[1], sys.argv[2]
refs = [a.split("=", 1)[1] for a in sys.argv[3:] if a.startswith("--ref=")]
outs = [a.split("=", 1)[1] for a in sys.argv[3:] if a.startswith("--out=")]
P = open(os.path.join(ROOT, "tools", "design", "prompts", name + ".txt")).read().strip()
short = {"openai/gpt-image-2.5-sunburst": "gpt", "google/nano-banana-pro": "nbp", "bytedance/seedream-5-pro": "sdr",
         "xai/grok-imagine-image-2.0": "grok", "openai/gpt-image-2.5-flare": "gptf"}[model]
out = outs[0] if outs else f"media/design/{name}_{short}.png"
if short.startswith("gpt"):
    inp = {"prompt": P, "size": "1536x1024", "quality": "high"}
    if refs: inp["images"] = ["file:" + r for r in refs]
elif short == "nbp":
    inp = {"prompt": P, "aspect_ratio": "16:9", "image_size": "4K"}
    if refs: inp["image_input"] = ["file:" + r for r in refs]
elif short == "sdr":
    inp = {"prompt": P, "size": "2560x1440", "watermark": False}
    if refs: inp["image"] = ["file:" + r for r in refs]
elif short == "grok":
    inp = {"prompt": P, "aspect_ratio": "16:9", "resolution": "2k", "quality": "medium", "response_format": "b64_json"}
    if refs: inp["images"] = [{"url": "file:" + r} for r in refs]
for attempt in range(3):   # the relay sometimes answers 2047 Invalid User Credentials (refunded): resubmit
    try:
        print(cf.generate(model, inp, out, tag=f"{name}_{short}")); break
    except cf.CFError as e:
        if "2047" not in str(e) or attempt == 2: raise
        print("2047, resubmitting", file=sys.stderr)
