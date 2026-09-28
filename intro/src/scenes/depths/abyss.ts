// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// What lies under the seal: a vast vertical chasm seen from above. Strata of
// cavern wall recede toward a green glow far below; roots hang into the void
// with luminous tips; floating rock platforms, ancient octagonal rings and
// drifting spores pass the falling camera. Painted at 640x360 in painter's
// order (deepest first) with the same projection as the tile view.

import {noise2D} from '@remotion/noise';
import {Cam, K} from './camera';
import {SEAL} from './seal';
import {RGB, hash, mix, rgba} from './util';

export const LW = 640;
export const LH = 360;
const LS = 1920 / LW;
const NEAR = 14;

type P = {x: number; y: number; k: number};

const project = (cam: Cam, x: number, y: number, z: number): P | null => {
  const d = z - cam.c;
  if (d < NEAR) return null;
  const k = K / d;
  const dx = (x - cam.x) * k;
  const dy = (y - cam.y) * k;
  const cs = Math.cos(cam.rot);
  const sn = Math.sin(cam.rot);
  return {x: (cam.ax + dx * cs - dy * sn) / LS, y: (cam.ay + dx * sn + dy * cs) / LS, k: k / LS};
};

const BG: RGB = [2, 11, 8];
const NEAR_ROCK: RGB = [4, 5, 5];
const MID_ROCK: RGB = [8, 24, 19];
const FAR_ROCK: RGB = [16, 72, 52];
const hazeOf = (d: number) => 1 - Math.exp(-d / 7000);
/** Rock color at camera distance d: black up close, glowing green far down. */
const rockAt = (d: number, near: RGB = NEAR_ROCK): RGB => {
  const t = Math.pow(hazeOf(d), 1.25);
  return t < 0.5 ? mix(near, MID_ROCK, t * 2) : mix(MID_ROCK, FAR_ROCK, (t - 0.5) * 2);
};

// Cavern strata -------------------------------------------------------------------

type Ring = {z: number; pts: [number, number][]; rmin: number; i: number};

const RING_N = 56;
const ringZ = (i: number) => 80 * Math.pow(1.1, i);
const baseR = (z: number) => 1700 + 1500 * (1 - Math.exp(-z / 3000)) + 250 * Math.sin(z / 1700);
const axisOff = (z: number) => {
  const w = Math.min(1, z / 1500);
  return {x: 260 * noise2D('abx', z * 0.00025, 0) * w, y: 260 * noise2D('aby', z * 0.00025, 5) * w};
};

let rings: Ring[] | null = null;
const getRings = () => {
  if (rings) return rings;
  rings = [];
  for (let i = 0; i < RING_N; i++) {
    const z = ringZ(i);
    const R = baseR(z);
    const o = axisOff(z);
    const pts: [number, number][] = [];
    let rmin = Infinity;
    const n = 64;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      const r =
        R *
        (1 +
          0.2 * noise2D('ring', Math.cos(a) * 1.1 + i * 0.21, Math.sin(a) * 1.1 + i * 0.13) +
          0.07 * noise2D('ring2', Math.cos(a) * 3.5 + i * 0.5, Math.sin(a) * 3.5));
      rmin = Math.min(rmin, r);
      pts.push([SEAL.x + o.x + Math.cos(a) * r, SEAL.y + o.y + Math.sin(a) * r]);
    }
    rings.push({z, pts, rmin, i});
  }
  return rings;
};

// Roots ------------------------------------------------------------------------------

type Root = {z: number; pts: [number, number, number][]; w: number; glow: number};

const rootFrom = (x: number, y: number, z: number, inward: [number, number], len: number, seed: number): Root => {
  const pts: [number, number, number][] = [];
  const sway = (hash(seed, 1) - 0.5) * 0.6;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const curl = Math.sin(t * 5 + seed) * len * 0.12 * t;
    pts.push([
      x + inward[0] * len * 0.35 * t + (-inward[1] * sway * len * 0.3 + curl) * t,
      y + inward[1] * len * 0.35 * t + (inward[0] * sway * len * 0.3 + curl) * t,
      z + len * t,
    ]);
  }
  return {z, pts, w: 10 + hash(seed, 2) * 12, glow: hash(seed, 3)};
};

