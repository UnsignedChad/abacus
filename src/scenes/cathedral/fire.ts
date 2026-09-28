// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Phase two: the skull engulfed in fire. A particle flame painted at half
// resolution with additive blending, so overlapping licks burn to white at the
// core and the upscale softens them like heat haze. The same pass carries the
// red light the fire throws across the room. Every particle is a closed-form
// function of action time: each one loops on its own period, is born on the
// skull and rises straight up (fire ignores the tilt of the head), wavers on
// noise, and cools from white to ember red.

import {sprite} from './Canvas';
import {ap, Mat, Vec} from './rig';
import {nz, rnd, rr} from './util';

type Ctx = CanvasRenderingContext2D;

export type FireState = {
  t: number; // action time
  head: Mat; // head bone, screen space (includes the figure's facing flip)
  s: number; // screen px per world unit at the king's depth
  amount: number; // 0..1 how fully the fire has taken hold
  lag: Vec; // screen px the head moved over the last frame (flames trail it)
  flood: number; // red light thrown across the room by the fire
  floodBeat: number;
};

// Skull centre and radii in the head's local frame (see king.tsx skullPart).
const CX = 6;
const CY = -38;
const RX = 31;
const RY = 30;

const N = 176;

// Soft blobs are pre-rendered once per colour and stamped with drawImage:
// far cheaper than building a gradient for every lick on every frame.
const TEMPS: [number, number, number][] = [
  [140, 22, 8],
  [220, 58, 14],
  [255, 120, 34],
  [255, 186, 84],
  [255, 236, 190],
];
const blob = (i: number) =>
  sprite(`fire-${i}`, 64, 64, (g) => {
    const [r, gg, b] = TEMPS[i];
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
    grad.addColorStop(0.45, `rgba(${r},${Math.round(gg * 0.7)},${Math.round(b * 0.6)},0.5)`);
    grad.addColorStop(1, `rgba(${r},${Math.round(gg * 0.5)},0,0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
/** Temperature (1 hot .. 0 cold) to a blob sprite. */
const flame = (k: number) => blob(k > 0.8 ? 4 : k > 0.6 ? 3 : k > 0.4 ? 2 : k > 0.22 ? 1 : 0);

const stamp = (ctx: Ctx, img: CanvasImageSource, x: number, y: number, r: number, stretch: number, a: number) => {
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(img, x - r, y - r * stretch, r * 2, r * 2 * stretch);
};

export const paintSkullFire = (ctx: Ctx, st: FireState) => {
  const {t, head, s, amount} = st;
  if (amount <= 0.01) return;
  const centre = ap(head, CX, CY);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  // Red light thrown across the room (this layer is screened over the set).
  if (st.flood > 0.01) {
    const fc = [centre[0], centre[1] - 30 * s] as const;
    const FR = 1350 * s;
    const fl = ctx.createRadialGradient(fc[0], fc[1], 0, fc[0], fc[1], FR);
    fl.addColorStop(0, `rgba(255,104,36,${0.46 * st.flood * st.floodBeat})`);
    fl.addColorStop(0.25, `rgba(190,34,10,${0.24 * st.flood * st.floodBeat})`);
    fl.addColorStop(0.63, `rgba(100,6,0,${0.1 * st.flood})`);
    fl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fl;
    ctx.fillRect(fc[0] - FR, fc[1] - FR, FR * 2, FR * 2);
  }
  // The heat around the head.
  const R = 260 * s * (0.7 + 0.3 * amount);
  const glow = ctx.createRadialGradient(centre[0], centre[1] - 40 * s, 0, centre[0], centre[1] - 40 * s, R);
  glow.addColorStop(0, `rgba(255,120,40,${0.34 * amount})`);
  glow.addColorStop(0.35, `rgba(200,40,10,${0.16 * amount})`);
  glow.addColorStop(1, 'rgba(120,10,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(centre[0] - R, centre[1] - 40 * s - R, R * 2, R * 2);
  // Tongues: each is rooted on the dome of the skull and wavers on its own
  // noise; its licks rise up a sinuous centre line, shrinking to a point, so
  // overlapping licks read as flame rather than a cloud.
  const TONGUES = 11;
  for (let i = 0; i < N; i++) {
    const j = i % TONGUES;
    const P = rr(13, 24, i, 3, 960);
    const ph = t / P + rnd(i, 4, 960);
    const cyc = Math.floor(ph);
    const u = ph - cyc;
    // Roots spread from the brow over the crown to the back of the head. The
    // face stays clear, a dark mask round the blazing eyes.
    const th = -Math.PI * (0.14 + (1.0 * j) / (TONGUES - 1)) + nz(t * 0.02, j * 3.3) * 0.1;
    const top = Math.max(0, -Math.sin(th));
    const b = ap(head, CX + Math.cos(th) * RX * 0.86 + rr(-5, 5, i, cyc, 962), CY + Math.sin(th) * RY * 0.86 + rr(-4, 4, i, cyc, 963));
    const H = (150 + 150 * top) * (0.75 + 0.35 * nz(t * 0.11, j * 1.9)) * (0.5 + 0.5 * amount);
    const h = H * Math.pow(u, 0.85);
    // The centre line snakes more the higher it goes, and leans with the draught.
    const wave = Math.sin(h * 0.035 - t * 0.33 + j * 1.7) * (6 + 22 * u) + nz(t * 0.07 + j, u * 2) * 14 * u;
    const x = b[0] + (wave + 18 * u * u + rr(-6, 6, i, cyc, 966)) * s - st.lag[0] * u * 5;
    const y = b[1] - h * s - st.lag[1] * u * 5;
    const r = rr(12, 20, i, cyc, 965) * Math.pow(1 - u, 0.8) * (0.75 + 0.35 * top) * s * (0.6 + 0.4 * amount);
    const heat = (1 - u) * (0.72 + 0.28 * top) + (u < 0.15 ? 0.22 : 0);
    const flick = 0.75 + 0.25 * nz(t * 0.5, i * 2.1);
    // Brightest at the root, thinning as the lick rises and cools.
    const a = (0.45 + 0.55 * Math.min(1, 5 * u)) * Math.pow(1 - u, 0.9) * 0.7 * flick * amount;
    if (a < 0.01 || r < 0.6) continue;
    stamp(ctx, flame(heat), x, y, r, 1.4 + 1.6 * u, a);
  }
  // A sheath of short licks wrapping the whole cranium, so the bone itself
  // burns rather than carrying a torch.
  for (let i = 0; i < 64; i++) {
    const P = rr(9, 16, i, 7, 969);
    const ph = t / P + rnd(i, 8, 969);
    const cyc = Math.floor(ph);
    const u = ph - cyc;
    const th = -Math.PI * rr(0.12, 1.3, i, cyc, 970);
    const b = ap(head, CX + Math.cos(th) * RX * 0.95, CY + Math.sin(th) * RY * 0.95);
    const h = rr(30, 80, i, cyc, 971) * u;
    const x = b[0] + (nz(t * 0.2, i * 0.9) * 8 * u) * s;
    const y = b[1] - h * s;
    const r = rr(8, 13, i, cyc, 972) * (1 - 0.5 * u) * s * amount;
    const a = 0.5 * Math.min(1, 6 * u) * (1 - u) * amount;
    if (a < 0.01 || r < 0.6) continue;
    stamp(ctx, flame(0.95 - 0.7 * u), x, y, r, 1.3 + u, a);
  }
  // Flickers tearing loose above the tongues.
  for (let i = 0; i < 26; i++) {
    const P = rr(18, 34, i, 5, 967);
    const ph = t / P + rnd(i, 6, 967);
    const u = ph - Math.floor(ph);
    const x = centre[0] + (rr(-40, 50, i, Math.floor(ph), 968) + nz(t * 0.1, i * 1.3) * 30 * u) * s;
    const y = centre[1] - (150 + 260 * u) * s;
    const r = (4 + 5 * (1 - u)) * s;
    stamp(ctx, flame(0.5), x, y, r * 2, 1.2, 0.55 * Math.sin(Math.PI * u) * amount);
  }
  ctx.globalAlpha = 1;
  // The eyes blaze through it all: white-hot pinpoints in red halos.
  for (const [ex, ey, w] of [
    [22, -33, 1],
    [33, -34, 0.75],
  ] as const) {
    const p = ap(head, ex, ey);
    const fl = 0.85 + 0.15 * nz(t * 0.6, ex);
    const R2 = 34 * s * w * fl * (0.6 + 0.4 * amount);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R2);
    g.addColorStop(0, `rgba(255,252,235,${amount})`);
    g.addColorStop(0.12, `rgba(255,214,130,${0.9 * amount})`);
    g.addColorStop(0.35, `rgba(255,80,20,${0.3 * amount})`);
    g.addColorStop(1, 'rgba(180,10,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p[0] - R2, p[1] - R2, R2 * 2, R2 * 2);
  }
  ctx.restore();
};
