// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Shot B: insert on the gloved hand at the hilt. The grip tightens on a
// heartbeat, then the longsword comes out of the scabbard in one pull (motion
// smear, a flash of steel at the throat), the camera whips with it, the tip
// rises into guard and a star glint runs the edge to the point.

import {palette} from '../../theme';
import {C, CUT, drawT, heartbeat} from './beats';
import {Cam, applyCam, churchPulse} from './shotA';
import {
  P,
  blob,
  buf,
  clamp01,
  fbm,
  glow,
  lerp,
  mottleTexture,
  rgba,
  rim,
  smear,
  smooth,
  spline,
  toScreen,
  withBounds,
  woolTexture,
} from './util';

const MOON = '#aebfd8';
const MOON_HOT = '#eef3fb';
const RED = palette.bloodBright;
const STEEL_DARK = '#1a1c22';

// Sword proportions (local units: x along the sword toward the pommel,
// y across it; the guard sits at the origin).
const BLADE = 1350;
const BLADE_W = 27;
const GUARD = 106;
const GRIP0 = 14;
const GRIP1 = 250;
const POMMEL = 282;
const HAND_X = 128; // where the fist sits on the grip
const HAND_K = 1.22; // glove scale
const MOUTH_X = -26; // scabbard throat, just below the guard

// The scabbard hangs from the left hip, hilt forward and up.
const G0: P = [900, 575];
const TH0 = (-18 * Math.PI) / 180;
const TH1 = (13 * Math.PI) / 180;
const U0: P = [Math.cos(TH0), Math.sin(TH0)];
const PULL = BLADE + 40;
/** Shutter in frames: a long one for the pull, short once the blade turns. */
const shutterAt = (f: number) => (f < C.swordDraw + 7 ? 0.9 : 0.35);

type Pose = {g: P; th: number; grip: number; speed: number};

/** The held breath before the cut: 0 until ~frame 196, 1 at the cut. */
const tailT = (f: number) => smooth((f - (C.cutToBlack - 29)) / 29);

/** Where the sword is at (fractional) frame f. */
const poseAt = (f: number): Pose => {
  const d = drawT(f);
  // A small settle back into the scabbard just before the pull.
  const cock = -7 * smooth((f - 114) / 5) * (1 - d);
  const s = d * PULL + cock;
  // Once clear, the tip rises into guard about the fist with a small overshoot.
  const r = clamp01((f - (C.swordDraw + 6.5)) / 10);
  const rise = r <= 0 ? 0 : 1 - Math.exp(-r * 5) * Math.cos(r * 7.5) * (1 - r);
  const th =
    TH0 +
    (TH1 - TH0) * rise +
    fbm('swsway', f * 0.02) * 0.012 * smooth((f - 135) / 10) -
    0.05 * smooth((f - 140) / 85);
  // Pivot about the fist: keep the hand on the draw line, rotate the sword.
  const hx = G0[0] + U0[0] * (s + HAND_X);
  const hy = G0[1] + U0[1] * (s + HAND_X);
  // After the draw the arm settles in a little and breathes.
  const settle = smooth((f - 126) / 16);
  const bx = hx - settle * 60 + fbm('hbx', f * 0.03) * 4 * settle;
  const by = hy + settle * 30 + fbm('hby', f * 0.03) * 4 * settle;
  const g: P = [bx - Math.cos(th) * HAND_X, by - Math.sin(th) * HAND_X];
  // Heartbeat squeezes, then a slow final tightening into the cut.
  const grip = heartbeat(f) * (f < C.swordDraw ? 1 : 0.7) + 0.6 * tailT(f);
  const d2 = drawT(f + 0.5) - drawT(f - 0.5);
  return {g, th, grip, speed: d2 * PULL};
};

/**
 * Forearm direction relative to the sword: up and toward the pommel. It
 * swings back as the sword turns, then settles off to the upper right once
 * the blade is up, so the arm reads as reaching back to the body.
 */
const armAngle = (f: number, pose: Pose) =>
  -Math.PI / 2 + 0.42 - (pose.th - TH0) * 0.7 + 0.34 * smooth((f - 124) / 18);

/**
 * Worn-leather mottling over the glove and sleeve, then the light falling
 * away up the arm: only the fist sits in the light, the sleeve sinks into
 * the dark before it reaches the frame edge.
 */
const shadeHand = (ctx: CanvasRenderingContext2D, f: number, cam: Cam, pose: Pose) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const mot = ctx.createPattern(mottleTexture(), 'repeat')!;
  const h = toScreen(cam, 1, handAt(f));
  mot.setTransform(new DOMMatrix().translate(h[0], h[1]).rotate((pose.th * 180) / Math.PI).scale(2.2 * cam.s));
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = mot;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalAlpha = 1;
  const a = armAngle(f, pose) + pose.th;
  const d: P = [Math.cos(a), Math.sin(a)];
  const k = cam.s * HAND_K;
  const g = ctx.createLinearGradient(h[0] + d[0] * 70 * k, h[1] + d[1] * 70 * k, h[0] + d[0] * 560 * k, h[1] + d[1] * 560 * k);
  g.addColorStop(0, 'rgba(3,2,3,0)');
  g.addColorStop(0.3, 'rgba(3,2,3,0.4)');
  g.addColorStop(0.55, 'rgba(3,2,3,0.65)');
  g.addColorStop(1, 'rgba(3,2,3,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
};

