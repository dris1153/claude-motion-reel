---
phase: 1
title: "Bridge render + scroll layout"
status: completed
priority: P1
effort: "1.75h"
completed: 2026-09-25
dependencies: []
---

# Phase 01: Bridge render + scroll layout

## Overview
Render bridge A: the end card dissolves, the spark morphs into the ball, and the ball launches off the top edge. Extend the scroll timeline with bridge A, bridge B (the intro reversed) and a duplicate-intro buffer after a `loop` label. Route `show(t)` so bridge-end and buffer frames are drawn as the home.

## Requirements
- Functional: `drawEndCard(ctx, lt, env, exit = 0)`. With `exit` ∈ (0, 1]:
  - Letters sink through the existing mask: y += `inCubic(prog(exit, i·0.04, 0.3 + i·0.04))` · (capH + 50).
  - Rule, credits, serif line and the AVAILABLE line fade: alpha × (1 − prog(exit, 0, 0.25)).
  - Spark:
    - shape `morph(spark → circle, inOutCubic(prog(exit, 0.2, 0.5)))`;
    - colour `mixHex(clay → bone, prog(exit, 0.3, 0.5))`;
    - radius → 44 (the ball R), extra spin `exit · 3` rad;
    - crouch squash (sy 0.7 / sx 1.2) over 0.5–0.62;
    - launch `outCubic(prog(exit, 0.62, 1)) · 700` px upward with vertical stretch, fully off-frame at exit = 1.
- Functional: `exit === 0` takes exactly today's code path (no morph buffer, no alpha multiply), so export parity holds.
- Functional:
  - `timeline.renderBridge(p)`: scale transform + `drawEndCard(main, END_T − 7·BAR, env, p)`, no HUD (the end card's HUD is already hidden).
  - Bridge A's last frame (an empty ink frame) equals bridge B's first (`renderIdle(now, 1)`: ball off-frame, floor alpha 0, HUD vis 0).
- Functional (engine):
  - after the last scene tail, add `fromTo t 14.6 → 15.8` (dur 1.2);
  - then `fromTo intro 1 → 0` (dur 1);
  - `addLabel('loop')`;
  - then `fromTo intro 0 → 0.6` (dur 0.6);
  - remove the `end` label;
  - export `END_T`, `LOOP_T`.
- Functional (main): `isHome = t => t === 0 || t >= LOOP_T`. `show(t)`:
  - home → `renderIdle`, scene −1, no caption;
  - `END_T < t < LOOP_T` → `renderBridge((t − END_T) / (LOOP_T − END_T))`;
  - else → `renderFrame`.

  The idle ticker uses `isHome(playhead.t)`.
- Copy: end caption "Keep scrolling to loop — or" + the Watch button.
- Non-functional: `scene-08-end-card.js` < 150 LOC; no allocation per frame (morph buffer module-level).

## Architecture
```
show(t) ─┬─ isHome(t)            → renderIdle(now, intro)   (top zone, bridge B, buffer)
         ├─ END_T < t < LOOP_T   → renderBridge(p)          (bridge A)
         └─ else                 → renderFrame(t)           (reel)
cover.setIntro(intro) is unchanged: bridge B drives intro 1 → 0, so the cover exit timeline plays backwards.
```

## Related Code Files
- Modify: `src/scene-08-end-card.js`, `src/timeline.js`, `src/scroll-engine.js`, `src/scroll-main.js`, `src/chapter-captions.js`

## Implementation Steps
1. Add the `exit` param to `drawEndCard` behind an `exit > 0` branch; run `pnpm parity` right away.
2. `renderBridge` in `timeline.js`.
3. Engine: bridge / intro-reverse / loop label / buffer segments; `total` grows by 2.8 vh.
4. Main: `isHome`, the `show` routing, the idle-ticker gate.
5. Caption copy.
6. `pnpm qa` (existing 28 must pass; `c7` is unchanged).

## Success Criteria
- [x] `pnpm parity` 8/8.
- [x] Scrolling slowly c7 → loop in `pnpm dev`: letters sink, the spark morphs into a white ball and launches, the ball drops back in at the home position with the floor line, HUD standby and cover returning.
- [x] Existing 28 QA checks OK.

## Risk Assessment
- The playhead crawls bridge A at ≤ 1.25× (1.2s of bridge "time"), which is fine. A snap from mid-bridge goes to `loop` (forward) or `c7` (backward).
- Two `intro` tweens in one timeline are sequential and non-overlapping; `fromTo` with explicit starts keeps reverse scrubbing correct.

## Implementation Notes
- `drawEndCard` branched on `exit > 0`: spark morphs to circle (inOutCubic), clay to bone color blend, squash/crouch 0.5–0.62, launch 700px upward with vertical stretch. Letters sink; credits fade. Exit=0 path identical to baseline (parity verified).
- `timeline.renderBridge(p)` draws the bridge via `drawEndCard` at END_T−7·BAR with exit progress `p`, applies scale transform, vignette drawn past frame end via `drawHud`.
- Engine timeline extended: bridge A (t 14.6→15.8, dur 1.2vh), bridge B intro reverse (1→0, dur 1vh), loop label, buffer (intro 0→0.6, dur 0.6vh). Exports END_T and LOOP_T.
- `scroll-main` added `isHome(t)` router, `drawFrame` conditional routing for bridge range, idle ticker gated by isHome. End caption updated to "Keep scrolling to loop — or".
- Playhead follows scroll directly inside bridge (END_T ≤ t) so animation plays in full before wrap, verified by peak shown-t reaching LOOP_T in QA.
