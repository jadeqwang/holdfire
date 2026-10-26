"""Hold Fire beat grid -> work/audio/grid.json (+ grid.npy). Adapted from merge-me-back-to-main beatgrid.py/final_grid.py and
rare-earth audio_map.py (polynomial fit), without beat_this (no GPU / HF here).

1. local tempo: 16 s windows (2 s hop), 8th-note comb on the drum+instrumental onset envelope, 0.02 BPM resolution;
2. librosa DP beat tracker driven by that time-varying tempo (tightness 400);
3. integer beat indices -> robust cubic smoothing spline;
4. anchors: each beat snapped to the strongest drum/inst onset within +-30 ms when it is a real transient (> 5x median);
   refit spline on anchors (weights), iterate with outlier rejection; tail/head extrapolated with the local period;
5. report degree-4 polynomial fit (rare-earth style) and constant-tempo fit errors."""
import os, json, numpy as np, librosa
from scipy.interpolate import UnivariateSpline
from scipy.ndimage import median_filter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(ROOT, 'work')
E = np.load(os.path.join(W, 'audio/env.npz')); T = E['T']; FR = 200.0
DUR = float(T[-1])
def nrm(x): return x / (np.median(x[x > 0]) + 1e-9)
O = nrm(E['onset_drums']) + 0.5*nrm(E['onset_inst'])
# 1. local tempo
def comb(a, b, bpm, sub=2):
    P = 60/bpm/sub; phs = np.arange(0, P, 0.005); best = (-1, 0)
    for ph in phs:
        s = np.interp(np.arange(a + ph, b, P), T, O).mean()
        if s > best[0]: best = (s, ph)
    return best
wc, wb = [], []
for a in np.arange(0, DUR - 8, 2.0):
    b = min(DUR, a + 16)
    sc = [(comb(a, b, bpm)[0], bpm) for bpm in np.arange(88, 100, 0.05)]
    s, bpm = max(sc)
    if s / np.median([x[0] for x in sc]) > 1.5: wc.append(a + (b - a)/2); wb.append(bpm)
wc, wb = np.array(wc), median_filter(np.array(wb), 5, mode='nearest')
bpm_t = np.interp(T, wc, wb)
# 2. DP tracker with time-varying tempo
_, bt = librosa.beat.beat_track(onset_envelope=O, sr=48000, hop_length=240, bpm=bpm_t, tightness=400, units='time', trim=False)
# 3. integer indices
per = 60/np.interp(bt, T, bpm_t)
idx = [0]; keep = [0]
for i in range(1, len(bt)):
    x = (bt[i] - bt[keep[-1]]) / per[i]; k = round(x)
    if k >= 1 and abs(x - k) < 0.3: idx.append(idx[-1] + k); keep.append(i)
idx = np.array(idx); t = bt[keep]
m = np.ones(len(t), bool)
for it in range(4):
    sp = UnivariateSpline(idx[m], t[m], k=3, s=m.sum()*0.015**2); r = t - sp(idx); m = np.abs(r) < 0.04
g = sp(np.arange(idx[-1] + 1))
# extend to cover the whole song
p0 = np.mean(np.diff(g[:8])); p1 = np.mean(np.diff(g[-8:]))
head = []; x = g[0]
while x - p0 > -0.5*p0: x -= p0; head.insert(0, x)
tail = []; x = g[-1]
while x + p1 < DUR: x += p1; tail.append(x)
g = np.concatenate([head, g, tail]); ii = np.arange(len(g))
# 4. anchors: every strong onset peak (O > THR) is assigned to the nearest 16th-note position of the current grid when it is
#    within +-TOL of it; anchors (fractional beat index, time) -> weighted smoothing spline; 3 rounds (TOL 0.09 -> 0.05 -> 0.035 s).
import scipy.signal as ss
pk, _ = ss.find_peaks(O, height=5, distance=12); PT, PH = T[pk], O[pk]
def anchors(g, tol):
    ii = np.arange(len(g)); A_i, A_t, A_w = [], [], []
    for t0, h in zip(PT, PH):
        j = np.searchsorted(g, t0) - 1
        if j < 0 or j + 1 >= len(g): continue
        frac = (t0 - g[j]) / (g[j + 1] - g[j]); q = round(frac * 4) / 4
        pos = g[j] + q * (g[j + 1] - g[j])
        if abs(t0 - pos) < tol:
            A_i.append(j + q); A_t.append(t0); A_w.append((1.0 if q in (0, 1) else 0.6) * np.sqrt(min(h, 40) / 40))
    A_i, A_t, A_w = np.array(A_i), np.array(A_t), np.array(A_w)
    o = np.lexsort((-A_w, A_i)); A_i, A_t, A_w = A_i[o], A_t[o], A_w[o]
    u = np.r_[True, np.diff(A_i) > 1e-9]                     # one anchor per grid position (strongest)
    return A_i[u], A_t[u], A_w[u]
