// Take two's picture events for the sound layer (tools/audio/sfx_t2.py), read from the edit itself so the cues can never drift
// from the picture: it imports render/src/timeline.js (via render/tools/shots_json.mjs loadEdit) and the scenes' own schedule
// code, with the real timing data. Read-only: nothing in render/ is changed.
//   node tools/audio/t2_events.mjs [OUT.json]        (default: stdout)
// Emits {clock: {presses[], stop, anchors}, vhs: {coldopen, build}, counter: {resets[], ticks[], roll[], ...}, arkhipov: {...}}
process.removeAllListeners('warning');
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const RENDER = path.resolve(HERE, '..', '..', 'render');

// the data scenes fetch() their JSON relative to render/ (the browser's base); serve those from disk
globalThis.fetch = async (u) => {
  const f = path.join(RENDER, String(u));
  if (!fs.existsSync(f)) return { ok: false, json: async () => null };
  return { ok: true, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) };
};

const { loadEdit } = await import(path.join(RENDER, 'tools', 'shots_json.mjs'));
const { buildSchedule } = await import(path.join(RENDER, 'src', 'scenes', 't2', 'chess', 'schedule.js'));
const { hash1 } = await import(path.join(RENDER, 'src', 'util.js'));
const { A, shots } = await loadEdit();
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const shotAt = (t) => shots.find((s) => t >= s.t0 && t < s.t1);
const P = (s, t) => (typeof s.p === 'function' ? s.p(t) : s.p);

// ---------------------------------------------------------------- chess clock (scenes/t2/chess/schedule.js)
const S = buildSchedule(A);
const presses = [{ t: S.startPress, side: 'b', label: 'start (Black starts White\'s clock)', grid: '16th' },
  ...S.plies.map((p) => ({ t: p.t, side: p.side, label: p.label, grid: p.grid, capture: p.capId >= 0, check: !!p.check }))]
  .map((x) => ({ ...x, t: r4(x.t), shot: shotAt(x.t)?.id, scene: shotAt(x.t)?.scene }));
const clock = { presses, stop: r4(S.stop), anchors: Object.fromEntries(Object.entries(S.anchors).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, r4(v)])) };

// ---------------------------------------------------------------- VHS rewinds
// cold open: t2_vhs_rewind runs rewind = 1 until stopT, then 0.12 (the pause wobble) until the match; steps = one clip per 16th
const rw = shots.find((s) => s.scene === 't2_vhs_rewind');
let coldopen = null;
if (rw) {
  const p0 = P(rw, rw.t0 + 1e-3);
  let stop = rw.t1;
  for (let t = rw.t0; t < rw.t1; t += 0.0005) if ((P(rw, t).rewind ?? 1) < 0.5) { stop = t; break; }
  // refine to 0.1 ms
  let a = stop - 0.0005, b = stop;
  for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if ((P(rw, m).rewind ?? 1) < 0.5) b = m; else a = m; }
  coldopen = { id: rw.id, t0: r4(rw.t0), t1: r4(rw.t1), stop: r4(b), steps: p0.steps.map(r4), clips: p0.clips, next: shotAt(rw.t1 + 1e-3)?.want };
}
// build: t2_war with rewind: the war clock w(t) (the scrub position); speed = -dw/dt sampled at 5 ms
const wr = shots.filter((s) => s.scene === 't2_war' && typeof s.p === 'function' && P(s, s.t0 + 1e-3).rewind);
let build = null;
if (wr.length) {
  const T = P(wr[0], wr[0].t0 + 1e-3).times;
  const t0 = wr[0].t0, t1 = wr[wr.length - 1].t1;
  const w = [];
  for (let t = t0; t <= Math.min(t1, T.whole + 0.6); t += 0.005) { const s = shotAt(t) || wr[wr.length - 1]; w.push([r4(t), r4(P(s, t).w ?? t)]); }
  build = { ids: wr.map((s) => s.id), t0: r4(t0), t1: r4(t1), whole: r4(T.whole), rw0: r4(T.rw0), smear_off: [r4(T.whole - 0.25), r4(T.whole)], w,
    before: shotAt(t0 - 1e-3)?.want };
}

// ---------------------------------------------------------------- the reset counter (scenes/t2/data/counter.js)
const cs = shots.find((s) => s.scene === 't2_counter');
let counter = null;
if (cs) {
  const lib = await import(path.join(RENDER, 'src', 'scenes', 't2', 'data', 'lib.js'));
  await lib.ensureList();
  const { schedule } = await import(path.join(RENDER, 'src', 'scenes', 't2', 'data', 'counter.js'));
  const p = P(cs, cs.t0);
  const Sc = schedule(A, p, cs.t0);
  const R = Sc.resets, n = R.length;
  // the board's value, as counter.js valueAt draws it: between resets it zooms up to the real day gap (climbAt, whole counts per
  // film frame); a ratchet tick on every frame the rollers move, a carry where the hundreds wheel or above turns
  const { valueAt } = await import(path.join(RENDER, 'src', 'scenes', 't2', 'data', 'counter.js'));
  const ticks = [];
  { let prev = 0, last = -2;
    for (let f = Math.ceil(cs.t0 * 24 - 1e-3); f / 24 < R[n - 1].t; f++) {
      const t = f / 24, V = valueAt(Sc, A, t, p); const v = Math.round(V.v);
      if (V.last !== last) { prev = 0; last = V.last; }
      if (v > prev) ticks.push({ t: r4(t), v, carry: Math.floor(v / 100) !== Math.floor(prev / 100) });
      prev = v;
    } }
  const ta = R[n - 1].t + 0.06, tb = Sc.climbEnd;
  const roll = [];
  for (let v = 1; v <= Sc.target; v++) {          // v = target * f^2.6 crosses each whole number: one ratchet tooth per day
    const f = Math.pow(v / Sc.target, 1 / 2.6);
    roll.push({ t: r4(ta + f * (tb - ta)), v, carry: v % 10 === 0 });
  }
  counter = { id: cs.id, t0: r4(cs.t0), t1: r4(cs.t1), grid0: r4(Sc.t0), resets: R.map((r) => ({ t: r4(r.t), date: r.date, year: r.year })), ticks, roll,
    higher: r4(Sc.higher), climb: [r4(ta), r4(tb)], target: Sc.target };
}

// ---------------------------------------------------------------- Arkhipov (scenes/t2/history/arkhipov.js)
const ak = shots.find((s) => s.scene === 't2_arkhipov');
let arkhipov = null;
if (ak) {
  const p = P(ak, ak.t0);
  const LAYOUT = { d1: { x: 150, L: 640 }, d2: { x: 1190, L: 540 } };
  const chargeX = (i) => { const d = i % 2 ? LAYOUT.d2 : LAYOUT.d1; return d.x + d.L * (0.06 + 0.2 * hash1(i * 3.7)); };
  const detAt = (i) => 0.62 + 0.22 * hash1(i * 5.3);
  arkhipov = { id: ak.id, t0: r4(ak.t0), tFire: r4(p.tFire), charges: p.charges.map((tc, i) => ({ t: r4(tc), det: r4(tc + detAt(i)), x: Math.round(chargeX(i)) })) };
}

const out = JSON.stringify({ source: 'render/src/timeline.js + scenes (read by tools/audio/t2_events.mjs)', duration: A.duration, clock, vhs: { coldopen, build }, counter, arkhipov }, null, 1);
if (process.argv[2]) fs.writeFileSync(process.argv[2], out); else process.stdout.write(out);
