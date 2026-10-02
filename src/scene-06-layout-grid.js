// 06 — Layout & data: a Swiss 12-column bento blooms off the dot grid, then reflows (FLIP) on the beat.
import { BEAT as b, TAU, C, FONT, bg, ease, prog, lerp, setFont } from './core.js';
import { COLS, ROWS, gridX, gridY } from './point-cloud-data.js';

const X0 = 80, Y0 = 112, GUT = 20, CW = (1760 - 11 * GUT) / 12, RH = (856 - 5 * GUT) / 6;
const cell = ([c, r, w, h]) => [X0 + c * (CW + GUT), Y0 + r * (RH + GUT), w * CW + (w - 1) * GUT, h * RH + (h - 1) * GUT];
const EASINGS = ['outExpo', 'inOutCubic', 'outBack', 'outElastic'];

function label(ctx, text, x, y, color) {
  setFont(ctx, FONT.mono, 14, 700);
  ctx.letterSpacing = '2px';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function bigNumber(ctx, n, x, y, w, h, color) {
  setFont(ctx, FONT.display, Math.min(h * 0.6, w / 2.7), 900);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = color;
  ctx.fillText(String(n), x + 36, y + h - 40);
}

function drawFormula(ctx, x, y, w, h, lt) {
  const p = ease.outExpo(prog(lt, 0.25, 0.8));
  setFont(ctx, FONT.serif, h * 0.62, 400, 'italic');
  ctx.fillStyle = C.ink;
  ctx.fillText('f(t)', x + 44, y + h * 0.72 + (1 - p) * h * 0.6);
  label(ctx, '001 — THE WHOLE REEL IS ONE FUNCTION', x + 44, y + 52, C.ink);
  label(ctx, 'EVERY FRAME = f(t)   ·   t IN [0, 15)', x + 44, y + h - 36, C.ink);
  // Damped spring plotted live, with its own playhead.
  const gx = x + w * 0.52, gw = w * 0.48 - 50, gy = y + h * 0.5, amp = h * 0.26;
  const spring = u => Math.exp(-u * 5) * Math.cos(u * 18);
  const head = Math.min(1, (lt * 0.8) % 1.2) * p;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let s = 0; s <= 80; s++) ctx.lineTo(gx + (s / 80) * gw * head, gy - spring((s / 80) * head) * amp);
  ctx.stroke();
  ctx.fillStyle = C.clay;
  ctx.beginPath();
  ctx.arc(gx + gw * head, gy - spring(head) * amp, 10, 0, TAU);
  ctx.fill();
}

function drawFps(ctx, x, y, w, h, lt) {
  label(ctx, 'FRAMES / SECOND', x + 36, y + 46, C.ink);
  bigNumber(ctx, Math.round(60 * ease.outExpo(prog(lt, 0.15, 1))), x, y, w, h, C.ink);
}

function drawKeyframes(ctx, x, y, w, h, lt) {
  label(ctx, 'KEYFRAMES USED', x + 36, y + 46, C.bone);
  bigNumber(ctx, Math.round(999 * (1 - ease.outExpo(prog(lt, 0.25, 1.15)))), x, y, w, h, C.bone);
}

function drawBars(ctx, x, y, w, h, lt) {
  ctx.strokeStyle = C.bone;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  label(ctx, 'SPECTRUM · 128 BPM', x + 32, y + 46, C.bone);
  const n = 14, slot = (w - 64) / n, env = Math.exp(-((lt % b) / b) * 3);
  ctx.fillStyle = C.lime;
  for (let i = 0; i < n; i++) {
    const v = 0.2 + 0.8 * env * (0.5 + 0.5 * Math.sin(i * 1.7 + lt * 5));
    const bh = v * (h - 110);
    ctx.fillRect(x + 32 + i * slot, y + h - 32 - bh, slot * 0.62, bh);
  }
}

function drawEasings(ctx, x, y, w, h, lt) {
  const cw = (w - 40) / 4;
  EASINGS.forEach((name, k) => {
    const gx = x + 30 + k * cw, gw = cw - 30, gy = y + 40, gh = h - 100, fn = ease[name];
    const py = v => gy + gh - (0.12 + v * 0.72) * gh;
    ctx.strokeStyle = C.ink;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy, gw, gh);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let s = 0; s <= 48; s++) ctx.lineTo(gx + (s / 48) * gw, py(fn(s / 48)));
    ctx.stroke();
    const u = (lt * 0.9 + k * 0.13) % 1;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(gx + u * gw, py(fn(u)), 8, 0, TAU);
    ctx.fill();
    label(ctx, name.toUpperCase(), gx, y + h - 26, C.ink);
  });
}

const PANELS = [
  { a: [0, 0, 7, 4], b: [5, 2, 7, 4], fill: C.bone, draw: drawFormula },
  { a: [7, 0, 5, 2], b: [0, 0, 5, 2], fill: C.clay, draw: drawFps },
  { a: [7, 2, 5, 2], b: [0, 2, 5, 4], fill: C.cobalt, draw: drawKeyframes },
  { a: [0, 4, 4, 2], b: [5, 0, 3, 2], fill: C.ink, draw: drawBars },
  { a: [4, 4, 8, 2], b: [8, 0, 4, 2], fill: C.lime, draw: drawEasings },
];

export function drawLayout(ctx, lt) {
  bg(ctx, C.ink);
  ctx.fillStyle = C.bone;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ctx.rect(gridX(c) - 1.3, gridY(r) - 1.3, 2.6, 2.6);
  ctx.fill();
  ctx.globalAlpha = 1;

  PANELS.forEach((p, i) => {
    const pin = ease.outExpo(prog(lt, 0.04 + i * 0.07, 0.54 + i * 0.07));
    const flip = ease.inOutExpo(prog(lt, 2 * b + i * 0.035, 2 * b + i * 0.035 + 0.42));
    const pout = ease.inExpo(prog(lt, 3.3 * b + i * 0.025, 3.3 * b + i * 0.025 + 0.2));
    const vis = pin * (1 - pout);
    if (vis <= 0.001) return;
    const A = cell(p.a), B = cell(p.b);
    const [x, y, w, h] = A.map((v, k) => lerp(v, B[k], flip));
    // The mask grows from the top-left corner like a marquee drag; content is laid out at full size underneath.
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w * vis, h * vis, 18);
    ctx.clip();
    ctx.fillStyle = p.fill;
    ctx.fillRect(x, y, w, h);
    p.draw(ctx, x, y, w, h, lt);
    ctx.restore();
  });
}
