// node tools/profile.mjs 1.1,3.3 [w] [h] : per-phase timings of renderAt and of the screenshot
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import { serve } from './serve.mjs';
const times = (process.argv[2] || '1').split(',').map(Number);
const W = Number(process.argv[3] || 1920), H = Number(process.argv[4] || 1080);
const PORT = 8900 + Math.floor(Math.random() * 90);
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=${W}&h=${H}${process.env.TL ? '&tl=' + process.env.TL : ''}`);
await page.evaluate(() => window.__ready);
if (process.env.NOSKY) await page.evaluate(() => { window.__nosky = 1; }); if (process.env.NOPOST) await page.evaluate(() => { window.__nopost = 1; });
for (const t of [...times, ...times]) {
  const t0 = Date.now(); await page.evaluate((tt) => window.renderAt(tt), t); const t1 = Date.now();
  await page.screenshot({ type: 'jpeg', quality: 94 }); const t2 = Date.now();
  console.log(t, 'renderAt', t1 - t0, 'ms', JSON.stringify(await page.evaluate(() => window.__prof)), 'shot', t2 - t1, 'ms');
}
await b.close(); server.close();
