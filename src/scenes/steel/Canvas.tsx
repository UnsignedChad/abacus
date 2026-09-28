// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React, {useLayoutEffect, useRef} from 'react';
import {H, W, buf} from './util';

/**
 * A full-frame canvas repainted synchronously on every render, so its pixels
 * are a pure function of the current frame. `res` < 1 paints into a smaller
 * bitmap that the compositor scales up: a free, soft depth-of-field blur.
 * Painters always draw in 1920x1080 coordinates.
 */
export const PaintLayer: React.FC<{
  paint: (ctx: CanvasRenderingContext2D) => void;
  res?: number;
  blur?: number; // bitmap pixels, applied after painting (cheap at low res)
  style?: React.CSSProperties;
}> = ({paint, res = 1, blur = 0, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const bw = Math.round(W * res);
  const bh = Math.round(H * res);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(res, 0, 0, res, 0, 0);
    paint(ctx);
    if (blur > 0) {
      const {c, ctx: b} = buf('layer-blur', bw, bh);
      b.drawImage(ctx.canvas, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, bw, bh);
      ctx.filter = `blur(${blur}px)`;
      ctx.drawImage(c, 0, 0);
      ctx.filter = 'none';
    }
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