// Platforms ------------------------------------------------------------------------

type Platform = {
  x: number;
  y: number;
  z: number;
  r: number;
  thick: number;
  shape: number[];
  roots: Root[];
  monolith: boolean;
  seed: number;
};

const PLATFORMS: [number, number, number, number][] = [
  [-1300, 700, 1700, 360],
  [1400, -300, 2900, 420],
  [1100, 1200, 4600, 520],
  [-1500, -900, 5600, 560],
  [380, -160, 430, 170],
  [-520, 260, 720, 240],
  [180, 620, 1060, 210],
  [-330, -640, 1420, 300],
  [720, 360, 1900, 260],
  [-120, 90, 3900, 240],
  [-820, -120, 2500, 380],
  [320, -920, 3300, 340],
  [-260, 820, 4300, 420],
  [920, -420, 5200, 380],
  [-900, 620, 6400, 500],
  [120, 1100, 7700, 450],
  [-620, -1020, 9200, 520],
  [560, 380, 10800, 480],
];

let platforms: Platform[] | null = null;
const getPlatforms = () => {
  if (platforms) return platforms;
  platforms = PLATFORMS.map(([x, y, z, r], i) => {
    const shape = Array.from({length: 22}, (_, j) => 0.78 + 0.28 * hash(i, j, 300) + (j % 3 === 0 ? -0.12 * hash(i, j, 306) : 0));
    const roots: Root[] = [];
    const nr = 4 + Math.floor(hash(i, 301) * 4);
    for (let j = 0; j < nr; j++) {
      const a = hash(i, j, 302) * Math.PI * 2;
      const rr = r * (0.2 + 0.4 * hash(i, j, 303));
      roots.push(
        rootFrom(
          SEAL.x + x + Math.cos(a) * rr,
          SEAL.y + y + Math.sin(a) * rr,
          z + r * 0.7,
          [-Math.cos(a) * 0.2, -Math.sin(a) * 0.2],
          r * (1.2 + hash(i, j, 304) * 2.2),
          i * 17 + j,
        ),
      );
    }
    return {x: SEAL.x + x, y: SEAL.y + y, z, r, thick: r * 1.5, shape, roots, monolith: hash(i, 305) < 0.55, seed: i};
  });
  return platforms;
};

// Wall roots and far lights -------------------------------------------------------------

let wallRoots: Root[] | null = null;
const getWallRoots = () => {
  if (wallRoots) return wallRoots;
  wallRoots = [];
  const rs = getRings();
  for (let i = 4; i < RING_N - 6; i += 2) {
    const ring = rs[i];
    const n = 3;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(hash(i, j, 400) * ring.pts.length);
      const [px, py] = ring.pts[idx];
      const o = axisOff(ring.z);
      const cx = SEAL.x + o.x;
      const cy = SEAL.y + o.y;
      const dl = Math.hypot(px - cx, py - cy);
      const inward: [number, number] = [(cx - px) / dl, (cy - py) / dl];
      const len = 220 + ring.z * 0.16 * (0.5 + hash(i, j, 401));
      wallRoots.push(rootFrom(px + inward[0] * 20, py + inward[1] * 20, ring.z, inward, len, i * 31 + j));
    }
  }
  return wallRoots;
};

type Light = {x: number; y: number; z: number; b: number};
let lights: Light[] | null = null;
const getLights = () => {
  if (lights) return lights;
  lights = Array.from({length: 110}, (_, i) => {
    const a = hash(i, 500) * Math.PI * 2;
    const r = Math.sqrt(hash(i, 501)) * 1900;
    return {x: SEAL.x + Math.cos(a) * r, y: SEAL.y + Math.sin(a) * r, z: 7000 + hash(i, 502) * 8500, b: 0.4 + hash(i, 503) * 0.6};
  });
  return lights;
};

