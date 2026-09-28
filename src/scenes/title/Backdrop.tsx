// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The world behind the title: a smouldering red horizon, the old church in
// silhouette with light bleeding from its openings, a graveyard rise, a
// broken arch and a dead tree. Layers push in at different rates for parallax.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {bellSwell, camScale, worldLight} from './beats';
import {churchBody, churchWindows, deadTree, farHill, graves, midHill, nearMound, ruin} from './geom';

/** Push-in origin, just above the title. */
const OX = 960;
const OY = 470;
/** The horizon glow never reaches above this line, so its layer starts here. */
const GLOW_TOP = 390;

// The push-in is applied inside each SVG (and to the mist's own boxes) rather
// than as a CSS transform on full-frame wrappers: re-rasterising four scaled
// full-frame layers every frame was the single biggest render cost here.
/** Scale of a layer at depth k (0 = infinitely far). */
const depthScale = (f: number, k: number) => 1 + (camScale(f) - 1) * k;
const pushIn = (f: number, k: number) => `translate(${OX} ${OY}) scale(${depthScale(f, k)}) translate(${-OX} ${-OY})`;

/** Slow-breathing flicker for fire-lit things. */
const flicker = (seed: string, f: number, amt = 0.18) =>
  1 - amt / 2 + amt * (0.5 + 0.5 * noise2D(seed, f * 0.05, 0)) + 0.04 * noise2D(seed + 'q', f * 0.4, 1);

const Sky: React.FC<{light: number}> = ({light}) => {
  const frame = useCurrentFrame();
  const glow = light * flicker('horizon', frame);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #040203 0%, #060304 40%, #0c0405 62%, #160607 74%, #080304 100%)',
        }}
      />
      {/* The red wound on the horizon, rising from beneath the church. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: GLOW_TOP,
          bottom: 0,
          opacity: Math.min(1, glow),
          background: [
            'radial-gradient(ellipse 300px 110px at 960px 800px, rgba(255,110,44,0.5) 0%, rgba(194,58,12,0.26) 40%, rgba(194,58,12,0) 100%)',
            'radial-gradient(ellipse 760px 260px at 960px 806px, rgba(150,18,16,0.6) 0%, rgba(110,10,12,0.28) 45%, rgba(80,6,10,0) 100%)',
            'radial-gradient(ellipse 1200px 420px at 960px 820px, rgba(70,8,12,0.4) 0%, rgba(30,3,6,0) 100%)',
          ]
            .join(',')
            .replace(/ at 960px (\d+)px/g, (_, yy) => ` at 960px ${Number(yy) - GLOW_TOP}px`),
        }}
      />
    </AbsoluteFill>
  );
};

/** Low cloud banks underlit in red, drifting right to left very slowly. */
const Clouds: React.FC<{light: number}> = ({light}) => {
  const frame = useCurrentFrame();
  const banks = [];
  for (let i = 0; i < 8; i++) {
    const s = `cloud-${i}`;
    const w = rand(s + 'w', 500, 1000);
    const h = rand(s + 'h', 70, 170);
    const y = rand(s + 'y', 300, 740);
    const x = ((rand(s + 'x', 0, 2600) - frame * rand(s + 'v', 0.15, 0.45)) % 2600 + 2600) % 2600 - 400;
    // Clouds nearer the horizon catch more of the glow.
    const lit = Math.min(1, Math.max(0, (y - 230) / 490));
    const a = (0.08 + 0.26 * lit) * light;
    banks.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: y - h / 2,
          width: w,
          height: h,
          background: `radial-gradient(ellipse at 50% 65%, rgba(${Math.round(70 + 90 * lit)},${Math.round(
            18 + 14 * lit,
          )},18,${a}) 0%, rgba(40,10,12,0) 70%)`,
        }}
      />,
    );
  }
  return <AbsoluteFill>{banks}</AbsoluteFill>;
};

/** Faint god rays fanning up from the glow behind the church. */
const Rays: React.FC<{light: number}> = ({light}) => {
  const frame = useCurrentFrame();
  const stops: string[] = ['transparent 0deg'];
  const n = 17;
  for (let i = 0; i < n; i++) {
    const s = `ray-${i}`;
    const c = 22 + (i / (n - 1)) * 136 + rand(s + 'j', -3, 3) + noise2D(s, frame * 0.006, 0) * 2.5;
    const w = rand(s + 'w', 0.8, 2.6);
    const a = rand(s + 'a', 0.05, 0.16) * (0.55 + 0.45 * noise2D(s + 'i', frame * 0.015, 2));
    const col = `rgba(255,${Math.round(rand(s + 'g', 90, 150))},60,${Math.max(0, a)})`;
    stops.push(`transparent ${(c - w).toFixed(2)}deg`, `${col} ${c.toFixed(2)}deg`, `transparent ${(c + w).toFixed(2)}deg`);
  }
  stops.push('transparent 180deg');
  const bell = bellSwell(frame);
  const mask = 'radial-gradient(circle at 960px 790px, transparent 80px, #000 260px, rgba(0,0,0,0.6) 560px, transparent 900px)';
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(1.4, light) * (1 + bell * 0.9),
        background: `conic-gradient(from -90deg at 960px 790px, ${stops.join(',')})`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
};

