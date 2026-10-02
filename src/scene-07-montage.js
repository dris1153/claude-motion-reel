// 07 — Rhythm & edit: recap cuts on 8ths then 16ths, each with a treatment, collapsing back to the opening dot.
import { W, H, BEAT as b, BAR, TAU, C, FONT, bg, ease, prog, lerp, hash, setFont } from './core.js';

const CUTS = [
  { at: 0, src: 2.6, fx: 'invert' },
  { at: 0.5 * b, src: 5.2, fx: 'rgb' },
  { at: 1 * b, src: 6.35, fx: 'slice' },
  { at: 1.5 * b, src: 8.55, fx: 'rgb' },
  { at: 2 * b, src: 10.1, fx: 'invert' },
  { at: 2.25 * b, src: 0.95, fx: 'slice' },
  { at: 2.5 * b, word: 'CUT', fill: C.clay, ink: C.ink },
  { at: 2.75 * b, word: 'ON', fill: C.cobalt, ink: C.bone },
  { at: 3 * b, word: 'THE', fill: C.lime, ink: C.ink },
  { at: 3.25 * b, word: 'BEAT', fill: C.ink, ink: C.clay },
  { at: 3.5 * b, dot: true },
];

// Buffers are in device pixels; destination rects stay in logical 1920×1080 units.
function rgbSplit(ctx, src, tmp, amt) {
  bg(ctx, '#000');
  ctx.globalCompositeOperation = 'lighter';
  for (const [col, dx] of [['#f00', -amt], ['#0f0', 0], ['#00f', amt]]) {
    tmp.setTransform(1, 0, 0, 1, 0, 0);
    tmp.globalCompositeOperation = 'copy';
    tmp.drawImage(src, 0, 0);
    tmp.globalCompositeOperation = 'multiply';
    tmp.fillStyle = col;
    tmp.fillRect(0, 0, tmp.canvas.width, tmp.canvas.height);
    tmp.globalCompositeOperation = 'source-over';
    ctx.drawImage(tmp.canvas, dx, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function slices(ctx, src, seed, s) {
  for (let i = 0; i < 14; i++) {
    const y = hash(seed + i) * H, h = 8 + hash(seed + i * 3.1) * 90, dx = (hash(seed + i * 7.7) - 0.5) * 260;
    ctx.drawImage(src, 0, y * s, W * s, h * s, dx, y, W, h);
  }
}

function drawWord(ctx, cut, u) {
  bg(ctx, cut.fill);
  const s = lerp(1.3, 1, ease.outExpo(prog(u, 0, 0.1)));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);
  setFont(ctx, FONT.display, 430, 900);
  ctx.fillStyle = cut.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cut.word, 0, 20);
  ctx.restore();
}

// Bookend: the frame collapses back into the dot the reel started from.
function drawDot(ctx, u) {
  bg(ctx, C.bone);
  const r = lerp(1300, 22, ease.inOutExpo(prog(u, 0, 0.16))) * (1 - ease.inBack(prog(u, 0.17, 0.234)));
  if (r <= 0) return;
  ctx.fillStyle = C.clay;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, r, 0, TAU);
  ctx.fill();
}

function drawCut(ctx, k, u, env) {
  const cut = CUTS[k];
  if (cut.dot) return drawDot(ctx, u);
  if (cut.word) return drawWord(ctx, cut, u);

  // Recap: scenes are pure functions of time, so any earlier moment can be re-rendered and treated.
  const L = env.layer, fx = env.calm ? null : cut.fx;
  env.renderAt(L, cut.src + u);
  const z = fx ? lerp(1.14, 1, ease.outExpo(prog(u, 0, 0.2))) : 1;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -H / 2);
  if (fx === 'rgb') rgbSplit(ctx, L.canvas, env.tmp, 18 * (1 - prog(u, 0, 0.2)) + 4);
  else ctx.drawImage(L.canvas, 0, 0, W, H);
  if (fx === 'slice') slices(ctx, L.canvas, k * 17.3 + Math.floor(u * 30), env.scale);
  if (fx === 'invert') {
    ctx.globalCompositeOperation = 'difference';
    bg(ctx, '#fff');
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

export function drawMontage(ctx, lt, env) {
  let k = CUTS.length - 1;
  while (CUTS[k].at > lt) k--;
  const u = lt - CUTS[k].at;
  if (!env.calm || k === 0) return drawCut(ctx, k, u, env);

  // Calm: dissolve from the previous cut instead of hard-cutting, so nothing strobes under reduced motion.
  drawCut(ctx, k - 1, lt - CUTS[k - 1].at, env);
  const T = env.tmp;
  T.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  drawCut(T, k, u, env);
  T.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = prog(u, 0, (CUTS[k + 1]?.at ?? BAR) - CUTS[k].at);
  ctx.drawImage(T.canvas, 0, 0, W, H);
  ctx.globalAlpha = 1;
}
