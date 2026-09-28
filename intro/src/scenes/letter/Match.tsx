// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The match that lights the candle. It is held at the wick, drawn back and
// shaken out, then dropped onto the desk beside the dish, where its head
// smoulders and trails a thread of smoke. The stick sits under the room's
// light; its flame, ember and smoke are emitters drawn above it.

import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {clamp, easeIn, easeInOut, progress} from '../../lib/fx';
import {cues} from '../../theme';
import {CANDLE} from './layout';

const T0 = cues.letter.candleLight;
const LEN = 118;

type Pt = {x: number; y: number};

// Where the spent match comes to rest on the desk, just below the dish.
const REST = {x: CANDLE.x + 200, y: CANDLE.y + 150, a: 2.8};

export type MatchPose = {
  head: Pt;
  a: number; // stick direction from the head, radians
  flame: number; // 0..1.4 burning head
  ember: number; // 0..1 smouldering head once shaken out
  burnt: number; // 0..1 how far the char has crept down the stick
  down: number; // 0..1 how close it is to lying on the desk
  t: number;
};

export const matchPose = (frame: number, wick: Pt): MatchPose | null => {
  const t = frame - T0;
  if (t < 0) return null;
  // Held at the wick, then drawn back down and to the right.
  const away = progress(t, 6, 15, easeInOut);
  const held = {x: wick.x + 20 + away * 150, y: wick.y - 4 + away * 70};
  // Dropped: falls to the desk with gravity, turning as it goes.
  const fall = progress(t, 15, 24, easeIn);
  const bounce = t > 24 ? Math.sin((t - 24) * 0.9) * Math.exp(-(t - 24) * 0.35) * 6 : 0;
  const head = {
    x: held.x + (REST.x - held.x) * fall,
    y: held.y + (REST.y - held.y) * fall - bounce,
  };
  const a = 0.64 + (REST.a - 0.64) * progress(t, 13, 25, easeInOut) + bounce * 0.01;
  const flame = interpolate(t, [0, 1, 6, 11, 15], [1.2, 1.4, 1, 0.6, 0], clamp);
  const ember = t < 13 ? 0 : interpolate(t, [13, 16, 40, 110], [0, 1, 0.55, 0], clamp);
  const burnt = interpolate(t, [0, 15], [0.08, 0.26], clamp);
  return {head, a, flame, ember, burnt, down: fall, t};
};

/** The wooden stick; lives under the room's light. */
export const MatchStick: React.FC<{wick: Pt}> = ({wick}) => {
  const frame = useCurrentFrame();
  const p = matchPose(frame, wick);
  if (!p) return null;
  const deg = (p.a * 180) / Math.PI;
  const char = LEN * p.burnt;
  return (
    <div style={{position: 'absolute', left: p.head.x, top: p.head.y, transform: `rotate(${deg}deg)`}}>
      <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
        {/* contact shadow once it lies on the desk */}
        <rect x={0} y={1} width={LEN + 4} height={9} rx={4} fill="#000" opacity={0.55 * Math.pow(p.down, 3)} transform="translate(5 4)" />
        <rect x={0} y={-3} width={LEN} height={6} rx={2} fill="#b8905e" />
        <rect x={0} y={-3} width={LEN} height={2} rx={1} fill="#e2c28e" opacity={0.7} />
        <rect x={0} y={1.5} width={LEN} height={1.5} fill="#6a4a2a" opacity={0.8} />
        {/* char creeping down from the head, curled slightly */}
        <path d={`M 0 -3 L ${char} -2.6 Q ${char + 5} 0 ${char} 2.8 L 0 3 Z`} fill="#1c0f08" />
        <ellipse cx={-2} cy={0} rx={8} ry={6} fill="#241008" />
        <ellipse cx={-4} cy={-2} rx={3} ry={2} fill="#6a4030" opacity={0.6} />
      </svg>
    </div>
  );
};

/** Burning head, then the smouldering ember and its smoke thread. */
export const MatchFx: React.FC<{wick: Pt}> = ({wick}) => {
  const frame = useCurrentFrame();
  const p = matchPose(frame, wick);
  if (!p || p.t > 130) return null;
  const fl = Math.min(1.2, p.flame);
  // Motion drags the flame back along the stroke.
  const drag = p.t >= 6 && p.t < 15 ? 22 : 10;
  const segs = [];
  if (p.t > 13) {
    const age = p.t - 13;
    const top = Math.min(260, age * 4.2);
    let px = p.head.x - 3;
    let py = p.head.y - 4;
    for (let s = 14; s <= top; s += 14) {
      const emitted = age - s / 4.2;
      const e = interpolate(emitted, [0, 4, 30, 90], [0, 1, 0.6, 0], clamp);
      const x = p.head.x - 3 + noise2D('msmoke', s * 0.01 - frame * 0.03, 1) * (2 + s * 0.14);
      const y = p.head.y - 4 - s;
      const a = e * (1 - s / 280) * 0.5 * Math.min(1, age / 4) * interpolate(p.t, [60, 130], [1, 0], clamp);
      if (a > 0.01) {
        segs.push(
          <line key={s} x1={px} y1={py} x2={x} y2={y} stroke="#cfc6bc" strokeOpacity={a} strokeWidth={1.6 + s * 0.02} strokeLinecap="round" />,
        );
      }
      px = x;
      py = y;
    }
  }
  return (
    <>
      {fl > 0.01 ? (
        <div style={{position: 'absolute', left: p.head.x, top: p.head.y}}>
          <div
            style={{
              position: 'absolute',
              left: -60,
              top: -60,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(255,236,190,${Math.min(1, fl)}) 0%, rgba(255,190,110,${
                0.45 * fl
              }) 25%, rgba(255,150,60,0) 70%)`,
              mixBlendMode: 'screen',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -7,
              top: -30 * fl,
              width: 14,
              height: 30 * fl,
              borderRadius: '50% 50% 45% 45% / 70% 70% 30% 30%',
              background: 'linear-gradient(to top, rgba(120,140,255,0.6), #ffe7a8 35%, rgba(255,140,40,0.2))',
              opacity: Math.min(1, fl),
              transformOrigin: '50% 100%',
              transform: `skewX(${10 + drag}deg)`,
            }}
          />
        </div>
      ) : null}
      {p.ember > 0.01 ? (
        <div style={{position: 'absolute', left: p.head.x - 2, top: p.head.y}}>
          <div
            style={{
              position: 'absolute',
              left: -16,
              top: -16,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(255,120,40,${0.8 * p.ember}) 0%, rgba(255,80,20,${0.25 * p.ember}) 40%, rgba(255,60,10,0) 70%)`,
              mixBlendMode: 'screen',
            }}
          />
          <div style={{position: 'absolute', left: -3, top: -2.5, width: 6, height: 5, borderRadius: 3, background: '#ff9a50', opacity: p.ember}} />
        </div>
      ) : null}
      {segs.length ? (
        <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          {segs}
        </svg>
      ) : null}
    </>
  );
};
