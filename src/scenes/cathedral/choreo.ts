// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Choreography for the duel, in action time (see time.ts). Both fighters are
// pure functions of t: keyed poses and roots, planted feet with IK, procedural
// breathing, a dodge roll, the telegraphed sweep, the delayed overhead, the
// parry, the riposte and the fall to one knee.

import {
  ap,
  aimLocal,
  boneAngle,
  clampN,
  E,
  footAt,
  gaitSteps,
  ik2,
  lerp,
  makePoseTrack,
  Mat,
  mul,
  Pose,
  PoseKey,
  ramp,
  rot,
  sampleN,
  solveFK,
  Step,
  tr,
  Vec,
} from './rig';
import {KNIGHT, KNIGHT_CHANNELS, KNIGHT_HIP_H, KNIGHT_LEN, KP as NP, SHIELD_HIT, SWORD_TIP} from './knight';
import {GS, KING, KING_CHANNELS, KING_HIP_H, KING_LEN, KP as GP} from './king';
import {T} from './time';
import {DAIS, DAIS_TOP, THRONE} from './world';
import {nz, nz2} from './util';

export type Solved = {
  x: number; // root world x
  d: number; // depth
  facing: 1 | -1;
  W: Record<string, Mat>; // character space
  cloth: {outer: Vec[]; inner: Vec[]}; // character space
  skirt?: Vec[];
};

/** Character space -> world (floor-relative) for a solved figure. */
export const toWorld = (s: Solved, p: Vec): Vec => [s.x + p[0] * s.facing, p[1]];
export const toChar = (s: Solved, p: Vec): Vec => [(p[0] - s.x) * s.facing, p[1]];

// ---------------------------------------------------------------------------
// Knight.

const WALK_END = 106;
const WALK_V = 7;
const walkX = (t: number) => {
  const x1 = 500;
  const tA = 78;
  const x0 = x1 - WALK_V * tA - (WALK_V * (WALK_END - tA)) / 2;
  if (t <= tA) return x0 + WALK_V * t;
  const u = Math.min(t, WALK_END) - tA;
  return x0 + WALK_V * tA + WALK_V * u - (WALK_V * u * u) / (2 * (WALK_END - tA));
};
const walk = gaitSteps(walkX, -40, WALK_END, 108, {lift: 13, stance: 15, startNear: false});

const kNear: Step[] = [
  ...walk.near,
  {t: 132, x: 532, dur: 9, lift: 8},
  {t: 186, x: 514, dur: 8, lift: 0},
  {t: 224, x: 566, dur: 10, lift: 9},
  {t: 248, x: 612, dur: 10, lift: 9},
  {t: 272, x: 660, dur: 10, lift: 9},
  {t: 296, x: 676, dur: 8, lift: 6},
  {t: 327, x: 884, dur: 5, lift: 6},
  {t: 342, x: 826, dur: 9, lift: 10},
  {t: 430, x: 852, dur: 6, lift: 8},
  {t: T.riposte - 5, x: 1012, dur: 10, lift: 14},
  {t: T.riposte + 22, x: 872, dur: 10, lift: 10},
  {t: T.phase2 + 16, x: 846, dur: 9, lift: 8},
];
const kFar: Step[] = [
  ...walk.far,
  {t: 139, x: 462, dur: 9, lift: 8},
  {t: 187, x: 446, dur: 8, lift: 0},
  {t: 234, x: 502, dur: 10, lift: 9},
  {t: 260, x: 552, dur: 10, lift: 9},
  {t: 284, x: 606, dur: 10, lift: 9},
  {t: 328, x: 810, dur: 5, lift: 6},
  {t: 350, x: 748, dur: 9, lift: 10},
  {t: T.riposte - 12, x: 800, dur: 9, lift: 6},
  {t: T.riposte + 30, x: 770, dur: 10, lift: 8},
  {t: T.phase2 + 8, x: 744, dur: 9, lift: 8},
];

