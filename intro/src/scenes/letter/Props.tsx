// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Desk dressing: inkwell and quill, the broken wax seal, the corner of a
// folded map and a sheathed dagger. Each is a small SVG placed in world
// units; long soft shadows fall away from the candle.

import React from 'react';
import {noise2D} from '@remotion/noise';
import {fonts} from '../../fonts';
import {palette} from '../../theme';
import {TextureCanvas, drawPaper} from './textures';

type Pos = {x: number; y: number; rot?: number};

const Place: React.FC<{p: Pos; children: React.ReactNode}> = ({p, children}) => (
  <div style={{position: 'absolute', left: p.x, top: p.y, transform: `rotate(${p.rot ?? 0}deg)`}}>{children}</div>
);

/** An SVG whose origin (0,0) sits at the parent's origin. */
const Svg: React.FC<{box: [number, number, number, number]; children: React.ReactNode}> = ({box, children}) => (
  <svg
    width={box[2]}
    height={box[3]}
    viewBox={box.join(' ')}
    style={{position: 'absolute', left: box[0], top: box[1], overflow: 'visible'}}
  >
    {children}
  </svg>
);

// ------------------------------------------------------------------ quill

const bez = (t: number, p0: number[], p1: number[], p2: number[]) => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};
const bezTan = (t: number, p0: number[], p1: number[], p2: number[]) => {
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  const l = Math.hypot(dx, dy);
  return [dx / l, dy / l];
};

const Q0 = [4, -124];
const Q1 = [150, -300];
const Q2 = [540, -380];

const quillGeometry = () => {
  const left: string[] = [];
  const right: string[] = [];
  const barbs: {d: string; dark: boolean}[] = [];
  const t0 = 0.3;
  const vane = (t: number) => {
    const u = (t - t0) / (1 - t0);
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.6);
    // Two notches where the barbs have split apart.
    const notch = (c: number) => (Math.abs(u - c) < 0.035 ? 0.55 : 1);
    return env * notch(0.42) * notch(0.71);
  };
  for (let i = 0; i <= 60; i++) {
    const t = t0 + (i / 60) * (1 - t0);
    const [x, y] = bez(t, Q0, Q1, Q2);
    const [tx, ty] = bezTan(t, Q0, Q1, Q2);
    const nx = -ty;
    const ny = tx;
    const v = vane(t);
    const wl = 52 * v + noise2D('vane', t * 30, 0) * 2;
    const wr = 26 * v;
    // Barbs sweep toward the tip.
    left.push(`${x + nx * wl + tx * wl * 0.45},${y + ny * wl + ty * wl * 0.45}`);
    right.unshift(`${x - nx * wr + tx * wr * 0.4},${y - ny * wr + ty * wr * 0.4}`);
    if (i % 2 === 0 && i < 60) {
      barbs.push({
        d: `M ${x} ${y} Q ${x + nx * wl * 0.5 + tx * 4} ${y + ny * wl * 0.5 + ty * 4} ${x + nx * wl + tx * wl * 0.45} ${
          y + ny * wl + ty * wl * 0.45
        }`,
        dark: i % 6 === 0,
      });
      barbs.push({
        d: `M ${x} ${y} L ${x - nx * wr + tx * wr * 0.4} ${y - ny * wr + ty * wr * 0.4}`,
        dark: i % 8 === 0,
      });
    }
  }
  const [sx, sy] = bez(t0, Q0, Q1, Q2);
  const [ex, ey] = Q2;
  const outline = `M ${sx} ${sy} L ${left.join(' L ')} L ${ex} ${ey} L ${right.join(' L ')} Z`;
  const shaft = `M ${Q0[0]} ${Q0[1]} Q ${Q1[0]} ${Q1[1]} ${Q2[0]} ${Q2[1]}`;
  return {outline, shaft, barbs};
};

const QUILL = quillGeometry();

// Projects the standing quill onto the desk, away from the candle (to the right).
const QUILL_SHADOW = 'matrix(1, 0, -0.9, -0.2, 40, -6)';

