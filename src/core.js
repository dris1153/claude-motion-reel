// Shared constants and pure helpers. Every scene is a pure function of time, so frames can render in any order.
export const W = 1920, H = 1080, FPS = 60, DUR = 15;
export const BEAT = 60 / 128, BAR = BEAT * 4;
export const TAU = Math.PI * 2;
export const C = { ink: '#0B0B0E', bone: '#F2EDE4', clay: '#FF5B2E', cobalt: '#2F4BFF', lime: '#D6FF3D' };
export const FONT = { display: 'Unbounded', mono: '"JetBrains Mono"', serif: '"Instrument Serif"' };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
/** 1 at t0, decaying toward 0 afterwards; 0 before t0. */
export const hit = (t, t0, k = 12) => (t < t0 ? 0 : Math.exp(-(t - t0) * k));

export const ease = {
  outExpo: t => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: t => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outCubic: t => 1 - (1 - t) ** 3,
  inCubic: t => t ** 3,
  inOutCubic: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  inBack: t => 2.70158 * t ** 3 - 1.70158 * t ** 2,
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

/** Seeded PRNG (mulberry32) so every render tab builds identical particle data. */
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = n => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Background fill with margin so camera shake never exposes an edge. */
export function bg(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(-200, -200, W + 400, H + 400);
}

export function setFont(ctx, family, size, weight = 400, style = '') {
  ctx.font = `${style} ${weight} ${size}px ${family}`;
}

/** Per-glyph x offsets that keep the font's kerning (x of glyph i = width of the text before it). */
export function glyphs(ctx, text) {
  const list = [];
  for (let i = 0; i < text.length; i++) {
    list.push({ ch: text[i], x: ctx.measureText(text.slice(0, i)).width, w: ctx.measureText(text[i]).width });
  }
  return { list, width: ctx.measureText(text).width };
}

export function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`;
}
