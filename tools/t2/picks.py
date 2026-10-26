#!/usr/bin/env python3
"""Edit a group's picks file docs/take2/picks_<group>.json, then rebuild render/data/picks2.json with tools/t2/merge_picks.py.

An entry is {dir, kind: 'video'|'still', src, s0?, lag?, in?, rate?, twos?, zoom?, pan?, rot?, flipX?, fit?, style?, styleAmt?,
grade?, key?, reverse?}. Pick fields are DEFAULTS for t2_plate / t2_still; a shot's own p overrides any key it sets.
Clip clock: with s0 (a lip-synced take whose audio ref started at song time s0) clipT = t - s0 + lag; otherwise
clipT = (p.in ?? pick.in ?? 0) + lt * rate. `in` / clipT are seconds of the SOURCE clip (plates.py --start is subtracted by the
renderer). twos defaults to true for video unless the pick says twos: false.

  picks.py -g GROUP set ID NAME|work/plates/NAME [--in S] [--s0 T] [--lag L] [--rate R] [--kind video|still] [--src PATH]
                 [--style riso] [--styleAmt 0.4] [--zoom 1.1] [--pan X,Y] [--fit cover] [--key green] [--no-twos] [--reverse]
                 [--set key=JSON ...]          (e.g. --set 'grade={"sat":0.8}')
  picks.py -g GROUP unset ID KEY [KEY...]      remove fields from an entry
  picks.py -g GROUP rm ID
  picks.py [-g GROUP] ls [PREFIX]              (no -g: the merged picks2.json)
  picks.py check                               every merged entry's plate dir has meta.json
kind and src default to the plate's meta.json. Writes are locked (fcntl) so parallel agents don't clobber a group file.
Importable: from picks import set_pick, rm_pick, load_group.
"""
import argparse, fcntl, json, os, subprocess, sys
from contextlib import contextmanager

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MERGED = os.path.join(REPO, 'render', 'data', 'picks2.json')
MERGE = os.path.join(REPO, 'tools', 't2', 'merge_picks.py')


def group_path(group):
    return os.path.join(REPO, 'docs', 'take2', f'picks_{group}.json')


@contextmanager
def locked_group(group):
    """yields the group's dict; saved (sorted) on exit, under an exclusive lock"""
    path = group_path(group)
    lockdir = os.path.join(REPO, 'work', '.locks'); os.makedirs(lockdir, exist_ok=True)
    with open(os.path.join(lockdir, f'picks_{group}.lock'), 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        d = {}
        if os.path.exists(path):
            with open(path) as f:
                d = json.load(f)
        yield d
        tmp = path + '.tmp'
        with open(tmp, 'w') as f:
            json.dump(dict(sorted(d.items())), f, indent=1, ensure_ascii=False); f.write('\n')
        os.replace(tmp, path)


def load_group(group):
    p = group_path(group)
    return json.load(open(p)) if os.path.exists(p) else {}


def merge():
    if not os.path.exists(MERGE):
        print('warning: tools/t2/merge_picks.py missing; picks2.json not rebuilt', file=sys.stderr); return
    subprocess.run([sys.executable, MERGE], check=True)


def plate_dir(name):
    return name if name.startswith('work/') else f'work/plates/{name}'


def read_meta(d):
    p = os.path.join(REPO, d, 'meta.json')
    return json.load(open(p)) if os.path.exists(p) else None


def set_pick(group, pid, name, fields=None, do_merge=True):
    fields = {k: v for k, v in (fields or {}).items() if v is not None}
    with locked_group(group) as d:
        e = dict(d.get(pid, {}))
        e['dir'] = plate_dir(name)
        m = read_meta(e['dir'])
        if m:
            e.setdefault('kind', m.get('kind', 'video'))
            e.setdefault('src', m.get('src', ''))
        e.setdefault('kind', 'video')
        e.update(fields)
        d[pid] = e
    if m is None:
        print(f'warning: {e["dir"]}/meta.json not found (run tools/t2/plates.py first)', file=sys.stderr)
    if do_merge: merge()
    return e


def rm_pick(group, pid, keys=None, do_merge=True):
    with locked_group(group) as d:
        if keys:
            for k in keys: d.get(pid, {}).pop(k, None)
        else:
            d.pop(pid, None)
    if do_merge: merge()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('-g', '--group')
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('set'); s.add_argument('id'); s.add_argument('name')
    for k, t in [('in', float), ('s0', float), ('lag', float), ('rate', float), ('styleAmt', float), ('zoom', float), ('rot', float)]:
        s.add_argument(f'--{k}', dest=k, type=t)
    s.add_argument('--kind', choices=['video', 'still']); s.add_argument('--src'); s.add_argument('--style'); s.add_argument('--fit')
    s.add_argument('--key'); s.add_argument('--pan'); s.add_argument('--no-twos', action='store_true'); s.add_argument('--reverse', action='store_true')
    s.add_argument('--flipX', action='store_true'); s.add_argument('--set', action='append', default=[])
    u = sp.add_parser('unset'); u.add_argument('id'); u.add_argument('keys', nargs='+')
    r = sp.add_parser('rm'); r.add_argument('id')
    l = sp.add_parser('ls'); l.add_argument('prefix', nargs='?', default='')
    sp.add_parser('check')
    a = ap.parse_args()
    if a.cmd in ('set', 'unset', 'rm') and not a.group:
        sys.exit('-g GROUP is required (writes docs/take2/picks_GROUP.json)')
    if a.cmd == 'set':
        f = {k: getattr(a, k) for k in ['in', 's0', 'lag', 'rate', 'styleAmt', 'zoom', 'rot', 'kind', 'src', 'style', 'fit', 'key']}
        if a.pan: f['pan'] = [float(x) for x in a.pan.split(',')]
        if a.no_twos: f['twos'] = False
        if a.reverse: f['reverse'] = True
        if a.flipX: f['flipX'] = True
        for kv in a.set:
            k, v = kv.split('=', 1)
            try: f[k] = json.loads(v)
            except json.JSONDecodeError: f[k] = v
        print(a.id, json.dumps(set_pick(a.group, a.id, a.name, f)))
    elif a.cmd == 'unset':
        rm_pick(a.group, a.id, a.keys)
    elif a.cmd == 'rm':
        rm_pick(a.group, a.id)
    elif a.cmd == 'ls':
        d = load_group(a.group) if a.group else (json.load(open(MERGED)) if os.path.exists(MERGED) else {})
        for k, v in d.items():
            if k.startswith(a.prefix): print(k, json.dumps(v))
    elif a.cmd == 'check':
        d = json.load(open(MERGED)) if os.path.exists(MERGED) else {}
        bad = [k for k, v in d.items() if not read_meta(v.get('dir', ''))]
        for k in bad: print('MISSING', k, d[k].get('dir'))
        print(f'{len(d)} picks, {len(bad)} missing'); sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
