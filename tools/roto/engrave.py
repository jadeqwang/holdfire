#!/usr/bin/env python3
"""Engraving guides: per drawing, evenly spaced streamlines that follow the plate's form (structure-tensor isophotes),
with a per-point width that carries tone (white-line / scratchboard engraving: bright = thick line). Temporal coherence:
each drawing's seeds are the previous drawing's line points advected by optical flow (DIS), then gaps are filled.

Output per drawing (design space 1920x1080): lines_NNNN.bin = int32 nlines, then per line: int32 npts, npts*(int16 x*8, int16 y*8, uint8 w*20)
plus tone_NNNN.png (L, bilateral tone) and edge_NNNN.png (XDoG contours, white on black), meta.json.

  engrave.py SRC OUTDIR [--start=S] [--dur=D] [--twos=1] [--sep=7] [--wmax=4.2] [--matte=DIR]
SRC: a video (frames from --start for --dur s) or a still image.
"""
import json, os, sys, struct, time
import numpy as np, cv2
from numba import njit

W, H = 1920, 1080          # design space
PW, PH = 1280, 720         # processing space


def opts():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    o = {x[2:].split('=')[0]: (x.split('=', 1)[1] if '=' in x else '1') for x in sys.argv[1:] if x.startswith('--')}
    return a, o


def frames(src, start, dur, step):
    if src.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        im = cv2.imread(src); yield 0, cv2.resize(im, (PW, PH), interpolation=cv2.INTER_AREA); return
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    n0 = int(round(start * fps)); n1 = n0 + int(round(dur * fps)) if dur else int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, n0)
    i = n0
    while i < n1:
        ok, im = cap.read()
        if not ok: break
        if (i - n0) % step == 0:
            yield i, cv2.resize(im, (PW, PH), interpolation=cv2.INTER_AREA)
        i += 1


_session = None
def matte_of(bgr, model='u2net_human_seg'):
    global _session
    from rembg import remove, new_session
    from PIL import Image
    if _session is None: _session = new_session(model)
    small = cv2.resize(bgr, (640, 360), interpolation=cv2.INTER_AREA)
    m = remove(Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB)), session=_session, only_mask=True)
    m = cv2.resize(np.asarray(m).astype(np.float32) / 255., (PW, PH), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(m, (0, 0), 1.5)


def tone_and_flow(bgr, sigma=9.0, matte=None):
    g8 = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    glob = g8.astype(np.float32) / 255.
    # the subject gets local contrast (CLAHE), so its own range drives the lines; the background keeps the scene's exposure
    loc = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(6, 6)).apply(g8).astype(np.float32) / 255.
    if matte is not None:
        g = matte * (0.35 * glob + 0.65 * loc) + (1 - matte) * glob * 0.85
    else:
        g = 0.6 * glob + 0.4 * loc
    t = cv2.bilateralFilter(g.astype(np.float32), 9, 0.08, 6)
    gx = cv2.Sobel(t, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(t, cv2.CV_32F, 0, 1, ksize=3)
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), sigma); jyy = cv2.GaussianBlur(gy * gy, (0, 0), sigma); jxy = cv2.GaussianBlur(gx * gy, (0, 0), sigma)
    # dominant gradient angle; isophote (line direction) is perpendicular
    ang = 0.5 * np.arctan2(2 * jxy, jxx - jyy)
    lam1 = 0.5 * (jxx + jyy + np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2)); lam2 = 0.5 * (jxx + jyy - np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2))
    coh = ((lam1 - lam2) / (lam1 + lam2 + 1e-6)) ** 2
    vx = -np.sin(ang); vy = np.cos(ang)
    # where the structure is weak, fall back to a gentle default slant so flat areas still engrave cleanly
    d = np.deg2rad(-28.)
    k = np.clip(coh * 3, 0, 1) * np.clip((lam1 + lam2) * 400, 0, 1)
    vx = vx * k + np.cos(d) * (1 - k); vy = vy * k + np.sin(d) * (1 - k)
    # orient consistently (no sign flips between neighbours): make the x component non-negative
    s = np.where(vx < 0, -1., 1.); vx *= s; vy *= s
    n = np.sqrt(vx * vx + vy * vy) + 1e-6
    vx = cv2.GaussianBlur((vx / n).astype(np.float32), (0, 0), 2.0); vy = cv2.GaussianBlur((vy / n).astype(np.float32), (0, 0), 2.0)
    return t, vx, vy


def xdog(t, sigma=0.9, k=1.6, tau=0.985, eps=-0.012, phi=60.):
    g1 = cv2.GaussianBlur(t, (0, 0), sigma); g2 = cv2.GaussianBlur(t, (0, 0), sigma * k)
    d = g1 - tau * g2
    e = np.where(d >= eps, 1., 1 + np.tanh(phi * (d - eps)))
    return (1 - np.clip(e, 0, 1))  # 1 = line


