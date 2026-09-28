// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Parallax land layers, far to near: two hazy mountain ranges, rolling hills,
// the midfield with hedgerows and fence posts, and the
// near ground with the road the traveler walks on. Backlit by the afterglow,
// so every ridge is a dark silhouette with a thin warm rim.

import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {project} from './camera';
import {Layer, Pt, fbm, lerp, ridgeFill, ridgeLine, ridgePoints, smooth} from './util';

/** Piecewise smooth interpolation through [x, y] control points. */
const envelope = (ctrl: Pt[]) => (x: number) => {
  if (x <= ctrl[0][0]) return ctrl[0][1];
  for (let i = 1; i < ctrl.length; i++) {
    const [x1, y1] = ctrl[i];
    const [x0, y0] = ctrl[i - 1];
    if (x <= x1) return lerp(y0, y1, smooth((x - x0) / (x1 - x0)));
  }
  return ctrl[ctrl.length - 1][1];
};

const ridged = (seed: string, x: number) => 1 - Math.abs(noise2D(seed, x, 0.5));

export const PAR = {
  farMtn: 0.05,
  nearMtn: 0.1,
  hills: 0.2,
  town: 0.35,
  mid: 0.6,
  ground: 1,
};

type Peak = [number, number, number]; // centre x, height, half width

/** Mountain profile: the highest of several sharp peaks, plus ridged detail. */
const range = (peaks: Peak[], base: number, seed: string, detail: number) => (x: number) => {
  let h = 0;
  for (const [c, ph, w] of peaks) {
    const u = Math.abs(x - c) / w;
    if (u < 1) h = Math.max(h, ph * Math.pow(1 - u, 1.35));
  }
  const rough = detail * (ridged(seed, x * 0.014) - 0.5) + detail * 0.18 * (ridged(seed + 'b', x * 0.05) - 0.5);
  return base - h - rough * (0.4 + h / 200);
};

const FAR_PEAKS: Peak[] = [
  [-120, 120, 260], [330, 200, 330], [610, 120, 220], [900, 165, 300], [1180, 95, 240],
  [1480, 55, 260], [1880, 140, 300], [2250, 110, 260],
];
const farMtnY = range(FAR_PEAKS, 650, 'fm', 26);

const NEAR_PEAKS: Peak[] = [
  [-60, 60, 220], [180, 92, 240], [520, 48, 200], [800, 86, 260], [1120, 50, 220],
  [1420, 30, 220], [1760, 64, 240], [2100, 80, 260], [2450, 60, 240],
];
const nearMtnY = range(NEAR_PEAKS, 660, 'nm', 16);

// Where the sun went down, in the mountains' (nearly fixed) world space.
const SUN_X = 560;

/**
 * Faceted shading: each peak's face turned away from the afterglow falls into
 * shadow. The face is bounded by the ridge on one side and a wandering crease
 * running from the summit down toward the foot on the other.
 */
const facets = (peaks: Peak[], y: (x: number) => number, base: number, seed: string) => {
  let d = '';
  peaks.forEach(([c, , w], i) => {
    const dir = c >= SUN_X ? 1 : -1;
    // Find the true summit near the nominal centre.
    let ax = c;
    for (let x = c - w * 0.15; x <= c + w * 0.15; x += 2) if (y(x) < y(ax)) ax = x;
    const ay = y(ax);
    const pts: string[] = [];
    const reach = w * 0.62;
    for (let t = 0; t <= reach; t += 4) {
      const x = ax + dir * t;
      pts.push(`${x.toFixed(1)},${y(x).toFixed(1)}`);
    }
    // The crease: from the foot back up to the summit, wandering a little.
    const footX = ax + dir * w * rand(`${seed}fx${i}`, 0.12, 0.3);
    const footY = base + 10;
    const n = 10;
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const x = lerp(footX, ax, u) + noise2D(`${seed}cr${i}`, u * 3, 0) * w * 0.07 * Math.sin(Math.PI * u);
      pts.push(`${x.toFixed(1)},${lerp(footY, ay, Math.pow(u, 0.85)).toFixed(1)}`);
    }
    d += `M${pts.join(' L')} Z `;
  });
  return d;
};

