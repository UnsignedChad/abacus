// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Atmosphere, painted onto the lit frame before the palette pass: the dusk
// haze beyond the church (in E, so buildings occlude it), smoke, ground mist,
// the crows on the spire and the dust shaken loose by the rumble.

import {noise2D} from '@remotion/noise';
import {LW, P, S, cam, iso} from './iso';
import {RGB, rgb} from './paint';
import {hash} from './ground';
import {C, CHURCH, SPIRE_TIP, churchGlow} from './world';
import {wind} from './props';

/** Dusk haze filling the far distance behind the church. Drawn into E first. */
export const paintHaze = (E: CanvasRenderingContext2D, f: number) => {
  const g = churchGlow(f);
  const top = S(0, -80)[1];
  const bot = S(0, 120)[1];
  const lg = E.createLinearGradient(0, top, 0, bot);
  lg.addColorStop(0, 'rgb(40,30,54)');
  lg.addColorStop(0.45, 'rgb(30,22,40)');
  lg.addColorStop(1, 'rgba(20,14,26,0)');
  E.fillStyle = lg;
  E.fillRect(0, 0, LW, Math.max(0, bot));
  // The glow of the church bleeding into the mist behind it.
  const [cx, cy] = P(SPIRE_TIP[0], SPIRE_TIP[1], CHURCH.tower.h * 0.9);
  const r = 190 * cam.z;
  const rg = E.createRadialGradient(cx, cy, 0, cx, cy, r);
  const k = Math.min(1, 0.28 * g);
  rg.addColorStop(0, `rgba(110,24,20,${k})`);
  rg.addColorStop(0.5, `rgba(70,16,20,${k * 0.5})`);
  rg.addColorStop(1, 'rgba(40,10,20,0)');
  E.globalCompositeOperation = 'lighter';
  E.fillStyle = rg;
  E.fillRect(cx - r, cy - r, r * 2, r * 2);
  E.globalCompositeOperation = 'source-over';
};

type Puff = {x: number; y: number; z: number; seed: string; n: number; size: number; rate: number; col: RGB; a: number};

/** Smoke columns rising and leaning with the wind. */
export const paintSmoke = (F: CanvasRenderingContext2D, f: number, src: Puff) => {
  const [bx, by] = P(src.x, src.y, src.z);
  for (let i = 0; i < src.n; i++) {
    const period = src.rate * (0.85 + hash(i, 1, src.seed.length) * 0.3);
    const age = (f + hash(i, 2, src.seed.length * 3) * period) % period;
    const t = age / period;
    // Wind integrated over the puff's life bends the column.
    const w = wind(f - age * 0.5);
    const dx = (t * 26 * w + t * t * 22 * w + noise2D(src.seed + i, f * 0.02, i) * 5 * t) * src.size;
    const dy = -t * 70 * src.size;
    const r = (2.5 + t * 11) * src.size * cam.z;
    const a = src.a * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - t * 0.5);
    if (a <= 0.005) continue;
    const x = bx + dx * cam.z;
    const y = by + dy * cam.z;
    const gr = F.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgb(src.col, 1, a));
    gr.addColorStop(1, rgb(src.col, 1, 0));
    F.fillStyle = gr;
    F.fillRect(x - r, y - r, r * 2, r * 2);
  }
};

