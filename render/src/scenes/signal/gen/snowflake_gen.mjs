// Bakes the snowflake: Reiter (2005) "A local cellular model for snow crystal growth" on a hexagonal grid.
// Each cell holds water s; a cell is receptive if frozen (s >= 1) or next to a frozen cell. Receptive cells keep their water
// and gain gamma per step; the rest diffuses (alpha). Writes the step at which every cell froze (uint16, 65535 = never) so
// the scene can index growth by song time (deterministic; no simulation at render time).
//   node render/src/scenes/signal/gen/snowflake_gen.mjs [N=401] [alpha=2] [beta=0.5] [gamma=0.0001]
// Output: render/src/scenes/signal/assets/snowflake_reiter.bin  = header (uint32 N, uint32 maxStep) + N*N uint16 (row r, col q; axial)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const N = Number(process.argv[2] || 401), alpha = Number(process.argv[3] || 2), beta = Number(process.argv[4] || 0.5), gamma = Number(process.argv[5] || 0.0001);
const M = 30; // active margin (cells) beyond the crystal; outside it the vapour stays at beta (the far boundary)
const n = N, c = (n - 1) / 2;
const s = new Float32Array(n * n).fill(beta), s2 = new Float32Array(n * n);
const frozenAt = new Int32Array(n * n).fill(-1);
s[c * n + c] = 1; frozenAt[c * n + c] = 0;
const NB = [1, -1, n, -n, 1 - n, n - 1];
const rec = new Uint8Array(n * n);
const rad = new Float32Array(n * n);
for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) { const x = (q - c) + (r - c) / 2, y = (r - c) * 0.8660254; rad[r * n + q] = Math.hypot(x, y); }
const lim = c - 3;
let act = new Int32Array(0), actR = -1, rmax = 0, step;
const rebuild = (R) => { const a = []; for (let i = 0; i < n * n; i++) { const q = i % n, r = (i / n) | 0; if (q < 1 || r < 1 || q >= n - 1 || r >= n - 1) continue; if (rad[i] <= R) a.push(i); } act = Int32Array.from(a); actR = R; };
const t0 = Date.now();
for (step = 1; step < 65000; step++) {
  const R = Math.min(lim, Math.ceil(rmax) + M);
  if (R !== actR) rebuild(R);
  for (const i of act) { let f = s[i] >= 1; if (!f) for (const d of NB) if (s[i + d] >= 1) { f = true; break; } rec[i] = f ? 1 : 0; }
  for (const i of act) { const u = rec[i] ? 0 : s[i]; let sum = 0; for (const d of NB) { const j = i + d; if (!rec[j]) sum += s[j]; } s2[i] = u + alpha / 2 * (sum / 6 - u) + (rec[i] ? s[i] + gamma : 0); }
  for (const i of act) { s[i] = s2[i]; if (s[i] >= 1 && frozenAt[i] < 0) { frozenAt[i] = step; if (rad[i] > rmax) rmax = rad[i]; } }
  if (rmax >= lim - M * 0.5 - 2) break;
}
const out = new Uint16Array(n * n);
for (let i = 0; i < n * n; i++) out[i] = frozenAt[i] < 0 ? 65535 : frozenAt[i];
const hdr = new Uint32Array([n, step]);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
fs.writeFileSync(path.join(dir, 'snowflake_reiter.bin'), Buffer.concat([Buffer.from(hdr.buffer), Buffer.from(out.buffer)]));
console.log(`N=${n} alpha=${alpha} beta=${beta} gamma=${gamma}: ${step} steps, tip radius ${rmax.toFixed(1)} cells, ${Date.now() - t0} ms`);