// Drawing ------------------------------------------------------------------------------

const pathOf = (ctx: CanvasRenderingContext2D, pts: P[]) => {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
};

// A key direction across the shaft, so one side of the chasm catches more of
// the glow than the other and the walls read as rock, not as contour lines.
const KEY = [Math.cos(0.8), Math.sin(0.8)];
const BOUNCE: RGB = [14, 52, 38];

/** Shade of one wall facet: faces turned toward the key light are brighter. */
const wallShade = (ring: Ring, j: number, ax: number, ay: number, bx: number, by: number) => {
  const o = axisOff(ring.z);
  const mx = (ax + bx) / 2 - SEAL.x - o.x;
  const my = (ay + by) / 2 - SEAL.y - o.y;
  const ml = Math.hypot(mx, my) + 1e-6;
  const facing = -(mx * KEY[0] + my * KEY[1]) / ml;
  return {lit: Math.max(0, facing), jitter: 0.75 + 0.5 * hash(ring.i, j, 710)};
};

const drawRing = (ctx: CanvasRenderingContext2D, cam: Cam, ring: Ring, f: number) => {
  const d = ring.z - cam.c;
  if (d < NEAR) return;
  const k = K / d;
  // Entirely off-screen (the camera is inside it)?
  if (ring.rmin * k > 1500 && d < 4000) return;
  const pts = ring.pts.map(([x, y]) => project(cam, x, y, ring.z)!);
  const col = rockAt(d);
  const t = hazeOf(d);
  ctx.beginPath();
  ctx.rect(-20, -20, LW + 40, LH + 40);
  pathOf(ctx, pts);
  ctx.fillStyle = rgba(col);
  ctx.fill('evenodd');
  // The wall between this ledge and the one above it: faceted rock bands,
  // lit from the side the key light comes from.
  const up = ring.i > 0 ? getRings()[ring.i - 1] : null;
  const du = up ? up.z - cam.c : 0;
  if (up && du > NEAR) {
    const upts = up.pts.map(([x, y]) => project(cam, x, y, up.z)!);
    const cu = rockAt(du);
    const n = pts.length;
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const {lit, jitter} = wallShade(ring, j, ring.pts[j][0], ring.pts[j][1], ring.pts[j1][0], ring.pts[j1][1]);
      const base = mix(cu, col, 0.5);
      const glowAmt = (0.25 + 0.75 * lit) * Math.pow(t, 0.6);
      const c: RGB = [
        base[0] * jitter * (0.4 + 0.9 * lit) + BOUNCE[0] * glowAmt,
        base[1] * jitter * (0.4 + 0.9 * lit) + BOUNCE[1] * glowAmt,
        base[2] * jitter * (0.4 + 0.9 * lit) + BOUNCE[2] * glowAmt,
      ];
      ctx.beginPath();
      ctx.moveTo(upts[j].x, upts[j].y);
      ctx.lineTo(upts[j1].x, upts[j1].y);
      ctx.lineTo(pts[j1].x, pts[j1].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.closePath();
      ctx.fillStyle = rgba(c);
      ctx.fill();
      // Seams between facets get a hairline so tiny gaps never flash through.
      ctx.strokeStyle = rgba(c);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  // Only some ledges catch the glow on their lip.
  if (ring.i % 3 === 1) {
    ctx.beginPath();
    pathOf(ctx, pts);
    ctx.strokeStyle = rgba(mix(col, [90, 220, 160], 0.1 + 0.25 * t * t), 0.35);
    ctx.lineWidth = Math.max(0.8, Math.min(3, 18 * k / LS));
    ctx.stroke();
  }
  if (ring.i % 7 === 3) {
    ctx.beginPath();
    pathOf(ctx, pts);
    ctx.strokeStyle = rgba([93, 255, 176], 0.05 + 0.1 * t);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Glowing lichen clinging to the wall.
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 2; j++) {
    const p = pts[Math.floor(hash(ring.i, j, 700) * pts.length)];
    const r = Math.max(1.2, Math.min(24, 60 * k / LS));
    const a = (0.25 + 0.3 * hash(ring.i, j, 701)) * (0.8 + 0.2 * Math.sin(f * 0.1 + j + ring.i));
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, rgba([170, 255, 210], a));
    g.addColorStop(0.3, rgba([93, 255, 176], a * 0.4));
    g.addColorStop(1, 'rgba(31,143,106,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
};

const drawRoot = (ctx: CanvasRenderingContext2D, cam: Cam, root: Root) => {
  const pts = root.pts.map(([x, y, z]) => project(cam, x, y, z));
  if (pts.some((p) => !p)) return;
  const ps = pts as P[];
  const d = root.z - cam.c;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < ps.length - 1; i++) {
    const t = i / (ps.length - 1);
    ctx.lineWidth = Math.max(0.7, root.w * (1 - t * 0.8) * ps[i].k);
    ctx.strokeStyle = rgba(mix(rockAt(d + root.pts[i][2] - root.z, [12, 10, 8]), [30, 110, 80], t * t * 0.5));
    ctx.beginPath();
    ctx.moveTo(ps[i].x, ps[i].y);
    ctx.lineTo(ps[i + 1].x, ps[i + 1].y);
    ctx.stroke();
  }
  // Luminous tip.
  ctx.globalCompositeOperation = 'lighter';
  const tip = ps[ps.length - 1];
  const glow = (0.45 + 0.55 * root.glow) * (1 - hazeOf(d) * 0.4);
  const r = Math.max(1.4, 38 * tip.k);
  const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, r * 2);
  g.addColorStop(0, rgba([225, 255, 238], 0.95 * glow));
  g.addColorStop(0.25, rgba([93, 255, 176], 0.45 * glow));
  g.addColorStop(1, 'rgba(31,143,106,0)');
  ctx.fillStyle = g;
  ctx.fillRect(tip.x - r * 2, tip.y - r * 2, r * 4, r * 4);
  ctx.globalCompositeOperation = 'source-over';
};

const polyAt = (cam: Cam, p: Platform, z: number, taper: number) => {
  const out: P[] = [];
  const n = p.shape.length;
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + p.seed;
    const r = p.r * p.shape[j] * taper;
    const q = project(cam, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, z);
    if (!q) return null;
    out.push(q);
  }
  return out;
};