/** The old church, hazy against the glow, fire breathing in its door and windows. */
const Church: React.FC<{light: number; k: number}> = ({light, k}) => {
  const frame = useCurrentFrame();
  const rim = Math.min(1, 0.35 + 0.5 * light);
  // The bell stirs the fire inside: every opening flares as it tolls.
  const bell = 1 + 0.7 * bellSwell(frame);
  const door = flicker('win-0', frame, 0.5) * Math.min(1.2, light) * bell;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="title-winglow">
          <stop offset="0%" stopColor="#ff6a24" stopOpacity={0.55} />
          <stop offset="45%" stopColor="#b2230f" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#8a0f12" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="title-winfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a0c0c" />
          <stop offset="100%" stopColor="#e0501c" />
        </linearGradient>
        {/* Backlit stone: black at the top, warmed at the foot by the glowing mist. */}
        <linearGradient id="title-stone" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="800">
          <stop offset="0%" stopColor="#0a0405" />
          <stop offset="62%" stopColor="#120607" />
          <stop offset="100%" stopColor="#2a0c0a" />
        </linearGradient>
        <linearGradient id="title-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff7a2a" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#c23a0c" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="title-hill" gradientUnits="userSpaceOnUse" x1="0" y1="785" x2="0" y2="880">
          <stop offset="0%" stopColor="#2a0b0a" />
          <stop offset="100%" stopColor="#0c0506" />
        </linearGradient>
      </defs>
      <g transform={pushIn(frame, k)}>
        <path d={farHill} fill="url(#title-hill)" />
        {/* Firelight from the open door, laid across the ground. */}
        <ellipse cx={960} cy={812} rx={96} ry={20} fill="url(#title-winglow)" opacity={0.9 * door} />
        <path d="M944,798 L976,798 L1010,840 L910,840 Z" fill="url(#title-spill)" opacity={0.42 * door} />
        {/* Rim: stroke first, fill on top, so only the outer half of the stroke survives. */}
        <g transform="translate(960 800) scale(0.86) translate(-960 -800)">
          <path d={churchBody} fill={`rgba(255,90,44,${0.3 * rim})`} transform="translate(0 -2.2)" />
          <path d={churchBody} fill="url(#title-stone)" />
          {churchWindows.map((w, i) => {
            const fl = flicker(`win-${i}`, frame, 0.5) * w.hot * Math.min(1.2, light) * bell;
            const tall = i === 0;
            return (
              <g key={i}>
                <circle cx={w.cx} cy={w.cy} r={w.r * 1.6} fill="url(#title-winglow)" opacity={fl} />
                <path d={w.d} fill="url(#title-winfill)" opacity={0.25 + 0.6 * fl} />
                {/* Tracery: a mullion and transom on the windows, a half-open leaf on the door. */}
                {tall ? (
                  <path d="M936,800 L936,736 L950,742 L950,800 Z" fill="#120607" />
                ) : (
                  <path
                    d={`M${w.cx - 1},${w.cy - 26}L${w.cx + 1},${w.cy - 26}L${w.cx + 1},${w.cy + 24}L${w.cx - 1},${w.cy + 24}Z` +
                      `M${w.cx - 7},${w.cy - 4}L${w.cx + 7},${w.cy - 4}L${w.cx + 7},${w.cy - 2}L${w.cx - 7},${w.cy - 2}Z`}
                    fill="#140708"
                  />
                )}
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
};

/** Glowing ground mist pooled in the hollow around the church, drifting. */
const Mist: React.FC<{light: number; y: number; seed: string; alpha: number; n: number; k: number}> = ({
  light,
  y,
  seed,
  alpha,
  n,
  k,
}) => {
  const frame = useCurrentFrame();
  const z = depthScale(frame, k);
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const s = `${seed}-${i}`;
    const w = rand(s + 'w', 760, 1200);
    const h = rand(s + 'h', 46, 90);
    const x = ((rand(s + 'x', 0, 2800) + frame * rand(s + 'v', 0.2, 0.55)) % 2800) - 440;
    const yy = y + rand(s + 'y', -14, 14) + noise2D(s, frame * 0.01, 0) * 6;
    // Brighter nearer the glow under the church.
    const near = Math.max(0, 1 - Math.abs(x - 960) / 1100);
    const a = alpha * light * (0.35 + 0.65 * near) * (0.65 + 0.35 * noise2D(s + 'a', frame * 0.012, 1));
    blobs.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: OX + (x - w / 2 - OX) * z,
          top: OY + (yy - h / 2 - OY) * z,
          width: w * z,
          height: h * z,
          background: `radial-gradient(ellipse at center, rgba(186,64,40,${Math.max(0, a).toFixed(3)}) 0%, rgba(120,24,18,0) 70%)`,
        }}
      />,
    );
  }
  return <AbsoluteFill>{blobs}</AbsoluteFill>;
};

