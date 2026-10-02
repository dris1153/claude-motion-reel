// 01 — Timing & physics: a ball drops on the beat with squash/stretch, its value graph drawn live above it.
import { W, BEAT as b, TAU, C, FONT, bg, ease, prog, hit, setFont } from './core.js';

export const FLOOR = 740, R = 44;
const CX = W / 2;
const HITS = [b, 2 * b, 3 * b];
const APEX = [430, 170];
const DROP = FLOOR - R + 140;

/** Height above the floor (px) and signed vertical speed (px/s) — piecewise parabolas between hits. */
function ball(t) {
  if (t < HITS[0]) {
    const u = t / HITS[0];
    return [DROP * (1 - u * u), (2 * DROP * u) / HITS[0]];
  }
  for (let k = 0; k < 2; k++) {
    if (t < HITS[k + 1]) {
      const d = HITS[k + 1] - HITS[k], u = (t - HITS[k]) / d;
      return [4 * APEX[k] * u * (1 - u), (4 * APEX[k] * (1 - 2 * u)) / d];
    }
  }
  return [0, 0];
}

function drawGraph(ctx, t, alpha) {
  const x0 = 420, x1 = 1500, y0 = 330, gh = 190, tMax = 3.4 * b;
  const gx = tt => x0 + (tt / tMax) * (x1 - x0), gy = h => y0 - (h / DROP) * gh;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.bone;
  ctx.globalAlpha = alpha * 0.25;
  ctx.fillRect(x0, y0, x1 - x0, 1);
  HITS.forEach(h0 => ctx.fillRect(gx(h0), y0 - gh, 1, gh + 10));
  ctx.globalAlpha = alpha * 0.6;
  setFont(ctx, FONT.mono, 14, 500);
  ctx.letterSpacing = '2px';
  ctx.fillText('VALUE GRAPH — y(t)', x0, y0 - gh - 18);
  HITS.forEach((h0, k) => ctx.fillText(`HIT ${k + 1}`, gx(h0) + 8, y0 + 22));
  const tEnd = Math.min(t, tMax);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = C.clay;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const tt = (i / 120) * tEnd;
    ctx.lineTo(gx(tt), gy(ball(tt)[0]));
  }
  ctx.stroke();
  ctx.fillStyle = C.lime;
  ctx.beginPath();
  ctx.arc(gx(tEnd), gy(ball(tEnd)[0]), 7, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawBounce(ctx, t) {
  bg(ctx, C.ink);
  const uiAlpha = prog(t, 0.05, 0.45) * (1 - prog(t, 3.3 * b, 3.7 * b));
  drawGraph(ctx, t, uiAlpha);

  const fl = ease.outExpo(prog(t, HITS[0], HITS[0] + 0.7)) * (W / 2 - 140);
  ctx.fillStyle = C.bone;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(CX - fl, FLOOR, fl * 2, 2);

  // Floor ripples are ellipses: rings lying on the ground plane, seen in perspective.
  ctx.strokeStyle = C.clay;
  ctx.lineWidth = 3;
  HITS.forEach((h0, k) => {
    for (const [delay, reach] of [[0, 560], [0.09, 330]]) {
      const p = prog(t, h0 + delay, h0 + delay + 0.9);
      if (p <= 0 || p >= 1) continue;
      const r = R + ease.outExpo(p) * reach * (1 - k * 0.25);
      ctx.globalAlpha = (1 - p) * (1 - k * 0.2);
      ctx.beginPath();
      ctx.ellipse(CX, FLOOR, r, r * 0.16, 0, 0, TAU);
      ctx.stroke();
    }
  });

  const [h, v] = ball(t);
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.5 * (1 - h / DROP) * prog(t, 0.1, 0.4);
  const sw = R * (1.5 - h / DROP);
  ctx.beginPath();
  ctx.ellipse(CX, FLOOR + 4, sw, sw * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Squash on contact, stretch with speed, crouch before the pop; the bottom stays planted.
  const squash = HITS.reduce((s, h0, k) => s + hit(t, h0, 22) * (0.55 - k * 0.12), 0);
  const stretch = Math.min(Math.abs(v) / 4200, 0.32);
  const crouch = ease.outCubic(prog(t, 3.1 * b, 3.55 * b)) * 0.3 * (1 - prog(t, 3.55 * b, 3.62 * b));
  const sy = 1 + stretch - squash - crouch, sx = 1 / Math.sqrt(Math.max(sy, 0.2));
  const cy = FLOOR - h - R * sy;
  const heat = prog(t, 3.1 * b, 3.5 * b);
  ctx.fillStyle = heat > 0 ? C.clay : C.bone;
  if (heat > 0 && heat < 1) {
    ctx.fillStyle = C.bone;
    ctx.beginPath();
    ctx.ellipse(CX, cy, R * sx, R * sy, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = heat;
    ctx.fillStyle = C.clay;
  }
  const wipe = ease.inCubic(prog(t, 3.55 * b, 4 * b)) * 1500;
  ctx.beginPath();
  ctx.ellipse(CX, cy, R * sx + wipe, R * sy + wipe, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  setFont(ctx, FONT.mono, 15, 700);
  ctx.letterSpacing = '3px';
  ctx.fillStyle = C.lime;
  if (squash > 0.12) {
    ctx.globalAlpha = Math.min(1, squash * 2.5) * uiAlpha;
    ctx.fillText(`SQUASH ${(1 - squash).toFixed(2)}`, CX + 90, FLOOR - 16);
  }
  if (stretch > 0.12 && h > 30) {
    ctx.globalAlpha = Math.min(1, (stretch - 0.12) * 8) * uiAlpha;
    ctx.fillText(`STRETCH ${(1 + stretch).toFixed(2)}`, CX + 90, cy + 5);
  }
  ctx.globalAlpha = 1;
}
