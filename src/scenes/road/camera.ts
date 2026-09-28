// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The road camera: a slow lateral dolly to the right that follows the
// traveler, plus a gentle push in. Every layer has a parallax factor `par`
// (0 = at infinity, 1 = the road the traveler walks on, >1 = foreground).

import {easeInOut, progress} from '../../lib/fx';
import {timeline} from '../../theme';

export const W = 1920;
export const H = 1080;
export const DUR = timeline.scenes.road.duration;

// Ground-plane pixels the camera travels per frame.
export const CAM_SPEED = 3.4;
// Focus of the push, roughly between the traveler and the town.
const FOCUS = {x: 1000, y: 640};

export const camX = (f: number) => CAM_SPEED * f;
export const zoomAt = (f: number) => 1 + 0.1 * progress(f, 0, DUR, easeInOut);

export type Proj = {s: number; tx: number; ty: number};

/** Screen = s * world + t, for a layer at parallax `par`. */
export const project = (f: number, par: number): Proj => {
  // Near layers grow more than far ones during the push: a dolly, not a zoom.
  const s = 1 + (zoomAt(f) - 1) * (0.2 + 0.8 * par);
  return {
    s,
    tx: FOCUS.x * (1 - s) - s * camX(f) * par,
    ty: FOCUS.y * (1 - s),
  };
};

export const layerTransform = (p: Proj) => `matrix(${p.s},0,0,${p.s},${p.tx},${p.ty})`;

/** World x that is currently at screen x `sx` on a layer. */
export const worldAtScreen = (p: Proj, sx: number) => (sx - p.tx) / p.s;
