// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Review tool: renders several frames of one scene (or the whole film) into a
// single labelled grid, so a whole scene can be judged from one still.
//
//   scripts/sheet.sh full out/sheet.png 0 600 990 1440

import React from 'react';
import {ClogheenIntro} from '../ClogheenIntro';
import {sceneComponents} from '../scenes';
import type {SceneKey} from '../theme';
import {SheetGrid} from './SheetGrid';

export type ContactSheetProps = {
  scene: SceneKey | 'full';
  frames: number[];
  cols?: number;
};

const Full: React.FC = () => <ClogheenIntro withAudio={false} />;

export const ContactSheet: React.FC<ContactSheetProps> = ({scene, frames, cols = 3}) => (
  <SheetGrid Scene={scene === 'full' ? Full : sceneComponents[scene]} frames={frames} cols={cols} />
);
