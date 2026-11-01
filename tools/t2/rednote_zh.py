#!/usr/bin/env python3
"""Rednote version of Hold Fire: Simplified Chinese baked into the picture, by the method of the four shipped Rednote videos
(1-music-shipped/*/rednote/make_ass.py): an .ass file built from the zh-Hans track, placed cue by cue, burned over the master with
ffmpeg's ass filter (libass), Noto Sans CJK SC Medium (OFL), audio copied.

Text and placement: tools/t2/rednote_zh.json (cues by SRT number, on-screen text in "extra"; its "_doc" lists the fields). Wording and
timing: deliverables/subtitles/hold_fire.zh-Hans.srt. The chess board's OUR KING / THEIR DESPOT tags ride on the moving kings: --track
finds them in the master's frames (colour = speaker, width = which words) and writes tools/t2/rednote_zh_tags.json, and each tag's
Chinese is placed beside it frame by frame in the speaker's colour. A new master only needs:

    python3 tools/t2/rednote_zh.py --track --render

Writes work/rednote/hold_fire_zh-Hans.ass, and with --render the MP4 named in the json. Every run stops on a character the font lacks
or a text block off the frame. Other flags: --test START DUR (a short clip in work/rednote/test.mp4), --crf, --out, --check (compare
the output with the master: frames, duration, audio packets).

The master is full-range BT.601 (yuvj420p, bt470bg, the browser capture's matrix); it is converted to limited-range BT.709 and tagged,
as Rewind's and Orbital Sunrise's Rednote files are. Frame times: a shot's first frame is ceil(t * 24), so all times snap to frames.
"""
import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import urllib.request

from fontTools.ttLib import TTCollection, TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA = os.path.join(ROOT, 'tools', 't2', 'rednote_zh.json')
TAGS = os.path.join(ROOT, 'tools', 't2', 'rednote_zh_tags.json')
WORK = os.path.join(ROOT, 'work', 'rednote')
ASS = os.path.join(WORK, 'hold_fire_zh-Hans.ass')
FPS = 24
FONT = 'Noto Sans CJK SC Medium'        # OFL, as the four Rednote videos
FONT_FILE = 'NotoSansCJKsc-Medium.otf'
FONT_URL = 'https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Medium.otf'
FONTSDIR = os.environ.get('REDNOTE_FONTSDIR', os.path.join(WORK, 'fonts'))
VF_COLOR = 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709'
COLOR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']


def frame(t):
    """The first frame shown at or after t."""
    return math.ceil(t * FPS - 1e-6)


def ts(k):
    """ASS time (centiseconds, rounded down) of frame k: libass shows an event from the first frame at or after its start."""
    cs = k * 100 // FPS
    return f'{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}'


def parse_srt(path):
    def sec(s):
        h, m, x = s.strip().split(':')
        return int(h) * 3600 + int(m) * 60 + float(x.replace(',', '.'))
    out = {}
    for block in open(path, encoding='utf-8-sig').read().strip().split('\n\n'):
        ls = block.split('\n')
        a, b = ls[1].split(' --> ')
        out[int(ls[0])] = (sec(a), sec(b), '\n'.join(ls[2:]))
    return out


def event(D, t0, t1, text, x=None, y=None, top=False, style='White', size=None, fade=(60, 60)):
    S = D['style']
    x = 960 if x is None else x
    y = S['default_y'] if y is None else y
    tag = ('{\\an8' if top else '{\\an2') + f'\\pos({x},{y})'
    if not style.endswith('Ink'):
        tag += f"\\blur{S['blur']}"
    if size:
        tag += f'\\fs{size}'
    if fade != (0, 0):
        tag += f'\\fad({fade[0]},{fade[1]})'
    tag += '}'
    k0, k1 = frame(t0), frame(t1)
    line = f"Dialogue: 0,{ts(k0)},{ts(k1)},{style},,0,0,0,,{tag}{text.replace(chr(10), chr(92) + 'N')}"
    return dict(k0=k0, k1=k1, x=x, y=y, top=top, size=size or S['size'], text=text, line=line)


def bake_text(text):
    """The track's ( ) mark backing vocals on a subtitle; off for burn-in, as the Rewind script takes off its track's marks."""
    return text.replace('（', '').replace('）', '')


