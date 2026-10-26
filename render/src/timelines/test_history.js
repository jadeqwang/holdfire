// Test timeline for the history group, at the real song times (data/timing.json). ?tl=test_history
import { PRINT_LOOK } from '../scenes/history/print.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  add({ id: 'h_v2a', t0: 82.645, t1: 85.1, scene: 'archival', p: (t, lt) => ({ clip: 'test_sing', s0: 82.645, zoom: 1.0 + lt * 0.012 }), look: PRINT_LOOK });
  add({ id: 'tail', t0: 85.1, t1: 9999, scene: 'archival', p: (t, lt) => ({ clip: 'test_sing', s0: 85.1, redMask: 1, redZones: [[1290, 150, 520, 520]] }), look: PRINT_LOOK });
  return shots;
}
