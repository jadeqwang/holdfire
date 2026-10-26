#!/usr/bin/env python3
"""Constellation guides (the Listener's material): per drawing, stars sampled from the plate (density from edges + tone,
inside the matte), carried between drawings by optical flow with stable ids (so links persist), plus k-nearest links.
Output per drawing (design space): stars_NNNN.bin = int32 n, n*(float32 x, float32 y, float32 b, int32 id),
then int32 m, m*(int32 i, int32 j) links; meta.json.
  constellation.py SRC OUTDIR [--start=S] [--dur=D] [--n=2600] [--k=3] [--twos=1]"""
import json, os, sys, struct, time
import numpy as np, cv2
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engrave import frames, matte_of, PW, PH, W, H, xdog

a = [x for x in sys.argv[1:] if not x.startswith('--')]
o = {x[2:].split('=')[0]: (x.split('=', 1)[1] if '=' in x else '1') for x in sys.argv[1:] if x.startswith('--')}
src, outdir = a[0], a[1]
os.makedirs(outdir, exist_ok=True)
N = int(o.get('n', 2600)); K = int(o.get('k', 3))
rng = np.random.default_rng(11)


def density(bgr, m):
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.
    g = cv2.createCLAHE(2.0, (6, 6)).apply((g * 255).astype(np.uint8)).astype(np.float32) / 255.
    e = xdog(cv2.GaussianBlur(g, (0, 0), 1.0))
    d = (0.65 * e + 0.35 * g ** 1.5) * (0.06 + 0.94 * m)
    return cv2.GaussianBlur(d, (0, 0), 1.2), g


def sample(d, n, existing=None, rmin=4.0):
    """rejection-sample n points ~ d, keeping >= rmin px from each other and from existing points"""
    flat = d.ravel() / d.sum()
    cand = rng.choice(flat.size, size=n * 4, p=flat)
    ys, xs = np.divmod(cand, d.shape[1])
    pts = np.stack([xs + rng.random(xs.size), ys + rng.random(ys.size)], 1)
    grid = {}
    out = []
    def key(p): return (int(p[0] // rmin), int(p[1] // rmin))
    if existing is not None:
        for p in existing: grid.setdefault(key(p), []).append(p)
    for p in pts:
        kx, ky = key(p); ok = True
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for q in grid.get((kx + dx, ky + dy), ()):
                    if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < rmin * rmin: ok = False; break
                if not ok: break
            if not ok: break
        if ok:
            grid.setdefault((kx, ky), []).append(p); out.append(p)
            if len(out) >= n: break
    return np.array(out).reshape(-1, 2)


start = float(o.get('start', 0)); dur = float(o.get('dur', 0)); step = 2 if o.get('twos', '1') == '1' else 1
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
prevg = None; pts = None; ids = None; nextid = 0
meta = {'src': src, 'start': start, 'step': step, 'drawings': []}
t0 = time.time()
for k, (fi, bgr) in enumerate(frames(src, start, dur, step)):
    m = matte_of(bgr)
    d, g = density(bgr, m)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if pts is not None and len(pts):
        flow = dis.calc(prevg, gray, None)
        ix = np.clip(pts[:, 0].astype(int), 0, PW - 1); iy = np.clip(pts[:, 1].astype(int), 0, PH - 1)
        pts = pts + flow[iy, ix]
        inb = (pts[:, 0] > 0) & (pts[:, 0] < PW) & (pts[:, 1] > 0) & (pts[:, 1] < PH)
        pts, ids = pts[inb], ids[inb]
        # deaths: stars where the density has fallen away die (probabilistically, seeded by id so it's deterministic)
        dv = d[np.clip(pts[:, 1].astype(int), 0, PH - 1), np.clip(pts[:, 0].astype(int), 0, PW - 1)]
        keep = dv > np.quantile(d, 0.55) * (0.35 + 0.65 * ((ids * 2654435761) % 1000) / 1000.)
        pts, ids = pts[keep], ids[keep]
        # thin out clumps that the flow compressed
        tree = cKDTree(pts); pairs = tree.query_pairs(2.5)
        drop = set(max(i, j) for i, j in pairs)
        if drop:
            mask = np.ones(len(pts), bool); mask[list(drop)] = False; pts, ids = pts[mask], ids[mask]
    else:
        pts = np.zeros((0, 2)); ids = np.zeros(0, int)
    need = N - len(pts)
    if need > 0:
        new = sample(d, need, existing=pts)
        pts = np.concatenate([pts, new]); ids = np.concatenate([ids, np.arange(nextid, nextid + len(new))]); nextid += len(new)
    prevg = gray
    b = g[np.clip(pts[:, 1].astype(int), 0, PH - 1), np.clip(pts[:, 0].astype(int), 0, PW - 1)]
    b = np.clip(0.25 + 0.75 * b, 0, 1) * (0.3 + 0.7 * m[np.clip(pts[:, 1].astype(int), 0, PH - 1), np.clip(pts[:, 0].astype(int), 0, PW - 1)])
    tree = cKDTree(pts)
    dd, nn = tree.query(pts, k=K + 1)
    links = set()
    for i in range(len(pts)):
        for j, dist in zip(nn[i, 1:], dd[i, 1:]):
            if dist < 26: links.add((min(i, int(j)), max(i, int(j))))
    s = W / PW
    buf = bytearray(struct.pack('<i', len(pts)))
    arr = np.zeros(len(pts), dtype=[('x', '<f4'), ('y', '<f4'), ('b', '<f4'), ('id', '<i4')])
    arr['x'] = pts[:, 0] * s; arr['y'] = pts[:, 1] * s; arr['b'] = b; arr['id'] = ids
    buf += arr.tobytes()
    L = np.array(sorted(links), dtype='<i4').reshape(-1, 2)
    buf += struct.pack('<i', len(L)) + L.tobytes()
    open(os.path.join(outdir, f'stars_{k:04d}.bin'), 'wb').write(buf)
    cv2.imwrite(os.path.join(outdir, f'matte_{k:04d}.png'), (m * 255).astype(np.uint8))
    meta['drawings'].append({'k': k, 'frame': fi, 'n': int(len(pts)), 'links': int(len(L))})
meta['n'] = len(meta['drawings'])
json.dump(meta, open(os.path.join(outdir, 'meta.json'), 'w'), indent=1)
print(f"{meta['n']} drawings in {time.time() - t0:.1f}s")
