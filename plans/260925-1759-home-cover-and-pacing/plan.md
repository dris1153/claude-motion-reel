---
title: "Home cover + calmer pacing for the scroll site"
status: completed
priority: P2
effort: "8h"
mode: fast
created: 2026-09-25
source: ../reports/brainstorm-260925-home-cover-and-pacing.md
blockedBy: []
blocks: []
---

# Home cover + calmer pacing

Goals:
- Fill the empty landing: a cover over an idle bouncing ball, plus a "watch with sound" cinema mode.
- Stop the reel feeling rushed: a speed-capped playhead, holds with captions at each hero frame, lower web intensity, and `PACE 1.2`.

Web layer only. Builds on the completed plan `260925-1656-scroll-driven-reel-web`. Rationale is in the [brainstorm report](../reports/brainstorm-260925-home-cover-and-pacing.md).

## Hard constraint
Export (`index.html`, `render.mjs`, mp4) must stay identical, checked with `pnpm parity`. New renderer knobs default to export behaviour: `intensity = 1`, and the idle/standby paths are only used by the site.

## Phases
| # | Phase | Status | Effort | Depends |
|---|---|---|---|---|
| 01 | [Playhead, intro zone, holds, snap](phase-01-playhead-intro-holds-snap.md) | completed | 2h | — |
| 02 | [Renderer hooks: intensity, idle, standby HUD](phase-02-renderer-intensity-idle-standby.md) | completed | 1.5h | 01 |
| 03 | [Home cover + idle wiring](phase-03-home-cover-and-idle-wiring.md) | completed | 1.5h | 02 |
| 04 | [Chapter captions](phase-04-chapter-captions.md) | completed | 1h | 01 |
| 05 | [Cinema mode (watch with sound)](phase-05-cinema-mode.md) | completed | 1h | 03 |
| 06 | [QA: extend checks + visual review](phase-06-qa-extend-and-visual-review.md) | completed | 1h | 03, 04, 05 |

## Key numbers
- `MAX_RATE 1.25` (reel-s per real-s)
- `JUMP_GAP 3s`
- `HOLD 0.7` viewport
- `INTRO 1` viewport
- `PACE 1.2`
- Snap duration `0.4–0.9s`, `power2.inOut`, delay `0.2`
- Web intensity `0.4`
- Total scroll ≈ 23 viewports

## Data flow (after)
```
scroll ─ ScrollTrigger(scrub:true) ─ tl ─ proxy.{intro,t} ─┬─ cover.exit(intro)            (DOM, scrubbed)
                                                           └─ playhead.set(t)
playhead (gsap.ticker, ≤1.25×, cut if gap > 3s) ─ shown t ─┬─ t == 0 → renderIdle(now, intro)
                                                           ├─ t > 0  → renderFrame(t)
                                                           ├─ scene change → rail + SFX
                                                           └─ in hold → caption i
cinema (opt-in) owns the canvas: audio clock → renderFrame; the playhead pauses rendering
```

## Files
- New: `src/playhead.js`, `src/home-cover.js`, `src/chapter-captions.js`, `src/cinema-mode.js`, `src/scene-00-idle.js`, `scripts/qa-helpers.mjs`
- Changed: `src/scroll-engine.js`, `src/scroll-main.js`, `src/timeline.js`, `src/hud-overlay.js`, `src/scene-01-bounce.js`, `src/scene-04-05-point-cloud.js`, `src/scene-08-end-card.js`, `scroll.html`, `scripts/qa-scroll.mjs`

## Out of scope
Changing reel scene timing, portrait layout, deploy.

## Unresolved
- Manual real-browser testing (trackpad fling feel, Safari/iOS audio playback) — headless QA and local testing with DevTools do not catch all UX nuances.
- L2 caption blink on browser resize — cosmetic, low priority.
- Caption height scaling on portrait-orientation phones — portrait layout is out of scope.
