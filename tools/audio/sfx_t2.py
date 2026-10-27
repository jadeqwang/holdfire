#!/usr/bin/env python3
"""HOLD FIRE take two: the sound-design layer (cue sheet: docs/take2/SOUND_T2.md, which this script writes).

Same rules as take one (tools/audio/sfx.py, docs/SOUND.md), whose synthesis, loudness and levelling helpers this imports:
the song is never touched; every cue is synthesized (numpy/scipy, seeded, deterministic); each cue is levelled under the
song's own momentary loudness and >= 6 dB under the vocal wherever a word sounds; and the layer is summed onto the song:

    mix_24bit = song_24bit + round(layer * 2^23)      (outside the cue windows the layer is exactly 0: bit-identical)

Take two's cues come from the picture itself: tools/audio/t2_events.mjs imports render/src/timeline.js and the scenes'
own schedule code (read-only) and hands over every clock press, the two VHS rewinds, the reset counter's resets and digit
rolls, and the Arkhipov depth charges. If node is unavailable the last export (work/sfx_t2/events.json) is used.

    python3 tools/audio/sfx_t2.py                  # layer, mix, verify.json, docs/take2/SOUND_T2.md, audition mp4
    python3 tools/audio/sfx_t2.py --no-audition    # skip the audition video

Writes
    work/sfx_t2/events.json          the picture events used (from t2_events.mjs)
    work/sfx_t2/sfx_t2_layer.wav     48 kHz stereo float32, the song's length
    work/sfx_t2/stems/<cue>.wav      each cue alone at final gain (sample 0 = cue window start, see cues.json)
    work/sfx_t2/cues.json, verify.json, cue_levels.png
    media/audio/hold_fire_t2_mix.wav 48 kHz stereo PCM 24-bit, the song's length = song + layer
    work/out/sfx_audition.mp4        the latest 540p preview with this mix, cut to the cue windows (+-1 s, 0.3 s gaps)
    docs/take2/SOUND_T2.md           the cue sheet (generated)
"""
import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx as S1  # noqa: E402  take one: DSP kit, loudness, I/O, Cue + levelling, match / sonar / depth-charge synths
from sfx import (SR, N, tt, db2a, a2db, lp, hp, bp, ramp, smooth, fades, stereo, pan, add_at, white, pink, ir, reverb,  # noqa: E402
                 peak_db, kpow, Momentary, integrated_lufs, true_peak_db, decode_s24, ebur128, Cue, fit_level, under_vocal,
                 vocal_present, find_gap, sum_layer, dominant, match_strike, sonar_ping, depth_charge, D6,
                 MIN_MARGIN_DB, VOCAL_WIN, VOCAL_FIT_DB, LAYER_PEAK_MAX_DB, MIX_TP_MAX_DB)

ROOT = S1.ROOT
SONG_MP3, VOCALS = S1.SONG_MP3, S1.VOCALS
WORK = os.path.join(ROOT, "work", "sfx_t2")
MEDIA = os.path.join(ROOT, "media", "audio")
MIX = os.path.join(MEDIA, "hold_fire_t2_mix.wav")
DOC = os.path.join(ROOT, "docs", "take2", "SOUND_T2.md")
EVENTS_JS = os.path.join(ROOT, "tools", "audio", "t2_events.mjs")
AUDITION = os.path.join(ROOT, "work", "out", "sfx_audition.mp4")
LUFS_TOL = 0.01            # brief: the mix's integrated loudness within 0.01 LU of the song


# ============================================================================================ picture events
def load_events():
    out = os.path.join(WORK, "events.json")
    try:
        subprocess.run(["node", EVENTS_JS, out], check=True, capture_output=True, cwd=ROOT, timeout=120)
        src = "node tools/audio/t2_events.mjs (live from render/src/timeline.js)"
    except Exception as e:                                         # noqa: BLE001
        if not os.path.exists(out):
            raise SystemExit(f"t2_events.mjs failed and there is no cached {out}: {e}")
        src = f"cached {os.path.relpath(out, ROOT)} (node failed: {e})"
    return json.load(open(out)), src


# ============================================================================================ sounds
def modes(freqs, decays, amps, dur, rng, jitter=0.0):
    """Sum of exponentially decaying sines (a struck body's modes), random phases, optional frequency jitter."""
    t = tt(dur)
    y = np.zeros_like(t)
    for f, d, a in zip(freqs, decays, amps):
        f = f * (1 + rng.uniform(-jitter, jitter))
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / d)
    return y


def burst(n_s, lo, hi, tau, rng, order=2):
    """A band-passed noise click (decay tau) of n_s seconds."""
    n = N(n_s)
    return bp(white(n, rng), lo, hi, order) * np.exp(-np.arange(n) / SR / tau)


def clock_slap(side, rng, hard=1.0, sparks=False):
    """A chess-clock press at blitz speed: the palm on the plunger (soft LP thump), the plastic button's click and its modes,
    the wooden case's knock, then the rocker toggling over (a second, smaller click ~10 ms later) and the other button
    popping up. Jade (White) is a little rounder and lower; teal-tips (Black) slaps harder and brighter. Sample 0 = contact."""
    dur = 0.2
    n = N(dur)
    y = np.zeros(n)
    r = 1.0 if side == "w" else 1.07                                   # teal-tips' button: a touch higher, sharper
    ck_tau = 0.0026 if side == "w" else 0.0019
    palm = lp(white(N(0.05), rng), 260 if side == "w" else 320, 2) * np.exp(-np.arange(N(0.05)) / SR / 0.011)
    palm = fades(palm / (np.max(np.abs(palm)) + 1e-9), a=0.0012)
    y[:len(palm)] += palm * 0.55 * hard * (1.0 if side == "w" else 1.15)
    ck = burst(0.02, 1800 * r, 8500, ck_tau, rng)
    y[:len(ck)] += ck / (np.max(np.abs(ck)) + 1e-9) * 0.9
    y += modes([1340 * r, 2270 * r, 3410 * r, 5080 * r], [0.018, 0.012, 0.008, 0.005], [0.42, 0.3, 0.2, 0.1], dur, rng, 0.025)
    body = modes([205, 330, 515, 770], [0.055, 0.04, 0.03, 0.022], [0.55, 0.45, 0.3, 0.18], dur, rng, 0.03)
    y += fades(body, a=0.0015) * (0.9 + 0.2 * hard)
    i2 = N(rng.uniform(0.008, 0.013))                                  # the rocker toggles over
    k2 = burst(0.01, 2600, 7500, 0.0015, rng)
    y[i2:i2 + len(k2)] += k2 / (np.max(np.abs(k2)) + 1e-9) * 0.32
    y[i2:] += modes([980 * r, 1890 * r], [0.012, 0.007], [0.12, 0.08], dur - i2 / SR, rng, 0.03)
    i3 = N(rng.uniform(0.018, 0.026))                                  # the other button pops up
    k3 = burst(0.008, 3000, 8000, 0.001, rng)
    y[i3:i3 + len(k3)] += k3 / (np.max(np.abs(k3)) + 1e-9) * 0.16
    if sparks:                                                         # 9.Qxg7: sparks off White's button (the impact frame)
        for _ in range(9):
            j = N(rng.uniform(0.01, 0.17))
            k = burst(0.004, 3500, 11000, 0.0008, rng)
            y[j:j + len(k)] += k / (np.max(np.abs(k)) + 1e-9) * rng.uniform(0.05, 0.16)
    y = hp(y, 70, 2)
    return fades(y, r=0.05)


