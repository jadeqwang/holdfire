#!/usr/bin/env python3
"""HOLD FIRE: the sound-design layer (cue sheet: docs/SOUND.md, which this script writes).

The song is never touched. Every cue is synthesized here (numpy/scipy, seeded, deterministic), placed from the same
timing the renderer uses (render/data/timing.json, read the way render/src/timeline.js reads it), levelled against
the song's own momentary loudness so it always sits under it, and summed onto the untouched song:

    mix_24bit = song_24bit + round(layer * 2^23)        (sample-exact; the song is not scaled, normalised or compressed)

Outside the cue windows the layer is exactly 0.0, so the mix is bit-identical to the song there (null-tested below).

    python3 tools/audio/sfx.py                       # everything: layer, mix wav + m4a, plots, verify.json, docs/SOUND.md
    python3 tools/audio/sfx.py --timing analysis/timing.json   # re-time from another timing file
    python3 tools/audio/sfx.py --no-m4a              # skip the AAC encode

Writes
    work/sfx/sfx_layer.wav           48 kHz stereo float32, 249.2 s (the film's length: song + 2.0 s end-card tail)
    work/sfx/stems/<cue>.wav         each cue alone at final gain (sample 0 = cue window start, see cues.json)
    work/sfx/cues.json               cue windows, sync points, gains, levels, margins
    work/sfx/cue_levels.png          ear proxy: song vs layer momentary loudness per cue
    work/sfx/verify.json             null test, peaks, true peaks, LUFS (song vs mix), m4a checks
    media/audio/hold_fire_mix.wav    48 kHz stereo PCM 24-bit, 249.2 s = song + layer (+ tail)
    media/audio/hold_fire_mix.m4a    AAC 320k of the same
    docs/SOUND.md                    the cue sheet (generated)
"""
import argparse
import io
import json
import os
import subprocess
import sys
import time

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SONG_MP3 = os.path.join(ROOT, "inputs", "Hold Fire.mp3")
VOCALS = os.path.join(ROOT, "work", "stems", "vocals.wav")          # BS-RoFormer stem (optional: gap finding, report)
OLD_DECODE = os.path.join(ROOT, "work", "audio", "song.wav")       # earlier ffmpeg float decode (optional cross-check)
WORK = os.path.join(ROOT, "work", "sfx")
MEDIA = os.path.join(ROOT, "media", "audio")
DOC = os.path.join(ROOT, "docs", "SOUND.md")

SR = 48000
TOTAL_S = 249.2            # film length: render/src/timeline.js Z3 ends at A.duration + 2 (A.duration falls back to 247.2)
LAYER_PEAK_MAX_DB = -14.0  # brief: layer peak <= -14 dBFS
MIX_TP_MAX_DB = -0.5       # brief: mix true peak <= -0.5 dBTP (where the song itself is below that)
MIN_MARGIN_DB = 6.0        # brief: every cue >= 6 dB under the song (except scope pre-music and the end tail)


# ============================================================================================ small DSP kit
def N(t):
    return int(round(t * SR))


def tt(d):
    return np.arange(N(d)) / SR


def db2a(db):
    return 10.0 ** (np.asarray(db, dtype=np.float64) / 20.0)


def a2db(a):
    return 20.0 * np.log10(np.maximum(np.asarray(a, dtype=np.float64), 1e-12))


def _sos(kind, f, order):
    return butter(order, f, kind, fs=SR, output="sos")


def lp(y, f, order=4):
    return sosfilt(_sos("low", f, order), y, axis=-1)


def hp(y, f, order=4):
    return sosfilt(_sos("high", f, order), y, axis=-1)


def bp(y, lo, hi, order=4):
    return sosfilt(_sos("band", [lo, hi], order), y, axis=-1)


def ramp(t, a, b):
    return np.clip((np.asarray(t, dtype=np.float64) - a) / (b - a), 0.0, 1.0)


def smooth(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def ease_out_cubic(x):
    x = np.clip(x, 0.0, 1.0)
    return 1 - (1 - x) ** 3


def fades(y, a=0.0, r=0.0):
    """Raised-cosine fade in/out (seconds) on the last axis."""
    y = np.array(y, dtype=np.float64, copy=True)
    n = y.shape[-1]
    if a > 0:
        k = min(n, max(2, N(a)))
        y[..., :k] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
    if r > 0:
        k = min(n, max(2, N(r)))
        y[..., n - k:] *= 0.5 + 0.5 * np.cos(np.pi * (np.arange(k) + 1) / k)
    return y


def stereo(y):
    return y if y.ndim == 2 else np.stack([y, y])


def pan(y, p):
    """Constant-power pan (p in [-1, 1], scalar or per-sample) -> (2, n); centre = unity in both channels."""
    th = (np.asarray(p, dtype=np.float64) + 1) * np.pi / 4
    return np.stack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2)


def add_at(dst, y, i):
    """Add y (mono or stereo) into dst (2, n) starting at sample i."""
    y = stereo(y)
    a, b = max(0, i), min(dst.shape[1], i + y.shape[1])
    if b > a:
        dst[:, a:b] += y[:, a - i:b - i]


def white(n, rng):
    return rng.standard_normal(n)


def pink(n, rng):
    """Pink-ish noise (1/f power) by FFT shaping, unit RMS."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / np.sqrt(np.maximum(f, 20.0))
    y = np.fft.irfft(X, n)
    return y / (np.sqrt(np.mean(y ** 2)) + 1e-12)


def svf(x, fc, q, mode="bp"):
    """Zavalishin TPT state-variable filter with a per-sample cutoff (array) - for sweeps."""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape)
    g = np.tan(np.pi * np.clip(fc, 10, SR * 0.45) / SR)
    k = 1.0 / q
    a1 = 1 / (1 + g * (g + k))
    a2 = g * a1
    a3 = g * a2
    out = np.empty_like(x)
    ic1 = ic2 = 0.0
    sel = {"lp": 0, "bp": 1, "hp": 2}[mode]
    for i in range(len(x)):
        v3 = x[i] - ic2
        v1 = a1[i] * ic1 + a2[i] * v3
        v2 = ic2 + a2[i] * ic1 + a3[i] * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v2 if sel == 0 else (v1 if sel == 1 else x[i] - k * v1 - v2)
    return out


def ir(dur, rt60, lp_hz=8000, hp_hz=150, seed=0, predelay=0.0):
    """Synthetic stereo reverb impulse response (decaying filtered noise), unit energy per channel."""
    rng = np.random.default_rng(seed)
    n = N(dur)
    t = np.arange(n) / SR
    env = 10 ** (-3 * t / rt60) * (1 - np.exp(-t / 0.004))
    ch = [hp(lp(rng.standard_normal(n) * env, lp_hz, 2), hp_hz, 2) for _ in range(2)]
    pd = np.zeros(N(predelay))
    out = np.stack([np.concatenate([pd, c]) for c in ch])
    return out / np.sqrt(np.sum(out ** 2) / 2)


def reverb(y, impulse, wet_db=-12.0, dry=1.0):
    y = stereo(y)
    w = np.stack([fftconvolve(y[0], impulse[0]), fftconvolve(y[1], impulse[1])])
    out = db2a(wet_db) * w
    out[:, :y.shape[1]] += dry * y
    return out


def peak_db(y):
    return float(a2db(np.max(np.abs(y))))


# ============================================================================================ loudness (BS.1770-4)
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def kpow(y):
    """K-weighted power, summed over channels (1-D, per sample)."""
    y = stereo(y)
    k = lfilter(*_K2, lfilter(*_K1, y, axis=-1), axis=-1)
    return np.sum(k * k, axis=0)


class Momentary:
    """Momentary loudness (400 ms window, centred) of a power array whose sample 0 sits at time t0."""

    def __init__(self, p, t0=0.0):
        self.cs = np.concatenate([[0.0], np.cumsum(p, dtype=np.float64)])
        self.t0, self.n = t0, len(p)

    def __call__(self, times, win=0.4):
        c = np.round((np.asarray(times) - self.t0) * SR).astype(np.int64)
        h = N(win) // 2
        a, b = np.clip(c - h, 0, self.n), np.clip(c + h, 0, self.n)
        e = (self.cs[b] - self.cs[a]) / (2 * h)
        return -0.691 + 10 * np.log10(e + 1e-20)


def integrated_lufs(y):
    p = kpow(y)
    blk, hop = N(0.4), N(0.1)
    cs = np.concatenate([[0.0], np.cumsum(p, dtype=np.float64)])
    st = np.arange(0, len(p) - blk + 1, hop)
    z = (cs[st + blk] - cs[st]) / blk
    lk = -0.691 + 10 * np.log10(z + 1e-20)
    g = z[lk > -70]
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = z[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))


def true_peak_db(y, chunk_s=10.0):
    """4x-oversampled true peak (BS.1770-4 style), chunked to bound memory."""
    y = stereo(y)
    n, c, pad = y.shape[1], N(chunk_s), 256
    m = 0.0
    for a in range(0, n, c):
        s0, s1 = max(0, a - pad), min(n, a + c + pad)
        up = resample_poly(y[:, s0:s1], 4, 1, axis=-1)
        lo, hi = (a - s0) * 4, (min(n, a + c) - s0) * 4
        m = max(m, float(np.max(np.abs(up[:, lo:hi]))))
    return float(a2db(m))


# ============================================================================================ I/O
def decode_s24(path):
    """ffmpeg decode of the MP3 straight to 24-bit PCM (the song's samples, as every tool will see them in a 24-bit
    file). Returned as int32 holding the 24-bit value (not shifted), shape (2, n)."""
    wav = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-map", "0:a:0", "-c:a", "pcm_s24le",
                          "-f", "wav", "pipe:1"], check=True, capture_output=True).stdout
    y, sr = sf.read(io.BytesIO(wav), dtype="int32", always_2d=True)
    assert sr == SR and y.shape[1] == 2, (sr, y.shape)
    return (y >> 8).T.copy()


def ffmpeg_float(path):
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-map", "0:a:0", "-f", "f32le",
                          "-ac", "2", "-ar", str(SR), "pipe:1"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def ebur128(path):
    """ffmpeg's own EBU R128 meter, as an independent cross-check of the LUFS/true-peak numbers."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-map", "0:a:0", "-filter_complex",
                        "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr[r.stderr.rfind("Summary:"):]
    out = {}
    for line in txt.splitlines():
        s = line.strip()
        if s.startswith("I:"):
            out["integrated_lufs"] = float(s.split()[1])
        elif s.startswith("Peak:"):
            out["true_peak_dbtp"] = float(s.split()[1])
        elif s.startswith("LRA:"):
            out["lra_lu"] = float(s.split()[1])
    return out


