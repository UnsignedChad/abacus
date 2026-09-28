// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Title: a massive impact and choir chord, a solemn statement of the theme in
// low strings over the organ, the final bell, and silence.

import {SceneMix} from '../mixer.mjs';
import {hz, secs, curve} from '../dsp.mjs';
import {choir, organ, strings, cello, churchBell} from '../instruments.mjs';
import {impact, subDrop, revSwell} from '../sfx.mjs';

export const title = ({cue, dur}) => {
  const m = new SceneMix('title', dur, {gate: cue.fadeOutEnd + 0.02});
  const B = cue.titleBoom;

  m.add('sfx', revSwell(0.6, {seed: 900, gap: 0.05, bright: 0.8}), B - 0.6, {gain: 0.18, send: {cathedral: 0.3}});
  m.add('sfx', impact({seed: 901, size: 1.6, bright: 0.9}), B, {gain: 1.0, send: {cathedral: 0.6}});
  m.add('sfx', subDrop(4, {f0: 64, f1: 32}), B, {gain: 0.8});
  const cd = 8, cn = secs(cd);
  m.add('music', choir([hz('D2'), hz('D3'), hz('A3'), hz('D4'), hz('F4'), hz('A4')], cd,
    {vowel: 'a', seed: 902, env: curve(cn, [[0, 0], [0.08, 0.9], [0.8, 0.75], [4.5, 0.55], [cd, 0]])}), B,
    {gain: 0.26, send: {cathedral: 0.5}});

  // Solemn theme: the town's top line, slowed, in the low strings.
  const t0 = B + 2.2;
  const line = [['A3', 0, 1.3], ['Bb3', 1.25, 0.7], ['A3', 1.9, 1.0], ['G3', 2.85, 1.4], ['F3', 4.2, 0.8], ['E3', 4.95, 0.8], ['D3', 5.7, 1.5]];
  m.add('music', cello(line.map(([nm, t, d]) => [t0 + t, hz(nm), d + 0.15, 0.9]), dur, {seed: 910}), 0,
    {gain: 0.3, pan: -0.1, send: {cathedral: 0.45}});
  const chords = [[0, ['D2', 'A2', 'F3']], [2.85, ['Bb1', 'F2', 'D3']], [4.95, ['A1', 'E2', 'C#3']], [5.7, ['D2', 'A2', 'F3']]];
  chords.forEach(([t, ns], k) => {
    // The last chord releases just before the bell, which tolls into the open nave.
    const d = (chords[k + 1]?.[0] ?? 6.73) - t + 0.6;
    m.add('music', strings(ns.map(hz), d, {seed: 920 + k, attack: 0.7, release: 0.8, cutoff: 900}), t0 + t,
      {gain: 0.2, send: {cathedral: 0.4}});
  });
  // The organ breathes out as the bell strikes (its partials would mask the toll).
  m.add('music', organ([hz('D2'), hz('A2')], cue.finalBell - B - 1 + 0.5, {seed: 930, attack: 2.5, release: 1.8}), B + 1,
    {gain: 0.13, send: {cathedral: 0.4}});

  m.add('sfx', churchBell(hz('D3'), 5, {seed: 940, len: 6, strike: 0.7}), cue.finalBell, {gain: 0.85, send: {cathedral: 0.55}});

  m.envelope = [[0, 1], [cue.fadeOutStart, 1], [cue.fadeOutEnd, 0], [dur, 0]];
  return m;
};
