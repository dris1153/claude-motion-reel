// 04 + 05 — One continuous point system: burst → galaxy → "CLAUDE" → sphere → cube → torus → UV-unwrapped grid.
import { W, H, BAR, BEAT as b, TAU, C, FONT, bg, ease, prog, lerp, hit, setFont } from './core.js';
import { NP, COLS, P } from './point-cloud-data.js';

const FOCAL = 1300, BUCKETS = 8;
const T_TEXT = 2 * b, T_SPHERE = BAR, T_CUBE = BAR + b, T_TORUS = BAR + 2 * b, T_GRID = BAR + 3 * b;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const [COBALT, BONE, CLAY] = [C.cobalt, C.bone, C.clay].map(rgb);
const mix = (a, c, t) => a.map((v, i) => lerp(v, c[i], t));
const RAMP = Array.from({ length: BUCKETS }, (_, q) => {
  const t = q / (BUCKETS - 1);
  return t < 0.5 ? mix(COBALT, BONE, t * 2) : mix(BONE, CLAY, (t - 0.5) * 2);
});
let buckets = null;
const xyz = [0, 0, 0];

// Cumulative spin with a smooth start; the unwrap snaps to a multiple of π (the grid is mirror-symmetric).
function camera(lt) {
  const x = Math.max(0, lt - (T_SPHERE - 0.1)), c = 0.5;
  let spin = 1.25 * (x < c ? (x * x) / (2 * c) : x - c / 2);
  for (let k = 1; k < 3; k++) spin += 0.8 * ease.outExpo(prog(lt, BAR + k * b, BAR + k * b + 0.45));
  const out = ease.inOutCubic(prog(lt, T_GRID, T_GRID + 0.42));
  const target = Math.ceil((1.25 * (T_GRID + 0.52 - T_SPHERE) + 1.6) / Math.PI) * Math.PI;
  const on = ease.inOutCubic(prog(lt, T_SPHERE - 0.1, T_SPHERE + 0.4));
  let pulse = 1;
  for (let k = 0; k < 3; k++) pulse += 0.07 * hit(lt, BAR + k * b, 7);
  return { ry: lerp(spin, target, out), rx: (0.42 + 0.12 * Math.sin(lt * 1.7)) * on * (1 - out), out, on, pulse };
}

function place(i, lt) {
  const s = P.seed, a = s[i * 4], reach = s[i * 4 + 1], ro = s[i * 4 + 2], hue = s[i * 4 + 3];
  const pb = ease.outExpo(prog(lt, 0, 0.8));
  let x = Math.cos(a) * (6 + pb * reach), y = Math.sin(a) * (6 + pb * reach), z = 0;

  // Three log-spiral arms; inner orbits turn faster (differential rotation).
  const pg = ease.inOutCubic(prog(lt, 0.2, 0.75));
  if (pg > 0) {
    const ang = Math.floor(hue * 3) * (TAU / 3) + Math.log(ro / 50) * 1.7 + (a - Math.PI) * 0.12 + lt * 2.4 * Math.sqrt(160 / ro);
    x = lerp(x, Math.cos(ang) * ro * 1.25, pg);
    y = lerp(y, Math.sin(ang) * ro * 0.55, pg);
  }
  const tx = P.text[i * 2], ty = P.text[i * 2 + 1];
  const sweep = (tx - P.textSpan[0]) / (P.textSpan[1] - P.textSpan[0]);
  const pt = ease.outExpo(prog(lt, T_TEXT + sweep * 0.28, T_TEXT + sweep * 0.28 + 0.5));
  if (pt > 0) {
    x = lerp(x, tx + Math.sin(lt * 6 + i) * 1.2, pt);
    y = lerp(y, ty, pt);
  }
  const chain = [
    [P.sphere, ease.inOutCubic(prog(lt, T_SPHERE - 0.1 + sweep * 0.2, T_SPHERE + 0.32 + sweep * 0.2))],
    [P.cube, ease.inOutExpo(prog(lt, T_CUBE, T_CUBE + 0.4))],
    [P.torus, ease.inOutExpo(prog(lt, T_TORUS, T_TORUS + 0.4))],
  ];
  for (const [src, p] of chain) {
    if (p <= 0) break;
    x = lerp(x, src[i * 3], p);
    y = lerp(y, src[i * 3 + 1], p);
    z = lerp(z, src[i * 3 + 2], p);
  }
  const col = (i % COLS) / COLS;
  const pu = ease.inOutCubic(prog(lt, T_GRID + col * 0.15, T_GRID + col * 0.15 + 0.3));
  if (pu > 0) {
    x = lerp(x, P.grid[i * 2], pu);
    y = lerp(y, P.grid[i * 2 + 1], pu);
    z = lerp(z, 0, pu);
  }
  xyz[0] = x;
  xyz[1] = y;
  xyz[2] = z;
}

