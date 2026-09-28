// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Sound effects and ambiences. Each returns a mono Float32Array (or {L, R} for
// ambiences) starting at its onset, already edge-faded.

import {
  SR, TAU, secs, rng, range, white, pink, brown, smoothNoise, osc, curve, perc, adsr,
  fadeEdges, mul, addInto, biquad, svf, formant, VOWELS, drive, reverse, normalize, peak,
} from './dsp.mjs';
import {bell} from './instruments.mjs';

// Band-passed noise grain with a percussive envelope.
const grain = (r, len, f, q, t60, attack = 0.0005) => {
  const n = secs(len);
  const x = svf(white(n, r), f, q, 'bp');
  return mul(x, perc(n, attack, t60));
};

// Poisson event times over [0, dur) at `rate` per second (rate may be a function of t).
const events = (r, dur, rate) => {
  const out = [];
  let t = 0;
  for (;;) {
    const k = typeof rate === 'function' ? rate(t) : rate;
    t += -Math.log(1 - r() * 0.999) / Math.max(0.01, k);
    if (t >= dur) return out;
    out.push(t);
  }
};

// ---------- fire, candle, room ----------

export const crackle = (dur, {density = 6, seed = 1, pops = 0.15, hiss = 0.02} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  for (const t of events(r, dur, density)) {
    const big = r() < pops;
    const a = Math.pow(r(), 2.5) * (big ? 1 : 0.5);
    const g = big
      ? grain(r, 0.03, range(r, 350, 1200), 1.5, range(r, 0.015, 0.03))
      : grain(r, 0.008, range(r, 2000, 6000), 1.2, range(r, 0.002, 0.006));
    addInto(out, g, secs(t), a);
  }
  if (hiss) {
    const h = svf(pink(n, r), 900, 0.6, 'lp');
    const m = smoothNoise(n, 1.5, r);
    for (let i = 0; i < n; i++) out[i] += h[i] * hiss * (0.7 + 0.3 * m[i]);
  }
  return fadeEdges(out, 0.2, 0.2);
};

export const roomTone = (dur, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const x = svf(pink(n, r), 500, 0.5, 'lp');
  biquad(x, 'hp', 40, 0.7);
  return fadeEdges(x, 0.5, 0.5);
};

