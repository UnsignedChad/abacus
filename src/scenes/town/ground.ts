// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The ground, painted once per page into an iso-space cache at 2x and then
// blitted through the camera each frame. Each cache pixel is un-projected to
// world coordinates and shaded procedurally: cobbles (a jittered Voronoi of
// stones) in the square, flagstones before the church, dirt lanes rutted by
// carts, and dead winter grass everywhere else.

import {LH, LW, cam, unIso} from './iso';
import {CHURCH, ROUTE_IN} from './world';

// Iso-space region the camera can ever see (with a margin for shake).
const X0 = -440;
const Y0 = -120;
const GW = 800;
const GH = 560;
const RES = 2;

export const hash = (ix: number, iy: number, seed = 0) => {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise in [0,1). */
export const vnoise = (x: number, y: number, seed = 0) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

const fbm = (x: number, y: number, seed: number) =>
  vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.15;

const segDist = (px: number, py: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
};

const LANES: [number, number][][] = [
  [[-2, 32], ...ROUTE_IN, [12.6, 15.6]],
  [[13.2, 13.2], [11.4, 11.6], [10, 10.4]], // to the church door
  [[14, 14], [18, 12.4]], // tavern door
  [[16, 14.6], [22, 13.4], [34, 12.6]], // east lane
  [[12, 12], [14.5, 7.5], [16, 5.6], [20, -4]], // north lane past the church
  [[6.6, 14.6], [3.2, 12.4]], // left cottages
];

const laneDist = (x: number, y: number) => {
  let d = Infinity;
  for (const l of LANES) for (let i = 1; i < l.length; i++) d = Math.min(d, segDist(x, y, l[i - 1], l[i]));
  return d;
};

type RGBf = [number, number, number];

const cobble = (x: number, y: number): RGBf | null => {
  const cs = 0.27;
  const gx = x / cs;
  const gy = y / cs;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  let d1 = 9;
  let d2 = 9;
  let cx = 0;
  let cy = 0;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const fx = ix + i + 0.15 + hash(ix + i, iy + j, 3) * 0.7;
      const fy = iy + j + 0.15 + hash(ix + i, iy + j, 4) * 0.7;
      const d = (gx - fx) * (gx - fx) + (gy - fy) * (gy - fy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        cx = fx;
        cy = fy;
        id = hash(ix + i, iy + j, 5);
      } else if (d < d2) d2 = d;
    }
  }
  const edge = Math.sqrt(d2) - Math.sqrt(d1);
  if (edge < 0.12) return null; // mortar
  // Domed stones: lit from the back-left, shadowed toward the front.
  const lx = gx - cx;
  const ly = gy - cy;
  const dome = 1 + (-lx - ly) * 0.22 - Math.min(0.2, 0.05 / (edge + 0.05)) * 0.6;
  const v = (0.8 + id * 0.35) * dome;
  const warm = hash(Math.floor(gx), Math.floor(gy), 9) * 10;
  return [118 * v + warm, 112 * v + warm * 0.5, 106 * v];
};

const flagstone = (x: number, y: number): RGBf | null => {
  const sx = 0.7;
  const sy = 0.45;
  const row = Math.floor(y / sy);
  const shift = hash(row, 0, 21) * sx;
  const col = Math.floor((x + shift) / sx);
  const fx = (x + shift) / sx - col;
  const fy = y / sy - row;
  if (fx < 0.06 || fy < 0.08) return null;
  const v = 0.82 + hash(col, row, 22) * 0.3 - (fx + fy) * 0.06;
  return [124 * v, 118 * v, 112 * v];
};

