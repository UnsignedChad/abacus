// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Roguelike interface chrome: the character panel with its mini-map on the
// right, and the message log along the bottom. Small, crisp and dimmed so the
// map stays the hero.

import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill} from 'remotion';
import {fonts} from '../../fonts';
import {MESSAGES, MH, MONSTERS, MW, cellAt, monsterAt, playerAt, sightAt} from './map';

const PANEL_X = 1496;
const TOP = 150;
const LOG_TOP = 812;
const MINI = 6;
// The chrome sits back from the map.
const DIM = 0.78;

const label = '#c9a45c';
const value = '#cfcac0';

const Bar: React.FC<{frac: number; color: string; dark: string}> = ({frac, color, dark}) => (
  <div style={{display: 'inline-block', width: 150, height: 11, background: dark, marginLeft: 14, verticalAlign: 'middle'}}>
    <div style={{width: `${frac * 100}%`, height: '100%', background: color, boxShadow: `inset 0 2px 0 rgba(255,255,255,0.25)`}} />
  </div>
);

const Row: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{height: 26, whiteSpace: 'pre'}}>{children}</div>;

const L: React.FC<{children: React.ReactNode}> = ({children}) => <span style={{color: label}}>{children}</span>;
const V: React.FC<{children: React.ReactNode}> = ({children}) => <span style={{color: value}}>{children}</span>;

const MiniMap: React.FC<{frame: number}> = ({frame}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const s = sightAt(frame);
    ctx.clearRect(0, 0, MW * MINI, MH * MINI);
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++) {
        const i = y * MW + x;
        if (!s.memCur[i]) continue;
        const v = s.visCur[i];
        const c = cellAt(x, y);
        let col: string;
        if (c === 'wall' || c === 'pillar' || c === 'obelisk') col = v ? '#8a8078' : '#5a544e';
        else if (c === 'door') col = '#a0662c';
        else if (c === 'up' || c === 'down') col = '#e0b050';
        else if (c === 'rune' || c === 'seal') col = v ? '#2f7a60' : '#1f4a3c';
        else col = v ? '#4a4440' : '#2c2826';
        ctx.fillStyle = col;
        ctx.fillRect(x * MINI, y * MINI, MINI, MINI);
      }
    for (const m of MONSTERS) {
      const p = monsterAt(m.moves, frame);
      if (!s.visCur[p.ty * MW + p.tx]) continue;
      ctx.fillStyle = '#e8402c';
      ctx.fillRect(p.tx * MINI, p.ty * MINI, MINI, MINI);
    }
    const pl = playerAt(frame);
    ctx.fillStyle = frame % 16 < 11 ? '#ffffff' : '#9a9a9a';
    ctx.fillRect(Math.round(pl.x) * MINI, Math.round(pl.y) * MINI, MINI, MINI);
  }, [frame]);
  return (
    <canvas
      ref={ref}
      width={MW * MINI}
      height={MH * MINI}
      style={{width: MW * MINI * 1.5, height: MH * MINI * 1.5, imageRendering: 'pixelated', display: 'block'}}
    />
  );
};

export const DungeonUi: React.FC<{frame: number; opacity: number}> = ({frame, opacity}) => {
  const k = sightAt(frame).k;
  const s = sightAt(frame);
  const visible = MONSTERS.filter((m) => {
    const p = monsterAt(m.moves, frame);
    return s.visCur[p.ty * MW + p.tx];
  });
  const names: Record<string, [string, string]> = {
    skeleton: ['z', 'skeletal warrior'],
    rat: ['r', 'rat'],
    ghoul: ['z', 'ghoul (feeding)'],
  };
  const shown = MESSAGES.filter((m) => m.f <= frame).slice(-5);
  const newest = shown.length ? shown[shown.length - 1].f : 0;
  return (
    <AbsoluteFill style={{opacity, fontFamily: fonts.mono, fontSize: 19, pointerEvents: 'none'}}>
      {/* Panel */}
      <div
        style={{
          position: 'absolute',
          left: PANEL_X - 16,
          top: 138,
          width: 1920 - PANEL_X + 16,
          height: 804,
          background: '#040303',
          borderLeft: '1px solid #1c1816',
        }}
      />
      <div style={{position: 'absolute', left: PANEL_X, top: TOP, width: 400, color: value, opacity: DIM}}>
        <Row>
          <span style={{color: '#f0d468', fontWeight: 700}}>Wanderer the Sellsword</span>
        </Row>
        <Row>
          <V>Human Fighter</V>
        </Row>
        <Row>
          <L>Health: </L>
          <V>34/34</V>
          <Bar frac={1} color="#3cbf3c" dark="#3a0c0c" />
        </Row>
        <Row>
          <L>Magic:  </L>
          <V>6/6  </V>
          <Bar frac={1} color="#3a62d8" dark="#101838" />
        </Row>
        <Row>
          <L>AC: </L>
          <V> 6</V>
          <L>        Str: </L>
          <V>15</V>
        </Row>
        <Row>
          <L>EV: </L>
          <V>11</V>
          <L>        Int: </L>
          <V>10</V>
        </Row>
        <Row>
          <L>SH: </L>
          <V> 8</V>
          <L>        Dex: </L>
          <V>13</V>
        </Row>
        <Row>
          <L>XL: </L>
          <V> 1</V>
          <L> Next: </L>
          <V> 0%</V>
        </Row>
        <Row>
          <L>Place: </L>
          <V>Crypt:1</V>
        </Row>
        <Row>
          <L>Time: </L>
          <V>{`${k.toFixed(1)} (1.0)`}</V>
        </Row>
        <Row>
          <L>Wp: </L>
          <V>a) +0 long sword</V>
        </Row>
        <div style={{height: 14}} />
        <div style={{border: '1px solid #242020', display: 'inline-block', padding: 6, background: '#000'}}>
          <MiniMap frame={frame} />
        </div>
        <div style={{height: 10}} />
        {visible.map((m) => (
          <Row key={m.kind}>
            <span style={{color: m.kind === 'skeleton' ? '#e8e0c8' : m.kind === 'rat' ? '#b08a60' : '#b0a0b8', fontWeight: 700}}>
              {names[m.kind][0]}
            </span>
            <V>{`  ${names[m.kind][1]}`}</V>
          </Row>
        ))}
      </div>
      {/* Message log */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: LOG_TOP - 8,
          width: PANEL_X - 16,
          height: 942 - LOG_TOP + 8,
          background: '#040303',
          borderTop: '1px solid #1c1816',
        }}
      />
      <div style={{position: 'absolute', left: 28, top: LOG_TOP, lineHeight: '24px', opacity: DIM}}>
        {shown.map((m, i) => {
          const fresh = m.f === newest;
          return (
            <div key={i} style={{color: m.color ?? (fresh ? '#ece6da' : '#8c8680'), opacity: fresh ? 1 : 0.62, whiteSpace: 'pre'}}>
              {m.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
