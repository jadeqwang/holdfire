// Test timeline for the "signal" group: each scene at its real song time (interim timing.json), void between.
import { look as snowLook } from '../scenes/signal/snowflake.js';
import { look as chordLook } from '../scenes/signal/chordrings.js';
import { look as pulsarLook } from '../scenes/signal/pulsar.js';
import { look as recordLook } from '../scenes/signal/goldenrecord.js';
import { look as cityLook } from '../scenes/signal/citycount.js';
import { look as termLook } from '../scenes/signal/terminal.js';
import { look as listLook } from '../scenes/signal/nearmiss.js';
import { look as coinLook } from '../scenes/signal/coins.js';

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
  // X8a / X8b — (Counting on you!) ×2: the 8 in the city lights
  const cous = A.lines.filter((l) => /\(counting on you!\)/i.test(l.text || ''));
  cous.slice(0, 2).forEach((l, i) => add({ id: 'X8' + 'ab'[i], t0: l.t - 0.36, t1: l.t + (i ? 0.9 : 0.84), scene: 'citycount', p: { hit: l.t, view: i }, look: cityLook }));
  // V2f / V2h — the station's terminal: (a) the SYSTEM prompt, (b) the reply, the strike-through, holding fire
  const rule = line('every rule said'), petrov = line('petrov knew'), ign = line('ignored all previous'), secret = line('secret list');
  add({ id: 'V2f', t0: rule.t, t1: petrov.t, scene: 'terminal', p: {}, look: termLook });
  add({ id: 'V2h', t0: ign.t, t1: secret.t, scene: 'terminal', p: {}, look: termLook });
  // P2a / P2b — the secret list, the running total
  const coin = line('coin flips');
  add({ id: 'P2a', t0: secret.t, t1: coin.t, scene: 'nearmiss', p: {}, look: listLook });
  // P2c / P2d — coin flips, all heads, a hundred in a row, / the only road from here to you.
  const chorus2 = A.sections.find((x) => x.name === 'Chorus 2');
  add({ id: 'P2c', t0: coin.t, t1: chorus2.start + 0.4, scene: 'coins', p: {}, look: coinLook });
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}
