#!/usr/bin/env python3
"""Edit render/data/picks2.json: {ID: {dir, in, lag, kind, src}} (the picked plate for each take-two shot).

  picks.py set ID NAME|work/plates/NAME [--in S] [--lag L] [--kind video|still] [--src media/gen/x.mp4]
  picks.py rm ID
  picks.py ls [PREFIX]
  picks.py check            # every entry's plate dir exists and has meta.json

`in` is seconds of the SOURCE clip shown at the shot start (read it off a video player); the renderer subtracts the plate's
meta.start (plates.py --start) itself. `kind` and `src` default to the plate's meta.json. Keys stay sorted, so diffs are small.
Importable: from picks import set_pick, rm_pick, load, save.
"""
import json, os, sys, argparse

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PICKS = os.path.join(REPO, 'render', 'data', 'picks2.json')


def load():
    if not os.path.exists(PICKS):
        return {}
    with open(PICKS) as f:
        return json.load(f)


def save(d):
    with open(PICKS, 'w') as f:
        json.dump(dict(sorted(d.items())), f, indent=1, ensure_ascii=False)
        f.write('\n')


def plate_dir(name):
    return name if name.startswith('work/') else f'work/plates/{name}'


def read_meta(d):
    p = os.path.join(REPO, d, 'meta.json')
    if os.path.exists(p):
        with open(p) as f:
            return json.load(f)
    return None


def set_pick(pid, name, inn=None, lag=None, kind=None, src=None):
    d = load()
    e = dict(d.get(pid, {}))
    e['dir'] = plate_dir(name)
    m = read_meta(e['dir'])
    if inn is not None: e['in'] = float(inn)
    e.setdefault('in', float(m.get('start', 0)) if m else 0.0)
    if lag is not None: e['lag'] = float(lag)
    e.setdefault('lag', 0.0)
    if kind: e['kind'] = kind
    elif m: e['kind'] = m.get('kind', 'video')
    e.setdefault('kind', 'video')
    if src: e['src'] = src
    elif m and 'src' not in e: e['src'] = m.get('src', '')
    d[pid] = e
    save(d)
    if m is None:
        print(f'warning: {e["dir"]}/meta.json not found (run tools/t2/plates.py first)', file=sys.stderr)
    return e


def rm_pick(pid):
    d = load(); d.pop(pid, None); save(d)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('set'); s.add_argument('id'); s.add_argument('name')
    s.add_argument('--in', dest='inn', type=float); s.add_argument('--lag', type=float)
    s.add_argument('--kind', choices=['video', 'still']); s.add_argument('--src')
    r = sp.add_parser('rm'); r.add_argument('id')
    l = sp.add_parser('ls'); l.add_argument('prefix', nargs='?', default='')
    sp.add_parser('check')
    a = ap.parse_args()
    if a.cmd == 'set':
        print(a.id, json.dumps(set_pick(a.id, a.name, a.inn, a.lag, a.kind, a.src)))
    elif a.cmd == 'rm':
        rm_pick(a.id)
    elif a.cmd == 'ls':
        for k, v in load().items():
            if k.startswith(a.prefix): print(k, json.dumps(v))
    elif a.cmd == 'check':
        bad = 0
        for k, v in load().items():
            m = read_meta(v.get('dir', ''))
            if not m: print('MISSING', k, v.get('dir')); bad += 1
        print(f'{bad} missing'); sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
