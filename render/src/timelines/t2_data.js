// Test timeline for the take-two "data" group (TL=t2_data): each scene at its plan time (docs/PLAN_TAKE_TWO.md), void between.
// The Petrov overlays run over a stand-in umber "painting" (t2_petrov_screen with p.mode 'backdrop'), the way the edit will layer
// them over the generated oil-painting plate with the multi scene (later layers get p.over = true).
import { look as nmLook } from '../scenes/t2/data/nearmiss.js';
import { look as coinLook, treeLook } from '../scenes/t2/data/coins.js';
import { look as ctLook } from '../scenes/t2/data/counter.js';
import { look as crtLook } from '../scenes/t2/data/crtmatrix.js';
import { look as pvLook } from '../scenes/t2/data/petrov.js';

export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  add({ id: 'void', t0: 0, t1: 9999, scene: 'sky', p: { density: 0.0, band: 0, neb: 0, exposure: 0.0 } });
  // chorus 1, "Silent and patient, but I swear": the SETI@home CRT, then the matrix
  add({ id: 'C1f', t0: 62.154, t1: 64.589, scene: 't2_crt_matrix', p: {}, look: crtLook });
  // chorus 2, the mirror version (two screens show the Jades' control rooms; no textures yet -> procedural stand-ins)
  const sp2 = A.lines.find((l) => /silent and patient/i.test(l.text || '') && l.start > 100);
  if (sp2) add({ id: 'C2f', t0: sp2.t, t1: sp2.t + 2.435, scene: 't2_crt_matrix', p: { variant: 'mirror' }, look: crtLook });
  // verse 2, Petrov: four overlays over the stand-in painting
  const pv = (id, t0, t1, mode, rect, extra = {}) => add({ id, t0, t1, scene: 'multi', look: pvLook,
    p: { layers: [{ scene: 't2_petrov_screen', p: { mode: 'backdrop' } }, { scene: 't2_petrov_screen', p: { mode, rect, ...extra } }] } });
  pv('V2e', 92.6, 95.363, 'map', [470, 150, 980, 610]);
  pv('V2f', 95.363, 97.883, 'start', [470, 150, 980, 610]);
  pv('V2g', 97.883, 100.312, 'ghost', [470, 150, 980, 610]);
  pv('V2h', 100.312, 102.986, 'protocol', [1180, 560, 520, 420], { quad: [[1190, 610], [1640, 585], [1700, 1010], [1225, 1040]] });
  // pre-chorus 2: the list, the coins, the tree
  add({ id: 'P2a', t0: 102.986, t1: 107.985, scene: 't2_nearmiss', p: {}, look: nmLook });
  add({ id: 'P2c', t0: 107.985, t1: 110.609, scene: 't2_coins', p: {}, look: coinLook });
  add({ id: 'P2d', t0: 110.609, t1: 113.152, scene: 't2_cointree', p: {}, look: treeLook });
  // outro: days since last reset
  add({ id: 'O3', t0: 224.325, t1: 238.5, scene: 't2_counter', p: {}, look: ctLook });
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}
