// One short cue per scene change while scrolling. Music can't stay on the beat under free scrubbing; cues can.
import { rng } from './core.js';
import { createRig } from './soundtrack.js';

const GAP = 0.15; // seconds between cues, so a fast fling doesn't stack a wall of sound
const CUES = [
  (I, t) => { I.kick(t, 0.5); I.blip(t, 1200, 380, 0.16, 0.15); }, // 01 physics
  (I, t) => { I.kick(t); I.whoosh(t, 0.22, false, 0.22); }, // 02 kinetic type
  (I, t) => I.blip(t, 320, 1500, 0.14, 0.14), // 03 morph
  (I, t) => I.whoosh(t, 0.8, false, 0.35), // 04 particles
  (I, t) => { I.kick(t); I.whoosh(t, 0.3, true, 0.18); }, // 05 3D
  (I, t) => [0, 1, 2].forEach(k => I.tick(t + k * 0.06)), // 06 layout
  (I, t) => I.riser(t, 0.45, 0.25), // 07 rhythm
  (I, t) => I.impact(t, 0.6), // 08 end card
];

export function createSfx() {
  // `on` is the source of truth: ac.state lags behind resume/suspend and can read 'interrupted' on iOS.
  let ac = null, I = null, on = false, last = -Infinity;
  return {
    /** Must run inside a user gesture (autoplay policy). Resolves to whether sound is now on. */
    async toggle() {
      on = !on;
      try {
        if (!ac) {
          ac = new AudioContext();
          I = createRig(ac, rng(7), 0.6).I;
        }
        await (on ? ac.resume() : ac.suspend());
      } catch (err) {
        console.warn('Sound unavailable:', err);
        on = false;
      }
      return on;
    },
    play(scene, forward) {
      if (!on || ac.currentTime - last < GAP) return;
      last = ac.currentTime;
      const t = ac.currentTime + 0.01;
      if (forward) CUES[scene](I, t);
      else I.whoosh(t, 0.25, true, 0.12);
    },
  };
}
