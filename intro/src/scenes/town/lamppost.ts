// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The lamp at the edge of town: a weathered post by the fence with an iron
// lantern hanging over the road. It swings in the wind, and the traveler
// passes beneath it on the way into the square.

import {P, cam} from './iso';
import {addLight} from './lights';
import {RGB, glow, poly, rgb, wline} from './paint';
import {contact, fireFlicker, wind} from './props';

const WOOD: RGB = [84, 62, 44];
const IRON: RGB = [34, 32, 34];
const FLAME: RGB = [255, 196, 110];

export const drawLampPost = (x: number, y: number, f: number) => {
  const h = 34;
  const reach = 0.75;
  contact(x, y, 0.2, 0.55);
  // The post, lit side and shadow side, with a crossarm toward the road (-y).
  wline([[x, y, 0], [x, y, h]], rgb(WOOD, 0.62), 2.2);
  wline([[x + 0.03, y, 0], [x + 0.03, y, h]], rgb(WOOD, 0.4), 0.8);
  wline([[x, y, h - 2], [x, y - reach - 0.08, h - 2]], rgb(WOOD, 0.95), 1.5);
  wline([[x, y, h - 10], [x, y - reach * 0.55, h - 2]], rgb(WOOD, 0.75), 1);
  // Lantern light catching the post's near edge and the underside of the arm.
  wline([[x - 0.06, y - 0.06, h - 18], [x - 0.06, y - 0.06, h - 3]], rgb([170, 124, 76]), 0.6, 'rgba(255,170,90,0.25)');
  wline([[x, y - 0.1, h - 3], [x, y - reach, h - 3]], rgb([160, 116, 72]), 0.5, 'rgba(255,170,90,0.2)');
  // Lantern swinging on a short chain: pendulum plus the wind's push.
  const sw = 0.2 * Math.sin(f * 0.11) + 0.12 * wind(f);
  const hang: [number, number, number] = [x, y - reach, h - 2];
  const len = 5;
  const lx = x + Math.sin(sw) * 0.12;
  const ly = y - reach - Math.sin(sw) * 0.18;
  const lz = h - 2 - len * Math.cos(sw);
  wline([hang, [lx, ly, lz]], rgb([70, 66, 64]), 0.6);
  const [cx, cy] = P(lx, ly, lz);
  const z = cam.z;
  const fl = fireFlicker(f, 'lamp');
  // Cap, glass and base.
  poly([[cx - 2.2 * z, cy + 1 * z], [cx, cy - 0.6 * z], [cx + 2.2 * z, cy + 1 * z]], rgb(IRON));
  poly(
    [[cx - 1.7 * z, cy + 1 * z], [cx + 1.7 * z, cy + 1 * z], [cx + 1.5 * z, cy + 5.5 * z], [cx - 1.5 * z, cy + 5.5 * z]],
    rgb(FLAME, 0.9),
    rgb(FLAME, 0.75 * fl),
  );
  poly([[cx - 0.35 * z, cy + 1 * z], [cx + 0.35 * z, cy + 1 * z], [cx + 0.35 * z, cy + 5.5 * z], [cx - 0.35 * z, cy + 5.5 * z]], rgb(IRON));
  poly([[cx - 1.9 * z, cy + 5.5 * z], [cx + 1.9 * z, cy + 5.5 * z], [cx + 1.4 * z, cy + 6.6 * z], [cx - 1.4 * z, cy + 6.6 * z]], rgb(IRON));
  glow(cx, cy + 3 * z, 20 * z, [255, 160, 80], 0.32 * fl);
  glow(cx, cy + 3 * z, 7 * z, FLAME, 0.4 * fl);
  addLight(lx, ly, lz * 0.45, 140, [255, 160, 90], 1.0 * fl, 0.6);
};
