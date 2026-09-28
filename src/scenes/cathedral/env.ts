// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Canvas painter for the ruined church. Each element lives on a plane at a
// depth; planeMatrix() maps world units to the screen for that plane, so the
// whole set parallaxes correctly under any camera move.

import {Cam, DEPTH_UNITS, H, W, planeMatrix, proj, sOf} from './camera';
import {
  BANNER,
  CANDELABRA,
  CAPITAL_Y,
  Candelabrum,
  DAIS,
  DAIS_TOP,
  FG_PILLARS,
  FG_PILLAR_D,
  GLASS,
  LANCET,
  LANCETS,
  PILLAR_D,
  PILLAR_W,
  PILLARS,
  ROSE,
  THRONE,
  WALL_D,
} from './world';
import {clamp01, flicker, mixHex, nz, nz2, rgba, rnd, rr} from './util';
import {softPass, sprite} from './Canvas';

type Ctx = CanvasRenderingContext2D;
type P = readonly [number, number];

export type EnvState = {
  f: number; // real frame
  t: number; // action time
  cam: Cam;
  moon: number; // moonlight / glass intensity
  red: number; // red flood 0..1
  candle: (c: Candelabrum, i: number) => {gain: number; out: number; smokeAge: number};
  shadows: {x: number; d: number; w: number; a: number}[];
  wave: {x: number; y: number; d: number; r: number; a: number} | null; // roar shockwave
};

// Painters work in 1920x1080 screen units; K is the layer's bitmap scale (the
// background is painted below full resolution, a soft focus behind the fighters).
let K = 1;
const setPlane = (ctx: Ctx, cam: Cam, d: number) => {
  const m = planeMatrix(cam, d);
  ctx.setTransform(K * m[0], K * m[1], K * m[2], K * m[3], K * m[4], K * m[5]);
  return m[0];
};
const screen = (ctx: Ctx) => ctx.setTransform(K, 0, 0, K, 0, 0);

/** Visible rectangle of a plane, in that plane's world units. */
const planeBounds = (cam: Cam, d: number, pad = 0) => {
  const s = sOf(cam, d);
  return {
    x0: cam.x - W / 2 / s - pad,
    x1: cam.x + W / 2 / s + pad,
    y0: cam.y - cam.hz / s - pad,
    y1: cam.y + (H - cam.hz) / s + pad,
  };
};

const poly = (ctx: Ctx, pts: readonly P[]) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
};

const hull = (pts: P[]): P[] => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: P[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};

