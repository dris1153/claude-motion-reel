---
phase: 3
title: "Home cover + idle wiring"
status: completed
priority: P1
effort: "1.5h"
dependencies: [2]
---

# Phase 03: Home cover + idle wiring

## Overview
The DOM cover on the left of the frame:
- kicker, two-part title, meta line, two CTAs;
- a SplitText entrance on load;
- an exit scrubbed by `proxy.intro`.

The canvas runs the idle loop while the shown t is 0.

## Requirements
- Functional: static markup in `scroll.html` (real `<h1>`, crawlable):
  - kicker `MOTION REEL — 2026`;
  - title **Every frame,** (Unbounded 900) / *a function of time.* (Instrument Serif italic);
  - meta `15s · 7 chapters · 2,646 points · 0 keyframes`;
  - CTAs `Scroll to play ↓` (scrolls to `c0`) and `▶ Watch with sound · 15s` (opens cinema, phase 05; stub until then).
- Functional: entrance with `SplitText.create(h1, { type: 'lines', mask: 'lines', autoSplit: true, onSplit })`:
  - lines `yPercent: 110 → 0`, 1s, `power3.out`, stagger 0.08;
  - kicker, meta and CTAs `y 16 → 0` plus fade, staggered after.
- Functional: exit is a paused timeline, `progress = intro`:
  - lines `y: -40`, `autoAlpha: 0`, stagger;
  - `visibility: hidden` at intro 1 (out of the a11y tree).
- Functional: idle loop through `gsap.ticker`: when the shown t is 0 and cinema is not open, run `renderIdle(time, intro)` every tick; otherwise do nothing.
- Non-functional:
  - The cover scales with the frame: `.frame { container-type: inline-size }`, type in `cqw`.
  - The CTAs are `<a>` / `<button>` with focus-visible styles and `cursor: pointer`.
  - Reduced motion: the entrance is a 0.4s fade only.

## Architecture
- `scroll.html`:
  - Wrap the canvas in `<div class="frame">`. It takes the canvas's letterboxed box: `width: min(100%, calc(100svh*16/9))`, `aspect-ratio: 16/9`, `position: relative`. The canvas fills it.
  - Cover and captions (phase 04) are absolutely positioned inside `.frame`.
  - The rail and the sound pill stay fixed to the viewport.
- `src/home-cover.js` (~60 LOC): `createCover({ onScrollToPlay, onWatch, calm })`. Returns:
  - `setIntro(p)`: exit timeline progress + hint;
  - `show()`: the entrance, run once after boot. SplitText's `autoSplit` and `onSplit` handle font timing: return the tween from `onSplit` so re-splits revert cleanly.
- `scroll-main.js`:
  - the engine's `onIntro` → `cover.setIntro`;
  - the ticker idle loop;
  - the "Scroll" hint from the overlay is removed, since the cover CTA replaces it (delete the hint code/CSS).

## Related Code Files
- Create: `src/home-cover.js`
- Modify: `scroll.html` (frame wrapper, cover markup + CSS, remove hint CSS), `src/scroll-main.js`, `src/scroll-overlay.js` (drop the hint)

## Implementation Steps
1. Frame wrapper + CSS. Check the canvas size and position are unchanged (the QA fwd screenshots stay equivalent).
2. Cover markup + CSS (left column ≈ 44% of the frame, vertically centred, left padding matching the HUD margin of 76/1920 ≈ 4cqw).
3. `home-cover.js`: entrance + exit + CTA handlers.
4. Idle ticker in scroll-main; make sure the playhead's `onChange` and the idle loop never both draw in the same tick. Rule: the playhead draws only when t > 0, the idle loop only when t === 0.
5. Remove the hint from the overlay.

## Success Criteria
- [x] On load: the title lines rise in, the ball bounces, the HUD shows STANDBY. No black empty frame.
- [x] Scrolling from 0 to 1 viewport: the cover lifts out in sync, the ball crouches and exits the top, and the reel drop follows with no pop.
- [x] Scrolling back to the top: the cover returns, the idle resumes.
- [x] "Scroll to play" lands on c0; tabbing reaches both CTAs.
- [x] The frame wrapper doesn't shift the canvas (QA fwd frames still match the canvas area).

## Implementation Notes
- Cover markup remains static in `scroll.html`; "Scroll to play" is a `<button>` (not `<a>`) for proper semantics.
- `.cover` hidden until `html.cover-ready` class to prevent pre-JS flash.
- Calm entrance uses opacity-only animation with `clearProps` for clean state; old "SCROLL" overlay hint removed.
- Idle ticker redraws only when intro state changes (not every tick) to minimize CPU.

## Risk Assessment
- The cover overlaps the idle ball on narrow frames. The ball sits at x = 1340 (70%) and the cover spans 4–48%; check at the 800px viewport in QA.
- SplitText splits before fonts load → wrong line breaks. `autoSplit: true` re-splits on font load; the `onSplit`-returned tween handles the revert.
