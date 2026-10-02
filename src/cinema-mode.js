// Watch with sound: the full cut on the audio clock, like the mp4 but live. Owns the canvas while open.
import { gsap } from 'gsap';
import { FPS, DUR } from './core.js';
import { renderFrame } from './timeline.js';
import { renderSoundtrack } from './soundtrack.js';

/**
 * reinit(intensity?) re-initialises the renderer; restore() redraws whatever scroll mode shows;
 * onOpen()/onClose() lock and unlock scrolling, so closing lands on the same frame.
 */
export function createCinema({ reinit, restore, onOpen, onClose }) {
  const html = document.documentElement, closeButton = document.querySelector('.cinema-close');
  let active = false, run = 0, soundtrack = null, ac = null, src = null, t0 = 0, opener = null, covered = [];

  const tick = () => {
    const t = ac.currentTime - t0;
    if (t >= DUR) return close();
    renderFrame(Math.min(t, DUR - 1 / FPS), 1);
  };
  const onKey = e => e.key === 'Escape' && close();

  async function open(e) {
    if (active) return;
    active = true;
    const id = ++run; // a close (or a reopen) bumps run, so a stale continuation below bails out
    opener = e?.currentTarget ?? null;
    onOpen();
    // inert, not just hidden: GSAP inline visibility can beat the stylesheet, and inert also blocks clicks and focus.
    covered = [...document.querySelectorAll('.cover, .captions, .rail, .sound')];
    covered.forEach(el => (el.inert = true));
    html.classList.add('cinema');
    addEventListener('keydown', onKey);
    closeButton.focus();
    const ctx = (ac = new AudioContext());
    const resumed = ctx.resume(); // inside the click: WebKit only unlocks audio during the gesture
    try {
      if (!soundtrack) html.classList.add('cinema-loading');
      // ~1s the first time; cached promise, so a reopen during rendering shares it instead of rendering twice.
      const buffer = await (soundtrack ??= renderSoundtrack().catch(err => {
        soundtrack = null;
        throw err;
      }));
      await resumed;
      if (id !== run) return;
      html.classList.remove('cinema-loading');
      reinit(1); // the opt-in cut plays at full intensity, like the video
      src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
      t0 = ctx.currentTime;
      gsap.ticker.add(tick);
    } catch (err) {
      if (id !== run) return;
      console.warn('Cinema mode unavailable:', err);
      close();
    }
  }

  function close() {
    if (!active) return;
    active = false;
    run++;
    gsap.ticker.remove(tick);
    try {
      src?.stop();
    } catch {
      // never started
    }
    ac?.close();
    ac = src = null;
    html.classList.remove('cinema', 'cinema-loading');
    covered.forEach(el => (el.inert = false));
    removeEventListener('keydown', onKey);
    reinit();
    restore();
    onClose();
    if (opener?.checkVisibility?.({ visibilityProperty: true, opacityProperty: true })) opener.focus();
  }

  closeButton.addEventListener('click', close);
  return {
    open,
    close,
    get active() {
      return active;
    },
    /** Seconds into the cut (0 while loading or closed). */
    get time() {
      return src ? ac.currentTime - t0 : 0;
    },
  };
}
