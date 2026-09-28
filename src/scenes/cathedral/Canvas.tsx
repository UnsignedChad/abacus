// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React, {useLayoutEffect, useRef} from 'react';
import {W, H} from './camera';

/**
 * A full-frame canvas repainted synchronously on every render, so the pixels
 * are always a pure function of the current frame. `res` < 1 paints into a
 * smaller bitmap that the compositor scales up: a free, very soft blur, used
 * for volumetric light. Painters always draw in 1920x1080 coordinates.
 */
export const PaintLayer: React.FC<{
  paint: (ctx: CanvasRenderingContext2D) => void;
  style?: React.CSSProperties;
  res?: number;
  blur?: number; // bitmap pixels; applied after painting (cheap at low res)
}> = ({paint, style, res = 1, blur = 0}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const bw = Math.round(W * res);
  const bh = Math.round(H * res);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, bw, bh);
    if (blur > 0) {
      const off = buf('blur-src', bw, bh);
      const octx = off.getContext('2d')!;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalAlpha = 1;
      octx.globalCompositeOperation = 'source-over';
      octx.clearRect(0, 0, bw, bh);
      octx.setTransform(res, 0, 0, res, 0, 0);
      paint(octx);
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(off, 0, 0);
      ctx.filter = 'none';
      return;
    }
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

// Scratch buffers shared by every layer (painting is synchronous, so they are
// never used by two paints at once). Every canvas layer in the page costs a
// full composite per frame whatever it holds, so soft low-res passes are
// painted into these and stamped into an existing layer instead.
const scratch: Record<string, HTMLCanvasElement> = {};
const buf = (key: string, w: number, h: number) => {
  let c = scratch[key];
  if (!c) {
    c = document.createElement('canvas');
    scratch[key] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
};

/**
 * Paint a pass at reduced resolution (the upscale softens it) and stamp it
 * into `ctx` over the full frame. The painter draws in 1920x1080 units.
 */
export const softPass = (
  ctx: CanvasRenderingContext2D,
  key: string,
  res: number,
  op: GlobalCompositeOperation,
  paint: (ctx: CanvasRenderingContext2D) => void,
) => {
  const bw = Math.round(W * res);
  const bh = Math.round(H * res);
  const c = buf(key, bw, bh);
  const b = c.getContext('2d')!;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.globalAlpha = 1;
  b.globalCompositeOperation = 'source-over';
  b.clearRect(0, 0, bw, bh);
  b.setTransform(res, 0, 0, res, 0, 0);
  paint(b);
  const k = ctx.getTransform().a;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = op;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
};

/** A lazily built offscreen bitmap, cached for the life of the page. */
const sprites: Record<string, HTMLCanvasElement> = {};
export const sprite = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  let c = sprites[key];
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.ceil(w);
    c.height = Math.ceil(h);
    draw(c.getContext('2d')!);
    sprites[key] = c;
  }
  return c;
};
