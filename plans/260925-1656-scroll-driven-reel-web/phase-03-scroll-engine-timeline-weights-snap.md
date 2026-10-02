---
phase: 3
title: "Scroll engine: timeline, weights, snap"
status: completed
priority: P1
effort: "2h"
dependencies: [2]
---

# Phase 03: Scroll engine — timeline, weights, snap

## Overview
Map scroll position to reel time with GSAP: one pinned stage, a timeline that tweens a proxy `t` scene by scene (each scene gets its own scroll length), labels at hero frames, directional snap, and resize handling (recompute DPR scale).

## Requirements
- Functional: scrolling forward/backward renders `renderFrame(t, 1)` at the mapped `t`; stops snap to nearest hero label in scroll direction.
- Functional: `prefers-reduced-motion` → `calm: true`, `scrub: true` (no smoothing lag).
- Non-functional: render only when `t` changed; no layout thrash in `onUpdate`.

## Architecture
`src/scroll-engine.js` exports `createScrollEngine({ canvas, onScene })`.

```js
const WEIGHTS = [1.5, 2, 1.5, 2, 2, 1.5, 2.5, 1];            // viewports per scene (SCENES order)
const HEROES = { physics: 1.2, type: 3.42, morph: 5.37, particles: 7.3,
                 space: 8.7, layout: 10.25, rhythm: 11.3, end: 14.4 }; // global t, tune by eye

const proxy = { t: 0 };
const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: draw,
  scrollTrigger: {
    trigger: '#stage', pin: true, start: 'top top',
    end: () => `+=${sum(WEIGHTS) * innerHeight}`,
    scrub: calm ? true : 0.6,
    snap: { snapTo: 'labelsDirectional', duration: { min: 0.2, max: 0.6 }, delay: 0.15, ease: 'power1.inOut' },
    invalidateOnRefresh: true,
  } });
SCENES.forEach((s, i) => tl.to(proxy, { t: SCENES[i + 1]?.at ?? DUR - 1 / FPS, duration: WEIGHTS[i] }));
// label position = scene start position + fraction of scene time × weight
for (const [name, t] of Object.entries(HEROES)) tl.addLabel(name, timeToPosition(t));
```
- `timeToPosition(t)`: find scene i, `pos = Σ WEIGHTS[<i] + (t - at_i) / (at_{i+1} - at_i) * WEIGHTS[i]`. Pure helper, also used by the rail in phase 04.
- `draw()`: `if (proxy.t !== last) renderFrame(proxy.t, 1)`; compute `sceneIndex(proxy.t)`; call `onScene(i, direction)` when index changes (direction from `tl.scrollTrigger.direction`).
- Last scene tween ends at `DUR - 1/FPS` so the final frame is the faded end card, not t=15 (out of range).
- Resize: debounced (150ms) `bootReel`-free re-init → `initTimeline(canvas, { scale: computeScale(), calm })` then `renderFrame(proxy.t)`. `computeScale = min(1.5, canvas.clientWidth * devicePixelRatio / W)`, rounded to 0.05.
- Reduced motion via `gsap.matchMedia()` with `'(prefers-reduced-motion: reduce)'` → build engine with `calm`.
- Keep `sceneIndex` exported from `timeline.js` (already is) — no duplicate scene table.

## Related Code Files
- Create: `src/scroll-engine.js`
- Modify: `src/scroll-main.js` (register ScrollTrigger, boot with computed scale, create engine, remove phase-02 query hack), `scroll.html` (stage markup/CSS if pin spacing needs a wrapper)

## Implementation Steps
1. `gsap.registerPlugin(ScrollTrigger)` in `scroll-main.js`; boot with `computeScale()`.
2. Implement `timeToPosition`, build timeline + labels, `draw` with dedupe.
3. Wire snap + `matchMedia` calm variant (kill/rebuild on media change — `matchMedia` handles revert).
4. Resize handler: re-init canvases at new scale; `ScrollTrigger.refresh()` handled by GSAP automatically.
5. Tune `HEROES` + `WEIGHTS` by eye: scroll each chapter slowly and fast; montage must not strobe at normal wheel speed.

## Success Criteria
- [x] Scroll top → bottom plays the whole reel; bottom → top reverses exactly (spot-check frames vs `index.html` player at same `t`).
- [x] Releasing scroll snaps to the chapter hero frame in scroll direction.
- [x] Wheel at normal speed through montage: individual cuts readable (≥ ~120px scroll per 16th cut).
- [x] Resizing window keeps canvas crisp and frame unchanged.
- [x] Emulated reduced motion: no smoothing lag, calm frames.

## Implementation Notes
- **No rebuild on calm toggle:** calm is now a live flag (`isCalm()`) instead of gsap.matchMedia rebuild; snap returns current progress when calm (no auto-scroll).
- **Snap behavior:** uses `ScrollTrigger.snapDirectional` over labels; `inertia: false` added to prevent velocity projection overshooting chapters.
- **Page positioning:** edge labels `top`/`end` added so page rests at top on load; scroll progress restored on `ScrollTrigger.refresh()` to handle height changes.
- **Timeline bounds:** page stops at t=14.6 (before reel fade-to-black); hero label for particles adjusted from 7.3 → 7.38.

## Risk Assessment
- Snap fights user mid-chapter → set `delay` ≥ 0.15 and directional snap; if annoying, snap only inside montage/end or drop snap (config flag, decide in QA).
- Pin + `100svh` on mobile URL-bar resize → rely on ScrollTrigger `ignoreMobileResize` default; verify on DevTools device mode.
- Re-init on resize discards offscreen buffers → brief extra GC; fine at debounce 150ms.