export const matchStrike = ({seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(2.4);
  const out = new Float32Array(n);
  // Scrape along the striker: gritty band-passed noise.
  const sn = secs(0.17);
  const sc = svf(white(sn, r), 3200, 1.4, 'bp');
  const grit = svf(white(sn, r), 250, 0.7, 'lp');
  for (let i = 0; i < sn; i++) {
    const u = i / sn;
    sc[i] *= (0.3 + 0.7 * u) * (0.4 + Math.min(1.6, Math.abs(grit[i]) * 12));
  }
  addInto(out, fadeEdges(sc, 0.004, 0.01), 0, 0.5);
  // Ignition flare: a sweeping hiss plus a soft low whoomph.
  const t0 = secs(0.15), fn = n - t0;
  const sweep = curve(fn, [[0, 700], [0.12, 2600], [1.2, 900]], 'exp');
  const fl = svf(white(fn, r), sweep, 0.9, 'bp');
  mul(fl, perc(fn, 0.006, 1.1));
  addInto(out, fl, t0, 0.9);
  const wh = svf(white(fn, r), 260, 0.7, 'lp');
  mul(wh, perc(fn, 0.015, 0.5));
  addInto(out, wh, t0, 1.6);
  addInto(out, crackle(1.6, {density: 30, seed: seed + 7, hiss: 0}), t0 + secs(0.05), 0.6);
  return fadeEdges(out, 0.002, 0.2);
};

// Quill on parchment: words of short scratch strokes, dips to the inkwell.
export const quill = (dur, {seed = 1, rate = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  let t = 0.1, word = 0;
  while (t < dur - 0.3) {
    const wl = range(r, 0.45, 1.2);
    const end = Math.min(dur - 0.1, t + wl);
    while (t < end) {
      const sl = range(r, 0.06, 0.2) / rate;
      const m = secs(sl);
      const f0 = range(r, 2700, 4300), f1 = f0 * range(r, 0.8, 1.25);
      const sw = curve(m, [[0, f0], [sl, f1]], 'exp');
      const x = svf(white(m, r), sw, 2.2, 'bp');
      const fib = svf(white(m, r), 180, 0.7, 'lp');
      const pr = range(r, 0.5, 1);
      for (let i = 0; i < m; i++) {
        const u = i / m;
        const e = Math.sin(Math.PI * Math.pow(u, 0.7));
        x[i] *= e * pr * (0.35 + Math.min(1.5, Math.abs(fib[i]) * 10));
      }
      addInto(out, fadeEdges(x, 0.004, 0.008), secs(t));
      t += sl + range(r, 0.015, 0.07) / rate;
    }
    word++;
    if (word % 5 === 4 && t < dur - 1.6) {
      // Dip: a faint tap of the nib on the glass inkwell.
      const tap = bell(range(r, 2600, 2900), 0.5, [[1, 1, 0.35], [2.7, 0.4, 0.15]], {seed: seed + word, strike: 0});
      addInto(out, tap, secs(t + 0.35), 0.12);
      t += range(r, 1.0, 1.3);
    } else {
      t += range(r, 0.22, 0.6);
    }
  }
  return fadeEdges(out, 0.01, 0.05);
};

// Fast, looping signature flourish ending in a flick.
export const flourish = (dur, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const sw = new Float32Array(n);
  const loop = smoothNoise(n, 7, r);
  for (let i = 0; i < n; i++) sw[i] = 3400 * (1 + 0.3 * loop[i]) * (1 + 0.25 * (i / n));
  const x = svf(white(n, r), sw, 2, 'bp');
  const fib = svf(white(n, r), 220, 0.7, 'lp');
  const pres = osc(n, 5.5, {phase: 0.2});
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const e = Math.min(1, u / 0.1) * (u > 0.93 ? (1 - u) / 0.07 : 1) * (0.6 + 0.4 * u);
    x[i] *= e * (0.55 + 0.45 * pres[i]) * (0.4 + Math.min(1.5, Math.abs(fib[i]) * 10));
  }
  return fadeEdges(x, 0.004, 0.01);
};

// ---------- air ----------

export const whoosh = (dur, {f0 = 300, f1 = 1800, f2 = 500, peak = 0.5, q = 1, seed = 1, noise = 'pink'} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const src = noise === 'pink' ? pink(n, r) : white(n, r);
  const pk = peak * dur;
  const fc = curve(n, [[0, f0], [pk, f1], [dur, f2]], 'exp');
  const x = svf(src, fc, q, 'bp');
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = t < pk ? Math.pow(t / pk, 2.2) : Math.exp((-4 * (t - pk)) / (dur - pk));
    x[i] *= e;
  }
  return fadeEdges(normalize(x), 0.003, 0.02);
};

// Stereo wind: two decorrelated band-passed noise beds with gusting.
export const wind = (dur, {seed = 1, lo = 300, hi = 900, gust = 0.5, rumble = 0.4} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const side = () => {
    const fc = smoothNoise(n, 0.18, r);
    const g = smoothNoise(n, 0.12, r);
    for (let i = 0; i < n; i++) fc[i] = lo + (hi - lo) * (0.5 + 0.5 * fc[i]);
    const x = svf(pink(n, r), fc, 0.9, 'bp');
    const low = svf(brown(n, r), 110, 0.7, 'lp');
    for (let i = 0; i < n; i++) x[i] = (x[i] + low[i] * rumble) * (1 - gust + gust * (0.5 + 0.5 * g[i]));
    return fadeEdges(x, 0.5, 0.5);
  };
  return {L: side(), R: side()};
};

