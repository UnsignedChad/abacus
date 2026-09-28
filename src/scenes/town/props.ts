// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Props around the square: the well, the campfire and brazier, the cart,
// picket fences, bare trees, graves, and the tavern's hanging sign.

import {noise2D} from '@remotion/noise';
import {P, Pt, cam} from './iso';
import {faceX, faceY, fp, fquad} from './geom';
import {addLight} from './lights';
import {RGB, ellipse, glow, line, mix, poly, rgb, wline, wpoly} from './paint';
import {hash} from './ground';
import {C} from './world';

const STONE: RGB = [124, 118, 112];
const WOOD: RGB = [96, 70, 48];
const DARKWOOD: RGB = [58, 42, 30];
const IRON: RGB = [36, 34, 36];
const FIRE_OUT: RGB = [214, 70, 20];
const FIRE_MID: RGB = [255, 138, 40];
const FIRE_IN: RGB = [255, 222, 140];

/** Soft contact shadow on the ground. */
export const contact = (x: number, y: number, r: number, a = 0.45) => {
  const [sx, sy] = P(x, y, 0);
  ellipse(sx, sy, r * 22 * cam.z, r * 11 * cam.z, 'rgb(12,10,12)', null, a);
};

const ring = (cx: number, cy: number, r: number, z: number, a0: number, a1: number, n = 16): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z));
  }
  return pts;
};

// --- Well ------------------------------------------------------------------

export const drawWell = (x: number, y: number) => {
  const r = 0.55;
  const h = 9;
  contact(x + 0.1, y + 0.1, 0.9, 0.5);
  // The front half of the drum, facing +x+y.
  const a0 = -Math.PI / 4;
  const a1 = (3 * Math.PI) / 4;
  const bot = ring(x, y, r, 0, a0, a1);
  const top = ring(x, y, r, h, a1, a0);
  poly([...bot, ...top], rgb(STONE, 0.78));
  // Coursed stones, lit on the left.
  for (let j = 0; j < 3; j++) {
    const z0 = j * 3;
    for (let i = 0; i < 7; i++) {
      const s0 = a0 + ((a1 - a0) * (i + (j % 2) * 0.5)) / 7;
      const s1 = Math.min(a1, s0 + (a1 - a0) / 7);
      const shade = 0.55 + 0.4 * Math.max(0, Math.sin(s0 + 0.4)) + hash(i, j, 61) * 0.12;
      poly([...ring(x, y, r, z0 + 0.4, s0, s1, 3), ...ring(x, y, r, z0 + 2.8, s1, s0, 3)], rgb(STONE, shade));
    }
  }
  poly(ring(x, y, r, h, 0, Math.PI * 2, 20), rgb(STONE, 0.95));
  poly(ring(x, y, r * 0.7, h, 0, Math.PI * 2, 20), rgb([14, 14, 20]));
  // Posts, crossbar, rope and bucket, and a little shingled roof.
  const pa: [number, number] = [x - 0.6, y + 0.6];
  const pb: [number, number] = [x + 0.6, y - 0.6];
  for (const p of [pa, pb]) {
    wline([
      [p[0], p[1], 0],
      [p[0], p[1], 24],
    ], rgb(DARKWOOD, 0.9), 1.6);
  }
  wline([
    [pa[0], pa[1], 20],
    [pb[0], pb[1], 20],
  ], rgb(DARKWOOD, 0.8), 1.2);
  wline([
    [x, y, 20],
    [x, y, 13],
  ], rgb([120, 104, 80]), 0.5);
  const bk = P(x, y, 12);
  poly([[bk[0] - 1.6 * cam.z, bk[1] - 1.5 * cam.z], [bk[0] + 1.6 * cam.z, bk[1] - 1.5 * cam.z], [bk[0] + 1.2 * cam.z, bk[1] + 1.5 * cam.z], [bk[0] - 1.2 * cam.z, bk[1] + 1.5 * cam.z]], rgb(WOOD, 0.8));
  const ov = 0.15;
  const ridgeA: [number, number, number] = [pa[0] - ov, pa[1] + ov, 30];
  const ridgeB: [number, number, number] = [pb[0] + ov, pb[1] - ov, 30];
  wpoly([[pa[0] - ov - 0.45, pa[1] + ov - 0.45, 23], [pb[0] + ov - 0.45, pb[1] - ov - 0.45, 23], ridgeB, ridgeA], rgb([70, 60, 52], 0.5));
  const fr: [number, number, number][] = [[pa[0] - ov + 0.45, pa[1] + ov + 0.45, 23], [pb[0] + ov + 0.45, pb[1] - ov + 0.45, 23], ridgeB, ridgeA];
  wpoly(fr, rgb([88, 72, 58], 0.85));
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    wline([
      [fr[0][0] + (ridgeA[0] - fr[0][0]) * t, fr[0][1] + (ridgeA[1] - fr[0][1]) * t, 23 + 7 * t],
      [fr[1][0] + (ridgeB[0] - fr[1][0]) * t, fr[1][1] + (ridgeB[1] - fr[1][1]) * t, 23 + 7 * t],
    ], rgb([50, 40, 34]), 0.6);
  }
  wline([ridgeA, ridgeB], rgb(DARKWOOD, 0.7), 1.2);
};

