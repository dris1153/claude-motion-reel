---
title: "Infinite scroll loop (end → home, both directions)"
status: completed
priority: P2
effort: "4h"
mode: fast
created: 2026-09-25
completed: 2026-09-25
source: ../reports/brainstorm-260925-infinite-scroll-loop.md
verification: pnpm qa 35/35 (two runs); pnpm parity 8/8
blockedBy: []
blocks: []
---

# Infinite scroll loop

After the end card, a designed bridge (spark → ball → launch, then the intro played backwards) lands on a frame identical to the home. The scroll position then wraps to the top.

- Backward wrap from the top works for wheel/trackpad only (Lenis `virtualScroll`).
- Touch and calm loop forward only.
- Web layer only; export stays identical.

Rationale: [brainstorm report](../reports/brainstorm-260925-infinite-scroll-loop.md). Builds on the completed `260925-1848-lenis-smooth-scroll`.

## Hard constraint
- `pnpm parity`: 8/8. `drawEndCard(..., exit = 0)` must be byte-identical to today.
- `pnpm qa`: all 28 existing checks OK, plus the new loop checks.

## Phases
| # | Phase | Status | Effort | Depends |
|---|---|---|---|---|
| 01 | [Bridge render + scroll layout](phase-01-bridge-render-and-scroll-layout.md) | completed | 1.75h | — |
| 02 | [Loop mechanics (wrap both ways)](phase-02-loop-mechanics-wrap-both-ways.md) | completed | 1.25h | 01 |
| 03 | [QA: loop checks + regression](phase-03-qa-loop-checks-and-regression.md) | completed | 1h | 02 |

## Scroll layout (viewport units, PACE applied)
```
intro(1) │ scenes + holds … c7 hold │ end tail │ Bridge A (1.2) │ Bridge B (1) │ ◆loop │ buffer (0.6)
t: 0     │ 0 → 14.4 (hold) → 14.6   │          │ 14.6 → 15.8    │ 15.8 fixed   │       │ 15.8
intro: 0→1                                                        1 → 0               0 → 0.6
```
- The frame at `loop + x` equals the frame at `top + x` (same `renderIdle(now, intro)` and same cover state). That identity is what makes the wrap invisible.
- `END_T 14.6`, `LOOP_T 15.8`. Home is `t === 0 || t >= LOOP_T`.

## Files
- New: `src/scroll-loop.js`
- Changed:
  - `src/scene-08-end-card.js` (exit param)
  - `src/timeline.js` (`renderBridge`)
  - `src/scroll-engine.js` (bridge/buffer segments, `loop` label, export `END_T`/`LOOP_T`)
  - `src/scroll-main.js` (`isHome`, routing, loop wiring)
  - `src/smooth-scroll.js` (`virtualScroll` hook, `onScroll` subscribers)
  - `src/chapter-captions.js` (copy)
  - `scripts/qa-*.mjs`

## Out of scope
Hiding the scrollbar, a backward loop on touch or calm, a loop-crossing SFX cue.

## Unresolved (accepted)
- **Real-device touch:** Native forward wrap on touch not verified on physical devices (headless probe only).
- **Backward loop unavailable:** Backward wrap not available on touch or calm by design (wheel only).
- **Scrollbar thumb jump:** Scrollbar thumb jumps visibly at the wrap point (accepted cosmetic behavior).
- **L9 (fling edge case):** Fling up can cut from scene 0 to home if playhead still in scene 0 (accepted low-frequency edge case).
