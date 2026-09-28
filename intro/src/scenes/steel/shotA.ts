// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Shot A: the hooded traveler in a 3/4 profile close-up at the church gate.
// Cold moonlight rims the face from the left; the church behind (right)
// bleeds a pulsing red halo around the hood. The face stays in shadow: only
// the nose, lips, jaw, cheek and an eye glint catch the light.

import {random} from 'remotion';
import {palette} from '../../theme';
import {BREATHS, heartbeat} from './beats';
import {
  P,
  blob,
  buf,
  fbm,
  flutter,
  glow,
  lerp,
  mottleTexture,
  rgba,
  ribbon,
  rim,
  smooth,
  spline,
  toScreen,
  woolTexture,
} from './util';

export type Cam = {x: number; y: number; s: number};

const MOON = '#aebfd8';
const MOON_HOT = '#e4ecf7';
const RED = palette.bloodBright;

/** The church's glow: slow breathing plus a flare on each heartbeat. */
export const churchPulse = (f: number) =>
  0.72 + 0.14 * Math.sin(f * 0.09) + 0.1 * fbm('church', f * 0.05) + 0.35 * heartbeat(f);

export const applyCam = (ctx: CanvasRenderingContext2D, cam: Cam, par = 1) => {
  const s = 1 + (cam.s - 1) * par;
  ctx.translate(960, 540);
  ctx.scale(s, s);
  ctx.translate(-960 - (cam.x - 960) * par, -540 - (cam.y - 540) * par);
};

// ---------------------------------------------------------------- background

