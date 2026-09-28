// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Clogheen on its hill: cottages with a few lit windows, chimney smoke, and
// the stone church with its tall spire. Something unnatural glows red in the
// ground beneath the church. At the bell cue the spire glints and a faint
// ring ripples out through the air.

import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {cues} from '../../theme';
import {project} from './camera';
import {FieldLines, PAR, TOWN_X, townHillY} from './Landscape';
import {Layer, Pt, lerp, ridgeFill, ridgePoints} from './util';

const C = cues.road;
const TOWN_FILL = '#1b1422';

type House = {x: number; w: number; h: number; roof: number; thatch: boolean; chimney: number; win: number[]};

const HOUSES: House[] = (() => {
  const xs = [1512, 1548, 1584, 1622, 1650, 1802, 1836, 1872, 1900, 1938, 1976, 2016];
  return xs.map((x, i) => {
    const s = `house${i}`;
    const w = rand(s + 'w', 24, 38);
    return {
      x,
      w,
      h: rand(s + 'h', 13, 22),
      roof: rand(s + 'r', 12, 20),
      thatch: rand(s + 't') < 0.4,
      chimney: rand(s + 'c') < 0.55 ? rand(s + 'cx', 0.2, 0.8) : -1,
      // Lit windows as fractions across the wall (most houses dark).
      win: rand(s + 'l') < 0.5 ? [rand(s + 'wx', 0.25, 0.75)] : [],
    };
  });
})();

// The church, in town-layer world coordinates.
export const CHURCH = {
  x: TOWN_X - 30, // left edge of the tower
  towerW: 24,
  towerH: 96,
  spireH: 98,
  naveW: 92,
  naveH: 44,
};
const churchBase = () => townHillY(CHURCH.x + 50) + 4;
export const spireTip = (): Pt => [CHURCH.x + CHURCH.towerW / 2, churchBase() - CHURCH.towerH - CHURCH.spireH];
const belfry = (): Pt => [CHURCH.x + CHURCH.towerW / 2, churchBase() - CHURCH.towerH + 16];

const housePath = (h: House) => {
  const b = townHillY(h.x + h.w / 2) + 3;
  const l = h.x;
  const r = h.x + h.w;
  const top = b - h.h;
  const peak = top - h.roof;
  let d = `M${l},${b} L${l},${top} `;
  d += h.thatch
    ? `Q${l - 3},${top - h.roof * 0.2} ${l + h.w * 0.35},${peak + 2} Q${l + h.w / 2},${peak - 1} ${r - h.w * 0.35},${
        peak + 2
      } Q${r + 3},${top - h.roof * 0.2} ${r},${top} `
    : `L${l - 3},${top + 1} L${l + h.w / 2},${peak} L${r + 3},${top + 1} L${r},${top} `;
  d += `L${r},${b} Z `;
  if (h.chimney >= 0) {
    const cx = l + h.w * h.chimney;
    const cTop = peak + h.roof * Math.abs(h.chimney - 0.5) * 1.2 - 9;
    d += `M${cx - 3},${top} L${cx - 3},${cTop} L${cx + 3},${cTop} L${cx + 3},${top} Z `;
  }
  return d;
};

const churchPath = () => {
  const c = CHURCH;
  const b = churchBase();
  const tx = c.x;
  const tr = c.x + c.towerW;
  const tt = b - c.towerH;
  let d = '';
  // Tower with slight buttress flare and crenellated top.
  d += `M${tx - 3},${b} L${tx - 1},${tt + 30} L${tx},${tt} L${tr},${tt} L${tr + 1},${tt + 30} L${tr + 3},${b} Z `;
  d += `M${tx - 2},${tt} L${tx - 2},${tt - 6} L${tx + 3},${tt - 6} L${tx + 3},${tt - 3} L${tr - 3},${tt - 3} L${
    tr - 3
  },${tt - 6} L${tr + 2},${tt - 6} L${tr + 2},${tt} Z `;
  // Spire with little corner pinnacles.
  d += `M${tx + 1},${tt - 3} L${(tx + tr) / 2},${tt - c.spireH} L${tr - 1},${tt - 3} Z `;
  d += `M${tx - 2},${tt - 6} L${tx},${tt - 18} L${tx + 2},${tt - 6} Z M${tr - 2},${tt - 6} L${tr},${tt - 18} L${
    tr + 2
  },${tt - 6} Z `;
  // Nave with a steep roof, and a small apse.
  const nl = tr;
  const nr = tr + c.naveW;
  const nt = b - c.naveH * 0.55;
  d += `M${nl},${b} L${nl},${nt} L${nl + 6},${b - c.naveH} L${nr - 6},${b - c.naveH} L${nr},${nt} L${nr},${b} Z `;
  d += `M${nr - 2},${b} L${nr - 2},${nt + 6} Q${nr + 16},${nt + 4} ${nr + 18},${b} Z `;
  // Cross on the spire.
  const [sx, sy] = [(tx + tr) / 2, tt - c.spireH];
  d += `M${sx - 0.8},${sy} L${sx - 0.8},${sy - 11} L${sx + 0.8},${sy - 11} L${sx + 0.8},${sy} Z `;
  d += `M${sx - 4},${sy - 8} L${sx + 4},${sy - 8} L${sx + 4},${sy - 6.5} L${sx - 4},${sy - 6.5} Z`;
  return d;
};

