// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Road: wind over open land at dusk, crows, footsteps on gravel, a lonely low
// flute and, far off, the church bell.

import {SceneMix} from '../mixer.mjs';
import {hz, rng, range, biquad} from '../dsp.mjs';
import {flute, strings, churchBell} from '../instruments.mjs';
import {wind, crow, gravelStep} from '../sfx.mjs';

export const road = ({cue, dur}) => {
  const m = new SceneMix('road', dur);
  const r = rng(200);

  m.add('amb', wind(dur, {seed: 201, lo: 280, hi: 850, gust: 0.6, rumble: 0.5}), 0, {gain: 0.34});
  m.add('amb', wind(dur, {seed: 202, lo: 1800, hi: 4200, gust: 0.8, rumble: 0}), 0, {gain: 0.05});

  // Crows: the first right on the cue, then answers further off.
  m.add('sfx', crow({seed: 203, count: 3}), cue.crowCaw, {gain: 0.2, pan: -0.45, send: {air: 0.8}});
  m.add('sfx', crow({seed: 204, count: 2, pitch: 1.08}), cue.crowCaw + 4.6, {gain: 0.08, pan: 0.55, send: {air: 1.0}});
  m.add('sfx', crow({seed: 205, count: 1, pitch: 0.95}), cue.crowCaw + 7.9, {gain: 0.05, pan: -0.7, send: {air: 1.0}});

  // Unhurried footsteps on gravel.
  let side = 1;
  for (let t = cue.fadeInEnd * 0.6; t < cue.fadeOutStart + 0.5; t += range(r, 0.56, 0.62)) {
    m.add('sfx', gravelStep(range(r, 0.75, 1), {seed: Math.floor(t * 1000)}), t, {gain: 0.13, pan: 0.08 * side, send: {air: 0.08}});
    side = -side;
  }

  // A sparse lonely melody, leaving the bell room to answer.
  const mel = [['A3', 2.0, 1.2], ['D4', 3.45, 0.9], ['F4', 4.5, 1.8], ['E4', 6.55, 0.7], ['D4', 7.35, 0.7],
    ['C4', 8.15, 0.8], ['A3', 9.05, 0.7], ['D4', 11.0, 1.1]];
  mel.forEach(([nm, t, d], k) => {
    const vel = k === mel.length - 1 ? 0.6 : 0.85 + 0.15 * Math.sin(k);
    m.add('music', flute(hz(nm), d, {seed: 210 + k, vel}), t, {gain: 0.24, pan: 0.15, send: {hall: 0.5, air: 0.3}});
  });
  // Dusk pad under it.
  m.add('music', strings([hz('D2'), hz('A2'), hz('F3')], dur, {seed: 220, attack: 2.5, release: 1.5, cutoff: 650}), 0,
    {gain: 0.14, send: {hall: 0.3}});

  // Distant church bell: low-passed and drowned in the open air.
  const b = churchBell(hz('D3'), 7, {seed: 230, len: 5, strike: 0.2});
  biquad(b, 'lp', 1400, 0.7);
  m.add('sfx', b, cue.distantBell, {gain: 0.5, pan: 0.3, send: {air: 1.3}});

  m.envelope = [[0, 0], [cue.fadeInEnd, 1], [cue.fadeOutStart, 1], [dur - 0.03, 0], [dur, 0]];
  return m;
};
