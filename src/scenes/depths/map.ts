// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The level itself: Crypt:1 beneath the old church. A stair chamber, a
// pillared hall and an octagonal rune chamber holding the great seal. Also
// the scripted walk, the monsters, the message log and field of view.

import {cues, palette} from '../../theme';

const C = cues.depths;

export const MW = 34;
export const MH = 26;

export type Cell = 'wall' | 'floor' | 'rune' | 'seal' | 'door' | 'up' | 'down' | 'pillar' | 'obelisk';

const grid: Cell[] = new Array(MW * MH).fill('wall');

export const cellAt = (x: number, y: number): Cell =>
  x < 0 || y < 0 || x >= MW || y >= MH ? 'wall' : grid[y * MW + x];

const set = (x: number, y: number, c: Cell) => {
  if (x >= 0 && y >= 0 && x < MW && y < MH) grid[y * MW + x] = c;
};

const rect = (x0: number, y0: number, x1: number, y1: number, c: Cell) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
};

// Stair chamber, with passages leading off into the dark.
rect(3, 17, 9, 23, 'floor');
rect(5, 24, 5, 25, 'floor');
rect(0, 19, 2, 19, 'floor');
set(6, 20, 'up');
set(10, 20, 'door');
// Pillared hall.
rect(11, 13, 26, 21, 'floor');
rect(27, 17, 33, 17, 'floor');
rect(16, 22, 16, 25, 'floor');
for (const x of [14, 18, 22]) for (const y of [15, 19]) set(x, y, 'pillar');
set(13, 18, 'down');
// The octagonal rune chamber and its arch.
for (let y = 2; y <= 11; y++) {
  const cut = Math.max(0, 3 - (y - 2), 3 - (11 - y));
  rect(16 + cut, y, 28 - cut, y, 'rune');
}
set(19, 12, 'rune');
rect(20, 4, 24, 8, 'seal');
for (const [x, y] of [
  [18, 4],
  [26, 4],
  [18, 9],
  [26, 9],
]) {
  set(x, y, 'obelisk');
}

export const SEAL_CELL = {x: 22, y: 6};
export const DOOR = {x: 10, y: 20};
export const DOOR_STEP = 4;

export const isWall = (c: Cell) => c === 'wall';
export const isFloorLike = (c: Cell) => c !== 'wall' && c !== 'pillar' && c !== 'obelisk';

const opaque = (c: Cell, doorOpen: boolean) =>
  c === 'wall' || c === 'pillar' || c === 'obelisk' || (c === 'door' && !doorOpen);

export const TORCHES: [number, number][] = [
  [6, 16],
  [15, 12],
  [23, 12],
];

// A blood trail that leads the way, and the bones of those who went before.
export const BLOOD: [number, number][] = [
  [7, 21],
  [9, 20],
  [12, 20],
  [14, 18],
  [16, 16],
  [17, 15],
  [19, 13],
  [21, 10],
];
export const BONES: [number, number][] = [
  [4, 22],
  [12, 13],
  [13, 14],
  [24, 18],
  [20, 3],
  [25, 10],
  [8, 17],
];

// The walk: one tile per step, stepsStart..stepsEnd.
export const PATH: [number, number][] = [
  [6, 20],
  [7, 20],
  [8, 20],
  [9, 20],
  [10, 20],
  [11, 20],
  [12, 19],
  [13, 18],
  [14, 17],
  [15, 16],
  [16, 15],
  [17, 14],
  [18, 13],
  [19, 12],
  [20, 11],
  [21, 10],
  [22, 9],
];
export const STEPS = PATH.length - 1;

/** Frame on which step k (1-based) lands. */
export const stepFrame = (k: number) => C.stepsStart + C.stepEvery * (k - 1);

/** Number of steps taken by frame f. */
export const stepIndex = (f: number) =>
  f < C.stepsStart ? 0 : Math.min(STEPS, Math.floor((f - C.stepsStart) / C.stepEvery) + 1);

const SLIDE = 4;

const slide = (f: number, from: [number, number], to: [number, number], at: number) => {
  const t = Math.min(1, Math.max(0, (f - at) / SLIDE));
  const e = 1 - (1 - t) * (1 - t);
  return {x: from[0] + (to[0] - from[0]) * e, y: from[1] + (to[1] - from[1]) * e};
};

/** Player position in tiles (float, with a quick slide between tiles). */
export const playerAt = (f: number) => {
  const k = stepIndex(f);
  if (k === 0) return {x: PATH[0][0], y: PATH[0][1], k};
  return {...slide(f, PATH[k - 1], PATH[k], stepFrame(k)), k};
};

