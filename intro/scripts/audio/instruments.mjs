// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Pitched instruments: plucked strings, bells, organ, choir, bowed strings,
// flute, war drums and the heartbeat.

import {
  SR, TAU, secs, rng, range, white, pink, osc, makeTable, tableOsc, curve, perc, adsr,
  fadeEdges, mul, addInto, biquad, svf, onePoleLP, onePoleHP, formant, VOWELS, smoothNoise,
  cents, drive,
} from './dsp.mjs';

// Extended Karplus-Strong: tuned by an allpass, damped by a one-zero loop filter,
// excited by a pick-position-combed noise burst.
export const pluck = (freq, dur, {t60 = 3, bright = 0.5, pickPos = 0.18, seed = 1, vel = 1, release = 0.03} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  const period = SR / freq;
  const s = 0.5 - 0.42 * bright;
  const N = Math.floor(period - s - 0.1);
  const d = period - s - N;
  const C = (1 - d) / (1 + d);
  const g = Math.pow(10, -3 / (t60 * freq));
  const dl = new Float32Array(N);
  const ex = white(N, r);
  onePoleLP(ex, 600 + 5200 * bright * vel);
  onePoleLP(ex, 900 + 7000 * bright * vel);
  const pp = Math.max(1, Math.round(pickPos * N));
  for (let i = 0; i < N; i++) dl[i] = (ex[i] - (i >= pp ? ex[i - pp] : 0)) * vel;
  let p = 0, prev = 0, ax = 0, ay = 0;
  for (let i = 0; i < n; i++) {
    const y = dl[p];
    const lf = (1 - s) * y + s * prev;
    prev = y;
    const ap = C * lf + ax - C * ay;
    ax = lf; ay = ap;
    dl[p] = Math.abs(ap) < 1e-20 ? 0 : g * ap;
    p = p + 1 === N ? 0 : p + 1;
    out[i] = y;
  }
  onePoleHP(out, 30);
  return fadeEdges(out, 0.0005, release);
};

// Nylon-ish guitar body: resonances and a soft top end.
export const guitarBody = (x) => {
  biquad(x, 'peak', 105, 1.4, 4);
  biquad(x, 'peak', 220, 1.2, 2.5);
  biquad(x, 'peak', 2600, 0.8, -3);
  biquad(x, 'lp', 5200, 0.6);
  biquad(x, 'hp', 70, 0.7);
  return x;
};

// Additive bell. partials: [[ratio, amp, t60 seconds], ...]. Each partial is a
// slightly mistuned pair so it beats like real cast metal.
export const bell = (freq, dur, partials, {seed = 1, strike = 0.3, beat = 1.2} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  for (const [ratio, amp, t60] of partials) {
    const f = freq * ratio;
    if (f > SR * 0.45) continue;
    const bf = range(r, 0.3, 1) * beat;
    const k = Math.log(1000) / (t60 * SR);
    const ph1 = r() * TAU, ph2 = r() * TAU;
    const w1 = (TAU * f) / SR, w2 = (TAU * (f + bf)) / SR;
    const att = secs(0.001 + 0.004 / ratio);
    const m = Math.min(n, secs(t60 * 1.2));
    for (let i = 0; i < m; i++) {
      const e = Math.exp(-k * i) * (i < att ? i / att : 1);
      out[i] += amp * e * (Math.sin(ph1 + w1 * i) * 0.6 + Math.sin(ph2 + w2 * i) * 0.4);
    }
  }
  if (strike > 0) {
    const s = white(secs(0.03), r);
    mul(s, perc(s.length, 0.0005, 0.03));
    const sb = svf(s, freq * 3, 1.5, 'bp');
    addInto(out, sb, 0, strike);
  }
  return fadeEdges(out, 0.0005, 0.05);
};

// Church bell (hum, prime, minor-third tierce, quint, nominal...), t60 scale in seconds.
export const churchBell = (freq, dur, {seed = 1, len = 6, strike = 0.4} = {}) =>
  bell(freq, dur, [
    [0.5, 0.8, len * 1.0], [1.0, 0.6, len * 0.62], [1.19, 0.55, len * 0.45], [1.5, 0.3, len * 0.33],
    [2.0, 0.5, len * 0.28], [2.52, 0.2, len * 0.18], [2.66, 0.18, len * 0.16], [3.01, 0.12, len * 0.12],
    [4.07, 0.08, len * 0.08], [5.42, 0.05, len * 0.05], [6.8, 0.03, len * 0.03],
  ], {seed, strike, beat: 0.9});

// Small glassy sine bell (used for the ancient arpeggios and glints).
export const glassBell = (freq, dur, {seed = 1, len = 2.5} = {}) =>
  bell(freq, dur, [[1, 1, len], [2.76, 0.25, len * 0.35], [5.4, 0.08, len * 0.15], [2.001, 0.15, len * 0.6]],
    {seed, strike: 0.02, beat: 2.5});

const ORGAN = makeTable([1, 0.55, 0.3, 0.38, 0.1, 0.16, 0.04, 0.14, 0.03, 0.05, 0.02, 0.05]);

