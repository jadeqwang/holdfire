# Hold Fire - timing map

Source: `inputs/Hold Fire.mp3` (48 kHz stereo, 247.16 s decoded). Times are seconds from the first decoded sample (mm:ss.ss below). The MP3 carries LAME gapless info: ffmpeg/browsers trim the 1105-sample encoder delay (ffprobe `start_time` 0.023 s); a player that ignores it would be 23 ms late. Status: **final**.

Machine-readable: `analysis/timing.json` (sections, beats, bars, lines/words, hits, events, deviations) and `analysis/audio.json` (24 fps features, kick/snare onsets). Stems: `work/stems/vocals.wav` / `inst.wav` (BS-RoFormer, 48 kHz, null to the mix).

## Tempo and grid

- **Grid: 4/4 at a quarter-note beat of ~94.3 BPM (range 92.8-95.6), half-time feel**: 808/kick on beat 1, snare/clap on beat 3 (snare hits: beat 3 is the most common position), hats and 808 rolls in 8ths/16ths. The "~180" level is the 8th-note subdivision, not the beat. Suno's "~90 bpm half-time" is right in feel; the grid is ~93-95.5.
- **Tempo drifts (do not cut on a fixed BPM)**: NOT constant: ~93.0 BPM (intro/verse 1) -> 93.3 (chorus 1) -> 94.2-94.6 (verse 2 / chorus 2) -> 95.0-95.5 (bridge, build, drop) -> 94.6 (outro), ~94.0 at the end. Cut on beats[]/bars[], not on a BPM. A constant 94.42 BPM grid is off by up to 689 ms. A degree-4 polynomial in beat index (rare-earth style, `tempo.poly4.coef`) stays within 49 ms (rms 23 ms) of the beat list; `beats[]` (smoothing spline) is authoritative.
- Bar 1 beat 1 = 0.268 s; 97 bars; sections start on bar lines (vocal pickups noted). Beat fit: 585 drum/instrument onsets anchored, residual rms 7.4 ms (p95 18.6 ms); 97 % of detected kicks/snares sit within 25 ms of a 16th of the grid (median 2-3 ms).
- **Intro caveat (0-13.1 s, no drums)**: the grid there is the verse grid extrapolated back at constant tempo (a comb fit of the intro gives the same 0.6455 s period). The whispered count lands ON these beats (-40..-60 ms, -120 ms for 'five'), but the intro piano/percussion hits sit exactly on the 8th OFF-beats (+0.32 s). If you cut the intro to the piano, use `eighths[]`. Interpretation alternative: the intro pulse is the piano and there is a half-beat shift at ~12.2-13.1 s; we kept one continuous grid.

Tempo curve (every 4 bars):

| bar | 1 | 5 | 9 | 13 | 17 | 21 | 25 | 29 | 33 | 37 | 41 | 45 | 49 | 53 | 57 | 61 | 65 | 69 | 73 | 77 | 81 | 85 | 89 | 93 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BPM | 93.2 | 93.3 | 93.0 | 93.0 | 93.1 | 93.2 | 93.3 | 93.8 | 94.2 | 94.5 | 94.5 | 94.6 | 94.6 | 94.7 | 94.9 | 95.1 | 95.2 | 95.4 | 95.1 | 95.2 | 95.5 | 94.6 | 94.6 | 94.0 |

## Sections

| # | Section | Tag | Start | End | Bars | Notes |
|---|---|---|---|---|---|---|
| 1 | **Intro** | Intro: whispered, piano and sub bass | 0:00.00 | 0:13.14 | 1-5 | Pad fade-in, piano + sub swells; whispered count #1 2.80-6.9 (one whisper per beat), 16th perc roll + sub riser 7.0-7.97 into bar 4, count #2 8.60-11.4. Intro piano hits sit on the 8th off-beats of the grid (see tempo notes). |
| 2 | **Verse 1** | Verse 1: breathy, close-mic | 0:13.14 | 0:31.18 | 6-12 | Breathy close-mic lead, sparse 808/snare (first snare 16.99). Vocal pickup "Out" at 13.05. |
| 3 | **Pre-Chorus 1** | Pre-Chorus: rising | 0:31.18 | 0:51.82 | 13-20 | Stacked vocals from bar 13; "Snowflake" enters 32.69 after the held "flood"; "awake" held 47.7-51.6. |
| 4 | **Chorus 1** | Chorus: full choir, hard drums | 0:51.82 | 1:12.41 | 21-28 | Full stacked choir + belted lead, hard drums. Pickup "Can't" 51.70. |
| 5 | **Post-Chorus 1** | Post-Chorus: drop, gang vocals | 1:12.41 | 1:22.64 | 29-32 | Gang shouts One!One!Two!Three!Five! + Counting on you! twice (no Eight!). |
| 6 | **Verse 2** | Verse 2: second voice, harder | 1:22.64 | 1:43.00 | 33-40 | Second, harder lead over full trap drums. Pickup "Priests" 82.55. |
| 7 | **Pre-Chorus 2** | Pre-Chorus | 1:43.00 | 1:53.15 | 41-44 | Shorter (4 bars). "you" held into the chorus. |
| 8 | **Chorus 2** | Chorus | 1:53.15 | 2:13.45 | 45-52 | Same phrasing as Chorus 1 (word positions agree to +-0.25 beat). |
| 9 | **Post-Chorus 2** | Post-Chorus: drop, gang vocals | 2:13.45 | 2:23.58 | 53-56 | Same as Post-Chorus 1, twice, no Eight!. |
| 10 | **Bridge** | Bridge: near silence, whispered | 2:23.58 | 2:43.79 | 57-64 | Drums/808s out 143.6-153.69 (bars 57-60: the near-silence; vocal sung softly, centred), drums back on bar 61 under "But fear's a chain". |
| 11 | **Build** | Build: snare roll, choir rising | 2:43.79 | 3:03.94 | 65-72 | Full drums, choir rising (stacked from bar 65); "Hold your fire / Show your light" sustained choir 175.06 and 180.09; 16th snare/808 roll 180.80-183.94. |
| 12 | **Drop** | Drop: full orchestra, 808s | 3:03.94 | 3:34.18 | 73-84 | Bars 73-74 (183.94-188.35) drums-out break with held pad under "Couldn't be sure..."; DROP IMPACT 188.355 (bar 74 beat 4), full 808 groove from bar 75 (188.99). Gang numbers Thirteen/Twenty-one/Thirty-four 194.0-195.3, Fifty-five/Eighty-nine 201.56-202.26. |
| 13 | **Outro** | Outro: whispered, piano | 3:34.18 | 4:07.16 | 85-97 | Drums stop 214.175; near-silences between phrases 218-223 (bars 86-88); drums + 808 slam back at bar 89 (224.33) under whispered count, "The count goes higher" (227.79), count again, "Hold your fire" (233.17); drums cut 234.3; held vocal + piano decay; last whisper "Hold your fire" 242.08-243.9; FINAL HIT 244.05 (bar 96 beat 4), 808 tail to 246.4. |

Sub-parts (cut points):

