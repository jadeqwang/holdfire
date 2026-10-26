// Test timeline for the take-two plate toolkit (TL=t2_plate / ?tl=t2_plate). Shot i runs [2i, 2i+2); the mid-shot still is 2i+1.
// Test plates come from tools/t2/plates.py (work/plates/TEST_*), registered in render/data/picks2.json as TEST_* ids.
import { PLATE_LOOK } from '../scenes/t2/plate/lib.js';
import { smashZoom, impactPulse } from '../scenes/t2/plate/impact.js';

const FIN = [   // a lobe-fin's bones, the kind of drawing the verse-1 shots will supply (design px)
  { type: 'poly', pts: [[520, 640], [700, 600], [880, 560], [1040, 540]], smooth: true, t0: 0.1, t1: 0.6 },
  { type: 'circle', c: [1040, 540], r: 26, t0: 0.5, t1: 0.8, cross: true },
  { type: 'poly', pts: [[1066, 540], [1220, 470]], t0: 0.75, t1: 1.0 },
  { type: 'poly', pts: [[1066, 548], [1240, 560]], t0: 0.8, t1: 1.05 },
  { type: 'poly', pts: [[1220, 470], [1300, 420]], t0: 1.0, t1: 1.15 },
  { type: 'poly', pts: [[1240, 560], [1330, 590]], t0: 1.05, t1: 1.2 },
  { type: 'arc', c: [1040, 540], r: 120, a0: -60, a1: 40, t0: 0.9, t1: 1.3, dash: [10, 8] },
  { type: 'dim', a: [520, 700], b: [1040, 700], off: 60, label: '0.42 m', t0: 1.0, t1: 1.5 },
  { type: 'callout', at: [880, 560], to: [800, 380], shelf: -150, label: '375 MYA', t0: 1.1, t1: 1.6 },
  { type: 'ticks', a: [1380, 300], b: [1380, 760], n: 20, len: 9, major: 5, t0: 0.2, t1: 1.0 },
  { type: 'rect', a: [1450, 330], b: [1700, 520], t0: 0.3, t1: 0.9 },
];

