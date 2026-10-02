// 00 — Standby (site only): the ball from scene 01 idles on the floor, then jumps out of the top edge as the
// viewer scrolls; the reel's t=0 drops it back in.
import { W, BEAT, TAU, C, bg, ease, prog } from './core.js';
import { FLOOR, R } from './scene-01-bounce.js';

const X = W * 0.7, PERIOD = 2 * BEAT, APEX = 150;

/** now: real-time seconds (loops every PERIOD); leave: 0 → 1 as the intro scrolls out; still: reduced motion, the ball rests. */
export function drawIdle(ctx, now, leave, still) {
  bg(ctx, C.ink);
  const u = (now % PERIOD) / PERIOD, since = u * PERIOD; // since = time since the last floor contact
  const settle = still ? 0 : 1 - ease.outCubic(prog(leave, 0, 0.25)); // the bounce dies down as scrolling starts
  const launch = prog(leave, 0.4, 1);
  const h = 4 * APEX * u * (1 - u) * settle + ease.outCubic(launch) * 1100;
  const speed = Math.abs((4 * APEX * (1 - 2 * u)) / PERIOD) * settle;
  const squash = 0.4 * Math.exp(-since * 22) * settle + 0.3 * ease.outCubic(prog(leave, 0.25, 0.4)) * (1 - launch);
  const stretch = Math.min(speed / 4200 + (launch > 0 ? 0.3 * (1 - launch) : 0), 0.32);
  const sy = 1 + stretch - squash, sx = 1 / Math.sqrt(Math.max(sy, 0.2));

  ctx.fillStyle = C.bone;
  ctx.globalAlpha = 0.35 * (1 - leave);
  ctx.fillRect(X - 420, FLOOR, 840, 2);

  const p = prog(since, 0, 0.9);
  if (settle > 0 && p < 1) {
    const r = R + ease.outExpo(p) * 260;
    ctx.strokeStyle = C.clay;
    ctx.lineWidth = 3;
    ctx.globalAlpha = (1 - p) * 0.8 * settle;
    ctx.beginPath();
    ctx.ellipse(X, FLOOR, r, r * 0.16, 0, 0, TAU);
    ctx.stroke();
  }

  const sw = R * (1.5 - Math.min(h / 600, 1));
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.5 * Math.max(0, 1 - h / 600);
  ctx.beginPath();
  ctx.ellipse(X, FLOOR + 4, sw, sw * 0.18, 0, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = C.bone;
  ctx.beginPath();
  ctx.ellipse(X, FLOOR - h - R * sy, R * sx, R * sy, 0, 0, TAU);
  ctx.fill();
}