/** A stroke gradient that keeps rim light only on ridges facing the sun. */
const RimGradient: React.FC<{id: string; color: string; a: number; x0?: number; x1?: number}> = ({
  id,
  color,
  a,
  x0 = SUN_X - 900,
  x1 = SUN_X + 1100,
}) => (
  <linearGradient id={id} x1={x0} y1="0" x2={x1} y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stopColor={color} stopOpacity={a * 0.15} />
    <stop offset={(SUN_X - x0) / (x1 - x0)} stopColor={color} stopOpacity={a} />
    <stop offset="1" stopColor={color} stopOpacity={a * 0.08} />
  </linearGradient>
);

export const hillsY = (() => {
  const env = envelope([
    [-300, 700], [300, 690], [700, 676], [1100, 664], [1500, 650], [1900, 660], [2400, 672],
  ]);
  return (x: number) => env(x) + 8 * fbm('hl', x * 0.004, 0, 3);
})();

// The hill Clogheen stands on. Crest near the church.
export const TOWN_X = 1712;
export const townHillY = (() => {
  const env = envelope([
    [-300, 720], [700, 712], [1150, 690], [1450, 632], [1700, 594], [1900, 598],
    [2150, 640], [2500, 690],
  ]);
  return (x: number) => env(x) + 5 * fbm('th', x * 0.006, 0, 3);
})();

export const midY = (() => {
  const env = envelope([
    [-300, 752], [500, 745], [1000, 738], [1500, 728], [2000, 736], [2800, 730],
  ]);
  return (x: number) => env(x) + 7 * fbm('md', x * 0.005, 0, 3);
})();

// Near ground: the far edge of the road verge. The road itself is a band.
export const groundY = (x: number) => 796 + 6 * fbm('gd', x * 0.004, 0, 3);
export const roadY = (x: number) => 842 + 5 * Math.sin(x / 380) + 2 * fbm('rd', x * 0.003, 0, 2);

const Ridge: React.FC<{
  pts: Pt[];
  bottom: number;
  fill: string;
  rim?: string;
  rimWidth?: number;
}> = ({pts, bottom, fill, rim, rimWidth = 1.5}) => (
  <>
    <path d={ridgeFill(pts, bottom)} fill={fill} />
    {rim ? <path d={ridgeLine(pts)} fill="none" stroke={rim} strokeWidth={rimWidth} /> : null}
  </>
);

const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={4000} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    {children}
  </svg>
);

