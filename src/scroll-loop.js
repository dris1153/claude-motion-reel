// Infinite scroll: the frame at loopY + x is drawn exactly like the frame at 0 + x (same home idle, same cover), so
// the scroll position can wrap invisibly. Forward on any input; backward only for wheel/trackpad — native touch
// and keys can't scroll above 0, and there's no Lenis at all under reduced motion.
const EPS = 1; // loopY is fractional but scroll offsets snap to whole pixels
const UP_DEADZONE = 30; // px of deliberate upward wheel at the top before looping back (stray trackpad deltas don't count)

export function createScrollLoop({ smooth, loopY }) {
  let jumpingBack = false, upSum = 0, upAt = 0;

  // Lenis glide past the loop point: wrap mid-flight and carry the rest of the glide, so momentum survives the seam.
  smooth.onScroll(lenis => {
    // Only downward Lenis glides and our own scrolls (a snap's final frame is emitted after isScrolling resets).
    // Native input (touch momentum, keys, scrollbar) wraps once it comes to rest — jumping mid-momentum janks on iOS.
    const own = lenis.isScrolling === 'smooth' || lenis.userData?.programmatic;
    if (jumpingBack || !own || lenis.targetScroll < lenis.animatedScroll) return;
    const at = lenis.animatedScroll, L = loopY();
    if (at < L - EPS) return;
    const rest = lenis.targetScroll - at;
    smooth.scrollTo(Math.max(0, at - L), { immediate: true });
    if (rest > 1) lenis.scrollTo(Math.max(0, at - L) + rest, { programmatic: false, lerp: 0.1 }); // user-like: snap follows
  });

  // Native input under Lenis (touch momentum, keys, scrollbar): wrap at rest, then settle on the nearest label.
  smooth.onScrollEnd(() => {
    const L = loopY();
    if (scrollY < L - EPS) return false;
    smooth.scrollTo(Math.max(0, scrollY - L), { immediate: true });
    smooth.settleNearest();
    return true;
  });

  // Reduced motion (no Lenis): wrap once the browser's scroll ends (debounced scroll where scrollend is missing).
  const calmWrap = () => {
    const L = loopY();
    if (!smooth.lenis && scrollY >= L - EPS) window.scrollTo({ top: Math.max(0, scrollY - L), behavior: 'instant' });
  };
  if ('onscrollend' in window) addEventListener('scrollend', calmWrap);
  else {
    let timer = 0;
    addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(calmWrap, 150);
    });
  }

  // Backward: wheel up that would clamp at 0 jumps to the identical frame at the loop point first, keeping the pending
  // glide; Lenis then applies the wheel delta from there, so the glide continues up into the bridge.
  smooth.onVirtualScroll((data, lenis) => {
    const e = data.event;
    if (lenis.isStopped || e.ctrlKey || e.type !== 'wheel' || data.deltaY >= 0 || lenis.targetScroll + data.deltaY >= 0) return;
    const now = performance.now();
    if (now - upAt > 300) upSum = 0;
    upAt = now;
    upSum -= data.deltaY;
    if (upSum < UP_DEADZONE) return;
    const L = loopY(), y = L + lenis.animatedScroll, target = L + lenis.targetScroll;
    if (y > lenis.limit) return; // gliding too far below the top: the mirrored buffer doesn't reach, clamp at 0 this time
    jumpingBack = true;
    smooth.scrollTo(y, { immediate: true });
    jumpingBack = false;
    lenis.targetScroll = target; // the jump reset it; Lenis adds this wheel's delta on top
  });
}