def vhs_rewind(dur, speed, rng, steps=(), stop_t=None, engage=True):
    """A VCR in fast rewind: the transport motor's whir (harmonic hum + gear whine), tape friction hiss, the tape's scrape
    squeal and the scan chatter of the picture's own audio, all tracking the scrub speed (speed: array per sample, 0..~1.2),
    with wow and flutter. A soft clunk when the transport engages; a head-switch tick on every step (clip change); at stop_t
    the speed has already braked to zero (pitch falling into it), a brake clunk, then nothing."""
    n = N(dur)
    t = np.arange(n) / SR
    s = np.clip(speed[:n], 0, None)
    wow = 0.004 * np.sin(2 * np.pi * 0.7 * t + rng.uniform(0, 6.28))
    flut = 0.012 * lp(white(n, rng), 14, 2) / 0.02
    fl = 1 + wow + np.clip(flut, -0.03, 0.03)
    out = np.zeros(n)
    # motor whir: harmonic hum on a motor frequency that rises with speed
    fm = (48 + 92 * s) * fl
    ph = 2 * np.pi * np.cumsum(fm) / SR
    hum = sum(a * np.sin(k * ph + rng.uniform(0, 6.28)) for k, a in ((1, 0.6), (2, 1.0), (3, 0.55), (4, 0.4), (6, 0.22), (8, 0.12)))
    out += lp(hum, 1800, 2) * 0.3 * np.clip(s, 0, 1) ** 0.6
    # gear/belt whine
    fw = (520 + 1150 * s) * fl
    pw = 2 * np.pi * np.cumsum(fw) / SR
    out += (np.sin(pw) + 0.3 * np.sin(2 * pw)) * 0.07 * np.clip(s, 0, 1)
    # tape friction hiss, flutter-modulated
    hiss = bp(pink(n, rng), 1400, 7500, 2)
    out += hiss / (np.std(hiss) + 1e-9) * 0.13 * np.clip(s, 0, 1) * (1 + 6 * np.clip(flut, -0.03, 0.03))
    # scrape squeal: a narrow resonance, pitch proportional to the speed (it falls as the transport brakes)
    fsq = (1350 + 1900 * s) * fl
    psq = 2 * np.pi * np.cumsum(fsq) / SR
    am = np.clip(0.55 + 0.45 * lp(white(n, rng), 6, 2) / 0.03, 0, 1.3)
    out += np.sin(psq + 0.6 * np.sin(2 * np.pi * 11 * t)) * 0.06 * am * np.clip(s, 0, 1) ** 1.5
    # scan chatter: the picture's own audio at many times speed (band-passed noise in quick random syllables)
    syl = np.clip(lp(white(n, rng), 18, 2) / 0.02, 0, None) ** 1.5
    chat = bp(white(n, rng), 2500, 6500, 2)
    out += chat / (np.std(chat) + 1e-9) * syl / (np.max(syl) + 1e-9) * 0.08 * np.clip(s, 0, 1)
    out = hp(out, 60, 2)
    # mechanics
    if engage:
        cl = modes([118, 240, 410], [0.03, 0.02, 0.012], [0.6, 0.35, 0.2], 0.12, rng) + np.pad(burst(0.01, 1500, 6000, 0.002, rng), (0, N(0.11)))[:N(0.12)] * 0.4
        add_at_1d(out, fades(cl, a=0.002) * 0.5, 0)
    for st in steps:                                                    # head switch on every clip change
        k = burst(0.006, 3000, 9000, 0.0009, rng)
        add_at_1d(out, k / (np.max(np.abs(k)) + 1e-9) * 0.09, N(st))
    if stop_t is not None:
        cl = modes([96, 205, 360, 620], [0.045, 0.028, 0.018, 0.01], [0.7, 0.45, 0.25, 0.12], 0.16, rng) \
            + np.pad(burst(0.012, 1200, 5000, 0.0025, rng), (0, N(0.15)))[:N(0.16)] * 0.5
        add_at_1d(out, fades(cl, a=0.0015, r=0.03) * 0.65, N(stop_t))
    return out


def add_at_1d(dst, y, i):
    a, b = max(0, i), min(len(dst), i + len(y))
    if b > a:
        dst[a:b] += y[a - i:b - i]


def counter_clunk(rng, heavy=1.0):
    """A reset: every roller snapping back to 0 at once against its spring: a steel click, the wheels' detents ratcheting
    home in a quick burst (3-4 clicks 5-9 ms apart), the steel panel's knock and a faint metallic ring."""
    dur = 0.16
    n = N(dur)
    y = np.zeros(n)
    k = burst(0.012, 1800, 7000, 0.002, rng)
    y[:len(k)] += k / (np.max(np.abs(k)) + 1e-9) * 0.8
    j = 0
    for i in range(int(rng.integers(3, 5))):
        j += N(rng.uniform(0.005, 0.009))
        kk = burst(0.006, 2500, 8000, 0.0011, rng)
        y[j:j + len(kk)] += kk / (np.max(np.abs(kk)) + 1e-9) * (0.35 - 0.06 * i)
    y += fades(modes([142, 262, 415, 655], [0.06, 0.045, 0.03, 0.02], [0.6, 0.5, 0.32, 0.2], dur, rng, 0.03), a=0.0015) * heavy
    y += modes([1830, 2910, 4170], [0.03, 0.022, 0.014], [0.06, 0.045, 0.03], dur, rng, 0.02)
    y += lp(white(n, rng), 180, 2) / 0.05 * 0.02 * np.exp(-np.arange(n) / SR / 0.02) * heavy
    return fades(hp(y, 60, 2), r=0.04)


def roller_tick(rng, carry=False):
    """One roller step (a day): a small detent click; a carry (the tens wheel stepping too) is a double, slightly heavier."""
    dur = 0.05
    y = np.zeros(N(dur))
    k = burst(0.008, 3000, 9000, 0.0009, rng)
    y[:len(k)] += k / (np.max(np.abs(k)) + 1e-9)
    y += modes([2550, 3900], [0.006, 0.004], [0.25, 0.12], dur, rng, 0.04)
    if carry:
        j = N(0.004)
        k2 = burst(0.008, 2000, 7000, 0.0013, rng)
        y[j:j + len(k2)] += k2 / (np.max(np.abs(k2)) + 1e-9) * 0.8
        y += fades(modes([420, 690], [0.015, 0.01], [0.35, 0.2], dur, rng, 0.03), a=0.001)
    return fades(hp(y, 200, 2), r=0.01)


