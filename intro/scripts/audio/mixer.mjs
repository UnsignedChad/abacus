// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Scene mixer: sounds are placed at scene-local seconds on named stems with
// equal-power panning and reverb sends. render() runs the reverbs, then the
// scene's own post hook (automation), then the hard end gate.

import {SR, secs, addInto, svf, curve, mul, clamp} from './dsp.mjs';
import {reverb} from './reverb.mjs';

export const STEMS = ['music', 'bed', 'amb', 'sfx', 'hero'];

const stereo = (n) => ({L: new Float32Array(n), R: new Float32Array(n)});

export class SceneMix {
  constructor(name, duration, {tail = 0, gate = null, gateFade = 0.004} = {}) {
    this.name = name;
    this.duration = duration;
    this.n = secs(duration + tail);
    this.gate = gate; // scene-local seconds after which everything is digital silence
    this.gateFade = gateFade;
    this.stems = {};
    this.sends = {};
    for (const s of STEMS) this.stems[s] = stereo(this.n);
    this.post = null;
    this.envelope = null; // [[t, gain], ...] applied to every stem after reverb (scene fades)
  }

  stem(name) {
    if (!this.stems[name]) this.stems[name] = stereo(this.n);
    return this.stems[name];
  }

  // x: mono Float32Array or {L, R}. t: scene-local seconds.
  add(stemName, x, t, {gain = 1, pan = 0, send = null} = {}) {
    const o = Math.round(t * SR);
    const st = this.stem(stemName);
    const th = ((pan + 1) * Math.PI) / 4;
    const gl = Math.cos(th) * Math.SQRT2, gr = Math.sin(th) * Math.SQRT2;
    const L = x.L ?? x, R = x.R ?? x;
    const mono = !x.L;
    const pl = mono ? gl * Math.SQRT1_2 : Math.min(1, gl), pr = mono ? gr * Math.SQRT1_2 : Math.min(1, gr);
    addInto(st.L, L, o, gain * pl);
    addInto(st.R, R, o, gain * pr);
    if (send) {
      for (const [preset, amt] of Object.entries(send)) {
        if (!amt) continue;
        if (!this.sends[preset]) this.sends[preset] = stereo(this.n);
        addInto(this.sends[preset].L, L, o, gain * amt * pl);
        addInto(this.sends[preset].R, R, o, gain * amt * pr);
      }
    }
  }

  // Time-varying low-pass over the given stems (scene-local seconds breakpoints).
  lowpass(stemNames, cutoff, q = 0.6) {
    for (const s of stemNames) {
      const st = this.stems[s];
      if (!st) continue;
      st.L = svf(st.L, cutoff, q, 'lp');
      st.R = svf(st.R, cutoff, q, 'lp');
    }
  }

  // Gain automation over the given stems: [[t, gain], ...] (linear between points).
  automate(stemNames, pts) {
    const e = curve(this.n, pts);
    for (const s of stemNames) {
      const st = this.stems[s];
      if (st) { mul(st.L, e); mul(st.R, e); }
    }
  }

  // Tape-style slow motion over [t0, t1]: playback dives to `rate`, climbs back
  // to 1 by t1, then crossfades (equal power, `xf` s) onto the real-time signal.
  slowmo(stemNames, t0, t1, {rate = 0.55, dive = 0.3, climb = 0.35, xf = 0.2} = {}) {
    const a = secs(t0), b = secs(t1), m = Math.min(this.n, b + secs(xf)) - a;
    const sp = curve(m, [[0, 1], [dive, rate], [t1 - t0 - climb, rate], [t1 - t0, 1], [m / SR, 1]]);
    for (let i = 0; i < m; i++) sp[i] = 0.5 - 0.5 * Math.cos(Math.PI * clamp((sp[i] - rate) / (1 - rate), 0, 1));
    for (let i = 0; i < m; i++) sp[i] = rate + (1 - rate) * sp[i]; // eased rate curve
    for (const s of stemNames) {
      const st = this.stems[s];
      if (!st) continue;
      for (const x of [st.L, st.R]) {
        const src = x.slice(a, a + m);
        let p = 0;
        for (let i = 0; i < m; i++) {
          const k = p | 0, f = p - k;
          const y = src[k] + ((k + 1 < m ? src[k + 1] : src[k]) - src[k]) * f;
          const u = clamp((i - (b - a)) / Math.max(1, m - (b - a)), 0, 1);
          x[a + i] = y * Math.cos((u * Math.PI) / 2) + src[i] * Math.sin((u * Math.PI) / 2);
          p += sp[i];
        }
      }
    }
  }

  render() {
    for (const [preset, s] of Object.entries(this.sends)) {
      const wet = reverb(s.L, s.R, preset, 0);
      const st = this.stem('verb:' + preset);
      addInto(st.L, wet.L.subarray(0, this.n));
      addInto(st.R, wet.R.subarray(0, this.n));
    }
    if (this.post) this.post(this);
    if (this.envelope) {
      const e = curve(this.n, this.envelope);
      for (const st of Object.values(this.stems)) { mul(st.L, e); mul(st.R, e); }
    }
    if (this.gate != null) {
      const g = secs(this.gate), f = Math.max(1, secs(this.gateFade));
      for (const st of Object.values(this.stems)) {
        for (const x of [st.L, st.R]) {
          for (let i = Math.max(0, g - f); i < x.length; i++) {
            x[i] = i >= g ? 0 : x[i] * (0.5 + 0.5 * Math.cos((Math.PI * (i - (g - f))) / f));
          }
        }
      }
    }
    return this;
  }
}

// Which global stem a scene stem feeds.
export const busOf = (name) =>
  name.startsWith('verb') ? 'verb' : name === 'hero' ? 'sfx' : name === 'bed' ? 'music' : name;
