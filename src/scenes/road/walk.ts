// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The traveler's walk, in ground-layer world coordinates. Feet are planted in
// the world during stance and swung forward on an arc, so they never slide;
// legs are solved with two-bone IK from the hip. Every heel strike lands on
// the exact frame of the soundtrack's gravel footstep (see STRIKES).

import {cues, timeline} from '../../theme';
import {roadY} from './Landscape';

export const WALK = {
  x0: 420,
  speed: 4.4, // px per frame
  hipH: 106,
  thigh: 58,
  shin: 55,
  ankleH: 8,
};

export const hipX = (f: number) => WALK.x0 + WALK.speed * f;

const STANCE = 0.6;

/** The soundtrack's seeded generator (mulberry32), reproduced bit for bit. */
const mulberry = (seed: number) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Heel-strike frames, identical to the gravel steps in the road soundtrack:
 * the first at 0.6 x fadeInEnd seconds, then randomised 0.56-0.62s apart from
 * rng(200) (each step draws its velocity, then the gap). Padded with evenly
 * spaced strikes before the first and after the last so the walk never stops.
 */
const STRIKES: {frames: number[]; first: number} = (() => {
  const fps = timeline.fps;
  const r = mulberry(200);
  const range = (a: number, b: number) => a + (b - a) * r();
  const real: number[] = [];
  for (let t = (cues.road.fadeInEnd / fps) * 0.6; t < cues.road.fadeOutStart / fps + 0.5; ) {
    range(0.75, 1);
    real.push(t * fps);
    t += range(0.56, 0.62);
  }
  const gap = 0.59 * fps;
  const before = [1, 2, 3, 4].map((k) => real[0] - k * gap).reverse();
  const after = [1, 2, 3, 4, 5, 6].map((k) => real[real.length - 1] + k * gap);
  return {frames: [...before, ...real, ...after], first: before.length};
})();

export const strikeFrames = () => STRIKES.frames.slice(STRIKES.first);

// Strike index k belongs to the near foot (side 0) when (k - first) is even.
const sideOf = (k: number) => (((k - STRIKES.first) % 2) + 2) % 2;

/** Phase in [0, 1) of a foot's cycle; 0 = heel strike. `side` 0 = near, 1 = far. */
export const footPhase = (f: number, side: number) => {
  const S = STRIKES.frames;
  let j = sideOf(0) === side ? 0 : 1;
  while (j + 2 < S.length - 2 && S[j + 2] <= f) j += 2;
  const period = S[j + 2] - S[j];
  return {j, phi: Math.max(0, (f - S[j]) / period), period};
};

/** Where the foot struck at index j plants: under the hip at mid-stance. */
const plantX = (j: number) => {
  const S = STRIKES.frames;
  return hipX(S[j] + (STANCE / 2) * (S[j + 2] - S[j]));
};

export type Foot = {x: number; y: number; pitch: number};

export const footAt = (f: number, side: number): Foot => {
  const {j, phi} = footPhase(f, side);
  const p0 = plantX(j);
  if (phi < STANCE) {
    // Heel strike rolls to flat, then the heel peels up before toe-off.
    const pitch = phi < 0.12 ? -0.28 * (1 - phi / 0.12) : phi > 0.42 ? 0.55 * ((phi - 0.42) / 0.18) : 0;
    const lift = Math.max(0, pitch) * 13;
    return {x: p0 + Math.max(0, pitch) * 8, y: roadY(p0) - WALK.ankleH - lift, pitch};
  }
  const s = Math.min(1, (phi - STANCE) / (1 - STANCE));
  const e = 0.5 - 0.5 * Math.cos(Math.PI * s);
  const p1 = plantX(j + 2);
  const x = p0 + 4.4 + (p1 - p0 - 4.4) * e;
  const lift = Math.sin(Math.PI * Math.pow(s, 0.75)) * 14;
  const pitch = 0.55 * (1 - s) * (1 - s) - 0.28 * s * s;
  return {x, y: roadY(x) - WALK.ankleH - lift - Math.max(0, pitch) * 13 * (1 - s), pitch};
};

/** Hip position: highest at mid-stance of each step. `phi` is the near foot's phase. */
export const hipAt = (f: number) => {
  const near = footPhase(f, 0);
  const far = footPhase(f, 1);
  // Phase within the current step (strike to next strike, either foot).
  const cur = near.j > far.j ? near : far;
  const S = STRIKES.frames;
  const psi = (f - S[cur.j]) / (S[cur.j + 1] - S[cur.j]);
  const x = hipX(f);
  const bob = 2.6 * Math.cos(2 * Math.PI * (psi - STANCE));
  return {x, y: roadY(x) - WALK.hipH - bob, phi: near.phi};
};

/** Knee from two-bone IK; the knee always bends forward (+x). */
export const solveLeg = (hx: number, hy: number, ax: number, ay: number) => {
  const {thigh: L1, shin: L2} = WALK;
  let dx = ax - hx;
  let dy = ay - hy;
  let d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.5;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  const th = Math.atan2(dy, dx);
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const al = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const k = th - al;
  return {kx: hx + Math.cos(k) * L1, ky: hy + Math.sin(k) * L1, ax: hx + dx, ay: hy + dy};
};