export const flameFlutter = (dur, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const x = svf(pink(n, r), 180, 1.2, 'bp');
  const f = smoothNoise(n, 3, r);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const rate = 9 + 4 * f[i];
    x[i] *= 0.5 + 0.5 * Math.sin(TAU * rate * t + 3 * f[i]);
  }
  mul(x, perc(n, 0.08, dur));
  return fadeEdges(x, 0.01, 0.1);
};

// ---------- creatures and footsteps ----------

// Distant crow: harsh buzzy source through beak/throat formants, 2-3 caws.
export const crow = ({seed = 1, pitch = 1, count = 3} = {}) => {
  const r = rng(seed);
  const n = secs(count * 0.46 + 0.3);
  const out = new Float32Array(n);
  for (let c = 0; c < count; c++) {
    const len = range(r, 0.24, 0.32);
    const m = secs(len);
    const base = 520 * pitch * range(r, 0.95, 1.05);
    const jit = svf(white(m, r), 90, 0.7, 'lp');
    const pe = curve(m, [[0, 0.9], [len * 0.25, 1.06], [len, 0.8]], 'exp');
    const fr = new Float32Array(m);
    for (let i = 0; i < m; i++) fr[i] = base * pe[i] * (1 + jit[i] * 0.6);
    const saw = osc(m, fr, {type: 'saw'});
    const nz = white(m, r);
    const rough = osc(m, fr.map((v) => v * 0.5), {type: 'square'});
    for (let i = 0; i < m; i++) saw[i] = (saw[i] * (0.75 + 0.25 * rough[i]) + nz[i] * 0.35);
    const x = formant(saw, [[1150, 180, 0], [1750, 260, -2], [2700, 400, -7]]);
    const e = adsr(m, 0.02, 0.08, 0.7, 0.12, len - 0.12);
    mul(x, e);
    drive(x, 2);
    addInto(out, fadeEdges(x, 0.003, 0.01), secs(c * range(r, 0.4, 0.46)), c === 0 ? 1 : range(r, 0.6, 0.9));
  }
  return normalize(out);
};

export const gravelStep = (vel = 1, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(0.3);
  const out = new Float32Array(n);
  const th = svf(white(n, r), 140, 0.8, 'lp');
  mul(th, perc(n, 0.004, 0.09));
  addInto(out, th, 0, 1.6);
  const count = 30 + Math.floor(r() * 20);
  for (let k = 0; k < count; k++) {
    const t = Math.pow(r(), 1.8) * 0.13;
    const g = grain(r, 0.006, range(r, 1400, 5500), 2, range(r, 0.002, 0.006));
    addInto(out, g, secs(t + 0.005), range(r, 0.15, 0.6));
  }
  return fadeEdges(mul(out, vel), 0.001, 0.02);
};

export const stoneStep = (vel = 1, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(0.35);
  const out = new Float32Array(n);
  const th = svf(white(n, r), 160, 0.9, 'lp');
  mul(th, perc(n, 0.003, 0.12));
  addInto(out, th, 0, 2);
  const sc = svf(white(n, r), 900, 1.2, 'bp');
  mul(sc, perc(n, 0.01, 0.1));
  addInto(out, sc, secs(0.01), 0.3);
  for (let k = 0; k < 10; k++) addInto(out, grain(r, 0.005, range(r, 2000, 5000), 2, 0.004), secs(range(r, 0, 0.04)), 0.3);
  return fadeEdges(mul(out, vel), 0.001, 0.02);
};

// ---------- friction ----------

