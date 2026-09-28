// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// A tallow stub in a brass chamberstick. The body sits under the room's
// lighting; the flame, its bloom, the match and the smoke are emitters and
// draw above it. Local origin is the dish's footprint centre on the desk.

import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {clamp, easeInOut, progress, rand} from '../../lib/fx';
import {cues} from '../../theme';
import {FLAME_Y} from './layout';
import {FlameState, GUST, OUT, flameAt, gustAmount} from './flame';

const TOP = -236; // candle top (y of the wax pool)
const R = 42; // candle radius

const Ellipse: React.FC<React.SVGProps<SVGEllipseElement>> = (p) => <ellipse {...p} />;

/** Brass dish, socket and handle. Never skewed: it lies on the desk. */
const Dish: React.FC = () => (
  <g>
    <defs>
      <radialGradient id="lt-dish" cx="0.42" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#d8b46a" />
        <stop offset="0.3" stopColor="#8e6a2c" />
        <stop offset="0.7" stopColor="#4a3414" />
        <stop offset="1" stopColor="#1c1308" />
      </radialGradient>
      <radialGradient id="lt-well" cx="0.5" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#b48a44" />
        <stop offset="0.5" stopColor="#5e421a" />
        <stop offset="1" stopColor="#2a1c0a" />
      </radialGradient>
      <linearGradient id="lt-sock" x1="0" x2="1">
        <stop offset="0" stopColor="#4a3312" />
        <stop offset="0.3" stopColor="#e6c274" />
        <stop offset="0.55" stopColor="#9c7430" />
        <stop offset="1" stopColor="#2c1d0a" />
      </linearGradient>
    </defs>
    <Ellipse cx={0} cy={2} rx={176} ry={76} fill="#1f150a" />
    <Ellipse cx={0} cy={-12} rx={174} ry={74} fill="url(#lt-dish)" />
    <Ellipse cx={0} cy={-10} rx={148} ry={60} fill="url(#lt-well)" />
    <path d="M -168 -2 A 174 74 0 0 0 168 -2" fill="none" stroke="#f3d690" strokeOpacity={0.35} strokeWidth={2} />
    {/* spun-brass rings */}
    {[128, 110, 92].map((rx, i) => (
      <Ellipse key={i} cx={0} cy={-10} rx={rx} ry={rx * 0.41} fill="none" stroke="#e8c47a" strokeOpacity={0.1} strokeWidth={1.5} />
    ))}
    <path d="M -150 -30 A 170 72 0 0 1 60 -84" fill="none" stroke="#1a1006" strokeOpacity={0.5} strokeWidth={3} />
    {/* handle ring */}
    <Ellipse cx={196} cy={-16} rx={44} ry={24} fill="none" stroke="#2c1d0a" strokeWidth={14} />
    <Ellipse cx={196} cy={-19} rx={44} ry={24} fill="none" stroke="#7a5a26" strokeWidth={10} />
    <path d="M 156 -24 A 44 24 0 0 1 236 -24" fill="none" stroke="#f1d48a" strokeOpacity={0.3} strokeWidth={3} />
    {/* wax puddle that ran down onto the dish */}
    <path
      d="M 22 -6 C 60 -12, 96 2, 88 18 C 80 30, 40 26, 30 14 C 20 6, 6 2, 22 -6 Z"
      fill="#e7d6b2"
      opacity={0.92}
    />
    <path d="M 40 0 C 60 -2, 80 6, 78 14" fill="none" stroke="#fff4dc" strokeOpacity={0.5} strokeWidth={2} />
  </g>
);

