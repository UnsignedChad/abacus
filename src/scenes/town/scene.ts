// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Composes one frame of the square. Albedo and emissive buffers are painted
// back to front (depth-sorted by x+y), the light map is multiplied over the
// albedo, emissives are added, atmosphere goes on top, and the result is
// snapped to the palette with an ordered dither.

import {interpolate} from 'remotion';
import {progress, easeInOut} from '../../lib/fx';
import {LH, LW, P, cam, setCamera} from './iso';
import {beginPaint, poly, rgb} from './paint';
import {drawGround} from './ground';
import {addLight, paintLightMap, resetLights} from './lights';
import {House, drawHouse} from './houses';
import {drawChurch, drawDoorSpill} from './church';
import {contact, drawBrazier, drawCampfire, drawCart, drawFence, drawGrave, drawSign, drawTree, drawWell} from './props';
import {drawTraveler, drawVillager} from './figures';
import {drawLampPost} from './lamppost';
import {paintCrows, paintDust, paintHaze, paintMist, paintSmoke} from './atmos';
import {quantize} from './quantize';
import {
  BRAZIER,
  C,
  CHURCH_DOOR,
  FIRE,
  HURRY,
  HURRY_PATH,
  LAMP,
  ROUTE,
  ROUTE_LEN,
  SHUTTER,
  WALK_END,
  WELL,
  along,
  churchGlow,
  recoil,
  travelerT,
  walkEnergy,
} from './world';

const on = 1;
const until = (f: number, end: number, fade = 4) => 1 - progress(f, end, end + fade);
const flick = (f: number, end: number, seed: number) => {
  // Candle guttering out: a couple of stutters before it dies.
  const base = until(f, end, 3);
  if (f > end - 10 && f < end) return base * (0.55 + 0.45 * Math.abs(Math.sin(f * 1.7 + seed)));
  return base;
};

const shutterClose = (f: number) => {
  const t = progress(f, SHUTTER.start, SHUTTER.shut, easeInOut);
  // A small rebound as the boards meet.
  const bounce = f > SHUTTER.shut && f < SHUTTER.shut + 6 ? 0.04 * Math.sin(((f - SHUTTER.shut) / 6) * Math.PI) : 0;
  return t - bounce;
};