- Intro: Intro A - piano + whispered count #1 - 0:00.00 to 0:07.99
- Intro: Intro B - perc roll into count #2 - 0:07.99 to 0:13.14
- Bridge: Bridge A - drums out (near silence) - 2:23.58 to 2:33.69
- Bridge: Bridge B - drums back - 2:33.69 to 2:43.79
- Drop: Drop A - drums-out break before the impact - 3:03.94 to 3:08.35
- Drop: Drop B - full drop from the 188.355 impact - 3:08.35 to 3:34.18
- Outro: Outro A - drums out, sparse - 3:34.18 to 3:44.32
- Outro: Outro B - drums back: counts, "The count goes higher", "Hold your fire" - 3:44.32 to 3:54.47
- Outro: Outro C - drums cut, decay, last whisper - 3:54.47 to 4:04.05
- Outro: Outro D - final hit + tail - 4:04.05 to 4:07.16

## Count hits (big visual hits)

`t` = word onset (consonant), `attack` = loud vowel attack (use this for flashes on "Three!"/"Five!"), offset = vs nearest beat.

**Post-Chorus 1**: One 73.034 (29.2 -9ms), One 73.670 (29.3 -11ms), Two 74.280 (29.4 -40ms), Three 74.980 (30.1 +21ms), Five 75.585/75.600 (30.2 -14ms), One 78.177 (31.2 +12ms), One 78.815/78.855 (31.3 +8ms), Two 79.390 (31.4 -58ms), Three 80.100 (32.1 +11ms), Five 80.725 (32.2 -4ms)

**Post-Chorus 2**: One 134.055 (53.2 -26ms), One 134.655 (53.3 -60ms), Two 135.285 (53.4 -64ms), Three 135.890/135.930 (54.1 -93ms), Five 136.595 (54.2 -22ms), One 139.109/139.130 (55.2 -41ms), One 139.715/139.735 (55.3 -69ms), Two 140.360 (55.4 -57ms), Three 141.015 (56.1 -35ms), Five 141.670 (56.2 -13ms)

**Drop numbers**: Thirteen 194.010/194.095 (77.1 -31ms), Twenty-one 194.615/194.695 (77.2 -57ms), Thirty-four 195.270 (77.3 -34ms), Fifty-five 201.560/201.580 (80.1 -49ms), Eighty-nine 202.255 (80.2 +17ms)

**"Counting on you!" shouts**: Counting on you 76.235 (30.3 -5ms), Counting on you 81.345 (32.3 -23ms), Counting on you 137.160 (54.3 -90ms), Counting on you 142.190/142.210 (56.3 -126ms)

**Intro whispers**: One 2.799/2.780 (2.1 -44ms), one 3.437/3.415 (2.2 -50ms), two 4.076 (2.3 -55ms), three 4.719/4.735 (2.4 -56ms), five 5.298 (3.1 -121ms), eight 6.001/6.025 (3.2 -62ms), eight 6.630/6.655 (3.3 -76ms), One 8.600/8.580 (4.2 -38ms), two 9.234 (4.3 -48ms), three 9.860/9.900 (4.4 -66ms), five 10.435/10.410 (5.1 -135ms), eight 11.165/11.185 (5.2 -49ms), (yeah) 11.510/11.530 (5.2 +296ms)

**Outro whispers**: One 225.560 (89.3 -35ms), one 226.200 (89.4 -30ms), two 226.790/226.820 (90.1 -74ms), three 227.480 (90.2 -19ms), One 230.042/230.130 (91.2 +7ms), one 230.601/230.705 (91.3 -68ms), two 231.269 (91.4 -34ms), three 231.888/231.950 (92.1 -49ms)

## Key events

| Time | Bar / beat | Type | Event |
|---|---|---|---|
| 0:00.00 | 1 / 0.58 | start | file start: pad fade-in (mix below -40 dBFS until 0.92 s) |
| 0:00.20 | 1 / 0.89 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 0:02.80 | 1 / 4.93 | vocal | first vocal: whispered "One..." |
| 0:07.16 | 3 / 3.70 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 0:13.14 | 5 / 4.99 | impact | sub/808 slide on the Verse 1 downbeat (bar 6) |
| 0:13.14 | 6 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -19.5 dB) |
| 0:16.99 | 7 / 3.00 | impact | first snare/clap hit (bar 7 beat 3) |
| 0:22.48 | 9 / 3.50 | impact | deep 808 hit (verse 1) |
| 0:26.98 | 11 / 2.48 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 0:30.52 | 12 / 3.96 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 0:31.18 | 13 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -8.7 dB, was -22.0) |
| 0:41.51 | 17 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -16.6 dB) |
| 0:49.24 | 20 / 1.00 | snare_roll | 16th-note drum/808 fill (4 beats, until 51.819) (until 0:51.82) |
| 0:49.24 | 20 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -9.9 dB, was -15.4) |
| 0:55.03 | 22 / 2.00 | impact | 808 + hit, chorus 1 |
| 0:59.53 | 23 / 4.98 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:05.33 | 26 / 1.99 | impact | 808 + hit, chorus 1 second half |
| 1:09.83 | 27 / 4.99 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:12.30 | 28 / 4.83 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:14.96 | 30 / 1.00 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:17.46 | 30 / 4.90 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:20.09 | 32 / 1.00 | snare_roll | 16th-note drum/808 fill (4 beats, until 82.645) (until 1:22.64) |
| 1:27.74 | 35 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -17.8 dB) |
| 1:36.00 | 38 / 1.98 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:41.08 | 40 / 1.98 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 1:43.00 | 41 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -9.0 dB, was -18.7) |
| 1:46.80 | 42 / 3.00 | snare_roll | 16th-note drum/808 fill (4 beats, until 109.344) (until 1:49.34) |
| 1:50.61 | 44 / 1.00 | snare_roll | 16th-note drum/808 fill (4 beats, until 113.152) (until 1:53.15) |
| 1:53.15 | 45 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -5.5 dB, was -12.9) |
| 2:05.83 | 49 / 5.00 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 2:15.97 | 53 / 4.99 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 2:18.50 | 54 / 4.98 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 2:21.05 | 56 / 1.00 | snare_roll | 16th-note drum/808 fill (4 beats, until 143.581) (until 2:23.58) |
| 2:23.58 | 57 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -17.5 dB) |
| 2:23.59 | 57 / 1.02 | drums_out | drums/808s stop: last hit 143.595 (silent from bar 58 on) |
| 2:28.64 | 59 / 1.00 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 2:33.38 | 60 / 4.49 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 2:33.69 | 61 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -9.1 dB, was -25.6) |
| 2:33.69 | 61 / 1.00 | impact | drums + 808 return inside the Bridge ("But fear's a chain") |
| 2:38.42 | 62 / 4.48 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 2:43.79 | 65 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -5.6 dB, was -10.8) |
| 2:53.88 | 69 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -9.3 dB, was -11.6) |
| 3:00.80 | 71 / 4.00 | snare_roll | BUILD snare/808 roll: 16th notes for 5 beats into the drums-out gap at 183.943 (density rises from 2 to 4 hits per beat over bars 68-72) (until 3:03.94) |
| 3:03.78 | 72 / 4.75 | drums_out | PRE-DROP GAP: drums/808s and bass cut on bar 73 (183.94); only a held pad + the lead vocal ("Couldn't be sure ... a prayer") until the drop impact at 188.35; last hit 183.785 |
| 3:03.94 | 73 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -20.2 dB) |
| 3:08.35 | 74 / 4.00 | impact | DROP IMPACT: full-spectrum slam on bar 74 beat 4 after the 4.4 s drums-out gap, 16th-note fill into bar 75 (188.99) where the full 808/drum groove starts |
| 3:11.51 | 75 / 4.99 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 3:14.04 | 77 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -7.6 dB, was -12.9) |
| 3:21.61 | 80 / 1.00 | snare_roll | 16th-note drum/808 fill (4 beats, until 204.124) (until 3:24.12) |
| 3:24.12 | 81 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -10.4 dB) |
| 3:34.18 | 84 / 4.99 | drums_out | drums/808s stop: last hit 214.175 (silent from bar 86 on) |
| 3:38.09 | 86 / 3.17 | silence | near-silence: mix below -40 dBFS for 0.48 s (until 3:38.56) |
| 3:40.22 | 87 / 2.53 | silence | near-silence: mix below -40 dBFS for 0.95 s (until 3:41.16) |
| 3:42.30 | 88 / 1.81 | silence | near-silence: mix below -40 dBFS for 0.68 s (until 3:42.97) |
| 3:43.11 | 88 / 3.09 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 3:44.07 | 88 / 4.61 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 3:44.33 | 89 / 1.01 | impact | Outro: drums + 808 slam back in (bar 89) under the whispered count |
| 3:46.86 | 89 / 4.99 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 3:46.86 | 90 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -14.1 dB) |
| 3:49.07 | 90 / 4.49 | sub_hit | sub-bass / 808 entry from a quiet low end |
| 3:54.31 | 92 / 4.75 | drums_out | drums/808s cut after the last full "Hold your fire" (bar 93); held vocal + piano decay; last hit 234.315 |
| 3:57.02 | 94 / 1.00 | choir_wide | stacked/choir vocals enter (vocal side/mid -3.3 dB, was -11.2) |
| 3:58.49 | 94 / 3.32 | vocal_gap | no vocals for 3.59 s (until 4:02.08) |
| 4:00.25 | 95 / 2.07 | silence | near-silence: mix below -40 dBFS for 0.58 s (until 4:00.82) |
| 4:01.41 | 95 / 3.88 | silence | near-silence: mix below -40 dBFS for 0.69 s (until 4:02.09) |
| 4:02.12 | 96 / 1.00 | mono_lead | vocals collapse to a single centred lead (side/mid -23.0 dB) |
| 4:03.92 | 96 / 3.80 | vocal | last vocal ends (whispered "fire") |
| 4:04.05 | 96 / 4.00 | impact | FINAL HIT: 808 + crash on bar 96 beat 4 (strongest onset and largest low-end jump of the song), 16th hits to 244.69, sub decays to silence |
| 4:05.86 | 97 / 2.83 | end | final 808 decays below -40 dBFS |
| 4:05.87 | 97 / 2.83 | silence | near-silence: mix below -40 dBFS for 1.29 s (until 4:07.16) |
| 4:06.41 | 97 / 3.69 | end | last audible sound (mix below -60 dBFS after this) |
| 4:07.16 | 97 / 4.86 | end | end of file |

