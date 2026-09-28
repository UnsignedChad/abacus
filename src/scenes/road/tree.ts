// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// A gnarled dead tree: a deterministic branch skeleton, posed each frame with
// a little wind sway that grows toward the thin twigs.

import {noise2D} from '@remotion/noise';
import {rand} from '../../lib/fx';
import {cues} from '../../theme';

type Node = {
  rel: number; // angle relative to parent (radians)
  len: number;
  w0: number;
  w1: number;
  depth: number;
  seed: string;
  kids: Node[];
};

export const TREE = {x: 660, y: 808, par: 0.92};

const grow = (seed: string, depth: number, len: number, w: number, rel: number): Node => {
  // Each limb is a chain of kinked sub-segments: that's what makes it gnarled.
  const kinks = depth === 0 ? 4 : 3;
  const w1 = w * (depth === 0 ? 0.55 : 0.62);
  let head: Node | null = null;
  let tail: Node | null = null;
  for (let k = 0; k < kinks; k++) {
    const s = `${seed}k${k}`;
    const n: Node = {
      rel: k === 0 ? rel : rand(s, -0.32, 0.32),
      len: len / kinks,
      w0: w + (w1 - w) * (k / kinks),
      w1: w + (w1 - w) * ((k + 1) / kinks),
      depth,
      seed: s,
      kids: [],
    };
    if (!head) head = n;
    if (tail) tail.kids.push(n);
    tail = n;
  }
  if (depth < 5 && tail) {
    const count = depth === 0 ? 3 : rand(seed + 'n') < 0.35 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const s = `${seed}c${i}`;
      const spread = depth === 0 ? 0.75 : 0.62;
      const a = (i - (count - 1) / 2) * spread + rand(s + 'a', -0.25, 0.25);
      const l = len * rand(s + 'l', 0.58, 0.8) * (depth === 0 ? 0.7 : 1);
      tail.kids.push(grow(s, depth + 1, l, w1 * rand(s + 'w', 0.55, 0.78), a));
    }
  }
  return head as Node;
};

const ROOT = grow('deadtree', 0, 250, 40, -0.08);

export type Seg = {x0: number; y0: number; x1: number; y1: number; w0: number; w1: number; depth: number};

// The crows kicking off from the branches make them recoil and shiver.
const recoil = (f: number, seed: string) => {
  const t = f - cues.road.crowCaw;
  if (t < 0 || t > 60) return 0;
  return Math.exp(-t / 14) * Math.sin(t * 0.7 + rand(seed + 'rc', 0, 6)) * 0.035;
};

export const poseTree = (f: number) => {
  const segs: Seg[] = [];
  const tips: {x: number; y: number; a: number}[] = [];
  const walk = (n: Node, x: number, y: number, parentA: number) => {
    const sway =
      (noise2D(n.seed, f * 0.02, 0) * 0.012 + noise2D('gust', f * 0.012, 0) * 0.01) * (n.depth + 0.3) * (n.depth + 0.3);
    const a = parentA + n.rel + sway + (n.depth >= 2 ? recoil(f, n.seed) * (n.depth - 1) : 0);
    const x1 = x + Math.cos(a) * n.len;
    const y1 = y + Math.sin(a) * n.len;
    segs.push({x0: x, y0: y, x1, y1, w0: n.w0, w1: n.w1, depth: n.depth});
    if (n.kids.length === 0) tips.push({x: x1, y: y1, a});
    for (const k of n.kids) walk(k, x1, y1, a);
  };
  walk(ROOT, 0, 0, -Math.PI / 2);
  return {segs, tips};
};

/** One path of tapered quads with round joints. Coordinates relative to the root. */
export const treePath = (segs: Seg[]) => {
  let d = '';
  for (const s of segs) {
    const dx = s.x1 - s.x0;
    const dy = s.y1 - s.y0;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const a = s.w0 / 2;
    const b = s.w1 / 2;
    d += `M${(s.x0 + nx * a).toFixed(1)},${(s.y0 + ny * a).toFixed(1)} L${(s.x1 + nx * b).toFixed(1)},${(
      s.y1 +
      ny * b
    ).toFixed(1)} L${(s.x1 - nx * b).toFixed(1)},${(s.y1 - ny * b).toFixed(1)} L${(s.x0 - nx * a).toFixed(1)},${(
      s.y0 -
      ny * a
    ).toFixed(1)} Z `;
    if (b > 1.2) {
      d += `M${(s.x1 - b).toFixed(1)},${s.y1.toFixed(1)} a${b.toFixed(1)},${b.toFixed(1)} 0 1,0 ${(2 * b).toFixed(
        1,
      )},0 a${b.toFixed(1)},${b.toFixed(1)} 0 1,0 ${(-2 * b).toFixed(1)},0 `;
    }
  }
  return d;
};
