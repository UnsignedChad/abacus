// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Dust motes turning slowly in the candle's light. Brightness follows the
// flame and falls off with distance from it; the gust scatters them.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {FlameState, GUST, gustAmount} from './flame';

const COUNT = 34;

export const Dust: React.FC<{fl: FlameState; wick: {x: number; y: number}}> = ({fl, wick}) => {
  const frame = useCurrentFrame();
  if (fl.light < 0.02) return null;
  // Integrated wind push since the gust began, so motes are carried, not teleported.
  const blown = frame > GUST ? (frame - GUST) * 7 * Math.min(1, gustAmount(frame) + 0.3) : 0;
  const motes = [];
  for (let i = 0; i < COUNT; i++) {
    const bx = rand('dx' + i, wick.x - 500, wick.x + 1400);
    const by = rand('dy' + i, wick.y - 300, wick.y + 1100);
    const t = frame * 0.004;
    const x = bx + noise2D('dust', t + i * 3.1, 0) * 160 - frame * 0.25 - blown;
    const y = by + noise2D('dust', t + i * 3.1, 7) * 120 - frame * 0.18;
    const d = Math.hypot(x - wick.x, (y - wick.y) * 1.2);
    const fall = Math.max(0, 1 - d / 1300);
    const tw = 0.55 + 0.45 * Math.sin(frame * rand('dt' + i, 0.05, 0.14) + i);
    const a = fl.light * fall * fall * tw * 0.85;
    if (a < 0.02) continue;
    const sz = rand('ds' + i, 2, 4.5);
    motes.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: sz,
          height: sz,
          borderRadius: '50%',
          background: '#ffe2b0',
          opacity: a,
          boxShadow: `0 0 ${sz * 2}px ${sz * 0.6}px rgba(255,180,90,0.5)`,
        }}
      />,
    );
  }
  return <>{motes}</>;
};