## Sung vs canonical lyrics

- **Intro** (0:02.80): canonical `(One... one... two... three... five... eight...)` -> whispered twice: #1 'One... one... two... three... five... eight... eight...' (2.80-6.9 s, one whisper per beat, the 'eight' doubled); #2 'One... two... three... five... eight...' (8.60-11.4 s, the second 'one' is NOT whispered) plus a short extra whisper heard as 'yeah' at 11.51. *Confidence: high for the syllable count and times; medium for which word each whisper is (isolated-syllable ASR: two/three/five/'hey'(=eight) are clear, the 'one's are not).*
- **Post-Chorus 1 and 2** (1:13.03): canonical `(One! One! Two! Three! Five! Eight!) (Counting on you!)` -> 'One! One! Two! Three! Five!' then 'Counting on you!' - NO 'Eight!' (the 'Counting' shout lands where 'Eight!' would be) - and the pair is sung TWICE in each post-chorus. *Confidence: high (5 shouts per pass on beats 2-3-4-1-2, all ASR systems).*
- **Build** (2:53.25): canonical `are out there at all.` -> 'out there at all' - 'are' not sung: 'fire' is one held D4 note (172.57-173.21) straight into 'out' (173.29). *Confidence: medium-high (pitch track + every ASR pass: '...held their fire out there at all').*
- **Drop** (3:08.68): canonical `but you were. You were counting too.` -> probably 'but you ARE, you ARE counting too' - all five independent ASR systems (Whisper on two stems, parakeet, gpt-4o-transcribe, grok-stt) hear 'are' twice; a belted 'were' can sound like 'are', so not certain. *Confidence: medium.*
- **Outro** (3:45.56): canonical `(One... one... two... three...) The count goes higher. (Hold your fire.)` -> whispered count twice (225.56-227.5, then 230.04-232.0 layered under the held 'higher'); '(Hold your fire.)' twice: sung at 233.17 and whispered at 242.08 (the last vocal). ASR reads the whispered counts as 'one, two, three, one' / 'one, two, three, four': the four-whisper count matches the lyric but the word order is unconfirmed. *Confidence: high for times and repeats, low for whispered word identity.*
- **Bridge** (2:23.84): canonical `[Bridge: near silence, whispered]` -> sung softly with pitch (pyin voiced on most frames), not whispered; the near-silence is the arrangement: drums/808s out 143.6-153.69 (bars 57-60), back in on bar 61. *Confidence: high.*
- **Build** (2:55.06): canonical `(Hold your fire! Show your light!) x2` -> two sustained choir phrases (175.06, 180.09), sung, not shouted gang hits. *Confidence: high.*
- **ASR mishearings (NOT deviations)**: canonical `counting out / Priests in the smoke wanted / saltpeter / Petrov / Arkhipov / no dead star could make / We're alive / Show your light` -> ASR consistently hears 'coming out', '...the smoke, one and/wanting...', 'salt, Peter', 'Chuck/Choke', 'Kipoff', 'no death star couldn't make', 'were a lie', 'show your life'. These are the usual mishearings of sung consonants (ASR also turns the certain 'Counting on you' into 'Pounding/Coming on you'); no evidence the words differ. 'Priests' is the least clear - diction is soft. *Confidence: n/a.*

In `lines[]` every canonical line appears in order; sung repeats are extra entries with `repeat: true`; canonical words that are not sung are listed in `unsung_words` (not in `words`), sung extras carry `extra: true`.

## Lines

