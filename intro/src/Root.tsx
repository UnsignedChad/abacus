// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React from 'react';
import {Composition, Folder} from 'remotion';
import './fonts';
import {ClogheenIntro} from './ClogheenIntro';
import {sceneComponents, sceneOrder} from './scenes';
import {ContactSheet, type ContactSheetProps} from './tools/ContactSheet';
import {FPS, HEIGHT, WIDTH, timeline} from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ClogheenIntro"
        component={ClogheenIntro}
        durationInFrames={timeline.total}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{withAudio: true}}
      />
      <Folder name="Scenes">
        {sceneOrder.map((key) => (
          <Composition
            key={key}
            id={`Scene-${key}`}
            component={sceneComponents[key]}
            durationInFrames={timeline.scenes[key].duration}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
      <Folder name="Tools">
        <Composition
          id="ContactSheet"
          component={ContactSheet as React.FC<Record<string, unknown>>}
          // Must span the film: useCurrentFrame clamps to the composition length.
          durationInFrames={timeline.total}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{scene: 'full', frames: [0, 600, 990, 1440, 1680, 2040, 2760, 3000, 3100]} satisfies ContactSheetProps}
        />
      </Folder>
    </>
  );
};
