// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Terrain tiles, painted pixel by pixel into one static map image (plus its
// "remembered" twin). Flagstone floors with cracks, brick walls with top
// highlights and front faces, pillars, obelisks, stairs, blood and bones.

import {BLOOD, BONES, Cell, MH, MW, TORCHES, cellAt, isWall} from './map';
import {getTraces} from './seal';
import {RGB, T, ctxOf, get, hash, makeCanvas, put, remembered} from './util';

const clampC = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const shade = (c: RGB, k: number, add = 0): RGB => [
  clampC(c[0] * k + add),
  clampC(c[1] * k + add),
  clampC(c[2] * k + add),
];

// Four flagstone layouts; each returns a stone id per pixel (-1 = mortar).
const stoneId = (v: number, x: number, y: number): number => {
  if (x === 0 || y === 0) return -1;
  switch (v) {
    case 0:
      if (y === 15) return -1;
      if (y < 15) return x === 13 ? -1 : x < 13 ? 0 : 1;
      return x === 21 ? -1 : x < 21 ? 2 : 3;
    case 1:
      if (x === 16) return -1;
      if (x < 16) return y === 11 ? -1 : y < 11 ? 0 : 1;
      return y === 20 ? -1 : y < 20 ? 2 : 3;
    case 2:
      if (x >= 21 && y >= 20) return x === 21 || y === 20 ? -1 : 1;
      return 0;
    default:
      if (y === 10 || y === 21) return -1;
      if (y < 10) return x === 18 ? -1 : x < 18 ? 0 : 1;
      if (y < 21) return x === 8 ? -1 : x < 8 ? 2 : 3;
      return x === 25 ? -1 : x < 25 ? 4 : 5;
  }
};

const floorPx = (cx: number, cy: number, x: number, y: number, base: RGB, mortar: RGB): RGB => {
  const v = Math.floor(hash(cx, cy, 1) * 4);
  const id = stoneId(v, x, y);
  if (id < 0) return shade(mortar, 1, (hash(cx * 32 + x, cy * 32 + y, 2) - 0.5) * 6);
  let k = 0.86 + hash(cx, cy, 10 + id) * 0.26;
  let add = (hash(cx * 32 + x, cy * 32 + y, 3) - 0.5) * 10;
  if (stoneId(v, x, y - 1) < 0 || stoneId(v, x - 1, y) < 0) add += 14;
  if (y === 31 || x === 31 || stoneId(v, x, y + 1) < 0 || stoneId(v, x + 1, y) < 0) add -= 12;
  // Gentle wear toward stone centers.
  k *= 0.97 + 0.06 * hash(Math.floor((cx * 32 + x) / 3), Math.floor((cy * 32 + y) / 3), 4);
  return shade(base, k, add);
};

const FLOOR: RGB = [88, 82, 78];
const MORTAR: RGB = [34, 30, 29];
const RUNE_FLOOR: RGB = [58, 64, 64];
const RUNE_MORTAR: RGB = [22, 26, 26];
const BRICK: RGB = [104, 92, 84];

const runePx = (cx: number, cy: number, x: number, y: number): RGB => {
  if (x === 0 || y === 0) return RUNE_MORTAR;
  let add = (hash(cx * 32 + x, cy * 32 + y, 5) - 0.5) * 8;
  if (x === 1 || y === 1) add += 12;
  if (x === 31 || y === 31) add -= 10;
  // Faint engraved border inside each slab.
  if ((x === 4 || x === 27) && y > 3 && y < 28) add -= 9;
  if ((y === 4 || y === 27) && x > 3 && x < 28) add -= 9;
  return shade(RUNE_FLOOR, 0.9 + hash(cx, cy, 6) * 0.18, add);
};

const nearChamber = (cx: number, cy: number) => {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const c = cellAt(cx + dx, cy + dy);
      if (c === 'rune' || c === 'seal') return true;
    }
  return false;
};