const kPose = makePoseTrack(
  [
    {t: 0, pose: NP.walk},
    {t: 98, pose: NP.walk},
    {t: 112, pose: NP.stand, e: E.out},
    {t: 119, pose: {...NP.stand, ...NP.lookUp}},
    {t: 125, pose: {...NP.stand, head: -20, chest: -5, spine: -3, nearUpperArm: -16, farUpperArm: 14}, e: E.out},
    {t: 142, pose: NP.guard, e: E.anticipate},
    {t: 174, pose: NP.guard},
    {t: 181, pose: NP.brace, e: E.out},
    {t: 198, pose: NP.brace},
    {t: 214, pose: NP.guard, e: E.inOut},
    {t: 282, pose: NP.guard},
    {t: 297, pose: NP.guardHigh},
    {t: 304, pose: NP.guardHigh},
    {t: 308, pose: NP.tuck, e: E.out},
    {t: 321, pose: NP.tuck},
    {t: 331, pose: NP.guard, e: E.out},
    {t: 362, pose: NP.guard},
    {t: 400, pose: NP.guardHigh, e: E.inOut},
    {t: 426, pose: NP.guardHigh},
    {t: 431.4, pose: NP.parry, e: E.snap},
    {t: 432, pose: NP.parry},
    {t: 440, pose: NP.parryFollow, e: E.out},
    {t: 448, pose: NP.cock, e: E.inOut},
    {t: T.riposte - 7, pose: NP.cock},
    {t: T.riposte, pose: NP.lunge, e: E.snap},
    {t: T.riposte + 12, pose: NP.lunge},
    {t: T.riposte + 26, pose: NP.recover, e: E.inOut},
    {t: T.stagger + 22, pose: NP.lowGuard},
    {t: T.phase2, pose: NP.lowGuard},
    {t: T.phase2 + 9, pose: NP.shieldUp, e: E.snap},
    {t: 700, pose: NP.shieldUp},
  ] as PoseKey[],
  KNIGHT_CHANNELS,
);

// Crouch (root drop) and a bias of the pelvis over the feet.
const kDrop = [
  {t: 0, v: 0},
  {t: 108, v: 0},
  {t: 126, v: 4},
  {t: 142, v: 16},
  {t: 176, v: 16},
  {t: 184, v: 26},
  {t: 200, v: 22},
  {t: 214, v: 16},
  {t: 296, v: 24},
  {t: 331, v: 20},
  {t: 360, v: 16},
  {t: 404, v: 24},
  {t: 430, v: 30},
  {t: 440, v: 26},
  {t: T.riposte - 6, v: 22},
  {t: T.riposte, v: 44, e: E.snap},
  {t: T.riposte + 12, v: 40},
  {t: T.riposte + 26, v: 18},
  {t: T.phase2, v: 14},
  {t: T.phase2 + 9, v: 26, e: E.out},
];
const kBias = [
  {t: 108, v: 0},
  {t: 142, v: 8},
  {t: 184, v: -6},
  {t: 214, v: 6},
  {t: 426, v: 6},
  {t: 432, v: 18, e: E.out},
  {t: T.riposte - 6, v: 4},
  {t: T.riposte, v: 44, e: E.snap},
  {t: T.riposte + 14, v: 40},
  {t: T.riposte + 28, v: 8},
  {t: T.phase2 + 12, v: -4},
];
const kDepth = [
  {t: 0, v: 1},
  {t: 212, v: 1},
  {t: 252, v: 1.07},
  {t: 292, v: 1.03},
  {t: 306, v: 1.0},
  // After the cut to the low angle he stands nearer the lens, a silhouette.
  {t: T.phase2 - 0.001, v: 1.0},
  {t: T.phase2, v: 0.86, e: E.linear},
];

const ROLL = {t0: 305, t1: 322, x0: 694, x1: 850};

const breathe = (t: number, rate: number, amt: number) => Math.sin(t * rate) * amt;

