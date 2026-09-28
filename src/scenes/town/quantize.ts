// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The retro look: every pixel is snapped to a small indexed palette through a
// 4x4 ordered (Bayer) dither, like an old 256-colour game running in the
// dark. The palette is a handful of ramps from near black to a muted
// highlight, so gradients break into crisp dither bands instead of banding.

import type {RGB} from './paint';

const RAMPS: {c: RGB; hi?: RGB; n: number}[] = [
  {c: [150, 142, 136], n: 9}, // stone grey
  {c: [128, 92, 64], n: 8}, // wood / dirt
  {c: [206, 190, 158], hi: [236, 226, 200], n: 8}, // plaster / bone
  {c: [164, 132, 78], n: 7}, // thatch / straw
  {c: [98, 100, 70], n: 7}, // dead grass
  {c: [96, 78, 112], n: 7}, // dusk purple
  {c: [70, 84, 122], n: 7}, // night blue
  {c: [236, 130, 52], hi: [255, 214, 140], n: 8}, // ember / firelight
  {c: [196, 34, 26], hi: [255, 96, 60], n: 8}, // blood red
  {c: [201, 164, 92], hi: [245, 220, 150], n: 6}, // tarnished gold / warm window
];

const buildPalette = () => {
  const out: RGB[] = [[4, 3, 4]];
  for (const r of RAMPS) {
    for (let i = 1; i <= r.n; i++) {
      const t = i / r.n;
      // Dark half ramps up from soot, the last steps lean toward the highlight.
      const k = Math.pow(t, 1.35);
      let c: RGB = [r.c[0] * k, r.c[1] * k, r.c[2] * k];
      if (r.hi && t > 0.75) {
        const u = (t - 0.75) / 0.25;
        c = [c[0] + (r.hi[0] - c[0]) * u, c[1] + (r.hi[1] - c[1]) * u, c[2] + (r.hi[2] - c[2]) * u];
      }
      out.push([Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]);
    }
  }
  return out;
};

let LUT: Uint32Array | null = null;

/** 32x32x32 cube -> packed ABGR palette colour. */
const buildLut = () => {
  const pal = buildPalette();
  const lut = new Uint32Array(32768);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const R = r * 8 + 4;
        const G = g * 8 + 4;
        const B = b * 8 + 4;
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < pal.length; i++) {
          const p = pal[i];
          const dr = R - p[0];
          const dg = G - p[1];
          const db = B - p[2];
          // Perceptual-ish weights, blue counted a little more than luma alone
          // would so the cool shadows keep their hue.
          const d = dr * dr * 0.3 + dg * dg * 0.45 + db * db * 0.25;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        const p = pal[best];
        lut[(r << 10) | (g << 5) | b] = (255 << 24) | (p[2] << 16) | (p[1] << 8) | p[0];
      }
    }
  }
  return lut;
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

/** Quantize an RGBA buffer in place. `amp` is the dither spread in 0..255. */
export const quantize = (img: ImageData, amp = 22) => {
  if (!LUT) LUT = buildLut();
  const lut = LUT;
  const d = img.data;
  const out = new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);
  const w = img.width;
  const h = img.height;
  const off = new Float32Array(16);
  for (let i = 0; i < 16; i++) off[i] = BAYER[i] * amp;
  for (let y = 0; y < h; y++) {
    const row = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const j = i << 2;
      const o = off[row | (x & 3)];
      let r = d[j] + o;
      let g = d[j + 1] + o;
      let b = d[j + 2] + o;
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;
      out[i] = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
    }
  }
};