/** Older masonry around the rune chamber: great slate blocks, tightly fitted. */
const ancientWallPx = (cx: number, cy: number, x: number, y: number): RGB => {
  const southOpen = !isWall(cellAt(cx, cy + 1));
  const northOpen = !isWall(cellAt(cx, cy - 1));
  const off = cy % 2 ? 16 : 0;
  const gx = cx * 32 + x + off;
  const bx = Math.floor(gx / 32);
  const inx = gx % 32;
  const iny = y % 16;
  const n = (hash(cx * 32 + x, cy * 32 + y, 14) - 0.5) * 8;
  let col: RGB;
  if (inx === 0 || iny === 0) col = [20, 24, 24];
  else {
    let add = n;
    if (iny === 1 || inx === 1) add += 16;
    if (iny === 15 || inx === 31) add -= 14;
    col = shade([70, 78, 76], 0.85 + hash(bx, Math.floor(y / 16) + cy * 2, 15) * 0.25, add);
  }
  if (southOpen && y >= 22) {
    col = shade(col, 0.58 - (y - 22) * 0.035);
    if (y === 22) col = shade(col, 1, 30);
  }
  if (northOpen && y <= 1) col = shade(col, 1, 20);
  return col;
};

const wallPx = (cx: number, cy: number, x: number, y: number): RGB => {
  if (nearChamber(cx, cy)) return ancientWallPx(cx, cy, x, y);
  const southOpen = !isWall(cellAt(cx, cy + 1));
  const northOpen = !isWall(cellAt(cx, cy - 1));
  const face = southOpen && y >= 22;
  const course = Math.floor(y / 8) + cy * 4;
  const off = course % 2 ? 8 : 0;
  const gx = cx * 32 + x + off;
  const bx = Math.floor(gx / 16);
  const inx = gx % 16;
  const iny = y % 8;
  const n = (hash(cx * 32 + x, cy * 32 + y, 7) - 0.5) * 12;
  let col: RGB;
  if (inx === 0 || iny === 0) col = shade(MORTAR, 1, n * 0.4);
  else {
    let add = n;
    if (iny === 1) add += 26;
    if (iny === 7) add -= 22;
    if (inx === 1) add += 8;
    if (inx === 15) add -= 12;
    col = shade(BRICK, 0.8 + hash(bx, course, 8) * 0.34, add);
  }
  if (face) {
    // The wall's front face, falling into shadow.
    col = shade(col, 0.62 - (y - 22) * 0.035);
    if (y === 22) col = shade(col, 1, 36);
  }
  if (northOpen && y <= 1) col = shade(col, 1, 24);
  return col;
};

/** Contact shadow on floors under walls and pillars. */
const floorShadow = (cx: number, cy: number, x: number, y: number) => {
  let k = 1;
  const n = cellAt(cx, cy - 1);
  const w = cellAt(cx - 1, cy);
  const nw = cellAt(cx - 1, cy - 1);
  const block = (c: Cell) => c === 'wall' || c === 'obelisk';
  if (block(n)) k *= 0.5 + 0.5 * Math.min(1, y / 8);
  if (block(w)) k *= 0.72 + 0.28 * Math.min(1, x / 4);
  if (block(nw) && !block(n) && !block(w)) k *= x + y < 7 ? 0.75 : 1;
  return k;
};

const pillarPx = (cx: number, cy: number, x: number, y: number): RGB => {
  const dx = x - 15.5;
  const dy = y - 14.5;
  const r = Math.hypot(dx, dy);
  if (r <= 12) {
    const nx = dx / 12;
    const ny = dy / 12;
    const lit = 0.62 + 0.5 * (-nx * 0.55 - ny * 0.7);
    let add = (hash(cx * 32 + x, cy * 32 + y, 11) - 0.5) * 10;
    if (r > 11) add -= 40;
    else if (r > 8.5 && r < 9.5) add -= 22;
    else if (r < 8) add += 10;
    return shade([112, 104, 98], lit, add);
  }
  const base = floorPx(cx, cy, x, y, FLOOR, MORTAR);
  const sh = Math.hypot(x - 19.5, y - 19.5) < 12.5 ? 0.55 : 1;
  return shade(base, sh * floorShadow(cx, cy, x, y));
};

