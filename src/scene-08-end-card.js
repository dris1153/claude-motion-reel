// 08 — End card: impact flash, elastic spark, wordmark rising out of a mask, tracked-in credits.
// exit (site only, 0 → 1): the loop bridge — letters sink, the spark morphs into the home's ball and launches.
import { W, H, BAR, TAU, C, FONT, bg, ease, prog, lerp, setFont, glyphs, mixHex } from './core.js';
import { SHAPES, N_SHAPE, morph, tracePoly } from './shapes.js';
import { R as BALL_R } from './scene-01-bounce.js';

const buf = new Float32Array(N_SHAPE * 2);

// Spark → circle, clay → bone, shrink to ball size, crouch, then launch off the top edge (like the home's jump-out).
function drawSparkExit(ctx, x, y, r, rot, exit) {
  const m = ease.inOutCubic(prog(exit, 0.2, 0.5));
  const crouch = ease.outCubic(prog(exit, 0.5, 0.62)) * (1 - prog(exit, 0.62, 0.68));
  const launch = prog(exit, 0.62, 1);
  const sy = 1 - 0.3 * crouch + (launch > 0 ? 0.3 * (1 - launch) : 0), sx = 1 / Math.sqrt(sy);
  ctx.save();
  ctx.translate(x, y - ease.outCubic(launch) * 700);
  ctx.scale(sx, sy);
  ctx.fillStyle = mixHex(C.clay, C.bone, prog(exit, 0.3, 0.5));
  tracePoly(ctx, morph(SHAPES.spark, SHAPES.circle, m, buf), 0, 0, lerp(r, BALL_R, m), rot + exit * 3);
  ctx.fill();
  ctx.restore();
}

export function drawEndCard(ctx, lt, env, exit = 0) {
  bg(ctx, C.ink);
  const push = 1 + lt * 0.022;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);

  setFont(ctx, FONT.display, 196, 900);
  const g = glyphs(ctx, 'CLAUDE');
  const capH = ctx.measureText('C').actualBoundingBoxAscent;
  const sparkR = 92, gap = 64, total = sparkR * 2 + gap + g.width;
  const x0 = (W - total) / 2, base = H / 2 - 25, mx = x0 + sparkR * 2 + gap;

  const sp = ease.outElastic(prog(lt, 0.05, 0.95)), keep = 1 - prog(exit, 0, 0.25); // keep: credits fading on exit
  if (exit > 0) drawSparkExit(ctx, x0 + sparkR, base - capH / 2, (sparkR * sp) / 1.3, lt * 0.7 - (1 - sp) * 2, exit);
  else {
    ctx.fillStyle = C.clay;
    tracePoly(ctx, SHAPES.spark, x0 + sparkR, base - capH / 2, (sparkR * sp) / 1.3, lt * 0.7 - (1 - sp) * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, base - capH - 40, W, capH + 70);
  ctx.clip();
  ctx.fillStyle = C.bone;
  g.list.forEach((l, i) => {
    const p = ease.outExpo(prog(lt, 0.12 + i * 0.045, 0.62 + i * 0.045));
    const sink = ease.inCubic(prog(exit, i * 0.04, 0.3 + i * 0.04)); // back down through the mask
    ctx.fillText(l.ch, mx + l.x, base + (1 - p + sink) * (capH + 50));
  });
  ctx.restore();

  ctx.fillStyle = C.bone;
  ctx.globalAlpha = 0.4 * keep;
  ctx.fillRect(x0, base + 56, total * ease.outExpo(prog(lt, 0.35, 1.1)), 2);

  const tr = ease.outExpo(prog(lt, 0.45, 1.4));
  ctx.globalAlpha = tr * keep;
  setFont(ctx, FONT.mono, 26, 700);
  ctx.letterSpacing = `${lerp(40, 12, tr)}px`;
  ctx.fillText('MOTION DESIGNER', x0, base + 118);
  ctx.textAlign = 'right';
  ctx.letterSpacing = `${lerp(24, 6, tr)}px`;
  ctx.fillText('SHOWREEL ’26', x0 + total, base + 118);
  ctx.textAlign = 'left';

  const sp2 = ease.outCubic(prog(lt, 0.7, 1.25));
  ctx.globalAlpha = sp2 * keep;
  ctx.letterSpacing = '0px';
  setFont(ctx, FONT.serif, 50, 400, 'italic');
  ctx.fillStyle = C.clay;
  ctx.fillText('Every frame, a function of time.', x0, base + 196 + (1 - sp2) * 24);
  ctx.restore();

  const av = prog(lt, 0.9, 1.1);
  ctx.globalAlpha = av * keep;
  ctx.fillStyle = C.lime;
  if (Math.floor(lt * 4) % 2 === 0 || lt < 1.1) {
    ctx.beginPath();
    ctx.arc(W / 2 - 170, H - 76, 7, 0, TAU);
    ctx.fill();
  }
  setFont(ctx, FONT.mono, 17, 700);
  ctx.letterSpacing = '4px';
  ctx.fillText('AVAILABLE FOR NEW WORK', W / 2 - 150, H - 70);

  const flash = 1 - ease.outCubic(prog(lt, 0, 0.35));
  const fade = prog(lt, BAR - 0.3, BAR);
  ctx.globalAlpha = 1;
  if (flash > 0 && !env.calm) {
    ctx.globalAlpha = flash * env.intensity;
    bg(ctx, C.bone);
  }
  if (fade > 0) {
    ctx.globalAlpha = fade;
    bg(ctx, '#000');
  }
  ctx.globalAlpha = 1;
}
