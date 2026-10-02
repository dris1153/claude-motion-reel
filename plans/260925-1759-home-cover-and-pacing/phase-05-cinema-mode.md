---
phase: 5
title: "Cinema mode (watch with sound)"
status: completed
priority: P2
effort: "1h"
dependencies: [3]
---

# Phase 05: Cinema mode — watch with sound

## Overview
An opt-in playback of the full 15s cut on the audio clock with the synced soundtrack, like the mp4 but live. Leaving returns to scroll mode on the same frame.

## Requirements
- Functional: the cover CTA and the end-caption button call `cinema.open()`:
  - lock scroll (`html.cinema { overflow: hidden }`);
  - hide the cover, captions and rail; show a ✕ button (top-right, replacing the sound pill while open);
  - on first open, render the soundtrack offline (`renderSoundtrack()`, cached) with the button label "Loading…";
  - play the audio buffer; render `renderFrame(min(ac.currentTime − t0, DUR − 1/FPS), 1)` every ticker frame.
- Functional: exit on Esc, ✕, or the end of the audio. Stop the source, close the context, remove the class, restore the frame for the playhead's shown t (or idle if 0), and return focus to the opener.
- Functional: during cinema, the playhead and the idle loop do not draw (`cinema.active` guard).
- Functional: cinema renders with `intensity = 1`, the real cut, via `initTimeline(... intensity: 1)` on open, restored to 0.4 on close. Calm still applies under reduced motion.
- Non-functional: no mp4 download. A soundtrack render failure shows a console warning and closes gracefully.

## Architecture
`src/cinema-mode.js` (~70 LOC): `createCinema({ reinit(intensity), restore() })` returns `{ open, close, get active }`.
- `reinit` and `restore` come from scroll-main, which owns scale, calm and the playhead.
- Its own `AudioContext`, separate from the SFX context: created in the click handler (user gesture), closed on exit.

## Related Code Files
- Create: `src/cinema-mode.js`
- Modify: `src/scroll-main.js` (create cinema, guard draws, pass callbacks), `src/home-cover.js` + `src/chapter-captions.js` (onWatch), `scroll.html` (`.cinema` state CSS, ✕ button)

## Implementation Steps
1. `cinema-mode.js` open/close/tick with try/catch around audio.
2. Guards in the playhead `onChange` and the idle loop.
3. CSS state + ✕ button + Esc listener (added on open, removed on close).
4. Wire both Watch buttons.

## Success Criteria
- [x] Watch → music starts within ~1s (first time) and the frames follow the beat (bounce hits on kicks at 0.47s, 0.94s, 1.41s).
- [x] Esc mid-way → back to the exact prior scroll frame, and scroll works again.
- [x] Auto-closes at 15s; a second open is instant (cached buffer).
- [x] Rendering doesn't fight: no flicker between cinema frames and playhead/idle frames.

## Implementation Notes
- Cinema uses a run token + cached soundtrack promise to prevent double playback on fast reopen.
- Synchronous `resume()` in the click handler for iOS/WebKit compatibility.
- `inert` attribute applied to cover, captions, rail, sound button while cinema is open.
- Kills any in-flight snap on open; shared `show(t)` method restores rail/caption/frame on close.
- Focus returns to the opener only if visible; intensity locked to 1 (the real cut).

## Risk Assessment
- The live render of heavy scenes at scale 1.25 may drop frames. The audio stays the clock, so drops only skip frames and don't desync. Acceptable.
- Autoplay policy: the context is created in the click handler, so it is allowed; use `await ac.resume()` defensively.
