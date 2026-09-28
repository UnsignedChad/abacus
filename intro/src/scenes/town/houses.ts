// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Timber-framed cottages and the tavern: plaster panels between dark oak
// posts and braces, a stone plinth, thatch or slate gable roofs, chimneys,
// lit windows with shutters, doors that open and shut. Every window that is
// lit registers a warm light spilling onto the ground beneath it.

import {noise2D} from '@remotion/noise';
import {P, Pt} from './iso';
import {Face, Plane, V3, faceX, faceY, fp, fquad, fw, pl, planePts} from './geom';
import {addLight} from './lights';
import {RGB, glow, line, mix, poly, rgb, wpoly} from './paint';
import {hash} from './ground';

export const PLASTER: RGB = [192, 178, 148];
export const TIMBER: RGB = [62, 44, 31];
export const PLINTH: RGB = [112, 106, 100];
export const THATCH: RGB = [146, 116, 70];
export const SLATE: RGB = [74, 76, 88];
export const WARM: RGB = [255, 186, 104];

export type Win = {
  side: 'x' | 'y';
  u: number;
  z: number;
  w: number;
  h: number;
  lit: (f: number) => number; // 0..1
  shutter?: (f: number) => number; // 0 open .. 1 closed
  figure?: (f: number) => number; // silhouette inside the window, 0..1 presence
};

export type Door = {side: 'x' | 'y'; u: number; w: number; h: number; open: (f: number) => number; lit: (f: number) => number};

export type House = {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  h: number;
  roofH: number;
  ridge: 'x' | 'y';
  roof: 'thatch' | 'slate';
  wins: Win[];
  doors: Door[];
  chimney?: [number, number];
  plaster?: RGB;
};

const flick = (f: number, seed: string) => 0.9 + 0.1 * noise2D(seed, f * 0.08, 0);

/** Oak framing: corner posts, studs, a mid rail, and braces in some panels. */
const framing = (fc: Face, h: number, seed: string, gable?: {apex: number}) => {
  const col = rgb(TIMBER, fc.k);
  const bays = Math.max(2, Math.round(fc.len / 1.05));
  const mid = h * 0.52;
  // Plaster tint per panel, for a hand-made patchiness.
  for (let i = 0; i < bays; i++) {
    const u0 = (fc.len * i) / bays;
    const u1 = (fc.len * (i + 1)) / bays;
    for (const [z0, z1] of [
      [3, mid],
      [mid, h],
    ]) {
      const t = hash(i, z0, seed.length * 31);
      poly(fquad(fc, u0, u1, z0, z1), rgb(PLASTER, fc.k * (0.84 + t * 0.14)));
    }
  }
  poly(fquad(fc, 0, fc.len, 0, 3.2), rgb(PLINTH, fc.k * 0.9));
  for (let i = 0; i <= bays; i++) {
    const u = (fc.len * i) / bays;
    line([fp(fc, u, 3), fp(fc, u, h)], col, i === 0 || i === bays ? 1.6 : 1.1);
  }
  line([fp(fc, 0, 3), fp(fc, fc.len, 3)], col, 1.2);
  line([fp(fc, 0, mid), fp(fc, fc.len, mid)], col, 1.1);
  line([fp(fc, 0, h - 0.5), fp(fc, fc.len, h - 0.5)], col, 1.4);
  for (let i = 0; i < bays; i++) {
    if (hash(i, 3, seed.length) < 0.5) continue;
    const u0 = (fc.len * i) / bays;
    const u1 = (fc.len * (i + 1)) / bays;
    const up = hash(i, 4, seed.length) < 0.5;
    line([fp(fc, up ? u0 : u1, mid), fp(fc, up ? u1 : u0, h - 0.5)], col, 0.9);
  }
  if (gable) {
    line([fp(fc, fc.len / 2, h), fp(fc, fc.len / 2, gable.apex - 2)], col, 1.1);
  }
};

