// Loop checks for scripts/qa-scroll.mjs: forward wraps (label, wheel, fractional loop point) and backward wraps.
import { expect, settle, scrollToLabel, sampleShownTime } from './qa-helpers.mjs';

/** Waits for the page to settle, then returns [shown t, scrollY, c7 label offset]. */
async function settled(page) {
  await settle(page);
  return page.evaluate(() => [window.scrollReel.t, scrollY, window.scrollReel.engine.labelScroll('c7')]);
}

/** One notch on from a settled c7: the whole bridge must play (shown t reaches LOOP_T) and the page land home. */
async function wheelHome(page, name) {
  await scrollToLabel(page, 'c7');
  await settle(page);
  const sampling = sampleShownTime(page, '', 4000);
  await page.mouse.wheel({ deltaY: 120 });
  const peak = Math.max(...(await sampling).map(([, t]) => t));
  const [t, y] = await settled(page);
  const loopT = await page.evaluate(() => window.scrollReel.loopT);
  expect(name, t === 0 && y <= 2 && peak >= loopT - 1e-3, `t=${t} scrollY=${y} bridge peak t=${peak.toFixed(3)}`);
}

export async function loopChecks(page, heroes) {
  await scrollToLabel(page, 'loop');
  const [t0, y0] = await settled(page);
  const cover = await page.evaluate(() => Number(getComputedStyle(document.querySelector('.cover-block')).opacity));
  expect('loop point wraps to the home', t0 === 0 && y0 === 0 && cover > 0.9, `t=${t0} scrollY=${y0}`);

  await wheelHome(page, 'wheel from c7 plays the bridge and loops home');

  await page.mouse.wheel({ deltaY: -120 });
  const [tb, yb, c7] = await settled(page);
  expect('wheel up at the home loops back to c7', tb === heroes[7] && Math.abs(yb - c7) <= 2, `t=${tb} scrollY=${Math.round(yb)}`);

  // Backward while still gliding (a notch down, then quickly up) must not bounce back to the top.
  await scrollToLabel(page, 'top');
  await settle(page);
  await page.mouse.wheel({ deltaY: 120 });
  for (let k = 0; k < 3; k++) await page.mouse.wheel({ deltaY: -120 });
  const [tg, yg] = await settled(page);
  expect('down-then-up at the home still loops back', tg === heroes[7] && Math.abs(yg - c7) <= 2, `t=${tg} scrollY=${Math.round(yg)}`);

  // A viewport height whose loop point is fractional (the browser rounds the offset down) must still wrap.
  const vp = page.viewport();
  await page.setViewport({ ...vp, height: 901 });
  await settle(page);
  await wheelHome(page, 'fractional loop point (1600x901) still wraps');
  await page.setViewport(vp);
  await settle(page);
}
