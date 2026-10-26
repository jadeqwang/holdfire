// Test timeline for the "space" group: every scene at its real song time (interim timing), with generous handles.
export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const lookG = { bloom: 0.55, bloomThreshold: 0.9, halation: 0.08, vignette: 0.3, grain: 0.025, streak: 0.18, streakThreshold: 2.2, streakCol: [0.9, 0.8, 0.6] };
  add({ id: 'pre', t0: 0, t1: 163.79, scene: 'galaxy', p: { mode: 'plain', worlds: 0 }, look: lookG });
  add({ id: 'U1_galaxy_build', t0: 163.79, t1: 175.1, scene: 'galaxy', p: { mode: 'build' }, look: lookG });
  add({ id: 'D4_phyllo', t0: 192.6, t1: 213.0, scene: 'phyllo', p: {}, look: lookG });
  add({ id: 'Z1_galaxy_outro', t0: 213.0, t1: 236, scene: 'galaxy', p: { mode: 'outro' }, look: lookG });
  add({ id: 'tail', t0: 236, t1: 9999, scene: 'galaxy', p: { mode: 'plain' }, look: lookG });
  return shots.sort((a, b) => a.t0 - b.t0);
}