export const knightAt = (t: number, king?: Solved): Solved => {
  const pose = kPose(t);
  const exertion = ramp(t, T.riposte, T.riposte + 20) * (1 - ramp(t, T.phase2 - 10, T.phase2 + 20));
  pose.chest += breathe(t, 0.11 + exertion * 0.06, 1.2 + exertion * 2);
  pose.head += nz(t * 0.01, 11) * 2;
  pose.farForearm += nz(t * 0.02, 12) * 2;
  pose.nearForearm += nz(t * 0.02, 13) * 1.5;

  const fN = footAt(kNear, t);
  const fF = footAt(kFar, t);
  const inWalk = t < WALK_END;
  let rx = inWalk ? walkX(t) : (fN.x + fF.x) / 2 + sampleN(kBias, t);
  // Pelvis bob while walking: lowest when both feet are down.
  const stride = inWalk ? Math.abs(Math.sin(((walkX(t) - walkX(-40)) / 108) * Math.PI)) : 0;
  let ry = -KNIGHT_HIP_H + sampleN(kDrop, t) + (inWalk ? 6 - stride * 7 : 0);
  let rr = 0;
  if (inWalk) pose.pelvis += Math.sin(((walkX(t) - walkX(-40)) / 108) * Math.PI) * 2;

  // Dodge roll: the body curls into a ball that rolls forward one full turn.
  const rollW = ramp(t, ROLL.t0 - 3, ROLL.t0 + 2) * (1 - ramp(t, ROLL.t1, ROLL.t1 + 8));
  if (rollW > 0) {
    const u = clampN((t - ROLL.t0) / (ROLL.t1 - ROLL.t0), 0, 1);
    const ang = 360 * E.inOut(u);
    const bx = lerp(ROLL.x0, ROLL.x1, E.sine(u));
    const by = -96;
    // Pelvis sits behind and below the ball's centre in the tucked pose.
    const off = ap(rot(ang), -24, 34);
    rx = lerp(rx, bx + off[0], rollW);
    ry = lerp(ry, by + off[1], rollW);
    rr = ang; // 0 or 360 outside the roll, so no pop when the weight fades
  }
  const d = sampleN(kDepth, t);

  const root: Mat = mul(tr(0, ry), rot(pose.pelvis + rr));
  const toC = (w: {x: number; y: number}): Vec => [w.x - rx, w.y - KNIGHT_LEN.ankle];

  // Legs: planted by IK except while tucked.
  const legIK = 1 - rollW;
  let W = solveFK(KNIGHT, pose, root);
  for (const side of ['near', 'far'] as const) {
    const f = side === 'near' ? fN : fF;
    const [a, b] = ik2(W.pelvis, [KNIGHT[`${side}Thigh`].x, KNIGHT[`${side}Thigh`].y], KNIGHT_LEN.thigh, KNIGHT_LEN.shin, toC(f), -1);
    pose[`${side}Thigh`] = lerp(pose[`${side}Thigh`], a, legIK);
    pose[`${side}Shin`] = lerp(pose[`${side}Shin`], b, legIK);
  }
  W = solveFK(KNIGHT, pose, root);
  for (const side of ['near', 'far'] as const) {
    const f = side === 'near' ? fN : fF;
    const shinAng = boneAngle(W[`${side}Shin`]);
    const flat = -shinAng + f.swing * 14;
    pose[`${side}Foot`] = lerp(pose[`${side}Foot`], flat, legIK);
  }

  // Riposte: the sword arm drives the point into the king's ribs.
  const thrust = king ? ramp(t, T.riposte - 9, T.riposte - 1) * (1 - ramp(t, T.riposte + 13, T.riposte + 22)) : 0;
  if (king && thrust > 0) {
    W = solveFK(KNIGHT, pose, root);
    const ribs = ap(king.W.chest, 8, -56);
    const target: Vec = [toWorld(king, ribs)[0] - rx, ribs[1]];
    const sh = ap(W.chest, KNIGHT.farUpperArm.x, KNIGHT.farUpperArm.y);
    const dx = target[0] - sh[0];
    const dy = target[1] - sh[1];
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const reach = KNIGHT.sword.y + SWORD_TIP[1] - 64; // bury ~64 units
    const hand: Vec = [target[0] - ux * reach, target[1] - uy * reach];
    const [a, b] = ik2(W.chest, [KNIGHT.farUpperArm.x, KNIGHT.farUpperArm.y], KNIGHT_LEN.upper, KNIGHT_LEN.fore, hand, 1);
    pose.farUpperArm = lerp(pose.farUpperArm, a, thrust);
    pose.farForearm = lerp(pose.farForearm, b, thrust);
    pose.farHand = lerp(pose.farHand, 0, thrust);
    W = solveFK(KNIGHT, pose, root);
    pose.sword = lerp(pose.sword, aimLocal(W.farHand, ux, uy), thrust);
  }
  W = solveFK(KNIGHT, pose, root);

  return {x: rx, d, facing: 1, W, cloth: knightCape(t, W, rx), skirt: knightSkirt(W, t)};
};

