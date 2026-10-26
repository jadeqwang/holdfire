import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import { serve } from './serve.mjs';
import crypto from 'node:crypto';
const PORT = 8500 + Math.floor(Math.random() * 90);
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 640, height: 360 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=640&h=360&tl=t2_chess`);
await page.evaluate(() => window.__ready);
const shot = async (t) => { await page.evaluate((tt) => window.renderAt(tt), t); return crypto.createHash('md5').update(await page.screenshot({ type: 'png' })).digest('hex'); };
const T = [142.6, 150.36, 154.5, 156.6, 158.3];
const a = []; for (const t of T) a.push(await shot(t));
const c = []; for (const t of [...T].reverse()) { await shot(t + 3.1); c.unshift(await shot(t)); }
T.forEach((t, i) => console.log(t, a[i] === c[i] ? 'same' : 'DIFF'));
await b.close(); server.close();
