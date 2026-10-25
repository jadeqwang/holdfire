#!/usr/bin/env python3
"""Running spend total for Hold Fire, across every generation log, plus the project hard cap.

Logs read (list-price estimates; the real bill can't be read with the wrangler token):
  media/genlog.jsonl       every sync call by cf.py (images, TTS, music, ASR) and every relay submit/result by gen.py
  media/gen/spend.jsonl    vgen.py per-take submits/refunds (a subset of the relay submits; merged by job id, never double counted)
  docs/spend_ledger.jsonl  committed compact copy of every billing row (cf.log) from the box and from cloud sessions, so the cap
                           holds everywhere (git merges it with merge=union; .gitattributes). Deduped against genlog.

Rules: failed sync calls (ok=false) are not counted; relay jobs count from submit and are refunded when they error
(errored runs are normally not billed).

Cap: REWIND_CAP (or VGEN_CAP) env, default $400 for the whole project. cf.generate(), gen.submit() and
vgen.submit() all call check() before spending and refuse to exceed it.

    python tools/gen/spend.py            # total, cap, breakdown by model
    python tools/gen/spend.py --tags     # also by tag
"""
import collections
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GENLOG = os.path.join(ROOT, "media", "genlog.jsonl")
LEDGER = os.path.join(ROOT, "docs", "spend_ledger.jsonl")   # committed compact copy of billing rows (cf.log), from the box AND cloud sessions
VSPEND = os.path.join(ROOT, "media", "gen", "spend.jsonl")
CAP_USD = float(os.environ.get("HOLDFIRE_CAP", "950"))


def _lines(p):
    if not os.path.exists(p):
        return []
    out = []
    for line in open(p):
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def items():
    """List of (model, tag, usd, kind) for every billed (or still pending) item."""
    rows, jobs, errored, seen = [], {}, set(), set()
    for r in _lines(GENLOG) + _lines(LEDGER):                # the ledger repeats the local log's billing rows: dedupe
        key = r.get("job") and (r["job"], r.get("event")) or (r.get("ts"), r.get("model"), r.get("tag"), r.get("est_usd"))
        if key in seen: continue
        seen.add(key)
        if r.get("job"):
            if r.get("event") == "submit":
                jobs[r["job"]] = (r.get("model"), r.get("tag"), r.get("est_usd") or 0)
            elif r.get("event") == "result" and r.get("ok") is False:
                errored.add(r["job"])
        elif r.get("ok"):
            rows.append((r.get("model"), r.get("tag"), r.get("est_usd") or 0, "sync"))
    for r in _lines(VSPEND):
        j = r.get("job")
        if r.get("event") == "submit" and j and j not in jobs:
            jobs[j] = (r.get("model"), r.get("shot"), r.get("est_usd") or 0)
        elif r.get("event") == "error" and j:
            errored.add(j)
    for j, (m, t, usd) in jobs.items():
        if j not in errored:
            rows.append((m, t, usd, "relay"))
    return rows


def total():
    return round(sum(u for _, _, u, _ in items()), 4)


def check(est, what=""):
    """Refuse (SystemExit) if spending est would push the project past CAP_USD."""
    tot = total()
    if tot + (est or 0) > CAP_USD:
        raise SystemExit(f"SPEND CAP: {what} est ${est} would bring the project to ${tot + (est or 0):.2f} > cap ${CAP_USD:.0f}")
    return tot


if __name__ == "__main__":
    rows = items()
    by_model = collections.defaultdict(lambda: [0, 0.0])
    by_tag = collections.defaultdict(lambda: [0, 0.0])
    for m, t, u, _ in rows:
        by_model[m][0] += 1; by_model[m][1] += u
        by_tag[t or "-"][0] += 1; by_tag[t or "-"][1] += u
    for m, (n, u) in sorted(by_model.items(), key=lambda x: -x[1][1]):
        print(f"  {m:<36} {n:>4} calls  ${u:8.3f}")
    if "--tags" in sys.argv:
        print()
        for t, (n, u) in sorted(by_tag.items()):
            print(f"  {t:<36} {n:>4} calls  ${u:8.3f}")
    tot = round(sum(u for _, _, u, _ in rows), 4)
    print(f"TOTAL ${tot:.2f} of ${CAP_USD:.0f} cap  ({len(rows)} billed items; list-price estimates)")
