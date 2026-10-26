"""analysis/timing.md: human-readable tables + verification report, generated from analysis/timing.json and the work/audio/*
verification outputs (verify_lines.json, spotcheck.json, words.json)."""
import json, os
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); W = os.path.join(ROOT, 'work'); AN = os.path.join(ROOT, 'analysis')
TJ = json.load(open(os.path.join(AN, 'timing.json')))
def mm(t): return '-' if t is None else f'{int(t // 60)}:{t % 60:05.2f}'
beats = np.array(TJ['beats'])
def bpos(t):
    i = np.searchsorted(beats, t) - 1; return i + (t - beats[i]) / (beats[i + 1] - beats[i])
L = {l['n']: l for l in TJ['lines']}
# chorus 1 vs 2 and post-chorus repeats: bar-relative agreement
def rep_stats(A, B, shift):
    d = []
    for la, lb in zip(A, B):
        for wa, wb in zip(L[la]['words'], L[lb]['words']):
            d.append((bpos(wb['start']) - bpos(wa['start']) - shift) * float(np.median(np.diff(beats))) * 1000)
    d = np.abs(np.array(d)); return len(d), np.median(d), np.percentile(d, 90), d.max(), np.mean(d < 60) * 100
ch = rep_stats(list(range(12, 18)), list(range(34, 40)), 96)
pc = rep_stats([18, 19, 20, 21], [40, 41, 42, 43], 96)
VL = json.load(open(os.path.join(W, 'audio/verify_lines.json')))
mt = np.array([v['match'] for v in VL.values()])
SP = json.load(open(os.path.join(W, 'audio/spotcheck.json')))['summary']
WD = json.load(open(os.path.join(W, 'audio/words.json')))
nw = sum(len(l['words']) for l in WD)
snapped = sum(1 for l in WD for w in l['words'] if 'no_onset' not in w['flags'])
manual = sum(1 for l in WD for w in l['words'] if 'manual_start' in w['flags'])
fric = sum(1 for l in WD for w in l['words'] if any(f.startswith('fricative') for f in w['flags']))
conf = {}
for l in TJ['lines']:
    for w in l['words']: conf[w.get('conf', 'high')] = conf.get(w.get('conf', 'high'), 0) + 1
st = TJ['tempo']
o = []
o.append('# Hold Fire - timing map\n')
o.append(f"Source: `inputs/Hold Fire.mp3` (48 kHz stereo, {TJ['audio']['duration_s']:.2f} s decoded). Times are seconds from the first "
         "decoded sample (mm:ss.ss below). The MP3 carries LAME gapless info: ffmpeg/browsers trim the 1105-sample encoder delay "
         "(ffprobe `start_time` 0.023 s); a player that ignores it would be 23 ms late. Status: **" + TJ['status'].split(' - ')[0] + "**.\n")
o.append('Machine-readable: `analysis/timing.json` (sections, beats, bars, lines/words, hits, events, deviations) and `analysis/audio.json` '
         '(24 fps features, kick/snare onsets). Stems: `work/stems/vocals.wav` / `inst.wav` (BS-RoFormer, 48 kHz, null to the mix).\n')
o.append('## Tempo and grid\n')
o.append(f"- **Grid: 4/4 at a quarter-note beat of ~{st['bpm_mean']:.1f} BPM (range {st['bpm_range'][0]:.1f}-{st['bpm_range'][1]:.1f}), half-time feel**: "
         "808/kick on beat 1, snare/clap on beat 3 (snare hits: beat 3 is the most common position), hats and 808 rolls in 8ths/16ths. "
         "The \"~180\" level is the 8th-note subdivision, not the beat. Suno's \"~90 bpm half-time\" is right in feel; the grid is ~93-95.5.")
o.append(f"- **Tempo drifts (do not cut on a fixed BPM)**: {st['drift']} A constant {st['constant_fit_bpm']:.2f} BPM grid is off by up to "
         f"{st['constant_fit_max_err_ms']:.0f} ms. A degree-4 polynomial in beat index (rare-earth style, `tempo.poly4.coef`) stays within "
         f"{st['poly4']['max_err_ms']:.0f} ms (rms {st['poly4']['rms_err_ms']:.0f} ms) of the beat list; `beats[]` (smoothing spline) is authoritative.")