// --- Fire --------------------------------------------------------------------

/** Fire intensity flicker 0.75..1.1, shared by the flame and its light. */
export const fireFlicker = (f: number, seed: string) =>
  0.9 + 0.12 * noise2D(seed, f * 0.21, 0) + 0.06 * noise2D(seed + 'b', f * 0.63, 3);

/** Gusts lean the flames and smoke; one big gust swings the sign. */
export const wind = (f: number) => {
  const gust = Math.exp(-Math.pow((f - (C.signCreak - 6)) / 14, 2));
  return 0.25 + 0.2 * noise2D('wind', f * 0.01, 0) + gust * 1.1;
};

const tongue = (bx: number, by: number, w: number, h: number, lean: number, col: RGB, k: number) => {
  const z = cam.z;
  const pts: Pt[] = [
    [bx - w * z, by],
    [bx - w * 0.6 * z + lean * 0.3 * z, by - h * 0.45 * z],
    [bx + lean * z, by - h * z],
    [bx + w * 0.6 * z + lean * 0.3 * z, by - h * 0.45 * z],
    [bx + w * z, by],
  ];
  poly(pts, rgb(col), rgb(col, k));
};

export const drawFlames = (x: number, y: number, z0: number, size: number, f: number, seed: string) => {
  const [bx, by] = P(x, y, z0);
  const fl = fireFlicker(f, seed);
  const w = wind(f);
  for (let i = 0; i < 5; i++) {
    const s = seed + i;
    const off = (i - 2) * 1.6 * size;
    const hh = size * (7 + 6 * (1 - Math.abs(i - 2) / 2)) * (0.75 + 0.35 * noise2D(s, f * 0.25, i));
    const lean = noise2D(s + 'l', f * 0.2, 0) * 2 * size + w * 3 * size;
    tongue(bx + off * cam.z, by, 2.2 * size, hh * fl, lean, FIRE_OUT, 0.95);
  }
  for (let i = 0; i < 3; i++) {
    const s = seed + 'm' + i;
    const off = (i - 1) * 1.4 * size;
    const hh = size * (6 + 3 * (i === 1 ? 1 : 0)) * (0.8 + 0.3 * noise2D(s, f * 0.3, i));
    const lean = noise2D(s + 'l', f * 0.24, 0) * 1.5 * size + w * 2.4 * size;
    tongue(bx + off * cam.z, by, 1.6 * size, hh * fl, lean, FIRE_MID, 1);
  }
  tongue(bx, by, 1.2 * size, size * 4.5 * fl, w * 1.5 * size, FIRE_IN, 1);
  // Sparks spiralling up.
  for (let i = 0; i < 9; i++) {
    const s = seed + 'sp' + i;
    const period = 26 + hash(i, 1, seed.length) * 30;
    const t = ((f + hash(i, 2, seed.length) * period) % period) / period;
    const sx = bx + (noise2D(s, f * 0.05, i) * 5 + t * w * 14) * size * cam.z;
    const sy = by - t * 34 * size * cam.z;
    const a = 1 - t;
    const c = mix(FIRE_IN, FIRE_OUT, t);
    poly([[sx, sy], [sx + cam.z, sy], [sx + cam.z, sy + cam.z], [sx, sy + cam.z]], rgb(c, a), rgb(c, a));
  }
  glow(bx, by - 5 * size * cam.z, 26 * size * cam.z, FIRE_MID, 0.3 * fl);
  glow(bx, by - 3 * size * cam.z, 10 * size * cam.z, FIRE_IN, 0.35 * fl);
};

