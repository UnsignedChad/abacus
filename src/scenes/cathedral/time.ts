// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The cathedral runs on two clocks. `frame` is the real (cue) clock the score is
// locked to. Action time `t` is the clock the world moves on: identical until the
// parry, ~15% speed through the slow-motion window, then full speed again with a
// fixed lag. Choreography is authored in action time; cue frames after the
// slow-mo are converted with A() so they still land on their exact frames.

import {cues} from '../../theme';

export const C = cues.cathedral;

const SLOW_START = C.parry;
const SLOW_RATE = 0.15;
const RAMP = 14; // frames spent ramping back to full speed
const SLOW_HOLD = C.slowmoEnd - RAMP;

/** Real frame -> action time. Continuous, monotonic, C1 at the ramp. */
export const A = (f: number): number => {
  if (f <= SLOW_START) return f;
  const held = SLOW_START + (Math.min(f, SLOW_HOLD) - SLOW_START) * SLOW_RATE;
  if (f <= SLOW_HOLD) return held;
  const u = Math.min(1, (f - SLOW_HOLD) / RAMP);
  // speed = rate + (1 - rate) * smoothstep(u); integral of smoothstep is u^3 - u^4/2.
  const ramped = held + RAMP * (SLOW_RATE * u + (1 - SLOW_RATE) * (u ** 3 - u ** 4 / 2));
  return f <= C.slowmoEnd ? ramped : ramped + (f - C.slowmoEnd);
};

/** Playback speed at a real frame (1 = normal). */
export const speedAt = (f: number) => A(f + 0.5) - A(f - 0.5);

/** Beats in action time. */
export const T = {
  fadeIn: C.fadeInEnd,
  eyes: C.eyesIgnite,
  rise: C.kingRises,
  roar: C.roar,
  circle: C.circleStart,
  swing: C.swing1,
  roll: C.roll,
  windup: C.windup,
  glint: C.windupGlint,
  parry: C.parry,
  slowEnd: A(C.slowmoEnd),
  riposte: A(C.riposte),
  stagger: A(C.stagger),
  crownFall: A(C.crownFall),
  bounces: C.crownBounces.map(A),
  crownRest: A(C.crownRest),
  phase2: A(C.phase2),
  cut: A(C.cutToBlack),
};

/** Shot list (real frames). */
export const SHOTS = {
  closeUpStart: 562,
  closeUpEnd: C.phase2,
};
