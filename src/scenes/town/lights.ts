// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The light map. Painters register point lights while they draw; after the
// albedo pass the map is built (cool night ambient, darkness toward the
// edges of the world, then every light added on top) and multiplied over the
// scene. Lights are also exposed for the full-resolution bloom overlay.

import {LH, LW, P, cam} from './iso';
import type {RGB} from './paint';

export type Light = {x: number; y: number; r: number; c: RGB; k: number; bloom?: number};

const lights: Light[] = [];

export const resetLights = () => {
  lights.length = 0;
};

/** Register a light at a world position (z in px). `r` is in tiles-ish px at zoom 1. */
export const addLight = (wx: number, wy: number, wz: number, r: number, c: RGB, k: number, bloom = 0) => {
  if (k <= 0.001) return;
  const [x, y] = P(wx, wy, wz);
  lights.push({x, y, r: r * cam.z, c, k, bloom});
};

export const getLights = () => lights;

export const AMBIENT: RGB = [72, 68, 104];

export const paintLightMap = (L: CanvasRenderingContext2D, ambientK: number) => {
  L.globalCompositeOperation = 'source-over';
  L.fillStyle = `rgb(${AMBIENT.map((v) => Math.round(v * ambientK)).join(',')})`;
  L.fillRect(0, 0, LW, LH);
  // The dark closes in beyond the square (centred between square and church).
  const [cx, cy] = P(12.5, 12.5, 0);
  const g = L.createRadialGradient(cx, cy, 60 * cam.z, cx, cy, 420 * cam.z);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0.9)');
  L.fillStyle = g;
  L.fillRect(0, 0, LW, LH);
  L.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const gr = L.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    const [r, gg, b] = l.c;
    gr.addColorStop(0, `rgba(${r},${gg},${b},${Math.min(1, l.k)})`);
    gr.addColorStop(0.35, `rgba(${r},${gg},${b},${Math.min(1, l.k) * 0.5})`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    L.fillStyle = gr;
    L.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  L.globalCompositeOperation = 'source-over';
};
