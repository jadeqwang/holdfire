#!/usr/bin/env python3
"""Validate the YouTube subtitles against the English master and the final cut: deliverables/subtitles/hold_fire.<lang>.srt.

Hard checks (FAIL): strict UTF-8 with no BOM or CR, SubRip block structure, cue numbers 1..n, cue count and timestamps equal to the en
master byte for byte, start < end, no cue overlapping the next, the last cue inside the media, no empty cue, at most 2 lines, no leftover
English (any Latin letter in ar, hi, ru, uk, zh; a list of English words in es, fr, id, pt-BR; a whole cue left the same as the master),
no mojibake or stray control characters, Simplified characters in zh-Hant, a repeated English line translated two ways, ASCII comma
or semicolon in ar, a missing RLM in ar, the en master not matching what subtitles.py makes from render/data/timing.json.

Soft checks (WARN): a line over 42 characters (20 for Chinese; combining marks not counted).

    python3 tools/t2/check_subtitles.py [--media work/out/hold_fire_t2_master_minor_fixes.mp4] [--shipped DIR]

--shipped also checks that DIR/hold-fire.<lang>.srt are byte-identical copies. Exit code 1 if anything failed.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import subtitles  # noqa: E402

DIR = os.path.join(ROOT, 'deliverables', 'subtitles')
LANGS = list(subtitles.LANGS.values())
LATIN = ('es', 'fr', 'id', 'pt-BR')
TS = re.compile(r'^(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)$')
ENGLISH = set("""the and with you your our we're i'm of that this they their its fire light count counting hold every star dark night
hand hunter hunters fear chain link links world worlds alone never always there here what when who were was""".split())   # none is a word in es, fr, id, pt
SIMPLIFIED = set('们这个时为对过发经来说见开关门问间听现认让语读车转边还进远运连钱铁长风飞鱼鸟龙层环锁链卫弹烟雾于后里着虽与从将实种样无尘护闪图数规则结终获猎')
MOJI = re.compile(r'[ÃÂÐÑØÙåæç][\x80-\xbf]|â€|à¤|ä¸|\ufffd|[\x80-\x9f]')


def secs(m, k):
    return int(m[k]) * 3600 + int(m[k + 1]) * 60 + int(m[k + 2]) + int(m[k + 3]) / 1000


def parse(path, fail):
    """[(number, time line, [text lines])]"""
    raw = open(path, 'rb').read()
    try:
        s = raw.decode('utf-8')
    except UnicodeDecodeError as e:
        fail(f'not UTF-8: {e}')
        return []
    if s.startswith('﻿'):
        fail('BOM')
    if '\r' in s:
        fail('CR line ends')
    cues = []
    for b in s.strip('\n').split('\n\n'):
        ls = b.split('\n')
        if len(ls) < 2 or not ls[0].isdigit() or not TS.match(ls[1]):
            fail(f'bad block: {b[:50]!r}')
            continue
        cues.append((int(ls[0]), ls[1], ls[2:]))
    return cues


def width(l):
    return sum(1 for c in l if not unicodedata.category(c).startswith('M') and c != subtitles.RLM)


def check(lang, cues, master, duration, fail, warn):
    if len(cues) != len(master):
        fail(f'{len(cues)} cues, master has {len(master)}')
    prev = 0
    for i, (n, t, tx) in enumerate(cues):
        if n != i + 1:
            fail(f'cue {i + 1} numbered {n}')
        if i < len(master) and t != master[i][1]:
            fail(f'cue {n} time differs from master: {t}')
        m = TS.match(t)
        a, b = secs(m, 1), secs(m, 5)
        if not a < b:
            fail(f'cue {n} start >= end')
        if a < prev:
            fail(f'cue {n} starts before the last cue ended')
        prev = b
        if not tx or not any(l.strip(subtitles.RLM + ' ') for l in tx):
            fail(f'cue {n} empty')
        if len(tx) > 2:
            fail(f'cue {n} has {len(tx)} lines')
        joined = ' '.join(tx)
        if MOJI.search(joined) and lang not in LATIN:
            fail(f'cue {n} mojibake: {joined!r}')
        if lang in LATIN and re.search(r'Ã.|Â.|â€|�|[\x80-\x9f]', joined):
            fail(f'cue {n} mojibake: {joined!r}')
        if any(unicodedata.category(c) in ('Co', 'Cn', 'Cs') for c in joined):
            fail(f'cue {n} private or unassigned character')
        for l in tx:
            lim = 20 if lang.startswith('zh') else 42
            if width(l) > lim:
                warn(f'cue {n} line {width(l)} wide: {l}')
        if lang == 'en':
            continue
        if lang in ('ar', 'hi', 'ru', 'uk', 'zh-Hans', 'zh-Hant') and re.search('[A-Za-z]', joined):
            fail(f'cue {n} Latin letters: {joined}')
        if lang in LATIN:
            words = re.findall(r"[a-zà-ÿ'’-]+", joined.lower())
            hit = [w for w in words if w in ENGLISH]
            if hit:
                fail(f'cue {n} English word {hit}: {joined}')
            if i < len(master) and joined == ' '.join(master[i][2]):
                fail(f'cue {n} same as master: {joined}')
        if lang == 'zh-Hant':
            bad = [c for c in joined if c in SIMPLIFIED]
            if bad:
                fail(f'cue {n} Simplified characters {bad}: {joined}')
        if lang == 'ar':
            if re.search(r'[,;?]', joined):
                fail(f'cue {n} ASCII punctuation: {joined}')
            for l in tx:
                if unicodedata.category(l.rstrip(subtitles.RLM)[-1])[0] not in 'LMN' and not l.endswith(subtitles.RLM):
                    fail(f'cue {n} no RLM at the end: {l}')
                body = l.lstrip(subtitles.RLM)
                if unicodedata.category(body[0])[0] not in 'LM' and not l.startswith(subtitles.RLM):
                    fail(f'cue {n} no RLM at the start: {l}')
    if prev > duration:
        fail(f'last cue ends at {prev}, media is {duration}')
    seen = {}
    for c, m in zip(cues, master):
        k, v = ' '.join(m[2]), ' '.join(c[2])
        if lang != 'en' and seen.setdefault(k, v) != v:
            fail(f'cue {c[0]} repeats "{k}" as a different translation')


def timed_master(master, fail):
    """en timestamps against render/data/timing.json, by subtitles.py's own rule."""
    T = json.load(open(os.path.join(ROOT, 'render', 'data', 'timing.json')))
    lines = sorted(T['lines'], key=lambda l: l['words'][0]['start'])
    if len(lines) != len(master):
        fail(f'timing.json has {len(lines)} lines, master {len(master)} cues')
        return
    for i, l in enumerate(lines):
        t0, t1 = l['words'][0]['start'], l['words'][-1]['end'] + subtitles.HOLD
        nxt = lines[i + 1]['words'][0]['start'] - subtitles.GAP if i + 1 < len(lines) else T['audio']['duration_s']
        t1 = min(max(t1, t0 + subtitles.MIN), nxt)
        if master[i][1] != f'{subtitles.ts(t0)} --> {subtitles.ts(t1)}':
            fail(f'cue {i + 1} is not on timing.json: {master[i][1]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--media', default=os.path.join(ROOT, 'work', 'out', 'hold_fire_t2_master_minor_fixes.mp4'))
    ap.add_argument('--shipped')
    a = ap.parse_args()
    duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.media]))
    print(f'media {os.path.relpath(a.media, ROOT)}: {duration:.3f} s')
    bad = 0
    nofail = lambda m: None
    master = parse(os.path.join(DIR, 'hold_fire.en.srt'), nofail)
    for lang in LANGS:
        fails, warns = [], []
        p = os.path.join(DIR, f'hold_fire.{lang}.srt')
        cues = parse(p, fails.append)
        if lang == 'en':
            timed_master(master, fails.append)
        check(lang, cues, master, duration, fails.append, warns.append)
        rlm = open(p, encoding='utf-8').read().count(subtitles.RLM)
        if a.shipped:
            q = os.path.join(a.shipped, f'hold-fire.{lang}.srt')
            if not os.path.exists(q) or open(q, 'rb').read() != open(p, 'rb').read():
                fails.append(f'shipped copy differs or missing: {q}')
        print(f'{lang:8s} {"FAIL" if fails else "ok":4s} {len(cues)} cues, {len(fails)} failed, {len(warns)} long lines'
              + (f', {rlm} RLM' if rlm else '') + (', copy identical' if a.shipped and not fails else ''))
        for m in fails + warns:
            print('    ' + m)
        bad += len(fails)
    print('FAILED' if bad else 'all hard checks passed')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