export const Mountains: React.FC = () => {
  const f = useCurrentFrame();
  const far = useMemo(() => ridgePoints(-300, 2400, 4, farMtnY), []);
  const near = useMemo(() => ridgePoints(-300, 2500, 4, nearMtnY), []);
  const farShade = useMemo(() => facets(FAR_PEAKS, farMtnY, 650, 'fmf'), []);
  const nearShade = useMemo(() => facets(NEAR_PEAKS, nearMtnY, 660, 'nmf'), []);
  return (
    <>
      <Layer p={project(f, PAR.farMtn)}>
        <Svg>
          <defs>
            {/* Blue-grey stone, dissolving into warm haze toward the foot. */}
            <linearGradient id="rd-fm" x1="0" y1="440" x2="0" y2="680" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#262a46" />
              <stop offset="0.5" stopColor="#30304e" />
              <stop offset="1" stopColor="#4a3656" />
            </linearGradient>
            <linearGradient id="rd-fmw" x1="0" y1="0" x2="2400" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffae70" stopOpacity="0.1" />
              <stop offset="0.25" stopColor="#ff9a60" stopOpacity="0.07" />
              <stop offset="0.6" stopColor="#ff9a60" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rd-fms" x1="0" y1="450" x2="0" y2="660" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0e0f22" stopOpacity="0.6" />
              <stop offset="1" stopColor="#141528" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="rd-mist" x1="0" y1="560" x2="0" y2="660" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#8a5a72" stopOpacity="0" />
              <stop offset="1" stopColor="#7a4a66" stopOpacity="0.5" />
            </linearGradient>
            <RimGradient id="rd-fmr" color="#ffb488" a={0.5} />
          </defs>
          <path d={ridgeFill(far, 900)} fill="url(#rd-fm)" />
          <path d={farShade} fill="url(#rd-fms)" />
          <path d={ridgeFill(far, 900)} fill="url(#rd-fmw)" />
          <path d={ridgeFill(far, 900)} fill="url(#rd-mist)" />
          <path d={ridgeLine(far)} fill="none" stroke="url(#rd-fmr)" strokeWidth={1.3} />
        </Svg>
      </Layer>
      <Layer p={project(f, PAR.nearMtn)}>
        <Svg>
          <defs>
            <linearGradient id="rd-nm" x1="0" y1="570" x2="0" y2="700" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1a1a30" />
              <stop offset="1" stopColor="#2a2038" />
            </linearGradient>
            <linearGradient id="rd-nms" x1="0" y1="570" x2="0" y2="670" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0c0c1a" stopOpacity="0.5" />
              <stop offset="1" stopColor="#0c0c1a" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="rd-nmist" x1="0" y1="610" x2="0" y2="690" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6e4462" stopOpacity="0" />
              <stop offset="1" stopColor="#5e3a56" stopOpacity="0.55" />
            </linearGradient>
            <RimGradient id="rd-nmr" color="#ffaa80" a={0.45} />
          </defs>
          <path d={ridgeFill(near, 900)} fill="url(#rd-nm)" />
          <path d={nearShade} fill="url(#rd-nms)" />
          <path d={ridgeFill(near, 900)} fill="url(#rd-nmist)" />
          <path d={ridgeLine(near)} fill="none" stroke="url(#rd-nmr)" strokeWidth={1.4} />
        </Svg>
      </Layer>
    </>
  );
};

/**
 * Hedgerows dividing the land into small fields: broken dark lines that follow
 * the contour below a ridge, with short cross-hedges between them.
 */
export const FieldLines: React.FC<{
  seed: string;
  x0: number;
  x1: number;
  y: (x: number) => number;
  depths: number[];
  color: string;
  width: number;
  opacity: number;
}> = ({seed, x0, x1, y, depths, color, width, opacity}) => {
  const d = useMemo(() => {
    let d = '';
    const rowY = (x: number, k: number) => y(x) + depths[k] + noise2D(`${seed}r${k}`, x * 0.004, 0) * depths[k] * 0.25;
    depths.forEach((_, k) => {
      let pen = false;
      for (let x = x0; x <= x1; x += 10) {
        const on = noise2D(`${seed}g${k}`, x * 0.006, 0) > -0.35;
        if (on) {
          d += `${pen ? 'L' : 'M'}${x},${rowY(x, k).toFixed(1)} `;
          pen = true;
        } else pen = false;
      }
      // Cross-hedges down to the next row.
      if (k + 1 < depths.length) {
        const n = Math.round((x1 - x0) / 260);
        for (let i = 0; i < n; i++) {
          const x = lerp(x0, x1, (i + rand(`${seed}c${k}${i}`, 0, 1)) / n);
          const x2 = x + rand(`${seed}cd${k}${i}`, -30, 30);
          d += `M${x.toFixed(1)},${rowY(x, k).toFixed(1)} L${x2.toFixed(1)},${rowY(x2, k + 1).toFixed(1)} `;
        }
      }
    });
    return d;
  }, [seed, x0, x1, y, depths]);
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeOpacity={opacity} strokeLinejoin="round" />
  );
};

