# Code review — home cover + pacing (condensed) + resolution

Reviewer confirmed each finding with puppeteer probes. Verification after the fixes:
- `pnpm qa`: 23/23 OK, including 3 new calm checks.
- `pnpm parity`: 8/8.
- Cinema race probe: 1 soundtrack start; focus returns to the opener.

| ID | Finding | Resolution |
|---|---|---|
| H1 | Calm: cover shown over cinema (inline `visibility` from `gsap.from(root, {autoAlpha})` beat the `.cinema .cover` rule); CTAs clickable | Fixed. Calm tween is opacity-only with `clearProps`. Cinema sets `inert` on cover/captions/rail/sound. QA: "calm: cinema hides and disables the cover" |
| H2 | Calm: playhead auto-played frames (crawl up to 3s) | Fixed. `createPlayhead(onChange, instant)`, where `instant = () => calm` cuts straight to the target. QA: "calm: rail jump cuts" |
| H3 | Calm: idle ball bounced forever, STANDBY dot blinked (WCAG 2.2.2), 60fps redraw | Fixed. `drawIdle(..., still)` rests the ball, the HUD standby clock is frozen at 0, and the idle ticker only redraws when the intro moves. QA: "calm: home frame is still" |
| M1 | Cinema race: reopening during the soundtrack render → two sources playing | Fixed. Run token, cached soundtrack promise (reset on failure), local context; stale continuations bail out |
| M2 | iOS: `resume()` after an await is outside user activation | Fixed. `resume()` is called synchronously in the click and awaited later. Untested on Safari |
| M3 | After cinema: stale rail/caption, snap moved the page under cinema, focus lost | Fixed. Shared `show(t)` (frame, rail, SFX, caption) is used by the playhead and by restore; any snap tween in flight is killed on open; focus returns only if the opener is visible |
| M4 | Static cover flashed before JS, with dead CTAs | Fixed. `.cover` is hidden until `html.cover-ready`, which is set in `createCover` |
| L1 | HUD pop at the idle→reel boundary | Fixed. The standby HUD fades with `1 - prog(leave, 0.6, 1)`, and the reel fades it back in |
| L2 | Resize at a chapter jitters the target by ±0.006 → caption blinks | Not fixed. Cosmetic, rare |
| L3 | "Scroll to play" was `<a href="#">` | Fixed: `<button type="button">` |
| L4 | Rail marked "01" current on the home | Fixed: scene −1 on the home, and no SFX cue for it |
| L5 | Captions `aria-live` verbosity; loading text not a live region | Partial. `role="status"` added on the loading text; caption live region kept (the only text description of the canvas) |
| L6 | Caption taller than the frame on phones | Not fixed. Portrait is out of scope |
| L7 | A long fling cuts mid-motion when the gap is > 3s | By design |
| L8 | Plan statuses stale | Synced in the finalize step |

Also fixed during QA: `ScrollTrigger#getTween(true)` can return a falsy non-tween, so `?.kill()` threw. Now guarded with `snap?.kill`.
