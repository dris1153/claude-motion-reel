---
phase: 2
title: "Snap via Lenis"
status: completed
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 02: Snap via Lenis

## Overview
Take snapping away from ScrollTrigger, which would fight Lenis over the scroll position. When scrolling ends, compute the existing directional target and glide there with `lenis.scrollTo`.

## Requirements
- Functional: after the scroll ends (Lenis `isScrolling === false`, then 200ms idle), snap to the next label in the last scroll direction (`top`, `c0..c7`, `end`). Skip when already within 1px.
- Functional: snap duration `clamp(0.4, 0.9)`s, scaled by distance (0.9s at ≥ 1 viewport); easing power2.inOut (`t => t < .5 ? 2*t*t : 1 - (-2*t+2)**2/2`).
- Functional: no snap in calm (Lenis off), none while cinema is open, and none while a programmatic scroll is running.
- Non-functional: no ScrollTrigger `snap` option left in the engine.

## Architecture
- `scroll-engine.js`:
  - Remove `snap` from the ScrollTrigger vars.
  - Export `snapScroll(direction)`: from the live progress, `snapLabels(progress, direction)` → returns the target scrollY, or `null` if it is within 1px:
```js
snapScroll(direction) {
  const st = tl.scrollTrigger, p = snapLabels(st.progress, direction);
  const y = st.start + p * (st.end - st.start);
  return Math.abs(y - scrollY) > 1 ? y : null;
}
```
- `smooth-scroll.js`:
  - Add `onScrollEnd(fn)`. Inside Lenis's `scroll` handler, remember `lenis.direction` when it is non-zero, and restart a 200ms timer.
  - When the timer fires and `lenis.isScrolling === false` and `!lenis.isStopped`, call `fn(direction)`; otherwise re-arm the timer.
  - Programmatic `scrollTo` calls made by snap itself also emit scroll; once snap arrives the target is within 1px, so the loop ends.
- `scroll-main.js`:
```js
smooth.onScrollEnd(dir => {
  if (cinema.active) return;
  const y = engine.snapScroll(dir);
  if (y !== null) smooth.scrollTo(y, { duration: clamp(0.4, 0.9, Math.abs(y - scrollY) / innerHeight * 0.9), easing: inOutQuad });
});
```
- Rail jumps use `immediate` and land exactly on labels, so there is no follow-up snap.
- Remove the snap-killing `onOpen` code from the previous plan. `smooth.stop()` in cinema halts any Lenis animation, including a snap.

## Related Code Files
- Modify: `src/scroll-engine.js`, `src/smooth-scroll.js`, `src/scroll-main.js`

## Implementation Steps
1. Engine: drop `snap`, add `snapScroll(direction)`.
2. smooth-scroll: `onScrollEnd` with direction tracking and the idle gate.
3. scroll-main: wire snap; clean up the old snap-kill in cinema `onOpen`.
4. Manual feel check in `pnpm dev`: wheel a few notches mid-chapter, release, and it should glide to the next hero; wheel back, and it should glide to the previous one.

## Success Criteria
- [x] After wheel input stops, the page glides to the next hero in the scroll direction and never jitters or fights.
- [x] Long trackpad momentum doesn't trigger an early snap.
- [x] Calm: no snap. Cinema: no snap while open.
- [x] Existing QA holds and fwd/bwd checks still pass (instant jumps land exactly on labels).

## Risk Assessment
- On native scroll (touch devices, scrollbar drag) Lenis still emits `scroll`, with `isScrolling === 'native'` during it, so the same gate works. The touch snap feel is unverified; there is no device in QA.
- Directional ambiguity after a snap animation: the direction comes only from user-driven frames. Ignore scroll events while our own `scrollTo` is running by setting a `snapping` flag, cleared in `onComplete`.

## Implementation Notes
- ScrollTrigger `snap` option removed; snap computation moved to `engine.snapScroll(direction)` returning target scrollY or null if within 1px.
- Scroll end detection: awaits `isScrolling === false` + 200ms idle + not touching + no pointerdown; treats native scroll as moving only when velocity ≠ 0.
- Snap animation: `duration` clamped to [0.4, 0.9]s scaled by distance; easing `quad in/out` (GSAP `power1.inOut`).
- Keyboard or pointer input during our snap cancels it (`stop(); start()`), and the input then scrolls natively and re-arms snap. Our own frames are recognised by Lenis `userData.programmatic`, ignored only while `isScrolling !== 'native'` (a native scroll after an interrupted snap re-arms normally). There is no separate `snapping` flag.
- After forced restore, next settle snaps to nearest label (direction 0), matching pre-Lenis behavior.
