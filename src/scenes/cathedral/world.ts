// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Layout of the ruined church. x runs along the nave (entrance left, throne
// right), y is height (floor 0, negative up), d is depth (1 = fighting plane).

export const WALL_D = 2.7;
export const PILLAR_D = 1.85;
export const FG_PILLAR_D = 0.52;

// `land` is where each window's beam reaches the floor (near the fighting plane).
export const LANCETS = [
  {x: -1350, theme: 0, land: -1500},
  {x: -650, theme: 1, land: -780},
  {x: 50, theme: 2, broken: true, land: 10},
  {x: 750, theme: 3, land: 690},
];
export const LANCET = {w: 250, sill: -360, apex: -1420};

export const ROSE = {x: 1720, y: -1270, r: 400, d: 2.55};

export const PILLARS = [-1000, -300, 400, 1100];
export const PILLAR_W = 250;
export const CAPITAL_Y = -1000;

export const FG_PILLARS = [-60];

// The dais: two stepped boxes rising toward the throne.
export const DAIS = {
  x0: 1340, // foot of the lower step
  step: 70, // tread depth of the lower step
  x1: 2300,
  h1: 36,
  h2: 72,
  dNear: 0.93,
  dFar: 1.6,
};
export const DAIS_TOP = -DAIS.h2;

export const THRONE = {x: 1590, d: 1.16};
export const BANNER = {x: 1590, d: 1.42, top: -1300, bottom: -420, w: 230};

export type Candelabrum = {x: number; d: number; base: number; h: number; n: number; seed: number};
export const CANDELABRA: Candelabrum[] = [
  {x: 1470, d: 1.34, base: DAIS_TOP, h: 250, n: 5, seed: 1},
  {x: 1900, d: 1.26, base: DAIS_TOP, h: 260, n: 5, seed: 2},
  {x: -260, d: 1.45, base: 0, h: 280, n: 3, seed: 3},
  {x: 520, d: 1.62, base: 0, h: 270, n: 5, seed: 4},
  {x: -330, d: 0.72, base: 0, h: 320, n: 3, seed: 5},
  {x: 2060, d: 0.78, base: 0, h: 320, n: 5, seed: 6},
  // Near the lens beside the king: frames him, then slides out as we track.
  {x: 1575, d: 0.62, base: 0, h: 340, n: 3, seed: 7},
];

/** Stained glass hues per window theme: [primary, secondary, accent]. */
export const GLASS = [
  ['#8f1426', '#2a3f9e', '#a4681f'],
  ['#2b46a8', '#6a2a8a', '#9a1a22'],
  ['#5a2a92', '#2a4ab0', '#b0301f'],
  ['#a41a24', '#4a2a88', '#ac7a2c'],
];