const inConvex = (pts: readonly P[], x: number, y: number) => {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    if (c !== 0) {
      const s = Math.sign(c);
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
};

/** Pointed (equilateral) arch outline. */
const archPath = (ctx: Ctx, cx: number, base: number, spring: number, w: number, open = false) => {
  const r = w;
  if (!open) ctx.beginPath();
  ctx.moveTo(cx - w / 2, base);
  ctx.lineTo(cx - w / 2, spring);
  ctx.arc(cx + w / 2, spring, r, Math.PI, (Math.PI * 4) / 3, false);
  ctx.arc(cx - w / 2, spring, r, (Math.PI * 5) / 3, Math.PI * 2, false);
  ctx.lineTo(cx + w / 2, base);
  if (!open) ctx.closePath();
};
const archApex = (spring: number, w: number) => spring - w * 0.866;

// ---------------------------------------------------------------------------
// Light shafts. Shared with the dust pass so motes glitter inside the beams.

type Strip = {pts: P[]; from: P; to: P; color: string; a: number};
type Shaft = {pts: P[]; a: number; strips: Strip[]};

/** One beam: a window region swept down to a footprint on the floor, in strips. */
const beam = (
  S: EnvState,
  id: number,
  src: {x0: number; x1: number; y0: number; y1: number; d: number},
  land: {x: number; y: number; d0: number; d1: number; spread: number},
  colors: string[],
  alpha: number,
  n: number,
): Shaft => {
  const {cam, t} = S;
  const strips: Strip[] = [];
  const all: P[] = [];
  const cx = (src.x0 + src.x1) / 2;
  for (let k = 0; k < n; k++) {
    const a0 = src.x0 + ((src.x1 - src.x0) * k) / n;
    const a1 = src.x0 + ((src.x1 - src.x0) * (k + 1)) / n;
    const l0 = land.x + (a0 - cx) * land.spread;
    const l1 = land.x + (a1 - cx) * land.spread;
    const win: P[] = [
      proj(cam, a0, src.y0, src.d),
      proj(cam, a1, src.y0, src.d),
      proj(cam, a0, src.y1, src.d),
      proj(cam, a1, src.y1, src.d),
    ];
    const foot: P[] = [
      proj(cam, l0, land.y, land.d0),
      proj(cam, l1, land.y, land.d0),
      proj(cam, l0 * 1 + (l0 - land.x) * 0.15, land.y, land.d1),
      proj(cam, l1 * 1 + (l1 - land.x) * 0.15, land.y, land.d1),
    ];
    all.push(...win, ...foot);
    // Streaks: some strips run brighter, and all breathe as clouds cross the moon.
    const streak = 0.15 + 0.85 * Math.pow(rnd(id, k, 17), 1.5);
    const breathe = 0.65 + 0.35 * nz(t * 0.012, id * 10 + k * 1.3);
    strips.push({
      pts: hull([...win, ...foot]),
      from: proj(cam, (a0 + a1) / 2, (src.y0 + src.y1) / 2, src.d),
      to: proj(cam, (l0 + l1) / 2, land.y, (land.d0 + land.d1) / 2),
      color: colors[k % colors.length],
      a: alpha * streak * breathe * S.moon,
    });
  }
  return {pts: hull(all), a: alpha * S.moon, strips};
};

const shaftList = (S: EnvState): Shaft[] => {
  const out: Shaft[] = [];
  LANCETS.forEach((l, i) => {
    const w = LANCET.w;
    const g = GLASS[l.theme];
    const colors = l.broken
      ? ['#dfe8fa', '#b8c8e8', mixHex(g[0], '#ffffff', 0.5), '#dfe8fa']
      : [mixHex(g[0], '#ffffff', 0.35), mixHex(g[1], '#ffffff', 0.35), mixHex(g[2], '#ffffff', 0.35)];
    out.push(
      beam(
        S,
        i,
        {x0: l.x - w / 2, x1: l.x + w / 2, y0: LANCET.apex + 140, y1: LANCET.sill, d: WALL_D},
        {x: l.land, y: 0, d0: 0.9, d1: 1.42, spread: 1.25},
        colors,
        l.broken ? 0.1 : 0.075,
        l.broken ? 9 : 7,
      ),
    );
  });
  // Moonlight through the broken rose window onto the throne.
  const hx = ROSE.x - ROSE.r * 0.45;
  const hy = ROSE.y + ROSE.r * 0.35;
  const hr = ROSE.r * 0.3;
  out.push(
    beam(
      S,
      9,
      {x0: hx - hr, x1: hx + hr, y0: hy - hr, y1: hy + hr, d: ROSE.d},
      {x: THRONE.x - 110, y: DAIS_TOP, d0: 1.0, d1: 1.38, spread: 1.5},
      ['#dce6f8', '#b4c6e6', '#e8eefc'],
      0.11,
      8,
    ),
  );
  return out;
};

/** Volumetric beams, painted at low resolution so the upscale softens them. */
const paintBeams = (ctx: Ctx, S: EnvState, shafts: Shaft[]) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const sh of shafts) {
    for (const st of sh.strips) {
      const g = ctx.createLinearGradient(st.from[0], st.from[1], st.to[0], st.to[1]);
      const c = S.red > 0 ? mixHex(st.color, '#ff5a3a', S.red * 0.6) : st.color;
      g.addColorStop(0, rgba(c, st.a * 1.2));
      g.addColorStop(0.5, rgba(c, st.a * 0.7));
      g.addColorStop(1, rgba(c, st.a * 0.35));
      ctx.fillStyle = g;
      poly(ctx, st.pts);
      ctx.fill();
    }
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------
// The far wall: lancet windows with stained glass, and the rose window.

const drawGlass = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number, theme: string[], seed: number, lum: number) => {
  // Base glow, brighter toward the middle of the light.
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, mixHex(theme[0], '#000000', 0.5));
  g.addColorStop(0.5, mixHex(theme[0], '#000000', 0.12));
  g.addColorStop(1, mixHex(theme[0], '#000000', 0.5));
  ctx.fillStyle = g;
  ctx.globalAlpha = lum;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Diamond quarries, each pane its own hue and density.
  const dw = 36;
  const dh = 50;
  const diamond = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - dh / 2);
    ctx.lineTo(cx + dw / 2, cy);
    ctx.lineTo(cx, cy + dh / 2);
    ctx.lineTo(cx - dw / 2, cy);
    ctx.closePath();
  };
  for (let j = 0, cy = y0; cy < y1 + dh; cy += dh / 2, j++) {
    for (let i = 0, cx = x0 + (j % 2) * (dw / 2); cx < x1 + dw; cx += dw, i++) {
      const k = rnd(seed, i, j);
      const col = k < 0.46 ? theme[0] : k < 0.78 ? theme[1] : k < 0.92 ? theme[2] : '#cfc2a4';
      const dim = 0.5 + 0.55 * rnd(seed + 7, i, j);
      ctx.fillStyle = mixHex(col, '#000000', clamp01(1 - dim));
      ctx.globalAlpha = lum * 0.9;
      diamond(cx, cy);
      ctx.fill();
    }
  }
  // Leading along both diagonals of the quarry lattice.
  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = '#060405';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  const slope = dh / dw;
  const span = (y1 - y0) / slope + (x1 - x0);
  for (let x = x0 - span; x < x1 + span; x += dw) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x + (y1 - y0) / slope, y1);
    ctx.moveTo(x, y0);
    ctx.lineTo(x - (y1 - y0) / slope, y1);
  }
  ctx.stroke();
  // Medallions set into the lattice: a mottled field that glows at its heart,
  // a border band of small panes, four petals round a boss.
  const TAU = Math.PI * 2;
  const mx = (x0 + x1) / 2;
  const mr = (x1 - x0) * 0.4;
  for (let yy = y0 + mr * 1.6, i = 0; yy < y1 - mr; yy += mr * 2.9, i++) {
    ctx.globalAlpha = lum;
    const field = theme[(i + seed) % 2 === 0 ? 1 : 2];
    const fg = ctx.createRadialGradient(mx, yy - mr * 0.2, 0, mx, yy, mr * 0.8);
    fg.addColorStop(0, mixHex(field, '#ffffff', 0.16));
    fg.addColorStop(0.6, mixHex(field, '#000000', 0.22));
    fg.addColorStop(1, mixHex(field, '#000000', 0.5));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(mx, yy, mr, 0, TAU);
    ctx.fill();
    for (let q = 0; q < 12; q++) {
      const a0 = (q / 12) * TAU;
      const a1 = ((q + 1) / 12) * TAU;
      ctx.fillStyle = mixHex(q % 2 ? theme[0] : '#bfb294', '#000000', 0.3 + 0.35 * rnd(seed, i, q));
      ctx.beginPath();
      ctx.arc(mx, yy, mr, a0, a1);
      ctx.arc(mx, yy, mr * 0.8, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      ctx.fillStyle = mixHex(theme[(i + q) % 3], '#000000', 0.1 + 0.3 * rnd(seed + 3, i, q));
      ctx.beginPath();
      ctx.ellipse(mx + Math.cos(a) * mr * 0.42, yy + Math.sin(a) * mr * 0.42, mr * 0.3, mr * 0.18, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = mixHex(theme[0], '#ffffff', 0.2);
    ctx.beginPath();
    ctx.arc(mx, yy, mr * 0.17, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#050304';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(mx, yy, mr, 0, TAU);
    ctx.moveTo(mx + mr * 0.17, yy);
    ctx.arc(mx, yy, mr * 0.17, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mx + mr * 0.8, yy);
    ctx.arc(mx, yy, mr * 0.8, 0, TAU);
    for (let q = 0; q < 12; q++) {
      const a = (q / 12) * TAU;
      ctx.moveTo(mx + Math.cos(a) * mr * 0.8, yy + Math.sin(a) * mr * 0.8);
      ctx.lineTo(mx + Math.cos(a) * mr, yy + Math.sin(a) * mr);
    }
    ctx.stroke();
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      ctx.beginPath();
      ctx.ellipse(mx + Math.cos(a) * mr * 0.42, yy + Math.sin(a) * mr * 0.42, mr * 0.3, mr * 0.18, a, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
};

const drawLancet = (ctx: Ctx, l: (typeof LANCETS)[number], moon: number) => {
  const w = LANCET.w;
  const spring = LANCET.apex + w * 0.866;
  const theme = GLASS[l.theme];
  const lum = moon;
  // Deep splayed reveal.
  ctx.fillStyle = '#070506';
  archPath(ctx, l.x, LANCET.sill + 40, spring, w + 70);
  ctx.fill();
  const rg = ctx.createLinearGradient(l.x - w / 2 - 35, 0, l.x + w / 2 + 35, 0);
  rg.addColorStop(0, 'rgba(60,62,80,0.35)');
  rg.addColorStop(0.2, 'rgba(0,0,0,0)');
  rg.addColorStop(0.8, 'rgba(0,0,0,0)');
  rg.addColorStop(1, 'rgba(40,40,60,0.3)');
  ctx.fillStyle = rg;
  ctx.fill();
  // Glass: a cached bitmap of the leaded panes, drawn at the window's size.
  const GW = w;
  const GH = LANCET.sill - LANCET.apex;
  const RES = 0.75;
  const pane = sprite(`lancet-${l.theme}-${l.broken ? 1 : 0}`, GW * RES, GH * RES, (g) => {
    g.scale(RES, RES);
    g.translate(GW / 2, GH);
    const sill = 0;
    const apex = -GH;
    const sp = apex + GW * 0.866;
    archPath(g, 0, sill, sp, GW);
    g.clip();
    drawGlass(g, -GW / 2, apex, GW / 2, sill, theme, l.theme * 31 + 3, 1);
    if (l.broken) {
      // A jagged hole: the night outside, and the moon's glare.
      const hole: P[] = [];
      const cx = -30;
      const cy = -520;
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        const rad = (k % 2 === 0 ? 150 : 80) * rr(0.7, 1.25, 51, k);
        hole.push([cx + Math.cos(a) * rad * 0.9, cy + Math.sin(a) * rad * 1.5]);
      }
      const sky = g.createRadialGradient(cx + 20, cy - 60, 10, cx, cy, 260);
      sky.addColorStop(0, 'rgba(238,243,255,0.95)');
      sky.addColorStop(0.35, 'rgba(159,178,212,0.8)');
      sky.addColorStop(1, 'rgba(29,39,64,0.9)');
      g.fillStyle = sky;
      poly(g, hole);
      g.fill();
      g.strokeStyle = '#050304';
      g.lineWidth = 3;
      g.stroke();
      for (let k = 0; k < 9; k++) {
        const p = hole[k * 2];
        const q = hole[(k * 2 + 1) % hole.length];
        g.fillStyle = mixHex(theme[k % 3], '#000000', 0.2);
        poly(g, [p, q, [(p[0] + q[0]) / 2 + rr(-18, 18, 61, k), (p[1] + q[1]) / 2 + rr(-30, 30, 62, k)]]);
        g.fill();
      }
    }
  });
  ctx.save();
  archPath(ctx, l.x, LANCET.sill, spring, w);
  ctx.clip();
  ctx.globalAlpha = Math.min(1, lum);
  ctx.drawImage(pane, l.x - GW / 2, LANCET.apex, GW, GH);
  ctx.globalAlpha = 1;
  // Grime at the bottom of the glass.
  const grime = ctx.createLinearGradient(0, LANCET.sill - 300, 0, LANCET.sill);
  grime.addColorStop(0, 'rgba(0,0,0,0)');
  grime.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grime;
  ctx.fillRect(l.x - w, LANCET.sill - 300, w * 2, 300);
  ctx.restore();
  // Tracery: mullion, sub-arches, oculus.
  const sub = (w - 22) / 2;
  const subSpring = spring + 150;
  ctx.strokeStyle = '#0a0708';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(l.x, LANCET.sill);
  ctx.lineTo(l.x, subSpring - sub * 0.3);
  archPath(ctx, l.x - sub / 2 - 5, subSpring, subSpring, sub, true);
  archPath(ctx, l.x + sub / 2 + 5, subSpring, subSpring, sub, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(l.x, spring - 70, w * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  // Frame edge.
  ctx.lineWidth = 12;
  archPath(ctx, l.x, LANCET.sill, spring, w);
  ctx.stroke();
  // Sill.
  ctx.fillStyle = '#16100e';
  ctx.fillRect(l.x - w / 2 - 50, LANCET.sill, w + 100, 26);
};

/**
 * The rose: sixteen lancet petals round a sexfoil oculus, a ring of
 * quatrefoil roundels between their heads, all in heavy stone tracery with
 * dim, mottled jewel glass. The lower left is smashed open: tracery snapped
 * off in stubs, and the moon glaring through the hole.
 */
const drawRose = (ctx: Ctx, moon: number) => {
  const {x, y, r} = ROSE;
  const lum = moon;
  const TAU = Math.PI * 2;
  const N = 16;
  // Radial frame: u along the spoke at angle a, v across it.
  const at = (a: number, u: number, v: number): P => [
    x + Math.cos(a) * u - Math.sin(a) * v,
    y + Math.sin(a) * u + Math.cos(a) * v,
  ];
  const r0 = r * 0.3;
  const r1 = r * 0.75;
  const w = r * 0.5 * Math.sin(Math.PI / N) * 0.78;
  const petal = (a: number) => {
    const us = r1 - w * 1.7;
    const p = [at(a, r0, -w * 0.62), at(a, us, -w), at(a, r1, 0), at(a, us, w), at(a, r0, w * 0.62)];
    const c1 = at(a, us + w * 1.15, -w * 0.95);
    const c2 = at(a, us + w * 1.15, w * 0.95);
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    ctx.lineTo(p[1][0], p[1][1]);
    ctx.quadraticCurveTo(c1[0], c1[1], p[2][0], p[2][1]);
    ctx.quadraticCurveTo(c2[0], c2[1], p[3][0], p[3][1]);
    ctx.lineTo(p[4][0], p[4][1]);
    ctx.closePath();
  };
  const RR = r * 0.098;
  const roundel = (a: number) => at(a, r * 0.865, 0);
  // Glass: a pane glows brighter at its heart and darkens toward its leads.
  const glass = (cx: number, cy: number, rad: number, col: string, seed: number) => {
    const k = 0.75 + 0.45 * rnd(seed, 3, 95);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, mixHex(col, '#ffffff', 0.22 * k));
    g.addColorStop(0.55, mixHex(col, '#000000', 0.15 / k));
    g.addColorStop(1, mixHex(col, '#000000', 0.6));
    ctx.fillStyle = g;
    ctx.fill();
  };
  const BLUE = '#233a9c';
  const RUBY = '#8a1424';
  const VIOLET = '#4a2c86';
  const GOLD = '#b27a26';
  // The broken area (world units), shared with the moonbeam in shaftList.
  const hx = x - r * 0.45;
  const hy = y + r * 0.35;
  const hole: P[] = [];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    const rad = r * (k % 2 ? 0.25 : 0.39) * rr(0.75, 1.2, 91, k);
    hole.push([hx + Math.cos(a) * rad, hy + Math.sin(a) * rad]);
  }
  // Stone surround and mouldings.
  ctx.fillStyle = '#0a0708';
  ctx.beginPath();
  ctx.arc(x, y, r * 1.13, 0, TAU);
  ctx.fill();
  // Glass, clipped to the wheel.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.99, 0, TAU);
  ctx.clip();
  // The spandrels between petals and roundels: a deep blue field.
  const field = ctx.createRadialGradient(x, y, r0, x, y, r);
  field.addColorStop(0, mixHex('#16215e', '#000000', 1 - lum));
  field.addColorStop(1, mixHex('#0a0f30', '#000000', 1 - lum));
  ctx.fillStyle = field;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = lum;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU - Math.PI / 2;
    petal(a);
    const col = [BLUE, RUBY, BLUE, VIOLET][k % 4];
    const c = at(a, (r0 + r1) / 2, 0);
    glass(c[0], c[1], (r1 - r0) * 0.6, col, k);
    const rc = roundel(a + Math.PI / N);
    ctx.beginPath();
    ctx.arc(rc[0], rc[1], RR, 0, TAU);
    glass(rc[0], rc[1], RR, k % 2 ? GOLD : RUBY, 40 + k);
  }
  // Oculus: amber round a ruby heart.
  ctx.beginPath();
  ctx.arc(x, y, r0 * 0.92, 0, TAU);
  glass(x, y, r0, GOLD, 90);
  ctx.beginPath();
  ctx.arc(x, y, r0 * 0.3, 0, TAU);
  glass(x, y, r0 * 0.3, RUBY, 91);
  // Grime settles in the lower half of the glass.
  ctx.globalAlpha = 1;
  const grime = ctx.createLinearGradient(0, y - r, 0, y + r);
  grime.addColorStop(0, 'rgba(0,0,0,0.05)');
  grime.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = grime;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Through the hole: open night, and the moon's glare.
  poly(ctx, hole);
  const sky = ctx.createRadialGradient(hx - 20, hy - 30, 5, hx, hy, r * 0.45);
  sky.addColorStop(0, rgba('#ffffff', lum));
  sky.addColorStop(0.3, rgba('#bcd0ee', 0.95 * lum));
  sky.addColorStop(1, rgba('#2a3656', 0.95));
  ctx.fillStyle = sky;
  ctx.fill();
  ctx.restore();
  // Tracery everywhere but the hole (even-odd clip).
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
  for (let k = hole.length - 1; k >= 0; k--) {
    if (k === hole.length - 1) ctx.moveTo(hole[k][0], hole[k][1]);
    else ctx.lineTo(hole[k][0], hole[k][1]);
  }
  ctx.closePath();
  ctx.clip('evenodd');
  const tracery = (width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU - Math.PI / 2;
      petal(a);
      ctx.stroke();
      // A trefoil eye in each petal head.
      const e = at(a, r1 - w * 1.45, 0);
      ctx.beginPath();
      ctx.arc(e[0], e[1], w * 0.42, 0, TAU);
      ctx.stroke();
      // Cross leads in the petal.
      ctx.lineWidth = width * 0.35;
      ctx.beginPath();
      for (const u of [0.42, 0.56]) {
        const p = at(a, r0 + (r1 - r0) * u, -w);
        const q = at(a, r0 + (r1 - r0) * u, w);
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      ctx.lineWidth = width;
      // Roundel with its quatrefoil.
      const rc = roundel(a + Math.PI / N);
      ctx.beginPath();
      ctx.arc(rc[0], rc[1], RR, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = width * 0.5;
      ctx.beginPath();
      for (let q = 0; q < 4; q++) {
        const qa = (q * Math.PI) / 2 + Math.PI / 4;
        const qx = rc[0] + Math.cos(qa) * RR * 0.42;
        const qy = rc[1] + Math.sin(qa) * RR * 0.42;
        ctx.moveTo(qx + RR * 0.36, qy);
        ctx.arc(qx, qy, RR * 0.36, 0, TAU);
      }
      ctx.stroke();
      ctx.lineWidth = width;
    }
    // Rings, and the sexfoil round the oculus.
    ctx.beginPath();
    ctx.arc(x, y, r * 0.99, 0, TAU);
    ctx.moveTo(x + r0, y);
    ctx.arc(x, y, r0, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = width * 0.6;
    ctx.beginPath();
    for (let q = 0; q < 6; q++) {
      const qa = (q / 6) * TAU;
      const qx = x + Math.cos(qa) * r0 * 0.52;
      const qy = y + Math.sin(qa) * r0 * 0.52;
      ctx.moveTo(qx + r0 * 0.36, qy);
      ctx.arc(qx, qy, r0 * 0.36, 0, TAU);
    }
    ctx.stroke();
  };
  tracery(15, '#070506');
  // A cold edge where the moonlit stone catches the glow of the glass.
  ctx.translate(-2, -2);
  tracery(2, rgba('#7f8cae', 0.16 * lum));
  ctx.restore();
  // Snapped stubs of tracery jutting in from the rim of the hole.
  ctx.strokeStyle = '#070506';
  ctx.lineCap = 'butt';
  for (let k = 0; k < 6; k++) {
    const p = hole[(k * 3 + 1) % hole.length];
    const dx = hx - p[0];
    const dy = hy - p[1];
    const l = Math.hypot(dx, dy) || 1;
    const len = rr(0.25, 0.5, 97, k) * l;
    const bend = rr(-0.35, 0.35, 96, k);
    ctx.lineWidth = rr(8, 13, 98, k);
    ctx.beginPath();
    ctx.moveTo(p[0] - (dx / l) * 6, p[1] - (dy / l) * 6);
    ctx.lineTo(p[0] + ((dx - dy * bend) / l) * len, p[1] + ((dy + dx * bend) / l) * len);
    ctx.stroke();
  }
  // Shards of glass still clinging to the rim of the hole.
  for (let k = 0; k < 9; k++) {
    const p = hole[k * 2];
    const q = hole[(k * 2 + 1) % hole.length];
    ctx.fillStyle = mixHex([BLUE, RUBY, VIOLET][k % 3], '#000000', 0.25);
    poly(ctx, [p, q, [(p[0] + q[0]) / 2 + rr(-18, 18, 61, k), (p[1] + q[1]) / 2 + rr(-30, 30, 62, k)]]);
    ctx.fill();
  }
  // Mouldings round the wheel, with a cold rim from the moon behind.
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#140f0e';
  ctx.beginPath();
  ctx.arc(x, y, r * 1.05, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = rgba('#9fb4d6', 0.22 * lum);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.1, Math.PI * 0.9, Math.PI * 1.6);
  ctx.stroke();
};

/** The aisle wall: courses, wall shafts, vault ribs, glass. Static, so baked. */
const WALL_BOX = {x0: -3400, x1: 4300, y0: -3400, y1: 80, res: 0.5};
const bakeWall = (ctx: Ctx) => {
  const b = {x0: WALL_BOX.x0, x1: WALL_BOX.x1, y0: WALL_BOX.y0, y1: WALL_BOX.y1};
  const g = ctx.createLinearGradient(0, 0, 0, -2400);
  g.addColorStop(0, '#1d1715');
  g.addColorStop(0.3, '#120e0d');
  g.addColorStop(0.7, '#080606');
  g.addColorStop(1, '#030202');
  ctx.fillStyle = g;
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  // Ashlar courses.
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 0, r = 0; y > -2600; y -= 64, r++) {
    ctx.moveTo(b.x0, y);
    ctx.lineTo(b.x1, y);
    const off = (r % 2) * 70;
    for (let x = Math.floor((b.x0 - off) / 140) * 140 + off; x < b.x1; x += 140) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 64);
    }
  }
  ctx.stroke();
  // Wall shafts between the windows, and the aisle vault ribs above them.
  for (let k = -4; k <= 5; k++) {
    const x = LANCETS[0].x - 350 + k * 700;
    const pg = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
    pg.addColorStop(0, '#060404');
    pg.addColorStop(0.6, '#1a1413');
    pg.addColorStop(1, '#0a0707');
    ctx.fillStyle = pg;
    ctx.fillRect(x - 50, -1700, 100, 1700);
  }
  ctx.strokeStyle = '#0c0909';
  ctx.lineWidth = 34;
  for (const l of LANCETS) {
    archPath(ctx, l.x, -1580, -1580, 700, true);
    ctx.stroke();
  }
  // Moon spill around each window.
  for (const l of LANCETS) {
    const mid = (LANCET.apex + LANCET.sill) / 2;
    const halo = ctx.createRadialGradient(l.x, mid, 40, l.x, mid, 620);
    const c = l.broken ? '#8ea4c8' : GLASS[l.theme][0];
    halo.addColorStop(0, rgba(c, 0.22));
    halo.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(l.x - 620, mid - 620, 1240, 1240);
  }
  for (const l of LANCETS) drawLancet(ctx, l, 0.86);
};

/** The transept end wall and its broken rose window. Also baked. */
const TRANSEPT_BOX = {x0: 1250, x1: 3700, y0: -2700, y1: 80, res: 0.5};
const bakeTransept = (ctx: Ctx) => {
  const tg = ctx.createLinearGradient(0, 0, 0, -2200);
  tg.addColorStop(0, '#1b1514');
  tg.addColorStop(0.5, '#0e0b0b');
  tg.addColorStop(1, '#040303');
  ctx.fillStyle = tg;
  ctx.fillRect(TRANSEPT_BOX.x0, TRANSEPT_BOX.y0, TRANSEPT_BOX.x1 - TRANSEPT_BOX.x0, TRANSEPT_BOX.y1 - TRANSEPT_BOX.y0);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 0, r = 0; y > -2600; y -= 64, r++) {
    ctx.moveTo(TRANSEPT_BOX.x0, y);
    ctx.lineTo(TRANSEPT_BOX.x1, y);
    const off = (r % 2) * 70;
    for (let x = TRANSEPT_BOX.x0 + off; x < TRANSEPT_BOX.x1; x += 140) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 64);
    }
  }
  ctx.stroke();
  const rh = ctx.createRadialGradient(ROSE.x, ROSE.y, ROSE.r * 0.5, ROSE.x, ROSE.y, ROSE.r * 2.2);
  rh.addColorStop(0, rgba('#5b6ea8', 0.3));
  rh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rh;
  ctx.fillRect(ROSE.x - ROSE.r * 2.2, ROSE.y - ROSE.r * 2.2, ROSE.r * 4.4, ROSE.r * 4.4);
  drawRose(ctx, 1);
};

