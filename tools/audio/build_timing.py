"""Assemble analysis/timing.json from the grid (work/audio/grid.json), the sung script (tools/audio/sung.py), fused word timings
(work/audio/words.json, from fuse.py; falls back to the raw global CTC alignment work/asr/ctc_<stem>.json for the interim file),
hits/events (work/audio/hits.json, events.json when present) and the hand-placed section table below.
    python3 tools/audio/build_timing.py [--status=interim|final]"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sung, lyrics
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'work'); AN = os.path.join(ROOT, 'analysis')
STATUS = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--status=')), 'final')
DUR = 247.16
# Sections: start bar (bar lines of the grid), from the drum/vocal evidence (timing.md "Sections"). Intro starts at 0.0.
SECTIONS = [  # (name, canonical section key, start_bar)
    ('Intro', 'Intro', None), ('Verse 1', 'Verse 1', 6), ('Pre-Chorus 1', 'Pre-Chorus 1', 13), ('Chorus 1', 'Chorus 1', 21),
    ('Post-Chorus 1', 'Post-Chorus 1', 29), ('Verse 2', 'Verse 2', 33), ('Pre-Chorus 2', 'Pre-Chorus 2', 41),
    ('Chorus 2', 'Chorus 2', 45), ('Post-Chorus 2', 'Post-Chorus 2', 53), ('Bridge', 'Bridge', 57), ('Build', 'Build', 65),
    ('Drop', 'Drop', 73), ('Outro', 'Outro', 85)]
VOICE_DEFAULT = {'Intro': 'A_breathy', 'Verse 1': 'A_breathy', 'Pre-Chorus 1': 'A_breathy', 'Chorus 1': 'B_belt',
                 'Post-Chorus 1': 'choir', 'Verse 2': 'B_belt', 'Pre-Chorus 2': 'B_belt', 'Chorus 2': 'B_belt',
                 'Post-Chorus 2': 'choir', 'Bridge': 'A_breathy', 'Build': 'B_belt', 'Drop': 'B_belt', 'Outro': 'A_breathy'}
def r3(x): return None if x is None else round(float(x), 3)
G = json.load(open(os.path.join(W, 'audio/grid.json')))
beats = np.array(G['beats'])
bars = beats[::4]
def bar_t(b): return float(bars[b - 1])
def barpos(t):
    i = int(np.searchsorted(beats, t, side='right') - 1)
    if i < 0: return dict(bar=0, beat=round(float(1 + (t - beats[0]) / (beats[1] - beats[0]) + 3), 2))
    if i >= len(beats) - 1: per = beats[-1] - beats[-2]
    else: per = beats[i + 1] - beats[i]
    return dict(bar=i // 4 + 1, beat=round(float(i % 4 + 1 + (t - beats[i]) / per), 2))
sec_out = []
for k, (name, key, sb) in enumerate(SECTIONS):
    st = 0.0 if sb is None else bar_t(sb)
    nb = SECTIONS[k + 1][2] if k + 1 < len(SECTIONS) else None
    en = bar_t(nb) if nb else DUR
    tag = next(c['tag'] for c in lyrics.canon() if c['section'] == key)
    sec_out.append(dict(name=name, tag=tag, start=r3(st), end=r3(en), start_bar=sb or 1, end_bar=(nb - 1) if nb else int(len(bars)),
                        start_on_bar_line=sb is not None))
# words
wpath = os.path.join(W, 'audio/words.json')
src = 'fused' if os.path.exists(wpath) else 'ctc'
WD = {l['id']: l for l in json.load(open(wpath if src == 'fused' else os.path.join(W, 'asr/ctc_kim.json')))}
L = sung.build()
lines = []
per_section = {}
for l in L:
    wl = WD[l['id']]['words']
    words = []
    for k, w in enumerate(wl):
        e = w.get('end')
        if src == 'ctc':  # interim: end = next word start
            e = wl[k + 1]['start'] if k + 1 < len(wl) else w['end']
        d = dict(w=w['w'], start=r3(w['start']), end=r3(e))
        for f in ('conf', 'flags'):
            if w.get(f): d[f] = w[f]
        words.append(d)
    n_in = per_section.get(l['section'], 0); per_section[l['section']] = n_in + 1
    rec = dict(n=l['id'], section=l['section'], idx=l['cidx'], line_in_section=n_in, text=l['text'], kind=l['kind'],
               voice=WD[l['id']].get('voice', 'choir' if l['kind'] == 'gang' else VOICE_DEFAULT[l['section']]),
               repeat=l['repeat'], start=words[0]['start'], end=words[-1]['end'], **barpos(words[0]['start']), words=words)
    if l['unsung']: rec['unsung_words'] = l['unsung']
    if l['note']: rec['note'] = l['note']
    for f in ('conf', 'verify', 'voice_conf', 'delivery'):
        if WD[l['id']].get(f) is not None: rec[f] = WD[l['id']][f]
    lines.append(rec)
st = G['stats']
tempo = dict(
    grid='4/4, quarter-note beat; half-time feel (snare/clap on beat 3 of each bar, 808/kick on 1), hats in 8ths/16ths. '
         'The "~180" level is the 8th-note subdivision, not the beat.',
    bpm_mean=st['mean_bpm'], bpm_range=[round(min(G['bpm_local']), 2), round(max(G['bpm_local']), 2)],
    drift='NOT constant: ~93.0 BPM (intro/verse 1) -> 93.3 (chorus 1) -> 94.2-94.6 (verse 2 / chorus 2) -> 95.0-95.5 (bridge, build, drop) '
          '-> 94.6 (outro), ~94.0 at the end. Cut on beats[]/bars[], not on a BPM.',
    constant_fit_bpm=st['constant_fit_bpm'], constant_fit_max_err_ms=st['constant_fit_max_err_ms'],
    poly4=dict(note='t(i) = polyval(coef, i), i = beat index (numpy order, highest power first); smooth approximation of beats[]',
               coef=st['poly4_coef'], max_err_ms=st['poly4_max_err_ms'], rms_err_ms=st['poly4_rms_err_ms']),
    fit=dict(anchors=st['anchors'], anchor_resid_rms_ms=st['anchor_resid_rms_ms'], anchor_resid_p95_ms=st['anchor_resid_p95_ms'],
             first_anchor_s=st['first_anchor_s'], last_anchor_s=st['last_anchor_s']),
    curve_per_4_bars=[dict(bar=b + 1, t=r3(bars[b]), bpm=round(float(60 * 16 / (beats[min(4 * b + 16, len(beats) - 1)] - beats[4 * b]) *
                           (min(4 * b + 16, len(beats) - 1) - 4 * b) / 16), 2)) for b in range(0, len(bars) - 1, 4)])
zones = []
for i, z in enumerate(G['zone']):
    if not zones or zones[-1]['zone'] != z: zones.append(dict(zone=z, from_beat=i, t0=r3(beats[i])))
    zones[-1]['to_beat'] = i; zones[-1]['t1'] = r3(beats[i])
out = dict(
    status=STATUS + ('' if STATUS == 'final' else ' - line/word times from a first-pass global CTC alignment on the Kim_Vocal_2 stem, '
                     'NOT yet onset-snapped or verified; sections/beats/bars are close to final. Will be refined in place.'),
    audio=dict(file='inputs/Hold Fire.mp3', duration_s=DUR, sample_rate=48000, channels=2,
               time_base='seconds from the first decoded sample of the MP3 (ffmpeg/browser decode, LAME encoder delay trimmed; '
                         'ffprobe reports start_time 0.023 s for the stream - players that ignore gapless info are 23 ms late).',
               stems=dict(vocals='work/stems/vocals.wav (BS-RoFormer ep_317, 48 kHz, best for lip-sync refs)',
                          instrumental='work/stems/inst.wav (= mix - vocals, sample-exact)',
                          also=['work/stems/mdx_kim/vocals.wav (Kim_Vocal_2, 44.1 kHz)', 'work/stems/mdx_drums/drums.wav (KUIELab drums, 44.1 kHz)'])),
    tempo=tempo,
    beats=[r3(b) for b in beats],
    beat_zones=zones,
    downbeats=[r3(b) for b in bars],
    bars=[dict(bar=i + 1, t=r3(b), end=r3(bars[i + 1] if i + 1 < len(bars) else DUR)) for i, b in enumerate(bars)],
    eighths=[r3(x) for x in np.sort(np.r_[beats, (beats[:-1] + beats[1:]) / 2])],
    sections=sec_out,
    lines=lines)
for f in ('hits', 'events', 'deviations', 'voices'):
    p = os.path.join(W, f'audio/{f}.json')
    if os.path.exists(p): out[f] = json.load(open(p))
os.makedirs(AN, exist_ok=True)
json.dump(out, open(os.path.join(AN, 'timing.json'), 'w'), indent=1, ensure_ascii=False)
print('wrote analysis/timing.json', STATUS, 'lines', len(lines), 'words', sum(len(l['words']) for l in lines), 'words source', src)