def build(D):
    cues = parse_srt(os.path.join(ROOT, D['srt']))
    if len(cues) != 74:
        raise SystemExit(f'expected the 74 cues of the zh-Hans track, found {len(cues)}')
    ev, log = [], []
    keys = ('text', 'x', 'y', 'top', 'style', 'size')
    for n, (a, b, text) in sorted(cues.items()):
        o = dict(D['cues'].get(str(n), {}))
        if 'drop' in o:
            log.append(f"cue {n} dropped: {o['drop']}")
            continue
        a, b = o.get('start', a), o.get('end', b)
        text = o.get('text', bake_text(text))
        base = {k: o[k] for k in keys if k in o}
        base.setdefault('text', text)
        segs = o.get('segs') or [{}]
        edges = [a] + [s['at'] for s in segs[1:]] + [b]
        for i, s in enumerate(segs):
            p = {**base, **{k: s[k] for k in keys if k in s}}
            if p.get('text'):
                ev.append(event(D, edges[i], edges[i + 1], fade=(60 if i == 0 else 0, 60 if i == len(segs) - 1 else 0), **p))
    for e in D['extra']:
        ev.append(event(D, e['t0'], e['t1'], e['text'], **{k: e[k] for k in keys if k in e and k != 'text'}))
    ev += tag_events(D)
    ev.sort(key=lambda e: e['k0'])
    S = D['style']
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: White,{FONT},{S['size']},&H00FFFFFF,&H00FFFFFF,{S['white_outline']},&H80000000,0,0,0,0,100,100,1,0,1,{S['outline']},{S['shadow']},2,40,40,44,1
Style: Orange,{FONT},{S['size']},&H002A7AFF,&H002A7AFF,{S['white_outline']},&H80000000,0,0,0,0,100,100,1,0,1,{S['outline']},{S['shadow']},2,40,40,44,1
Style: Teal,{FONT},{S['size']},&H00C5E03F,&H00C5E03F,{S['white_outline']},&H80000000,0,0,0,0,100,100,1,0,1,{S['outline']},{S['shadow']},2,40,40,44,1
Style: OrangeInk,{FONT},{S['size']},&H000A4CD0,&H000A4CD0,&H30F4F2EE,&H00000000,0,0,0,0,100,100,1,0,1,2,0,2,40,40,44,1
Style: TealInk,{FONT},{S['size']},&H00707C08,&H00707C08,&H30F4F2EE,&H00000000,0,0,0,0,100,100,1,0,1,2,0,2,40,40,44,1
Style: Ink,{FONT},{S['size']},&H00181818,&H00181818,&H30F4F2EE,&H00000000,0,0,0,0,100,100,1,0,1,2,0,2,40,40,44,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    return head + '\n'.join(e['line'] for e in ev) + '\n', ev, log


