// Chapter captions: shown only while the playhead rests on a chapter's hero frame (inside its hold),
// so they never flicker past during a crawl.
import { gsap } from 'gsap';
import { HEROES } from './scroll-engine.js';

const CAPTIONS = [
  ['Timing & Physics', 'Gravity, contact, recovery — squash on impact, stretch with speed, the value graph drawn live.', ['squash & stretch', 'arcs', 'value graph']],
  ['Kinetic Type', 'One word per beat, each with its own move, ending in a zoom through the O.', ['masks', 'stagger', 'match cut']],
  ['Shape Morph', 'Every shape sampled at the same 240 angles, so any two morph point-to-point without twisting.', ['polar resampling', 'overshoot', 'echo trails']],
  ['Particle Systems', '2,646 points: a burst, a three-arm galaxy, then a dot-matrix wordmark.', ['staggered targets', 'spiral orbits', 'text sampling']],
  ['3D Space', 'No engine — rotation matrices and a perspective divide. Sphere, cube, torus, unwrapped.', ['projection', '3D morph', 'UV unwrap']],
  null, // 06: the bento fills the frame and labels itself; a card would only cover a panel
  ['Rhythm & Edit', 'Recap cuts on 8ths then 16ths — any moment re-rendered on demand, because frames are functions.', ['cutting on the beat', 'RGB split', 'glitch']],
];

export function createCaptions({ calm, onWatch }) {
  const box = document.querySelector('.captions');
  box.innerHTML =
    CAPTIONS.map((c, i) => c && `<article class="caption" data-i="${i}">
      <p class="caption-num">${String(i + 1).padStart(2, '0')} / 07</p><h2>${c[0]}</h2><p class="caption-line">${c[1]}</p>
      <ul>${c[2].map(t => `<li>${t}</li>`).join('')}</ul></article>`).join('') +
    `<article class="caption" data-i="7"><p class="caption-line">Keep scrolling to loop — or</p>
      <button type="button" class="caption-watch">Watch with sound · 15s</button></article>`;
  const cards = [];
  for (const card of box.children) cards[card.dataset.i] = card;
  box.querySelector('.caption-watch').addEventListener('click', onWatch);
  let current = -1;

  return {
    /** settled: the playhead has reached its target, i.e. the viewer is resting, not passing through. */
    update(t, settled) {
      const hero = settled ? HEROES.findIndex(h => Math.abs(t - h) < 0.02) : -1;
      const i = cards[hero] ? hero : -1;
      if (i === current) return;
      if (current >= 0) {
        cards[current].classList.remove('is-visible');
        gsap.to(cards[current], { autoAlpha: 0, y: calm() ? 0 : 8, duration: 0.25, ease: 'power1.in', overwrite: true });
      }
      if (i >= 0) {
        cards[i].classList.add('is-visible');
        gsap.fromTo(cards[i], { autoAlpha: 0, y: calm() ? 0 : 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', overwrite: true });
      }
      current = i;
    },
  };
}
