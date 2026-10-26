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
LOWCONF = {61: [1, 2, 3, 4], 71: [0, 1, 2, 3], 69: [], 1: []}   # word indices with low timing confidence (see overrides.json notes)
VO = json.load(open(os.path.join(W, 'audio/voices.json')))['lines'] if os.path.exists(os.path.join(W, 'audio/voices.json')) else {}
VL = json.load(open(os.path.join(W, 'audio/verify_lines.json'))) if os.path.exists(os.path.join(W, 'audio/verify_lines.json')) else {}
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
NOTES = {
 'Intro': 'Pad fade-in, piano + sub swells; whispered count #1 2.80-6.9 (one whisper per beat), 16th perc roll + sub riser 7.0-7.97 into bar 4, count #2 8.60-11.4. Intro piano hits sit on the 8th off-beats of the grid (see tempo notes).',
 'Verse 1': 'Breathy close-mic lead, sparse 808/snare (first snare 16.99). Vocal pickup "Out" at 13.05.',
 'Pre-Chorus 1': 'Stacked vocals from bar 13; "Snowflake" enters 32.69 after the held "flood"; "awake" held 47.7-51.6.',
 'Chorus 1': 'Full stacked choir + belted lead, hard drums. Pickup "Can\'t" 51.70.',
 'Post-Chorus 1': 'Gang shouts One!One!Two!Three!Five! + Counting on you! twice (no Eight!).',
 'Verse 2': 'Second, harder lead over full trap drums. Pickup "Priests" 82.55.',
 'Pre-Chorus 2': 'Shorter (4 bars). "you" held into the chorus.',
 'Chorus 2': 'Same phrasing as Chorus 1 (word positions agree to +-0.25 beat).',
 'Post-Chorus 2': 'Same as Post-Chorus 1, twice, no Eight!.',
 'Bridge': 'Drums/808s out 143.6-153.69 (bars 57-60: the near-silence; vocal sung softly, centred), drums back on bar 61 under "But fear\'s a chain".',
 'Build': 'Full drums, choir rising (stacked from bar 65); "Hold your fire / Show your light" sustained choir 175.06 and 180.09; 16th snare/808 roll 180.80-183.94.',
 'Drop': 'Bars 73-74 (183.94-188.35) drums-out break with held pad under "Couldn\'t be sure..."; DROP IMPACT 188.355 (bar 74 beat 4), full 808 groove from bar 75 (188.99). Gang numbers Thirteen/Twenty-one/Thirty-four 194.0-195.3, Fifty-five/Eighty-nine 201.56-202.26.',
 'Outro': 'Drums stop 214.175; near-silences between phrases 218-223 (bars 86-88); drums + 808 slam back at bar 89 (224.33) under whispered count, "The count goes higher" (227.79), count again, "Hold your fire" (233.17); drums cut 234.3; held vocal + piano decay; last whisper "Hold your fire" 242.08-243.9; FINAL HIT 244.05 (bar 96 beat 4), 808 tail to 246.4.'}
PARTS = {
 'Intro': [('Intro A - piano + whispered count #1', 0.0, 4), ('Intro B - perc roll into count #2', 4, 6)],
 'Bridge': [('Bridge A - drums out (near silence)', 57, 61), ('Bridge B - drums back', 61, 65)],
 'Drop': [('Drop A - drums-out break before the impact', 73, None), ('Drop B - full drop from the 188.355 impact', None, 85)],
 'Outro': [('Outro A - drums out, sparse', 85, 89), ('Outro B - drums back: counts, "The count goes higher", "Hold your fire"', 89, 93),
           ('Outro C - drums cut, decay, last whisper', 93, None), ('Outro D - final hit + tail', None, None)]}
SPECIAL = {('Drop', 0, 'end'): 188.355, ('Drop', 1, 'start'): 188.355, ('Outro', 2, 'end'): 244.05, ('Outro', 3, 'start'): 244.05, ('Outro', 3, 'end'): DUR}
sec_out = []
for k, (name, key, sb) in enumerate(SECTIONS):
    st = 0.0 if sb is None else bar_t(sb)
    nb = SECTIONS[k + 1][2] if k + 1 < len(SECTIONS) else None
    en = bar_t(nb) if nb else DUR
    tag = next(c['tag'] for c in lyrics.canon() if c['section'] == key)
    rec = dict(name=name, tag=tag, start=r3(st), end=r3(en), start_bar=sb or 1, end_bar=(nb - 1) if nb else int(len(bars)),
               start_on_bar_line=sb is not None, notes=NOTES[name])
    if name in PARTS:
        rec['parts'] = []
        for pi, (pn, a, b) in enumerate(PARTS[name]):
            ps = SPECIAL.get((name, pi, 'start'), 0.0 if a == 0.0 else (bar_t(a) if a else None))
            pe = SPECIAL.get((name, pi, 'end'), bar_t(b) if b else None)
            rec['parts'].append(dict(name=pn, start=r3(ps), end=r3(pe)))
    sec_out.append(rec)
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
        fl = w.get('flags') or []
        sp = max([float(x[len('ctc_spread'):]) for x in fl if x.startswith('ctc_spread')] or [0])
        conf = None
        if l['id'] in LOWCONF and k in LOWCONF[l['id']]: conf = 'low'
        elif 'manual_start' in fl: conf = 'medium'
        elif sp > 0.5 and not any(x.startswith('parakeet') for x in fl): conf = 'low'
        elif sp > 0.2 or any(x.startswith('parakeet_diff') for x in fl): conf = 'medium'
        if conf: d['conf'] = conf
        if k in l.get('extra', []): d['extra'] = True
        words.append(d)
    n_in = per_section.get(l['section'], 0); per_section[l['section']] = n_in + 1
    rec = dict(n=l['id'], section=l['section'], idx=l['cidx'], line_in_section=n_in, text=l['text'], kind=l['kind'],
               voice=VO.get(str(l['id']), {}).get('voice', 'choir' if l['kind'] == 'gang' else VOICE_DEFAULT[l['section']]),
               voice_conf=VO.get(str(l['id']), {}).get('voice_conf', 'assumed'),
               delivery=('whispered' if l['kind'] == 'whisper' or (VO.get(str(l['id']), {}).get('voiced') or 1) < 0.35 else
                         'shouted' if l['kind'] == 'gang' and l['cidx'] not in (52, 53) else 'sung'),
               repeat=l['repeat'], start=words[0]['start'], end=words[-1]['end'], **barpos(words[0]['start']), words=words)
    if l['unsung']: rec['unsung_words'] = l['unsung']
    if l['note']: rec['note'] = l['note']
    if str(l['id']) in VL:
        v_ = VL[str(l['id'])]; rec['verify'] = dict(whisper=v_['whisper'], parakeet=v_['parakeet'], match=v_['match'])
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
    status=STATUS + (' - verified (see analysis/timing.md "Verification"); per-word confidence in words[].conf where not high'
                     if STATUS == 'final' else ' - fused + onset-snapped word times, verification in progress'),
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