export const drawCampfire = (x: number, y: number, f: number) => {
  contact(x, y, 0.55, 0.6);
  // Ash bed and a ring of stones.
  const ash = ring(x, y, 0.36, 0, 0, Math.PI * 2, 14);
  poly(ash, rgb([40, 34, 32]));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const [sx, sy] = P(x + Math.cos(a) * 0.42, y + Math.sin(a) * 0.42, 1);
    ellipse(sx, sy, 2.2 * cam.z, 1.5 * cam.z, rgb(STONE, 0.7 + 0.3 * Math.sin(a + 2)));
  }
  // Crossed logs, their ends glowing.
  wline([
    [x - 0.3, y + 0.1, 1.5],
    [x + 0.3, y - 0.1, 2.5],
  ], rgb(DARKWOOD, 0.8), 2.2);
  wline([
    [x - 0.05, y - 0.32, 1.5],
    [x + 0.08, y + 0.3, 2.5],
  ], rgb(DARKWOOD, 0.7), 2.2);
  const fl = fireFlicker(f, 'camp');
  const [ex, ey] = P(x, y, 2);
  ellipse(ex, ey, 5 * cam.z, 2.2 * cam.z, rgb(FIRE_OUT), rgb(FIRE_OUT, 0.9 * fl));
  drawFlames(x, y, 2, 1, f, 'camp');
  addLight(x, y, 6, 118 * (0.94 + 0.08 * fl), [255, 150, 70], 1.05 * fl, 1);
};

export const drawBrazier = (x: number, y: number, f: number) => {
  contact(x, y, 0.35, 0.5);
  for (const a of [0.4, 2.5, 4.6]) {
    wline([
      [x + Math.cos(a) * 0.28, y + Math.sin(a) * 0.28, 0],
      [x + Math.cos(a) * 0.12, y + Math.sin(a) * 0.12, 11],
    ], rgb(IRON), 1.1);
  }
  const bowl = [...ring(x, y, 0.3, 13, -Math.PI / 4, (3 * Math.PI) / 4, 10), ...ring(x, y, 0.2, 9, (3 * Math.PI) / 4, -Math.PI / 4, 10)];
  poly(bowl, rgb([60, 52, 50]));
  poly(ring(x, y, 0.3, 13, 0, Math.PI * 2, 14), rgb(FIRE_OUT, 0.7), rgb(FIRE_OUT, 0.7));
  drawFlames(x, y, 13, 0.7, f, 'braz');
  const fl = fireFlicker(f, 'braz');
  addLight(x, y, 14, 80, [255, 140, 60], 0.75 * fl, 0.6);
};

// --- Cart --------------------------------------------------------------------

const wheel = (cx: number, y: number, z: number, r: number, k: number, spin: number) => {
  const rim: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rim.push(P(cx + Math.cos(a) * r, y, z + Math.sin(a) * r * 17.9));
  }
  line(rim, rgb(DARKWOOD, k), 1.4);
  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * Math.PI;
    line(
      [P(cx + Math.cos(a) * r, y, z + Math.sin(a) * r * 17.9), P(cx - Math.cos(a) * r, y, z - Math.sin(a) * r * 17.9)],
      rgb(DARKWOOD, k * 0.9),
      0.7,
    );
  }
};

export const drawCart = (x0: number, y0: number) => {
  const x1 = x0 + 1.5;
  const y1 = y0 + 0.75;
  contact(x0 + 0.75, y0 + 0.4, 1.0, 0.45);
  wheel(x0 + 0.55, y0 - 0.02, 5, 0.3, 0.55, 0.3);
  // Bed.
  const fy = faceY(x0, x1, y1);
  const fx = faceX(x1, y0, y1);
  wpoly([[x0, y0, 9], [x1, y0, 9], [x1, y1, 9], [x0, y1, 9]], rgb([40, 30, 24]));
  // Sacks and a barrel in the bed.
  ellipse(...P(x0 + 0.4, y0 + 0.4, 11), 4 * cam.z, 3 * cam.z, rgb([140, 122, 92], 0.8));
  ellipse(...P(x0 + 0.75, y0 + 0.35, 12), 4 * cam.z, 3 * cam.z, rgb([150, 130, 98], 0.75));
  const bc = P(x0 + 1.15, y0 + 0.4, 9);
  poly([[bc[0] - 3 * cam.z, bc[1]], [bc[0] + 3 * cam.z, bc[1]], [bc[0] + 3 * cam.z, bc[1] - 8 * cam.z], [bc[0] - 3 * cam.z, bc[1] - 8 * cam.z]], rgb(WOOD, 0.75));
  ellipse(bc[0], bc[1] - 8 * cam.z, 3 * cam.z, 1.4 * cam.z, rgb(WOOD, 0.95));
  line([[bc[0] - 3 * cam.z, bc[1] - 2 * cam.z], [bc[0] + 3 * cam.z, bc[1] - 2 * cam.z]], rgb(IRON), 0.6);
  line([[bc[0] - 3 * cam.z, bc[1] - 6 * cam.z], [bc[0] + 3 * cam.z, bc[1] - 6 * cam.z]], rgb(IRON), 0.6);
  // Side boards.
  poly(fquad(fy, 0, fy.len, 5, 11), rgb(WOOD, 0.85));
  poly(fquad(fx, 0, fx.len, 5, 11), rgb(WOOD, 0.62));
  for (const z of [7, 9]) line([fp(fy, 0, z), fp(fy, fy.len, z)], rgb(DARKWOOD, 0.7), 0.5);
  // Shafts resting on the ground.
  for (const yy of [y0 + 0.15, y1 - 0.15]) {
    wline([
      [x1, yy, 6],
      [x1 + 1.3, yy, 0.5],
    ], rgb(WOOD, 0.7), 1.1);
  }
  wheel(x0 + 0.55, y1 + 0.02, 5, 0.3, 0.9, 0.9);
};

