#!/usr/bin/env python3
"""Which models made the final cut: walk every pick the edit uses (render/data/picks2.json ids named in
render/src/timeline.js), find the take that produced its file (docs/take2/takes_*.json) and the image model of its
keyframe, and write render/data/t2/credits.json for the end card ("Animated by Opus 5.5 and a supporting cast of ...").

    python3 tools/t2/credits.py            # prints the per-model shot counts too
"""
import glob, json, os, re, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
J = lambda *p: os.path.join(ROOT, *p)
# display names, in the order the credit lists them (picture first, then the tools behind the picture)
NAMES = {
    'bytedance/seedance-2.5': 'Seedance 2.5', 'bytedance/seedance-2.0': 'Seedance 2.0', 'google/veo-3.1': 'Veo 3.1',
    'minimax/h3-max': 'MiniMax H3', 'minimax/h3': 'MiniMax H3', 'google/nano-banana-pro': 'Nano Banana Pro',
    'openai/gpt-image-2.5-sunburst': 'GPT Image 2.5', 'bytedance/seedream-5-pro': 'Seedream 5', 'krea/krea-3': 'Krea 3',
    'xai/grok-imagine-image-2.0': 'Grok Imagine', 'google/nano-banana-2.1': 'Nano Banana 2', 'google/veo-3.1-fast': 'Veo 3.1',
}
# keyframe file tokens -> image model (media/kf2/<SHOT>_<token>...jpg)
KF = [('nbp', 'google/nano-banana-pro'), ('nano', 'google/nano-banana-pro'), ('gpt', 'openai/gpt-image-2.5-sunburst'),
      ('seedream', 'bytedance/seedream-5-pro'), ('sdr', 'bytedance/seedream-5-pro'), ('krea', 'krea/krea-3'),
      ('grok', 'xai/grok-imagine-image-2.0'), ('nb2', 'google/nano-banana-2.1')]
# the tools behind the picture and the sound, always in the credit (they are in every frame or every cut)
SUPPORT = ['BS-RoFormer', 'MediaPipe', 'Whisper', 'three.js', 'Chromium', 'FFmpeg']


def kf_model(path):
    b = os.path.basename(path or '').lower()
    for tok, m in KF:
        if re.search(r'(^|[_\-.])' + tok, b):
            return m
    return None


def main():
    picks = json.load(open(J('render/data/picks2.json')))
    tl = open(J('render/src/timeline.js')).read()
    ids = {s['id'] for s in json.load(open(J('docs/take2/shots.json')))}   # clip '@' = the shot's own id ('@L'/'@R' for splits)
    named = lambda k: k in ids or k[:-1] in ids or re.search(r"['\"]" + re.escape(k) + r"['\"]", tl)
    used = {k: v for k, v in picks.items() if not k.startswith('TEST_') and named(k)}
    takes = []
    for f in glob.glob(J('docs/take2/takes_*.json')):
        for k, v in json.load(open(f)).items():
            takes += v if isinstance(v, list) else [v]
    by_file = {os.path.basename(t.get('file') or ''): t for t in takes if t.get('file')}
    shots = collections.defaultdict(set)
    for pid, pk in used.items():
        src = os.path.basename(pk.get('src') or '')
        t = by_file.get(src)
        if t and t.get('model'):
            shots[t['model']].add(pid)
            m = kf_model(t.get('kf'))
            if m: shots[m].add(pid)
        else:
            m = kf_model(src) or (pk.get('model'))
            if m: shots[m].add(pid)
    order = list(NAMES)
    models = sorted(shots, key=lambda m: order.index(m) if m in order else 99)
    seen, cast = set(), []
    for m in models:
        n = NAMES.get(m, m)
        if n not in seen: seen.add(n); cast.append(n)
    out = {'animated_by': 'Opus 5.5', 'cast': cast, 'support': SUPPORT,
           'shots': {NAMES.get(m, m): sorted(v) for m, v in shots.items()}, 'picks_used': len(used)}
    json.dump(out, open(J('render/data/t2/credits.json'), 'w'), indent=1, ensure_ascii=False)
    for m in models: print(f'{NAMES.get(m, m):18s} {len(shots[m]):3d} picks')
    print('cast:', ' · '.join(cast))


if __name__ == '__main__':
    main()
