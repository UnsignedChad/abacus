// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The great seal in the floor of the rune chamber: an octagonal stone disc
// carved with angular glyphs, and the circuit-like channels that radiate from
// it across the flagstones. Built once as pixel art; lit per frame.

import {progress, easeIn, easeInOut} from '../../lib/fx';
import {cues, palette} from '../../theme';
import {SEAL_CELL, cellAt} from './map';
import {RGB, T, ctxOf, hash, line, makeCanvas, put, tint} from './util';

const C = cues.depths;

export const SEAL = {x: SEAL_CELL.x * T + T / 2, y: SEAL_CELL.y * T + T / 2};
export const SEAL_SIZE = 5 * T;
export const SEAL_ORIGIN = {x: SEAL.x - SEAL_SIZE / 2, y: SEAL.y - SEAL_SIZE / 2};
export const DISC_R = 77;
export const HOLE_R = 70;

/** Octagonal "radius": the seal and its carvings are angular, never round. */
const oct = (dx: number, dy: number) => Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) / 1.414);

const octPoints = (r: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (Math.PI / 4);
    const k = r / Math.cos(Math.PI / 8);
    pts.push([Math.cos(a) * k, Math.sin(a) * k]);
  }
  return pts;
};

/** Plots every rune stroke of the seal, in seal-local pixel coords. */
const strokes = (plot: (x: number, y: number) => void) => {
  const c = SEAL_SIZE / 2;
  const poly = (r: number) => {
    const p = octPoints(r);
    for (let i = 0; i < 8; i++) {
      const a = p[i];
      const b = p[(i + 1) % 8];
      line(c + a[0], c + a[1], c + b[0], c + b[1], plot);
    }
  };
  poly(67);
  poly(47);
  poly(29);
  // Diamond and core.
  line(c, c - 21, c + 21, c, plot);
  line(c + 21, c, c, c + 21, plot);
  line(c, c + 21, c - 21, c, plot);
  line(c - 21, c, c, c - 21, plot);
  poly(8);
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) plot(c + x, c + y);
  // Spokes between the inner rings, and short ticks inside the diamond.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x0 = c + Math.cos(a) * 31;
    const y0 = c + Math.sin(a) * 31;
    const x1 = c + Math.cos(a) * 44;
    const y1 = c + Math.sin(a) * 44;
    line(x0, y0, x1, y1, plot);
    if (i % 2 === 1) line(c + Math.cos(a) * 11, c + Math.sin(a) * 11, c + Math.cos(a) * 17, c + Math.sin(a) * 17, plot);
  }
  // Sixteen glyphs in the outer band, each drawn from a 3x3 lattice.
  for (let g = 0; g < 16; g++) {
    const a = ((g + 0.5) * Math.PI) / 8;
    const gx = Math.round(c + Math.cos(a) * 57) - 4;
    const gy = Math.round(c + Math.sin(a) * 57) - 4;
    const pts = [0, 1, 2].flatMap((j) => [0, 1, 2].map((i) => [gx + i * 4, gy + j * 4] as [number, number]));
    const segs = [
      [0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8],
      [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8],
      [0, 4], [4, 8], [2, 4], [4, 6],
    ];
    let n = 0;
    for (let s = 0; s < segs.length; s++) {
      if (hash(g, s, 71) < 0.3 || (s === 9 && n < 2)) {
        const [p, q] = segs[s];
        line(pts[p][0], pts[p][1], pts[q][0], pts[q][1], plot);
        n++;
      }
    }
    // Every glyph keeps a spine so none reads as noise.
    line(pts[1][0], pts[1][1], pts[7][0], pts[7][1], plot);
  }
};

let baseC: HTMLCanvasElement | null = null;
let runes: {dim: HTMLCanvasElement; bright: HTMLCanvasElement; hot: HTMLCanvasElement} | null = null;

const buildSeal = () => {
  const size = SEAL_SIZE;
  const c = size / 2;
  baseC = makeCanvas(size, size);
  const ctx = ctxOf(baseC);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const r = oct(dx, dy);
      if (r > DISC_R) continue;
      const n = (hash(x, y, 9) - 0.5) * 8;
      let col: RGB;
      if (r > HOLE_R) {
        // Raised rim, lit from the top-left, notched every eighth.
        const lit = (-dx - dy) / (r * 1.41);
        const v = 70 + lit * 22 + n;
        col = [v * 0.92, v * 0.97, v * 0.95];
        if (r > DISC_R - 1 || r < HOLE_R + 1) col = [30, 32, 32];
      } else {
        // Dark slate face with faint concentric tooling.
        const band = Math.floor(r / 4) % 2 === 0 ? 3 : -2;
        const v = 40 + band + n - r * 0.06;
        col = [v * 0.86, v * 0.95, v * 0.93];
      }
      put(img, x, y, col);
    }
  }
  // Carved grooves where the runes will burn, and the central seam.
  strokes((x, y) => {
    put(img, x, y, [16, 20, 19]);
    put(img, x, y + 1, [58, 64, 62]);
  });
  for (let y = 0; y < size; y++) {
    const dy = y + 0.5 - c;
    if (oct(0, dy) < HOLE_R) {
      put(img, c - 1, y, [12, 14, 14]);
      put(img, c, y, [22, 26, 25]);
    }
  }
  ctx.putImageData(img, 0, 0);
  const mask = makeCanvas(size, size);
  const mctx = ctxOf(mask);
  const mimg = mctx.createImageData(size, size);
  strokes((x, y) => put(mimg, x, y, [255, 255, 255]));
  mctx.putImageData(mimg, 0, 0);
  runes = {dim: tint(mask, palette.zonaiDeep), bright: tint(mask, palette.zonai), hot: tint(mask, '#eafff4')};
};