// Stick-slip friction: an irregular pulse train ringing resonant modes, plus an FM squeal.
export const creak = (dur, {f0 = 520, seed = 1, rate = [22, 48], squeal = 0.25, modes = [1, 2.13, 3.71]} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const pulses = new Float32Array(n);
  const rn = smoothNoise(n, 3, r);
  // The first stick-slip catches hard, swells, then eases off.
  const env = curve(n, [[0, 0], [0.04, 0.8], [dur * 0.35, 1], [dur, 0]]);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const rt = rate[0] + (rate[1] - rate[0]) * (0.5 + 0.5 * rn[i]);
    ph += rt / SR;
    if (ph >= 1) { ph -= 1 + range(r, -0.15, 0.15); pulses[i] = range(r, 0.4, 1) * env[i]; }
  }
  const out = new Float32Array(n);
  modes.forEach((m, k) => addInto(out, svf(pulses, f0 * m, 28 - k * 6, 'bp'), 0, 1 / (k + 1)));
  normalize(out);
  // FM squeal riding the friction pressure.
  const car = new Float32Array(n);
  let pc = 0, pm = 0;
  for (let i = 0; i < n; i++) {
    const fm = rate[0] * 1.5 + 10 * rn[i];
    pm += fm / SR;
    pc += (f0 * 1.5 * (1 + 0.04 * rn[i])) / SR;
    car[i] = Math.sin(TAU * pc + 2.2 * Math.sin(TAU * pm)) * env[i] * env[i];
  }
  addInto(out, car, 0, squeal);
  return fadeEdges(normalize(out), 0.01, 0.03);
};

export const boneCreak = (dur, {seed = 1} = {}) =>
  creak(dur, {f0: range(rng(seed), 190, 260), seed, rate: [9, 24], squeal: 0.1, modes: [1, 2.6, 4.3]});

export const boneRattle = (dur, {seed = 1, density = 40, shape = null} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  const sh = shape ?? ((u) => Math.sin(Math.PI * u));
  for (const t of events(r, dur, (tt) => density * (0.3 + sh(tt / dur)))) {
    const a = sh(t / dur) * range(r, 0.3, 1);
    const knock = r() < 0.2;
    const g = knock
      ? grain(r, 0.05, range(r, 450, 850), 5, range(r, 0.03, 0.05))
      : grain(r, 0.03, range(r, 1300, 3400), 7, range(r, 0.012, 0.03));
    addInto(out, g, secs(t), a * (knock ? 1.5 : 1));
  }
  return fadeEdges(normalize(out), 0.003, 0.02);
};

export const bladeDrag = (dur, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const wander = smoothNoise(n, 0.8, r);
  const fc = new Float32Array(n);
  for (let i = 0; i < n; i++) fc[i] = 2500 * (1 + 0.25 * wander[i]);
  const x = svf(white(n, r), fc, 3, 'bp');
  const slip = creak(dur, {f0: 1850, seed: seed + 3, rate: [35, 70], squeal: 0.05, modes: [1, 1.57, 2.93]});
  const am = smoothNoise(n, 6, r);
  const env = curve(n, [[0, 0], [0.25, 1], [dur - 0.4, 0.8], [dur, 0]]);
  for (let i = 0; i < n; i++) x[i] = (x[i] * (0.6 + 0.4 * am[i]) + slip[i] * 0.5) * env[i];
  for (const t of events(r, dur, 5)) addInto(x, grain(r, 0.01, range(r, 5000, 9000), 3, 0.006), secs(t), 0.4);
  return fadeEdges(normalize(x), 0.02, 0.05);
};

// ---------- metal ----------

