"""Token normalisation shared by the alignment scripts: canonical words and ASR words -> comparable 'parts'.
lower-case, strip punctuation and apostrophes, split hyphens, digits -> number words, a few compounds split on both sides."""
import re
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()
SPLIT = {'saltpeter': ['salt', 'peter'], 'saltpetre': ['salt', 'peter'], 'everyone': ['every', 'one'], 'couldve': ['could', 'have'],
         'wouldve': ['would', 'have'], 'nearmiss': ['near', 'miss'], 'oneway': ['one', 'way'], 'sulphur': ['sulfur']}
def num_words(n):
    n = int(n)
    if n < 20: return [ONES[n]]
    if n < 100: return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000: return [ONES[n // 100], 'hundred'] + (num_words(n % 100) if n % 100 else [])
    return [str(n)]
def parts(word):
    w = word.lower().replace('’', "'")
    out = []
    for p in re.split(r'[-\s]+', w):
        p = re.sub(r"[^a-z0-9']", '', p)
        if not p: continue
        if p.isdigit(): out += num_words(p); continue
        p = p.replace("'", '')
        out += SPLIT.get(p, [p])
    return out
