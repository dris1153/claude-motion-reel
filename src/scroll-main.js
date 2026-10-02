import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { W, BAR } from './core.js';
import { bootReel } from './boot-reel.js';
import { initTimeline, renderFrame, renderIdle, renderBridge, sceneIndex } from './timeline.js';
import { createScrollEngine, HEROES, END_T, LOOP_T } from './scroll-engine.js';
import { createPlayhead } from './playhead.js';
import { createOverlay } from './scroll-overlay.js';
import { createCover } from './home-cover.js';
import { createCaptions } from './chapter-captions.js';
import { createCinema } from './cinema-mode.js';
import { createSfx } from './scene-sfx.js';
import { createSmoothScroll } from './smooth-scroll.js';
import { createScrollLoop } from './scroll-loop.js';

const WEB_INTENSITY = 0.4; // the site runs the reel's shakes and flashes softer than the video
const stage = document.getElementById('stage'), canvas = stage.querySelector('canvas');
// Backing-store density: match on-screen device pixels, capped at 1.25× (fill cost grows with the square; 1.5× dropped frames in QA).
const computeScale = () => Math.min(1.25, Math.max(0.5, Math.round(((canvas.clientWidth * devicePixelRatio) / W) * 20) / 20));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

let calm = reduceMotion.matches, scale = computeScale(), intro = 0, scene = -1, shownT = 0;
const failedFonts = await bootReel(canvas, { scale, calm, intensity: WEB_INTENSITY });
if (failedFonts.length) console.warn('Fonts failed, using fallbacks:', failedFonts.join(', '));
const smooth = createSmoothScroll(!calm);

// The home is both the start (t = 0) and the end of the loop bridge (t ≥ LOOP_T): same idle frame, same cover.
const isHome = t => t === 0 || t >= LOOP_T;

/** The canvas frame for reel time t: home idle, loop bridge, or reel. */
function drawFrame(t, introNow = intro) {
  if (isHome(t)) renderIdle(gsap.ticker.time, introNow);
  else if (t > END_T) renderBridge(END_T - 7 * BAR, (t - END_T) / (LOOP_T - END_T));
  else renderFrame(t, 1);
}

/** Everything scroll mode shows for reel time t: the frame, rail, SFX, caption. */
function show(t) {
  drawFrame(t);
  const i = isHome(t) ? -1 : sceneIndex(t); // -1 = home, before chapter 01
  if (i !== scene) {
    overlay.setScene(i);
    if (i >= 0) sfx.play(i, t > shownT); // by time, not scene index: looping backward goes home (−1) → end card (7)
    scene = i;
  }
  captions.update(t, t === playhead.target);
  shownT = t;
}
const reinit = (intensity = WEB_INTENSITY) => initTimeline(canvas, { scale, calm, intensity });

const sfx = createSfx();
const cinema = createCinema({
  reinit,
  restore: () => show(playhead.t),
  onOpen: smooth.stop, // also halts a snap in flight, which would move the page under cinema
  onClose: smooth.start,
});
const jumpTo = label => smooth.scrollTo(engine.labelScroll(label), { immediate: true }); // the playhead animates or cuts it
const overlay = createOverlay({ onChapter: i => jumpTo(`c${i}`), onSound: sfx.toggle });
const cover = createCover({ calm: () => calm, onScrollToPlay: () => jumpTo('c0'), onWatch: cinema.open });
const captions = createCaptions({ calm: () => calm, onWatch: cinema.open });

const playhead = createPlayhead(
  t => cinema.active || show(t),
  // Reduced motion follows the scroll directly; so does the loop bridge, which must play in full before the wrap
  // (a snap reaches the loop point faster than a 1.25× crawl would get through it).
  () => calm || (playhead.t >= END_T && playhead.target >= END_T),
);
// The home idle loops on the real-time clock; under reduced motion it's a still frame, redrawn only when the intro moves.
let idleDrawnAt = NaN;
gsap.ticker.add(time => {
  if (cinema.active || !isHome(playhead.t) || (calm && intro === idleDrawnAt)) return;
  renderIdle(time, intro);
  idleDrawnAt = intro;
});

let lastProgress = null, keep = null;
const engine = createScrollEngine({
  stage,
  onTarget: t => playhead.set(t),
  onIntro: p => {
    intro = p;
    cover.setIntro(p);
  },
  onProgress: p => {
    lastProgress = p;
    overlay.setProgress(engine.railFill(p));
  },
});

// A height change rescales the scroll length but keeps the pixel offset, which lands on another chapter:
// restore the progress instead. lastProgress stays null until the reel updates, so a reload keeps the
// browser's own scroll restoration.
ScrollTrigger.addEventListener('refreshInit', () => (keep = lastProgress));
ScrollTrigger.addEventListener('refresh', () => {
  const st = engine.tl.scrollTrigger;
  if (keep === null) return;
  smooth.scrollTo(st.start + keep * (st.end - st.start), { immediate: true, force: true });
  engine.sync(); // on a width-only resize the scroll doesn't move, so nothing else would undo the t=0 emitted by the revert
});

const refresh = () => {
  reinit(cinema.active ? 1 : WEB_INTENSITY); // resizing the canvas clears it
  idleDrawnAt = NaN;
  if (!cinema.active) show(playhead.t);
};
reduceMotion.addEventListener('change', () => {
  calm = reduceMotion.matches;
  smooth.setEnabled(!calm);
  if (cinema.active) smooth.stop(); // keep the cinema scroll lock on a freshly created Lenis
  refresh();
});

// Infinite loop, registered before snap so a wrap can consume the scroll end.
createScrollLoop({ smooth, loopY: () => engine.loopScroll() });

// After a scroll ends, glide on to the next hero in the scroll direction (Lenis only: no snap under reduced motion).
const inOutQuad = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
smooth.onScrollEnd(direction => {
  const y = cinema.active ? null : engine.snapScroll(direction);
  if (y === null) return;
  const duration = Math.min(0.9, Math.max(0.4, (Math.abs(y - scrollY) / innerHeight) * 0.9));
  smooth.scrollTo(y, { duration, easing: inOutQuad });
});
let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const next = computeScale();
    if (next === scale) return;
    scale = next;
    refresh();
  }, 150);
});

// Dev/QA hook, like window.reel on the player page.
window.scrollReel = {
  engine,
  smooth,
  heroes: HEROES,
  render: t => renderFrame(t, 1),
  drawFrame, // (t, intro): any site frame, e.g. the loop bridge or the home at a given intro
  loopT: LOOP_T,
  get t() {
    return playhead.t;
  },
  get target() {
    return playhead.target;
  },
  get calm() {
    return calm;
  },
  get cinema() {
    return cinema.active;
  },
  get cinemaTime() {
    return cinema.time;
  },
};
