// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene 7, "title": black silence, then CLOGHEEN slams in and burns across in
// tarnished gold before the old church, smouldering red on the horizon. The
// subtitle, tagline and copyright settle beneath; a bell sends light across
// the name; everything sinks to black.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Embers, FadeLayer, Fog, Grain, Letterbox, Vignette, useShake} from '../lib/fx';
import {palette} from '../theme';
import {Backdrop} from './title/Backdrop';
import {C, fadeOut, worldLight} from './title/beats';
import {Credits} from './title/Credits';
import {Flash, Impact, TitleGlow} from './title/Impact';
import {Wordmark} from './title/Wordmark';

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = useShake([{frame: C.titleBoom, strength: 18, decay: 24}], 'title-boom');
  const light = Math.min(1, worldLight(frame));
  const lit = frame >= C.titleBoom;

  return (
    <AbsoluteFill style={{background: lit ? palette.black : '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: shake}}>
        <Backdrop />
        <TitleGlow />
        <Impact />
        <Wordmark />
        {lit && (
          <Embers
            count={44}
            seed="title-embers"
            area={{x: 0, y: 380, w: 1920, h: 620}}
            speed={0.6}
            size={[1.2, 3.2]}
            opacity={0.75 * light}
            wind={0.25}
          />
        )}
        {lit && <Fog color="70,36,34" opacity={0.3 * light} y={790} height={170} count={7} seed="title-fog-near" drift={0.5} />}
        <Credits />
      </AbsoluteFill>
      <Flash />
      <Vignette strength={0.9} />
      {lit && <Grain opacity={0.08} />}
      <FadeLayer opacity={fadeOut(frame)} />
      <Letterbox amount={1} />
    </AbsoluteFill>
  );
};
