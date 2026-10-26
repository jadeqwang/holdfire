// Frame-accurate capture of the renderer with headless Chromium (SwiftShader).
//   node tools/render.mjs --stills 3.2,10,22.5 --w 960 --h 540 --outdir ../work/stills/x
//   node tools/render.mjs --from 0 --to 247.2 --fps 24 --w 1920 --h 1080 --jobs 3 --out ../work/out/hold_fire.mp4 [--audio F] [--crf 14]
// Range mode: the range is split into one contiguous chunk per job (plates load sequentially, so caches stay warm); each job's browser
// pipes JPEG frames straight into its own ffmpeg (no frame files on disk), then the chunks are concatenated and muxed with the audio.
// --framedir D --noenc 1 writes JPEG frames instead (for inspection). TL=name env selects a test timeline.
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { serve } from './serve.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
  return acc;
}, []));
const W = Number(args.w || 1920), H = Number(args.h || 1080);
const FPS = Number(args.fps || 24);
const JOBS = Number(args.jobs || 1);
const PORT = 8800 + Math.floor(Math.random() * 100);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(240000);   // first frames of heavy scenes compile shaders for 20 s+ under load
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/prepare failed/.test(m.text()))) console.error('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?w=${W}&h=${H}${process.env.TL ? '&tl=' + process.env.TL : ''}`);
  await page.waitForFunction(() => window.__ready !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.__ready);
  return page;
}

async function grab(page, t) {
  await page.evaluate((tt) => window.renderAt(tt), t);
  return page.screenshot({ type: 'jpeg', quality: Number(args.q || 93), clip: { x: 0, y: 0, width: W, height: H }, timeout: 240000 });
}

const server = await serve(PORT);
const launch = () => chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security'],
});
const browsers = [];
try {
  if (args.stills) {
    const outdir = args.outdir || path.join(REPO, 'work', 'stills', 'tmp');
    fs.mkdirSync(outdir, { recursive: true });
    const b = await launch(); browsers.push(b);
    const page = await openPage(b);
    for (const t of args.stills.split(',').map(Number)) {
      const f = path.join(outdir, `s_${t.toFixed(3).padStart(8, '0')}.jpg`);
      const t0 = Date.now();
      fs.writeFileSync(f, await grab(page, t));
      console.log(`still ${t.toFixed(3)} -> ${f} (${Date.now() - t0} ms)`);
    }
  } else {
    const from = Number(args.from || 0), to = Number(args.to || 247.2);
    const n = Math.round((to - from) * FPS);
    const out = path.resolve(args.out || path.join(REPO, 'work', 'out', 'render.mp4'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.chunks_'));
    const per = Math.ceil(n / JOBS);
    const t0 = Date.now(); let done = 0;
    const jobs = [];
    for (let j = 0; j < JOBS; j++) {
      const a = j * per, b = Math.min(n, (j + 1) * per);
      if (a >= b) continue;
      jobs.push((async () => {
        const br = await launch(); browsers.push(br);
        const page = await openPage(br);
        if (args.framedir && args.noenc) {
          fs.mkdirSync(args.framedir, { recursive: true });
          for (let i = a; i < b; i++) { fs.writeFileSync(path.join(args.framedir, `f_${String(i).padStart(5, '0')}.jpg`), await grab(page, from + i / FPS)); done++; }
          return null;
        }
        const chunk = path.join(tmp, `c_${String(j).padStart(2, '0')}.mp4`);
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
          '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', args.crf || '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), chunk], { stdio: ['pipe', 'inherit', 'inherit'] });
        const closed = new Promise((res) => ff.on('close', res));
        for (let i = a; i < b; i++) {
          const buf = await grab(page, from + i / FPS);
          if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once('drain', res));
          done++;
          if (done % 48 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${n} frames  ${(el / done).toFixed(2)} s/frame  eta ${((n - done) * el / done / 60).toFixed(1)} min`); }
        }
        ff.stdin.end(); await closed;
        return chunk;
      })());
    }
    const chunks = (await Promise.all(jobs)).filter(Boolean);
    if (chunks.length) {
      const list = path.join(tmp, 'list.txt');
      fs.writeFileSync(list, chunks.map((c) => `file '${c}'`).join('\n'));
      // the sound-design mix (song + quiet SFX, loudness-matched) when present, else the song itself
      const mix = path.join(REPO, 'media', 'audio', 'hold_fire_mix.wav');
      const audio = args.audio || (fs.existsSync(mix) ? mix : path.join(REPO, 'inputs', 'Hold Fire.mp3'));
      const aArgs = args.noaudio ? [] : ['-ss', String(from), '-t', String(to - from), '-i', audio];
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, ...aArgs,
        '-map', '0:v', ...(args.noaudio ? [] : ['-map', '1:a', '-c:a', 'aac', '-b:a', args.abitrate || '320k']), '-c:v', 'copy', '-t', String(to - from), '-movflags', '+faststart', out], { stdio: 'inherit' });
      console.log(r.status === 0 ? `wrote ${out} (${((Date.now() - t0) / 60000).toFixed(1)} min)` : 'ffmpeg mux failed');
      for (const c of chunks) fs.unlinkSync(c);
      fs.unlinkSync(list); fs.rmdirSync(tmp);
    }
  }
} finally {
  for (const b of browsers) await b.close().catch(() => {});
  server.close();
}
