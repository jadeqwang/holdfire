#!/usr/bin/env python3
"""YouTube subtitles (SubRip) for Hold Fire, timed to the song: deliverables/subtitles/hold_fire.<lang>.srt.

Text: tools/t2/subtitles_lyrics.json (one entry per sung line, by timing.json lines[].n; en is the lyric sheet). Timing:
render/data/timing.json (the minor-fixes song): a cue starts on its line's first word and ends 0.8 s after its last word, or
0.04 s before the next line starts if that is sooner, and is never shorter than 1 s unless the next line cuts it. Long cues are
broken into two lines near the middle (42 characters; 18 for Chinese). French gets no-break spaces before ; : ! ? and inside
guillemets. Language codes are YouTube's: en, zh-Hans, ru, uk, fr.

    python3 tools/t2/subtitles.py
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'deliverables', 'subtitles')
LANGS = {'en': 'en', 'zh': 'zh-Hans', 'ru': 'ru', 'uk': 'uk', 'fr': 'fr'}
HOLD, GAP, MIN = 0.8, 0.04, 1.0


def ts(t):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def wrap(s, lang):
    if lang == 'zh':
        if len(s) <= 18:
            return s
        cuts = [i + 1 for i, c in enumerate(s) if c in '，、；：。！' and 4 <= i + 1 <= len(s) - 3]
        i = min(cuts, key=lambda k: abs(k - len(s) / 2)) if cuts else len(s) // 2
        return s[:i] + '\n' + s[i:]
    if len(s) <= 42:
        return s
    sp = [m.start() for m in re.finditer(' ', s)]
    sp = [k for k in sp if s[k + 1] not in '!?;:»']
    i = min(sp, key=lambda k: abs(k - len(s) / 2))
    return s[:i] + '\n' + s[i + 1:]


def french(s):
    s = re.sub(r' ([;:!?»])', ' \\1', s)
    return s.replace('« ', '« ')


def main():
    T = json.load(open(os.path.join(ROOT, 'render', 'data', 'timing.json')))
    L = json.load(open(os.path.join(ROOT, 'tools', 't2', 'subtitles_lyrics.json')))['lines']
    text = lambda n: L[L[n]['same']] if 'same' in L[n] else L[n]
    lines = sorted(T['lines'], key=lambda l: l['words'][0]['start'])
    cues = []
    for i, l in enumerate(lines):
        t0, t1 = l['words'][0]['start'], l['words'][-1]['end'] + HOLD
        nxt = lines[i + 1]['words'][0]['start'] - GAP if i + 1 < len(lines) else T['audio']['duration_s']
        t1 = min(max(t1, t0 + MIN), nxt)
        cues.append((t0, t1, text(str(l['n']))))
    os.makedirs(OUT, exist_ok=True)
    for k, code in LANGS.items():
        out = []
        for j, (a, b, tx) in enumerate(cues, 1):
            s = tx[k]
            if k == 'fr':
                s = french(s)
            out.append(f'{j}\n{ts(a)} --> {ts(b)}\n{wrap(s, k)}\n')
        p = os.path.join(OUT, f'hold_fire.{code}.srt')
        open(p, 'w', encoding='utf-8').write('\n'.join(out))
        print(p, len(cues), 'cues')


if __name__ == '__main__':
    main()