const obeliskPx = (cx: number, cy: number, x: number, y: number): RGB => {
  const inBlock = x >= 7 && x <= 24 && y >= 3 && y <= 27;
  if (!inBlock) {
    const sh = x >= 9 && x <= 27 && y >= 26 && y <= 30 ? 0.55 : 1;
    return shade(runePx(cx, cy, x, y), sh);
  }
  let add = (hash(cx * 32 + x, cy * 32 + y, 12) - 0.5) * 6;
  if (x === 7 || y === 3) add += 22;
  if (x === 24) add -= 18;
  const front = y >= 22;
  let col = shade([62, 68, 68], front ? 0.6 : 1, add);
  if (y === 22) col = shade(col, 1, 26);
  if (x === 7 || x === 24 || y === 3 || y === 27) col = shade(col, 0.5);
  // Carved slot for the glyph column.
  if ((x === 15 || x === 16) && y >= 7 && y <= 19) col = [18, 22, 22];
  return col;
};

const stairsPx = (cx: number, cy: number, x: number, y: number, down: boolean): RGB => {
  const base = shade(floorPx(cx, cy, x, y, FLOOR, MORTAR), floorShadow(cx, cy, x, y));
  if (x < 5 || x > 26 || y < 4 || y > 28) return base;
  if (x === 5 || x === 26 || y === 4 || y === 28) return [26, 22, 21];
  const step = Math.floor((y - 5) / 4);
  const iy = (y - 5) % 4;
  let v = down ? 112 - step * 17 : 50 + step * 11;
  if (iy === 0) v += 22;
  if (iy === 3) v -= 16;
  let col: RGB = [v * 0.98, v * 0.92, v * 0.88];
  // Side walls of the stairwell.
  if (x <= 8) col = shade(col, 0.55 + (x - 6) * 0.08);
  if (x >= 23) col = shade(col, 0.7 - (x - 23) * 0.06);
  if (down && step >= 5) col = [6, 5, 5];
  return shade(col, 1, (hash(cx * 32 + x, cy * 32 + y, 13) - 0.5) * 6);
};

const cellPx = (cell: Cell, cx: number, cy: number, x: number, y: number): RGB => {
  switch (cell) {
    case 'wall':
      return wallPx(cx, cy, x, y);
    case 'pillar':
      return pillarPx(cx, cy, x, y);
    case 'obelisk':
      return obeliskPx(cx, cy, x, y);
    case 'rune':
    case 'seal':
      return shade(runePx(cx, cy, x, y), floorShadow(cx, cy, x, y));
    case 'up':
      return stairsPx(cx, cy, x, y, false);
    case 'down':
      return stairsPx(cx, cy, x, y, true);
    default: {
      const c = floorPx(cx, cy, x, y, FLOOR, MORTAR);
      return shade(c, floorShadow(cx, cy, x, y));
    }
  }
};

// Decals ---------------------------------------------------------------------

const blood = (img: ImageData, cx: number, cy: number) => {
  const ox = cx * T;
  const oy = cy * T;
  const blobs = 3 + Math.floor(hash(cx, cy, 20) * 3);
  for (let b = 0; b < blobs; b++) {
    const bx = 6 + hash(cx, cy, 21 + b) * 20;
    const by = 6 + hash(cx, cy, 31 + b) * 20;
    const r = 1.5 + hash(cx, cy, 41 + b) * 3.5;
    for (let y = -6; y <= 6; y++)
      for (let x = -6; x <= 6; x++) {
        const d = Math.hypot(x, y * 1.2) + (hash(ox + bx + x, oy + by + y, 22) - 0.5) * 1.6;
        if (d > r) continue;
        const px = Math.round(bx + x);
        const py = Math.round(by + y);
        if (px < 1 || py < 1 || px > 30 || py > 30) continue;
        const under = get(img, ox + px, oy + py);
        const dark = d > r - 1 ? 0.8 : 1;
        const col: RGB = [
          under[0] * 0.25 + 118 * dark,
          under[1] * 0.15 + 12 * dark,
          under[2] * 0.15 + 14 * dark,
        ];
        put(img, ox + px, oy + py, d < r * 0.3 ? shade(col, 1.2) : col);
      }
  }
  for (let i = 0; i < 7; i++) {
    const x = 2 + Math.floor(hash(cx, cy, 50 + i) * 28);
    const y = 2 + Math.floor(hash(cx, cy, 60 + i) * 28);
    put(img, ox + x, oy + y, [104, 14, 16]);
  }
};