| n | Section | idx | Line | Start | End | Bar/beat | Kind | Voice | Check |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Intro | 0 | (One... one... two... three... five... eight...) | 0:02.80 | 0:06.93 | 1/4.93 | whisper/whispered | A_breathy (medium) | 0.86 |
| 1 | Intro | 0 | (One... one... two... three... five... eight...) (repeat) | 0:08.60 | 0:11.85 | 4/1.94 | whisper/whispered | A_breathy (medium) | 1.0 |
| 2 | Verse 1 | 1 | Out of the sea with salt in our lungs, | 0:13.05 | 0:15.90 | 5/4.85 | lead/sung | A_breathy (low) | 1.0 |
| 3 | Verse 1 | 2 | fin into foot into hand, we were young; | 0:18.07 | 0:21.16 | 7/4.69 | lead/sung | A_breathy (medium) | 0.88 |
| 4 | Verse 1 | 3 | carried the egg through the dust and the mud, | 0:23.41 | 0:27.30 | 9/4.94 | lead/sung | A_breathy (medium) | 1.0 |
| 5 | Verse 1 | 4 | seeds in the dark for the waking flood. | 0:27.32 | 0:32.16 | 11/3.01 | lead/sung | A_breathy (low) | 1.0 |
| 6 | Pre-Chorus 1 | 5 | Snowflake in the boundless night, | 0:32.62 | 0:35.48 | 13/3.24 | lead/sung | A_breathy (medium) | 1.0 |
| 7 | Pre-Chorus 1 | 6 | a chord that's searching through the fog, | 0:35.50 | 0:38.05 | 14/3.69 | lead/sung | A_breathy (medium) | 0.86 |
| 8 | Pre-Chorus 1 | 7 | counting out in bursts of light, | 0:38.07 | 0:40.63 | 15/3.68 | lead/sung | A_breathy (high) | 0.83 |
| 9 | Pre-Chorus 1 | 8 | a one-way dialogue: | 0:40.65 | 0:43.25 | 16/3.67 | lead/sung | B_belt (high) | 1.0 |
| 10 | Pre-Chorus 1 | 9 | a pattern no dead star could make. | 0:43.27 | 0:45.99 | 17/3.73 | lead/sung | B_belt (medium) | 0.57 |
| 11 | Pre-Chorus 1 | 10 | Hear it, and you'll know we're awake. | 0:46.02 | 0:51.68 | 18/3.99 | lead/sung | B_belt (high) | 1.0 |
| 12 | Chorus 1 | 11 | Can't be sure that anyone is there, | 0:51.70 | 0:54.26 | 20/4.81 | lead/sung | both (medium) | 1.0 |
| 13 | Chorus 1 | 12 | message in a bottle, a mantra, a prayer, | 0:54.28 | 0:56.65 | 21/4.82 | lead/sung | A_breathy (medium) | 0.88 |
| 14 | Chorus 1 | 13 | but if you are, I'm counting on you. | 0:56.67 | 1:02.13 | 22/4.54 | lead/sung | both (high) | 1.0 |
| 15 | Chorus 1 | 14 | Silent and patient, but I swear | 1:02.15 | 1:04.57 | 25/1.05 | lead/sung | both (high) | 1.0 |
| 16 | Chorus 1 | 15 | in the white noise I can hear you breathe somewhere. | 1:04.59 | 1:07.29 | 25/4.83 | lead/sung | B_belt (high) | 1.0 |
| 17 | Chorus 1 | 16 | If you are, I'm counting on you. | 1:07.31 | 1:13.01 | 27/1.06 | lead/sung | both (high) | 1.0 |
| 18 | Post-Chorus 1 | 17 | (One! One! Two! Three! Five! Eight!) | 1:13.03 | 1:15.98 | 29/1.99 | gang/whispered | choir (medium) | 1.0 |
| 19 | Post-Chorus 1 | 18 | (Counting on you!) | 1:16.25 | 1:18.16 | 30/3.01 | gang/shouted | choir (medium) | 1.0 |
| 20 | Post-Chorus 1 | 17 | (One! One! Two! Three! Five! Eight!) (repeat) | 1:18.18 | 1:21.38 | 31/2.02 | gang/whispered | choir (medium) | 1.0 |
| 21 | Post-Chorus 1 | 18 | (Counting on you!) (repeat) | 1:21.39 | 1:22.53 | 32/3.04 | gang/shouted | choir (medium) | 0.67 |
| 22 | Verse 2 | 19 | Priests in the smoke wanted never to die, | 1:22.55 | 1:24.97 | 32/4.85 | lead/sung | B_belt (medium) | 0.62 |
| 23 | Verse 2 | 20 | sulfur and saltpeter, thunder in the sky; | 1:25.00 | 1:27.37 | 33/4.69 | lead/sung | B_belt (medium) | 0.75 |
| 24 | Verse 2 | 21 | looked for a life with no end, and they found | 1:27.39 | 1:29.97 | 34/4.45 | lead/sung | B_belt (medium) | 0.9 |
| 25 | Verse 2 | 22 | an end with no life that could level the ground. | 1:30.00 | 1:32.58 | 35/4.54 | lead/sung | B_belt (medium) | 0.9 |
| 26 | Verse 2 | 23 | Eighty-three, the satellites saw five, | 1:32.60 | 1:35.34 | 36/4.63 | lead/sung | B_belt (medium) | 0.5 |
| 27 | Verse 2 | 24 | every rule said call it first strike; | 1:35.36 | 1:37.83 | 37/4.97 | lead/sung | A_breathy (medium) | 0.86 |
| 28 | Verse 2 | 25 | Petrov knew that's not what the end looks like, | 1:37.88 | 1:40.29 | 38/4.94 | lead/sung | B_belt (high) | 0.89 |
| 29 | Verse 2 | 26 | ignored all previous instructions. We're alive. | 1:40.31 | 1:42.97 | 39/4.77 | lead/sung | B_belt (high) | 0.83 |
| 30 | Pre-Chorus 2 | 27 | Secret list of every near-miss and disaster, | 1:42.99 | 1:46.12 | 40/4.99 | lead/sung | B_belt (medium) | 0.75 |
| 31 | Pre-Chorus 2 | 28 | running total no one ever knew: | 1:46.14 | 1:47.98 | 42/1.95 | lead/sung | B_belt (high) | 1.0 |
| 32 | Pre-Chorus 2 | 29 | coin flips, all heads, a hundred in a row, | 1:48.00 | 1:50.59 | 42/4.89 | lead/sung | B_belt (low) | 0.89 |
| 33 | Pre-Chorus 2 | 30 | the only road from here to you. | 1:50.61 | 1:53.16 | 43/4.99 | lead/sung | B_belt (high) | 0.86 |
| 34 | Chorus 2 | 31 | Can't be sure that anyone is there, | 1:53.18 | 1:55.64 | 45/1.04 | lead/sung | both (high) | 1.0 |
| 35 | Chorus 2 | 32 | message in a bottle, a mantra, a prayer, | 1:55.66 | 1:57.92 | 45/4.95 | lead/sung | A_breathy (medium) | 1.0 |
| 36 | Chorus 2 | 33 | but if you are, I'm counting on you. | 1:57.94 | 2:03.30 | 46/4.54 | lead/sung | both (high) | 0.88 |
| 37 | Chorus 2 | 34 | Silent and patient, but I swear | 2:03.32 | 2:05.80 | 49/1.03 | lead/sung | both (low) | 0.83 |
| 38 | Chorus 2 | 35 | in the white noise I can hear you breathe somewhere. | 2:05.82 | 2:08.38 | 49/4.98 | lead/sung | both (medium) | 1.0 |
| 39 | Chorus 2 | 36 | If you are, I'm counting on you. | 2:08.40 | 2:14.03 | 51/1.04 | lead/sung | both (high) | 1.0 |
| 40 | Post-Chorus 2 | 37 | (One! One! Two! Three! Five! Eight!) | 2:14.06 | 2:17.19 | 53/1.96 | gang/whispered | choir (medium) | 1.0 |
| 41 | Post-Chorus 2 | 38 | (Counting on you!) | 2:17.21 | 2:19.09 | 54/2.93 | gang/shouted | choir (medium) | 0.67 |
| 42 | Post-Chorus 2 | 37 | (One! One! Two! Three! Five! Eight!) (repeat) | 2:19.11 | 2:22.11 | 55/1.93 | gang/shouted | choir (medium) | 1.0 |
| 43 | Post-Chorus 2 | 38 | (Counting on you!) (repeat) | 2:22.19 | 2:23.72 | 56/2.80 | gang/shouted | choir (medium) | 0.67 |
| 44 | Bridge | 39 | They say the forest's dark, | 2:23.84 | 2:26.36 | 57/1.41 | lead/sung | A_breathy (high) | 1.0 |
| 45 | Bridge | 40 | every hunter holds its breath, | 2:26.41 | 2:28.91 | 58/1.47 | lead/sung | A_breathy (high) | 1.0 |
| 46 | Bridge | 41 | any world that lights a spark | 2:28.93 | 2:30.96 | 59/1.45 | lead/sung | A_breathy (high) | 1.0 |
| 47 | Bridge | 42 | is lighting its own death. | 2:31.64 | 2:33.34 | 60/1.75 | lead/sung | B_belt (high) | 1.0 |
| 48 | Bridge | 43 | But fear's a chain, and chains are links, | 2:33.38 | 2:35.88 | 60/4.50 | lead/sung | B_belt (low) | 1.0 |
| 49 | Bridge | 44 | and every link's a hand that can let go: | 2:35.90 | 2:38.74 | 61/4.49 | lead/sung | B_belt (medium) | 1.0 |
| 50 | Bridge | 45 | sixty-two, depth charges falling, | 2:38.76 | 2:41.21 | 63/1.03 | lead/sung | A_breathy (low) | 1.0 |
| 51 | Bridge | 46 | two said fire. Arkhipov said no. | 2:41.23 | 2:43.65 | 63/4.94 | lead/sung | B_belt (medium) | 0.83 |
| 52 | Build | 47 | Hunters never make it very far, | 2:43.67 | 2:46.91 | 64/4.80 | lead/sung | both (high) | 1.0 |
| 53 | Build | 48 | fire at the dark, at every star, | 2:46.93 | 2:49.42 | 66/1.98 | lead/sung | both (medium) | 0.86 |
| 54 | Build | 49 | burn, and fall. | 2:49.44 | 2:50.81 | 67/1.96 | lead/sung | B_belt (high) | 1.0 |
| 55 | Build | 50 | Only the ones who held their fire | 2:50.83 | 2:53.23 | 67/4.17 | lead/sung | B_belt (high) | 1.0 |
| 56 | Build | 51 | are out there at all. | 2:53.25 | 2:55.04 | 68/4.01 | lead/sung | B_belt (high) | 0.75 |
| 57 | Build | 52 | (Hold your fire! Show your light!) | 2:55.06 | 3:00.07 | 69/2.88 | gang/sung | choir (medium) | 0.83 |
| 58 | Build | 53 | (Hold your fire! Show your light!) | 3:00.09 | 3:03.86 | 71/2.87 | gang/sung | choir (medium) | 0.83 |
| 59 | Drop | 54 | Couldn't be sure that anyone was there, | 3:03.88 | 3:06.40 | 72/4.90 | lead/sung | B_belt (high) | 1.0 |
| 60 | Drop | 55 | message in a bottle, a mantra, a prayer, | 3:06.42 | 3:08.66 | 73/4.92 | lead/sung | B_belt (medium) | 0.75 |
| 61 | Drop | 56 | but you were. You were counting too. | 3:08.68 | 3:13.99 | 74/4.50 | lead/sung | B_belt (high) | 0.29 |
| 62 | Drop | 57 | (Thirteen! Twenty-one! Thirty-four!) | 3:14.01 | 3:15.82 | 76/4.95 | gang/whispered | choir (medium) | 1.0 |
| 63 | Drop | 58 | Link by link, we broke the chain of fear; | 3:15.84 | 3:18.91 | 77/3.85 | lead/sung | B_belt (medium) | 1.0 |
| 64 | Drop | 59 | alone, we never would've made it here. | 3:18.93 | 3:21.53 | 78/4.74 | lead/sung | both (medium) | 0.88 |
| 65 | Drop | 60 | (Fifty-five! Eighty-nine!) | 3:21.55 | 3:22.87 | 79/4.91 | gang/whispered | choir (medium) | 1.0 |
| 66 | Drop | 61 | And you were seen too, wherever you are. | 3:22.89 | 3:33.02 | 80/3.04 | lead/sung | B_belt (high) | 0.88 |
| 67 | Outro | 62 | Six hundred worlds across the Milky Way, | 3:33.04 | 3:38.09 | 84/3.19 | lead/sung | A_breathy (medium) | 1.0 |
| 68 | Outro | 63 | every one could've burned. Every one held its fire. | 3:38.87 | 3:45.19 | 86/4.40 | lead/sung | A_breathy (medium) | 1.0 |
| 69 | Outro | 64 | (One... one... two... three...) | 3:45.56 | 3:47.70 | 89/2.94 | whisper/whispered | A_breathy (medium) | 0.75 |
| 70 | Outro | 65 | The count goes higher. | 3:47.79 | 3:50.02 | 90/2.46 | lead/sung | B_belt (high) | 0.75 |
| 71 | Outro | 64 | (One... one... two... three...) (repeat) | 3:50.04 | 3:52.84 | 91/2.01 | whisper/whispered | A_breathy (medium) | 0.0 |
| 72 | Outro | 66 | (Hold your fire.) | 3:53.17 | 3:58.49 | 92/2.94 | whisper/whispered | A_breathy (medium) | 1.0 |
| 73 | Outro | 66 | (Hold your fire.) (repeat) | 4:02.08 | 4:03.92 | 95/4.93 | whisper/whispered | A_breathy (medium) | 1.0 |