// THE parry: two struck blades (inharmonic plate modes) plus the high singing ring
// of the edge, a bright noise transient, a crack and a low-mid punch. Stereo: each
// side rings with its own beating so the tail shimmers across the image.
export const clang = ({seed = 1, base = 410, len = 4} = {}) => {
  const r = rng(seed);
  const n = secs(len + 0.5);
  // Shared attack: the hit is dead centre, the ring blooms wide.
  const hit = new Float32Array(n);
  const tr = svf(white(secs(0.12), r), 4200, 0.6, 'hp');
  mul(tr, perc(tr.length, 0.0003, 0.08));
  addInto(hit, tr, 0, 0.9);
  const ck = svf(white(secs(0.008), r), 2500, 0.7, 'hp');
  mul(ck, perc(ck.length, 0.0001, 0.005));
  addInto(hit, ck, 0, 1.1);
  const pn = secs(0.6);
  const punch = osc(pn, curve(pn, [[0, 180], [0.2, 62], [0.6, 52]], 'exp'));
  mul(punch, perc(pn, 0.001, 0.4));
  addInto(hit, punch, 0, 0.75);
  const knock = svf(white(pn, r), 700, 1.2, 'bp');
  mul(knock, perc(pn, 0.0005, 0.09));
  addInto(hit, knock, 0, 0.8);

  const plate = [1, 1.47, 2.09, 2.56, 2.99, 3.63, 4.21, 5.03, 5.87, 6.61, 7.94, 9.28, 11.3, 13.7];
  const side = (sd) => {
    const ring = new Float32Array(n);
    const p1 = plate.map((p, k) => [p, (k === 0 ? 0.7 : 1) / Math.pow(k + 1, 0.55), len / Math.pow(1 + k * 0.35, 1.1)]);
    addInto(ring, bell(base, len + 0.4, p1, {seed: sd, strike: 0, beat: 3.5}), 0, 1);
    const p2 = plate.map((p, k) => [p * 1.013, 0.6 / Math.pow(k + 1, 0.5), (len * 0.45) / (1 + k * 0.4)]);
    addInto(ring, bell(base * 1.29, len * 0.6, p2, {seed: sd + 1, strike: 0, beat: 5}), 0, 0.8);
    // The edge sings: a high, slowly beating ring that outlasts the body.
    const edge = [[1, 1, len * 0.9], [1.0021, 0.6, len * 0.8], [2.41, 0.4, len * 0.4], [3.93, 0.22, len * 0.22], [5.62, 0.1, len * 0.12]];
    addInto(ring, bell(base * 5.3, len + 0.4, edge, {seed: sd + 2, strike: 0, beat: 2.2}), 0, 0.9);
    normalize(ring);
    addInto(ring, hit, 0, 1);
    drive(ring, 2.2);
    return fadeEdges(ring, 0.0003, 0.2);
  };
  const L = side(seed), R = side(seed + 50);
  const g = 1 / Math.max(peak(L), peak(R));
  return {L: mul(L, g), R: mul(R, g)};
};

export const clink = (vel = 1, {seed = 1, f = 2300, len = 0.6} = {}) => {
  const b = bell(f, len + 0.1, [[1, 1, len], [2.32, 0.6, len * 0.5], [4.1, 0.35, len * 0.25], [5.93, 0.2, len * 0.15]],
    {seed, strike: 0.5, beat: 4});
  return mul(b, vel);
};

export const armorClank = (vel = 1, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(0.5);
  const out = new Float32Array(n);
  const f = range(r, 700, 900);
  addInto(out, bell(f, 0.45, [[1, 1, 0.3], [1.58, 0.8, 0.22], [2.4, 0.6, 0.16], [3.5, 0.4, 0.1], [5.1, 0.25, 0.07]],
    {seed, strike: 0.6, beat: 6}), 0, 0.7);
  const th = svf(white(n, r), 220, 1, 'lp');
  mul(th, perc(n, 0.002, 0.08));
  addInto(out, th, 0, 1.2);
  return fadeEdges(mul(out, vel), 0.0005, 0.03);
};

export const swordDraw = ({seed = 1, dur = 0.9} = {}) => {
  const r = rng(seed);
  const n = secs(dur + 1.6);
  const out = new Float32Array(n);
  const m = secs(dur);
  const sw = curve(m, [[0, 1400], [dur, 5200]], 'exp');
  const x = svf(white(m, r), sw, 3.5, 'bp');
  const slip = smoothNoise(m, 90, r);
  const env = curve(m, [[0, 0], [Math.min(0.08, dur * 0.3), 0.6], [dur * 0.55, 1], [dur, 0.05]]);
  for (let i = 0; i < m; i++) x[i] *= env[i] * (0.55 + 0.45 * slip[i]);
  addInto(out, fadeEdges(x, 0.01, 0.02), 0, 1);
  const ring = bell(1900, 1.9, [[1, 1, 1.6], [1.53, 0.7, 1.2], [2.47, 0.5, 0.9], [3.11, 0.35, 0.6], [4.4, 0.2, 0.4]],
    {seed: seed + 2, strike: 0.2, beat: 3});
  addInto(out, ring, secs(dur), 0.35); // the tip clears the scabbard
  return fadeEdges(normalize(out), 0.005, 0.1);
};