/** Low mist lying across the square and pooling around the churchyard. */
export const paintMist = (F: CanvasRenderingContext2D, f: number) => {
  for (let i = 0; i < 14; i++) {
    const s = 'mist' + i;
    const yard = i >= 8;
    const wx = (yard ? 1 + hash(i, 1, 101) * 12 : -2 + hash(i, 1, 101) * 26) + f * 0.006 * (1 + hash(i, 2, 101));
    const wy = yard ? -1 + hash(i, 3, 101) * 11 : -1 + hash(i, 3, 101) * 24;
    const [x, y] = P(wx, wy, 2);
    const rx = (50 + hash(i, 4, 101) * 70) * cam.z;
    const ry = rx * 0.28;
    const a = (yard ? 0.14 : 0.09) + 0.05 * noise2D(s, f * 0.01, 0);
    F.save();
    F.translate(x, y);
    F.scale(1, ry / rx);
    const gr = F.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(96,92,120,${a})`);
    gr.addColorStop(1, 'rgba(96,92,120,0)');
    F.fillStyle = gr;
    F.fillRect(-rx, -rx, rx * 2, rx * 2);
    F.restore();
  }
};

// --- Crows ---------------------------------------------------------------------

const CROWS = 9;

/** A crow as a handful of pixels; `flap` -1..1 raises and lowers the wings. */
const crow = (F: CanvasRenderingContext2D, x: number, y: number, flap: number, dir: number, perched: boolean) => {
  const z = cam.z * 1.35;
  F.fillStyle = 'rgb(8,6,8)';
  const r = (a: number, b: number, w: number, h: number) => F.fillRect(Math.round(x + a * z * dir - (dir < 0 ? w * z : 0)), Math.round(y + b * z), Math.ceil(w * z), Math.ceil(h * z));
  if (perched) {
    r(-1, -2, 3, 2);
    r(1, -3, 1.5, 1.5);
    r(-2, -1.5, 1.5, 1);
    return;
  }
  r(-1, -1, 3, 1.5);
  r(2, -1.5, 1, 1);
  const wy = Math.round(flap * 2.2);
  // Wings in a shallow V either side of the body.
  r(-3, -1 - wy * 0.5, 2, 1);
  r(-5, -1 - wy, 2, 1);
  r(1.5, -1.5 - wy * 0.5, 2, 1);
  r(3, -1.5 - wy, 2, 1);
};

/** Perches on the parapet and spire, in world space. */
const perch = (i: number): [number, number, number] => {
  const {tower} = CHURCH;
  const top = tower.h + 5;
  const spots: [number, number, number][] = [
    [tower.x1 + 0.05, tower.y1 - 0.4, top],
    [tower.x1 + 0.05, tower.y1 - 1.1, top],
    [tower.x0 + 0.5, tower.y1 + 0.08, top],
    [tower.x1 - 0.6, tower.y1 + 0.08, top],
    [tower.x0 + 1.3, tower.y1 + 0.08, top],
    [tower.x1 + 0.05, tower.y0 + 0.5, top],
    [SPIRE_TIP[0], SPIRE_TIP[1], SPIRE_TIP[2] - 10],
    [CHURCH.nave.x1 + 0.2, 3, CHURCH.nave.h + 2],
    [CHURCH.nave.x1 + 0.2, 5.2, CHURCH.nave.h + 2],
  ];
  return spots[i % spots.length];
};

export const paintCrows = (F: CanvasRenderingContext2D, f: number) => {
  for (let i = 0; i < CROWS; i++) {
    const [wx, wy, wz] = perch(i);
    const [px, py] = P(wx, wy, wz);
    const lift = C.churchRumble + Math.floor(hash(i, 1, 111) * 6);
    const t = f - lift;
    if (t < 0) {
      // Restless: the odd hop or head turn.
      const hop = noise2D('crowhop' + i, f * 0.05, 0) > 0.55 ? -1 : 0;
      crow(F, px, py + hop * cam.z, 0, hash(i, 2, 111) < 0.5 ? 1 : -1, true);
      continue;
    }
    const dir = hash(i, 3, 111) < 0.55 ? 1 : -1;
    const sp = 0.8 + hash(i, 4, 111) * 0.6;
    const x = px + dir * (t * 1.3 * sp + t * t * 0.012) * cam.z + noise2D('crowx' + i, t * 0.04, 0) * 6;
    const y = py - (t * 1.6 * sp - t * t * 0.006) * cam.z + noise2D('crowy' + i, t * 0.05, 0) * 4;
    const flap = Math.sin(t * (0.9 + hash(i, 5, 111) * 0.3));
    crow(F, x, y, flap, dir, false);
  }
  // Two crows circling the spire the whole time.
  for (let i = 0; i < 2; i++) {
    const a = f * 0.018 * (i ? -1 : 1) + i * 2.4;
    const [cx, cy] = iso(SPIRE_TIP[0], SPIRE_TIP[1], SPIRE_TIP[2] + 18 + i * 10);
    const [x, y] = S(cx + Math.cos(a) * (70 + i * 26), cy + Math.sin(a) * (16 + i * 6));
    crow(F, x, y, Math.sin(f * 0.35 + i * 2), Math.sin(a) > 0 ? -1 : 1, false);
  }
};

// --- Dust ------------------------------------------------------------------------

/** Mortar dust and grit shaken from the tower and eaves at the rumble. */
export const paintDust = (F: CanvasRenderingContext2D, f: number) => {
  const t0 = C.churchRumble;
  if (f < t0) return;
  const {tower, nave} = CHURCH;
  for (let i = 0; i < 150; i++) {
    const delay = hash(i, 1, 121) * 22;
    const t = f - t0 - delay;
    if (t < 0) continue;
    // Source: along the tower edges, parapet and the nave eave.
    const kind = i % 3;
    let wx: number;
    let wy: number;
    let wz: number;
    if (kind === 0) {
      wx = tower.x0 + hash(i, 2, 121) * (tower.x1 - tower.x0);
      wy = tower.y1 + 0.15;
      wz = tower.h + 2 - hash(i, 3, 121) * 30;
    } else if (kind === 1) {
      wx = tower.x1 + 0.15;
      wy = tower.y0 + hash(i, 2, 121) * (tower.y1 - tower.y0);
      wz = tower.h + 2 - hash(i, 3, 121) * 40;
    } else {
      wx = nave.x1 + 0.3;
      wy = nave.y0 + hash(i, 2, 121) * (nave.y1 - nave.y0);
      wz = nave.h;
    }
    const zNow = wz - 0.045 * t * t * (0.6 + hash(i, 4, 121) * 0.6);
    if (zNow < 0) continue;
    const [x, y] = P(wx, wy, zNow);
    const dx = noise2D('dust' + i, t * 0.05, 0) * 3 * cam.z;
    const a = Math.min(1, t / 3) * (1 - Math.min(1, t / 60));
    const big = hash(i, 5, 121) < 0.3;
    F.fillStyle = `rgba(${big ? '150,136,120' : '190,176,160'},${a * (big ? 0.95 : 0.7)})`;
    F.fillRect(Math.round(x + dx), Math.round(y), big ? 2 : 1, big ? 2 : 1);
  }
  // Billows of dust rolling out from the base.
  for (let i = 0; i < 6; i++) {
    const t = f - t0 - 4 - i * 1.5;
    if (t < 0) continue;
    const u = hash(i, 6, 121);
    const [x, y] = i < 3 ? P(tower.x0 + u * 2.8, tower.y1 + 0.3, 2) : P(nave.x1 + 0.6, nave.y0 + u * 7, 2);
    const r = (8 + t * 0.9) * cam.z;
    const a = 0.3 * Math.min(1, t / 6) * Math.max(0, 1 - t / 45);
    const gr = F.createRadialGradient(x, y - r * 0.3, 0, x, y - r * 0.3, r);
    gr.addColorStop(0, `rgba(120,100,96,${a})`);
    gr.addColorStop(1, 'rgba(120,100,96,0)');
    F.fillStyle = gr;
    F.fillRect(x - r, y - r * 1.3, r * 2, r * 2);
  }
};
