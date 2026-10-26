"""Hold Fire stems -> work/stems/vocals.wav + inst.wav (48 kHz stereo, PCM 24-bit; inst = mix - vocals, so they null).

Separation: BS-RoFormer ep_317 (model_bs_roformer_ep_317_sdr_12.9755.ckpt, UVR model repo GitHub release; vocals SDR 12.97 on
MUSDB) via python-audio-separator 0.47 on CPU (torch 2.14, bf16 autocast on AMX: 51 dB SDR vs fp32 on a test clip;
~30 s per 8 s chunk on 4 cores), overlap 2. Model rate 44.1 kHz: the song is resampled to 44.1k by audio-separator, the vocal
stem is resampled back to 48k here (soxr VHQ) and the instrumental is the 48 kHz mix minus that, sample-exact.
Secondary stems (for cross-checks, not deliverables): Kim_Vocal_2 MDX-Net (tools/audio/vocal_stem_mdx.py) in work/stems/mdx_kim,
KUIELab drums on the Kim instrumental in work/stems/mdx_drums.

    python3 tools/audio/stems.py            # runs the separation if needed, then exports
"""
import os, subprocess, sys, glob
import numpy as np, soundfile as sf, soxr
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'work')
SONG = os.path.join(W, 'audio/song.wav')          # ffmpeg decode of inputs/Hold Fire.mp3 (gapless, 48k float)
RF = os.path.join(W, 'stems/roformer')
MODEL = 'model_bs_roformer_ep_317_sdr_12.9755.ckpt'
if not os.path.exists(SONG):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(ROOT, 'inputs/Hold Fire.mp3'), '-map', '0:a:0',
                    '-c:a', 'pcm_f32le', SONG], check=True)
voc44 = glob.glob(os.path.join(RF, '*(Vocals)*.wav'))
if not voc44:
    os.makedirs(RF, exist_ok=True)
    subprocess.run(['audio-separator', SONG, '-m', MODEL, '--model_file_dir', os.path.join(W, 'models'), '--output_dir', RF,
                    '--output_format', 'WAV', '--normalization', '1.0', '--mdxc_overlap', '2', '--use_autocast',
                    '--use_soundfile', '--log_level', 'info'], check=True)
    voc44 = glob.glob(os.path.join(RF, '*(Vocals)*.wav'))
v44, sr = sf.read(voc44[0], dtype='float64'); assert sr == 44100, sr
mix, sr2 = sf.read(SONG, dtype='float64'); assert sr2 == 48000
v = soxr.resample(v44, 44100, 48000, quality='VHQ')
n = mix.shape[0]
v = np.pad(v, ((0, max(0, n - len(v))), (0, 0)))[:n]
# audio-separator only scales when a peak exceeds --normalization; confirm unity gain by least squares vs the mix
g = float((v * mix).sum() / (v * v).sum())
inst = mix - v
for name, x in (('vocals', v), ('inst', inst)):
    pk = np.abs(x).max()
    sf.write(os.path.join(W, f'stems/{name}.wav'), x, 48000, subtype='PCM_24' if pk < 0.999 else 'FLOAT')
    print(f'{name}: peak {pk:.3f} rms {20*np.log10(np.sqrt((x**2).mean())):.1f} dBFS')
print(f'vocal/mix projection gain {g:.3f} (≈1 → no level change); mix-null residual {np.abs(mix - v - inst).max():.2e}')
