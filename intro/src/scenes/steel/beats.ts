// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene timing: heartbeat envelope, the cut, and the sword-draw curves.

import {cues} from '../../theme';
import {clamp01} from './util';

export const C = cues.steel;

/** Shot A (hooded face) runs until the cut; shot B (hilt insert) after. */
export const CUT = 106;

/** Breath puffs (exhale starts), roughly every 60 frames. */
export const BREATHS = [4, 64];

/**
 * Heartbeat envelope 0..~1: a hard "lub" on the cue frame and a softer
 * "dub" a few frames later, each with a fast attack and quick decay. Later
 * beats hit a little harder as the tension climbs.
 */
export const heartbeat = (f: number) => {
  let v = 0;
  C.heartbeats.forEach((b, i) => {
    const gain = 0.7 + 0.3 * (i / (C.heartbeats.length - 1));
    const lub = f - b;
    const dub = f - b - 5;
    if (lub >= 0) v += gain * Math.exp(-lub / 4.5) * (lub < 1 ? 0.85 : 1);
    if (dub >= 0) v += gain * 0.45 * Math.exp(-dub / 4);
  });
  return Math.min(1.2, v);
};

/** Sword draw: 0 in the scabbard, 1 when the tip clears the mouth. */
export const drawT = (f: number) => {
  const t = clamp01((f - (C.swordDraw - 0.6)) / 8);
  // Sharp start, long deceleration: a practised, single pull.
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