for tol in (0.09, 0.05, 0.035):
    A_i, A_t, A_w = anchors(g, tol)
    m = np.ones(len(A_i), bool)
    for it in range(4):
        sp = UnivariateSpline(A_i[m], A_t[m], w=A_w[m], k=3, s=float((A_w[m]**2).sum())*0.006**2); r = A_t - sp(A_i); m = np.abs(r) < 0.03
    g = sp(ii)
res = A_t - sp(A_i)
anch = np.zeros(len(g), bool)
for i in A_i[m]: anch[max(0, int(i) - 2):int(i) + 3] = True
# extrapolate beyond the first/last anchor with the mean period of the 16 beats next to it (the spline is unreliable outside).
# INTRO_END: the intro (whispered count + piano, no drums) is NOT anchored: its piano/percussion hits (3-12.2 s) form a steady
# 92.95 BPM pulse that is exactly half a beat (an 8th) off the verse grid, while the whispered count sits ON the verse grid.
# We keep one continuous grid (no phase jump): the intro beats are the verse grid extrapolated backwards at constant tempo
# (comb fit of 2.5-13.2 s gives the same period, 0.6455 s), so intro piano hits fall on the 8th off-beats (see timing.md).
INTRO_END = 13.0
ok_lo = A_t[m] >= INTRO_END
lo, hi = int(np.ceil(A_i[m][ok_lo].min())), int(np.floor(A_i[m].max()))
pl = np.mean(np.diff(g[lo:lo + 17])); ph = np.mean(np.diff(g[hi - 16:hi + 1]))
g[:lo] = g[lo] - pl * (lo - ii[:lo]); g[hi + 1:] = g[hi] + ph * (ii[hi + 1:] - hi)
while g[0] - pl > -0.05: g = np.r_[g[0] - pl, g]; lo += 1; hi += 1; anch = np.r_[False, anch]
while g[-1] + ph < DUR: g = np.r_[g, g[-1] + ph]; anch = np.r_[anch, False]
keep_g = (g > -0.05) & (g < DUR); g = g[keep_g]; anch = anch[keep_g]
ii = np.arange(len(g))
c4 = np.polyfit(ii, g, 4); r4 = g - np.polyval(c4, ii)
c1 = np.polyfit(ii, g, 1); r1 = g - np.polyval(c1, ii)
stats = dict(anchors=int(m.sum()), first_anchor_s=round(float(A_t[m][ok_lo].min()), 3), last_anchor_s=round(float(A_t[m].max()), 3), anchor_resid_rms_ms=round(float(res[m].std()*1000), 2),
             anchor_resid_p95_ms=round(float(np.percentile(np.abs(res[m]), 95)*1000), 2),
             poly4_coef=[float(x) for x in c4], poly4_max_err_ms=round(float(np.abs(r4).max()*1000), 1),
             poly4_rms_err_ms=round(float(r4.std()*1000), 1),
             constant_fit_bpm=round(60/c1[0], 3), constant_fit_max_err_ms=round(float(np.abs(r1).max()*1000), 1),
             mean_bpm=round(60*(len(g)-1)/(g[-1]-g[0]), 3))
print(stats)
bpm_local = 60/np.gradient(g)
t_lo, t_hi = A_t[m][ok_lo].min(), A_t[m].max()
zone = ['extrapolated' if (t < t_lo - 0.05 or t > t_hi + 0.05) else ('anchored' if anch[i] else 'interpolated') for i, t in enumerate(g)]
json.dump(dict(beats=[round(float(x), 4) for x in g], bpm_local=[round(float(x), 3) for x in bpm_local], zone=zone,
               stats=stats, window_tempo=dict(t=[round(float(x), 2) for x in wc], bpm=[round(float(x), 2) for x in wb])),
          open(os.path.join(W, 'audio/grid.json'), 'w'))
np.save(os.path.join(W, 'audio/grid.npy'), g)
for s in range(0, len(g) - 16, 16):
    print(f'beat {s:4d} t {g[s]:8.3f} bpm {60*16/(g[s+16]-g[s]):7.3f} zone {zone[s]}')