### Word timings (start-end s; * = medium, ** = low confidence)

- **0. (One... one... two... three... five... eight...)** - One 2.80-3.43, one 3.44-4.07, two 4.08-4.71, three 4.72-5.29, five 5.30-6.00, eight 6.00-6.62, eight 6.63-6.93
- **1. (One... one... two... three... five... eight...)** (repeat) - One 8.60-9.23, two 9.23-9.86, three 9.86-10.43*, five 10.44-11.16, eight 11.16-11.85
- **2. Out of the sea with salt in our lungs,** - Out 13.05-13.35, of 13.35-13.43, the 13.43-13.77, sea 13.78-14.17, with 14.18-14.26, salt 14.26-14.82, in 14.83-14.87, our 14.88-15.12, lungs 15.12-15.90
- **3. fin into foot into hand, we were young;** - fin 18.07-18.59, into 18.60-18.89, foot 18.89-19.24, into 19.25-19.55, hand 19.56-19.84, we 19.84-20.01, were 20.02-20.29, young 20.30-21.16
- **4. carried the egg through the dust and the mud,** - carried 23.41-23.67, the 23.68-24.03, egg 24.04-24.30, through 24.30-24.53, the 24.54-24.69, dust 24.70-25.15, and 25.16-25.23, the 25.24-25.37, mud 25.37-27.30
- **5. seeds in the dark for the waking flood.** - seeds 27.32-27.83, in 27.83-28.35, the 28.36-28.63, dark 28.64-29.39, for 29.39-29.78, the 29.79-30.06, waking 30.06-30.95, flood 30.96-32.16
- **6. Snowflake in the boundless night,** - Snowflake 32.62-33.40, in 33.41-33.62, the 33.62-33.72, boundless 33.72-34.39, night 34.40-35.48
- **7. a chord that's searching through the fog,** - a 35.50-35.64, chord 35.64-35.99, that's 36.00-36.12, searching 36.12-36.95, through 36.96-37.40, the 37.40-37.59, fog 37.59-38.05
- **8. counting out in bursts of light,** - counting 38.07-38.26, out 38.26-38.61, in 38.61-38.87, bursts 38.87-39.24, of 39.24-39.53, light 39.54-40.63*
- **9. a one-way dialogue:** - a 40.65-40.85, one-way 40.86-42.15, dialogue 42.15-43.25
- **10. a pattern no dead star could make.** - a 43.27-43.38, pattern 43.39-43.76, no 43.77-44.09, dead 44.10-44.69, star 44.70-45.01, could 45.02-45.40, make 45.40-45.99
- **11. Hear it, and you'll know we're awake.** - Hear 46.02-46.30*, it 46.30-46.43, and 46.44-46.50, you'll 46.51-46.78, know 46.79-47.19, we're 47.19-47.73, awake 47.73-51.68**
- **12. Can't be sure that anyone is there,** - Can't 51.70-52.22, be 52.22-52.30, sure 52.30-52.78, that 52.79-53.08, anyone 53.08-53.74, is 53.74-53.80, there 53.81-54.26
- **13. message in a bottle, a mantra, a prayer,** - message 54.28-54.85, in 54.85-54.91, a 54.92-55.07, bottle 55.08-55.50, a 55.50-55.54, mantra 55.54-56.05, a 56.06-56.30, prayer 56.31-56.65
- **14. but if you are, I'm counting on you.** - but 56.67-57.02, if 57.02-57.57, you 57.58-58.30, are 58.31-60.49**, I'm 60.49-60.76**, counting 60.76-61.50, on 61.51-61.78, you 61.79-62.13
- **15. Silent and patient, but I swear** - Silent 62.15-62.57*, and 62.58-62.79*, patient 62.80-63.54, but 63.55-63.70, I 63.70-63.98*, swear 63.99-64.57
- **16. in the white noise I can hear you breathe somewhere.** - in 64.59-64.81, the 64.81-65.00, white 65.01-65.35, noise 65.36-65.67, I 65.67-65.78, can 65.78-66.03, hear 66.03-66.26, you 66.27-66.42, breathe 66.43-66.65*, somewhere 66.66-67.29
- **17. If you are, I'm counting on you.** - If 67.31-67.87*, you 67.87-68.59, are 68.59-70.74**, I'm 70.75-71.23, counting 71.23-71.74, on 71.75-71.99, you 71.99-73.01
- **18. (One! One! Two! Three! Five! Eight!)** - One 73.03-73.65**, One 73.66-74.28*, Two 74.28-74.92, Three 74.93-75.58, Five 75.58-75.98
- **19. (Counting on you!)** - Counting 76.25-76.99**, on 77.00-77.20*, you 77.20-78.16*
- **20. (One! One! Two! Three! Five! Eight!)** (repeat) - One 78.18-78.81**, One 78.82-79.39**, Two 79.39-80.04, Three 80.04-80.69**, Five 80.69-81.38**
- **21. (Counting on you!)** (repeat) - Counting 81.39-82.01**, on 82.02-82.27*, you 82.28-82.53*
- **22. Priests in the smoke wanted never to die,** - Priests 82.55-83.04, in 83.05-83.11, the 83.11-83.24, smoke 83.24-83.62, wanted 83.63-83.93, never 83.93-84.42, to 84.43-84.52, die 84.53-84.97
- **23. sulfur and saltpeter, thunder in the sky;** - sulfur 85.00-85.62, and 85.63-85.73, saltpeter 85.73-86.42, thunder 86.42-86.89, in 86.89-86.97, the 86.97-87.06, sky 87.06-87.37
- **24. looked for a life with no end, and they found** - looked 87.39-87.94, for 87.94-88.17, a 88.17-88.28, life 88.29-88.54, with 88.54-88.79, no 88.79-89.02, end 89.03-89.35, and 89.36-89.42, they 89.43-89.64, found 89.65-89.97
- **25. an end with no life that could level the ground.** - an 90.00-90.25, end 90.26-90.37, with 90.38-90.66, no 90.67-90.90, life 90.90-91.13, that 91.13-91.27, could 91.28-91.61, level 91.61-92.05, the 92.05-92.15, ground 92.15-92.58
- **26. Eighty-three, the satellites saw five,** - Eighty-three 92.60-93.28, the 93.29-93.42*, satellites 93.43-94.12*, saw 94.12-94.62, five 94.62-95.34
- **27. every rule said call it first strike;** - every 95.36-95.64, rule 95.65-96.01, said 96.02-96.28, call 96.28-96.61, it 96.61-96.71, first 96.72-97.23, strike 97.23-97.83
- **28. Petrov knew that's not what the end looks like,** - Petrov 97.88-98.21*, knew 98.22-98.36, that's 98.36-98.58, not 98.58-98.86, what 98.86-99.00, the 99.00-99.20, end 99.20-99.49, looks 99.49-99.89, like 99.89-100.29
- **29. ignored all previous instructions. We're alive.** - ignored 100.31-100.76*, all 100.76-101.05, previous 101.05-101.51, instructions 101.52-102.04, We're 102.05-102.23, alive 102.24-102.97
- **30. Secret list of every near-miss and disaster,** - Secret 102.99-103.59, list 103.60-103.94, of 103.94-104.24, every 104.24-104.57, near-miss 104.58-105.20, and 105.21-105.34, disaster 105.34-106.12
- **31. running total no one ever knew:** - running 106.14-106.44, total 106.44-106.79, no 106.80-106.93, one 106.94-107.24, ever 107.25-107.41, knew 107.42-107.98
- **32. coin flips, all heads, a hundred in a row,** - coin 108.00-108.33, flips 108.33-108.71, all 108.71-108.91, heads 108.92-109.12, a 109.13-109.35, hundred 109.35-109.75, in 109.75-109.91, a 109.91-109.95, row 109.96-110.59
- **33. the only road from here to you.** - the 110.61-110.70*, only 110.71-111.13*, road 111.14-111.56**, from 111.56-111.75*, here 111.76-112.22*, to 112.22-112.39**, you 112.40-113.16*
- **34. Can't be sure that anyone is there,** - Can't 113.18-113.43*, be 113.44-113.58*, sure 113.58-114.11, that 114.12-114.47, anyone 114.48-114.95, is 114.96-115.05, there 115.05-115.64
- **35. message in a bottle, a mantra, a prayer,** - message 115.66-116.13, in 116.14-116.18, a 116.19-116.22, bottle 116.23-116.75, a 116.75-116.80, mantra 116.80-117.37, a 117.37-117.55, prayer 117.55-117.92
- **36. but if you are, I'm counting on you.** - but 117.94-118.25, if 118.26-118.83*, you 118.83-119.56, are 119.57-121.68**, I'm 121.68-122.06, counting 122.06-122.63, on 122.64-122.86, you 122.86-123.30
- **37. Silent and patient, but I swear** - Silent 123.32-123.88*, and 123.88-123.94, patient 123.95-124.69, but 124.70-124.87, I 124.88-125.17*, swear 125.18-125.80
- **38. in the white noise I can hear you breathe somewhere.** - in 125.82-125.94, the 125.95-126.14, white 126.15-126.49, noise 126.50-126.78, I 126.79-126.88, can 126.89-127.01, hear 127.01-127.25, you 127.25-127.41, breathe 127.41-127.75, somewhere 127.75-128.38
- **39. If you are, I'm counting on you.** - If 128.40-128.97*, you 128.97-129.70, are 129.71-131.84**, I'm 131.84-132.19, counting 132.19-132.83, on 132.84-133.14*, you 133.14-134.03*
- **40. (One! One! Two! Three! Five! Eight!)** - One 134.06-134.65**, One 134.65-135.28, Two 135.29-135.95, Three 135.95-136.57, Five 136.57-137.19
- **41. (Counting on you!)** - Counting 137.21-137.88*, on 137.89-138.20, you 138.21-139.09
- **42. (One! One! Two! Three! Five! Eight!)** (repeat) - One 139.11-139.74, One 139.74-140.38, Two 140.38-141.00, Three 141.00-141.65, Five 141.66-142.11
- **43. (Counting on you!)** (repeat) - Counting 142.19-142.91, on 142.91-143.19*, you 143.20-143.72**
- **44. They say the forest's dark,** - They 143.84-143.98, say 143.99-144.54, the 144.54-144.85, forest's 144.86-145.48, dark 145.49-146.36
- **45. every hunter holds its breath,** - every 146.41-146.78, hunter 146.79-147.36, holds 147.37-147.78, its 147.78-147.97, breath 147.98-148.91
- **46. any world that lights a spark** - any 148.93-149.27, world 149.28-149.56, that 149.56-149.87, lights 149.88-150.24, a 150.24-150.32, spark 150.32-150.96
- **47. is lighting its own death.** - is 151.64-151.85, lighting 151.86-152.51, its 152.51-152.75, own 152.76-153.03, death 153.04-153.34
- **48. But fear's a chain, and chains are links,** - But 153.38-153.68, fear's 153.69-154.06, a 154.07-154.15, chain 154.15-154.66, and 154.67-154.80, chains 154.81-155.26, are 155.27-155.45, links 155.45-155.88
- **49. and every link's a hand that can let go:** - and 155.90-156.36, every 156.37-156.73, link's 156.74-157.15, a 157.15-157.48, hand 157.48-157.78, that 157.79-157.90, can 157.91-158.10, let 158.10-158.40, go 158.41-158.74
- **50. sixty-two, depth charges falling,** - sixty-two 158.76-159.64, depth 159.64-159.93, charges 159.94-160.47, falling 160.47-161.21
- **51. two said fire. Arkhipov said no.** - two 161.23-161.54, said 161.55-161.87, fire 161.87-162.18, Arkhipov 162.19-162.72, said 162.72-163.34, no 163.34-163.65
- **52. Hunters never make it very far,** - Hunters 163.67-164.41*, never 164.42-165.07, make 165.07-165.48, it 165.48-165.68, very 165.68-166.30, far 166.30-166.91
- **53. fire at the dark, at every star,** - fire 166.93-167.23, at 167.24-167.38, the 167.38-167.54, dark 167.54-168.03, at 168.04-168.23*, every 168.24-168.81, star 168.82-169.42
- **54. burn, and fall.** - burn 169.44-169.94, and 169.94-170.07, fall 170.07-170.81
- **55. Only the ones who held their fire** - Only 170.83-171.17*, the 171.17-171.35, ones 171.35-171.66, who 171.66-172.02, held 172.03-172.35, their 172.35-172.60, fire 172.61-173.23
- **56. are out there at all.** - out 173.25-173.33, there 173.34-173.64, at 173.65-173.99, all 173.99-175.04
- **57. (Hold your fire! Show your light!)** - Hold 175.06-175.47, your 175.48-175.74*, fire 175.75-177.63, Show 177.64-177.71*, your 177.72-177.99*, light 178.00-180.07
- **58. (Hold your fire! Show your light!)** - Hold 180.09-180.42, your 180.43-180.78, fire 180.79-182.47, Show 182.48-182.89, your 182.90-183.04, light 183.04-183.86
- **59. Couldn't be sure that anyone was there,** - Couldn't 183.88-184.34, be 184.34-184.42, sure 184.43-184.96, that 184.96-185.20, anyone 185.20-185.71, was 185.71-185.97, there 185.97-186.40
- **60. message in a bottle, a mantra, a prayer,** - message 186.42-186.79, in 186.79-186.99, a 187.00-187.09, bottle 187.09-187.47, a 187.48-187.59, mantra 187.59-188.14, a 188.15-188.28, prayer 188.29-188.66
- **61. but you were. You were counting too.** - but 188.68-189.03*, you 189.03-189.41**, were 189.41-189.93**, You 189.93-190.43**, were 190.43-191.44**, counting 191.44-193.38*, too 193.38-193.99
- **62. (Thirteen! Twenty-one! Thirty-four!)** - Thirteen 194.01-194.67*, Twenty-one 194.68-195.28, Thirty-four 195.28-195.82
- **63. Link by link, we broke the chain of fear;** - Link 195.84-196.22, by 196.22-196.56, link 196.56-196.87, we 196.87-197.16, broke 197.17-197.50, the 197.51-197.69, chain 197.69-198.18, of 198.18-198.46, fear 198.47-198.91
- **64. alone, we never would've made it here.** - alone 198.93-199.39, we 199.40-199.66, never 199.67-200.01, would've 200.01-200.42, made 200.42-200.79, it 200.80-200.96, here 200.96-201.53
- **65. (Fifty-five! Eighty-nine!)** - Fifty-five 201.55-202.25*, Eighty-nine 202.26-202.87
- **66. And you were seen too, wherever you are.** - And 202.89-203.01*, you 203.02-203.20, were 203.21-203.52, seen 203.52-203.98, too 203.98-207.52, wherever 207.52-208.44, you 208.45-209.15**, are 209.16-213.02**
- **67. Six hundred worlds across the Milky Way,** - Six 213.04-213.47, hundred 213.47-214.31, worlds 214.31-215.29, across 215.29-216.36, the 216.37-216.69, Milky 216.70-217.59, Way 217.60-218.09
- **68. every one could've burned. Every one held its fire.** - every 218.87-219.13, one 219.14-219.46, could've 219.46-219.84, burned 219.84-221.51, Every 221.52-221.75, one 221.76-222.94, held 222.94-223.64*, its 223.65-223.94, fire 223.94-225.19*
- **69. (One... one... two... three...)** - One 225.56-226.19*, one 226.20-226.78*, two 226.79-227.47*, three 227.48-227.70*
- **70. The count goes higher.** - The 227.79-228.16, count 228.16-228.74, goes 228.75-229.43, higher 229.44-230.02
- **71. (One... one... two... three...)** (repeat) - One 230.04-230.60**, one 230.60-231.26**, two 231.27-231.88**, three 231.89-232.84**
- **72. (Hold your fire.)** - Hold 233.17-233.82, your 233.83-234.48, fire 234.49-238.49
- **73. (Hold your fire.)** (repeat) - Hold 242.08-242.66, your 242.67-243.38, fire 243.39-243.92

