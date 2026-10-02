---
phase: 2
title: "Renderer hooks: intensity, idle, standby HUD"
status: completed
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 02: Renderer hooks — intensity, idle, standby HUD

## Overview
Three site-only renderer knobs, with defaults that keep the export identical:
- `intensity`: scales camera shake and full-screen flashes.
- `renderIdle(now, leave)`: the home's looping bounce, plus the jump-out.
- A STANDBY HUD variant.

## Requirements
- Functional: with `intensity` 0.4, shake amplitude and flash alpha (point-burst glow, end-card bone flash) are × 0.4.
- Functional: `renderIdle`:
  - Ball bounces at x ≈ 1340 with period 2 beats (0.9375s) and apex ≈ 150px.
  - Squash on contact, stretch by speed, one ripple per contact.
  - Floor line at alpha 0.35 × (1 − leave).
  - HUD visible with `00 / STANDBY` and a blinking record dot.
- Functional: jump-out as `leave` goes 0→1:
  - 0–0.25: bounce damps.
  - 0.25–0.4: crouch (squash 0.3).
  - 0.4–1: launch; `outCubic` height to ≈ 1100px, so the ball is fully above the frame at leave = 1.
  - Result: the reel's t=0 (ball entering from the top) continues the motion.
- Non-functional: `pnpm parity` stays OK. Scene files stay under 200 LOC.

## Architecture
- `timeline.js`:
  - `initTimeline(canvas, { scale, calm, intensity = 1 })`.
  - `compose`: `amp * env.intensity`.
  - Every scene draw already receives `env`. Fix the S5 wrapper: `(ctx, lt, env) => drawPointCloud(ctx, lt + BAR, env)`.
- New export `renderIdle(now, leave)`: sets the scale transform, calls `drawIdle(ctx, now, leave)` from scene-01, then `drawHud(main, 0, STANDBY_SCENE, 0, 1, { standby: true, now })`.
- `scene-01-bounce.js`:
  - Extract the local helpers `drawFloorRipple(ctx, x, p, reach)` and `drawBall(ctx, x, h, v, squash, color)`. Existing `drawBounce` output must be unchanged (parity).
  - Add `drawIdle` using them.
  - If the file passes 200 LOC, put `drawIdle` in `scene-00-idle.js` and import the helpers.
- `hud-overlay.js`:
  - Optional `opts.standby` forces `vis = 1`.
  - Label `00 / STANDBY` (scramble-free).
  - Timecode `00:00:00:00`.
  - Record dot blinking at 1 Hz (`Math.floor(now * 2) % 2`).
- `scene-04-05-point-cloud.js`: `flash * env.intensity`.
- `scene-08-end-card.js`: `ctx.globalAlpha = flash * env.intensity`.

## Related Code Files
- Modify: `src/timeline.js`, `src/hud-overlay.js`, `src/scene-01-bounce.js` (or create `src/scene-00-idle.js`), `src/scene-04-05-point-cloud.js`, `src/scene-08-end-card.js`

## Implementation Steps
1. Add `intensity` to env; apply it in `compose`, the burst glow and the end-card flash; fix the S5 wrapper to pass `env`.
2. Refactor the bounce helpers; run `pnpm parity` (must stay OK before going on).
3. Implement `drawIdle` + `renderIdle` + the HUD standby option.
4. Temporary check: in the dev console, call `renderIdle(performance.now()/1000, x)` for x in {0, 0.3, 0.7, 1} and eyeball the frames.
5. `pnpm parity` again.

## Success Criteria
- [x] `pnpm parity` OK (export unchanged at intensity 1).
- [x] Idle loops seamlessly: no pop at the period boundary.
- [x] At leave = 1 the ball is off-frame; at leave = 0 the HUD shows STANDBY.
- [x] At intensity 0.4 the shake at t = 1.875 and 13.125 is visibly softer and the end-card flash dimmer.

## Implementation Notes
- `drawIdle` is self-contained in new `src/scene-00-idle.js`; no helpers were extracted from scene-01, which only gained `export` on FLOOR/R, so export parity was never at risk.
- Standby HUD fades out with the launch intro (no HUD pop at t=0).
- Under calm entrance (reduced motion), ball rests immediately and blink freezes (no idle animation).

## Risk Assessment
- The helper refactor changes the draw order or alpha state → parity fails. Mitigation: extract verbatim, keep the call order, and run parity right after.
- Horizontal discontinuity: idle x = 1340, reel drop at x = 960. The ball leaves the frame before the reel starts, so it isn't visible. Accepted.
