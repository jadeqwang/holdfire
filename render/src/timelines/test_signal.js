// Test timeline for the "signal" group: each scene at its real song time (interim timing.json), void between.
import { look as snowLook } from '../scenes/signal/snowflake.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const line = (needle) => A.lines.find((l) => (l.text || '').toLowerCase().includes(needle));
  add({ id: 'void', t0: 0, t1: 9999, scene: 'sky', p: { density: 0.0, band: 0, neb: 0, exposure: 0.0 } });
  // P1a — Snowflake in the boundless night
  const pre1 = A.section('Pre-Chorus 1');
  const chord = line('a chord that');
  add({ id: 'P1a', t0: pre1.start, t1: chord.t, scene: 'snowflake', p: {}, look: snowLook });
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}
