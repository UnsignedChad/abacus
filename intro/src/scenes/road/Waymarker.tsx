// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// A crooked wooden waymarker by the roadside. The arrow board, carved with
// the town's name, points on toward Clogheen; a lower board has split away.
// A rag tied to the post flutters in the wind.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {fonts} from '../../fonts';
import {project} from './camera';
import {Layer} from './util';

// On the far verge of the road, just behind the traveler's line, so he walks
// past in front of it (around frame 350) rather than vanishing behind it.
export const SIGN = {x: 1965, y: 821, par: 0.985, scale: 0.94};

const WOOD = '#3a2922';
const WOOD_DARK = '#1b120e';

const Grain: React.FC<{x: number; y: number; w: number; h: number; seed: string}> = ({x, y, w, h, seed}) => {
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const yy = y + ((i + 0.5) / 6) * h;
    let d = `M${x + 4},${yy}`;
    for (let k = 1; k <= 8; k++) {
      const xx = x + 4 + ((w - 8) * k) / 8;
      d += ` L${xx},${yy + noise2D(seed + i, k * 0.4, 0) * 2.2}`;
    }
    lines.push(<path key={i} d={d} stroke="rgba(10,5,4,0.45)" strokeWidth={1} fill="none" />);
  }
  return <>{lines}</>;
};

export const Waymarker: React.FC = () => {
  const f = useCurrentFrame();
  const sway = noise2D('signsway', f * 0.03, 0) * 1.2;
  const rag = (k: number) => noise2D('rag' + k, f * 0.12, k) * 5;
  const H = 196;
  return (
    <Layer p={project(f, SIGN.par)}>
      <svg width={3000} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id="rd-board" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a4032" />
            <stop offset="0.25" stopColor={WOOD} />
            <stop offset="1" stopColor="#24170f" />
          </linearGradient>
          <linearGradient id="rd-post" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6a4430" />
            <stop offset="0.25" stopColor="#2a1c16" />
            <stop offset="1" stopColor="#140c0a" />
          </linearGradient>
        </defs>
        <g transform={`translate(${SIGN.x},${SIGN.y}) rotate(-3.5) scale(${SIGN.scale})`}>
          {/* Grass-choked foot of the post and its shadow. */}
          <ellipse cx={4} cy={2} rx={40} ry={6} fill="rgba(0,0,0,0.5)" />
          {/* Post. */}
          <path
            d={`M-11,4 L-10,${-H + 12} L-4,${-H} L9,${-H + 4} L11,4 Z`}
            fill="url(#rd-post)"
            stroke="rgba(255,150,90,0.35)"
            strokeWidth={0.8}
          />
          <path d={`M-6,-40 L-7,${-H + 40} M4,-80 L3,${-H + 90}`} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
          {/* The rag. */}
          <path
            d={`M-9,${-H + 80} Q-30,${-H + 78 + rag(0)} -50,${-H + 84 + rag(1)} L-46,${-H + 91 + rag(2)} Q-28,${-H + 90 + rag(1)} -9,${-H + 92} Z`}
            fill="#4a1414"
            opacity={0.9}
          />
          {/* Arrow board pointing on to the town. */}
          <g transform={`translate(0,${-H + 44}) rotate(${-2 + sway})`}>
            <path d="M-26,-30 L250,-32 L292,0 L250,32 L-26,30 Z" fill="#0c0706" transform="translate(3,4)" />
            <path d="M-26,-30 L250,-32 L292,0 L250,32 L-26,30 Z" fill="url(#rd-board)" />
            <path
              d="M-26,-30 L250,-32 L292,0"
              fill="none"
              stroke="rgba(255,170,110,0.45)"
              strokeWidth={1.4}
            />
            <Grain x={-26} y={-30} w={276} h={60} seed="gA" />
            {/* Carved letters: a lit lower lip under a dark groove. */}
            <text
              x={128}
              y={15}
              textAnchor="middle"
              fontFamily={fonts.cinzel}
              fontWeight={700}
              fontSize={40}
              letterSpacing={5}
              fill="rgba(200,150,110,0.35)"
              transform="translate(0,1.6)"
            >
              CLOGHEEN
            </text>
            <text
              x={128}
              y={15}
              textAnchor="middle"
              fontFamily={fonts.cinzel}
              fontWeight={700}
              fontSize={40}
              letterSpacing={5}
              fill={WOOD_DARK}
            >
              CLOGHEEN
            </text>
            {/* Nail heads. */}
            <circle cx={-12} cy={-16} r={2.2} fill="#0a0605" />
            <circle cx={-12} cy={16} r={2.2} fill="#0a0605" />
          </g>
          {/* Lower board, split and hanging askew from a single nail. */}
          <g transform={`translate(4,${-H + 108}) rotate(${14 + sway * 1.6})`}>
            <path d="M-6,-15 L150,-14 L168,1 L150,16 L60,15 L44,5 L30,14 L-6,14 Z" fill="url(#rd-board)" />
            <path d="M-6,-15 L150,-14 L168,1" fill="none" stroke="rgba(255,170,110,0.35)" strokeWidth={1.2} />
            <Grain x={-6} y={-14} w={160} h={28} seed="gB" />
            <path d="M24,-4 L36,6 M58,-6 L62,8 M80,-2 L94,-4" stroke={WOOD_DARK} strokeWidth={3} />
            <circle cx={2} cy={0} r={2} fill="#0a0605" />
          </g>
          {/* Cap. */}
          <path d={`M-14,${-H + 2} L-4,${-H - 10} L12,${-H + 2} Z`} fill="#150d0a" />
        </g>
      </svg>
    </Layer>
  );
};
