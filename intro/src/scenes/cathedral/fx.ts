// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Particles and impact effects, painted on a canvas above the fighters. Every
// particle is a closed-form function of its age in action time, so slow motion
// makes sparks and dust hang in the air for free. `shutter` is how much action
// time one real frame covers, which sets the length of the motion streaks.

import {Cam, proj, sOf} from './camera';
import {outerOf} from './Figures';
import {duelAt, kingAt, toWorld} from './choreo';
import {GS} from './king';
import {SHIELD_HIT} from './knight';
import {ap, mul, ramp, Vec} from './rig';
import {T} from './time';
import {nz, rnd, rr} from './util';

type Ctx = CanvasRenderingContext2D;
export type W3 = {x: number; y: number; d: number};

const memo = <V>(fn: () => V) => {
  let v: V | undefined;
  return () => {
    if (v === undefined) v = fn();
    return v;
  };
};

/** Where the greatsword meets the shield at the parry frame. */
export const parryPoint = memo((): W3 => {
  const {knight} = duelAt(T.parry);
  const w = toWorld(knight, ap(knight.W.shield, SHIELD_HIT[0], SHIELD_HIT[1]));
  return {x: w[0], y: w[1], d: knight.d};
});

/** Where the riposte bites into the ribs. */
export const ripostePoint = memo((): W3 => {
  const {king} = duelAt(T.riposte);
  const w = toWorld(king, ap(king.W.chest, 8, -56));
  return {x: w[0], y: w[1], d: king.d};
});

/** The king's head as he roars. */
export const roarPoint = memo((): W3 => {
  const g = kingAt(T.roar + 8);
  const w = toWorld(g, ap(g.W.head, 18, -30));
  return {x: w[0], y: w[1], d: g.d};
});

const tipCache = new Map<number, W3>();
/** World position of the greatsword's point at action time t (quantised). */
export const kingTipAt = (t: number): W3 => {
  const key = Math.round(t * 4) / 4;
  const hit = tipCache.get(key);
  if (hit) return hit;
  const g = kingAt(key);
  const w = toWorld(g, ap(g.W.sword, 0, GS.tip));
  const v = {x: w[0], y: w[1], d: g.d};
  if (tipCache.size > 4000) tipCache.clear();
  tipCache.set(key, v);
  return v;
};

// ---------------------------------------------------------------------------

type Spark = {
  o: W3;
  vx: number;
  vy: number;
  life: number;
  drag: number;
  grav: number;
  size: number;
};

const sparkPos = (s: Spark, a: number) => {
  const e = (1 - Math.exp(-s.drag * a)) / s.drag;
  let y = s.o.y + s.vy * e + 0.5 * s.grav * a * a;
  // Skitter on the flagstones.
  if (y > 0) y = -y * 0.25;
  return [s.o.x + s.vx * e, y] as const;
};

const sparkColor = (u: number, a: number) => {
  if (u < 0.1) return `rgba(255,244,210,${a})`;
  if (u < 0.35) return `rgba(255,196,96,${a})`;
  if (u < 0.65) return `rgba(255,126,40,${a})`;
  return `rgba(214,56,18,${a})`;
};

const drawSpark = (ctx: Ctx, cam: Cam, s: Spark, age: number, shutter: number) => {
  if (age < 0 || age > s.life) return;
  const u = age / s.life;
  const [x1, y1] = sparkPos(s, age);
  const [x0, y0] = sparkPos(s, Math.max(0, age - shutter));
  const p1 = proj(cam, x1, y1, s.o.d);
  const p0 = proj(cam, x0, y0, s.o.d);
  const k = sOf(cam, s.o.d);
  const a = Math.pow(1 - u, 1.2);
  const w = Math.max(0.8, s.size * k * (1 - u * 0.6));
  ctx.strokeStyle = sparkColor(Math.min(1, u + 0.25), a * 0.35);
  ctx.lineWidth = w * 3.2;
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  ctx.lineTo(p1[0] + 0.01, p1[1] + 0.01);
  ctx.stroke();
  ctx.strokeStyle = sparkColor(u, a);
  ctx.lineWidth = w;
  ctx.stroke();
};

