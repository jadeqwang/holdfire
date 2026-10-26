// Storyboard: one still per shot (at a fraction of its length) as a labelled contact sheet.
//   node tools/storyboard.mjs OUT.jpg [--w 640 --h 360 --at 0.6 --from 0 --to 247 --cols 6]
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { serve } from './serve.mjs';
const out = process.argv[2];
const args = Object.fromEntries(process.argv.slice(3).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]); return acc; }, []));
const W = Number(args.w || 640), H = Number(args.h || 360), AT = Number(args.at || 0.6);
const PORT = 8600 + Math.floor(Math.random() * 90);
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=${W}&h=${H}${process.env.TL ? '&tl=' + process.env.TL : ''}`);
await page.evaluate(() => window.__ready);
const shots = (await page.evaluate(() => window.__shots)).filter((s) => s.t1 > Number(args.from || 0) && s.t0 < Number(args.to || 1e9) && s.t1 - s.t0 > 0.05);
const dir = fs.mkdtempSync('/home/user/holdfire/work/sb_');
const files = [];
for (const s of shots) {
  const t = s.t0 + (Math.min(s.t1, 248) - s.t0) * AT;
  await page.evaluate((tt) => window.renderAt(tt), t);
  const f = path.join(dir, `${String(files.length).padStart(3, '0')}_${s.id}_${t.toFixed(2)}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 85 }); files.push(f);
}
await b.close(); server.close();
spawnSync('python3', ['/home/user/holdfire/tools/sheet.py', out, ...files, `--cols=${args.cols || 6}`, `--w=${Math.min(W, 400)}`], { stdio: 'inherit' });
// a long edit (take two has ~180 shots) is also cut into readable pages: OUT_p1.jpg, OUT_p2.jpg ... (--page N tiles, 0 = off)
const PAGE = Number(args.page ?? 36);
if (PAGE > 0 && files.length > PAGE) {
  for (let i = 0; i * PAGE < files.length; i++) {
    const pg = out.replace(/(\.[a-z]+)$/i, `_p${i + 1}$1`);
    spawnSync('python3', ['/home/user/holdfire/tools/sheet.py', pg, ...files.slice(i * PAGE, (i + 1) * PAGE), `--cols=${args.cols || 6}`, `--w=${Math.min(W, 400)}`], { stdio: 'inherit' });
  }
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(shots.length, 'shots');
