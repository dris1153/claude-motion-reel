// Soundtrack: 128 BPM, A minor, 8 bars — every hit lands on a visual event. Rendered offline, deterministic.
import { BEAT as b, BAR, DUR, rng } from './core.js';
import { instruments } from './audio-instruments.js';

const SR = 48000;
const hz = n => 440 * 2 ** ((n - 69) / 12);
const ROOTS = [33, 33, 29, 36, 31, 33, 31]; // per bar: A1 A1 F1 C2 G1 A1 G1
const CHORDS = [[57, 60, 64], [57, 60, 64], [53, 57, 60, 64], [55, 60, 64], [55, 59, 62], [57, 60, 64, 67], [55, 59, 62, 65]];

function buffers(ac, rand) {
  const sr = ac.sampleRate; // realtime contexts run at the device rate; a convolver rejects mismatched buffers
  const noise = ac.createBuffer(1, sr * 4, sr);
  const n = noise.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = rand() * 2 - 1;
  const ir = ac.createBuffer(2, Math.floor(sr * 2.6), sr);
  for (let c = 0; c < 2; c++) {
    const x = ir.getChannelData(c);
    for (let i = 0; i < x.length; i++) x[i] = (rand() * 2 - 1) * (1 - i / x.length) ** 3.2;
  }
  return { noise, ir };
}

function arrange(I, rand) {
  // Bar 1 — the ball: three decaying hits, then a swell into the wipe.
  I.pad(0, CHORDS[0].map(hz), BAR, 0.03);
  [1, 0.7, 0.45].forEach((v, k) => {
    I.kick((k + 1) * b, 0.6 * v);
    I.blip((k + 1) * b, 1200, 380, 0.16, 0.2 * v);
  });
  I.whoosh(BAR - 0.6, 0.6, true, 0.35);

  // Bars 2–7: four-on-the-floor, claps on 2 & 4, offbeat hats and a pumping offbeat bass.
  for (let bar = 1; bar <= 6; bar++) {
    const t0 = bar * BAR;
    I.pad(t0, CHORDS[bar].map(hz), BAR, 0.035);
    for (let k = 0; k < 4; k++) {
      const t = t0 + k * b;
      I.kick(t);
      if (bar < 6 && k % 2) I.clap(t);
      if (bar === 6 && k === 3) continue; // leave the breath before the impact empty
      I.hat(t + b / 2, 0.16);
      if (bar >= 5) {
        I.hat(t + b / 4, 0.07);
        I.hat(t + (3 * b) / 4, 0.07);
      }
      I.bass(t + b / 2, hz(ROOTS[bar]), b * 0.42, 0.38);
    }
  }

  for (let k = 0; k < 4; k++) I.whoosh(BAR + k * b, 0.22, false, 0.22); // word slams
  I.whoosh(2 * BAR - 0.3, 0.3, true, 0.3); // zoom through the O
  for (let k = 1; k < 4; k++) I.blip(2 * BAR + k * b, 320, 1500, 0.14, 0.12); // morph zips
  I.blip(2 * BAR + 3.5 * b, 500, 2600, 0.18, 0.12);
  I.whoosh(3 * BAR, 0.8, false, 0.4); // particle burst
  for (let i = 0; i < 26; i++) {
    I.blip(3 * BAR + 2 * b + rand() * 0.6, 2000 + rand() * 2400, 2500 + rand() * 2000, 0.05, 0.035); // text sparkle
  }
  for (let k = 1; k < 4; k++) I.whoosh(4 * BAR + k * b - 0.12, 0.3, true, 0.18); // 3D morphs
  for (let i = 0; i < 14; i++) I.tick(5 * BAR + 0.15 + (i * b) / 4, 0.06); // counters
  I.whoosh(5 * BAR + 2 * b - 0.1, 0.35, true, 0.22); // reflow

  // Bar 7 — the build: clap roll from 8ths to 16ths, glitch ticks on every cut, riser into silence.
  const t7 = 6 * BAR;
  for (let s = 0; s < 10; s++) I.clap(t7 + (s < 4 ? (s * b) / 2 : 2 * b + ((s - 4) * b) / 4), 0.22 + 0.04 * s);
  [0, 0.5, 1, 1.5, 2, 2.25].forEach(k => I.hat(t7 + k * b, 0.2, 0.1));
  [2.5, 2.75, 3, 3.25].forEach(k => I.blip(t7 + k * b, 900, 260, 0.1, 0.16));
  I.riser(t7, 3.6 * b, 0.32);

  // Bar 8 — impact, then the end-card chime.
  const t8 = 7 * BAR;
  I.impact(t8, 0.7);
  I.kick(t8, 0.6);
  I.pad(t8, [45, 57, 60, 64, 71].map(hz), 1.2, 0.05);
  I.blip(t8 + 0.95, 1760, 1760, 0.12, 0.07);
  I.blip(t8 + 1.08, 2637, 2637, 0.25, 0.06);
}

export async function renderSoundtrack() {
  const ac = new OfflineAudioContext(2, SR * DUR, SR);
  const rand = rng(128);
  const { I, master } = createRig(ac, rand, 0.75);
  master.gain.setValueAtTime(0.75, DUR - 0.6);
  master.gain.linearRampToValueAtTime(0, DUR);
  arrange(I, rand);
  return ac.startRendering();
}

/** Synth kit wired through compressor, master gain and a reverb send; shared by the soundtrack and the scroll-site SFX. */
export function createRig(ac, rand, level) {
  const { noise, ir } = buffers(ac, rand);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const master = ac.createGain();
  master.gain.setValueAtTime(level, 0);
  comp.connect(master).connect(ac.destination);
  const verb = ac.createConvolver();
  verb.buffer = ir;
  const send = ac.createGain();
  send.gain.value = 0.3;
  send.connect(verb).connect(comp);
  return { I: instruments(ac, comp, send, noise), master };
}

/** 16-bit PCM WAV as base64, so the headless renderer can hand it to Node. */
export function wavBase64(buf) {
  const ch = buf.numberOfChannels, n = buf.length, bytes = n * ch * 2;
  const v = new DataView(new ArrayBuffer(44 + bytes));
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + bytes, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, bytes, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < n; i++) {
    for (let c = 0; c < ch; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true);
  }
  const u8 = new Uint8Array(v.buffer);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
