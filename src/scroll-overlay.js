// Thin DOM layer over the pinned canvas: chapter rail and sound toggle.
import { SCENES } from './timeline.js';

const CHAPTERS = SCENES.map((s, i) => s.label || `${String(i + 1).padStart(2, '0')} / END`).map(l => l.split(' / '));

export function createOverlay({ onChapter, onSound }) {
  const rail = document.createElement('nav');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'Chapters');
  rail.innerHTML = `<span class="rail-track"><span class="rail-fill"></span></span><ol>${CHAPTERS.map(
    ([num, name], i) => `<li><button type="button" data-i="${i}"><span class="name">${name}</span><span class="num">${num}</span></button></li>`,
  ).join('')}</ol>`;

  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'sound';
  sound.setAttribute('aria-pressed', 'false');
  sound.textContent = 'Sound'; // state lives in aria-pressed (styled), so screen readers don't hear it twice

  document.body.append(rail, sound);
  const buttons = [...rail.querySelectorAll('button')], fill = rail.querySelector('.rail-fill');

  rail.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) onChapter(Number(b.dataset.i));
  });
  sound.addEventListener('click', async () => {
    sound.setAttribute('aria-pressed', String(await onSound()));
  });

  return {
    setScene(i) {
      buttons.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    },
    setProgress(p) {
      fill.style.transform = `scaleY(${p})`;
    },
  };
}
