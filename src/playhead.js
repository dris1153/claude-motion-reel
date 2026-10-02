// The frame on screen chases the scroll's target time at a capped speed, so a hard fling plays the reel
// at most MAX_RATE× realtime instead of 3–6×. Big gaps (rail jumps, scrollbar drags) cut instead of crawling.
import { gsap } from 'gsap';

const MAX_RATE = 1.25; // reel seconds per real second
const JUMP_GAP = 3; // seconds; beyond this a crawl would take too long
const SETTLE = 0.05; // ease-in time constant toward the target — short, since Lenis already smooths the input

/** instant(): when true (reduced motion) the frame follows the scroll directly — no auto-played frames. */
export function createPlayhead(onChange, instant = () => false) {
  let target = 0, shown = 0;
  gsap.ticker.add((time, deltaMs) => {
    const gap = target - shown;
    if (gap === 0) return;
    const dt = Math.min(deltaMs, 50) / 1000; // a backgrounded tab mustn't turn into one giant step
    if (instant() || Math.abs(gap) > JUMP_GAP) shown = target;
    else {
      const eased = gap * (1 - Math.exp(-dt / SETTLE));
      shown += Math.sign(gap) * Math.min(Math.abs(eased), MAX_RATE * dt);
      if (Math.abs(target - shown) < 1e-4) shown = target;
    }
    onChange(shown);
  });
  return {
    set: t => (target = t),
    get t() {
      return shown;
    },
    get target() {
      return target;
    },
  };
}
