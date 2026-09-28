// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Letter: a quiet candlelit room. Match, quill, a low cello, a gust, then silence.

import {SceneMix} from '../mixer.mjs';
import {hz} from '../dsp.mjs';
import {cello, pluck} from '../instruments.mjs';
import {roomTone, crackle, matchStrike, quill, flourish, whoosh, flameFlutter, clink} from '../sfx.mjs';

export const letter = ({cue, dur}) => {
  const m = new SceneMix('letter', dur);
  const end = cue.fadeOutEnd;

  m.add('amb', roomTone(end, {seed: 11}), 0, {gain: 0.07});
  // The candle burns from the moment the match flares until the gust.
  m.add('amb', crackle(end - cue.candleLight - 0.3, {density: 2.5, seed: 12, hiss: 0.03, pops: 0.1}), cue.candleLight + 0.3,
    {gain: 0.36, pan: -0.15, send: {room: 0.3}});

  // Match: scrape leads, the flare lands on the cue.
  m.add('sfx', matchStrike({seed: 13}), cue.candleLight - 0.15, {gain: 0.5, pan: -0.1, send: {room: 0.4}});

  // Quill: rhythmic scratching while the letter writes itself, then the signature.
  m.add('sfx', quill(cue.writingEnd - cue.writingStart, {seed: 14}), cue.writingStart, {gain: 0.16, pan: 0.1, send: {room: 0.25}});
  m.add('sfx', flourish(0.8, {seed: 15}), cue.signatureDone - 0.82, {gain: 0.2, pan: 0.12, send: {room: 0.25}});
  m.add('sfx', clink(0.15, {seed: 16, f: 3100, len: 0.2}), cue.signatureDone, {gain: 0.5, pan: 0.12, send: {room: 0.3}});
  // The name is signed: a single low harp-like chord, felt more than heard.
  ['D3', 'A3', 'D4', 'F4'].forEach((nm, k) => m.add('music', pluck(hz(nm), 4, {t60: 3.5, bright: 0.35, seed: 30 + k, vel: 0.8}),
    cue.signatureDone + k * 0.035, {gain: 0.75, pan: -0.2 + k * 0.15, send: {hall: 0.6}}));

  // A low, warm cello: drone on D with a slow line above it.
  const d = hz('D2'), a = hz('A2'), bb = hz('Bb2'), g = hz('G2');
  const drone = cello([[2.8, d, cue.candleGust + 2.2 - 2.8, 0.9]], end, {seed: 17});
  m.add('music', drone, 0, {gain: 0.18, pan: -0.2, send: {hall: 0.35}});
  const line = cello([
    [5.5, a, 4.4, 0.7], [9.6, bb, 3.2, 0.75], [12.6, a, 2.6, 0.7], [15.0, g, 3.4, 0.6],
  ], end, {seed: 18});
  m.add('music', line, 0, {gain: 0.13, pan: 0.25, send: {hall: 0.45}});

  // The gust: air rushes in, the flame gutters.
  m.add('sfx', whoosh(2.2, {f0: 250, f1: 1300, f2: 300, peak: 0.16, q: 0.7, seed: 19}), cue.candleGust - 0.12,
    {gain: 0.5, pan: 0.35, send: {room: 0.3}});
  m.add('sfx', flameFlutter(1.8, {seed: 20}), cue.candleGust, {gain: 0.5, pan: -0.15});

  // Everything settles into silence before the cut.
  m.envelope = [[0, 1], [cue.candleGust + 0.5, 1], [end - 0.05, 0], [dur, 0]];
  m.gate = Math.min(dur, end + 0.2);
  return m;
};
