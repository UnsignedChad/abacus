// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Shared plumbing for the puppets. A figure is solved in character space, then
// every part is emitted as an Item with its full screen matrix so parts from
// both characters can be sorted into one draw list (the riposte blade has to
// slide between the king's far and near ribs).

import type React from 'react';
import {Mat} from './rig';

export type Item = {
  key: string;
  z: number;
  m: Mat; // screen-space matrix
  sil?: React.ReactNode; // silhouette in currentColor, used for rim light copies
  art: React.ReactNode;
  rim?: number; // rim strength multiplier (0 disables)
  blend?: 'screen';
};

/** Lighting a figure receives this frame. */
export type RimLight = {
  moon: string; // cool rim from the rose window, upper right
  warm: string; // candle / eye light from the left
  moonA: number;
  warmA: number;
  px: number; // rim width in screen px
};

/** Gradient id helper: every instance prefixes its defs so contact sheets can
 *  hold many copies of the scene in one document. */
export type Ids = (name: string) => string;
export const makeIds = (prefix: string): Ids => (name) => `${prefix}-${name}`;
export const url = (ids: Ids, name: string) => `url(#${ids(name)})`;