const glow = (ctx: Ctx, x: number, y: number, r: number, color: string, a: number) => {
  if (a <= 0.003 || r <= 0.5) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', String(a)));
  g.addColorStop(0.25, color.replace('A', String(a * 0.45)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

// ---------------------------------------------------------------------------

export type FxState = {
  f: number;
  t: number;
  cam: Cam;
  shutter: number; // action time per real frame
  embers: number; // phase two
};

/** The parry: a fan of sparks thrown back along the deflected blade. */
const parryBurst = (ctx: Ctx, S: FxState) => {
  const age = S.t - T.parry;
  if (age < 0 || age > 90) return;
  const o = parryPoint();
  const [px, py] = proj(S.cam, o.x, o.y, o.d);
  const k = sOf(S.cam, o.d);
  // White-hot core and a short anamorphic streak.
  const core = Math.max(0, 1 - age / 5);
  glow(ctx, px, py, 170 * k * (0.5 + core), 'rgba(255,190,110,A)', 0.7 * core);
  glow(ctx, px, py, 42 * k, 'rgba(255,250,235,A)', core);
  glow(ctx, px, py, 90 * k, 'rgba(255,150,60,A)', 0.4 * Math.max(0, 1 - age / 14));
  if (core > 0) {
    const w = 150 * k;
    const g = ctx.createLinearGradient(px - w, 0, px + w, 0);
    g.addColorStop(0, 'rgba(255,220,170,0)');
    g.addColorStop(0.5, `rgba(255,244,225,${0.7 * core})`);
    g.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - w, py - 2 * k, w * 2, 4 * k);
  }
  // A soft shock ring racing out of the clash.
  for (const [delay, speed, width, a0] of [
    [0, 30, 38, 0.45],
    [1, 20, 22, 0.3],
  ] as const) {
    const a = age - delay;
    if (a < 0 || a > 10) continue;
    const r = (30 + speed * a) * k;
    const wdt = width * k;
    const R = r + wdt;
    const fade = Math.pow(1 - a / 10, 1.6) * a0;
    const g = ctx.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(Math.max(0, (r - wdt) / R), 'rgba(255,230,190,0)');
    g.addColorStop(r / R, `rgba(255,236,205,${fade})`);
    g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - R, py - R, R * 2, R * 2);
  }
  // The flash: a ring of very fast, short-lived sparks. Even at 15% speed they
  // clear the core within a few frames, so the blow reads as a radial burst
  // from the first frame of the slow motion.
  for (let i = 0; i < 64; i++) {
    // Scattered, not a tidy star: most fly back up along the deflected blade.
    const ang = rnd(i, 5, 801) < 0.6 ? rr(-2.6, -0.2, i, 1, 801) : rr(0, Math.PI * 2, i, 6, 801);
    const sp = rr(45, 160, i, 2, 801);
    drawSpark(
      ctx,
      S.cam,
      {o, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rr(3, 7.5, i, 3, 801), drag: rr(0.25, 0.4, i, 7, 801), grav: 0.2, size: rr(1.4, 3, i, 4, 801)},
      age - rr(0, 0.4, i, 8, 801),
      S.shutter * 1.6 + 0.3,
    );
  }
  // Sparks: mostly flung up and back toward the king, some raining forward.
  // They hang in the slow motion, then burn out before they can scatter
  // across the whole frame.
  for (let i = 0; i < 240; i++) {
    const back = rnd(i, 1, 800) < 0.72;
    const ang = back ? rr(-2.3, -0.1, i, 2, 800) : rr(-3.4, 1.0, i, 3, 800);
    const sp = rr(10, 44, i, 4, 800) * (rnd(i, 5, 800) < 0.15 ? 1.5 : 1);
    const s: Spark = {
      o,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      life: rr(14, 44, i, 6, 800),
      drag: rr(0.08, 0.17, i, 7, 800),
      grav: 0.32,
      size: rr(1.4, 3.2, i, 8, 800),
    };
    drawSpark(ctx, S.cam, s, age - rr(0, 1.5, i, 9, 800), S.shutter * 1.4 + 0.25);
  }
};

/** Sparks where the dragged greatsword scrapes stone, and the glowing scratch. */
const dragSparks = (ctx: Ctx, S: FxState) => {
  const t0 = 212;
  const t1 = 288;
  if (S.t < t0 || S.t > t1 + 20) return;
  // The scratch: a fading line through recent tip positions.
  ctx.lineCap = 'round';
  let prev: [number, number] | null = null;
  for (let a = 0; a <= 22; a += 1) {
    const tt = Math.floor(S.t) - a;
    if (tt < t0 || tt > t1) {
      prev = null;
      continue;
    }
    const p = kingTipAt(tt);
    const q = proj(S.cam, p.x, p.y, p.d);
    if (prev) {
      ctx.strokeStyle = `rgba(255,${130 - a * 3},40,${0.6 * (1 - a / 22)})`;
      ctx.lineWidth = 2.2 * (1 - a / 30);
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }
    prev = [q[0], q[1]];
  }
  // Sparks: a few kicked up every frame at the point.
  for (let e = Math.floor(S.t) - 18; e <= S.t; e++) {
    if (e < t0 || e > t1) continue;
    const o = kingTipAt(e);
    const n = 3 + Math.floor(rnd(e, 0, 810) * 3);
    for (let j = 0; j < n; j++) {
      const ang = rr(-2.9, -1.6, e, j, 811) + Math.PI * 0.08;
      const sp = rr(3, 11, e, j, 812);
      drawSpark(
        ctx,
        S.cam,
        {o, vx: Math.cos(ang) * sp + 3, vy: Math.sin(ang) * sp, life: rr(6, 16, e, j, 813), drag: 0.1, grav: 0.4, size: 1.5},
        S.t - e - rr(0, 1, e, j, 814),
        S.shutter * 1.2,
      );
    }
    const q = proj(S.cam, o.x, o.y, o.d);
    if (e === Math.floor(S.t)) glow(ctx, q[0], q[1], 40, 'rgba(255,160,70,A)', 0.55);
  }
};

/** The roar: a pressure ring, a blast of dust along the floor. */
const roarWave = (ctx: Ctx, S: FxState) => {
  const age = S.t - T.roar;
  if (age < 0 || age > 60) return;
  const o = roarPoint();
  const [px, py] = proj(S.cam, o.x, o.y, o.d);
  const k = sOf(S.cam, o.d);
  for (const [delay, speed, width, a0] of [
    [0, 62, 90, 0.16],
    [4, 50, 60, 0.12],
  ] as const) {
    const a = age - delay;
    if (a < 0 || a > 40) continue;
    const r = (60 + speed * a) * k;
    const wdt = width * k;
    const R = r + wdt;
    const fade = Math.pow(1 - a / 40, 1.5) * a0;
    const g = ctx.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(Math.max(0, (r - wdt) / R), 'rgba(255,190,160,0)');
    g.addColorStop(Math.max(0, (r - wdt * 0.2) / R), `rgba(255,205,175,${fade})`);
    g.addColorStop(r / R, `rgba(255,230,210,${fade * 1.4})`);
    g.addColorStop(1, 'rgba(255,190,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - R, py - R, R * 2, R * 2);
  }
  // Floor dust racing outward from his feet.
  const g = kingAt(T.roar);
  for (let i = 0; i < 26; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const sp = rr(14, 34, i, 1, 820);
    const dd = rr(-0.12, 0.12, i, 2, 820);
    const a = age - rr(0, 6, i, 3, 820);
    if (a < 0) continue;
    const x = g.x + dir * (40 + sp * (1 - Math.exp(-a * 0.08)) / 0.08);
    const y = -72 - rr(10, 60, i, 4, 820) * (1 - Math.exp(-a * 0.05));
    const q = proj(S.cam, x, y, g.d + dd);
    const r = (40 + a * 4) * sOf(S.cam, g.d + dd);
    const fade = Math.max(0, 1 - a / 45) * 0.1;
    const gg = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
    gg.addColorStop(0, `rgba(120,104,90,${fade})`);
    gg.addColorStop(0.6, `rgba(100,88,76,${fade * 0.5})`);
    gg.addColorStop(1, 'rgba(100,88,76,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
  }
};

/** Riposte: bone shards and a gout of sparks from the ribs. */
const riposteHit = (ctx: Ctx, S: FxState) => {
  const age = S.t - T.riposte;
  if (age < 0 || age > 80) return;
  const o = ripostePoint();
  const [px, py] = proj(S.cam, o.x, o.y, o.d);
  const k = sOf(S.cam, o.d);
  const core = Math.max(0, 1 - age / 6);
  glow(ctx, px, py, 220 * k, 'rgba(255,170,90,A)', 0.7 * core);
  glow(ctx, px, py, 50 * k, 'rgba(255,245,220,A)', core);
  for (let i = 0; i < 60; i++) {
    const ang = rr(-1.4, 0.7, i, 1, 830);
    const sp = rr(5, 22, i, 2, 830);
    drawSpark(
      ctx,
      S.cam,
      {o, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3, life: rr(10, 40, i, 3, 830), drag: 0.09, grav: 0.35, size: rr(1.2, 2.6, i, 4, 830)},
      age,
      S.shutter * 1.3,
    );
  }
  // Shards of rib, tumbling.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 22; i++) {
    const a = age;
    if (a < 0) continue;
    const ang = rr(-1.6, 0.5, i, 5, 830);
    const sp = rr(4, 15, i, 6, 830);
    const vx = Math.cos(ang) * sp;
    const vy = Math.sin(ang) * sp - 2;
    const drag = 0.04;
    const e = (1 - Math.exp(-drag * a)) / drag;
    let x = o.x + vx * e;
    let y = o.y + vy * e + 0.5 * 0.55 * a * a;
    if (y > 0) {
      y = 0;
      x = o.x + vx * e * 0.9;
    }
    const q = proj(S.cam, x, y, o.d + rr(-0.05, 0.05, i, 7, 830));
    const len = rr(4, 11, i, 8, 830) * k;
    const rot = a * rr(-0.5, 0.5, i, 9, 830) + i;
    const fade = Math.min(1, Math.max(0, 1 - (a - 50) / 30));
    ctx.save();
    ctx.translate(q[0], q[1]);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(${196 - i * 2},${184 - i * 2},${160 - i * 2},${fade})`;
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(0, -len * 0.3);
    ctx.lineTo(len, len * 0.1);
    ctx.lineTo(0, len * 0.35);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

/** The telegraph glint at the top of the windup. */
const windupGlint = (ctx: Ctx, S: FxState) => {
  const a = S.t - T.glint;
  if (a < -2 || a > 16) return;
  const tip = kingTipAt(S.t);
  const g = kingAt(S.t);
  const w = toWorld(g, ap(g.W.sword, 0, GS.tip * 0.86));
  const q = proj(S.cam, w[0], w[1], tip.d);
  const k = sOf(S.cam, tip.d);
  const e = a < 0 ? (a + 2) / 2 : Math.max(0, 1 - a / 16);
  const pulse = e * e;
  glow(ctx, q[0], q[1], 120 * k * (0.5 + pulse), 'rgba(255,236,200,A)', 0.6 * pulse);
  ctx.save();
  ctx.translate(q[0], q[1]);
  ctx.rotate(0.3 + a * 0.02);
  for (const [len, wid] of [
    [230, 2.4],
    [120, 1.6],
  ] as const) {
    for (let j = 0; j < 2; j++) {
      ctx.rotate(Math.PI / 2);
      const L = len * k * pulse;
      const gg = ctx.createLinearGradient(-L, 0, L, 0);
      gg.addColorStop(0, 'rgba(255,240,220,0)');
      gg.addColorStop(0.5, `rgba(255,252,240,${0.95 * pulse})`);
      gg.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-L, -wid * k, L * 2, wid * 2 * k);
    }
    ctx.rotate(Math.PI / 4);
  }
  ctx.restore();
};

/** Footfall and knee dust. */
const DUST_EVENTS: {t: number; x: () => number; d: number; size: number}[] = [
  {t: 240, x: () => 1262, d: 1.0, size: 1},
  {t: 253, x: () => 1160, d: 1.0, size: 0.8},
  {t: 266, x: () => 1064, d: 1.0, size: 1},
  {t: 322, x: () => 850, d: 1.0, size: 1.2},
  // Both feet stamp as the blow lands: it hangs through the slow motion.
  {t: T.parry, x: () => 858, d: 1.0, size: 1.5},
  {t: T.parry, x: () => 1112, d: 1.0, size: 1.3},
  {t: T.stagger + 15, x: () => kingAt(T.stagger + 15).x + 40, d: 1.0, size: 1.6},
];
const dustPuffs = (ctx: Ctx, S: FxState) => {
  for (const ev of DUST_EVENTS) {
    const a = S.t - ev.t;
    if (a < 0 || a > 50) continue;
    const x0 = ev.x();
    for (let i = 0; i < 9; i++) {
      const dir = rr(-1, 1, i, ev.t, 840);
      const x = x0 + dir * (20 + a * 2.2) * ev.size;
      const y = -rr(4, 30, i, ev.t, 841) * ev.size * (1 - Math.exp(-a * 0.08));
      const q = proj(S.cam, x, y, ev.d + rr(-0.04, 0.04, i, ev.t, 842));
      const r = (26 + a * 1.6) * ev.size * sOf(S.cam, ev.d);
      const fade = Math.max(0, 1 - a / 50) * 0.13;
      const gg = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
      gg.addColorStop(0, `rgba(140,128,116,${fade})`);
      gg.addColorStop(1, 'rgba(140,128,116,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
    }
  }
};

/** Phase two: embers boil up around the rising king. */
const embers = (ctx: Ctx, S: FxState) => {
  if (S.embers <= 0.01) return;
  const g = kingAt(S.t);
  for (let i = 0; i < 70; i++) {
    const period = rr(40, 90, i, 1, 850);
    const ph = ((S.t + rr(0, period, i, 2, 850)) % period) / period;
    const x = g.x + rr(-260, 260, i, 3, 850) + nz(S.t * 0.02, i) * 40 + ph * 30;
    const y = -ph * rr(300, 700, i, 4, 850);
    const d = g.d + rr(-0.2, 0.15, i, 5, 850);
    const q = proj(S.cam, x, y, d);
    const r = rr(1.2, 3, i, 6, 850) * sOf(S.cam, d);
    const a = Math.sin(Math.PI * ph) * S.embers;
    glow(ctx, q[0], q[1], r * 5, 'rgba(255,120,40,A)', a * 0.5);
    ctx.fillStyle = `rgba(255,${190 - ph * 80},90,${a})`;
    ctx.fillRect(q[0] - r / 2, q[1] - r / 2, r, r);
  }
};

export const paintFx = (ctx: Ctx, S: FxState) => {
  ctx.save();
  ctx.lineCap = 'round';
  dustPuffs(ctx, S);
  roarWave(ctx, S);
  ctx.globalCompositeOperation = 'lighter';
  dragSparks(ctx, S);
  windupGlint(ctx, S);
  parryBurst(ctx, S);
  riposteHit(ctx, S);
  embers(ctx, S);
  ctx.restore();
};

/**
 * Motion smear for the greatsword's big swings: a ribbon through the blade's
 * recent positions. The sample spacing follows the real-frame shutter, so the
 * smear shortens in slow motion like a real exposure would.
 */
export const swordTrail = (t: number, cam: Cam, shutter: number): {pts: Vec[][]; alpha: number} | null => {
  const sweep = ramp(t, 298, 300.5) * (1 - ramp(t, 312, 317));
  // The downswing only: no smear on the rebound, which plays in slow motion.
  const blow = ramp(t, 425, 427.5) * (1 - ramp(t, 431.6, 432.2));
  const alpha = Math.max(sweep, blow);
  if (alpha <= 0.01) return null;
  const dt = Math.max(0.1, shutter * 0.5);
  const pts: Vec[][] = [];
  for (let k = 0; k <= 6; k++) {
    const g = duelAt(t - k * dt).king;
    const m = mul(outerOf(cam, g), g.W.sword);
    pts.push([ap(m, 0, GS.tip * 0.5), ap(m, 0, GS.tip)]);
  }
  return {pts, alpha};
};