// Wind gusts: the roar's blast, from the king (world +x) toward the knight.
const gust = (t: number) => Math.max(0, 1 - Math.abs(t - 186) / 22) * (t > 178 ? 1 : 0);
const knightRootX = (t: number) => {
  if (t < WALK_END) return walkX(t);
  const a = footAt(kNear, t);
  const b = footAt(kFar, t);
  return (a.x + b.x) / 2;
};

/** Cape: two chains from the shoulders whose segments trail the past motion. */
const cloth = (
  t: number,
  anchor: Vec,
  rootX: (t: number) => number,
  facing: number,
  n: number,
  seg: number,
  lagStep: number,
  drag: number,
  flutter: number,
  wind: (t: number) => number,
  seed: number,
  spread: number,
) => {
  const outer: Vec[] = [anchor];
  const inner: Vec[] = [anchor];
  let po: Vec = anchor;
  let pi: Vec = anchor;
  for (let i = 0; i < n; i++) {
    const lag = (i + 1) * lagStep;
    const v = (rootX(t - lag) - rootX(t - lag - 3)) / 3; // world units per frame
    const vc = v * facing; // character space
    const w = wind(t - lag) * facing;
    const fl = nz(t * 0.05 - i * 0.35, seed) * flutter * (i + 1) / n;
    const fl2 = nz2(t * 0.04 - i * 0.3, seed) * flutter * 0.5 * (i + 1) / n;
    // Direction: gravity plus drag against motion plus wind.
    const dx = -vc * drag - w * 2.2 + fl - spread * (i + 1) / n;
    const dy = 1;
    const l = Math.hypot(dx, dy);
    po = [po[0] + (dx / l) * seg, po[1] + (dy / l) * seg];
    const dxi = dx * 0.35 + fl2;
    const li = Math.hypot(dxi, dy);
    pi = [pi[0] + (dxi / li) * seg * 0.98, pi[1] + (dy / li) * seg * 0.98];
    outer.push(po);
    inner.push(pi);
  }
  return {outer, inner};
};

const knightCape = (t: number, W: Record<string, Mat>, rx: number) => {
  void rx;
  const anchor = ap(W.chest, -17, -60);
  return cloth(t, anchor, knightRootX, 1, 7, 24, 2.2, 0.16, 0.5, gust, 21, 0.25);
};

// Tear depths along the tabard's hem, front to back: a worn, ragged edge.
const HEM = [0, 6, -2, 9, -3, 7, 1, 10, -1, 5];

const knightSkirt = (W: Record<string, Mat>, t: number): Vec[] => {
  const bf = ap(W.pelvis, 21, -6);
  const bb = ap(W.pelvis, -20, -6);
  const kf = ap(W.nearThigh, 16, 58);
  const kb = ap(W.farThigh, -18, 60);
  const kn = ap(W.nearThigh, -6, 64);
  const sway = nz(t * 0.05, 31) * 3;
  const line: Vec[] = [
    [kf[0] + 4, kf[1]],
    [kn[0], kn[1] + 4],
    [kb[0] - 3, kb[1]],
  ];
  const hem: Vec[] = [];
  for (let i = 0; i < HEM.length; i++) {
    const u = i / (HEM.length - 1);
    const [a, b, v] = u < 0.5 ? [line[0], line[1], u * 2] : [line[1], line[2], (u - 0.5) * 2];
    const flutter = nz2(t * 0.09, i * 1.3) * 1.6;
    hem.push([a[0] + (b[0] - a[0]) * v + sway, a[1] + (b[1] - a[1]) * v + HEM[i] + flutter]);
  }
  return [bb, bf, ...hem];
};

// ---------------------------------------------------------------------------
// King.

const SEAT_X = THRONE.x + 6;

/** Ground height at a world x along the fighting plane. */
export const floorAt = (x: number) => (x > DAIS.x0 + DAIS.step ? DAIS_TOP : x > DAIS.x0 ? -DAIS.h1 : 0);
const SEAT_Y = DAIS_TOP - 150 - 12;

