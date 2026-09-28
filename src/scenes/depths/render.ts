// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Per-frame composition. The map is painted at native 32px resolution with
// field of view applied, then blitted through the camera with nearest
// neighbour sampling so tiles stay crisp at any zoom. Light is layered on top
// in screen space (smooth), and a cheap two-level bloom makes flames and
// runes glow.

import {noise2D} from '@remotion/noise';
import {easeIn, progress} from '../../lib/fx';
import {cues} from '../../theme';
import {LH, LW, paintAbyss} from './abyss';
import {Cam, camAt, shakeAt} from './camera';
import {
  DOOR,
  DOOR_STEP,
  MH,
  MONSTERS,
  MW,
  TORCHES,
  cellAt,
  memAmount,
  monsterAt,
  playerAt,
  sightAt,
  visAmount,
} from './map';
import {
  HOLE_R,
  SEAL,
  SEAL_ORIGIN,
  SEAL_SIZE,
  TRACE_SPEED,
  getTraces,
  sealCanvas,
  sealGlow,
  sealMemory,
  sealSplit,
} from './seal';
import {sprite} from './sprites';
import {bakedMap, doorSprites, drawFlame} from './tiles';
import {T, ctxOf, hash, makeCanvas, remembered} from './util';

const C = cues.depths;
const W = 1920;
const H = 1080;

let worldC: HTMLCanvasElement | null = null;
let lowC: HTMLCanvasElement | null = null;
let bloomA: HTMLCanvasElement | null = null;
let bloomB: HTMLCanvasElement | null = null;

