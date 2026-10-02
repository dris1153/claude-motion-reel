---
phase: 4
title: "Chapter captions"
status: completed
priority: P2
effort: "1h"
dependencies: [1]
---

# Phase 04: Chapter captions

## Overview
While the shown frame rests in a hold, a caption card explains the chapter:
- number;
- serif title;
- one sentence;
- 2–3 technique tags.

This gives the viewer pacing and context.

## Requirements
- Functional: caption `i` is visible while `|shownT − HEROES[i]| < 0.02`.
  - In: 0.5s `power2.out`, `y 12 → 0` + fade.
  - Out: 0.25s.
  - Only one caption at a time.
- Functional: the end card (08) gets a caption: "Scroll up to replay — or" plus a small `▶ Watch with sound` button (same handler as the cover CTA).
- Non-functional:
  - Card bottom-left inside `.frame`, above the HUD label.
  - Max width ≈ 22cqw; `cqw` type.
  - Ink backdrop at 80% + `backdrop-filter: blur(8px)`.
  - `aria-live="polite"` on the container so screen readers hear chapter changes.
  - Reduced motion: fade only.

## Architecture
`src/chapter-captions.js` (~70 LOC): `CAPTIONS` data + `createCaptions({ onWatch })` returns `update(shownT)`.
- Builds one `<article>` per caption inside `.frame .captions`; toggles the `is-visible` class via gsap.
- Imports `HEROES` from `scroll-engine.js`.

Copy (English, final):
| # | Title | Line | Tags |
|---|---|---|---|
| 01 | Timing & Physics | Gravity, contact, recovery — squash on impact, stretch with speed, value graph drawn live. | squash & stretch · arcs · value graph |
| 02 | Kinetic Type | One word per beat, each with its own move, ending in a zoom through the O. | masks · stagger · match cut |
| 03 | Shape Morph | Every shape sampled at the same 240 angles, so any two morph point-to-point without twisting. | polar resampling · overshoot · echo trails |
| 04 | Particle Systems | 2,646 points: a burst, a three-arm galaxy, then a dot-matrix wordmark. | staggered targets · spiral orbits · text sampling |
| 05 | 3D Space | No engine — rotation matrices and a perspective divide. Sphere, cube, torus, unwrapped. | projection · 3D morph · UV unwrap |
| 06 | Layout & Data | A 12-column bento blooms off the dot grid, counts up and reflows on the beat. | FLIP · mask reveals · easing curves |
| 07 | Rhythm & Edit | Recap cuts on 8ths then 16ths — any moment re-rendered on demand, because frames are functions. | cutting on the beat · RGB split · glitch |
| 08 | — | Scroll up to replay — or | (button) Watch with sound |

## Related Code Files
- Create: `src/chapter-captions.js`
- Modify: `scroll.html` (captions container + CSS), `src/scroll-main.js` (call `captions.update(t)` from the playhead's `onChange`)

## Implementation Steps
1. Container + CSS inside `.frame`.
2. Build the cards from data; `update(t)` finds the matching hero, else none; animate on change only.
3. Wire into the playhead `onChange`.
4. Check each hero screenshot: the caption must not cover the focal content. Chapter 06 is the known risk; pick the backdrop card, the other side, or no caption, and record the choice in plan.md Unresolved.

## Success Criteria
- [x] Resting at each label shows exactly its caption; scrolling away hides it within 0.25s.
- [x] Captions never flicker during a crawl (they only show when the playhead has settled on the hero).
- [x] End caption's Watch button opens cinema (after phase 05).

## Implementation Notes
- Chapter 06 intentionally has no caption — bento fills the frame and labels itself, resolving the original plan question about overlap.

## Risk Assessment
- The float compare on the hero time: the playhead snaps to the target at < 1e-4, so holds give an exact `HEROES[i]`. The tolerance of 0.02 covers it.
- Copy length at small frames: clamp the font size, allow 3 lines max, test at 800×450.