const drawWindow = (fc: Face, w: Win, f: number, id: string) => {
  const lit = w.lit(f);
  const u0 = w.u - w.w / 2;
  const u1 = w.u + w.w / 2;
  // Frame and sill.
  poly(fquad(fc, u0 - 0.07, u1 + 0.07, w.z - 1.2, w.z + w.h + 1.2), rgb(TIMBER, fc.k * 0.9));
  const glass: RGB = mix([28, 26, 34], WARM, lit * flick(f, id));
  const emi = lit > 0.02 ? rgb(WARM, lit * flick(f, id) * 0.95) : undefined;
  poly(fquad(fc, u0, u1, w.z, w.z + w.h), rgb(glass), emi);
  // A figure inside, dark against the light.
  const fig = w.figure ? w.figure(f) : 0;
  if (fig > 0.01 && lit > 0.05) {
    const cu = w.u + (1 - fig) * w.w * 0.4;
    const head: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      head.push(fp(fc, cu + Math.cos(a) * 0.09, w.z + w.h * 0.62 + Math.sin(a) * 1.6));
    }
    poly(fquad(fc, cu - 0.2, cu + 0.2, w.z, w.z + w.h * 0.45), rgb([20, 16, 18]));
    poly(head, rgb([20, 16, 18]));
  }
  // Mullion cross.
  const mc = rgb(TIMBER, fc.k * 0.8);
  line([fp(fc, w.u, w.z), fp(fc, w.u, w.z + w.h)], mc, 0.8);
  line([fp(fc, u0, w.z + w.h * 0.5), fp(fc, u1, w.z + w.h * 0.5)], mc, 0.8);
  // Shutters: two boards hinged at the frame, swinging in over the glass.
  const c = w.shutter ? w.shutter(f) : 0;
  const phi = Math.PI * (1 - c);
  const half = w.w / 2 + 0.02;
  const shutCol = rgb([84, 60, 40], fc.k * (0.75 + 0.25 * Math.abs(Math.cos(phi))));
  for (const side of [-1, 1]) {
    const hinge = side < 0 ? u0 - 0.02 : u1 + 0.02;
    const along = -side * half * Math.cos(phi);
    const out = half * Math.sin(phi);
    const z0 = w.z - 0.8;
    const z1 = w.z + w.h + 0.8;
    const pts: Pt[] = [fp(fc, hinge, z0), fp(fc, hinge + along, z0, out), fp(fc, hinge + along, z1, out), fp(fc, hinge, z1)];
    poly(pts, shutCol);
    line([fp(fc, hinge + along * 0.5, z0, out * 0.5), fp(fc, hinge + along * 0.5, z1, out * 0.5)], rgb(TIMBER, 0.7), 0.5);
  }
  // Light still bleeding through the cracks just after closing.
  if (c > 0.97 && lit > 0.05) {
    line([fp(fc, w.u, w.z + 0.5, 0.02), fp(fc, w.u, w.z + w.h - 0.5, 0.02)], rgb(WARM, lit), 0.6, rgb(WARM, lit * 0.8));
  }
  const spill = lit * (1 - c * 0.85);
  if (spill > 0.02) {
    const p = fw(fc, w.u, 0, 0.9);
    addLight(p[0], p[1], w.z * 0.6, 34 + w.w * 16, WARM, 0.55 * spill * flick(f, id + 'l'), 0.5 * spill);
    const g = fp(fc, w.u, w.z + w.h / 2, 0.05);
    glow(g[0], g[1], 9 + w.w * 6, WARM, 0.22 * spill);
  }
};

