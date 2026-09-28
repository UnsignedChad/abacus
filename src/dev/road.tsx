// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Isolated dev entry for the road scene. Bundles only this scene, so work on
// other scenes can never break these renders. Used by scripts/still.sh and
// scripts/sheet.sh.

import React from "react";
import {Composition, registerRoot} from "remotion";
import "../fonts";
import {RoadScene} from "../scenes/Road";
import {SheetGrid} from "../tools/SheetGrid";
import {FPS, HEIGHT, WIDTH, timeline} from "../theme";

const duration = timeline.scenes.road.duration;

const Sheet: React.FC<{frames: number[]; cols?: number}> = ({frames, cols}) => (
  <SheetGrid Scene={RoadScene} frames={frames} cols={cols} />
);

registerRoot(() => (
  <>
    <Composition id="Scene" component={RoadScene} durationInFrames={duration} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition
      id="Sheet"
      component={Sheet as React.FC<Record<string, unknown>>}
      durationInFrames={duration}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{frames: [0], cols: 3}}
    />
  </>
));