def track(D):
    """The chess tags in the master: plates 75 px high, 210 px wide (OUR KING) or 289 (THEIR DESPOT), in the speaker's colour."""
    import cv2
    import numpy as np
    T = D['tags']
    a, b = frame(T['t0']), frame(T['t1'])
    cap = cv2.VideoCapture(os.path.join(ROOT, D['master']))
    cap.set(cv2.CAP_PROP_POS_FRAMES, a)
    out = []
    for k in range(a, b):
        ok, im = cap.read()
        hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
        H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
        for side, m in (('Orange', (H >= 4) & (H <= 18) & (S > 120) & (V > 140)), ('Teal', (H >= 75) & (H <= 95) & (S > 90) & (V > 130))):
            m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 9), np.uint8))
            m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))   # off the kings' thin coloured rims
            n, _, st, _ = cv2.connectedComponentsWithStats(m)
            for i in range(1, n):
                x, y, w, h, ar = (int(v) for v in st[i])
                if 60 < h < 90 and 195 < w < 310 and ar / (w * h) > 0.8:
                    out.append([k, side, 'king' if w < 250 else 'despot', x + w // 2, y + h // 2, w])
    json.dump(out, open(TAGS, 'w'), separators=(',', ':'))
    print(f'{len(out)} tag positions, frames {a} to {b - 1}:', TAGS)


def tag_events(D):
    """One event per tag per frame. A run is one tag through one shot (a jump means a cut); the Chinese takes the side the tag has room on."""
    T = D['tags']
    runs, ev = {}, []
    for k, side, kind, x, y, w in json.load(open(TAGS)):
        rs = runs.setdefault((side, kind), [])
        p = rs[-1][-1] if rs else None
        if p and k - p[0] <= 10:          # a frame or more the colour test lost (the tag against the king's rim, a flash): filled in
            near = abs(p[1] - x) + abs(p[2] - y) <= 200
            for j in range(p[0] + 1, k):
                u = (j - p[0]) / (k - p[0]) if near else 0
                rs[-1].append((j, round(p[1] + (x - p[1]) * u), round(p[2] + (y - p[2]) * u), p[3]))
            if near:
                rs[-1].append((k, x, y, w))
                continue
        rs.append([(k, x, y, w)])
    em = T['size'] * 0.69
    tw = 5 * em
    for (side, kind), rs in runs.items():
        for r in rs:
            left = max(x + w / 2 for _, x, _, w in r) + 14 + tw > 1904
            for k, x, y, w in r:
                cx = x - w / 2 - 14 - tw / 2 if left else x + w / 2 + 14 + tw / 2
                ev.append(event(D, k / FPS, (k + 1) / FPS, T[kind], x=round(cx), y=round(y + T['size'] / 2), style=side, size=T['size'], fade=(0, 0)))
    return ev


def font_path():
    p = os.path.join(FONTSDIR, FONT_FILE)
    if not os.path.exists(p):
        os.makedirs(FONTSDIR, exist_ok=True)
        print('downloading', FONT_URL)
        urllib.request.urlretrieve(FONT_URL, p)
    return p


def check(ev):
    """Every character in the font; every block inside the frame (an em is size * 0.69: 70 sets a 48 px em)."""
    f = TTFont(font_path(), fontNumber=0)
    cmap = f.getBestCmap()
    chars = {c for e in ev for c in re.sub(r'{[^}]*}', '', e['text']) if c != '\n'}
    missing = sorted(c for c in chars if ord(c) not in cmap)
    if missing:
        raise SystemExit(f'not in {FONT_FILE}: {missing}')
    bad = []
    for e in ev:
        em = e['size'] * 0.69
        for l in re.sub(r'{[^}]*}', '', e['text']).split('\n'):
            w = sum(em * (0.56 if ord(c) < 0x2000 else 1) for c in l)
            if e['x'] - w / 2 < 8 or e['x'] + w / 2 > 1912:
                bad.append(f"{e['k0'] / FPS:.2f} {l} (x {e['x']}, about {w:.0f} px wide)")
    if bad:
        raise SystemExit('off the frame:\n' + '\n'.join(bad))
    print(f'{len(chars)} distinct characters, all in {FONT_FILE}; {len(ev)} events inside the frame')


def render(D, out, crf, preset, clip=None):
    vf = f"{VF_COLOR},ass={ASS}:fontsdir={FONTSDIR}"
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-stats', '-y']
    if clip:
        vf += ',setpts=PTS-STARTPTS'
        cmd += ['-ss', str(clip[0]), '-copyts', '-i', os.path.join(ROOT, D['master']), '-t', str(clip[1]), '-af', 'asetpts=PTS-STARTPTS', '-c:a', 'aac', '-b:a', '192k']
    else:
        cmd += ['-i', os.path.join(ROOT, D['master']), '-map', '0:v:0', '-map', '0:a:0', '-fps_mode', 'passthrough', '-c:a', 'copy']
    cmd += ['-vf', vf, '-c:v', 'libx264', '-preset', preset, '-crf', str(crf), '-pix_fmt', 'yuv420p', *COLOR, '-movflags', '+faststart', out]
    subprocess.run(cmd, check=True)


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-show_entries',
                        'stream=codec_name,profile,width,height,r_frame_rate,nb_read_packets,pix_fmt,color_range,color_space,sample_rate,channels:format=duration,size,bit_rate',
                        '-of', 'json', path], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def audio_md5(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-map', '0:a:0', '-c', 'copy', '-f', 'data', '-'], capture_output=True, check=True)
    return hashlib.md5(r.stdout).hexdigest()


def compare(D, out):
    a, b = probe(os.path.join(ROOT, D['master'])), probe(out)
    for x, y in zip(a['streams'], b['streams']):
        print('master', x)
        print('output', y)
    print('master', a['format'])
    print('output', b['format'])
    same = audio_md5(os.path.join(ROOT, D['master'])) == audio_md5(out)
    print('audio packets', 'identical to the master' if same else 'DIFFER from the master')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--track', action='store_true', help='find the chess tags in the master first')
    p.add_argument('--render', action='store_true', help='also encode the MP4')
    p.add_argument('--check', action='store_true', help='compare the output with the master')
    p.add_argument('--test', nargs=2, type=float, metavar=('START', 'DUR'), help='a test clip in work/rednote/test.mp4')
    p.add_argument('--crf', type=int)
    p.add_argument('--preset')
    p.add_argument('--out')
    a = p.parse_args()
    D = json.load(open(DATA, encoding='utf-8'))
    os.makedirs(WORK, exist_ok=True)
    if a.track:
        track(D)
    ass, ev, log = build(D)
    check(ev)
    open(ASS, 'w', encoding='utf-8').write(ass)
    print('\n'.join(log))
    print('wrote', ASS)
    crf, preset = a.crf or D['encode']['crf'], a.preset or D['encode']['preset']
    out = a.out or D['out']
    if a.test:
        render(D, os.path.join(WORK, 'test.mp4'), 20, 'veryfast', a.test)
    if a.render:
        render(D, out, crf, preset)
    if a.check or a.render:
        compare(D, out)


if __name__ == '__main__':
    main()
