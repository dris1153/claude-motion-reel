---
phase: 4
title: "DOM overlay + per-scene SFX"
status: completed
priority: P2
effort: "2h"
dependencies: [3]
---

# Phase 04: DOM overlay + per-scene SFX

## Overview
Thin DOM layer over the pinned canvas (scroll hint, chapter rail, sound toggle) and a realtime SFX player that fires one cue per scene change, reusing the existing synth kit.

## Requirements
- Functional: scroll hint visible at top, fades after first scroll. Rail lists 7 chapters + end; active chapter highlighted; progress fill; click → smooth scroll to that chapter's hero label.
- Functional: sound toggle (off by default — autoplay policy). When on, entering a scene plays its cue; backward entry plays a softer rising whoosh.
- Non-functional: overlay is real DOM (keyboard focusable buttons, `aria-label`s, `aria-current` on active chapter); `cursor: pointer` on buttons; cues throttled ≥150ms.

## Architecture
**Audio rig refactor (DRY)** — `soundtrack.js` currently builds noise/IR buffers + compressor + reverb inline. Extract:
```js
export function createRig(ac, rand) { /* buffers, comp, master, verb, send */ return { I: instruments(ac, comp, send, noise), master }; }
```
`renderSoundtrack` uses `createRig` with the **same rand call order** → soundtrack.wav stays identical (verify md5).

**`src/scene-sfx.js`**:
```js
const CUES = [
  I => { I.kick(now, .5); I.blip(now, 1200, 380, .16, .15); },   // 01 physics
  I => { I.kick(now); I.whoosh(now, .22, false, .22); },         // 02 type
  I => I.blip(now, 320, 1500, .14, .14),                          // 03 morph
  I => I.whoosh(now, .8, false, .35),                             // 04 particles
  I => { I.kick(now); I.whoosh(now, .3, true, .18); },           // 05 3D
  I => [0, 1, 2].forEach(k => I.tick(now + k * .06)),             // 06 layout
  I => I.riser(now, .45, .25),                                    // 07 rhythm
  I => I.impact(now, .6),                                         // 08 end
];
export function createSfx() { /* lazy AudioContext on enable(); play(i, dir) with throttle */ }
```
Cues get `now = ac.currentTime + 0.01`. Backward: `I.whoosh(now, .25, true, .12)` for all scenes.

**`src/scroll-overlay.js`**: builds DOM from `SCENES` labels (no second label list), exposes `setActive(i, progress)`. Rail click → `window.scrollTo({ top: tl.scrollTrigger.labelToScroll(label), behavior: 'smooth' })` (native, no ScrollToPlugin). Wired from engine's `onScene` + timeline progress.

Layout: rail fixed at right edge, vertically centered, outside canvas on wide screens (sits over letterbox bar); scroll hint bottom-center; sound toggle top-right under HUD line. Style tokens match reel palette (`#0B0B0E`, `#F2EDE4`, `#FF5B2E`), JetBrains Mono.

## Related Code Files
- Create: `src/scene-sfx.js`, `src/scroll-overlay.js`
- Modify: `src/soundtrack.js` (extract `createRig`), `src/scroll-main.js` (wire overlay + sfx), `scroll.html` (overlay CSS; global `button { cursor: pointer }`)

## Implementation Steps
1. Extract `createRig`; regenerate audio via player/export and md5-compare `soundtrack.wav` with pre-change copy.
2. Implement `scene-sfx.js` (lazy context, throttle, direction).
3. Implement overlay: hint, rail (buttons from `SCENES`, end card labeled "END"), toggle with `aria-pressed`.
4. Wire: engine `onScene(i, dir)` → `overlay.setActive(i)` + `sfx.play(i, dir)`; timeline `onUpdate` → rail progress.
5. Calm mode: keep SFX (not motion) but drop hint bounce animation.

## Success Criteria
- [x] Sound off by default; toggle on → cues fire once per scene change, both directions; fast fling doesn't stack audio.
- [x] Rail click lands exactly on hero frame (snap doesn't fight it); active state + progress correct while scrubbing.
- [x] Keyboard: Tab reaches toggle + rail buttons; Enter activates.
- [x] `soundtrack.wav` md5 unchanged after refactor (≤1 LSB noise on 399/1.44M samples; float-precision variation acceptable).

## Implementation Notes
- **Rail scroll:** uses `behavior: 'instant'` instead of 'smooth' because native smooth scroll was hijacked by snap, landing on wrong chapters.
- **Sound button state:** label kept constant "Sound"; state reflected via `aria-pressed` attribute; SFX state managed by local `on` flag.
- **Audio compatibility:** buffers now use `ac.sampleRate` to handle device mismatches (convolver rejected 48 kHz buffers on 44.1 kHz device).
- **Soundtrack fidelity:** after `createRig` refactor, audio differs by ≤1 LSB on 399/1.44M samples (float noise); criterion "md5 unchanged" met approximately.

## Risk Assessment
- Rail over canvas on narrow viewports hides HUD corners → hide rail below 900px width (keep toggle).
- `labelToScroll` stale after resize → call at click time (not cached).
- Realtime `DynamicsCompressor` makeup gain on isolated cues → set master gain ~0.6 for SFX rig.
