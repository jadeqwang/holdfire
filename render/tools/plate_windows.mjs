// Walks every frame (24 fps) of every shot from --from (default 35.5) and, for each plate layer the shot draws (t2_plate / t2_still,
// inside multi, t2_first chains (first entry), t2_split sides, t2_mirror full/left/right/both, p.under), computes the source frame the
// plate clock asks for BEFORE clamping, and reports frames that fall outside the plate (frozen: clamped to its first/last frame) or
// outside the pick's usable window (USABLE below, from the pick notes), plus missing plate dirs.
//   cd render && node tools/plate_windows.mjs [--from 35.5] [--to 247.16] [--v]
process.removeAllListeners('warning');
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = path.resolve(ROOT, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => { if (x.startsWith('--')) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']); return a; }, []));
const FROM = Number(args.from ?? 35.5), TO = Number(args.to ?? 1e9);
const { loadEdit } = await import(path.join(ROOT, 'tools', 'shots_json.mjs'));
const { A, shots } = await loadEdit();
const picks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'picks2.json'), 'utf8'));
// usable windows in SOURCE-clip seconds (pick notes / take verdicts); a pick not listed may use its whole plate
const USABLE = {
  P106: [0, 2.99],          // its tail (2.99-4.04) is the P107 push
  V214: [0, 1.58],          // red line from 0.75 s: needs zoom >= 1.12 (checked separately)
  BU09: [0, 1.58],
  V216: [1.0, 2.38],
  V218: [1.0, 1.94],        // the breath-out arc
  BU04: [0.4, 3.0],
  BR_LETGO: [2.0, 3.9],     // both hands open and withdraw; before 2.0 they lift the pieces
  BR_clock: [0.0, 2.0],     // she turns away after ~2 s
  DR02: [5.8, 7.92],
  OU11: [0.3, 5.9],         // small birds late
};
const metaCache = {};
const meta = (dir) => { if (!(dir in metaCache)) { const f = path.join(REPO, dir, 'meta.json'); metaCache[dir] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; } return metaCache[dir]; };
const NOT = new Set(['dir', 'kind', 'src', 'file', 'notes', 'note', 'take', 'model']);
function resolve(ref) {
  if (typeof ref === 'object') return ref;
  if (picks[ref]) return { in: 0, lag: 0, ...picks[ref], id: ref };
  if (/\.(jpe?g|png|webp)$/i.test(ref)) return { file: ref, kind: 'still' };
  if (ref.includes('/')) return { dir: ref };
  return { dir: `work/plates/${ref}`, id: ref, unpicked: true };
}
function clipTime(m, q, lt, t) {
  const twos = q.twos !== false;
  const hold = (x) => { let ff = Math.floor(x * 24 + 1e-3); if (twos) ff -= ((ff % 2) + 2) % 2; return ff / 24; };
  if (q.at !== undefined && q.at !== null) return typeof q.at === 'function' ? q.at(lt, t) : q.at;
  if (q.s0 !== undefined && q.s0 !== null && !q.__explicitIn) return hold(t) - q.s0 + (q.lag || 0);
  return (q.in ?? m.start ?? 0) + (q.reverse ? -1 : 1) * hold(lt) * (q.rate ?? 1);
}
const pv = (S, t, lt) => (typeof S.p === 'function' ? S.p(t, lt, { audio: A }) : (S.p || {}));
function layers(scene, p, t, lt, out, where) {
  if (!scene) return;
  if (scene === 't2_plate' || scene === 't2_still') { out.push({ ref: p.dir ? { dir: p.dir } : (p.clip ?? p.img), p, where }); return; }
  if (scene === 'multi') (p.layers || []).forEach((L, i) => layers(L.scene, pv(L, t, lt), t, lt, out, `${where}.L${i}`));
  if (scene === 't2_first') { const L = (p.chain || [])[0]; if (L) layers(L.scene, pv(L, t, lt), t, lt, out, `${where}.first`); }
  if (scene === 't2_split' || scene === 't2_mirror') for (const k of ['left', 'right', 'full', 'both']) if (p[k]) layers(p[k].scene, pv(p[k], t, lt), t, lt, out, `${where}.${k}`);
  if (p.under) layers(p.under.scene, pv(p.under, t, lt), t, lt, out, `${where}.under`);
}
const issues = {};
const add = (id, msg) => { (issues[id] = issues[id] || new Set()).add(msg); };
for (const s of shots) {
  if (s.t1 <= FROM || s.t0 >= TO) continue;
  const n = Math.max(1, Math.round((s.t1 - s.t0) * 24));
  const f0 = Math.ceil(s.t0 * 24 - 1e-6), f1 = Math.ceil(s.t1 * 24 - 1e-6);
  const range = {};
  for (let f = f0; f < f1; f++) {
    const t = f / 24, lt = t - s.t0;
    const p = typeof s.p === 'function' ? s.p(t, lt, { audio: A }) : (s.p || {});
    const L = []; layers(s.scene, p, t, lt, L, s.scene);
    for (const { ref, p: lp, where } of L) {
      const src = resolve(ref);
      if (src.file) { if (!fs.existsSync(path.join(REPO, 'render', src.file)) && !fs.existsSync(path.join(REPO, src.file))) add(s.id, `${where}: missing file ${src.file}`); continue; }
      const m = meta(src.dir);
      if (!m) { add(s.id, `${where}: NO PLATE ${src.dir}${src.unpicked ? ' (no pick)' : ''}`); continue; }
      if ((m.n || 1) <= 1 || m.kind === 'still') continue;
      const q = {}; for (const k in src) if (!NOT.has(k) && src[k] !== undefined) q[k] = src[k]; for (const k in lp) if (lp[k] !== undefined) q[k] = lp[k]; q.__explicitIn = lp.in !== undefined;
      const ct = clipTime(m, q, lt, t);
      const key = `${where} ${src.id || src.dir}`;
      const r = range[key] = range[key] || { lo: 1e9, hi: -1e9, m, id: src.id, zoom: q.zoom, frames: [] };
      r.lo = Math.min(r.lo, ct); r.hi = Math.max(r.hi, ct);
      r.frames.push(Math.floor((ct - (m.start || 0)) * (m.fps || 24) + 1e-3));
    }
  }
  for (const [key, r] of Object.entries(range)) {
    const st = r.m.start || 0, en = st + (r.m.n - 1) / (r.m.fps || 24);
    const clampLo = r.frames.filter((f) => f < 0).length, clampHi = r.frames.filter((f) => f > r.m.n - 1).length;
    if (clampLo) add(s.id, `${key}: ${clampLo} frame(s) before the plate's first frame (clip ${r.lo.toFixed(2)} < ${st.toFixed(2)}) -> frozen`);
    if (clampHi) add(s.id, `${key}: ${clampHi} frame(s) past the plate's last frame (clip ${r.hi.toFixed(2)} > ${en.toFixed(2)}) -> frozen`);
    const u = USABLE[r.id];
    if (u && (r.lo < u[0] - 1e-3 || r.hi > u[1] + 1e-3)) add(s.id, `${key}: clip ${r.lo.toFixed(2)}-${r.hi.toFixed(2)} leaves the usable window ${u[0]}-${u[1]}`);
    if ((r.id === 'V214' || r.id === 'BU09') && r.hi > 0.75 && !((r.zoom ?? 1) >= 1.12)) add(s.id, `${key}: clip past 0.75 s without zoom >= 1.12 (Veo's red line shows)`);
    if (args.v) console.log(s.id.padEnd(5), key.padEnd(40), `clip ${r.lo.toFixed(2)}-${r.hi.toFixed(2)} of ${st.toFixed(2)}-${en.toFixed(2)}`);
  }
}
const ids = Object.keys(issues);
for (const id of ids) for (const m of issues[id]) console.log(`${id}: ${m}`);
console.log(ids.length ? `${ids.length} shot(s) with plate-window issues` : 'plate windows: all clean');