const bones = (img: ImageData, cx: number, cy: number) => {
  const ox = cx * T;
  const oy = cy * T;
  const B: RGB = [206, 196, 168];
  const S: RGB = [130, 120, 98];
  const D: RGB = [20, 16, 12];
  // Skull.
  const sx = 6 + Math.floor(hash(cx, cy, 70) * 14);
  const sy = 6 + Math.floor(hash(cx, cy, 71) * 12);
  const skull = ['.SBBS.', 'SBBBBS', 'BDBBDB', 'SBDDBS', '.SBSB.'];
  skull.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      put(img, ox + sx + x, oy + sy + y, ch === 'B' ? B : ch === 'S' ? S : D);
    }),
  );
  for (let x = -1; x <= 6; x++) put(img, ox + sx + x, oy + sy + 5, shade(get(img, ox + sx + x, oy + sy + 5), 0.6));
  // Scattered long bones.
  for (let i = 0; i < 3; i++) {
    const x0 = 4 + hash(cx, cy, 80 + i) * 22;
    const y0 = 4 + hash(cx, cy, 90 + i) * 22;
    const a = hash(cx, cy, 100 + i) * Math.PI;
    const len = 6 + hash(cx, cy, 110 + i) * 5;
    for (let t = 0; t <= len; t++) {
      const x = Math.round(x0 + Math.cos(a) * t);
      const y = Math.round(y0 + Math.sin(a) * t);
      if (x < 1 || y < 1 || x > 30 || y > 30) continue;
      put(img, ox + x, oy + y, B);
      put(img, ox + x, oy + y + 1, shade(get(img, ox + x, oy + y + 1), 0.55));
      if (t === 0 || t >= len - 0.5) {
        put(img, ox + x + 1, oy + y, S);
        put(img, ox + x - 1, oy + y, S);
      }
    }
  }
};

const crack = (img: ImageData, cx: number, cy: number) => {
  let x = 4 + hash(cx, cy, 120) * 24;
  let y = 4 + hash(cx, cy, 121) * 24;
  let a = hash(cx, cy, 122) * Math.PI * 2;
  const n = 8 + Math.floor(hash(cx, cy, 123) * 12);
  for (let i = 0; i < n; i++) {
    a += (hash(cx, cy, 130 + i) - 0.5) * 1.3;
    x += Math.cos(a);
    y += Math.sin(a);
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 1 || py < 1 || px > 30 || py > 30) break;
    put(img, cx * T + px, cy * T + py, shade(get(img, cx * T + px, cy * T + py), 0.45));
    put(img, cx * T + px, cy * T + py + 1, shade(get(img, cx * T + px, cy * T + py + 1), 1.15));
  }
};

/** Iron bracket and torch shaft on a wall tile; the flame is drawn live. */
const torchBase = (img: ImageData, cx: number, cy: number) => {
  const ox = cx * T;
  const oy = cy * T;
  for (let y = 15; y <= 27; y++) {
    put(img, ox + 15, oy + y, y < 19 ? [96, 62, 30] : [70, 46, 24]);
    put(img, ox + 16, oy + y, y < 19 ? [74, 48, 22] : [52, 34, 18]);
  }
  for (let x = 12; x <= 19; x++) put(img, ox + x, oy + 22, [44, 42, 44]);
  for (let x = 13; x <= 18; x++) put(img, ox + x, oy + 23, [28, 26, 28]);
  put(img, ox + 12, oy + 21, [70, 68, 72]);
  put(img, ox + 19, oy + 21, [70, 68, 72]);
  // Soot stain above.
  for (let y = 2; y <= 14; y++)
    for (let x = 11; x <= 20; x++) {
      const d = Math.hypot(x - 15.5, (y - 12) * 0.6);
      if (d < 5) put(img, ox + x, oy + y, shade(get(img, ox + x, oy + y), 0.55 + d * 0.08));
    }
};

// Bake ------------------------------------------------------------------------

let baked: {lit: HTMLCanvasElement; mem: HTMLCanvasElement} | null = null;