o.append(f"- Bar 1 beat 1 = {beats[0]:.3f} s; {len(TJ['bars'])} bars; sections start on bar lines (vocal pickups noted). Beat fit: "
         f"{st['fit']['anchors']} drum/instrument onsets anchored, residual rms {st['fit']['anchor_resid_rms_ms']:.1f} ms (p95 "
         f"{st['fit']['anchor_resid_p95_ms']:.1f} ms); 97 % of detected kicks/snares sit within 25 ms of a 16th of the grid (median 2-3 ms).")
o.append(f"- **Intro caveat (0-13.1 s, no drums)**: the grid there is the verse grid extrapolated back at constant tempo (a comb fit of the "
         "intro gives the same 0.6455 s period). The whispered count lands ON these beats (-40..-60 ms, -120 ms for 'five'), but the intro "
         "piano/percussion hits sit exactly on the 8th OFF-beats (+0.32 s). If you cut the intro to the piano, use `eighths[]`. "
         "Interpretation alternative: the intro pulse is the piano and there is a half-beat shift at ~12.2-13.1 s; we kept one continuous grid.\n")
o.append('Tempo curve (every 4 bars):\n')
o.append('| bar | ' + ' | '.join(str(c['bar']) for c in st['curve_per_4_bars']) + ' |')
o.append('|---|' + '---|' * len(st['curve_per_4_bars']))
o.append('| BPM | ' + ' | '.join(f"{c['bpm']:.1f}" for c in st['curve_per_4_bars']) + ' |\n')
o.append('## Sections\n')
o.append('| # | Section | Tag | Start | End | Bars | Notes |')
o.append('|---|---|---|---|---|---|---|')
for i, s in enumerate(TJ['sections']):
    o.append(f"| {i + 1} | **{s['name']}** | {s['tag']} | {mm(s['start'])} | {mm(s['end'])} | {s['start_bar']}-{s['end_bar']} | {s['notes']} |")
o.append('\nSub-parts (cut points):\n')
for s in TJ['sections']:
    for p in s.get('parts', []): o.append(f"- {s['name']}: {p['name']} - {mm(p['start'])} to {mm(p['end'])}")
o.append('\n## Count hits (big visual hits)\n')
o.append('`t` = word onset (consonant), `attack` = loud vowel attack (use this for flashes on "Three!"/"Five!"), offset = vs nearest beat.\n')
H = {}
for h in TJ['hits']: H.setdefault(h['kind'], []).append(h)
for key, title in (('post_chorus_1', 'Post-Chorus 1'), ('post_chorus_2', 'Post-Chorus 2'), ('drop_counts', 'Drop numbers'),
                   ('counting_on_you', '"Counting on you!" shouts'), ('intro_whisper', 'Intro whispers'), ('outro_whisper', 'Outro whispers')):
    o.append(f"**{title}**: " + ', '.join(f"{h['word']} {h['t']:.3f}" + (f"/{h['t_attack']:.3f}" if abs(h['t_attack'] - h['t']) > 0.015 else '') +
                                       f" ({h['bar']}.{h['beat']} {h['off_ms']:+d}ms)" for h in H[key]) + '\n')
o.append('## Key events\n')
o.append('| Time | Bar / beat | Type | Event |')
o.append('|---|---|---|---|')
for e in TJ['events']:
    o.append(f"| {mm(e['t'])} | {e['bar']} / {e['beat']:.2f} | {e['type']} | {e['desc']}" + (f" (until {mm(e['until'])})" if e.get('until') else '') + ' |')
o.append('\n## Sung vs canonical lyrics\n')
for d in TJ['deviations']:
    o.append(f"- **{d['where']}**" + (f" ({mm(d['t'])})" if d.get('t') else '') + f": canonical `{d['canonical']}` -> {d['sung']}. *Confidence: {d['confidence']}.*")
