// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Core DSP toolkit: deterministic noise, oscillators, filters and envelopes.
// Every generator returns a mono Float32Array at SR; nothing reads the clock.

export const SR = 48000;
export const TAU = Math.PI * 2;

export const secs = (s) => Math.max(0, Math.round(s * SR));
export const buf = (sec) => new Float32Array(Math.max(1, secs(sec)));
export const db = (d) => Math.pow(10, d / 20);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const cents = (c) => Math.pow(2, c / 1200);

// mulberry32: small, fast, seedable.
export const rng = (seed) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const range = (r, a, b) => a + (b - a) * r();
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

const NOTE = {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11};
// 'D2', 'Bb3', 'C#4' -> MIDI number.
export const midi = (name) => {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1].toLowerCase()] + acc;
};
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const hz = (name) => mtof(midi(name));

// Parameter accessor: a number, or a per-sample array.
const param = (p) => (typeof p === 'number' ? () => p : (i) => p[i < p.length ? i : p.length - 1]);

// ---------- noise ----------

export const white = (n, r) => {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
};

// Paul Kellet's economy pink filter.
export const pink = (n, r) => {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return out;
};

export const brown = (n, r) => {
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = 0.996 * y + (r() * 2 - 1) * 0.06;
    out[i] = y;
  }
  return out;
};

// Smooth random curve in [-1,1], `rate` new points per second, cosine-interpolated.
export const smoothNoise = (n, rate, r) => {
  const out = new Float32Array(n);
  const step = SR / rate;
  let a = r() * 2 - 1, b = r() * 2 - 1, k = 0;
  for (let i = 0; i < n; i++) {
    const f = i / step - k;
    if (f >= 1) { a = b; b = r() * 2 - 1; k++; }
    const t = i / step - k;
    const s = (1 - Math.cos(Math.PI * t)) / 2;
    out[i] = a + (b - a) * s;
  }
  return out;
};

// ---------- oscillators ----------

const blep = (t, dt) => {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
};

// type: sine | saw | square | tri. freq: number or per-sample array.
export const osc = (n, freq, {type = 'sine', phase = 0, pw = 0.5} = {}) => {
  const out = new Float32Array(n);
  const f = param(freq);
  let t = phase % 1;
  for (let i = 0; i < n; i++) {
    const dt = f(i) / SR;
    let v;
    if (type === 'sine') v = Math.sin(TAU * t);
    else if (type === 'saw') v = 2 * t - 1 - blep(t, dt);
    else if (type === 'square') {
      v = (t < pw ? 1 : -1) + blep(t, dt) - blep((t + 1 - pw) % 1, dt);
    } else v = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
    out[i] = v;
    t += dt;
    if (t >= 1) t -= 1;
  }
  return out;
};

// Single-cycle wavetable from harmonic amplitudes [a1, a2, ...]; cheap additive tones.
export const makeTable = (harmonics, size = 4096) => {
  const tab = new Float32Array(size + 1);
  for (let h = 0; h < harmonics.length; h++) {
    const a = harmonics[h];
    if (!a) continue;
    for (let i = 0; i <= size; i++) tab[i] += a * Math.sin((TAU * (h + 1) * i) / size);
  }
  let peak = 0;
  for (let i = 0; i <= size; i++) peak = Math.max(peak, Math.abs(tab[i]));
  for (let i = 0; i <= size; i++) tab[i] /= peak || 1;
  return tab;
};

export const tableOsc = (n, tab, freq, phase = 0) => {
  const out = new Float32Array(n);
  const f = param(freq);
  const size = tab.length - 1;
  let t = phase % 1;
  for (let i = 0; i < n; i++) {
    const x = t * size;
    const k = x | 0;
    out[i] = tab[k] + (tab[k + 1] - tab[k]) * (x - k);
    t += f(i) / SR;
    if (t >= 1) t -= 1;
  }
  return out;
};

// ---------- envelopes ----------

// Breakpoint curve [[t, v], ...] (seconds). mode 'lin' or 'exp' (log-domain, v>0).
export const curve = (n, pts, mode = 'lin') => {
  const out = new Float32Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (k < pts.length - 2 && t >= pts[k + 1][0]) k++;
    const [t0, v0] = pts[k];
    const [t1, v1] = pts[Math.min(k + 1, pts.length - 1)];
    if (t <= t0) { out[i] = v0; continue; }
    if (t >= t1) { out[i] = v1; continue; }
    const u = (t - t0) / (t1 - t0);
    out[i] = mode === 'exp' ? v0 * Math.pow(v1 / v0, u) : v0 + (v1 - v0) * u;
  }
  return out;
};

// Linear attack then exponential decay (tau = time to fall 60 dB).
export const perc = (n, attack, t60) => {
  const out = new Float32Array(n);
  const a = Math.max(1, secs(attack));
  const k = Math.log(1000) / (t60 * SR);
  for (let i = 0; i < n; i++) {
    out[i] = i < a ? i / a : Math.exp(-k * (i - a));
  }
  return out;
};

export const adsr = (n, a, d, s, r, gate) => {
  const out = new Float32Array(n);
  const A = secs(a), D = secs(d), G = secs(gate), R = secs(r);
  let last = 0;
  for (let i = 0; i < n; i++) {
    let v;
    if (i < G) {
      if (i < A) v = i / Math.max(1, A);
      else if (i < A + D) v = 1 - (1 - s) * ((i - A) / Math.max(1, D));
      else v = s;
      last = v;
    } else {
      const u = (i - G) / Math.max(1, R);
      v = u >= 1 ? 0 : last * (1 - u) * (1 - u);
    }
    out[i] = v;
  }
  return out;
};

