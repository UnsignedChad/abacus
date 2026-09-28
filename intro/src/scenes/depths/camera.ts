// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// One camera for the whole scene. It hangs above the floor plane (depth 0)
// looking straight down, so the top-down tile view is simply a perspective
// view from far away: scale = K / height. Zooming toward the seal lowers the
// camera, and after the seal opens it keeps falling, through the hole and
// down the abyss, with the same projection.

import {noise2D} from '@remotion/noise';
import {easeIn, easeInOut, progress} from '../../lib/fx';
import {cues} from '../../theme';
import {playerAt} from './map';
import {SEAL} from './seal';
import {T, lerp, monotone} from './util';

const C = cues.depths;

export const K = 800;
export const ZOOM = {x: SEAL.x, y: SEAL.y + 28, s: 3.2};
export const MAP_ANCHOR = {x: 740, y: 469};
export const DIVE_START = 286;

export type Cam = {x: number; y: number; c: number; s: number; rot: number; ax: number; ay: number};

const playerPx = (f: number) => {
  const p = playerAt(f);
  return {x: p.x * T + T / 2, y: p.y * T + T / 2};
};

/** The camera trails the player a little, like a steadicam. */
const follow = (f: number) => {
  let x = 0;
  let y = 0;
  const n = 10;
  for (let j = 0; j < n; j++) {
    const p = playerPx(f - j * 2);
    x += p.x;
    y += p.y;
  }
  return {x: x / n, y: y / n};
};

const zoomScale = (f: number) => {
  const s0 = 1.68 + 0.08 * progress(f, 0, 170);
  const z = progress(f, 168, 272, easeInOut);
  const s = Math.exp(lerp(Math.log(s0), Math.log(ZOOM.s), z));
  return s * (1 + 0.035 * progress(f, 262, DIVE_START + 8));
};

const C0 = -K / zoomScale(DIVE_START);
// Descent after the seal opens: a held breath, then the plunge.
const dive = monotone([0, 6, 12, 17, 26, 40, 52, 59, 74], [0, 5, 45, -C0, 520, 1180, 2050, 2900, 6000]);

export const camAt = (f: number): Cam => {
  const z = progress(f, 168, 272, easeInOut);
  const fl = follow(f);
  let x = lerp(fl.x, ZOOM.x, z);
  let y = lerp(fl.y, ZOOM.y, z);
  const ax = lerp(MAP_ANCHOR.x, 960, z);
  const ay = lerp(MAP_ANCHOR.y, 540, z);
  let c: number;
  if (f <= DIVE_START) c = -K / zoomScale(f);
  else c = C0 + dive(f - DIVE_START);
  const d = progress(f, DIVE_START, DIVE_START + 18, easeInOut);
  x = lerp(x, SEAL.x, d);
  y = lerp(y, SEAL.y, d);
  // Gentle handheld drift in the top-down view.
  const drift = 1 - progress(f, 270, 300);
  x += noise2D('dcx', f * 0.01, 0) * 3 * drift;
  y += noise2D('dcy', f * 0.01, 0) * 3 * drift;
  const rot = 0.55 * progress(f, DIVE_START + 4, C.flash, easeIn);
  return {x, y, c, s: c < 0 ? K / -c : Infinity, rot, ax, ay};
};

/** Screen-space camera shake in pixels. */
export const shakeAt = (f: number) => {
  let x = 0;
  let y = 0;
  const hits = [
    {frame: C.runeHum, strength: 4, decay: 20},
    {frame: C.runeDoorOpen, strength: 10, decay: 34},
    {frame: C.flash - 12, strength: 6, decay: 14},
  ];
  for (const h of hits) {
    const t = f - h.frame;
    if (t < 0 || t > h.decay) continue;
    const a = h.strength * (1 - t / h.decay) ** 2;
    x += noise2D('dsx', t * 0.8, h.frame) * a;
    y += noise2D('dsy', t * 0.8, h.frame) * a;
  }
  // A constant tremor while the seal is charging.
  const hum = progress(f, C.runeHum, C.runeDoorOpen) * (1 - progress(f, 300, 320));
  x += noise2D('dhx', f * 0.9, 1) * 1.4 * hum;
  y += noise2D('dhy', f * 0.9, 1) * 1.4 * hum;
  return {x, y};
};
