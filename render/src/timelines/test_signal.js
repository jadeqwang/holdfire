// Test timeline for the "signal" group: each scene at its real song time (interim timing.json), void between.
import { look as snowLook } from '../scenes/signal/snowflake.js';
import { look as chordLook } from '../scenes/signal/chordrings.js';
import { look as pulsarLook } from '../scenes/signal/pulsar.js';
import { look as recordLook } from '../scenes/signal/goldenrecord.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const line = (needle) => A.lines.find((l) => (l.text || '').toLowerCase().includes(needle));
  add({ id: 'void', t0: 0, t1: 9999, scene: 'sky', p: { density: 0.0, band: 0, neb: 0, exposure: 0.0 } });
  // P1a — Snowflake in the boundless night
  const pre1 = A.section('Pre-Chorus 1');
  const chord = line('a chord that');
  add({ id: 'P1a', t0: pre1.start, t1: chord.t, scene: 'snowflake', p: {}, look: snowLook });
  // P1b — a chord that's searching through the fog (stand-in plate; the overlay is drawChordRings)
  const counting = line('counting out in bursts');
  add({ id: 'P1b', t0: chord.t, t1: counting.t, scene: 'chordrings', p: { origin: [1240, 700] }, look: chordLook });
  // P1e — a pattern no dead star could make.
  const pat = line('pattern no dead star'), hear = line('hear it');
  add({ id: 'P1e', t0: pat.t - 0.12, t1: hear.t, scene: 'pulsar', p: {}, look: pulsarLook });
  // C1b — message in a bottle, a mantra, a prayer
  const msg = line('message in a bottle'), butif = line('but if you are');
  add({ id: 'C1b', t0: msg.t, t1: butif.t, scene: 'goldenrecord', p: {}, look: recordLook });
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}
