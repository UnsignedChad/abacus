// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Isometric (2:1 dimetric) projection and the camera. The world is laid out
// in tile units (x runs down-right on screen, y runs down-left) with heights
// in low-res pixels. Everything is painted into a 640x360 bitmap that the
// compositor scales 3x with nearest-neighbour sampling.

import {Easing, interpolate} from 'remotion';

export const LW = 640;
export const LH = 360;
export const SCALE = 3;
export const TW = 32; // tile width in low-res px
export const TH = 16; // tile height

export type Pt = [number, number];

/** Iso screen position before the camera, at zoom 1. */
export const iso = (x: number, y: number, z = 0): Pt => [((x - y) * TW) / 2, ((x + y) * TH) / 2 - z];

/** Inverse of iso() on the ground plane. */
export const unIso = (sx: number, sy: number): Pt => {
  const a = sx / (TW / 2);
  const b = sy / (TH / 2);
  return [(a + b) / 2, (b - a) / 2];
};

// The camera is module state, set once at the start of each paint. Painting
// is synchronous, so it can never leak between frames.
export const cam = {cx: 0, cy: 0, z: 1};

const CAM_KEYS = {
  t: [0, 450],
  cx: [-70, -6],
  cy: [206, 91],
  z: [1.16, 1.25],
};

/** The slow drift toward the church, ever so slightly zooming in. */
export const setCamera = (f: number) => {
  const e = interpolate(f, CAM_KEYS.t, [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0.0, 0.62, 1),
  });
  cam.cx = CAM_KEYS.cx[0] + (CAM_KEYS.cx[1] - CAM_KEYS.cx[0]) * e;
  cam.cy = CAM_KEYS.cy[0] + (CAM_KEYS.cy[1] - CAM_KEYS.cy[0]) * e;
  cam.z = CAM_KEYS.z[0] + (CAM_KEYS.z[1] - CAM_KEYS.z[0]) * e;
};

/** World point -> low-res screen point through the current camera. */
export const P = (x: number, y: number, z = 0): Pt => {
  const [sx, sy] = iso(x, y, z);
  return [(sx - cam.cx) * cam.z + LW / 2, (sy - cam.cy) * cam.z + LH / 2];
};

/** Iso-space point (already projected, zoom 1) -> screen. */
export const S = (sx: number, sy: number): Pt => [(sx - cam.cx) * cam.z + LW / 2, (sy - cam.cy) * cam.z + LH / 2];

/** Low-res screen point -> full-resolution composition pixels. */
export const full = (p: Pt): Pt => [p[0] * SCALE, p[1] * SCALE];