o.append('\nIn `lines[]` every canonical line appears in order; sung repeats are extra entries with `repeat: true`; canonical words that are not '
         'sung are listed in `unsung_words` (not in `words`), sung extras carry `extra: true`.\n')
o.append('## Lines\n')
o.append('| n | Section | idx | Line | Start | End | Bar/beat | Kind | Voice | Check |')
o.append('|---|---|---|---|---|---|---|---|---|---|')
for l in TJ['lines']:
    v = l.get('verify', {}); flag = ' (repeat)' if l['repeat'] else ''
    o.append(f"| {l['n']} | {l['section']} | {l['idx']} | {l['text']}{flag} | {mm(l['start'])} | {mm(l['end'])} | {l['bar']}/{l['beat']:.2f} | "
             f"{l['kind']}/{l['delivery']} | {l['voice']} ({l['voice_conf']}) | {v.get('match', '-')} |")
o.append('\n### Word timings (start-end s; * = medium, ** = low confidence)\n')
for l in TJ['lines']:
    o.append(f"- **{l['n']}. {l['text']}**" + (' (repeat)' if l['repeat'] else '') + ' - ' + ', '.join(
        f"{w['w']} {w['start']:.2f}-{w['end']:.2f}" + {'medium': '*', 'low': '**'}.get(w.get('conf'), '') for w in l['words']))
o.append('\n## Uncertainties (read before keying anything to these)\n')
o.append('- **Drop "but you were. You were counting too" (188.7-191.5)**: the four words after "but" have LOW timing confidence (CTC runs '
         'disagree by up to 2 s in the stacked vocals); placed on the voiced segments of the pitch track. All ASR systems hear "you are".')
o.append('- **Outro whispered count #2 (230.0-232.0)** is layered under the held "higher": times are the four whisper bursts, word identity '
         'unverifiable (ASR cannot read it). Count #1 (225.56-227.48) times are clear; word order unconfirmed (see deviations).')
o.append('- **Intro whispers**: times are certain (isolated bursts); which word each burst is rests on isolated-syllable ASR (see deviations).')
o.append('- **Chorus / Build / Drop stacked vocals**: word starts inside held, layered phrases ("Counting on you", "but if you are", '
         '"Show your light") can be off by 0.1-0.2 s; line starts are reliable. Chorus 1 vs 2 agree bar-relatively (below), a good sign.')
o.append('- **Word starts are vowel/syllable onsets**; the earliest consonant energy is typically 20-40 ms earlier (spot-check bias). '
         'For lip-sync visemes lead by ~1 frame at 24 fps.')
o.append('- **Voices** (`voice`) are inferred, not known: 2-means clustering of pitch / breathiness / loudness per line, seeded with Verse 1 '
         '(tag "breathy") = A_breathy and Chorus 1 = B_belt; `both` = belted lead with a wide stack (side/mid > -8 dB). It agrees with the tags '
         '(Verse 1 A, Verse 2 "second voice" B, choruses B/both, Bridge A then B, Outro A) but treat as a casting suggestion.')
o.append('- **Intro grid phase** (see Tempo). Section ends at the song start/end are the file bounds.\n')
o.append('## Verification (how this was checked)\n')
o.append(f"1. **Three independent timing sources per word.** (a) CTC forced alignment of the known text (NVIDIA NeMo conformer-CTC-large, "
         "our own Viterbi) - global pass over the whole song + local pass per line, on two different vocal separations (BS-RoFormer, "
         "Kim_Vocal_2) = 4 estimates; (b) parakeet-tdt-0.6b-v2 ASR word times; (c) Whisper large-v3-turbo (Workers AI) word times on 24 s "
         "windows, with and without a lyric prompt. CTC median is primary; ASR arbitrates when the CTC runs spread > 0.2 s.")
o.append(f"2. **Onset snap.** Each start is snapped to a syllable onset of the vocal stems (backtracked spectral-flux onset, pyin voicing "
         f"start/pitch jump, high-band rise) within -120/+80 ms: {snapped}/{nw} words snapped; {fric} fricative-initial words moved to the "
         f"start of their high-band plateau; {manual} starts set by hand from the plots (each with a reason in `tools/audio/overrides.json`).")
