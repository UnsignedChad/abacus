// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The king's crown: a tarnished gold band set with garnets in bezels, beaded
// rims, fleur-de-lis points alternating with pearl-tipped spikes. Built as a
// real ring (two ellipses) so it can tumble and roll convincingly.
// Local frame: centre of the base ring at the origin, points rising toward -y.

import React from 'react';
import {Ids, url} from './figure';

export const crownDefs = (ids: Ids) => (
  <>
    <linearGradient id={ids('cband')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#2e1c0a" />
      <stop offset="0.22" stopColor="#7a5422" />
      <stop offset="0.5" stopColor="#c89c4e" />
      <stop offset="0.64" stopColor="#f0d68e" />
      <stop offset="0.74" stopColor="#b08440" />
      <stop offset="1" stopColor="#24160a" />
    </linearGradient>
    <linearGradient id={ids('cbandV')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff0c0" stopOpacity="0.45" />
      <stop offset="0.35" stopColor="#fff0c0" stopOpacity="0" />
      <stop offset="0.8" stopColor="#1a0e04" stopOpacity="0" />
      <stop offset="1" stopColor="#1a0e04" stopOpacity="0.55" />
    </linearGradient>
    <linearGradient id={ids('cinner')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#5a3c16" />
      <stop offset="0.5" stopColor="#24160a" />
      <stop offset="1" stopColor="#120a04" />
    </linearGradient>
    <linearGradient id={ids('cpoint')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#5a3c16" />
      <stop offset="0.45" stopColor="#d0a452" />
      <stop offset="0.6" stopColor="#f6e0a0" />
      <stop offset="1" stopColor="#6a4a1c" />
    </linearGradient>
    <radialGradient id={ids('garnet')} cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stopColor="#ff8a80" />
      <stop offset="0.25" stopColor="#b01822" />
      <stop offset="0.7" stopColor="#4a0408" />
      <stop offset="1" stopColor="#1a0002" />
    </radialGradient>
  </>
);

const R = 32;
const BAND = 12;
const PT = 21;
const EDGE = '#1c1006';

/** Fleur-de-lis, rising from (0,0) toward -y, width w, height h. */
const fleur = (w: number, h: number) =>
  `M0 ${-h} C${w * 0.34} ${-h * 0.72} ${w * 0.26} ${-h * 0.36} ${w * 0.12} ${-h * 0.22} ` +
  `C${w * 0.46} ${-h * 0.5} ${w * 0.78} ${-h * 0.34} ${w * 0.6} ${-h * 0.06} ` +
  `C${w * 0.5} ${-h * 0.2} ${w * 0.32} ${-h * 0.16} ${w * 0.16} ${-h * 0.1} L${w * 0.2} 1 L${-w * 0.2} 1 ` +
  `L${-w * 0.16} ${-h * 0.1} C${-w * 0.32} ${-h * 0.16} ${-w * 0.5} ${-h * 0.2} ${-w * 0.6} ${-h * 0.06} ` +
  `C${-w * 0.78} ${-h * 0.34} ${-w * 0.46} ${-h * 0.5} ${-w * 0.12} ${-h * 0.22} ` +
  `C${-w * 0.26} ${-h * 0.36} ${-w * 0.34} ${-h * 0.72} 0 ${-h} Z`;

const spike = (w: number, h: number) =>
  `M${-w * 0.2} 1 C${-w * 0.14} ${-h * 0.4} ${-w * 0.06} ${-h * 0.7} 0 ${-h} C${w * 0.06} ${-h * 0.7} ${w * 0.14} ${-h * 0.4} ${w * 0.2} 1 Z`;

/** `tilt` 0 = seen edge-on, 1 = from straight above; negative = from below. */
export const Crown: React.FC<{ids: Ids; tilt: number; glint?: number; red?: number}> = ({ids, tilt, glint = 0, red = 0}) => {
  const b = Math.max(0.04, Math.abs(tilt)) * R;
  const flip = tilt < 0 ? -1 : 1;
  const ell = (cy: number, from: number, to: number, steps = 28) => {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      pts.push(`${(Math.cos(a) * R).toFixed(2)} ${(cy + Math.sin(a) * b).toFixed(2)}`);
    }
    return pts;
  };
  const onRim = (a: number, cy: number) => [Math.cos(a) * R, cy + Math.sin(a) * b] as const;
  // Front band: lower half of the top rim down to the lower half of the base.
  const frontTop = ell(-BAND, Math.PI, 0);
  const frontBot = ell(0, 0, Math.PI);
  const front = `M${frontTop.join(' L')} L${frontBot.join(' L')} Z`;
  const inner = `M${ell(-BAND, Math.PI, Math.PI * 2).join(' L')} L${ell(-BAND + BAND * 0.9, 0, Math.PI).reverse().join(' L')} Z`;
  // Points around the ring: fleurs alternate with pearl spikes.
  const N = 10;
  const pts = Array.from({length: N}, (_, i) => {
    const a = (i / N) * Math.PI * 2 + 0.16;
    return {a, fleur: i % 2 === 0, front: Math.sin(a) > 0};
  });
  const point = (p: (typeof pts)[number], back: boolean) => {
    const [x, y] = onRim(p.a, -BAND);
    const fore = Math.max(0.3, Math.abs(Math.sin(p.a)) * 0.7 + 0.3);
    const h = p.fleur ? PT : PT * 0.72;
    const w = (p.fleur ? 15 : 8) * fore;
    return (
      <g key={`${back ? 'b' : 'f'}${p.a.toFixed(2)}`} transform={`translate(${x.toFixed(2)} ${(y + 0.5).toFixed(2)})`}>
        <path
          d={p.fleur ? fleur(w, h) : spike(w, h)}
          fill={back ? '#4a3212' : url(ids, 'cpoint')}
          stroke={EDGE}
          strokeWidth={0.45}
        />
        {p.fleur ? (
          <rect x={-w * 0.24} y={-h * 0.2} width={w * 0.48} height={h * 0.08} fill={back ? '#3a2610' : '#8a6428'} />
        ) : (
          <circle cx={0} cy={-h - 1.6} r={2} fill={back ? '#6a6050' : '#e8e0cc'} stroke={EDGE} strokeWidth={0.35} />
        )}
        {!back ? <path d={`M${w * 0.04} ${-h * 0.9} L${w * 0.06} ${-h * 0.3}`} stroke="rgba(255,244,210,0.75)" strokeWidth={0.6} /> : null}
      </g>
    );
  };
  // Beads along both rims (front half).
  const beads = (cy: number, r: number) =>
    Array.from({length: 22}, (_, i) => {
      const a = ((i + 0.5) / 22) * Math.PI;
      const [x, y] = onRim(a, cy);
      return <circle key={`${cy}-${i}`} cx={x} cy={y} r={r * (0.5 + 0.5 * Math.sin(a))} fill="#e2c27e" stroke={EDGE} strokeWidth={0.25} />;
    });
  // Gems on the front of the band: garnets in bezels, lozenges between.
  const gems = Array.from({length: 7}, (_, i) => {
    const a = ((i + 0.5) / 7) * Math.PI;
    const [x, y] = onRim(a, -BAND / 2);
    const fore = Math.max(0.2, Math.sin(a));
    if (i % 2 === 1) {
      return (
        <path
          key={i}
          d={`M${x} ${y - 3.2} L${x + 2.4 * fore} ${y} L${x} ${y + 3.2} L${x - 2.4 * fore} ${y} Z`}
          fill="#d8d0c0"
          stroke={EDGE}
          strokeWidth={0.35}
          opacity={0.9}
        />
      );
    }
    return (
      <g key={i}>
        <ellipse cx={x} cy={y} rx={4.6 * fore} ry={4.3} fill="#9a7432" stroke={EDGE} strokeWidth={0.4} />
        <ellipse cx={x} cy={y} rx={3.3 * fore} ry={3.1} fill={url(ids, 'garnet')} />
        <circle cx={x - 0.9 * fore} cy={y - 1.1} r={0.8} fill="rgba(255,220,210,0.9)" />
      </g>
    );
  });
  const rimCol = red > 0 ? `rgba(255,${Math.round(170 - red * 90)},${Math.round(110 - red * 80)},0.95)` : 'rgba(255,240,196,0.9)';
  return (
    <g transform={flip < 0 ? 'scale(1 -1)' : undefined}>
      {pts.filter((p) => !p.front).map((p) => point(p, true))}
      <path d={inner} fill={url(ids, 'cinner')} />
      <path d={front} fill={url(ids, 'cband')} stroke={EDGE} strokeWidth={0.6} />
      <path d={front} fill={url(ids, 'cbandV')} />
      {/* Engraved lines and tarnish. */}
      <path d={`M${ell(-BAND * 0.78, Math.PI, 0).join(' L')}`} stroke="rgba(40,22,6,0.6)" strokeWidth={0.5} fill="none" />
      <path d={`M${ell(-BAND * 0.22, Math.PI, 0).join(' L')}`} stroke="rgba(40,22,6,0.6)" strokeWidth={0.5} fill="none" />
      <path d={`M${-R * 0.78} ${-BAND * 0.3 + b * 0.62} q5 -2.5 9 1 q-3 3.5 -9 -1 Z`} fill="#3a2008" opacity={0.55} />
      <path d={`M${R * 0.46} ${-BAND * 0.55 + b * 0.88} q6 -2 8 1.5 q-4 3 -8 -1.5 Z`} fill="#3a2008" opacity={0.5} />
      {gems}
      {beads(-BAND, 0.9)}
      {beads(0, 0.8)}
      {pts.filter((p) => p.front).map((p) => point(p, false))}
      {/* Upper rim catches the light. */}
      <path d={`M${frontTop.slice(5, 23).join(' L')}`} stroke={rimCol} strokeWidth={0.8} fill="none" />
      <path d={`M${R * 0.28} ${-BAND + b * 0.9} L${R * 0.3} ${b * 0.95}`} stroke="rgba(255,250,225,0.6)" strokeWidth={1.4} />
      {glint > 0 ? (
        <g opacity={glint}>
          <circle cx={R * 0.3} cy={-BAND - PT * 0.8} r={7} fill="rgba(255,240,200,0.35)" />
          <path
            d={`M${R * 0.3 - 14} ${-BAND - PT * 0.8} L${R * 0.3 + 14} ${-BAND - PT * 0.8} M${R * 0.3} ${-BAND - PT * 0.8 - 14} L${R * 0.3} ${-BAND - PT * 0.8 + 14}`}
            stroke="rgba(255,248,225,0.95)"
            strokeWidth={1}
          />
        </g>
      ) : null}
    </g>
  );
};
