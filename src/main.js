import { FPS, DUR } from './core.js';
import { bootReel } from './boot-reel.js';
import { renderFrame } from './timeline.js';
import { renderSoundtrack, wavBase64 } from './soundtrack.js';

const canvas = document.querySelector('canvas');
// The export must never render with fallback fonts.
const ready = bootReel(canvas).then(failed => {
  if (failed.length) throw new Error(`Fonts failed to load: ${failed.join(', ')}`);
});

// Hooks for the headless exporter (render.mjs).
window.reel = {
  ready,
  FPS,
  DUR,
  frame: (t, samples) => {
    renderFrame(t, samples);
    return canvas.toDataURL('image/png');
  },
  audio: async () => wavBase64(await renderSoundtrack()),
};

const play = document.getElementById('play'), scrub = document.getElementById('scrub'), clock = document.getElementById('time');
let actx = null, audio = null, src = null, t0 = 0;

function show(t) {
  renderFrame(t, 1);
  scrub.value = t;
  clock.textContent = `${t.toFixed(2)}s`;
}

function stop() {
  src?.stop();
  src = null;
  play.textContent = '▶ Play';
}

async function start() {
  actx ??= new AudioContext();
  audio ??= await renderSoundtrack();
  const from = +scrub.value >= DUR - 0.05 ? 0 : +scrub.value;
  src = actx.createBufferSource();
  src.buffer = audio;
  src.connect(actx.destination);
  src.start(0, from);
  t0 = actx.currentTime - from;
  play.textContent = '❚❚ Pause';
  const node = src;
  const tick = () => {
    if (src !== node) return;
    const t = actx.currentTime - t0;
    if (t >= DUR) {
      stop();
      return show(DUR - 1 / FPS);
    }
    show(t);
    requestAnimationFrame(tick);
  };
  tick();
}

ready.then(() => show(7.3));
play.onclick = () => (src ? stop() : start());
scrub.oninput = () => {
  stop();
  show(+scrub.value);
};
addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  play.click();
});