const L1_DOOR = (f: number) =>
  interpolate(f, [0, 180, 206, HURRY.arrive + 3, HURRY.doorShut - 2, HURRY.doorShut], [0.28, 0.3, 0.85, 0.85, 0.08, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const HOUSES: House[] = [
  {
    id: 'tavern',
    x0: 16,
    x1: 20,
    y0: 8,
    y1: 12,
    h: 40,
    roofH: 22,
    ridge: 'x',
    roof: 'slate',
    chimney: [18.6, 9.4],
    wins: [
      {side: 'y', u: 0.95, z: 8, w: 0.62, h: 8, lit: (f) => until(f, 300)},
      {side: 'y', u: 3.15, z: 8, w: 0.62, h: 8, lit: () => on},
      {side: 'y', u: 1.0, z: 25, w: 0.5, h: 7, lit: (f) => flick(f, 262, 1)},
      {side: 'y', u: 3.1, z: 25, w: 0.52, h: 7, lit: (f) => flick(f, 272, 9)},
      {side: 'x', u: 1.0, z: 8, w: 0.6, h: 8, lit: (f) => flick(f, 286, 2)},
      {side: 'x', u: 3.0, z: 8, w: 0.6, h: 8, lit: () => on},
      {side: 'x', u: 2.0, z: 25, w: 0.5, h: 7, lit: () => 0},
    ],
    doors: [
      {
        side: 'y',
        u: 2.05,
        w: 0.7,
        h: 16,
        lit: () => on,
        open: (f) => interpolate(f, [0, 236, 246], [0.22, 0.22, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      },
    ],
  },
  {
    id: 'l1',
    x0: 5,
    x1: 8,
    y0: 12.8,
    y1: 15.8,
    h: 26,
    roofH: 18,
    ridge: 'y',
    roof: 'thatch',
    chimney: [6.1, 13.4],
    wins: [
      {side: 'x', u: 2.25, z: 9, w: 0.5, h: 7, lit: (f) => flick(f, HURRY.doorShut + 22, 3)},
      {side: 'y', u: 1.5, z: 9, w: 0.55, h: 7, lit: (f) => flick(f, HURRY.doorShut + 22, 4)},
    ],
    doors: [{side: 'x', u: 0.9, w: 0.62, h: 15, lit: () => on, open: L1_DOOR}],
  },
  {
    id: 'l2',
    x0: 1,
    x1: 4,
    y0: 8.6,
    y1: 11.6,
    h: 24,
    roofH: 16,
    ridge: 'x',
    roof: 'slate',
    chimney: [2.2, 9.6],
    wins: [
      {
        side: 'x',
        u: 1.5,
        z: 8,
        w: 0.62,
        h: 8,
        lit: (f) => until(f, SHUTTER.dark, 3),
        shutter: shutterClose,
        figure: (f) => interpolate(f, [176, 194, SHUTTER.start + 4, SHUTTER.shut], [0, 1, 1, 0.2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      },
      {side: 'y', u: 1.3, z: 9, w: 0.5, h: 7, lit: (f) => flick(f, 282, 5)},
    ],
    doors: [{side: 'y', u: 2.3, w: 0.6, h: 15, lit: () => 0, open: () => 0}],
  },
  {
    id: 'r2',
    x0: 20.4,
    x1: 23.4,
    y0: 15,
    y1: 18,
    h: 26,
    roofH: 17,
    ridge: 'x',
    roof: 'thatch',
    chimney: [21.4, 16],
    wins: [
      {side: 'y', u: 0.8, z: 9, w: 0.55, h: 7, lit: (f) => flick(f, 250, 6)},
      {side: 'y', u: 2.3, z: 9, w: 0.55, h: 7, lit: () => 0},
      {side: 'x', u: 1.5, z: 9, w: 0.5, h: 7, lit: (f) => flick(f, 292, 7)},
    ],
    doors: [{side: 'y', u: 1.55, w: 0.6, h: 15, lit: () => 0, open: () => 0}],
  },
  {
    id: 'b',
    x0: 15,
    x1: 18,
    y0: 2,
    y1: 5,
    h: 24,
    roofH: 16,
    ridge: 'y',
    roof: 'thatch',
    wins: [{side: 'y', u: 1.0, z: 9, w: 0.5, h: 6, lit: (f) => flick(f, 240, 8) * 0.8}],
    doors: [{side: 'x', u: 1.5, w: 0.6, h: 15, lit: () => 0, open: () => 0}],
  },
  {
    id: 'c',
    x0: 20.6,
    x1: 23.6,
    y0: 7.6,
    y1: 10.6,
    h: 26,
    roofH: 17,
    ridge: 'y',
    roof: 'slate',
    chimney: [21.6, 8.4],
    wins: [
      {side: 'x', u: 1.2, z: 9, w: 0.5, h: 7, lit: () => 0.9},
      {side: 'y', u: 1.5, z: 9, w: 0.5, h: 7, lit: () => 0},
    ],
    doors: [{side: 'x', u: 2.3, w: 0.6, h: 15, lit: () => 0, open: () => 0}],
  },
  {
    id: 'd',
    x0: -0.4,
    x1: 2.6,
    y0: 16.2,
    y1: 19.2,
    h: 24,
    roofH: 16,
    ridge: 'x',
    roof: 'thatch',
    wins: [
      {side: 'x', u: 2.0, z: 9, w: 0.5, h: 7, lit: () => 0},
      {side: 'y', u: 1.0, z: 9, w: 0.5, h: 7, lit: () => 0},
    ],
    doors: [{side: 'x', u: 0.8, w: 0.6, h: 15, lit: () => 0, open: () => 0.35}],
  },
];

const TREES: [number, number, number][] = [
  [4.4, 8.0, 74],
  [1.6, 3.6, 70],
  [13.8, 1.2, 76],
  [21.8, 5.6, 66],
  [6.8, 20.4, 56],
  [24.6, 20.0, 60],
  [-1.0, 13.6, 62],
  [24.8, 12.2, 58],
  [-2.5, 6, 64],
  [10.5, -3, 70],
  [4.5, -1.5, 66],
];

const GRAVES: [number, number, number][] = [
  [3.4, 1.8, 0],
  [4.8, 1.6, 2],
  [6.2, 2.0, 1],
  [3.2, 3.6, 1],
  [4.6, 3.4, 0],
  [6.0, 3.8, 0],
  [3.6, 5.4, 2],
  [5.0, 5.6, 1],
  [6.4, 5.6, 0],
  [2.8, 6.8, 0],
];

const FENCES: [[number, number], [number, number]][] = [
  // Graveyard.
  [[2.4, 7.5], [4.8, 7.5]],
  [[5.4, 7.5], [7.6, 7.5]],
  [[2.4, 0.6], [2.4, 7.5]],
  // Along the road in.
  [[4.6, 25.4], [6.8, 22.7]],
  [[6.8, 22.7], [9.0, 20.4]],
  [[0.6, 23.4], [2.8, 20.6]],
  // Tavern yard.
  [[20.4, 12.4], [20.4, 14.4]],
  [[13.2, 18.6], [16.2, 18.6]],
];

type Drawable = {d: number; draw: () => void};

/** Soft darkening where walls meet the ground. */
const baseShadow = (h: {x0: number; x1: number; y0: number; y1: number}) => {
  const e = 0.4;
  poly(
    [P(h.x0, h.y1, 0), P(h.x1, h.y1, 0), P(h.x1, h.y0, 0), P(h.x1 + e, h.y0, 0), P(h.x1 + e, h.y1 + e, 0), P(h.x0, h.y1 + e, 0)],
    'rgb(10,8,10)',
    null,
    0.4,
  );
};

export type Buffers = {A: HTMLCanvasElement; E: HTMLCanvasElement; L: HTMLCanvasElement; F: HTMLCanvasElement};

let bufs: Buffers | null = null;
const getBuffers = () => {
  if (!bufs) {
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = LW;
      c.height = LH;
      return c;
    };
    const lm = document.createElement('canvas');
    // The light map is soft by nature: half resolution, smoothly upscaled.
    lm.width = LW / 2;
    lm.height = LH / 2;
    bufs = {A: mk(), E: mk(), L: lm, F: mk()};
  }
  return bufs;
};

/** Paints frame `f` into the visible low-res canvas. */
export const paintTown = (out: CanvasRenderingContext2D, f: number) => {
  const {A, E, L, F} = getBuffers();
  // All buffers stay on the CPU: F is read back every frame, and mixing GPU
  // and CPU canvases would force a readback per composite.
  const a = A.getContext('2d', {willReadFrequently: true})!;
  const e = E.getContext('2d', {willReadFrequently: true})!;
  const l = L.getContext('2d', {willReadFrequently: true})!;
  const fc = F.getContext('2d', {willReadFrequently: true})!;
  setCamera(f);
  resetLights();
  beginPaint(a, e);
  a.globalCompositeOperation = 'source-over';
  a.fillStyle = '#000';
  a.fillRect(0, 0, LW, LH);
  drawGround(a);
  e.globalCompositeOperation = 'source-over';
  e.fillStyle = '#000';
  e.fillRect(0, 0, LW, LH);
  paintHaze(e, f);

  for (const h of HOUSES) baseShadow(h);
  baseShadow({x0: 8, x1: 12, y0: 0, y1: 7});
  baseShadow({x0: 8.6, x1: 11.4, y0: 7, y1: 9.8});

  const items: Drawable[] = [];
  const chimneys: [number, number, number][] = [];
  for (const h of HOUSES) {
    items.push({
      d: (h.x0 + h.x1) / 2 + (h.y0 + h.y1) / 2,
      draw: () => {
        const top = drawHouse(h, f);
        if (top) chimneys.push(top);
        if (h.id === 'tavern') drawSign(16.45, h.y1, 31, f);
      },
    });
  }
  // The church sorts just behind the graveyard's east fence, which it hides.
  items.push({
    d: 14.3,
    draw: () => {
      drawChurch(f);
      drawDoorSpill(e);
    },
  });
  items.push({d: WELL[0] + WELL[1], draw: () => drawWell(WELL[0], WELL[1])});
  items.push({d: FIRE[0] + FIRE[1], draw: () => drawCampfire(FIRE[0], FIRE[1], f)});
  items.push({d: BRAZIER[0] + BRAZIER[1], draw: () => drawBrazier(BRAZIER[0], BRAZIER[1], f)});
  items.push({d: 19.2 + 12.6 + 0.8, draw: () => drawCart(19.2, 12.6)});
  TREES.forEach(([x, y, h], i) => items.push({d: x + y, draw: () => drawTree(x, y, h, i + 3, f)}));
  GRAVES.forEach(([x, y, k], i) => items.push({d: x + y, draw: () => drawGrave(x, y, k, i)}));
  FENCES.forEach(([p, q], i) => items.push({d: (p[0] + q[0]) / 2 + (p[1] + q[1]) / 2, draw: () => drawFence(p, q, i)}));
  // The lamp at the edge of town, over the road in.
  items.push({d: LAMP[0] + LAMP[1], draw: () => drawLampPost(LAMP[0], LAMP[1], f)});
  // Barrels by the tavern.
  items.push({d: 15.6 + 11.2, draw: () => barrel(15.6, 11.2)});
  items.push({d: 15.5 + 10.5, draw: () => barrel(15.5, 10.5)});

  // The traveler: across the square to the church door, where the rumble
  // throws them back half a step with a hand going to the sword.
  const tt = travelerT(f);
  const tr = along(ROUTE, tt);
  const rc = recoil(f);
  const tx = tr.p[0] + 0.12 * rc;
  const ty = tr.p[1] + 0.42 * rc;
  const phase = ((tt * ROUTE_LEN) / 0.62) * Math.PI + rc * 2.2;
  const energy = Math.max(walkEnergy(f), 0.5 * rc * (1 - progress(f, C.churchRumble + 6, C.churchRumble + 16)));
  const look = progress(f, WALK_END - 20, WALK_END + 30, easeInOut);
  const warmth = Math.max(0, 1 - Math.hypot(tx - FIRE[0], ty - FIRE[1]) / 7, 0.55 - Math.hypot(tx - LAMP[0], ty - LAMP[1] + 0.75) / 3);
  const nearDoor = Math.max(0, 1 - Math.hypot(tx - CHURCH_DOOR[0], ty - CHURCH_DOOR[1] - 1.2) / 3.2);
  const back = {k: nearDoor * (0.7 * churchGlow(f)), from: CHURCH_DOOR, reach: progress(f, C.churchRumble + 5, C.churchRumble + 17, easeInOut)};
  // The hero's light radius, as in the old games: a dim pool that walks with them.
  addLight(tx, ty, 6, 84, [196, 176, 150], 0.46 * (1 - 0.5 * nearDoor));
  items.push({d: tx + ty, draw: () => drawTraveler(tx, ty, phase, energy, f, look, warmth, back)});

  // Townsfolk: one warming at the fire, one hurrying home with a lantern.
  items.push({
    d: FIRE[0] + 1 + FIRE[1] - 0.3,
    draw: () => drawVillager(FIRE[0] + 0.95, FIRE[1] - 0.35, -1, 0, 0, f, {col: [150, 128, 100], skirt: [64, 48, 40], hands: true, warm: 1, seed: 'warm'}),
  });
  if (f < HURRY.arrive + 4) {
    const ht = progress(f, HURRY.start, HURRY.arrive, (t) => t * t * (3 - 2 * t) * 0.3 + t * 0.7);
    const hp = along(HURRY_PATH, ht);
    const moving = f > HURRY.start && f < HURRY.arrive;
    const hPhase = moving ? (f - HURRY.start) * 0.55 : 0;
    // Before setting off, facing the fire; then away up-left.
    const dir = f < HURRY.start ? 1 : -1;
    const fade = f > HURRY.arrive ? 1 - (f - HURRY.arrive) / 4 : 1;
    items.push({
      d: hp.p[0] + hp.p[1],
      draw: () =>
        drawVillager(hp.p[0], hp.p[1], dir, hPhase, moving ? 1 : 0, f, {col: [118, 108, 118], skirt: [52, 40, 44], lantern: fade, warm: f < HURRY.start ? 0.8 : 0, seed: 'hurry'}),
    });
  }

  items.sort((p, q) => p.d - q.d);
  for (const it of items) it.draw();

  // Lighting.
  const ambient = interpolate(f, [0, 300, 450], [1.05, 0.92, 0.85], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  l.setTransform(0.5, 0, 0, 0.5, 0, 0);
  paintLightMap(l, ambient);
  l.setTransform(1, 0, 0, 1, 0, 0);
  fc.globalCompositeOperation = 'source-over';
  fc.globalAlpha = 1;
  fc.drawImage(A, 0, 0);
  fc.globalCompositeOperation = 'multiply';
  fc.imageSmoothingEnabled = true;
  fc.drawImage(L, 0, 0, LW, LH);
  fc.globalCompositeOperation = 'lighter';
  fc.drawImage(E, 0, 0);
  fc.globalCompositeOperation = 'source-over';

  // Atmosphere.
  paintMist(fc, f);
  paintSmoke(fc, f, {x: FIRE[0], y: FIRE[1], z: 14, seed: 'fire', n: 14, size: 0.9, rate: 80, col: [86, 76, 78], a: 0.32});
  paintSmoke(fc, f, {x: BRAZIER[0], y: BRAZIER[1], z: 24, seed: 'braz', n: 8, size: 0.6, rate: 70, col: [80, 72, 76], a: 0.25});
  chimneys.forEach((c, i) =>
    paintSmoke(fc, f, {x: c[0], y: c[1], z: c[2] + 2, seed: 'chim' + i, n: 10, size: 0.8, rate: 110, col: [70, 66, 78], a: 0.22}),
  );
  paintDust(fc, f);
  paintCrows(fc, f);

  const img = fc.getImageData(0, 0, LW, LH);
  quantize(img, 20);
  out.putImageData(img, 0, 0);
};

/**
 * Bloom: the lit frame (before the palette pass) downsampled and squared so
 * only the hot highlights survive. Displayed with smooth upscaling, it adds a
 * soft full-resolution glow over the hard pixels.
 */
export const paintBloom = (b: CanvasRenderingContext2D, power: number) => {
  const {F} = getBuffers();
  const w = b.canvas.width;
  const h = b.canvas.height;
  b.globalCompositeOperation = 'copy';
  b.imageSmoothingEnabled = true;
  b.imageSmoothingQuality = 'high';
  b.drawImage(F, 0, 0, w, h);
  b.globalCompositeOperation = 'multiply';
  for (let i = 0; i < power; i++) b.drawImage(b.canvas, 0, 0);
  b.globalCompositeOperation = 'source-over';
};

const barrel = (x: number, y: number) => {
  contact(x, y, 0.3, 0.5);
  const [bx, by] = P(x, y, 0);
  const [, ty] = P(x, y, 10);
  const w = 4.2 * cam.z;
  poly([[bx - w, by], [bx + w, by], [bx + w, ty], [bx - w, ty]], rgb([98, 70, 46], 0.8));
  poly([[bx - w, ty - 0.1], [bx + w, ty - 0.1], [bx + w * 0.9, ty + 2], [bx - w * 0.9, ty + 2]], rgb([78, 56, 38], 0.9));
  for (const t of [0.25, 0.75]) {
    const yy = by + (ty - by) * t;
    poly([[bx - w, yy - 0.5], [bx + w, yy - 0.5], [bx + w, yy + 0.5], [bx - w, yy + 0.5]], rgb([40, 36, 36]));
  }
};
