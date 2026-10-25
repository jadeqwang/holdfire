#!/usr/bin/env python3
"""Refresh docs/gen_catalog/ from the live model catalog.

Sources:
  1. Model cards (description, pricing, metadata, input/output JSON schema) from the
     cloudflare/cloudflare-docs repo, src/content/catalog-models (the source of
     developers.cloudflare.com/ai/models). No Cloudflare API route lists the third-party catalog
     (/ai/models/search only returns the ~69 @cf models).
  2. A free live probe of every media model on POST /ai/run with an invalid input
     ({"__probe":1}). The validator answers "Model not found" (7003) or a User Input Error that
     lists the live "Valid fields". Nothing is generated or billed.

Text-generation (LLM) cards are skipped. Writes <author>-<model>.json, INDEX.tsv, LIVE.tsv.

    ~/Documents/moongazing/.venv/bin/python tools/gen/catalog.py            # refresh cards + probe
    ~/Documents/moongazing/.venv/bin/python tools/gen/catalog.py --probe-only
    ~/Documents/moongazing/.venv/bin/python tools/gen/catalog.py --probe minimax/h3 minimax/hailuo-3   # probe names
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfauth  # noqa: E402

ROOT = cfauth.ROOT
OUT = os.path.join(ROOT, "docs", "gen_catalog")
GH = "https://api.github.com/repos/cloudflare/cloudflare-docs"
PATH = "src/content/catalog-models"
SKIP_TASKS = {"Text Generation"}


def _get(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "rewind-take-two"}), timeout=timeout) as r:
        return r.read()


def refresh_cards():
    commit = json.loads(_get(f"{GH}/commits?path={PATH}&per_page=1"))[0]
    sha, date = commit["sha"], commit["commit"]["committer"]["date"]
    listing = json.loads(_get(f"{GH}/contents/{PATH}?ref={sha}"))
    os.makedirs(OUT, exist_ok=True)
    kept = []
    for f in listing:
        if not f["name"].endswith(".json"):
            continue
        d = json.loads(_get(f["download_url"]))
        if d.get("task") in SKIP_TASKS:
            continue
        with open(os.path.join(OUT, f["name"]), "w") as fh:
            json.dump(d, fh, indent=1)
        kept.append(d)
    with open(os.path.join(OUT, "INDEX.tsv"), "w") as fh:
        fh.write(f"# cloudflare-docs {PATH} @ {sha[:7]} ({date}); media models only\n")
        fh.write("model\ttask\tpricing\n")
        for d in sorted(kept, key=lambda x: x["model_id"]):
            fh.write(f"{d['model_id']}\t{d.get('task')}\t{json.dumps(d.get('pricing'))}\n")
    print(f"{len(kept)} media cards @ {sha[:7]} {date}")
    return [d["model_id"] for d in kept]


def probe(model):
    body = json.dumps({"model": model, "input": {"__probe": 1}}).encode()
    req = urllib.request.Request(cfauth.API + "/ai/run", data=body, method="POST",
                                 headers=cfauth.headers({"Content-Type": "application/json"}))
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, "UNEXPECTED SUCCESS (probe should never run): " + r.read()[:200].decode()
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read())["errors"][0]["message"]
        except Exception:  # noqa: BLE001
            msg = f"HTTP {e.code}"
        return e.code, msg


def probe_all(models):
    rows = []
    for m in models:
        st, msg = probe(m)
        if "not found" in msg.lower():
            live, fields = "MISSING", ""
        else:
            live = "live"
            mm = re.search(r"Valid fields: (.*?)(?:\. |\.$|$)", msg)
            fields = mm.group(1) if mm else msg[:200]
        rows.append((m, live, fields))
        print(f"{m:45s} {live:8s} {fields[:110]}")
    return rows


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--probe" in sys.argv:
        probe_all(args)
        sys.exit()
    if "--probe-only" in sys.argv:
        models = sorted(json.load(open(os.path.join(OUT, f)))["model_id"] for f in os.listdir(OUT) if f.endswith(".json"))
    else:
        models = sorted(refresh_cards())
    rows = probe_all(models)
    with open(os.path.join(OUT, "LIVE.tsv"), "w") as fh:
        fh.write(f"# live /ai/run probe {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\nmodel\tstatus\tvalid_fields\n")
        for r in rows:
            fh.write("\t".join(r) + "\n")
