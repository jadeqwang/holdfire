// Test timeline for the "space" group: every scene at its real song time (interim timing), with generous handles.
export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const lookG = { bloom: 0.55, bloomThreshold: 0.9, halation: 0.08, vignette: 0.3, grain: 0.025, streak: 0.18, streakThreshold: 2.2, streakCol: [0.9, 0.8, 0.6] };
  add({ id: 'V1f_seeds', t0: 27.1, t1: 31.18, scene: 'seeds', p: {}, look: { bloom: 0.6, bloomThreshold: 0.85, halation: 0.15, vignette: 0.35, grain: 0.03 } });
  add({ id: 'pre', t0: 0, t1: 27.1, scene: 'galaxy', p: { mode: 'plain', worlds: 0 }, look: lookG });
  add({ id: 'P1d_oneway', t0: 40.4, t1: 43.2, scene: 'oneway', p: {}, look: { bloom: 0.6, bloomThreshold: 0.85, halation: 0.1, vignette: 0.3, grain: 0.025, streak: 0.25, streakThreshold: 1.8, streakCol: [1.0, 0.8, 0.5] } });
  add({ id: 'gap0', t0: 31.18, t1: 40.4, scene: 'galaxy', p: { mode: 'plain', worlds: 0 }, look: lookG });
  add({ id: 'gap1', t0: 43.2, t1: 163.79, scene: 'galaxy', p: { mode: 'plain', worlds: 0 }, look: lookG });
  add({ id: 'U1a_galaxy_build', t0: 163.79, t1: 169.3, scene: 'galaxy', p: { mode: 'build' }, look: lookG });
  add({ id: 'U1b_burnworld', t0: 169.3, t1: 170.8, scene: 'burnworld', p: {}, look: { bloom: 0.6, bloomThreshold: 0.85, halation: 0.25, halCol: [1, 0.3, 0.15], vignette: 0.35, grain: 0.03 } });
  add({ id: 'U2_galaxy_survivors', t0: 170.8, t1: 175.1, scene: 'galaxy', p: { mode: 'build' }, look: lookG });
  add({ id: 'D4_phyllo', t0: 192.6, t1: 213.0, scene: 'phyllo', p: {}, look: lookG });
  add({ id: 'Z1_galaxy_outro', t0: 213.0, t1: 236, scene: 'galaxy', p: { mode: 'outro' }, look: lookG });
  add({ id: 'tail', t0: 236, t1: 9999, scene: 'galaxy', p: { mode: 'plain' }, look: lookG });
  return shots.sort((a, b) => a.t0 - b.t0);
}
