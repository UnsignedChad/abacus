// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Static procedural textures: the desk's wood and the letter's parchment.
// They never change over time, so each canvas is painted once per mount.
// All randomness is seeded, so every mount paints identical pixels.

import React, {useLayoutEffect, useRef} from 'react';
import {random} from 'remotion';
import {noise2D} from '@remotion/noise';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** A canvas painted once at `scale` x its CSS size. */
export const TextureCanvas: React.FC<{
  width: number;
  height: number;
  scale: number;
  draw: Draw;
  style?: React.CSSProperties;
}> = ({width, height, scale, draw, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(scale, scale);
    draw(ctx, width, height);
  }, [width, height, scale, draw]);
  return (
    <canvas
      ref={ref}
      width={Math.round(width * scale)}
      height={Math.round(height * scale)}
      style={{position: 'absolute', left: 0, top: 0, width, height, ...style}}
    />
  );
};

const r = (seed: string, min = 0, max = 1) => min + random(seed) * (max - min);

// ---------------------------------------------------------------- wood

const PLANK = 340;

/** Dark walnut planks with warped grain, seams, wear and a few scratches. */
export const drawWood: Draw = (ctx, w, h) => {
  const sc = 0.5; // per-pixel pass runs at half res; scaled up by drawImage
  const cw = Math.round(w * sc);
  const ch = Math.round(h * sc);
  const img = ctx.createImageData(cw, ch);
  const d = img.data;
  for (let y = 0; y < ch; y++) {
    const wy = y / sc;
    const plank = Math.floor((wy + 60) / PLANK);
    const ly = wy + 60 - plank * PLANK; // 0..PLANK within plank
    const tone = r('plank' + plank, 0.78, 1.12);
    const off = plank * 173.3;
    for (let x = 0; x < cw; x++) {
      const wx = x / sc;
      // Gentle long waves: quarter-sawn boards, not marble.
      const warp =
        noise2D('wood', wx * 0.0007 + off, wy * 0.004) * 16 +
        noise2D('wood', wx * 0.003 + off, wy * 0.02 + 50) * 3;
      const v = wy + warp;
      // Growth lines as thin dark bands, plus a fine streaky fibre.
      const ring = Math.pow(Math.abs(Math.sin(v * 0.11 + off)), 14);
      const ring2 = Math.pow(Math.abs(Math.sin(v * 0.037 + off * 2)), 4);
      const fibre = noise2D('wood', wx * 0.0022 + off, v * 0.35) * 0.5 + 0.5;
      const wear = noise2D('wood', wx * 0.0006 + off, wy * 0.0009 + 90) * 0.5 + 0.5;
      const fine = noise2D('wood', wx * 0.01 + off, v * 0.9) * 0.5 + 0.5;
      let k = tone * (0.72 + fibre * 0.26 + fine * 0.1 - ring * 0.3 - ring2 * 0.12 + wear * 0.2);
      // Seam: a dark gap with a bevelled lip.
      const seam = Math.min(ly, PLANK - ly);
      if (seam < 7) k *= 0.18 + (seam / 7) * 0.5;
      else if (seam < 16) k *= 0.85 + (seam - 7) * 0.016;
      const i = (y * cw + x) * 4;
      d[i] = Math.min(255, 86 * k);
      d[i + 1] = Math.min(255, 52 * k);
      d[i + 2] = Math.min(255, 30 * k);
      d[i + 3] = 255;
    }
  }
  const tmp = document.createElement('canvas');
  tmp.width = cw;
  tmp.height = ch;
  tmp.getContext('2d')?.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, w, h);

  // Scratches and nicks: thin pale strokes that catch the candle.
  for (let i = 0; i < 70; i++) {
    const s = 'scr' + i;
    const x = r(s + 'x', 0, w);
    const y = r(s + 'y', 0, h);
    const len = r(s + 'l', 20, 160);
    const a = r(s + 'a', -0.5, 0.5);
    ctx.strokeStyle = `rgba(190,140,90,${r(s + 'o', 0.05, 0.14)})`;
    ctx.lineWidth = r(s + 'w', 0.6, 1.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len * 0.5, y + len * a * 0.2 + 3, x + len * Math.cos(a), y + len * Math.sin(a));
    ctx.stroke();
  }
  // Old ink spatters and wax drops, fixed near the working area.
  for (let i = 0; i < 16; i++) {
    const s = 'spat' + i;
    ctx.fillStyle = `rgba(12,6,4,${r(s + 'o', 0.35, 0.7)})`;
    ctx.beginPath();
    ctx.arc(r(s + 'x', 2150, 2650), r(s + 'y', 700, 1000), r(s + 'r', 1.5, 6), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const s = 'wax' + i;
    const x = r(s + 'x', 620, 1100);
    const y = r(s + 'y', 860, 960);
    const rr = r(s + 'r', 3, 6);
    const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr);
    g.addColorStop(0, 'rgba(200,180,140,0.6)');
    g.addColorStop(1, 'rgba(150,120,80,0.4)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rr, rr * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ---------------------------------------------------------------- paper

/** Irregular outline of the sheet: soft wobble plus a few nicks. */
export const paperOutline = (w: number, h: number) => {
  const pts: [number, number][] = [];
  const step = 8;
  const edge = (t: number, side: number) => {
    const wob = noise2D('edge', t * 0.02, side * 7) * 2.6 + noise2D('edge', t * 0.11, side * 7 + 3) * 1.1;
    const nick = noise2D('nick', t * 0.05, side) > 0.72 ? 4 : 0;
    return 2.5 + wob + nick;
  };
  for (let x = 0; x <= w; x += step) pts.push([x, edge(x, 0)]);
  for (let y = 0; y <= h; y += step) pts.push([w - edge(y, 1), y]);
  for (let x = w; x >= 0; x -= step) pts.push([x, h - edge(x, 2)]);
  for (let y = h; y >= 0; y -= step) pts.push([edge(y, 3), y]);
  return pts;
};

const tracePath = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
};

const stain = (ctx: CanvasRenderingContext2D, x: number, y: number, rad: number) => {
  // A dried tide-mark: faint fill, darker irregular rim.
  const g = ctx.createRadialGradient(x, y, rad * 0.2, x, y, rad);
  g.addColorStop(0, 'rgba(150,105,45,0.05)');
  g.addColorStop(0.85, 'rgba(140,95,40,0.09)');
  g.addColorStop(0.97, 'rgba(110,70,28,0.2)');
  g.addColorStop(1, 'rgba(110,70,28,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let a = 0; a <= 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    const rr = rad * (1 + noise2D('stain', Math.cos(t) * 1.3 + x * 0.01, Math.sin(t) * 1.3 + y * 0.01) * 0.12);
    const px = x + Math.cos(t) * rr;
    const py = y + Math.sin(t) * rr;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.fill();
};

/** Aged parchment: mottled tone, fibres, stains, burnished edges, fold creases. */
export const drawPaper: Draw = (ctx, w, h) => {
  const pts = paperOutline(w, h);
  ctx.save();
  tracePath(ctx, pts);
  ctx.clip();

  const base = ctx.createRadialGradient(w * 0.42, h * 0.4, 50, w * 0.5, h * 0.5, w * 0.85);
  base.addColorStop(0, '#ece0c2');
  base.addColorStop(0.6, '#ddcaa0');
  base.addColorStop(1, '#bf9f6a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Mottling: many faint blotches, dark and light.
  for (let i = 0; i < 260; i++) {
    const s = 'mot' + i;
    const x = r(s + 'x', -50, w + 50);
    const y = r(s + 'y', -50, h + 50);
    const rad = r(s + 'r', 15, 150);
    const dark = random(s + 'd') > 0.35;
    const a = r(s + 'a', 0.02, dark ? 0.07 : 0.06);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, dark ? `rgba(130,85,35,${a})` : `rgba(255,248,222,${a})`);
    g.addColorStop(1, dark ? 'rgba(130,85,35,0)' : 'rgba(255,248,222,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Fibres.
  for (let i = 0; i < 3200; i++) {
    const s = 'fib' + i;
    const x = r(s + 'x', 0, w);
    const y = r(s + 'y', 0, h);
    const len = r(s + 'l', 4, 26);
    const a = r(s + 'a', -0.6, 0.6) + (random(s + 'v') > 0.8 ? Math.PI / 2 : 0);
    const dark = random(s + 'd') > 0.45;
    ctx.strokeStyle = dark ? `rgba(110,75,35,${r(s + 'o', 0.05, 0.13)})` : `rgba(255,250,230,${r(s + 'o', 0.06, 0.16)})`;
    ctx.lineWidth = r(s + 'w', 0.35, 0.9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a) * len * 0.5 + r(s + 'c', -3, 3),
      y + Math.sin(a) * len * 0.5 + r(s + 'e', -3, 3),
      x + Math.cos(a) * len,
      y + Math.sin(a) * len,
    );
    ctx.stroke();
  }
  // Specks.
  for (let i = 0; i < 260; i++) {
    const s = 'spk' + i;
    ctx.fillStyle = `rgba(80,50,25,${r(s + 'o', 0.1, 0.35)})`;
    ctx.beginPath();
    ctx.arc(r(s + 'x', 0, w), r(s + 'y', 0, h), r(s + 'r', 0.4, 1.6), 0, Math.PI * 2);
    ctx.fill();
  }

  // Tide-mark stains, kept clear of the text block.
  stain(ctx, 150, 940, 105);
  stain(ctx, 860, 30, 140);
  stain(ctx, 700, 960, 60);
  stain(ctx, 40, 520, 70);

  // Fold creases: letter folded in thirds, then once across.
  const crease = (y: number) => {
    const band = ctx.createLinearGradient(0, y - 60, 0, y + 60);
    band.addColorStop(0, 'rgba(90,60,25,0)');
    band.addColorStop(0.48, 'rgba(90,60,25,0.07)');
    band.addColorStop(0.5, 'rgba(255,250,230,0.1)');
    band.addColorStop(0.56, 'rgba(255,250,230,0.03)');
    band.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 60, w, 120);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const yy = y + noise2D('crease', x * 0.01, y) * 1.4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = 'rgba(95,62,28,0.32)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.translate(0, 1.6);
    ctx.strokeStyle = 'rgba(255,248,225,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.translate(0, -1.6);
  };
  crease(h / 3);
  crease((h * 2) / 3);
  // Faint vertical fold.
  const vb = ctx.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0);
  vb.addColorStop(0, 'rgba(90,60,25,0)');
  vb.addColorStop(0.5, 'rgba(90,60,25,0.06)');
  vb.addColorStop(1, 'rgba(90,60,25,0)');
  ctx.fillStyle = vb;
  ctx.fillRect(w / 2 - 40, 0, 80, h);

  // Burnished, darkened edges.
  const edgeStrokes: [number, number][] = [
    [90, 0.035],
    [56, 0.05],
    [34, 0.07],
    [18, 0.1],
    [8, 0.16],
    [3, 0.3],
  ];
  for (const [lw, a] of edgeStrokes) {
    tracePath(ctx, pts);
    ctx.strokeStyle = `rgba(95,55,20,${a})`;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  // Curl: right edge turns slightly away from the light.
  const curl = ctx.createLinearGradient(w - 70, 0, w, 0);
  curl.addColorStop(0, 'rgba(40,20,5,0)');
  curl.addColorStop(1, 'rgba(40,20,5,0.18)');
  ctx.fillStyle = curl;
  ctx.fillRect(w - 70, 0, 70, h);
  const lip = ctx.createLinearGradient(0, 0, 60, 0);
  lip.addColorStop(0, 'rgba(255,245,215,0.12)');
  lip.addColorStop(1, 'rgba(255,245,215,0)');
  ctx.fillStyle = lip;
  ctx.fillRect(0, 0, 60, h);
  ctx.restore();
};
