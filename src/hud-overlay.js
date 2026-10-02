// Viewfinder HUD drawn after motion blur so it stays crisp. 'difference' keeps it legible on any background.
import { W, H, FPS, BEAT, BAR, FONT, prog, hash, setFont } from './core.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/';
const pad = n => String(n).padStart(2, '0');
let vignette = null;

/** Text scramble: characters resolve left to right as p goes 0 → 1. */
function scramble(text, p, seed) {
  let s = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    s += ch === ' ' || i / text.length < p ? ch : GLYPHS[Math.floor(hash(seed + i * 13.1) * GLYPHS.length)];
  }
  return s;
}

function corner(ctx, x, y, sx, sy) {
  ctx.fillRect(x, y, 28 * sx, 2 * sy);
  ctx.fillRect(x, y, 2 * sx, 28 * sy);
}

/**
 * standby: { now, leave } while the site idles on its home frame — beat from the real-time clock, and the HUD
 * fades out as the ball launches so it can fade back in with the reel (no pop at t=0).
 */
export function drawHud(ctx, t, scene, start, end, standby = null) {
  if (!vignette) {
    vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const vis = standby ? 1 - prog(standby.leave, 0.6, 1) : prog(t, 0.1, 0.4) * (1 - prog(t, 7 * BAR - 0.08, 7 * BAR));
  if (vis <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.globalAlpha = 0.92 * vis;
  ctx.fillStyle = '#fff';
  corner(ctx, 40, 40, 1, 1);
  corner(ctx, W - 40, 40, -1, 1);
  corner(ctx, 40, H - 40, 1, -1);
  corner(ctx, W - 40, H - 40, -1, -1);

  setFont(ctx, FONT.mono, 17, 700);
  ctx.letterSpacing = '3px';
  ctx.fillText('CLAUDE — MOTION REEL ’26', 76, 80);
  const f = Math.floor(t * FPS + 1e-6);
  ctx.textAlign = 'right';
  ctx.fillText(`TC 00:00:${pad(Math.floor(f / FPS))}:${pad(f % FPS)}`, W - 76, 80);
  ctx.fillText('128 BPM', W - 76 - 4 * 24 - 10, H - 70);
  ctx.textAlign = 'left';
  if (standby) {
    ctx.fillText('00 / STANDBY', 76, H - 70);
    if (Math.floor(standby.now * 2) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(76 + ctx.measureText('00 / STANDBY').width + 16, H - 76, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else ctx.fillText(scramble(scene.label, prog(t - start, 0, 0.35), Math.floor(t * 30)), 76, H - 70);

  ctx.globalAlpha = 0.3 * vis;
  ctx.fillRect(76, H - 56, 300, 2);
  ctx.globalAlpha = 0.92 * vis;
  ctx.fillRect(76, H - 56, 300 * prog(t, start, end), 2);

  const beat = Math.floor((standby ? standby.now : t) / BEAT + 1e-6) % 4;
  for (let k = 0; k < 4; k++) {
    const x = W - 76 - (4 - k) * 24 + 8;
    if (k === beat) ctx.fillRect(x, H - 84, 16, 16);
    else ctx.fillRect(x, H - 70, 16, 2);
  }
  ctx.restore();
}
