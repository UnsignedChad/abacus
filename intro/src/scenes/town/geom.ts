// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Wall faces and roof planes. A Face is a vertical rectangle on a box side
// that the camera can see (+x or +y), parameterised by u (tiles, left to
// right on screen) and z (px up). Roof planes are bilinear patches in s
// (along the eave) and t (eave to ridge).

import {P, Pt} from './iso';

export type V3 = [number, number, number];

export type Face = {ox: number; oy: number; dx: number; dy: number; len: number; nx: number; ny: number; k: number};

/** The +y side of a footprint (faces down-left on screen, catches more light). */
export const faceY = (x0: number, x1: number, y1: number): Face => ({
  ox: x0,
  oy: y1,
  dx: 1,
  dy: 0,
  len: x1 - x0,
  nx: 0,
  ny: 1,
  k: 0.92,
});

/** The +x side (faces down-right, a little darker). */
export const faceX = (x1: number, y0: number, y1: number): Face => ({
  ox: x1,
  oy: y1,
  dx: 0,
  dy: -1,
  len: y1 - y0,
  nx: 1,
  ny: 0,
  k: 0.7,
});

/** World point on a face; `n` pushes it out along the normal (tiles). */
export const fw = (f: Face, u: number, z: number, n = 0): V3 => [f.ox + f.dx * u + f.nx * n, f.oy + f.dy * u + f.ny * n, z];
export const fp = (f: Face, u: number, z: number, n = 0): Pt => {
  const w = fw(f, u, z, n);
  return P(w[0], w[1], w[2]);
};
export const fquad = (f: Face, u0: number, u1: number, z0: number, z1: number, n = 0): Pt[] => [
  fp(f, u0, z0, n),
  fp(f, u1, z0, n),
  fp(f, u1, z1, n),
  fp(f, u0, z1, n),
];

/** Pointed (equilateral) arch outline on a face, apex at z1. */
export const farch = (f: Face, u: number, w: number, z0: number, z1: number, n = 0, steps = 6): Pt[] => {
  const rise = w * 17.9 * 0.866;
  const spring = z1 - rise;
  const pts: Pt[] = [fp(f, u - w / 2, z0, n), fp(f, u + w / 2, z0, n)];
  // Right arc is centred on the left springing point, and vice versa.
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 3);
    pts.push(fp(f, u - w / 2 + w * Math.cos(a), spring + w * 17.9 * Math.sin(a), n));
  }
  for (let i = steps; i >= 0; i--) {
    const a = (i / steps) * (Math.PI / 3);
    pts.push(fp(f, u + w / 2 - w * Math.cos(a), spring + w * 17.9 * Math.sin(a), n));
  }
  return pts;
};

/** Circle drawn flat on a face. */
export const fcircle = (f: Face, u: number, z: number, r: number, steps = 16, a0 = 0, a1 = Math.PI * 2, n = 0): Pt[] => {
  const pts: Pt[] = [];
  const rz = r * 17.9; // one tile along a face is ~17.9 px on screen
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    pts.push(fp(f, u + Math.cos(a) * r, z + Math.sin(a) * rz, n));
  }
  return pts;
};

export type Plane = [V3, V3, V3, V3]; // eave-left, eave-right, ridge-right, ridge-left

export const pl = (p: Plane, s: number, t: number): Pt => {
  const a = p[0];
  const b = p[1];
  const c = p[2];
  const d = p[3];
  const x = (a[0] * (1 - s) + b[0] * s) * (1 - t) + (d[0] * (1 - s) + c[0] * s) * t;
  const y = (a[1] * (1 - s) + b[1] * s) * (1 - t) + (d[1] * (1 - s) + c[1] * s) * t;
  const z = (a[2] * (1 - s) + b[2] * s) * (1 - t) + (d[2] * (1 - s) + c[2] * s) * t;
  return P(x, y, z);
};

export const planePts = (p: Plane): Pt[] => p.map((v) => P(v[0], v[1], v[2]));
