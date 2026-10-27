#!/usr/bin/env python3
"""Check V113's tablet cuneiform (render/src/scenes/t2/lyric/cuneiform.js) and render a test card.

For every Fibonacci number the module writes, the sign sequence it produces is read back from the Unicode names alone
(unicodedata.name: DISH = 1, MIN = 2, "THREE DISH" = 3 ...; U = 10, "U U" = 20, "FOUR U" = 40 ...), summed per place, and the
places are read in base 60; the result must equal the number. Every sign must be in the subset font's cmap (fontTools glyph
name printed). The Nanni line's signs are printed with their names. The card (1920x1080) shows number -> glyphs -> names.

  python3 tools/t2/cuneiform_card.py [--out work/t2/tablet/cuneiform_card.png]
"""
import argparse, json, subprocess, sys, unicodedata
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
MOD = ROOT / 'render/src/scenes/t2/lyric/cuneiform.js'
FONT = ROOT / 'render/assets/fonts/NotoSansCuneiform-t2-subset.ttf'
LATIN = ROOT / 'render/assets/fonts/IBMPlexMono-Regular.ttf'

WORDS = {'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9}


def sign_value(cp):
    """Value of one numeral sign, from its Unicode name only."""
    name = unicodedata.name(chr(cp))
    if name == 'CUNEIFORM SIGN DISH':
        return 1
    if name == 'CUNEIFORM SIGN MIN':
        return 2
    if name.startswith('CUNEIFORM SIGN U') and set(name[len('CUNEIFORM SIGN '):].split()) == {'U'}:
        return 10 * len(name[len('CUNEIFORM SIGN '):].split())
    if name.startswith('CUNEIFORM NUMERIC SIGN '):
        w = name[len('CUNEIFORM NUMERIC SIGN '):].split()
        if len(w) == 2 and w[0] in WORDS and w[1] == 'DISH':
            return WORDS[w[0]]
        if len(w) == 2 and w[0] in WORDS and w[1] == 'U':
            return 10 * WORDS[w[0]]
    raise ValueError(f'not a sexagesimal numeral sign: U+{cp:X} {name}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'work/t2/tablet/cuneiform_card.png'))
    a = ap.parse_args()
    js = ("import('%s').then((m) => console.log(JSON.stringify({fib: m.FIB, nums: m.FIB.map(m.cuneiformNumber), nanni: m.NANNI})))"
          % MOD.as_uri())
    data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], text=True))
    cmap = TTFont(str(FONT)).getBestCmap()
    rows, ok = [], True
    for n, places in zip(data['fib'], data['nums']):
        vals = [sum(sign_value(cp) for cp in place) for place in places]
        got = 0
        for v in vals:
            if not 0 < v < 60:
                ok = False
            got = got * 60 + v
        names = ' | '.join(' + '.join(unicodedata.name(chr(cp)).replace('CUNEIFORM ', '') for cp in place) for place in places)
        glyphs = [[cmap.get(cp) for cp in place] for place in places]
        good = got == n and all(g for p in glyphs for g in p)
        ok &= good
        print(f'{n:3d} = {";".join(map(str, vals)):>5}  {" ".join("".join(map(chr, p)) for p in places):<6} {names}   glyphs {glyphs}  {"OK" if good else "MISMATCH"}')
        rows.append((n, places, vals, names, good))
    print('Nanni line:', data['nanni']['src'], '|', data['nanni']['translit'])
    for v, cp in data['nanni']['signs']:
        print(f'   {v:3s} U+{cp:X} {chr(cp)} {unicodedata.name(chr(cp))}  glyph {cmap.get(cp)}')
        ok &= bool(cmap.get(cp))

    # the card
    W, H = 1920, 1080
    im = Image.new('RGB', (W, H), (238, 226, 204))
    d = ImageDraw.Draw(im)
    fc = ImageFont.truetype(str(FONT), 54)
    fl = ImageFont.truetype(str(LATIN), 22)
    fls = ImageFont.truetype(str(LATIN), 17)
    d.text((60, 30), 'V113 tablet: Fibonacci in sexagesimal cuneiform (values read back from the Unicode names)', font=fl, fill=(40, 24, 10))
    y = 90
    for n, places, vals, names, good in rows:
        d.text((60, y + 18), f'{n:>3}', font=fl, fill=(40, 24, 10))
        d.text((130, y + 18), ';'.join(map(str, vals)), font=fl, fill=(110, 80, 50))
        x = 230
        for p in places:
            s = ''.join(map(chr, p))
            d.text((x, y + 42), s, font=fc, fill=(30, 18, 8), anchor='ls')
            x += int(d.textlength(s, font=fc)) + 34
        d.text((560, y + 22), names, font=fls, fill=(40, 24, 10))
        d.text((1800, y + 18), 'OK' if good else 'BAD', font=fl, fill=(20, 120, 40) if good else (200, 20, 20))
        y += 74
    nn = data['nanni']
    d.text((60, y + 20), nn['src'] + ':  ' + nn['translit'], font=fl, fill=(40, 24, 10))
    x = 760
    for v, cp in nn['signs']:
        d.text((x, y + 44), chr(cp), font=fc, fill=(30, 18, 8), anchor='ls')
        d.text((x, y + 70), v, font=fls, fill=(110, 80, 50))
        x += int(d.textlength(chr(cp), font=fc)) + 22
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    im.save(a.out)
    print('card ->', a.out, '| all OK' if ok else '| FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