const blitBaked = (
  ctx: Ctx,
  S: EnvState,
  key: string,
  box: {x0: number; x1: number; y0: number; y1: number; res: number},
  d: number,
  bake: (ctx: Ctx) => void,
  alpha: number,
) => {
  const img = sprite(key, (box.x1 - box.x0) * box.res, (box.y1 - box.y0) * box.res, (g) => {
    g.scale(box.res, box.res);
    g.translate(-box.x0, -box.y0);
    bake(g);
  });
  setPlane(ctx, S.cam, d);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  ctx.globalAlpha = 1;
};

const drawWall = (ctx: Ctx, S: EnvState) => {
  blitBaked(ctx, S, 'wall', WALL_BOX, WALL_D, bakeWall, 1);
  blitBaked(ctx, S, 'transept', TRANSEPT_BOX, ROSE.d, bakeTransept, 1);
  // The glass breathes with the moon: a faint cool lift over the windows.
  setPlane(ctx, S.cam, WALL_D);
  const lift = S.moon - 0.92;
  if (lift > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of LANCETS) {
      const mid = (LANCET.apex + LANCET.sill) / 2;
      const g = ctx.createRadialGradient(l.x, mid, 0, l.x, mid, 520);
      g.addColorStop(0, rgba('#8090c0', lift * 1.2));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - 520, mid - 520, 1040, 1040);
    }
    ctx.restore();
  }
};

