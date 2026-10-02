# Brainstorm — Lenis smooth scroll on the scroll site

Date: 2026-09-25 · Status: approved · Builds on: `plans/260925-1759-home-cover-and-pacing/` (completed)

## Problem
Add smooth scrolling with Lenis. Canvas frames are already smoothed by the playhead (eased chase, ≤1.25×), so the visible gain is in:
- the scroll-driven DOM: cover exit, rail fill;
- snap feel;
- stepped Windows mouse-wheel input (~100px notches).

Trackpad and macOS are already smooth.

## Decisions (user)
- Snap: keep directional snap (current logic), executed by `lenis.scrollTo` on scroll end.
- Feel: lerp 0.1 (Lenis default). Playhead `SETTLE` 0.12 → 0.05s to avoid double smoothing.
- Touch: native (`syncTouch` off).
- Reduced motion: no Lenis (native scroll, no snap), toggled live.

## Risks if bolted on naively
1. Double smoothing: Lenis lerp + playhead ease feel floaty.
2. ScrollTrigger snap and Lenis both drive the scroll and fight → move snap to Lenis.
3. Native programmatic scrolls (rail, refresh restore) get overridden by Lenis's stale target mid-animation → route them through Lenis.
4. Cinema scroll lock needs `lenis.stop()` / `start()`.
5. The QA fling uses an instant scroll, which bypasses Lenis → add a wheel test.

## Options considered (snap)
| Option | Pro | Con |
|---|---|---|
| **Directional snap via lenis.scrollTo (chosen)** | same behaviour as now, smoother | ~25 LOC idle detection |
| lenis/snap plugin | least code | nearest-point snap, pulls the viewer backward after passing a chapter |
| No snap | simplest | can rest mid-transition |

## Final design
1. `src/smooth-scroll.js` (~60 LOC). `createSmoothScroll({ enabled })`:
   - `new Lenis({ lerp: 0.1 })`, touch native.
   - `lenis.on('scroll', ScrollTrigger.update)`; `gsap.ticker.add(t => lenis.raf(t * 1000))`; `gsap.ticker.lagSmoothing(0)`.
   - Import `lenis/dist/lenis.css`.
   - API: `scrollTo(y, { immediate, force, duration, easing })`, `stop()`, `start()`, `setEnabled(bool)` (destroy / recreate on reduced-motion change, keeping the position). Falls back to `window.scrollTo` when disabled.
2. Snap:
   - Remove ScrollTrigger `snap` from `scroll-engine.js`; the engine exports `snapTarget(progress, direction)` (the existing snapDirectional over labels).
   - On Lenis scroll end (`isScrolling === false`, then a 200ms idle debounce), compute the target. If it is more than 1px away: `lenis.scrollTo(y, { duration: clamp(0.4, 0.9 by distance), easing: power2.inOut })`.
   - Disabled in calm and in cinema.
3. Programmatic scrolls go through the module:
   - rail / "Scroll to play": `immediate`;
   - refresh restore: `immediate + force`;
   - cinema: `stop` on open and `start` on close, and cancel any pending snap.
4. `playhead.js`: `SETTLE` 0.12 → 0.05. `MAX_RATE`, `JUMP_GAP` unchanged.
5. QA additions:
   - Wheel smoothness: 3 `page.mouse.wheel` notches → `scrollY` rises over ≥ 5 frames.
   - Wheel then idle: the snap lands on the next hero in the scroll direction.
   - All 23 existing checks still pass; `pnpm parity` unchanged.

## Risks
- Scroll-end detection with long trackpad momentum. Mitigation: `isScrolling === false` is the primary gate, plus a short debounce.
- ScrollTrigger refresh while Lenis is animating. Mitigation: restore with `force: true`.
- Bundle +~4KB gzip.

## Success criteria
- Mouse wheel scrolling glides; the cover exit and rail fill move smoothly.
- Stopping mid-chapter settles on the next hero in the direction of travel, with no fight or jitter.
- Rail, cinema and resize behaviour are unchanged; calm keeps native scroll with no snap.
- `pnpm qa` all OK (including the new wheel checks); `pnpm parity` OK.

## Next
`/ck:plan` from this report.
