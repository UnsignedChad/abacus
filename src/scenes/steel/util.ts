// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Small drawing helpers for the steel scene: smooth paths through control
// points, fractal noise, colour mixing and rim lighting.

import {random} from 'remotion';
import {noise2D} from '@remotion/noise';

export type P = [number, number];

export const W = 1920;
export const H = 1080;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/** Fractal noise in roughly [-1, 1]. */
export const fbm = (seed: string, x: number, y = 0, oct = 3) => {
  let a = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    a += noise2D(seed + i, x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return a / norm;
};

/** `rgba()` from a `#rrggbb` hex and an alpha. */
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
};

/**
 * Trace a Catmull-Rom spline through `pts` as cubic beziers. Open paths start
 * with moveTo; pass `cont` to continue an existing subpath instead.
 */
export const spline = (
  ctx: CanvasRenderingContext2D | Path2D,
  pts: P[],
  closed = false,
  cont = false,
  tension = 0.5,
) => {
  const n = pts.length;
  if (n < 2) return;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  if (!cont) ctx.moveTo(pts[0][0], pts[0][1]);
  else ctx.lineTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  const k = tension / 3;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) * k,
      p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k,
      p2[1] - (p3[1] - p1[1]) * k,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
};

// Local-space bounding boxes of shapes, so rim lighting can work on a small
// buffer instead of the whole frame.
type Box = [number, number, number, number];
const bounds = new WeakMap<Path2D, Box>();
export const withBounds = (p: Path2D, b: Box) => {
  bounds.set(p, b);
  return p;
};
const boxOf = (pts: P[]): Box => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  // Splines can bulge a little past their control points.
  const pad = 0.08 * Math.max(x1 - x0, y1 - y0) + 4;
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
};

/** A closed smooth shape as a Path2D. */
export const blob = (pts: P[], tension = 0.5) => {
  const p = new Path2D();
  spline(p, pts, true, false, tension);
  return withBounds(p, boxOf(pts));
};

/** Offset each point by wind noise, weighted per point (0 = pinned). */
export const flutter = (pts: P[], seed: string, t: number, amp: number, weights?: number[]): P[] =>
  pts.map(([x, y], i) => {
    const w = weights ? weights[i] : 1;
    if (!w) return [x, y];
    return [
      x + fbm(seed + 'x' + i, t, i * 0.37) * amp * w,
      y + fbm(seed + 'y' + i, t, i * 0.37 + 9) * amp * w * 0.6,
    ];
  });

// Scratch canvases, shared by all painters (painting is synchronous).
const scratch: Record<string, HTMLCanvasElement> = {};
export const buf = (key: string, w = W, h = H) => {
  let c = scratch[key];
  if (!c) {
    c = document.createElement('canvas');
    scratch[key] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.clearRect(0, 0, w, h);
  return {c, ctx};
};

/**
 * Rim light: the shape filled with `color`, minus a blurred copy of itself
 * pushed away from the light by (dx, dy). Leaves a soft crescent on the
 * lit edge, composited onto `ctx` with the current transform.
 */
export const rim = (
  ctx: CanvasRenderingContext2D,
  shape: Path2D,
  dx: number,
  dy: number,
  color: string,
  opts: {blur?: number; alpha?: number; op?: GlobalCompositeOperation; clip?: Path2D; key?: string} = {},
) => {
  const {blur = 3, alpha = 1, op = 'lighter', clip, key = 'rim'} = opts;
  if (alpha <= 0.002) return;
  const m = ctx.getTransform();
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  // Device-space box of the shape (padded for the blur), clamped to canvas.
  let bx = 0;
  let by = 0;
  let bw = cw;
  let bh = ch;
  const b = bounds.get(shape);
  if (b) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of [
      [b[0], b[1]],
      [b[2], b[1]],
      [b[0], b[3]],
      [b[2], b[3]],
    ]) {
      const px = m.a * x + m.c * y + m.e;
      const py = m.b * x + m.d * y + m.f;
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, px);
      y1 = Math.max(y1, py);
    }
    const pad = 4;
    bx = Math.max(0, Math.floor(x0 - pad));
    by = Math.max(0, Math.floor(y0 - pad));
    bw = Math.min(cw, Math.ceil(x1 + pad)) - bx;
    bh = Math.min(ch, Math.ceil(y1 + pad)) - by;
    if (bw <= 0 || bh <= 0) return;
  }
  // Big shapes are lit at half resolution: the rim is soft there anyway.
  const k = bw * bh > 300000 ? 0.5 : 1;
  const sw = Math.ceil(bw * k);
  const sh = Math.ceil(bh * k);
  const {c, ctx: r} = region(key, cw, ch, sw, sh);
  const base = [m.a * k, m.b * k, m.c * k, m.d * k, (m.e - bx) * k, (m.f - by) * k] as const;
  r.setTransform(...base);
  r.fillStyle = color;
  r.fill(shape);
  // Cut the offset copy away through its blurred shadow: the shape itself
  // is drawn far off-buffer and only the shadow lands (cheaper than filter).
  const OFF = 20000;
  r.globalCompositeOperation = 'destination-out';
  r.setTransform(base[0], base[1], base[2], base[3], base[4] - OFF, base[5]);
  r.translate(dx, dy);
  r.shadowColor = '#000';
  r.shadowBlur = blur * 2 * k;
  r.shadowOffsetX = OFF;
  r.fillStyle = '#000';
  r.fill(shape);
  r.shadowColor = 'transparent';
  r.shadowBlur = 0;
  r.shadowOffsetX = 0;
  r.setTransform(...base);
  if (clip) {
    r.globalCompositeOperation = 'destination-in';
    r.fill(clip);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.drawImage(c, 0, 0, sw, sh, bx, by, bw, bh);
  ctx.restore();
};

