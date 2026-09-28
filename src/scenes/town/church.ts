// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The old church: a buttressed stone nave with lancet windows, a square
// tower with a rose window above the door, a belfry and a tall slate spire.
// Something beneath it burns: the glass glows blood red, and red light leaks
// from the ajar door and spills across the flagstones, breathing slowly.

import {P, Pt} from './iso';
import {Face, Plane, faceX, faceY, farch, fcircle, fp, fquad, fw, pl, planePts} from './geom';
import {addLight} from './lights';
import {RGB, glow, line, mix, poly, rgb, wpoly} from './paint';
import {hash} from './ground';
import {C, CHURCH, churchGlow, churchSurge} from './world';
import {SLATE} from './houses';

const STONE: RGB = [132, 127, 122];
const DARK_STONE: RGB = [96, 92, 90];
const RED: RGB = [255, 58, 36];
const DEEP_RED: RGB = [200, 24, 18];
const WOOD: RGB = [70, 48, 34];
const IRON: RGB = [34, 32, 34];
const MOON: RGB = [150, 170, 210];

/** Ashlar: coursed blocks with a few stones set a shade apart. */
const stoneWall = (fc: Face, u0: number, u1: number, z0: number, z1: number, seed: number) => {
  poly(fquad(fc, u0, u1, z0, z1), rgb(STONE, fc.k * 0.9));
  const course = 5;
  const rows = Math.ceil((z1 - z0) / course);
  for (let j = 0; j < rows; j++) {
    const za = z0 + j * course;
    const zb = Math.min(z1, za + course);
    const blk = 0.46;
    const shift = (j % 2) * blk * 0.5;
    for (let u = u0 - shift; u < u1; u += blk) {
      const a = Math.max(u0, u);
      const b = Math.min(u1, u + blk);
      const v = hash(Math.round(u * 10), j, seed);
      if (v < 0.35) poly(fquad(fc, a, b, za, zb), rgb(STONE, fc.k * (0.72 + v * 0.5)));
      if (u > u0) line([fp(fc, u, za), fp(fc, u, zb)], rgb(DARK_STONE, fc.k * 0.62), 0.5, undefined, 0.8);
    }
    line([fp(fc, u0, za), fp(fc, u1, za)], rgb(DARK_STONE, fc.k * 0.6), 0.6, undefined, 0.85);
  }
  // Soot and damp streaking down from the eaves.
  for (let i = 0; i < 6; i++) {
    const u = u0 + hash(i, seed, 7) * (u1 - u0);
    const len = (z1 - z0) * (0.2 + hash(i, seed, 8) * 0.5);
    poly(fquad(fc, u, u + 0.08 + hash(i, seed, 9) * 0.12, z1 - len, z1), rgb([40, 38, 40]), undefined, 0.3);
  }
};

/** A glowing red window; `k` scales its light. */
const redWindow = (pts: Pt[], k: number, frameFc: Face) => {
  poly(pts, rgb(mix(DEEP_RED, RED, Math.min(1, k * 0.8)), Math.min(1.2, 0.5 + k * 0.5)), rgb(mix(DEEP_RED, RED, Math.min(1, k * 0.7)), Math.min(1, 0.35 + k * 0.55)));
  line([...pts, pts[0]], rgb(DARK_STONE, frameFc.k * 0.8), 0.9);
};

const buttress = (y: number, h: number) => {
  const {x1} = CHURCH.nave;
  const w = 0.22;
  const d = 0.5;
  const fY = faceY(x1, x1 + d, y + w);
  const fX = faceX(x1 + d, y - w, y + w);
  poly(fquad(fY, 0, d, 0, h - 8), rgb(STONE, fY.k * 0.82));
  poly(fquad(fX, 0, w * 2, 0, h - 8), rgb(STONE, fX.k * 0.82));
  // Sloped weathering cap.
  wpoly(
    [
      [x1, y + w, h],
      [x1 + d, y + w, h - 8],
      [x1 + d, y - w, h - 8],
      [x1, y - w, h],
    ],
    rgb(DARK_STONE, 0.95),
  );
  for (let z = 8; z < h - 8; z += 9) line([fp(fX, 0, z), fp(fX, w * 2, z)], rgb(DARK_STONE, 0.5), 0.6);
};

