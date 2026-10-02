---
phase: 3
title: "QA: loop checks + regression"
status: completed
priority: P1
effort: "1h"
completed: 2026-09-25
dependencies: [2]
---

# Phase 03: QA — loop checks + regression

## Overview
Add loop checks to `scripts/qa-scroll.mjs`, then run the full regression and the cook-workflow review/test subagents.

## Requirements
- New checks:
  1. **Forward wrap:** `scrollToLabel('loop')`, then wait for settle. Expect `scrollY === 0` (the loop label maps to top), t === 0 and the cover visible.
  2. **Wheel through the end:** from c7 (settled), wheel +12 notches (deltaY 120, 16ms apart), then settle. Expect t to be the home (0) or a hero, no page errors, and at least one wrap observed (`scrollY` sampled below `loopY − innerHeight` after it had been near the end).
  3. **Backward wrap:** at the top (settled), wheel −1 notch, then settle. Expect t === `heroes[7]` and scrollY on the `c7` label (±2px).
  4. **Seam is invisible (calm):** under reduced motion (static idle), screenshot the top, `scrollToLabel('loop')`, wait for the `scrollend` wrap, screenshot again → PSNR ≥ 40.
  5. **Bridge continuity (calm):** `render(LOOP_T − 1e-3)` (bridge A end) vs the home with `intro = 1`. Both are empty ink frames → PSNR ≥ 40. Needs a QA hook `scrollReel.renderHome(intro)`.
- All existing 28 checks pass, and `pnpm parity` passes 8/8.
- Non-functional: `qa-scroll.mjs` < 220 LOC (move helpers to `qa-helpers.mjs` if needed).

## Related Code Files
- Modify: `scripts/qa-scroll.mjs`, `scripts/qa-helpers.mjs`, `src/scroll-main.js` (QA hook)

## Implementation Steps
1. Add the checks (forward ones before the calm section, calm ones inside it).
2. `pnpm qa` twice + `pnpm parity`.
3. Code-reviewer + tester subagents; fix findings; re-run.

## Success Criteria
- [x] New loop checks OK on two runs; the existing 28 OK; parity 8/8.

## Risk Assessment
- Headless wheel deltas are smaller than real ones (178px moved for 3×120 in earlier runs), so use enough notches for check 2.
- `scrollend` support: Chrome 114+ (the QA browser is Chrome 153). Where `scrollend` is missing, calm users stop at the bottom without wrapping. That is acceptable; document it.

## Implementation Notes
- `scripts/qa-loop-checks.mjs` added: loop wraps to home, wheel from c7 crosses bridge and loops, wheel up at home loops to c7, down-then-up at home still loops, fractional loop point (1600×901) still wraps.
- The wheel-from-c7 checks also assert that the bridge plays in full: the peak shown t reaches LOOP_T before the wrap.
- In the calm section of `qa-scroll.mjs`: the bridge-end frame equals the idle home at intro 1 (PSNR ≥ 40), and the wrap itself is invisible (top vs just-wrapped screenshot, PSNR ≥ 40). Total: 35 checks.
- `settle` now waits for both t and scrollY to be stable (t alone holds still across bridge B). The keyboard End bug (wrap, then snap on to c0) was fixed in `scroll-loop.js`: native final emits go through the scroll-end path with `settleNearest`.
- Tester edge probes (one-off): visual bridge sheet, double loop, backward, End key, calm wrap, cinema blocks backward, resize in bridge B — all pass. Home key failed only in the tester's headless run. A separate headless probe that focuses the page first confirms Home scrolls to 0 with t = 0. Not checked in a real browser.
