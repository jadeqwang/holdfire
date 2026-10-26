// Look-dev grid: render one song time with several parameter variants.
//   node tools/lookdev.mjs T OUT.jpg '[{"p":{...},"post":{...},"label":"a"}, ...]' [w h]
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import { serve } from './serve.mjs';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const [T, OUT, VARS, w, h] = process.argv.slice(2);
const W = Number(w || 1280), H = Number(h || 720);
const variants = JSON.parse(VARS);
const PORT = 8700 + Math.floor(Math.random() * 90);
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=${W}&h=${H}`);
await page.evaluate(() => window.__ready);
const dir = fs.mkdtempSync('/home/user/holdfire/work/lookdev_');
const files = [];
for (let i = 0; i < variants.length; i++) {
  const v = variants[i];
  await page.evaluate((vv) => { window.__pOverride = vv.p || null; window.__postOverride = vv.post || null; }, v);
  await page.evaluate((tt) => window.renderAt(tt), Number(T));
  const f = `${dir}/v${i}.jpg`; await page.screenshot({ path: f, type: 'jpeg', quality: 90 }); files.push(f);
  console.log(i, v.label || '');
}
await b.close(); server.close();
const r = spawnSync('python3', ['/home/user/holdfire/tools/sheet.py', OUT, ...files, '--cols=2', `--w=${Math.min(960, W)}`], { stdio: 'inherit' });
