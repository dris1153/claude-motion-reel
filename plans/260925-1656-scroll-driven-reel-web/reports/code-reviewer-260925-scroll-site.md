# Code review — scroll site (condensed) + resolution

Reviewer ran headless probes; findings below with how each was resolved. Verified by `pnpm qa` (new regression checks), `pnpm parity`, UI probe (rail + sound).

| ID | Finding | Resolution |
|---|---|---|
| H1 | No snap label at progress 0/1 → every load snapped to c0 (hint never seen); edges snapped inward | Fixed: `top`/`end` labels. QA asserts `scrollY === 0, t≈0` after 1.5s idle |
| H2 | Height change (zoom, fullscreen, rotation) kept pixel offset → jumped chapters | Fixed: `refreshInit`/`refresh` listeners restore scroll progress. QA resizes 900→700→1000→900, t stays 7.38 |
| M1 | Reduced-motion toggle rebuilt engine → position lost | Fixed by removing the rebuild: calm is a live flag (`isCalm()`), snap function returns `p` when calm; renderer re-inits in place. QA asserts t unchanged |
| M2 | Sound toggle state from `ac.state` (async on FF/Safari, `interrupted` on iOS) | Fixed: local `on` flag, `await resume()/suspend()`, try/catch. Also found+fixed: convolver buffer 48k vs 44.1k device rate threw → buffers use `ac.sampleRate` |
| M3 | Calm mode still auto-scrolled (snap tweens, smooth rail) → montage flashes | Fixed: no snap when calm; rail jumps are instant (smooth scroll was also hijacked by snap — rail click landed on wrong chapter) |
| M4 | Font load failure → top-level await throws → blank page | Fixed: `Promise.allSettled`; site warns + falls back, export (`main.js`) still throws |
| M5 | 5 full-res canvases reallocated per init; sub/acc unused on site | Fixed: pooled buffers resized in place; sub/acc created lazily only when samples > 1 |
| L1 | Malformed %-encoding crashed `server.mjs` | Fixed: 400 |
| L2 | Parity covers BLUR=1 only; `ls` fragile | `ls f*.png` fixed. BLUR=16 baseline not added (accumulation math unchanged at scale 1; full `pnpm render` OK) |
| L3 | Sound label + aria-pressed double announcement; unhandled rejection | Fixed: constant "Sound" label, state via aria-pressed; toggle never rejects |
| L4 | `100vw` includes scrollbar → canvas cropped | Fixed: `100%` |
| L5 | DPR change across monitors w/o resize | Not done (optional) |
| L6 | Extra cue on rebuild | Moot: no rebuild anymore |
| L7 | Burst glow ignores calm | Not done (soft 0.3s glow, optional) |
| L8 | Plan statuses stale | Synced in finalize step |

Perf note: scale cap lowered 1.5 → 1.25 after headed QA (1.5× gave p95 20–30ms frames in particles/montage on this GPU; 1.25× ≤ 15–20ms).
