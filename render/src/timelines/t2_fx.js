// Test timeline for the take-two "fx" group (TL=t2_fx): each overlay over a test plate at its plan time. Test plates (not
// committed; regenerate): python3 tools/t2/plates.py media/kf2/CO01_nbp_v1.jpg TEST_fx_eye --fit cover
//                     python3 tools/t2/plates.py media/kf2/DR01_nbp_v3.jpg TEST_fx_mirror --fit cover
// (TEST_echo_tower is the plate group's test still.) Missing plates fall back to the void, so the timeline always renders.
export function buildTimeline(A) {
  const shots = [];
  const add = (s) => { shots.push(s); return s; };
  const plate = (dir, p = {}) => ({ scene: 't2_first', p: { chain: [{ scene: 't2_plate', p: { dir, ...p } }, { scene: 'sky', p: { density: 0, band: 0, neb: 0, exposure: 0 } }] } });
  const look = { tonemap: 0, bloom: 0.3, bloomThreshold: 0.9, vignette: 0.2, grain: 0.02 };
  const EYE = { zoom: 1, push: 0.02 };
  add({ id: 'fx_seeds', t0: 0, t1: 2.8, scene: 'multi', look,
    p: { layers: [plate('work/plates/TEST_fx_eye', EYE), { scene: 't2_seed_spiral', p: { ...EYE, center: [960, 523], R: 268, t0: 0.195, settle: 2.4 } }] } });
  add({ id: 'fx_trace', t0: 5.298, t1: 6.0, scene: 'multi', look,
    p: { layers: [plate('work/plates/TEST_fx_eye', { zoom: 1.6 }), { scene: 't2_spiral_trace', p: { count: 5, center: [960, 540], t0: 5.34 } }] } });
  add({ id: 'fx_tower', t0: 38.07, t1: 40.65, scene: 'multi', look,
    p: { layers: [plate('work/plates/TEST_echo_tower', { zoom: 1, pan: [0, 300] }), { scene: 't2_tower_bursts', p: { ring: { cx: 1180, cy: 10, rx: 300, ry: 32 }, pan: [0, 300], hide: [1090, 1290] } }] } });
  add({ id: 'fx_ring', t0: 202.89, t1: 204.12, scene: 'multi', look,
    p: { layers: [plate('work/plates/TEST_echo_tower', { zoom: 1, pan: [0, 300] }), { scene: 't2_tower_bursts', p: { mode: 'ring', t0: 202.89, ring: { cx: 1180, cy: 10, rx: 300, ry: 32 }, pan: [0, 300], hide: [1090, 1290] } }] } });
  const full = { scene: 't2_plate', p: { dir: 'work/plates/TEST_fx_mirror' } };
  const mlook = { tonemap: 0, bloom: 0.3, bloomThreshold: 0.9, vignette: 0.05, grain: 0.015 };
  add({ id: 'fx_m_approach', t0: 183.88, t1: 188.355, scene: 't2_mirror', p: { phase: 'approach', full }, look: mlook });
  add({ id: 'fx_m_swing', t0: 188.355, t1: 188.676, scene: 't2_mirror', p: { phase: 'swing', full }, look: mlook });
  add({ id: 'fx_m_ripple', t0: 193.38, t1: 194.01, scene: 't2_mirror', p: { phase: 'ripple', full, palm: [960, 470] }, look: mlook });
  add({ id: 'fx_m_gone', t0: 198.93, t1: 201.56, scene: 't2_mirror', p: { phase: 'gone', full }, look: mlook });
  add({ id: 'fx_end', t0: 244.05, t1: 247.16, scene: 't2_endcard', p: { hitT: 244.05, endT: 247.16, under: { scene: 't2_plate', p: { dir: 'work/plates/TEST_fx_eye' } } }, look });
  shots.sort((a, b) => a.t0 - b.t0);
  // fill the gaps with the void
  const out = []; let t = 0;
  for (const s of shots) { if (s.t0 > t) out.push({ id: 'void', t0: t, t1: s.t0, scene: 'sky', p: { density: 0, band: 0, neb: 0, exposure: 0 } }); out.push(s); t = s.t1; }
  out.push({ id: 'void', t0: t, t1: 9999, scene: 'sky', p: { density: 0, band: 0, neb: 0, exposure: 0 } });
  return out;
}