// Monsters: the rat nosing at bones, a ghoul feeding in the corner, and the
// skeletal warrior that steps into view on the monsterSpotted cue.
export type MonsterKind = 'skeleton' | 'rat' | 'ghoul';
type Move = {f: number; x: number; y: number};
export const MONSTERS: {kind: MonsterKind; moves: Move[]; hp: number}[] = [
  {
    kind: 'skeleton',
    hp: 1,
    moves: [
      {f: -1e9, x: 22, y: 17},
      {f: C.monsterSpotted, x: 21, y: 17},
      {f: 134, x: 20, y: 16},
      {f: 158, x: 19, y: 15},
    ],
  },
  {
    kind: 'rat',
    hp: 0.6,
    moves: [
      {f: -1e9, x: 4, y: 18},
      {f: 26, x: 4, y: 19},
      {f: 47, x: 3, y: 20},
      {f: 74, x: 3, y: 21},
      {f: 101, x: 4, y: 22},
    ],
  },
  {kind: 'ghoul', hp: 1, moves: [{f: -1e9, x: 12, y: 14}]},
];

export const monsterAt = (moves: Move[], f: number) => {
  let i = 0;
  while (i + 1 < moves.length && moves[i + 1].f <= f) i++;
  const cur = moves[i];
  if (i === 0) return {x: cur.x, y: cur.y, tx: cur.x, ty: cur.y};
  const prev = moves[i - 1];
  const p = slide(f, [prev.x, prev.y], [cur.x, cur.y], cur.f);
  return {...p, tx: cur.x, ty: cur.y};
};

export const MESSAGES: {f: number; text: string; color?: string}[] = [
  {f: 0, text: 'Merlin’s letter weighs heavy in your pack.'},
  {f: 0, text: 'You descend the stairs beneath the old church.'},
  {f: stepFrame(DOOR_STEP), text: 'You open the door.'},
  {f: stepFrame(7), text: 'There is a stone staircase leading down here.'},
  {f: C.monsterSpotted, text: 'A skeletal warrior comes into view.', color: '#e8574a'},
  {f: 128, text: 'You hear a low, ancient hum.', color: '#8fd9b0'},
];
export const HUM_COLOR = palette.zonai;

// ---------------------------------------------------------------------------
// Field of view. Line of sight radius ~7.5 tiles, blocked by walls, pillars,
// obelisks and closed doors. Memory is the union of everything seen so far.

const R2 = 56;
const R2_CHAMBER = 100;
const fovCache = new Map<number, Uint8Array>();

const clearRay = (x0: number, y0: number, x1: number, y1: number, tx: number, ty: number, doorOpen: boolean) => {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 5);
  for (let i = 1; i < n; i++) {
    const cx = Math.floor(x0 + ((x1 - x0) * i) / n);
    const cy = Math.floor(y0 + ((y1 - y0) * i) / n);
    if (cx === tx && cy === ty) continue;
    if (opaque(cellAt(cx, cy), doorOpen)) return false;
  }
  return true;
};

const OFFS = [
  [0, 0],
  [-0.38, -0.38],
  [0.38, -0.38],
  [-0.38, 0.38],
  [0.38, 0.38],
];

/** Tiles in view from path position k. */
export const fovAt = (k: number) => {
  const hit = fovCache.get(k);
  if (hit) return hit;
  const [px, py] = PATH[k];
  const doorOpen = k >= DOOR_STEP;
  // Inside the rune chamber the glow lights the whole room.
  const r2 = k >= 14 ? R2_CHAMBER : R2;
  const vis = new Uint8Array(MW * MH);
  for (let ty = py - 10; ty <= py + 10; ty++) {
    for (let tx = px - 10; tx <= px + 10; tx++) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
      if ((tx - px) ** 2 + (ty - py) ** 2 > r2) continue;
      const ok = OFFS.some(([ox, oy]) =>
        clearRay(px + 0.5, py + 0.5, tx + 0.5 + ox, ty + 0.5 + oy, tx, ty, doorOpen),
      );
      if (ok) vis[ty * MW + tx] = 1;
    }
  }
  fovCache.set(k, vis);
  return vis;
};

const memCache = new Map<number, Uint8Array>();

/** Everything seen up to and including path position k. */
export const memoryAt = (k: number): Uint8Array => {
  const hit = memCache.get(k);
  if (hit) return hit;
  const mem: Uint8Array = k === 0 ? new Uint8Array(MW * MH) : memoryAt(k - 1).slice();
  const vis = fovAt(k);
  for (let i = 0; i < mem.length; i++) mem[i] |= vis[i];
  memCache.set(k, mem);
  return mem;
};

/**
 * Per-tile visibility and memory at frame f as 0..1, cross-fading over a few
 * frames after each step so the reveal reads on video.
 */
export const sightAt = (f: number) => {
  const k = stepIndex(f);
  const t = k === 0 ? 1 : Math.min(1, (f - stepFrame(k)) / 5);
  const visCur = fovAt(k);
  const memCur = memoryAt(k);
  const visPrev = k === 0 ? visCur : fovAt(k - 1);
  const memPrev = k === 0 ? memCur : memoryAt(k - 1);
  return {k, t, visCur, memCur, visPrev, memPrev};
};

export type Sight = ReturnType<typeof sightAt>;

export const visAmount = (s: Sight, i: number) => s.visPrev[i] + (s.visCur[i] - s.visPrev[i]) * s.t;
export const memAmount = (s: Sight, i: number) => s.memPrev[i] + (s.memCur[i] - s.memPrev[i]) * s.t;
