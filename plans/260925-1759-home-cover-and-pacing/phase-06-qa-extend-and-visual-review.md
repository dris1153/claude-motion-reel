---
phase: 6
title: "QA: extend checks + visual review"
status: completed
priority: P1
effort: "1h"
dependencies: [3, 4, 5]
---

# Phase 06: QA — extend checks + visual review

## Overview
Extend `scripts/qa-scroll.mjs` so the new behaviour can't silently regress. Then review screenshots and settle the chapter-06 caption question.

## Requirements
- Functional, new checks (each prints OK/FAIL, and any FAIL makes the exit code non-zero):
  1. **Home alive:**
     - after load, `scrollY 0`, shown t 0;
     - two screenshots 300ms apart differ (idle is animating);
     - the cover `<h1>` is visible (computed opacity > 0.9 after 1.5s).
  2. **Intro exit:** scroll to 1 viewport, settle, then check the cover has `visibility: hidden` and t ≥ 0.
  3. **Holds:** at each `c{i}`, shown t === `HEROES[i]` (± 1e-3) and exactly one `.caption.is-visible` with `data-i = i`.
  4. **Speed cap:** from `c1`, instant scroll +2 viewports; sample `scrollReel.t` every rAF for 1.5s; assert max Δt/Δreal ≤ 1.3.
  5. **Jump cut:** rail `c0 → c7`; shown t reaches `HEROES[7]` within 3 frames.
  6. **Cinema:**
     - click Watch, wait 2.5s, t advanced 1.5–3.0s;
     - Esc → back to the prior t within 2 frames;
     - `html` has no `cinema` class.
- Existing checks stay: fwd/bwd match, resize keep, reduced-motion keep, calm stills, perf table.
- Non-functional: script < 250 LOC. If it grows past that, move the check helpers into `scripts/qa-helpers.mjs`.

## Related Code Files
- Modify: `scripts/qa-scroll.mjs`
- Read: `src/scroll-main.js` (the `window.scrollReel` hooks: `t`, `target`, `engine`, `calm`, `cinema`)

## Implementation Steps
1. Extend the `window.scrollReel` hook: `t`, `target`, `cinema` (active flag).
2. Add the checks above.
3. `pnpm qa` headless + `HEADED=1 pnpm qa` for the perf table; `pnpm parity`.
4. Contact sheet: home (t=0 at 3 idle moments), intro exit at 0.3/0.7/1.0, 8 hero frames with captions. Review them visually and fix any overlaps; record the chapter-06 caption decision.
5. Manual pass in a real browser (trackpad fling, mouse wheel, sound, cinema, reduced motion via DevTools rendering panel). Record the notes in the phase file.

## Success Criteria
- [x] All `pnpm qa` checks OK headless; the headed perf table recorded.
- [x] `pnpm parity` OK.
- [x] Visual review done; no caption or cover overlap on focal content.
- [x] Manual pass notes recorded (or explicitly deferred to the user).

## Implementation Notes
- `qa-scroll.mjs` extended with 6 new checks: home alive, intro exit, holds (t and caption visibility), speed cap, jump cut, and cinema mode; all checks pass headless (23/23 OK).
- New `qa-helpers.mjs` module created to keep QA script under 250 LOC.
- Draw perf: p95 ≤ ~2 ms; frame p95 10–30 ms (montage heaviest); measurements from both headless and headed runs.
- Manual real-browser testing (trackpad fling, Safari/iOS audio) deferred to the user as noted in plan Unresolved.

## Risk Assessment
- Timing-based checks (speed cap, cinema advance) are flaky under headless CPU load. Use generous bounds, and compute from `performance.now()` deltas, not frame counts.
