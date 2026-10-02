// Scroll → target reel time. A GSAP timeline tweens a proxy { intro, t } that ScrollTrigger scrubs 1:1;
// the playhead, not the scroll, decides which frame is on screen.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCENES } from './timeline.js';

gsap.registerPlugin(ScrollTrigger);

// Scroll length per scene in viewport heights (SCENES order); the montage gets extra room so 16th-note cuts stay readable.
const WEIGHTS = [1.5, 2, 1.5, 2, 2, 1.5, 2.5, 1];
const PACE = 1.2; // global stretch on WEIGHTS
const INTRO = 1; // the home cover scrolls out before the reel starts
const HOLD = 0.7; // the frame rests on each chapter's hero this long, so there is somewhere to breathe
// Each chapter's best frame (global t). A scene's first frame is usually mid-transition.
export const HEROES = [1.2, 3.42, 5.37, 7.38, 8.7, 10.25, 11.3, 14.4];
export const END_T = 14.6; // the reel stops before its fade to black; the loop bridge takes over from here
export const LOOP_T = 15.8; // end of the bridge: from here on the frame is the home again
const BRIDGE = 1.2; // viewports for the bridge (end card → ball launch)
const BUFFER = 0.6; // a copy of the intro's start past the loop point, so momentum can run on before the wrap

// Layout in viewport units: intro, then per scene a lead-in to the hero, a hold, and the tail to the next scene.
const SEGMENTS = [];
let total = INTRO;
SCENES.forEach((s, i) => {
  const end = SCENES[i + 1]?.at ?? END_T, w = WEIGHTS[i] * PACE, lead = (w * (HEROES[i] - s.at)) / (end - s.at);
  SEGMENTS.push({ from: s.at, to: HEROES[i], at: total, dur: lead });
  SEGMENTS.push({ from: HEROES[i], to: end, at: total + lead + HOLD, dur: w - lead, label: total + lead + HOLD / 2 });
  total += w + HOLD;
});
const BRIDGE_AT = total, BACK_AT = BRIDGE_AT + BRIDGE, LOOP_AT = BACK_AT + INTRO;
total = LOOP_AT + BUFFER;

export function createScrollEngine({ stage, onTarget, onIntro, onProgress }) {
  const proxy = { intro: 0, t: 0 };
  const emit = () => {
    onIntro(proxy.intro);
    onTarget(proxy.t);
    onProgress(tl.scrollTrigger.progress);
  };
  const tl = gsap.timeline({
    defaults: { ease: 'none', immediateRender: false },
    onUpdate: emit,
    scrollTrigger: {
      trigger: stage,
      pin: true,
      start: 'top top',
      end: () => `+=${total * innerHeight}`,
      scrub: true, // the playhead does the smoothing (and the speed cap); snapping is driven by Lenis (snapScroll)
      invalidateOnRefresh: true,
    },
  });
  tl.fromTo(proxy, { intro: 0 }, { intro: 1, duration: INTRO }, 0);
  // Nothing tweens during a hold, so t rests on the hero frame; its label (the snap target) sits mid-hold.
  SEGMENTS.forEach(s => tl.fromTo(proxy, { t: s.from }, { t: s.to, duration: s.dur }, s.at));
  // Loop: the bridge, then the intro played backwards (ball drops back, cover returns). At LOOP_AT the frame is the
  // home, identical to scroll 0; the buffer repeats the intro's start so LOOP_AT + x looks exactly like 0 + x.
  tl.fromTo(proxy, { t: END_T }, { t: LOOP_T, duration: BRIDGE }, BRIDGE_AT);
  tl.fromTo(proxy, { intro: 1 }, { intro: 0, duration: INTRO }, BACK_AT);
  tl.fromTo(proxy, { intro: 0 }, { intro: BUFFER / INTRO, duration: BUFFER }, LOOP_AT);
  tl.addLabel('top', 0);
  SEGMENTS.filter(s => s.label !== undefined).forEach((s, i) => tl.addLabel(`c${i}`, s.label));
  tl.addLabel('loop', LOOP_AT);
  const snapLabels = ScrollTrigger.snapDirectional(Object.values(tl.labels).map(p => p / total));

  return {
    tl,
    proxy,
    /** Scroll offset of a label; resolve at use time, offsets change on every refresh/resize. */
    labelScroll: label => tl.scrollTrigger.labelToScroll(label),
    /** The loop point's scroll offset, computed directly (cheap enough to call every frame). */
    loopScroll: () => tl.scrollTrigger.start + (LOOP_AT / total) * (tl.scrollTrigger.end - tl.scrollTrigger.start),
    /** Rail fill for scroll progress p that is seamless across the loop: fills through the reel and bridge, drains as
     * the home returns, and the buffer past the loop point mirrors the top. */
    railFill(p) {
      const y = p * total;
      return y <= BACK_AT ? y / BACK_AT : y <= LOOP_AT ? (LOOP_AT - y) / INTRO : (y - LOOP_AT) / BACK_AT;
    },
    /** Re-announce the current state. A refresh reverts the timeline (emitting t=0) and restores it silently. */
    sync: emit,
    /** Where to settle after a scroll ends: the next label in the scroll direction, or null if already there. */
    snapScroll(direction) {
      const st = tl.scrollTrigger, y = st.start + snapLabels(st.progress, direction) * (st.end - st.start);
      return Math.abs(y - scrollY) > 1 ? y : null;
    },
  };
}