// Raised-cosine fades at both ends: every event goes through this (no clicks).
export const fadeEdges = (x, fin = 0.003, fout = 0.005) => {
  const a = Math.min(secs(fin), x.length >> 1), b = Math.min(secs(fout), x.length >> 1);
  for (let i = 0; i < a; i++) x[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
  for (let i = 0; i < b; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
  return x;
};

// ---------- buffer math ----------

export const mul = (x, y) => {
  if (typeof y === 'number') { for (let i = 0; i < x.length; i++) x[i] *= y; return x; }
  for (let i = 0; i < x.length; i++) x[i] *= i < y.length ? y[i] : 0;
  return x;
};

export const addInto = (dst, src, offset = 0, gain = 1) => {
  const o = Math.round(offset);
  const s0 = Math.max(0, -o), s1 = Math.min(src.length, dst.length - o);
  for (let i = s0; i < s1; i++) dst[i + o] += src[i] * gain;
  return dst;
};

export const mix = (...parts) => {
  const n = Math.max(...parts.map((p) => p[0].length));
  const out = new Float32Array(n);
  for (const [x, g] of parts) addInto(out, x, 0, g);
  return out;
};

export const reverse = (x) => x.slice().reverse();
export const peak = (x) => { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; };
export const normalize = (x, to = 1) => mul(x, to / (peak(x) || 1));
export const drive = (x, amount) => {
  const k = Math.tanh(amount);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(amount * x[i]) / k;
  return x;
};

// ---------- filters ----------

// RBJ cookbook biquad, in place. type: lp hp bp notch peak lowshelf highshelf.
export const biquad = (x, type, f, q = 0.707, gainDb = 0) => {
  const w = (TAU * clamp(f, 5, SR * 0.49)) / SR;
  const cw = Math.cos(w), sw = Math.sin(w);
  const alpha = sw / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lp': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'bp': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'notch': b0 = 1; b1 = -2 * cw; b2 = 1; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'peak': b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cw + s); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - s);
      a0 = A + 1 + (A - 1) * cw + s; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - s; break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cw + s); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - s);
      a0 = A + 1 - (A - 1) * cw + s; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - s; break;
    }
    default: throw new Error('biquad type ' + type);
  }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    let y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    if (Math.abs(y) < 1e-25) y = 0;
    x2 = x1; x1 = xi; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
};

// Zero-delay-feedback state-variable filter (Simper); safe to modulate per sample.
// mode: lp | bp | hp | notch. cutoff and q may be arrays. Returns a new buffer.
export const svf = (x, cutoff, q = 0.707, mode = 'lp') => {
  const out = new Float32Array(x.length);
  const fc = param(cutoff), fq = param(q);
  const staticC = typeof cutoff === 'number' && typeof q === 'number';
  let g = 0, k = 0, a1 = 0, a2 = 0, a3 = 0;
  const coef = (i) => {
    g = Math.tan((Math.PI * clamp(fc(i), 10, SR * 0.45)) / SR);
    k = 1 / Math.max(0.05, fq(i));
    a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2;
  };
  coef(0);
  let ic1 = 0, ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (!staticC && (i & 7) === 0) coef(i);
    const v0 = x[i];
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    if (Math.abs(ic1) < 1e-25) ic1 = 0;
    if (Math.abs(ic2) < 1e-25) ic2 = 0;
    out[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : mode === 'hp' ? v0 - k * v1 - v2 : v0 - k * v1;
  }
  return out;
};

export const onePoleLP = (x, f) => {
  const a = Math.exp((-TAU * f) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; }
  return x;
};

export const onePoleHP = (x, f) => {
  const a = Math.exp((-TAU * f) / SR);
  let y = 0, px = 0;
  for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; }
  return x;
};

// Parallel formant bank (vowel shaping). formants: [[freq, bandwidthHz, gainDb], ...]
export const formant = (x, formants, shift = 1) => {
  const out = new Float32Array(x.length);
  for (const [f, bw, g] of formants) {
    const y = svf(x, f * shift, (f * shift) / bw, 'bp');
    addInto(out, y, 0, db(g));
  }
  return out;
};

// Bass-voice vowel formants (Hz, bandwidth, dB).
export const VOWELS = {
  a: [[600, 60, 0], [1040, 70, -7], [2250, 110, -9], [2450, 120, -9], [2750, 130, -20]],
  o: [[400, 40, 0], [750, 80, -11], [2400, 100, -21], [2600, 120, -20], [2900, 120, -40]],
  u: [[350, 40, 0], [600, 80, -20], [2400, 100, -32], [2675, 120, -28], [2950, 120, -36]],
  aw: [[520, 70, 0], [900, 90, -6], [2300, 130, -14], [2800, 160, -18], [3300, 200, -24]],
};

// Pitch-shifting resample (varispeed) of a buffer: rate < 1 lowers and lengthens.
export const varispeed = (x, rate) => {
  const r = param(rate);
  const out = [];
  let p = 0, i = 0;
  while (p < x.length - 1) {
    const k = p | 0, f = p - k;
    out.push(x[k] + (x[k + 1] - x[k]) * f);
    p += r(i++);
  }
  return Float32Array.from(out);
};

// Simple chorus / double-tracking: modulated fractional delay.
export const chorus = (x, {delay = 0.012, depth = 0.003, rate = 0.6, seed = 1} = {}) => {
  const r = rng(seed);
  const lfo = smoothNoise(x.length, rate, r);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const d = (delay + depth * lfo[i]) * SR;
    const p = i - d;
    if (p < 0) continue;
    const k = p | 0, f = p - k;
    out[i] = x[k] + ((k + 1 < x.length ? x[k + 1] : 0) - x[k]) * f;
  }
  return out;
};