/** A scratch canvas of at least w x h with only its top-left bw x bh cleared. */
const region = (key: string, w: number, h: number, bw: number, bh: number) => {
  let c = scratch[key];
  if (!c) {
    c = document.createElement('canvas');
    scratch[key] = c;
  }
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.clearRect(0, 0, bw + 2, bh + 2);
  return {c, ctx};
};

/** Soft radial glow. */
export const glow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  a: number,
  sx = 1,
  sy = 1,
  rot = 0,
) => {
  if (a <= 0.001 || r <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.35, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
};

/** Deterministic tileable-ish grain texture, built once and cached. */
const textures: Record<string, HTMLCanvasElement> = {};
export const noiseTexture = (key: string, size: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  if (textures[key]) return textures[key];
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d')!);
  textures[key] = c;
  return c;
};

/** Woven-wool texture: fine speckle plus faint diagonal twill. */
export const woolTexture = () =>
  noiseTexture('wool', 256, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const x = random('wx' + i) * 256;
      const y = random('wy' + i) * 256;
      const l = random('wl' + i);
      ctx.fillStyle = l > 0.5 ? `rgba(255,240,220,${(l - 0.5) * 0.16})` : `rgba(0,0,0,${(0.5 - l) * 0.5})`;
      ctx.fillRect(x, y, 1 + random('ws' + i) * 2, 1);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    for (let i = -256; i < 512; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }
  });

/**
 * Directional motion smear: composite `src` onto `ctx` as a running average
 * of copies trailing back along (dx, dy) in device pixels. Cheap stand-in
 * for re-rendering the scene at many sub-frame times.
 */
export const smear = (ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, dx: number, dy: number) => {
  const len = Math.hypot(dx, dy);
  const n = Math.min(48, Math.max(1, Math.ceil(len / 2.2)));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (n === 1) {
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    return;
  }
  const {c, ctx: acc} = buf('smear-acc', src.width, src.height);
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    acc.globalAlpha = 1 / (k + 1);
    acc.drawImage(src, -dx * t, -dy * t);
  }
  ctx.drawImage(c, 0, 0);
  ctx.restore();
};

/**
 * A band of varying width along a polyline, as a closed smooth Path2D.
 * `widths` holds the full width at each point.
 */
export const ribbon = (pts: P[], widths: number[], tension = 0.5) => {
  const left: P[] = [];
  const right: P[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = widths[i] / 2;
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  const path = new Path2D();
  spline(path, left, false, false, tension);
  spline(path, right.reverse(), false, true, tension);
  path.closePath();
  return withBounds(path, boxOf(left.concat(right)));
};

/** Screen position of world point `p` under a camera with parallax `par`. */
export const toScreen = (cam: {x: number; y: number; s: number}, par: number, p: P): P => {
  const s = 1 + (cam.s - 1) * par;
  const cx = 960 + (cam.x - 960) * par;
  const cy = 540 + (cam.y - 540) * par;
  return [(p[0] - cx) * s + 960, (p[1] - cy) * s + 540];
};

/** Large soft value noise, for mottled worn cloth. Scale the pattern up. */
export const mottleTexture = () =>
  noiseTexture('mottle', 128, (ctx) => {
    const img = ctx.createImageData(128, 128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        // Tileable: sample noise on a torus.
        const a = (x / 128) * Math.PI * 2;
        const b = (y / 128) * Math.PI * 2;
        const v = fbm('mot', Math.cos(a) * 1.2 + Math.sin(b) * 0.7, Math.sin(a) * 1.2 + Math.cos(b) * 0.7, 4);
        const i = (y * 128 + x) * 4;
        const l = v > 0 ? 255 : 0;
        img.data[i] = l;
        img.data[i + 1] = l;
        img.data[i + 2] = l;
        img.data[i + 3] = Math.min(255, Math.abs(v) * 255 * 0.5);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