/** The standing parts, drawn upright; the caller skews them for parallax. */
const Stick: React.FC<{frame: number; lit: number}> = ({frame, lit}) => {
  // The slow drip: a bead of tallow creeps down the front of the candle.
  const dripP = progress(frame, 60, 520, easeInOut);
  const dripY = TOP + 18 + dripP * 112;
  const bead = 5 + dripP * 3;
  return (
    <g>
      <defs>
        <linearGradient id="lt-wax" x1="0" x2="1">
          <stop offset="0" stopColor="#4a3424" />
          <stop offset="0.2" stopColor="#bc9c6e" />
          <stop offset="0.42" stopColor="#ead3a2" />
          <stop offset="0.78" stopColor="#95744c" />
          <stop offset="1" stopColor="#35241a" />
        </linearGradient>
        {/* Tallow is translucent: the flame lights the top from inside. */}
        <linearGradient id="lt-glow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd28a" stopOpacity={0.95} />
          <stop offset="0.16" stopColor="#ffb45c" stopOpacity={0.75} />
          <stop offset="0.45" stopColor="#e88a3c" stopOpacity={0.25} />
          <stop offset="1" stopColor="#e88a3c" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="lt-waxdark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#140a04" stopOpacity={0} />
          <stop offset="0.45" stopColor="#140a04" stopOpacity={0.2} />
          <stop offset="1" stopColor="#140a04" stopOpacity={0.72} />
        </linearGradient>
        <linearGradient id="lt-drip" x1="0" x2="1">
          <stop offset="0" stopColor="#fff6e0" />
          <stop offset="0.45" stopColor="#e4d2aa" />
          <stop offset="1" stopColor="#8a7050" />
        </linearGradient>
        <radialGradient id="lt-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff0c0" />
          <stop offset="0.6" stopColor="#ffd07c" />
          <stop offset="1" stopColor="#e7c48a" />
        </radialGradient>
      </defs>
      {/* socket */}
      <path d="M -54 -14 L -54 -46 A 54 20 0 0 0 54 -46 L 54 -14 A 54 20 0 0 1 -54 -14 Z" fill="url(#lt-sock)" />
      <Ellipse cx={0} cy={-46} rx={54} ry={20} fill="#7a5a26" />
      <Ellipse cx={0} cy={-47} rx={46} ry={16} fill="#2a1c0a" />
      {/* candle body */}
      <path
        d={`M ${-R} -44 L ${-R} ${TOP} A ${R} 19 0 0 0 ${R} ${TOP} L ${R} -44 A ${R} 19 0 0 1 ${-R} -44 Z`}
        fill="url(#lt-wax)"
      />
      <path
        d={`M ${-R} -44 L ${-R} ${TOP} A ${R} 19 0 0 0 ${R} ${TOP} L ${R} -44 A ${R} 19 0 0 1 ${-R} -44 Z`}
        fill="url(#lt-glow)"
        opacity={lit}
      />
      <path
        d={`M ${-R} -44 L ${-R} ${TOP} A ${R} 19 0 0 0 ${R} ${TOP} L ${R} -44 A ${R} 19 0 0 1 ${-R} -44 Z`}
        fill="url(#lt-waxdark)"
      />
      {/* frozen drips */}
      <path
        d={`M -24 ${TOP + 14} C -28 ${TOP + 50}, -26 ${TOP + 70}, -30 ${TOP + 96} C -33 ${TOP + 108}, -20 ${TOP + 110}, -21 ${
          TOP + 96
        } C -22 ${TOP + 70}, -18 ${TOP + 40}, -16 ${TOP + 16} Z`}
        fill="url(#lt-drip)"
        opacity={0.85}
      />
      <path
        d={`M 24 ${TOP + 16} C 22 ${TOP + 70}, 34 ${TOP + 130}, 30 ${TOP + 175} C 29 ${TOP + 190}, 44 ${TOP + 192}, 42 ${
          TOP + 176
        } C 40 ${TOP + 130}, 42 ${TOP + 60}, 44 ${TOP + 12} Z`}
        fill="url(#lt-drip)"
        opacity={0.8}
      />
      <path
        d={`M 44 ${TOP + 12} C 42 ${TOP + 60}, 40 ${TOP + 130}, 42 ${TOP + 176}`}
        stroke="#3a2a1a"
        strokeOpacity={0.45}
        strokeWidth={2}
        fill="none"
      />
      <path d={`M -37 ${TOP + 10} C -39 ${TOP + 30}, -35 ${TOP + 36}, -37 ${TOP + 48}`} stroke="#eadcbc" strokeOpacity={0.7} strokeWidth={6} strokeLinecap="round" fill="none" />
      {/* the live drip */}
      <path
        d={`M 6 ${TOP + 14} C 4 ${TOP + 30}, 8 ${dripY - 20}, 6 ${dripY}`}
        stroke="#f4e7c8"
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx={7.5} cy={dripY + 3.5} rx={bead * 0.9} ry={bead * 1.15} fill="#5a4630" opacity={0.5} />
      <Ellipse cx={6} cy={dripY + 2} rx={bead * 0.9} ry={bead * 1.15} fill="url(#lt-drip)" />
      <Ellipse cx={4} cy={dripY - 1} rx={bead * 0.3} ry={bead * 0.4} fill="#fffaf0" opacity={0.8} />
      {/* top: raised lip and the molten pool */}
      <Ellipse cx={0} cy={TOP} rx={R} ry={19} fill="#e9dab8" />
      <Ellipse cx={0} cy={TOP + 1} rx={R - 8} ry={14} fill="url(#lt-pool)" opacity={0.35 + 0.65 * lit} />
      <path
        d={`M ${-R + 2} ${TOP} C ${-R + 6} ${TOP - 9}, ${-20} ${TOP - 14}, 0 ${TOP - 12}`}
        stroke="#fff6e0"
        strokeOpacity={0.6}
        strokeWidth={3}
        fill="none"
      />
    </g>
  );
};

