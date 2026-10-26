// Test timeline for the take-two "cosmos" group: every scene at its plan time (docs/PLAN_TAKE_TWO.md), black between.
// TL=t2_cosmos node tools/render.mjs --stills 11.3,41.5 --w 960 --h 540 --outdir ../work/t2/cosmos
export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const LOOK = { bloom: 0.7, bloomThreshold: 0.75, halation: 0.12, halCol: [1.0, 0.55, 0.25], vignette: 0.28, grain: 0.03, streak: 0.12, streakThreshold: 2.0, streakCol: [0.7, 0.8, 1.0] };
  const EARTH = { bloom: 0.6, bloomThreshold: 0.7, halation: 0.18, halCol: [1.0, 0.5, 0.2], vignette: 0.3, grain: 0.03 };
  add({ id: 'gap', t0: 0, t1: 9999, scene: 'placeholder', p: {}, look: {} });
  add({ id: 'C1_first_line', t0: 68.6, t1: 70.4, scene: 't2_graph_grow', p: { mode: 'first_line' }, look: LOOK });
  add({ id: 'I5_earth_iss', t0: 10.44, t1: 11.16, scene: 't2_earth_night', p: { view: 'iss' }, look: EARTH });
  add({ id: 'I6_graph_flash', t0: 11.16, t1: 13.05, scene: 't2_graph_flash', p: {}, look: LOOK });
  add({ id: 'P1c_iss', t0: 32.62, t1: 35.5, scene: 't2_iss_pass', p: {}, look: LOOK });
  add({ id: 'P1d_pulse', t0: 40.65, t1: 43.27, scene: 't2_pulse', p: {}, look: { ...LOOK, streak: 0.2 } });
  add({ id: 'PC1_graph_grow', t0: 72.4, t1: 82.64, scene: 't2_graph_grow', p: {}, look: LOOK });
  add({ id: 'PC2_earth_scale', t0: 134.0, t1: 138.4, scene: 't2_earth_night', p: { view: 'scale' }, look: EARTH });
  add({ id: 'U1_war', t0: 163.67, t1: 170.83, scene: 't2_war', p: {}, look: EARTH });
  add({ id: 'U2_rewind', t0: 170.83, t1: 175.06, scene: 't2_war', p: { rewind: true }, look: EARTH });
  add({ id: 'U3_show_light', t0: 175.06, t1: 180.0, scene: 't2_earth_night', p: { view: 'whole', on: [177.5, 178.9], onFrom: [50, 10] }, look: EARTH });
  add({ id: 'D6_echo_night', t0: 202.89, t1: 209.5, scene: 't2_echo_night', p: {}, look: LOOK });
  add({ id: 'Z1_graph_outro', t0: 213.04, t1: 224.33, scene: 't2_graph_outro', p: {}, look: LOOK });
  add({ id: 'Z3_iss', t0: 230.04, t1: 233.17, scene: 't2_iss_pass', p: {}, look: LOOK });
  return shots;
}
