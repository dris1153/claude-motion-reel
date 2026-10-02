# Code review — Lenis smooth scroll (condensed) + resolution

The reviewer checked each finding against the Lenis 1.3.26 and ScrollTrigger 3.15 sources and confirmed them with puppeteer probes. After the fixes: `pnpm qa` passes 28/28 on two runs, `pnpm parity` passes 8/8.

| ID | Finding | Resolution |
|---|---|---|
| H1 | An interrupted snap (touch, or `stop()` for cinema) left `userData.programmatic` set, so native scrolls never re-armed snap. On phones this was permanent | Fixed. Our own frames are ignored only while `isScrolling !== 'native'`. QA: "snap survives an interrupted glide" (stop/start mid-snap, then a native scroll lands on a label) |
| H2 | (pre-existing) A width-only resize showed the home frame and cover over a chapter, because the refresh revert emits t=0 and the restore is silent. The next height resize then jumped to the top | Fixed. `engine.sync()` re-emits intro, t and progress after the refresh restore. QA: resize loop now includes width-only sizes (1400×1000, 1400×900), checks t and that the cover is hidden |
| M1 | Snap fired with a finger or the scrollbar thumb still down | Fixed. `checkEnd` waits on `lenis.isTouching` and a pointerdown/up flag (the same approach as ScrollTrigger's old `_pointerIsDown`) |
| M2 | Keyboard or pointer input during our snap was overwritten | Fixed. On a scroll key or pointerdown during our own glide: `lenis.stop(); lenis.start()`, then the input scrolls natively and re-arms snap |
| M3 | Lenis registers non-passive touch listeners even with `syncTouch: false` | Open, for a product decision. Skipping Lenis on touch-only devices would also drop touch snap. Needs a real device test |
| L1 | A stale `isScrolling 'native'` with velocity 0 kept re-arming the timer | Fixed. `checkEnd` treats 'native' as moving only when the velocity is non-zero |
| L2 | A forced restore armed a directional snap | Fixed. After a forced restore, the next scroll end settles on the nearest label (direction 0), as the old ScrollTrigger snap did after a refresh |
| L3 | Cinema could leave the page between labels | Fixed. `start()` re-arms the end check, so an interrupted glide or snap still settles |
| L4 | Docs drift: the easing is quad (GSAP power1.inOut, not power2); stale QA comment | QA comment fixed; the plan is corrected in the finalize sync |
| L5 | `lagSmoothing(0)` is global | No harm found; kept |
| L6 | Redundant `clearTimeout` in `stop()` | Removed |

Also done: the QA draw-timing sweep moved to `qa-helpers.mjs` (`printDrawTimes`), which keeps `qa-scroll.mjs` at 180 LOC.
