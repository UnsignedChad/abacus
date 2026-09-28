// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The boss bar: a name in Cinzel small caps over a long thin health bar with a
// yellowed damage trail, sitting inside the frame just above the letterbox.

import React from 'react';
import {fonts} from '../../fonts';
import {palette} from '../../theme';
import {E, ramp} from './rig';
import {C} from './time';
import {clamp01} from './util';

const BAR_W = 1080;
const AFTER_HIT = 0.58;

export const BossBar: React.FC<{frame: number}> = ({frame: f}) => {
  if (f < C.circleStart) return null;
  const appear = E.out(clamp01((f - C.circleStart) / 20));
  const hidden = f >= 562 && f < C.phase2 ? ramp(f, 562, 567) : 0;
  const opacity = appear * (1 - hidden);
  if (opacity <= 0.001) return null;
  // Health: a big chunk lost to the riposte, then refilled in phase two.
  let health = f < C.riposte ? 1 : AFTER_HIT;
  let trail = f < C.riposte + 16 ? 1 : 1 - (1 - AFTER_HIT) * E.inOut(clamp01((f - C.riposte - 16) / 24));
  if (f < C.riposte) trail = 1;
  const refill = f >= C.phase2 ? E.inOut(clamp01((f - C.phase2 - 4) / 34)) : 0;
  if (refill > 0) {
    health = AFTER_HIT + (1 - AFTER_HIT) * refill;
    trail = Math.max(trail, health);
  }
  const flare = f >= C.phase2 ? Math.max(0, 1 - (f - C.phase2) / 30) : 0;
  const hot = f >= C.phase2 ? 0.55 + 0.45 * Math.sin((f - C.phase2) * 0.45) : 0;
  const hitFlash = f >= C.riposte ? Math.max(0, 1 - (f - C.riposte) / 8) : 0;
  const drift = (1 - appear) * 12;
  return (
    <div
      style={{
        position: 'absolute',
        left: (1920 - BAR_W) / 2,
        top: 866 + drift,
        width: BAR_W,
        opacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: fonts.cinzel,
          fontSize: 27,
          letterSpacing: 3.5,
          color: f >= C.phase2 ? `rgb(255,${Math.round(220 - hot * 90)},${Math.round(190 - hot * 130)})` : palette.bone,
          textShadow: `0 0 6px rgba(0,0,0,0.95), 0 2px 2px #000${flare > 0 || hot > 0 ? `, 0 0 ${10 + 18 * hot}px rgba(255,60,20,${0.45 * hot + 0.5 * flare})` : ''}`,
          marginBottom: 7,
          marginLeft: 2,
        }}
      >
        The Skeleton King
      </div>
      <div
        style={{
          position: 'relative',
          height: 9,
          background: 'rgba(12,6,6,0.88)',
          border: '1px solid #000',
          boxShadow: `0 0 0 1px rgba(150,120,70,0.45)${flare > 0 || hot > 0 ? `, 0 0 ${12 + 20 * flare}px ${3 + 5 * flare}px rgba(255,50,20,${0.35 * hot + 0.55 * flare})` : ''}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${trail * 100}%`,
            background: 'linear-gradient(180deg, #e8c050 0%, #b88a24 60%, #6e4e12 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${health * 100}%`,
            background:
              refill > 0
                ? `linear-gradient(180deg, #ff7a3a 0%, #c0200e 55%, #6a0806 100%)`
                : 'linear-gradient(180deg, #b0202a 0%, #7a0c12 55%, #3e0508 100%)',
          }}
        />
        {refill > 0 && refill < 1 ? (
          <div
            style={{
              position: 'absolute',
              left: `calc(${health * 100}% - 3px)`,
              top: -3,
              width: 6,
              height: 15,
              background: 'radial-gradient(ellipse at center, rgba(255,240,200,1) 0%, rgba(255,120,40,0.6) 50%, rgba(255,60,20,0) 100%)',
            }}
          />
        ) : null}
        {hitFlash > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: `${AFTER_HIT * 100}%`,
              right: 0,
              top: 0,
              bottom: 0,
              background: `rgba(255,245,220,${0.9 * hitFlash})`,
            }}
          />
        ) : null}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1, height: 1, background: 'rgba(255,255,255,0.12)'}} />
      </div>
    </div>
  );
};
