import { buildPointCloud } from './point-cloud-data.js';
import { initTimeline } from './timeline.js';

const FACES = ['900 100px Unbounded', '500 100px Unbounded', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', 'italic 400 100px "Instrument Serif"'];

/** Shared startup for the reel player and the scroll site. Resolves to the font faces that failed to load. */
export async function bootReel(canvas, options) {
  const loads = await Promise.allSettled(FACES.map(f => document.fonts.load(f)));
  buildPointCloud(); // samples text pixels, so fonts must be settled first
  initTimeline(canvas, options);
  return FACES.filter((_, i) => loads[i].status === 'rejected');
}