// A high shimmering glint: staggered airy pings with a breathy sweep.
export const glint = ({seed = 1, dur = 1.6, base = 5200} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  for (let k = 0; k < 7; k++) {
    const f = base * range(r, 0.9, 2.1);
    const g = bell(f, dur, [[1, 1, range(r, 0.6, 1.3)], [1.5, 0.3, 0.4]], {seed: seed + k, strike: 0, beat: 7});
    addInto(out, g, secs(k * range(r, 0.015, 0.05)), range(r, 0.4, 1));
  }
  const air = svf(white(n, r), curve(n, [[0, 6000], [0.3, 11000], [dur, 9000]], 'exp'), 1.5, 'bp');
  mul(air, perc(n, 0.02, 0.5));
  addInto(out, air, 0, 0.8);
  return fadeEdges(normalize(out), 0.002, 0.1);
};

// ---------- body ----------

export const clothTumble = (dur, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur + 0.4);
  const out = new Float32Array(n);
  const m = secs(dur);
  const x = svf(pink(m, r), curve(m, [[0, 900], [dur * 0.5, 2200], [dur, 700]], 'exp'), 0.9, 'bp');
  const bursts = smoothNoise(m, 14, r);
  for (let i = 0; i < m; i++) {
    const u = i / m;
    x[i] *= Math.max(0, bursts[i] + 0.3) * Math.sin(Math.PI * Math.pow(u, 0.6));
  }
  addInto(out, fadeEdges(x, 0.01, 0.05), 0, 1.4);
  for (let k = 0; k < 4; k++) addInto(out, armorClank(range(r, 0.25, 0.6), {seed: seed + 10 + k}), secs(range(r, 0.05, dur)), 0.6);
  const th = svf(white(secs(0.4), r), 120, 0.8, 'lp');
  mul(th, perc(th.length, 0.004, 0.25));
  addInto(out, th, secs(dur * 0.8), 2);
  return fadeEdges(normalize(out), 0.003, 0.05);
};

