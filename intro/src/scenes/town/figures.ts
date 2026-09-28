// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Pixel sprites: the hooded traveler (cloak, sword slung across the back,
// satchel) and the hunched townsfolk. Drawn as tiny polygons in sprite pixels
// around the foot point, scaled by the camera zoom; the palette pass snaps
// them to crisp pixels.

import {noise2D} from '@remotion/noise';
import {P, Pt, cam} from './iso';
import {addLight} from './lights';
import {RGB, albedoCtx, emissiveCtx, glow, line, poly, rgb} from './paint';
import {contact} from './props';

type Sprite = {ox: number; oy: number; dir: number};

const sp = (s: Sprite, x: number, y: number): Pt => [s.ox + x * s.dir * cam.z, s.oy + y * cam.z];
const shape = (s: Sprite, pts: [number, number][], col: string, emi?: string) =>
  poly(
    pts.map(([x, y]) => sp(s, x, y)),
    col,
    emi,
  );

const CLOAK: RGB = [66, 54, 52];
const CLOAK_DARK: RGB = [44, 36, 36];
const SKIN: RGB = [150, 112, 90];
const STEEL: RGB = [150, 150, 158];

/** Door light behind the traveler: how strong, and where it comes from. */
export type Backlight = {k: number; from: [number, number]; reach: number};

/**
 * A long shadow thrown away from a light on the ground, cut out of both the
 * surface and the emissive spill so the red wash parts around the figure.
 */