const InkwellShadow: React.FC<{shift: number}> = ({shift}) => (
  <Svg box={[-150, -150, 1300, 300]}>
    <defs>
      <filter id="lt-sh1" x="-0.3" y="-1" width="1.6" height="3">
        <feGaussianBlur stdDeviation={12} />
      </filter>
      <filter id="lt-sh2" x="-0.2" y="-1" width="1.4" height="3">
        <feGaussianBlur stdDeviation={4} />
      </filter>
      <linearGradient id="lt-shfade" x1="0" x2="1">
        <stop offset="0" stopColor="#000" stopOpacity={0.8} />
        <stop offset="1" stopColor="#000" stopOpacity={0} />
      </linearGradient>
    </defs>
    <g transform={`rotate(${shift})`}>
      <path d="M -60 -30 C 80 -60, 360 -55, 470 -8 C 520 14, 380 50, 150 48 C 20 46, -80 30, -60 -30 Z" fill="url(#lt-shfade)" filter="url(#lt-sh1)" />
      <g transform={QUILL_SHADOW} filter="url(#lt-sh2)" opacity={0.5}>
        <path d={QUILL.outline} fill="#000" />
        <path d={QUILL.shaft} stroke="#000" strokeWidth={5} fill="none" />
      </g>
    </g>
    <ellipse cx={4} cy={6} rx={118} ry={48} fill="#000" opacity={0.6} filter="url(#lt-sh2)" />
  </Svg>
);

const Inkwell: React.FC = () => (
  <Svg box={[-200, -700, 700, 800]}>
    <defs>
      <linearGradient id="lt-glass" x1="0" x2="1">
        <stop offset="0" stopColor="#140e0c" />
        <stop offset="0.14" stopColor="#4a3326" />
        <stop offset="0.3" stopColor="#1c1411" />
        <stop offset="0.7" stopColor="#0c0909" />
        <stop offset="1" stopColor="#040303" />
      </linearGradient>
      <radialGradient id="lt-shoulder" cx="0.35" cy="0.4" r="0.7">
        <stop offset="0" stopColor="#3d2b22" />
        <stop offset="0.5" stopColor="#1a1210" />
        <stop offset="1" stopColor="#070505" />
      </radialGradient>
      <linearGradient id="lt-vane" x1="0" x2="1" y1="1" y2="0">
        <stop offset="0" stopColor="#e9dfc8" />
        <stop offset="0.6" stopColor="#d4c7aa" />
        <stop offset="1" stopColor="#8d8472" />
      </linearGradient>
    </defs>
    {/* body */}
    <path d="M -108 0 C -114 -34, -112 -58, -100 -70 L 100 -70 C 112 -58, 114 -34, 108 0 A 108 44 0 0 1 -108 0 Z" fill="url(#lt-glass)" />
    <ellipse cx={0} cy={-70} rx={101} ry={40} fill="url(#lt-shoulder)" />
    {/* reflections of the candle, which sits off to the left */}
    <path d="M -92 -60 C -100 -40, -98 -18, -90 4" stroke="#fff0d0" strokeOpacity={0.9} strokeWidth={6} strokeLinecap="round" fill="none" />
    <path d="M -70 -92 C -56 -100, -36 -104, -20 -104" stroke="#ffd9a0" strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" fill="none" />
    <ellipse cx={-62} cy={-84} rx={12} ry={6} fill="#ffffff" opacity={0.95} />
    <path d="M -100 18 A 108 44 0 0 0 60 38" stroke="#b07a40" strokeOpacity={0.25} strokeWidth={3} fill="none" />
    {/* neck and lip */}
    <path d="M -42 -76 L -42 -118 A 42 15 0 0 0 42 -118 L 42 -76 Z" fill="#120d0b" />
    <path d="M -42 -118 L -42 -82" stroke="#e8b878" strokeOpacity={0.35} strokeWidth={3} />
    <ellipse cx={0} cy={-120} rx={50} ry={18} fill="#2a1d16" />
    <path d="M -50 -120 A 50 18 0 0 1 20 -137" stroke="#fbe2b0" strokeOpacity={0.85} strokeWidth={3} fill="none" />
    <ellipse cx={0} cy={-120} rx={36} ry={12} fill="#030202" />
    <ellipse cx={-10} cy={-123} rx={14} ry={3} fill="#5a3a26" opacity={0.5} />
    {/* quill */}
    <path d={QUILL.outline} fill="url(#lt-vane)" opacity={0.93} />
    {QUILL.barbs.map((b, i) => (
      <path key={i} d={b.d} stroke={b.dark ? '#6f6554' : '#fbf5e6'} strokeOpacity={b.dark ? 0.45 : 0.3} strokeWidth={1} fill="none" />
    ))}
    <path d={QUILL.shaft} stroke="#f3ead6" strokeWidth={4} fill="none" strokeLinecap="round" />
    <path d={QUILL.shaft} stroke="#8a7a60" strokeWidth={1.2} fill="none" transform="translate(1.5 1)" />
  </Svg>
);

