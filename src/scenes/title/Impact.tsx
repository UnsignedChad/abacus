// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The boom: a flash from the title, a flattened shockwave ring and a sheet of
// dust blown outward along the ground plane of the letters.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {progress, rand} from '../../lib/fx';
import {C, CAP_MID_Y, INK_L, INK_R, WORD_X, WORD_Y, CAP_BOT, bellSwell} from './beats';

const T0 = C.titleBoom;
const BASE_Y = WORD_Y + CAP_BOT;

/** Warm bloom behind the title: spikes on the boom, then breathes. */
export const TitleGlow: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T0) return null;
  const t = f - T0;
  // A hot core right behind the letters silhouettes the charred word on the
  // boom, then it relaxes into the steady glow the gold sits in.
  const spike = Math.exp(-t / 7);
  const settle = progress(t, 4, 40);
  const a = 0.62 * spike + settle * (0.26 + 0.03 * noise2D('tglow', f * 0.03, 0)) + bellSwell(f) * 0.14;
  const w = 900 + 260 * spike;
  // The layer is sized to the ellipse (it is fully transparent outside it).
  const h = w * 0.3;
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - w,
        top: CAP_MID_Y - h,
        width: w * 2,
        height: h * 2,
        background: `radial-gradient(ellipse ${w}px ${h}px at 50% 50%, rgba(255,150,70,${a}) 0%, rgba(194,58,12,${
          a * 0.45
        }) 40%, rgba(120,10,12,0) 100%)`,
      }}
    />
  );
};

/** Anamorphic streak of light through the letters on the boom. */
const Streak: React.FC<{t: number}> = ({t}) => {
  const a = Math.exp(-t / 5) * Math.min(1, t + 1);
  if (a < 0.01) return null;
  const w = 1900 + t * 30;
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - w / 2,
        top: CAP_MID_Y - 5,
        width: w,
        height: 10,
        opacity: a,
        background: 'radial-gradient(closest-side, rgba(255,240,210,0.9), rgba(255,150,70,0.35) 40%, rgba(255,120,50,0))',
      }}
    />
  );
};

/** Dust blown outward from the letters, decelerating with drag. */
const Dust: React.FC<{t: number}> = ({t}) => {
  const out = [];
  for (let i = 0; i < 44; i++) {
    const s = `dust-${i}`;
    const x0 = WORD_X + rand(s + 'x', INK_L, INK_R);
    const dir = x0 < 960 ? -1 : 1;
    const v = rand(s + 'v', 6, 28) * (0.4 + Math.abs(x0 - 960) / 600);
    const tau = rand(s + 'tau', 10, 22);
    const travel = v * tau * (1 - Math.exp(-t / tau));
    const x = x0 + dir * travel + noise2D(s, t * 0.03, 0) * 20;
    const y = BASE_Y + rand(s + 'y', -40, 30) - t * rand(s + 'rise', 0.1, 0.6);
    const size = rand(s + 'sz', 60, 150) * (1 + t / 40);
    const life = rand(s + 'l', 50, 100);
    const a = rand(s + 'a', 0.06, 0.16) * Math.max(0, 1 - t / life) * Math.min(1, t / 3);
    if (a <= 0.004) continue;
    out.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size * 0.3,
          width: size,
          height: size * 0.6,
          background: `radial-gradient(closest-side, rgba(168,104,70,${a}), rgba(90,40,28,0))`,
        }}
      />,
    );
  }
  // Fine grit, faster and brighter, catching the flash.
  for (let i = 0; i < 44; i++) {
    const s = `grit-${i}`;
    const x0 = WORD_X + rand(s + 'x', INK_L, INK_R);
    const dir = x0 < 960 ? -1 : 1;
    const v = rand(s + 'v', 18, 45);
    const travel = v * 9 * (1 - Math.exp(-t / 9));
    const x = x0 + dir * travel;
    const y = BASE_Y + rand(s + 'y', -20, 20) - t * rand(s + 'up', 0, 0.8) + 0.02 * t * t;
    const a = Math.max(0, 1 - t / rand(s + 'l', 20, 40)) * 0.8;
    if (a <= 0.01) continue;
    out.push(
      <div
        key={`g${i}`}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: 2.5,
          height: 2.5,
          borderRadius: '50%',
          background: '#f2c283',
          opacity: a,
        }}
      />,
    );
  }
  return <>{out}</>;
};

export const Impact: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - T0;
  if (t < 0 || t > 110) return null;
  // Unscaled on purpose: the push-in is only ~2% while the dust lives, and a
  // scaled full-frame wrapper is expensive to rasterise.
  return (
    <AbsoluteFill>
      <Streak t={t} />
      <Dust t={t} />
    </AbsoluteFill>
  );
};

/** Screen-space flash on the boom: a short, tight bloom over the word only. */
export const Flash: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - T0;
  if (t < 0 || t > 14) return null;
  const a = Math.exp(-t / 2.2);
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - 820,
        top: CAP_MID_Y - 190,
        width: 1640,
        height: 380,
        background: `radial-gradient(ellipse 820px 190px at 50% 50%, rgba(255,232,190,${0.34 * a}) 0%, rgba(255,140,60,${
          0.14 * a
        }) 50%, rgba(120,20,10,0) 100%)`,
      }}
    />
  );
};