@njit(cache=True)
def trace(seed_x, seed_y, vx, vy, occ, sep, test, step, maxpts):
    """Evenly spaced streamlines (Jobard & Lefer). Returns flat arrays of points and line lengths.
    occ: occupancy grid (cell = sep/2) of accepted points; a new line stops when it comes within test*sep of another line."""
    h, w = vx.shape
    cs = sep * 0.5
    gh, gw = occ.shape
    outx = np.empty(seed_x.shape[0] * maxpts, np.float32); outy = np.empty_like(outx)
    lens = np.zeros(seed_x.shape[0], np.int32)
    npt = 0
    tmpx = np.empty(maxpts * 2 + 1, np.float32); tmpy = np.empty_like(tmpx)
    for si in range(seed_x.shape[0]):
        x0 = seed_x[si]; y0 = seed_y[si]
        if x0 < 1 or y0 < 1 or x0 >= w - 2 or y0 >= h - 2: continue
        # seed must be at least sep from existing lines
        gi = int(y0 / cs); gj = int(x0 / cs)
        ok = True
        r = 2
        for a in range(max(0, gi - r), min(gh, gi + r + 1)):
            for b in range(max(0, gj - r), min(gw, gj + r + 1)):
                if occ[a, b] > 0:
                    # occ stores 1 + point index parity; approximate distance by cell centre
                    cy = (a + .5) * cs; cx = (b + .5) * cs
                    if (cx - x0) ** 2 + (cy - y0) ** 2 < (sep * 0.92) ** 2: ok = False
        if not ok: continue
        # trace both directions into tmp (backward reversed, then forward)
        nb = 0
        for direction in (-1.0, 1.0):
            x = x0; y = y0
            px = 0.0; py = 0.0
            cnt = 0
            while cnt < maxpts:
                ix = int(x); iy = int(y)
                if ix < 1 or iy < 1 or ix >= w - 2 or iy >= h - 2: break
                fx = x - ix; fy = y - iy
                ux = (vx[iy, ix] * (1 - fx) + vx[iy, ix + 1] * fx) * (1 - fy) + (vx[iy + 1, ix] * (1 - fx) + vx[iy + 1, ix + 1] * fx) * fy
                uy = (vy[iy, ix] * (1 - fx) + vy[iy, ix + 1] * fx) * (1 - fy) + (vy[iy + 1, ix] * (1 - fx) + vy[iy + 1, ix + 1] * fx) * fy
                nn = (ux * ux + uy * uy) ** 0.5 + 1e-6
                ux /= nn; uy /= nn
                if cnt > 0 and ux * px + uy * py < 0: ux = -ux; uy = -uy   # keep heading (the field is a line field)
                if cnt == 0 and direction < 0: ux = -ux; uy = -uy
                px = ux; py = uy
                x += ux * step; y += uy * step
                # stop near other lines
                gi = int(y / cs); gj = int(x / cs)
                hit = False
                for a in range(max(0, gi - 1), min(gh, gi + 2)):
                    for b in range(max(0, gj - 1), min(gw, gj + 2)):
                        if occ[a, b] > 0:
                            cy = (a + .5) * cs; cx = (b + .5) * cs
                            if (cx - x) ** 2 + (cy - y) ** 2 < (sep * test) ** 2: hit = True
                if hit: break
                if direction < 0:
                    tmpx[maxpts - 1 - cnt] = x; tmpy[maxpts - 1 - cnt] = y
                else:
                    tmpx[maxpts + 1 + cnt] = x; tmpy[maxpts + 1 + cnt] = y
                cnt += 1
            if direction < 0: nb = cnt
            else: nf = cnt
        tmpx[maxpts] = x0; tmpy[maxpts] = y0
        n = nb + 1 + nf
        if n < 4: continue
        a0 = maxpts - nb
        # accept: mark occupancy, copy out
        for q in range(n):
            xx = tmpx[a0 + q]; yy = tmpy[a0 + q]
            gi = int(yy / cs); gj = int(xx / cs)
            if 0 <= gi < gh and 0 <= gj < gw: occ[gi, gj] = 1
            if npt < outx.shape[0]:
                outx[npt] = xx; outy[npt] = yy; npt += 1
        lens[si] = n
    return outx[:npt], outy[:npt], lens


