// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Direction: the camera, light cues and grading for the main shot, all keyed
// to the cue sheet in real frames (the world itself moves in action time).

import {Cam, camTrack, E, mixCam, proj, punchIn} from './camera';
import {Duel} from './choreo';
import {EnvState} from './env';
import {FigureLight} from './Figures';
import {parryPoint, ripostePoint} from './fx';
import {Candelabrum, THRONE} from './world';
import {C, T} from './time';
import {clamp01, nz, rnd} from './util';
import {ramp} from './rig';

const base = camTrack([
  // Establishing: descend from the vaults and push toward the throne.
  {t: 0, x: 420, y: -330, hz: 770, zoom: 0.72, dolly: 0},
  {t: 116, x: 870, y: -300, hz: 492, zoom: 0.9, dolly: 0.05, e: E.sine},
  // The eyes ignite: lean in toward him.
  {t: 150, x: 1080, y: -300, hz: 505, zoom: 0.98, dolly: 0.07, e: E.inOut},
  // The rise and the roar, from a little lower.
  {t: 176, x: 1130, y: -250, hz: 525, zoom: 1.0, dolly: 0.08},
  {t: 212, x: 1080, y: -250, hz: 520, zoom: 1.0, dolly: 0.08},
  // Circling: truck with the pair as he comes down to meet the knight.
  {t: 262, x: 960, y: -260, hz: 515, zoom: 1.06, dolly: 0.12},
  {t: 296, x: 900, y: -262, hz: 512, zoom: 1.04, dolly: 0.11},
  {t: 336, x: 970, y: -262, hz: 512, zoom: 1.06, dolly: 0.11},
  // The windup: widen to hold the coiled blade, then push in as it hangs.
  {t: 362, x: 1010, y: -250, hz: 650, zoom: 0.97, dolly: 0.12},
  {t: 404, x: 1000, y: -240, hz: 672, zoom: 1.02, dolly: 0.12},
  {t: 430, x: 1000, y: -225, hz: 655, zoom: 1.12, dolly: 0.13, e: E.inOut},
  {t: 480, x: 1010, y: -225, hz: 650, zoom: 1.16, dolly: 0.13},
  {t: 500, x: 1060, y: -230, hz: 640, zoom: 1.12, dolly: 0.13},
  {t: 562, x: 1090, y: -220, hz: 640, zoom: 1.08, dolly: 0.13},
]);

// Phase two, after the cut: low on the floor behind the knight. It opens with
// the fallen crown on the flagstones between them, then tilts up and pushes in
// with the king as he rises, until he looms over the lens.
const low = camTrack([
  {t: C.phase2, x: 1140, y: -56, hz: 745, zoom: 1.32, dolly: 0.08},
  {t: C.phase2 + 12, x: 1138, hz: 755, zoom: 1.34, e: E.sine},
  {t: C.cutToBlack, x: 1120, y: -40, hz: 1132, zoom: 1.71, dolly: 0.1, e: E.inOut},
]);

const pulseEnv = (f: number, at: number, rise: number, hold: number, fall: number) =>
  ramp(f, at - rise, at) * (1 - ramp(f, at + hold, at + hold + fall));

export const mainCamAt = (f: number): Cam => {
  if (f >= C.phase2) return low(f);
  let cam = base(f);
  // Punch in on the parry, drift through the slow motion, ease back out.
  const parry = f >= C.parry ? E.snap(clamp01((f - C.parry) / 4)) * (1 - E.inOut(clamp01((f - 474) / 22))) : 0;
  if (parry > 0) {
    const p = parryPoint();
    const focus = proj(cam, p.x, p.y, p.d);
    cam = punchIn(cam, focus, 0.13 * parry + 0.04 * ramp(f, C.parry, C.slowmoEnd) * parry);
  }
  const rip = f >= C.riposte ? E.snap(clamp01((f - C.riposte) / 3)) * (1 - E.inOut(clamp01((f - 506) / 30))) : 0;
  if (rip > 0) {
    const p = ripostePoint();
    cam = punchIn(cam, proj(cam, p.x, p.y, p.d), 0.1 * rip);
  }
  return cam;
};

export {mixCam};

export const SHAKES = [
  {frame: C.roar, strength: 17, decay: 34},
  {frame: C.roar + 12, strength: 8, decay: 30},
  {frame: C.parry, strength: 24, decay: 12},
  {frame: C.riposte, strength: 20, decay: 16},
  {frame: 536, strength: 7, decay: 12},
  // The crown striking the stone, felt through the close-up lens.
  {frame: C.crownBounces[0], strength: 6, decay: 9},
  {frame: C.crownBounces[1], strength: 3.5, decay: 8},
  {frame: C.crownBounces[2], strength: 2, decay: 7},
  {frame: C.phase2, strength: 16, decay: 26},
  ...[646, 660, 672, 684].map((frame, i) => ({frame, strength: 3 + i, decay: 14})),
];

/** Full-frame flash: [opacity, color]. */
export const flashAt = (f: number): [number, string] => {
  const parry = [0.88, 0.55, 0.26, 0.1, 0.03][f - C.parry];
  if (parry !== undefined) return [parry, f - C.parry < 2 ? '#fff6e6' : '#ffc070'];
  const rip = [0.38, 0.2, 0.08, 0.02][f - C.riposte];
  if (rip !== undefined) return [rip, '#ffd4a0'];
  const p2 = [0.6, 0.45, 0.3, 0.18, 0.1, 0.05][f - C.phase2];
  if (p2 !== undefined) return [p2, '#ff4a1a'];
  return [0, '#000'];
};

