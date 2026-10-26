"""The SUNG script: canonical lines in performance order, with the repeats and omissions heard in the audio.
Each entry: (cidx, repeat, sung_words or None, note). sung_words None = the canonical words. Evidence for every deviation is in
analysis/timing.md ("Sung vs canonical"). build() -> list of line dicts used by align.py / build_timing.py."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lyrics
COUNT5 = ['One', 'One', 'Two', 'Three', 'Five']
SUNG = [
    (0, False, ['One', 'one', 'two', 'three', 'five', 'eight', 'eight'],
     'whispered count #1: 7 whispers on 7 consecutive beats, the last "eight" doubled (ASR: "...five, eight, eight")'),
    (0, True, ['One', 'two', 'three', 'five', 'eight'],
     'whispered count #2: the second "one" is not whispered (isolated-syllable ASR: why/two/three/five/hey), followed by a short '
     'extra whisper heard as "yeah" at ~11.5 s (not a lyric word, listed in hits only)'),
    *[(i, False, None, '') for i in range(1, 17)],
    (17, False, COUNT5, 'sung without "Eight!" - the "Counting on you!" shout takes its place'),
    (18, False, None, ''),
    (17, True, COUNT5, 'post-chorus count repeated (no "Eight!")'),
    (18, True, None, 'repeated'),
    *[(i, False, None, '') for i in range(19, 37)],
    (37, False, COUNT5, 'sung without "Eight!"'),
    (38, False, None, ''),
    (37, True, COUNT5, 'post-chorus count repeated (no "Eight!")'),
    (38, True, None, 'repeated'),
    *[(i, False, None, '') for i in range(39, 65)],
    (65, False, None, ''),
    (64, True, None, 'whispered count repeated after "The count goes higher."'),
    (66, False, None, ''),
    (66, True, None, 'repeated at the very end'),
]
def build():
    import difflib
    C = lyrics.canon(); out = []
    for k, (ci, rep, sw, note) in enumerate(SUNG):
        c = C[ci]
        words = list(sw) if sw else list(c['words'])
        unsung, extra = [], []
        if sw:
            sm = difflib.SequenceMatcher(a=[w.lower() for w in c['words']], b=[w.lower() for w in words], autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag in ('delete', 'replace'): unsung += c['words'][i1:i2]
                if tag in ('insert', 'replace'): extra += list(range(j1, j2))
        out.append(dict(id=k, cidx=ci, repeat=rep, section=c['section'], tag=c['tag'], text=c['text'], kind=c['kind'],
                        words=words, unsung=unsung, extra=extra, note=note))
    return out
if __name__ == '__main__':
    for l in build(): print(l['id'], l['cidx'], 'R' if l['repeat'] else ' ', l['section'], '|', ' '.join(l['words']), '|', l['unsung'], l['note'])