// ---------------------------------------------------------------------------
// Nave arcade: compound piers, pointed arches, triforium, and the crossing.

const pierPositions = (b: {x0: number; x1: number}) => {
  const xs: number[] = [];
  for (let k = -4; k <= 0; k++) {
    const x = PILLARS[PILLARS.length - 1] + k * 700;
    if (x > b.x0 - 400 && x < b.x1 + 400) xs.push(x);
  }
  return xs;
};

const drawPier = (ctx: Ctx, x: number, w: number, top: number, S: EnvState, warm: number) => {
  // Plinth.
  ctx.fillStyle = '#0d0a0a';
  ctx.fillRect(x - w / 2 - 34, -110, w + 68, 110);
  ctx.fillStyle = '#17110f';
  ctx.fillRect(x - w / 2 - 44, -118, w + 88, 16);
  // Core and attached shafts, each a lit cylinder.
  const shafts = [
    {cx: x - w * 0.36, r: w * 0.16},
    {cx: x + w * 0.36, r: w * 0.16},
    {cx: x, r: w * 0.24},
  ];
  ctx.fillStyle = '#0b0808';
  ctx.fillRect(x - w * 0.42, top, w * 0.84, -110 - top);
  for (const sh of shafts) {
    const g = ctx.createLinearGradient(sh.cx - sh.r, 0, sh.cx + sh.r, 0);
    g.addColorStop(0, '#060404');
    g.addColorStop(0.35, '#1c1615');
    g.addColorStop(0.7, '#2a2322');
    g.addColorStop(0.9, '#3a3a44');
    g.addColorStop(1, '#0a0808');
    ctx.fillStyle = g;
    ctx.fillRect(sh.cx - sh.r, top, sh.r * 2, -110 - top);
  }
  // Candle warmth low on the pier.
  if (warm > 0) {
    const wg = ctx.createLinearGradient(0, -600, 0, 0);
    wg.addColorStop(0, 'rgba(255,120,40,0)');
    wg.addColorStop(1, rgba('#ff7a2a', 0.12 * warm));
    ctx.fillStyle = wg;
    ctx.fillRect(x - w / 2, -600, w, 600);
  }
  // Courses.
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = -170; y > top; y -= 76) {
    ctx.moveTo(x - w * 0.42, y);
    ctx.lineTo(x + w * 0.42, y);
  }
  ctx.stroke();
  // Capital with a band of stiff leaves.
  ctx.fillStyle = '#120d0c';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, top);
  ctx.lineTo(x - w * 0.7, top - 70);
  ctx.lineTo(x + w * 0.7, top - 70);
  ctx.lineTo(x + w * 0.45, top);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#221a18';
  for (let k = 0; k < 7; k++) {
    const lx = x - w * 0.6 + (k * w * 1.2) / 6;
    ctx.beginPath();
    ctx.ellipse(lx, top - 44, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#0a0707';
  ctx.fillRect(x - w * 0.75, top - 92, w * 1.5, 24);
  ctx.fillStyle = rgba('#8a9ab8', 0.18 * S.moon);
  ctx.fillRect(x - w * 0.75, top - 92, w * 1.5, 4);
};

const clerestory = (k: number) =>
  sprite(`clerestory-${k}`, 150, 503, (g) => {
    g.scale(0.75, 0.75);
    g.translate(100, 2800);
    archPath(g, 0, -2130, -2600, 200);
    g.clip();
    drawGlass(g, -100, -2800, 100, -2130, GLASS[(((k + 2) % 4) + 4) % 4], 200 + k, 0.7);
  });

const drawArcade = (ctx: Ctx, S: EnvState) => {
  const {cam} = S;
  const b = planeBounds(cam, PILLAR_D, 60);
  setPlane(ctx, cam, PILLAR_D);
  const xs = pierPositions(b);
  const crossing = PILLARS[PILLARS.length - 1];
  const w = PILLAR_W;
  const spring = CAPITAL_Y - 92;
  // Upper wall with the arcade openings cut out (even-odd).
  ctx.beginPath();
  const leftX = Math.min(b.x0, xs[0] - 700);
  const rightX = crossing + w / 2;
  ctx.rect(leftX, Math.min(b.y0, -3200), rightX - leftX, 3200 + Math.max(0, b.y1));
  for (let i = 0; i < xs.length; i++) {
    const x0 = (i === 0 ? xs[0] - 700 : xs[i - 1]) + w / 2;
    const x1 = xs[i] - w / 2;
    const span = x1 - x0;
    ctx.moveTo(x0, 10);
    ctx.lineTo(x0, spring);
    ctx.arc(x1, spring, span, Math.PI, (Math.PI * 4) / 3, false);
    ctx.arc(x0, spring, span, (Math.PI * 5) / 3, Math.PI * 2, false);
    ctx.lineTo(x1, 10);
    ctx.closePath();
  }
  const wg = ctx.createLinearGradient(0, -1000, 0, -2600);
  wg.addColorStop(0, '#120e0d');
  wg.addColorStop(1, '#040303');
  ctx.fillStyle = wg;
  ctx.fill('evenodd');
  // Arch moldings.
  for (let i = 0; i < xs.length; i++) {
    const x0 = (i === 0 ? xs[0] - 700 : xs[i - 1]) + w / 2;
    const x1 = xs[i] - w / 2;
    const span = x1 - x0;
    for (let ring = 0; ring < 3; ring++) {
      const o = ring * 26;
      ctx.strokeStyle = ring === 0 ? '#1d1716' : ring === 1 ? '#0e0a0a' : '#171211';
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.arc(x1 + o, spring, span + o * 2, Math.PI, (Math.PI * 4) / 3 + 0.004 * o, false);
      ctx.arc(x0 - o, spring, span + o * 2, (Math.PI * 5) / 3 - 0.004 * o, Math.PI * 2, false);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba('#8a9ab8', 0.16 * S.moon);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x1, spring, span - 10, Math.PI, (Math.PI * 4) / 3, false);
    ctx.stroke();
  }
  // String course and triforium.
  ctx.fillStyle = '#1a1413';
  ctx.fillRect(leftX, -1720, rightX - leftX, 28);
  ctx.fillStyle = rgba('#9aa6c0', 0.12 * S.moon);
  ctx.fillRect(leftX, -1720, rightX - leftX, 5);
  for (let i = 0; i < xs.length; i++) {
    const x0 = (i === 0 ? xs[0] - 700 : xs[i - 1]) + w / 2;
    const span = 700 - w;
    for (let k = 0; k < 4; k++) {
      const ax = x0 + (k + 0.5) * (span / 4);
      ctx.fillStyle = '#020101';
      archPath(ctx, ax, -1740, -1960, span / 4 - 22);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#1a1413';
  ctx.fillRect(leftX, -2090, rightX - leftX, 26);
  // Clerestory glass, high and dim: baked per window (keyed by its place in
  // the nave, so the pattern never changes as piers scroll into view) and
  // skipped entirely while it is above the frame.
  for (let i = 0; i < xs.length; i++) {
    const cx = i === 0 ? xs[0] - 350 : (xs[i - 1] + xs[i]) / 2;
    if (b.y0 > -2130 || cx + 100 < b.x0 || cx - 100 > b.x1) continue;
    ctx.globalAlpha = S.moon;
    ctx.drawImage(clerestory(Math.round(cx / 700)), cx - 100, -2800, 200, 670);
    ctx.globalAlpha = 1;
  }
  // Piers.
  for (const x of xs) drawPier(ctx, x, x === crossing ? w * 1.35 : w, CAPITAL_Y, S, 0.5);
  // Vault shafts rising from the capitals into the dark.
  ctx.strokeStyle = '#0d0a0a';
  ctx.lineWidth = 30;
  ctx.beginPath();
  for (const x of xs) {
    ctx.moveTo(x, CAPITAL_Y - 92);
    ctx.lineTo(x, -3000);
  }
  ctx.stroke();
};

// ---------------------------------------------------------------------------
// Floor: cracked flagstones in true perspective.

const drawFloor = (ctx: Ctx, S: EnvState) => {
  const {cam} = S;
  screen(ctx);
  const dNear = Math.max(cam.dolly + 0.2, 0.3);
  const rowDepth = 105 / DEPTH_UNITS;
  // Base (the mortar).
  const yFar = proj(cam, 0, 0, WALL_D)[1];
  ctx.fillStyle = '#050404';
  ctx.fillRect(0, yFar, W, H - yFar);
  const tw = 130;
  let row = 0;
  for (let d = WALL_D - rowDepth; d > dNear - rowDepth; d -= rowDepth, row++) {
    const dA = d + rowDepth;
    const dB = Math.max(d, dNear - 0.2);
    const sA = sOf(cam, dA);
    const sB = sOf(cam, dB);
    const x0 = cam.x - W / 2 / sB - tw;
    const x1 = cam.x + W / 2 / sB + tw;
    const ri = Math.round(d / rowDepth);
    const off = (ri % 2) * (tw / 2);
    const inset = 0.045;
    for (let x = Math.floor((x0 - off) / tw) * tw + off; x < x1; x += tw) {
      const ci = Math.round(x / tw);
      const k = rnd(ri, ci, 3);
      if (k < 0.035) continue; // missing stone
      const pA0 = proj(cam, x, 0, dA);
      const pA1 = proj(cam, x + tw, 0, dA);
      const pB0 = proj(cam, x, 0, dB);
      const pB1 = proj(cam, x + tw, 0, dB);
      const cx = (pA0[0] + pA1[0] + pB0[0] + pB1[0]) / 4;
      const cy = (pA0[1] + pB0[1]) / 2;
      const q = (p: P): P => [p[0] + (cx - p[0]) * inset, p[1] + (cy - p[1]) * inset * 1.6];
      const v = 0.7 + 0.55 * rnd(ri, ci, 5);
      const base = 19 * v;
      ctx.fillStyle = `rgb(${base * 1.05},${base * 0.92},${base * 0.86})`;
      poly(ctx, [q(pA0), q(pA1), q(pB1), q(pB0)]);
      ctx.fill();
      // Cracks.
      if (rnd(ri, ci, 7) < 0.28) {
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = Math.max(0.6, sB * 1.6);
        ctx.beginPath();
        let px = x + tw * rnd(ri, ci, 8);
        let pd = dA;
        let pp = proj(cam, px, 0, pd);
        ctx.moveTo(pp[0], pp[1]);
        for (let s = 1; s <= 4; s++) {
          px += rr(-40, 40, ri, ci, 10 + s);
          pd = dA - (rowDepth * s) / 4;
          pp = proj(cam, Math.min(x + tw, Math.max(x, px)), 0, pd);
          ctx.lineTo(pp[0], pp[1]);
        }
        ctx.stroke();
      }
    }
  }
  // Depth haze and a shadowed foreground.
  const g = ctx.createLinearGradient(0, yFar, 0, H);
  g.addColorStop(0, 'rgba(14,13,20,0.75)');
  g.addColorStop(0.25, 'rgba(10,9,12,0.25)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, yFar, W, H - yFar);
};

/** Soft pool of light on the floor (an ellipse flattened by perspective). */
const floorPool = (ctx: Ctx, cam: Cam, x: number, d: number, r: number, color: string, a: number, y = 0) => {
  if (a <= 0.002) return;
  const [sx, sy] = proj(cam, x, y, d);
  const s = sOf(cam, d);
  const rx = r * s;
  const aspect = Math.min(0.9, Math.max(0.08, (y - cam.y) / (DEPTH_UNITS * Math.max(0.1, d - cam.dolly))));
  if (rx < 1) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(1, aspect);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.5, rgba(color, a * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
};

const drawFloorLight = (ctx: Ctx, S: EnvState, shafts: Shaft[]) => {
  const {cam} = S;
  screen(ctx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  LANCETS.forEach((l, i) => {
    const g = GLASS[l.theme];
    const sh = shafts[i];
    floorPool(ctx, cam, l.land, 1.16, 300, l.broken ? '#9fb3d8' : g[0], sh.a * 1.6);
    floorPool(ctx, cam, l.land + 60, 1.1, 180, l.broken ? '#dfe8ff' : g[1], sh.a * 1.0);
    // Glass reflected in the polished stone.
    const [rx, ry] = proj(cam, l.x, 0, WALL_D - 0.25);
    const s = sOf(cam, WALL_D);
    const rg = ctx.createLinearGradient(0, ry, 0, ry + 380 * s);
    rg.addColorStop(0, rgba(g[0], 0.12 * S.moon));
    rg.addColorStop(1, rgba(g[0], 0));
    ctx.fillStyle = rg;
    ctx.fillRect(rx - 90 * s, ry, 180 * s, 380 * s);
  });
  // Moon pool on the dais.
  floorPool(ctx, cam, THRONE.x - 120, 1.2, 380, '#9fb6dc', 0.2 * S.moon, DAIS_TOP);
  ctx.restore();
  // Contact shadows under the fighters.
  for (const sh of S.shadows) {
    const [sx, sy] = proj(cam, sh.x, 0, sh.d);
    const s = sOf(cam, sh.d);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 0.16);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sh.w * s);
    g.addColorStop(0, `rgba(0,0,0,${0.75 * sh.a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-sh.w * s, -sh.w * s, sh.w * s * 2, sh.w * s * 2);
    ctx.restore();
  }
};

// ---------------------------------------------------------------------------
// Dais, throne and banner.

const boxFaces = (ctx: Ctx, cam: Cam, x0: number, x1: number, h: number, d0: number, d1: number, top: string, front: string, side: string) => {
  const A = proj(cam, x0, -h, d0);
  const B = proj(cam, x1, -h, d0);
  const C = proj(cam, x1, -h, d1);
  const D = proj(cam, x0, -h, d1);
  const A0 = proj(cam, x0, 0, d0);
  const B0 = proj(cam, x1, 0, d0);
  const D0 = proj(cam, x0, 0, d1);
  if (x0 > cam.x) {
    ctx.fillStyle = side;
    poly(ctx, [A, D, D0, A0]);
    ctx.fill();
  }
  ctx.fillStyle = top;
  poly(ctx, [A, B, C, D]);
  ctx.fill();
  ctx.fillStyle = front;
  poly(ctx, [A, B, B0, A0]);
  ctx.fill();
  // Worn edge highlight.
  ctx.strokeStyle = 'rgba(150,160,185,0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(A[0], A[1]);
  ctx.lineTo(B[0], B[1]);
  ctx.stroke();
};

const drawDais = (ctx: Ctx, S: EnvState) => {
  const {cam} = S;
  screen(ctx);
  boxFaces(ctx, cam, DAIS.x0, DAIS.x1, DAIS.h1, DAIS.dNear, DAIS.dFar, '#211b1a', '#0e0b0a', '#151010');
  boxFaces(ctx, cam, DAIS.x0 + DAIS.step, DAIS.x1, DAIS.h2, DAIS.dNear + 0.03, DAIS.dFar - 0.03, '#261f1e', '#100c0b', '#181211');
  // Masonry joints on the risers and across the treads.
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = DAIS.x0 + DAIS.step + 120; x < DAIS.x1; x += 150) {
    const a = proj(cam, x, -DAIS.h2, DAIS.dNear + 0.03);
    const b = proj(cam, x, -DAIS.h1, DAIS.dNear + 0.03);
    const c = proj(cam, x + 75, -DAIS.h1, DAIS.dNear);
    const d = proj(cam, x + 75, 0, DAIS.dNear);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.moveTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    const t0 = proj(cam, x, -DAIS.h2, DAIS.dNear + 0.03);
    const t1 = proj(cam, x - 40, -DAIS.h2, DAIS.dFar - 0.03);
    ctx.moveTo(t0[0], t0[1]);
    ctx.lineTo(t1[0], t1[1]);
  }
  ctx.stroke();
  // Candle-warmed chips along the front edges.
  ctx.strokeStyle = 'rgba(255,150,80,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const e0 = proj(cam, DAIS.x0 + DAIS.step, -DAIS.h2, DAIS.dNear + 0.03);
  const e1 = proj(cam, DAIS.x1, -DAIS.h2, DAIS.dNear + 0.03);
  ctx.moveTo(e0[0], e0[1]);
  ctx.lineTo(e1[0], e1[1]);
  ctx.stroke();
  // A rotten crimson runner down the steps.
  const run = (x0: number, x1: number, y: number, d0: number, d1: number) => {
    const pts: P[] = [proj(cam, x0, y, d0), proj(cam, x1, y, d0), proj(cam, x1, y, d1), proj(cam, x0, y, d1)];
    poly(ctx, pts);
    ctx.fill();
  };
  ctx.fillStyle = '#3a0a0e';
  run(DAIS.x0 + DAIS.step, THRONE.x - 60, -DAIS.h2 - 0.5, 1.08, 1.26);
  ctx.fillStyle = '#2c080b';
  run(DAIS.x0 - 40, DAIS.x0 + DAIS.step, -DAIS.h1 - 0.5, 1.06, 1.27);
  // Tattered end of the runner on the nave floor.
  ctx.fillStyle = '#23070a';
  const tail: P[] = [
    proj(cam, DAIS.x0 - 40, 0, 1.06),
    proj(cam, DAIS.x0 - 150, 0, 1.08),
    proj(cam, DAIS.x0 - 190, 0, 1.17),
    proj(cam, DAIS.x0 - 130, 0, 1.22),
    proj(cam, DAIS.x0 - 40, 0, 1.27),
  ];
  poly(ctx, tail);
  ctx.fill();
};

const drawBanner = (ctx: Ctx, S: EnvState) => {
  const {cam, t} = S;
  setPlane(ctx, cam, BANNER.d);
  const {x, top, bottom, w} = BANNER;
  const len = bottom - top;
  const gust = S.wave ? S.wave.a : 0;
  const sway = (y: number) => {
    const u = (y - top) / len;
    return (
      u * u * (26 * nz(t * 0.018, 3.3) + 70 * gust * Math.sin(u * 3 + t * 0.4)) +
      Math.sin(u * 5 - t * 0.05) * 6 * u
    );
  };
  const left: P[] = [];
  const right: P[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const y = top + (len * i) / n;
    const o = sway(y);
    const pinch = 1 - 0.1 * Math.sin((i / n) * Math.PI);
    left.push([x - (w / 2) * pinch + o, y]);
    right.push([x + (w / 2) * pinch + o, y]);
  }
  // Swallowtail, torn unevenly.
  const bl = left[n];
  const br = right[n];
  const tail: P[] = [
    [br[0], br[1] + 40],
    [br[0] - w * 0.18, br[1] - 30],
    [x + sway(bottom) + 14, bottom - 90],
    [x + sway(bottom) - w * 0.2, bottom - 20],
    [bl[0] + 30, bl[1] - 120],
    [bl[0], bl[1] - 160],
  ];
  const pts = [...left.slice(0, n), ...tail.reverse(), ...right.slice(0, n).reverse()];
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  const red = S.red;
  g.addColorStop(0, mixHex('#2a0508', '#6a0a08', red));
  g.addColorStop(0.3, mixHex('#5e0f16', '#b01810', red));
  g.addColorStop(0.55, mixHex('#3c0a0f', '#801010', red));
  g.addColorStop(0.8, mixHex('#661219', '#c02010', red));
  g.addColorStop(1, '#1c0305');
  ctx.fillStyle = g;
  poly(ctx, pts);
  ctx.fill();
  // Fold shading.
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  const vg = ctx.createLinearGradient(0, top, 0, bottom);
  vg.addColorStop(0, rgba('#8a9ab8', 0.22 * S.moon));
  vg.addColorStop(0.5, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(x - w, top, w * 2, len);
  // Faded sigil: a crown over a sun.
  const sy = top + len * 0.52;
  const sx = x + sway(sy);
  ctx.strokeStyle = rgba('#b8914a', 0.45);
  ctx.fillStyle = rgba('#b8914a', 0.28);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(sx, sy, 46, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 56, sy + Math.sin(a) * 56);
    ctx.lineTo(sx + Math.cos(a + 0.12) * 80, sy + Math.sin(a + 0.12) * 80);
    ctx.lineTo(sx + Math.cos(a - 0.12) * 80, sy + Math.sin(a - 0.12) * 80);
    ctx.fill();
  }
  ctx.beginPath();
  const cy = sy - 108;
  ctx.moveTo(sx - 50, cy + 26);
  ctx.lineTo(sx - 56, cy - 18);
  ctx.lineTo(sx - 28, cy + 4);
  ctx.lineTo(sx, cy - 30);
  ctx.lineTo(sx + 28, cy + 4);
  ctx.lineTo(sx + 56, cy - 18);
  ctx.lineTo(sx + 50, cy + 26);
  ctx.closePath();
  ctx.fill();
  // A rip through the middle.
  ctx.fillStyle = '#050304';
  const rx = x + sway(top + len * 0.3) - 40;
  const ry = top + len * 0.3;
  poly(ctx, [
    [rx, ry],
    [rx + 30, ry + 50],
    [rx + 12, ry + 120],
    [rx + 44, ry + 190],
    [rx + 20, ry + 140],
    [rx - 6, ry + 60],
  ]);
  ctx.fill();
  ctx.restore();
  // Gold edging, dulled.
  ctx.strokeStyle = rgba('#8a6a32', 0.6);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const p of left.slice(0, n)) ctx.lineTo(p[0], p[1]);
  ctx.moveTo(right[0][0], right[0][1]);
  for (const p of right.slice(0, n)) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  // The pole.
  ctx.fillStyle = '#0a0707';
  ctx.fillRect(x - w * 0.75, top - 16, w * 1.5, 20);
};

const drawThrone = (ctx: Ctx, S: EnvState) => {
  const {cam} = S;
  setPlane(ctx, cam, THRONE.d);
  const x = THRONE.x;
  const b = DAIS_TOP;
  const moon = S.moon;
  const gold = rgba('#c9a45c', 0.3 + 0.25 * moon);
  const stone = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#0b0808');
    g.addColorStop(0.55, '#1b1514');
    g.addColorStop(0.85, '#2a2429');
    g.addColorStop(1, '#3c3c48');
    return g;
  };
  // Side pinnacles behind the back.
  for (const [px, h] of [[x + 176, 700], [x + 40, 640]] as const) {
    ctx.fillStyle = '#0f0b0b';
    ctx.beginPath();
    ctx.moveTo(px - 16, b);
    ctx.lineTo(px - 16, b - h);
    ctx.lineTo(px, b - h - 110);
    ctx.lineTo(px + 16, b - h);
    ctx.lineTo(px + 16, b);
    ctx.fill();
  }
  // The tall back, gabled, with a finial.
  const bx0 = x + 58;
  const bx1 = x + 158;
  ctx.fillStyle = stone(bx0, bx1);
  ctx.beginPath();
  ctx.moveTo(bx0, b);
  ctx.lineTo(bx0, b - 600);
  ctx.lineTo((bx0 + bx1) / 2, b - 760);
  ctx.lineTo(bx1, b - 600);
  ctx.lineTo(bx1, b);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect((bx0 + bx1) / 2 - 5, b - 860, 10, 110);
  ctx.beginPath();
  ctx.arc((bx0 + bx1) / 2, b - 868, 13, 0, Math.PI * 2);
  ctx.fill();
  // Crockets climbing the gable.
  ctx.fillStyle = '#1d1716';
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.5) / 5;
    const yy = b - 600 - u * 160;
    const half = ((bx1 - bx0) / 2) * (1 - u);
    ctx.beginPath();
    ctx.arc((bx0 + bx1) / 2 - half - 7, yy, 8, 0, Math.PI * 2);
    ctx.arc((bx0 + bx1) / 2 + half + 7, yy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Carved blind tracery on the back.
  ctx.strokeStyle = '#070505';
  ctx.lineWidth = 7;
  archPath(ctx, (bx0 + bx1) / 2, b - 250, b - 470, 56);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc((bx0 + bx1) / 2, b - 560, 24, 0, Math.PI * 2);
  ctx.stroke();
  // Seat block and its arcaded front.
  ctx.fillStyle = stone(x - 130, x + 60);
  ctx.fillRect(x - 124, b - 130, 186, 130);
  ctx.strokeStyle = '#080606';
  ctx.lineWidth = 5;
  for (let k = 0; k < 3; k++) {
    archPath(ctx, x - 94 + k * 56, b - 14, b - 70, 34);
    ctx.stroke();
  }
  ctx.fillStyle = '#231c1b';
  ctx.fillRect(x - 138, b - 146, 214, 18);
  // Velvet cushion, rotten.
  ctx.fillStyle = '#35080c';
  ctx.fillRect(x - 128, b - 156, 190, 12);
  // Armrest on posts, with a snarling finial.
  ctx.fillStyle = '#141010';
  ctx.fillRect(x - 124, b - 262, 20, 116);
  ctx.fillStyle = stone(x - 140, x + 60);
  ctx.fillRect(x - 134, b - 272, 196, 24);
  ctx.fillStyle = '#2a211e';
  ctx.beginPath();
  ctx.moveTo(x - 134, b - 248);
  ctx.bezierCurveTo(x - 170, b - 250, x - 168, b - 292, x - 138, b - 290);
  ctx.lineTo(x - 128, b - 272);
  ctx.fill();
  // Gold trim catching the moonbeam.
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x - 134, b - 272);
  ctx.lineTo(x + 62, b - 272);
  ctx.moveTo(x - 138, b - 146);
  ctx.lineTo(x + 76, b - 146);
  ctx.moveTo(bx0, b - 600);
  ctx.lineTo((bx0 + bx1) / 2, b - 760);
  ctx.lineTo(bx1, b - 600);
  ctx.stroke();
  // Cold rims from the rose window above and behind.
  ctx.strokeStyle = rgba('#c4d2e8', 0.5 * moon);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx1, b - 10);
  ctx.lineTo(bx1, b - 600);
  ctx.lineTo((bx0 + bx1) / 2, b - 760);
  ctx.moveTo(x + 192, b - 10);
  ctx.lineTo(x + 192, b - 700);
  ctx.stroke();
};

// ---------------------------------------------------------------------------
// Props: candelabra, pews, bones.

const drawFlame = (ctx: Ctx, x: number, y: number, s: number, gain: number, id: number, t: number, red: number) => {
  const f = flicker(t, id) * gain;
  if (f <= 0.02) return;
  const h = 16 * s * f;
  const w = 3.6 * s * (0.8 + 0.2 * f);
  const lean = nz(t * 0.05, id * 2.7) * 3 * s;
  // Halo.
  const R = 70 * s * f;
  const halo = ctx.createRadialGradient(x, y - h * 0.4, 0, x, y - h * 0.4, R);
  const hc = red > 0.2 ? mixHex('#ff8a3a', '#ff3a1a', red) : '#ff8a3a';
  halo.addColorStop(0, rgba(hc, 0.32 * Math.min(1.4, f)));
  halo.addColorStop(0.3, rgba(hc, 0.1 * f));
  halo.addColorStop(1, rgba(hc, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - R, y - h * 0.4 - R, R * 2, R * 2);
  // Flame body.
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 1.1, y - h * 0.55, x + lean, y - h);
  ctx.quadraticCurveTo(x + w * 1.1, y - h * 0.55, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.9, x - w, y);
  const g = ctx.createLinearGradient(x, y + 2, x, y - h);
  g.addColorStop(0, 'rgba(90,110,220,0.8)');
  g.addColorStop(0.2, 'rgba(255,190,90,0.95)');
  g.addColorStop(0.55, 'rgba(255,240,200,1)');
  g.addColorStop(1, 'rgba(255,140,40,0.2)');
  ctx.fillStyle = g;
  ctx.fill();
};

const drawSmoke = (ctx: Ctx, x: number, y: number, s: number, age: number, id: number) => {
  if (age <= 0 || age > 70) return;
  const a = (1 - age / 70) * 0.35;
  ctx.strokeStyle = `rgba(150,150,160,${a})`;
  ctx.lineWidth = Math.max(0.8, 1.6 * s);
  ctx.beginPath();
  const len = Math.min(age * 2.2, 130) * s;
  for (let k = 0; k <= 12; k++) {
    const u = k / 12;
    const px = x + nz(u * 2 - age * 0.04, id) * 14 * s * u + Math.sin(u * 7 + age * 0.1) * 5 * s * u;
    const py = y - u * len;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
};

const candlePositions = (c: Candelabrum) => {
  const out: {x: number; y: number; h: number}[] = [];
  const span = c.n === 3 ? 44 : 34;
  for (let i = 0; i < c.n; i++) {
    const o = i - (c.n - 1) / 2;
    const x = c.x + o * span;
    const y = c.base - c.h + Math.abs(o) * 16;
    out.push({x, y, h: rr(14, 34, c.seed, i)});
  }
  return out;
};

const drawCandelabrum = (ctx: Ctx, c: Candelabrum, S: EnvState) => {
  const {cam, t} = S;
  const s = setPlane(ctx, cam, c.d);
  const top = c.base - c.h;
  const iron = '#0b0909';
  // Tripod feet.
  ctx.strokeStyle = iron;
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (const dir of [-1, 1, 0]) {
    ctx.moveTo(c.x, c.base - 40);
    ctx.quadraticCurveTo(c.x + dir * 30, c.base - 20, c.x + dir * (dir === 0 ? 8 : 48), c.base);
  }
  ctx.stroke();
  // Shaft with knops.
  ctx.fillStyle = iron;
  ctx.fillRect(c.x - 4.5, top + 10, 9, c.h - 50);
  for (const u of [0.35, 0.7]) {
    ctx.beginPath();
    ctx.ellipse(c.x, top + c.h * u, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Arms and drip pans.
  const cps = candlePositions(c);
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const p of cps) {
    ctx.moveTo(c.x, top + 26);
    ctx.quadraticCurveTo(p.x, top + 30, p.x, p.y + 4);
  }
  ctx.stroke();
  for (const p of cps) {
    ctx.fillRect(p.x - 12, p.y, 24, 5);
  }
  // Warm rim along the iron.
  ctx.strokeStyle = 'rgba(255,140,60,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(c.x + 4.5, top + 10);
  ctx.lineTo(c.x + 4.5, c.base - 40);
  ctx.stroke();
  // Candles.
  cps.forEach((p, i) => {
    const st = S.candle(c, i);
    const cg = ctx.createLinearGradient(p.x - 5, 0, p.x + 5, 0);
    cg.addColorStop(0, '#6a5e4a');
    cg.addColorStop(0.5, '#d8cbb0');
    cg.addColorStop(1, '#8a7a60');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x - 5, p.y - p.h + 2);
    ctx.lineTo(p.x - 1, p.y - p.h);
    ctx.lineTo(p.x + 5, p.y - p.h + 3);
    ctx.lineTo(p.x + 5, p.y);
    ctx.fill();
    // Wax drips.
    ctx.fillStyle = '#c8bca0';
    ctx.fillRect(p.x - 6, p.y - p.h * 0.6, 2, p.h * 0.5);
    ctx.fillRect(p.x + 3, p.y - p.h * 0.8, 2, p.h * 0.3);
    const lit = 1 - st.out;
    if (lit > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawFlame(ctx, p.x, p.y - p.h - 1, 1.6, st.gain * lit, c.seed * 10 + i, t, S.red);
      ctx.restore();
    } else {
      // Glowing wick.
      ctx.fillStyle = `rgba(255,90,30,${Math.max(0, 0.8 - st.smokeAge * 0.03)})`;
      ctx.fillRect(p.x - 1, p.y - p.h - 3, 2, 3);
    }
    drawSmoke(ctx, p.x, p.y - p.h - 3, 1, st.smokeAge, c.seed * 10 + i);
  });
  return s;
};

type Prop = {kind: 'pew' | 'pewFallen' | 'skull' | 'femur' | 'ribs' | 'rubble' | 'helm'; x: number; d: number; r?: number; flip?: boolean};

const PROPS: Prop[] = [
  {kind: 'pew', x: -760, d: 1.55},
  {kind: 'pewFallen', x: -420, d: 1.28},
  {kind: 'pew', x: 280, d: 1.75},
  {kind: 'pewFallen', x: 540, d: 1.42, flip: true},
  {kind: 'rubble', x: 110, d: 1.48},
  {kind: 'skull', x: -180, d: 1.2},
  {kind: 'femur', x: -130, d: 1.22, r: 20},
  {kind: 'ribs', x: 360, d: 1.18},
  {kind: 'skull', x: 900, d: 1.3, flip: true},
  {kind: 'femur', x: 980, d: 1.12, r: -35},
  {kind: 'helm', x: 1040, d: 1.36},
  {kind: 'skull', x: 1260, d: 1.02, flip: true},
  {kind: 'femur', x: 700, d: 1.08, r: 60},
  {kind: 'rubble', x: 1000, d: 1.6},
  // Near the camera.
  {kind: 'skull', x: 420, d: 0.86},
  {kind: 'femur', x: 470, d: 0.84, r: -15},
  {kind: 'ribs', x: 1180, d: 0.9, flip: true},
  {kind: 'rubble', x: -260, d: 0.8},
  {kind: 'pewFallen', x: -700, d: 0.78},
  {kind: 'skull', x: 1420, d: 0.75},
  {kind: 'rubble', x: 1600, d: 0.7},
];

const boneFill = (ctx: Ctx, x0: number, x1: number, lum: number) => {
  const g = ctx.createLinearGradient(0, -30, 0, 10);
  g.addColorStop(0, `rgb(${Math.round(200 * lum)},${Math.round(192 * lum)},${Math.round(176 * lum)})`);
  g.addColorStop(1, `rgb(${Math.round(70 * lum)},${Math.round(60 * lum)},${Math.round(50 * lum)})`);
  void x0;
  void x1;
  return g;
};

const drawProp = (ctx: Ctx, p: Prop, S: EnvState) => {
  const {cam} = S;
  setPlane(ctx, cam, p.d);
  ctx.save();
  ctx.translate(p.x, 0);
  if (p.flip) ctx.scale(-1, 1);
  // Near props sit in the front layer, which skips the set's darkening pass:
  // light them lower so the bones lie in the gloom rather than on top of it.
  const near = p.d < 1;
  const lum = (0.3 + 0.16 * S.moon) * (near ? 0.5 : 1);
  // Contact shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 0, p.kind.startsWith('pew') ? 150 : 46, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  switch (p.kind) {
    case 'skull': {
      // Cranium tipped on its side, face toward +x, lit from above.
      const g = ctx.createRadialGradient(-4, -30, 2, 0, -14, 26);
      g.addColorStop(0, `rgb(${Math.round(150 * lum)},${Math.round(142 * lum)},${Math.round(128 * lum)})`);
      g.addColorStop(0.6, `rgb(${Math.round(92 * lum)},${Math.round(84 * lum)},${Math.round(72 * lum)})`);
      g.addColorStop(1, `rgb(${Math.round(30 * lum)},${Math.round(25 * lum)},${Math.round(20 * lum)})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.bezierCurveTo(-24, -20, -12, -34, 2, -32);
      ctx.bezierCurveTo(14, -31, 20, -24, 21, -15);
      ctx.lineTo(23, -9);
      ctx.lineTo(20, -2);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#070505';
      ctx.beginPath();
      ctx.ellipse(11, -17, 4.5, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, -12);
      ctx.lineTo(21, -8);
      ctx.lineTo(17, -8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(10 + k * 3, -4);
        ctx.lineTo(10 + k * 3, -1);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba('#b9c7d9', (near ? 0.14 : 0.3) * S.moon);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -26);
      ctx.bezierCurveTo(-6, -33, 6, -33, 14, -28);
      ctx.stroke();
      break;
    }
    case 'femur': {
      ctx.rotate(((p.r ?? 0) * Math.PI) / 180 * 0.15);
      ctx.fillStyle = boneFill(ctx, -40, 40, lum);
      ctx.fillRect(-40, -8, 80, 7);
      ctx.beginPath();
      ctx.arc(-42, -8, 6, 0, Math.PI * 2);
      ctx.arc(-40, -3, 5, 0, Math.PI * 2);
      ctx.arc(42, -7, 6, 0, Math.PI * 2);
      ctx.arc(40, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ribs': {
      // A broken run of ribs still hanging from a length of spine.
      ctx.fillStyle = boneFill(ctx, -40, 40, lum * 0.7);
      for (let k = 0; k < 6; k++) ctx.fillRect(-38 + k * 13, -7, 11, 6);
      ctx.strokeStyle = boneFill(ctx, -40, 40, lum);
      ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const x = -32 + k * 14;
        const h = 22 + (k % 2) * 8 + k * 2;
        ctx.lineWidth = 3.4 - k * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, -6);
        ctx.bezierCurveTo(x - 6, -h * 0.6, x + 10, -h, x + 22, -h * 0.72);
        ctx.stroke();
      }
      break;
    }
    case 'helm': {
      ctx.fillStyle = '#16171b';
      ctx.beginPath();
      ctx.ellipse(0, -20, 26, 22, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050404';
      ctx.fillRect(-6, -24, 24, 4);
      ctx.strokeStyle = rgba('#b9c7d9', 0.4 * S.moon);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -20, 24, -2.6, -1.2);
      ctx.stroke();
      break;
    }
    case 'rubble': {
      for (let k = 0; k < 7; k++) {
        const rx = rr(-70, 70, 300, k, p.x);
        const rs = rr(10, 28, 301, k, p.x);
        ctx.fillStyle = k % 2 ? '#1d1817' : '#262020';
        ctx.beginPath();
        ctx.moveTo(rx - rs, 0);
        ctx.lineTo(rx - rs * 0.6, -rs * 0.9);
        ctx.lineTo(rx + rs * 0.4, -rs);
        ctx.lineTo(rx + rs, 0);
        ctx.fill();
        ctx.fillStyle = rgba('#9aa6c0', (near ? 0.07 : 0.15) * S.moon);
        ctx.fillRect(rx - rs * 0.5, -rs * 0.95, rs * 0.8, 2);
      }
      break;
    }
    case 'pew':
    case 'pewFallen': {
      const wood = '#1b120d';
      const woodLit = '#2d1e15';
      ctx.fillStyle = wood;
      if (p.kind === 'pew') {
        // End panel with a carved poppy-head, seat and back receding.
        ctx.beginPath();
        ctx.moveTo(-60, 0);
        ctx.lineTo(-60, -120);
        ctx.quadraticCurveTo(-60, -150, -40, -150);
        ctx.lineTo(-30, -130);
        ctx.lineTo(-30, -58);
        ctx.lineTo(50, -58);
        ctx.lineTo(50, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = woodLit;
        ctx.fillRect(-30, -62, 84, 8);
      } else {
        // Toppled on its back: the end panel on its side, splintered.
        ctx.beginPath();
        ctx.moveTo(-120, 0);
        ctx.lineTo(-120, -44);
        ctx.lineTo(10, -60);
        ctx.lineTo(24, -40);
        ctx.lineTo(60, -54);
        ctx.lineTo(80, -30);
        ctx.lineTo(120, -34);
        ctx.lineTo(118, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = woodLit;
        ctx.beginPath();
        ctx.moveTo(-120, -44);
        ctx.lineTo(10, -60);
        ctx.lineTo(12, -54);
        ctx.lineTo(-120, -39);
        ctx.fill();
        // Splinters.
        ctx.strokeStyle = woodLit;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(118, -20);
        ctx.lineTo(140, -34);
        ctx.moveTo(116, -10);
        ctx.lineTo(146, -14);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,140,70,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------
// Dust motes, brighter where they cross a beam.

const drawDust = (ctx: Ctx, S: EnvState, shafts: Shaft[], dMin: number, dMax: number, count: number) => {
  const {cam, t} = S;
  screen(ctx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const d = rr(0.55, 2.4, i, 1);
    if (d < dMin || d >= dMax) continue;
    const span = 5000;
    const bx = rr(-1800, 3200, i, 2);
    const by = rr(-1500, -10, i, 3);
    const x = ((((bx + t * rr(0.05, 0.3, i, 4) + nz(t * 0.004, i * 0.37) * 140 + 1800) % span) + span) % span) - 1800;
    const y = by + nz2(t * 0.005, i * 0.41) * 90 + ((t * rr(0.02, 0.1, i, 5)) % 300);
    const [sx, sy] = proj(cam, x, y, d);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const s = sOf(cam, d);
    let lit = 0.1;
    for (const sh of shafts) {
      if (inConvex(sh.pts, sx, sy)) lit += sh.a * 3.2;
    }
    if (S.wave) {
      const dx = x - S.wave.x;
      const dy = y - S.wave.y;
      const r = Math.hypot(dx, dy);
      lit += Math.max(0, 1 - Math.abs(r - S.wave.r) / 200) * 0.6 * S.wave.a;
    }
    const tw = 0.7 + 0.3 * Math.sin(t * rr(0.05, 0.2, i, 6) + i);
    const a = Math.min(0.9, lit * tw);
    const r = rr(1.0, 2.4, i, 7) * s * (d < 0.9 ? 2.2 : 1);
    if (d < 0.9) {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.5);
      g.addColorStop(0, `rgba(230,225,215,${a * 0.5})`);
      g.addColorStop(1, 'rgba(230,225,215,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - r * 2.5, sy - r * 2.5, r * 5, r * 5);
    } else {
      ctx.fillStyle = `rgba(235,230,220,${a})`;
      ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
    }
  }
  ctx.restore();
};

/** Low mist lying on the floor. */
const drawMist = (ctx: Ctx, S: EnvState, dMin: number, dMax: number) => {
  const {cam, t} = S;
  screen(ctx);
  for (let i = 0; i < 12; i++) {
    const d = rr(0.7, 2.2, i, 40);
    if (d < dMin || d >= dMax) continue;
    const x = rr(-1500, 2800, i, 41) + t * rr(0.2, 0.6, i, 42) + nz(t * 0.003, i) * 100;
    const [sx, sy] = proj(cam, x, -30, d);
    const s = sOf(cam, d);
    const rx = rr(500, 900, i, 43) * s;
    const ry = rx * 0.12;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    const a = 0.07 * (0.6 + 0.4 * nz2(t * 0.01, i));
    g.addColorStop(0, `rgba(120,128,150,${a})`);
    g.addColorStop(1, 'rgba(120,128,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
};

// ---------------------------------------------------------------------------
// Foreground piers sliding past the lens.

const drawFgPillars = (ctx: Ctx, S: EnvState) => {
  const {cam} = S;
  if (cam.dolly > FG_PILLAR_D - 0.08) return;
  const s = setPlane(ctx, cam, FG_PILLAR_D);
  const b = planeBounds(cam, FG_PILLAR_D, 100);
  for (const x of FG_PILLARS) {
    const w = 230;
    if (x + w < b.x0 || x - w > b.x1) continue;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#040303');
    g.addColorStop(0.55, '#0c0909');
    g.addColorStop(0.9, '#141112');
    g.addColorStop(0.97, rgba('#6c7c9c', 0.6));
    g.addColorStop(1, '#050404');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, b.y0, w, -b.y0 + 10);
    ctx.fillStyle = '#060404';
    ctx.fillRect(x - w / 2 - 30, -120, w + 60, 130);
    ctx.fillStyle = 'rgba(255,120,50,0.08)';
    ctx.fillRect(x - w / 2 - 30, -124, w + 60, 5);
  }
  void s;
};

// ---------------------------------------------------------------------------

export type FrontLayer = 'back' | 'front';

/** Everything behind the fighters. */
export const paintBack = (ctx: Ctx, S: EnvState) => {
  K = ctx.getTransform().a;
  screen(ctx);
  ctx.fillStyle = '#030202';
  ctx.fillRect(0, 0, W, H);
  const shafts = shaftList(S);
  drawWall(ctx, S);
  drawArcade(ctx, S);
  drawFloor(ctx, S);
  drawMist(ctx, S, 1.4, 3);
  drawFloorLight(ctx, S, shafts);
  const far = [
    ...PROPS.filter((p) => p.d >= 1).map((p) => ({d: p.d, draw: () => drawProp(ctx, p, S)})),
    ...CANDELABRA.filter((c) => c.d >= 1).map((c) => ({d: c.d, draw: () => drawCandelabrum(ctx, c, S)})),
    {d: BANNER.d, draw: () => drawBanner(ctx, S)},
    {d: DAIS.dNear + 0.25, draw: () => drawDais(ctx, S)},
    {d: THRONE.d, draw: () => drawThrone(ctx, S)},
  ].sort((a, b) => b.d - a.d);
  for (const item of far) item.draw();
  screen(ctx);
  drawDust(ctx, S, shafts, 1, 3, 260);
  drawMist(ctx, S, 1, 1.4);
  // Sink the set a stop so the fighters and the light sources carry the frame
  // (black at partial opacity: the same darkening as a grey multiply, cheaper).
  const dim = ctx.createLinearGradient(0, 0, 0, H);
  dim.addColorStop(0, 'rgba(2,2,0,0.53)');
  dim.addColorStop(0.55, 'rgba(2,2,0,0.31)');
  dim.addColorStop(1, 'rgba(2,2,0,0.42)');
  ctx.fillStyle = dim;
  ctx.fillRect(0, 0, W, H);
};

/** Everything in front of the fighters. */
export const paintFront = (ctx: Ctx, S: EnvState) => {
  K = ctx.getTransform().a;
  screen(ctx);
  const shafts = shaftList(S);
  // The god rays fall over the fighters but behind the near props. For these
  // pale beams, laying light over transparent pixels is all but a screen.
  softPass(ctx, 'beams', 0.25, 'source-over', (b) => paintBeams(b, S, shafts));
  screen(ctx);
  const near = [
    ...PROPS.filter((p) => p.d < 1).map((p) => ({d: p.d, draw: () => drawProp(ctx, p, S)})),
    ...CANDELABRA.filter((c) => c.d < 1).map((c) => ({d: c.d, draw: () => drawCandelabrum(ctx, c, S)})),
  ].sort((a, b) => b.d - a.d);
  drawMist(ctx, S, 0.7, 1);
  for (const item of near) item.draw();
  drawFgPillars(ctx, S);
  drawDust(ctx, S, shafts, 0.5, 1, 260);
};

export {candlePositions};