function rotate(v, cam) {
  const cy = Math.cos(cam.ry), sy = Math.sin(cam.ry), cx = Math.cos(cam.rx), sx = Math.sin(cam.rx);
  const X = v[0] * cy + v[2] * sy, Z0 = -v[0] * sy + v[2] * cy;
  return [X, v[1] * cx - Z0 * sx, v[1] * sx + Z0 * cx];
}

export function drawPointCloud(ctx, lt, env) {
  bg(ctx, C.ink);
  buckets ??= Array.from({ length: BUCKETS }, (_, q) =>
    [...Array(NP).keys()].filter(i => Math.min(BUCKETS - 1, Math.floor(P.seed[i * 4 + 3] * BUCKETS)) === q));
  const cam = camera(lt);
  const wg = prog(lt, 0.2, 0.75), wt = prog(lt, T_TEXT, T_TEXT + 0.6);
  const m = lerp(lerp(lerp(lerp(0.35, 0, wg), 1, wt), 0.12, cam.on), 1, cam.out);
  const dot = lerp(lerp(lerp(lerp(3.6, 2.6, wg), 4.4, wt), 3.1, cam.on), 2.6, cam.out);

  const flash = 1 - prog(lt, 0, 0.3);
  if (flash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
    g.addColorStop(0, `rgba(255,120,70,${0.7 * flash * env.intensity})`);
    g.addColorStop(1, 'rgba(255,120,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = lerp(1, 0.32, cam.out);
  for (let q = 0; q < BUCKETS; q++) {
    ctx.fillStyle = `rgb(${mix(RAMP[q], BONE, m).map(Math.round).join(',')})`;
    ctx.beginPath();
    for (const i of buckets[q]) {
      place(i, lt);
      const [X, Y, Z] = rotate(xyz, cam), k = FOCAL / (FOCAL + Z), sz = dot * k * k * cam.pulse; // k² exaggerates depth cue
      ctx.rect(W / 2 + X * k * cam.pulse - sz / 2, H / 2 + Y * k * cam.pulse - sz / 2, sz, sz);
    }
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  setFont(ctx, FONT.mono, 15, 700);
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillStyle = C.bone;
  ctx.globalAlpha = prog(lt, T_TEXT + 0.35, T_TEXT + 0.55) * (1 - prog(lt, T_SPHERE - 0.2, T_SPHERE));
  ctx.fillText('N = 2,646 POINTS · ONE FUNCTION OF TIME', W / 2, H / 2 + 190);

  const ui = cam.on * (1 - cam.out);
  if (ui > 0) {
    drawStages(ctx, lt, ui);
    drawGizmo(ctx, cam, ui);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawStages(ctx, lt, ui) {
  const names = ['SPHERE', 'CUBE', 'TORUS', 'UV UNWRAP'];
  const cur = [T_SPHERE, T_CUBE, T_TORUS, T_GRID].filter(t => lt >= t + 0.15).length - 1;
  const text = names.join('   ·   ');
  let x = W / 2 - ctx.measureText(text).width / 2;
  ctx.textAlign = 'left';
  names.forEach((n, k) => {
    ctx.globalAlpha = ui * (k === cur ? 1 : 0.35);
    ctx.fillStyle = k === cur ? C.lime : C.bone;
    ctx.fillText(n, x, 150);
    x += ctx.measureText(n + '   ·   ').width;
  });
}

function drawGizmo(ctx, cam, ui) {
  const ox = W - 190, oy = H - 210;
  ctx.globalAlpha = ui;
  ctx.lineWidth = 3;
  [[[1, 0, 0], C.clay, 'X'], [[0, -1, 0], C.lime, 'Y'], [[0, 0, 1], C.cobalt, 'Z']].forEach(([v, col, name]) => {
    const [X, Y] = rotate(v, cam);
    ctx.strokeStyle = ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + X * 60, oy + Y * 60);
    ctx.stroke();
    ctx.fillText(name, ox + X * 82, oy + Y * 82 + 5);
  });
}
