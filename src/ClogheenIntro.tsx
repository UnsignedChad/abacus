// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {sceneComponents, sceneOrder} from './scenes';
import {timeline} from './theme';

export const ClogheenIntro: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {sceneOrder.map((key) => {
        const {from, duration} = timeline.scenes[key];
        const Scene = sceneComponents[key];
        return (
          <Sequence key={key} name={key} from={from} durationInFrames={duration}>
            <Scene />
          </Sequence>
        );
      })}
      {withAudio ? <Audio src={staticFile('audio/score.wav')} /> : null}
    </AbsoluteFill>
  );
};
