import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import { serve } from './serve.mjs';
const times = process.argv[2].split(',').map(Number);
const PORT = 8700 + Math.floor(Math.random() * 90);
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://127.0.0.1:${PORT}/index.html?w=1920&h=1080&tl=${process.env.TL}`);
await page.evaluate(() => window.__ready);
for (const t of [...times, ...times]) {
  const ms = await page.evaluate(async (tt) => { const gl = document.getElementById('view').getContext('webgl2'); const px = new Uint8Array(4);
    await window.renderAt(tt - 1 / 24); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now(); await window.renderAt(tt); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t0; }, t);
  console.log(t, Math.round(ms), 'ms');
}
await b.close(); server.close();
