// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill} from 'remotion';
import {noise2D} from '@remotion/noise';
import {H, W, Proj, layerTransform} from './camera';

/**
 * A full-frame canvas repainted synchronously on every render, so its pixels
 * are always a pure function of the current frame. `res` < 1 paints into a
 * smaller bitmap that the compositor scales up (a free, soft blur).
 */
export const PaintLayer: React.FC<{
  paint: (ctx: CanvasRenderingContext2D) => void;
  res?: number;
  style?: React.CSSProperties;
}> = ({paint, res = 1, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const bw = Math.round(W * res);
  const bh = Math.round(H * res);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(res, 0, 0, res, 0, 0);
    paint(ctx);
  });
  return (
    <canvas
      ref={ref}
      width={bw}
      height={bh}
      style={{position: 'absolute', left: 0, top: 0, width: W, height: H, ...style}}
    />
  );
};

/** A DOM/SVG layer that moves with the camera at its parallax. */
export const Layer: React.FC<{p: Proj; children: React.ReactNode; style?: React.CSSProperties}> = ({
  p,
  children,
  style,
}) => (
  <AbsoluteFill style={{transformOrigin: '0 0', transform: layerTransform(p), ...style}}>
    {children}
  </AbsoluteFill>
);

/** Fractal noise in roughly [-1, 1]. */
export const fbm = (seed: string, x: number, y = 0, oct = 4) => {
  let a = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    a += noise2D(seed + i, x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return a / norm;
};

export type Pt = [number, number];

/** Sample a ridge line y(x) across [x0, x1]. */
export const ridgePoints = (x0: number, x1: number, step: number, y: (x: number) => number): Pt[] => {
  const pts: Pt[] = [];
  for (let x = x0; x <= x1 + step; x += step) pts.push([x, y(x)]);
  return pts;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Closed silhouette path: the ridge on top, filled down to `bottom`. */
export const ridgeFill = (pts: Pt[], bottom: number) =>
  `M${r1(pts[0][0])},${bottom} ` +
  pts.map(([x, y]) => `L${r1(x)},${r1(y)}`).join(' ') +
  ` L${r1(pts[pts.length - 1][0])},${bottom} Z`;

/** Open polyline through the ridge, for rim-light strokes. */
export const ridgeLine = (pts: Pt[]) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)},${r1(y)}`).join(' ');

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const mix = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