const Graveyard: React.FC<{light: number; k: number}> = ({light, k}) => {
  const frame = useCurrentFrame();
  // The tree creaks in a slow wind; tips move most.
  const wind = noise2D('wind', frame * 0.01, 0) * 1.4 + Math.sin(frame * 0.05) * 0.4;
  // Limbs are batched into a few paths by stroke width: far cheaper to
  // rasterise than hundreds of separate round-capped lines.
  const buckets = new Map<number, string[]>();
  deadTree.forEach((b) => {
    const bend = (y: number) => Math.pow(Math.max(0, 872 - y) / 440, 2);
    const jit = noise2D('twig', frame * 0.03, b.phase) * b.depth * 0.6;
    const dx1 = (wind * 9 + jit) * bend(b.y1);
    const dx2 = (wind * 9 + jit) * bend(b.y2);
    const w = Math.max(1.2, Math.round(b.w * 2) / 2);
    const seg = `M${(b.x1 + dx1).toFixed(1)},${b.y1.toFixed(1)}L${(b.x2 + dx2).toFixed(1)},${b.y2.toFixed(1)}`;
    const list = buckets.get(w);
    if (list) list.push(seg);
    else buckets.set(w, [seg]);
  });
  const limbs = [...buckets].map(([w, segs]) => <path key={w} d={segs.join('')} strokeWidth={w} />);
  const rim = `rgba(255,90,44,${0.16 * Math.min(1, 0.4 + 0.5 * light)})`;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <g transform={pushIn(frame, k)}>
        <path d={ruin} fill={rim} transform="translate(0 -2)" fillRule="evenodd" />
        <path d={ruin} fill="#070304" fillRule="evenodd" />
        <path d={midHill} fill={rim} transform="translate(0 -1.5)" />
        <path d={midHill} fill="#080405" />
        <g fill="#070304" dangerouslySetInnerHTML={{__html: graves}} />
        <g stroke="#060303" fill="none" strokeLinecap="round">
          {limbs}
        </g>
      </g>
    </svg>
  );
};

/** Near mound with grass blades that bend in the wind. */
const Foreground: React.FC<{k: number}> = ({k}) => {
  const frame = useCurrentFrame();
  const blades = [];
  for (let i = 0; i < 120; i++) {
    const s = `blade-${i}`;
    // Clustered toward the frame edges, leaving the centre clear for credits.
    const side = i % 2 === 0 ? -1 : 1;
    const x = 960 + side * (380 + Math.pow(rand(s + 'x', 0, 1), 0.8) * 640);
    const base = 896 + Math.abs(x - 960) * -0.02 + rand(s + 'b', 0, 30);
    const h = rand(s + 'h', 18, 70) * (0.5 + Math.abs(x - 960) / 1000);
    const lean = rand(s + 'l', -8, 8) + noise2D('gust', frame * 0.012 + x * 0.001, 0) * 10 + Math.sin(frame * 0.09 + i) * 1.5;
    const tx = x + lean;
    const ty = base - h;
    blades.push(`M${x - 1.6},${base}Q${x + lean * 0.3},${base - h * 0.55} ${tx},${ty}Q${x + lean * 0.35 + 1},${base - h * 0.5} ${x + 1.6},${base}Z`);
  }
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <g transform={pushIn(frame, k)} fill="#030202">
        <path d={nearMound} />
        <path d={blades.join('')} />
      </g>
    </svg>
  );
};

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const light = worldLight(frame);
  if (light <= 0) return null;
  return (
    <AbsoluteFill>
      {/* The far sky barely moves in the push-in, so it is left unscaled. */}
      <Sky light={light} />
      <Rays light={light} />
      <Clouds light={light} />
      <Church light={light} k={0.55} />
      <Mist light={light} y={800} seed="mist-far" alpha={0.36} n={4} k={0.55} />
      <Graveyard light={light} k={0.9} />
      <Mist light={light} y={858} seed="mist-mid" alpha={0.22} n={3} k={0.9} />
      <Foreground k={1.5} />
    </AbsoluteFill>
  );
};