export const InkwellProp: React.FC<{p: Pos; shadowShift: number}> = ({p, shadowShift}) => (
  <Place p={p}>
    <InkwellShadow shift={shadowShift} />
    <Inkwell />
  </Place>
);

// ------------------------------------------------------------------ seal

const blob = (r: number, seed: string) => {
  const pts: string[] = [];
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    // Pressed wax: mostly round, with a few squeezed-out lobes.
    const lobe = Math.max(0, noise2D(seed, Math.cos(a) * 0.9, Math.sin(a) * 0.9)) * 0.22;
    const rr = r * (1 + noise2D(seed, Math.cos(a) * 2.2, Math.sin(a) * 2.2) * 0.05 + lobe);
    pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr * 0.92).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
};

const SEAL_BLOB = blob(52, 'seal');
// A jagged break running roughly top-to-bottom.
const BREAK = [
  [-6, -70],
  [3, -40],
  [-7, -16],
  [5, 4],
  [-3, 24],
  [6, 44],
  [0, 70],
];
const BREAK_D = `M ${BREAK.map(([x, y]) => `${x},${y}`).join(' L ')}`;
const breakPath = (side: 1 | -1) => {
  const far = side * 110;
  return `M ${far} -80 L ${BREAK.map(([x, y]) => `${x},${y}`).join(' L ')} L ${far} 80 Z`;
};

const CRESCENT = 'M -4 -24 A 24 24 0 1 0 -4 24 A 19 19 0 1 1 -4 -24 Z';
const STAR = 'M 11 -10 L 13.8 -2.8 L 21.6 -2.8 L 15.4 1.9 L 17.7 9.3 L 11 5 L 4.3 9.3 L 6.6 1.9 L 0.4 -2.8 L 8.2 -2.8 Z';

/** The crescent-and-star, raised: shadow, lit edge, then the face. */
const Sigil: React.FC = () => (
  <g transform="translate(-4 0)">
    {[
      {dx: 1.4, dy: 1.6, fill: '#2a0203', o: 0.75},
      {dx: -1, dy: -1.1, fill: '#e2604c', o: 0.55},
      {dx: 0, dy: 0, fill: '#8c1116', o: 1},
    ].map((l, i) => (
      <g key={i} transform={`translate(${l.dx} ${l.dy})`} fill={l.fill} opacity={l.o}>
        <path d={CRESCENT} />
        <path d={STAR} />
      </g>
    ))}
  </g>
);

