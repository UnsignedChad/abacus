// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Cathedral: organ and a dark choir under a vast stone nave. The Skeleton King
// wakes and roars, war drums build while the two circle, the parry rings out
// into a slowed, muffled cavern, the riposte, the crown falls and rolls, phase
// two swells, and then everything stops dead.

import {SceneMix} from '../mixer.mjs';
import {hz, rng, range, secs, curve, osc, mul, addInto, fadeEdges, biquad} from '../dsp.mjs';
import {organ, choir, taiko, heartbeat} from '../instruments.mjs';
import {
  whoosh, subDrop, impact, boneCreak, boneRattle, roar, stoneStep, armorClank, bladeDrag,
  clothTumble, riser, glint, clang, crunch, clink, revSwell, swordDraw,
} from '../sfx.mjs';

export const cathedral = ({cue, dur}) => {
  const m = new SceneMix('cathedral', dur, {gate: cue.cutToBlack, gateFade: 0.004});
  const r = rng(600);
  const T = cue.cutToBlack;

  // Organ drone and dark choir from the first frame.
  m.add('bed', organ([hz('D2'), hz('A2'), hz('D3')], T + 0.5, {seed: 601, attack: 3, release: 1}), 0,
    {gain: 0.2, send: {cathedral: 0.45}});
  m.add('bed', organ([hz('D1')], T + 0.5, {seed: 602, attack: 5, release: 1, trem: 0.02}), 0, {gain: 0.16});
  const cd = T + 0.5, cn = secs(cd);
  const padEnv = curve(cn, [[0, 0], [4, 0.6], [cue.phase2, 0.75], [T, 0.8]]);
  m.add('bed', choir([hz('D3'), hz('F3'), hz('A3')], cd, {vowel: 'o', seed: 603, env: padEnv}), 0,
    {gain: 0.3, send: {cathedral: 0.5}});

  // The eyes ignite: a fiery whoosh and a low boom.
  m.add('sfx', whoosh(1.4, {f0: 500, f1: 2600, f2: 700, peak: 0.08, q: 0.8, seed: 610, noise: 'white'}), cue.eyesIgnite - 0.03,
    {gain: 0.4, send: {cathedral: 0.4}});
  m.add('sfx', subDrop(2.2, {f0: 66, f1: 36}), cue.eyesIgnite, {gain: 0.7});
  const boom = impact({seed: 611, size: 0.6, bright: 0.2});
  biquad(boom, 'lp', 500, 0.7);
  m.add('sfx', boom, cue.eyesIgnite, {gain: 0.5, send: {cathedral: 0.5}});

  // The king rises: clatter, creaking bone.
  m.add('sfx', boneRattle(1.8, {seed: 620, density: 55, shape: (u) => Math.max(0.2, 1 - u) }), cue.kingRises, {gain: 0.4, pan: 0.1, send: {cathedral: 0.35}});
  m.add('sfx', boneCreak(1.5, {seed: 621}), cue.kingRises + 0.05, {gain: 0.3, pan: -0.1, send: {cathedral: 0.35}});
  m.add('sfx', boneCreak(1.1, {seed: 622}), cue.kingRises + 1.0, {gain: 0.22, pan: 0.2, send: {cathedral: 0.35}});

  // Roar.
  m.add('sfx', roar(2.6, {seed: 630, pitch: 1}), cue.roar, {gain: 0.85, send: {cathedral: 0.55}});
  m.add('sfx', subDrop(2.4, {f0: 52, f1: 36, attack: 0.05}), cue.roar, {gain: 0.45});

  // Circling: war drums build to the windup, steps and armor, a blade dragged on stone.
  const drums = [
    [0, 0.55], [1.5, 0.35], [2.25, 0.38], [(cue.roll - cue.circleStart), 0.72], [4.5, 0.45], [4.875, 0.4],
    [5.75, 0.55], [6.125, 0.5], [6.5, 0.62], [6.6875, 0.5], [6.875, 0.66], [7.0, 0.55], [7.0625, 0.5],
  ];
  for (const [o, v] of drums) {
    const t = cue.circleStart + o;
    if (t >= cue.parry - 0.25) continue;
    m.add('music', taiko(v, {seed: 640 + Math.floor(o * 16), pitch: range(r, 0.97, 1.03)}), t,
      {gain: 0.75, pan: range(r, -0.2, 0.2), send: {cathedral: 0.35}});
  }
  for (let t = cue.circleStart + 0.75; t < cue.windup; t += 1.5) {
    m.add('music', taiko(0.3, {seed: 660 + Math.floor(t * 10), pitch: 1.7, len: 0.5}), t, {gain: 0.5, pan: 0.35, send: {cathedral: 0.3}});
  }
  let side = 1;
  for (let t = cue.circleStart + 0.2; t < cue.windup - 0.3; t += range(r, 0.62, 0.74)) {
    if (Math.abs(t - cue.roll) < 0.6) continue;
    m.add('sfx', stoneStep(0.8, {seed: 670 + Math.floor(t * 10)}), t, {gain: 0.28, pan: 0.3 * side, send: {cathedral: 0.25}});
    m.add('sfx', armorClank(range(r, 0.3, 0.5), {seed: 680 + Math.floor(t * 10)}), t + 0.01, {gain: 0.28, pan: 0.3 * side, send: {cathedral: 0.3}});
    side = -side;
  }
  const drag = bladeDrag(2.6, {seed: 690});
  m.add('sfx', drag, cue.circleStart + 0.3, {gain: 0.2, pan: 0.45, send: {cathedral: 0.4}});

  // First swing, and the knight rolls under it.
  m.add('sfx', whoosh(0.4, {f0: 140, f1: 900, f2: 220, peak: 0.15, q: 0.7, seed: 700}), cue.swing1 - 0.02,
    {gain: 0.55, pan: -0.2, send: {cathedral: 0.3}});
  const whum = osc(secs(0.35), curve(secs(0.35), [[0, 70], [0.08, 110], [0.35, 60]], 'exp'));
  mul(whum, curve(whum.length, [[0, 0], [0.06, 1], [0.16, 0.2], [0.35, 0]]));
  m.add('sfx', fadeEdges(whum), cue.swing1 - 0.02, {gain: 0.35});
  // The knight hits the flagstones and tumbles.
  m.add('sfx', armorClank(1, {seed: 711}), cue.roll, {gain: 0.9, pan: 0.25, send: {cathedral: 0.35}});
  m.add('sfx', stoneStep(1, {seed: 712}), cue.roll, {gain: 1.1, pan: 0.25, send: {cathedral: 0.3}});
  m.add('sfx', clothTumble(0.7, {seed: 710}), cue.roll + 0.02, {gain: 0.4, pan: 0.25, send: {cathedral: 0.3}});

  // The windup: a heavy accent, a riser that stops just short of the parry, a glint.
  m.add('music', taiko(0.9, {seed: 720, pitch: 0.8, len: 1.4}), cue.windup, {gain: 0.8, send: {cathedral: 0.4}});
  m.add('sfx', boneCreak(0.9, {seed: 721}), cue.windup, {gain: 0.25, send: {cathedral: 0.3}});
  m.add('sfx', riser(cue.parry - cue.windup, {seed: 722, gap: 0.07}), cue.windup, {gain: 0.4, send: {cathedral: 0.3}});
  m.add('sfx', glint({seed: 723, dur: 1.4, base: 6000}), cue.windupGlint, {gain: 0.35, pan: -0.25, send: {cathedral: 0.4}});

  // THE PARRY. Dry, wide and huge on the hero stem. A beat of near silence
  // before it (the riser already stops short), then everything else dives in
  // pitch, sinks under water and slowly surfaces again at slowmoEnd.
  m.add('hero', clang({seed: 730, base: 405, len: 4.2}), cue.parry, {gain: 1.35, send: {abyss: 0.5, cathedral: 0.2}});
  m.add('hero', impact({seed: 731, size: 0.8, bright: 0.5}), cue.parry, {gain: 0.4});
  const slow = cue.slowmoEnd - cue.parry;
  const dn = secs(slow + 0.8);
  const dr = osc(dn, hz('D1'));
  addInto(dr, osc(dn, hz('A1') * 0.999), 0, 0.4);
  addInto(dr, osc(dn, hz('D2') * 1.001), 0, 0.15);
  mul(dr, curve(dn, [[0, 0], [0.4, 1], [slow, 0.9], [slow + 0.8, 0]]));
  m.add('hero', fadeEdges(dr, 0.05, 0.05), cue.parry, {gain: 0.3, send: {abyss: 0.2}});
  m.add('hero', heartbeat(1, {seed: 732, gap: 0.24}), cue.parry + slow * 0.5, {gain: 0.9, send: {abyss: 0.3}});
  m.add('hero', revSwell(0.7, {seed: 733, gap: 0.0, bright: 0.6}), cue.slowmoEnd - 0.7, {gain: 0.22});
  const P = cue.parry, E = cue.slowmoEnd;
  m.post = (mx) => {
    const under = ['bed', 'music', 'amb', 'sfx', 'verb:cathedral'];
    mx.slowmo(under, P, E, {rate: 0.55, dive: 0.35, climb: 0.4, xf: 0.2});
    const cut = curve(mx.n, [[0, 18000], [P - 0.01, 18000], [P + 0.12, 380], [E - 0.1, 320], [E + 0.25, 18000], [dur, 18000]], 'exp');
    mx.lowpass(under, cut, 0.9);
    // The suck-out: the bed and the room drop away in the riser's gap.
    const duck = (t0) => [[0, 1], [t0, 1], [P - 0.06, 0.12], [P, 0.12], [P + 0.4, 0.6], [E, 0.6], [E + 0.3, 1], [dur, 1]];
    mx.automate(['music', 'amb', 'verb:cathedral'], duck(P - 0.3));
    mx.automate(['sfx'], duck(P - 0.075));
    // The bed breathes with the fight: room for the drums, a hush for the crown, then the swell.
    mx.automate(['bed'], [
      [0, 1], [cue.circleStart, 1], [cue.circleStart + 1, 0.85], [P - 0.3, 0.85], [P - 0.06, 0.1], [P, 0.1], [P + 0.4, 0.55],
      [E, 0.55], [E + 0.4, 0.8], [cue.crownFall, 0.7], [cue.crownRest, 0.55], [cue.phase2, 0.6], [T, 1], [dur, 1],
    ]);
  };

  // Riposte, stagger.
  const thrust = impact({seed: 740, size: 0.4, bright: 0.6});
  m.add('sfx', thrust, cue.riposte, {gain: 0.7, send: {cathedral: 0.4}});
  m.add('sfx', crunch({seed: 741}), cue.riposte + 0.01, {gain: 0.55, send: {cathedral: 0.3}});
  m.add('sfx', swordDraw({seed: 742, dur: 0.2}), cue.riposte - 0.05, {gain: 0.2, send: {cathedral: 0.3}});
  m.add('sfx', boneRattle(1.0, {seed: 750, density: 70, shape: (u) => Math.max(0.15, 1 - u)}), cue.stagger, {gain: 0.5, send: {cathedral: 0.35}});
  m.add('sfx', armorClank(0.8, {seed: 753}), cue.stagger, {gain: 0.4, send: {cathedral: 0.35}});
  m.add('sfx', stoneStep(1, {seed: 751}), cue.stagger + 0.35, {gain: 0.4, send: {cathedral: 0.3}});
  m.add('sfx', stoneStep(0.8, {seed: 752}), cue.stagger + 0.7, {gain: 0.35, send: {cathedral: 0.3}});

  // The crown: knocked loose, bouncing, rolling to rest.
  m.add('sfx', clink(1, {seed: 760, f: 1480, len: 1.6}), cue.crownFall, {gain: 0.35, pan: 0.15, send: {cathedral: 0.5}});
  cue.crownBounces.forEach((t, k) => {
    const v = [1, 0.62, 0.42][k] ?? 0.3;
    m.add('sfx', clink(v, {seed: 770 + k, f: 1720 + k * 40, len: 0.5}), t, {gain: 0.6, pan: 0.2 - k * 0.1, send: {cathedral: 0.5}});
  });
  const r0 = cue.crownBounces[cue.crownBounces.length - 1] + 0.06, r1 = cue.crownRest;
  for (let t = r0, k = 0; t < r1 - 0.08; k++) {
    const u = (t - r0) / (r1 - r0);
    m.add('sfx', clink(0.16 * (1 - 0.8 * u), {seed: 780 + k, f: 2200 + 300 * Math.sin(k), len: 0.12}), t,
      {gain: 0.45, pan: -0.1, send: {cathedral: 0.4}});
    t += 0.09 * (1 - u) + 0.025;
  }
  // It settles flat with a last small clack.
  m.add('sfx', clink(0.5, {seed: 799, f: 1900, len: 0.5}), cue.crownRest, {gain: 0.55, pan: -0.1, send: {cathedral: 0.5}});
  m.add('sfx', armorClank(0.4, {seed: 798}), cue.crownRest, {gain: 0.5, pan: -0.1, send: {cathedral: 0.4}});

  // Phase two: a sub swell, the choir crescendo, the second roar. Then the cut.
  const p2 = T - cue.phase2 + 0.3, pn = secs(p2);
  const sw = osc(pn, curve(pn, [[0, hz('D1')], [p2, hz('D1') * 1.12]], 'exp'));
  addInto(sw, osc(pn, hz('D2')), 0, 0.3);
  mul(sw, curve(pn, [[0, 0.15], [p2, 1]], 'exp'));
  m.add('music', fadeEdges(sw, 0.004, 0.01), cue.phase2, {gain: 0.22});
  m.add('music', choir([hz('D3'), hz('A3'), hz('D4'), hz('F4'), hz('Bb4')], p2,
    {vowel: 'a', seed: 800, env: curve(pn, [[0, 0.25], [p2, 1]], 'exp'), voices: 3}), cue.phase2, {gain: 0.42, send: {cathedral: 0.35}});
  m.add('music', organ([hz('Bb1'), hz('F2'), hz('Bb2')], p2, {seed: 801, attack: 1.2, release: 0.2}), cue.phase2,
    {gain: 0.17, send: {cathedral: 0.3}});
  m.add('sfx', roar(2.4, {seed: 810, pitch: 0.82}), cue.phase2, {gain: 0.65, send: {cathedral: 0.5}});
  m.add('music', taiko(1, {seed: 811, pitch: 0.75, len: 1.6}), cue.phase2, {gain: 0.75, send: {cathedral: 0.4}});
  for (let t = cue.phase2 + 0.75; t < T - 0.05; t += 0.375) {
    m.add('music', taiko(0.5 + 0.3 * ((t - cue.phase2) / 2), {seed: 820 + Math.floor(t * 8), pitch: 0.95, len: 0.9}), t,
      {gain: 0.42, send: {cathedral: 0.35}});
  }

  m.envelope = [[0, 0], [cue.fadeInEnd, 1], [dur, 1]];
  return m;
};