const shadeGround = (x: number, y: number, out: RGBf) => {
  const n = fbm(x * 0.9, y * 0.9, 1);
  const fine = hash(Math.floor(x * 24), Math.floor(y * 24), 2);
  const lane = laneDist(x, y) + (n - 0.5) * 0.9;
  // Square: a cobbled rounded diamond around the well, ragged at its edges.
  const sq = Math.max(Math.abs(x - 13.6) * 0.95, Math.abs(y - 14.0)) + (n - 0.5) * 1.2;
  const court =
    x > CHURCH.tower.x0 - 0.8 && x < CHURCH.tower.x1 + 0.8 && y > CHURCH.tower.y1 && y < CHURCH.tower.y1 + 1.8;

  // Base: dead grass with darker clumps and dry straw-coloured patches.
  const clump = vnoise(x * 3.1, y * 3.1, 11);
  const dry = vnoise(x * 0.6, y * 0.6, 12);
  let r = 82 + dry * 30 - clump * 18 + fine * 14;
  let g = 86 + dry * 18 - clump * 18 + fine * 12;
  let b = 58 + dry * 6 - clump * 10 + fine * 6;
  // Blades: short dark strokes.
  if (hash(Math.floor(x * 18), Math.floor(y * 36), 13) > 0.86) {
    r *= 0.7;
    g *= 0.72;
    b *= 0.7;
  }

  // Worn dirt around lanes and the square.
  const dirt = Math.max(0, Math.min(1, (1.25 - lane) * 1.6, (4.9 - sq) * 1.4));
  if (dirt > 0) {
    let dr = 104 + n * 26 + fine * 16;
    let dg = 82 + n * 18 + fine * 12;
    let db = 60 + n * 10 + fine * 8;
    // Cart ruts along the lanes.
    const rut = Math.abs(((lane + 10) % 0.62) - 0.31);
    if (lane < 0.55 && rut < 0.05) {
      dr *= 0.78;
      dg *= 0.78;
      db *= 0.8;
    }
    // Pebbles.
    if (fine > 0.94) {
      dr += 26;
      dg += 24;
      db += 22;
    }
    const t = smooth(Math.min(1, dirt));
    r += (dr - r) * t;
    g += (dg - g) * t;
    b += (db - b) * t;
  }

  let stone: RGBf | null | undefined;
  if (court) stone = flagstone(x, y);
  else if (sq < 3.6) stone = cobble(x, y);
  if (stone !== undefined) {
    if (stone) {
      r = stone[0];
      g = stone[1];
      b = stone[2];
    } else {
      r = 58 + fine * 10;
      g = 50 + fine * 8;
      b = 42 + fine * 6;
    }
    // Moss and mud creeping between the stones toward the edge.
    const moss = Math.max(0, (sq - 2.6) * 0.5) * vnoise(x * 4, y * 4, 14);
    r = r * (1 - moss) + 80 * moss;
    g = g * (1 - moss) + 88 * moss;
    b = b * (1 - moss) + 56 * moss;
  }

  // Faint tile seams, like an old game's floor grid.
  const tx = x - Math.floor(x);
  const ty = y - Math.floor(y);
  if (tx < 0.03 || ty < 0.03) {
    r *= 0.9;
    g *= 0.9;
    b *= 0.9;
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
};

let cache: HTMLCanvasElement | null = null;

const buildCache = () => {
  const c = document.createElement('canvas');
  c.width = GW * RES;
  c.height = GH * RES;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  const d = img.data;
  const col: RGBf = [0, 0, 0];
  for (let py = 0; py < c.height; py++) {
    for (let px = 0; px < c.width; px++) {
      const [x, y] = unIso(X0 + (px + 0.5) / RES, Y0 + (py + 0.5) / RES);
      shadeGround(x, y, col);
      const j = (py * c.width + px) * 4;
      d[j] = col[0];
      d[j + 1] = col[1];
      d[j + 2] = col[2];
      d[j + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
};

/** Blit the ground through the camera. */
export const drawGround = (ctx: CanvasRenderingContext2D) => {
  if (!cache) cache = buildCache();
  const z = cam.z;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cache, (X0 - cam.cx) * z + LW / 2, (Y0 - cam.cy) * z + LH / 2, GW * z, GH * z);
};