/** Candle body + dish. `skew` is the parallax lean in px at the wick. */
export const CandleBody: React.FC<{lit: number; skew: number}> = ({lit, skew}) => {
  const frame = useCurrentFrame();
  const W = 520;
  const H = 360;
  // skewX maps y=FLAME_Y to x+skew, so the wick lands where the flame is drawn.
  const skewDeg = (Math.atan(skew / FLAME_Y) * 180) / Math.PI;
  return (
    <div style={{position: 'absolute', left: -W / 2, top: -H + 90, width: W, height: H}}>
      <svg width={W} height={H} viewBox={`${-W / 2} ${-H + 90} ${W} ${H}`} style={{position: 'absolute', overflow: 'visible'}}>
        <Dish />
        {/* The flame caught in the polished brass: rim, well and ring. */}
        <g opacity={Math.min(1, lit)} fill="#fff1c8">
          <Ellipse cx={-6} cy={-78} rx={34} ry={4} opacity={0.55} />
          <Ellipse cx={-112} cy={-60} rx={16} ry={2.6} opacity={0.5} transform="rotate(-24 -112 -60)" />
          <Ellipse cx={104} cy={-64} rx={14} ry={2.4} opacity={0.4} transform="rotate(22 104 -64)" />
          <Ellipse cx={182} cy={-40} rx={11} ry={2.4} opacity={0.65} transform="rotate(-12 182 -40)" />
        </g>
        <g transform={`skewX(${skewDeg})`}>
          <Stick frame={frame} lit={lit} />
          {/* wick */}
          <path d={`M 0 ${TOP - 2} Q 3 ${TOP - 14} -2 ${FLAME_Y + 6}`} stroke="#140b06" strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------ flame

const teardrop = (w: number, h: number, lean: number, bend: number) => {
  const tipX = lean * h + bend * h * 0.6;
  const midX = lean * h * 0.45;
  const hw = w / 2;
  return [
    `M ${-hw} ${-h * 0.18}`,
    `C ${-hw} ${h * 0.06}, ${hw} ${h * 0.06}, ${hw} ${-h * 0.18}`,
    `C ${hw + midX * 0.3} ${-h * 0.45}, ${midX + hw * 0.35} ${-h * 0.72}, ${tipX} ${-h}`,
    `C ${midX - hw * 0.45} ${-h * 0.7}, ${-hw + midX * 0.3} ${-h * 0.45}, ${-hw} ${-h * 0.18}`,
    'Z',
  ].join(' ');
};

const FlameShape: React.FC<{s: FlameState}> = ({s}) => {
  const h = 132 * s.size * s.height;
  const w = 38 * Math.max(0.25, s.size) * s.width;
  if (s.size < 0.01) return null;
  const outer = teardrop(w * 1.5, h * 1.12, s.lean, s.bend);
  const body = teardrop(w, h, s.lean, s.bend);
  const core = teardrop(w * 0.52, h * 0.5, s.lean * 0.6, s.bend * 0.5);
  return (
    <svg width={400} height={400} viewBox="-200 -300 400 400" style={{position: 'absolute', left: -200, top: -300, overflow: 'visible', mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id="lt-fl" gradientUnits="userSpaceOnUse" x1={0} y1={6} x2={0} y2={-h}>
          <stop offset="0" stopColor="#4a64ff" stopOpacity={0.55} />
          <stop offset="0.1" stopColor="#ff9a3c" stopOpacity={0.85} />
          <stop offset="0.3" stopColor="#ffd98a" />
          <stop offset="0.62" stopColor="#ffab48" />
          <stop offset="0.88" stopColor="#e2561c" stopOpacity={0.7} />
          <stop offset="1" stopColor="#b8300c" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="lt-core" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={-h * 0.5}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.4} />
          <stop offset="0.3" stopColor="#fffbe8" />
          <stop offset="1" stopColor="#fff0c0" stopOpacity={0.2} />
        </linearGradient>
        <filter id="lt-soft" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation={5} />
        </filter>
        <filter id="lt-soft2" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation={1.4} />
        </filter>
      </defs>
      <path d={outer} fill="#ff8a30" opacity={0.45} filter="url(#lt-soft)" />
      <g filter="url(#lt-soft2)">
        <path d={body} fill="url(#lt-fl)" />
        <path d={core} fill="url(#lt-core)" transform={`translate(0 ${-h * 0.04})`} />
        <ellipse cx={0} cy={-2} rx={w * 0.42} ry={w * 0.22} fill="#5a78ff" opacity={0.45} />
        <path d={`M 0 4 Q 1 ${-h * 0.1} ${s.lean * h * 0.15} ${-h * 0.2}`} stroke="#3a1a08" strokeOpacity={0.55} strokeWidth={2.5} fill="none" />
      </g>
    </svg>
  );
};

const Glow: React.FC<{r: number; color: string; alpha: number; y?: number; blend?: 'screen' | 'normal'}> = ({
  r,
  color,
  alpha,
  y = 0,
  blend = 'screen',
}) =>
  alpha <= 0.002 ? null : (
    <div
      style={{
        position: 'absolute',
        left: -r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${color},${alpha}) 0%, rgba(${color},${alpha * 0.45}) 22%, rgba(${color},${
          alpha * 0.12
        }) 50%, rgba(${color},0) 72%)`,
        mixBlendMode: blend,
      }}
    />
  );

/** Match strike: a hard flare and a spray of sparks at the wick. The match
 * itself (stick, head flame, ember) lives in Match.tsx. */
const MatchFlare: React.FC<{frame: number; s: FlameState}> = ({frame, s}) => {
  const t = frame - cues.letter.candleLight;
  if (t < 0 || t > 26) return null;
  const sparks = [];
  for (let i = 0; i < 16; i++) {
    const life = t / rand('ms' + i, 7, 14);
    if (life > 1) continue;
    const ang = rand('ma' + i, -Math.PI, 0.3);
    const v = rand('mv' + i, 3, 9);
    const x = 20 + Math.cos(ang) * v * t;
    const y = -4 + Math.sin(ang) * v * t + 0.35 * t * t;
    sparks.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - 2,
          top: y - 2,
          width: 4,
          height: 4,
          borderRadius: 2,
          background: '#fff2c8',
          opacity: 1 - life,
          boxShadow: '0 0 8px 3px rgba(255,160,60,0.8)',
        }}
      />,
    );
  }
  return (
    <>
      <Glow r={420 * (0.6 + 0.4 * s.match)} color="255,196,120" alpha={0.6 * s.match} y={0} />
      <Glow r={70} color="255,250,230" alpha={Math.min(1, s.match * 1.3)} y={-4} />
      {sparks}
    </>
  );
};

/** Thin curl of smoke rising from the dead wick. */
const Smoke: React.FC<{frame: number}> = ({frame}) => {
  const age = frame - OUT + 2;
  if (age <= 0) return null;
  const speed = 6.5;
  const top = Math.min(700, age * speed);
  const strands = [];
  for (let j = 0; j < 3; j++) {
    const segs = [];
    const step = 12;
    let px = 0;
    let py = 0;
    for (let sPos = 0; sPos <= top; sPos += step) {
      const emitted = age - sPos / speed; // how long ago this puff left the wick
      const e = interpolate(emitted, [0, 3, 26, 60], [0, 1, 0.6, 0.12], clamp);
      const amp = 2 + sPos * (0.16 + j * 0.04);
      const wind = -gustAmount(frame - sPos / speed) * sPos * 0.25;
      const x = amp * noise2D('smoke', sPos * 0.008 - frame * 0.02, j * 4.1) + wind + j * 2;
      const y = -sPos;
      if (sPos > 0) {
        const a = e * (1 - sPos / 720) * (0.85 - j * 0.2);
        if (a > 0.01) {
          segs.push(
            <line
              key={sPos}
              x1={px}
              y1={py}
              x2={x}
              y2={y}
              stroke={sPos < 50 ? '#f0cfa8' : '#d6d0ca'}
              strokeOpacity={a}
              strokeWidth={2 + sPos * 0.05 + j * 1.5}
              strokeLinecap="round"
            />,
          );
        }
      }
      px = x;
      py = y;
    }
    strands.push(<g key={j}>{segs}</g>);
  }
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        <filter id="lt-smoke" x="-2" y="-2" width="4" height="4">
          <feGaussianBlur stdDeviation={1.8} />
        </filter>
      </defs>
      <g filter="url(#lt-smoke)">{strands}</g>
    </svg>
  );
};

/** Tongues of flame and sparks the gust tears off and carries away left. */
const GustWisps: React.FC<{frame: number}> = ({frame}) => {
  const out = [];
  for (let i = 0; i < 9; i++) {
    const born = GUST + 1 + i * 2.4 + rand('wb' + i, 0, 1.5);
    const age = frame - born;
    const spark = i % 3 === 2;
    const life = spark ? 16 : 7;
    if (age < 0 || age > life) continue;
    const u = age / life;
    const v = rand('wv' + i, 16, 26) * (spark ? 1.3 : 1);
    const x = -30 - age * v + noise2D('wisp', age * 0.3, i) * 10;
    const y = -40 - age * rand('wu' + i, 1.5, 4) + (spark ? 0.25 * age * age : 0) + noise2D('wisp', age * 0.3, i + 9) * 6;
    // Wisps only exist while there is still a flame to tear.
    const strength = flameAt(Math.floor(born)).size;
    const a = (1 - u) * (1 - u) * strength;
    if (a < 0.02) continue;
    const len = spark ? 10 : 34 * (1 - u * 0.5);
    const th = spark ? 3 : 9 * (1 - u);
    out.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - len / 2,
          top: y - th / 2,
          width: len,
          height: th,
          borderRadius: th,
          opacity: a,
          background: spark
            ? '#fff0c8'
            : 'linear-gradient(90deg, rgba(255,120,40,0), rgba(255,170,80,0.9) 55%, rgba(255,230,170,1))',
          boxShadow: spark ? '0 0 6px 2px rgba(255,150,60,0.8)' : '0 0 12px 3px rgba(255,130,50,0.45)',
          transform: `rotate(${-8 + noise2D('wisp', age * 0.2, i + 20) * 14}deg)`,
          mixBlendMode: 'screen',
        }}
      />,
    );
  }
  return <>{out}</>;
};

/** Everything emissive at the wick. Origin: the wick tip. */
export const CandleFlame: React.FC<{s: FlameState}> = ({s}) => {
  const frame = useCurrentFrame();
  const h = 132 * s.size * s.height;
  const cy = -h * 0.42;
  const tipLean = s.lean * h * 0.4;
  return (
    <div style={{position: 'absolute', left: 0, top: 0}}>
      <Glow r={1100} color="255,130,45" alpha={0.13 * s.light} y={cy} />
      <Glow r={420} color="255,170,90" alpha={0.3 * s.light} y={cy} />
      <Glow r={170} color="255,205,140" alpha={0.5 * s.light} y={cy} />
      <div style={{position: 'absolute', left: tipLean, top: 0}}>
        <Glow r={80 * Math.max(0.3, s.size)} color="255,236,190" alpha={0.8 * s.size} y={cy} />
      </div>
      <FlameShape s={s} />
      {/* ember at the wick tip once the flame is gone */}
      <Glow r={26} color="255,90,30" alpha={0.9 * s.ember} y={-2} />
      {s.ember > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: -3,
            top: -5,
            width: 6,
            height: 6,
            borderRadius: 3,
            background: '#ffb070',
            opacity: s.ember,
          }}
        />
      ) : null}
      <GustWisps frame={frame} />
      <MatchFlare frame={frame} s={s} />
      <Smoke frame={frame} />
    </div>
  );
};
