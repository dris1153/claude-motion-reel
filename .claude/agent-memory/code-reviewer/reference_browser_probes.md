---
name: reference-browser-probes
description: How to run throwaway puppeteer probes against the scroll site from the session scratchpad (bare imports don't resolve outside the repo)
metadata:
  type: reference
---

Throwaway probes must live in the session scratchpad/OS temp, never in the repo's src/ or scripts/ (caller requirement).

- Bare `import 'puppeteer-core'` fails outside the repo; import via absolute file URLs into the pnpm store:
  `file:///D:/Workspace/Personal/Webs/motion-zai/node_modules/.pnpm/puppeteer-core@<ver>/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js`
  and `.../.pnpm/vite@<ver>/node_modules/vite/dist/node/index.js` (use `preview({ root: <repo>, preview: { port: 4179 } })`, a port other than QA's 4173).
- Probes hit `dist/` — check dist is newer than src first, or run `pnpm build`.
- Page hooks: `window.scrollReel` (`t`, `target`, `engine.tl.scrollTrigger`, `calm`, `cinema`, `cinemaTime`).
- Reduced motion: `page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])` before `goto`.
- `pnpm parity` (export guard) only writes out/frames; safe to run during review.
- Simplest imports: `createRequire(ROOT + '/package.json')` then `import(pathToFileURL(req.resolve('puppeteer-core')))` / `'vite'`.
- Lenis (since 260925): `window.scrollReel.smooth.lenis` (null when calm); ScrollTrigger class for `addEventListener('refresh')` = `engine.tl.scrollTrigger.constructor`.
- Touch paths in headless: dispatch synthetic `new TouchEvent('touchmove', { touches, targetTouches: [new Touch({...})] })` on body; Lenis reacts. Scrollbars/real touch-scroll can't be simulated — use `scrollBy` for the native part.
- Width-only `setViewport` changes are a distinct refresh path from height changes (QA only covers height).
- Puppeteer `mouse.wheel({ deltaY })` arrives divided by DPR (−120 at DPR 2 → −60 in the page). Double deltas for real-notch tests.
- Validating a proposed fix: copy index.html+src+fonts+package.json to `out/<tmp>/`, patch, `../../node_modules/.bin/vite build`, preview with `root` = that dir; full QA runs there via `node ../../scripts/qa-scroll.mjs` (cwd = copy). Delete the copy after.
- The dev may edit src mid-review: re-check mtimes vs dist before trusting probe results.
- Loop (260925): `window.scrollReel.drawFrame(t, intro)`, `loopT`; `engine.labelScroll('loop')` is fractional → compare scroll offsets with 1px tolerance.

Related: [[project-export-parity-constraint]]
