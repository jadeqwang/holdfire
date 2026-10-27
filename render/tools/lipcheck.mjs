// Lip-sync check from the ACTUAL renderer: for every lip-synced pick (picks2.json entries with s0) it steps the real edit through
// the shot's lipsync window (docs/take2/shots.json) one film frame at a time, records which plate frame t2_plate drew (the
// __plateLog hook in scenes/t2/plate/plate.js, so splits / mirrors / p overrides are all accounted for), grabs the rendered film
// frame at each sung word onset, and hands that to tools/sync/lipstrip.py, which builds the strip:
//   row "film"  = the rendered frame at each word onset (thumbnail),
//   row "R"     = the mouth of the plate frame the renderer showed there,
//   rows lag+d  = the same mouths at lag + d, d = -0.25 .. +0.5 s in 1/24 s steps (d = 0 must equal R; checked).
//   cd render && node tools/lipcheck.mjs [--picks V101,C103L] [--lag V101=0.042,...] [--out ../work/t2/lips] [--w 960 --h 540]
// Writes OUT/<PICK>.render.json and OUT/<PICK>.lipcheck.jpg. --lag overrides the pick's lag for the strip's centre row (the
// renderer still plays the merged pick; the R row then shows the current pick and the d rows are around the override).
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { serve } from './serve.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
  return acc;
}, []));
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const W = Number(args.w || 960), H = Number(args.h || 540);
const OUT = path.resolve(args.out || path.join(REPO, 'work', 't2', 'lips'));
const PORT = 8900 + Math.floor(Math.random() * 90);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const PY = fs.existsSync(path.join(REPO, 'work/venv/mp312/bin/python')) ? path.join(REPO, 'work/venv/mp312/bin/python') : 'python3';

const picks = JSON.parse(fs.readFileSync(path.join(REPO, 'render/data/picks2.json'), 'utf8'));
const shotsDoc = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/take2/shots.json'), 'utf8'));
const shots = Array.isArray(shotsDoc) ? shotsDoc : (shotsDoc.shots || Object.entries(shotsDoc).map(([id, v]) => ({ id, ...v })));
const timing = JSON.parse(fs.readFileSync(path.join(REPO, 'render/data/timing.json'), 'utf8'));
const words = timing.lines.flatMap((l) => l.words.map((w) => ({ w: w.w, t: Number(w.start) })));
const lagOver = Object.fromEntries((args.lag || '').split(',').filter(Boolean).map((s) => { const [k, v] = s.split('='); return [k, Number(v)]; }));

const ids = (args.picks ? args.picks.split(',') : Object.keys(picks).filter((k) => picks[k].s0 != null && !k.startsWith('TEST')));
const shotOf = (id) => shots.find((s) => s.id === id) || shots.find((s) => /[LR]$/.test(id) && s.id === id.slice(0, -1));

fs.mkdirSync(OUT, { recursive: true });
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(240000);
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?w=${W}&h=${H}`);
  await page.waitForFunction(() => window.__ready !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.__ready);
  const shownAt = async (t, dir) => page.evaluate(async ([tt, d]) => {
    window.__plateLog = [];
    await window.renderAt(tt);
    const hit = window.__plateLog.filter((e) => e.dir === d);
    window.__plateLog = null;
    return hit.length ? hit[hit.length - 1].f : null;
  }, [t, dir]);
  for (const id of ids) {
    const pk = picks[id]; const sh = shotOf(id);
    if (!pk || pk.s0 == null) { console.warn(`${id}: not a lip-synced pick`); continue; }
    if (!sh) { console.warn(`${id}: no shot in shots.json`); continue; }
    const [A, B] = sh.lipsync_window || [sh.t0, sh.t1];
    const frames = [];
    for (let k = Math.ceil(A * 24 - 1e-6); k / 24 < B; k++) frames.push({ t: k / 24, f: await shownAt(k / 24, pk.dir) });
    const ws = [];
    for (const w of words.filter((x) => x.t >= A - 0.02 && x.t < B)) {
      const f = await shownAt(w.t, pk.dir);
      const png = path.join(OUT, `.film_${id}_${w.t.toFixed(3)}.jpg`);
      fs.writeFileSync(png, await page.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: W, height: H } }));
      ws.push({ w: w.w, t: w.t, f, film: png });
    }
    const rec = { pick: id, shot: sh.id, dir: pk.dir, src: pk.src, s0: pk.s0, lag: pk.lag ?? 0, lagCentre: lagOver[id] ?? pk.lag ?? 0,
      win: [A, B], twos: pk.twos !== false, words: ws, frames };
    const js = path.join(OUT, `${id}.render.json`);
    fs.writeFileSync(js, JSON.stringify(rec, null, 1));
    const shown = frames.filter((x) => x.f != null).length;
    console.log(`${id}: ${frames.length} film frames, plate drawn on ${shown}, ${ws.length} words`);
    const r = spawnSync(PY, [path.join(REPO, 'tools/sync/lipstrip.py'), js], { stdio: 'inherit' });
    if (r.status !== 0) console.error(`${id}: lipstrip failed`);
    for (const w of ws) fs.rmSync(w.film, { force: true });
  }
} finally {
  await browser.close().catch(() => {});
  server.close();
}
