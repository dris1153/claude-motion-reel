---
title: "Scroll-driven web version of the motion reel"
status: completed
priority: P2
effort: "8h"
mode: fast
created: 2026-09-25
source: ../reports/brainstorm-260925-scroll-driven-reel-web.md
blockedBy: []
blocks: []
---

# Scroll-driven reel web (GSAP ScrollTrigger)

Pinned canvas; scroll drives `t` of the existing pure-function reel (`renderFrame(t)`). Per-scene scroll weights, snap to hero frames, thin DOM overlay, per-scene SFX. Desktop-first, mobile letterboxed 16:9.

Decisions + rationale: [brainstorm report](../reports/brainstorm-260925-scroll-driven-reel-web.md).

## Hard constraint
Video export (`index.html` + `render.mjs` + `server.mjs`) must keep working and render **pixel-identical** frames at `scale = 1`, calm mode off. Every phase re-checks this (see phase 01 baseline).

## Phases
| # | Phase | Status | Effort | Depends |
|---|---|---|---|---|
| 01 | [Tooling, shared boot, entry page](phase-01-tooling-shared-boot-entry-page.md) | completed | 1h | — |
| 02 | [Renderer: DPR scale + calm mode](phase-02-renderer-dpr-scale-and-calm-mode.md) | completed | 1.5h | 01 |
| 03 | [Scroll engine: timeline, weights, snap](phase-03-scroll-engine-timeline-weights-snap.md) | completed | 2h | 02 |
| 04 | [DOM overlay + per-scene SFX](phase-04-dom-overlay-and-scene-sfx.md) | completed | 2h | 03 |
| 05 | [QA: scroll-through, perf, export parity](phase-05-qa-scroll-perf-export-parity.md) | completed | 1.5h | 04 |

## Key dependencies
- `gsap@^3.15` (ScrollTrigger included, free license), `vite@^8` (dev dep).
- System Chrome + `puppeteer-core` (already installed) for QA scripts.

## File map (new / changed)
- New: `vite.config.js`, `scroll.html`, `src/fonts.css`, `src/boot-reel.js`, `src/scroll-main.js`, `src/scroll-engine.js`, `src/scroll-overlay.js`, `src/scene-sfx.js`, `scripts/qa-scroll.mjs`
- Changed: `package.json`, `index.html` (font link only), `server.mjs` (`.css` MIME), `src/main.js` (use shared boot), `src/timeline.js`, `src/scene-07-montage.js`, `src/scene-08-end-card.js`, `src/soundtrack.js` (export shared audio rig)

## Out of scope (YAGNI)
Deploy/hosting, portrait re-layout, blurred frame on scroll settle, SEO/content sections, ScrollSmoother/Lenis.

## Unresolved
- Deploy root: if hosted later, `scroll.html` probably becomes `index.html` (and reel player → `reel.html`, one-line `render.mjs` change).
- Phase L5: DPR change across monitors without viewport resize (not implemented).
- Phase L7: Calm gating of particle burst glow (optional soft 0.3s glow, not implemented).
- Phase L2: BLUR=16 parity baseline — not added; BLUR=1 baseline sufficient (accumulation math unchanged at scale 1).
- Phase 05: Manual real-browser/mobile pass (trackpad, sound, DevTools device mode) — not completed; automated headless QA passes.