const area = (pts: P[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const q = pts[(i + 1) % pts.length];
    a += pts[i].x * q.y - q.x * pts[i].y;
  }
  return a;
};

// The rock tapers from the top face down to a hanging point: [depth, taper].
const HULL: [number, number][] = [
  [0, 1],
  [0.28, 0.97],
  [0.48, 0.78],
  [0.72, 0.44],
  [1, 0.08],
];
const TOP: RGB = [11, 13, 12];
const UNDER_DARK: RGB = [12, 18, 16];
const UNDER_LIT: RGB = [44, 170, 120];

const drawPlatform = (ctx: CanvasRenderingContext2D, cam: Cam, p: Platform) => {
  if (p.z - cam.c < NEAR * 2) return;
  for (const r of p.roots) drawRoot(ctx, cam, r);
  const d = p.z - cam.c;
  const haze = hazeOf(d);
  const fog = (c: RGB, k = 0.8) => rgba(mix(c, rockAt(d), haze * k));
  const layers: P[][] = [];
  for (const [dz, tp] of HULL) {
    const poly = polyAt(cam, p, p.z + p.thick * dz, tp);
    if (!poly) return;
    layers.push(poly);
  }
  const top = layers[0];
  const c = project(cam, p.x, p.y, p.z);
  if (!c) return;
  const front = Math.sign(area(top));
  // Where the glow comes from on screen: the axis of the chasm.
  const cx0 = cam.ax / LS;
  const cy0 = cam.ay / LS;
  const n = top.length;
  // Cliff sides and the hanging underside, deepest band first. Only faces
  // turned toward the camera are drawn; they catch the glow from below.
  for (let l = layers.length - 2; l >= 0; l--) {
    const a = layers[l];
    const b = layers[l + 1];
    const low = (l + 0.5) / (layers.length - 1);
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const quad = [a[j], a[j1], b[j1], b[j]];
      if (Math.sign(area(quad)) === front) continue;
      const mx = (a[j].x + a[j1].x) / 2;
      const my = (a[j].y + a[j1].y) / 2;
      const nx = mx - c.x;
      const ny = my - c.y;
      const tx = cx0 - mx;
      const ty = cy0 - my;
      const facing = Math.max(0, (nx * tx + ny * ty) / (Math.hypot(nx, ny) * Math.hypot(tx, ty) + 1e-6));
      const jit = 0.8 + 0.4 * hash(p.seed, j, 340 + l);
      const lit = (0.3 + 0.7 * Math.pow(low, 0.6)) * (0.3 + 0.7 * facing) * jit;
      const col = mix(UNDER_DARK, UNDER_LIT, Math.min(1, lit));
      ctx.beginPath();
      ctx.moveTo(quad[0].x, quad[0].y);
      for (let v = 1; v < 4; v++) ctx.lineTo(quad[v].x, quad[v].y);
      ctx.closePath();
      ctx.fillStyle = fog(col, 0.7);
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }
  // The top: a near-black silhouette against the glowing depths, a low dome
  // of facets shaded from one side, brighter on the edge nearest the light.
  const keyA = Math.atan2(KEY[1], KEY[0]);
  for (let j = 0; j < n; j++) {
    const a = top[j];
    const b = top[(j + 1) % n];
    const fa = ((j + 0.5) / n) * Math.PI * 2 + p.seed + cam.rot;
    const sh = 0.8 + 0.35 * Math.cos(fa - keyA) + 0.1 * hash(p.seed, j, 320);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fillStyle = fog([TOP[0] * sh, TOP[1] * sh, TOP[2] * sh], 0.85);
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
  ctx.beginPath();
  pathOf(ctx, top);
  const dl = Math.hypot(cx0 - c.x, cy0 - c.y) + 1e-6;
  const rr = p.r * c.k;
  const ex = c.x + ((cx0 - c.x) / dl) * rr;
  const ey = c.y + ((cy0 - c.y) / dl) * rr;
  const lg = ctx.createLinearGradient(c.x - ((cx0 - c.x) / dl) * rr * 0.3, c.y - ((cy0 - c.y) / dl) * rr * 0.3, ex, ey);
  lg.addColorStop(0, 'rgba(20,70,52,0)');
  lg.addColorStop(1, rgba([26, 84, 62], 0.55 * (1 - haze * 0.5)));
  ctx.fillStyle = lg;
  ctx.fill();
  // Boulders strewn across the top: a cast shadow, a body, a lit crown.
  const lumps: [number, number, number, number, RGB][] = [
    [0.35, 0.35, 0, 1.1, [3, 5, 4]],
    [0, 0, 0.6, 1, [24, 28, 26]],
    [-0.2, -0.2, 1, 0.55, [42, 52, 47]],
  ];
  for (let m = 0; m < 7; m++) {
    const a = hash(p.seed, m, 330) * Math.PI * 2;
    const rr2 = p.r * 0.7 * Math.sqrt(hash(p.seed, m, 331));
    const bx = p.x + Math.cos(a) * rr2;
    const by = p.y + Math.sin(a) * rr2;
    const br = p.r * (0.05 + 0.08 * hash(p.seed, m, 332));
    for (const [ox, oy, zs, sc, col] of lumps) {
      const pts: P[] = [];
      for (let v = 0; v < 6; v++) {
        const va = (v / 6) * Math.PI * 2 + m;
        const q = project(cam, bx + (ox + Math.cos(va) * sc) * br, by + (oy + Math.sin(va) * sc) * br, p.z - br * zs);
        if (!q) break;
        pts.push(q);
      }
      if (pts.length < 6) continue;
      ctx.beginPath();
      pathOf(ctx, pts);
      ctx.fillStyle = fog(col, 0.85);
      ctx.fill();
    }
  }
  // Glowing moss in the cracks of the top.
  ctx.globalCompositeOperation = 'lighter';
  for (let m = 0; m < 5; m++) {
    const a = hash(p.seed, m, 350) * Math.PI * 2;
    const rr2 = p.r * 0.8 * Math.sqrt(hash(p.seed, m, 351));
    const q = project(cam, p.x + Math.cos(a) * rr2, p.y + Math.sin(a) * rr2, p.z);
    if (!q) continue;
    const r = Math.max(0.8, p.r * 0.07 * q.k);
    ctx.fillStyle = rgba([93, 255, 176], 0.35 * (1 - haze * 0.5));
    ctx.fillRect(q.x - r / 2, q.y - r / 2, r, r);
  }
  ctx.globalCompositeOperation = 'source-over';
  // Rim light: edges facing the glow below catch it hard.
  ctx.lineWidth = Math.max(1, Math.min(3, p.r * 0.035 * c.k));
  for (let j = 0; j < n; j++) {
    const a = top[j];
    const b = top[(j + 1) % n];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const nx = mx - c.x;
    const ny = my - c.y;
    const tx = cx0 - mx;
    const ty = cy0 - my;
    const facing = (nx * tx + ny * ty) / (Math.hypot(nx, ny) * Math.hypot(tx, ty) + 1e-6);
    const lit = Math.max(0, facing);
    if (lit < 0.05) continue;
    ctx.strokeStyle = rgba(mix([60, 140, 110], [180, 255, 220], lit), 0.75 * lit * (1 - haze * 0.4));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (p.monolith && p.z - p.r * 0.7 - cam.c > 800) {
    const s = p.r * 0.12;
    const h = p.r * 0.7;
    const ox = p.x + p.r * 0.15;
    const oy = p.y - p.r * 0.1;
    // A standing stone: four projected side faces (only those turned to the
    // camera), a pale cap and a glowing seam, all rolling with the world.
    const corner = (i: number, z: number, k = 1) => {
      const ca = (i / 4) * Math.PI * 2 + Math.PI / 4 + p.seed;
      return project(cam, ox + Math.cos(ca) * s * 1.41 * k, oy + Math.sin(ca) * s * 1.41 * k, z);
    };
    const base: P[] = [];
    const cap: P[] = [];
    for (let i = 0; i < 4; i++) {
      const b0 = corner(i, p.z);
      const c0 = corner(i, p.z - h, 0.85);
      if (!b0 || !c0) return;
      base.push(b0);
      cap.push(c0);
    }
    const capSign = Math.sign(area(cap));
    for (let i = 0; i < 4; i++) {
      const i1 = (i + 1) % 4;
      const face = [cap[i], cap[i1], base[i1], base[i]];
      if (Math.sign(area(face)) === capSign) continue;
      const shade = 0.6 + 0.6 * hash(p.seed, i, 360);
      ctx.beginPath();
      pathOf(ctx, face);
      ctx.fillStyle = rgba(mix([14 * shade, 30 * shade, 24 * shade], rockAt(d), haze * 0.8));
      ctx.fill();
    }
    ctx.beginPath();
    pathOf(ctx, cap);
    ctx.fillStyle = rgba(mix([50, 58, 54], rockAt(d), haze * 0.8));
    ctx.fill();
    const a = corner(0, p.z - h, 0.3);
    const b = corner(2, p.z - h, 0.3);
    const m = project(cam, ox, oy, p.z - h);
    if (a && b && m) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba([93, 255, 176], 0.9 * (1 - haze * 0.5));
      ctx.lineWidth = Math.max(1, s * 0.25 * m.k);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const r = Math.max(2, p.r * 0.6 * m.k);
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
      g.addColorStop(0, rgba([93, 255, 176], 0.3 * (1 - haze * 0.5)));
      g.addColorStop(1, 'rgba(31,143,106,0)');
      ctx.fillStyle = g;
      ctx.fillRect(m.x - r, m.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
};

type Construct = {z: number; R: number; spin: number; seed: number};
const CONSTRUCTS: Construct[] = [
  {z: 2950, R: 640, spin: 0.004, seed: 1},
  {z: 7400, R: 1150, spin: -0.0025, seed: 2},
];

const drawConstruct = (ctx: CanvasRenderingContext2D, cam: Cam, c: Construct, f: number) => {
  if (c.z - cam.c < NEAR * 3) return;
  const haze = hazeOf(c.z - cam.c);
  const th0 = f * c.spin + c.seed;
  const seg = (a0: number, a1: number, r0: number, r1: number, z: number) => {
    const pts: P[] = [];
    for (const [a, r] of [
      [a0, r0],
      [a1, r0],
      [a1, r1],
      [a0, r1],
    ]) {
      const q = project(cam, SEAL.x + Math.cos(a) * r, SEAL.y + Math.sin(a) * r, z);
      if (!q) return null;
      pts.push(q);
    }
    return pts;
  };
  const w = c.R * 0.09;
  for (let i = 0; i < 8; i++) {
    const a0 = th0 + (i * Math.PI) / 4 + 0.05;
    const a1 = th0 + ((i + 1) * Math.PI) / 4 - 0.05;
    for (let j = 0; j < 3; j++) {
      const z = c.z + (2 - j) * w * 0.6;
      const q = seg(a0, a1, c.R - w, c.R + w, z);
      if (!q) continue;
      ctx.beginPath();
      pathOf(ctx, q);
      ctx.fillStyle = rgba(mix(j === 2 ? [58, 64, 60] : [16, 24, 21], rockAt(c.z - cam.c), haze * 0.7));
      ctx.fill();
    }
    // Glowing inlay along the top.
    const q = seg(a0 + 0.04, a1 - 0.04, c.R - w * 0.18, c.R + w * 0.18, c.z);
    if (q) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      pathOf(ctx, q);
      const pulse = 0.65 + 0.35 * Math.sin(f * 0.12 + i * 0.8);
      ctx.fillStyle = rgba([93, 255, 176], (0.85 - haze * 0.4) * pulse);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
};

const drawLight = (ctx: CanvasRenderingContext2D, cam: Cam, l: Light, f: number) => {
  const q = project(cam, l.x, l.y, l.z);
  if (!q) return;
  const tw = 0.7 + 0.3 * Math.sin(f * 0.2 + l.x);
  const r = Math.max(1.5, 60 * q.k);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
  g.addColorStop(0, rgba([200, 255, 225], 0.85 * l.b * tw));
  g.addColorStop(0.35, rgba([93, 255, 176], 0.3 * l.b * tw));
  g.addColorStop(1, 'rgba(31,143,106,0)');
  ctx.fillStyle = g;
  ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'source-over';
};

const MOTES = 240;
const drawMotes = (ctx: CanvasRenderingContext2D, cam: Cam, prev: Cam, f: number) => {
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < MOTES; i++) {
    const a = hash(i, 600) * Math.PI * 2;
    const r = Math.sqrt(hash(i, 601)) * 1300;
    const span = 7000;
    const z = ((hash(i, 602) * span - f * 2.2) % span + span) % span + 60;
    const x = SEAL.x + Math.cos(a) * r + noise2D('mx', i, f * 0.01) * 40;
    const y = SEAL.y + Math.sin(a) * r + noise2D('my', i, f * 0.01) * 40;
    const q = project(cam, x, y, z);
    const q0 = project(prev, x, y, z + 2.2);
    if (!q || !q0) continue;
    const a0 = (1 - hazeOf(z - cam.c)) * (0.35 + 0.5 * hash(i, 603));
    if (a0 < 0.03) continue;
    ctx.strokeStyle = rgba([190, 255, 222], a0);
    ctx.lineWidth = Math.max(0.6, Math.min(3, 5 * q.k));
    ctx.beginPath();
    ctx.moveTo(q0.x, q0.y);
    ctx.lineTo(q.x + 0.01, q.y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
};

type Item = {z: number; draw: () => void};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const STEP = 12;

/** Ordered dither to a coarse palette, so the abyss shares the map's pixel grain. */
const dither = (ctx: CanvasRenderingContext2D) => {
  const img = ctx.getImageData(0, 0, LW, LH);
  const d = img.data;
  for (let y = 0; y < LH; y++) {
    const row = (y & 3) * 4;
    for (let x = 0; x < LW; x++) {
      const th = (BAYER[row + (x & 3)] / 16 - 0.47) * STEP;
      const i = (y * LW + x) * 4;
      // Stacked additive greens clip in G first and then drift to cyan; hold
      // blue under green so the light stays jade (white stays white).
      const bmax = 0.72 * d[i + 1] + 0.28 * d[i];
      if (d[i + 2] > bmax) d[i + 2] = bmax;
      d[i] =Math.round((d[i] + th) / STEP) * STEP;
      d[i + 1] = Math.round((d[i + 1] + th) / STEP) * STEP;
      d[i + 2] = Math.round((d[i + 2] + th) / STEP) * STEP;
    }
  }
  ctx.putImageData(img, 0, 0);
};

/** Paints the abyss into a 640x360 context for camera `cam`. */
export const paintAbyss = (ctx: CanvasRenderingContext2D, cam: Cam, prev: Cam, f: number) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgba(BG);
  ctx.fillRect(0, 0, LW, LH);
  // The distant source: a slow green furnace at the bottom of the world.
  const core = project(cam, SEAL.x, SEAL.y, 16500);
  if (core) {
    const r = 2200 * core.k;
    const breathe = 1 + 0.06 * Math.sin(f * 0.09);
    const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, r * 2.2 * breathe);
    g.addColorStop(0, 'rgba(236,255,244,1)');
    g.addColorStop(0.08, 'rgba(150,255,205,0.95)');
    g.addColorStop(0.25, 'rgba(60,200,140,0.55)');
    g.addColorStop(0.55, 'rgba(20,90,64,0.25)');
    g.addColorStop(1, 'rgba(3,20,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LW, LH);
    // Shafts of light fanning up from the source.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const a = hash(i, 900) * Math.PI * 2 + f * 0.003 * (hash(i, 901) - 0.5) + cam.rot;
      const w = 0.04 + 0.08 * hash(i, 902);
      const len = LW * (0.5 + 0.5 * hash(i, 903));
      const al = 0.05 + 0.06 * hash(i, 904);
      const lg = ctx.createLinearGradient(core.x, core.y, core.x + Math.cos(a) * len, core.y + Math.sin(a) * len);
      lg.addColorStop(0, rgba([150, 255, 205], al));
      lg.addColorStop(1, 'rgba(31,143,106,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(core.x, core.y);
      ctx.lineTo(core.x + Math.cos(a - w) * len, core.y + Math.sin(a - w) * len);
      ctx.lineTo(core.x + Math.cos(a + w) * len, core.y + Math.sin(a + w) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  const items: Item[] = [];
  for (const ring of getRings()) items.push({z: ring.z, draw: () => drawRing(ctx, cam, ring, f)});
  for (const r of getWallRoots()) items.push({z: r.z - 1, draw: () => drawRoot(ctx, cam, r)});
  for (const p of getPlatforms()) items.push({z: p.z, draw: () => drawPlatform(ctx, cam, p)});
  for (const l of getLights()) items.push({z: l.z, draw: () => drawLight(ctx, cam, l, f)});
  for (const c of CONSTRUCTS) items.push({z: c.z, draw: () => drawConstruct(ctx, cam, c, f)});
  items.sort((a, b) => b.z - a.z);
  for (const it of items) if (it.z - cam.c > NEAR) it.draw();
  drawMotes(ctx, cam, prev, f);
  dither(ctx);
  // Rising haze toward the core.
  if (core) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, LW * 0.42);
    g.addColorStop(0, 'rgba(40,160,110,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LW, LH);
    ctx.globalCompositeOperation = 'source-over';
  }
};