# ============================================================================================ cues
def build_cues(T, E, song_len_s, songM, vocM):
    rng = lambda s: np.random.default_rng(2026_000 + s)
    IR_ROOM = ir(0.8, 0.45, lp_hz=7000, hp_hz=200, seed=21, predelay=0.006)     # the dark room round the board
    IR_DESK = ir(0.9, 0.55, lp_hz=6000, hp_hz=200, seed=22, predelay=0.008)     # the VCR on the console
    IR_SEA = ir(3.2, 2.6, lp_hz=2200, hp_hz=120, seed=23, predelay=0.035)       # under the sea: the ping's long tail
    IR_WALL = ir(0.7, 0.4, lp_hz=6500, hp_hz=250, seed=24, predelay=0.005)      # the counter's cinder-block wall
    cues = []
    ctx = {}

    # ---- 1. cold-open rewind: 7.16 (sub hit, rewind starts) -> stop on the floret, then silence until the match
    co = E["vhs"]["coldopen"]
    t0, stop = co["t0"], co["stop"]
    dur = stop - t0 + 0.2
    tl = np.arange(N(dur)) / SR
    brake = 0.11                                                      # the transport brakes into the stop (pitch falls)
    sp = 0.92 + 0.06 * np.sin(2 * np.pi * 3.1 * tl)
    sp *= smooth(ramp(tl, 0, 0.07)) * (1 - ramp(tl, stop - t0 - brake, stop - t0)) ** 1.6
    y = vhs_rewind(dur, sp, rng(1), steps=[s - t0 for s in co["steps"][1:]], stop_t=stop - t0)
    y = fades(reverb(pan(y, 0.0), IR_DESK, wet_db=-14)[:, :N(dur)], r=0.08)
    cues.append(Cue("vhs_coldopen", "Cold open: VHS rewind (the count scrubs back one spiral per 16th) and the hard stop on the floret",
                    f"{t0:.3f} (rewind starts, sub hit) -> brake {stop - brake:.3f} -> stop {stop:.3f} (paused on the floret); "
                    f"head-switch ticks on the steps {', '.join(f'{s:.3f}' for s in co['steps'][1:])}; silent from {stop + 0.2:.2f} until the match",
                    "synth: transport hum (48->140 Hz x 6 harmonics, LP 1.8 kHz) + gear whine (520->1670 Hz) + friction hiss (BP 1.4-7.5 kHz) "
                    "+ scrape squeal (1.35->3.25 kHz, pitch = scrub speed, falls with the 110 ms brake) + scan chatter; wow 0.7 Hz, flutter "
                    "14 Hz; engage and brake clunks (modes 96-620 Hz); small desk room RT60 0.55 s",
                    t0, y, med=12, worst=8, cap_db=-18, ride=True, group="vhs_coldopen"))
    ctx["coldopen"] = dict(t0=t0, stop=stop, steps=co["steps"])

    # ---- 2. the match (CO11 'Two hands strike a match in the dark', on count 2's whispered 'One')
    tm = co["t1"]
    y = match_strike(rng(2))
    c = Cue("match", "Cold open: a tiny match strike and flare (CO11, 'Two hands strike a match in the dark')",
            f"scratch {tm - 0.07:.3f} (in the silence after the stop), flare {tm:.3f} (= the cut, whispered 'One')",
            "take one's match_strike(): grainy BP noise scratch; crack + pop; flare = noise through SVF low-pass 9 -> 1.5 kHz; "
            "flame body; trimmed to 0.75 s (the burn fades under 'One'); ducks under the whisper, so the scratch in the silence is "
            "heard whole and the flare blooms as the word allows", tm - 0.07, y, med=14, worst=8, cap_db=-24, ride=True)
    c.clip_to(tm + 0.68, 0.25)
    cues.append(c)

    # ---- 3. chess clock: every press of render/src/scenes/t2/chess/schedule.js
    ck = E["clock"]
    back = ck["anchors"]["back"]
    for i, pr in enumerate(ck["presses"]):
        out_ = pr["t"] < back - 0.02
        spark = pr.get("label") == "9.Qxg7"
        hard = 1.0 + (0.15 if pr.get("capture") else 0) + (0.25 if spark else 0)
        y = clock_slap(pr["side"], rng(300 + i), hard=hard, sparks=spark)
        y = reverb(pan(y, -0.2 if pr["side"] == "w" else 0.2), IR_ROOM, wet_db=-15)
        who = "Jade (White)" if pr["side"] == "w" else "teal-tips (Black)"
        c = Cue(f"clock{i:02d}", f"Clock press {i}: {pr.get('label')} - {who}{' + sparks' if spark else ''}",
                f"{pr['t']:.3f} ({pr.get('grid')}, shot {pr.get('shot')})",
                "clock_slap", pr["t"], y, med=12 if out_ else 18, worst=8 if out_ else 12, cap_db=-15,
                group="clock_out" if out_ else "clock_back")
        c.side, c.spark, c.label = pr["side"], spark, pr.get("label")
        cues.append(c)
    ctx["clock"] = dict(n=len(ck["presses"]), first=ck["presses"][0]["t"], last=ck["presses"][-1]["t"], back=back, stop=ck["stop"])

    # ---- 4. sonar pings and depth charges (t2_arkhipov: 'sixty-two, depth charges falling')
    ak = E["arkhipov"]
    L6 = next(l for l in T.lines if l["text"].lower().startswith("sixty-two"))
    L7 = next(l for l in T.lines if l["text"].lower().startswith("two said fire"))
    stop_ak = L7["t"] - 0.05
    ws = L6["words"]
    g1 = find_gap(vocM, ak["t0"] - 0.16, ak["t0"] + 0.04) if vocM is not None else ak["t0"] - 0.1
    g2 = find_gap(vocM, ws[1]["t"] - 0.15, ws[1]["t"] + 0.1) if vocM is not None else ws[1]["t"]
    for k, tp, f, p, seed in (("sonar1", g1, D6, -0.1, 41), ("sonar2", g2, D6 * 2 ** (6 / 1200), 0.06, 42)):
        y = sonar_ping(f, rng(seed), IR_SEA, p)
        c = Cue(k, f"Arkhipov: sonar ping {k[-1]} (B-59 under the destroyers), long watery tail",
                f"{tp:.3f} (quietest vocal 20 ms near {'the BR14 cut ' + format(ak['t0'], '.3f') if k == 'sonar1' else 'sixty-two|depth ' + format(ws[1]['t'], '.3f')})",
                "take one's sonar_ping(): D6 sine + 8% 2nd, 4 ms attack, 90 ms hold, slight down-chirp (second +6 cents: closer), "
                "muffled echo +0.36 s; here a longer sea (RT60 2.6 s, LP 2.2 kHz, -4 dB)", tp, y, med=14, worst=8, cap_db=-20)
        c.clip_to(stop_ak, 0.3)
        cues.append(c)
    det = [ch for ch in ak["charges"] if ch["det"] < stop_ak - 0.25]
    for j, ch in enumerate(det):
        y = depth_charge(rng(50 + j))
        p = float(np.clip((ch["x"] - 960) / 960 * 0.7, -0.6, 0.6))
        c = Cue(f"thud{j + 1}", f"Arkhipov: depth charge {j + 1} goes off (its ring through the water; the boat shudders)",
                f"{ch['det']:.3f} = drop {ch['t']:.3f} + detAt({ak['charges'].index(ch)}) (arkhipov.js), x {ch['x']} px -> pan {p:+.2f}",
                "take one's depth_charge(): sine boom 95 -> 38 Hz + LP-noise body + muffled crack, bubble pulse +0.28 s, all LP 600 Hz",
                ch["det"], pan(y, p), med=12, worst=7, cap_db=-18)
        c.clip_to(stop_ak, 0.25)
        cues.append(c)
    ctx["arkhipov"] = dict(gaps=[g1, g2], det=[c["det"] for c in det], skipped=[c["det"] for c in ak["charges"] if c not in det], stop=stop_ak)

    # ---- 5. build rewind: Jade spins the jog wheel back; the scrub speed is the war clock's -dw/dt
    b = E["vhs"]["build"]
    w = np.array(b["w"])
    t0, whole = b["t0"], b["whole"]
    vel = -np.gradient(w[:, 1], w[:, 0])
    dur = whole - t0 + 0.25
    tl = t0 + np.arange(N(dur)) / SR
    v = np.interp(tl, w[:, 0], vel)
    v = lp(np.concatenate([np.full(N(0.2), v[0]), v]), 5, 2)[N(0.2):]          # the transport has inertia
    sp = np.clip(v / 3.6, 0, 1.25) * smooth(ramp(tl, t0, t0 + 0.09))
    sp *= (1 - ramp(tl, whole - 0.14, whole)) ** 1.6                           # the smear fades out: brake into 'whole'
    y = vhs_rewind(dur, sp, rng(5), stop_t=whole - t0)
    y = fades(reverb(pan(y, 0.0), IR_DESK, wet_db=-13)[:, :N(dur)], r=0.1)
    cues.append(Cue("vhs_build", "Build: VHS rewind of the war (BU05-BU06), whir and squeal tracking the scrub speed, stop on 'Earth whole'",
                    f"{t0:.3f} ('Only', rewind starts) -> brake {whole - 0.14:.3f} -> stop {whole:.3f} (the beat before 'all'; smear off)",
                    "synth: as the cold-open rewind; speed = -d(war clock)/dt from the BU05/BU06 p(t) (rwClock), LP 5 Hz inertia, "
                    "normalised at 3.6x; brake 140 ms into the stop clunk",
                    t0, y, med=13, worst=9, cap_db=-16, ride=True))
    ctx["build"] = dict(t0=t0, whole=whole, vmax=float(vel.max()))

    # ---- 6. the reset counter (t2_counter): a clunk per reset, a tick per counted day between, the roll-up ratchet
    cn = E["counter"]
    a0 = cn["resets"][0]["t"] - 0.45
    a1 = cn["climb"][0]
    dur = a1 - a0 + 0.25
    y = np.zeros(N(dur))
    for i, r in enumerate(cn["resets"]):
        g = db2a(np.random.default_rng(700 + i).uniform(-1.2, 0.6))
        add_at_1d(y, counter_clunk(rng(700 + i), heavy=1.0) * g, N(r["t"] - a0))
    for i, tk in enumerate(cn["ticks"]):
        if tk["t"] >= a0:
            add_at_1d(y, roller_tick(rng(800 + i)) * db2a(-13), N(tk["t"] - a0))
    y = fades(reverb(pan(y, 0.05), IR_WALL, wet_db=-14)[:, :N(dur)], a=0.002, r=0.08)
    cues.append(Cue("counter_resets", f"Outro: DAYS SINCE LAST RESET snaps to zero {len(cn['resets'])} times (heavier clunk each), "
                    "days ticking between", f"resets {cn['resets'][0]['t']:.3f} -> {cn['resets'][-1]['t']:.3f} (counter.js schedule(): "
                    f"32nd grid from {cn['grid0']:.3f}); {len(cn['ticks'])} day ticks (whole counts on twos)",
                    "synth: steel click + 3-4 detent clicks 5-9 ms apart + panel knock (modes 142-655 Hz) + faint ring (1.8-4.2 kHz), "
                    "+-1 dB per reset; ticks = detent click + 2.55/3.9 kHz modes at -13 dB; cinder-block wall RT60 0.4 s",
                    a0, y, med=12, worst=8, cap_db=-16, ride=True, group="counter"))
    r0, r1 = cn["climb"]
    dur = r1 - r0 + 0.3
    y = np.zeros(N(dur))
    for i, tk in enumerate(cn["roll"]):
        x = i / max(1, len(cn["roll"]) - 1)
        add_at_1d(y, roller_tick(rng(900 + i), carry=tk["carry"]) * db2a(-4 + 3 * x), N(tk["t"] - r0))
    add_at_1d(y, counter_clunk(rng(990), heavy=0.6) * db2a(-5), N(r1 - r0 + 0.012))       # the wheels land on the release value
    y = fades(reverb(pan(y, 0.05), IR_WALL, wet_db=-14)[:, :N(dur)], r=0.1)
    cues.append(Cue("counter_roll", f"Outro: the roll-up to {cn['target']} on 'higher', a ratchet tooth per day, settling on the value",
                    f"{r0:.3f} (last reset + 0.06) -> {r1:.3f} (climbEnd; 'higher' {cn['higher']:.3f}); {len(cn['roll'])} teeth, "
                    "accelerating (v = target * f^2.6), carries at 10/20/30/40",
                    "synth: roller ticks swelling +3 dB, carries doubled with a 420/690 Hz knock; a light clunk as the wheels land",
                    r0, y, med=12, worst=8, cap_db=-16, ride=True, group="counter"))
    ctx["counter"] = dict(resets=len(cn["resets"]), r_first=cn["resets"][0]["t"], r_last=cn["resets"][-1]["t"], roll=(r0, r1),
                          higher=cn["higher"], target=cn["target"])
    return cues, ctx


