// Test timeline for the take-two history group (TL=t2_history): verse 2's gunpowder run (85-100 s) and the bridge's
// poster morph into Arkhipov (157-164 s), at the real song times (data/timing.json).
export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const INK_LOOK = { tonemap: 0, bloom: 0.45, bloomThreshold: 1.15, halation: 0.2, halCol: [1.0, 0.35, 0.15], streak: 0, grain: 0.018, vignette: 0.18, typeGlow: 0 };
  const shake = (t, t0, k = 1) => (t > t0 ? Math.exp(-(t - t0) / 0.09) * k : 0);
  add({ id: 'h2_chars', t0: 85.0, t1: 87.39, scene: 't2_brush_chars', p: {},
    look: (t) => ({ ...INK_LOOK, shakeX: 10 * shake(t, 86.42) * Math.sin(t * 97), shakeY: -7 * shake(t, 86.42) }) });
  add({ id: 'h2_scroll', t0: 87.39, t1: 90.0, scene: 't2_scroll_warning', p: {},
    look: (t) => ({ ...INK_LOOK, shakeY: 5 * shake(t, 89.97) }) });
  add({ id: 'h2_weapons', t0: 90.0, t1: 92.6, scene: 't2_ink_weapons',
    p: { under: { scene: 'oko', p: { tLaunch: [93.5, 94.62, 94.78, 94.92, 95.08], tAttack: 96.5, tPush: [95.36, 96.4], caption: false, gloss: false } } },
    look: (t) => ({ ...INK_LOOK, shakeX: 8 * shake(t, 92.15) * Math.sin(t * 91), shakeY: 6 * shake(t, 91.61) + 5 * shake(t, 90.92) }) });
  shots.sort((a, b) => a.t0 - b.t0);
  return shots;
}
