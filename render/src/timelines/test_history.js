// Test timeline for the history group, at the real song times (data/timing.json). ?tl=test_history
import { PRINT_LOOK } from '../scenes/history/print.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const L = (i) => A.lines[i], W = (i, j) => A.lines[i].words[j].t;
  // V2a/V2b: the gunpowder page ("Priests in the smoke wanted never to die, / sulfur and saltpeter, thunder in the sky;")
  add({ id: 'h_gun', t0: A.section('Verse 2').start, t1: L(24).t, scene: 'gunpowder', p: {},
    look: (t) => ({ ...PRINT_LOOK, shakeX: 9 * Math.exp(-Math.max(0, t - W(23, 3)) / 0.09) * (t > W(23, 3) ? 1 : 0), shakeY: -6 * Math.exp(-Math.max(0, t - W(23, 3)) / 0.09) * (t > W(23, 3) ? 1 : 0) }) });
  // V2c is the Listener; here the archival test plate (stand-in for the Tang alchemists / Petrov / Arkhipov plates)
  // V2d: the ink mushroom cloud
  add({ id: 'h_bomb', t0: L(25).t - 0.04, t1: L(26).t - 0.1, scene: 'inkbomb', p: (t, lt) => ({ zoom: 1 + lt * 0.01 }), look: PRINT_LOOK });
  add({ id: 'h_arch', t0: L(24).t, t1: L(25).t - 0.04, scene: 'archival', p: (t, lt) => ({ clip: 'test_sing', s0: L(24).t, zoom: 1.0 + lt * 0.012 }), look: PRINT_LOOK });
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