// --- Fences ----------------------------------------------------------------

export const drawFence = (a: [number, number], b: [number, number], seed: number) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / 0.24));
  const dx = (b[0] - a[0]) / n;
  const dy = (b[1] - a[1]) / n;
  // Facing: rails along x are lit like +y faces, rails along y like +x faces.
  const k = Math.abs(dx) > Math.abs(dy) ? 0.9 : 0.7;
  for (const z of [2.5, 5.5]) {
    wline([
      [a[0], a[1], z],
      [b[0], b[1], z],
    ], rgb(WOOD, k * 0.7), 0.8);
  }
  for (let i = 0; i <= n; i++) {
    if (hash(i, seed, 71) < 0.08) continue; // missing pickets
    const x = a[0] + dx * i;
    const y = a[1] + dy * i;
    const tilt = (hash(i, seed, 72) - 0.5) * 0.12;
    const h = 7 + hash(i, seed, 73) * 1.5;
    const p0 = P(x, y, 0);
    const p1 = P(x + tilt, y, h);
    line([p0, p1], rgb(WOOD, k * (0.8 + hash(i, seed, 74) * 0.3)), 1.1);
  }
};

// --- Trees -------------------------------------------------------------------

type Seg = {a: Pt; b: Pt; w: number};

/** Bare winter tree as screen-space branches, swaying a little at the tips. */
export const drawTree = (x: number, y: number, height: number, seed: number, f: number) => {
  const [bx, by] = P(x, y, 0);
  contact(x, y, 0.4, 0.4);
  const segs: Seg[] = [];
  const grow = (px: number, py: number, ang: number, len: number, w: number, depth: number, id: number) => {
    const sway = noise2D('tree' + seed, f * 0.02 + id * 0.1, depth) * 0.04 * (5 - depth);
    const a = ang + sway;
    const nx = px + Math.cos(a) * len;
    const ny = py + Math.sin(a) * len;
    segs.push({a: [px, py], b: [nx, ny], w});
    if (depth >= 5 || len < 2.5) return;
    const kids = depth < 1 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spread = (hash(id, i, seed) - 0.5) * 1.1 + (i - (kids - 1) / 2) * 0.55;
      grow(nx, ny, a + spread, len * (0.62 + hash(id, i + 7, seed) * 0.18), w * 0.66, depth + 1, id * 3 + i + 1);
    }
  };
  const z = cam.z;
  grow(bx, by, -Math.PI / 2 + (hash(seed, 1, 81) - 0.5) * 0.2, height * 0.38 * z, 3.2, 0, 1);
  for (const s of segs) line([s.a, s.b], rgb([44, 36, 32]), s.w);
};

// --- Graves ------------------------------------------------------------------

