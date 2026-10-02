// Tiny synth kit on the Web Audio graph. Each instrument schedules itself at an absolute time t.
const Z = 0.0001; // exponential ramps can't reach 0

export function instruments(ac, out, send, noise) {
  const amp = v => {
    const g = ac.createGain();
    g.gain.value = v;
    return g;
  };
  const filter = (type, f, q = 1) => {
    const n = ac.createBiquadFilter();
    n.type = type;
    n.frequency.value = f;
    n.Q.value = q;
    return n;
  };
  const osc = (type, f, t, dur) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.start(t);
    o.stop(t + dur);
    return o;
  };
  const noiseAt = (t, dur) => {
    const s = ac.createBufferSource();
    s.buffer = noise;
    s.start(t, (t * 0.37) % 1, dur);
    return s;
  };
  /** Attack/decay envelope on a fresh gain node. */
  const env = (t, a, peak, d) => {
    const g = amp(0);
    g.gain.setValueAtTime(Z, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Z, t + a + d);
    return g;
  };

  return {
    kick(t, v = 1) {
      const o = osc('sine', 165, t, 0.6);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      o.connect(env(t, 0.002, v, 0.45)).connect(out);
      noiseAt(t, 0.03).connect(filter('highpass', 3500)).connect(env(t, 0.001, 0.3 * v, 0.02)).connect(out);
    },
    clap(t, v = 0.5) {
      const g = amp(0);
      g.gain.setValueAtTime(Z, t);
      for (const dt of [0, 0.011, 0.022]) {
        g.gain.setValueAtTime(v, t + dt);
        g.gain.exponentialRampToValueAtTime(v * 0.25, t + dt + 0.009);
      }
      g.gain.exponentialRampToValueAtTime(Z, t + 0.24);
      noiseAt(t, 0.3).connect(filter('bandpass', 1500, 0.8)).connect(g);
      g.connect(out);
      g.connect(send);
    },
    hat(t, v = 0.14, d = 0.045) {
      noiseAt(t, d + 0.05).connect(filter('highpass', 7800)).connect(env(t, 0.001, v, d)).connect(out);
    },
    bass(t, f, d, v = 0.4) {
      const lp = filter('lowpass', 900, 6);
      lp.frequency.setValueAtTime(1100, t);
      lp.frequency.exponentialRampToValueAtTime(140, t + d);
      const g = env(t, 0.005, v, d);
      osc('sawtooth', f, t, d + 0.1).connect(lp).connect(g).connect(out);
      osc('sine', f, t, d + 0.1).connect(g);
    },
    pad(t, freqs, d, v = 0.05) {
      const lp = filter('lowpass', 1200, 0.7), g = amp(0);
      g.gain.setValueAtTime(Z, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.35);
      g.gain.setValueAtTime(v, t + d - 0.2);
      g.gain.exponentialRampToValueAtTime(Z, t + d + 0.6);
      lp.connect(g);
      g.connect(out);
      g.connect(send);
      for (const f of freqs) for (const cents of [-9, 9]) {
        const o = osc('sawtooth', f, t, d + 0.7);
        o.detune.value = cents;
        o.connect(lp);
      }
    },
    blip(t, f0, f1, d, v = 0.2) {
      const o = osc('sine', f0, t, d + 0.05);
      o.frequency.exponentialRampToValueAtTime(f1, t + d);
      const g = env(t, 0.003, v, d);
      o.connect(g).connect(out);
      g.connect(send);
    },
    whoosh(t, d, rising = true, v = 0.3) {
      const bp = filter('bandpass', 400, 1.4), g = amp(0);
      bp.frequency.setValueAtTime(rising ? 350 : 6000, t);
      bp.frequency.exponentialRampToValueAtTime(rising ? 6000 : 300, t + d);
      g.gain.setValueAtTime(Z, t);
      g.gain.exponentialRampToValueAtTime(v, t + (rising ? d * 0.95 : 0.02));
      g.gain.exponentialRampToValueAtTime(Z, t + d + (rising ? 0.05 : 0));
      noiseAt(t, d + 0.1).connect(bp).connect(g);
      g.connect(out);
      g.connect(send);
    },
    riser(t, d, v = 0.3) {
      const hp = filter('highpass', 300, 2), g = amp(0);
      hp.frequency.setValueAtTime(300, t);
      hp.frequency.exponentialRampToValueAtTime(9000, t + d);
      g.gain.setValueAtTime(Z, t);
      g.gain.exponentialRampToValueAtTime(v, t + d);
      g.gain.linearRampToValueAtTime(0, t + d + 0.01);
      noiseAt(t, d).connect(hp).connect(g);
      const o = osc('sawtooth', 110, t, d);
      o.frequency.exponentialRampToValueAtTime(880, t + d);
      o.connect(filter('lowpass', 2500)).connect(amp(0.25)).connect(g);
      g.connect(out);
      g.connect(send);
    },
    impact(t, v = 1) {
      const o = osc('sine', 85, t, 2.5);
      o.frequency.exponentialRampToValueAtTime(27, t + 1.4);
      o.connect(env(t, 0.004, v, 2.2)).connect(out);
      const crash = env(t, 0.002, 0.5 * v, 1.9);
      noiseAt(t, 2).connect(filter('lowpass', 4500)).connect(crash);
      crash.connect(out);
      crash.connect(send);
    },
    tick(t, v = 0.08) {
      osc('square', 2600, t, 0.03).connect(filter('highpass', 1500)).connect(env(t, 0.001, v, 0.012)).connect(out);
    },
  };
}