## Uncertainties (read before keying anything to these)

- **Drop "but you were. You were counting too" (188.7-191.5)**: the four words after "but" have LOW timing confidence (CTC runs disagree by up to 2 s in the stacked vocals); placed on the voiced segments of the pitch track. All ASR systems hear "you are".
- **Outro whispered count #2 (230.0-232.0)** is layered under the held "higher": times are the four whisper bursts, word identity unverifiable (ASR cannot read it). Count #1 (225.56-227.48) times are clear; word order unconfirmed (see deviations).
- **Intro whispers**: times are certain (isolated bursts); which word each burst is rests on isolated-syllable ASR (see deviations).
- **Chorus / Build / Drop stacked vocals**: word starts inside held, layered phrases ("Counting on you", "but if you are", "Show your light") can be off by 0.1-0.2 s; line starts are reliable. Chorus 1 vs 2 agree bar-relatively (below), a good sign.
- **Word starts are vowel/syllable onsets**; the earliest consonant energy is typically 20-40 ms earlier (spot-check bias). For lip-sync visemes lead by ~1 frame at 24 fps.
- **Voices** (`voice`) are inferred, not known: 2-means clustering of pitch / breathiness / loudness per line, seeded with Verse 1 (tag "breathy") = A_breathy and Chorus 1 = B_belt; `both` = belted lead with a wide stack (side/mid > -8 dB). It agrees with the tags (Verse 1 A, Verse 2 "second voice" B, choruses B/both, Bridge A then B, Outro A) but treat as a casting suggestion.
- **Intro grid phase** (see Tempo). Section ends at the song start/end are the file bounds.

