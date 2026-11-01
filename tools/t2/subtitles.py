#!/usr/bin/env python3
"""YouTube subtitles (SubRip) for Hold Fire, timed to the song: deliverables/subtitles/hold_fire.<lang>.srt.

Text: tools/t2/subtitles_lyrics.json (one entry per sung line, by timing.json lines[].n; en is the lyric sheet). Timing:
render/data/timing.json (the minor-fixes song): a cue starts on its line's first word and ends 0.8 s after its last word, or
0.04 s before the next line starts if that is sooner, and is never shorter than 1 s unless the next line cuts it. Long cues are
broken into two lines near the middle (42 characters; 18 for Chinese). French gets no-break spaces before ; : ! ? and inside
guillemets. A translation may carry its own line break (a \\n in the json). Arabic gets RLM (U+200F) at the end of a line that ends
in punctuation and at the start of a line that starts with a digit or punctuation, so a left-to-right player keeps them on the right
side. Language codes are YouTube's: en, zh-Hans, zh-Hant, ru, uk, fr, es, pt-BR, ar, hi, id. Check with tools/t2/check_subtitles.py.

    python3 tools/t2/subtitles.py
"""
import json
import os
import re
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'deliverables', 'subtitles')
LANGS = {'en': 'en', 'zh': 'zh-Hans', 'zh-Hant': 'zh-Hant', 'ru': 'ru', 'uk': 'uk', 'fr': 'fr', 'es': 'es', 'pt-BR': 'pt-BR', 'ar': 'ar',
         'hi': 'hi', 'id': 'id'}
HOLD, GAP, MIN = 0.8, 0.04, 1.0
RLM = '\u200f'


def ts(t):
    ms = int(round(t * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


def wrap(s, lang):
    if '\n' in s:
        return s
    if lang in ('zh', 'zh-Hant'):
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


def rtl(s):
    out = []
    for l in s.split('\n'):
        if unicodedata.category(l[-1])[0] not in 'LMN':
            l += RLM
        if unicodedata.category(l[0])[0] not in 'LM':
            l = RLM + l
        out.append(l)
    return '\n'.join(out)


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
            s = wrap(s, k)
            if k == 'ar':
                s = rtl(s)
            out.append(f'{j}\n{ts(a)} --> {ts(b)}\n{s}\n')
        p = os.path.join(OUT, f'hold_fire.{code}.srt')
        open(p, 'w', encoding='utf-8').write('\n'.join(out))
        print(p, len(cues), 'cues')


if __name__ == '__main__':
    main()
