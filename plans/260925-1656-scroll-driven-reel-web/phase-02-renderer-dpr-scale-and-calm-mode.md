---
phase: 2
title: "Renderer: DPR scale + calm mode"
status: completed
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 02: Renderer — DPR scale + calm mode

## Overview
Let the renderer draw into a backing store of any pixel density (crisp on retina, cheaper on small screens) and add a `calm` flag for `prefers-reduced-motion` (no shake, no strobe/invert, no impact flash). Defaults (`scale 1`, `calm false`) must reproduce current frames exactly.

## Requirements
- Functional: `initTimeline(canvas, { scale, calm })`; all scenes keep logical 1920×1080 coordinates.
- Functional (calm): no camera shake; montage cuts crossfade instead of hard cut, no invert/RGB-split/slice; end-card bone flash removed.
- Non-functional: scale 1 + calm false → md5-identical export frames.

## Architecture
Scale lives only in the compositor; scenes never see device pixels.
- `initTimeline`: size main + offscreen canvases to `round(W*scale) × round(H*scale)`; store `env.scale`, `env.calm`.
- `compose`: `ctx.setTransform(s, 0, 0, s, dx*s, dy*s)` (shake dx/dy = 0 when calm).
- `env.renderAt`: `ctx.setTransform(s, 0, 0, s, 0, 0)`.
- `renderFrame`: accumulation + final blit stay in identity transform (same pixel size); then set scale transform before `drawHud`.
- Montage (`scene-07-montage.js`) — only place that blits canvases under a transform:
  - `ctx.drawImage(L.canvas, 0, 0, W, H)` (dest in logical units).
  - `rgbSplit`: work on `tmp` in identity/pixel space (`fillRect(0,0,tmp.canvas.width,tmp.canvas.height)`), blit with `drawImage(tmp.canvas, dx, 0, W, H)`.
  - `slices`: source rect × `env.scale`, dest rect logical.
  - Calm path: draw previous cut, then current cut with `globalAlpha = prog(u, 0, cutLen)`; skip fx.
- End card: `if (!env.calm)` around flash (needs `env` param — scenes already receive it as 3rd arg).
- `point-cloud-data.js` text sampling canvas stays fixed 1920×1080 (targets must not depend on scale).

```js
// timeline.js (sketch)
export function initTimeline(canvas, { scale = 1, calm = false } = {}) {
  const size = c => { c.width = Math.round(W * scale); c.height = Math.round(H * scale); return c; };
  size(canvas);
  env = { scale, calm, main: canvas.getContext('2d'), sub: offscreen(size), ... };
}
```

## Related Code Files
- Modify: `src/timeline.js`, `src/scene-07-montage.js`, `src/scene-08-end-card.js`, `src/boot-reel.js` (pass options through)

## Implementation Steps
1. Add options param + canvas sizing in `initTimeline`; keep `canvas` width attr in `index.html` irrelevant (sized in JS).
2. Apply scale in `compose`, `renderAt`, before `drawHud`; gate shake with `!env.calm`.
3. Fix montage blits for scale; add calm crossfade path (helper `drawCut(ctx, k, u, env)` reused for prev/current).
4. Gate end-card flash on `env.calm`.
5. Quick check page: temporary query param in `scroll-main.js` (`?scale=1.5&calm=1&t=11.6`) to eyeball frames; remove after phase 03 wires real values.
6. Export parity: rerun baseline command, compare md5.

## Success Criteria
- [x] md5 parity with phase-01 baseline (scale 1, calm off).
- [x] At `scale=1.5`: text/HUD edges crisp, montage RGB split + slices aligned (no offset or half-size blits) at t = 11.6, 11.8, 12.2.
- [x] At `scale=0.6`: frames correct, just softer.
- [x] Calm: t in [11.25, 13.1] shows no inverted/strobe frames; no shake at 1.875 / 13.125; no bone flash at 13.13.

## Implementation Notes
- **Buffer pooling:** buffers pooled and resized in place; `sub` and `acc` created lazily only when samples > 1 (site never allocates them).
- **Scale optimization:** scale cap lowered from 1.5 to 1.25 in `scroll-main.js` after headed QA revealed p95 frame time 20–30ms at 1.5×; 1.25× achieves ~15–20ms with particles/montage.
- **Calm mode:** full integration with crossfade, no shake, no flash; verified via headless QA.

## Risk Assessment
- Missed hard-coded pixel op → half-size or offset blits at scale ≠ 1. Grep `drawImage(` and `getImageData` to audit; only montage + timeline blit canvases.
- Non-integer scale → 1px seams on slices; acceptable, or round scale to 0.05 steps.
