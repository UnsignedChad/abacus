// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React from 'react';
import type {SceneKey} from '../theme';
import {LetterScene} from './Letter';
import {RoadScene} from './Road';
import {TownScene} from './Town';
import {SteelScene} from './Steel';
import {DepthsScene} from './Depths';
import {CathedralScene} from './Cathedral';
import {TitleScene} from './Title';

export const sceneComponents: Record<SceneKey, React.FC> = {
  letter: LetterScene,
  road: RoadScene,
  town: TownScene,
  steel: SteelScene,
  depths: DepthsScene,
  cathedral: CathedralScene,
  title: TitleScene,
};

export const sceneOrder: SceneKey[] = [
  'letter',
  'road',
  'town',
  'steel',
  'depths',
  'cathedral',
  'title',
];