# ============================================================================================ levelling
def song_fit(c, songM):
    """The two song-relative gains (median margin, worst-frame margin) and the peak cap of cue c at 0 dB."""
    ts, cM, sM, act = c.margins(songM, 0.0)
    m = sM[act] - cM[act]
    return float(np.median(m) - c.med), float(m.min() - c.worst), c.cap_db - peak_db(c.y)


def level_clock(cues, songM, vocM):
    """The clock presses read as one hand: each phase (drums out / drums back) gets one level, the median of its presses'
    median-margin fits, with +-0.8 dB per slap and +2 dB on 9.Qxg7 (the impact frame); no press closer to the song than its
    worst-frame margin, then each one under the vocal where a word sounds."""
    for grp in ("clock_out", "clock_back"):
        cs = [c for c in cues if c.group == grp]
        fits = [song_fit(c, songM) for c in cs]
        g_grp = float(np.median([f[0] for f in fits]))
        r = np.random.default_rng(31 if grp == "clock_out" else 32)
        for c, (g_med, g_worst, cap) in zip(cs, fits):
            want = g_grp + r.uniform(-0.8, 0.8) + (2.0 if c.spark else 0.0)
            c.gain_db = min(want, g_worst, cap)
            c.fit_note = "phase level" if c.gain_db == want else ("worst-frame margin" if c.gain_db == g_worst else "peak cap")
            c.phase_gain_db = g_grp
            if vocM is not None:
                g0 = c.gain_db
                under_vocal(c, vocM)
                if c.gain_db < g0 - 1e-9:
                    c.fit_note = f"under the vocal ({c.gain_db - g0:+.1f} dB)"