const gNear: Step[] = [
  {t: 0, x: 1452, y: DAIS_TOP},
  {t: 166, x: 1466, y: DAIS_TOP, dur: 8, lift: 6},
  {t: 216, x: 1424, y: DAIS_TOP, dur: 12, lift: 14},
  {t: 240, x: 1262, y: 0, dur: 13, lift: 26},
  {t: 266, x: 1064, y: 0, dur: 14, lift: 22},
  {t: 303, x: 1036, y: 0, dur: 5, lift: 6},
  {t: 326, x: 1140, dur: 10, lift: 14},
  {t: 352, x: 1162, dur: 10, lift: 10},
  {t: 430, x: 1118, dur: 6, lift: 10},
  {t: 456, x: 1180, dur: 8, lift: 14},
  {t: T.riposte + 20, x: 1236, dur: 10, lift: 16},
];
const gFar: Step[] = [
  {t: 0, x: 1488, y: DAIS_TOP},
  {t: 170, x: 1548, y: DAIS_TOP, dur: 8, lift: 8},
  {t: 228, x: 1372, y: -DAIS.h1, dur: 12, lift: 18},
  {t: 253, x: 1160, y: 0, dur: 13, lift: 24},
  {t: 280, x: 1128, y: 0, dur: 10, lift: 10},
  {t: 338, x: 1262, dur: 10, lift: 12},
  {t: 442, x: 1302, dur: 6, lift: 12},
  {t: T.riposte + 10, x: 1328, dur: 10, lift: 14},
];

const gPose = makePoseTrack(
  [
    {t: 0, pose: GP.slump},
    {t: T.eyes, pose: GP.slump},
    {t: T.eyes + 6, pose: GP.wake, e: E.out},
    {t: T.rise, pose: GP.wake},
    {t: T.rise + 12, pose: GP.risePush, e: E.inOut},
    {t: T.roar - 4, pose: GP.stand, e: E.out},
    {t: T.roar + 6, pose: GP.roar, e: E.snap},
    {t: 198, pose: GP.roar},
    {t: 210, pose: GP.stand, e: E.inOut},
    {t: 222, pose: GP.drag},
    {t: 280, pose: GP.drag},
    {t: 297, pose: GP.sweepWind, e: E.heavy},
    {t: 300, pose: GP.sweepWind},
    {t: 312, pose: GP.sweepEnd, e: E.out},
    {t: 322, pose: GP.sweepEnd},
    {t: 344, pose: GP.twoHand, e: E.inOut},
    {t: T.windup, pose: GP.twoHand},
    {t: 392, pose: GP.overhead, e: E.heavy},
    {t: 407, pose: {...GP.overhead, spine: -12, chest: -16}},
    {t: 414, pose: {...GP.overhead, spine: -15, chest: -19, nearUpperArm: -176, farUpperArm: -168}, e: E.inOut},
    {t: 422, pose: {...GP.overhead, spine: -15, chest: -19, nearUpperArm: -178, farUpperArm: -170}},
    {t: 432, pose: GP.strike, e: E.in},
    {t: 443, pose: GP.parried, e: E.outQuart},
    {t: T.riposte - 6, pose: GP.reel},
    {t: T.riposte + 1, pose: GP.impaled, e: E.snap},
    {t: T.riposte + 9, pose: {...GP.impaled, spine: -2, chest: -2, head: -12}},
    {t: T.stagger, pose: GP.hunch, e: E.inOut},
    {t: T.stagger + 16, pose: GP.kneel, e: E.heavy},
    {t: T.crownFall - 2, pose: GP.kneel},
    {t: T.crownFall + 2, pose: GP.droop, e: E.snap},
    {t: T.phase2, pose: GP.droop},
    // The fire takes him: the skull snaps up, jaw agape.
    {t: T.phase2 + 5, pose: {...GP.droop, head: -8, neck: 4, jaw: 40}, e: E.snap},
    {t: T.phase2 + 14, pose: {...GP.droop, spine: 8, chest: 10, head: -4, neck: 6, jaw: 34}},
    // Then he rises, heavy, and looms over the knight.
    {t: T.phase2 + 52, pose: GP.risen, e: E.heavy},
  ] as PoseKey[],
  KING_CHANNELS,
);