const castShadow = (x: number, y: number, bl: Backlight) => {
  const dx = x - bl.from[0];
  const dy = y - bl.from[1];
  const d = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / d, dy / d];
  const [nx, ny] = [-uy, ux];
  const len = 1.6 + 1.2 / d;
  const pts = [
    P(x + nx * 0.16, y + ny * 0.16),
    P(x + ux * len + nx * 0.3, y + uy * len + ny * 0.3),
    P(x + ux * (len + 0.25), y + uy * (len + 0.25)),
    P(x + ux * len - nx * 0.3, y + uy * len - ny * 0.3),
    P(x - nx * 0.16, y - ny * 0.16),
  ];
  const k = Math.min(1, bl.k);
  for (const [ctx, op, col, a] of [
    [albedoCtx(), 'source-over', 'rgb(8,6,8)', 0.5 * k],
    [emissiveCtx(), 'destination-out', '#000', 0.85 * k],
  ] as [CanvasRenderingContext2D, GlobalCompositeOperation, string, number][]) {
    ctx.save();
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

/**
 * The traveler. `phase` is the stride phase in radians, `energy` 0..1 how
 * much they are walking, `dir` +1 facing screen-right. `back` is the church
 * door's light behind them; `reach` 0..1 lifts the hand to the sword hilt.
 */
export const drawTraveler = (
  x: number,
  y: number,
  phase: number,
  energy: number,
  f: number,
  look = 0,
  warmth = 0,
  back?: Backlight,
) => {
  const [ox, oy] = P(x, y, 0);
  contact(x, y, 0.32, 0.55);
  if (back && back.k > 0.01) castShadow(x, y, back);
  const reach = back?.reach ?? 0;
  // Backlit by the door, the figure falls into silhouette.
  const dim = 1 - 0.6 * Math.min(1, back?.k ?? 0);
  const tc = (c: RGB, k = 1) => rgb(c, k * dim);
  const bob = -Math.abs(Math.sin(phase)) * 0.9 * energy;
  const s: Sprite = {ox, oy: oy + bob * cam.z, dir: 1};
  const stride = Math.sin(phase) * 2.6 * energy;
  const wind = 0.6 + 0.4 * noise2D('trav-wind', f * 0.03, 0);
  // Back leg, sword, cloak, front leg, arm, hood.
  const leg = (dx: number, col: string) => {
    shape({...s, oy: oy}, [
      [-1 + dx * 0.4, -9 + bob],
      [1.2 + dx * 0.4, -9 + bob],
      [1.2 + dx, -1],
      [2.4 + dx, -0.2],
      [2.4 + dx, 0.6],
      [-0.6 + dx, 0.6],
      [-0.8 + dx, -1],
    ], col);
  };
  leg(-stride, tc([30, 26, 26]));
  // Longsword slung diagonally: pommel up behind the shoulder.
  line([sp(s, 2.5, -7), sp(s, -3.8, -22.5)], tc(STEEL, 0.55), 1.1);
  line([sp(s, -2.2, -20.6), sp(s, -4.8, -19.4)], tc([60, 50, 40]), 1);
  line([sp(s, -3.8, -22.5), sp(s, -4.4, -24)], tc([90, 70, 44]), 1);
  // Cloak body with a hem that trails and ripples.
  const tail = 1.5 + wind * 1.4 + energy * 1.2;
  const rip = Math.sin(f * 0.3) * 0.6 * (0.5 + energy);
  shape(s, [
    [-2.8, -19],
    [2.2, -19],
    [3.4, -15],
    [3.6, -9],
    [3.2, -5],
    [0, -4.2 + rip * 0.3],
    [-3.5 - tail * 0.6, -4.6 - rip],
    [-4.6 - tail, -6 + rip],
    [-4.2 - tail * 0.5, -11],
    [-3.6, -16],
  ], tc(CLOAK));
  // Fold shadow and the cloak's inner edge.
  shape(s, [
    [-1, -17],
    [0, -17],
    [-0.8, -5],
    [-2.8 - tail * 0.5, -5.2 - rip],
  ], tc(CLOAK_DARK));
  // Satchel on its strap.
  line([sp(s, 1.8, -18.5), sp(s, -1.8, -10)], tc([84, 60, 40]), 0.6);
  shape(s, [
    [-3.6, -11],
    [-1.4, -11],
    [-1.4, -8],
    [-3.6, -8.2],
  ], tc([96, 68, 44]));
  leg(stride, tc([38, 32, 30]));
  // Arm swinging, a pale hand; at the rumble it rises over the shoulder to the hilt.
  const arm = -Math.sin(phase) * 2 * energy;
  const hx = 1.7 + arm * 0.6 + (-3.2 - 1.7) * reach;
  const hy = -10.3 + (-21.6 + 10.3) * reach;
  shape(s, [
    [0.4, -18],
    [2.4, -18],
    [hx + 0.9, hy - 0.7],
    [hx - 0.9, hy - 0.7],
  ], tc(CLOAK, 0.85));
  shape(s, [
    [hx - 0.8, hy - 0.7],
    [hx + 0.8, hy - 0.7],
    [hx + 0.6, hy + 0.7],
    [hx - 0.6, hy + 0.7],
  ], tc(SKIN, 0.7));
  // Hood, tipped up a touch when looking at the church.
  const hl = look * -0.8;
  shape(s, [
    [-3, -18.5],
    [-4.4, -20.5],
    [-3.2, -23 + hl],
    [-0.2, -25 + hl],
    [2.6, -23.6 + hl],
    [3.4, -21 + hl],
    [2.6, -18.6],
  ], tc(CLOAK, 1.05));
  // Face in shadow, a sliver of skin.
  shape(s, [
    [1.4, -22.6 + hl],
    [3.0, -22 + hl],
    [2.8, -19.6],
    [1.4, -19.4],
  ], tc([20, 16, 16]));
  line([sp(s, 2.7, -21.6 + hl), sp(s, 2.6, -20.2)], tc(SKIN, 0.5), 0.6);
  // Rim light: cold moon across the hood and shoulders, fire on the front edge.
  line([sp(s, -4.4, -20.5), sp(s, -3.2, -23 + hl), sp(s, -0.2, -25 + hl), sp(s, 2.6, -23.6 + hl)], rgb([112, 118, 146]), 0.7, 'rgba(70,80,120,0.45)');
  line([sp(s, -3.6, -16), sp(s, -4.2 - tail * 0.5, -11)], rgb([100, 104, 130]), 0.6, 'rgba(60,70,110,0.35)');
  if (warmth > 0.02) {
    line([sp(s, 3.4, -21 + hl), sp(s, 3.4, -15), sp(s, 3.6, -9), sp(s, 3.2, -5)], rgb([230, 140, 70]), 0.7, `rgba(255,150,70,${0.55 * warmth})`);
  }
  if (back && back.k > 0.02) {
    // The church's red light rims the hood and the front of the cloak.
    const k = Math.min(1, back.k);
    line(
      [sp(s, -0.2, -25 + hl), sp(s, 2.6, -23.6 + hl), sp(s, 3.4, -21 + hl), sp(s, 3.4, -15), sp(s, 3.6, -9), sp(s, 3.2, -5)],
      rgb([200, 50, 34]),
      0.8,
      `rgba(255,60,36,${0.7 * k})`,
    );
    line([sp(s, 1.4, -0.4), sp(s, 3.2, -0.4)], rgb([180, 40, 30]), 0.6, `rgba(255,50,30,${0.5 * k})`);
  }
};

/**
 * A hunched villager: dark skirts, a pale shawl drawn over bent shoulders
 * and head. `walk` 0..1 drives the gait; `lantern` adds a small swinging
 * light carried in front; `warm` rims the side facing a fire.
 */
export const drawVillager = (
  x: number,
  y: number,
  dir: number,
  phase: number,
  walk: number,
  f: number,
  opts: {col: RGB; skirt?: RGB; lantern?: number; hands?: boolean; warm?: number; seed: string},
) => {
  const [ox, oy] = P(x, y, 0);
  contact(x, y, 0.28, 0.5);
  const bob = -Math.abs(Math.sin(phase)) * 0.7 * walk;
  const br = Math.sin(f * 0.08 + opts.seed.length) * 0.3;
  const s: Sprite = {ox, oy: oy + bob * cam.z, dir};
  const skirt = opts.skirt ?? [58, 44, 38];
  const st = Math.sin(phase) * 2 * walk;
  for (const d of [-st, st]) {
    shape({...s, oy}, [
      [-0.8 + d * 0.3, -4],
      [0.8 + d * 0.3, -4],
      [1.4 + d, 0.4],
      [-0.6 + d, 0.4],
    ], rgb([30, 24, 24]));
  }
  // Skirts, flaring a little with the stride.
  shape(s, [
    [-3.4 - walk * 0.6, -1.4],
    [3.2 + walk * 0.8, -1.4],
    [2.6, -9],
    [-2.8, -9],
  ], rgb(skirt));
  // Shawl over a bent back: the hump behind, the head pushed forward.
  shape(s, [
    [-3.2, -8],
    [3.0, -8.6],
    [4.2, -12 + br],
    [3.8, -14.6 + br],
    [1.2, -16.2 + br],
    [-2.0, -15.4 + br],
    [-3.8, -12.4 + br],
  ], rgb(opts.col));
  shape(s, [
    [-3.8, -12.4 + br],
    [-2.0, -15.4 + br],
    [-1.2, -14.8 + br],
    [-2.4, -8.2],
    [-3.2, -8],
  ], rgb(opts.col, 0.72));
  // Hooded head.
  shape(s, [
    [2.6, -13.6 + br],
    [2.8, -17 + br],
    [4.6, -18.2 + br],
    [6.2, -16.8 + br],
    [6.2, -14 + br],
    [4.4, -12.8 + br],
  ], rgb(opts.col, 1.08));
  shape(s, [
    [5.0, -16.6 + br],
    [6.2, -16.4 + br],
    [6.1, -14.2 + br],
    [5.0, -14.4 + br],
  ], rgb([26, 20, 20]));
  if (opts.hands) {
    // Hands held out to the fire.
    const hx = 5.8 + Math.sin(f * 0.05) * 0.3;
    shape(s, [
      [3.4, -11.6],
      [hx, -11],
      [hx, -9.8],
      [3.4, -10],
    ], rgb(opts.col, 0.85));
    shape(s, [
      [hx, -11.2],
      [hx + 1.4, -11],
      [hx + 1.4, -9.8],
      [hx, -9.8],
    ], rgb([170, 126, 100]), 'rgba(255,150,80,0.35)');
  }
  const warm = opts.warm ?? 0;
  if (warm > 0.02) {
    line([sp(s, 6.3, -17 + br), sp(s, 6.3, -14 + br), sp(s, 4.3, -12), sp(s, 3.2, -9), sp(s, 3.4, -1.6)], rgb([230, 150, 80]), 0.7, `rgba(255,150,70,${0.6 * warm})`);
  }
  if (opts.lantern && opts.lantern > 0) {
    const sw = Math.sin(phase * 0.5) * 0.8;
    const lx = 4.8 + sw;
    const ly = -7.6;
    line([sp(s, 4, -10.4), sp(s, lx, ly - 1.4)], rgb([40, 36, 34]), 0.6);
    const lp = sp(s, lx, ly);
    const k = opts.lantern;
    poly(
      [
        [lp[0] - 1.2 * cam.z, lp[1] - 1.5 * cam.z],
        [lp[0] + 1.2 * cam.z, lp[1] - 1.5 * cam.z],
        [lp[0] + 1.2 * cam.z, lp[1] + 1.5 * cam.z],
        [lp[0] - 1.2 * cam.z, lp[1] + 1.5 * cam.z],
      ],
      rgb([255, 200, 120]),
      rgb([255, 200, 120], k),
    );
    // The lantern lights its bearer's front.
    line([sp(s, 6.3, -16 + br), sp(s, 4.3, -12), sp(s, 3.2, -9)], rgb([220, 160, 90]), 0.6, `rgba(255,170,90,${0.45 * k})`);
    glow(lp[0], lp[1], 12 * cam.z, [255, 170, 90], 0.35 * k);
    addLight(x, y, 8, 46, [255, 170, 90], 0.6 * k, 0.4 * k);
  }
};
