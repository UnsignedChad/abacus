// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The quiet type under the title: an ornamental rule, the subtitle, the
// tagline, and the copyright line above the bottom letterbox bar.

import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {fonts} from '../../fonts';
import {easeOut, progress} from '../../lib/fx';
import {palette} from '../../theme';
import {C, CAP_BOT, WORD_Y, bellSwell} from './beats';

const RULE_Y = WORD_Y + CAP_BOT + 62;
const RULE_HALF = 380;

/** Tapered hairline with a lozenge at its heart, drawn outward from centre. */
const Rule: React.FC<{f: number}> = ({f}) => {
  const p = progress(f, C.subtitleIn - 1, C.subtitleIn + 28, Easing.out(Easing.cubic));
  if (p <= 0) return null;
  const gem = progress(f, C.subtitleIn - 1, C.subtitleIn + 10, Easing.out(Easing.back(2)));
  const len = RULE_HALF * p;
  const cx = 960;
  // A bead of light runs out to each tip as it draws.
  const bead = p < 1 ? 1 : Math.max(0, 1 - (f - C.subtitleIn - 28) / 10);
  const arm = (dir: number) => {
    const x0 = cx + dir * 26;
    const x1 = cx + dir * (26 + len);
    return `M${x0},${RULE_Y - 1.3}L${x1},${RULE_Y}L${x0},${RULE_Y + 1.3}Z`;
  };
  const tips = [cx - 26 - len, cx + 26 + len];
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <radialGradient id="title-bead">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#ff9a40" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g fill={palette.gold} opacity={0.85}>
        <path d={arm(-1)} />
        <path d={arm(1)} />
        <g transform={`translate(${cx} ${RULE_Y}) scale(${gem})`}>
          <path d="M0,-9L9,0L0,9L-9,0Z" fill="none" stroke={palette.gold} strokeWidth={1.4} />
          <path d="M0,-4L4,0L0,4L-4,0Z" />
          <circle cx={-17} cy={0} r={1.8} />
          <circle cx={17} cy={0} r={1.8} />
        </g>
      </g>
      {bead > 0 &&
        tips.map((x, i) => <circle key={i} cx={x} cy={RULE_Y} r={10} fill="url(#title-bead)" opacity={bead} />)}
    </svg>
  );
};

export const Credits: React.FC = () => {
  const f = useCurrentFrame();

  const subIn = progress(f, C.subtitleIn + 8, C.subtitleIn + 48, easeOut);
  const tagIn = progress(f, C.taglineIn - 1, C.taglineIn + 36, easeOut);
  const copyIn = progress(f, C.copyrightIn - 1, C.copyrightIn + 30, easeOut);
  const bell = bellSwell(f);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Rule f={f} />
      {subIn > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: RULE_Y + 22,
            textAlign: 'center',
            fontFamily: fonts.cinzel,
            fontWeight: 400,
            fontSize: 28,
            // Tracking settles in as it fades up; trailing space is balanced.
            letterSpacing: `${0.62 - 0.14 * subIn}em`,
            paddingLeft: `${0.62 - 0.14 * subIn}em`,
            color: palette.bone,
            opacity: subIn * (0.82 + 0.1 * bell),
            textShadow: '0 0 12px rgba(0,0,0,0.9), 0 2px 3px #000',
          }}
        >
          BENEATH THE OLD CHURCH
        </div>
      )}
      {tagIn > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: RULE_Y + 88,
            textAlign: 'center',
            fontFamily: fonts.cormorant,
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 40,
            letterSpacing: '0.04em',
            color: '#cfae8a',
            opacity: tagIn * 0.8,
            filter: tagIn < 1 ? `blur(${(1 - tagIn) * 6}px)` : undefined,
            transform: `translateY(${(1 - tagIn) * 8}px)`,
            textShadow: '0 0 14px rgba(0,0,0,0.95), 0 0 30px rgba(120,20,10,0.5)',
          }}
        >
          Merlin is waiting.
        </div>
      )}
      {copyIn > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 890,
            textAlign: 'center',
            fontFamily: fonts.cinzel,
            fontWeight: 400,
            fontSize: 17,
            letterSpacing: '0.22em',
            paddingLeft: '0.22em',
            color: palette.bone,
            opacity: copyIn * 0.42,
            textShadow: '0 0 8px #000',
          }}
        >
          © 2026 Charles Kennedy
        </div>
      )}
    </AbsoluteFill>
  );
};