## Verification (how this was checked)

1. **Three independent timing sources per word.** (a) CTC forced alignment of the known text (NVIDIA NeMo conformer-CTC-large, our own Viterbi) - global pass over the whole song + local pass per line, on two different vocal separations (BS-RoFormer, Kim_Vocal_2) = 4 estimates; (b) parakeet-tdt-0.6b-v2 ASR word times; (c) Whisper large-v3-turbo (Workers AI) word times on 24 s windows, with and without a lyric prompt. CTC median is primary; ASR arbitrates when the CTC runs spread > 0.2 s.
2. **Onset snap.** Each start is snapped to a syllable onset of the vocal stems (backtracked spectral-flux onset, pyin voicing start/pitch jump, high-band rise) within -120/+80 ms: 442/468 words snapped; 26 fricative-initial words moved to the start of their high-band plateau; 17 starts set by hand from the plots (each with a reason in `tools/audio/overrides.json`).
3. **Per-line re-transcription.** Each line's exact window was re-transcribed (Whisper, no prompt, + parakeet): 60/74 lines >= 80 % of their words heard, 12 at 50-80 % (hard words: Priests, saltpeter, Eighty-three, dead star, are out there), 2 below 50 % (the drop 'you were/are' line and the outro whispered count #2). Mean 0.89. Texts are in `lines[].verify`.
4. **Repeat consistency.** Chorus 1 and Chorus 2 were aligned independently; their word starts agree bar-relatively with median 28 ms, p90 134 ms, max 145 ms over 46 words (65 % within 60 ms). The four post-chorus passes agree with median 24 ms (p90 83); every count shout sits within ~70 ms of its beat.
5. **Independent acoustic spot-check** on the Kim stem (not the one used for snapping) for 206 consonant-initial words: median |error| 35 ms, 62 % within 50 ms, 80 % within 100 ms, bias +20 ms (our starts slightly later than the first consonant energy). The measure itself is noisy in drum-heavy parts (Kim stem bleed): post-chorus shouts, visually exact, score worst.
6. **Visual checks.** `analysis/check_<NN>_<section>_<a..>.png` (<= 11 s panels: vocal-stem spectrogram, vocal RMS, vocal onset, bar/beat lines, word starts, hit markers) and `check_overview.png` were inspected for every section; the problems found (intro "three", chorus-2 "if", "Thirteen", outro count #1 shifted by one, drop "you were", "held/fire", "are" not sung) were fixed or flagged.
7. **Count shouts** were confirmed by their sharp broadband transients in the vocal stem (5 shouts per pass, beats 2-3-4-1-2) and by all ASR systems; the missing "Eight!" was checked on all four passes. Intro/outro whispers were transcribed syllable by syllable.
8. **Beat grid**: drum-stem onset anchors on 16th positions, spline fit residual above; bar phase from kick/chord-change statistics (downbeat = strongest kick rise + chord change, snare on beat 3) and confirmed by section-start hits on bar lines.
9. **Stems**: BS-RoFormer vocals + instrumental re-sum to the mix at -111 dB (unity gain); vocal stem is ~45 dB cleaner than Kim_Vocal_2 in vocal-free passages (e.g. the tail: -116 vs -72 dBFS).

## Regenerate

`tools/audio/`: stems.py (BS-RoFormer) / vocal_stem_mdx.py (Kim_Vocal_2, KUIELab drums) -> onset_envs.py -> beatgrid.py -> transcribe_song.py + asr_parakeet.py + ctc_global.py (per stem) -> syllable_onsets.py (per stem) -> fuse.py (+ overrides.json) -> hits.py, events.py, voices.py -> build_timing.py -> features.py, verify_lines.py, spotcheck.py -> build_md.py, plot_check.py. Sung script (repeats/omissions): sung.py; canonical parse: lyrics.py. Models in work/models (UVR GitHub release, k2-fsa sherpa-onnx GitHub release). Cloud STT calls (Whisper turbo, gpt-4o-transcribe, grok-stt) are logged to media/genlog.jsonl + docs/spend_ledger.jsonl.