// Root height below standing (positive = lower), and x bias over the feet.
const gDrop = [
  {t: T.rise, v: 0},
  {t: T.roar, v: 8},
  {t: 212, v: 24},
  {t: 282, v: 30},
  {t: 300, v: 40},
  {t: 308, v: 52, e: E.snap},
  {t: 330, v: 30},
  {t: 392, v: 18},
  {t: 422, v: 22},
  {t: 432, v: 44, e: E.in},
  {t: 445, v: 26},
  {t: T.riposte, v: 34},
  {t: T.stagger, v: 44},
  {t: T.stagger + 16, v: 124, e: E.heavy},
  {t: T.phase2 + 12, v: 120},
  {t: T.phase2 + 52, v: 14, e: E.heavy},
];
const gBias = [
  {t: 170, v: 0},
  {t: 297, v: 10},
  {t: 306, v: -18, e: E.snap},
  {t: 330, v: 6},
  {t: 392, v: 18},
  {t: 432, v: -22, e: E.in},
  {t: 442, v: 30, e: E.out},
  {t: T.riposte + 1, v: 34},
  {t: T.stagger, v: 10},
  {t: T.stagger + 16, v: 20},
];
const gDepth = [
  {t: 0, v: 1.1},
  {t: 205, v: 1.08},
  {t: 262, v: 1.0},
];

const kingRootX = (t: number) => {
  if (t < T.rise) return SEAT_X;
  const a = footAt(gNear, t);
  const b = footAt(gFar, t);
  const standX = (a.x + b.x) / 2 - sampleN(gBias, t);
  return lerp(SEAT_X, standX, ramp(t, T.rise, T.rise + 20));
};

/** Sweep yaw (degrees): 180 behind, +90 toward the camera, 0 at the knight. */
export const sweepYaw = (t: number) =>
  sampleN(
    [
      {t: 296, v: 175},
      {t: 300, v: 160, e: E.in},
      {t: 303.5, v: 90, e: E.in},
      {t: 307, v: 5, e: E.linear},
      {t: 311, v: -60, e: E.out},
      {t: 316, v: -80, e: E.out},
    ],
    t,
  );
const sweepW = (t: number) => ramp(t, 294, 299) * (1 - ramp(t, 314, 324));

export type KingExtra = {
  swordTip: Vec; // character space
  swordBack: boolean; // blade behind the body (sweep, far side)
};

