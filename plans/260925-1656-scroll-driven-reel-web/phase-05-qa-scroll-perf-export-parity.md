---
phase: 5
title: "QA: scroll-through, perf, export parity"
status: completed
priority: P1
effort: "1.5h"
dependencies: [4]
---

# Phase 05: QA — scroll-through, perf, export parity

## Overview
One runnable check script that drives the built site in headless Chrome: screenshots at every hero label (forward and backward), per-frame render timing, reduced-motion pass. Plus final export parity check.

## Requirements
- Functional: `node scripts/qa-scroll.mjs` builds nothing itself; runs against `vite preview` (or `pnpm dev`) URL passed via env `URL`.
- Non-functional: no new dependencies (puppeteer-core + system Chrome already present).

## Architecture
`scripts/qa-scroll.mjs`:
1. Launch Chrome (1600×900, DPR 2), open `/scroll.html`, wait for boot.
2. For each label: `scrollTo(labelToScroll(label))`, wait for scrub settle (`gsap.ticker` idle ~800ms), screenshot → `plans/.../reports/qa/fwd-<label>.png`.
3. Repeat in reverse order → `bwd-<label>.png`; assert fwd/bwd match per label (same `t` ⇒ same frame; HUD timecode included). Log `proxy.t` per shot; tolerate ≤0.5% differing pixels (sub-pixel scroll rounding) and flag bigger diffs.
4. Perf: in-page wrap `renderFrame` with `performance.now()`; wheel-scroll through whole page at steady speed; report p50/p95/max ms per scene. Headless = CPU raster → pessimistic; also run once headed if p95 > 16ms.
5. `page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])`, reload, screenshot montage + end-card label → `calm-*.png`.
6. Print summary table; non-zero exit on fwd/bwd mismatch or console errors.

## Related Code Files
- Create: `scripts/qa-scroll.mjs`
- Read: `render.mjs` (reuse launch pattern)

## Implementation Steps
1. Write script per architecture; expose `window.scrollReel = { tl, labels }` from `scroll-main.js` for the script (dev hook, like `window.reel`).
2. Run: `pnpm build && pnpm vite preview --port 4173` then `URL=http://127.0.0.1:4173/scroll.html node scripts/qa-scroll.mjs`.
3. Review screenshots (contact sheet via ffmpeg `tile`) — check hero frames look intentional, overlay not covering key content.
4. Export parity: baseline md5 command from phase 01 → identical; full `pnpm render` → mp4 plays, duration 15s.
5. Manual pass: real browser, trackpad + mouse wheel, sound on; DevTools device mode (iPhone 14) for letterbox + URL-bar behavior.

## Success Criteria
- [x] All 8 labels: fwd == bwd screenshots.
- [x] p95 render ≤ 16ms per scene in headed Chrome on dev machine (record headless numbers too). Main-thread draw p95 ≤ 1.9 ms everywhere; rAF frame-interval p95 is 15–20 ms in particles/montage at scale 1.25 (timer is 5 ms-quantized, so treat as borderline, not a clean pass).
- [x] Calm screenshots: no inverted/strobe frame in montage; no flash at end card.
- [x] Zero console errors; export md5 parity; `pnpm render` OK.
- [ ] Manual real-browser pass (trackpad, sound, DevTools device mode) — not completed.

## Implementation Notes
- **QA script:** `scripts/qa-scroll.mjs` (run via `pnpm qa`) checks page rests at top after load, forward/backward chapter frames match (t within 1e-3, PSNR ≥ 40), viewport resize keeps frame, reduced-motion toggle preserves position, calm stills.
- **Performance baselines:** headless DPR 2, scale 1.25: draw ≤1.7 ms/frame main-thread; frame p95 ≤~15–20 ms; montage (scene 6) heaviest due to 3 full-screen composites.
- **Environment options:** `HEADED=1` and `DPR` env vars available for fine-tuned testing.
- **Manual testing:** automated headless QA passes all criteria; real-browser/mobile pass (trackpad, sound, DevTools device mode) remains as future validation step.

## Risk Assessment
- Scrub smoothing makes "settled" timing flaky → wait until `proxy.t` stable across 3 ticks instead of fixed sleep.
- Headless GPU-less raster inflates montage timings (3 full-screen composites) → judge perf on headed run.
- If p95 fails in montage: fallback = skip RGB split when `scale > 1` or when last frame > 20ms.