/** Rune intensity: a faint hum, ignition on runeHum, charging before the door opens. */
export const sealGlow = (f: number) => {
  const hum = 0.16 + 0.12 * progress(f, 128, 205) + 0.05 * Math.sin(f * 0.23);
  if (f < C.runeHum) return hum;
  const t = f - C.runeHum;
  const ignite = t < 2 ? 1.3 : 0.9 + 0.4 * Math.exp(-(t - 2) / 7);
  const charge = 0.4 * progress(f, 245, C.runeDoorOpen, easeIn);
  return ignite + charge + 0.05 * Math.sin(f * 0.61) + 0.03 * Math.sin(f * 1.7);
};

let litC: HTMLCanvasElement | null = null;

/** The seal as it looks this frame (160x160, seal-local). */
export const sealCanvas = (f: number) => {
  if (!baseC || !runes) buildSeal();
  if (!litC) litC = makeCanvas(SEAL_SIZE, SEAL_SIZE);
  const ctx = ctxOf(litC);
  const g = sealGlow(f);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, SEAL_SIZE, SEAL_SIZE);
  ctx.drawImage(baseC!, 0, 0);
  ctx.globalAlpha = Math.min(1, g * 2.2);
  ctx.drawImage(runes!.dim, 0, 0);
  ctx.globalAlpha = Math.max(0, Math.min(1, (g - 0.25) * 1.4));
  ctx.drawImage(runes!.bright, 0, 0);
  ctx.globalAlpha = Math.max(0, Math.min(1, (g - 0.95) * 1.6));
  ctx.drawImage(runes!.hot, 0, 0);
  ctx.globalAlpha = 1;
  return litC;
};

let memC: HTMLCanvasElement | null = null;
/** The seal as remembered, unlit. */
export const sealMemory = (remember: (c: HTMLCanvasElement) => HTMLCanvasElement) => {
  if (!baseC) buildSeal();
  if (!memC) memC = remember(baseC!);
  return memC;
};

/** How far each half has slid aside, in native pixels (0 while sealed). */
export const sealSplit = (f: number) =>
  f < C.runeDoorOpen ? 0 : 2 + 78 * progress(f, C.runeDoorOpen + 1, C.runeDoorOpen + 22, easeInOut);

// ---------------------------------------------------------------------------
// Circuit channels. Walks out from the seal along 90/45 degree runs, staying
// on the chamber floor. Each trace is a list of pixels ordered by distance so
// the light can run along it.

export type Trace = {px: [number, number][]; delay: number};

const DIRS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const onChamberFloor = (x: number, y: number) => {
  const cx = Math.floor(x / T);
  const cy = Math.floor(y / T);
  const cell = cellAt(cx, cy);
  if (cell !== 'rune' && cell !== 'seal') return false;
  // Keep a margin from walls and obelisks.
  for (const [ox, oy] of [
    [-3, 0],
    [3, 0],
    [0, -3],
    [0, 3],
  ]) {
    const c2 = cellAt(Math.floor((x + ox) / T), Math.floor((y + oy) / T));
    if (c2 !== 'rune' && c2 !== 'seal') return false;
  }
  return oct(x - SEAL.x, y - SEAL.y) > DISC_R + 3;
};

let traces: Trace[] | null = null;

export const getTraces = () => {
  if (traces) return traces;
  const out: Trace[] = [];
  const walk = (x: number, y: number, dir: number, delay: number, depth: number, seed: number) => {
    const px: [number, number][] = [];
    const outward = DIRS[dir];
    let d = dir;
    let len = 0;
    const maxLen = 150 + hash(seed, 3) * 140;
    for (let seg = 0; seg < 40 && len < maxLen; seg++) {
      const n = 6 + Math.floor(hash(seed, seg, 1) * 16);
      let ok = true;
      for (let i = 0; i < n; i++) {
        const nx = x + DIRS[d][0];
        const ny = y + DIRS[d][1];
        if (!onChamberFloor(nx, ny)) {
          ok = false;
          break;
        }
        x = nx;
        y = ny;
        px.push([x, y]);
        len++;
      }
      if (!ok) break;
      if (depth === 0 && hash(seed, seg, 5) < 0.22 && seg > 0) {
        const side = hash(seed, seg, 6) < 0.5 ? 2 : 6;
        walk(x, y, (d + side) % 8, delay + len, 1, seed * 7 + seg + 13);
      }
      // Turn by 45 degrees, but never back toward the seal.
      const turn = hash(seed, seg, 2);
      const nd = turn < 0.25 ? (d + 1) % 8 : turn < 0.5 ? (d + 7) % 8 : d;
      const dot = DIRS[nd][0] * outward[0] + DIRS[nd][1] * outward[1];
      if (dot >= 0) d = nd;
    }
    if (px.length > 6) out.push({px, delay});
  };
  for (let i = 0; i < 8; i++) {
    for (const spread of i % 2 ? [0] : [-1, 1]) {
      const a = (i * Math.PI) / 4;
      const nx = -Math.sin(a) * spread * 10;
      const ny = Math.cos(a) * spread * 10;
      const x0 = Math.round(SEAL.x + Math.cos(a) * 84 + nx);
      const y0 = Math.round(SEAL.y + Math.sin(a) * 84 + ny);
      walk(x0, y0, i, 0, 0, i * 2 + (spread > 0 ? 1 : 0) + 1);
    }
  }
  traces = out;
  return out;
};

/** Native px per frame at which light runs along the channels. */
export const TRACE_SPEED = 5;
