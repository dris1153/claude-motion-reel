// Scene table, camera shake, and the frame compositor with sub-frame motion blur.
import { W, H, FPS, DUR, BAR, BEAT } from './core.js';
import { drawBounce } from './scene-01-bounce.js';
import { drawKinetic } from './scene-02-kinetic-type.js';
import { drawMorph } from './scene-03-shape-morph.js';
import { drawPointCloud } from './scene-04-05-point-cloud.js';
import { drawLayout } from './scene-06-layout-grid.js';
import { drawMontage } from './scene-07-montage.js';
import { drawEndCard } from './scene-08-end-card.js';
import { drawIdle } from './scene-00-idle.js';
import { drawHud } from './hud-overlay.js';

export const SCENES = [
  { at: 0, draw: drawBounce, label: '01 / TIMING & PHYSICS' },
  { at: BAR, draw: drawKinetic, label: '02 / KINETIC TYPE' },
  { at: 2 * BAR, draw: drawMorph, label: '03 / SHAPE MORPH' },
  { at: 3 * BAR, draw: drawPointCloud, label: '04 / PARTICLE SYSTEMS' },
  { at: 4 * BAR, draw: (ctx, lt, env) => drawPointCloud(ctx, lt + BAR, env), label: '05 / 3D SPACE' },
  { at: 5 * BAR, draw: drawLayout, label: '06 / LAYOUT & DATA' },
  { at: 6 * BAR, draw: drawMontage, label: '07 / RHYTHM & EDIT' },
  { at: 7 * BAR, draw: drawEndCard, label: '' },
];
const IMPACTS = [[BAR, 18], [BAR + BEAT, 8], [BAR + 2 * BEAT, 12], [BAR + 3 * BEAT, 8], [3 * BAR, 14], [7 * BAR, 30]];
const SHUTTER = 0.5 / FPS; // 180° shutter

let env = null;
const pool = {};

export function sceneIndex(t) {
  let i = SCENES.length - 1;
  while (i > 0 && SCENES[i].at > t) i--;
  return i;
}

function drawScene(ctx, t) {
  const s = SCENES[sceneIndex(t)];
  ctx.save();
  s.draw(ctx, t - s.at, env);
  ctx.restore();
}

/**
 * scale: backing-store pixels per logical pixel (scenes always draw in 1920×1080 units).
 * calm: reduced-motion variant — no camera shake, no strobing cuts or impact flash.
 * intensity: scales camera shake and full-screen flashes (the site runs softer than the video).
 */
export function initTimeline(canvas, { scale = 1, calm = false, intensity = 1 } = {}) {
  const size = c => {
    c.width = Math.round(W * scale);
    c.height = Math.round(H * scale);
    return c;
  };
  // Buffers are pooled and resized in place (resizing resets them like new ones): re-inits on resize or
  // media change must not pile up full-screen canvases (iOS caps total canvas memory).
  const buffer = name => size((pool[name] ??= document.createElement('canvas'))).getContext('2d');
  env = { scale, calm, intensity, buffer, main: size(canvas).getContext('2d'), layer: buffer('layer'), tmp: buffer('tmp') };
  env.renderAt = (ctx, t) => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawScene(ctx, t);
  };
}

function compose(ctx, t) {
  let dx = 0, dy = 0;
  if (!env.calm) {
    IMPACTS.forEach(([t0, amp], i) => {
      if (t < t0) return;
      const d = Math.exp(-(t - t0) * 9) * amp * env.intensity;
      dx += Math.sin((t - t0) * 73 + i) * d;
      dy += Math.cos((t - t0) * 61 + i * 2) * d;
    });
  }
  const s = env.scale;
  ctx.setTransform(s, 0, 0, s, dx * s, dy * s);
  drawScene(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Renders frame at time t; samples > 1 averages sub-frames across the shutter for real motion blur. */
export function renderFrame(t, samples = 1) {
  const { main } = env;
  if (samples <= 1) compose(main, t);
  else {
    // Only the export blurs; the live site never allocates these two.
    const sub = (env.sub ??= env.buffer('sub')), acc = (env.acc ??= env.buffer('acc'));
    for (let k = 0; k < samples; k++) {
      compose(sub, t + (k / samples) * SHUTTER);
      acc.globalAlpha = 1 / (k + 1);
      acc.drawImage(sub.canvas, 0, 0);
    }
    main.drawImage(acc.canvas, 0, 0);
  }
  const i = sceneIndex(t);
  main.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  drawHud(main, t, SCENES[i], SCENES[i].at, SCENES[i + 1]?.at ?? DUR);
  main.setTransform(1, 0, 0, 1, 0, 0);
}

/** Site home frame: the idling ball on the real-time clock (now, seconds) and a STANDBY HUD. leave: 0 → 1 as the intro scrolls out. */
export function renderIdle(now, leave) {
  const { main, scale } = env;
  main.setTransform(scale, 0, 0, scale, 0, 0);
  drawIdle(main, now, leave, env.calm);
  drawHud(main, 0, SCENES[0], 0, 1, { now: env.calm ? 0 : now, leave });
  main.setTransform(1, 0, 0, 1, 0, 0);
}

/** Site loop bridge, p: 0 → 1 — the end card (frozen at lt) dissolving into the home's ball. No HUD, like the end card. */
export function renderBridge(lt, p) {
  const { main, scale } = env;
  main.setTransform(scale, 0, 0, scale, 0, 0);
  drawEndCard(main, lt, env, p);
  drawHud(main, 7 * BAR + lt, SCENES[7], 7 * BAR, DUR); // past the end the HUD is hidden: this only adds the vignette
  main.setTransform(1, 0, 0, 1, 0, 0);
}