export const Hills: React.FC = () => {
  const f = useCurrentFrame();
  const pts = useMemo(() => ridgePoints(-300, 2400, 8, hillsY), []);
  return (
    <Layer p={project(f, PAR.hills)}>
      <Svg>
        <defs>
          <linearGradient id="rd-hl" x1="0" y1="640" x2="0" y2="760" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#33243a" />
            <stop offset="1" stopColor="#20162a" />
          </linearGradient>
          <RimGradient id="rd-hlr" color="#ff9670" a={0.38} />
        </defs>
        <Ridge pts={pts} bottom={1000} fill="url(#rd-hl)" rim="url(#rd-hlr)" />
        <FieldLines
          seed="fl-h"
          x0={-300}
          x1={2400}
          y={hillsY}
          depths={[12, 30, 54]}
          color="#150e1a"
          width={1.2}
          opacity={0.4}
        />
        <HedgeTrees seed="ht-h" x0={-200} x1={2400} y={hillsY} count={11} size={0.6} fill="#2a1d30" />
      </Svg>
    </Layer>
  );
};

/** Small leafless trees and a few poplars along a ridge. */
const HedgeTrees: React.FC<{
  seed: string;
  x0: number;
  x1: number;
  y: (x: number) => number;
  count: number;
  size: number;
  fill: string;
}> = ({seed, x0, x1, y, count, size, fill}) => {
  const {trunks, twigs} = useMemo(() => {
    let trunks = '';
    let twigs = '';
    for (let i = 0; i < count; i++) {
      const s = `${seed}${i}`;
      const x = lerp(x0, x1, (i + rand(s, 0, 0.9)) / count);
      const base = y(x) + 3;
      const h = rand(s + 'h', 22, 46) * size;
      if (rand(s + 'k') < 0.25) {
        // A poplar: a narrow dark flame.
        const w = h * 0.2;
        trunks += `M${x - w},${base} Q${x - w * 1.3},${base - h * 0.9} ${x},${base - h * 1.4} Q${x + w * 1.3},${
          base - h * 0.9
        } ${x + w},${base} Z `;
        continue;
      }
      // A bare tree: short trunk, a fan of forking branches.
      const lean = rand(s + 'l', -0.15, 0.15);
      const tx = x + lean * h * 0.4;
      const ty = base - h * 0.42;
      trunks += `M${x - 1.6 * size},${base} L${tx - 0.8},${ty} L${tx + 0.8},${ty} L${x + 1.6 * size},${base} Z `;
      const n = 5;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + lerp(-0.85, 0.85, k / (n - 1)) + rand(s + 'a' + k, -0.2, 0.2);
        const l = h * rand(s + 'bl' + k, 0.45, 0.62);
        const ex = tx + Math.cos(a) * l;
        const ey = ty + Math.sin(a) * l;
        twigs += `M${tx},${ty} Q${tx + Math.cos(a) * l * 0.5 + lean * 4},${ty + Math.sin(a) * l * 0.4} ${ex},${ey} `;
        const a2 = a + rand(s + 'f' + k, 0.3, 0.6) * (k % 2 ? 1 : -1);
        const mx = tx + Math.cos(a) * l * 0.6;
        const my = ty + Math.sin(a) * l * 0.6;
        twigs += `M${mx},${my} L${mx + Math.cos(a2) * l * 0.4},${my + Math.sin(a2) * l * 0.4} `;
      }
    }
    return {trunks, twigs};
  }, [seed, x0, x1, y, count, size]);
  return (
    <>
      <path d={trunks} fill={fill} />
      <path d={twigs} fill="none" stroke={fill} strokeWidth={1.1 * size} strokeLinecap="round" />
    </>
  );
};

