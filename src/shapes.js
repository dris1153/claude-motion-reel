import { TAU } from './core.js';

export const N_SHAPE = 240;

// Every shape is sampled at the same N ray angles from its center, so any two morph point-to-point without twisting.
function sample(verts) {
  const pts = new Float32Array(N_SHAPE * 2);
  for (let i = 0; i < N_SHAPE; i++) {
    const a = -Math.PI / 2 + (i / N_SHAPE) * TAU, dx = Math.cos(a), dy = Math.sin(a);
    for (let k = 0; k < verts.length; k++) {
      const [ax, ay] = verts[k], [bx, by] = verts[(k + 1) % verts.length];
      const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const s = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
      if (s > 0 && u >= -1e-6 && u <= 1 + 1e-6) {
        pts[i * 2] = dx * s;
        pts[i * 2 + 1] = dy * s;
        break;
      }
    }
  }
  return pts;
}

const poly = (n, r, rot = -Math.PI / 2) =>
  Array.from({ length: n }, (_, k) => [Math.cos(rot + (k * TAU) / n) * r, Math.sin(rot + (k * TAU) / n) * r]);
const star = (n, inner, r) =>
  Array.from({ length: n * 2 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / n, rr = k % 2 ? inner * r : r;
    return [Math.cos(a) * rr, Math.sin(a) * rr];
  });

// Radii are tuned so shapes read as equal visual weight, not equal circumradius.
export const SHAPES = {
  circle: sample(poly(180, 1)),
  tri: sample(poly(3, 1.32)),
  square: sample(poly(4, 1.18, -Math.PI / 4)),
  star: sample(star(5, 0.46, 1.3)),
  spark: sample(star(8, 0.34, 1.3)),
};

export function morph(a, b, t, out) {
  for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

export function tracePoly(ctx, pts, cx, cy, scale, rot) {
  const c = Math.cos(rot) * scale, s = Math.sin(rot) * scale;
  ctx.beginPath();
  for (let i = 0; i < N_SHAPE; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    ctx.lineTo(cx + x * c - y * s, cy + x * s + y * c);
  }
  ctx.closePath();
}
