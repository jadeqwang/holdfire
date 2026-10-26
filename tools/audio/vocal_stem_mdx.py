"""Vocal / instrumental stems with a UVR MDX-Net ONNX model (Kim_Vocal_2 by default). Copied from
orbital-sunrise-video/tools/vocal_stem.py; Hold Fire changes: model dir work/models, --model=, 48 kHz song input,
outputs at 44.1 kHz (model rate) in work/stems/mdx/ -- tools/audio/stems.py resamples to 48 kHz.

    python3 tools/audio/vocal_stem_mdx.py [SONG] [--out=work/stems/mdx] [--model=Kim_Vocal_2] [--ss=0 --t=0] [--denoise]
    python3 tools/audio/vocal_stem_mdx.py work/stems/mdx_kim/instrumental.wav --model=kuielab_a_drums --nfft=4096 --comp=1.035 \
            --stem=drums --out=work/stems/mdx_drums          (KUIELab MDX-Net drums; dim_f/dim_t read from the model)

SONG defaults to media/audio/Orbital_Sunrise_extended.wav (decode it from the committed .m4a first; tools/setup_env.sh does).
Writes <out>/vocals.wav and <out>/instrumental.wav (44.1 kHz stereo, instrumental = mix - vocals), the paths
tools/suit_splice.py, tools/mouth_track.py and tools/lipsync.py read. For a new mix from her, ask for her own vocal stem
first (better than any separation); this is the fallback.

The original stems (/tmp/work/audio/*.wav, "Kim_Vocal_2 stems of song.wav") were made in the first session and never
committed; this re-implements the same model's standard UVR inference (n_fft 7680, hop 1024, 3072 bins x 256 frames,
vocal gain 1.009) in numpy + onnxruntime, so it is close to but not guaranteed identical with those files.
Model: /tmp/work/models/Kim_Vocal_2.onnx (66.8 MB, sha256 ce74ef3b...), downloaded if missing from
https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/Kim_Vocal_2.onnx
~1-2x real time on 4 CPU cores (--denoise doubles it).
"""
import sys, pathlib, subprocess, urllib.request
import numpy as np, soundfile as sf

ROOT = pathlib.Path(__file__).resolve().parents[2]
MODEL = ROOT / "work/models/Kim_Vocal_2.onnx"
URL = "https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/Kim_Vocal_2.onnx"
SR, NFFT, HOP, DIM_F, DIM_T, COMP = 44100, 7680, 1024, 3072, 256, 1.009
CHUNK = HOP * (DIM_T - 1)
TRIM = NFFT // 2
GEN = CHUNK - 2 * TRIM
WIN = np.hanning(NFFT + 1)[:-1]            # periodic Hann, as torch.hann_window(n_fft)


def stft(x):  # x [n, CHUNK] -> [n, F, DIM_T] complex; torch.stft(center=True, pad_mode='reflect')
    xp = np.pad(x, ((0, 0), (NFFT // 2, NFFT // 2)), mode="reflect")
    idx = np.arange(DIM_T)[:, None] * HOP + np.arange(NFFT)[None, :]
    return np.fft.rfft(xp[:, idx] * WIN, axis=-1).transpose(0, 2, 1)


def istft(S):  # [n, F, DIM_T] -> [n, CHUNK]; torch.istft(center=True)
    fr = np.fft.irfft(S.transpose(0, 2, 1), n=NFFT, axis=-1) * WIN
    L = NFFT + HOP * (DIM_T - 1)
    y = np.zeros((S.shape[0], L)); w = np.zeros(L)
    for t in range(DIM_T):
        y[:, t * HOP:t * HOP + NFFT] += fr[:, t]; w[t * HOP:t * HOP + NFFT] += WIN ** 2
    y = y / np.maximum(w, 1e-8)
    return y[:, NFFT // 2:NFFT // 2 + CHUNK]


def run_chunk(sess, wav):  # wav [2, CHUNK] -> vocals [2, CHUNK]
    S = stft(wav)[:, :DIM_F]                                     # [2, 3072, 256]
    x = np.stack([S[0].real, S[0].imag, S[1].real, S[1].imag])[None].astype(np.float32)
    def model(z):
        return sess.run(None, {"input": z})[0][0]
    y = model(x)
    if DENOISE:
        y = (y - model(-x)) / 2
    F = NFFT // 2 + 1
    out = np.zeros((2, F, DIM_T), complex)
    out[0, :DIM_F] = y[0] + 1j * y[1]; out[1, :DIM_F] = y[2] + 1j * y[3]
    return istft(out)


def main():
    global DENOISE
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    a = dict(x[2:].split("=", 1) if "=" in x else (x[2:], "1") for x in sys.argv[1:] if x.startswith("--"))
    global MODEL, URL
    DENOISE = "denoise" in a
    if "model" in a:
        MODEL = MODEL.with_name(a["model"] + ".onnx"); URL = URL.rsplit("/", 1)[0] + "/" + MODEL.name
    song = pathlib.Path(pos[0]) if pos else ROOT / "work/audio/song.wav"
    out = pathlib.Path(a.get("out", str(ROOT / "work/stems/mdx"))); out.mkdir(parents=True, exist_ok=True)
    if not MODEL.exists():
        MODEL.parent.mkdir(parents=True, exist_ok=True)
        print("downloading", URL); urllib.request.urlretrieve(URL, MODEL)
    import onnxruntime as ort
    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    global NFFT, DIM_F, DIM_T, COMP, CHUNK, TRIM, GEN, WIN
    shp = sess.get_inputs()[0].shape
    DIM_F, DIM_T = int(shp[2]), int(shp[3])
    NFFT = int(a.get("nfft", NFFT)); COMP = float(a.get("comp", COMP))
    CHUNK = HOP * (DIM_T - 1); TRIM = NFFT // 2; GEN = CHUNK - 2 * TRIM; WIN = np.hanning(NFFT + 1)[:-1]
    stem = a.get("stem", "vocals"); rest = "instrumental" if stem == "vocals" else "rest"
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"] + (["-ss", a["ss"]] if "ss" in a else []) + \
          (["-t", a["t"]] if float(a.get("t", 0)) > 0 else []) + ["-i", str(song), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    mix = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).T.astype(np.float64)
    n = mix.shape[1]
    pad = GEN - n % GEN
    mp = np.concatenate([np.zeros((2, TRIM)), mix, np.zeros((2, pad + TRIM))], 1)
    parts = []
    for i in range(0, n + pad, GEN):
        parts.append(run_chunk(sess, mp[:, i:i + CHUNK])[:, TRIM:-TRIM])
        print(f"\r{min(i + GEN, n) / SR:.1f}/{n / SR:.1f} s", end="", flush=True)
    voc = np.concatenate(parts, 1)[:, :n] * COMP
    sf.write(out / f"{stem}.wav", voc.T, SR, subtype="FLOAT")
    sf.write(out / f"{rest}.wav", (mix - voc).T, SR, subtype="FLOAT")
    print(f"\nwrote {out}/{stem}.wav, {out}/{rest}.wav ({n / SR:.2f} s)")


DENOISE = False
if __name__ == "__main__":
    main()