/** The fist position in world space. */
const handAt = (f: number): P => {
  const p = poseAt(f);
  return [p.g[0] + Math.cos(p.th) * HAND_X, p.g[1] + Math.sin(p.th) * HAND_X];
};

/** Camera: tight on the fist, whips wide with the draw, then a slow push. */
export const camB = (f: number): Cam => {
  const h0 = handAt(CUT);
  const h1 = handAt(150);
  const s0 = 1.55 + 0.07 * smooth((f - CUT) / (C.swordDraw - CUT));
  const s1 = 1.06 + 0.07 * smooth((f - 134) / 91) + 0.05 * tailT(f) * tailT(f);
  const start: P = [h0[0] - 70, h0[1] + 25];
  const end: P = [h1[0] - 450 / 1.06, h1[1] - 80 / 1.06];
  const t = drawT(f - 0.8);
  const follow = t * 0.92 + 0.08 * smooth((f - 124) / 14);
  return {
    x: lerp(start[0], end[0], follow),
    y: lerp(start[1], end[1], follow) - 30 * smooth((f - 134) / 91),
    s: lerp(s0, s1, Math.pow(follow, 0.8)),
  };
};

// ---------------------------------------------------------------- background

/** Behind the hilt: the traveler's cloak, then (after the whip) the night. */
export const paintBgB = (ctx: CanvasRenderingContext2D, f: number, res: number) => {
  const pulse = churchPulse(f);
  const {c, ctx: o} = buf('bgB', ctx.canvas.width, ctx.canvas.height);
  o.setTransform(ctx.getTransform());
  applyCam(o, camB(f), BG_PAR);
  paintBgWorld(o, f, pulse);
  const a = toScreen(camB(f), BG_PAR, [1000, 500]);
  const b = toScreen(camB(f - shutterAt(f)), BG_PAR, [1000, 500]);
  smear(ctx, c, (a[0] - b[0]) * res, (a[1] - b[1]) * res);
};

const BG_PAR = 0.55;

