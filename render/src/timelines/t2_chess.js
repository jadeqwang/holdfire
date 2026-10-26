// Test timeline for the "chess" group (TL=t2_chess): the board sets itself on post-chorus 2's shouts, the game through the
// bridge on its real ply times (scenes/t2/chess/schedule.js), the dive into the black queen, then the handoff square held.
import { CHESS_LOOK, DIVE_LOOK } from '../scenes/t2/chess/chess.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  add({ id: 'C0_set', t0: 0, t1: 143.4, scene: 't2_chess', p: { mode: 'set' }, look: CHESS_LOOK });
  add({ id: 'C1_game', t0: 143.4, t1: 157.8, scene: 't2_chess', p: { mode: 'game' }, look: CHESS_LOOK });
  add({ id: 'C2_dive', t0: 157.8, t1: 9999, scene: 't2_chess', p: { mode: 'dive', d0: 157.8, d1: 158.7, size: 300 }, look: DIVE_LOOK });
  return shots.sort((a, b) => a.t0 - b.t0);
}
