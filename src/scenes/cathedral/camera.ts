// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// A pinhole camera for a layered 2.5D stage. Every layer sits at a depth d
// (1 = the fighting plane); nearer layers scale up and slide faster, so the
// parallax is always consistent with the camera's truck, dolly and zoom.

import {E, Key, lerp, sampleN, Vec} from './rig';

export type Cam = {
  x: number; // lateral position (world units)
  y: number; // camera height (world units, negative is up)
  hz: number; // screen y of the horizon (lens shift, emulates tilt)
  zoom: number;
  dolly: number; // forward travel, in depth units
};

export const W = 1920;
export const H = 1080;
/** World units per depth unit, for things laid out along the floor. */
export const DEPTH_UNITS = 1400;

export const sOf = (c: Cam, d: number) => c.zoom / Math.max(0.04, d - c.dolly);

export const proj = (c: Cam, x: number, y: number, d: number): Vec => {
  const s = sOf(c, d);
  return [W / 2 + (x - c.x) * s, c.hz + (y - c.y) * s];
};

/** Canvas transform that maps world coordinates on the plane at depth d. */
export const planeMatrix = (c: Cam, d: number): [number, number, number, number, number, number] => {
  const s = sOf(c, d);
  return [s, 0, 0, s, W / 2 - c.x * s, c.hz - c.y * s];
};

type CamKey = {t: number; e?: (u: number) => number} & Partial<Cam>;

const channel = (keys: CamKey[], name: keyof Cam): Key<number>[] => {
  const out: Key<number>[] = [];
  let last: number | undefined;
  for (const k of keys) {
    const v = k[name] ?? last;
    if (v === undefined) continue;
    out.push({t: k.t, v, e: k.e});
    last = v;
  }
  return out;
};

export const camTrack = (keys: CamKey[]) => {
  const ch = {
    x: channel(keys, 'x'),
    y: channel(keys, 'y'),
    hz: channel(keys, 'hz'),
    zoom: channel(keys, 'zoom'),
    dolly: channel(keys, 'dolly'),
  };
  return (f: number): Cam => ({
    x: sampleN(ch.x, f),
    y: sampleN(ch.y, f),
    hz: sampleN(ch.hz, f),
    zoom: sampleN(ch.zoom, f),
    dolly: sampleN(ch.dolly, f),
  });
};

/** Blend the camera toward a screen-space punch-in around a focus point. */
export const punchIn = (c: Cam, focus: Vec, amount: number): Cam => {
  if (amount === 0) return c;
  // Zooming by k about a screen point keeps that point fixed on screen.
  const k = 1 + amount;
  const [fx, fy] = focus;
  const s = sOf(c, 1);
  // World point under the focus on the stage plane.
  const wx = c.x + (fx - W / 2) / s;
  const wy = c.y + (fy - c.hz) / s;
  const zoom = c.zoom * k;
  const s2 = zoom / Math.max(0.04, 1 - c.dolly);
  return {...c, zoom, x: wx - (fx - W / 2) / s2, y: wy - (fy - c.hz) / s2};
};

export const mixCam = (a: Cam, b: Cam, u: number): Cam => ({
  x: lerp(a.x, b.x, u),
  y: lerp(a.y, b.y, u),
  hz: lerp(a.hz, b.hz, u),
  zoom: lerp(a.zoom, b.zoom, u),
  dolly: lerp(a.dolly, b.dolly, u),
});

export {E};