o.append(f"3. **Per-line re-transcription.** Each line's exact window was re-transcribed (Whisper, no prompt, + parakeet): "
         f"{(mt >= 0.8).sum()}/{len(mt)} lines >= 80 % of their words heard, {((mt >= 0.5) & (mt < 0.8)).sum()} at 50-80 % (hard words: "
         f"Priests, saltpeter, Eighty-three, dead star, are out there), {(mt < 0.5).sum()} below 50 % (the drop 'you were/are' line and the outro "
         f"whispered count #2). Mean {mt.mean():.2f}. Texts are in `lines[].verify`.")
o.append(f"4. **Repeat consistency.** Chorus 1 and Chorus 2 were aligned independently; their word starts agree bar-relatively with "
         f"median {ch[1]:.0f} ms, p90 {ch[2]:.0f} ms, max {ch[3]:.0f} ms over {ch[0]} words ({ch[4]:.0f} % within 60 ms). The four post-chorus "
         f"passes agree with median {pc[1]:.0f} ms (p90 {pc[2]:.0f}); every count shout sits within ~70 ms of its beat.")
o.append(f"5. **Independent acoustic spot-check** on the Kim stem (not the one used for snapping) for {SP['n']} consonant-initial words: "
         f"median |error| {SP['median_abs_ms']:.0f} ms, {SP['within_50ms_pct']:.0f} % within 50 ms, {SP['within_100ms_pct']:.0f} % within 100 ms, "
         f"bias {SP['bias_ms']:+.0f} ms (our starts slightly later than the first consonant energy). The measure itself is noisy in drum-heavy "
         "parts (Kim stem bleed): post-chorus shouts, visually exact, score worst.")
o.append('6. **Visual checks.** `analysis/check_<NN>_<section>_<a..>.png` (<= 11 s panels: vocal-stem spectrogram, vocal RMS, vocal onset, '
         'bar/beat lines, word starts, hit markers) and `check_overview.png` were inspected for every section; the problems found '
         '(intro "three", chorus-2 "if", "Thirteen", outro count #1 shifted by one, drop "you were", "held/fire", "are" not sung) were fixed or flagged.')
o.append('7. **Count shouts** were confirmed by their sharp broadband transients in the vocal stem (5 shouts per pass, beats 2-3-4-1-2) and by '
         'all ASR systems; the missing "Eight!" was checked on all four passes. Intro/outro whispers were transcribed syllable by syllable.')
o.append('8. **Beat grid**: drum-stem onset anchors on 16th positions, spline fit residual above; bar phase from kick/chord-change statistics '
         '(downbeat = strongest kick rise + chord change, snare on beat 3) and confirmed by section-start hits on bar lines.')
o.append('9. **Stems**: BS-RoFormer vocals + instrumental re-sum to the mix at -111 dB (unity gain); vocal stem is ~45 dB cleaner than '
         'Kim_Vocal_2 in vocal-free passages (e.g. the tail: -116 vs -72 dBFS).\n')
o.append('## Regenerate\n')
o.append('`tools/audio/`: stems.py (BS-RoFormer) / vocal_stem_mdx.py (Kim_Vocal_2, KUIELab drums) -> onset_envs.py -> beatgrid.py -> '
         'transcribe_song.py + asr_parakeet.py + ctc_global.py (per stem) -> syllable_onsets.py (per stem) -> fuse.py (+ overrides.json) -> '
         'hits.py, events.py, voices.py -> build_timing.py -> features.py, verify_lines.py, spotcheck.py -> build_md.py, plot_check.py. '
         'Sung script (repeats/omissions): sung.py; canonical parse: lyrics.py. Models in work/models (UVR GitHub release, k2-fsa sherpa-onnx '
         'GitHub release). Cloud STT calls (Whisper turbo, gpt-4o-transcribe, grok-stt) are logged to media/genlog.jsonl + docs/spend_ledger.jsonl.\n')
open(os.path.join(AN, 'timing.md'), 'w').write('\n'.join(o) + '\n')
print('wrote analysis/timing.md', len(o), 'lines')