export const crunch = ({seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(0.5);
  const out = new Float32Array(n);
  for (let k = 0; k < 12; k++) {
    const t = Math.pow(r(), 1.5) * 0.14;
    addInto(out, grain(r, 0.03, range(r, 900, 4200), 3, range(r, 0.01, 0.03)), secs(t), range(r, 0.4, 1));
  }
  const th = svf(white(n, r), 300, 0.9, 'lp');
  mul(th, perc(n, 0.002, 0.18));
  addInto(out, th, 0, 1.2);
  return fadeEdges(normalize(out), 0.0005, 0.03);
};

// ---------- weight ----------

export const subDrop = (dur, {f0 = 70, f1 = 28, seed = 1, attack = 0.005} = {}) => {
  const n = secs(dur);
  const x = osc(n, curve(n, [[0, f0], [dur * 0.7, f1], [dur, f1]], 'exp'));
  mul(x, perc(n, attack, dur));
  return fadeEdges(x, 0.002, 0.1);
};

export const impact = ({seed = 1, size = 1, bright = 1} = {}) => {
  const r = rng(seed);
  const len = 1.2 + 2 * size;
  const n = secs(len);
  const out = new Float32Array(n);
  addInto(out, subDrop(len, {f0: 78, f1: 34}), 0, 1.1);
  const th = svf(white(n, r), 180, 0.8, 'lp');
  mul(th, perc(n, 0.002, 0.5 * size));
  addInto(out, th, 0, 2.2);
  const nb = svf(pink(n, r), curve(n, [[0, 5000 * bright], [0.6, 700]], 'exp'), 0.5, 'lp');
  mul(nb, perc(n, 0.001, 0.6 * size));
  addInto(out, nb, 0, 1.4 * bright);
  const ck = white(secs(0.008), r);
  mul(ck, perc(ck.length, 0.0001, 0.006));
  addInto(out, ck, 0, 0.8 * bright);
  drive(out, 1.4);
  return fadeEdges(normalize(out), 0.0005, 0.2);
};

// Reversed swell that ends `gap` seconds before its nominal end (the "suck" before a hit).
export const revSwell = (dur, {seed = 1, gap = 0.06, bright = 1, tone = 0} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const x = svf(white(n, r), 2500 * bright, 0.6, 'hp');
  addInto(x, svf(pink(n, r), 1200, 0.7, 'lp'), 0, 0.8);
  mul(x, perc(n, 0.001, dur * 0.9));
  if (tone) addInto(x, bell(tone, dur, [[1, 1, dur], [2.01, 0.5, dur * 0.7], [3.02, 0.3, dur * 0.5], [4.2, 0.2, dur * 0.3]], {seed, strike: 0}), 0, 0.6);
  const y = reverse(x);
  const g = secs(gap);
  for (let i = n - g; i < n; i++) y[i] = 0;
  return fadeEdges(normalize(y), 0.05, 0.004);
};

export const rumble = (dur, {seed = 1, cutoff = 90} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const x = svf(brown(n, r), cutoff, 0.7, 'lp');
  const m = smoothNoise(n, 2.5, r);
  for (let i = 0; i < n; i++) x[i] *= 0.7 + 0.3 * m[i];
  biquad(x, 'hp', 22, 0.7);
  return fadeEdges(normalize(x), 0.05, 0.3);
};

export const riser = (dur, {seed = 1, f0 = 146.8, f1 = 587.3, gap = 0.05} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const nz = svf(white(n, r), curve(n, [[0, 300], [dur, 7000]], 'exp'), 1.4, 'bp');
  const fr = curve(n, [[0, f0], [dur, f1]], 'exp');
  const tone = osc(n, fr, {type: 'saw'});
  const tone2 = osc(n, fr.map((v) => v * 1.498), {type: 'saw'});
  const tl = svf(tone, curve(n, [[0, 400], [dur, 5000]], 'exp'), 0.8, 'lp');
  const tl2 = svf(tone2, curve(n, [[0, 400], [dur, 5000]], 'exp'), 0.8, 'lp');
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    ph += (3 + 17 * u * u) / SR;
    const trem = 0.75 + 0.25 * Math.sin(TAU * ph);
    const e = Math.pow(u, 2.3);
    out[i] = (nz[i] * 0.9 + (tl[i] + tl2[i] * 0.5) * 0.35 * trem) * e;
  }
  const g = secs(gap);
  for (let i = n - g; i < n; i++) out[i] = 0;
  return fadeEdges(normalize(out), 0.05, 0.004);
};

