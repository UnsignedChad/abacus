// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The dusk sky, painted on one canvas: gradient from night blue to an ember
// horizon, the afterglow of the set sun with faint crepuscular rays, the first
// stars, a pale rising moon and thin cloud bands lit from below.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {progress, rand} from '../../lib/fx';
import {palette} from '../../theme';
import {DUR, camX, zoomAt} from './camera';
import {PaintLayer, fbm, lerp, rgba} from './util';

export const SUN = {x: 560, y: 720};
export const MOON = {x: 1545, r: 30};
export const HORIZON = 660;

/** How much daylight is left: slowly failing across the scene. */
export const lightAt = (f: number) => 1 - 0.22 * progress(f, 0, DUR);
export const moonY = (f: number) => lerp(318, 276, progress(f, 0, DUR));

const skyGradient = (ctx: CanvasRenderingContext2D) => {
  const g = ctx.createLinearGradient(0, 120, 0, 760);
  g.addColorStop(0.0, '#070a18');
  g.addColorStop(0.18, palette.night);
  g.addColorStop(0.36, '#1d1838');
  g.addColorStop(0.52, palette.dusk);
  g.addColorStop(0.64, '#5e2842');
  g.addColorStop(0.74, '#9a3c3a');
  g.addColorStop(0.83, '#d0623a');
  g.addColorStop(0.9, palette.duskOrange);
  g.addColorStop(1.0, '#f39a52');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);
};

const sunGlow = (ctx: CanvasRenderingContext2D, light: number) => {
  // Wide warm afterglow on the left, where the sun went down.
  const g = ctx.createRadialGradient(SUN.x, SUN.y, 0, SUN.x, SUN.y, 900);
  g.addColorStop(0, `rgba(255,214,140,${0.85 * light})`);
  g.addColorStop(0.12, `rgba(255,160,80,${0.55 * light})`);
  g.addColorStop(0.35, `rgba(230,100,60,${0.25 * light})`);
  g.addColorStop(1, 'rgba(120,40,60,0)');
  ctx.save();
  ctx.translate(SUN.x, SUN.y);
  ctx.scale(1.6, 0.62);
  ctx.translate(-SUN.x, -SUN.y);
  ctx.fillStyle = g;
  ctx.fillRect(-2000, -1000, 6000, 3000);
  ctx.restore();
  // Cooler right side of the horizon so the town's red glow can read.
  const c = ctx.createLinearGradient(900, 0, 1920, 0);
  c.addColorStop(0, 'rgba(40,20,60,0)');
  c.addColorStop(1, 'rgba(40,20,70,0.42)');
  ctx.fillStyle = c;
  ctx.fillRect(900, 0, 1020, 1080);
};

