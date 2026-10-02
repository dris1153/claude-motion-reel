// Precomputed targets for the point cloud. 2,646 = 63×42 torus UV grid = 6 faces × 21×21 cube lattice.
import { W, H, TAU, FONT, rng } from './core.js';

export const NP = 2646, COLS = 63, ROWS = 42, GRID = 30;
export const P = {
  seed: new Float32Array(NP * 4), // burst angle, burst reach, orbit radius, hue
  text: new Float32Array(NP * 2),
  sphere: new Float32Array(NP * 3),
  cube: new Float32Array(NP * 3),
  torus: new Float32Array(NP * 3),
  grid: new Float32Array(NP * 2),
  textSpan: [0, 1],
};

/** Dot grid shared with the layout scene, so the unwrapped torus lands exactly on its background. */
export const gridX = c => W / 2 + (c - (COLS - 1) / 2) * GRID;
export const gridY = r => H / 2 + (r - (ROWS - 1) / 2) * GRID;

function sampleText(rand) {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.font = `900 300px ${FONT.display}`;
  ctx.font = `900 ${(300 * 1560) / ctx.measureText('CLAUDE').width}px ${FONT.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('CLAUDE', W / 2, H / 2);
  const data = ctx.getImageData(0, 0, W, H).data;
  const inside = (x, y) => data[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 127;

  let filled = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 127) filled++;
  // Even dot-matrix sampling: shrink the pitch until there are at least NP dots.
  let step = Math.sqrt(filled / NP), pts;
  do {
    pts = [];
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) if (inside(x, y)) pts.push([x, y]);
    step *= 0.98;
  } while (pts.length < NP);

  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < NP; i++) {
    P.text[i * 2] = pts[i][0] - W / 2;
    P.text[i * 2 + 1] = pts[i][1] - H / 2;
    lo = Math.min(lo, P.text[i * 2]);
    hi = Math.max(hi, P.text[i * 2]);
  }
  P.textSpan = [lo, hi];
}

export function buildPointCloud() {
  const rand = rng(20260925);
  for (let i = 0; i < NP; i++) {
    P.seed.set([rand() * TAU, 160 + rand() ** 0.5 * 820, 50 + rand() ** 0.7 * 560, rand()], i * 4);
  }
  sampleText(rand);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NP; i++) {
    const y = 1 - (2 * (i + 0.5)) / NP, rad = Math.sqrt(1 - y * y), a = i * golden;
    P.sphere.set([Math.cos(a) * rad * 330, y * 330, Math.sin(a) * rad * 330], i * 3);

    const u = i % COLS, v = Math.floor(i / COLS), U = (u / COLS) * TAU, V = (v / ROWS) * TAU;
    const ring = 285 + 115 * Math.cos(V);
    P.torus.set([Math.cos(U) * ring, 115 * Math.sin(V), Math.sin(U) * ring], i * 3);
    P.grid.set([gridX(u) - W / 2, gridY(v) - H / 2], i * 2);

    const f = Math.floor(i / 441), j = i % 441, axis = f >> 1, p = [0, 0, 0];
    p[axis] = f % 2 ? -1 : 1;
    p[(axis + 1) % 3] = (j % 21) / 10 - 1;
    p[(axis + 2) % 3] = Math.floor(j / 21) / 10 - 1;
    P.cube.set(p.map(q => q * 235), i * 3);
  }
}
