// director's material test timeline
export function buildTimeline(A) {
  const ENG = { gain: 1.2, wmax: 5.2, wLo: 0.12, wHi: 1.08, wGam: 1.35, bgW: 0.35, fill: 0.18, edge: 0.45 };
  return [
    { id: 's9', t0: 0, t1: 1, scene: 'engraved', p: { ...ENG, clip: 'sig9', s0: 0 }, look: { bloom: 0.55, bloomThreshold: 0.85, halation: 0.45, vignette: 0.45 } },
    { id: 's16', t0: 1, t1: 2, scene: 'engraved', p: { ...ENG, clip: 'sig16', s0: 1 }, look: { bloom: 0.55, bloomThreshold: 0.85, halation: 0.45, vignette: 0.45 } },
    { id: 'stip', t0: 10, t1: 20, scene: 'stipple', p: { clip: 'test_stip', s0: 10 }, look: { bloom: 0.7, bloomThreshold: 0.7, halation: 0.1, vignette: 0.4 } },
  ];
}
