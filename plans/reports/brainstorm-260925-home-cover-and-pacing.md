# Brainstorm — Home cover + calmer pacing (scroll site)

Date: 2026-09-25 · Status: approved · Builds on: `plans/260925-1656-scroll-driven-reel-web/` (completed)

## Problem
1. Landing (t=0) is an empty black frame: reel frame 0 has the ball above the frame and the HUD hidden until t=0.1. Only "SCROLL", the rail and the sound pill are visible → looks unloaded.
2. Motion feels too fast / overwhelming. Cause is the **mapping, not the reel**:
   - Reel authored for 15s video at 128 BPM: an event every 0.47s, 0.2–0.4s outExpo eases, 6 camera shakes, 3 flashes.
   - 14.6s spread over 14 viewports ≈ 860px per reel-second. Trackpad fling with inertia (2–4k px) = 2.5–4.5s of reel in <1s → 3–6× realtime.
   - Snap tweens (0.2–0.6s) can play up to ~1s of reel → another 2–5×.
   - No scroll zone where the frame holds still.

## Decisions (user)
- Home: cover text + living idle scene. Add "Watch with sound · 15s" cinema mode.
- Pacing: all four levers — holds + captions, speed cap, lower web intensity, longer scroll (as `PACE = 1.2`, since holds + intro already add ~6.5 viewports).
- Web layer only. Reel scenes, `render.mjs`, mp4 unchanged (`pnpm parity` guards this).

## Approaches considered
| Lever | Effect | Cost / trade-off |
|---|---|---|
| Longer scroll only | slower per px | long page, still fast on flings |
| **Speed cap on displayed t** | fixes flings/snap directly | visuals lag scroll when flinging hard |
| **Holds at hero frames** | resting points, readable | adds ~5.6 viewports |
| **Captions in holds** | context ("what am I watching"), pacing | may cover content in 06 bento |
| **Web intensity 0.4** | less shake/flash | none for video (default 1) |
| Re-time reel itself | slower everywhere | breaks music sync, mp4 changes → rejected |

Home options: cover + idle (chosen) · idle only (no context) · static poster (a motion page opening on a still).

## Final design
**1. Home (intro zone ≈ 1 viewport before t starts)**
- Canvas idle (rAF, real time; stops once intro is left): ball bouncing at right third, period ≈0.94s (2 beats), squash, floor ripples; HUD `● STANDBY 00:00:00:00`.
- DOM cover, left, Swiss: kicker `MOTION REEL — 2026`; title **Every frame,** (Unbounded) / *a function of time.* (Instrument Serif italic); meta `15s · 7 chapters · 2,646 points · 0 keyframes`; CTAs `Scroll to play ↓` and `▶ Watch with sound · 15s`.
- Load entrance: GSAP SplitText line mask-rise, stagger, `power3.out`, ~1.2s total.
- Scroll exit (scrubbed by intro progress): cover lines lift + fade; ball anticipates, **jumps out of the top edge**, the reel's t=0 drop brings it back. Floor line fades so there is no pop at t=0.

**2. Cinema mode (watch with sound)**
- Lock scroll → `renderSoundtrack()` (cached; "Loading" state ~1s) → play, render by audio clock (samples=1, site scale).
- Exit: Esc / ✕ / end → restore the frame at the current scroll position. No mp4 needed.

**3. Pacing**
- Playhead decoupled: ScrollTrigger sets **target t**; the displayed t chases it at ≤ **1.25× realtime** (gsap.ticker). If the gap is > 3s (rail click, scrollbar drag), cut straight to the target.
- Holds: 0.7 viewport at each hero frame (t constant). Snap labels at hold centres; snap softer (0.4–0.9s, `power2.inOut`, inertia off, directional).
- Captions (DOM, bottom-left, ~380px): chapter no., serif title, one-line description, 2–3 technique tags. Shown while the displayed t sits in a hold. Per-chapter side override if one covers content (likely 06).
- `env.intensity` (web 0.4, export 1): camera shake amplitude, point-burst flash, end-card flash.
- `PACE = 1.2` multiplier on scene weights.
- Total ≈ 1 intro + 16.8 scenes + 5.6 holds ≈ 23 viewports.

**4. Files (≈350–450 LOC)**
- New: `src/playhead.js`, `src/home-cover.js`, `src/chapter-captions.js`, `src/cinema-mode.js`.
- Change: `scroll-engine.js` (intro + holds + labels), `scroll-main.js` (wiring), `scene-01-bounce.js` (`drawIdle`), `timeline.js` + `hud-overlay.js` (idle render, STANDBY, intensity), `scene-04-05-point-cloud.js` + `scene-08-end-card.js` (flash × intensity), `scroll.html` (cover/caption CSS), `scripts/qa-scroll.mjs`.

## Risks
- Speed cap → visuals trail the scroll on hard flings (intended). The rail/progress follows scroll, captions follow the displayed frame.
- Caption overlap on chapter 06 → check in QA screenshots, side override.
- Offline soundtrack render ~1s on slow machines → loading state + cache.
- Idle rAF loop and scroll-driven rendering must not fight over the canvas → a single owner (idle only while the intro is visible and the playhead t = 0).
- SplitText + fonts: split after `document.fonts` settle, or line breaks are wrong.

## Success criteria
- Load: the cover animates in, the ball bounces, the HUD shows STANDBY; nothing is empty or black.
- Scrolling out of the intro: the ball exits the top and drops back in; no pop.
- Hard trackpad fling: displayed reel speed ≤ 1.25× (QA: sample dt/dt_real).
- Each chapter rests on a still hero frame with its caption; snap lands in holds.
- Cinema mode plays 15s in sync with music; Esc restores scroll mode at the same frame.
- `pnpm qa` extended checks pass; `pnpm parity` unchanged (export identical).

## Next
`/ck:plan` from this report.