/** Out-of-focus night: moon glow, iron gate at left, the church at right. */
export const paintBgA = (ctx: CanvasRenderingContext2D, f: number, cam: Cam) => {
  const pulse = churchPulse(f);
  ctx.save();
  applyCam(ctx, cam, 0.35);

  // Sky: soot black at the top, night blue lower, a faint cold horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, 1080);
  sky.addColorStop(0, '#04050a');
  sky.addColorStop(0.45, '#0a0f1e');
  sky.addColorStop(0.75, '#141a2a');
  sky.addColorStop(1, '#0b0c12');
  ctx.fillStyle = sky;
  ctx.fillRect(-200, -200, 2320, 1480);

  // Moon, far out of focus: a big soft bloom with a pale disc.
  glow(ctx, 311, 200, 780, '#6f84a8', 0.4);
  glow(ctx, 311, 200, 260, MOON, 0.55);
  ctx.fillStyle = rgba(MOON_HOT, 0.75);
  ctx.beginPath();
  ctx.arc(311, 200, 58, 0, Math.PI * 2);
  ctx.fill();

  // Faint shafts of moonlight slanting down through the gate.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = 330 + i * 190;
    const a = 0.05 + 0.02 * fbm('shaft' + i, f * 0.02);
    const g = ctx.createLinearGradient(311, 200, x + 500, 1000);
    g.addColorStop(0, rgba(MOON, a));
    g.addColorStop(1, rgba(MOON, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(300, 200);
    ctx.lineTo(x + 380, 1100);
    ctx.lineTo(x + 520 + i * 40, 1100);
    ctx.lineTo(330, 200);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Thin cloud streaks drifting across the moon.
  for (let i = 0; i < 4; i++) {
    const y = 180 + i * 55 + fbm('cl' + i, f * 0.004) * 20;
    const x = ((i * 530 + f * (0.6 + i * 0.15)) % 1900) - 300;
    glow(ctx, x, y, 420, '#1b2438', 0.55, 1, 0.12);
  }

  // Church mass behind the traveler, with a tall lancet window glowing red.
  ctx.fillStyle = '#07060a';
  ctx.beginPath();
  ctx.moveTo(1180, 1200);
  ctx.lineTo(1180, 420);
  ctx.lineTo(1420, 240);
  ctx.lineTo(1520, 250);
  ctx.lineTo(1520, -40);
  ctx.lineTo(1640, -200);
  ctx.lineTo(1760, -40);
  ctx.lineTo(1760, 300);
  ctx.lineTo(2200, 300);
  ctx.lineTo(2200, 1200);
  ctx.closePath();
  ctx.fill();
  glow(ctx, 1640, 560, 900, RED, 0.26 * pulse, 0.8, 1);
  glow(ctx, 1640, 520, 380, RED, 0.5 * pulse, 0.5, 1);
  // The window: lancet arch, mullion, and a hot core.
  const win = (x: number, y: number, w: number, h: number, a: number) => {
    ctx.fillStyle = rgba('#ff3a1e', a);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h);
    ctx.lineTo(x - w / 2, y + w * 0.4);
    ctx.quadraticCurveTo(x - w / 2, y - w * 0.2, x, y - w * 0.55);
    ctx.quadraticCurveTo(x + w / 2, y - w * 0.2, x + w / 2, y + w * 0.4);
    ctx.lineTo(x + w / 2, y + h);
    ctx.closePath();
    ctx.fill();
  };
  win(1640, 330, 120, 330, 0.55 * pulse);
  win(1640, 350, 70, 290, 0.5 * pulse);
  ctx.fillStyle = '#0a0306';
  ctx.fillRect(1634, 300, 12, 380);
  win(1440, 470, 60, 180, 0.28 * pulse);
  win(1830, 470, 60, 180, 0.28 * pulse);

  // Red haze pooling on the ground by the church: the evil beneath.
  glow(ctx, 1500, 1000, 900, RED, 0.3 * pulse, 1.4, 0.35);

  // The iron gate at left: spear-topped bars against the moon glow.
  ctx.fillStyle = '#030306';
  for (let i = 0; i < 12; i++) {
    const x = -40 + i * 78;
    const top = 250 + (i % 2) * 30 + Math.abs(i - 5) * 6;
    ctx.fillRect(x - 7, top, 14, 1100);
    ctx.beginPath();
    ctx.moveTo(x - 16, top + 6);
    ctx.lineTo(x, top - 46);
    ctx.lineTo(x + 16, top + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(-60, 330, 1000, 16);
  ctx.fillRect(-60, 820, 1000, 20);
  // Scrollwork rings between the rails.
  ctx.strokeStyle = '#030306';
  ctx.lineWidth = 9;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(0 + i * 156, 378, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Moonlight catching the bars' left edges.
  ctx.fillStyle = rgba(MOON, 0.08);
  for (let i = 0; i < 12; i++) ctx.fillRect(-40 + i * 78 - 7, 300, 3, 900);

  // Low mist, drifting right to left with the wind.
  for (let i = 0; i < 7; i++) {
    const x = ((i * 410 - f * (1.2 + i * 0.2)) % 2600 + 2600) % 2600 - 400;
    const y = 760 + (i % 3) * 70 + fbm('mist' + i, f * 0.01) * 20;
    glow(ctx, x, y, 520, '#56607a', 0.14, 1, 0.3);
  }
  ctx.restore();
};

// ---------------------------------------------------------------- the figure

/** Head sway: breathing rise, a slow lift of the chin toward the end. */
const headPose = (f: number) => {
  const breathe = Math.sin((f / 60) * Math.PI * 2 - 0.4) * 2.2;
  const lift = smooth((f - 60) / 45) * -0.03;
  return {
    dx: fbm('hx', f * 0.02) * 3,
    dy: breathe + fbm('hy', f * 0.02) * 2,
    rot: lift + fbm('hr', f * 0.015) * 0.008,
  };
};

// Face silhouette (facing left), from the forehead under the brim, down the
// nose and lips to the chin, back along the jaw and up behind the cheek.
const FACE: P[] = [
  [1010, 330],
  [950, 348],
  [922, 394],
  [937, 428],
  [924, 452],
  [906, 488],
  [886, 520],
  [880, 532],
  [887, 543],
  [904, 546],
  [907, 564],
  [896, 578],
  [906, 591],
  [900, 603],
  [914, 620],
  [905, 646],
  [912, 680],
  [950, 700],
  [1030, 690],
  [1100, 650],
  [1130, 560],
  [1120, 420],
];

// Hood: outer silhouette, including the cowl around the neck and shoulders.
const HOOD: P[] = [
  [862, 332],
  [884, 284],
  [940, 228],
  [1030, 184],
  [1140, 158],
  [1252, 140],
  [1352, 186],
  [1432, 280],
  [1470, 400],
  [1478, 520],
  [1510, 640],
  [1600, 740],
  [1720, 830],
  [1820, 960],
  [1860, 1120],
  [720, 1120],
  [760, 960],
  [820, 860],
  [890, 800],
  [950, 772],
  [1010, 748],
  [1060, 700],
  [1100, 600],
  [1105, 480],
  [1080, 390],
  [1020, 340],
  [940, 322],
];
// Pinned where the hood meets the face so wind only ruffles the loose cloth.
const HOOD_W = [
  1, 0.8, 0.5, 0.3, 0.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.6, 0.6, 0.5, 0.3, 0, 0, 0.3, 0.4, 0.4, 0.3, 0.2, 0.1,
  0.1, 0.1, 0.1, 0.2, 0.5,
];

// Centre line of the hood's hem: along the brim, then down the near cheek
// and under the jaw into the cowl.
const HEM: P[] = [
  [866, 331],
  [900, 314],
  [962, 316],
  [1026, 340],
  [1068, 384],
  [1090, 452],
  [1102, 530],
  [1094, 600],
  [1082, 650],
  [1058, 698],
  [1010, 736],
  [950, 764],
  [880, 810],
  [830, 880],
  [800, 980],
];
const HEM_WIDTH = [8, 26, 34, 32, 26, 18, 14, 16, 12, 16, 20, 22, 24, 26, 26];
const HEM_FLUTTER = [1, 0.9, 0.7, 0.5, 0.35, 0.3, 0.25, 0.25, 0.25, 0.25, 0.3, 0.3, 0.3, 0.2, 0];

// A short beard along the jaw and chin, its edge broken into hairs.
const BEARD: P[] = [
  [914, 616],
  [906, 646],
  [912, 682],
  [950, 704],
  [1030, 694],
  [1092, 648],
  [1086, 600],
  [1040, 628],
  [990, 626],
  [950, 606],
  [928, 614],
];

/** Subdivide a closed outline and roughen it with fine noise: hairline edges. */
const shaggy = (pts: P[], seed: string, amp: number, n = 10): P[] => {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const k = i * n + j;
      const r = amp * (random(seed + k) * 1.4 - 0.35) * (0.6 + 0.4 * fbm(seed, k * 0.3));
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      out.push([lerp(a[0], b[0], t) + (dy / l) * r, lerp(a[1], b[1], t) - (dx / l) * r]);
    }
  }
  return out;
};

/** Even-odd point-in-polygon test on control points. */
const inside = ([x, y]: P, poly: P[]) => {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
};

// Moustache: over the upper lip, drooping into the beard at the mouth corner.
const MOUSTACHE: P[] = [
  [906, 556],
  [936, 560],
  [952, 590],
  [944, 616],
  [924, 612],
  [912, 596],
  [910, 572],
];

/**
 * Beard and moustache as hundreds of short curling strands: a dark mass
 * whose front fringe catches the moon and whose underside takes the red.
 */
const paintBeardStrands = (ctx: CanvasRenderingContext2D, f: number, pulse: number) => {
  const dark = new Path2D();
  const moon = new Path2D();
  const red = new Path2D();
  const sway = fbm('bsway', f * 0.03) * 1.5;
  const strand = (x: number, y: number, i: number, len: number, lean: number) => {
    const c = (random('bcu' + i) - 0.5) * 10;
    const ex = x + lean * len + sway * (len / 20);
    const ey = y + len;
    const into = [dark, dark, dark];
    // Front fringe, facing the moon; underside, facing the church.
    const m = smooth((935 - x) / 26);
    const r = smooth((y - 672) / 22);
    if (random('bm' + i) < m * 0.85) into[0] = moon;
    else if (random('br' + i) < r * 0.8) into[0] = red;
    into[0].moveTo(x, y);
    into[0].quadraticCurveTo(x + lean * len * 0.3 + c, y + len * 0.55, ex, ey);
  };
  for (let i = 0; i < 900; i++) {
    const p: P = [880 + random('bx' + i) * 220, 590 + random('by' + i) * 120];
    if (!inside(p, BEARD)) continue;
    // Strands grow down and forward, flaring outward at the chin.
    const lean = -0.5 - 0.5 * smooth((960 - p[0]) / 60) + (random('bn' + i) - 0.5) * 0.6;
    strand(p[0], p[1], i, 7 + random('bl' + i) * 11, lean);
  }
  for (let i = 0; i < 140; i++) {
    const p: P = [900 + random('mx' + i) * 56, 554 + random('my' + i) * 64];
    if (!inside(p, MOUSTACHE)) continue;
    strand(p[0], p[1], 1000 + i, 9 + random('ml' + i) * 10, 0.25);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(6,4,4,0.75)';
  ctx.stroke(dark);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = rgba(MOON, 0.3);
  ctx.stroke(moon);
  ctx.strokeStyle = rgba(RED, 0.28 * pulse);
  ctx.stroke(red);
  ctx.restore();
};

// The dark inside of the hood, around the face.
const INTERIOR: P[] = [
  [878, 334],
  [1060, 362],
  [1092, 460],
  [1098, 560],
  [1080, 650],
  [1040, 716],
  [980, 744],
  [940, 790],
  [946, 700],
  [920, 600],
  [905, 400],
];

// Throat and neck, under the jaw in deep shadow.
const NECK: P[] = [
  [930, 660],
  [1000, 690],
  [1070, 700],
  [1040, 760],
  [960, 800],
  [936, 790],
  [944, 720],
];

const EYE: P = [986, 448];
const MOUTH: P = [898, 594];

const matrixArgs = (m: DOMMatrix) => [m.a, m.b, m.c, m.d, m.e, m.f] as const;

const wool = (ctx: CanvasRenderingContext2D) => ctx.createPattern(woolTexture(), 'repeat')!;

/** Breath vapour: each exhale is a cluster of soft wisps that drift up-left. */
const paintBreath = (ctx: CanvasRenderingContext2D, f: number, mouth: P) => {
  for (const b of BREATHS) {
    const t0 = f - b;
    if (t0 < 0 || t0 > 100) continue;
    const N = 48;
    for (let i = 0; i < N; i++) {
      const born = (i / N) * 20; // exhale lasts ~20 frames
      const age = t0 - born;
      const life = 50 + (i % 5) * 10;
      if (age < 0 || age > life) continue;
      const k = age / life;
      const s = `br${b}-${i}`;
      // Pushed out fast in a loose cone, slowed by the air, then lifted and
      // carried up-left on the wind, curling as it goes.
      const ang = Math.PI + 0.12 + (((i * 7) % 11) / 10 - 0.5) * 0.7;
      const push = (1 - Math.exp(-age / 6)) * (50 + (i % 4) * 16) * (1 - (i / N) * 0.5);
      const curl = fbm(s + 'c', age * 0.05 + i * 0.3) * 40 * k;
      const x = mouth[0] - 6 + Math.cos(ang) * push - age * 0.8 + curl;
      const y = mouth[1] + 6 + Math.sin(ang) * push - age * age * 0.014 + fbm(s + 'y', age * 0.05 + i) * 20 * k;
      const r = 5 + 40 * Math.pow(k, 0.7);
      const a = 0.21 * Math.sin(Math.PI * Math.pow(k, 0.4)) * Math.pow(1 - k, 1.5);
      glow(ctx, x, y, r, '#c9d6e8', a, 1.7, 0.6, -0.25 + fbm(s + 'r', age * 0.02) * 0.6);
    }
  }
};

/** Loose wool fibres standing off the brim's lit edge, stirring. */
const paintBrimFuzz = (ctx: CanvasRenderingContext2D, f: number, gust: number) => {
  const lit = new Path2D();
  const dark = new Path2D();
  for (let i = 0; i < 90; i++) {
    const u = i / 90;
    // Along the top of the brim, from its tip back over the crown.
    const x = lerp(872, 1060, u) + random('fz' + i) * 6;
    const y = 318 - 16 * Math.sin(u * Math.PI * 0.8) + u * u * 60 - 12 + random('fy' + i) * 5;
    const len = 4 + random('fl' + i) * 9;
    const a = -2 + (random('fa' + i) - 0.5) * 1.4 + fbm('fzw', f * 0.05 + i * 0.1) * 0.5 * gust;
    const into = random('fc' + i) < 0.55 ? lit : dark;
    into.moveTo(x, y);
    into.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(10,8,8,0.7)';
  ctx.stroke(dark);
  ctx.strokeStyle = rgba(MOON, 0.28);
  ctx.stroke(lit);
  ctx.restore();
};

/** A lock of fine strands escaping under the brim, streaming on the wind. */
const paintHair = (ctx: CanvasRenderingContext2D, f: number) => {
  ctx.save();
  ctx.lineCap = 'round';
  const gust = 0.65 + 0.35 * fbm('hg', f * 0.03);
  for (let i = 0; i < 14; i++) {
    const s = 'hair' + i;
    const x0 = 892 + (i % 5) * 7;
    const y0 = 340 + (i % 4) * 5;
    const len = 80 + ((i * 37) % 70);
    const pts: P[] = [];
    for (let j = 0; j <= 7; j++) {
      const u = j / 7;
      // Shared wave for the lock, plus a little of each strand's own.
      const lock = fbm('lock', f * 0.045 - u * 1.1) * 22 * u + Math.sin(f * 0.2 - u * 3) * 5 * u * u;
      const own = fbm(s, f * 0.06 - u * 1.3) * 8 * u;
      pts.push([x0 - u * len * gust, y0 + u * u * (38 - gust * 16) + lock + own + u * (i % 4) * 5]);
    }
    const path = new Path2D();
    spline(path, pts);
    ctx.strokeStyle = 'rgba(8,6,6,0.7)';
    ctx.lineWidth = 1.7;
    ctx.stroke(path);
    ctx.strokeStyle = rgba(MOON, 0.12 + 0.06 * (i % 3));
    ctx.lineWidth = 0.7;
    ctx.translate(0, -0.8);
    ctx.stroke(path);
    ctx.translate(0, 0.8);
  }
  ctx.restore();
};

/**
 * Cloth folds: broad ridges and troughs following the drape, drawn sharp in
 * a scratch buffer and laid over the hood blurred and clipped.
 */
const paintFolds = (ctx: CanvasRenderingContext2D, f: number, hood: Path2D, gust: number, pulse: number) => {
  const hw = ctx.canvas.width / 2;
  const hh = ctx.canvas.height / 2;
  const {c, ctx: o} = buf('folds', hw, hh);
  o.scale(0.5, 0.5);
  o.transform(...matrixArgs(ctx.getTransform()));
  o.lineCap = 'round';
  const sw = (k: string) => fbm('fold' + k, f * 0.02) * 14 * gust;
  const stroke = (col: string, w: number, pts: P[]) => {
    o.strokeStyle = col;
    o.lineWidth = w;
    o.beginPath();
    spline(o, pts);
    o.stroke();
  };
  // Over the crown, from the brim back toward the peak.
  for (let i = 0; i < 4; i++) {
    const d = i * 38;
    stroke('rgba(0,0,0,0.55)', 18, [
      [930 + d * 0.3, 300 - d * 0.6],
      [1080 + sw('c' + i), 230 - d * 0.7],
      [1250 + d, 180 + d * 0.4],
      [1380 + d * 0.8, 300 + d * 1.3],
    ]);
    stroke(rgba(MOON, 0.24 - i * 0.05), 12, [
      [940 + d * 0.3, 280 - d * 0.6],
      [1080 + sw('c' + i), 210 - d * 0.7],
      [1240 + d, 162 + d * 0.4],
    ]);
  }
  // Long drape down the back of the head.
  for (let i = 0; i < 4; i++) {
    const x = 1270 + [0, 38, 110, 150][i];
    stroke(`rgba(0,0,0,${0.3 + (i % 2) * 0.2})`, [26, 12, 20, 10][i], [
      [x - 60, 190 + i * 10],
      [x + 30 + sw('b' + i), 420],
      [x + 70 + sw('b' + i) * 1.4, 640],
      [x + 180 + i * 30, 900],
    ]);
    stroke(rgba(RED, 0.06 * pulse), 18, [
      [x - 30, 200 + i * 10],
      [x + 60 + sw('b' + i), 430],
      [x + 100 + sw('b' + i) * 1.4, 650],
      [x + 210 + i * 30, 910],
    ]);
  }
  // Cowl: heavy U-shaped swags from the throat to the far shoulder.
  for (let i = 0; i < 4; i++) {
    const y = 790 + i * 55;
    stroke('rgba(0,0,0,0.6)', 22, [
      [900 - i * 30, y - 20],
      [1060 + sw('w' + i), y + 60],
      [1300 + sw('w' + i), y + 40],
      [1520 + i * 20, y - 60],
    ]);
    stroke(rgba(MOON, 0.07), 14, [
      [890 - i * 30, y - 45],
      [1050 + sw('w' + i), y + 34],
      [1200 + sw('w' + i), y + 30],
    ]);
  }
  // Wool bunched where the hem turns under the jaw.
  for (const [a, b, cc] of [
    [[1098, 600], [1140, 640], [1190, 650]],
    [[1066, 690], [1110, 724], [1170, 720]],
    [[1010, 748], [1070, 784], [1140, 792]],
  ] as P[][]) {
    stroke('rgba(0,0,0,0.7)', 12, [a, b, cc]);
    stroke(rgba(MOON, 0.08), 6, [
      [a[0] + 4, a[1] - 12],
      [b[0] + 4, b[1] - 12],
      [cc[0], cc[1] - 12],
    ]);
  }
  o.setTransform(1, 0, 0, 1, 0, 0);
  const {c: c2, ctx: o2} = buf('folds2', hw, hh);
  o2.filter = 'blur(4.5px)';
  o2.drawImage(c, 0, 0);
  o2.filter = 'none';
  o2.globalCompositeOperation = 'destination-in';
  o2.scale(0.5, 0.5);
  o2.transform(...matrixArgs(ctx.getTransform()));
  o2.fill(hood);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(c2, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
};

export const paintFigureA = (ctx: CanvasRenderingContext2D, f: number, cam: Cam) => {
  const pulse = churchPulse(f);
  const hp = headPose(f);
  const gust = 0.5 + 0.5 * fbm('gust', f * 0.012);
  const wt = f * 0.035;

  ctx.save();
  applyCam(ctx, cam, 1);
  // The whole figure breathes.
  ctx.translate(hp.dx, hp.dy * 0.6);

  // --- Hood and cloak mass.
  // Wool edge: the silhouette is broken into fibres so rims never read as
  // a clean neon line.
  const hood = blob(shaggy(flutter(HOOD, 'hood', wt, 8 + 12 * gust, HOOD_W), 'hoodfuzz', 2.2, 6), 0.4);
  const hg = ctx.createLinearGradient(860, 150, 1500, 700);
  hg.addColorStop(0, '#1a1716');
  hg.addColorStop(0.45, '#0e0b0a');
  hg.addColorStop(1, '#0a0708');
  ctx.fillStyle = hg;
  ctx.fill(hood);
  ctx.save();
  ctx.clip(hood);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = wool(ctx);
  ctx.fill(hood);
  // Worn, uneven wool: big soft blotches of light and dark.
  const mot = ctx.createPattern(mottleTexture(), 'repeat')!;
  mot.setTransform(new DOMMatrix().scale(5.5));
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = mot;
  ctx.fill(hood);
  ctx.globalAlpha = 1;
  // Volume: moonlight on the crown, a core shadow behind the head.
  glow(ctx, 1010, 250, 260, MOON, 0.1, 1.4, 0.8, -0.4);
  glow(ctx, 1300, 560, 380, '#000000', 0.45, 0.8, 1.2);
  ctx.restore();
  paintFolds(ctx, f, hood, gust, pulse);

  // Rims on the hood: red from the church behind (right), moon on the crown.
  rim(ctx, hood, -22, 8, RED, {blur: 14, alpha: 0.6 * pulse});
  rim(ctx, hood, -5, 2, '#ff6a3a', {blur: 2.5, alpha: 0.3 * pulse});
  rim(ctx, hood, 18, 20, MOON, {blur: 16, alpha: 0.3});
  rim(ctx, hood, 4, 5, MOON_HOT, {blur: 2, alpha: 0.3});

  // --- The head, tilted about the neck.
  ctx.save();
  ctx.translate(1060, 700);
  ctx.rotate(hp.rot);
  ctx.translate(-1060, -700 + hp.dy * 0.4);

  ctx.fillStyle = '#020102';
  ctx.fill(blob(INTERIOR, 0.5));
  const neck = blob(NECK, 0.5);
  ctx.fillStyle = '#070505';
  ctx.fill(neck);
  rim(ctx, neck, 8, 0, MOON, {blur: 4, alpha: 0.18});
  rim(ctx, neck, -8, -4, RED, {blur: 6, alpha: 0.3 * pulse});
  const face = blob(FACE, 0.45);
  ctx.fillStyle = '#0c0808';
  ctx.fill(face);

  ctx.save();
  ctx.clip(face);
  // Faint cold fill from the front, falling off toward the ear.
  const fg = ctx.createLinearGradient(880, 0, 1060, 0);
  fg.addColorStop(0, 'rgba(120,140,170,0.1)');
  fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(850, 300, 300, 420);
  // Cheekbone catching the moon, below the eye.
  glow(ctx, 948, 506, 64, MOON, 0.22, 1.3, 0.55, 0.5);
  // Nose bridge and upper lip planes.
  glow(ctx, 912, 490, 30, MOON, 0.1, 0.6, 1.6, 0.4);
  // Red kiss along the jaw from behind.
  glow(ctx, 1050, 705, 120, RED, 0.3 * pulse, 1.4, 0.4);
  // Eye socket shadow.
  glow(ctx, EYE[0] + 8, EYE[1] - 4, 48, '#000000', 0.85, 1.3, 0.8);
  // Weathered skin: soft blotches so the planes never read as plastic.
  const skin = ctx.createPattern(mottleTexture(), 'repeat')!;
  skin.setTransform(new DOMMatrix().scale(3.2));
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = skin;
  ctx.fillRect(850, 330, 300, 400);
  ctx.globalAlpha = 1;
  // Creases: the nose wing, the fold down to the mouth, the mouth corner,
  // and the hollow under the cheekbone.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(904, 512);
  ctx.quadraticCurveTo(922, 518, 918, 538);
  ctx.moveTo(924, 524);
  ctx.quadraticCurveTo(944, 548, 938, 584);
  ctx.moveTo(900, 588);
  ctx.lineTo(918, 590);
  ctx.stroke();
  glow(ctx, 975, 560, 60, '#000000', 0.5, 1.2, 0.6, 0.3);
  // Moon catching the lower lid and the ridge of the brow.
  ctx.strokeStyle = rgba(MOON, 0.16);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(968, 462);
  ctx.quadraticCurveTo(982, 468, 996, 462);
  ctx.stroke();
  ctx.restore();

  // Moonlight rim down the profile: nose, lips, chin.
  rim(ctx, face, 9, 4, MOON, {blur: 4, alpha: 0.8});
  rim(ctx, face, 2.5, 1.2, MOON_HOT, {blur: 1, alpha: 0.6});
  // Jaw underside catching the red (not the nose: the church is behind).
  const jaw = new Path2D();
  jaw.rect(880, 630, 260, 160);
  rim(ctx, face, -3, -9, RED, {blur: 4, alpha: 0.5 * pulse, clip: jaw});

  // Beard: darker than the skin, its broken edge catching the light.
  const beard = blob(shaggy(BEARD, 'beard', 3.2, 16), 0.2);
  ctx.fillStyle = '#060404';
  ctx.fill(beard);
  rim(ctx, beard, 6, 2, MOON, {blur: 2.5, alpha: 0.3, clip: blob(FACE.slice(10, 17).concat([[860, 700], [860, 600]]))});
  paintBeardStrands(ctx, f, pulse);

  // The brim's shadow across the brow: the forehead and upper nose sink
  // into darkness, leaving the lit nose tip, lips and beard.
  ctx.save();
  ctx.clip(face);
  const sh = ctx.createLinearGradient(0, 340, 0, 500);
  sh.addColorStop(0, 'rgba(2,1,2,0.97)');
  sh.addColorStop(0.45, 'rgba(2,1,2,0.85)');
  sh.addColorStop(1, 'rgba(2,1,2,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(850, 330, 300, 170);
  ctx.restore();

  // Eye glint: tiny and hard, with a whisper of halo. One slow blink.
  const blink = Math.max(0, 1 - Math.abs(f - 44) / 2.5);
  const glint = (0.85 + 0.15 * Math.sin(f * 0.3)) * (1 - blink);
  glow(ctx, EYE[0] - 4, EYE[1] + 2, 18, MOON, 0.12 * glint);
  ctx.fillStyle = rgba(MOON, 0.12 * glint);
  ctx.beginPath();
  ctx.ellipse(EYE[0] - 1, EYE[1] + 2, 7, 2.4, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba('#f4f8ff', 0.9 * glint);
  ctx.beginPath();
  ctx.ellipse(EYE[0] - 5, EYE[1] + 1, 2.6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // The hem: a thick rolled edge of wool along the opening.
  const hemPts = flutter(HEM, 'hem', wt * 1.3, 5 + 7 * gust, HEM_FLUTTER);
  const hem = ribbon(hemPts, HEM_WIDTH);
  const hemFill = ctx.createLinearGradient(0, 310, 0, 800);
  hemFill.addColorStop(0, '#171312');
  hemFill.addColorStop(0.35, '#100c0c');
  hemFill.addColorStop(1, '#0b0808');
  ctx.fillStyle = hemFill;
  ctx.fill(hem);
  ctx.save();
  ctx.clip(hem);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = wool(ctx);
  ctx.fill(hem);
  ctx.globalAlpha = 1;
  // Rolled wool: the underside of the roll turns away into shadow, a faint
  // cold sheen rides its top, and it bunches into uneven creases.
  ctx.lineCap = 'round';
  const centre = new Path2D();
  spline(centre, hemPts);
  ctx.save();
  ctx.translate(5, 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 16;
  ctx.stroke(centre);
  ctx.translate(-9, -11);
  ctx.strokeStyle = rgba(MOON, 0.05);
  ctx.lineWidth = 6;
  ctx.stroke(centre);
  ctx.restore();
  ctx.beginPath();
  for (let i = 0; i < hemPts.length - 1; i++) {
    for (let j = 0; j < 2; j++) {
      if (random('hk' + i + j) < 0.45) continue;
      const t = (j + 0.2 + random('hc' + i + j) * 0.6) / 2;
      const a = hemPts[i];
      const b = hemPts[i + 1];
      const x = lerp(a[0], b[0], t);
      const y = lerp(a[1], b[1], t);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      // Across the roll, skewed a little; each crease its own length.
      const nx = -(b[1] - a[1]) / l;
      const ny = (b[0] - a[0]) / l;
      const w = HEM_WIDTH[i] * (0.4 + random('hw' + i + j) * 0.4);
      const sk = 0.4 + (random('hs' + i + j) - 0.5) * 1.2;
      ctx.moveTo(x - nx * w + ny * sk * w, y - ny * w - nx * sk * w);
      ctx.quadraticCurveTo(x + (b[0] - a[0]) / l * 4, y + (b[1] - a[1]) / l * 4, x + nx * w, y + ny * w);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  const brim = new Path2D();
  brim.rect(820, 250, 240, 110);
  rim(ctx, hem, 4, 7, MOON, {blur: 3, alpha: 0.55, clip: brim});
  rim(ctx, hem, 1.5, 2.5, MOON_HOT, {blur: 1.5, alpha: 0.14, clip: brim});
  paintBrimFuzz(ctx, f, gust);
  rim(ctx, hem, -6, -2, RED, {blur: 7, alpha: 0.16 * pulse});

  paintHair(ctx, f);
  ctx.restore(); // head tilt

  paintBreath(ctx, f, [MOUTH[0], MOUTH[1] + hp.dy * 0.4]);
  ctx.restore();
};

/**
 * Ash and frost motes drifting in the wind, a few huge and out of focus.
 * With `prev` (the camera one shutter earlier) the small ones streak along
 * their on-screen motion, so a camera whip smears them instead of popping.
 */
export const paintMotes = (ctx: CanvasRenderingContext2D, f: number, cam: Cam, seed = 'mote', prev?: Cam) => {
  const PAR = 1.3;
  const sc = 1 + (cam.s - 1) * PAR;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const s = seed + i;
    const big = i < 5;
    const period = big ? 260 : 180 + (i % 7) * 30;
    const t = ((f + (i * 97) % period) % period) / period;
    const w: P = [
      lerp(2100, -200, t) + fbm(s, f * 0.01) * 120,
      160 + ((i * 131) % 760) + Math.sin(t * 6 + i) * 30 + t * 60,
    ];
    const [x, y] = toScreen(cam, PAR, w);
    const r = (big ? 24 + (i % 3) * 14 : 1.2 + (i % 4) * 0.7) * sc;
    const a = (big ? 0.07 : 0.55) * Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(f * 0.2 + i));
    const col = x > 1300 && i % 3 === 0 ? '#ff6040' : '#c6d3e8';
    if (big) {
      glow(ctx, x, y, r, col, a);
      continue;
    }
    const [px, py] = prev ? toScreen(prev, PAR, w) : [x, y];
    const len = Math.hypot(x - px, y - py);
    if (len > 2) {
      // Spread the same light over the streak.
      ctx.strokeStyle = rgba(col, a * Math.min(1, (3 * r) / len));
      ctx.lineWidth = 2 * r;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};