export const TESTS = [
  ['raw', 't2_plate', { clip: 'TEST_vista' }],
  ['riso', 't2_plate', { clip: 'TEST_echo_tower', style: 'riso' }],
  ['riso_light', 't2_plate', { clip: 'TEST_vista', style: 'riso', styleAmt: 0.4 }],
  ['riso_echo', 't2_plate', { clip: 'TEST_echo_field', style: 'riso', styleP: { inks: 'echo' } }],
  ['halftone', 't2_plate', { clip: 'TEST_dot_faces', style: 'halftone' }],
  ['newsprint', 't2_plate', { clip: 'TEST_dot_turn', style: 'newsprint' }],
  ['ink', 't2_plate', { clip: 'TEST_echo_tower', style: 'ink' }],
  ['oil', 't2_plate', { clip: 'TEST_dot_faces', style: 'oil' }],
  ['gouache', 't2_plate', { clip: 'TEST_echo_field', style: 'gouache' }],
  ['blueprint', 't2_plate', { clip: 'TEST_vista', style: 'blueprint' }],
  ['sepia', 't2_plate', { clip: 'TEST_vista', style: 'blueprint', styleP: { tone: 'sepia', grid: 0 } }],
  ['vhs', 't2_plate', (t, lt) => ({ clip: 'TEST_vista', vhs: 1, vhsP: { rewind: lt > 1 ? 1 : 0.15 } })],
  ['still_kb', 't2_still', { img: 'TEST_dot', zoom: [1.0, 1.35], pan: [[0, 80], [-260, 160]], style: 'riso', styleAmt: 0.45 }],
  ['split', 't2_split', { left: { scene: 't2_still', p: { img: 'TEST_dot_faces', zoom: [1.1, 1.2], style: 'riso' } },
    right: { scene: 't2_plate', p: { clip: 'TEST_echo_tower', style: 'riso', styleP: { inks: 'echo' } } }, x: 960, line: 3 }],
  ['impact', 'multi', (t, lt) => ({ layers: [
    { scene: 't2_plate', p: { clip: 'TEST_dot_faces', zoom: smashZoom(lt, 0.5, { peak: 1.5, to: 1.3 }) } },
    { scene: 't2_impact', p: { lines: 'radial', centre: [960, 500], inner: 330, impact: impactPulse(lt, [0.5, 1.5], 2), amount: 0.9, count: 150 } }] })],
  ['parallel', 'multi', { layers: [
    { scene: 't2_plate', p: { clip: 'TEST_vista', style: 'gouache', styleAmt: 0.6 } },
    { scene: 't2_impact', p: { lines: 'parallel', angle: -8, count: 1.2, amount: 0.85, zoomBlur: 0.4 } }] }],
  ['bp_over', 'multi', { layers: [
    { scene: 't2_plate', p: { clip: 'TEST_vista', style: 'blueprint', styleP: { tone: 'sepia', grid: 0 }, styleAmt: 0.7 } },
    { scene: 't2_blueprint', p: { paths: FIN, grid: { step: 60, alpha: 0.05, t0: 0, t1: 0.5 } } }] }],
  ['key', 'multi', { layers: [
    { scene: 't2_plate', p: { clip: 'TEST_echo_field', style: 'riso', styleP: { inks: 'echo' } } },
    { scene: 't2_plate', p: { clip: 'TEST_green', key: 'green' } }] }],
  ['twos', 't2_plate', { clip: 'TEST_bars' }],
  ['vhs_layer', 'multi', (t, lt) => ({ layers: [
    { scene: 't2_plate', p: { clip: 'TEST_vista', reverse: true, in: 2.9, rate: 3 } },
    { scene: 't2_vhs', p: { amt: 1, rewind: 1 } }] })],
  ['oil_vista', 't2_plate', { clip: 'TEST_vista', style: 'oil' }],
  ['ink_light', 't2_plate', { clip: 'TEST_vista', style: 'ink', styleAmt: 0.4 }],
  ['gouache_dot', 't2_plate', { clip: 'TEST_dot_turn', style: 'gouache' }],
  ['halftone_vista', 't2_plate', { clip: 'TEST_vista', style: 'halftone' }],
  ['news_tower', 't2_plate', { clip: 'TEST_echo_tower', style: 'newsprint', styleP: { redAll: 0.0 } }],
  ['oil_light', 't2_plate', { clip: 'TEST_echo_tower', style: 'oil', styleAmt: 0.4 }],
  // blueprint subjects (full frame); stills at 2i + 1.9 show them complete
  ...['fin', 'foot', 'hand', 'egg_to_jar', 'seed_section', 'locomotive', 'wright_flyer', 'jet_airliner', 'saturn_v']
    .map((sub) => [`bp_${sub}`, 't2_blueprint', { subject: sub, full: true, stageT: null }]),
  ['s0', 't2_plate', (t, lt) => ({ clip: 'TEST_vista_s0', s0: t - lt - 1 })],          // clipT = t - s0 + lag(0.5) = lt + 1.5
  ['red', 't2_plate', { clip: 'TEST_vista', grade: { red: 1 } }],
  ['rewind', 't2_vhs_rewind', (t, lt) => { const t0 = t - lt; return { clips: ['TEST_vista', 'TEST_echo_tower', 'TEST_dot_faces', 'TEST_missing'],
    steps: [t0, t0 + 0.25, t0 + 0.5, t0 + 0.75], blackAt: t0 + 1.5 }; }],
  ['bp_over_sub', 'multi', { layers: [
    { scene: 't2_plate', p: { clip: 'TEST_vista', style: 'blueprint', styleP: { tone: 'sepia', grid: 0 }, styleAmt: 0.8 } },
    { scene: 't2_blueprint', p: { subject: 'fin_bones', over: true, pos: [900, 560], stageT: null } }] }],
];

export function buildTimeline() {
  return TESTS.map(([id, scene, p], i) => {
    // subject tests: three stages 0.4 s apart from the shot start
    if (p && p.stageT === null) p = { ...p, stageT: [2 * i + 0.1, 2 * i + 0.5, 2 * i + 0.9], drawDur: 0.5 };
    if (p && p.layers) p = { ...p, layers: p.layers.map((L) => (L.p && L.p.stageT === null ? { ...L, p: { ...L.p, stageT: [2 * i + 0.1, 2 * i + 0.5, 2 * i + 0.9], drawDur: 0.5 } } : L)) };
    return { id: `t2p_${id}`, t0: 2 * i, t1: 2 * i + 2, scene, p, look: PLATE_LOOK };
  });
}
