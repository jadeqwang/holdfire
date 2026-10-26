// director's material test timeline
export function buildTimeline(A) {
  return [
    { id: 'stip', t0: 0, t1: 10, scene: 'stipple', p: { clip: 'test_stip', s0: 0 }, look: { bloom: 0.7, bloomThreshold: 0.7, halation: 0.1, vignette: 0.4 } },
  ];
}
