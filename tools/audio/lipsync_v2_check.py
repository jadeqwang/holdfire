#!/usr/bin/env python3
"""Does the time map keep the lip-synced takes in sync on the new song?

The takes were synced to the v1 vocal; the renderer now shows clip time v1inv(t) - s0 + lag (render/src/scenes/t2/plate/lib.js).
That is right exactly when the new vocal at t is the v1 vocal at v1inv(t). For every lip-synced shot (and, for context, every
3 s window of the song) this cross-correlates the new vocal stem's envelope e2(t) with the v1 stem's e1(v1inv(t)) and reports
the residual lag (ms; + = the new vocal is later than the map says) and the correlation at that lag.

    python3 tools/audio/lipsync_v2_check.py      # needs work/stems/vocals.wav (new) and work/stems/v1/*(Vocals)*.wav (v1)
Writes analysis/lipsync_v2_check.json.
"""
import glob
import json
import os
import subprocess

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HOP = 0.005


def env(path):
    x, sr = sf.read(path)
    x = x.mean(1) if x.ndim > 1 else x
    h = int(sr * HOP)
    n = len(x) // h
    e = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1))
    db = 20 * np.log10(e + 1e-6)
    return np.clip(db, -60, 0) + 60          # 0..60, silence 0


def main():
    T = json.load(open(os.path.join(ROOT, 'render', 'data', 'timing.json')))
    k1, k2 = np.array(T['v1_map']['v1']), np.array(T['v1_map']['v2'])
    inv = lambda t: np.interp(t, k2, k1)
    e2 = env(os.path.join(ROOT, 'work', 'stems', 'vocals.wav'))
    e1 = env(glob.glob(os.path.join(ROOT, 'work', 'stems', 'v1', '*(Vocals)*.wav'))[0])
    at = lambda e, t: np.interp(t / HOP, np.arange(len(e)), e)

    def lag(t0, t1, max_ms=240):
        tt = np.arange(t0, t1, HOP)
        a = at(e2, tt)
        best = None
        for d in np.arange(-max_ms, max_ms + 1, 5) / 1000:
            b = at(e1, inv(tt - d))
            if a.std() < 1e-6 or b.std() < 1e-6:
                return None
            r = float(np.corrcoef(a, b)[0, 1])
            if best is None or r > best[1]:
                best = (d, r)
        r0 = float(np.corrcoef(a, at(e1, inv(tt)))[0, 1])
        return {'lag_ms': round(best[0] * 1000), 'r': round(best[1], 3), 'r_at_0': round(r0, 3), 'voiced': round(float((a > 20).mean()), 2)}

    shots = json.loads(subprocess.run(['node', '-e', """
      import('./render/tools/shots_json.mjs').then(async (m) => { const { shots } = await m.loadEdit();
        const pk = JSON.parse(require('fs').readFileSync('render/data/picks2.json'));
        const out = [];
        // every 'clip' reachable from the shot's scene params (functions sampled at the shot's start, middle and end)
        const scan = (s, x, ids, t, depth = 0) => {
          if (x == null || depth > 8) return;
          if (typeof x === 'function') { try { scan(s, x(t, t - s.t0), ids, t, depth + 1); } catch (e) {} return; }
          if (Array.isArray(x)) { for (const y of x) scan(s, y, ids, t, depth + 1); return; }
          if (typeof x === 'object') { for (const k in x) { if (k === 'clip' && typeof x[k] === 'string') ids.add(x[k].replace('@', s.id)); else if (k !== 'look') scan(s, x[k], ids, t, depth + 1); } }
        };
        for (const s of shots) {
          const ids = new Set();
          for (const t of [s.t0 + 0.01, (s.t0 + s.t1) / 2, s.t1 - 0.01]) scan(s, s.p, ids, t);
          for (const id of ids) if (pk[id] && pk[id].s0 != null) out.push({ shot: s.id, pick: id, t0: s.t0, t1: s.t1 });
        }
        console.log(JSON.stringify(out)); });"""], capture_output=True, text=True, cwd=ROOT, check=True).stdout.strip().splitlines()[-1])
    rows = []
    for s in shots:
        r = lag(s['t0'], s['t1'])
        rows.append({**s, **(r or {})})
        if r:
            print(f"{s['shot']:7s} {s['pick']:8s} {s['t0']:8.3f}-{s['t1']:8.3f}  residual {r['lag_ms']:+5d} ms  r {r['r']:.3f} (r at 0: {r['r_at_0']:.3f})  voiced {r['voiced']:.2f}")
    song = []
    for t0 in np.arange(0, T['audio']['duration_s'] - 3, 3.0):
        r = lag(t0, t0 + 3)
        if r and r['voiced'] > 0.3:
            song.append({'t0': round(float(t0), 1), **r})
    lags = np.array([x['lag_ms'] for x in song if x['r'] > 0.6])
    summ = {'windows': len(song), 'confident (r > 0.6)': int(len(lags)), 'median_ms': float(np.median(lags)),
            'within_1_frame (42 ms)': float((abs(lags) <= 42).mean()), 'within_20_ms': float((abs(lags) <= 20).mean())}
    print('whole song, 3 s windows:', summ)
    for x in song:
        if x['r'] > 0.6 and abs(x['lag_ms']) > 42:
            print('  off:', x)
    json.dump({'doc': __doc__, 'shots': rows, 'song_windows': song, 'summary': summ}, open(os.path.join(ROOT, 'analysis', 'lipsync_v2_check.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
