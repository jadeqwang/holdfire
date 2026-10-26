"""Canonical lyrics -> structured lines. Parses inputs/Hold Fire (lyrics and suno prompt).md (section tags in [..],
parenthesized lines = backing parts). Used by the alignment scripts; run directly to print the parse.
    canon() -> [{cidx, section, tag, text, kind, words:[w,...]}]
kind: 'gang' for parenthesized shouted parts ('!' in the text), 'whisper' for parenthesized parts with '...' or '.',
'lead' otherwise. Word tokens keep apostrophes and hyphens ("one-way", "Eighty-three", "could've"), strip other punctuation."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'inputs/Hold Fire (lyrics and suno prompt).md')
NAMES = {'Intro': 'Intro', 'Verse 1': 'Verse 1', 'Pre-Chorus': 'Pre-Chorus', 'Chorus': 'Chorus', 'Post-Chorus': 'Post-Chorus',
         'Verse 2': 'Verse 2', 'Bridge': 'Bridge', 'Build': 'Build', 'Drop': 'Drop', 'Outro': 'Outro'}
def words_of(text):
    t = text.strip().strip('()')
    out = []
    for tok in t.split():
        w = re.sub(r"^[^\w']+|[^\w']+$", '', tok)
        if w: out.append(w)
    return out
def canon():
    raw = open(SRC, encoding='utf-8').read().replace('\\[', '[').replace('\\]', ']').replace('\\!', '!').replace('\\~', '~')
    lines, sec, tag, count = [], None, None, {}
    for ln in raw.splitlines():
        s = ln.strip()
        if not s: continue
        if s.startswith('Style:'): break
        m = re.match(r'^\[(.+)\]$', s)
        if m:
            tag = m.group(1); base = tag.split(':')[0].strip()
            if base == 'End': break
            count[base] = count.get(base, 0) + 1
            sec = base if base in ('Intro', 'Verse 1', 'Verse 2', 'Bridge', 'Build', 'Drop', 'Outro') else f'{base} {count[base]}'
            continue
        if sec is None: continue
        paren = s.startswith('(')
        kind = 'lead' if not paren else ('gang' if '!' in s else 'whisper')
        lines.append(dict(cidx=len(lines), section=sec, tag=tag, text=s, kind=kind, words=words_of(s)))
    return lines
if __name__ == '__main__':
    for l in canon():
        print(l['cidx'], l['section'], '|', l['tag'], '|', l['kind'], '|', l['text'], len(l['words']))