/** The midfield: dark pasture with hedgerows and fence posts. */
export const Midfield: React.FC = () => {
  const f = useCurrentFrame();
  const pts = useMemo(() => ridgePoints(-300, 3000, 8, midY), []);
  const posts = useMemo(() => {
    let d = '';
    for (let i = 0; i < 70; i++) {
      const x = -200 + i * 44 + rand(`fp${i}`, -6, 6);
      const b = midY(x) + 6;
      const h = rand(`fph${i}`, 9, 15);
      d += `M${x},${b} L${x + 1},${b - h} L${x + 3.5},${b - h + 1} L${x + 3},${b} Z `;
    }
    return d;
  }, []);
  return (
    <Layer p={project(f, PAR.mid)}>
      <Svg>
        <defs>
          <linearGradient id="rd-md" x1="0" y1="720" x2="0" y2="860" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1f1520" />
            <stop offset="1" stopColor="#110b12" />
          </linearGradient>
          <RimGradient id="rd-mdr" color="#ff8c64" a={0.3} x0={-200} x1={2200} />
        </defs>
        <HedgeTrees seed="ht-m" x0={-200} x1={3000} y={midY} count={13} size={1.1} fill="#170f19" />
        <Ridge pts={pts} bottom={1100} fill="url(#rd-md)" rim="url(#rd-mdr)" />
        <FieldLines seed="fl-m" x0={-300} x1={3000} y={midY} depths={[14, 34]} color="#0a060b" width={2} opacity={0.6} />
        <path d={posts} fill="#140d15" />
      </Svg>
    </Layer>
  );
};

/** Near ground: grass verge, then the road, then the dark foreground bank. */
export const Ground: React.FC = () => {
  const f = useCurrentFrame();
  const verge = useMemo(() => ridgePoints(-300, 3600, 10, groundY), []);
  const road = useMemo(() => {
    const top = ridgePoints(-300, 3600, 20, (x) => roadY(x) - 26 + 3 * fbm('rt', x * 0.01, 0, 2));
    const bot = ridgePoints(-300, 3600, 20, (x) => roadY(x) + 24 + 4 * fbm('rb', x * 0.01, 0, 2));
    return {
      d: `M${top.map(([x, y]) => `${x},${y}`).join(' L')} L${bot
        .reverse()
        .map(([x, y]) => `${x},${y}`)
        .join(' L')} Z`,
      top,
    };
  }, []);
  const stones = useMemo(() => {
    const out: {x: number; y: number; r: number}[] = [];
    for (let i = 0; i < 90; i++) {
      const x = -200 + i * 42 + rand(`st${i}`, 0, 30);
      out.push({x, y: roadY(x) + rand(`sty${i}`, -18, 20), r: rand(`str${i}`, 1.5, 4)});
    }
    return out;
  }, []);
  return (
    <Layer p={project(f, PAR.ground)}>
      <Svg>
        <defs>
          <linearGradient id="rd-gd" x1="0" y1="790" x2="0" y2="950" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1a1116" />
            <stop offset="1" stopColor="#0a0608" />
          </linearGradient>
          <linearGradient id="rd-road" x1="0" y1="815" x2="0" y2="870" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4a3438" />
            <stop offset="0.35" stopColor="#35252a" />
            <stop offset="1" stopColor="#1b1215" />
          </linearGradient>
        </defs>
        <path d={ridgeFill(verge, 1200)} fill="url(#rd-gd)" />
        <path d={road.d} fill="url(#rd-road)" />
        {/* Sky sheen on the worn wheel ruts. */}
        <path
          d={ridgeLine(road.top.map(([x, y]) => [x, y + 16] as Pt))}
          fill="none"
          stroke="rgba(230,140,110,0.1)"
          strokeWidth={3}
        />
        <path
          d={ridgeLine(road.top.map(([x, y]) => [x, y + 34] as Pt))}
          fill="none"
          stroke="rgba(200,120,110,0.07)"
          strokeWidth={4}
        />
        {stones.map((s, i) => (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.r * 1.4} ry={s.r * 0.7} fill="#120b0d" />
        ))}
      </Svg>
    </Layer>
  );
};