/** How brightly the king's eyes burn. */
export const eyesAt = (t: number) => {
  if (t < T.eyes) return 0;
  const ignite = 1 + 1.6 * Math.exp(-(t - T.eyes) / 7);
  const roar = 0.5 * pulseEnv(t, T.roar + 6, 4, 22, 12);
  const hit = t > T.riposte ? -0.3 * ramp(t, T.riposte, T.riposte + 10) : 0;
  const fade = t > T.stagger ? -0.55 * ramp(t, T.stagger, T.crownFall + 8) : 0;
  const reborn = t > T.phase2 ? 2.4 * ramp(t, T.phase2, T.phase2 + 3) + 0.3 * Math.sin(t * 0.7) : 0;
  const flick = t > T.stagger && t < T.phase2 ? 0.15 * nz(t * 0.3, 88) : 0;
  return Math.max(0.2, ignite + roar + hit + fade + reborn + flick);
};

/** Red light across the room: the pulse at the ignition, the flood in phase two. */
export const redAt = (f: number) => {
  const pulse = f >= C.eyesIgnite ? 0.55 * Math.exp(-(f - C.eyesIgnite) / 16) : 0;
  const roar = 0.2 * pulseEnv(f, C.roar + 4, 3, 10, 20);
  const flood = f >= C.phase2 ? 0.25 + 0.6 * ramp(f, C.phase2, C.phase2 + 26) + 0.08 * Math.sin(f * 0.35) : 0;
  return clamp01(pulse + roar + flood);
};

const kingEyeWorld = {x: THRONE.x - 60, y: -330};

/** Candles: flare as the red pulse passes, gutter or die as the roar passes. */
export const candleAt = (t: number) => (c: Candelabrum, i: number) => {
  const dist = Math.hypot(c.x - kingEyeWorld.x, (c.d - 1.1) * 1400);
  const pulseAt = T.eyes + dist / 70;
  const flare = t > pulseAt ? 0.75 * Math.exp(-(t - pulseAt) / 8) : 0;
  const waveAt = T.roar + dist / 62;
  const dies = rnd(c.seed, i, 99) < 0.5;
  let gain = 1 + flare;
  let out = 0;
  let smokeAge = 0;
  if (t > waveAt) {
    if (dies) {
      out = ramp(t, waveAt, waveAt + 3);
      smokeAge = t - waveAt;
    } else {
      gain *= 1 - 0.75 * Math.exp(-(t - waveAt) / 6);
    }
  }
  if (t > T.phase2) gain *= 1 + 0.4 * ramp(t, T.phase2, T.phase2 + 20);
  return {gain, out, smokeAge};
};

export const waveAt = (t: number, king: Duel['king']): EnvState['wave'] => {
  const a = t - T.roar;
  if (a < 0 || a > 60) return null;
  return {x: king.x, y: -380, d: king.d, r: 60 + 62 * a, a: Math.max(0, 1 - a / 50)};
};

export const figureLightAt = (f: number, t: number): FigureLight => {
  const red = redAt(f);
  const moon = '#c4d2e6';
  const eyes = eyesAt(t);
  const phase2 = f >= C.phase2 ? ramp(f, C.phase2, C.phase2 + 20) : 0;
  const slow = ramp(f, C.parry, C.parry + 3) * (1 - ramp(f, 466, C.slowmoEnd));
  // Phase two: the burning skull is the key light. The knight, between it and
  // the lens, sinks to a silhouette edged in fire; the king is lit from above.
  if (phase2 > 0) {
    return {
      knight: {
        key: {color: '#ff5a22', a: 0.42, dir: [0.55, -0.83]},
        fill: {color: '#ff3a1a', a: 0, dir: [-0.95, 0.2]},
        rim: {color: '#ff6a2a', a: 0.85, px: 1.3 + 0.5 * phase2},
        shade: {color: '#070203', a: 0.8 * phase2},
      },
      king: {
        key: {color: '#ff9440', a: 0.66, dir: [0, -1]},
        fill: {color: '#c02008', a: 0.34, dir: [-0.9, 0.3]},
        rim: {color: '#ffa050', a: 0.85, px: 1.3 + 0.6 * phase2},
        shade: {color: '#0c0304', a: 0.34 * phase2},
      },
      eyes,
      engulf: ramp(f, C.phase2 + 1, C.phase2 + 16),
      shieldGlint: 0,
      crownGlint: 0,
      swordHeat: 0.8 * ramp(f, C.phase2 + 6, C.phase2 + 30),
      fringe: 0,
    };
  }
  return {
    knight: {
      key: {color: moon, a: 0.5, dir: [0.6, -0.8]},
      fill: {color: red > 0.25 ? '#ff4a2a' : '#ff8a3a', a: 0.26 + 0.35 * red, dir: [-0.95, 0.2]},
      rim: {color: moon, a: 0.65, px: 1.3},
    },
    king: {
      key: {color: moon, a: 0.45, dir: [0.6, -0.8]},
      fill: {color: '#ff7a3a', a: 0.24, dir: [-0.95, 0.2]},
      rim: {color: moon, a: 0.65, px: 1.3},
    },
    eyes,
    engulf: 0,
    shieldGlint: 0,
    // The crown catches the moon as his head comes up into the beam.
    crownGlint: Math.max(0, 1 - Math.abs(t - (T.rise + 10)) / 7),
    swordHeat: 0,
    fringe: slow,
  };
};

export const slowGradeAt = (f: number) => ramp(f, C.parry, C.parry + 3) * (1 - ramp(f, 466, C.slowmoEnd));