const drawDoor = (fc: Face, d: Door, f: number, id: string) => {
  const lit = d.lit(f);
  const o = d.open(f);
  const u0 = d.u - d.w / 2;
  const u1 = d.u + d.w / 2;
  poly(fquad(fc, u0 - 0.08, u1 + 0.08, 0, d.h + 1.5), rgb(TIMBER, fc.k * 0.8));
  const inside = lit * o;
  poly(fquad(fc, u0, u1, 0, d.h), rgb(mix([18, 14, 14], WARM, inside)), inside > 0.02 ? rgb(WARM, inside * 0.9) : undefined);
  // Leaf swings inward about its left edge.
  const phi = o * Math.PI * 0.42;
  const along = d.w * Math.cos(phi);
  const inn = -d.w * Math.sin(phi);
  const leaf: Pt[] = [fp(fc, u0, 0), fp(fc, u0 + along, 0, inn), fp(fc, u0 + along, d.h, inn), fp(fc, u0, d.h)];
  poly(leaf, rgb([88, 62, 40], fc.k * (0.7 + 0.3 * Math.cos(phi))));
  line([fp(fc, u0 + along * 0.5, 0, inn * 0.5), fp(fc, u0 + along * 0.5, d.h, inn * 0.5)], rgb(TIMBER, 0.6), 0.5);
  line([fp(fc, u0, d.h * 0.3), fp(fc, u0 + along, d.h * 0.3, inn)], rgb(TIMBER, 0.55), 0.6);
  line([fp(fc, u0, d.h * 0.75), fp(fc, u0 + along, d.h * 0.75, inn)], rgb(TIMBER, 0.55), 0.6);
  if (inside > 0.02) {
    const p = fw(fc, d.u, 0, 0.9);
    addLight(p[0], p[1], 4, 44, WARM, 0.7 * inside * flick(f, id + 'd'), 0.6 * inside);
  }
};

const wallFace = (h: House, side: 'x' | 'y') => (side === 'x' ? faceX(h.x1, h.y0, h.y1) : faceY(h.x0, h.x1, h.y1));

/** Roof texture: thatch combed along the slope, or slate in courses. */
const roofPlane = (h: House, p: Plane, k: number, seed: number) => {
  const base = h.roof === 'thatch' ? THATCH : SLATE;
  poly(planePts(p), rgb(base, k));
  if (h.roof === 'thatch') {
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const v = hash(i, seed, 41);
      line([pl(p, s, 0.02), pl(p, s + (v - 0.5) * 0.02, 0.97)], rgb(base, k * (0.62 + v * 0.3)), 0.8, undefined, 0.8);
    }
    // Weathered patches and moss.
    for (let i = 0; i < 5; i++) {
      const s = hash(i, seed, 43);
      const t = hash(i, seed, 44) * 0.8;
      const q: Pt[] = [pl(p, s, t), pl(p, s + 0.14, t), pl(p, s + 0.12, t + 0.18), pl(p, s - 0.02, t + 0.16)];
      poly(q, rgb([92, 98, 64], k * 0.8), undefined, 0.45);
    }
  } else {
    const rows = 9;
    for (let j = 1; j < rows; j++) {
      const t = j / rows;
      line([pl(p, 0, t), pl(p, 1, t)], rgb(base, k * 0.62), 0.7);
      const cols = 10;
      for (let i = 0; i < cols; i++) {
        const s = (i + (j % 2) * 0.5) / cols;
        if (s >= 1) continue;
        line([pl(p, s, t), pl(p, s, t - 1 / rows)], rgb(base, k * 0.7), 0.5, undefined, 0.8);
      }
    }
    // Broken and missing slates.
    for (let i = 0; i < 4; i++) {
      const s = hash(i, seed, 45);
      const t = hash(i, seed, 46) * 0.85;
      const q: Pt[] = [pl(p, s, t), pl(p, s + 0.07, t), pl(p, s + 0.07, t + 0.1), pl(p, s, t + 0.1)];
      poly(q, rgb([30, 28, 32]), undefined, 0.8);
    }
  }
  // Thick eave edge.
  line([pl(p, 0, 0), pl(p, 1, 0)], rgb(base, k * 0.45), 1.6);
};