def overlap_pass(cues, songM, vocM, n_tot):
    """Take one's rule on the summed layer: wherever cues overlap, the sum must still clear the 6 dB rule (trim the cues
    that make up the layer there)."""
    for it in range(10):
        layer = sum_layer(cues, n_tot)
        layM = Momentary(kpow(layer))
        trims = {}
        for c in cues:
            ts, cM, sM, act = c.margins(songM)
            m = sM[act] - layM(ts[act])
            j = int(np.argmin(m))
            if m[j] < MIN_MARGIN_DB + 0.45:
                for o in dominant(cues, ts[act][j], 0.4):
                    trims[o.id] = max(trims.get(o.id, 0.0), MIN_MARGIN_DB + 0.5 - m[j])
            if vocM is not None:
                ts1, cS, vS, act1 = c.margins(vocM, win=VOCAL_WIN)
                vS, word = vocal_present(vocM, ts1)
                pres = act1 & word
                if pres.any():
                    mv = vS[pres] - layM(ts1[pres], win=VOCAL_WIN)
                    j = int(np.argmin(mv))
                    if mv[j] < MIN_MARGIN_DB + 0.45:
                        for o in dominant(cues, ts1[pres][j], VOCAL_WIN):
                            trims[o.id] = max(trims.get(o.id, 0.0), MIN_MARGIN_DB + 0.5 - mv[j])
        if not trims:
            return
        print(f"overlap pass {it}: " + ", ".join(f"{k} -{v:.1f} dB" for k, v in trims.items()))
        for o in cues:
            if o.id in trims:
                o.gain_db -= trims[o.id]
                o.overlap_trim_db = getattr(o, "overlap_trim_db", 0.0) + trims[o.id]


def gate_song_overs(cues, song, n_song):
    """Keep the layer silent wherever the song's own true peak exceeds -0.5 dBTP (take one's rule)."""
    hot_total = 0
    for c in cues:
        a, b = N(c.t0), min(n_song, N(c.t1))
        if b <= a:
            continue
        up = resample_poly(song[:, a:b], 4, 1, axis=-1)
        hot = np.max(np.abs(up), axis=0).reshape(-1, 4).max(1)[:b - a] > db2a(MIX_TP_MAX_DB)
        if hot.any():
            hot = np.convolve(hot.astype(float), np.ones(N(0.01)), "same") > 0
            gate = 1 - lp(hot.astype(float), 200, 2)
            c.y[:, :len(gate)] *= np.clip(gate, 0, 1)
            hot_total += int(hot.sum())
    return hot_total


def mix_of(song_i, layer):
    q = np.round(layer * 2 ** 23).astype(np.int64)
    m = song_i.astype(np.int64) + q
    clipped = int(np.sum((m > 2 ** 23 - 1) | (m < -2 ** 23)))
    return np.clip(m, -2 ** 23, 2 ** 23 - 1), clipped


