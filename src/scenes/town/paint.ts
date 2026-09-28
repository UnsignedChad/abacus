// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Two-buffer painter. Every shape is drawn twice in the same painter order:
// its albedo into A (later multiplied by the light map) and, into E, either
// its emissive colour or black. E therefore holds only the light sources
// that are actually visible, correctly occluded by whatever stands in front.

import {P, Pt, cam} from './iso';

export type RGB = [number, number, number];

let A: CanvasRenderingContext2D;
let E: CanvasRenderingContext2D;

export const beginPaint = (a: CanvasRenderingContext2D, e: CanvasRenderingContext2D) => {
  A = a;
  E = e;
};

export const albedoCtx = () => A;
export const emissiveCtx = () => E;

export const rgb = (c: RGB, k = 1, a = 1) => {
  const r = Math.max(0, Math.min(255, Math.round(c[0] * k)));
  const g = Math.max(0, Math.min(255, Math.round(c[1] * k)));
  const b = Math.max(0, Math.min(255, Math.round(c[2] * k)));
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
};

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Emissive argument: undefined = opaque (occludes lights behind it),
 * null = leave E untouched (translucent overlays), string = glowing colour.
 */
export type Emi = string | null | undefined;

const path = (ctx: CanvasRenderingContext2D, pts: Pt[]) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
};

/** Fill a screen-space polygon. */
export const poly = (pts: Pt[], col: string, emi?: Emi, alpha = 1) => {
  path(A, pts);
  A.globalAlpha = alpha;
  A.fillStyle = col;
  A.fill();
  A.globalAlpha = 1;
  if (emi === null) return;
  path(E, pts);
  E.globalAlpha = alpha;
  E.fillStyle = emi ?? '#000';
  E.fill();
  E.globalAlpha = 1;
};

/** Fill a world-space polygon (points are [x, y, z]). */
export const wpoly = (pts: [number, number, number][], col: string, emi?: Emi, alpha = 1) =>
  poly(
    pts.map(([x, y, z]) => P(x, y, z)),
    col,
    emi,
    alpha,
  );

/** Stroke a screen-space polyline. Width is in low-res pixels at zoom 1. */
export const line = (pts: Pt[], col: string, width = 1, emi?: Emi, alpha = 1) => {
  const w = width * cam.z;
  for (const ctx of emi === null ? [A] : [A, E]) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ctx === A ? col : emi ?? '#000';
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

export const wline = (pts: [number, number, number][], col: string, width = 1, emi?: Emi, alpha = 1) =>
  line(
    pts.map(([x, y, z]) => P(x, y, z)),
    col,
    width,
    emi,
    alpha,
  );

/** Screen-space ellipse. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number, col: string, emi?: Emi, alpha = 1) => {
  for (const ctx of emi === null ? [A] : [A, E]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ctx === A ? col : emi ?? '#000';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
};

/** Axis-aligned screen rect, in sprite pixels scaled by the zoom around an origin. */
export const px = (ox: number, oy: number, x: number, y: number, w: number, h: number, col: string, emi?: Emi) => {
  const z = cam.z;
  const X = ox + x * z;
  const Y = oy + y * z;
  A.fillStyle = col;
  A.fillRect(X, Y, w * z, h * z);
  if (emi === null) return;
  E.fillStyle = emi ?? '#000';
  E.fillRect(X, Y, w * z, h * z);
};

/** Soft radial glow into E only (additive), for halos and volumetric light. */
export const glow = (x: number, y: number, r: number, col: RGB, a: number) => {
  if (a <= 0.003 || r <= 0) return;
  const g = E.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(col, 1, a));
  g.addColorStop(0.4, rgb(col, 1, a * 0.45));
  g.addColorStop(1, rgb(col, 1, 0));
  const op = E.globalCompositeOperation;
  E.globalCompositeOperation = 'lighter';
  E.fillStyle = g;
  E.fillRect(x - r, y - r, r * 2, r * 2);
  E.globalCompositeOperation = op;
};
