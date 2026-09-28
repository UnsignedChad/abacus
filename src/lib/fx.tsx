// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Shared cinematic primitives. Everything here is a pure function of the
// current frame so renders are deterministic and parallel-safe.

import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, Easing} from 'remotion';
import {noise2D} from '@remotion/noise';
import {fonts} from '../fonts';
import {palette} from '../theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0→1 over [start, end] with clamping and an optional easing. */
export const progress = (
  frame: number,
  start: number,
  end: number,
  easing: (t: number) => number = (t) => t,
) => interpolate(frame, [start, end], [0, 1], {...clamp, easing});

/** Opacity for a fade-in then fade-out window. */
export const fadeWindow = (
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
) =>
  interpolate(frame, [inStart, inEnd, outStart, outEnd], [0, 1, 1, 0], clamp);

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);

/** Deterministic random in [min, max). */
export const rand = (seed: string | number, min = 0, max = 1) =>
  min + random(seed) * (max - min);

/**
 * Camera shake. Pass impact frames; each decays over `decay` frames.
 * Returns a CSS transform string to apply to a wrapping element.
 */
export const useShake = (
  impacts: {frame: number; strength: number; decay?: number}[],
  seed = 'shake',
) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  let r = 0;
  for (const imp of impacts) {
    const t = frame - imp.frame;
    const decay = imp.decay ?? 18;
    if (t < 0 || t > decay) continue;
    const amp = imp.strength * Math.pow(1 - t / decay, 2);
    x += noise2D(seed + 'x', t * 0.9, imp.frame) * amp;
    y += noise2D(seed + 'y', t * 0.9, imp.frame) * amp;
    r += noise2D(seed + 'r', t * 0.7, imp.frame) * amp * 0.04;
  }
  return `translate(${x}px, ${y}px) rotate(${r}deg)`;
};

/**
 * Film grain. Rendered at half resolution and scaled up, so it stays cheap.
 * Changes every other frame for an organic 12fps-ish shimmer.
 */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.09}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 97;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity, mixBlendMode: 'overlay'}}>
      <svg
        width={960}
        height={540}
        style={{transform: 'scale(2)', transformOrigin: '0 0'}}
      >
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Dark radial vignette. */
export const Vignette: React.FC<{strength?: number; color?: string}> = ({
  strength = 0.75,
  color = '0,0,0',
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at 50% 48%, rgba(${color},0) 40%, rgba(${color},${
        strength * 0.6
      }) 75%, rgba(${color},${strength}) 100%)`,
    }}
  />
);

/** Cinematic 2.39:1 letterbox bars. `amount` 0..1 animates them in. */
export const Letterbox: React.FC<{amount?: number}> = ({amount = 1}) => {
  const bar = 138 * amount;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000'}} />
    </AbsoluteFill>
  );
};

/** Full-frame black (or colored) fade layer. */
export const FadeLayer: React.FC<{opacity: number; color?: string}> = ({opacity, color = '#000'}) =>
  opacity <= 0 ? null : (
    <AbsoluteFill style={{background: color, opacity, pointerEvents: 'none'}} />
  );

/**
 * Narration subtitle in the lower third. Fades and gently un-blurs in,
 * then drifts and fades out. `window` is [start, end] in scene frames.
 */
export const Narration: React.FC<{
  text: string;
  window: [number, number];
  bottom?: number;
  size?: number;
  color?: string;
}> = ({text, window: [start, end], bottom = 170, size = 54, color = palette.bone}) => {
  const frame = useCurrentFrame();
  if (frame < start - 1 || frame > end + 1) return null;
  const inP = progress(frame, start, start + 22, easeOut);
  const outP = progress(frame, end - 20, end, easeIn);
  const opacity = inP * (1 - outP);
  const blur = (1 - inP) * 8 + outP * 6;
  const drift = (1 - inP) * 10 - outP * 6;
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'none'}}>
      <div
        style={{
          marginBottom: bottom,
          fontFamily: fonts.cormorant,
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: size,
          letterSpacing: 1.5 + inP * 0.5,
          color,
          opacity,
          filter: `blur(${blur}px)`,
          transform: `translateY(${drift}px)`,
          textAlign: 'center',
          maxWidth: 1500,
          textShadow: '0 0 18px rgba(0,0,0,0.95), 0 0 42px rgba(0,0,0,0.85), 0 2px 3px #000',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Rising embers / sparks. Pure function of frame. Each particle loops on its
 * own period so the field never empties.
 */
export const Embers: React.FC<{
  count?: number;
  seed?: string;
  color?: string;
  glow?: string;
  area?: {x: number; y: number; w: number; h: number};
  speed?: number;
  size?: [number, number];
  opacity?: number;
  wind?: number;
}> = ({
  count = 60,
  seed = 'embers',
  color = palette.ember,
  glow = palette.emberDeep,
  area = {x: 0, y: 0, w: 1920, h: 1080},
  speed = 1,
  size = [2, 5],
  opacity = 1,
  wind = 0.4,
}) => {
  const frame = useCurrentFrame();
  const parts = [];
  for (let i = 0; i < count; i++) {
    const s = `${seed}-${i}`;
    const period = rand(s + 'p', 90, 220) / speed;
    const offset = rand(s + 'o', 0, period);
    const t = ((frame + offset) % period) / period; // 0..1 lifetime
    const x0 = area.x + rand(s + 'x', 0, area.w);
    const sway = noise2D(s, frame * 0.012, i) * 60;
    const x = x0 + sway + t * wind * 220;
    const y = area.y + area.h - t * (area.h + 80);
    const r = rand(s + 'r', size[0], size[1]) * (1 - t * 0.6);
    const flicker = 0.6 + 0.4 * Math.sin(frame * rand(s + 'f', 0.2, 0.6) + i);
    const a = Math.sin(Math.PI * t) * flicker * opacity;
    parts.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          background: color,
          opacity: a,
          boxShadow: `0 0 ${r * 3}px ${r * 1.5}px ${glow}`,
        }}
      />,
    );
  }
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{parts}</AbsoluteFill>;
};

/**
 * Soft drifting fog built from large blurred radial blobs. Cheap and moody.
 */
export const Fog: React.FC<{
  color?: string;
  opacity?: number;
  seed?: string;
  count?: number;
  y?: number;
  height?: number;
  drift?: number;
}> = ({color = '180,180,190', opacity = 0.25, seed = 'fog', count = 9, y = 600, height = 480, drift = 0.6}) => {
  const frame = useCurrentFrame();
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const s = `${seed}-${i}`;
    const w = rand(s + 'w', 500, 1100);
    const h = rand(s + 'h', 140, 300);
    const baseX = rand(s + 'x', -400, 2000);
    const x = ((baseX + frame * drift * rand(s + 'v', 0.5, 1.5) + 600) % 2800) - 600;
    const yy = y + rand(s + 'y', 0, height) + noise2D(s, frame * 0.005, 0) * 30;
    const a = opacity * (0.5 + 0.5 * noise2D(s + 'a', frame * 0.008, 1));
    blobs.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: yy - h / 2,
          width: w,
          height: h,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, rgba(${color},${Math.max(0, a)}) 0%, rgba(${color},0) 70%)`,
        }}
      />,
    );
  }
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{blobs}</AbsoluteFill>;
};
