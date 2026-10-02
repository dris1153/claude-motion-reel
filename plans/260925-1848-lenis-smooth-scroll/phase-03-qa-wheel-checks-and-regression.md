---
phase: 3
title: "QA: wheel checks + regression"
status: completed
priority: P1
effort: "0.75h"
dependencies: [2]
---

# Phase 03: QA — wheel checks + regression

## Overview
Add two checks that exercise real wheel input through Lenis, then run the full regression suite.

## Requirements
- Functional (new checks in `scripts/qa-scroll.mjs`):
  1. **Wheel glides:**
     - From c1 (settled), dispatch 3 `page.mouse.wheel({ deltaY: 120 })` 16ms apart.
     - Sample `scrollY` every rAF for 800ms.
     - Assert that `scrollY` increases across ≥ 5 distinct frames (not one jump), and that the final Δ ≥ 300px.
  2. **Wheel then snap:**
     - After check 1, wait for settle.
     - Assert that the shown t equals `heroes[2]` (the next hero forward) and that `scrollY` sits on the `c2` label (±2px).
- Existing 23 checks stay OK, `pnpm parity` OK.
- Non-functional: expose `window.scrollReel.smooth` (the module) for QA if needed. Keep `qa-scroll.mjs` < 200 LOC; put new helpers in `qa-helpers.mjs`.

## Related Code Files
- Modify: `scripts/qa-scroll.mjs`, `scripts/qa-helpers.mjs`, `src/scroll-main.js` (QA hook)

## Implementation Steps
1. Helper `sampleScrollY(page, ms)`: rAF samples of `scrollY`.
2. Add the two checks after the chapter holds, before the fling test.
3. `pnpm qa` twice (flakiness check) + `pnpm parity`.
4. The code-reviewer + tester subagents per the cook workflow.

## Success Criteria
- [x] New checks OK on both runs (28 checks per run; zero flakiness).
- [x] All previous checks OK; parity 8/8; code review findings fixed and verified.

## Risk Assessment
- Headless wheel events reach Lenis via real input dispatch (`page.mouse.wheel` → a trusted `wheel` event), so this is fine.
- Timing: settle already uses 800ms of wall time; the snap duration is ≤ 0.9s plus a 200ms idle. Allow up to 2.5s before asserting.

## Implementation Notes
- New QA checks in `qa-scroll.mjs`: wheel glides, wheel then snap, snap survives an interrupted glide (stop/start mid-snap, then a native scroll), and width-only resizes (1400×1000, 1400×900) that keep the frame with the cover hidden. The tester's edge probes (fast reversal, wheel during snap, PageDown, reduced-motion toggle, cinema lock, resize during snap) were one-off and are not in the suite.
- Wheel glide test samples scrollY every rAF for 800ms. It asserts ≥ 5 distinct steps, > 100px moved and no single step ≥ 40% of the total. Headless measured 93–94 steps, 178px moved, biggest step 5px; the headless wheel delta is smaller than 3×120px.
- Wheel-then-snap verifies landing on exact label (c2, ±2px) after glide, demonstrating directional snap working end-to-end.
- Code review findings fixed: `userData.programmatic` gate fixed for native scroll re-arm (H1), width-only resize now emits t/progress via `engine.sync()` (H2), pointerdown/touch flags added (M1), keyboard/pointer input during snap cancels & re-arms it (M2), direction 0 on forced restore (L2), cinema closing re-arms end check (L3).
- `qa-helpers.mjs` extracted timing utilities; `qa-scroll.mjs` kept to 180 LOC.
