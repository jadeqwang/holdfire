#!/usr/bin/env python3
"""Merge docs/take2/picks_<group>.json (one file per generation group) into render/data/picks2.json, which the renderer reads.

    python3 tools/t2/merge_picks.py          # prints the merged ids; a later file wins on a duplicate id (warned)
"""
import fcntl, glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'render', 'data', 'picks2.json')


def merge():
    merged, owner = {}, {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'docs', 'take2', 'picks_*.json'))):
        with open(f) as fh:
            for k, v in json.load(fh).items():
                if k in merged:
                    print(f'warning: {k} in {owner[k]} and {os.path.basename(f)}; using the latter', file=sys.stderr)
                merged[k], owner[k] = v, os.path.basename(f)
    with open(OUT + '.lock', 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        tmp = OUT + '.tmp'
        with open(tmp, 'w') as fh:
            json.dump(dict(sorted(merged.items())), fh, indent=1)
        os.replace(tmp, OUT)
    return merged


if __name__ == '__main__':
    m = merge()
    print(f'{len(m)} picks -> {os.path.relpath(OUT, ROOT)}')