const rays = (ctx: CanvasRenderingContext2D, f: number, light: number) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const s = `ray${i}`;
    const a0 = lerp(-2.75, -0.45, (i + rand(s, 0.1, 0.9)) / n);
    const width = rand(s + 'w', 0.025, 0.07);
    const len = rand(s + 'l', 700, 1250);
    const k = 0.5 + 0.5 * noise2D(s, f * 0.012, 0);
    const alpha = 0.075 * k * light;
    const g = ctx.createRadialGradient(SUN.x, SUN.y, 60, SUN.x, SUN.y, len);
    g.addColorStop(0, `rgba(255,190,120,${alpha})`);
    g.addColorStop(0.5, `rgba(255,140,90,${alpha * 0.5})`);
    g.addColorStop(1, 'rgba(255,120,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(SUN.x, SUN.y);
    ctx.lineTo(SUN.x + Math.cos(a0 - width) * len, SUN.y + Math.sin(a0 - width) * len);
    ctx.lineTo(SUN.x + Math.cos(a0 + width) * len, SUN.y + Math.sin(a0 + width) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const stars = (ctx: CanvasRenderingContext2D, f: number) => {
  const reveal = 0.45 + 0.55 * progress(f, 0, DUR);
  const shift = -camX(f) * 0.008;
  for (let i = 0; i < 260; i++) {
    const s = `star${i}`;
    const x = ((rand(s + 'x', -50, 2000) + shift + 2050) % 2050) - 50;
    // Denser near the zenith.
    const y = 130 + Math.pow(rand(s + 'y'), 1.7) * 420;
    const fade = Math.max(0, 1 - (y - 150) / 380);
    // Stars "appear" at staggered brightness thresholds as the light fails.
    const mag = rand(s + 'm');
    const vis = Math.max(0, Math.min(1, (reveal - mag * 0.7) * 3));
    const tw = 0.65 + 0.35 * noise2D(s, f * 0.09, i);
    const a = vis * fade * tw * (0.35 + 0.65 * (1 - mag));
    if (a < 0.02) continue;
    const r = 0.5 + (1 - mag) * 1.1;
    ctx.fillStyle = `rgba(225,230,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (mag < 0.08) {
      // A few bright ones with a soft halo.
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, `rgba(210,220,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(210,220,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 9, y - 9, 18, 18);
    }
  }
};

const moon = (ctx: CanvasRenderingContext2D, f: number) => {
  const x = MOON.x - camX(f) * 0.02;
  const y = moonY(f);
  const r = MOON.r;
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 7);
  halo.addColorStop(0, 'rgba(190,205,230,0.28)');
  halo.addColorStop(0.25, 'rgba(160,175,215,0.1)');
  halo.addColorStop(1, 'rgba(120,130,190,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const disk = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  disk.addColorStop(0, '#eef1f4');
  disk.addColorStop(0.7, '#cdd6e2');
  disk.addColorStop(1, '#a7b2c6');
  ctx.fillStyle = disk;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Maria.
  const maria: [number, number, number][] = [
    [-0.3, -0.2, 0.34],
    [0.2, -0.35, 0.22],
    [0.25, 0.15, 0.3],
    [-0.1, 0.4, 0.18],
  ];
  for (const [mx, my, mr] of maria) {
    const g = ctx.createRadialGradient(x + mx * r, y + my * r, 0, x + mx * r, y + my * r, mr * r);
    g.addColorStop(0, 'rgba(120,130,150,0.35)');
    g.addColorStop(1, 'rgba(120,130,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // The dusk haze tints the lower limb.
  const tint = ctx.createLinearGradient(0, y - r, 0, y + r);
  tint.addColorStop(0, 'rgba(255,220,200,0)');
  tint.addColorStop(1, 'rgba(230,160,150,0.25)');
  ctx.fillStyle = tint;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
};

type Band = {y: number; x: number; len: number; th: number; par: number; seed: string; a: number};

const BANDS: Band[] = [
  {y: 232, x: 200, len: 1100, th: 14, par: 0.04, seed: 'c0', a: 0.4},
  {y: 300, x: 1000, len: 1300, th: 20, par: 0.05, seed: 'c1', a: 0.5},
  {y: 356, x: -300, len: 1500, th: 26, par: 0.06, seed: 'c2', a: 0.65},
  {y: 418, x: 1150, len: 1100, th: 18, par: 0.065, seed: 'c3', a: 0.6},
  {y: 470, x: 150, len: 1600, th: 30, par: 0.075, seed: 'c4', a: 0.8},
  {y: 528, x: 1200, len: 1000, th: 16, par: 0.08, seed: 'c5', a: 0.75},
  {y: 560, x: -250, len: 1100, th: 14, par: 0.085, seed: 'c6', a: 0.8},
  {y: 598, x: 700, len: 900, th: 10, par: 0.09, seed: 'c7', a: 0.8},
];

const clouds = (ctx: CanvasRenderingContext2D, f: number, light: number) => {
  for (const b of BANDS) {
    const x0 = b.x - camX(f) * b.par - f * 0.3;
    const steps = 64;
    const top: [number, number][] = [];
    const bot: [number, number][] = [];
    const soft: [number, number][] = [];
    const softB: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = x0 + u * b.len;
      const taper = Math.pow(Math.sin(Math.PI * u), 0.5);
      // Squared noise breaks the band into wisps with thin gaps between.
      const n = 0.5 + 0.5 * fbm(b.seed, u * 4 + f * 0.0025, 0, 3);
      const thick = b.th * taper * (0.1 + 1.5 * n * n);
      const cy = b.y + fbm(b.seed + 'y', u * 1.3, 1, 2) * 12;
      top.push([x, cy - thick * 0.7]);
      bot.push([x, cy + thick * 0.3]);
      // A broader, smoother body the crisp wisps sit in.
      const body = b.th * taper * (0.7 + 1.3 * n);
      soft.push([x, cy - body * 1.1]);
      softB.push([x, cy + body * 0.45]);
    }
    // Lit from below: warm near the sun, rose then violet further away.
    const d = Math.min(1, Math.abs(x0 + b.len / 2 - SUN.x) / 1300);
    const hl = Math.max(0, 1 - (b.y - 230) / 380);
    const warm = `rgba(${Math.round(lerp(255, 205, d))},${Math.round(lerp(150, 80, d))},${Math.round(
      lerp(90, 120, d),
    )},`;
    const g = ctx.createLinearGradient(0, b.y - b.th, 0, b.y + b.th * 0.35);
    g.addColorStop(0, `rgba(34,22,${Math.round(lerp(48, 62, hl))},${b.a * 0.7})`);
    g.addColorStop(0.55, `rgba(80,36,66,${b.a * 0.6})`);
    g.addColorStop(1, warm + `${Math.min(1, b.a * 1.2) * light * (1 - hl * 0.45)})`);
    // Soft body: blurred, dim, cool on top and warm underneath.
    const gs = ctx.createLinearGradient(0, b.y - b.th * 1.4, 0, b.y + b.th * 0.6);
    gs.addColorStop(0, `rgba(40,26,58,${b.a * 0.4})`);
    gs.addColorStop(0.7, `rgba(110,48,72,${b.a * 0.4})`);
    gs.addColorStop(1, warm + `${b.a * 0.5 * light * (1 - hl * 0.5)})`);
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = gs;
    ctx.beginPath();
    soft.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = softB.length - 1; i >= 0; i--) ctx.lineTo(softB[i][0], softB[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = g;
    ctx.beginPath();
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    ctx.fill();
  }
};

export const Sky: React.FC = () => {
  const f = useCurrentFrame();
  const light = lightAt(f);
  const z = zoomAt(f);
  const style = {transformOrigin: '1000px 640px', transform: `scale(${1 + (z - 1) * 0.2})`};
  return (
    <>
      <PaintLayer
        res={0.5}
        style={style}
        paint={(ctx) => {
          skyGradient(ctx);
          sunGlow(ctx, light);
          // Late dusk: the whole sky slowly sinks toward night.
          ctx.fillStyle = rgba(palette.night, (0.22 * (1 - light)) / 0.22);
          ctx.fillRect(0, 0, 1920, 1080);
        }}
      />
      <PaintLayer
        style={style}
        paint={(ctx) => {
          stars(ctx, f);
          moon(ctx, f);
        }}
      />
      <PaintLayer
        res={0.5}
        style={style}
        paint={(ctx) => {
          clouds(ctx, f, light);
          rays(ctx, f, light);
        }}
      />
    </>
  );
};