# ============================================================================================ timing (as the renderer)
class Timing:
    def __init__(self, path):
        self.path = path
        d = json.load(open(path))
        self.status = d.get("status", "")
        self.sections = d["sections"]
        self.lines = [dict(l, t=l.get("start", l.get("t")),
                           words=[dict(w, t=w.get("start", w.get("t"))) for w in l.get("words", [])]) for l in d["lines"]]
        self.warnings = []

    def S(self, name):
        return next(s for s in self.sections if s["name"] == name)

    def LS(self, sec):
        return [l for l in self.lines if l["section"] == sec]

    def line(self, sec, k):
        return self.LS(sec)[k]

    def counts(self):
        """render/src/timeline.js: intro.forEach((l, g) => l.words.forEach((w, i) => counts.push({n: [1,1,2,3,5,8][i], t, g})))
        (a word past the sixth gets n = undefined in the renderer, so it draws no pulse; it gets no ping here either)."""
        out = []
        for g, l in enumerate(self.LS("Intro")):
            for i, w in enumerate(l["words"]):
                if i >= 6:
                    self.warnings.append(f"Intro line {g} word {i} '{w['w']}' @ {w['t']:.3f}: no count number (renderer draws no pulse)")
                    continue
                out.append(dict(n=[1, 1, 2, 3, 5, 8][i], t=float(w["t"]), g=g, w=w["w"]))
        return out


# ============================================================================================ sounds
A6, C7, D7, F7, A7 = 1760.0, 2093.005, 2349.318, 2793.826, 3520.0
D6, E7, D2 = 1174.659, 2637.020, 73.416
PING_NOTES = [A6, A6, C7, D7, F7, A7]      # D minor (the song's key); one note per count number, rising with the count

GLASS = ((1.0, 1.0, 1.0), (2.756, 0.20, 0.42), (5.404, 0.065, 0.24), (8.933, 0.022, 0.14))   # free-bar modes


def glass(f0, rng, tau=0.10, attack=0.005, shimmer_cents=4.0, dur=None):
    """Glassy ping: sine + inharmonic (free-bar) partials, a detuned twin for shimmer, soft raised-cosine attack."""
    dur = dur or max(0.3, tau * 8)
    t = tt(dur)
    y = np.zeros_like(t)
    for r, a, k in GLASS:
        if f0 * r < 15500:
            y += a * np.sin(2 * np.pi * f0 * r * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / (tau * k))
    y += 0.3 * np.sin(2 * np.pi * f0 * 2 ** (shimmer_cents / 1200) * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / (tau * 1.25))
    return fades(y, a=attack)


def warble_tone(t_abs, t_lock0, t_lock1, rate0=6.6, rate1=7.4, f_lo=880.0, f_hi=990.0, rise_cents=70.0, t_state=None):
    """Two-tone lock warble (880/990 Hz alternating ~7 Hz, rising slightly). t_state maps each sample to the cold
    open's lock clock (for the drop's reprise, which replays the locked reticle)."""
    ts = t_abs if t_state is None else t_state
    x = ramp(ts, t_lock0, t_lock1)
    rate = rate0 + (rate1 - rate0) * x
    alt_ph = 2 * np.pi * np.cumsum(rate) / SR
    sq = np.tanh(5 * np.sin(alt_ph)) / np.tanh(5)          # smoothed square: no clicks at the switches
    f = ((f_lo + f_hi) / 2 + (f_hi - f_lo) / 2 * sq) * 2 ** (rise_cents * x ** 1.3 / 1200)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    y *= 1 - 0.12 * (1 - np.abs(sq))                          # a slight dip on each switch: the "warble"
    return y


