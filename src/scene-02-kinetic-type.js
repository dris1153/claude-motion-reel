// 02 — Kinetic type: one word per beat, each with its own technique, ending in a zoom through the "O".
import { W, H, BEAT as b, TAU, C, FONT, bg, ease, prog, lerp, setFont, glyphs } from './core.js';

export function drawKinetic(ctx, lt) {
  if (lt < b) return wordI(ctx, lt, 1);
  if (lt < 2 * b) return wordMake(ctx, lt - b);
  if (lt < 3 * b) return wordThings(ctx, lt - 2 * b);
  return wordMove(ctx, lt - 3 * b);
}

const I_SIZE = 820;

function wordI(ctx, u) {
  bg(ctx, C.clay);
  const p = ease.outExpo(prog(u, 0, 0.3));
  // Shockwave ring off the slam.
  const rp = prog(u, 0.02, 0.5);
  ctx.strokeStyle = C.ink;
  ctx.globalAlpha = 1 - rp;
  ctx.lineWidth = 10 * (1 - rp) + 1;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 120 + ease.outExpo(rp) * 820, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(lerp(-0.3, 0, p));
  ctx.scale(lerp(2.6, 1, p) * (1 + u * 0.08), lerp(2.6, 1, p) * (1 + u * 0.08));
  setFont(ctx, FONT.serif, I_SIZE, 400, 'italic');
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I', 0, 40);
  ctx.restore();
}

function wordMake(ctx, u) {
  bg(ctx, C.clay);
  setFont(ctx, FONT.display, 300, 900);
  const g = glyphs(ctx, 'MAKE');
  const iSize = 330, gap = 40;
  setFont(ctx, FONT.serif, iSize, 400, 'italic');
  const iW = ctx.measureText('I').width;
  const x0 = (W - (iW + gap + g.width)) / 2, base = H / 2 + 108;

  // The "I" from the previous beat shrinks into the start of the line.
  const pi = ease.outExpo(prog(u, 0, 0.32));
  ctx.save();
  ctx.translate(lerp(W / 2, x0 + iW / 2, pi), lerp(H / 2 + 40, base - 110, pi));
  const s = lerp(I_SIZE * 1.04, iSize, pi) / iSize;
  ctx.scale(s, s);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I', 0, 0);
  ctx.restore();

  // Letters rise out of a mask, staggered, each settling from a slight tilt.
  setFont(ctx, FONT.display, 300, 900);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, base - 290, W, 330);
  ctx.clip();
  ctx.fillStyle = C.ink;
  const mx = x0 + iW + gap;
  g.list.forEach((l, i) => {
    const p = ease.outExpo(prog(u, 0.03 + i * 0.045, 0.03 + i * 0.045 + 0.4));
    ctx.save();
    ctx.translate(mx + l.x + l.w / 2, base + (1 - p) * 340);
    ctx.rotate((1 - p) * 0.35);
    ctx.fillText(l.ch, -l.w / 2, 0);
    ctx.restore();
  });
  ctx.restore();
}

function wordThings(ctx, u) {
  bg(ctx, C.ink);
  setFont(ctx, FONT.display, 250, 900);
  const g = glyphs(ctx, 'THINGS');
  const x0 = (W - g.width) / 2, base = H / 2 + 90;
  g.list.forEach((l, i) => {
    const p = prog(u, i * 0.035, i * 0.035 + 0.34);
    if (p <= 0) return;
    ctx.save();
    ctx.translate(x0 + l.x + l.w / 2, base);
    ctx.scale(1, ease.outBack(p));
    ctx.fillStyle = i === 2 ? C.clay : C.bone;
    ctx.fillText(l.ch, -l.w / 2, 0);
    ctx.restore();
  });
  const bar = ease.outExpo(prog(u, 0.14, 0.5));
  ctx.fillStyle = C.clay;
  ctx.fillRect(x0, base + 46, g.width * bar, 16);
  setFont(ctx, FONT.mono, 18, 700);
  ctx.letterSpacing = '4px';
  ctx.fillStyle = C.bone;
  ctx.globalAlpha = prog(u, 0.2, 0.35);
  ctx.fillText('(ANY OF THEM)', x0 + g.width * bar - 190, base + 104);
  ctx.globalAlpha = 1;
}

function wordMove(ctx, u) {
  bg(ctx, C.ink);
  setFont(ctx, FONT.display, 300, 900);
  const g = glyphs(ctx, 'MOVE');
  const capH = ctx.measureText('O').actualBoundingBoxAscent;
  const x0 = (W - g.width) / 2, base = H / 2 + capH / 2;
  const o = g.list[1], ox = x0 + o.x + o.w / 2, oy = base - capH / 2;

  // Zoom through the O's counter — exponential scale reads as constant speed, cubic-in makes it accelerate.
  const e = ease.inCubic(prog(u, 0.2, b));
  const z = 70 ** e;
  ctx.save();
  ctx.translate(lerp(ox, W / 2, e), lerp(oy, H / 2, e));
  ctx.scale(z, z);
  ctx.translate(-ox, -oy);

  ctx.lineWidth = 2;
  ctx.strokeStyle = C.bone;
  for (const k of [-2, -1, 1, 2]) {
    const dir = k % 2 ? 1 : -1, d = Math.abs(k);
    const inP = ease.outExpo(prog(u, d * 0.04, d * 0.04 + 0.35));
    ctx.globalAlpha = (0.75 - d * 0.2) * inP;
    const x = -900 + dir * (u * 900 + (1 - inP) * 1400) + k * 170;
    ctx.strokeText('MOVE MOVE MOVE MOVE MOVE', x, base + k * 270);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.bone;
  g.list.forEach((l, i) => {
    const p = ease.outBack(prog(u, i * 0.03, i * 0.03 + 0.24));
    ctx.save();
    ctx.translate(x0 + l.x + l.w / 2, base - capH / 2);
    ctx.scale(p, p);
    ctx.fillStyle = i === 1 ? C.clay : C.bone;
    ctx.fillText(l.ch, -l.w / 2, capH / 2);
    ctx.restore();
  });
  ctx.restore();
}
