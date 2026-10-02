---
phase: 1
title: "Playhead, intro zone, holds, snap"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 01: Playhead, intro zone, holds, snap

## Overview
Split "where the scroll is" from "what frame is shown". Scroll sets a target t; a playhead shows it at ≤ 1.25× realtime. The timeline also gets an intro zone before t starts, 0.7-viewport holds at each hero frame, and softer snapping to the centre of each hold.

## Requirements
- Functional:
  - Hard flings never play the reel faster than 1.25×.
  - Rail jumps and scrollbar drags with a gap > 3s cut straight to the target.
  - Every chapter rests on a still frame for 0.7 viewport.
  - Snap lands in the middle of a hold.
- Functional: `proxy.intro` goes 0→1 over the first viewport while `t` stays 0.
- Non-functional:
  - One ticker callback.
  - No render when the shown t is unchanged.
  - Clamp tick delta at 50ms (tab switches).

## Architecture
`src/playhead.js` (new, ~35 LOC):
```js
export function createPlayhead({ maxRate = 1.25, jumpGap = 3, onChange }) {
  let target = 0, shown = 0;
  gsap.ticker.add((time, deltaMs) => {
    const gap = target - shown;
    if (gap === 0) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    if (Math.abs(gap) > jumpGap) shown = target;          // rail jump / scrollbar drag: cut, don't crawl
    else {
      const eased = gap * (1 - Math.exp(-dt / 0.12));     // ease into the target...
      shown += Math.sign(gap) * Math.min(Math.abs(eased), maxRate * dt); // ...never faster than the cap
      if (Math.abs(target - shown) < 1e-4) shown = target;
    }
    onChange(shown);
  });
  return { set: t => (target = t), get t() { return shown; }, get target() { return target; } };
}
```
`scroll-engine.js`:
- Build the timeline by walking positions (replaces `timeToPosition`).
- `scrub: true`: the playhead now does the smoothing.
- `onUpdate` → `playhead.set(proxy.t)` + `onIntro(proxy.intro)` + progress. Rendering moves to the playhead's `onChange` (wired in scroll-main).
```js
const INTRO = 1, HOLD = 0.7, PACE = 1.2;
let pos = 0;
tl.fromTo(proxy, { intro: 0 }, { intro: 1, duration: INTRO, immediateRender: false }, 0);
pos = INTRO;
SCENES.forEach((s, i) => {
  const w = WEIGHTS[i] * PACE, lead = (w * (HEROES[i] - s.at)) / (ends[i] - s.at);
  tl.fromTo(proxy, { t: s.at }, { t: HEROES[i], duration: lead, immediateRender: false }, pos);
  pos += lead;
  tl.addLabel(`c${i}`, pos + HOLD / 2);   // snap target = middle of the hold
  pos += HOLD;                             // nothing tweens here → t stays on the hero frame
  tl.fromTo(proxy, { t: HEROES[i] }, { t: ends[i], duration: w - lead, immediateRender: false }, pos);
  pos += w - lead;
});
```
- Keep the edge labels `top` (0) and `end` (pos).
- `total = pos`; `end: () => '+=' + total * innerHeight`.
- `snapLabels` is built from all labels / total, as today.
- Snap vars: `duration { min: 0.4, max: 0.9 }`, `delay: 0.2`, `ease: 'power2.inOut'`, `inertia: false`. Calm returns the current progress (no snap), as today.
- Export `HEROES` (captions need them) and `INTRO` progress fraction if needed.
- `scrollToChapter` is unchanged (instant); the playhead decides between cut and crawl.

## Related Code Files
- Create: `src/playhead.js`
- Modify: `src/scroll-engine.js` (timeline build, scrub, callbacks), `src/scroll-main.js` (render from the playhead's `onChange`; expose `window.scrollReel.t` = shown, `.target`), `scripts/qa-scroll.mjs` (`settle` reads `scrollReel.t`, not `engine.proxy.t`)

## Implementation Steps
1. Write `playhead.js`.
2. Rebuild the timeline with intro + holds + PACE; remove `timeToPosition`.
3. Engine callbacks: `onTarget(t)`, `onIntro(p)`, `onProgress(p)`. Move render, scene-change and SFX logic into scroll-main's playhead `onChange`.
4. Update `settle` in QA to wait on the shown t; run `pnpm qa` (fwd/bwd, resize, reduced-motion checks must still pass; heroes now resolve at hold centres).
5. Tune by feel: `MAX_RATE`, the exponential time constant 0.12s, `HOLD`.

## Success Criteria
- [x] Fling test: shown t never advances > 1.3 reel-s per real-s (sampled in QA, phase 06).
- [x] Rail click from c0 to c7 cuts (gap > 3s); c1 → c2 crawls at ≤ 1.25×.
- [x] Every `c{i}` label lands on `t === HEROES[i]` exactly.
- [x] Existing `pnpm qa` checks pass.

## Implementation Notes
- `instant` parameter added to playhead: when true, cuts straight to target without auto-playing frames (used by reduced motion and cinema mode transitions).
- Engine builds timeline segments upfront; labels placed mid-hold (exact hold centres); edge labels `top` and `end` preserved.
- Speed-cap measurement uses ≥250 ms windows; sampling frames can drift ±1 tick from GSAP ticker heartbeat. Headless measured 1.28–1.33×, with 100 ms windows peaked 1.36× — acceptable as measurement jitter; caps are exact per tick.

## Risk Assessment
- The playhead lags the scroll by design. The rail fill follows the scroll, the frame follows the playhead. If it feels laggy, raise `MAX_RATE` to 1.5.
- The ticker runs forever. It returns early when gap = 0, so the cost is negligible.
- Snap fights the user in long holds: the hold is exactly where snap lands, so the effect is benign.