const paintBgWorld = (ctx: CanvasRenderingContext2D, f: number, pulse: number) => {
  ctx.fillStyle = '#05060b';
  ctx.fillRect(-600, -900, 4200, 2800);
  // The night beyond the traveler: church glow off to the right, cold above.
  glow(ctx, 2300, 200, 1300, '#1a2238', 0.8);
  glow(ctx, 2150, 520, 1000, RED, 0.3 * pulse, 1, 0.8);
  glow(ctx, 2150, 480, 360, '#ff3a1e', 0.35 * pulse, 0.6, 1.1);
  glow(ctx, 1500, -400, 900, '#4b5c80', 0.35);
  // The church behind, a dark mass with its lancet window burning.
  ctx.fillStyle = '#060409';
  ctx.beginPath();
  ctx.moveTo(2050, 1400);
  ctx.lineTo(2050, 0);
  ctx.lineTo(2250, -250);
  ctx.lineTo(2450, 0);
  ctx.lineTo(2450, 1400);
  ctx.closePath();
  ctx.fill();
  glow(ctx, 2250, 180, 300, RED, 0.6 * pulse, 0.45, 1);
  ctx.fillStyle = rgba('#ff3a1e', 0.55 * pulse);
  ctx.beginPath();
  ctx.moveTo(2215, 330);
  ctx.lineTo(2215, 110);
  ctx.quadraticCurveTo(2250, 40, 2285, 110);
  ctx.lineTo(2285, 330);
  ctx.closePath();
  ctx.fill();
  // Bokeh: a few out-of-focus lamps in the town below.
  for (let i = 0; i < 9; i++) {
    const x = 1600 + ((i * 263) % 1300);
    const y = 700 + ((i * 97) % 300);
    glow(ctx, x, y, 40 + (i % 3) * 16, i % 3 ? palette.ember : RED, 0.35 * (0.7 + 0.3 * Math.sin(f * 0.13 + i)));
  }
  // Cold moonlit mist hanging behind the gate, so its bars can read.
  glow(ctx, 1950, 250, 1000, '#34425f', 0.5, 1.2, 0.8);
  glow(ctx, 1700, 900, 800, '#2a3450', 0.35, 1.5, 0.5);
  // The churchyard gate between us and the church: spear-topped iron bars,
  // black against the glow, their left edges touched by the moon.
  for (let i = 0; i < 14; i++) {
    const x = 1420 + i * 150 + ((i * 41) % 30);
    const top = -300 + (i % 2) * 50 + Math.abs(i - 7) * 14;
    ctx.fillStyle = '#030205';
    ctx.fillRect(x - 13, top, 26, 2200);
    ctx.beginPath();
    ctx.moveTo(x - 24, top + 10);
    ctx.lineTo(x, top - 70);
    ctx.lineTo(x + 24, top + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(MOON, 0.1);
    ctx.fillRect(x - 11, top + 20, 4, 2200);
  }
  ctx.fillStyle = '#040306';
  ctx.fillRect(1380, -160, 2200, 26);
  ctx.fillRect(1380, 1160, 2200, 30);

  // The cloak: a dark wool wall filling the left of the world, folds swaying.
  const gust = 0.5 + 0.5 * fbm('bgust', f * 0.015);
  const edge: P[] = [];
  for (let i = 0; i <= 10; i++) {
    const y = -900 + i * 280;
    edge.push([1380 + fbm('cle', f * 0.02 + i * 0.4) * 60 * gust + i * 14, y]);
  }
  const cloak = new Path2D();
  cloak.moveTo(-800, -900);
  spline(cloak, edge, false, true);
  cloak.lineTo(-800, 2000);
  cloak.closePath();
  ctx.fillStyle = '#0e0b0b';
  ctx.fill(cloak);
  ctx.save();
  ctx.clip(cloak);
  for (let i = 0; i < 7; i++) {
    const x = -100 + i * 230 + ((i * 97) % 80) + fbm('bf' + i, f * 0.02) * 30 * gust;
    const w = 70 + ((i * 53) % 90);
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.45, rgba('#3a4050', 0.12 + (i % 3) * 0.05));
    g.addColorStop(0.6, 'rgba(0,0,0,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, 300);
    ctx.rotate(0.12 - i * 0.03);
    ctx.fillRect(-w, -1300, 2 * w, 2900);
    ctx.restore();
  }
  // A red haze creeping round the traveler from the church behind.
  glow(ctx, 1500, 500, 700, RED, 0.12 * pulse, 0.6, 1.2);
  ctx.restore();
  // Red rim along the cloak's edge from the church.
  ctx.save();
  ctx.lineWidth = 70;
  ctx.strokeStyle = rgba(RED, 0.12 * pulse);
  const rimPath = new Path2D();
  spline(rimPath, edge);
  ctx.translate(-30, 0);
  ctx.stroke(rimPath);
  ctx.restore();
  // Mist drifting across the night beyond.
  for (let i = 0; i < 6; i++) {
    const x = 1300 + ((i * 377 - f * (1.5 + i * 0.3)) % 1400 + 1400) % 1400;
    const y = -100 + i * 160 + fbm('bm' + i, f * 0.01) * 40;
    glow(ctx, x, y, 420, '#39425a', 0.18, 1, 0.35);
  }
};

// ---------------------------------------------------------------- foreground

/**
 * Two layers, each smeared along its own screen motion over the shutter:
 * the sword (with the fist) and the world-fixed scabbard and cloak, which
 * sits on top so it sheathes the hidden part of the blade.
 */
export const paintFgB = (ctx: CanvasRenderingContext2D, f: number) => {
  const pulse = churchPulse(f);
  const cam = camB(f);
  const SHUTTER = shutterAt(f);
  const camP = camB(f - SHUTTER);
  const pose = poseAt(f);

  const {c: sw, ctx: s} = buf('swordL');
  applyCam(s, cam, 1);
  s.translate(pose.g[0], pose.g[1]);
  s.rotate(pose.th);
  paintSword(s, f, pose, pulse);
  // The hand gets its own buffer so worn-leather texture and the light
  // falloff up the arm touch only the glove and sleeve.
  const {c: hc, ctx: hx} = buf('handL');
  applyCam(hx, cam, 1);
  hx.translate(pose.g[0], pose.g[1]);
  hx.rotate(pose.th);
  paintHand(hx, f, pose, pulse);
  shadeHand(hx, f, cam, pose);
  s.save();
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.drawImage(hc, 0, 0);
  s.restore();
  const h = toScreen(cam, 1, handAt(f));
  const hp = toScreen(camP, 1, handAt(f - SHUTTER));
  smear(ctx, sw, h[0] - hp[0], h[1] - hp[1]);

  const {c: st, ctx: w} = buf('staticL');
  applyCam(w, cam, 1);
  paintScabbard(w, pulse, drawT(f) * PULL);
  paintFlap(w, f, pulse);
  const a = toScreen(cam, 1, G0);
  const b = toScreen(camP, 1, G0);
  smear(ctx, st, a[0] - b[0], a[1] - b[1]);

  paintEmergeFlash(ctx, f);
  paintGlint(ctx, f);
};

/** A fold of the cloak hanging in front of the hip, stirring in the wind. */
const paintFlap = (ctx: CanvasRenderingContext2D, f: number, pulse: number) => {
  const gust = 0.5 + 0.5 * fbm('fgust', f * 0.02);
  const sway = fbm('flap', f * 0.03) * 14 * gust;
  const flap = blob(
    [
      [200, 200],
      [770, 200],
      [750, 330 + sway * 0.4],
      [690, 420 + sway],
      [600, 478 + sway * 1.2],
      [480, 500 + sway * 0.8],
      [340, 520 + sway * 0.5],
      [200, 560],
    ],
    0.4,
  );
  ctx.fillStyle = '#0c0909';
  ctx.fill(flap);
  ctx.save();
  ctx.clip(flap);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = ctx.createPattern(woolTexture(), 'repeat')!;
  ctx.fill(flap);
  ctx.restore();
  rim(ctx, flap, 3, -8, MOON, {blur: 6, alpha: 0.18, key: 'rimB'});
  rim(ctx, flap, -8, -6, RED, {blur: 6, alpha: 0.22 * pulse, key: 'rimB'});
};

/** Scabbard in world space: leather over wood with a steel locket. */
const paintScabbard = (ctx: CanvasRenderingContext2D, pulse: number, s: number) => {
  ctx.save();
  ctx.translate(G0[0], G0[1]);
  ctx.rotate(TH0);
  ctx.translate(MOUTH_X, 0);
  const body = new Path2D();
  body.moveTo(-8, -33);
  body.lineTo(-BLADE - 60, -25);
  body.lineTo(-BLADE - 60, 25);
  body.lineTo(-8, 33);
  body.closePath();
  const g = ctx.createLinearGradient(0, -34, 0, 34);
  g.addColorStop(0, '#4a3628');
  g.addColorStop(0.18, '#241810');
  g.addColorStop(0.7, '#0c0807');
  g.addColorStop(1, '#2a0e0c');
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(woolTexture(), 'repeat')!;
  ctx.fill(body);
  ctx.globalAlpha = 1;
  // Scuffs and a seam down the leather.
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-100, 8);
  ctx.lineTo(-BLADE, 6);
  ctx.stroke();
  ctx.restore();
  // Top edge: long cold specular line.
  const sp = ctx.createLinearGradient(0, 0, -900, 0);
  sp.addColorStop(0, rgba(MOON, 0.5));
  sp.addColorStop(1, rgba(MOON, 0));
  ctx.fillStyle = sp;
  ctx.fillRect(-BLADE, -32, BLADE - 10, 2.5);
  // Iron band with the suspension ring.
  const band = (x: number, w: number) => {
    const bg = ctx.createLinearGradient(0, -36, 0, 36);
    bg.addColorStop(0, '#8d98aa');
    bg.addColorStop(0.2, '#3a404c');
    bg.addColorStop(0.6, '#121418');
    bg.addColorStop(1, '#2a1412');
    ctx.fillStyle = bg;
    ctx.fillRect(x - w, -36, w, 72);
  };
  band(-300, 26);
  // Frog strap rising from the band to the belt under the cloak.
  ctx.fillStyle = '#150e0a';
  ctx.beginPath();
  ctx.moveTo(-322, -30);
  ctx.lineTo(-280, -30);
  ctx.lineTo(-250, -420);
  ctx.lineTo(-300, -420);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(MOON, 0.2);
  ctx.fillRect(-323, -420, 3, 390);
  // Throat: the steel locket, with an engraved band.
  const lock = new Path2D();
  lock.moveTo(0, -38);
  lock.lineTo(-96, -35);
  lock.quadraticCurveTo(-110, 0, -96, 35);
  lock.lineTo(0, 38);
  lock.closePath();
  const lg = ctx.createLinearGradient(0, -38, 0, 38);
  lg.addColorStop(0, '#7e8898');
  lg.addColorStop(0.12, '#3c424e');
  lg.addColorStop(0.55, '#16181e');
  lg.addColorStop(1, '#3a1614');
  ctx.fillStyle = lg;
  ctx.fill(lock);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  for (const x of [-14, -82]) {
    ctx.beginPath();
    ctx.moveTo(x, -37);
    ctx.lineTo(x, 37);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(palette.gold, 0.4);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = -76; x < -22; x += 9) {
    ctx.moveTo(x, -20);
    ctx.quadraticCurveTo(x + 4, 0, x, 20);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(RED, 0.3 * pulse);
  ctx.fillRect(-96, 31, 96, 5);
  // The dark mouth, visible once the blade is gone.
  if (s > BLADE) {
    ctx.fillStyle = '#020203';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 5, 29, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/** The longsword, drawn in local sword space (guard at origin). */
const paintSword = (ctx: CanvasRenderingContext2D, f: number, pose: Pose, pulse: number) => {
  // World light directions expressed in sword space, for the rims.
  const moonDir = rotate([1, 0.6], -pose.th); // light from the upper left
  const redDir = rotate([-1, 0.2], -pose.th); // glow from behind, right
  const raise = clamp01((pose.th - TH0) / (TH1 - TH0));

  // Blade: the scabbard layer covers whatever is still sheathed.
  const blade = new Path2D();
  blade.moveTo(-6, -BLADE_W);
  blade.lineTo(-BLADE + 120, -BLADE_W * 0.72);
  blade.quadraticCurveTo(-BLADE + 40, -BLADE_W * 0.4, -BLADE, 0);
  blade.quadraticCurveTo(-BLADE + 40, BLADE_W * 0.4, -BLADE + 120, BLADE_W * 0.72);
  blade.lineTo(-6, BLADE_W);
  blade.closePath();
  // Two bevels: the upper takes the moon, the lower goes dark.
  const bg = ctx.createLinearGradient(0, -BLADE_W, 0, BLADE_W);
  const sheen = 0.6 + 0.3 * raise;
  bg.addColorStop(0, rgba('#e6edf7', sheen));
  bg.addColorStop(0.1, '#8894a6');
  bg.addColorStop(0.44, '#353b48');
  bg.addColorStop(0.5, '#0c0d12');
  bg.addColorStop(0.58, '#1a1a20');
  bg.addColorStop(0.9, '#2c2226');
  bg.addColorStop(1, '#5a3a3a');
  ctx.fillStyle = STEEL_DARK;
  ctx.fill(blade);
  ctx.fillStyle = bg;
  ctx.fill(blade);
  // A long soft reflection sliding along the flat as the angle changes.
  // ...and keeps creeping toward the point as the blade slowly turns.
  const refl = -BLADE * (0.2 + 0.6 * raise) - 380 * smooth((f - 138) / 87) - 260 * tailT(f);
  const rg = ctx.createLinearGradient(refl - 420, 0, refl + 420, 0);
  rg.addColorStop(0, 'rgba(180,200,230,0)');
  rg.addColorStop(0.5, `rgba(180,200,230,${0.3 + 0.3 * tailT(f)})`);
  rg.addColorStop(1, 'rgba(180,200,230,0)');
  ctx.fillStyle = rg;
  ctx.fill(blade);
  // The church's red throb, faint on the lower flat.
  ctx.save();
  ctx.clip(blade);
  const rr = ctx.createLinearGradient(0, 0, 0, BLADE_W);
  rr.addColorStop(0, rgba(RED, 0));
  rr.addColorStop(1, rgba(RED, 0.3 * pulse));
  ctx.fillStyle = rr;
  ctx.fillRect(-BLADE, 0, BLADE, BLADE_W);
  ctx.restore();
  // Fuller: the central groove.
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-BLADE * 0.72, 0);
  ctx.stroke();
  ctx.strokeStyle = rgba('#a9b6c9', 0.3);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.lineTo(-BLADE * 0.72, -3);
  ctx.stroke();
  // The honed edge: a hairline of light.
  ctx.strokeStyle = rgba(MOON_HOT, 0.8);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -BLADE_W + 0.8);
  ctx.lineTo(-BLADE + 120, -BLADE_W * 0.72 + 0.8);
  ctx.quadraticCurveTo(-BLADE + 40, -BLADE_W * 0.4, -BLADE + 2, 0);
  ctx.stroke();
  ctx.strokeStyle = rgba('#d08070', 0.25 * pulse);
  ctx.beginPath();
  ctx.moveTo(-6, BLADE_W - 0.8);
  ctx.lineTo(-BLADE + 120, BLADE_W * 0.72 - 0.8);
  ctx.stroke();

  // Crossguard: a straight bar with quillons drooping toward the blade.
  const G = GUARD;
  const guard = new Path2D();
  guard.moveTo(-8, -G);
  guard.quadraticCurveTo(0, -G * 0.55, 8, -24);
  guard.lineTo(14, -20);
  guard.lineTo(14, 20);
  guard.lineTo(8, 24);
  guard.quadraticCurveTo(0, G * 0.55, -8, G);
  guard.lineTo(-20, G - 4);
  guard.quadraticCurveTo(-13, G * 0.55, -15, 32);
  guard.lineTo(-24, 28);
  guard.lineTo(-24, -28);
  guard.lineTo(-15, -32);
  guard.quadraticCurveTo(-13, -G * 0.55, -20, -G + 4);
  guard.closePath();
  withBounds(guard, [-26, -G - 4, 16, G + 4]);
  steelFill(ctx, guard, -26, 16, pose.th);
  // Pitting and a worn gilt inlay along the bar.
  ctx.save();
  ctx.clip(guard);
  for (let i = 0; i < 26; i++) {
    const y = -G + ((i * 37) % (2 * G));
    ctx.fillStyle = `rgba(0,0,0,${0.25 + (i % 3) * 0.12})`;
    ctx.fillRect(-24 + ((i * 13) % 36), y, 1.5 + (i % 2), 2 + (i % 4));
  }
  ctx.strokeStyle = rgba(palette.gold, 0.28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -G * 0.8);
  ctx.quadraticCurveTo(-4, 0, -6, G * 0.8);
  ctx.stroke();
  ctx.restore();
  rim(ctx, guard, moonDir[0] * 3, moonDir[1] * 3, MOON_HOT, {blur: 1.5, alpha: 0.45, key: 'rimB'});
  rim(ctx, guard, redDir[0] * 5, redDir[1] * 5, RED, {blur: 3, alpha: 0.6 * pulse, key: 'rimB'});
  // Quillon finials.
  for (const y of [-G, G]) {
    const k = new Path2D();
    k.ellipse(-14, y, 9, 8, 0, 0, Math.PI * 2);
    steelFill(ctx, k, -24, y - 8, pose.th);
    ctx.fillStyle = rgba(MOON_HOT, 0.5);
    ctx.beginPath();
    ctx.ellipse(-14 - moonDir[0] * 4, y - moonDir[1] * 4, 3, 1.6, pose.th, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grip: leather cord wrap, spiralling.
  const grip = new Path2D();
  grip.moveTo(GRIP0, -20);
  grip.quadraticCurveTo((GRIP0 + GRIP1) / 2, -25, GRIP1, -18);
  grip.lineTo(GRIP1, 18);
  grip.quadraticCurveTo((GRIP0 + GRIP1) / 2, 25, GRIP0, 20);
  grip.closePath();
  withBounds(grip, [GRIP0, -26, GRIP1, 26]);
  ctx.fillStyle = '#24170f';
  ctx.fill(grip);
  ctx.save();
  ctx.clip(grip);
  for (let x = GRIP0 - 30; x < GRIP1 + 30; x += 11) {
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, -26);
    ctx.lineTo(x + 16, 26);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,150,110,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, -26);
    ctx.lineTo(x + 20, 26);
    ctx.stroke();
  }
  const sg = ctx.createLinearGradient(0, -25, 0, 25);
  sg.addColorStop(0, 'rgba(170,190,220,0.25)');
  sg.addColorStop(0.35, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = sg;
  ctx.fillRect(GRIP0, -26, GRIP1 - GRIP0, 52);
  ctx.restore();
  rim(ctx, grip, moonDir[0] * 4, moonDir[1] * 4, MOON, {blur: 2, alpha: 0.5, key: 'rimB'});

  // Pommel: a wheel with a raised boss, and the peen.
  const pom = new Path2D();
  pom.ellipse(POMMEL, 0, 22, 40, 0, 0, Math.PI * 2);
  withBounds(pom, [POMMEL - 23, -41, POMMEL + 23, 41]);
  const peen = new Path2D();
  peen.ellipse(POMMEL + 22, 0, 8, 10, 0, 0, Math.PI * 2);
  steelFill(ctx, peen, POMMEL + 12, -10, pose.th);
  steelFill(ctx, pom, POMMEL - 22, -40, pose.th);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(POMMEL, 0, 13, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = rgba(palette.gold, 0.32);
  ctx.beginPath();
  ctx.ellipse(POMMEL, 0, 6, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  rim(ctx, pom, moonDir[0] * 5, moonDir[1] * 5, MOON_HOT, {blur: 2, alpha: 0.6, key: 'rimB'});
  rim(ctx, pom, redDir[0] * 5, redDir[1] * 5, RED, {blur: 3, alpha: 0.7 * pulse, key: 'rimB'});
};

/** Old, oiled steel: mostly dark, a cold band only on the moon side. */
const steelFill = (ctx: CanvasRenderingContext2D, p: Path2D, x0: number, y0: number, th: number) => {
  const d = rotate([0.5, 1], -th);
  const g = ctx.createLinearGradient(x0, y0, x0 + d[0] * 60, y0 + d[1] * 60);
  g.addColorStop(0, '#8e98a8');
  g.addColorStop(0.12, '#525a68');
  g.addColorStop(0.38, '#1a1c22');
  g.addColorStop(0.75, '#0c0c10');
  g.addColorStop(1, '#2c1714');
  ctx.fillStyle = g;
  ctx.fill(p);
};

const rotate = ([x, y]: P, a: number): P => {
  const l = Math.hypot(x, y) || 1;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [(x * c - y * s) / l, (x * s + y * c) / l];
};

/**
 * The gloved fist around the grip (sword space). Knuckles toward camera:
 * the back of the hand above the grip, fingers crossing the front of it and
 * curling under, the thumb wrapped over the index finger, and the flared
 * gauntlet cuff rising out of frame.
 */
const paintHand = (ctx: CanvasRenderingContext2D, f: number, pose: Pose, pulse: number) => {
  const moonDir = rotate([1, 0.6], -pose.th);
  const redDir = rotate([-1, 0.2], -pose.th);
  const sq = pose.grip; // squeeze on the heartbeat
  const tremble = fbm('trem', f * 0.4) * 0.6;
  ctx.save();
  ctx.translate(HAND_X, tremble);
  ctx.scale(HAND_K, HAND_K);
  const armA = armAngle(f, pose);
  const arm: P = [Math.cos(armA), Math.sin(armA)];
  const perp: P = [-arm[1], arm[0]];
  const at = (a: number, p: number): P => [arm[0] * a + perp[0] * p, arm[1] * a + perp[1] * p];
  const mr = (p: Path2D, d = 5, a = 0.6, col = MOON) =>
    rim(ctx, p, moonDir[0] * d, moonDir[1] * d, col, {blur: 2, alpha: a, key: 'rimB'});
  const rr = (p: Path2D, d = 5, a = 0.45) =>
    rim(ctx, p, redDir[0] * d, redDir[1] * d, RED, {blur: 3, alpha: a * pulse, key: 'rimB'});
  const leather = (p: Path2D, cx: number, w: number, hi = 0.3) => {
    // Cylinder shading across the part, lit from the moon side.
    const side = moonDir[0] > 0 ? -1 : 1;
    const g = ctx.createLinearGradient(cx + side * w, 0, cx - side * w, 0);
    g.addColorStop(0, rgba('#5c4636', hi + 0.1));
    g.addColorStop(0.16, '#241810');
    g.addColorStop(0.6, '#110b08');
    g.addColorStop(1, '#060404');
    ctx.fillStyle = g;
    ctx.fill(p);
  };

  // Sleeve, then the gauntlet cuff.
  const sleeve = blob([at(80, -80), at(760, -150), at(760, 170), at(80, 96)], 0.2);
  ctx.fillStyle = '#0b0809';
  ctx.fill(sleeve);
  ctx.save();
  ctx.clip(sleeve);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = ctx.createPattern(woolTexture(), 'repeat')!;
  ctx.fill(sleeve);
  ctx.restore();
  mr(sleeve, 8, 0.35);
  rr(sleeve, 10, 0.5);
  const cuff = blob(
    [at(62, -70), at(120, -84), at(210, -104), at(226, -92), at(222, 100), at(206, 112), at(120, 96), at(62, 78)],
    0.3,
  );
  const cg = ctx.createLinearGradient(at(0, -100)[0], at(0, -100)[1], at(0, 110)[0], at(0, 110)[1]);
  cg.addColorStop(0, '#3a281b');
  cg.addColorStop(0.35, '#1a110b');
  cg.addColorStop(1, '#0c0706');
  ctx.fillStyle = cg;
  ctx.fill(cuff);
  // Buckled strap around the cuff.
  const s0 = at(150, -96);
  const s1 = at(150, 104);
  const s2 = at(170, 104);
  const s3 = at(170, -96);
  ctx.fillStyle = '#120b07';
  ctx.beginPath();
  ctx.moveTo(s0[0], s0[1]);
  ctx.lineTo(s1[0], s1[1]);
  ctx.lineTo(s2[0], s2[1]);
  ctx.lineTo(s3[0], s3[1]);
  ctx.closePath();
  ctx.fill();
  // A tarnished brass buckle: frame, tongue, and a glint on its top bar.
  const bk = at(160, -20);
  ctx.save();
  ctx.translate(bk[0], bk[1]);
  ctx.rotate(armA + Math.PI / 2);
  const bg = ctx.createLinearGradient(0, -12, 0, 12);
  bg.addColorStop(0, '#8a7040');
  bg.addColorStop(0.4, '#4a3a1c');
  bg.addColorStop(1, '#1a130a');
  ctx.strokeStyle = bg;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.roundRect(-13, -10, 26, 20, 4);
  ctx.stroke();
  ctx.fillStyle = '#2e2412';
  ctx.fillRect(-2, -10, 4, 20);
  ctx.fillStyle = rgba('#e8d4a0', 0.35);
  ctx.fillRect(-10, -12, 9, 1.5);
  ctx.restore();
  mr(cuff, 6, 0.5);
  rr(cuff, 6, 0.4);

  // Back of the hand: a padded leather mound above the grip.
  const back = blob(
    [
      [-74, -36],
      [-72, -78],
      [-44, -112],
      [36, -118],
      [74, -84],
      [80, -38],
      [10, -30],
    ],
    0.5,
  );
  leather(back, 0, 80, 0.3);
  // Tendons under the leather, and the seam.
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const x of [-40, -6, 28, 58]) {
    ctx.moveTo(x, -44);
    ctx.quadraticCurveTo(x + 4, -80, x + 12, -110);
  }
  ctx.stroke();
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = 'rgba(210,180,130,0.3)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-66, -60);
  ctx.quadraticCurveTo(-10, -104, 70, -66);
  ctx.stroke();
  ctx.restore();
  mr(back, 6, 0.6, MOON_HOT);
  rr(back, 6, 0.4);

  // Fingers: four rounded bands crossing the grip, index nearest the guard.
  const xs = [-54, -18, 18, 52];
  for (let i = 3; i >= 0; i--) {
    const x = xs[i] - (i - 1.5) * sq * 1.5;
    const w = i === 3 ? 15 : 18;
    const top = -44;
    const bot = 34 - sq * 2 - (i === 3 ? 4 : 0);
    const fin = blob(
      [
        [x - w, top],
        [x + w, top - 2],
        [x + w + 2, -6],
        [x + w - 1, bot - 8],
        [x + 2, bot],
        [x - w + 1, bot - 8],
        [x - w - 2, -6],
      ],
      0.55,
    );
    leather(fin, x, w, 0.22 + (i === 0 ? 0.08 : 0));
    // Knuckle cap and joint creases.
    glow(ctx, x - moonDir[0] * 4, top + 6, 12, '#a89078', 0.16 + sq * 0.18, 1.2, 0.8);
    // Creases where the leather folds at each joint, never quite regular.
    const j = (i % 2) * 3 - 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x - w + 3, -12 + j);
    ctx.quadraticCurveTo(x - 2, -5 + j, x + w - 2, -11 + j);
    ctx.moveTo(x - w + 5, -17 + j);
    ctx.quadraticCurveTo(x - 4, -13 + j, x + 2, -15 + j);
    ctx.moveTo(x - w + 4, 14 - j);
    ctx.quadraticCurveTo(x, 19 - j, x + w - 3, 13 - j);
    ctx.stroke();
    // Scuffed pale leather on the knuckle ridge.
    ctx.strokeStyle = rgba('#8a7058', 0.18 + sq * 0.12);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, top + 5);
    ctx.lineTo(x + w * 0.3, top + 3 + (i % 3));
    ctx.stroke();
    // A dark gap between fingers.
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w + 1, top + 4);
    ctx.lineTo(x + w + 1, bot - 10);
    ctx.stroke();
    mr(fin, 4, 0.5);
    rr(fin, 3, 0.22);
  }
  // Thumb wrapped over the index and middle fingers.
  const thumb = blob(
    [
      [-84, -58],
      [-90, -26],
      [-74, 0],
      [-50, 12],
      [-40, 2],
      [-52, -16],
      [-62, -40],
      [-66, -62],
    ],
    0.5,
  );
  leather(thumb, -56, 36, 0.35);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-76, -18);
  ctx.quadraticCurveTo(-66, -12, -62, -2);
  ctx.stroke();
  mr(thumb, 5, 0.7, MOON_HOT);
  rr(thumb, 4, 0.35);
  ctx.restore();
};