SIGMA = 9.0
def engrave(bgr, prev_pts=None, flow=None, sep=4.7, matte=None):
    t, vx, vy = tone_and_flow(bgr, sigma=SIGMA, matte=matte)
    cs = sep * 0.5
    occ = np.zeros((int(PH / cs) + 2, int(PW / cs) + 2), np.int32)
    seeds = []
    if prev_pts is not None and len(prev_pts):
        px, py = prev_pts[:, 0], prev_pts[:, 1]
        if flow is not None:
            ix = np.clip(px.astype(int), 0, PW - 1); iy = np.clip(py.astype(int), 0, PH - 1)
            px = px + flow[iy, ix, 0]; py = py + flow[iy, ix, 1]
        seeds.append(np.stack([px, py], 1))
    # gap fill: a jittered grid, ordered brightest first so the light areas get the longest lines
    gy, gx = np.mgrid[sep / 2:PH:sep * 1.6, sep / 2:PW:sep * 1.6]
    rng = np.random.default_rng(7)
    g = np.stack([gx.ravel() + rng.uniform(-1, 1, gx.size) * sep * .3, gy.ravel() + rng.uniform(-1, 1, gx.size) * sep * .3], 1)
    tv = t[np.clip(g[:, 1].astype(int), 0, PH - 1), np.clip(g[:, 0].astype(int), 0, PW - 1)]
    g = g[np.argsort(-tv)]
    seeds.append(g)
    S = np.concatenate(seeds).astype(np.float32)
    xs, ys, lens = trace(S[:, 0].copy(), S[:, 1].copy(), vx, vy, occ, np.float32(sep), np.float32(0.55), np.float32(2.0), 160)
    lens = lens[lens > 0]
    # width from tone (bright = thick); the matte (if any) dims the background
    ix = np.clip(xs.astype(int), 0, PW - 1); iy = np.clip(ys.astype(int), 0, PH - 1)
    tv = t[iy, ix]
    wv = np.clip((tv - 0.07) / 0.8, 0, 1) ** 0.7
    if matte is not None: wv = wv * (0.55 + 0.45 * matte[iy, ix])
    return t, xs, ys, lens, wv


def write_bin(path, xs, ys, lens, wv, scale):
    out = bytearray(struct.pack('<i', len(lens)))
    o = 0
    for n in lens:
        out += struct.pack('<i', int(n))
        xq = np.clip(xs[o:o + n] * scale * 8, -32000, 32000).astype('<i2'); yq = np.clip(ys[o:o + n] * scale * 8, -32000, 32000).astype('<i2')
        wq = np.clip(wv[o:o + n] * 255, 0, 255).astype(np.uint8)
        rec = np.zeros(n, dtype=[('x', '<i2'), ('y', '<i2'), ('w', 'u1')]); rec['x'] = xq; rec['y'] = yq; rec['w'] = wq
        out += rec.tobytes(); o += n
    open(path, 'wb').write(out)


def main():
    a, o = opts()
    src, outdir = a[0], a[1]
    os.makedirs(outdir, exist_ok=True)
    start = float(o.get('start', 0)); dur = float(o.get('dur', 0)); step = 2 if o.get('twos', '1') == '1' else 1
    sep = float(o.get('sep', 7)) * PW / W
    global SIGMA
    SIGMA = float(o.get('sigma', 9.0))
    prev = None; prevg = None
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    meta = {'src': src, 'start': start, 'step': step, 'drawings': []}
    t0 = time.time()
    for k, (fi, bgr) in enumerate(frames(src, start, dur, step)):
        g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        flow = dis.calc(prevg, g, None) if prevg is not None else None
        mt = matte_of(bgr) if o.get('matte', '1') == '1' else None
        t, xs, ys, lens, wv = engrave(bgr, prev, flow, sep, mt)
        if mt is not None: cv2.imwrite(os.path.join(outdir, f'matte_{k:04d}.png'), (mt * 255).astype(np.uint8))
        # carry a subsample of this drawing's points as next seeds (every 9th point along each line)
        prev = np.stack([xs[::9], ys[::9]], 1); prevg = g
        write_bin(os.path.join(outdir, f'lines_{k:04d}.bin'), xs, ys, lens, wv, W / PW)
        cv2.imwrite(os.path.join(outdir, f'tone_{k:04d}.png'), (np.clip(t, 0, 1) * 255).astype(np.uint8))
        cv2.imwrite(os.path.join(outdir, f'edge_{k:04d}.png'), (xdog(t) * 255).astype(np.uint8))
        meta['drawings'].append({'k': k, 'frame': fi, 'lines': int(len(lens)), 'pts': int(len(xs))})
    meta['n'] = len(meta['drawings'])
    json.dump(meta, open(os.path.join(outdir, 'meta.json'), 'w'), indent=1)
    print(f"{meta['n']} drawings in {time.time() - t0:.1f}s; lines/drawing ~{np.mean([d['lines'] for d in meta['drawings']]):.0f}")


if __name__ == '__main__':
    main()
