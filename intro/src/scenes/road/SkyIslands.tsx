// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// High in the far sky, barely there: a few small floating rock islands with
// dangling roots and faint angular rune lines. A quiet promise of what lies
// above, lost in the dusk haze.

import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {palette} from '../../theme';
import {project} from './camera';
import {Layer, lerp} from './util';

type Isle = {x: number; y: number; w: number; seed: string; haze: number};

const ISLES: Isle[] = [
  {x: 1030, y: 206, w: 96, seed: 'isA', haze: 0.3},
  {x: 1200, y: 252, w: 44, seed: 'isB', haze: 0.5},
  {x: 360, y: 236, w: 60, seed: 'isC', haze: 0.45},
];

/** Rock body: a gently domed, grassy top over an underside of hanging crags. */
const rockPath = (w: number, seed: string) => {
  const n = 24;
  const top: string[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = -w / 2 + u * w;
    const dome = Math.sqrt(Math.max(0, Math.sin(Math.PI * u)));
    let y = -dome * w * 0.07 - rand(seed + 't' + i, 0, w * 0.02);
    // A little rounded tuft of scrub on top.
    if (i >= 14 && i <= 17) y -= w * 0.05 * Math.sin(((i - 14) / 3) * Math.PI);
    top.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  // One deep main lobe off-centre, plus two smaller hanging crags.
  const lobes = [
    {c: rand(seed + 'lc0', 0.38, 0.58), h: 0.6 * w, s: 0.2},
    {c: rand(seed + 'lc1', 0.18, 0.3), h: 0.28 * w, s: 0.09},
    {c: rand(seed + 'lc2', 0.7, 0.82), h: 0.32 * w, s: 0.08},
  ];
  const bot: string[] = [];
  for (let i = n; i >= 0; i--) {
    const u = i / n;
    const x = -w / 2 + u * w;
    const edge = Math.sin(Math.PI * u);
    let depth = w * 0.12 * Math.sqrt(edge);
    for (const l of lobes) depth = Math.max(depth, l.h * Math.exp(-(((u - l.c) / l.s) ** 2)) * Math.sqrt(edge));
    depth += rand(seed + 'b' + i, -0.03, 0.03) * w * edge;
    bot.push(`${x.toFixed(1)},${depth.toFixed(1)}`);
  }
  return `M${top.join(' L')} L${bot.join(' L')} Z`;
};

const runePath = (w: number, seed: string) => {
  // One angular circuit-like glyph running down the rock face.
  let x = w * rand(seed + 'rx', -0.2, 0.1);
  let y = w * 0.04;
  let d = `M${x.toFixed(1)},${y.toFixed(1)} `;
  for (let s = 0; s < 5; s++) {
    if (s % 2 === 0) y += w * rand(seed + 'rv' + s, 0.06, 0.12);
    else x += w * rand(seed + 'rh' + s, 0.05, 0.1) * (s === 1 ? 1 : -0.6);
    d += `L${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
};

const Island: React.FC<{isle: Isle; f: number}> = ({isle, f}) => {
  const {w, seed} = isle;
  const body = useMemo(() => rockPath(w, seed), [w, seed]);
  const runes = useMemo(() => runePath(w, seed), [w, seed]);
  const bob = Math.sin(f * 0.02 + rand(seed + 'ph', 0, 6)) * 3;
  const roots = [];
  for (let i = 0; i < 6; i++) {
    const s = seed + 'root' + i;
    const x = lerp(-w * 0.32, w * 0.3, i / 5) + rand(s, -4, 4);
    const top = Math.sin(Math.PI * (0.5 + x / w)) * w * 0.12;
    const len = rand(s + 'l', 0.2, 0.55) * w;
    const sway = noise2D(s, f * 0.015, 0) * len * 0.18;
    roots.push(
      <path
        key={i}
        d={`M${x},${top} Q${x + sway * 0.3},${top + len * 0.5} ${x + sway},${top + len}`}
        stroke="#2a2238"
        strokeWidth={1.2}
        fill="none"
      />,
    );
  }
  const glow = 0.3 + 0.12 * noise2D(seed + 'g', f * 0.03, 0);
  return (
    <g transform={`translate(${isle.x},${isle.y + bob})`} opacity={1 - isle.haze * 0.6}>
      {roots}
      <path d={body} fill={`url(#rd-isle)`} />
      <path d={runes} fill="none" stroke={palette.zonai} strokeOpacity={glow * 0.25} strokeWidth={3} />
      <path d={runes} fill="none" stroke={palette.zonai} strokeOpacity={glow * 0.8} strokeWidth={0.8} />
    </g>
  );
};

export const SkyIslands: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Layer p={project(f, 0.03)}>
      <svg width={2200} height={600} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id="rd-isle" x1="0" y1="-10" x2="0" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#15152a" />
            <stop offset="0.5" stopColor="#1c1932" />
            <stop offset="1" stopColor="#40283e" />
          </linearGradient>
        </defs>
        {ISLES.map((isle) => (
          <Island key={isle.seed} isle={isle} f={f} />
        ))}
      </svg>
    </Layer>
  );
};