export const kingAt = (t: number, knight?: Solved): Solved & KingExtra => {
  const pose = gPose(t);
  const alive = t >= T.eyes;
  pose.chest += breathe(t, 0.07, alive ? 1.4 : 0.2);
  pose.head += alive ? nz(t * 0.015, 41) * 2.5 : 0;
  // Roar: the jaw shudders.
  const roaring = ramp(t, T.roar + 4, T.roar + 8) * (1 - ramp(t, 196, 204));
  pose.jaw += roaring * Math.sin(t * 2.3) * 5;
  // Windup: the tremble of the held blow.
  const hold = ramp(t, 392, 398) * (1 - ramp(t, 420, 424));
  pose.nearForearm += hold * Math.sin(t * 1.7) * 1.4;
  pose.chest += hold * Math.sin(t * 1.3) * 0.8;

  const fN = footAt(gNear, t);
  const fF = footAt(gFar, t);
  const rx = kingRootX(t);
  const stand = ramp(t, T.rise + 2, T.rise + 20);
  const standY = Math.min(fN.y, fF.y) * 0.5 + Math.max(fN.y, fF.y) * 0.5;
  const bob = t > 205 && t < 290 ? Math.abs(Math.sin(((kingRootX(t) - kingRootX(205)) / 125) * Math.PI)) * 8 : 0;
  const ry = lerp(SEAT_Y - 14, standY - KING_HIP_H + sampleN(gDrop, t) - bob + 4, stand);
  const d = sampleN(gDepth, t);
  const facing = -1 as const;
  const toC = (w: {x: number; y: number}): Vec => [(w.x - rx) * facing, w.y - KING_LEN.ankle];

  const root: Mat = mul(tr(0, ry), rot(pose.pelvis));
  let W = solveFK(KING, pose, root);
  // Legs by IK. Kneeling: the far knee goes to the floor behind.
  const kneel = ramp(t, T.stagger + 2, T.stagger + 16) * (1 - ramp(t, T.phase2 + 14, T.phase2 + 46));
  for (const side of ['near', 'far'] as const) {
    let f = side === 'near' ? fN : fF;
    if (side === 'far' && kneel > 0) {
      const knee = {x: rx + 40, y: 0};
      const heel = {x: rx + 40 + 118, y: -8 + KING_LEN.ankle};
      f = {...f, x: lerp(f.x, heel.x, kneel), y: lerp(f.y, heel.y, kneel)};
      void knee;
    }
    const [a, b] = ik2(W.pelvis, [KING[`${side}Thigh`].x, KING[`${side}Thigh`].y], KING_LEN.thigh, KING_LEN.shin, toC(f), -1);
    pose[`${side}Thigh`] = a;
    pose[`${side}Shin`] = b;
  }
  W = solveFK(KING, pose, root);
  for (const side of ['near', 'far'] as const) {
    const f = side === 'near' ? fN : fF;
    const tip = side === 'far' ? kneel * 70 : 0;
    pose[`${side}Foot`] = -boneAngle(W[`${side}Shin`]) + f.swing * 12 + tip;
  }

  // Sword constraints.
  const fore: Record<string, number> = {};
  let swordBack = false;
  const sw = sweepW(t);
  if (sw > 0) {
    // The horizontal sweep: arm and blade swing as one lever through depth.
    const yaw = (sweepYaw(t) * Math.PI) / 180;
    const tilt = 0.22;
    const dx = Math.cos(yaw) * Math.cos(tilt);
    const dy = Math.sin(tilt) - Math.sin(yaw) * 0.18;
    const f = Math.max(0.12, Math.hypot(dx, dy));
    W = solveFK(KING, pose, root);
    const up = aimLocal(W.chest, dx, dy);
    pose.nearUpperArm = lerp(pose.nearUpperArm, up, sw);
    pose.nearForearm = lerp(pose.nearForearm, 0, sw);
    pose.nearHand = lerp(pose.nearHand, 0, sw);
    pose.sword = lerp(pose.sword ?? 0, 0, sw);
    const ff = lerp(1, f, sw);
    fore.nearUpperArm = ff;
    fore.nearForearm = 1;
    fore.nearHand = 1;
    fore.sword = 1;
    swordBack = Math.sin(yaw) < -0.25 && sw > 0.5;
  }
  W = solveFK(KING, pose, root, fore);

  const grip = (w: Record<string, Mat>) => ap(w.nearHand, KING.sword.x, KING.sword.y);
  const aimAt = (target: Vec, weight: number) => {
    if (weight <= 0) return;
    const g = grip(W);
    const a = aimLocal(W.nearHand, target[0] - g[0], target[1] - g[1]);
    pose.sword = lerp(pose.sword ?? 0, a, weight);
  };
  // Enthroned: the greatsword stands planted before him and both hands rest
  // on its pommel; he keeps hold of it as he rises, then wrenches it free.
  const throne = 1 - ramp(t, T.rise + 10, T.rise + 22);
  if (throne > 0) {
    const tip: Vec = [SEAT_X - (DAIS.x0 + 40), -DAIS.h1 + 16];
    const ul = Math.hypot(0.42, 1);
    const u: Vec = [0.42 / ul, 1 / ul];
    const gp: Vec = [tip[0] - u[0] * GS.tip, tip[1] - u[1] * GS.tip];
    const hand: Vec = [gp[0] - u[0] * KING.sword.y, gp[1] - u[1] * KING.sword.y];
    const [a, b] = ik2(W.chest, [KING.nearUpperArm.x, KING.nearUpperArm.y], KING_LEN.upper, KING_LEN.fore, hand, 1);
    pose.nearUpperArm = lerp(pose.nearUpperArm, a, throne);
    pose.nearForearm = lerp(pose.nearForearm, b, throne);
    W = solveFK(KING, pose, root, fore);
    pose.nearHand = lerp(pose.nearHand, aimLocal(W.nearForearm, u[0], u[1]), throne);
    W = solveFK(KING, pose, root, fore);
    pose.sword = lerp(pose.sword ?? 0, aimLocal(W.nearHand, u[0], u[1]), throne);
    const top: Vec = [gp[0] + u[0] * 26 + 4, gp[1] + u[1] * 26];
    const [c, e] = ik2(W.chest, [KING.farUpperArm.x, KING.farUpperArm.y], KING_LEN.upper, KING_LEN.fore, top, 1);
    pose.farUpperArm = lerp(pose.farUpperArm, c, throne);
    pose.farForearm = lerp(pose.farForearm, e, throne);
    W = solveFK(KING, pose, root, fore);
  }
  // Dragging: the point scrapes the floor behind.
  const drag = ramp(t, 200, 212) * (1 - ramp(t, 282, 292));
  if (drag > 0) {
    const g = grip(W);
    const L = GS.tip + 2;
    // Find the ground under the trailing point (dais, step or nave floor).
    let floorY: number = floorAt(rx - g[0] * facing + L * 0.8);
    for (let i = 0; i < 2; i++) {
      const dy = clampN(floorY - g[1], 0, L * 0.98);
      const dx = -Math.sqrt(L * L - dy * dy);
      floorY = floorAt(rx + (g[0] + dx) * facing);
    }
    const dy = clampN(floorY - g[1], 0, L * 0.98);
    const dx = -Math.sqrt(L * L - dy * dy);
    aimAt([g[0] + dx, g[1] + dy], drag);
  }
  // The strike: the hands arrive above and behind the knight's raised shield
  // so the blade comes down across it on the parry frame.
  const strike = ramp(t, 423, 431.5) * (1 - ramp(t, 432.2, 434.5));
  if (knight && strike > 0) {
    const hit = toWorld(knight, ap(knight.W.shield, SHIELD_HIT[0], SHIELD_HIT[1]));
    const handW: Vec = [hit[0] + 62, hit[1] - 250];
    const handC: Vec = [(handW[0] - rx) * facing, handW[1]];
    const [a, b] = ik2(W.chest, [KING.nearUpperArm.x, KING.nearUpperArm.y], KING_LEN.upper, KING_LEN.fore, handC, 1);
    pose.nearUpperArm = lerp(pose.nearUpperArm, a, strike);
    pose.nearForearm = lerp(pose.nearForearm, b, strike);
    W = solveFK(KING, pose, root, fore);
    const hitC: Vec = [(hit[0] - rx) * facing, hit[1] - 4];
    aimAt(hitC, strike);
  }
  // Leaning on the sword while kneeling.
  const lean = ramp(t, T.stagger + 4, T.stagger + 14) * (1 - ramp(t, T.phase2 + 12, T.phase2 + 40));
  if (lean > 0) aimAt(toC({x: rx + 30, y: 8}), lean);
  W = solveFK(KING, pose, root, fore);

  // Second hand on the grip for two-handed work.
  const twoHand = ramp(t, 332, 344) * (1 - ramp(t, 433, 438));
  if (twoHand > 0) {
    const target = ap(W.sword, 0, GS.second);
    const [a, b] = ik2(W.chest, [KING.farUpperArm.x, KING.farUpperArm.y], KING_LEN.upper, KING_LEN.fore, target, 1);
    pose.farUpperArm = lerp(pose.farUpperArm, a, twoHand);
    pose.farForearm = lerp(pose.farForearm, b, twoHand);
    W = solveFK(KING, pose, root, fore);
  }

  const swordTip = ap(W.sword, 0, GS.tip);
  const mantle = kingMantle(t, W);
  return {x: rx, d, facing, W, cloth: mantle, swordTip, swordBack};
};

const kingWind = (t: number) => (t > 170 && t < 200 ? -0.5 * Math.sin(((t - 170) / 30) * Math.PI) : 0);
const kingMantle = (t: number, W: Record<string, Mat>) => {
  const anchor = ap(W.chest, -34, -88);
  return cloth(t, anchor, kingRootX, -1, 8, 40, 3.2, 0.12, 0.4, kingWind, 57, 0.62);
};

// ---------------------------------------------------------------------------
// Both, solved together (the knight's riposte aims at the king's ribs; the
// king's blow aims at the knight's shield).

export const duelAt = (t: number) => {
  const k0 = knightAt(t);
  const g = kingAt(t, k0);
  const k = t > T.riposte - 12 && t < T.riposte + 26 ? knightAt(t, g) : k0;
  return {knight: k, king: g};
};

export type Duel = ReturnType<typeof duelAt>;

/** Knight's world-space root x at time t (cheap, for effects). */
export {knightRootX, kingRootX, walkX};
export type {Pose};
