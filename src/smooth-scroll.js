// Smooth wheel scrolling (Lenis) under ScrollTrigger. Every programmatic scroll goes through here, so Lenis never
// animates back to a stale target. Off under reduced motion: native scrolling, and no snap (onScrollEnd stays silent).
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const IDLE = 200; // ms without scroll events before a stop counts as the end of a scroll
const SCROLL_KEYS = new Set(['PageDown', 'PageUp', 'Space', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End']);

export function createSmoothScroll(enabled) {
  let lenis = null, direction = 1, timer = 0, pointerDown = false, nearestNext = false, wheelHook = null;
  const endListeners = [], scrollListeners = [];

  const armEnd = () => {
    clearTimeout(timer);
    timer = setTimeout(checkEnd, IDLE);
  };
  function checkEnd() {
    if (!lenis || lenis.isStopped) return;
    // Still moving (trackpad momentum, our own glide), or a finger / scrollbar thumb is still down. A 'native'
    // state with zero velocity is stale (Lenis only clears it after movement), so it doesn't block.
    const moving = lenis.isScrolling === 'smooth' || (lenis.isScrolling === 'native' && lenis.velocity);
    if (moving || lenis.isTouching || pointerDown) return armEnd();
    const dir = nearestNext ? 0 : direction; // after a layout restore, settle on the nearest label, not onward
    nearestNext = false;
    endListeners.some(fn => fn(dir) === true); // a listener returning true consumes the scroll end (e.g. a loop wrap)
  }
  const onScroll = () => {
    ScrollTrigger.update();
    scrollListeners.forEach(fn => fn(lenis)); // every frame, ours included (a snap arriving at the loop point wraps)
    // Frames of our own scrollTo (snap, jumps) mustn't flip the direction or re-arm a snap. Lenis only clears
    // userData when a new scrollTo starts or one completes, so once native scrolling takes over, ignore the flag.
    if (lenis.userData?.programmatic && lenis.isScrolling !== 'native') return;
    if (lenis.direction) direction = lenis.direction;
    armEnd();
  };
  // Keyboard or pointer input during our own glide: cancel it so the input scrolls instead of being overwritten.
  const cancelOwnGlide = () => {
    if (lenis?.isScrolling === 'smooth' && lenis.userData?.programmatic) {
      lenis.stop(); // the only public way to abort a Lenis animation
      lenis.start();
    }
  };
  addEventListener('keydown', e => SCROLL_KEYS.has(e.key) && cancelOwnGlide());
  addEventListener('pointerdown', () => {
    pointerDown = true;
    cancelOwnGlide();
  });
  addEventListener('pointerup', () => (pointerDown = false));
  addEventListener('pointercancel', () => (pointerDown = false));

  const create = () => {
    // touch stays native (syncTouch off); virtualScroll lets a hook act on wheel input before Lenis clamps it at 0
    lenis = new Lenis({ lerp: 0.1, autoRaf: false, virtualScroll: data => wheelHook?.(data, lenis) ?? true });
    lenis.on('scroll', onScroll);
  };
  const destroy = () => {
    clearTimeout(timer);
    lenis?.destroy();
    lenis = null;
  };

  // One clock for GSAP, ScrollTrigger and Lenis. Lag smoothing off: Lenis needs the real frame deltas.
  gsap.ticker.add(time => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  if (enabled) create();

  return {
    setEnabled(on) {
      if (on === Boolean(lenis)) return;
      const y = scrollY;
      destroy();
      if (on) create();
      window.scrollTo({ top: y, behavior: 'instant' });
    },
    /** force: scroll even while stopped; pass it after layout changes (Lenis re-measures first). */
    scrollTo(y, { immediate = false, force = false, duration, easing } = {}) {
      if (!lenis) return window.scrollTo({ top: y, behavior: 'instant' });
      if (force) {
        nearestNext = true;
        lenis.resize(); // its scroll limit is measured async; a stale one would clamp the target
      }
      lenis.scrollTo(y, { immediate, force, duration, easing, userData: { programmatic: true } });
    },
    stop: () => lenis?.stop(),
    start() {
      lenis?.start();
      if (lenis) armEnd(); // whatever was interrupted (a glide, a snap) still settles on a label
    },
    onScrollEnd: fn => endListeners.push(fn),
    onScroll: fn => scrollListeners.push(fn),
    /** fn(data, lenis) runs on every wheel/touch input before Lenis applies it; return false to swallow it. */
    onVirtualScroll: fn => (wheelHook = fn),
    /** The next scroll end settles on the nearest label instead of continuing in the scroll direction. */
    settleNearest() {
      nearestNext = true;
      if (lenis) armEnd();
    },
    get lenis() {
      return lenis;
    },
  };
}
