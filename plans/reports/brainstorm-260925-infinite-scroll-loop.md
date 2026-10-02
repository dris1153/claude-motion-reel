# Brainstorm — Infinite scroll loop (scroll site)

Date: 2026-09-25 · Status: approved · Builds on: `plans/260925-1848-lenis-smooth-scroll/` (completed)

## Problem
Scrolling past the last frame should continue into a smooth, designed transition and come back to the first frame (the home). Scrolling up from the top should loop to the end as well.

## Decisions (user)
- Loop target: home, with the cover. Each pass repeats the intro.
- Transition: the end-card spark morphs into the ball, launches off the top edge, and drops back in as the home.
- Both directions. Backward only works for wheel/trackpad (Lenis); touch and calm loop forward only.
- Keep the browser scrollbar (accessibility), accepting that it jumps when the loop happens.

## Key insight
The home is `renderIdle(now, intro)` plus the cover driven by `intro`, and the intro's jump-out is invertible. A bridge that ends in "intro played backwards" lands on a frame identical to the top, so a scroll-position wrap is invisible. The playhead already cuts on gaps > 3s.

## Options considered
| Mechanism | Verdict |
|---|---|
| **Custom wrap (Lenis-aware) + duplicate-intro buffer** | chosen: keeps momentum, works with the ScrollTrigger pin |
| Lenis `infinite: true` | rejected: needs `syncTouch` (we chose native touch), conflicts with the pin geometry |
| Replay button only | rejected: not infinite |

| Transition | Verdict |
|---|---|
| **Spark → ball → launch, then intro reversed** | chosen: the loop closes the story |
| Fade to black + ball drop | cheaper, but has a fully black moment |

## Final design
1. **Scroll layout after c7:** end-card tail → **Bridge A** (~1.2 vh, reel time 14.6 → 15.8, site only) → **Bridge B** (1 vh, `intro` 1 → 0, t fixed at LOOP_T = 15.8) → **loop point** → **buffer** (0.6 vh, a copy of intro 0 → 0.6).
2. **Bridge A render:** `drawEndCard(ctx, lt, env, exit = 0)`. `exit = 0` is byte-identical to the export.
   - CLAUDE letters sink through the mask with a stagger; credits and rule fade out.
   - The spark morphs to a circle (`shapes.morph` spark → circle), goes clay → bone and shrinks to ball size, crouches, then launches off the top edge (outCubic).
3. **Bridge B** reuses `renderIdle(now, intro)` and the cover exit timeline (progress = intro): ball drop, landing, bounce, HUD standby, cover return.
4. **show(t):**
   - `t === 0 || t >= LOOP_T` → idle (home);
   - `END_T < t < LOOP_T` → bridge A;
   - otherwise → reel frame.

   The rail treats bridge/home as scene −1, and the idle ticker runs whenever `isHome(t)`.
5. **`src/scroll-loop.js`** (~50 LOC):
   - Forward, Lenis-smooth: on scroll, when `animatedScroll ≥ loopY`, `scrollTo(overshoot, { immediate, force })`, then continue the remaining delta with `{ programmatic: false, lerp: 0.1 }` to keep momentum.
   - Forward, native (touch/keys/scrollbar under Lenis): wrap on scroll end.
   - Forward, calm (no Lenis): native `scrollend` event.
   - Backward (Lenis only): the `virtualScroll` option. When `deltaY < 0` and `targetScroll + deltaY < 0`, jump to `loopY + animatedScroll` (immediate, force) and return true, so Lenis applies the delta from there.
6. **Engine:** new segments + labels. Replace `end` with a `loop` label at loopY; snap to `loop` → wrap → home. `total` grows by 1.2 + 1 + 0.6 vh.
7. **Copy:** end caption "Keep scrolling to loop — or ▶ Watch with sound".

## Risks
- The scrollbar and rail jump at the wrap (accepted).
- Backward loop is not available on touch or calm (documented).
- The bridge end must match the home frame exactly. QA compares them in calm (static idle) by PSNR.
- A snap in flight to `loop` triggers the wrap. The immediate `scrollTo` resets the Lenis animation, which is expected.
- The ScrollTrigger refresh restore by progress must still hold with the longer layout.

## Success criteria
- Continuous wheel scrolling from c7 flows through the bridge into the home; no visible seam, and momentum continues.
- Wheel up at the home flows into bridge B, then bridge A, and snaps back to c7.
- Touch/calm: reaching the bottom wraps to the home on scroll end.
- QA:
  - calm PSNR(home, loop point) ≥ 40;
  - forward wrap → t = 0, cover visible;
  - backward wrap → lands on c7;
  - all existing 28 checks pass;
  - `pnpm parity` 8/8.

## Next
`/ck:plan` from this report.
