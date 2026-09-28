// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import {noise2D} from '@remotion/noise';
import {random} from 'remotion';

// A fixed table of deterministic randoms, indexed by an integer hash. Much
// cheaper than string-seeded random() for the thousands of lookups per frame.
const TABLE = Array.from({length: 4096}, (_, i) => random(`cathedral-${i}`));

export const rnd = (a: number, b = 0, c = 0) =>
  TABLE[((Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791)) >>> 0) & 4095];

export const rr = (min: number, max: number, a: number, b = 0, c = 0) => min + (max - min) * rnd(a, b, c);

// @remotion/noise caches only a handful of seeds, so every caller shares two
// seeds and varies the coordinates instead.
export const nz = (x: number, y: number) => noise2D('cathedral-a', x, y);
export const nz2 = (x: number, y: number) => noise2D('cathedral-b', x, y);

/** Candle-style flicker in ~[0.6, 1.1], unique per id. */
export const flicker = (t: number, id: number) =>
  0.85 + 0.17 * nz(t * 0.23, id * 3.1) + 0.08 * nz2(t * 0.9, id * 1.7);

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

export const mixHex = (a: string, b: string, u: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * u));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
