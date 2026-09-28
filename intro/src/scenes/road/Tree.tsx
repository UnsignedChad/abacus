// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The dead tree by the road and the crows roosting in it. On the caw cue the
// crows burst out and flap away across the frame on arcing paths.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {rand} from '../../lib/fx';
import {cues} from '../../theme';
import {project} from './camera';
import {TREE, poseTree, treePath} from './tree';
import {Layer} from './util';

const C = cues.road;

export const DeadTree: React.FC = () => {
  const f = useCurrentFrame();
  const {segs} = poseTree(f);
  const d = treePath(segs);
  const roots =
    'M-20,0 C-40,2 -62,8 -84,14 L-60,4 C-44,-2 -30,-6 -22,-14 Z ' +
    'M18,-10 C30,-4 50,4 76,12 L52,2 C38,-2 30,-2 20,0 Z ' +
    'M-8,0 C-10,6 -14,10 -22,16 L4,6 Z';
  return (
    <Layer p={project(f, TREE.par)}>
      <svg width={2000} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <g transform={`translate(${TREE.x},${TREE.y})`}>
          {/* Warm rim: the silhouette offset toward the afterglow. */}
          <g transform="translate(-2.2,-1.6)">
            <path d={d} fill="rgba(255,150,90,0.55)" />
          </g>
          <path d={d} fill="#0d0809" />
          <path d={roots} fill="#0d0809" />
        </g>
      </svg>
    </Layer>
  );
};

type Crow = {tip: number; delay: number; end: [number, number]; ctrl: [number, number]; dur: number; grow: number};

const CROWS: Crow[] = [
  {tip: 40, delay: 0, ctrl: [260, -330], end: [1500, -520], dur: 95, grow: 1.7},
  {tip: 12, delay: 0, ctrl: [-140, -260], end: [-700, -420], dur: 80, grow: 1.3},
  {tip: 55, delay: 1, ctrl: [520, -120], end: [2400, -240], dur: 110, grow: 2.8},
  {tip: 25, delay: 1, ctrl: [120, -380], end: [900, -620], dur: 110, grow: 1.2},
  {tip: 70, delay: 2, ctrl: [320, -20], end: [1500, -600], dur: 64, grow: 5},
  {tip: 5, delay: 2, ctrl: [-60, -300], end: [300, -700], dur: 120, grow: 1.0},
  {tip: 33, delay: 3, ctrl: [500, -250], end: [1900, -380], dur: 115, grow: 1.5},
  {tip: 48, delay: 3, ctrl: [300, -60], end: [1900, -240], dur: 85, grow: 3.4},
  {tip: 18, delay: 4, ctrl: [-220, -120], end: [-600, -60], dur: 70, grow: 2.2},
  {tip: 62, delay: 5, ctrl: [360, -420], end: [1300, -700], dur: 120, grow: 1.1},
  {tip: 29, delay: 6, ctrl: [650, -200], end: [2100, -300], dur: 130, grow: 1.3},
];

/** Integrated flap phase: ~6 frames per beat at takeoff easing to ~10. */
const flapPhase = (t: number) => {
  if (t <= 10) return 1.05 * t;
  if (t <= 30) return 10.5 + 1.05 * (t - 10) - (0.45 * (t - 10) ** 2) / 40;
  return 10.5 + 21 - 4.5 + 0.6 * (t - 30);
};

const bez = (p0: number, p1: number, p2: number, t: number) =>
  (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

/**
 * A crow in flight, seen from below and behind: broad fingered wings beating
 * around a small body. `a` in [-1, 1] is the wing stroke (1 = fully up).
 */
const Flier: React.FC<{a: number; x: number; y: number; s: number; rot: number; flip: boolean}> = ({
  a,
  x,
  y,
  s,
  rot,
  flip,
}) => {
  const wing = (k: number) => {
    // Upstroke folds the wing a little; downstroke spreads it.
    const span = 21 - Math.max(0, a) * 5;
    const lift = -a * 11;
    const e = (v: number) => (k * v).toFixed(2);
    return (
      `M${e(2)},-1 Q${e(7)},${(-3 + lift * 0.45).toFixed(2)} ${e(span * 0.5)},${(-2 + lift * 0.6).toFixed(2)} ` +
      `L${e(span)},${(lift + 1).toFixed(2)} L${e(span - 2)},${(lift + 3).toFixed(2)} ` +
      `L${e(span - 3)},${(lift + 2.5).toFixed(2)} L${e(span - 5)},${(lift + 4).toFixed(2)} ` +
      `L${e(span - 7)},${(lift * 0.9 + 3.5).toFixed(2)} Q${e(span * 0.4)},${(lift * 0.4 + 4.5).toFixed(2)} ${e(2)},3 Z`
    );
  };
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${flip ? -s : s},${s})`} fill="#070405">
      <path d={wing(-1)} />
      <path d={wing(1)} />
      {/* Body, head toward the heading, wedge tail. */}
      <path d="M-3,1 Q0,-2.5 4,-1 L7,-1.5 L5,0.5 Q2,3.5 -3,2.5 L-8,4.5 L-8.5,0 Z" />
    </g>
  );
};

/** A perched crow, hunched on a branch. */
const Percher: React.FC<{x: number; y: number; f: number; seed: string}> = ({x, y, f, seed}) => {
  const look = Math.floor((f + rand(seed, 0, 60)) / 40) % 2 === 0 ? 1 : -1;
  return (
    <g transform={`translate(${x},${y}) scale(${1.4 * look},1.4)`}>
      <path d="M-5,0 Q-7,-8 -3,-13 Q0,-17 4,-15 L8,-14 L4,-12 Q5,-6 2,0 L-2,4 L-9,8 Z" fill="#070405" />
    </g>
  );
};

export const Crows: React.FC = () => {
  const f = useCurrentFrame();
  const {tips} = poseTree(f);
  const p = project(f, TREE.par);
  const out: React.ReactNode[] = [];
  CROWS.forEach((c, i) => {
    const tip = tips[c.tip % tips.length];
    const px = TREE.x + tip.x;
    const py = TREE.y + tip.y + 1;
    const t0 = C.crowCaw + c.delay;
    if (f < t0) {
      out.push(<Percher key={i} x={px} y={py} f={f} seed={`crow${i}`} />);
      return;
    }
    const u = (f - t0) / c.dur;
    if (u >= 1) return;
    // Burst: fast start, then settling into steady flight.
    const e = 1 - Math.pow(1 - u, 2.2);
    // Paths overshoot the frame; the tail end also fades as a safety net.
    const x = bez(px, px + c.ctrl[0], px + c.end[0], e);
    const y = bez(py, py + c.ctrl[1], py + c.end[1], e);
    const dx = bez(px, px + c.ctrl[0], px + c.end[0], Math.min(1, e + 0.02)) - x || 1;
    const dy = bez(py, py + c.ctrl[1], py + c.end[1], Math.min(1, e + 0.02)) - y;
    const flip = dx < 0;
    const heading = (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
    // Flap phase: frantic at takeoff, slower once airborne.
    const t = f - t0;
    const phase = flapPhase(t) + i * 1.7;
    const a = Math.sin(phase);
    const s = 1.6 * (1 + (c.grow - 1) * u * u);
    out.push(
      <g key={i} opacity={Math.min(1, (1 - u) / 0.12)}>
        <Flier a={a} x={x} y={y} s={s} rot={(flip ? -1 : 1) * heading * 0.4} flip={flip} />
      </g>,
    );
  });
  return (
    <Layer p={p}>
      <svg width={2000} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {out}
      </svg>
    </Layer>
  );
};
