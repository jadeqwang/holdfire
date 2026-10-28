#!/usr/bin/env python3
"""Restore generated media into media/ from the relay's KV mirror (cloud sessions start without media/ and work/).

The relay (tools/gen/gen.py) mirrors every job's output into its JOBS KV namespace as media:<jobId>:<n>[:<chunk>] (TTL 21 d) and
writes res:<jobId> = {media: [{key, chunks, bytes, type}]}. A collected file is named media/gen/<tag>_<id><ext> for job
holdfire/<tag>-<id>, so the path alone names the job. Nothing is billed: this only reads our own keys.

    python3 tools/t2/restore_media.py media/gen/t2_C103L_sd25_n3_eac2306974.mp4 [...]
    python3 tools/t2/restore_media.py --picks C103L C103R ...     # each pick's src and upscaled file (render/data/picks2.json)
Account and namespace: env CF_ACCOUNT_ID / GEN_KV_NS, else the defaults below (the proxy injects the token in cloud sessions).
"""
import json
import os
import sys
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ACC = os.environ.get('CF_ACCOUNT_ID', '78885e7db58a4c34423a7e62c8471b75')
NS = os.environ.get('GEN_KV_NS', '5f8f1f387d37449a949ee68625bdc310')   # rare-earth-v3-jobs
TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', 'proxy-injected')


def kv(key):
    u = f'https://api.cloudflare.com/client/v4/accounts/{ACC}/storage/kv/namespaces/{NS}/values/{urllib.parse.quote(key, safe="")}'
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'Authorization': f'Bearer {TOKEN}'}), timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def job_of(path):
    stem = os.path.splitext(os.path.basename(path))[0]
    tag, jid = stem.rsplit('_', 1)
    return f'holdfire/{tag}-{jid}'


def restore(path, force=False):
    dst = os.path.join(ROOT, path)
    if os.path.exists(dst) and not force:
        return 'have'
    jid = job_of(path)
    res = kv(f'res:{jid}')
    if res is None:
        return f'no res:{jid}'
    media = json.loads(res).get('media') or []
    f = next((m for m in media if m.get('key')), None)
    if not f:
        return f'{jid}: nothing mirrored'
    n = f.get('chunks', 1)
    parts = [kv(f['key'] if n == 1 else f"{f['key']}:{c}") for c in range(n)]
    if any(p is None for p in parts):
        return f'{jid}: chunk missing (expired?)'
    data = b''.join(parts)
    if f.get('bytes') and len(data) != f['bytes']:
        return f'{jid}: size {len(data)} != {f["bytes"]}'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, 'wb') as fh:
        fh.write(data)
    return f'ok {len(data) / 1e6:.1f} MB'


def main(argv):
    paths = []
    if argv and argv[0] == '--picks':
        picks = json.load(open(os.path.join(ROOT, 'render/data/picks2.json')))
        for k in argv[1:]:
            p = picks[k]
            paths += [x for x in (p.get('src'), p.get('upscaled')) if x and x.startswith('media/gen/')]
    else:
        paths = argv
    bad = 0
    for p in paths:
        r = restore(p)
        bad += not (r.startswith('ok') or r == 'have')
        print(f'{p}: {r}', flush=True)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
