// Home cover: a DOM title block over the idle canvas. Enters on load, scrubs out with the intro scroll.
// Entrance animates the inner elements, the exit animates their .cover-block wrappers, so the two never fight.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export function createCover({ calm, onScrollToPlay, onWatch }) {
  const root = document.querySelector('.cover'), blocks = root.querySelectorAll('.cover-block');
  root.querySelector('.cta-scroll').addEventListener('click', onScrollToPlay);
  root.querySelector('.cta-watch').addEventListener('click', onWatch);

  const exit = gsap.timeline({ paused: true, defaults: { ease: 'power1.in' } });
  exit.to(blocks, { y: -48, autoAlpha: 0, duration: 0.6, stagger: 0.1 });

  document.documentElement.classList.add('cover-ready');
  // opacity only (not autoAlpha): an inline visibility would override the stylesheet's cinema hiding.
  if (calm()) gsap.from(root, { opacity: 0, duration: 0.4, clearProps: 'opacity' });
  else {
    SplitText.create(root.querySelector('h1'), {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      // Returned so SplitText reverts it and restores its progress when fonts load or the frame resizes.
      onSplit: split => gsap.from(split.lines, { yPercent: 110, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.15 }),
    });
    gsap.from(root.querySelectorAll('.kicker, .meta, .ctas > *'), { y: 16, autoAlpha: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, delay: 0.45 });
  }

  return {
    /** p: 0 → 1 over the intro scroll. */
    setIntro: p => exit.progress(p),
  };
}