export const bakedMap = () => {
  if (baked) return baked;
  const lit = makeCanvas(MW * T, MH * T);
  const ctx = ctxOf(lit);
  const img = ctx.createImageData(MW * T, MH * T);
  for (let cy = 0; cy < MH; cy++)
    for (let cx = 0; cx < MW; cx++) {
      const cell = cellAt(cx, cy);
      for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) put(img, cx * T + x, cy * T + y, cellPx(cell, cx, cy, x, y));
      if (cell === 'floor' && hash(cx, cy, 124) < 0.3) crack(img, cx, cy);
    }
  // Carved channels, dark until the runes wake.
  for (const tr of getTraces())
    for (const [x, y] of tr.px) {
      put(img, x, y, [20, 24, 24]);
      put(img, x, y + 1, shade(get(img, x, y + 1), 1.18));
    }
  for (const [x, y] of BLOOD) blood(img, x, y);
  for (const [x, y] of BONES) bones(img, x, y);
  for (const [x, y] of TORCHES) torchBase(img, x, y);
  ctx.putImageData(img, 0, 0);
  baked = {lit, mem: remembered(lit)};
  return baked;
};

// Doors -------------------------------------------------------------------------

const doorPx = (open: boolean, x: number, y: number): RGB | null => {
  const frame = x <= 3 || x >= 28 || y <= 2;
  if (frame) {
    let add = (hash(x, y, 140) - 0.5) * 10;
    if (x === 3 || y === 2) add -= 30;
    if (x === 0 || y === 0) add += 20;
    return shade([100, 92, 84], 1, add);
  }
  if (open) {
    if (x <= 7) {
      let v = 70 + (x - 4) * 6;
      if (y % 9 === 4) v = 50;
      return [v, v * 0.66, v * 0.38];
    }
    return null;
  }
  const plank = Math.floor((x - 4) / 6);
  const inx = (x - 4) % 6;
  let col: RGB = plank % 2 ? [104, 68, 38] : [92, 58, 32];
  col = shade(col, 1, (hash(x, y, 141 + plank) - 0.5) * 14 + (inx === 0 ? -34 : inx === 1 ? 10 : 0));
  if ((y >= 7 && y <= 9) || (y >= 23 && y <= 25)) {
    col = y === 7 || y === 23 ? [96, 94, 100] : [52, 50, 56];
    if ((x - 4) % 7 === 3) col = [150, 146, 150];
  }
  if (Math.hypot(x - 22, y - 16) < 2.6 && Math.hypot(x - 22, y - 16) > 1.3) col = [150, 128, 80];
  return col;
};

let doors: {closed: HTMLCanvasElement; open: HTMLCanvasElement; closedMem: HTMLCanvasElement; openMem: HTMLCanvasElement} | null =
  null;

export const doorSprites = () => {
  if (doors) return doors;
  const make = (open: boolean) => {
    const c = makeCanvas(T, T);
    const ctx = ctxOf(c);
    const img = ctx.createImageData(T, T);
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const col = doorPx(open, x, y);
        if (col) put(img, x, y, col);
      }
    ctx.putImageData(img, 0, 0);
    return c;
  };
  const closed = make(false);
  const open = make(true);
  doors = {closed, open, closedMem: remembered(closed), openMem: remembered(open)};
  return doors;
};

/** A torch flame, 12x14 pixels, redrawn every frame. */
export const drawFlame = (ctx: CanvasRenderingContext2D, x: number, y: number, f: number, seed: number) => {
  const cols = ['#7a1a08', '#c23a0c', '#ff7a2a', '#ffc15a', '#fff2c8'];
  const h = 9 + Math.round(2 * Math.sin(f * 0.9 + seed) + 1.5 * Math.sin(f * 2.3 + seed * 3));
  const lean = Math.round(Math.sin(f * 0.37 + seed) * 1.2);
  for (let row = 0; row < h; row++) {
    const t = row / h; // 0 at the base
    const w = Math.max(1, Math.round((1 - t) * 3.2 + (t < 0.25 ? t * 4 : 0)));
    const cx = x + Math.round(lean * t);
    for (let dx = -w; dx <= w; dx++) {
      const edge = Math.abs(dx) / (w + 0.01);
      const heat = (1 - t) * 0.9 + (1 - edge) * 0.8 - 0.35 + hash(f, row, seed + dx) * 0.25;
      const idx = Math.max(0, Math.min(4, Math.floor(heat * 3.2)));
      ctx.fillStyle = cols[idx];
      ctx.fillRect(cx + dx, y - row, 1, 1);
    }
  }
};
