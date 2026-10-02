// Shared helpers for scripts/qa-scroll.mjs.
import { spawnSync } from 'node:child_process';

let failed = false;
export const hasFailed = () => failed;

export function expect(name, ok, detail = '') {
  failed ||= !ok;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${detail}`);
}

/** Resolves once the shown reel time and the scroll position have both been stable for 800 ms of wall time (snap,
 * playhead and caption fades done). Both: t alone holds still across the loop bridge's intro stretch.
 * Wall time, not frames: headless rAF can run at ~200 Hz. */
export const settle = page =>
  page.evaluate(() => new Promise(done => {
    let last = NaN, lastY = NaN, since = performance.now();
    const tick = now => {
      const t = window.scrollReel.t;
      if (t !== last || scrollY !== lastY) (last = t), (lastY = scrollY), (since = now);
      if (now - since >= 800) done(t);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));

export const scrollToLabel = (page, label) =>
  page.evaluate(label => {
    const st = window.scrollReel.engine.tl.scrollTrigger;
    window.scrollTo({ top: st.labelToScroll(label), behavior: 'instant' });
  }, label);

export function psnr(a, b) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-filter_complex', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = r.stderr.match(/average:([0-9.]+|inf)/);
  return m ? (m[1] === 'inf' ? Infinity : Number(m[1])) : 0;
}

/** Samples [real ms, shown t] every rAF for `ms`, after running `kick` in the page. */
export const sampleShownTime = (page, kick, ms) =>
  page.evaluate((kick, ms) => new Promise(done => {
    const out = [], start = performance.now();
    new Function(kick)();
    const tick = now => {
      out.push([now, window.scrollReel.t]);
      if (now - start < ms) requestAnimationFrame(tick);
      else done(out);
    };
    requestAnimationFrame(tick);
  }), kick, ms);

/** Max reel-seconds per real-second over windows of at least 250 ms: a sample can read t one frame early or late
 * relative to the GSAP tick, so short windows overstate the rate. */
export function maxRate(samples) {
  let max = 0;
  for (let i = 0, j = 0; i < samples.length; i++) {
    while (j < samples.length && samples[j][0] - samples[i][0] < 250) j++;
    if (j >= samples.length) break;
    max = Math.max(max, Math.abs(samples[j][1] - samples[i][1]) / ((samples[j][0] - samples[i][0]) / 1000));
  }
  return max;
}

/** Starts sampling scrollY every rAF for `ms` (in the page) and returns the pending result. */
export const sampleScrollY = (page, ms) =>
  page.evaluate(ms => new Promise(done => {
    const out = [], start = performance.now();
    const tick = now => {
      out.push(scrollY);
      if (now - start < ms) requestAnimationFrame(tick);
      else done(out);
    };
    requestAnimationFrame(tick);
  }), ms);

/** Draw cost per scene, one frame per rAF (a tight loop queues unrasterized frames and stalls on flush). */
export async function printDrawTimes(page) {
  const times = await page.evaluate(() => new Promise(done => {
    const r = window.scrollReel, out = [];
    let f = 0, prev = performance.now();
    const step = now => {
      if (f > 0) out[f - 1].push(now - prev);
      prev = now;
      if (f >= 14.6 * 60) return r.render(r.t), done(out);
      const a = performance.now();
      r.render(Math.max(f, 1) / 60);
      out.push([Math.floor(f / 60 / 1.875), performance.now() - a]);
      f++;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  console.log('\nscene  draw p50/p95ms  frame p50/p95ms');
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))].toFixed(1);
  for (let s = 0; s < 8; s++) {
    const rows = times.filter(r => r[0] === s && r.length === 3);
    const draw = rows.map(r => r[1]).sort((a, b) => a - b), frame = rows.map(r => r[2]).sort((a, b) => a - b);
    console.log(`${s}      ${q(draw, 0.5)} / ${q(draw, 0.95)}        ${q(frame, 0.5)} / ${q(frame, 0.95)}`);
  }
}
