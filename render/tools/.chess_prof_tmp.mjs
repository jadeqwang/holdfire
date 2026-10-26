import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import { serve } from './serve.mjs';
const times = process.argv[2].split(',').map(Number);
const PORT = 8600 + Math.floor(Math.random() * 90);
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=1920&h=1080&tl=${process.env.TL}`);
await page.evaluate(() => window.__ready);
const sync = () => page.evaluate(() => { const gl = document.getElementById('view').getContext('webgl2'); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[0]; });
await page.evaluate(() => { window.__chessProf = 1; });
for (const t of [...times, ...times]) { let best = 1e9; for (let i = 0; i < 3; i++) { await page.evaluate((tt) => window.renderAt(tt), t); best = Math.min(best, await page.evaluate(() => window.__chessMs)); } console.log(t, 'scene draw best of 3', best.toFixed(0), 'ms'); }
await b.close(); server.close();
