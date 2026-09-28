// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {WIDTH, HEIGHT} from '../theme';

/** Grid of frozen frames of one component, each labelled with its frame number. */
export const SheetGrid: React.FC<{Scene: React.FC; frames: number[]; cols?: number}> = ({
  Scene,
  frames,
  cols = 3,
}) => {
  const thumbW = WIDTH / cols;
  const thumbH = (thumbW * HEIGHT) / WIDTH;
  const scale = thumbW / WIDTH;
  return (
    <AbsoluteFill style={{background: '#111'}}>
      {frames.map((f, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: (i % cols) * thumbW,
            top: Math.floor(i / cols) * thumbH,
            width: thumbW,
            height: thumbH,
            overflow: 'hidden',
            outline: '2px solid #111',
          }}
        >
          <div
            style={{
              width: WIDTH,
              height: HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Freeze frame={f}>
              <Scene />
            </Freeze>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 6,
              padding: '2px 8px',
              background: 'rgba(0,0,0,0.75)',
              color: '#ff0',
              fontFamily: 'monospace',
              fontSize: 22,
            }}
          >
            {f}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
