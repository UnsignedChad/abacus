// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Dry grass swaying in gusts that roll across the land from the right, with
// seed heads catching the afterglow; plus wind-borne dust and seeds.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {project, worldAtScreen} from './camera';
import {groundY} from './Landscape';
import {SUN, lightAt} from './Sky';
import {PaintLayer} from './util';

/** Wind bend at world x, in radians-ish; negative leans left (downwind). */
export const windAt = (x: number, f: number) =>
  -0.22 +
  0.2 * noise2D('wind', x * 0.0022 + f * 0.03, 0) +
  0.07 * noise2D('wind2', x * 0.011 + f * 0.09, 1);

type Bed = {
  seed: string;
  par: number;
  spacing: number;
  root: (x: number, i: number) => number;
  len: [number, number];
  width: [number, number];
  color: string;
  headChance: number;
};

const paintBed = (ctx: CanvasRenderingContext2D, f: number, bed: Bed) => {
  const p = project(f, bed.par);
  const light = lightAt(f);
  const i0 = Math.floor((worldAtScreen(p, -80) + 200) / bed.spacing);
  const i1 = Math.ceil((worldAtScreen(p, 2000) + 200) / bed.spacing);
  ctx.lineCap = 'round';
  const heads: [number, number, number, number][] = [];
  ctx.strokeStyle = bed.color;
  for (let i = i0; i <= i1; i++) {
    const s = `${bed.seed}${i}`;
    const wx = i * bed.spacing - 200 + rand(s, 0, bed.spacing);
    const wy = bed.root(wx, i);
    const len = rand(s + 'l', bed.len[0], bed.len[1]) * (rand(s + 't') < 0.12 ? 1.6 : 1);
    const stiff = rand(s + 's', 0.7, 1.3);
    const bend = (windAt(wx, f) + rand(s + 'b', -0.25, 0.25) + noise2D(s, f * 0.2, 0) * 0.04) * stiff;
    const x0 = p.s * wx + p.tx;
    const y0 = p.s * wy + p.ty;
    const L = len * p.s;
    const tx = x0 + Math.sin(bend) * L;
    const ty = y0 - Math.cos(bend) * L;
    const cx = x0 + Math.sin(bend * 0.4) * L * 0.5;
    const cy = y0 - L * 0.55;
    ctx.lineWidth = rand(s + 'w', bed.width[0], bed.width[1]) * p.s;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
    if (rand(s + 'h') < bed.headChance) heads.push([tx, ty, bend, L]);
  }
  // Seed heads: backlit, they glow warm, brightest toward the sunset.
  for (const [x, y, bend, L] of heads) {
    const k = Math.max(0, 1 - Math.abs(x - SUN.x) / 1400);
    const a = (0.14 + 0.4 * k) * light;
    ctx.fillStyle = `rgba(255,${Math.round(150 + 50 * k)},${Math.round(90 + 30 * k)},${a})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bend);
    ctx.beginPath();
    ctx.ellipse(0, L * 0.05, Math.max(1, L * 0.02), Math.max(2.5, L * 0.07), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const VERGE: Bed = {
  seed: 'vg',
  par: 0.97,
  spacing: 3.2,
  root: (x, i) => groundY(x) + 6 + (i % 5) * 3.5,
  len: [12, 38],
  width: [1, 2.2],
  color: '#120b0d',
  headChance: 0.12,
};

const NEAR: Bed = {
  seed: 'ng',
  par: 1.35,
  spacing: 4.5,
  root: (x, i) => 958 + (i % 4) * 6 + noise2D('ngr', x * 0.004, 0) * 10,
  len: [40, 96],
  width: [2, 4.5],
  color: '#070405',
  headChance: 0.05,
};

// Short grass along the road's near edge, in front of the traveler's path.
const EDGE: Bed = {
  seed: 'eg',
  par: 1.04,
  spacing: 5,
  root: (x, i) => 876 + (i % 3) * 5,
  len: [8, 26],
  width: [1.2, 2.4],
  color: '#0b0708',
  headChance: 0.1,
};

export const VergeGrass: React.FC = () => {
  const f = useCurrentFrame();
  return <PaintLayer paint={(ctx) => paintBed(ctx, f, VERGE)} />;
};

export const NearGrass: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <PaintLayer
      paint={(ctx) => {
        paintBed(ctx, f, EDGE);
        paintBed(ctx, f, NEAR);
        paintMotes(ctx, f);
      }}
    />
  );
};

/** Dust and thistle seeds blown along the wind, lit by the afterglow. */
const paintMotes = (ctx: CanvasRenderingContext2D, f: number) => {
  const light = lightAt(f);
  for (let i = 0; i < 46; i++) {
    const s = `mote${i}`;
    const depth = rand(s + 'd', 0.6, 1.5);
    const period = rand(s + 'p', 260, 520);
    const t = ((f + rand(s + 'o', 0, period)) % period) / period;
    const x = 2050 - t * 2250 - f * 3.4 * (depth - 0.8) * 0.3;
    const xx = (((x % 2200) + 2200) % 2200) - 140;
    const y = rand(s + 'y', 300, 900) + noise2D(s, t * 3, 0) * 60 - t * 40;
    const r = rand(s + 'r', 0.8, 2.2) * depth;
    const k = Math.max(0, 1 - Math.abs(xx - SUN.x) / 1300);
    const a = Math.sin(Math.PI * t) * (0.2 + 0.5 * k) * light * (0.6 + 0.4 * noise2D(s + 'f', f * 0.2, 0));
    if (a <= 0.01) continue;
    ctx.fillStyle = `rgba(255,190,130,${a})`;
    ctx.beginPath();
    ctx.arc(xx, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
};