/** The blade catching light as it leaves the throat. */
const paintEmergeFlash = (ctx: CanvasRenderingContext2D, f: number) => {
  const d = drawT(f) * PULL;
  const pose = poseAt(f);
  if (d <= 0 || d > BLADE + 30) return;
  const k = clamp01(pose.speed / 60) * (1 - clamp01((d - BLADE + 60) / 90));
  if (k <= 0.01) return;
  ctx.save();
  applyCam(ctx, camB(f), 1);
  // The throat is fixed in world space; light streaks up the blade from it.
  const x = G0[0] + U0[0] * MOUTH_X;
  const y = G0[1] + U0[1] * MOUTH_X;
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x + 60 * U0[0], y + 60 * U0[1] - 22, 220, MOON_HOT, 0.5 * k, 2.4, 0.18, TH0);
  glow(ctx, x + 6, y - 24, 46, '#ffffff', 0.9 * k, 2.6, 0.3, TH0);
  glow(ctx, x, y, 160, '#7f9ccc', 0.25 * k);
  ctx.restore();
};

/** Star glint travelling down the edge from guard to point, with a lens streak. */
const paintGlint = (ctx: CanvasRenderingContext2D, f: number) => {
  const t = (f - C.bladeGlint) / 16;
  if (t < 0 || t > 1.15) return;
  const pose = poseAt(f);
  const u = smooth(clamp01(t));
  const along = -230 - u * (BLADE - 270);
  // Edge point in sword space -> world.
  const ey = -BLADE_W * lerp(1, 0.75, clamp01((-along - (BLADE - 160)) / 160));
  const c = Math.cos(pose.th);
  const s = Math.sin(pose.th);
  const wx = pose.g[0] + along * c - ey * s;
  const wy = pose.g[1] + along * s + ey * c;
  // Snaps on at the cue, swells, then dies toward the point.
  const a = (1 + 0.4 * Math.max(0, 1 - t * 8)) * (1 - smooth((t - 0.75) / 0.4));
  if (a <= 0) return;
  ctx.save();
  applyCam(ctx, camB(f), 1);
  ctx.globalCompositeOperation = 'lighter';
  const flick = 0.85 + 0.15 * Math.sin(f * 2.1);
  const r = 70 * a * flick;
  // Anamorphic streak across the frame, faint blue.
  glow(ctx, wx, wy, 1000, '#7fa2d8', 0.25 * a, 1, 0.01);
  glow(ctx, wx, wy, 420, '#dbe8ff', 0.5 * a, 1, 0.018);
  // Soft halo and a hot core.
  glow(ctx, wx, wy, r * 1.7, '#b8cbe8', 0.5 * a);
  glow(ctx, wx, wy, r * 0.35, '#ffffff', a);
  // Four-point star, turned slightly off the blade axis.
  ctx.translate(wx, wy);
  ctx.rotate(pose.th * 0.5 + 0.1);
  for (let i = 0; i < 4; i++) {
    const len = (i % 2 ? 0.6 : 1) * r * 2.4;
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -3.2 * a);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 3.2 * a);
    ctx.closePath();
    ctx.globalAlpha = a;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};
