# Brainstorm — Scroll-driven web version of the motion reel

Date: 2026-09-25 · Status: approved (approach B)

## Problem
Turn the 15s canvas showreel (`src/`, rendered to `out/claude-motion-reel.mp4`) into a website where scrolling drives the reel via GSAP ScrollTrigger.

## Requirements (from user)
- Pure scroll experience — no extra content sections, no SEO/CTA needs.
- Desktop-first. Mobile keeps 16:9, letterboxed.
- Audio: per-scene SFX on scene change (music can't stay beat-synced under free scrubbing).

## Key insight
Every scene is already a pure function of time (`renderFrame(t)`), stateless. Scroll → `t` mapping gives exact forward/backward scrubbing with zero scene changes. Hardest part of scroll-driven sites is already solved.

## Approaches evaluated
| | A. Linear 1:1 scrub | **B. Remapped chapters (chosen)** | C. Section per scene |
|---|---|---|---|
| How | pin canvas, `t = progress × 15` | GSAP timeline tweens proxy `{t}`; per-scene scroll weight; labels + snap | 7 pinned sections, DOM transitions between |
| Scene code reuse | 100% | 100% | needs splitting |
| Size | ~40 LOC | ~150–200 LOC | large |
| Weakness | montage 16th-note cuts strobe within a few px; dense scenes fly by | weights need tuning | breaks match-cuts (dot→wipe, O-zoom, particles→grid) = reel's best asset |

Rejected: scrubbing the mp4 (`video.currentTime`) — seek jank unless all-intra encode (~100MB). Live canvas ≈ 60KB JS + 100KB fonts, resolution-independent.

## Final design (B)
- **Scroll→time**: `gsap.timeline()` of tweens on `proxy.t` (ease `none`), one per scene, duration = scroll weight. `ScrollTrigger` `pin: true`, `scrub: 0.6`, `onUpdate → renderFrame(proxy.t, 1)`.
- **Weights (viewports)**: Physics 1.5 · Type 2 · Morph 1.5 · Particles 2 · 3D 2 · Layout 1.5 · Montage 2.5 · End 1 (≈14vh total, tunable).
- **Snap**: `snapTo: 'labelsDirectional'`; labels at each chapter's hero frame (e.g. CLAUDE formed 7.25s, torus 8.7s), not scene start (start frames are mid-transition).
- **DOM layer**: scroll hint, chapter progress rail (click → scroll to label), sound toggle (required user gesture for audio).
- **SFX**: reuse `audio-instruments.js` on a realtime `AudioContext`; one cue per scene-index change, throttle ≥150ms.
- **Reduced motion** (`prefers-reduced-motion`): montage cuts → crossfades, no camera shake/strobe (WCAG 2.3.1 three-flash limit).
- **Retina**: DPR-scaled canvases (cap 1.5×) in `compose` + offscreen buffers.
- **Mobile**: 16:9 letterbox, `100svh`; ScrollTrigger `ignoreMobileResize` default handles URL-bar resize.
- **Tooling**: add `vite` + `gsap` (all plugins free since 3.13). New entry `scroll.html` + `src/scroll-main.js`; keep `index.html` + `render.mjs` untouched so video export keeps working.

## Risks
- No motion blur live → faster motion looks steppier than mp4. Optional later: render blurred frame once scroll settles.
- Heavy frames on low-end laptops: montage `rgbSplit` (3 full-screen composites), 2,646-point cloud. Measure; fallback = skip RGB split under low FPS.
- `render.mjs`'s raw static server can't resolve bare `gsap` imports → export page must not import gsap (hence separate entry).
- SFX stacking on fast scroll — throttle + only on index change.

## Success criteria
- Scrubbing forward/backward matches mp4 frames at same `t` (visual spot-check).
- Steady 60fps scrubbing on a mid-range laptop (Chrome perf panel, no long tasks >16ms in steady scroll).
- Snap lands on hero frames; rail navigation works both directions.
- Reduced-motion mode has no strobe/invert flashes.
- `pnpm render` still produces the mp4 unchanged.

## Next steps
1. `/ck:plan` from this report (phases: tooling + entry, scroll timeline + snap, DOM layer, SFX, DPR + reduced motion, QA).