// Growling roar: pitch-enveloped saw + subharmonic with vocal-fry roughness, formant-shaped, distorted.
export const roar = (dur, {seed = 1, pitch = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const pe = curve(n, [[0, 48], [dur * 0.25, 78], [dur * 0.6, 66], [dur, 40]], 'exp');
  const jit = svf(white(n, r), 40, 0.7, 'lp');
  const fr = new Float32Array(n);
  for (let i = 0; i < n; i++) fr[i] = pe[i] * pitch * (1 + 0.8 * jit[i]);
  const saw = osc(n, fr, {type: 'saw'});
  const sub = osc(n, fr.map((v) => v * 0.5), {type: 'square', pw: 0.4});
  const fry = smoothNoise(n, 45, r);
  const src = new Float32Array(n);
  for (let i = 0; i < n; i++) src[i] = (saw[i] + sub[i] * 0.5) * (0.6 + 0.4 * Math.abs(fry[i]));
  const growl = formant(src, VOWELS.aw, 0.9);
  addInto(growl, src, 0, 0.08);
  const breath = formant(pink(n, r), VOWELS.aw, 1.25);
  const out = new Float32Array(n);
  addInto(out, growl, 0, 1);
  addInto(out, breath, 0, 1.4);
  drive(normalize(out), 3.5);
  const low = osc(n, fr.map((v) => v * 0.5));
  addInto(out, low, 0, 0.35);
  biquad(out, 'lp', 3800, 0.7);
  biquad(out, 'hp', 35, 0.7);
  mul(out, adsr(n, 0.12, 0.4, 0.8, dur * 0.4, dur * 0.6));
  return fadeEdges(normalize(out), 0.005, 0.05);
};

// Dissonant orchestral stab: low minor-second cluster + a screeching high cluster.
export const stab = ({seed = 1, dur = 2.2} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  const env = curve(n, [[0, 0], [0.012, 1], [0.13, 0.32], [dur, 0]]);
  const lo = [73.42, 77.78, 103.83, 110];
  for (const f of lo) {
    for (let v = 0; v < 2; v++) {
      const x = osc(n, f * (1 + range(r, -0.004, 0.004)), {type: 'saw', phase: r()});
      addInto(out, x, 0, 0.3);
    }
  }
  const lof = svf(out, curve(n, [[0, 3500], [0.5, 700], [dur, 400]], 'exp'), 1.1, 'lp');
  const hi = new Float32Array(n);
  for (const f of [1661, 1760, 1244.5]) {
    const trem = osc(n, range(r, 9, 13));
    const x = osc(n, f, {type: 'saw', phase: r()});
    for (let i = 0; i < n; i++) hi[i] += x[i] * (0.7 + 0.3 * trem[i]) * 0.2;
  }
  const hif = svf(hi, 2200, 0.7, 'lp');
  biquad(hif, 'hp', 900, 0.7);
  const res = new Float32Array(n);
  addInto(res, lof, 0, 1);
  addInto(res, hif, 0, 0.5);
  mul(res, env);
  addInto(res, impact({seed: seed + 5, size: 0.4, bright: 0.4}).subarray(0, n), 0, 0.5);
  drive(res, 1.4);
  return fadeEdges(normalize(res), 0.001, 0.1);
};

// ---------- underground ----------

export const drip = ({seed = 1, pitch = 1} = {}) => {
  const r = rng(seed);
  const n = secs(0.16);
  const f0 = range(r, 700, 1300) * pitch;
  const x = osc(n, curve(n, [[0, f0], [0.03, f0 * 2.3]], 'exp'));
  mul(x, perc(n, 0.0008, 0.09));
  const c = white(secs(0.002), r);
  addInto(x, c, 0, 0.2);
  return fadeEdges(x, 0.0005, 0.01);
};

export const stoneGrind = (dur, {seed = 1} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const x = svf(brown(n, r), 420, 0.8, 'lp');
  addInto(x, svf(pink(n, r), 190, 2, 'bp'), 0, 1.5);
  const j = smoothNoise(n, 16, r);
  const s = smoothNoise(n, 1.2, r);
  for (let i = 0; i < n; i++) x[i] *= Math.max(0, 0.5 + 0.6 * j[i]) * (0.7 + 0.3 * s[i]);
  addInto(x, creak(dur, {f0: 95, seed: seed + 4, rate: [6, 14], squeal: 0, modes: [1, 1.9, 3.2]}), 0, 0.5);
  biquad(x, 'hp', 30, 0.7);
  return fadeEdges(normalize(x), 0.2, 0.3);
};

// A breath: band-passed noise through an open-throat vowel, rising (inhale) or falling (exhale).
export const breath = (dur, {seed = 1, inhale = true, shaky = 0} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const fc = curve(n, inhale ? [[0, 900], [dur, 1500]] : [[0, 1300], [dur, 800]], 'exp');
  const x = svf(pink(n, r), fc, 0.8, 'bp');
  const y = formant(white(n, r), VOWELS.o, 1.4);
  addInto(x, y, 0, 0.5);
  const sh = smoothNoise(n, 11, r);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const e = inhale ? Math.pow(Math.sin(Math.PI * Math.pow(u, 1.4)), 1.5) : Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 1.5);
    x[i] *= e * (1 + shaky * sh[i]);
  }
  biquad(x, 'hp', 300, 0.7);
  return fadeEdges(normalize(x), 0.02, 0.05);
};