/** Pulsing unnatural red light seeping up from the ground under the church. */
const pulseAt = (f: number) => {
  const beat = 0.5 + 0.5 * Math.sin((f / 64) * Math.PI * 2 - 1.2);
  const flutter = 0.5 + 0.5 * noise2D('evil', f * 0.05, 0);
  // The bell stirs it.
  const bell = f >= C.distantBell ? Math.exp(-(f - C.distantBell) / 24) : 0;
  return 0.45 + 0.35 * beat + 0.2 * flutter + 0.5 * bell;
};

const Smoke: React.FC<{x: number; y: number; seed: string; f: number}> = ({x, y, seed, f}) => {
  const puffs = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const period = 150;
    const t = ((f + (i * period) / n + rand(seed, 0, period)) % period) / period;
    const px = x - t * 70 + noise2D(seed, t * 3, i) * 6 * t;
    const py = y - t * 60;
    const r = 3 + t * 16;
    const a = 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (1 - t);
    puffs.push(
      <circle key={i} cx={px} cy={py} r={r * 1.5} fill="url(#rd-smoke)" opacity={Math.max(0, a * 1.6)} />,
    );
  }
  return <>{puffs}</>;
};

export const Town: React.FC = () => {
  const f = useCurrentFrame();
  const hill = useMemo(() => ridgePoints(-300, 2700, 8, townHillY), []);
  const houses = useMemo(() => HOUSES.map(housePath).join(' '), []);
  const church = useMemo(churchPath, []);
  const hillRoad = useMemo(() => {
    // Climbs across the slope from behind the midfield to the first cottages,
    // with one switchback, narrowing with distance.
    const top: string[] = [];
    const bot: string[] = [];
    const edge: string[] = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = lerp(930, 1500, u) + Math.sin(u * Math.PI * 1.8) * 70;
      const y = Math.max(townHillY(x) + 3, lerp(752, townHillY(1500) + 5, Math.pow(u, 0.9)));
      const w = lerp(9, 2.5, u);
      top.push(`${x.toFixed(1)},${(y - w / 2).toFixed(1)}`);
      bot.push(`${x.toFixed(1)},${(y + w / 2).toFixed(1)}`);
      edge.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${(y - w / 2).toFixed(1)}`);
    }
    return {fill: `M${top.join(' L')} L${bot.reverse().join(' L')} Z`, edge: edge.join(' ')};
  }, []);
  const pulse = pulseAt(f);
  const [bx, by] = belfry();
  const [sx, sy] = spireTip();
  const gx = CHURCH.x + 55;
  const gy = churchBase() + 6;

  // Bell: the spire glints and rings ripple out.
  const tb = f - C.distantBell;
  const glint = tb < -3 ? 0 : tb < 0 ? (tb + 3) / 3 : Math.exp(-tb / 16);
  // Rings of air: soft gradient bands (no hard strokes) spreading from the
  // belfry, flattened a little by distance.
  const rings = [0, 11, 24].map((d, i) => {
    const t = (tb - d) / 84;
    if (t < 0 || t >= 1) return null;
    const r = 10 + Math.pow(t, 0.7) * 430;
    const a = Math.pow(1 - t, 1.6) * (i === 0 ? 0.15 : 0.08);
    const band = 16 + 44 * t; // feather width in px
    const k = Math.max(0, 1 - band / r);
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: bx - r,
          top: by - r * 0.62,
          width: r * 2,
          height: r * 1.24,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, rgba(245,215,175,0) ${(k * 100).toFixed(1)}%, rgba(245,215,175,${a.toFixed(
            3,
          )}) ${(((1 + k) / 2) * 100).toFixed(1)}%, rgba(245,215,175,0) 100%)`,
        }}
      />
    );
  });

  return (
    <Layer p={project(f, PAR.town)}>
      {/* Red glow behind the silhouettes, so buildings cut into it. */}
      <div
        style={{
          position: 'absolute',
          left: gx - 260,
          top: gy - 200,
          width: 520,
          height: 320,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 62%, rgba(210,30,20,${0.55 * pulse}) 0%, rgba(160,15,18,${
            0.28 * pulse
          }) 30%, rgba(110,10,20,0) 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: gx - 60,
          top: gy - 330,
          width: 120,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 90%, rgba(200,30,25,${0.16 * pulse}) 0%, rgba(140,10,20,0) 70%)`,
        }}
      />
      {/* Bell rings ripple through the air behind the rooftops. */}
      {rings}
      <svg width={3000} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <radialGradient id="rd-smoke">
            <stop offset="0" stopColor="#6e5c72" stopOpacity="1" />
            <stop offset="1" stopColor="#6e5c72" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rd-crest" x1={gx - 170} y1="0" x2={gx + 170} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff3020" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ff3020" stopOpacity="1" />
            <stop offset="1" stopColor="#ff3020" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rd-town" x1="0" y1="560" x2="0" y2="760" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#261b2c" />
            <stop offset="1" stopColor="#1a121e" />
          </linearGradient>
        </defs>
        {HOUSES.filter((h) => h.chimney >= 0).map((h, i) => {
          const b = townHillY(h.x + h.w / 2) + 3;
          const cx = h.x + h.w * h.chimney;
          const cTop = b - h.h - h.roof + h.roof * Math.abs(h.chimney - 0.5) * 1.2 - 9;
          return <Smoke key={i} x={cx} y={cTop - 2} seed={`smk${i}`} f={f} />;
        })}
        <path d={houses} fill={TOWN_FILL} />
        <path d={church} fill={TOWN_FILL} />
        <path d={ridgeFill(hill, 1100)} fill="url(#rd-town)" />
        <FieldLines
          seed="fl-t"
          x0={-300}
          x1={2700}
          y={townHillY}
          depths={[18, 44, 84]}
          color="#110b16"
          width={1.3}
          opacity={0.45}
        />
        {/* Faint warm rim along the hill crest. */}
        <path
          d={hill.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')}
          fill="none"
          stroke="rgba(255,140,110,0.18)"
          strokeWidth={1.2}
        />
        {/* Red underlight catching the church walls and hill. */}
        {/* The ground itself bleeds red along the crest by the church. */}
        <path
          d={hill
            .filter(([x]) => Math.abs(x - gx) < 170)
            .map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y + 1}`)
            .join(' ')}
          fill="none"
          stroke="url(#rd-crest)"
          strokeOpacity={0.35 + 0.4 * pulse}
          strokeWidth={2}
        />
        {/* The road climbing the hill to the town, pale with the last of the sky. */}
        <path d={hillRoad.fill} fill="#5e4660" opacity={0.75} />
        <path d={hillRoad.edge} fill="none" stroke="rgba(230,160,150,0.22)" strokeWidth={1} />
      </svg>
      {/* Lit windows: tiny warm squares with a soft bloom, gently flickering. */}
      {HOUSES.flatMap((h, i) =>
        h.win.map((wx, j) => {
          const b = townHillY(h.x + h.w / 2) + 3;
          const x = h.x + h.w * wx;
          const y = b - h.h * 0.55;
          const fl = 0.75 + 0.25 * noise2D(`win${i}${j}`, f * 0.15, 0);
          return (
            <React.Fragment key={`${i}-${j}`}>
              <div
                style={{
                  position: 'absolute',
                  left: x - 14,
                  top: y - 14,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, rgba(255,150,60,${0.5 * fl}) 0%, rgba(255,110,40,0) 70%)`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: x - 1.8,
                  top: y - 2.5,
                  width: 3.6,
                  height: 5,
                  background: `rgba(255,${Math.round(170 + 40 * fl)},100,${fl})`,
                }}
              />
            </React.Fragment>
          );
        }),
      )}
      {/* Church windows glow a sick red. */}
      {[0, 1, 2].map((i) => {
        const x = CHURCH.x + CHURCH.towerW + 20 + i * 24;
        const y = churchBase() - 22;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - 2,
              top: y - 6,
              width: 4,
              height: 10,
              borderRadius: '2px 2px 0 0',
              background: `rgba(220,50,30,${0.35 + 0.35 * pulse})`,
              boxShadow: `0 0 8px 3px rgba(200,30,20,${0.3 * pulse})`,
            }}
          />
        );
      })}
      {/* Spire glint on the bell. */}
      {glint > 0.01 ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: sx - 40,
              top: sy - 40,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(255,235,190,${0.6 * glint}) 0%, rgba(255,200,140,${
                0.25 * glint
              }) 25%, rgba(255,180,120,0) 65%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: sx - 30 * glint - 3,
              top: sy - 0.75,
              width: 60 * glint + 6,
              height: 1.5,
              background: `linear-gradient(90deg, rgba(255,230,190,0), rgba(255,240,210,${0.55 * glint}), rgba(255,230,190,0))`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: sx - 0.75,
              top: sy - 22 * glint - 3,
              width: 1.5,
              height: 44 * glint + 6,
              background: `linear-gradient(180deg, rgba(255,230,190,0), rgba(255,240,210,${0.55 * glint}), rgba(255,230,190,0))`,
            }}
          />
        </>
      ) : null}
    </Layer>
  );
};
