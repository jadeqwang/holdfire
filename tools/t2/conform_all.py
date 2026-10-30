#!/usr/bin/env python3
"""Rebuild every plate the edit uses (work/plates/) in a fresh cloud session, so the master can be rendered from GitHub + the relay.

Sources, per pick in render/data/picks2.json (TEST_ picks skipped; picks with `file` need no plate):
  * media/gen/*      restored from the relay's KV mirror (tools/t2/restore_media.py); the 1080p `upscaled` file when there is one
                     (RC2: the sung and close-up plates are built from the upscales)
  * media/kf2/*      the derived-plates branch's derived/media/kf2/ (copy it over the repo first), else the relay (the keyframe's
                     generation job from docs/spend_ledger.jsonl)
  * work/...         derived clips: derived/work/ on the derived-plates branch (copy it over the repo first)
Conform: plates.py with its defaults (the whole clip, 24 fps, cover 1920x1080), --fit keep for stills (README), --key green where
the pick keys. A pick's `in` is in source seconds, so a plate conformed from 0 serves every `in`. Exceptions with fixed settings:
V113 (start 0.3, 62 frames: the tablet's clay assets were baked on that plate, tools/t2/tablet_clay.py), V108-V110 (the
green-screen walk composites, tools/t2/comp_walk.py, run afterwards) and V118-V121 (the machine composites: plate folders on the
derived-plates branch).
Plate dirs shared by several picks are conformed once. Existing plate dirs are kept unless --force.

    python3 tools/t2/conform_all.py [--force] [--only ID,ID] [--jobs 3]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 't2'))
import restore_media as R  # noqa: E402

FIXED = {'V113': ['--start', '0.3', '--dur', '2.5833']}
SKIP_DIRS = {'work/plates/V108', 'work/plates/V109', 'work/plates/V110',   # comp_walk.py
             # the verse 1 machines: the walk keyed over the machine plates, composited straight to frames (no video exists);
             # the plate folders themselves are on the derived-plates branch, derived/work/plates/V118..V121 (copy them over work/)
             'work/plates/V118', 'work/plates/V119', 'work/plates/V120', 'work/plates/V121'}


def ledger_jobs():
    jobs = {}
    for line in open(os.path.join(ROOT, 'docs', 'spend_ledger.jsonl')):
        e = json.loads(line)
        if e.get('event') == 'result' and e.get('ok') and e.get('tag'):
            jobs[e['tag']] = e['job']
    return jobs


def ensure_source(path, jobs):
    """make `path` exist; returns a status string"""
    dst = os.path.join(ROOT, path)
    if os.path.exists(dst):
        return 'have'
    if path.startswith('media/gen/'):
        return R.restore(path)
    if path.startswith('media/kf2/'):
        stem = os.path.splitext(os.path.basename(path))[0]
        job = jobs.get(f'kf_{stem}')
        if not job:
            return 'no source (not in derived/, no ledger job)'
        tag, h = job.split('/', 1)[1].rsplit('-', 1)
        gen = f'media/gen/{tag}_{h}.jpg'
        r = R.restore(gen)
        if os.path.exists(os.path.join(ROOT, gen)):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy(os.path.join(ROOT, gen), dst)
            return f'from relay {job}'
        return r
    return 'missing (copy derived/ from the derived-plates branch)'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--only', default='')
    ap.add_argument('--jobs', type=int, default=3)
    a = ap.parse_args()
    picks = json.load(open(os.path.join(ROOT, 'render', 'data', 'picks2.json')))
    only = set(filter(None, a.only.split(',')))
    jobs = ledger_jobs()
    todo = {}
    for k, v in picks.items():
        if k.startswith('TEST') or v.get('file') or (only and k not in only):
            continue
        d = v['dir']
        if d in SKIP_DIRS or d in todo:
            continue
        todo[d] = (k, v)
    bad = []

    def one(item):
        d, (k, v) = item
        name = os.path.basename(d)
        if os.path.exists(os.path.join(ROOT, d, 'meta.json')) and not a.force:
            return f'{name}: have'
        src = v.get('upscaled') or v['src']
        st = ensure_source(src, jobs)
        if not os.path.exists(os.path.join(ROOT, src)) and v.get('upscaled'):
            src = v['src']; st += f' | fell back to src: {ensure_source(src, jobs)}'
        if not os.path.exists(os.path.join(ROOT, src)):
            bad.append(name)
            return f'{name}: NO SOURCE {src} ({st})'
        cmd = [sys.executable, os.path.join(ROOT, 'tools', 't2', 'plates.py'), src, name]
        if src.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            cmd += ['--fit', 'keep']
        if v.get('key'):
            cmd += ['--key', 'green']                                  # every keyed pick is a green screen
        cmd += FIXED.get(name, [])
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode:
            bad.append(name)
            return f'{name}: plates.py failed: {r.stderr.strip()[-300:]}'
        return f'{name}: {r.stdout.strip().splitlines()[-1]}  [{src}; {st}]'

    with ThreadPoolExecutor(a.jobs) as ex:
        for line in ex.map(one, sorted(todo.items())):
            print(line, flush=True)
    print(f'{len(todo)} plate dirs; failed: {bad or "none"}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
