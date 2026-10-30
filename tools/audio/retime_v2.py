#!/usr/bin/env python3
"""Retime the timing map to "Hold Fire (minor fixes)" (30 Oct): analysis/timing.json (v1) -> render/data/timing.json + analysis/timing.json.

The new Suno render is the same arrangement and the same vocal performance at a slightly different, differently drifting tempo
(about 1.9 % faster overall; the drift curves differ by up to +-0.1 s), a shorter ending (the near-silence before the last
whispered "Hold your fire" is ~7 s shorter) and three edits: the doubled whispered "eight" of the intro's first count is gone,
"sulfur and saltpeter" is now "sulfur, saltpeter", and "Every one held its fire" is now "...held their fire".

So the new map is the v1 map carried through W, a monotone piecewise-linear map from v1 time to new time:
  * knots = v1 beat i -> new beat i (beats 2..352: the new song's percussive onsets near each W-predicted beat, fitted with a
    least-squares cubic spline of the drift, knots every 8 beats, Huber-reweighted; see analysis/retime_v2.json for residuals),
  * plus the outro anchors measured on the new vocal stem (OUTRO_KNOTS below), where the two songs differ in structure;
then every time field is mapped, the word-level edits are applied (EDITS), and each word onset is checked against the new
vocal stem (analysis/retime_v2.json: the per-word onset residuals).

timing.v1_map {v1: [...], v2: [...]} is written too: render/src/audio.js uses it so plan times (typed against v1) and the
lip-synced takes' s0/lag (synced to v1) land on the same musical moment in the new song.

    python3 tools/audio/retime_v2.py          # reads tools/audio/retime_v2_cfg.json and analysis/retime_v2_beats.json
"""
import copy
import json
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
V1 = os.path.join(ROOT, 'analysis', 'timing_v1.json')
OUT = [os.path.join(ROOT, 'analysis', 'timing.json'), os.path.join(ROOT, 'render', 'data', 'timing.json')]
REPORT = os.path.join(ROOT, 'analysis', 'retime_v2.json')
SONG_DUR = 236.0            # decoded length of the new MP3 (11,328,000 samples at 48 kHz, gapless decode), s


def load_knots(cfg):
    T = json.load(open(V1))
    ob = np.array(T['beats'])
    nb = np.array(json.load(open(os.path.join(ROOT, cfg['beats_fit'])))['beats'])
    lo, hi = cfg['beat_range']
    k1 = list(ob[lo:hi + 1]); k2 = list(nb[lo:hi + 1])
    for a, b in cfg['extra_knots']:
        k1.append(a); k2.append(b)
    o = np.argsort(k1)
    k1 = np.array(k1)[o]; k2 = np.array(k2)[o]
    assert np.all(np.diff(k1) > 0) and np.all(np.diff(k2) > 0), 'knots must be strictly increasing'
    return T, k1, k2


def warp_fn(k1, k2):
    def W(t):
        t = np.asarray(t, float)
        i = np.clip(np.searchsorted(k1, t, side='right') - 1, 0, len(k1) - 2)
        return k2[i] + (k2[i + 1] - k2[i]) * (t - k1[i]) / (k1[i + 1] - k1[i])
    return lambda t: float(np.round(W(t), 3))


TIME_KEYS = {'t', 'start', 'end', 't_attack', 't0', 't1', 'until'}


def warp_tree(x, W, key=None):
    if isinstance(x, dict):
        return {k: (W(v) if k in TIME_KEYS and isinstance(v, (int, float)) and not isinstance(v, bool) else warp_tree(v, W, k))
                for k, v in x.items()}
    if isinstance(x, list):
        return [warp_tree(v, W, key) for v in x]
    return x


def main():
    cfg = json.load(open(os.path.join(ROOT, 'tools', 'audio', 'retime_v2_cfg.json')))
    T, k1, k2 = load_knots(cfg)
    W = warp_fn(k1, k2)
    N = copy.deepcopy(T)
    for key in ('beats', 'downbeats', 'eighths'):
        N[key] = [W(t) for t in T[key]]
    for key in ('bars', 'beat_zones', 'deviations', 'events', 'hits', 'lines', 'sections'):
        N[key] = warp_tree(T[key], W)
    N['tempo'] = warp_tree(T['tempo'], W)
    # the film runs past the song: the new render ends where v1's final hit was, so the end card holds over a silent tail
    N['duration'] = cfg['film_duration']
    N['audio']['duration_s'] = SONG_DUR
    N['audio']['file'] = 'inputs/Hold Fire.mp3'
    N['audio']['v1_file'] = 'inputs/Hold Fire (v1).mp3'
    # edits: explicit per-item overrides measured on the new song (cfg['edits'], applied in order)
    for e in cfg['edits']:
        apply_edit(N, e)
    N['lines'] = [l for l in N['lines'] if l['words']]
    N['hits'].sort(key=lambda h: h['t'])
    # beat-relative fields
    beats = np.array(N['beats'])
    for h in N['hits']:
        h['off_ms'] = int(round((h['t'] - beats[np.argmin(abs(beats - h['t']))]) * 1000))
    for l in N['lines']:
        if l['words']:
            l['start'] = l['words'][0]['start']; l['end'] = l['words'][-1]['end']
    N['bars'] = [{**b, 'end': N['bars'][i + 1]['t'] if i + 1 < len(N['bars']) else min(b['end'], N['duration'])} for i, b in enumerate(N['bars'])]
    N['sections'][-1]['end'] = N['duration']
    N['v1_map'] = {'doc': 'v1 song time -> new song time at the same musical point (tools/audio/retime_v2.py): beat knots, then '
                          'the outro anchors. render/src/audio.js A.v1 / A.v1inv.',
                   'v1': [round(float(x), 3) for x in k1], 'v2': [round(float(x), 3) for x in k2]}
    N['status'] = ('retimed to "Hold Fire (minor fixes)" (30 Oct): the v1 map carried through v1_map, intro and outro edits measured '
                   'on the new vocal stem; see analysis/retime_v2.json. v1: ' + T['status'])
    N['tempo']['bpm_mean'] = round(60 / float(np.median(np.diff(beats))), 3)
    for p in OUT:
        json.dump(N, open(p, 'w'), indent=1, ensure_ascii=False)
    print('wrote', ', '.join(os.path.relpath(p, ROOT) for p in OUT))
    warp_features(N, k1, k2)


