---
phase: 1
title: "Smooth-scroll module + scroll routing"
status: completed
priority: P1
effort: "1.25h"
dependencies: []
---

# Phase 01: Smooth-scroll module + scroll routing

## Overview
One module owns scrolling. It runs Lenis when motion is allowed and falls back to native scrolling otherwise. Every programmatic scroll (rail, "Scroll to play", refresh restore, cinema lock) goes through it, so Lenis never animates back to a stale target.

## Requirements
- Functional:
  - Wheel input glides (lerp 0.1).
  - Touch stays native (`syncTouch: false`, the default).
  - ScrollTrigger updates on every Lenis frame.
  - Reduced motion → no Lenis instance. A live media change destroys or recreates it and keeps the scroll position.
- Functional:
  - Rail and "Scroll to play" jump instantly: `scrollTo(y, { immediate: true })`.
  - Refresh restore: `scrollTo(y, { immediate: true, force: true })`.
  - Cinema: `stop()` on open, `start()` on close.
- Non-functional:
  - Lenis is driven by `gsap.ticker` (`autoRaf: false`), so GSAP, ScrollTrigger and Lenis share one clock.
  - `gsap.ticker.lagSmoothing(0)`.
  - `lenis.css` imported.
  - Module < 80 LOC.

## Architecture
`src/smooth-scroll.js`:
```js
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function createSmoothScroll(enabled) {
  let lenis = null;
  const listeners = new Set();              // scroll-end subscribers (phase 02)
  const tick = time => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);              // Lenis needs real deltas; GSAP's lag smoothing would desync them
  const create = () => {
    lenis = new Lenis({ lerp: 0.1, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
  };
  const destroy = () => { lenis?.destroy(); lenis = null; };
  if (enabled) create();
  return {
    get lenis() { return lenis; },
    setEnabled(on) { const y = scrollY; destroy(); if (on) create(); window.scrollTo(0, y); },
    scrollTo(y, opts = {}) { lenis ? lenis.scrollTo(y, opts) : window.scrollTo({ top: y, behavior: 'instant' }); },
    stop() { lenis?.stop(); }, start() { lenis?.start(); },
  };
}
```
- `scroll-engine.js`: `scrollToChapter(i)` becomes `labelScroll(i)`, which returns the y; scroll-main calls `smooth.scrollTo(y, { immediate: true })`. The engine stays scroll-agnostic.
- `scroll-main.js`:
  - `const smooth = createSmoothScroll(!calm)`.
  - The reduced-motion change calls `smooth.setEnabled(!calm)`.
  - The refresh listener uses `smooth.scrollTo(..., { immediate: true, force: true })`.
  - Cinema: `onOpen` → `smooth.stop()`; add `onClose` → `smooth.start()`.
- `cinema-mode.js`: accept an `onClose` callback, called in `close()`.
- `playhead.js`: `SETTLE = 0.05`, with a comment that Lenis already eases the input.
- `html.cinema { overflow: hidden }` is kept for native scrolling (touch and calm).

## Related Code Files
- Create: `src/smooth-scroll.js`
- Modify: `src/scroll-engine.js`, `src/scroll-main.js`, `src/cinema-mode.js`, `src/playhead.js`, `package.json`

## Implementation Steps
1. `pnpm add lenis@^1.3.26`.
2. Write `smooth-scroll.js`.
3. Engine: replace `scrollToChapter` with `labelScroll(i)`; update the callers (rail, cover CTA).
4. scroll-main wiring: create, reduced-motion toggle, refresh restore, cinema stop/start.
5. Playhead `SETTLE` 0.05.
6. `pnpm qa`. Existing checks must pass: they use instant native scrolls, which Lenis adopts while idle.

## Success Criteria
- [x] Mouse wheel in the dev build glides; the cover exit and rail fill move smoothly.
- [x] Rail jumps are still instant; resize and reduced-motion keep the frame.
- [x] Cinema: the wheel does nothing while open; scrolling resumes after close.
- [x] `pnpm qa` 28/28 OK (23 baseline + 5 new), `pnpm parity` 8/8 OK.

## Risk Assessment
- Lenis and the ScrollTrigger pin: the standard integration (`on('scroll', ScrollTrigger.update)`, window scroller) works with pinning, and no scrollerProxy is needed for window scrolling.
- `lagSmoothing(0)` is global. Nothing else relies on GSAP's lag smoothing (the playhead clamps its own dt at 50ms).
- A destroy/create on a media change mid-animation could jump. Read `scrollY` first and restore it natively.

## Implementation Notes
- Lenis integrated into `smooth-scroll.js` with `lerp: 0.1` and `autoRaf: false`, using `gsap.ticker` for frame sync.
- API: `setEnabled`, `scrollTo({immediate, force, duration, easing})` with `userData.programmatic` flag, `stop`, `start` (re-arms scroll-end).
- `force` calls `lenis.resize()` to clear stale scroll limit before immediate scrolls; refresh restores use `immediate+force` then `engine.sync()` to re-emit intro/t/progress, fixing pre-existing width-only resize bug.
- Cinema mode wiring: `onOpen() → smooth.stop()`, `onClose() → smooth.start()` to lock wheel input and allow resumption.
- Playhead settle reduced from 0.12s to 0.05s; Lenis easing already applied on input.
