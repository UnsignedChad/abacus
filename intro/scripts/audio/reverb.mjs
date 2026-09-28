// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// 16-line feedback delay network reverb with input diffusion, in-loop damping and
// Householder mixing. Presets cover a candlelit room up to a vast stone nave.

import {SR, biquad} from './dsp.mjs';

export const PRESETS = {
  room: {rt60: 0.55, damp: 0.45, size: 0.35, predelay: 0.004, lowcut: 180, highcut: 7000},
  air: {rt60: 1.8, damp: 0.6, size: 1.3, predelay: 0.03, lowcut: 250, highcut: 5000},
  hall: {rt60: 2.6, damp: 0.5, size: 1.2, predelay: 0.03, lowcut: 120, highcut: 6000},
  cave: {rt60: 3.2, damp: 0.5, size: 1.1, predelay: 0.025, lowcut: 120, highcut: 6000},
  cathedral: {rt60: 6.5, damp: 0.55, size: 1.8, predelay: 0.045, lowcut: 90, highcut: 5500},
  abyss: {rt60: 11, damp: 0.7, size: 2.4, predelay: 0.07, lowcut: 60, highcut: 3500},
};

const BASE_MS = [23.1, 26.9, 29.3, 31.7, 34.3, 37.1, 39.7, 43.1, 46.3, 49.9, 53.3, 57.1, 61.3, 65.9, 71.3, 77.9];
const DIFF_MS = [4.77, 3.59, 12.73, 9.31];

// In: stereo send buffers. Out: {L, R} wet only, length = input + tail.
export const reverb = (inL, inR, preset, tail = null) => {
  const p = typeof preset === 'string' ? PRESETS[preset] : preset;
  const extra = Math.round((tail ?? Math.min(p.rt60 * 1.1, 14)) * SR);
  const n = inL.length + extra;
  const xL = new Float32Array(n), xR = new Float32Array(n);
  xL.set(inL); xR.set(inR);
  for (const x of [xL, xR]) {
    biquad(x, 'hp', p.lowcut, 0.7);
    biquad(x, 'lp', p.highcut, 0.7);
  }

  const N = 16;
  const len = BASE_MS.map((ms) => Math.round((ms * p.size * SR) / 1000));
  const lines = len.map((l) => new Float32Array(l));
  const idx = new Int32Array(N);
  const g = len.map((l) => Math.pow(10, (-3 * l) / (p.rt60 * SR)));
  // Damping coefficient per line: longer lines lose more highs.
  const damp = len.map((l) => Math.min(0.9, p.damp * (0.5 + (l / len[N - 1]) * 0.5)));
  const lp = new Float64Array(N);
  const pre = Math.max(1, Math.round(p.predelay * SR));

  // Series allpass diffusers on each input channel.
  const mkDiff = () => DIFF_MS.map((ms) => ({b: new Float32Array(Math.round((ms * SR) / 1000)), i: 0}));
  const dL = mkDiff(), dR = mkDiff();
  const diffuse = (ds, v) => {
    for (const d of ds) {
      const z = d.b[d.i];
      const y = -0.6 * v + z;
      d.b[d.i] = v + 0.6 * y;
      d.i = (d.i + 1) % d.b.length;
      v = y;
    }
    return v;
  };

  const outL = new Float32Array(n), outR = new Float32Array(n);
  const s = new Float64Array(N);
  const norm = 1 / Math.sqrt(N);
  for (let i = 0; i < n; i++) {
    const inl = i >= pre ? diffuse(dL, xL[i - pre]) : 0;
    const inr = i >= pre ? diffuse(dR, xR[i - pre]) : 0;
    let sum = 0;
    for (let k = 0; k < N; k++) {
      let v = lines[k][idx[k]];
      lp[k] = v + damp[k] * (lp[k] - v);
      v = lp[k] * g[k];
      s[k] = v;
      sum += v;
    }
    sum *= 2 / N;
    let l = 0, r = 0;
    for (let k = 0; k < N; k++) {
      const v = s[k];
      l += k & 1 ? -v : v;
      r += k & 2 ? -v : v;
      let fb = v - sum + (k & 1 ? inr : inl) * 0.5;
      if (Math.abs(fb) < 1e-25) fb = 0;
      lines[k][idx[k]] = fb;
      idx[k] = idx[k] + 1 === len[k] ? 0 : idx[k] + 1;
    }
    outL[i] = l * norm;
    outR[i] = r * norm;
  }
  return {L: outL, R: outR};
};
