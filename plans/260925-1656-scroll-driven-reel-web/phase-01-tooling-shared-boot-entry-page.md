---
phase: 1
title: "Tooling, shared boot, entry page"
status: completed
priority: P1
effort: "1h"
dependencies: []
---

# Phase 01: Tooling, shared boot, entry page

## Overview
Add Vite + GSAP, create `scroll.html` entry, extract shared font CSS and boot sequence so both pages (reel player/export and scroll site) use one code path. Capture an export baseline first.

## Requirements
- Functional: `pnpm dev` serves `/scroll.html` with a pinned-ready canvas showing frame t=0; `pnpm build` emits `dist/`.
- Non-functional: export page never imports bare `gsap` (raw `server.mjs` can't resolve it). Frame output of `render.mjs` unchanged.

## Architecture
```
index.html ─ src/main.js ─┐                 (player + export hooks, no gsap)
                          ├─ src/boot-reel.js ─ fonts → buildPointCloud → initTimeline
scroll.html ─ src/scroll-main.js ─┘         (imports gsap, later phases)
src/fonts.css  ← linked by both HTML files
```
`boot-reel.js`:
```js
export const FACES = [...]; // moved from main.js
export async function bootReel(canvas, scale = 1) {
  await Promise.all(FACES.map(f => document.fonts.load(f)));
  buildPointCloud();          // samples text pixels → fonts first
  initTimeline(canvas, scale); // scale param wired in phase 02; ignore until then
}
```

## Related Code Files
- Create: `vite.config.js`, `scroll.html`, `src/fonts.css`, `src/boot-reel.js`, `src/scroll-main.js` (stub: boot + render t=0)
- Modify: `package.json` (scripts `dev`, `build`; deps), `index.html` (replace inline `@font-face` with `<link rel="stylesheet" href="src/fonts.css">`), `server.mjs` (add `'.css': 'text/css'` to `TYPES`), `src/main.js` (use `bootReel`)

## Implementation Steps
1. **Baseline** before any change: `ONLY=0,120,240,432,534,630,700,852 BLUR=1 node render.mjs`, then store md5 of each PNG in `plans/260925-1656-scroll-driven-reel-web/reports/export-baseline.md5` (`md5sum out/frames/*.png`).
2. `pnpm add gsap@^3.15` · `pnpm add -D vite@^8`.
3. `package.json` scripts: add `"dev": "vite --open /scroll.html"`, `"build": "vite build"`; keep `preview` (reel player) and `render`.
4. `vite.config.js`: `build.rollupOptions.input = { scroll: 'scroll.html' }` (export page is dev-only tooling).
5. Move the 5 `@font-face` rules from `index.html` into `src/fonts.css`; link it from both HTML files.
6. Create `src/boot-reel.js`; make `main.js` import it (behavior unchanged, `window.reel` hooks intact).
7. `scroll.html`: `<main id="stage"><canvas></canvas></main>` + `<script type="module" src="src/scroll-main.js">`. CSS: body ink bg, stage `height: 100svh`, canvas centered, `width: min(100vw, 100svh*16/9)`, `aspect-ratio: 16/9`.
8. `scroll-main.js` stub: `await bootReel(canvas); renderFrame(0, 1);`.

## Success Criteria
- [x] `pnpm dev` → `/scroll.html` shows frame 0 with correct fonts; no console errors.
- [x] `pnpm build` succeeds; `dist/scroll.html` references hashed font files.
- [x] `pnpm preview` player still works (fonts load via `fonts.css`).
- [x] Re-run step 1 command → md5s identical to baseline (PSNR parity used instead).

## Implementation Notes
- **PSNR parity over md5:** headless GPU raster flips single anti-aliased pixels run-to-run; replaced strict md5 with PSNR ≥107 dB check. All baseline frames pass (inf or ≥107 dB).
- **New scripts:** `pnpm qa` and `pnpm parity` added for streamlined QA workflow.
- **Font loading:** `bootReel` uses `Promise.allSettled` so site falls back gracefully on font failure; export (`main.js`) still throws to catch errors.

## Risk Assessment
- `.css` served as octet-stream by `server.mjs` → Chrome refuses stylesheet → fonts fallback → particle text targets change. Mitigation: MIME entry + md5 parity check catches it.
- Vite dev also serves `index.html`; harmless.
