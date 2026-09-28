// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Mastering and metering: BS.1770 loudness, 4x true-peak estimate, and a
// lookahead soft-knee peak limiter.

// K-weighting at 48 kHz (ITU-R BS.1770-4 coefficients).
const K1 = {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585]};
const K2 = {b: [1.0, -2.0, 1.0], a: [-1.99004745483398, 0.99007225036621]};

const iir = (x, {b, a}) => {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};

// K-weighted copies of the channels (for momentary-loudness probes).
export const kWeight = (chans) => chans.map((c) => iir(iir(c, K1), K2));

// Mean-square K-weighted energy per 100 ms hop of 400 ms blocks.
const blocks = (chans, sr, i0 = 0, i1 = chans[0].length) => {
  const kw = chans.map((c) => iir(iir(c.subarray(i0, i1), K1), K2));
  const hop = Math.round(sr * 0.1), win = hop * 4;
  const out = [];
  for (let s = 0; s + win <= i1 - i0; s += hop) {
    let z = 0;
    for (const k of kw) { let a = 0; for (let i = s; i < s + win; i++) a += k[i] * k[i]; z += a / win; }
    out.push(z);
  }
  return out;
};

const lufsOf = (z) => -0.691 + 10 * Math.log10(z);

// Integrated loudness with absolute (-70) and relative (-10 LU) gates.
export const integratedLufs = (chans, sr, i0, i1) => {
  const z = blocks(chans, sr, i0, i1).filter((v) => v > 0 && lufsOf(v) > -70);
  if (!z.length) return -Infinity;
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const rel = lufsOf(mean(z)) - 10;
  const g = z.filter((v) => lufsOf(v) > rel);
  return g.length ? lufsOf(mean(g)) : -Infinity;
};

// Short-term max (3 s windows) over a range, handy per scene.
export const shortTermMax = (chans, sr, i0, i1) => {
  const z = blocks(chans, sr, i0, i1);
  let m = -Infinity;
  for (let k = 0; k + 30 <= z.length; k += 5) {
    let a = 0; for (let j = k; j < k + 27; j++) a += z[j];
    m = Math.max(m, lufsOf(a / 27));
  }
  return m;
};

// 4x windowed-sinc interpolation kernels, one per fractional phase.
const TAPS = 12, OS = 4;
const KERN = (() => {
  const kern = [];
  for (let p = 0; p < OS; p++) {
    const k = [];
    for (let t = -TAPS; t < TAPS; t++) {
      const x = t - p / OS;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / TAPS);
      k.push(x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w);
    }
    kern.push(k);
  }
  return kern;
})();

// Largest |value| among the 3 interpolated points between samples i and i+1.
const interPeak = (c, i) => {
  let m = 0;
  for (let p = 1; p < OS; p++) {
    let v = 0; const k = KERN[p];
    for (let t = 0; t < 2 * TAPS; t++) v += k[t] * c[i + t - TAPS + 1];
    if (Math.abs(v) > m) m = Math.abs(v);
  }
  return m;
};

// True peak via 4x windowed-sinc interpolation (dBTP).
export const truePeak = (chans) => {
  const taps = TAPS, os = OS, kern = KERN;
  let m = 0;
  for (const c of chans) {
    for (let i = taps; i < c.length - taps; i++) {
      const a = Math.abs(c[i]);
      if (a > m) m = a;
      if (a < m * 0.6) continue;
      for (let p = 1; p < os; p++) {
        let v = 0; const k = kern[p];
        for (let t = 0; t < 2 * taps; t++) v += k[t] * c[i + t - taps + 1];
        if (Math.abs(v) > m) m = Math.abs(v);
      }
    }
  }
  return 20 * Math.log10(m || 1e-12);
};

// Lookahead true-peak limiter with a soft knee: detection includes the 4x
// oversampled intersample peaks (only checked near the ceiling), sliding-min of the required gain,
// box-smoothed across the lookahead (so it is fully applied by the peak), then
// a one-pole release. Output is delay-compensated.
export const limit = (L, R, sr, {ceilingDb = -1.5, kneeDb = 2, lookahead = 0.005, release = 0.12} = {}) => {
  const n = L.length;
  const la = Math.max(1, Math.round(lookahead * sr));
  const need = new Float32Array(n);
  const near = Math.pow(10, (ceilingDb - kneeDb / 2 - 4) / 20);
  for (let i = 0; i < n; i++) {
    let p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    if (p > near && i >= TAPS && i < n - TAPS) p = Math.max(p, interPeak(L, i), interPeak(R, i), interPeak(L, i - 1), interPeak(R, i - 1));
    const lv = 20 * Math.log10(p + 1e-12);
    const over = lv - ceilingDb;
    let red = 0;
    if (over > kneeDb / 2) red = over;
    else if (over > -kneeDb / 2) red = ((over + kneeDb / 2) ** 2) / (2 * kneeDb);
    need[i] = Math.pow(10, -red / 20);
  }
  // Sliding minimum over [i - la, i] (monotonic deque).
  const hold = new Float32Array(n);
  const dq = new Int32Array(n);
  let h = 0, t = 0;
  for (let i = 0; i < n; i++) {
    while (t > h && need[dq[t - 1]] >= need[i]) t--;
    dq[t++] = i;
    if (dq[h] < i - la) h++;
    hold[i] = need[dq[h]];
  }
  const rel = Math.exp(-1 / (release * sr));
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const gain = new Float32Array(n);
  let sum = 0, g = 1;
  for (let i = 0; i < n + la; i++) {
    const hi = i < n ? hold[i] : 1;
    sum += hi;
    if (i > la) sum -= i - la - 1 < n ? hold[i - la - 1] : 1;
    const s = sum / Math.min(i + 1, la + 1);
    g = s < g ? s : s + (g - s) * rel;
    const j = i - la;
    if (j >= 0 && j < n) { outL[j] = L[j] * g; outR[j] = R[j] * g; gain[j] = g; }
  }
  return {L: outL, R: outR, gain};
};
