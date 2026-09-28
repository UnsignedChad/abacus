// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The layout of Clogheen's square (tile units) and the scene's small
// choreography: who moves where, and when the lights go out.

import {interpolate} from 'remotion';
import {cues} from '../../theme';
import {progress} from '../../lib/fx';

export const C = cues.town;

export const CHURCH = {
  nave: {x0: 8, x1: 12, y0: 0, y1: 7, h: 44, roof: 30},
  tower: {x0: 8.6, x1: 11.4, y0: 7, y1: 9.8, h: 90, spire: 52},
  door: {u: 1.4, w: 1.0, h: 24}, // on the tower's +y face
};
export const SPIRE_TIP: [number, number, number] = [
  (CHURCH.tower.x0 + CHURCH.tower.x1) / 2,
  (CHURCH.tower.y0 + CHURCH.tower.y1) / 2,
  CHURCH.tower.h + CHURCH.tower.spire + 8,
];
export const CHURCH_DOOR: [number, number] = [CHURCH.tower.x0 + CHURCH.door.u, CHURCH.tower.y1];

export const WELL: [number, number] = [13.2, 13.4];
export const FIRE: [number, number] = [15.6, 15.4];
export const BRAZIER: [number, number] = [15.4, 12.6];
/** The lamp post by the road fence at the edge of town. */
export const LAMP: [number, number] = [7.9, 21.75];

/** The road in from the lower left, as far as the square's edge (the ground's lane follows it). */
export const ROUTE_IN: [number, number][] = [
  [3.7, 25.6],
  [5.2, 23.6],
  [8.4, 20.2],
  [10.9, 17.6],
  [12.1, 16.2],
];

/** The traveler's full route: across the square, past the well, to the church's red door. */
export const ROUTE: [number, number][] = [...ROUTE_IN, [11.75, 14.2], [10.6, 11.9], [10.1, 11.45]];
export const ROUTE_LEN = ROUTE.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]), 0);

/** Walking pace (tiles per frame) and the frame the traveler halts before the door. */
const PACE = 0.058;
export const WALK_END = Math.round(ROUTE_LEN / PACE + 20);

// Beats inside the narration: the shutters close, then a door is barred.
export const SHUTTER = {start: 204, shut: 222, dark: 232};
export const HURRY = {start: 150, arrive: 222, doorShut: 236};

/** Townsfolk hurrying home: from the fire to the door of the left cottage. */
export const HURRY_PATH: [number, number][] = [
  [14.6, 16.6],
  [12.0, 16.4],
  [9.8, 15.3],
  [8.35, 14.9],
];

/** The rumble's surge: a hard attack at the cue, then a long smoulder. */
export const churchSurge = (f: number) =>
  interpolate(f, [C.churchRumble - 1, C.churchRumble + 2, C.churchRumble + 12, C.churchRumble + 40, 450], [0, 1, 0.8, 0.45, 0.35], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** The church's breath: a slow pulse, plus the surge at the rumble. */
export const churchGlow = (f: number) => {
  const pulse = 0.78 + 0.16 * Math.sin((f / 30) * Math.PI * 0.62) + 0.06 * Math.sin(f * 0.37);
  return pulse + churchSurge(f) * 1.5;
};

/** Point along a polyline by arc-length fraction. */
export const along = (pts: [number, number][], t: number): {p: [number, number]; dir: [number, number]} => {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const u = Math.min(1, d / lens[i]);
      const a = pts[i];
      const b = pts[i + 1];
      return {p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], dir: [(b[0] - a[0]) / lens[i], (b[1] - a[1]) / lens[i]]};
    }
    d -= lens[i];
  }
  return {p: pts[pts.length - 1], dir: [1, 0]};
};

/** Traveler walk progress 0..1: steady pace, then decelerating to a halt. */
export const travelerT = (f: number) => {
  const f1 = WALK_END - 50;
  const f2 = WALK_END + 10;
  const v0 = 1 / (f1 + (f2 - f1) / 2);
  if (f <= f1) return Math.max(0, f * v0);
  const t = Math.min(f, f2) - f1;
  return v0 * f1 + v0 * (t - (t * t) / (2 * (f2 - f1)));
};

/** 0..1 walking energy (for the gait), fading out as they stop. */
export const walkEnergy = (f: number) => 1 - progress(f, WALK_END - 30, WALK_END + 10);

/** The traveler's recoil at the rumble: a half step back from the door, 0..1. */
export const recoil = (f: number) =>
  interpolate(f, [C.churchRumble + 1, C.churchRumble + 9, C.churchRumble + 40], [0, 1, 0.85], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - (1 - t) * (1 - t),
  });