# ============================================================================================ main
def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--timing", default=os.path.join(ROOT, "render", "data", "timing.json"))
    ap.add_argument("--no-audition", action="store_true")
    args = ap.parse_args(argv)
    t_start = time.time()
    os.makedirs(os.path.join(WORK, "stems"), exist_ok=True)
    for f in os.listdir(os.path.join(WORK, "stems")):
        if f.endswith(".wav"):
            os.remove(os.path.join(WORK, "stems", f))
    os.makedirs(MEDIA, exist_ok=True)

    T = S1.Timing(args.timing)
    E, ev_src = load_events()
    song_i = decode_s24(SONG_MP3)
    n_song = song_i.shape[1]
    n_tot = n_song                                                   # brief: the mix is the song's length
    song = song_i.astype(np.float64) / 2 ** 23
    print(f"song: {n_song} samples = {n_song / SR:.3f} s; events: {ev_src}")
    songM = Momentary(kpow(song))
    v, sr = sf.read(VOCALS, always_2d=True)
    assert sr == SR, sr
    vocM = Momentary(kpow(v.T))

    cues, ctx = build_cues(T, E, n_song / SR, songM, vocM)
    # ---- levels: the clock as one hand per phase; every other cue by take one's fit (median / worst margin, cap, vocal)
    level_clock(cues, songM, vocM)
    for c in cues:
        if not c.group.startswith("clock"):
            fit_level(c, songM, vocM)
    hot_total = gate_song_overs(cues, song, n_song)
    overlap_pass(cues, songM, vocM, n_tot)
    for o in cues:
        if getattr(o, "overlap_trim_db", 0.0):
            o.fit_note += f"; -{o.overlap_trim_db:.1f} dB for the overlap"

    # ---- integrated loudness within 0.01 LU of the song: a common trim on the layer if needed (never on the song)
    I_song = integrated_lufs(song)
    trim_db = 0.0
    for it in range(12):
        layer = sum_layer(cues, n_tot).astype(np.float32).astype(np.float64)
        mix_i, _ = mix_of(song_i, layer)
        d = integrated_lufs(mix_i / 2 ** 23) - I_song
        print(f"loudness: layer trim {trim_db:+.2f} dB -> delta {d:+.4f} LU")
        if abs(d) <= LUFS_TOL * 0.8:
            break
        step = -0.5
        trim_db += step
        for c in cues:
            c.gain_db += step
    ctx["loudness_trim_db"] = trim_db

    layer = sum_layer(cues, n_tot).astype(np.float32).astype(np.float64)
    if peak_db(layer) > LAYER_PEAK_MAX_DB:
        s = db2a(LAYER_PEAK_MAX_DB - 0.1 - peak_db(layer))
        layer *= s
        for c in cues:
            c.gain_db += float(a2db(s))
    windows = [(N(c.t0), min(n_tot, N(c.t0) + c.y.shape[1])) for c in cues]
    mix_i, clipped = mix_of(song_i, layer)

    # ---- write
    f_layer = os.path.join(WORK, "sfx_t2_layer.wav")
    sf.write(f_layer, layer.T.astype(np.float32), SR, subtype="FLOAT")
    sf.write(MIX, (mix_i.T.astype(np.int32) << 8), SR, subtype="PCM_24")
    for c in cues:
        sf.write(os.path.join(WORK, "stems", f"{c.id}.wav"), (c.y * db2a(c.gain_db)).T.astype(np.float32), SR, subtype="FLOAT")

    # ============================================================================ verification
    back, _ = sf.read(MIX, dtype="int32", always_2d=True)
    back = (back >> 8).T.astype(np.int64)
    fresh = decode_s24(SONG_MP3).astype(np.int64)                    # an independent second decode of the MP3
    inwin = np.zeros(n_tot, dtype=bool)
    for a, b in windows:
        inwin[a:b] = True
    out = ~inwin
    resid = back - fresh
    lay_back = sf.read(f_layer, dtype="float64", always_2d=True)[0].T
    V = {}
    V["null_test"] = dict(
        reference="second ffmpeg decode of inputs/Hold Fire.mp3 to 24-bit PCM",
        samples_total=int(n_tot), samples_outside_cue_windows=int(out.sum()),
        cue_window_seconds=round(float(inwin.sum()) / SR, 3), n_cue_windows=len(windows),
        mix_minus_song_nonzero_outside=int(np.count_nonzero(resid[:, out])),
        layer_nonzero_outside=int(np.count_nonzero(lay_back[:, out])),
        bit_identical_outside_cues=bool(np.count_nonzero(resid[:, out]) == 0),
        inside_residual_equals_quantised_layer=bool(np.array_equal(resid[:, inwin], np.round(lay_back[:, inwin] * 2 ** 23).astype(np.int64))),
        mix_length_samples=int(back.shape[1]), song_length_samples=int(fresh.shape[1]), same_length=bool(back.shape[1] == fresh.shape[1]),
        mix_clipped_samples=clipped, song_tp_hot_samples_gated=hot_total)
    mixf, songf = back.astype(np.float64) / 2 ** 23, fresh.astype(np.float64) / 2 ** 23
    V["peaks"] = dict(
        layer_sample_peak_dbfs=round(peak_db(lay_back), 2), layer_true_peak_dbtp=round(true_peak_db(lay_back), 2),
        song_sample_peak_dbfs=round(peak_db(songf), 2), song_true_peak_dbtp=round(true_peak_db(songf), 2),
        mix_sample_peak_dbfs=round(peak_db(mixf), 2), mix_true_peak_dbtp=round(true_peak_db(mixf), 2),
        mix_true_peak_in_cue_windows_dbtp=round(max(true_peak_db(mixf[:, a:b]) for a, b in windows), 2),
        limits=dict(layer_peak_max_dbfs=LAYER_PEAK_MAX_DB, mix_true_peak_max_dbtp=MIX_TP_MAX_DB))
    I_mix = integrated_lufs(mixf)
    V["loudness"] = dict(song_integrated_lufs=round(I_song, 4), mix_integrated_lufs=round(I_mix, 4), delta_lu=round(I_mix - I_song, 4),
                         layer_trim_db=trim_db, layer_integrated_lufs=round(integrated_lufs(lay_back), 2),
                         ffmpeg_ebur128=dict(song=ebur128(SONG_MP3), mix=ebur128(MIX)))

    layM = Momentary(kpow(lay_back))
    rows = []
    for c in cues:
        ts, cM, sM, act = c.margins(songM)
        tot = layM(ts)
        m_c, m_t = sM[act] - cM[act], sM[act] - tot[act]
        ts1, cS, vS, act1 = c.margins(vocM, win=VOCAL_WIN)
        vS, word = vocal_present(vocM, ts1)
        pres = act1 & word
        vm_med = vm_worst = None
        if pres.any():
            mv = vS[pres] - layM(ts1[pres], win=VOCAL_WIN)
            vm_med, vm_worst = round(float(np.median(mv)), 1), round(float(mv.min()), 1)
        rows.append(dict(
            id=c.id, group=c.group, title=c.title, sync=c.sync, how=c.how, start_s=round(c.t0, 3), end_s=round(c.t1, 3),
            start_sample=N(c.t0), gain_db=round(c.gain_db, 2), level_rule=c.fit_note,
            peak_dbfs=round(peak_db(c.y * db2a(c.gain_db)), 1), max_momentary_lufs=round(float(cM.max()), 1),
            song_momentary_median_lufs=round(float(np.median(sM[act])), 1),
            margin_median_db=round(float(np.median(m_c)), 1), margin_worst_db=round(float(m_c.min()), 1),
            margin_worst_total_layer_db=round(float(m_t.min()), 1),
            under_vocal_median_db=vm_med, under_vocal_worst_db=vm_worst, vocal_frames=int(pres.sum()), exempt_fraction=0.0,
            passes=bool(m_t.min() >= MIN_MARGIN_DB and (vm_worst is None or vm_worst >= MIN_MARGIN_DB))))
    V["cues_pass_6db_rule"] = all(r["passes"] for r in rows)
    V["song_length_s"] = n_song / SR
    V["events"] = ev_src
    V["checks"] = dict(
        bit_identical_outside_cues=V["null_test"]["bit_identical_outside_cues"],
        inside_is_song_plus_layer=V["null_test"]["inside_residual_equals_quantised_layer"],
        same_length_as_song=V["null_test"]["same_length"],
        layer_peak_ok=V["peaks"]["layer_true_peak_dbtp"] <= LAYER_PEAK_MAX_DB,
        mix_true_peak_ok=V["peaks"]["mix_true_peak_dbtp"] <= MIX_TP_MAX_DB,
        no_clipping=clipped == 0, cues_6db_under_song_and_vocal=V["cues_pass_6db_rule"],
        loudness_within_0_01lu=abs(V["loudness"]["delta_lu"]) <= LUFS_TOL)
    json.dump(dict(summary=V, cues=rows, context=ctx), open(os.path.join(WORK, "cues.json"), "w"), indent=1, default=float)
    json.dump(V, open(os.path.join(WORK, "verify.json"), "w"), indent=1, default=float)
    S1.plot(cues, rows, songM, layM, vocM, ctx, os.path.join(WORK, "cue_levels.png"))

    aud = None if args.no_audition else audition(cues)
    write_doc(rows, V, ctx, T, aud)

    print(f"{'cue':15s} {'start':>8s} {'end':>8s} {'gain':>6s} {'peak':>6s} {'maxM':>6s} {'med':>5s} {'tot':>5s} {'voc':>5s}  rule")
    for r in rows:
        f = lambda x: "  -  " if x is None else f"{x:5.1f}"
        print(f"{r['id']:15s} {r['start_s']:8.3f} {r['end_s']:8.3f} {r['gain_db']:6.1f} {r['peak_dbfs']:6.1f} {r['max_momentary_lufs']:6.1f} "
              f"{f(r['margin_median_db'])} {f(r['margin_worst_total_layer_db'])} {f(r['under_vocal_worst_db'])}  {r['level_rule']}"
              f"{'' if r['passes'] else '  <-- FAIL'}")
    print(json.dumps(V, indent=1, default=float))
    if aud:
        print("audition:", aud)
    print(f"done in {time.time() - t_start:.1f} s")
    return 0 if all(V["checks"].values()) else 1