def scope_power(T_end, T_settle, rng):
    """Cue 1: the hunter's scope powering on: relay tick + faint charge whine, a very low D2 hum (spin-up), and a servo
    whir whose speed follows the reticle's settle curve (coldopen.js: settle = easeOutCubic(t / (first count + 0.3)))."""
    n = N(T_end)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    # relay tick at power-on
    tick = bp(white(N(0.012), rng), 1500, 6000, 2) * np.exp(-np.arange(N(0.012)) / SR / 0.0018)
    add_at(out, pan(tick * 0.25, 0.1), N(0.02))
    # capacitor charge whine 2.6 -> 7.4 kHz, a faint bump
    cw = tt(0.7)
    fw = 2600 * (7400 / 2600) ** (cw / 0.7)
    wh = np.sin(2 * np.pi * np.cumsum(fw) / SR) * np.sin(np.pi * cw / 0.7) ** 2 * 0.035
    add_at(out, wh, N(0.03))
    # hum: D2 with a few harmonics, spinning up over 0.5 s
    f = D2 * (0.82 + 0.18 * smooth(ramp(t, 0.0, 0.5)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    hum = sum(a * np.sin(k * ph + rng.uniform(0, 6.28)) for k, a in ((1, 1.0), (2, 0.55), (3, 0.35), (4, 0.15), (5, 0.08), (6, 0.05)))
    hum = lp(hum, 700, 2) * (1 + 0.1 * np.sin(2 * np.pi * 0.45 * t)) * smooth(ramp(t, 0.0, 0.45)) * (1 - smooth(ramp(t, T_end - 0.75, T_end)))
    out += stereo(hum * 0.5)
    # servo: speed = d(settle)/dt ~ (1 - t/T)^2; whine pitch and motor buzz follow it, panned with the drift (x: -150 -> 0 px)
    v = np.clip(1 - t / T_settle, 0, 1) ** 2
    amp = v ** 0.8 * smooth(ramp(t, 0.0, 0.14))
    fw = 620 + 1100 * v
    pw = 2 * np.pi * np.cumsum(fw) / SR
    whine = np.sin(pw) + 0.35 * np.sin(2 * pw) + 0.15 * np.sin(3 * pw)
    pm = 2 * np.pi * np.cumsum(45 + 110 * v) / SR
    buzz = bp(white(n, rng), 700, 4200, 2) * ((0.5 + 0.5 * np.sin(pm)) ** 3)
    chatter = 1 + 0.25 * lp(white(n, rng), 30, 2) / 0.1
    servo = lp((0.5 * whine + 0.9 * buzz) * np.clip(chatter, 0.3, 1.7), 7000, 2) * amp * 0.5
    drift = -0.16 * (1 - ease_out_cubic(t / T_settle))
    out += pan(servo, drift)
    return fades(out, r=0.03)


def count_pass(counts, t0, rng, impulse):
    """Cue 2: the gold pulses on the dot (coldopen.js pulses()): count n -> n pings at t + i*gap."""
    end = max(c["t"] + (c["n"] - 1) * gap_of(c["n"]) for c in counts) + 1.0
    out = np.zeros((2, N(end - t0)))
    for c in counts:
        f0 = PING_NOTES[{1: 0, 2: 2, 3: 3, 5: 4, 8: 5}[c["n"]]]
        for i in range(c["n"]):
            ti = c["t"] + i * gap_of(c["n"])
            p = glass(f0 * 2 ** (rng.uniform(-4, 4) / 1200), rng, tau=0.09 if c["n"] < 5 else 0.07)
            p *= c["n"] ** -0.3 * db2a(rng.uniform(-0.8, 0.8))   # equal "brightness" per count: a burst of 8 is not 8x louder
            add_at(out, pan(p, 0.083 + (rng.uniform(-0.12, 0.12) if c["n"] >= 5 else 0.0)), N(ti - t0))
    wet = reverb(out, impulse, wet_db=-13)[:, :out.shape[1]]
    return fades(wet, r=0.35)


def gap_of(n):
    return 0.15 if n <= 3 else (0.1 if n == 5 else 0.075)


def lock_warble(t0, t1, rng):
    """Cue 3: the lock. Fades in with the visual lock (smooth(range(t, g1end + .35, g1end + 1.2))), +2.5 dB over the hold,
    pitch rising ~70 cents, cut dead (2 ms) on the second count's first word."""
    t = t0 + np.arange(N(t1 - t0)) / SR
    y = warble_tone(t, t0, t1)
    env = smooth(ramp(t, t0, t0 + 0.85)) * (0.75 + 0.25 * ramp(t, t0 + 0.85, t1))
    y = lp(y * env, 5000, 2)
    return fades(pan(y, 0.0), r=0.002)


def drop_warble(t0, t_cut, t_state0, rate, lock0, lock1, impulse):
    """Cue 7: the drop's cut back to the locked scope (D0: coldopen at atT = lastCount - 2.9, rate 0.2): the lock warble
    replayed in its locked state, a soft exponential release into +0.62 s, a short tail past the cut."""
    d = t_cut - t0
    t = np.arange(N(d)) / SR
    y = warble_tone(t0 + t, lock0, lock1, t_state=t_state0 + rate * t)
    rel = np.where(t < d - 0.07, 1.0, np.exp(-(t - (d - 0.07)) / 0.022))
    y = fades(lp(y * rel, 5000, 2), a=0.008, r=0.01)
    wet = reverb(pan(y, 0.0), impulse, wet_db=-11)
    return fades(wet[:, :N(d + 0.38)], r=0.3)


def release_chime(rng, impulse):
    """Cue 4: the reticle opens into a ring of light: a soft open D chord (D6 A6 D7 E7 A7) blooming upward and outward
    in stereo, plus a high shimmer; ~1.2 s, then the room."""
    dur = 1.5
    out = np.zeros((2, N(dur)))
    notes = [(D6, 0.00, 0.80, -0.30), (A6, 0.05, 0.70, 0.30), (D7, 0.10, 0.60, -0.15), (E7, 0.15, 0.42, 0.15), (A7, 0.20, 0.30, 0.0)]
    for f0, dt, a, p in notes:
        g = glass(f0, rng, tau=0.42, attack=0.03, shimmer_cents=6, dur=1.4)
        add_at(out, pan(g * a, p), N(dt))
    t = tt(dur)
    sh = np.zeros_like(t)
    for f in (4698.6, 5274.0, 6271.9, 7040.0):
        am = np.abs(lp(white(len(t), rng), 18, 2))
        sh += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * am / (am.max() + 1e-9)
    bump = np.sin(np.pi * np.clip(t / 1.2, 0, 1)) ** 2
    sh = sh * bump * 0.06
    air = bp(white(len(t), rng), 3000, 9000, 2) * bump * 0.02
    out += np.stack([sh + air, np.roll(sh, 97) + air[::-1] * 0])
    out = reverb(out, impulse, wet_db=-7)[:, :N(dur)]
    return fades(out, r=0.4)


def whoosh_in(dur, rng):
    """Cue 5: a rising filtered-noise whoosh (band-pass sweeping 300 Hz -> 7 kHz, crescendo) that ends dead on the
    Verse 1 downbeat (the cold open's 7x push-in and gold flash)."""
    t = tt(dur)
    x = t / dur
    fc = 300 * (7000 / 300) ** (x ** 1.4)
    ch = []
    for s in range(2):
        nz = pink(len(t), rng)
        y = svf(nz, fc, 1.4, "bp") + 0.35 * svf(nz, fc * 0.5, 0.8, "lp")
        ch.append(y)
    m, sd = (ch[0] + ch[1]) / 2, (ch[0] - ch[1]) / 2
    w = 0.3 + 0.7 * x
    y = np.stack([m + w * sd, m - w * sd])
    env = x ** 2.4 * smooth(ramp(t, 0, 0.08))
    return fades(y * env, r=0.005)


def wind_pines(dur, rng):
    """Cue 6a: faint wind in pines: pink-noise air with slow gusts, the needles' "sough" (band-passed hiss that swells
    with each gust), a breathy resonance drifting with the wind; gusts reach the right channel a little later."""
    n = N(dur)
    t = np.arange(n) / SR
    gust = np.zeros(n)
    for f, a in ((0.055, 1.0), (0.11, 0.6), (0.19, 0.4), (0.33, 0.25)):
        gust += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))
    gust = (gust - gust.min()) / (gust.max() - gust.min())
    out = []
    for c, lag in ((0, 0.0), (1, 0.6)):
        g = np.interp(t - lag, t, gust)
        g = 0.35 + 0.65 * g
        air = lp(pink(n, rng), 650, 2) * (0.55 + 0.45 * g)
        sough = bp(white(n, rng), 1800, 6500, 2) * g ** 2 * 0.22
        res = svf(white(n, rng), 650 + 400 * g, 6.0, "bp") * g ** 1.5 * 0.25
        out.append(air + sough + res)
    y = np.stack(out)
    return fades(y, a=1.8, r=1.2)