export const drawGrave = (x: number, y: number, kind: number, seed: number) => {
  const tilt = (hash(seed, 1, 91) - 0.5) * 0.25;
  // Earth mound.
  const [mx, my] = P(x + 0.35, y + 0.1, 0);
  ellipse(mx, my, 9 * cam.z, 3.5 * cam.z, rgb([56, 48, 40]), undefined);
  if (kind === 0) {
    // Wooden cross.
    wline([
      [x, y, 0],
      [x + tilt, y, 13],
    ], rgb([88, 70, 52]), 1.5);
    wline([
      [x + tilt * 0.7 - 0.02, y + 0.22, 9],
      [x + tilt * 0.7 + 0.02, y - 0.22, 9],
    ], rgb([88, 70, 52]), 1.3);
  } else if (kind === 1) {
    // Headstone.
    const fy = faceY(x - 0.18, x + 0.18, y + 0.06);
    const pts = [fp(fy, 0, 0), fp(fy, 0.36, 0), fp(fy, 0.36, 8), fp(fy, 0.28, 10), fp(fy, 0.18, 10.6), fp(fy, 0.08, 10), fp(fy, 0, 8)];
    poly(pts, rgb([118, 114, 110], 0.8));
    const fx = faceX(x + 0.18, y - 0.06, y + 0.06);
    poly(fquad(fx, 0, 0.12, 0, 8), rgb([118, 114, 110], 0.55));
  } else {
    // Stone cross (Celtic, with a ring).
    const fy = faceY(x - 0.2, x + 0.2, y);
    poly(fquad(fy, 0.14, 0.26, 0, 15), rgb([122, 118, 112], 0.8));
    poly(fquad(fy, 0.0, 0.4, 9, 11.4), rgb([122, 118, 112], 0.8));
    const ringPts: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ringPts.push(fp(fy, 0.2 + Math.cos(a) * 0.13, 10.2 + Math.sin(a) * 2.4));
    }
    line(ringPts, rgb([122, 118, 112], 0.72), 0.8);
  }
};

// --- The tavern sign -----------------------------------------------------------

/** Swing angle (radians about the bracket). A gust kicks it hard at the creak. */
export const signAngle = (f: number) => {
  const idle = 0.07 * Math.sin(f * 0.075) + 0.03 * noise2D('sign', f * 0.03, 0);
  const t = f - (C.signCreak - 8);
  const kick = t < 0 ? 0 : Math.min(1, t / 6) * Math.exp(-t / 75) * 0.62 * Math.sin((t / 40) * Math.PI * 2 - 0.4);
  return idle + kick;
};

/** Bracket sticks out of a +y wall at (x, y1), height z. */
export const drawSign = (x: number, y1: number, z: number, f: number) => {
  const reach = 1.3;
  // Iron bracket with a diagonal brace.
  wline([
    [x, y1, z],
    [x, y1 + reach, z],
  ], rgb(IRON), 1.3);
  wline([
    [x, y1, z - 6],
    [x, y1 + reach * 0.6, z],
  ], rgb(IRON), 0.9);
  const th = signAngle(f);
  const s0 = y1 + 0.25;
  const s1 = y1 + reach - 0.08;
  // Board hangs on two short chains; it rotates about the bracket (the y axis).
  // d is in px below the bracket; horizontal swing converts px to tiles (~18 px per tile).
  const pt = (s: number, d: number): [number, number, number] => [x + (Math.sin(th) * d) / 18, s, z - Math.cos(th) * d];
  const chain = 2.2;
  const bh = 11;
  wline([pt(s0, 0), pt(s0, chain)], rgb([70, 66, 64]), 0.6);
  wline([pt(s1, 0), pt(s1, chain)], rgb([70, 66, 64]), 0.6);
  // Face facing +x is the lit side; brightness follows the swing.
  const k = 0.62 + Math.sin(th) * 0.5;
  const board = [pt(s0 - 0.06, chain), pt(s1 + 0.06, chain), pt(s1 + 0.06, chain + bh), pt(s0 - 0.06, chain + bh)];
  wpoly(board, rgb([134, 96, 62], Math.max(0.4, k)));
  wline([board[0], board[1], board[2], board[3], board[0]], rgb(DARKWOOD, 0.8), 0.7);
  // Painted tankard, in flaking gold.
  const gold: RGB = [178, 144, 80];
  const mid = (s0 + s1) / 2;
  wpoly(
    [pt(mid - 0.22, chain + 3), pt(mid + 0.14, chain + 3), pt(mid + 0.12, chain + 9), pt(mid - 0.2, chain + 9)],
    rgb(gold, Math.max(0.4, k)),
  );
  wline([pt(mid + 0.14, chain + 4.2), pt(mid + 0.32, chain + 4.8), pt(mid + 0.3, chain + 7.4), pt(mid + 0.13, chain + 7.8)], rgb(gold, Math.max(0.4, k)), 0.8);
  wpoly([pt(mid - 0.25, chain + 2.2), pt(mid + 0.17, chain + 2.2), pt(mid + 0.15, chain + 3.4), pt(mid - 0.23, chain + 3.4)], rgb([226, 220, 200], Math.max(0.35, k * 0.9)));
};