# ============================================================================================ audition video
def audition(cues, pad=1.0, gap=0.3):
    """work/out/sfx_audition.mp4: the latest 540p preview (v7 if it is complete, else v6) with the t2 mix, cut to the cue
    windows (+-1 s each, overlapping windows merged, frame-aligned), concatenated with 0.3 s of black and silence between."""
    out_dir = os.path.join(ROOT, "work", "out")
    src = None
    for vname in ("preview_540p_v7.mp4", "preview_540p_v6.mp4"):
        f = os.path.join(out_dir, vname)
        if os.path.exists(f):
            r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True)
            try:
                if float(r.stdout.strip()) > 240:
                    src = f
                    break
            except ValueError:
                pass
    if src is None:
        print("audition: no complete preview found")
        return None
    fps = 24.0
    ws = sorted((c.t0 - pad, c.t1 + pad) for c in cues)
    segs = []
    for a, b in ws:
        if segs and a <= segs[-1][1]:
            segs[-1][1] = max(segs[-1][1], b)
        else:
            segs.append([a, b])
    segs = [(max(0.0, np.floor(a * fps) / fps), np.ceil(b * fps) / fps) for a, b in segs]
    fc, labels = [], []
    for i, (a, b) in enumerate(segs):
        fc.append(f"[0:v]trim=start={a:.6f}:end={b:.6f},setpts=PTS-STARTPTS,format=yuv420p[v{i}]")
        fc.append(f"[1:a]atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")
        if i < len(segs) - 1:
            fc.append(f"color=c=black:s=960x540:r=24:d={gap},format=yuv420p,setsar=1[gv{i}]")
            fc.append(f"anullsrc=r={SR}:cl=stereo,atrim=0:{gap},asetpts=PTS-STARTPTS[ga{i}]")
            labels.append(f"[gv{i}][ga{i}]")
    fc.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=1[v][a]")
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-i", MIX, "-filter_complex", ";".join(fc),
           "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", AUDITION]
    subprocess.run(cmd, check=True)
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", AUDITION], capture_output=True, text=True)
    return dict(file=os.path.relpath(AUDITION, ROOT), source=os.path.relpath(src, ROOT), segments=[(round(a, 3), round(b, 3)) for a, b in segs],
                duration_s=round(float(r.stdout.strip()), 2))


# ============================================================================================ docs/take2/SOUND_T2.md
def mmss(t):
    return f"{int(t // 60)}:{t % 60:06.3f}"


