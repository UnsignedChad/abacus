// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Steel: the traveler steels themself. Heartbeats on every cue, a rising string
// cluster, breath, the sword drawn and a glint, then absolute silence.

import {SceneMix} from '../mixer.mjs';
import {hz, secs, curve, osc, mul, fadeEdges} from '../dsp.mjs';
import {strings, heartbeat} from '../instruments.mjs';
import {breath, swordDraw, glint} from '../sfx.mjs';

export const steel = ({cue, dur}) => {
  const m = new SceneMix('steel', dur, {gate: cue.cutToBlack, gateFade: 0.003});
  const T = cue.cutToBlack;

  cue.heartbeats.forEach((t, k) => {
    const vel = 0.65 + (0.35 * k) / (cue.heartbeats.length - 1);
    m.add('sfx', heartbeat(vel, {seed: 400 + k, gap: 0.19 - k * 0.008}), t, {gain: 0.85, send: {room: 0.25}});
  });

  // Rising tension: a string cluster that tightens and climbs a semitone.
  const n = secs(T + 0.5);
  const bend = curve(n, [[0, 1], [1.5, 1], [T, 1.059]], 'exp');
  const env = curve(n, [[0, 0], [1.2, 0.25], [4, 0.5], [T, 1]], 'lin');
  const cl = strings([hz('D3'), hz('Eb3'), hz('A3'), hz('Ab4')], T + 0.5,
    {seed: 410, env, bend, cutoff: curve(n, [[0, 500], [T, 3200]], 'exp'), voices: 3, vib: 0.006});
  m.add('music', cl, 0, {gain: 0.34, send: {hall: 0.4}});
  const low = strings([hz('D2'), hz('D1') * 2], T + 0.5, {seed: 411, env, cutoff: 300});
  m.add('music', low, 0, {gain: 0.22});
  const sub = osc(n, hz('D1'));
  mul(sub, curve(n, [[0, 0], [2, 0.2], [T, 0.8]]));
  m.add('music', fadeEdges(sub, 0.5, 0.01), 0, {gain: 0.18});

  // Breathing: calm, then a deep steadying inhale before the draw.
  m.add('sfx', breath(1.1, {seed: 420, inhale: true}), 0.15, {gain: 0.1, send: {room: 0.3}});
  m.add('sfx', breath(1.3, {seed: 421, inhale: false, shaky: 0.4}), 1.9, {gain: 0.09, send: {room: 0.3}});
  m.add('sfx', breath(0.8, {seed: 422, inhale: true}), cue.swordDraw - 0.85, {gain: 0.14, send: {room: 0.3}});
  m.add('sfx', breath(1.4, {seed: 423, inhale: false}), cue.bladeGlint + 0.9, {gain: 0.09, send: {room: 0.3}});

  // Steel leaves the scabbard; the blade catches the light.
  m.add('sfx', swordDraw({seed: 430, dur: cue.bladeGlint - cue.swordDraw}), cue.swordDraw, {gain: 0.4, pan: 0.2, send: {hall: 0.35}});
  m.add('sfx', glint({seed: 431, dur: 1.8, base: 5600}), cue.bladeGlint, {gain: 0.8, pan: 0.3, send: {hall: 0.5}});

  return m;
};
