#!/usr/bin/env python3
"""Conform a generated clip or still into a plate sequence the take-two renderer reads.

  plates.py CLIP.mp4 NAME [--fit cover|contain|keep] [--w 1920 --h 1080] [--q 90] [--start S --dur D] [--key green]
  plates.py IMG.jpg  NAME [same options]           -> a single frame (kind 'still')

Writes work/plates/NAME/f_00000.jpg ... (24 fps CFR, Lanczos) and meta.json
  {fps, n, w, h, src, start, dur, fit, kind, key}
--fit cover   scale to cover WxH and centre-crop (default)
--fit contain scale to fit inside WxH and pad black
--fit keep    scale to cover WxH but keep the source aspect (no crop; for stills you pan over)
--key green   chroma-key: also writes m_00000.png (8-bit matte, 255 = subject) and stores despilled colour in f_*.jpg
              (--keylo/--keyhi: green-dominance thresholds, default 0.06/0.20; --choke px erodes the matte, default 1)
--out DIR     output root (default <repo>/work/plates)
Re-running replaces the directory's frames. Needs ffmpeg/ffprobe, numpy, Pillow.
"""
import argparse, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'}


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:format=duration',
                        '-of', 'json', path], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    s = j['streams'][0]
    return int(s['width']), int(s['height']), float(j.get('format', {}).get('duration', 0) or 0)


def geometry(sw, sh, W, H, fit):
    """returns (scaled w, h, crop/pad box) for the chosen fit"""
    if fit == 'contain':
        k = min(W / sw, H / sh)
    else:
        k = max(W / sw, H / sh)
    w, h = max(1, round(sw * k)), max(1, round(sh * k))
    if fit == 'keep':
        return w, h, (w, h)
    return w, h, (W, H)


def key_green(rgb, lo, hi, choke):
    """rgb float 0..1 HxWx3 -> (despilled rgb, matte 0..1). Green dominance g - max(r, b) drives the matte."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    dom = g - np.maximum(r, b)
    a = 1.0 - np.clip((dom - lo) / max(1e-4, hi - lo), 0, 1)
    a = a * a * (3 - 2 * a)
    m = Image.fromarray((a * 255).astype(np.uint8), 'L')
    if choke > 0:
        m = m.filter(ImageFilter.MinFilter(2 * choke + 1))
    m = m.filter(ImageFilter.GaussianBlur(0.8))
    # despill: green limited to the mean of red and blue (the classic average-limit), the removed spill lifts luma back a little
    lim = (r + b) * 0.5
    spill = np.maximum(g - lim, 0)
    out = rgb.copy()
    out[..., 1] = g - spill
    out[..., 0] = np.clip(r + spill * 0.15, 0, 1)
    out[..., 2] = np.clip(b + spill * 0.15, 0, 1)
    return out, m


def write_frame(arr, odir, i, q, key, kp):
    if key:
        rgb, m = key_green(arr.astype(np.float32) / 255.0, *kp)
        arr = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
        m.save(os.path.join(odir, f'm_{i:05d}.png'), optimize=False, compress_level=3)
    Image.fromarray(arr, 'RGB').save(os.path.join(odir, f'f_{i:05d}.jpg'), quality=q, subsampling=0 if q >= 92 else 2)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src'); ap.add_argument('name')
    ap.add_argument('--fit', default='cover', choices=['cover', 'contain', 'keep'])
    ap.add_argument('--w', type=int, default=1920); ap.add_argument('--h', type=int, default=1080)
    ap.add_argument('--q', type=int, default=90)
    ap.add_argument('--start', type=float, default=0.0); ap.add_argument('--dur', type=float, default=None)
    ap.add_argument('--fps', type=float, default=24.0)
    ap.add_argument('--key', default=None, choices=['green'])
    ap.add_argument('--keylo', type=float, default=0.06); ap.add_argument('--keyhi', type=float, default=0.20)
    ap.add_argument('--choke', type=int, default=1)
    ap.add_argument('--out', default=os.path.join(REPO, 'work', 'plates'))
    a = ap.parse_args()

    src = a.src
    if not os.path.exists(src):
        sys.exit(f'missing {src}')
    odir = os.path.join(a.out, a.name)
    if os.path.isdir(odir):
        shutil.rmtree(odir)
    os.makedirs(odir)
    kp = (a.keylo, a.keyhi, a.choke)
    is_img = os.path.splitext(src)[1].lower() in IMG_EXT
    srcrel = os.path.relpath(os.path.abspath(src), REPO)

    if is_img:
        im = Image.open(src).convert('RGB')
        sw, sh = im.size
        w, h, (cw, ch) = geometry(sw, sh, a.w, a.h, a.fit)
        im = im.resize((w, h), Image.LANCZOS)
        if a.fit == 'contain':
            canvas = Image.new('RGB', (cw, ch), (0, 0, 0)); canvas.paste(im, ((cw - w) // 2, (ch - h) // 2)); im = canvas
        elif a.fit == 'cover':
            x0, y0 = (w - cw) // 2, (h - ch) // 2; im = im.crop((x0, y0, x0 + cw, y0 + ch))
        write_frame(np.asarray(im), odir, 0, a.q, a.key, kp)
        n, kind, fw, fh = 1, 'still', im.size[0], im.size[1]
    else:
        sw, sh, sdur = probe(src)
        w, h, (cw, ch) = geometry(sw, sh, a.w, a.h, a.fit)
        vf = f'fps={a.fps:g},scale={w}:{h}:flags=lanczos'
        if a.fit == 'cover':
            vf += f',crop={cw}:{ch}:(iw-{cw})/2:(ih-{ch})/2'
        elif a.fit == 'contain':
            vf += f',pad={cw}:{ch}:(ow-iw)/2:(oh-ih)/2:black'
        cmd = ['ffmpeg', '-v', 'error', '-ss', f'{a.start:.4f}', '-i', src]
        if a.dur is not None:
            cmd += ['-t', f'{a.dur:.4f}']
        cmd += ['-vf', vf, '-an', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        fsz = cw * ch * 3
        n = 0
        while True:
            buf = p.stdout.read(fsz)
            if len(buf) < fsz:
                break
            write_frame(np.frombuffer(buf, np.uint8).reshape(ch, cw, 3), odir, n, a.q, a.key, kp)
            n += 1
        p.wait()
        if p.returncode != 0 or n == 0:
            sys.exit(f'ffmpeg failed ({p.returncode}), {n} frames')
        kind, fw, fh = 'video', cw, ch

    meta = {'fps': a.fps if not is_img else 24, 'n': n, 'w': fw, 'h': fh, 'src': srcrel, 'start': a.start if not is_img else 0,
            'dur': round(n / a.fps, 4) if not is_img else 0, 'fit': a.fit, 'kind': kind, 'key': a.key}
    with open(os.path.join(odir, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    print(f'{os.path.relpath(odir, REPO)}: {n} frame(s) {fw}x{fh} {kind}{" + matte" if a.key else ""}')


if __name__ == '__main__':
    main()
