// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Where the crown is once it leaves the king's skull: flung up as his head
// drops, then (after the close-up) lying on the flagstones at the knight's feet.

import {Cam, proj, sOf} from './camera';
import {kingAt, toWorld} from './choreo';
import {CROWN_SEAT} from './king';
import {ap, boneAngle, Mat, mul, rot, sc, tr} from './rig';
import {C, T} from './time';
import {clamp01} from './util';

let seat: {x: number; y: number; d: number; ang: number} | null = null;
const start = () => {
  if (!seat) {
    const g = kingAt(T.crownFall);
    const p = toWorld(g, ap(g.W.head, CROWN_SEAT[0], CROWN_SEAT[1]));
    seat = {x: p[0], y: p[1], d: g.d, ang: -boneAngle(g.W.head)};
  }
  return seat;
};

/** Crown in flight, seconds after it is thrown from the skull (main shot). */
export const crownInFlight = (t: number, cam: Cam) => {
  const a = t - T.crownFall;
  const s = start();
  const x = s.x - 4 * a;
  const y = s.y - 12 * a + 0.5 * 1.0 * a * a;
  const [sx, sy] = proj(cam, x, y, s.d);
  const k = sOf(cam, s.d);
  const m: Mat = mul(tr(sx, sy), mul(rot(s.ang - 16 * a), sc(k)));
  return {m, tilt: 0.32 + 0.45 * Math.sin(a * 0.4), glint: Math.max(0, 1 - a / 6), z: 117};
};

/** Where it comes to rest: on the flagstones before the knight, clear of the
 *  boss bar's label as the phase-two camera tilts up past it. */
export const CROWN_REST = {x: 1060, d: 0.94};

export const crownAtRest = (cam: Cam, t: number) => {
  const [sx, sy] = proj(cam, CROWN_REST.x, 0, CROWN_REST.d);
  const k = sOf(cam, CROWN_REST.d);
  // Upright and a little askew, as it came to rest in the close-up.
  const m: Mat = mul(tr(sx, sy - 2 * k), mul(rot(-8), sc(k)));
  const red = clamp01((t - T.phase2) / 12);
  return {m, tilt: 0.14, glint: 0, z: 300, red};
};

export {C};