const drawTile = (
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  sx: number,
  sy: number,
  dx: number,
  dy: number,
  a: number,
) => {
  if (a <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(src, sx, sy, T, T, dx, dy, T, T);
};

const drawSeal = (ctx: CanvasRenderingContext2D, f: number, vis: (i: number) => number, mem: (i: number) => number) => {
  const lit = sealCanvas(f);
  const memC = sealMemory(remembered);
  const split = sealSplit(f);
  if (split <= 0) {
    for (let cy = 0; cy < 5; cy++)
      for (let cx = 0; cx < 5; cx++) {
        const i = (SEAL_ORIGIN.y / T + cy) * MW + SEAL_ORIGIN.x / T + cx;
        const sx = cx * T;
        const sy = cy * T;
        const dx = SEAL_ORIGIN.x + sx;
        const dy = SEAL_ORIGIN.y + sy;
        drawTile(ctx, memC, sx, sy, dx, dy, mem(i));
        drawTile(ctx, lit, sx, sy, dx, dy, vis(i));
      }
    ctx.globalAlpha = 1;
    return;
  }
  // Open: the rim stays, the disc halves slide away under it.
  ctx.globalAlpha = 1;
  ctx.drawImage(lit, SEAL_ORIGIN.x, SEAL_ORIGIN.y);
  ctx.save();
  ctx.beginPath();
  ctx.arc(SEAL.x, SEAL.y, HOLE_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.clearRect(SEAL_ORIGIN.x, SEAL_ORIGIN.y, SEAL_SIZE, SEAL_SIZE);
  const half = SEAL_SIZE / 2;
  const d = Math.round(split);
  ctx.drawImage(lit, 0, 0, half, SEAL_SIZE, SEAL_ORIGIN.x - d, SEAL_ORIGIN.y, half, SEAL_SIZE);
  ctx.drawImage(lit, half, 0, half, SEAL_SIZE, SEAL.x + d, SEAL_ORIGIN.y, half, SEAL_SIZE);
  // The cut faces blaze.
  ctx.fillStyle = '#eafff4';
  ctx.fillRect(SEAL.x - d - 1, SEAL_ORIGIN.y, 1, SEAL_SIZE);
  ctx.fillRect(SEAL.x + d, SEAL_ORIGIN.y, 1, SEAL_SIZE);
  ctx.fillStyle = '#5dffb0';
  ctx.fillRect(SEAL.x - d - 2, SEAL_ORIGIN.y, 1, SEAL_SIZE);
  ctx.fillRect(SEAL.x + d + 1, SEAL_ORIGIN.y, 1, SEAL_SIZE);
  ctx.restore();
};

const drawTraces = (ctx: CanvasRenderingContext2D, f: number, vis: Uint8Array) => {
  if (f < C.runeHum) return;
  const run = (f - C.runeHum) * TRACE_SPEED;
  const pulseT = f - 240;
  ctx.globalAlpha = 1;
  for (const [ti, tr] of getTraces().entries()) {
    const L = run - tr.delay;
    if (L <= 0) continue;
    const n = Math.min(tr.px.length, Math.floor(L));
    for (let i = 0; i < n; i++) {
      const [x, y] = tr.px[i];
      if (!vis[Math.floor(y / T) * MW + Math.floor(x / T)]) continue;
      const age = L - i;
      ctx.fillStyle = age < 3 ? '#f4fff8' : age < 30 ? '#8dffc8' : '#3fd695';
      ctx.fillRect(x, y, 1, 1);
    }
    // Once lit, pulses of light run inward toward the seal.
    if (pulseT > 0 && n === tr.px.length) {
      const len = tr.px.length + 40;
      for (let p = 0; p < 2; p++) {
        const head = tr.px.length - ((pulseT * 4 + hash(ti, p, 7) * len + p * len * 0.5) % len);
        for (let j = 0; j < 6; j++) {
          const idx = Math.round(head + j);
          if (idx < 0 || idx >= tr.px.length) continue;
          const [x, y] = tr.px[idx];
          ctx.fillStyle = j < 2 ? '#ffffff' : '#c8ffe4';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
};

const drawObeliskGlyphs = (ctx: CanvasRenderingContext2D, f: number, vis: (i: number) => number) => {
  const g = sealGlow(f);
  for (let cy = 0; cy < MH; cy++)
    for (let cx = 0; cx < MW; cx++) {
      if (cellAt(cx, cy) !== 'obelisk') continue;
      const v = vis(cy * MW + cx);
      if (v <= 0) continue;
      for (let y = 7; y <= 19; y++) {
        if (hash(cx, cy, y) < 0.35) continue;
        ctx.globalAlpha = v * Math.min(1, 0.25 + g * 0.8);
        ctx.fillStyle = g > 0.9 ? '#b8ffdc' : '#5dffb0';
        ctx.fillRect(cx * T + 15, cy * T + y, hash(cx, cy, y + 50) < 0.5 ? 2 : 1, 1);
      }
    }
  ctx.globalAlpha = 1;
};

const drawHealth = (ctx: CanvasRenderingContext2D, x: number, y: number, hp: number) => {
  ctx.fillStyle = '#1a0606';
  ctx.fillRect(x + 3, y + 29, 26, 3);
  ctx.fillStyle = '#6a1010';
  ctx.fillRect(x + 4, y + 30, 24, 1);
  ctx.fillStyle = hp > 0.66 ? '#3ad13a' : '#d8c02a';
  ctx.fillRect(x + 4, y + 30, Math.round(24 * hp), 1);
};

/**
 * Where a monster is drawn, or null while out of view. A monster stepping
 * out of the unseen dark appears on its new tile at once, as in the game,
 * rather than sliding in over black.
 */
const shownAt = (moves: Parameters<typeof monsterAt>[0], f: number, visCur: Uint8Array) => {
  const p = monsterAt(moves, f);
  if (!visCur[p.ty * MW + p.tx]) return null;
  const seen = (x: number, y: number) => visCur[y * MW + x] === 1;
  const fx = Math.floor(p.x);
  const fy = Math.floor(p.y);
  const cx = Math.ceil(p.x);
  const cy = Math.ceil(p.y);
  if (seen(fx, fy) && seen(cx, cy) && seen(fx, cy) && seen(cx, fy)) return p;
  return {...p, x: p.tx, y: p.ty};
};

/** The map as it looks this frame, in native pixels. */
const paintWorld = (f: number) => {
  if (!worldC) worldC = makeCanvas(MW * T, MH * T);
  const ctx = ctxOf(worldC);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, worldC.width, worldC.height);
  const {lit, mem} = bakedMap();
  const s = sightAt(f);
  const vis = (i: number) => visAmount(s, i);
  const memA = (i: number) => memAmount(s, i);
  for (let cy = 0; cy < MH; cy++)
    for (let cx = 0; cx < MW; cx++) {
      const i = cy * MW + cx;
      const x = cx * T;
      const y = cy * T;
      drawTile(ctx, mem, x, y, x, y, memA(i));
      drawTile(ctx, lit, x, y, x, y, vis(i));
    }
  // Door.
  const doors = doorSprites();
  const di = DOOR.y * MW + DOOR.x;
  const open = s.k >= DOOR_STEP;
  drawTile(ctx, open ? doors.openMem : doors.closedMem, 0, 0, DOOR.x * T, DOOR.y * T, memA(di));
  drawTile(ctx, open ? doors.open : doors.closed, 0, 0, DOOR.x * T, DOOR.y * T, vis(di));
  ctx.globalAlpha = 1;
  drawSeal(ctx, f, vis, memA);
  drawTraces(ctx, f, s.visCur);
  drawObeliskGlyphs(ctx, f, vis);
  // Torches.
  for (const [tx, ty] of TORCHES) {
    // A torch shows only from the side it hangs on.
    const v = Math.min(vis(ty * MW + tx), vis((ty + 1) * MW + tx));
    if (v <= 0) continue;
    ctx.globalAlpha = v;
    drawFlame(ctx, tx * T + 15, ty * T + 16, f, tx * 7 + ty);
  }
  ctx.globalAlpha = 1;
  // Monsters, only while in view.
  for (const m of MONSTERS) {
    const p = shownAt(m.moves, f, s.visCur);
    if (!p) continue;
    const bob = m.kind === 'ghoul' ? (Math.floor(f / 14) % 2) : m.kind === 'rat' ? (Math.floor(f / 6) % 2) : 0;
    const x = Math.round(p.x * T);
    const y = Math.round(p.y * T);
    ctx.drawImage(sprite(m.kind), x, y + bob);
    drawHealth(ctx, x, y, m.hp);
    if (m.kind === 'skeleton' && f >= C.monsterSpotted) {
      // Spotted: a pulsing red frame, settling to a steady mark.
      const t = f - C.monsterSpotted;
      const a = t < 40 ? 0.55 + 0.45 * Math.cos(t * 0.5) : 0.55;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ff3a2a';
      const L = 7;
      for (const [cx, cy, sx, sy] of [
        [x, y, 1, 1],
        [x + 31, y, -1, 1],
        [x, y + 31, 1, -1],
        [x + 31, y + 31, -1, -1],
      ]) {
        ctx.fillRect(sx > 0 ? cx : cx - L + 1, cy, L, 1);
        ctx.fillRect(cx, sy > 0 ? cy : cy - L + 1, 1, L);
      }
      ctx.globalAlpha = 1;
    }
  }
  // The player.
  const pl = playerAt(f);
  ctx.drawImage(sprite('player'), Math.round(pl.x * T), Math.round(pl.y * T));
  return worldC;
};

// Screen space ------------------------------------------------------------------

const toScreen = (cam: Cam, wx: number, wy: number) => {
  const dx = (wx - cam.x) * cam.s;
  const dy = (wy - cam.y) * cam.s;
  const cs = Math.cos(cam.rot);
  const sn = Math.sin(cam.rot);
  return {x: cam.ax + dx * cs - dy * sn, y: cam.ay + dx * sn + dy * cs};
};

const glow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stops: [number, string][],
) => {
  if (r <= 1) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

const paintLights = (ctx: CanvasRenderingContext2D, f: number, cam: Cam) => {
  const s = sightAt(f);
  const zoom = progress(f, 168, 272);
  const near = cam.s < 30;
  const tile = T * Math.min(cam.s, 30);
  const pl = playerAt(f);
  const pp = near ? toScreen(cam, pl.x * T + 16, pl.y * T + 16) : {x: cam.ax, y: cam.ay};
  // Darkness pooling away from the adventurer.
  if (zoom < 1) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 1 - zoom;
    const g = ctx.createRadialGradient(pp.x, pp.y, tile * 1.2, pp.x, pp.y, tile * 9);
    g.addColorStop(0, 'rgb(255,242,226)');
    g.addColorStop(0.45, 'rgb(178,160,148)');
    g.addColorStop(1, 'rgb(74,68,76)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // In the rune chamber the light falls off away from the seal.
  if (zoom > 0 && near) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = zoom;
    const c = toScreen(cam, SEAL.x, SEAL.y + 20);
    const g = ctx.createRadialGradient(c.x, c.y, tile * 2, c.x, c.y, tile * 8.5);
    g.addColorStop(0, 'rgb(255,255,255)');
    g.addColorStop(0.5, 'rgb(170,186,182)');
    g.addColorStop(1, 'rgb(62,70,72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'lighter';
  if (near) {
    for (const [tx, ty] of TORCHES) {
      const v = Math.min(visAmount(s, ty * MW + tx), visAmount(s, (ty + 1) * MW + tx));
      if (v <= 0) continue;
      const fl = 0.8 + 0.2 * noise2D('torch', f * 0.15, tx) + 0.08 * Math.sin(f * 1.3 + tx);
      const f0 = toScreen(cam, tx * T + 16, ty * T + 12);
      glow(ctx, f0.x, f0.y, tile * 0.9, [
        [0, `rgba(255,190,110,${0.35 * fl * v})`],
        [1, 'rgba(255,120,40,0)'],
      ]);
      const c = toScreen(cam, tx * T + 16, ty * T + 56);
      glow(ctx, c.x, c.y, tile * 3.2 * (0.95 + 0.05 * fl), [
        [0, `rgba(255,150,60,${0.34 * fl * v})`],
        [0.4, `rgba(220,90,30,${0.14 * fl * v})`],
        [1, 'rgba(120,30,10,0)'],
      ]);
    }
    // A faint warm lantern on the adventurer.
    glow(ctx, pp.x, pp.y, tile * 2.6, [
      [0, 'rgba(255,200,130,0.12)'],
      [1, 'rgba(255,160,90,0)'],
    ]);
    // The skeletal warrior, marked when it steps into view.
    const sk = shownAt(MONSTERS[0].moves, f, s.visCur);
    if (f >= C.monsterSpotted && sk) {
      const t = f - C.monsterSpotted;
      const a = 0.14 + 0.3 * Math.exp(-t / 14);
      const c = toScreen(cam, sk.x * T + 16, sk.y * T + 16);
      glow(ctx, c.x, c.y, tile * 1.6, [
        [0, `rgba(255,60,40,${a})`],
        [1, 'rgba(160,10,10,0)'],
      ]);
    }
    // The seal's breath of green light.
    const si = (SEAL.y / T | 0) * MW + (SEAL.x / T | 0);
    const seen = Math.max(memAmount(s, si), f >= C.runeHum ? 1 : 0) * (1 - progress(f, 286, 300));
    if (seen > 0) {
      const g = sealGlow(f);
      const c = toScreen(cam, SEAL.x, SEAL.y);
      glow(ctx, c.x, c.y, tile * (4 + 3 * Math.min(1.3, g)), [
        [0, `rgba(93,255,176,${(0.05 + 0.36 * g) * seen})`],
        [0.4, `rgba(31,143,106,${(0.03 + 0.14 * g) * seen})`],
        [1, 'rgba(10,60,40,0)'],
      ]);
    }
  }
  // Dust hanging in the air; in the rune chamber, green motes rise once it wakes.
  if (near) {
    const wake = progress(f, C.runeHum, C.runeHum + 30);
    for (let i = 0; i < 90; i++) {
      const wx = hash(i, 1000) * MW * T;
      const wy0 = hash(i, 1001) * MH * T;
      const cx = Math.floor(wx / T);
      const inChamber = cellAt(cx, Math.floor(wy0 / T)) === 'rune';
      const rise = inChamber ? f * (0.15 + 0.5 * wake) : f * 0.05;
      const wy = wy0 - (rise % 64) + noise2D('dust', i, f * 0.01) * 6;
      const x = wx + noise2D('dustx', i, f * 0.008) * 10;
      const cell = Math.floor(wy / T) * MW + Math.floor(x / T);
      if (cell < 0 || cell >= MW * MH || !s.visCur[cell]) continue;
      const a = (0.18 + 0.3 * hash(i, 1002)) * (0.6 + 0.4 * Math.sin(f * 0.07 + i));
      const q = toScreen(cam, x, wy);
      const sz = Math.max(1.5, cam.s * 0.9);
      ctx.fillStyle = inChamber && wake > 0 ? `rgba(150,255,200,${a * (0.4 + wake)})` : `rgba(255,214,160,${a * 0.7})`;
      ctx.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz);
    }
  }
  // Light pouring out of the opened seal.
  const pour = progress(f, C.runeDoorOpen, C.runeDoorOpen + 6) * (1 - progress(f, 292, 304));
  if (pour > 0 && near) {
    const c = near ? toScreen(cam, SEAL.x, SEAL.y) : {x: cam.ax, y: cam.ay};
    const hr = HOLE_R * Math.min(cam.s, 30);
    const open = sealSplit(f) / 80;
    glow(ctx, c.x, c.y, hr * (1.6 + open * 1.4), [
      [0, `rgba(226,255,226,${0.22 * pour * (1 - 0.6 * open)})`],
      [0.4, `rgba(120,255,170,${0.3 * pour})`],
      [0.55, `rgba(80,240,150,${0.2 * pour})`],
      [1, 'rgba(31,143,106,0)'],
    ]);
    // God rays fanning out of the shaft.
    for (let i = 0; i < 30; i++) {
      const a = hash(i, 800) * Math.PI * 2 + f * 0.004 * (hash(i, 801) - 0.5);
      const len = hr * (1.8 + 3.2 * hash(i, 802)) * (0.6 + open);
      const wdt = 0.03 + 0.07 * hash(i, 803);
      const al = pour * (0.06 + 0.12 * hash(i, 804)) * (0.7 + 0.3 * Math.sin(f * 0.3 + i));
      const g = ctx.createLinearGradient(c.x, c.y, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len);
      g.addColorStop(0, `rgba(200,255,210,${al})`);
      g.addColorStop(1, 'rgba(80,240,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(a + 1.57) * hr * 0.2 * open, c.y + Math.sin(a + 1.57) * hr * 0.2 * open);
      ctx.lineTo(c.x + Math.cos(a - wdt) * len, c.y + Math.sin(a - wdt) * len);
      ctx.lineTo(c.x + Math.cos(a + wdt) * len, c.y + Math.sin(a + wdt) * len);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Rushing toward the light at the bottom.
  const rush = progress(f, 322, C.flash, easeIn);
  if (rush > 0) {
    glow(ctx, cam.ax, cam.ay, 1400, [
      [0, `rgba(226,255,228,${0.7 * rush})`],
      [0.4, `rgba(84,245,160,${0.35 * rush})`],
      [1, `rgba(31,143,106,${0.1 * rush})`],
    ]);
  }
  ctx.globalCompositeOperation = 'source-over';
};

const bloom = (ctx: CanvasRenderingContext2D, screen: HTMLCanvasElement, strength: number) => {
  if (!bloomA) bloomA = makeCanvas(240, 135);
  if (!bloomB) bloomB = makeCanvas(60, 34);
  const a = ctxOf(bloomA);
  const b = ctxOf(bloomB);
  a.globalCompositeOperation = 'copy';
  a.imageSmoothingEnabled = true;
  a.drawImage(screen, 0, 0, 240, 135);
  // Squaring twice keeps only the bright parts: a cheap threshold.
  a.globalCompositeOperation = 'multiply';
  a.drawImage(bloomA, 0, 0);
  a.drawImage(bloomA, 0, 0);
  // Adding bloom clips green first and pushes the glow toward cyan; trim
  // its blue so the light stays jade (and firelight stays warm).
  a.fillStyle = 'rgb(240,255,165)';
  a.fillRect(0, 0, 240, 135);
  b.globalCompositeOperation = 'copy';
  b.imageSmoothingEnabled = true;
  b.drawImage(bloomA, 0, 0, 60, 34);
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = strength;
  ctx.drawImage(bloomA, 0, 0, W, H);
  ctx.globalAlpha = strength * 0.9;
  ctx.drawImage(bloomB, 0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
};

export const renderFrame = (ctx: CanvasRenderingContext2D, screen: HTMLCanvasElement, f: number) => {
  const sh = shakeAt(f);
  const cam = camAt(f);
  const prev = camAt(f - 1);
  cam.ax += sh.x;
  cam.ay += sh.y;
  prev.ax += sh.x;
  prev.ay += sh.y;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (f >= C.runeDoorOpen) {
    if (!lowC) lowC = makeCanvas(LW, LH);
    paintAbyss(ctxOf(lowC), cam, prev, f);
    ctx.save();
    if (cam.s < 40) {
      // While the floor is still in frame, the abyss shows only through the hole.
      ctx.translate(cam.ax, cam.ay);
      ctx.rotate(cam.rot);
      ctx.scale(cam.s, cam.s);
      ctx.translate(-cam.x, -cam.y);
      ctx.beginPath();
      ctx.arc(SEAL.x, SEAL.y, HOLE_R, 0, Math.PI * 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lowC, 0, 0, W, H);
    ctx.restore();
  }
  if (cam.s < 40) {
    const world = paintWorld(f);
    ctx.save();
    ctx.translate(cam.ax, cam.ay);
    ctx.rotate(cam.rot);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(world, 0, 0);
    ctx.restore();
  }
  paintLights(ctx, f, cam);
  const strength = 0.45 + 0.35 * progress(f, C.runeHum - 10, C.runeHum + 10) - 0.4 * progress(f, 288, 300);
  bloom(ctx, screen, strength);
  if (f >= C.runeDoorOpen) jadeGuard(ctx);
};

/**
 * Stacked additive greens clip in G first, then blue keeps climbing and the
 * hottest light turns cyan. Ease blue back under green so it stays jade;
 * whites and warm colors are untouched.
 */
const jadeGuard = (ctx: CanvasRenderingContext2D) => {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const b = d[i + 2];
    const bmax = 0.66 * d[i + 1] + 0.34 * d[i];
    if (b > bmax) d[i + 2] = bmax + (b - bmax) * 0.2;
  }
  ctx.putImageData(img, 0, 0);
};
