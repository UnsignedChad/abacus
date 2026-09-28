// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The area-name card: "CLOGHEEN" in wide-set Cinzel between two hairline
// gold rules, swelling in, holding, and dissolving. Full resolution, over
// the pixel art.

import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp, easeOut, progress} from '../../lib/fx';
import {fonts} from '../../fonts';
import {palette} from '../../theme';
import {C} from './world';

export const LocationCard: React.FC = () => {
  const f = useCurrentFrame();
  const start = C.locationTitle;
  const end = C.locationTitleEnd;
  if (f < start - 1 || f > end + 1) return null;
  const swell = progress(f, start - 1, start + 12, easeOut);
  const out = progress(f, end - 28, end, (t) => t * t);
  const opacity = swell * (1 - out);
  const scale = 1.045 - 0.045 * swell + 0.02 * progress(f, start, end);
  const track = interpolate(f, [start, end], [26, 34], clamp);
  const rule = progress(f, start + 2, start + 30, easeOut);
  const blur = (1 - swell) * 6 + out * 4;
  const flash = Math.max(0, 1 - Math.abs(f - start - 8) / 10) * 0.5;
  const ruleStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    [side === 'left' ? 'right' : 'left']: '100%',
    [side === 'left' ? 'marginRight' : 'marginLeft']: 34,
    width: 330 * rule,
    height: 2,
    marginTop: -1,
    background: `linear-gradient(${side === 'left' ? 'to left' : 'to right'}, ${palette.gold} 0%, rgba(201,164,92,0.6) 55%, rgba(201,164,92,0) 100%)`,
    boxShadow: '0 0 8px rgba(241,212,138,0.35)',
  });
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'}}>
      {/* A dark band behind the text keeps it legible over the fire. */}
      <div
        style={{
          position: 'absolute',
          width: 1500,
          height: 300,
          background: 'radial-gradient(ellipse at center, rgba(5,3,4,0.62) 0%, rgba(5,3,4,0.3) 45%, rgba(5,3,4,0) 72%)',
          opacity,
        }}
      />
      <div style={{position: 'relative', opacity, transform: `scale(${scale})`, filter: `blur(${blur}px)`}}>
        <div style={ruleStyle('left')} />
        <div style={ruleStyle('right')} />
        <div
          style={{
            fontFamily: fonts.cinzel,
            fontWeight: 400,
            fontSize: 110,
            letterSpacing: track,
            marginRight: -track,
            color: palette.bone,
            lineHeight: 1,
            textShadow: `0 0 18px rgba(241,212,138,${0.35 + flash}), 0 0 44px rgba(201,164,92,${0.28 + flash * 0.5}), 0 2px 4px rgba(0,0,0,0.9)`,
          }}
        >
          CLOGHEEN
        </div>
      </div>
    </AbsoluteFill>
  );
};