const pyramid = (x0: number, y0: number, x1: number, y1: number, z: number, apex: number, col: RGB, courses: number) => {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const fyPts: [number, number, number][] = [
    [x0, y1, z],
    [x1, y1, z],
    [cx, cy, apex],
  ];
  const fxPts: [number, number, number][] = [
    [x1, y1, z],
    [x1, y0, z],
    [cx, cy, apex],
  ];
  wpoly(fyPts, rgb(col, 0.78));
  wpoly(fxPts, rgb(col, 0.5));
  for (let i = 1; i < courses; i++) {
    const t = i / courses;
    const zz = z + (apex - z) * t;
    const lx0 = x0 + (cx - x0) * t;
    const lx1 = x1 + (cx - x1) * t;
    const ly0 = y0 + (cy - y0) * t;
    const ly1 = y1 + (cy - y1) * t;
    line([P(lx0, ly1, zz), P(lx1, ly1, zz), P(lx1, ly0, zz)], rgb(col, 0.36), 0.6, undefined, 0.9);
  }
  return {apex: P(cx, cy, apex), cx, cy};
};

/** Draws the whole church. Returns the belfry position (for crows) and spire tip. */
export const drawChurch = (f: number) => {
  const g = churchGlow(f);
  const surge = churchSurge(f);
  const {nave, tower, door} = CHURCH;

  // --- Nave -----------------------------------------------------------------
  const nX = faceX(nave.x1, nave.y0, nave.y1);
  stoneWall(nX, 0, nX.len, 0, nave.h, 3);
  const nY = faceY(nave.x0, nave.x1, nave.y1);
  stoneWall(nY, 0, nY.len, 0, nave.h, 4);
  poly([fp(nY, 0, nave.h), fp(nY, nY.len, nave.h), fp(nY, nY.len / 2, nave.h + nave.roof)], rgb(STONE, nY.k * 0.8));

  // Lancet windows between the buttresses, red and breathing.
  const lancets = [1.25, 3.45, 5.65];
  lancets.forEach((y, i) => {
    const u = nave.y1 - y;
    const k = g * (0.85 + 0.15 * Math.sin(f * 0.05 + i * 1.7));
    const pts = farch(nX, u, 0.5, 13, 36, 0, 5);
    poly(farch(nX, u, 0.66, 11.5, 38, 0, 5), rgb(DARK_STONE, 0.6));
    redWindow(pts, k, nX);
    line([fp(nX, u, 13), fp(nX, u, 33)], rgb(IRON), 0.6, rgb([60, 8, 6]));
    line([fp(nX, u - 0.25, 22), fp(nX, u + 0.25, 22)], rgb(IRON), 0.5, rgb([60, 8, 6]));
    const c = fw(nX, u, 0, 1.2);
    addLight(c[0], c[1], 0, 48, RED, 0.5 * k, 0.4 * k);
    const gc = fp(nX, u, 25, 0.1);
    glow(gc[0], gc[1], 16, RED, 0.2 * k);
  });
  for (const y of [0.2, 2.35, 4.55, 6.75]) buttress(y, 38);

  // Nave roof, ridge along y.
  const xm = (nave.x0 + nave.x1) / 2;
  const ov = 0.25;
  const ze = nave.h - (nave.roof / ((nave.x1 - nave.x0) / 2)) * ov;
  const back: Plane = [
    [nave.x0 - ov, nave.y0 - ov, ze],
    [nave.x0 - ov, nave.y1 + ov, ze],
    [xm, nave.y1 + ov, nave.h + nave.roof],
    [xm, nave.y0 - ov, nave.h + nave.roof],
  ];
  const front: Plane = [
    [nave.x1 + ov, nave.y1 + ov, ze],
    [nave.x1 + ov, nave.y0 - ov, ze],
    [xm, nave.y0 - ov, nave.h + nave.roof],
    [xm, nave.y1 + ov, nave.h + nave.roof],
  ];
  for (const [p, k] of [
    [back, 0.45],
    [front, 0.66],
  ] as [Plane, number][]) {
    poly(planePts(p), rgb(SLATE, k));
    for (let j = 1; j < 12; j++) line([pl(p, 0, j / 12), pl(p, 1, j / 12)], rgb(SLATE, k * 0.6), 0.6);
    for (let i = 0; i < 6; i++) {
      const s = hash(i, 5, 51);
      const t = hash(i, 6, 52) * 0.8;
      poly([pl(p, s, t), pl(p, s + 0.05, t), pl(p, s + 0.05, t + 0.12), pl(p, s, t + 0.12)], rgb([26, 24, 28]), undefined, 0.8);
    }
    line([pl(p, 0, 0), pl(p, 1, 0)], rgb(SLATE, k * 0.4), 1.5);
  }
  // Moonlit ridge.
  line([pl(front, 0, 1), pl(front, 1, 1)], rgb([70, 72, 84]), 1.4, rgb(MOON, 0.18));

  // --- Tower ----------------------------------------------------------------
  const tY = faceY(tower.x0, tower.x1, tower.y1);
  const tX = faceX(tower.x1, tower.y0, tower.y1);
  stoneWall(tY, 0, tY.len, 0, tower.h, 6);
  stoneWall(tX, 0, tX.len, 0, tower.h, 7);
  // Quoins: big corner stones, alternating.
  for (let z = 0; z < tower.h - 4; z += 6) {
    const long = (z / 6) % 2 === 0;
    poly(fquad(tY, tY.len - (long ? 0.34 : 0.2), tY.len, z, z + 5), rgb(STONE, tY.k * 1.02));
    poly(fquad(tX, 0, long ? 0.2 : 0.34, z, z + 5), rgb(STONE, tX.k * 1.02));
    poly(fquad(tY, 0, long ? 0.2 : 0.34, z, z + 5), rgb(STONE, tY.k * 1.0));
  }
  // String courses.
  for (const z of [30, tower.h - 32, tower.h - 1]) {
    line([fp(tY, 0, z), fp(tY, tY.len, z), fp(tX, tX.len, z)], rgb(DARK_STONE, 0.55), 1.4);
  }

  // Door: a deep pointed arch, one leaf ajar, the other barred.
  const du = door.u;
  poly(farch(tY, du, door.w + 0.36, 0, door.h + 5, 0, 6), rgb(DARK_STONE, 0.7));
  poly(farch(tY, du, door.w + 0.18, 0, door.h + 2.5, 0, 6), rgb(STONE, 0.6));
  const opening = farch(tY, du, door.w, 0, door.h, 0, 6);
  const dk = g;
  poly(opening, rgb(RED, Math.min(1, 0.4 + dk * 0.5)), rgb(mix(DEEP_RED, RED, Math.min(1, dk * 0.6)), Math.min(1, 0.45 + dk * 0.5)));
  // Right leaf shut: the right half of the arch.
  const spring = door.h - door.w * 17.9 * 0.866;
  const half: Pt[] = [fp(tY, du + 0.02, 0), fp(tY, du + door.w / 2, 0)];
  for (let i = 0; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 3);
    half.push(fp(tY, du - door.w / 2 + door.w * Math.cos(a), spring + door.w * 17.9 * Math.sin(a)));
  }
  half.push(fp(tY, du + 0.02, door.h));
  poly(half, rgb(WOOD, 0.8));
  // Left leaf ajar (swung inward), leaving a burning seam.
  // At the rumble the leaf jolts open a hand's width, then settles.
  const jolt = f >= C.churchRumble ? Math.exp(-(f - C.churchRumble) / 10) * Math.abs(Math.sin((f - C.churchRumble) * 0.7)) : 0;
  const ajar = 0.2 + 0.02 * Math.sin(f * 0.03) + surge * 0.06 + jolt * 0.08;
  const al = (door.w / 2) * Math.cos(ajar * Math.PI);
  const inn = -(door.w / 2) * Math.sin(ajar * Math.PI);
  const u0 = du - door.w / 2;
  poly([fp(tY, u0, 0), fp(tY, u0 + al * 0.86, 0, inn * 0.86), fp(tY, u0 + al * 0.86, door.h - 5, inn * 0.86), fp(tY, u0, door.h - 7)], rgb(WOOD, 0.62));
  for (const z of [5, 14]) {
    line([fp(tY, u0, z), fp(tY, u0 + al * 0.86, z, inn * 0.86)], rgb(IRON), 0.7);
    line([fp(tY, du + 0.05, z), fp(tY, du + door.w / 2 - 0.02, z)], rgb(IRON), 0.7);
  }
  // Red light pouring from the doorway across the ground.
  const dg = fw(tY, du, 0, 0);
  // Three nested wedges, each wider and fainter, feather the spill's edges.
  const wedge = (w: number, reach: number): Pt[] =>
    (
      [
        [dg[0] - 0.4 - 0.15 * (w - 1), dg[1]],
        [dg[0] + 0.2 + 0.15 * (w - 1), dg[1]],
        [dg[0] + (0.9 + surge * 0.4) * w, dg[1] + (3.2 + surge * 1.6) * reach],
        [dg[0] - (0.9 + surge * 0.4) * w, dg[1] + (3.6 + surge * 1.8) * reach],
      ] as [number, number][]
    ).map(([x, y]) => P(x, y, 0));
  const E0 = P(dg[0], dg[1], 0);
  const eg = (glowCtx: CanvasRenderingContext2D, reach: number, k: number) => {
    const end = P(dg[0], dg[1] + (3.4 + surge * 1.7) * reach, 0);
    const gr = glowCtx.createLinearGradient(E0[0], E0[1], end[0], end[1]);
    gr.addColorStop(0, rgb(RED, 1, 0.55 * k * Math.min(1.5, dk)));
    gr.addColorStop(0.55, rgb(RED, 1, 0.3 * k * Math.min(1.5, dk)));
    gr.addColorStop(1, rgb(RED, 1, 0));
    return gr;
  };
  spillShape = [
    {pts: wedge(1.9, 1.3), grad: (c) => eg(c, 1.3, 0.2)},
    {pts: wedge(1.4, 1.15), grad: (c) => eg(c, 1.15, 0.3)},
    {pts: wedge(1, 1), grad: (c) => eg(c, 1, 0.5)},
  ];
  addLight(dg[0], dg[1] + 1.2, 0, 90, RED, 0.9 * dk, 1.2 * dk);
  // The surge floods the whole square red for a moment.
  addLight(dg[0] + 1, dg[1] + 1.5, 10, 260, [255, 22, 18], 0.85 * surge, 0);
  const sg = P(dg[0], dg[1], 30);
  glow(sg[0], sg[1], 170, DEEP_RED, 0.22 * surge);
  addLight(dg[0], dg[1] + 0.2, 20, 60, RED, 0.5 * dk, 0);
  const dc = fp(tY, du, door.h * 0.5, 0.1);
  glow(dc[0], dc[1], 26, RED, 0.35 * dk);

  // Rose window above the door.
  const rz = 48;
  poly(fcircle(tY, du, rz, 0.5, 18), rgb(DARK_STONE, 0.7));
  const rose = fcircle(tY, du, rz, 0.4, 18);
  redWindow(rose, g * 1.05, tY);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    line([fp(tY, du, rz), fp(tY, du + Math.cos(a) * 0.4, rz + Math.sin(a) * 7)], rgb(IRON), 0.5, rgb([70, 10, 6]));
  }
  poly(fcircle(tY, du, rz, 0.12, 10), rgb([255, 150, 70], Math.min(1, 0.5 + g * 0.4)), rgb([255, 120, 60], Math.min(1, 0.3 + g * 0.45)));
  const rc = fp(tY, du, rz, 0.1);
  glow(rc[0], rc[1], 22, RED, 0.28 * g);
  addLight(fw(tY, du, 0, 1)[0], fw(tY, du, 0, 1)[1], rz, 60, RED, 0.35 * g, 0);

  // Arrow slits and the belfry.
  for (const [fc, u, z] of [
    [tX, 1.4, 40],
    [tY, 0.55, 36],
  ] as [Face, number, number][]) {
    poly(farch(fc, u, 0.16, z, z + 12, 0, 3), rgb([22, 18, 20]), rgb(DEEP_RED, 0.25 * g));
  }
  for (const fc of [tY, tX]) {
    for (const u of [fc.len * 0.32, fc.len * 0.68]) {
      const bz = tower.h - 26;
      poly(farch(fc, u, 0.46, bz, bz + 17, 0, 4), rgb(DARK_STONE, 0.5));
      poly(farch(fc, u, 0.36, bz + 1, bz + 16, 0, 4), rgb([14, 10, 12]), rgb(DEEP_RED, 0.18 * g));
      for (const z of [bz + 4, bz + 7, bz + 10, bz + 13]) line([fp(fc, u - 0.18, z), fp(fc, u + 0.18, z + 1)], rgb([48, 40, 36]), 0.7);
    }
  }

  // Parapet and pinnacles.
  const px0 = tower.x0 - 0.12;
  const px1 = tower.x1 + 0.12;
  const py0 = tower.y0 - 0.12;
  const py1 = tower.y1 + 0.12;
  const pY = faceY(px0, px1, py1);
  const pX = faceX(px1, py0, py1);
  poly(fquad(pY, 0, pY.len, tower.h - 1, tower.h + 5), rgb(STONE, pY.k * 0.85));
  poly(fquad(pX, 0, pX.len, tower.h - 1, tower.h + 5), rgb(STONE, pX.k * 0.85));
  // Top of the parapet, then the spire.
  const spireBase = tower.h + 5;
  pyramid(px0, py0, px0 + 0.34, py0 + 0.34, spireBase, spireBase + 14, DARK_STONE, 2);
  const sp0 = pyramid(tower.x0 + 0.44, tower.y0 + 0.44, tower.x1 - 0.44, tower.y1 - 0.44, spireBase - 1, tower.h + tower.spire, SLATE, 22);
  pyramid(px1 - 0.34, py0, px1, py0 + 0.34, spireBase, spireBase + 14, DARK_STONE, 2);
  pyramid(px0, py1 - 0.34, px0 + 0.34, py1, spireBase, spireBase + 14, DARK_STONE, 2);
  pyramid(px1 - 0.34, py1 - 0.34, px1, py1, spireBase, spireBase + 14, DARK_STONE, 2);
  // Cold moonlight catching the spire's left edge.
  const tip = P(sp0.cx, sp0.cy, tower.h + tower.spire);
  const baseL = P(tower.x0 + 0.44, tower.y1 - 0.44, spireBase - 1);
  line([baseL, tip], rgb([96, 104, 124]), 0.9, rgb(MOON, 0.22));
  // Iron finial cross.
  const ft = P(sp0.cx, sp0.cy, tower.h + tower.spire + 9);
  line([tip, ft], rgb(IRON), 1);
  const cz = tower.h + tower.spire + 6;
  line([P(sp0.cx - 0.12, sp0.cy + 0.12, cz), P(sp0.cx + 0.12, sp0.cy - 0.12, cz)], rgb(IRON), 1);

  // Red haze hanging around the base of the church.
  const hz = P(tower.x1 - 0.5, tower.y1 - 2, 10);
  glow(hz[0], hz[1], 120, DEEP_RED, 0.08 * g);
  addLight((nave.x0 + nave.x1) / 2 + 1.5, (nave.y0 + nave.y1) / 2 + 2, 0, 160, DEEP_RED, 0.3 * g, 0);
  return {tip};
};

/** The red wash spilling from the door, applied on the ground before anything stands on it. */
let spillShape: {pts: Pt[]; grad: (c: CanvasRenderingContext2D) => CanvasGradient}[] = [];

export const drawDoorSpill = (E: CanvasRenderingContext2D) => {
  E.save();
  E.globalCompositeOperation = 'lighter';
  for (const {pts, grad} of spillShape) {
    E.beginPath();
    E.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) E.lineTo(p[0], p[1]);
    E.closePath();
    E.fillStyle = grad(E);
    E.fill();
  }
  E.restore();
};
