# Code review — infinite scroll loop (condensed) + resolution

The reviewer read the code and the Lenis/ScrollTrigger sources, and confirmed each finding with puppeteer probes. After the fixes: `pnpm qa` 35/35 on two runs (5 loop checks, 2 of them new from this review), `pnpm parity` 8/8.

Found and fixed during implementation, before the review finished:
- Keyboard End wrapped and then snapped on to c0 instead of settling home. Cause: a native scroll's final emit arrives with `isScrolling === false`, so it took the glide-wrap path, which doesn't apply the nearest-label settle.
- The QA `settle` now waits for both t and scrollY to be stable.

| ID | Finding | Resolution |
|---|---|---|
| H1 | Backward wrap undid itself unless Lenis was at rest at 0: the forward listener re-wrapped the still-running upward glide and dropped the rest of it | Fixed. The forward wrap ignores upward glides (`targetScroll < animatedScroll`), and the backward jump restores the pending glide target (`L + oldTarget`). QA: "down-then-up at the home still loops back" |
| H2 | The forward wrap missed at ~60% of viewport heights: the loop point is fractional and the browser rounds the scroll offset down | Fixed. 1px tolerance (`EPS`) on all three wrap paths, with offsets clamped at 0. QA: "fractional loop point (1600x901) still wraps" |
| H3 | The bridge was cut short: a snap reaches the loop point in ≤ 0.9s, but the 1.25× crawl needs ~1.12s, so the wrap cut at t≈15.27 (launch and ball drop never shown; cover over bridge-A frames) | Fixed. The playhead follows the scroll directly inside the bridge (`t ≥ END_T && target ≥ END_T`). QA asserts the peak shown t reaches LOOP_T before the wrap |
| M4 | Backward jump clamped by `lenis.limit` when gliding more than 0.6vh below the top → wrong frame, then a bounce | Fixed. The jump is skipped when `L + animatedScroll > limit` (the page clamps at 0 this time) |
| M5 | Ctrl+wheel (pinch-zoom) at the home jumped to the loop point | Fixed: `ctrlKey` is ignored |
| M6 | The rail fill jumped 0.977 → 0 at every wrap | Fixed. `engine.railFill(p)`: fills through reel + bridge A, drains during bridge B, and the buffer mirrors the top |
| L7 | Backward loop played the end-card cue as "forward" | Fixed: the SFX direction now comes from the change in shown t |
| L8 | Vignette popped at both bridge edges (`renderBridge` drew no HUD) | Fixed. `renderBridge` calls `drawHud` past the end; only the vignette draws |
| L9 | A fling up can jump while the playhead is still in scene 0 → cut to the home | Accepted |
| L10 | Calm on browsers without `scrollend` never looped | Fixed: debounced `scroll` fallback |
| L11 | A stray upward trackpad delta at the home looped back | Fixed: a 30px accumulated upward dead-zone (300ms window) |
| note | `labelToScroll` per frame can trigger a refresh | Fixed: `engine.loopScroll()` computes from `start`/`end` directly |

Housekeeping: the review/test subagents created `.claude/agent-memory/` in the project (their notes); left in place.
