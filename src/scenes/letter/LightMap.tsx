// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The room's light as one multiplied layer over the desk. Inside it, the
// candle, a soft bounce onto the letter and the match are summed
// additively, so the whole desk falls off into true black.

import React from 'react';
import {noise2D} from '@remotion/noise';
import {useCurrentFrame} from 'remotion';
import {CANDLE, FLAME_Y, PAPER, WORLD} from './layout';
import {FlameState, moonAt} from './flame';
import {TextureCanvas} from './textures';

// Margin past the desk so the camera's slight roll never shows an unlit edge.
const PAD = 240;

type Stop = [number, number, number, number]; // offset%, r, g, b

// Candle light: near-neutral warm at the pool, reddening as it falls off.
// The profile is closer to inverse-square than a plateau: a hot pool at
// the dish, then a long, reddening tail.
const KEY: Stop[] = [
  [0, 255, 238, 208],
  [6, 252, 224, 182],
  [15, 226, 182, 132],
  [27, 168, 124, 82],
  [40, 108, 72, 42],
  [54, 62, 35, 17],
  [70, 30, 15, 6],
  [84, 10, 4.5, 1.2],
  [93, 3, 1.3, 0.3],
  [100, 0, 0, 0],
];

const gradient = (stops: Stop[], k: number) =>
  stops
    .map(([o, r, g, b]) => `rgb(${(r * k).toFixed(2)},${(g * k).toFixed(2)},${(b * k).toFixed(2)}) ${o}%`)
    .join(', ');

const Light: React.FC<{x: number; y: number; r: number; stops: Stop[]; k: number; ry?: number}> = ({
  x,
  y,
  r,
  stops,
  k,
  ry,
}) =>
  k <= 0.001 ? null : (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        mixBlendMode: 'plus-lighter',
        background: `radial-gradient(${ry ? `${r}px ${ry}px` : `circle ${r}px`} at ${x + PAD}px ${y + PAD}px, ${gradient(
          stops,
          Math.min(1, k),
        )})`,
      }}
    />
  );

// Soft bounce off the page itself, so the far side stays legible.
const FILL: Stop[] = [
  [0, 54, 42, 30],
  [60, 34, 25, 16],
  [100, 0, 0, 0],
];

// ---------------------------------------------------------------- moon

// World-space box the window patch is painted into.
const WIN = {x: 1450, y: 120, w: 1800, h: 1500};

/** Moonlight through a four-pane window, slanting across the far desk. */
const drawWindow = (ctx: CanvasRenderingContext2D) => {
  // Affine frame of the window's projection, in box coordinates.
  const o = [330, 230];
  const u = [920, 170];
  const v = [360, 860];
  const at = (a: number, b: number) => [o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b];
  const pane = (a0: number, b0: number, a1: number, b1: number) => {
    const pts = [at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)];
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  // Brighter toward the window (top right), fading toward the room.
  const g = ctx.createLinearGradient(at(1, 0)[0], at(1, 0)[1], at(0, 1)[0], at(0, 1)[1]);
  g.addColorStop(0, 'rgb(96,122,168)');
  g.addColorStop(0.55, 'rgb(58,76,112)');
  g.addColorStop(1, 'rgb(20,27,42)');
  ctx.fillStyle = g;
  ctx.filter = 'blur(7px)'; // bitmap pixels: ~35 world units at 0.2x
  const m = 0.035; // half-width of the mullions
  pane(0, 0, 0.5 - m, 0.5 - m);
  pane(0.5 + m, 0, 1, 0.5 - m);
  pane(0, 0.5 + m, 0.5 - m, 1);
  pane(0.5 + m, 0.5 + m, 1, 1);
  // A wide, faint spill around the whole patch.
  ctx.filter = 'blur(30px)';
  ctx.globalAlpha = 0.35;
  pane(-0.1, -0.1, 1.1, 1.1);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
};

// The dead wick's ember barely warms the top of the candle.
const EMBER: Stop[] = [
  [0, 200, 70, 25],
  [35, 70, 20, 6],
  [100, 0, 0, 0],
];

const MATCH: Stop[] = [
  [0, 255, 236, 200],
  [18, 190, 140, 90],
  [45, 60, 36, 20],
  [100, 0, 0, 0],
];

export const LightMap: React.FC<{fl: FlameState; wick: {x: number; y: number}}> = ({fl, wick}) => {
  const frame = useCurrentFrame();
  const L = fl.light;
  // Radius breathes with the flame; a touch of independent shimmer.
  const shimmer = 1 + noise2D('shimmer', frame * 0.3, 2) * 0.02;
  const r = (600 + 1750 * Math.min(1, L)) * shimmer;
  const moon = moonAt(frame);
  // Light centre sits just in front of the dish, toward the page.
  const lx = CANDLE.x + 110;
  const ly = CANDLE.y + 70;
  return (
    <div
      style={{
        position: 'absolute',
        left: -PAD,
        top: -PAD,
        width: WORLD.w + PAD * 2,
        height: WORLD.h + PAD * 2,
        background: '#000',
        mixBlendMode: 'multiply',
        isolation: 'isolate',
        pointerEvents: 'none',
      }}
    >
      <Light x={lx} y={ly} r={r} stops={KEY} k={L} />
      {/* The bounce needs the room lit first, or the page reads as a grey slab. */}
      <Light x={PAPER.cx - 300} y={PAPER.cy - 140} r={1400} ry={1250} stops={FILL} k={L * L} />
      <div style={{position: 'absolute', left: WIN.x + PAD, top: WIN.y + PAD, opacity: moon, mixBlendMode: 'plus-lighter'}}>
        <TextureCanvas width={WIN.w} height={WIN.h} scale={0.2} draw={drawWindow} />
      </div>
      <Light x={wick.x} y={wick.y + 60} r={320} stops={EMBER} k={fl.ember * 0.55} />
      <Light x={CANDLE.x + 20} y={CANDLE.y + FLAME_Y + 200} r={260 + 420 * fl.match} stops={MATCH} k={fl.match * 0.85} />
    </div>
  );
};
