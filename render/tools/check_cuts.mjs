// Proves the take-two edit is on its onsets: for every shot prints t0, the plan's printed time, the timing.json anchor the cut
// was derived from, and the errors (cut vs anchor, first rendered frame at 24 fps vs anchor, plan time vs anchor). Also checks
// coverage (0 -> duration, no gaps/overlaps) and the type rules (>= 0.6 s per card, <= ~3 words/s).
//   cd render && node tools/check_cuts.mjs [OUT.txt]       exit code 1 if any cut misses its onset by more than one frame
process.removeAllListeners('warning');
import fs from 'node:fs';
import { loadEdit } from './shots_json.mjs';

const out = process.argv[2];
const FR = 1 / 24;
const { A, shots } = await loadEdit();
const L = [];
const ms = (x) => `${x >= 0 ? '+' : ''}${(x * 1000).toFixed(0)}`.padStart(6);
const pt = (s) => { if (!s) return null; const [m, x] = s.split(':'); return Number(m) * 60 + Number(x); };
let bad = 0, planFar = 0;
L.push('id     t0        plan       anchor(t)   cut-anchor  frame-anchor  plan-anchor  anchor');
L.push('-'.repeat(118));
for (const s of shots) {
  const e = s.t0 - s.anchor.t;
  const fe = Math.ceil(s.t0 * 24 - 1e-9) / 24 - s.anchor.t;   // the first frame that shows the shot
  const pd = s.plan ? pt(s.plan) - s.anchor.t : null;
  const flag = Math.abs(e) > FR || fe > FR + 1e-9 ? '  << CUT OFF ONSET' : (pd != null && Math.abs(pd) > FR ? '  (plan time differs from its onset: see note)' : '');
  if (flag.includes('CUT')) bad++; if (flag.includes('plan')) planFar++;
  L.push(`${s.id.padEnd(6)} ${s.t0.toFixed(3).padStart(8)}  ${(s.plan || '-').padEnd(9)}  ${s.anchor.t.toFixed(3).padStart(8)}   ${ms(e)} ms   ${ms(fe)} ms    ${pd == null ? '     -' : ms(pd)} ms   ${s.anchor.kind}: ${s.anchor.ref}${flag}${flag.includes('plan') && s.notes ? ' [' + s.notes + ']' : ''}`);
}
// coverage
const cov = [];
if (Math.abs(shots[0].t0) > 1e-9) cov.push(`starts at ${shots[0].t0}`);
for (let i = 1; i < shots.length; i++) if (Math.abs(shots[i].t0 - shots[i - 1].t1) > 1e-9) cov.push(`gap/overlap ${shots[i - 1].id} -> ${shots[i].id}`);
if (Math.abs(shots[shots.length - 1].t1 - A.duration) > 1e-6) cov.push(`ends at ${shots[shots.length - 1].t1} (duration ${A.duration})`);
// type rules
const cues = shots.cues || [];
const tr = [];
for (const c of cues) {
  const n = c.kind === 'num' ? (c.items || []).length : (c.label || '').replace(/\(.*?\)/g, '').split(/[\s·]+/).filter(Boolean).length;
  const d = c.t1 - c.t0;
  const wps = n / d;
  if (d < 0.6 - 1e-6 || (c.kind !== 'num' && wps > 3.15)) tr.push(`${c.kind} "${c.label}" ${c.t0.toFixed(2)}-${c.t1.toFixed(2)} (${d.toFixed(2)} s, ${n} words, ${wps.toFixed(2)} w/s)`);
}
const short = shots.filter((s) => s.t1 - s.t0 < 0.25).map((s) => `${s.id} ${(s.t1 - s.t0).toFixed(2)} s`);
L.push('');
L.push(`${shots.length} shots, 0 -> ${shots[shots.length - 1].t1}; cuts off their onset by > 1 frame: ${bad}; plan times > 1 frame from their onset: ${planFar}`);
L.push(`coverage: ${cov.length ? cov.join('; ') : 'OK (contiguous, no gaps or overlaps)'}`);
L.push(`type cues: ${cues.length}; rule breaks (< 0.6 s or > 3 words/s): ${tr.length ? '\n  ' + tr.join('\n  ') : 'none'}`);
L.push(`shots under 0.25 s (plan-mandated flashes): ${short.join(', ') || 'none'}`);
const txt = L.join('\n');
console.log(txt);
if (out) fs.writeFileSync(out, txt + '\n');
process.exitCode = bad || cov.length ? 1 : 0;