// Pipe-organ drone: wavetable ranks, detuned for chorus, tremulant, wind noise.
export const organ = (freqs, dur, {seed = 1, attack = 2, release = 3, trem = 0.06} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const L = new Float32Array(n), R = new Float32Array(n);
  const env = adsr(n, attack, 0.5, 0.9, release, dur - release);
  const tr = osc(n, 5.2, {phase: r()});
  const drift = smoothNoise(n, 0.4, r);
  for (const f of freqs) {
    for (let v = 0; v < 3; v++) {
      const det = cents((v - 1) * 3.5 + range(r, -1, 1));
      const fr = new Float32Array(n);
      for (let i = 0; i < n; i++) fr[i] = f * det * (1 + drift[i] * 0.0006);
      const x = tableOsc(n, ORGAN, fr, r());
      const pan = v === 0 ? 0.8 : v === 2 ? 0.2 : 0.5;
      for (let i = 0; i < n; i++) {
        const a = x[i] * env[i] * (1 - trem + trem * tr[i]);
        L[i] += a * (1 - pan);
        R[i] += a * pan;
      }
    }
  }
  const wind = pink(n, r);
  const wb = svf(wind, 1800, 0.8, 'bp');
  for (let i = 0; i < n; i++) { L[i] += wb[i] * 0.015 * env[i]; R[i] -= wb[i] * 0.015 * env[i]; }
  for (const x of [L, R]) { biquad(x, 'lp', 3500, 0.6); fadeEdges(x, 0.01, 0.05); }
  return {L, R};
};

// Choir pad: several vibrato'd sawtooth voices per note through a vowel formant bank.
export const choir = (freqs, dur, {
  vowel = 'o', seed = 1, attack = 2.5, release = 3, voices = 3, shift = 1, breath = 0.04, env = null,
} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const side = () => {
    const src = new Float32Array(n);
    for (const f of freqs) {
      for (let v = 0; v < voices; v++) {
        const vib = osc(n, range(r, 4.6, 5.6), {phase: r()});
        const drift = smoothNoise(n, range(r, 0.2, 0.5), r);
        const onset = secs(range(r, 0, 0.25));
        const det = cents(range(r, -9, 9));
        const fr = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const vd = Math.min(1, i / (SR * 1.5));
          fr[i] = f * det * (1 + 0.0045 * vd * vib[i] + 0.003 * drift[i]);
        }
        const x = osc(n, fr, {type: 'saw', phase: r()});
        addInto(src, x.subarray(0, n - onset), onset, 1 / Math.sqrt(voices * freqs.length));
      }
    }
    const b = pink(n, r);
    addInto(src, b, 0, breath);
    const out = formant(src, VOWELS[vowel], shift);
    biquad(out, 'lp', 4200, 0.7);
    biquad(out, 'hp', 90, 0.7);
    return out;
  };
  const L = side(), R = side();
  const e = env ?? adsr(n, attack, 0.2, 1, release, dur - release);
  mul(L, e); mul(R, e);
  fadeEdges(L, 0.01, 0.05); fadeEdges(R, 0.01, 0.05);
  return {L, R};
};

// Bowed string ensemble: detuned saws, vibrato, soft low-pass. Stereo.
export const strings = (freqs, dur, {
  seed = 1, attack = 1.5, release = 2, cutoff = 1800, voices = 3, env = null, vib = 0.004, bend = null,
} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const L = new Float32Array(n), R = new Float32Array(n);
  const e = env ?? adsr(n, attack, 0.3, 1, release, dur - release);
  for (const f of freqs) {
    for (let v = 0; v < voices; v++) {
      const lfo = osc(n, range(r, 4.8, 5.9), {phase: r()});
      const det = cents(range(r, -7, 7));
      const fr = new Float32Array(n);
      for (let i = 0; i < n; i++) fr[i] = f * det * (bend ? bend[i] : 1) * (1 + vib * lfo[i] * Math.min(1, i / SR));
      const x = osc(n, fr, {type: 'saw', phase: r()});
      const pan = range(r, 0.15, 0.85);
      const g = 1 / Math.sqrt(voices * freqs.length);
      for (let i = 0; i < n; i++) { L[i] += x[i] * g * (1 - pan); R[i] += x[i] * g * pan; }
    }
  }
  const outL = svf(L, cutoff, 0.6, 'lp'), outR = svf(R, cutoff, 0.6, 'lp');
  for (const x of [outL, outR]) { biquad(x, 'peak', 300, 1, 2); biquad(x, 'hp', 50, 0.7); mul(x, e); fadeEdges(x, 0.01, 0.05); }
  return {L: outL, R: outR};
};

