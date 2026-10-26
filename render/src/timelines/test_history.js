// Test timeline for the history group, at the real song times (data/timing.json). ?tl=test_history
import { PRINT_LOOK } from '../scenes/history/print.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const L = (i) => A.lines[i], W = (i, j) => A.lines[i].words[j].t;
  add({ id: 'h_v2a', t0: 82.645, t1: 85.1, scene: 'archival', p: (t, lt) => ({ clip: 'test_sing', s0: 82.645, zoom: 1.0 + lt * 0.012 }), look: PRINT_LOOK });
  // V2e/V2f: Oko. "Eighty-three, the satellites saw five, / every rule said call it first strike;"
  const l26 = 26, l27 = 27;
  const t1 = W(l26, 2) + 0.1;                         // "satellites": the first report
  const t5 = W(l26, 4);                               // "five": four more
  add({ id: 'h_oko', t0: L(l26).t - 0.1, t1: L(28).t - 0.05, scene: 'oko',
    p: { tLaunch: [t1, t5, t5 + 0.16, t5 + 0.3, t5 + 0.46], tAttack: W(l27, 5), tPush: [W(l27, 0), W(l27, 5) - 0.1] },
    look: { tonemap: 0, bloom: 0.12, bloomThreshold: 0.6, halation: 0.55, halCol: [1.0, 0.1, 0.05], vignette: 0.4, grain: 0.045, streak: 0, typeGlow: 0.15 } });
  // Bridge B1: the held forest shot
  const br = A.section('Bridge');
  add({ id: 'h_forest', t0: br.start, t1: A.findLine('Bridge', 4).t, scene: 'forestreticles', p: {},
    look: { bloom: 0.35, bloomThreshold: 0.7, halation: 0.45, halCol: [1.0, 0.12, 0.06], vignette: 0.5, grain: 0.04, exposure: 1.1 } });
  add({ id: 'h_v2g', t0: L(28).t - 0.05, t1: L(30).t - 0.1, scene: 'archival', p: (t, lt) => ({ clip: 'hist_test_warm', s0: L(28).t - 0.05, redMask: 1, zoom: 1.04 - lt * 0.01 }), look: PRINT_LOOK });
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}