def warp_features(N, k1, k2):
    """audio.json (per-frame features, kicks, snares; tools/audio/features.py needs the drum-stem envelopes, not in the repo):
    each new frame i takes the v1 frame at v1inv(i / 24), kicks and snares go through W, and 'sung' is rebuilt from the new
    word spans. Past the song's end (the silent tail) every feature is its minimum."""
    F = json.load(open(os.path.join(ROOT, 'analysis', 'audio_v1.json')))
    fps = F['fps']; n = int(np.ceil(N['duration'] * fps - 1e-6))
    inv = lambda t: np.interp(t, k2, k1, left=None, right=None)
    src = np.clip(np.floor(np.array([inv(i / fps) for i in range(n)]) * fps + 1e-6).astype(int), 0, F['n_frames'] - 1)
    out = dict(F)
    out['doc'] = ('retimed to the minor-fixes song by tools/audio/retime_v2.py (frame i = the v1 frame at v1inv(i/24); kicks/snares '
                  'through timing.json v1_map; sung from the new word spans). v1: ' + F['doc'])
    out['n_frames'] = n; out['duration'] = N['duration']
    feats = {}
    for k, v in F['features'].items():
        v = np.array(v)
        w = v[src]
        w[np.arange(n) / fps >= SONG_DUR] = v.min()
        feats[k] = [round(float(x), 3) for x in w]
    sung = np.zeros(n, int)
    for l in N['lines']:
        for wd in l['words']:
            sung[int(wd['start'] * fps):int(np.ceil(wd['end'] * fps))] = 1
    if 'sung' in feats:
        feats['sung'] = sung.tolist()
    out['features'] = feats
    Wf = lambda t: round(float(np.interp(t, k1, k2)), 3)
    for key in ('kicks', 'snares'):
        out[key] = [[Wf(t), s] for t, s in F[key] if Wf(t) < SONG_DUR]
    for p in (os.path.join(ROOT, 'analysis', 'audio.json'), os.path.join(ROOT, 'render', 'data', 'audio.json')):
        json.dump(out, open(p, 'w'), separators=(',', ':'))
    print('wrote analysis/audio.json, render/data/audio.json', n, 'frames')


def find_line(N, sec, k):
    L = [l for l in N['lines'] if l['section'] == sec]
    return L[k]


def apply_edit(N, e):
    op = e['op']
    if op == 'line_words':          # replace a line's text and words (word times given on the new clock)
        l = find_line(N, e['section'], e['k'])
        l['text'] = e['text']
        l['words'] = e['words']
        for k in ('note', 'verify'):
            if k in e:
                l[k] = e[k]
    elif op == 'drop_word':         # a word the new song no longer sings
        l = find_line(N, e['section'], e['k'])
        assert l['words'][e['i']]['w'] == e['w'], (l['words'][e['i']], e)
        del l['words'][e['i']]
        if 'text' in e:
            l['text'] = e['text']
    elif op == 'word':              # change a word's text and/or times (new clock)
        l = find_line(N, e['section'], e['k'])
        w = l['words'][e['i']]
        assert w['w'] == e['was'], (w, e)
        w.update(e['set'])
        if 'text' in e:
            l['text'] = e['text']
    elif op == 'line':              # line-level fields (text, note)
        find_line(N, e['section'], e['k']).update(e['set'])
    elif op == 'hit':               # set / drop hits by (kind, index)
        hs = [h for h in N['hits'] if h['kind'] == e['kind']]
        h = hs[e['i']]
        assert h['word'] == e['w'], (h, e)
        if e.get('drop'):
            N['hits'].remove(h)
        else:
            h.update(e['set'])
    elif op == 'event':
        ev = [x for x in N['events'] if x['type'] == e['type'] and e['match'] in x.get('desc', '') and x['t'] >= e.get('after', 0)][e.get('i', 0)]
        if e.get('drop'):
            N['events'].remove(ev)
        else:
            ev.update(e['set'])
    elif op == 'add_event':
        N['events'].append(e['event']); N['events'].sort(key=lambda x: x['t'])
    elif op == 'deviation':
        d = N['deviations'][e['i']]
        d.update(e['set'])
    elif op == 'section':
        s = next(x for x in N['sections'] if x['name'] == e['name'])
        s.update(e['set'])
    else:
        raise SystemExit(f'unknown edit {op}')


if __name__ == '__main__':
    main()
