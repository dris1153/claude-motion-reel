// QA for the scroll site (run after `vite build`): home, chapter holds + captions (forward/backward identical),
// speed cap, jump cut, cinema mode, resize, reduced motion, per-scene draw timings. Non-zero exit on any FAIL.
// HEADED=1 runs a visible window with the GPU (headless timings are CPU-raster and pessimistic); DPR sets density.
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import { mkdir } from 'node:fs/promises';
import { loopChecks } from './qa-loop-checks.mjs';
import { expect, hasFailed, settle, scrollToLabel, psnr, sampleShownTime, maxRate, sampleScrollY, printDrawTimes } from './qa-helpers.mjs';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.QA_OUT ?? 'out/qa';
const DPR = Number(process.env.DPR ?? 2);
const CHAPTERS = 8, CALM_TIMES = [11.3, 11.55, 11.8, 12.05, 12.3, 12.55, 12.8, 13.2];
const wait = ms => new Promise(r => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true }, logLevel: 'silent' });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: !process.env.HEADED, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: DPR } });
const errors = [];

try {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(() => window.scrollReel?.engine);
  const heroes = await page.evaluate(() => window.scrollReel.heroes);

  // Home: resting at the top, cover visible, idle ball animating.
  await wait(1500); // give any refresh/snap time to (wrongly) move the page, and the entrance time to finish
  const home = await page.evaluate(() => ({
    y: scrollY, t: window.scrollReel.t,
    cover: Math.min(...[...document.querySelectorAll('.cover-block')].map(b => Number(getComputedStyle(b).opacity))),
  }));
  expect('home rests at top', home.y === 0 && home.t === 0, `scrollY=${home.y} t=${home.t}`);
  expect('home cover visible', home.cover > 0.9, `min block opacity=${home.cover}`);
  await page.screenshot({ path: `${OUT}/home-a.png` });
  await wait(300);
  await page.screenshot({ path: `${OUT}/home-b.png` });
  expect('home idle is animating', psnr(`${OUT}/home-a.png`, `${OUT}/home-b.png`) < 60);
  for (const f of [0.3, 0.7]) {
    await page.evaluate(f => window.scrollTo({ top: innerHeight * f, behavior: 'instant' }), f);
    await wait(120); // before the scroll-end snap (idle 200ms+) moves it; for visual review only
    await page.screenshot({ path: `${OUT}/intro-${f}.png` });
  }

  // Chapters: every label rests exactly on its hero with its caption, identically in both directions.
  const shoot = async (i, dir) => {
    await scrollToLabel(page, `c${i}`);
    const t = await settle(page);
    const caption = await page.evaluate(() => [...document.querySelectorAll('.caption.is-visible')].map(c => c.dataset.i).join());
    const path = `${OUT}/${dir}-c${i}.png`;
    await page.screenshot({ path });
    return { t, caption, path };
  };
  const fwd = [], bwd = [];
  for (let i = 0; i < CHAPTERS; i++) fwd[i] = await shoot(i, 'fwd');
  for (let i = CHAPTERS - 1; i >= 0; i--) bwd[i] = await shoot(i, 'bwd');
  const covers = await page.evaluate(() => [...document.querySelectorAll('.cover-block')].every(b => getComputedStyle(b).visibility === 'hidden'));
  expect('cover hidden once the intro has scrolled out', covers);
  for (let i = 0; i < CHAPTERS; i++) {
    const p = psnr(fwd[i].path, bwd[i].path);
    const ok = Math.abs(fwd[i].t - heroes[i]) < 1e-3 && Math.abs(bwd[i].t - heroes[i]) < 1e-3 && fwd[i].caption === (i === 5 ? '' : String(i)) && p >= 40;
    expect(`c${i} hold`, ok, `t=${fwd[i].t.toFixed(3)}/${bwd[i].t.toFixed(3)} caption=${fwd[i].caption} psnr=${p === Infinity ? 'inf' : p.toFixed(1)}`);
  }

  // Wheel input goes through Lenis: it glides over many frames, then snaps on to the next hero forward.
  await scrollToLabel(page, 'c1');
  await settle(page);
  await page.mouse.move(800, 450);
  const sampling = sampleScrollY(page, 800);
  for (let k = 0; k < 3; k++) {
    await page.mouse.wheel({ deltaY: 120 });
    await wait(16);
  }
  // Smooth = spread over many frames with no single dominant jump (native wheel moves in one 100px+ step per notch).
  const ys = await sampling, steps = new Set(ys).size - 1, moved = ys.at(-1) - ys[0];
  const biggest = Math.max(...ys.slice(1).map((y, i) => y - ys[i]));
  expect('wheel glides (Lenis)', steps >= 5 && moved > 100 && biggest < moved * 0.4, `${steps} steps, moved ${Math.round(moved)}px, biggest step ${Math.round(biggest)}px`);
  const afterWheel = await settle(page);
  const [y, label] = await page.evaluate(() => [scrollY, window.scrollReel.engine.labelScroll('c2')]);
  expect('wheel then snap lands on the next hero', Math.abs(afterWheel - heroes[2]) < 1e-3 && Math.abs(y - label) <= 2, `t=${afterWheel.toFixed(3)} scrollY=${Math.round(y)} label=${Math.round(label)}`);

  // An interrupted snap (cinema opening mid-glide = stop/start) must not disable snapping for later native scrolls.
  await page.mouse.wheel({ deltaY: 120 });
  await page.waitForFunction(() => {
    const l = window.scrollReel.smooth.lenis;
    return l.isScrolling === 'smooth' && l.userData?.programmatic; // our snap is gliding
  });
  await page.evaluate(() => {
    window.scrollReel.smooth.stop();
    window.scrollReel.smooth.start();
    window.scrollBy({ top: 300, behavior: 'instant' });
  });
  const afterStop = await settle(page);
  const [y2, labels] = await page.evaluate(() => [scrollY, ['c2', 'c3'].map(l => window.scrollReel.engine.labelScroll(l))]);
  expect('snap survives an interrupted glide', labels.some(v => Math.abs(v - y2) <= 2) && heroes.includes(afterStop), `t=${afterStop.toFixed(3)} scrollY=${Math.round(y2)}`);

  await loopChecks(page, heroes);

  // Speed cap: a 2-viewport fling from chapter 1 must not play faster than ~1.25× realtime.
  await scrollToLabel(page, 'c1');
  await settle(page);
  const fling = await sampleShownTime(page, 'window.scrollBy({ top: 2 * innerHeight, behavior: "instant" })', 1500);
  const rate = maxRate(fling);
  expect('fling capped near 1.25× realtime', rate <= 1.35 && fling.at(-1)[1] > fling[0][1], `max rate=${rate.toFixed(2)}×`);

  // Jump cut: a rail jump across > 3s of reel cuts instead of crawling.
  await scrollToLabel(page, 'c0');
  await settle(page);
  const jump = await page.evaluate(() => new Promise(done => {
    document.querySelector('.rail button[data-i="7"]').click();
    let frames = 0;
    const tick = () => (window.scrollReel.t === window.scrollReel.heroes[7] || ++frames > 30 ? done(frames) : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }));
  expect('rail jump c0 → c7 cuts', jump <= 4, `${jump} frames`);

  // Cinema: plays on the audio clock, Esc restores the scroll frame.
  await settle(page);
  await page.click('.caption.is-visible .caption-watch');
  await page.waitForFunction(() => window.scrollReel.cinemaTime > 0, { timeout: 10000 });
  const c0 = await page.evaluate(() => window.scrollReel.cinemaTime);
  await wait(2000);
  const c1 = await page.evaluate(() => window.scrollReel.cinemaTime);
  expect('cinema plays in realtime', c1 - c0 > 1.5 && c1 - c0 < 2.6, `advanced ${(c1 - c0).toFixed(2)}s in 2s`);
  await page.screenshot({ path: `${OUT}/cinema.png` });
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement?.blur()); // focus returns to the opener; its ring isn't part of the frame
  await wait(800); // caption fade-in
  const closed = await page.evaluate(() => !window.scrollReel.cinema && !document.documentElement.classList.contains('cinema'));
  await page.screenshot({ path: `${OUT}/cinema-closed.png` });
  expect('Esc closes cinema and restores the frame', closed && psnr(`${OUT}/cinema-closed.png`, fwd[7].path) >= 40);

  // Resizes (height rescales the scroll length; width-only doesn't move the scroll at all) must keep the frame.
  await scrollToLabel(page, 'c3');
  await settle(page);
  for (const [width, height] of [[1600, 700], [1600, 1000], [1400, 1000], [1400, 900], [1600, 900]]) {
    await page.setViewport({ width, height, deviceScaleFactor: DPR });
    const t = await settle(page);
    const coverHidden = await page.evaluate(() => [...document.querySelectorAll('.cover-block')].every(b => getComputedStyle(b).visibility === 'hidden'));
    expect(`resize to ${width}x${height} keeps frame`, Math.abs(t - heroes[3]) < 1e-3 && coverHidden, `t=${t.toFixed(3)} coverHidden=${coverHidden}`);
  }

  await printDrawTimes(page);

  const before = await settle(page);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => window.scrollReel.calm);
  const after = await settle(page);
  expect('reduced-motion switch keeps position', Math.abs(after - before) < 1e-3, `t ${before.toFixed(3)} -> ${after.toFixed(3)}`);
  // Seam checks with a still idle: the bridge's last frame meets the home's first, and the wrap itself is invisible.
  const loopT = await page.evaluate(() => window.scrollReel.loopT);
  for (const [name, t] of [['bridge-end', loopT - 1e-3], ['home-leave', loopT]]) {
    await page.evaluate(t => window.scrollReel.drawFrame(t, 1), t);
    await page.screenshot({ path: `${OUT}/seam-${name}.png` });
  }
  expect('calm: bridge end meets the home', psnr(`${OUT}/seam-bridge-end.png`, `${OUT}/seam-home-leave.png`) >= 40);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await settle(page);
  await page.screenshot({ path: `${OUT}/seam-top.png` });
  await scrollToLabel(page, 'loop');
  await page.waitForFunction(() => scrollY === 0); // scrollend wraps it
  await settle(page);
  await page.screenshot({ path: `${OUT}/seam-wrapped.png` });
  expect('calm: the wrap is invisible', psnr(`${OUT}/seam-top.png`, `${OUT}/seam-wrapped.png`) >= 40);

  for (const t of CALM_TIMES) {
    await page.evaluate(t => window.scrollReel.render(t), t);
    await page.screenshot({ path: `${OUT}/calm-${t.toFixed(2)}.png` });
  }

  // Calm contract: rail jumps cut (c3 → c4 would crawl otherwise), the home frame is still, cinema hides the cover.
  const calmJump = await page.evaluate(() => new Promise(done => {
    document.querySelector('.rail button[data-i="4"]').click();
    let frames = 0;
    const tick = () => (window.scrollReel.t === window.scrollReel.heroes[4] || ++frames > 60 ? done(frames) : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }));
  expect('calm: rail jump cuts', calmJump <= 4, `${calmJump} frames`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await settle(page);
  await page.screenshot({ path: `${OUT}/calm-home-a.png` });
  await wait(600);
  await page.screenshot({ path: `${OUT}/calm-home-b.png` });
  expect('calm: home frame is still', psnr(`${OUT}/calm-home-a.png`, `${OUT}/calm-home-b.png`) >= 60);
  await page.click('.cover .cta-watch');
  await page.waitForFunction(() => window.scrollReel.cinema);
  const hidden = await page.evaluate(() => getComputedStyle(document.querySelector('.cover h1')).visibility === 'hidden' && document.querySelector('.cover').inert);
  expect('calm: cinema hides and disables the cover', hidden);
  await page.keyboard.press('Escape');
} finally {
  if (errors.length) console.log('\npage errors:\n' + errors.join('\n')); // before close: also shown when a step throws
  await browser.close();
  server.httpServer.close();
}

console.log(`\nscreenshots → ${OUT}`);
process.exit(hasFailed() || errors.length ? 1 : 0);
