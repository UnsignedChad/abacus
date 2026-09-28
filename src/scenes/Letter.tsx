// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene 1, "letter": a match, a candle, and Merlin's letter writing itself
// on a dark desk. A gust puts the candle out and the film falls into black.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FadeLayer, Grain, Letterbox, Vignette, progress} from '../lib/fx';
import {cues, palette} from '../theme';
import {cameraAt} from './letter/camera';
import {CandleBody, CandleFlame} from './letter/Candle';
import {Dust} from './letter/Dust';
import {flameAt} from './letter/flame';
import {CANDLE, FLAME_Y, INKWELL, SEAL, WORLD} from './letter/layout';
import {LightMap} from './letter/LightMap';
import {MatchFx, MatchStick} from './letter/Match';
import {LetterSheet} from './letter/Paper';
import {DaggerProp, InkwellProp, MapProp, SealProp} from './letter/Props';
import {TextureCanvas, drawWood} from './letter/textures';

const C = cues.letter;

export const LetterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  const fl = flameAt(frame);

  // Tall things lean away from the view centre: cheap parallax for the candle.
  const skew = (CANDLE.x - cam.cx) * 0.06;
  const wick = {x: CANDLE.x + skew, y: CANDLE.y + FLAME_Y};
  // Shadows swing opposite the flame's lean.
  const shadowShift = -fl.lean * 2.5;

  const world = `translate(960px, 540px) rotate(${cam.rot}deg) scale(${cam.s}) translate(${-cam.cx}px, ${-cam.cy}px)`;

  return (
    <AbsoluteFill style={{background: palette.black, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: WORLD.w,
          height: WORLD.h,
          transformOrigin: '0 0',
          transform: world,
        }}
      >
        <TextureCanvas width={WORLD.w} height={WORLD.h} scale={0.75} draw={drawWood} />
        <MapProp p={{x: 10, y: 1440, rot: -11}} />
        <DaggerProp p={{x: 2090, y: 1570, rot: -17}} />
        <SealProp p={{x: SEAL.x, y: SEAL.y, rot: 6}} />
        <LetterSheet />
        <div style={{position: 'absolute', left: INKWELL.x, top: INKWELL.y}}>
          <InkwellProp p={{x: 0, y: 0}} shadowShift={shadowShift} />
        </div>
        <div style={{position: 'absolute', left: CANDLE.x, top: CANDLE.y}}>
          <CandleBody lit={fl.light} skew={skew} />
        </div>
        <MatchStick wick={wick} />
        <LightMap fl={fl} wick={wick} />
        <div style={{position: 'absolute', left: wick.x, top: wick.y}}>
          <CandleFlame s={fl} />
        </div>
        <MatchFx wick={wick} />
        <Dust fl={fl} wick={wick} />
      </div>
      <Vignette strength={0.8} />
      <Grain opacity={0.08} />
      <FadeLayer opacity={progress(frame, C.fadeOutEnd - 22, C.fadeOutEnd)} />
      <Letterbox amount={1} />
    </AbsoluteFill>
  );
};
