// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Depths: a dripping stone underworld, one soft step per tile, a dissonant stab,
// then the ancient engine wakes: a glassy harmonic drone and a Lydian shimmer,
// a grinding door and a choir, a blinding flash, cut.

import {SceneMix} from '../mixer.mjs';
import {hz, rng, range, secs, curve, osc, mul, addInto, fadeEdges, smoothNoise, biquad} from '../dsp.mjs';
import {glassBell, choir} from '../instruments.mjs';
import {wind, drip, stoneStep, stab, stoneGrind, revSwell, impact} from '../sfx.mjs';

// Glassy harmonic drone on D: slowly beating sine partials that swell and rise.
const glassDrone = (dur, {seed = 1, rise = 1.03} = {}) => {
  const r = rng(seed);
  const n = secs(dur);
  const out = new Float32Array(n);
  const bend = curve(n, [[0, 1], [dur, rise]], 'exp');
  const parts = [[1, 0.5], [2, 0.8], [3, 0.45], [4, 0.35], [6, 0.22], [9, 0.12], [12, 0.08]];
  for (const [h, a] of parts) {
    const drift = smoothNoise(n, 0.3, r);
    const fr = new Float32Array(n);
    const f = hz('D3') * h * (1 + range(r, -0.002, 0.002));
    for (let i = 0; i < n; i++) fr[i] = f * bend[i] * (1 + 0.0015 * drift[i]);
    const x = osc(n, fr, {phase: r()});
    const trem = osc(n, range(r, 0.2, 0.9), {phase: r()});
    for (let i = 0; i < n; i++) out[i] += x[i] * a * (0.75 + 0.25 * trem[i]);
  }
  mul(out, curve(n, [[0, 0], [dur * 0.55, 0.6], [dur, 1]]));
  return fadeEdges(out, 0.01, 0.01);
};

export const depths = ({cue, dur}) => {
  const m = new SceneMix('depths', dur, {gate: dur, gateFade: 0.006});
  const r = rng(500);

  // Ambience: cold air, a distant hum, water.
  m.add('amb', wind(dur, {seed: 501, lo: 160, hi: 420, gust: 0.4, rumble: 0.6}), 0, {gain: 0.2, send: {cave: 0.3}});
  const n = secs(dur);
  const hum = osc(n, hz('D1'));
  addInto(hum, osc(n, hz('A1') * 1.003), 0, 0.5);
  addInto(hum, osc(n, hz('D2') * 0.998), 0, 0.25);
  mul(hum, curve(n, [[0, 0], [1.5, 1], [dur, 1]]));
  m.add('amb', fadeEdges(hum, 0.1, 0.01), 0, {gain: 0.1});
  for (let t = 0.3; t < dur - 0.3; t += range(r, 0.5, 1.6)) {
    m.add('amb', drip({seed: Math.floor(t * 997), pitch: range(r, 0.8, 1.4)}), t,
      {gain: range(r, 0.04, 0.1), pan: range(r, -0.8, 0.8), send: {cave: 0.9}});
  }

  // One soft step per tile.
  let k = 0;
  for (let f = cue.stepsStart; f <= cue.stepsEnd + 1e-6; f += cue.stepEvery) {
    m.add('sfx', stoneStep(range(r, 0.85, 1), {seed: 510 + k}), f, {gain: 0.75, pan: k % 2 ? 0.08 : -0.08, send: {cave: 0.35}});
    k++;
  }

  m.add('sfx', stab({seed: 520, dur: 1.5}), cue.monsterSpotted, {gain: 0.4, send: {cave: 0.4}});

  // Rune hum: the ancient drone, then a shimmering Lydian arpeggio of glass bells.
  const humLen = cue.flash - cue.runeHum;
  const gd = glassDrone(humLen, {seed: 530});
  const gd2 = glassDrone(humLen, {seed: 531, rise: 1.035});
  m.add('music', {L: gd, R: gd2}, cue.runeHum, {gain: 0.13, send: {cave: 0.5}});
  const lyd = ['D5', 'A5', 'E6', 'F#5', 'C#6', 'G#5', 'B5', 'E5', 'A5', 'F#6', 'D6', 'G#6'];
  let j = 0;
  for (let t = cue.runeHum; t < cue.flash - 0.4; t += 0.135) {
    const u = (t - cue.runeHum) / humLen;
    const b = glassBell(hz(lyd[j % lyd.length]), 1.6, {seed: 540 + j, len: 1.4});
    m.add('music', b, t, {gain: (0.07 + 0.08 * u) * (j % 3 === 0 ? 1 : 0.7), pan: j % 2 ? 0.5 : -0.5, send: {cave: 0.7}});
    j++;
  }
  // A clear chime marks the hum's onset.
  m.add('music', glassBell(hz('D6'), 3, {seed: 560, len: 2.5}), cue.runeHum, {gain: 0.22, send: {cave: 0.6}});

  // The rune door: grinding stone and a rising choir.
  m.add('sfx', stoneGrind(2.4, {seed: 570}), cue.runeDoorOpen, {gain: 0.3, send: {cave: 0.4}});
  const thud = impact({seed: 571, size: 0.3, bright: 0.2});
  biquad(thud, 'lp', 400, 0.7);
  m.add('sfx', thud, cue.runeDoorOpen, {gain: 0.35, send: {cave: 0.3}});
  const cd = cue.flash - cue.runeDoorOpen + 0.2;
  const cn = secs(cd);
  const ch = choir([hz('D3'), hz('A3'), hz('E4'), hz('F#4'), hz('C#5')], cd,
    {vowel: 'a', seed: 572, env: curve(cn, [[0, 0], [0.3, 0.3], [cd - 0.1, 1], [cd, 0.9]], 'lin')});
  m.add('music', ch, cue.runeDoorOpen, {gain: 0.2, send: {cave: 0.5}});

  // Flash: a bright reversed swell into an impact, then the cut at scene end.
  m.add('sfx', revSwell(1.3, {seed: 580, gap: 0.05, bright: 1.2, tone: hz('D6')}), cue.flash - 1.3, {gain: 0.25, send: {cave: 0.3}});
  m.add('sfx', impact({seed: 581, size: 0.9, bright: 1}), cue.flash, {gain: 0.6, send: {cave: 0.5}});

  m.envelope = [[0, 0], [cue.fadeInEnd, 1], [dur, 1]];
  return m;
};
