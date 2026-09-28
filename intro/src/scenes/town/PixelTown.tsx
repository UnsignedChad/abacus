// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {LH, LW, SCALE} from './iso';
import {paintBloom, paintTown} from './scene';

/**
 * The square at 640x360, repainted synchronously every frame and scaled 3x
 * with nearest-neighbour sampling. Two soft bloom layers (tiny canvases,
 * smoothly upscaled) glow over the hard pixels at full resolution.
 */
export const PixelTown: React.FC = () => {
  const frame = useCurrentFrame();
  const px = useRef<HTMLCanvasElement>(null);
  const near = useRef<HTMLCanvasElement>(null);
  const wide = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = px.current?.getContext('2d');
    const n = near.current?.getContext('2d');
    const w = wide.current?.getContext('2d');
    if (!ctx || !n || !w) return;
    paintTown(ctx, frame);
    paintBloom(n, 2);
    paintBloom(w, 1);
  }, [frame]);
  const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: LW * SCALE, height: LH * SCALE};
  return (
    <AbsoluteFill>
      <canvas ref={px} width={LW} height={LH} style={{...full, imageRendering: 'pixelated'}} />
      <canvas ref={near} width={160} height={90} style={{...full, mixBlendMode: 'screen', opacity: 0.55}} />
      <canvas ref={wide} width={48} height={27} style={{...full, mixBlendMode: 'screen', opacity: 0.35}} />
    </AbsoluteFill>
  );
};