def write_doc(rows, V, ctx, T, aud):
    nt, pk, ld = V["null_test"], V["peaks"], V["loudness"]
    fmt = lambda x: "-" if x is None else f"{x:.1f}"
    L = ["# HOLD FIRE take two: sound design (cue sheet)\n",
         "*Generated by `tools/audio/sfx_t2.py` (re-run after any timing or edit change: every time below is read from the edit "
         f"itself by `tools/audio/t2_events.mjs`; this run: {V['events']}). Do not edit by hand.*\n",
         "## What it is\n",
         "A light layer, only where the picture makes a sound and the song leaves room: the chess clock in the bridge, the two VHS "
         "rewinds, the match after the cold-open rewind, the sonar and depth charges under 'sixty-two', and the reset counter in "
         "the outro. Same rules as take one (`docs/SOUND.md`):\n",
         "* **The song is untouched**: mix = song + layer, sample-aligned; outside the cue windows the layer is exactly 0, so the mix "
         "is bit-identical to the song there (null test below). No normalising, ducking, compression or limiting of the song.",
         "* **Under the song**: each cue sits at a target median margin under the song's momentary loudness (BS.1770, 400 ms) and "
         "never closer than its worst-frame margin; overlaps are checked on the summed layer.",
         f"* **Under the vocal**: wherever a word sounds (vocal stem >= -40 LUFS in 50 ms windows, within 12 dB of the word's peak) "
         f"the whole layer sits >= {MIN_MARGIN_DB:.0f} dB under the vocal (fitted at {VOCAL_FIT_DB:.0f}); event cues take a lower "
         "gain, the rewinds and the counter duck under the words with a smoothed gain curve on the layer only.",
         f"* **Loudness unchanged**: integrated loudness within {LUFS_TOL} LU of the song (here {ld['delta_lu']:+.4f} LU"
         + (f", after a common {ld['layer_trim_db']:+.1f} dB trim on the layer" if ld["layer_trim_db"] else "") + ").",
         "* **All synthesized** (numpy/scipy, seeded, deterministic); take one's match, sonar and depth-charge synths are reused.\n",
         "## The clock\n",
         f"{ctx['clock']['n']} presses, one per clock press of `render/src/scenes/t2/chess/schedule.js` (the start press "
         f"{ctx['clock']['first']:.3f}, then every ply to 21...Qg4+ on 'hand' {ctx['clock']['last']:.3f}; the clocks stop on 'let' "
         f"{ctx['clock']['stop']:.3f} without a press). Drums out until {ctx['clock']['back']:.3f}: there the slaps are the rhythm "
         "(one level for the phase, about 12 dB under the song); once the drums return they drop to about 18 dB under. "
         "Jade (White) is panned left and a little rounder; teal-tips (Black) right, harder and brighter. 9.Qxg7 on 'spark' gets +2 dB "
         "and a few spark ticks (the sparks off the clock). Every slap is also held 7 dB under the sung bridge vocal where it lands "
         "in a word, so the levels below vary press by press.\n",
         "Sound: palm thump (LP noise 260/320 Hz, 11 ms) + plastic button click (BP 1.8-8.5 kHz, 2-2.6 ms) with button modes "
         "(1.34/2.27/3.41/5.08 kHz x side ratio 1.00/1.07) + wooden case knock (205/330/515/770 Hz, 22-55 ms) + the rocker toggling "
         "over 8-13 ms later + the other button popping up at 18-26 ms; +-2.5% mode jitter per press; small dark room (RT60 0.45 s, -15 dB).\n",
         "## Cues\n",
         "Margins in dB: *song* = song momentary minus cue (median / worst, the worst on the summed layer); *vocal* = vocal stem minus "
         "the summed layer in 50 ms frames where a word sounds (median / worst; `-` = no word under the cue).\n",
         "| # | cue | window (s) | sync | gain | peak | max momentary | song margin med / worst | vocal margin med / worst | level rule |",
         "|---|---|---|---|---|---|---|---|---|---|"]
    for i, r in enumerate(rows, 1):
        title = r["title"]
        L.append(f"| {i} | **{r['id']}**: {title} | {r['start_s']:.3f}-{r['end_s']:.3f} ({mmss(r['start_s'])}) | {r['sync']} | "
                 f"{r['gain_db']:+.1f} dB | {r['peak_dbfs']:.1f} dBFS | {r['max_momentary_lufs']:.1f} LUFS | "
                 f"{fmt(r['margin_median_db'])} / {fmt(r['margin_worst_total_layer_db'])} | {fmt(r['under_vocal_median_db'])} / "
                 f"{fmt(r['under_vocal_worst_db'])} | {r['level_rule']} |")
    L.append("\n### How each is made\n")
    seen = set()
    for r in rows:
        if r["how"] == "clock_slap" or r["how"] in seen:
            continue
        seen.add(r["how"])
        L.append(f"* **{r['id']}**: {r['how']}")
    worst_v = [r["under_vocal_worst_db"] for r in rows if r["under_vocal_worst_db"] is not None]
    L += ["", "## Verification\n", "| check | result |", "|---|---|",
          f"| null test outside the cue windows ({nt['samples_outside_cue_windows']:,} of {nt['samples_total']:,} samples per channel; "
          f"{nt['n_cue_windows']} windows, {nt['cue_window_seconds']:.1f} s) | mix - song nonzero: **{nt['mix_minus_song_nonzero_outside']}** "
          f"samples; layer nonzero: {nt['layer_nonzero_outside']}; bit-identical: **{nt['bit_identical_outside_cues']}** |",
          f"| inside the windows | mix - song == round(layer x 2^23) exactly: {nt['inside_residual_equals_quantised_layer']} |",
          f"| length | mix {nt['mix_length_samples']:,} samples = song {nt['song_length_samples']:,} ({V['song_length_s']:.3f} s): {nt['same_length']} |",
          f"| integrated loudness | song {ld['song_integrated_lufs']:.3f} LUFS, mix {ld['mix_integrated_lufs']:.3f} LUFS: "
          f"**delta {ld['delta_lu']:+.4f} LU** (limit {LUFS_TOL}); ffmpeg ebur128: song {ld['ffmpeg_ebur128']['song'].get('integrated_lufs')}, "
          f"mix {ld['ffmpeg_ebur128']['mix'].get('integrated_lufs')} LUFS |",
          f"| layer alone | {ld['layer_integrated_lufs']:.1f} LUFS integrated; peak {pk['layer_sample_peak_dbfs']:.2f} dBFS, "
          f"{pk['layer_true_peak_dbtp']:.2f} dBTP (limit {LAYER_PEAK_MAX_DB:.0f}) |",
          f"| true peak | song {pk['song_true_peak_dbtp']:.2f} dBTP; mix {pk['mix_true_peak_dbtp']:.2f} dBTP (in the cue windows "
          f"{pk['mix_true_peak_in_cue_windows_dbtp']:.2f}; limit {MIX_TP_MAX_DB}); clipped samples {nt['mix_clipped_samples']} |",
          f"| every cue >= 6 dB under the song (400 ms) and under the vocal where a word sounds (50 ms), all cues summed | "
          f"{V['cues_pass_6db_rule']} (closest to the vocal: {min(worst_v):.1f} dB) |",
          f"| all checks | {all(V['checks'].values())} ({', '.join(k for k, v in V['checks'].items() if v)}) |\n",
          "## Timing notes\n",
          f"* Cold open: the rewind starts on the sub hit {ctx['coldopen']['t0']:.3f} and runs to the stop on the floret "
          f"{ctx['coldopen']['stop']:.3f} (`t2_vhs_rewind` rewind 1 -> 0.12); the transport brakes over the last 110 ms so the squeal's "
          f"pitch falls into the stop clunk; then silence until the match (scratch in the gap, flare on the CO11 cut).",
          f"* Build: the whir follows the war clock's scrub speed (peak {ctx['build']['vmax']:.1f}x) and stops on 'Earth whole' "
          f"{ctx['build']['whole']:.3f}; the slow drift after it (no smear) is silent.",
          f"* Sonar: pings in the quietest vocal 20 ms near the BR14 cut and 'sixty-two|depth': "
          f"{', '.join(f'{g:.3f}' for g in ctx['arkhipov']['gaps'])}. Thuds on the drawn detonations (drop + detAt): "
          f"{', '.join(f'{g:.3f}' for g in ctx['arkhipov']['det'])}; skipped (they go off after the cut to 'two said fire' or too "
          f"close to it): {', '.join(f'{g:.3f}' for g in ctx['arkhipov']['skipped'])}. Everything ends by {ctx['arkhipov']['stop']:.2f}.",
          f"* Counter: {ctx['counter']['resets']} resets {ctx['counter']['r_first']:.3f}-{ctx['counter']['r_last']:.3f}, roll "
          f"{ctx['counter']['roll'][0]:.3f}-{ctx['counter']['roll'][1]:.3f} up to {ctx['counter']['target']} ('higher' {ctx['counter']['higher']:.3f}). "
          "The value depends on the release date (counter.js `release`): re-run after changing it.\n",
          "## Files\n",
          "* `tools/audio/sfx_t2.py` (this layer; imports `tools/audio/sfx.py`), `tools/audio/t2_events.mjs` (the picture's events, read-only).",
          "* `media/audio/hold_fire_t2_mix.wav`: PCM 24-bit, 48 kHz stereo, the song's length. For take two render with "
          "`node render/tools/render.mjs ... --audio media/audio/hold_fire_t2_mix.wav` (without `--audio` render.mjs picks "
          "`media/audio/hold_fire_mix.wav`, take one's mix, if it exists).",
          "* `work/sfx_t2/`: `events.json`, `sfx_t2_layer.wav`, `stems/<cue>.wav`, `cues.json`, `verify.json`, `cue_levels.png` (ear proxy)."]
    if aud:
        L.append(f"* `{aud['file']}`: audition, {aud['duration_s']:.1f} s = `{aud['source']}` with this mix, cut to the cue windows "
                 f"+-1 s (merged where they overlap: {', '.join(f'{a:.2f}-{b:.2f}' for a, b in aud['segments'])}), 0.3 s black between.")
    open(DOC, "w").write("\n".join(L) + "\n")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