def match_strike(rng):
    """Cue 6b: a match strike: friction scratch (grainy band-passed noise), the ignition crack and pop, the flare (noise
    through a low-pass sweeping 9 kHz -> 1.5 kHz), the flame's soft body, a little burning crackle. Sample N(0.07) is
    the flare (the sync point)."""
    dur = 1.3
    n = N(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    s_n = N(0.075)
    grain = lp(white(s_n, rng) ** 2, 260, 2)
    grain = np.clip(grain / (grain.max() + 1e-9), 0, 1)
    scratch = bp(white(s_n, rng), 1500, 7500, 2) * grain * (0.35 + 0.65 * np.arange(s_n) / s_n) * 0.9
    y[:s_n] += scratch
    i0 = N(0.07)
    tc = t[i0:] - t[i0]
    y[i0:] += bp(white(n - i0, rng), 2000, 9000, 2) * np.exp(-tc / 0.012) * 1.0           # crack
    y[i0:] += lp(white(n - i0, rng), 900, 2) * np.exp(-tc / 0.025) * 1.2                   # pop
    fd = N(0.5)
    fl = svf(white(fd, rng), 9000 * (1500 / 9000) ** (np.arange(fd) / fd), 0.9, "lp")
    y[i0:i0 + fd] += fl * (1 - np.exp(-tc[:fd] / 0.01)) * np.exp(-tc[:fd] / 0.16) * 0.8      # flare
    y[i0:] += lp(white(n - i0, rng), 600, 2) * (1 - np.exp(-tc / 0.015)) * np.exp(-tc / 0.12) * 1.4   # flame body
    flick = 0.6 + 0.4 * np.clip(lp(white(n - i0, rng), 6, 2) / 0.05, -1, 1)
    burn = lp(white(n - i0, rng), 1200, 2) * flick * smooth(ramp(tc, 0.1, 0.3)) * (1 - smooth(ramp(tc, 0.5, 1.2))) * 0.25
    y[i0:] += burn
    for _ in range(10):
        j = i0 + N(rng.uniform(0.18, 1.05))
        k = N(0.004)
        y[j:j + k] += bp(white(k, rng), 2000, 6000, 2) * np.exp(-np.arange(k) / SR / 0.0012) * rng.uniform(0.05, 0.22)
    return fades(pan(y, 0.0), r=0.1)


def sonar_ping(f, rng, impulse, p=0.0):
    """Cue 6c: 1962 active sonar heard from inside B-59: a pure ping (4 ms attack, ~90 ms hold, decay), a muffled return
    echo, a long watery tail. Sample 0 = the ping."""
    dur = 0.6
    t = tt(dur)
    env = (1 - np.exp(-t / 0.0015)) * np.where(t < 0.09, 1.0, np.exp(-(t - 0.09) / 0.10))
    fr = f * (1 - 0.003 * t)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    y = (np.sin(ph) + 0.08 * np.sin(2 * ph)) * env
    y = fades(y, a=0.004)
    echo = np.zeros(N(dur + 0.36))
    echo[N(0.36):] += lp(y, 1800, 2) * db2a(-13)
    dry = np.zeros(N(dur + 0.36))
    dry[:len(y)] += y
    dry += echo
    return reverb(pan(lp(dry, 3500, 2), p), impulse, wet_db=-4)


def depth_charge(rng):
    """Cue 6d: a muffled depth-charge thud heard underwater: a low boom gliding 95 -> 38 Hz, a lowpassed noise body and
    crack, the bubble pulse ~0.28 s later, a rumble tail; everything under 600 Hz."""
    dur = 1.0
    n = N(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for t_b, a, f_hi, f_lo in ((0.0, 1.0, 95, 38), (0.28, 0.4, 70, 34)):
        tb = np.clip(t - t_b, 0, None)
        on = (t >= t_b).astype(float)
        fr = f_lo + (f_hi - f_lo) * np.exp(-tb / 0.08)
        ph = 2 * np.pi * np.cumsum(fr * on) / SR
        y += a * np.sin(ph) * (1 - np.exp(-tb / 0.008)) * np.exp(-tb / 0.32) * on
        y += a * 0.7 * lp(white(n, rng), 220, 2) / 0.07 * 0.05 * (1 - np.exp(-tb / 0.005)) * np.exp(-tb / 0.22) * on
    y += bp(white(n, rng), 200, 1200, 2) * np.exp(-t / 0.02) * 0.25
    y += lp(white(n, rng), 120, 2) / 0.05 * 0.03 * smooth(ramp(t, 0.02, 0.15)) * np.exp(-t / 0.55)
    y = lp(y, 600, 4)
    return fades(y, a=0.002, r=0.25)


def end_ping(rng, impulse):
    """Cue 8: the count going on (endcard.js: a pulse every 1.15 s): D7 glass ping with a soft D6 under it."""
    a = glass(D7, rng, tau=0.13, dur=1.0)
    b = glass(D6, rng, tau=0.2, dur=1.0)
    y = a + 0.18 * b
    return reverb(pan(y, 0.0), impulse, wet_db=-9)


# ============================================================================================ cues
class Cue:
    def __init__(self, cid, title, sync, how, t0, y, med, worst, cap_db, exempt=None, abs_gain_db=None, group=None):
        self.id, self.title, self.sync, self.how = cid, title, sync, how
        self.t0, self.y = t0, np.asarray(stereo(y), dtype=np.float64)
        self.med, self.worst, self.cap_db = med, worst, cap_db
        self.exempt = exempt or (lambda ts: np.zeros(len(ts), dtype=bool))
        self.abs_gain_db = abs_gain_db
        self.group = group or cid
        self.gain_db = 0.0
        self.fit_note = ""

    @property
    def t1(self):
        return self.t0 + self.y.shape[1] / SR

    def clip_to(self, t_end, fade_s=0.0):
        """Truncate the cue at t_end (absolute s), with a raised-cosine fade before it."""
        k = max(0, min(self.y.shape[1], N(t_end - self.t0)))
        self.y = fades(self.y[:, :k], r=fade_s) if fade_s > 0 else self.y[:, :k]

    def margins(self, songM, gain_db=None):
        """Per 10 ms frame (in the cue's active span): song momentary loudness - cue momentary loudness."""
        g = self.gain_db if gain_db is None else gain_db
        pad = N(0.5)
        yk = kpow(np.pad(self.y * db2a(g), ((0, 0), (pad, pad))))
        M = Momentary(yk, self.t0 - 0.5)
        ts = np.arange(self.t0, self.t1, 0.01)
        cM, sM = M(ts), songM(ts)
        act = cM > cM.max() - 20
        return ts, cM, sM, act


def fit_level(cue, songM):
    """Gain so the cue sits at its median margin under the song, never closer than its worst-frame margin, and under its
    absolute peak cap; exempt frames (scope before the music, the end tail) do not count."""
    ts, cM, sM, act = cue.margins(songM, 0.0)
    ok = act & ~cue.exempt(ts)
    cap = cue.cap_db - peak_db(cue.y)
    if ok.sum() >= 3:
        m = sM[ok] - cM[ok]
        g_med, g_worst = float(np.median(m) - cue.med), float(m.min() - cue.worst)
        g = min(g_med, g_worst, cap)
        cue.fit_note = {g_med: "median margin", g_worst: "worst-frame margin", cap: "peak cap"}[g]
    else:
        g = min(cue.abs_gain_db if cue.abs_gain_db is not None else 0.0, cap)
        cue.fit_note = "absolute (exempt)" if g != cap else "peak cap"
    cue.gain_db = g
    return g


def find_gap(vM, t_lo, t_hi):
    """Quietest 20 ms vocal frame (vocal stem) in [t_lo, t_hi]."""
    ts = np.arange(t_lo, t_hi, 0.005)
    v = vM(ts, win=0.03)
    return float(ts[int(np.argmin(v))])


def build_cues(T, song_len_s, songM, vocM):
    rng = lambda s: np.random.default_rng(1962_000 + s)
    IR_PING = ir(1.6, 1.3, lp_hz=8000, hp_hz=400, seed=11, predelay=0.012)
    IR_CHIME = ir(2.6, 2.2, lp_hz=9000, hp_hz=400, seed=12, predelay=0.018)
    IR_SEA = ir(2.2, 1.7, lp_hz=2400, hp_hz=120, seed=13, predelay=0.03)
    IR_END = ir(2.2, 1.9, lp_hz=8500, hp_hz=400, seed=14, predelay=0.015)
    IR_LOCK = ir(0.9, 0.7, lp_hz=6000, hp_hz=300, seed=15, predelay=0.008)

    counts = T.counts()
    g1 = [c for c in counts if c["g"] == 0]
    g2 = [c for c in counts if c["g"] == 1]
    first = counts[0]["t"]
    g1end, g2start, last = g1[-1]["t"], g2[0]["t"], counts[-1]["t"]
    v1 = T.S("Verse 1")["start"]
    br = T.S("Bridge")
    B = lambda k: T.line("Bridge", k)
    matchT = B(2)["t"] - 0.2
    dr = T.S("Drop")
    finalT = T.line("Outro", 6)["t"] - 3.0
    lastCount = last

    # music start: the song's momentary loudness first reaches -40 LUFS (the piano fading in)
    ts = np.arange(0, 5, 0.01)
    music_start = float(ts[np.argmax(songM(ts) > -40)])
    # end of the music: its momentary loudness falls below the same -40 LUFS for good (the end tail starts there)
    ts = np.arange(song_len_s - 15, song_len_s, 0.01)
    above = np.where(songM(ts) > -40)[0]
    song_tail = float(ts[above[-1]]) if len(above) else song_len_s
    pre_music = lambda x: np.asarray(x) < music_start
    in_tail = lambda x: np.asarray(x) >= song_tail

    cues = []
    # ---- 1. scope power-on
    T_settle = first + 0.3
    y = scope_power(first, T_settle, rng(1))
    cues.append(Cue("scope", "Scope powers on: relay tick, charge whine, low D2 hum, servo whir as the reticle settles",
                    f"0.000 -> first whisper {first:.3f} (settle curve ends {T_settle:.2f})",
                    "synth: band-passed noise tick; 2.6->7.4 kHz sine sweep; D2 (73.4 Hz) + 5 harmonics, LP 700 Hz, spin-up; servo = "
                    "gear-whine sine (620->1720 Hz with speed) + motor buzz (BP noise gated at 45-155 Hz), speed = d/dt of "
                    "easeOutCubic settle, panned with the drift", 0.0, y, med=14, worst=8, cap_db=-30, exempt=pre_music))
    # ---- 2. the counts (two passes)
    for g, grp in ((0, g1), (1, g2)):
        y = count_pass(grp, grp[0]["t"], rng(10 + g), IR_PING)
        times = ", ".join(f"{c['n']}@{c['t']:.2f}" for c in grp)
        cues.append(Cue(f"count{g + 1}", f"Count pass {g + 1}: n glassy pings per whispered number (gold pulses)",
                        f"pings at t + i*gap (0.15 / 0.10 / 0.075 s): {times}",
                        "synth: sine + free-bar partials (x2.756, x5.404, x8.933) + 4-cent twin, 5 ms raised-cosine attack, "
                        "tau 70-90 ms; notes A6 A6 C7 D7 F7 A7 (D minor) for 1 1 2 3 5 8; burst gain n^-0.3; panned to the dot "
                        "(+0.08); light reverb (RT60 1.3 s, -13 dB)", grp[0]["t"], y, med=15, worst=10, cap_db=-27))
    # ---- 3. the lock
    lock0, lock1 = g1end + 0.35, g2start
    y = lock_warble(lock0, lock1, rng(3))
    cues.append(Cue("lock", "The lock: two-tone warble 880/990 Hz alternating ~7 Hz, rising ~70 cents, cut dead",
                    f"{lock0:.3f} (first count's last word + 0.35) -> {lock1:.3f} (second count's first word)",
                    "synth: sine (+2nd/3rd harmonic) FM'd by a smoothed square (6.6->7.4 Hz), switch dips, LP 5 kHz; fade-in = "
                    "the visual lock curve, +2.5 dB over the hold; 2 ms cut", lock0, y, med=12, worst=8, cap_db=-28))
    # ---- 4. release chime
    t_open = last + 0.3
    y = release_chime(rng(4), IR_CHIME)
    cues.append(Cue("chime", "Reticle opens into a ring of light: soft open-D chime + shimmer",
                    f"{t_open:.3f} (second count's last word + 0.3; visual open {t_open:.2f}-{last + 1.5:.2f}, title {last + 0.45:.2f})",
                    "synth: glass tones D6 A6 D7 E7 A7 staggered 50 ms, spread L/R, 30 ms attacks, tau 0.42 s; four high "
                    "sines (4.7-7.0 kHz) with random 18 Hz flutter; air noise; reverb RT60 2.2 s at -7 dB", t_open, y,
                    med=12, worst=8, cap_db=-21))
    # ---- 5. whoosh into Verse 1
    wd = 0.6
    y = whoosh_in(wd, rng(5))
    cues.append(Cue("whoosh", "Rising whoosh into the Verse 1 downbeat (push-in + gold flash)",
                    f"{v1 - wd:.3f} -> {v1:.3f} (Verse 1 start; ends exactly on it)",
                    "synth: two decorrelated pink noises through a TPT state-variable band-pass sweeping 300 Hz -> 7 kHz "
                    "(+ a low-pass body), stereo width opening 0.3 -> 1, crescendo x^2.4, 5 ms end fade on the downbeat",
                    v1 - wd, y, med=10, worst=7, cap_db=-16))
    # ---- 6a. wind in pines
    w_end = B(3)["t"]
    y = wind_pines(w_end - br["start"], rng(6))
    cues.append(Cue("wind", "Bridge: very faint wind in pines under the forest shot",
                    f"{br['start']:.3f} (Bridge start) -> {w_end:.3f} (fade out 1.2 s; forest shot B1 ends {matchT + 2.3:.2f})",
                    "synth: pink noise LP 650 Hz with slow gusts (0.05-0.33 Hz), needle 'sough' (BP 1.8-6.5 kHz x gust^2), a "
                    "breathy SVF resonance drifting 650-1050 Hz; right channel's gusts 0.6 s late", br["start"], y,
                    med=17, worst=9, cap_db=-24))
    # ---- 6b. match strike (flare on the sync point)
    t_match = matchT + 0.5
    y = match_strike(rng(7))
    cues.append(Cue("match", "Bridge: a match strike ('any world that lights a spark')",
                    f"flare at {t_match:.3f} (= Bridge line 2 start {B(2)['t']:.2f} - 0.2 + 0.5; scratch 70 ms before)",
                    "synth: grainy BP noise scratch; crack (BP 2-9 kHz, 12 ms) + pop (LP 900 Hz); flare = noise through SVF "
                    "low-pass 9 -> 1.5 kHz; flame body LP 600 Hz; flickering burn + 10 crackles", t_match - 0.07, y,
                    med=12, worst=7, cap_db=-18))
    # ---- 6c/d. "sixty-two, depth charges falling": pings and thuds in the gaps between words
    L6 = B(6)
    ws = L6["words"]
    sixT = L6["t"] - 0.1                     # B3 (sonar scene) cut
    stop = B(7)["t"] - 0.05                  # nothing after: "two said fire. Arkhipov said no." breathes
    bounds = [("sonar1", sixT, 0.12), ("sonar2", ws[1]["t"], 0.15), ("thud1", ws[2]["t"], 0.15), ("thud2", ws[3]["t"], 0.15)]
    gaps = {}
    for k, tb, r in bounds:
        gaps[k] = find_gap(vocM, tb - r, tb + r) if vocM is not None else tb
    for k, f, p, seed in (("sonar1", D6, -0.1, 61), ("sonar2", D6 * 2 ** (6 / 1200), 0.05, 62)):
        y = sonar_ping(f, rng(seed), IR_SEA, p)
        c = Cue(k, f"Bridge: sonar ping {k[-1]} (B-59 under the destroyers)",
                f"{gaps[k]:.3f} (vocal gap nearest {'the B3 sonar cut' if k == 'sonar1' else 'sixty-two|depth'})",
                "synth: D6 (1175 Hz) sine + 8% 2nd, 4 ms attack, 90 ms hold, 100 ms decay, slight down-chirp (second ping "
                "+6 cents: closer); muffled echo +0.36 s at -13 dB; LP 3.5 kHz; watery reverb RT60 1.7 s at -4 dB",
                gaps[k], y, med=13, worst=7, cap_db=-17)
        c.clip_to(stop, 0.25)
        cues.append(c)
    for k, p, seed in (("thud1", -0.25, 71), ("thud2", 0.2, 72)):
        y = depth_charge(rng(seed))
        c = Cue(k, f"Bridge: muffled depth-charge thud {k[-1]}",
                f"{gaps[k]:.3f} (vocal gap nearest {'depth|charges' if k == 'thud1' else 'charges|falling'})",
                "synth: sine boom gliding 95 -> 38 Hz (tau 0.32 s) + LP-noise body + muffled crack, bubble pulse at +0.28 s, "
                "rumble tail; all LP 600 Hz", gaps[k], pan(y, p), med=11, worst=7, cap_db=-17)
        c.clip_to(stop, 0.25)
        cues.append(c)
    # ---- 7. the drop's reprise of the lock
    revealT = dr["start"] + 0.62
    atT = lastCount - 2.9
    y = drop_warble(dr["start"], revealT, atT, 0.2, lock0, lock1, IR_LOCK)
    cues.append(Cue("droplock", "Drop: 0.6 s reprise of the lock warble (cut back to the scope), soft release",
                    f"{dr['start']:.3f} (Drop start) -> cut {revealT:.3f} (+0.62, D0 -> D1), tail 0.38 s",
                    f"synth: the lock warble in its locked state (cold-open clock {atT:.2f} + 0.2*lt), 8 ms in, exponential "
                    "release (22 ms) into the cut, small room (RT60 0.7 s, -11 dB)", dr["start"], y, med=12, worst=8, cap_db=-23))
    # ---- 8. end card: the count goes on
    k = 0
    ends = []
    while finalT + k * 1.15 < TOTAL_S - 0.05:
        tk = finalT + k * 1.15
        y = end_ping(rng(80 + k), IR_END)
        c = Cue(f"end{k}", f"End card ping {k}", f"{tk:.3f} = S + {k}*1.15 (S = Outro line 6 start - 3.0 = {finalT:.2f})",
                "synth: D7 glass ping (tau 0.13 s) + soft D6 (-15 dB), reverb RT60 1.9 s at -9 dB", tk, y,
                med=10, worst=7, cap_db=-30, exempt=in_tail, abs_gain_db=None, group="end")
        c.clip_to(min(tk + 1.15, TOTAL_S), 0.3)
        ends.append(c)
        k += 1
    cues += ends
    ctx = dict(counts=counts, music_start=music_start, song_tail=song_tail, finalT=finalT, gaps=gaps, lock=(lock0, lock1),
               t_open=t_open, v1=v1, matchT=matchT, t_match=t_match, revealT=revealT, wind=(br["start"], w_end), stop=stop)
    return cues, ctx


END_CURVE_M0_LUFS = -39.0    # end card: ping k reaches -39 - 0.9 k LUFS (momentary) unless the song needs it quieter
END_CURVE_STEP_DB = 0.9


def level_end_pings(ends, songM):
    """End card: the count goes on and slowly fades. Ping k follows a slow fade curve (-39 - 0.9 k LUFS momentary); while the
    song still sounds, each ping is also held under it (fit_level), so pings under the last whisper and the final hit sit
    lower; after the music ends (the end tail) the curve carries on into silence. The visual pulse fades in over
    S+0.5..S+1.5, so k=0 is 5 dB and k=1 2 dB softer."""
    for k, c in enumerate(ends):
        curve = END_CURVE_M0_LUFS - END_CURVE_STEP_DB * k - float(c.margins(songM, 0.0)[1].max())
        fit = fit_level(c, songM)
        exempt_all = bool(c.exempt(np.arange(c.t0, c.t1, 0.01)).all())
        fade_in = {0: -5.0, 1: -2.0}.get(k, 0.0)
        base = curve if exempt_all else min(curve, fit)
        c.gain_db = base + fade_in
        c.fit_note = ("end tail: fade curve" if exempt_all else ("fade curve" if curve <= fit else "held under the song")) + \
            (f", visual fade-in {fade_in:+.0f} dB" if fade_in else "")


# ============================================================================================ main
def sum_layer(cues, n_tot):
    layer = np.zeros((2, n_tot))
    for c in cues:
        add_at(layer, c.y * db2a(c.gain_db), N(c.t0))
    return layer


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--timing", default=os.path.join(ROOT, "render", "data", "timing.json"))
    ap.add_argument("--no-m4a", action="store_true")
    args = ap.parse_args(argv)
    t_start = time.time()
    os.makedirs(WORK, exist_ok=True)
    os.makedirs(os.path.join(WORK, "stems"), exist_ok=True)
    os.makedirs(MEDIA, exist_ok=True)

    T = Timing(args.timing)
    song_i = decode_s24(SONG_MP3)                    # (2, n) int32 holding 24-bit values
    n_song, n_tot = song_i.shape[1], N(TOTAL_S)
    song = song_i.astype(np.float64) / 2 ** 23
    print(f"song: {n_song} samples = {n_song / SR:.3f} s; film {TOTAL_S} s = {n_tot} samples; timing {os.path.relpath(T.path, ROOT)}")
    songM = Momentary(kpow(song))
    vocM = None
    if os.path.exists(VOCALS):
        v, sr = sf.read(VOCALS, always_2d=True)
        if sr == SR:
            vocM = Momentary(kpow(v.T))

    cues, ctx = build_cues(T, n_song / SR, songM, vocM)
    for w in T.warnings:
        print("timing warning:", w)

    # ---- levels
    ends = [c for c in cues if c.group == "end"]
    for c in cues:
        if c.group != "end":
            fit_level(c, songM)
    level_end_pings(ends, songM)

    # ---- the song's own overs: keep the layer silent wherever the song's true peak exceeds -0.5 dBTP
    hot_total = 0
    for c in cues:
        a, b = N(c.t0), min(n_song, N(c.t1))
        if b <= a:
            continue
        up = resample_poly(song[:, a:b], 4, 1, axis=-1)
        hot = np.max(np.abs(up), axis=0).reshape(-1, 4).max(1) > db2a(MIX_TP_MAX_DB)
        if hot.any():
            hot = np.convolve(hot.astype(float), np.ones(N(0.01)), "same") > 0
            gate = 1 - lp(hot.astype(float), 200, 2)
            c.y[:, :len(gate)] *= np.clip(gate, 0, 1)
            hot_total += int(hot.sum())

    # ---- sum the layer; where cues overlap, the sum must still clear the 6 dB rule (trim the overlapping cues)
    for it in range(8):
        layer = sum_layer(cues, n_tot)
        layM = Momentary(kpow(layer))
        trims = {}
        for c in cues:
            ts, cM, sM, act = c.margins(songM)
            ok = act & ~c.exempt(ts)
            if not ok.any():
                continue
            m = sM[ok] - layM(ts[ok])
            j = int(np.argmin(m))
            if m[j] < MIN_MARGIN_DB + 0.5:
                tw, d = ts[ok][j], MIN_MARGIN_DB + 0.5 - m[j]
                for o in cues:
                    if o.t0 - 0.2 <= tw <= o.t1 + 0.2:
                        trims[o.id] = max(trims.get(o.id, 0.0), d)
        if not trims:
            break
        for o in cues:
            if o.id in trims:
                o.gain_db -= trims[o.id]
                o.overlap_trim_db = getattr(o, "overlap_trim_db", 0.0) + trims[o.id]
    for o in cues:
        if getattr(o, "overlap_trim_db", 0.0):
            o.fit_note += f"; -{o.overlap_trim_db:.1f} dB for the overlap"
    layer = sum_layer(cues, n_tot)
    windows = [(N(c.t0), min(n_tot, N(c.t0) + c.y.shape[1])) for c in cues]
    layer = layer.astype(np.float32).astype(np.float64)          # what the float32 layer file holds
    # brief: layer peak <= -14 dBFS (a global safety scale, never expected to trigger)
    lp_db = peak_db(layer)
    if lp_db > LAYER_PEAK_MAX_DB:
        s = db2a(LAYER_PEAK_MAX_DB - 0.1 - lp_db)
        layer *= s
        for c in cues:
            c.gain_db += float(a2db(s))

    # ---- the mix: song (24-bit, untouched) + quantised layer
    song_pad = np.zeros((2, n_tot), dtype=np.int64)
    song_pad[:, :n_song] = song_i
    q_layer = np.round(layer * 2 ** 23).astype(np.int64)
    mix_i = song_pad + q_layer
    clipped = int(np.sum((mix_i > 2 ** 23 - 1) | (mix_i < -2 ** 23)))
    mix_i = np.clip(mix_i, -2 ** 23, 2 ** 23 - 1)

    # ---- write
    f_layer = os.path.join(WORK, "sfx_layer.wav")
    f_mix = os.path.join(MEDIA, "hold_fire_mix.wav")
    f_m4a = os.path.join(MEDIA, "hold_fire_mix.m4a")
    sf.write(f_layer, layer.T.astype(np.float32), SR, subtype="FLOAT")
    sf.write(f_mix, (mix_i.T.astype(np.int32) << 8), SR, subtype="PCM_24")
    for c in cues:
        sf.write(os.path.join(WORK, "stems", f"{c.id}.wav"), (c.y * db2a(c.gain_db)).T.astype(np.float32), SR, subtype="FLOAT")
    if not args.no_m4a:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", f_mix, "-c:a", "aac", "-b:a", "320k",
                        "-movflags", "+faststart", "-metadata", "title=Hold Fire (film mix: song + sound design)",
                        "-metadata", "artist=Jade Wang", f_m4a], check=True)

    # ============================================================================ verification
    back, sr = sf.read(f_mix, dtype="int32", always_2d=True)
    back = (back >> 8).T.astype(np.int64)
    fresh = decode_s24(SONG_MP3).astype(np.int64)                # an independent second decode of the MP3
    fresh_pad = np.zeros((2, n_tot), dtype=np.int64)
    fresh_pad[:, :n_song] = fresh
    inwin = np.zeros(n_tot, dtype=bool)
    for a, b in windows:
        inwin[a:b] = True
    out = ~inwin
    resid = back - fresh_pad
    lay_back = sf.read(f_layer, dtype="float64", always_2d=True)[0].T
    V = {}
    V["null_test"] = dict(
        reference="second ffmpeg decode of inputs/Hold Fire.mp3 to 24-bit PCM, zero-padded to 249.2 s",
        samples_total=int(n_tot), samples_outside_cue_windows=int(out.sum()),
        cue_window_seconds=round(float(inwin.sum()) / SR, 3), n_cue_windows=len(windows),
        mix_minus_song_nonzero_outside=int(np.count_nonzero(resid[:, out])),
        layer_nonzero_outside=int(np.count_nonzero(lay_back[:, out])),
        bit_identical_outside_cues=bool(np.count_nonzero(resid[:, out]) == 0),
        inside_residual_equals_quantised_layer=bool(np.array_equal(resid[:, inwin], np.round(lay_back[:, inwin] * 2 ** 23).astype(np.int64))),
        song_samples_where_layer_is_zero_identical=bool(np.count_nonzero(resid[lay_back == 0]) == 0),
        mix_length_samples=int(back.shape[1]), mix_length_s=back.shape[1] / SR,
        mix_clipped_samples=clipped, song_tp_hot_samples_gated=hot_total)
    if os.path.exists(OLD_DECODE):
        old, _ = sf.read(OLD_DECODE, dtype="float32", always_2d=True)
        if old.shape[0] == n_song:
            # ffmpeg's own float -> s24 rule: s32 = lrintf(x * 2^31), s24 = s32 >> 8
            q = np.floor(np.rint(old.T.astype(np.float64) * 2 ** 31) / 256).astype(np.int64)
            V["null_test"]["matches_earlier_float_decode_work_audio_song_wav"] = bool(np.array_equal(q[:, out[:n_song]], back[:, :n_song][:, out[:n_song]]))
    mixf = back.astype(np.float64) / 2 ** 23
    songf = fresh_pad.astype(np.float64) / 2 ** 23
    V["peaks"] = dict(
        layer_sample_peak_dbfs=round(peak_db(lay_back), 2), layer_true_peak_dbtp=round(true_peak_db(lay_back), 2),
        song_sample_peak_dbfs=round(peak_db(songf), 2), song_true_peak_dbtp=round(true_peak_db(songf), 2),
        mix_sample_peak_dbfs=round(peak_db(mixf), 2), mix_true_peak_dbtp=round(true_peak_db(mixf), 2),
        mix_true_peak_in_cue_windows_dbtp=round(max(true_peak_db(mixf[:, a:b]) for a, b in windows), 2),
        limits=dict(layer_peak_max_dbfs=LAYER_PEAK_MAX_DB, mix_true_peak_max_dbtp=MIX_TP_MAX_DB))
    I_song, I_mix = integrated_lufs(songf[:, :n_song]), integrated_lufs(mixf)
    V["loudness"] = dict(song_integrated_lufs=round(I_song, 3), mix_integrated_lufs=round(I_mix, 3),
                         delta_lu=round(I_mix - I_song, 3), layer_integrated_lufs=round(integrated_lufs(lay_back), 2),
                         ffmpeg_ebur128=dict(song=ebur128(SONG_MP3), mix=ebur128(f_mix)))
    if not args.no_m4a:
        dec = ffmpeg_float(f_m4a)
        nn = min(dec.shape[1], n_tot)
        seg = slice(N(150.0), N(152.0))
        xc = [float(np.dot(dec[0, seg.start + d:seg.stop + d], mixf[0, seg])) for d in range(-2048, 2049, 1)]
        lag = int(np.argmax(xc)) - 2048
        V["m4a"] = dict(file=os.path.relpath(f_m4a, ROOT), codec="AAC-LC 320k (ffmpeg aac)", decoded_samples=int(dec.shape[1]),
                        offset_samples_vs_wav=lag, true_peak_dbtp=round(true_peak_db(dec[:, :nn]), 2),
                        integrated_lufs=round(integrated_lufs(dec[:, :nn]), 3), size_bytes=os.path.getsize(f_m4a))

    # ---- per-cue ear proxy on the final layer (all cues summed: overlaps count)
    layM = Momentary(kpow(lay_back))
    rows = []
    for c in cues:
        ts, cM, sM, act = c.margins(songM)
        ex = c.exempt(ts)
        tot = layM(ts)
        ok = act & ~ex
        m_c = sM[ok] - cM[ok] if ok.any() else np.array([])
        m_t = sM[ok] - tot[ok] if ok.any() else np.array([])
        vM = vocM(ts) if vocM is not None else None
        rows.append(dict(
            id=c.id, title=c.title, sync=c.sync, how=c.how, start_s=round(c.t0, 3), end_s=round(c.t1, 3),
            start_sample=N(c.t0), gain_db=round(c.gain_db, 2), level_rule=c.fit_note,
            peak_dbfs=round(peak_db(c.y * db2a(c.gain_db)), 1), max_momentary_lufs=round(float(cM.max()), 1),
            song_momentary_median_lufs=round(float(np.median(sM[act])), 1),
            margin_median_db=None if not len(m_c) else round(float(np.median(m_c)), 1),
            margin_worst_db=None if not len(m_c) else round(float(m_c.min()), 1),
            margin_worst_total_layer_db=None if not len(m_t) else round(float(m_t.min()), 1),
            margin_vs_vocal_median_db=None if vM is None or not ok.any() else round(float(np.median(vM[ok] - cM[ok])), 1),
            exempt_fraction=round(float((act & ex).sum() / max(1, act.sum())), 2),
            passes=bool(not len(m_t) or m_t.min() >= MIN_MARGIN_DB)))
    V["cues_pass_6db_rule"] = all(r["passes"] for r in rows)
    V["song_length_s"] = n_song / SR
    V["timing"] = dict(file=os.path.relpath(T.path, ROOT), status=T.status, warnings=T.warnings,
                       music_start_s=round(ctx["music_start"], 2), song_tail_s=round(ctx["song_tail"], 2))
    V["checks"] = dict(
        bit_identical_outside_cues=V["null_test"]["bit_identical_outside_cues"],
        layer_peak_ok=V["peaks"]["layer_true_peak_dbtp"] <= LAYER_PEAK_MAX_DB,
        mix_true_peak_ok=V["peaks"]["mix_true_peak_dbtp"] <= MIX_TP_MAX_DB or V["peaks"]["mix_true_peak_in_cue_windows_dbtp"] <= MIX_TP_MAX_DB,
        no_clipping=clipped == 0, cues_6db_under_song=V["cues_pass_6db_rule"],
        lengths_ok=back.shape[1] == n_tot and lay_back.shape[1] == n_tot)
    json.dump(dict(summary=V, cues=rows, context=dict((k, v) for k, v in ctx.items() if k != "counts"),
                   counts=ctx["counts"]), open(os.path.join(WORK, "cues.json"), "w"), indent=1, default=float)
    json.dump(V, open(os.path.join(WORK, "verify.json"), "w"), indent=1, default=float)
    plot(cues, rows, songM, layM, vocM, ctx, os.path.join(WORK, "cue_levels.png"))
    write_doc(rows, V, ctx, T)

    # ---- report
    print(f"{'cue':9s} {'start':>8s} {'end':>8s} {'gain':>6s} {'peak':>6s} {'maxM':>6s} {'med':>5s} {'worst':>5s} {'tot':>5s}  rule")
    for r in rows:
        f = lambda x: "  -  " if x is None else f"{x:5.1f}"
        print(f"{r['id']:9s} {r['start_s']:8.3f} {r['end_s']:8.3f} {r['gain_db']:6.1f} {r['peak_dbfs']:6.1f} "
              f"{r['max_momentary_lufs']:6.1f} {f(r['margin_median_db'])} {f(r['margin_worst_db'])} {f(r['margin_worst_total_layer_db'])}  "
              f"{r['level_rule']}{'' if r['passes'] else '  <-- FAIL'}")
    print(json.dumps(V, indent=1, default=float))
    print(f"done in {time.time() - t_start:.1f} s")
    return 0 if all(V["checks"].values()) else 1