const SealHalf: React.FC<{side: 1 | -1; id: string}> = ({side, id}) => (
  <g>
    <defs>
      <clipPath id={id}>
        <path d={breakPath(side)} />
      </clipPath>
      <clipPath id={`${id}-blob`}>
        <path d={SEAL_BLOB} />
      </clipPath>
    </defs>
    <g clipPath={`url(#${id})`}>
      {/* thickness, then the top face */}
      <path d={SEAL_BLOB} fill="#240103" transform="translate(1.5 6)" />
      <path d={SEAL_BLOB} fill="url(#lt-wax-red)" />
      {/* the stamp's recessed disc: dark lip toward the light, lit lip away */}
      <circle r={36} fill="#5a070a" />
      <path d="M -33 14 A 36 36 0 0 1 14 -33" stroke="#1e0102" strokeWidth={3} fill="none" opacity={0.7} />
      <path d="M 33 -14 A 36 36 0 0 1 -14 33" stroke="#d65848" strokeWidth={1.6} fill="none" opacity={0.55} />
      <circle r={31} fill="none" stroke="#3a0305" strokeWidth={1} strokeDasharray="2 3.5" opacity={0.6} />
      <Sigil />
      {/* gloss */}
      <path d="M -40 -14 C -36 -30, -24 -40, -8 -44" stroke="#ffb0a0" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.35} />
      <ellipse cx={-30} cy={-30} rx={5} ry={2.4} fill="#ffd8cc" opacity={0.55} transform="rotate(-40 -30 -30)" />
    </g>
    {/* the broken face catches a thin line of light */}
    <g clipPath={`url(#${id}-blob)`}>
      <path d={BREAK_D} stroke={side < 0 ? '#c42a2a' : '#3a0305'} strokeWidth={2.2} fill="none" opacity={0.8} />
    </g>
  </g>
);

export const SealProp: React.FC<{p: Pos}> = ({p}) => (
  <Place p={p}>
    <Svg box={[-190, -160, 400, 340]}>
      <defs>
        <radialGradient id="lt-wax-red" cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#b8201f" />
          <stop offset="0.45" stopColor={palette.blood} />
          <stop offset="1" stopColor="#3e0305" />
        </radialGradient>
        <filter id="lt-sealsh" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation={5} />
        </filter>
      </defs>
      {/* shadows fall down and away from the candle */}
      <g filter="url(#lt-sealsh)" opacity={0.75} fill="#000" transform="scale(1.35)">
        <path d={SEAL_BLOB} transform="translate(-2 12) rotate(-6)" />
        <path d={SEAL_BLOB} transform="translate(20 20) rotate(12)" />
      </g>
      <g transform="scale(1.35) translate(-5 0) rotate(-6)">
        <SealHalf side={-1} id="lt-seal-a" />
      </g>
      <g transform="scale(1.35) translate(5 4) rotate(9)">
        <SealHalf side={1} id="lt-seal-b" />
      </g>
      {/* crumbs */}
      <path d="M 70 -46 l 7 -2 l 3 6 l -6 4 Z" fill="#6a0a0c" />
      <path d="M -62 52 l 5 -2 l 3 4 l -5 3 Z" fill="#5a080a" />
      <circle cx={84} cy={58} r={2.5} fill="#6a0a0c" />
    </Svg>
  </Place>
);

// ------------------------------------------------------------------ map

const MAP_W = 780;
const MAP_H = 646;

