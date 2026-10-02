// Headless export: frames render in parallel tabs (each frame is a pure function of t), then ffmpeg muxes with the soundtrack.
// Env: WORKERS (tabs), BLUR (motion-blur sub-frames), ONLY=0,90,180 (render just those frames as stills, no encode).
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { serve } from './server.mjs';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WORKERS = Number(process.env.WORKERS ?? 6);
const BLUR = Number(process.env.BLUR ?? 16);
const ONLY = process.env.ONLY?.split(',').map(Number);
const OUT = 'out', FRAMES = `${OUT}/frames`, PORT = 5179;

const server = await serve(PORT);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let FPS, DUR;
try {
  await mkdir(FRAMES, { recursive: true });
  // Separate contexts → separate renderer processes → real parallelism.
  const pages = await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      const page = await (await browser.createBrowserContext()).newPage();
      page.on('pageerror', e => console.error('page error:', e.message));
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.evaluate(() => window.reel.ready);
      return page;
    }),
  );
  ({ FPS, DUR } = await pages[0].evaluate(() => ({ FPS: reel.FPS, DUR: reel.DUR })));
  const frames = ONLY ?? [...Array(Math.round(FPS * DUR)).keys()];
  const started = Date.now();
  let next = 0, done = 0;
  await Promise.all(
    pages.map(async page => {
      while (next < frames.length) {
        const f = frames[next++];
        const url = await page.evaluate((t, s) => reel.frame(t, s), f / FPS, BLUR);
        await writeFile(`${FRAMES}/f${String(f).padStart(4, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
        if (++done % 60 === 0 || done === frames.length) {
          console.log(`frames ${done}/${frames.length}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
        }
      }
    }),
  );
  if (!ONLY) {
    const wav = await pages[0].evaluate(() => reel.audio());
    await writeFile(`${OUT}/soundtrack.wav`, Buffer.from(wav, 'base64'));
  }
} finally {
  await browser.close();
  server.close();
}

if (!ONLY) {
  const args = [
    '-y', '-loglevel', 'error', '-stats',
    '-framerate', String(FPS), '-i', `${FRAMES}/f%04d.png`, '-i', `${OUT}/soundtrack.wav`,
    // Luma-only temporal grain added at encode time keeps the PNGs small.
    '-vf', 'format=yuv420p,noise=c0s=3:c0f=t',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart',
    `${OUT}/claude-motion-reel.mp4`,
  ];
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg exited with ${r.status}`);
  console.log(`done → ${OUT}/claude-motion-reel.mp4`);
}