/** Chimney stack on the roof. Returns its top (for the smoke). */
const chimney = (h: House, zr: number): V3 | null => {
  if (!h.chimney) return null;
  const [cx, cy] = h.chimney;
  const s = 0.28;
  const top = zr + 8;
  const fY = faceY(cx - s, cx + s, cy + s);
  const fX = faceX(cx + s, cy - s, cy + s);
  poly(fquad(fY, 0, s * 2, h.h, top), rgb(PLINTH, 0.8));
  poly(fquad(fX, 0, s * 2, h.h, top), rgb(PLINTH, 0.6));
  wpoly(
    [
      [cx - s, cy - s, top],
      [cx + s, cy - s, top],
      [cx + s, cy + s, top],
      [cx - s, cy + s, top],
    ],
    rgb([40, 34, 32]),
  );
  return [cx, cy, top];
};

export const drawHouse = (h: House, f: number): V3 | null => {
  const {x0, x1, y0, y1} = h;
  const seed = h.id.length * 7 + Math.round(x0 * 13 + y0 * 5);
  const fy = faceY(x0, x1, y1);
  const fx = faceX(x1, y0, y1);
  const zr = h.h + h.roofH;
  const ov = 0.28;
  framing(fy, h.h, h.id + 'y', h.ridge === 'y' ? {apex: zr} : undefined);
  framing(fx, h.h, h.id + 'x', h.ridge === 'x' ? {apex: zr} : undefined);
  for (const w of h.wins) drawWindow(wallFace(h, w.side), w, f, h.id + w.u + w.side);
  for (const d of h.doors) drawDoor(wallFace(h, d.side), d, f, h.id + 'door');

  let back: Plane;
  let front: Plane;
  let gable: Pt[];
  let gFace: Face;
  if (h.ridge === 'x') {
    const ym = (y0 + y1) / 2;
    const slope = h.roofH / ((y1 - y0) / 2);
    const ze = h.h - slope * ov;
    back = [
      [x1 + ov, y0 - ov, ze],
      [x0 - ov, y0 - ov, ze],
      [x0 - ov, ym, zr],
      [x1 + ov, ym, zr],
    ];
    front = [
      [x0 - ov, y1 + ov, ze],
      [x1 + ov, y1 + ov, ze],
      [x1 + ov, ym, zr],
      [x0 - ov, ym, zr],
    ];
    gFace = fx;
    gable = [fp(fx, 0, h.h), fp(fx, fx.len, h.h), fp(fx, fx.len / 2, zr)];
  } else {
    const xm = (x0 + x1) / 2;
    const slope = h.roofH / ((x1 - x0) / 2);
    const ze = h.h - slope * ov;
    back = [
      [x0 - ov, y0 - ov, ze],
      [x0 - ov, y1 + ov, ze],
      [xm, y1 + ov, zr],
      [xm, y0 - ov, zr],
    ];
    front = [
      [x1 + ov, y1 + ov, ze],
      [x1 + ov, y0 - ov, ze],
      [xm, y0 - ov, zr],
      [xm, y1 + ov, zr],
    ];
    gFace = fy;
    gable = [fp(fy, 0, h.h), fp(fy, fy.len, h.h), fp(fy, fy.len / 2, zr)];
  }
  poly(gable, rgb(h.plaster ?? PLASTER, gFace.k * 0.85));
  line([gable[0], gable[2], gable[1]], rgb(TIMBER, gFace.k), 1.2);
  line([fp(gFace, gFace.len / 2, h.h), fp(gFace, gFace.len / 2, zr - 1)], rgb(TIMBER, gFace.k), 1.1);
  line([fp(gFace, gFace.len * 0.25, h.h + h.roofH * 0.5), fp(gFace, gFace.len * 0.75, h.h + h.roofH * 0.5)], rgb(TIMBER, gFace.k), 1);
  roofPlane(h, back, 0.5, seed);
  const top = chimney(h, zr);
  roofPlane(h, front, h.ridge === 'x' ? 0.95 : 0.74, seed + 1);
  // Ridge cap, with a thin cold rim from the moon.
  const r0 = front[3];
  const r1 = front[2];
  line([P(r0[0], r0[1], r0[2]), P(r1[0], r1[1], r1[2])], rgb(h.roof === 'thatch' ? [90, 70, 44] : [52, 54, 64]), 1.8, 'rgba(110,120,160,0.14)');
  return top;
};
