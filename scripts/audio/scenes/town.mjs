// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Town: an original fingerpicked guitar theme in D minor (3/4, eighth-note
// arpeggios under a slow top line), double-tracked. Fire, a creaking sign, the
// location sting, and the church rumbling underneath at the end.

import {SceneMix} from '../mixer.mjs';
import {hz, rng, range, cents, addInto, secs, chorus, biquad} from '../dsp.mjs';
import {pluck, guitarBody} from '../instruments.mjs';
import {wind, crackle, creak, revSwell, impact, rumble, subDrop} from '../sfx.mjs';

const BEAT = 60 / 84;

// Each bar: six eighth-note arpeggio pitches (first is the bass).
const BARS = [
  ['D3', 'A3', 'D4', 'F4', 'D4', 'A3'], // Dm
  ['C3', 'A3', 'D4', 'F4', 'D4', 'A3'], // Dm/C
  ['Bb2', 'F3', 'A3', 'D4', 'A3', 'F3'], // Bbmaj7
  ['A2', 'E3', 'G3', 'D4', 'C#4', 'G3'], // A7sus4 -> A7
  ['D3', 'A3', 'D4', 'F4', 'D4', 'A3'], // Dm
];
// Top line: [bar, beat, note, beats].
const MELODY = [
  [0, 0, 'A4', 1.5], [0, 1.5, 'Bb4', 0.5], [0, 2, 'A4', 1],
  [1, 0, 'G4', 2], [1, 2, 'F4', 1],
  [2, 0, 'F4', 1.5], [2, 1.5, 'E4', 0.5], [2, 2, 'D4', 1],
  [3, 0, 'E4', 2], [3, 2, 'C#4', 1],
  [4, 0, 'D5', 1], [4, 1, 'C5', 1], [4, 2, 'A4', 1],
];
// The last chord: bII (Eb) over the dread of the church.
const LAST = ['Eb3', 'Bb3', 'Eb4', 'G4'];

// Performance clock (beats -> seconds from the top): steady for four bars, then
// a ritardando through the last bar and a held breath before the final chord.
const RIT = 12;
const at = (beats) => {
  if (beats <= RIT) return beats * BEAT;
  const u = Math.min(beats, 15) - RIT;
  return BEAT * (RIT - Math.log(1 - 0.06 * u) / 0.06 + Math.max(0, beats - 15)) + (beats >= 15 ? 0.1 : 0);
};
// Phrase dynamics per bar: lean into the Bbmaj7 / A7, ease off on the return home.
const SHAPE = [0.92, 0.97, 1.02, 1.04, 0.93];

// One performance of the part. Two takes with different seeds = double tracking.
// Arpeggio notes ring until the chord changes (a repeated pitch damps its string),
// velocities and timing drift a little like hands do.
const take = (start, total, seed, detune, bright) => {
  const r = rng(seed);
  const out = new Float32Array(secs(total));
  const hum = () => range(r, -0.009, 0.009);
  const play = (nm, t, d, vel, br = bright) => {
    const f = hz(nm) * cents(detune + range(r, -2, 2));
    const v = Math.min(1, vel * range(r, 0.9, 1.08));
    const x = pluck(f, d + 0.12, {t60: 3.2, bright: br * (0.9 + 0.2 * v), seed: Math.floor(r() * 1e6), vel: v,
      pickPos: range(r, 0.12, 0.22), release: 0.09});
    addInto(out, x, secs(t + hum()), v);
  };
  BARS.forEach((bar, b) => {
    const barEnd = start + at((b + 1) * 3);
    bar.forEach((nm, k) => {
      const t = start + at(b * 3 + k / 2);
      const again = bar.indexOf(nm, k + 1);
      const end = again > 0 ? start + at(b * 3 + again / 2) + 0.015 : barEnd + (k === 0 ? 0.08 : 0.15);
      const vel = (k === 0 ? 0.95 : k === 3 ? 0.62 : k === 2 ? 0.54 : 0.48) * SHAPE[b];
      play(nm, t, end - t, vel, k === 0 ? bright * 0.8 : bright);
    });
  });
  for (const [b, beat, nm, len] of MELODY) {
    const t = start + at(b * 3 + beat) + 0.012;
    play(nm, t, start + at(b * 3 + beat + len) - t + 0.35, (beat === 0 ? 0.8 : 0.72) * SHAPE[b], Math.min(1, bright + 0.15));
  }
  // Slow roll of the final chord, left to ring.
  const tl = start + at(BARS.length * 3);
  LAST.forEach((nm, k) => play(nm, tl + k * 0.075, 3.5, k === 0 ? 0.85 : 0.58));
  play('G4', tl + 0.34, 3.2, 0.52, Math.min(1, bright + 0.15));
  return guitarBody(out);
};

export const town = ({cue, dur}) => {
  const m = new SceneMix('town', dur);

  m.add('amb', wind(dur, {seed: 301, lo: 260, hi: 700, gust: 0.5, rumble: 0.1}), 0, {gain: 0.12});
  m.add('amb', crackle(dur, {density: 9, seed: 302, pops: 0.2, hiss: 0.05}), 0, {gain: 0.42, pan: -0.35, send: {air: 0.3}});

  // Location title: reversed swell sucking into a deep, soft impact on the cue.
  m.add('sfx', revSwell(0.9, {seed: 303, gap: 0.07, bright: 0.5, tone: hz('D4')}), cue.locationTitle - 0.9, {gain: 0.1, send: {hall: 0.5}});
  const hit = impact({seed: 304, size: 0.7, bright: 0.25});
  biquad(hit, 'lp', 900, 0.7);
  m.add('sfx', hit, cue.locationTitle, {gain: 0.4, send: {hall: 0.5}});

  // Guitar theme enters in the sting's tail.
  const start = cue.locationTitle + 0.45;
  const A = chorus(take(start, dur, 310, 3, 0.55), {delay: 0.008, depth: 0.0015, rate: 0.5, seed: 311});
  const B = chorus(take(start, dur, 320, -3, 0.45), {delay: 0.011, depth: 0.0018, rate: 0.4, seed: 321});
  m.add('music', A, 0, {gain: 1.12, pan: -0.4, send: {hall: 0.3}});
  m.add('music', B, 0, {gain: 1.0, pan: 0.4, send: {hall: 0.3}});

  // The inn sign swings on rusted hooks.
  m.add('sfx', creak(1.1, {f0: 640, seed: 330, rate: [18, 40], squeal: 0.4}), cue.signCreak, {gain: 1.1, pan: 0.5, send: {air: 0.4}});
  m.add('sfx', creak(0.8, {f0: 610, seed: 331, rate: [14, 30], squeal: 0.3}), cue.signCreak + 1.6, {gain: 0.5, pan: 0.5, send: {air: 0.4}});

  // Something stirs beneath the church.
  m.add('sfx', rumble(dur - cue.churchRumble, {seed: 340, cutoff: 85}), cue.churchRumble, {gain: 0.4, send: {hall: 0.2}});
  m.add('sfx', subDrop(2.2, {f0: 60, f1: 32}), cue.churchRumble, {gain: 0.4});

  m.envelope = [[0, 0], [cue.fadeInEnd, 1], [cue.fadeOutStart, 1], [dur - 0.03, 0], [dur, 0]];
  return m;
};
