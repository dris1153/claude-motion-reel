// 03 — Shape morph: circle → triangle → square → star → spark on the beat, with lagging echo outlines.
import { W, H, BEAT as b, TAU, C, FONT, bg, ease, prog, hit, setFont } from './core.js';
import { SHAPES, N_SHAPE, morph, tracePoly } from './shapes.js';

const SEQ = ['circle', 'tri', 'square', 'star', 'spark'];
const KEYS = [0, 1, 2, 3, 3.5].map(k => k * b);
const SIZE = 215, CX = W / 2, CY = H / 2;
const ECHO_COLORS = [C.clay, C.cobalt, C.lime, C.bone];
const buf = new Float32Array(N_SHAPE * 2);

function stage(lt) {
  let k = 0;
  while (k + 1 < SEQ.length && lt >= KEYS[k + 1]) k++;
  return k;
}

function shapeAt(lt, out) {
  const k = stage(lt);
  if (k === 0) {
    out.set(SHAPES.circle);
    return out;
  }
  return morph(SHAPES[SEQ[k - 1]], SHAPES[SEQ[k]], ease.outBack(prog(lt, KEYS[k], KEYS[k] + 0.22)), out);
}

function scaleAt(lt) {
  let s = ease.outElastic(prog(lt, 0, 0.7));
  for (let k = 1; k < 4; k++) s *= 1 + 0.1 * hit(lt, k * b, 9);
  return s * (1 - ease.inBack(prog(lt, 3.62 * b, 4 * b)));
}

function rotAt(lt) {
  let r = lt * 0.5;
  for (let k = 1; k < 4; k++) r += ease.outExpo(prog(lt, k * b, k * b + 0.4)) * (Math.PI / 3);
  return r + ease.inExpo(prog(lt, 3.5 * b, 4 * b)) * TAU;
}

export function drawMorph(ctx, lt) {
  bg(ctx, C.ink);

  // Slow sunburst and dashed orbits give the frame depth without competing.
  ctx.strokeStyle = C.bone;
  ctx.globalAlpha = 0.07 * prog(lt, 0, 0.3);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU + lt * 0.15;
    ctx.moveTo(CX + Math.cos(a) * 330, CY + Math.sin(a) * 330);
    ctx.lineTo(CX + Math.cos(a) * 1300, CY + Math.sin(a) * 1300);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.35 * prog(lt, 0.1, 0.4);
  ctx.setLineDash([2, 14]);
  [390, 470].forEach((r, i) => {
    ctx.lineDashOffset = lt * (i ? -60 : 60);
    ctx.beginPath();
    ctx.arc(CX, CY, r * scaleAt(Math.min(lt, 3 * b)), 0, TAU);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Echoes sample the shape slightly in the past and slightly larger: morphs leave a chromatic wake.
  ctx.lineWidth = 3;
  for (let j = 7; j >= 1; j--) {
    const tj = Math.max(0, lt - j * 0.045);
    ctx.strokeStyle = ECHO_COLORS[j % 4];
    ctx.globalAlpha = 0.95 - j * 0.11;
    tracePoly(ctx, shapeAt(tj, buf), CX, CY, SIZE * scaleAt(tj) * (1 + j * 0.085), rotAt(tj));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const s = SIZE * scaleAt(lt), r = rotAt(lt), pts = shapeAt(lt, buf);
  ctx.fillStyle = stage(lt) >= 3 ? C.clay : C.bone;
  tracePoly(ctx, pts, CX, CY, s, r);
  ctx.fill();

  // Vector-editor anchors with a live coordinate readout.
  const ui = prog(lt, 0.3, 0.5) * (1 - prog(lt, 3.4 * b, 3.6 * b));
  if (ui <= 0) return;
  ctx.globalAlpha = ui;
  ctx.strokeStyle = C.lime;
  ctx.fillStyle = C.ink;
  ctx.lineWidth = 2;
  const cos = Math.cos(r) * s, sin = Math.sin(r) * s;
  let top = null;
  for (let i = 0; i < N_SHAPE; i += 30) {
    const x = CX + pts[i * 2] * cos - pts[i * 2 + 1] * sin, y = CY + pts[i * 2] * sin + pts[i * 2 + 1] * cos;
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    if (!top || y < top[1]) top = [x, y];
  }
  ctx.beginPath();
  ctx.moveTo(top[0] + 10, top[1] - 10);
  ctx.lineTo(top[0] + 60, top[1] - 60);
  ctx.lineTo(top[0] + 250, top[1] - 60);
  ctx.stroke();
  setFont(ctx, FONT.mono, 15, 700);
  ctx.letterSpacing = '2px';
  ctx.fillStyle = C.lime;
  ctx.fillText(`x ${(top[0] - CX).toFixed(0).padStart(4)}  y ${(CY - top[1]).toFixed(0).padStart(4)}`, top[0] + 66, top[1] - 70);
  ctx.globalAlpha = 1;
}
