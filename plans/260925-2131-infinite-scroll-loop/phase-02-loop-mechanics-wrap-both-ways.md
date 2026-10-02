---
phase: 2
title: "Loop mechanics (wrap both ways)"
status: completed
priority: P1
effort: "1.25h"
completed: 2026-09-25
dependencies: [1]
---

# Phase 02: Loop mechanics — wrap both ways

## Overview
Wrap the scroll position invisibly:
- Past `loop` → `scrollY − loopY`, keeping any Lenis momentum.
- Wheel up at the top → `loopY + scrollY`.

Native input (touch, keys, scrollbar) and calm wrap forward on scroll end only.

## Requirements
- Forward, Lenis gliding (`isScrolling === 'smooth'`), in the Lenis scroll handler:
  - when `animatedScroll ≥ loopY`: `rest = targetScroll − animatedScroll`, then `scrollTo(animatedScroll − loopY, { immediate, force })`;
  - if `rest > 0`, continue with `lenis.scrollTo(new + rest, { programmatic: false, lerp: 0.1 })`. This counts as user input, so snap still follows.
- Forward, native under Lenis (touch momentum, keys, scrollbar): in the scroll-end listener, before snap: if `scrollY ≥ loopY`, wrap and skip snap.
- Forward, calm (no Lenis): the native `scrollend` event → same wrap via `window.scrollTo`.
- Backward (Lenis, wheel only), Lenis `virtualScroll(data)`:
  - if `data.event.type === 'wheel' && data.deltaY < 0 && lenis.targetScroll + data.deltaY < 0` → `scrollTo(loopY + animatedScroll, { immediate, force })`;
  - return `true` so Lenis then applies the delta from the new position.
- The playhead cuts across the seam (gap > 3s), and both sides render the home, so the seam is invisible.
- Non-functional: `scroll-loop.js` < 70 LOC; `loopY` is resolved live via `engine.labelScroll('loop')` (it changes on refresh).

## Architecture
- `smooth-scroll.js`: `createSmoothScroll(enabled, { virtualScroll })`.
  - Pass `virtualScroll: data => hook?.(data, lenis) ?? true` into every Lenis instance, since `setEnabled` recreates it.
  - Add `onScroll(fn)` subscribers, called from the internal Lenis scroll handler.
  - Scroll-end listeners run in registration order and receive `(direction)`. The loop registers before snap and needs a way to veto it: `onScrollEnd` listeners may return `true` to stop propagation.
- `scroll-loop.js`: `createScrollLoop({ smooth, loopY: () => engine.labelScroll('loop') })` wires:
  - the forward smooth wrap (`smooth.onScroll`);
  - the native forward wrap (`smooth.onScrollEnd`, returns `true` when it wrapped);
  - the calm `scrollend` (`window.addEventListener('scrollend', …)`, only when `!smooth.lenis`);
  - the backward `virtualScroll` hook.
- `scroll-main.js`: create the loop right after the engine; register the loop's scroll-end before snap.

## Related Code Files
- Create: `src/scroll-loop.js`
- Modify: `src/smooth-scroll.js`, `src/scroll-main.js`

## Implementation Steps
1. smooth-scroll: `virtualScroll` passthrough, `onScroll` subscribers, `onScrollEnd` veto.
2. `scroll-loop.js` with the four paths.
3. Wire in scroll-main (order: loop scroll-end, then snap).
4. Manual check in `pnpm dev`:
   - hard wheel from c7 flows into the home with no stall;
   - wheel up at the home goes into bridge B, then snaps to c7;
   - keyboard End then scroll end → wraps home.

## Success Criteria
- [x] Continuous wheel from c7 reaches the home and keeps gliding into the intro (momentum carried).
- [x] Wheel up at the top reverses into the bridge and settles on c7.
- [x] Native/calm: stopping in the buffer wraps to the equivalent top position.

## Risk Assessment
- An immediate `scrollTo` during a Lenis glide resets its animation; the `rest` re-issue restores the glide. At most a one-frame velocity hiccup.
- A refresh happening mid-wrap: `force` re-measures first (existing behaviour).
- `virtualScroll` also sees touch events, so filter on `event.type === 'wheel'`.

## Implementation Notes
- `src/scroll-loop.js` implements forward wrap mid-Lenis-glide (downward only, 1px tolerance for fractional loop point), momentum carried. Native input wraps on scroll-end + `settleNearest` (keyboard End now settles home, not c0). Calm wrap on `scrollend` with debounced-scroll fallback.
- Backward wrap via Lenis `virtualScroll` hook (wheel only): ignores ctrl+wheel, skips while stopped, 30px accumulated upward dead-zone over 300ms, skipped if mirrored target exceeds lenis.limit.
- `smooth-scroll.js` extended with `onScroll` subscribers called from Lenis handler, `onVirtualScroll` hook passthrough, consumable `onScrollEnd` listeners supporting veto-propagation (`return true`), and `settleNearest()` helper.
- SFX direction now derived from shown-t change (not direction of input), fixing backward loop audio.
- Forward wrap in Lenis path: samples `rest = targetScroll − animatedScroll`, applies immediate wrap to `animatedScroll − loopY`, then re-issues the remaining distance as a user-like glide (`programmatic: false`, lerp 0.1), which keeps the momentum and lets snap follow as usual.