# ============================================================================================ ear-proxy plot
def plot(cues, rows, songM, layM, vocM, ctx, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    groups = []
    for c in cues:
        if not groups or groups[-1][0] != c.group:
            groups.append((c.group, []))
        groups[-1][1].append(c)
    n = len(groups)
    cols = 3
    rws = (n + cols - 1) // cols
    fig, axs = plt.subplots(rws, cols, figsize=(16, 3.0 * rws))
    axs = axs.ravel()
    for ax, (g, cs) in zip(axs, groups):
        a, b = min(c.t0 for c in cs) - 0.4, max(c.t1 for c in cs) + 0.4
        ts = np.arange(a, b, 0.01)
        sM = songM(ts)
        ax.plot(ts, sM, color="#5c6b80", lw=1.2, label="song (momentary LUFS)")
        ax.plot(ts, sM - MIN_MARGIN_DB, color="#ff2e1f", lw=0.8, ls="--", label="song - 6 dB (ceiling)")
        if vocM is not None:
            ax.plot(ts, vocM(ts), color="#6fd6ff", lw=0.6, alpha=0.6, label="vocal stem")
        ax.plot(ts, layM(ts), color="#f4b443", lw=1.6, label="SFX layer")
        for c in cs:
            ax.axvspan(c.t0, c.t1, color="#f4b443", alpha=0.07)
            ex = c.exempt(ts) & (ts >= c.t0) & (ts <= c.t1)
            if ex.any():
                ax.fill_between(ts, -80, 0, where=ex, color="#999999", alpha=0.15, lw=0)
        rr = [r for r in rows if r["id"] in [c.id for c in cs]]
        worst = [r["margin_worst_total_layer_db"] for r in rr if r["margin_worst_total_layer_db"] is not None]
        med = [r["margin_median_db"] for r in rr if r["margin_median_db"] is not None]
        ttl = f"{g}: {a + 0.4:.2f}-{b - 0.4:.2f} s"
        if worst:
            ttl += f"   margin median {np.median(med):.1f} / worst {min(worst):.1f} dB"
        ax.set_title(ttl, fontsize=9)
        ax.set_ylim(-75, -5)
        ax.set_xlim(a, b)
        ax.tick_params(labelsize=7)
        ax.grid(alpha=0.2)
    axs[0].legend(fontsize=7, loc="lower right")
    for ax in axs[n:]:
        ax.axis("off")
    fig.suptitle("HOLD FIRE: SFX layer vs song, momentary loudness (400 ms, K-weighted). Grey = exempt (before the music / end tail).",
                 fontsize=11)
    fig.tight_layout(rect=(0, 0, 1, 0.97))
    fig.savefig(path, dpi=80)
    plt.close(fig)


# ============================================================================================ docs/SOUND.md
def mmss(t):
    return f"{int(t // 60)}:{t % 60:06.3f}"


def write_doc(rows, V, ctx, T):
    nt, pk, ld = V["null_test"], V["peaks"], V["loudness"]
    L = []
    L.append("# HOLD FIRE: sound design (cue sheet)\n")
    L.append("*Generated by `tools/audio/sfx.py` (re-run it after the timing is refined; every time below comes from "
             f"`{V['timing']['file']}`). Do not edit by hand.*\n")
    L.append("## Rules\n")
    L.append("* **The song is untouched.** The mix is `song + layer`, sample-aligned (sample 0 = the MP3's first decoded sample, "
             "encoder delay trimmed: the time base of `timing.json`). No normalising, compression, ducking or limiting of the song. "
             "Outside the cue windows the layer is exactly 0.0, so the mix is bit-identical to the song there (null test below).")
    L.append("* **Under the song.** Each cue is levelled against the song's own momentary loudness (BS.1770, 400 ms): it sits at "
             "its median target margin under the song and never closer than its worst-frame margin (all well over the 6 dB rule); "
             "exempt only: the scope cue before the music starts (song < -40 LUFS, t < "
             f"{V['timing']['music_start_s']:.2f} s) and the end card's tail, after the music has ended (the song falls below the same "
             f"-40 LUFS for good, t >= {V['timing']['song_tail_s']:.2f} s).")
    L.append(f"* **Light, not percussion.** Pings are soft-attack glass tones in D minor (the song's key), high and short, far under "
             "the whisper. Nothing in the layer peaks above -14 dBFS; the mix never clips.")
    L.append("* **Synced to the picture**, not to a guess: count pings use `coldopen.js pulses()` exactly (n pings at t + i*gap); "
             "the lock follows `phases().lock`; the chime the reticle's `open`; the end pings `endcard.js` (period 1.15 s from S).")
    L.append("* **All synthesized** (numpy/scipy, seeded, deterministic). No generated audio was used ($0.00).\n")
    L.append("## Cues\n")
    L.append("| # | cue | window (s) | sync | gain / peak | max momentary | margin under song: median / worst (all cues summed) | how it's made |")
    L.append("|---|---|---|---|---|---|---|---|")
    for i, r in enumerate(rows, 1):
        mg = "exempt" if r["margin_median_db"] is None else f"{r['margin_median_db']:.1f} / {r['margin_worst_total_layer_db']:.1f} dB"
        if r["exempt_fraction"] and r["margin_median_db"] is not None:
            mg += f" ({int(round(r['exempt_fraction'] * 100))}% exempt)"
        L.append(f"| {i} | **{r['id']}**: {r['title']} | {r['start_s']:.3f}-{r['end_s']:.3f} ({mmss(r['start_s'])}) | {r['sync']} | "
                 f"{r['gain_db']:+.1f} dB / {r['peak_dbfs']:.1f} dBFS | {r['max_momentary_lufs']:.1f} LUFS | {mg} | {r['how']} |")
    L.append("")
    L.append("Level rule per cue (which constraint set the gain) is in `work/sfx/cues.json` (`level_rule`), with the margin vs the "
             "vocal stem. Ear proxy: `work/sfx/cue_levels.png` (song vs layer momentary loudness per cue, the red dashed line is "
             "song - 6 dB).\n")
    L.append("## Verification\n")
    L.append("| check | result |")
    L.append("|---|---|")
    L.append(f"| null test outside cue windows ({nt['samples_outside_cue_windows']:,} of {nt['samples_total']:,} samples; "
             f"{nt['n_cue_windows']} windows, {nt['cue_window_seconds']:.1f} s) | mix - song nonzero: **{nt['mix_minus_song_nonzero_outside']}** "
             f"samples; layer nonzero: {nt['layer_nonzero_outside']}; bit-identical: **{nt['bit_identical_outside_cues']}** |")
    L.append(f"| inside the windows | mix - song == round(layer x 2^23) exactly: {nt['inside_residual_equals_quantised_layer']} |")
    if "matches_earlier_float_decode_work_audio_song_wav" in nt:
        L.append(f"| cross-check vs the earlier float decode (`work/audio/song.wav`, ffmpeg's s24 rule) | "
                 f"{nt['matches_earlier_float_decode_work_audio_song_wav']} |")
    L.append(f"| layer peak | {pk['layer_sample_peak_dbfs']:.2f} dBFS sample, {pk['layer_true_peak_dbtp']:.2f} dBTP (limit -14) |")
    L.append(f"| song peak | {pk['song_sample_peak_dbfs']:.2f} dBFS, {pk['song_true_peak_dbtp']:.2f} dBTP (nothing above -0.5 dBTP: no gating needed) |")
    L.append(f"| mix peak | {pk['mix_sample_peak_dbfs']:.2f} dBFS, {pk['mix_true_peak_dbtp']:.2f} dBTP; in cue windows "
             f"{pk['mix_true_peak_in_cue_windows_dbtp']:.2f} dBTP; clipped samples {nt['mix_clipped_samples']} |")
    L.append(f"| integrated loudness | song {ld['song_integrated_lufs']:.2f} LUFS, mix {ld['mix_integrated_lufs']:.2f} LUFS "
             f"(delta {ld['delta_lu']:+.3f} LU); ffmpeg ebur128: song {ld['ffmpeg_ebur128']['song'].get('integrated_lufs')}, "
             f"mix {ld['ffmpeg_ebur128']['mix'].get('integrated_lufs')} LUFS |")
    L.append(f"| layer alone | {ld['layer_integrated_lufs']:.1f} LUFS integrated |")
    if "m4a" in V:
        m = V["m4a"]
        L.append(f"| m4a | {m['codec']}, offset vs wav {m['offset_samples_vs_wav']} samples, {m['true_peak_dbtp']:.2f} dBTP, "
                 f"{m['integrated_lufs']:.2f} LUFS |")
    L.append(f"| lengths | mix and layer {nt['mix_length_samples']:,} samples = {nt['mix_length_s']:.3f} s (song "
             f"{V['song_length_s']:.3f} s + end-card tail) |")
    L.append(f"| every cue >= 6 dB under the song (non-exempt frames, all cues summed) | {V['cues_pass_6db_rule']} |\n")
    L.append("## Timing notes\n")
    L.append(f"* Timing file: `{V['timing']['file']}`, status: *{V['timing']['status']}*")
    for w in V["timing"]["warnings"]:
        L.append(f"* warning: {w}")
    L.append(f"* Bridge line 6 ('sixty-two, depth charges falling'): the word times are contiguous, so the pings and thuds are "
             "placed in the quietest 20 ms of the vocal stem near each word boundary: "
             + ", ".join(f"{k} {v:.3f}" for k, v in ctx["gaps"].items()) + f"; nothing after {ctx['stop']:.2f} ('two said fire').")
    L.append(f"* The match flare is at Bridge line 2 start - 0.2 + 0.5 = {ctx['t_match']:.3f} (the brief); the forest scene's "
             f"`sparkT` is currently `matchT + 0.3` = {ctx['matchT'] + 0.3:.3f}. If the spark is drawn there, move one of them.")
    L.append("* The mix is 249.2 s: the end card (Z3) runs to `A.duration + 2`, and `A.duration` falls back to 247.2 because "
             "timing.json has no top-level `duration` (the decoded song is 247.160 s, so the tail is 2.04 s).\n")
    L.append("## Files\n")
    L.append("* `tools/audio/sfx.py`: this whole layer, re-runnable (`python3 tools/audio/sfx.py [--timing F] [--no-m4a]`).")
    L.append("* `work/sfx/sfx_layer.wav` (float32, 249.2 s), `work/sfx/stems/<cue>.wav` (each cue at final gain; its window start "
             "is in `cues.json`), `work/sfx/cues.json`, `work/sfx/verify.json`, `work/sfx/cue_levels.png`.")
    L.append("* `media/audio/hold_fire_mix.wav` (PCM 24-bit, 48 kHz stereo, 249.2 s) and `media/audio/hold_fire_mix.m4a` (AAC 320k): "
             "pass either to `render/tools/render.mjs --audio`.")
    open(DOC, "w").write("\n".join(L) + "\n")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