// Older, darker stock than the letter, foxed and folded into quarters.
const drawMap = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  drawPaper(ctx, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(168,130,88)';
  ctx.fillRect(0, 0, w, h);
  // Foxing: rust-brown age spots.
  for (let i = 0; i < 40; i++) {
    const x = (noise2D('fox', i * 1.7, 0) * 0.5 + 0.5) * w;
    const y = (noise2D('fox', i * 1.7, 5) * 0.5 + 0.5) * h;
    const rr = 6 + (noise2D('fox', i, 9) * 0.5 + 0.5) * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(150,95,50,0.5)');
    g.addColorStop(1, 'rgba(150,95,50,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // Fold valleys: a shaded side and a lit side either side of each crease.
  const fold = (x0: number, y0: number, x1: number, y1: number) => {
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const l = Math.hypot(nx, ny);
    const g = ctx.createLinearGradient(x0 - (nx / l) * 40, y0 - (ny / l) * 40, x0 + (nx / l) * 40, y0 + (ny / l) * 40);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.48, 'rgba(120,85,50,1)');
    g.addColorStop(0.52, 'rgba(235,225,205,1)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  fold(0, 70, w, 60);
  fold(390, 0, 392, h);
  ctx.globalCompositeOperation = 'source-over';
};

export const MapProp: React.FC<{p: Pos}> = ({p}) => (
  <Place p={p}>
    <div
      style={{
        position: 'absolute',
        left: 14,
        top: 14,
        width: MAP_W - 20,
        height: MAP_H - 20,
        boxShadow: '10px 10px 22px 6px rgba(0,0,0,0.65)',
      }}
    />
    <TextureCanvas width={MAP_W} height={MAP_H} scale={0.75} draw={drawMap} />
    <Svg box={[-20, -20, 820, 700]}>
      <g fill="none" stroke="#3a200e" strokeOpacity={0.8} strokeWidth={2.6} strokeLinecap="round">
        {/* coast, with a hatched sea edge */}
        <path d="M 40 640 C 60 560, 20 520, 70 470 S 150 420, 140 360 S 210 290, 270 300 S 330 250, 350 190 S 420 130, 520 150 S 640 110, 780 120" />
        <path
          d="M 26 630 C 46 556, 6 516, 56 464 S 136 412, 126 354 S 196 280, 262 288 S 318 238, 338 180 S 414 116, 520 136 S 640 96, 780 106"
          strokeOpacity={0.35}
          strokeWidth={1.4}
          strokeDasharray="10 7"
        />
        {/* river */}
        <path d="M 780 330 C 700 340, 660 300, 600 320 S 520 390, 470 380 S 400 420, 380 470" strokeWidth={2} strokeOpacity={0.65} />
      </g>
      {/* the road to Clogheen, in faded red ink */}
      <path
        d="M 120 610 C 220 560, 300 540, 380 470 S 520 430, 600 420"
        fill="none"
        stroke="#7a1a10"
        strokeOpacity={0.75}
        strokeWidth={3}
        strokeDasharray="9 8"
        strokeLinecap="round"
      />
      {/* hills */}
      <g stroke="#3a200e" strokeOpacity={0.7} strokeWidth={2} fill="none">
        {[
          [470, 262],
          [520, 250],
          [560, 230],
          [600, 256],
          [660, 220],
          [700, 250],
          [740, 228],
        ].map(([x, y], i) => (
          <g key={i}>
            <path d={`M ${x - 20} ${y} Q ${x - 6} ${y - 24} ${x} ${y - 24} Q ${x + 6} ${y - 24} ${x + 20} ${y}`} />
            <path d={`M ${x + 2} ${y - 20} L ${x + 12} ${y - 4}`} strokeWidth={1.2} strokeOpacity={0.5} />
          </g>
        ))}
      </g>
      {/* woods */}
      <g fill="#3a200e" opacity={0.6}>
        {[...Array(24)].map((_, i) => (
          <g key={i} transform={`translate(${220 + (i % 6) * 20 + (Math.floor(i / 6) % 2) * 10} ${420 + Math.floor(i / 6) * 17})`}>
            <circle r={6} />
            <rect x={-1} y={4} width={2} height={6} />
          </g>
        ))}
      </g>
      {/* a church marks the end of the road */}
      <g transform="translate(606 412)" stroke="#6a1010" strokeOpacity={0.85} strokeWidth={2.4} fill="none">
        <path d="M -8 10 L -8 -4 L 0 -12 L 8 -4 L 8 10 Z" />
        <path d="M 0 -12 L 0 -26 M -5 -21 L 5 -21" />
        <circle r={22} strokeOpacity={0.5} strokeDasharray="3 4" />
      </g>
      <text x={630} y={470} fontFamily={fonts.fell} fontStyle="italic" fontSize={26} fill="#3a200e" opacity={0.75}>
        Clogheen
      </text>
      {/* compass rose, partly lost off the sheet */}
      <g transform="translate(130 170)" stroke="#3a200e" strokeOpacity={0.7} fill="none" strokeWidth={1.8}>
        <circle r={54} />
        <circle r={40} strokeDasharray="2 5" />
        <path d="M 0 -70 L 9 -9 L 70 0 L 9 9 L 0 70 L -9 9 L -70 0 L -9 -9 Z" fill="#3a200e" fillOpacity={0.25} />
        <path d="M 0 -70 L 9 -9 L 0 0 Z M 70 0 L 9 9 L 0 0 Z M 0 70 L -9 9 L 0 0 Z M -70 0 L -9 -9 L 0 0 Z" fill="#3a200e" fillOpacity={0.55} stroke="none" />
      </g>
    </Svg>
  </Place>
);

// ------------------------------------------------------------------ dagger

export const DaggerProp: React.FC<{p: Pos}> = ({p}) => (
  <Place p={p}>
    <Svg box={[-60, -120, 1000, 240]}>
      <defs>
        <linearGradient id="lt-leather" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5a3620" />
          <stop offset="0.35" stopColor="#3a2214" />
          <stop offset="1" stopColor="#1a0e08" />
        </linearGradient>
        <linearGradient id="lt-brass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f1d48a" />
          <stop offset="0.4" stopColor="#a47c36" />
          <stop offset="1" stopColor="#3a2810" />
        </linearGradient>
        <linearGradient id="lt-iron" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b6aea4" />
          <stop offset="0.45" stopColor="#5a5450" />
          <stop offset="1" stopColor="#1c1a19" />
        </linearGradient>
        <filter id="lt-dagsh" x="-0.1" y="-1" width="1.2" height="3">
          <feGaussianBlur stdDeviation={7} />
        </filter>
      </defs>
      {/* shadow */}
      <path d="M -30 18 L 180 22 L 900 30 L 900 58 L 180 50 L -30 40 Z" fill="#000" opacity={0.65} filter="url(#lt-dagsh)" />
      <path d="M 150 -8 L 150 88 L 170 88 L 170 -8 Z" fill="#000" opacity={0.5} filter="url(#lt-dagsh)" transform="translate(12 10)" />
      {/* strap hanging off the throat */}
      <path d="M 200 22 C 230 70, 320 96, 420 92 L 422 76 C 330 80, 250 58, 222 16 Z" fill="#2c1a10" />
      <path d="M 212 22 C 240 64, 320 86, 420 84" stroke="#7a5030" strokeOpacity={0.5} strokeWidth={1.5} fill="none" strokeDasharray="5 5" />
      {/* scabbard */}
      <path d="M 170 -26 L 880 -15 C 900 -14, 910 0, 900 14 L 880 18 L 170 26 Z" fill="url(#lt-leather)" />
      <path d="M 180 -18 L 860 -9" stroke="#c49a6a" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="6 6" />
      <path d="M 180 -24 L 870 -14" stroke="#b08058" strokeOpacity={0.4} strokeWidth={2} />
      {/* throat and chape */}
      <path d="M 170 -28 L 214 -27 L 214 27 L 170 28 Z" fill="url(#lt-brass)" />
      <path d="M 820 -17 L 882 -15 C 904 -13, 912 2, 900 15 L 880 19 L 820 20 Z" fill="url(#lt-brass)" />
      {/* crossguard */}
      <path d="M 148 -88 C 160 -92, 170 -86, 166 -70 L 164 70 C 170 86, 160 92, 148 88 C 142 60, 142 -60, 148 -88 Z" fill="url(#lt-iron)" />
      <circle cx={156} cy={-88} r={9} fill="url(#lt-iron)" />
      <circle cx={156} cy={88} r={9} fill="url(#lt-iron)" />
      {/* grip, wire-wrapped */}
      <path d="M 30 -17 L 146 -20 L 146 20 L 30 17 Z" fill="#2a1a12" />
      {[...Array(14)].map((_, i) => (
        <path key={i} d={`M ${36 + i * 8} -18 L ${44 + i * 8} 18`} stroke="#9a8a70" strokeOpacity={0.5} strokeWidth={2} />
      ))}
      <path d="M 30 -17 L 146 -20" stroke="#d8c7a0" strokeOpacity={0.4} strokeWidth={1.5} />
      {/* pommel */}
      <ellipse cx={14} cy={0} rx={22} ry={30} fill="url(#lt-iron)" />
      <ellipse cx={10} cy={-8} rx={7} ry={10} fill="#e8e0d0" opacity={0.35} />
    </Svg>
  </Place>
);