// Warm cello-like line: one bowed saw with body formants, legato notes [[t, midiHz, dur], ...].
export const cello = (notes, total, {seed = 1, gain = 1} = {}) => {
  const r = rng(seed);
  const n = secs(total);
  const out = new Float32Array(n);
  const fr = new Float32Array(n);
  const amp = new Float32Array(n);
  const vib = osc(n, 5.1, {phase: r()});
  const bow = smoothNoise(n, 3, r);
  for (const [t, f, d, a = 1] of notes) {
    const i0 = secs(t), i1 = Math.min(n, secs(t + d));
    for (let i = i0; i < i1; i++) {
      const u = (i - i0) / SR, rem = (i1 - i) / SR;
      fr[i] = f;
      // Bow in and out; short notes get quicker strokes so they still speak.
      const e = Math.min(1, u / Math.min(0.9, d * 0.35)) * Math.min(1, rem / Math.min(1.1, d * 0.5));
      amp[i] = Math.max(amp[i], a * e * e * (3 - 2 * e));
    }
  }
  // Glide between notes instead of jumping.
  let last = fr.find((v) => v > 0) || 100;
  for (let i = 0; i < n; i++) {
    if (fr[i] === 0) fr[i] = last;
    last = last + (fr[i] - last) * 0.0015;
    fr[i] = last * (1 + 0.0035 * vib[i] * Math.min(1, amp[i] * 1.5));
  }
  const x = osc(n, fr, {type: 'saw'});
  for (let i = 0; i < n; i++) out[i] = x[i] * amp[i] * (1 + 0.08 * bow[i]) * gain;
  const b = formant(out, [[280, 90, 0], [650, 160, -4], [1400, 300, -12]]);
  addInto(b, out, 0, 0.12);
  biquad(b, 'lp', 1500, 0.6);
  biquad(b, 'hp', 45, 0.7);
  return fadeEdges(b, 0.01, 0.05);
};

// Breathy low flute: sine + a little 2nd harmonic + band-passed breath, delayed vibrato.
export const flute = (freq, dur, {seed = 1, vel = 1, attack = 0.12, release = 0.4} = {}) => {
  const r = rng(seed);
  const n = secs(dur + release);
  const vib = osc(n, 4.8, {phase: r()});
  const fr = new Float32Array(n);
  for (let i = 0; i < n; i++) fr[i] = freq * (1 + 0.005 * vib[i] * Math.min(1, Math.max(0, i / SR - 0.3) * 2));
  const s1 = osc(n, fr), s2 = osc(n, fr.map((v) => v * 2), {phase: 0.25});
  const br = svf(white(n, r), freq * 2, 2.5, 'bp');
  const chiff = svf(white(n, r), freq * 4, 3, 'bp');
  const env = adsr(n, attack, 0.2, 0.85, release, dur);
  const ce = perc(n, 0.005, 0.12);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (s1[i] * 0.8 + s2[i] * 0.12 + br[i] * 0.35) * env[i] * vel + chiff[i] * ce[i] * 0.15 * vel;
  }
  return fadeEdges(out, 0.002, 0.02);
};

// Taiko-like war drum: pitch-dropping membrane, second mode, stick transient.
export const taiko = (vel = 1, {seed = 1, pitch = 1, len = 1.1} = {}) => {
  const r = rng(seed);
  const n = secs(len + 0.1);
  const f = curve(n, [[0, 150 * pitch], [0.05, 72 * pitch], [0.4, 58 * pitch]], 'exp');
  const m1 = osc(n, f);
  const m2 = osc(n, f.map((v) => v * 1.62), {phase: 0.1});
  const e1 = perc(n, 0.002, len), e2 = perc(n, 0.001, len * 0.35);
  const hit = svf(white(n, r), 900, 0.8, 'lp');
  const eh = perc(n, 0.0005, 0.06);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = m1[i] * e1[i] + m2[i] * e2[i] * 0.35 + hit[i] * eh[i] * 0.9;
  drive(out, 1.6);
  biquad(out, 'lp', 600, 0.6); // a thump, never a tick
  mul(out, vel);
  return fadeEdges(out, 0.0005, 0.05);
};

// Lub-dub: two low sine thumps with a falling pitch, plus an octave body and a
// soft knock so it still reads on small speakers.
export const heartbeat = (vel = 1, {seed = 1, gap = 0.2} = {}) => {
  const r = rng(seed);
  const n = secs(0.75);
  const out = new Float32Array(n);
  const thump = (t0, f0, f1, a, len) => {
    const m = secs(len);
    const f = curve(m, [[0, f0], [len, f1]], 'exp');
    const s = osc(m, f);
    const s2 = osc(m, f.map((v) => v * 2), {phase: 0.25});
    const e = perc(m, 0.006, len * 0.9), e2 = perc(m, 0.004, len * 0.45);
    const nz = svf(white(m, r), 120, 0.7, 'lp');
    const kn = svf(white(m, r), 240, 1.1, 'bp');
    for (let i = 0; i < m; i++) s[i] = ((s[i] + nz[i] * 0.4) * e[i] + (s2[i] * 0.3 + kn[i] * 0.5) * e2[i]) * a;
    addInto(out, s, secs(t0));
  };
  thump(0, 62, 36, 1, 0.3);
  thump(gap, 56, 34, 0.7, 0.28);
  drive(out, 1.6);
  mul(out, vel);
  return fadeEdges(out, 0.001, 0.03);
};
