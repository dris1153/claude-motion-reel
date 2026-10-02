---
title: "Lenis smooth scroll for the scroll site"
status: completed
priority: P2
effort: "3h"
mode: fast
created: 2026-09-25
source: ../reports/brainstorm-260925-lenis-smooth-scroll.md
blockedBy: []
blocks: []
---

# Lenis smooth scroll

Add Lenis 1.3.x smooth scrolling (lerp 0.1, native touch) under the existing ScrollTrigger + playhead stack. Directional snap moves from ScrollTrigger to Lenis. Every programmatic scroll goes through one module. No Lenis under reduced motion.

Web layer only. Builds on the completed `260925-1759-home-cover-and-pacing`. Rationale: [brainstorm report](../reports/brainstorm-260925-lenis-smooth-scroll.md).

## Hard constraint
- `pnpm qa`: all 28 checks (including 5 new wheel + snap + resize tests) verified twice OK.
- `pnpm parity`: 8/8 (export untouched).

## Phases
| # | Phase | Status | Effort | Depends |
|---|---|---|---|---|
| 01 | [Smooth-scroll module + scroll routing](phase-01-smooth-scroll-module-and-routing.md) | completed | 1.25h | — |
| 02 | [Snap via Lenis](phase-02-snap-via-lenis.md) | completed | 1h | 01 |
| 03 | [QA: wheel checks + regression](phase-03-qa-wheel-checks-and-regression.md) | completed | 0.75h | 02 |

## Key numbers
- `lerp 0.1`, `syncTouch false`
- Playhead `SETTLE` 0.05s
- Snap after `isScrolling === false` + 200ms idle
- Snap duration `clamp(0.4, 0.9)`s by distance, `quad in/out` (GSAP `power1.inOut`)

## Verified Lenis 1.3.26 API (from its d.ts)
- Options: `lerp`, `duration`, `easing`, `syncTouch`, `autoRaf`, `anchors`, `autoToggle`
- Methods: `raf(time)`, `scrollTo(target, { immediate, lock, duration, easing, lerp, onComplete, force, userData })`, `start()`, `stop()`, `destroy()`
- State: `isScrolling` (false | 'native' | 'smooth'), `isStopped`, `direction` (1 | −1 | 0), `velocity`, `targetScroll`, `actualScroll`
- Event: `on('scroll', fn)`
- CSS: `lenis/dist/lenis.css`

## Files
- New: `src/smooth-scroll.js`
- Changed: `src/scroll-engine.js`, `src/scroll-main.js`, `src/cinema-mode.js` (lock via callbacks), `src/playhead.js`, `scripts/qa-scroll.mjs`, `scripts/qa-helpers.mjs`, `package.json` (lenis dep)

## Unresolved
- Real-device touch behavior (no touchscreen in QA environment).
- Product decision: Lenis adds non-passive touch listeners even with `syncTouch: false`. Skipping Lenis on touch-only devices would also drop touch snap; requires user feedback.
- Chrome scrollbar-thumb pointer events unverified in headless testing.

## Out of scope
Smoothing touch input, Lenis snap plugin, anchor links.
