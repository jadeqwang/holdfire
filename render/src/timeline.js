// The edit. Every shot is placed on word onsets and the tracked bar grid from data/timing.json.
// shot: {id, t0, t1, scene, p (object | fn(t, lt, ctx)), look (post object | fn), type (fn(ty, t, lt, shot, ctx)), post (fn)}
export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  // provisional: cold open with guessed count times until analysis/timing.json lands
  const intro = A.hitList('intro');
  const counts = intro.length >= 6 ? intro.slice(0, 6).map((h, i) => ({ n: [1, 1, 2, 3, 5, 8][i], t: h.t }))
    : [1, 1, 2, 3, 5, 8].map((n, i) => ({ n, t: 1.0 + i * 1.25 }));
  const last = counts[counts.length - 1].t;
  add({ id: 'cold', t0: 0, t1: last + 4.5, scene: 'coldopen', p: { counts, title: last + 1.4 },
    look: { bloom: 0.7, halation: 0.35, streak: 0.5, streakCol: [1.0, 0.75, 0.45], vignette: 0.2, grain: 0.03 } });
  // style test: the Seedance test take, engraved
  add({ id: 'test_sing', t0: last + 4.5, t1: last + 10.5, scene: 'engraved', p: (t, lt) => ({ clip: 'test_sing', s0: last + 4.5, lag: 0, zoom: 1 + lt * 0.006, wmax: 4.6, gain: 1.6, fill: 0.12, edge: 0.6 }),
    look: { bloom: 0.55, halation: 0.45, vignette: 0.45, grain: 0.03, exposure: 1.0 } });
  add({ id: 'test_const', t0: last + 10.5, t1: last + 13.5, scene: 'constellation', p: (t, lt) => ({ clip: 'test_const', s0: last + 10.5, lag: 0, zoom: 1 }),
    look: { bloom: 0.8, bloomThreshold: 0.7, halation: 0.0, vignette: 0.4, grain: 0.02, streak: 0.25, streakThreshold: 1.2 } });
  add({ id: 'tail', t0: last + 13.5, t1: 9999, scene: 'sky', p: { density: 0.5, band: 0.4 } });
  return shots;
}

export function buildGlobalPost(A) {
  return (t, shot) => ({});
}
