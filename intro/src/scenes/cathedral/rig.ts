// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// A small 2D puppet rig: hierarchical bones with pivots, forward kinematics,
// two-bone IK for planted feet and gripping hands, and keyframe tracks with
// anticipation / overshoot easing. Characters are authored facing right in
// "character space" (origin on the floor under the root, +x forward, +y down);
// the scene flips and projects them.

export type Mat = readonly [number, number, number, number, number, number];
export type Vec = readonly [number, number];

export const I: Mat = [1, 0, 0, 1, 0, 0];
export const DEG = Math.PI / 180;

export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
export const tr = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const rot = (deg: number): Mat => {
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
};
export const sc = (x: number, y = x): Mat => [x, 0, 0, y, 0, 0];
export const ap = (m: Mat, x: number, y: number): Vec => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];
/** Direction of a matrix's local +y axis, in degrees (bone convention). */
export const boneAngle = (m: Mat) => Math.atan2(-m[2], m[3]) / DEG;
export const mstr = (m: Mat) =>
  `matrix(${m[0].toFixed(4)} ${m[1].toFixed(4)} ${m[2].toFixed(4)} ${m[3].toFixed(4)} ${m[4].toFixed(2)} ${m[5].toFixed(2)})`;

export const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smooth = (u: number) => {
  const x = clampN(u, 0, 1);
  return x * x * (3 - 2 * x);
};
/** 0..1 ramp between two times, smoothed. */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

export type BoneDef = {parent: string | null; x: number; y: number};
export type Skeleton = Record<string, BoneDef>;
export type Pose = Record<string, number>;

/**
 * Forward kinematics. Skeleton insertion order must list parents first.
 * `fore` optionally foreshortens bones along their own axis (a limb swinging
 * toward or away from the camera); children inherit the shortened offset.
 */
export const solveFK = (
  skel: Skeleton,
  pose: Pose,
  root: Mat,
  fore?: Record<string, number>,
): Record<string, Mat> => {
  const out: Record<string, Mat> = {};
  for (const name of Object.keys(skel)) {
    const b = skel[name];
    const parent = b.parent ? out[b.parent] : root;
    let m = mul(mul(parent, tr(b.x, b.y)), rot(pose[name] ?? 0));
    const f = fore?.[name];
    if (f !== undefined && f !== 1) m = mul(m, sc(1, f));
    out[name] = m;
  }
  return out;
};

/** Local angle that points a bone (hanging along +y) at a world direction. */
export const aimLocal = (parentW: Mat, dx: number, dy: number) =>
  wrap(Math.atan2(-dx, dy) / DEG - boneAngle(parentW));

/**
 * Two-bone IK. `parentW` is the world matrix of the upper bone's parent, `off`
 * the upper bone's pivot in that parent. Returns local angles for the upper and
 * lower bone. bend -1 puts the middle joint on the +x side of the limb (knees),
 * +1 on the other side (elbows reaching forward).
 */
export const ik2 = (
  parentW: Mat,
  off: Vec,
  a: number,
  b: number,
  target: Vec,
  bend: number,
): [number, number] => {
  const p = ap(parentW, off[0], off[1]);
  const dx = target[0] - p[0];
  const dy = target[1] - p[1];
  const dist = clampN(Math.hypot(dx, dy), Math.abs(a - b) + 0.5, a + b - 0.05);
  const base = Math.atan2(dy, dx);
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const upperDir = base + bend * Math.acos(clampN(cosA, -1, 1));
  const kx = p[0] + a * Math.cos(upperDir);
  const ky = p[1] + a * Math.sin(upperDir);
  const lowerDir = Math.atan2(target[1] - ky, target[0] - kx);
  const parentAng = boneAngle(parentW);
  const upperWorld = upperDir / DEG - 90;
  const lowerWorld = lowerDir / DEG - 90;
  return [wrap(upperWorld - parentAng), wrap(lowerWorld - upperWorld)];
};

export const wrap = (deg: number) => {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

// ---------------------------------------------------------------------------
// Easing. Bezier-ish curves with anticipation and overshoot for character
// animation, plus the usual in/out shapes.

export type Ease = (u: number) => number;

const cubicBezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const bx = (s: number) => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = (s: number) => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < u) lo = mid;
      else hi = mid;
    }
    return by((lo + hi) / 2);
  };
};

export const E = {
  linear: (u: number) => u,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  sine: (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  out: (u: number) => 1 - Math.pow(1 - u, 3),
  in: (u: number) => u * u * u,
  outQuart: (u: number) => 1 - Math.pow(1 - u, 4),
  inQuad: (u: number) => u * u,
  /** Heavy: slow start, committed follow-through. */
  heavy: cubicBezier(0.55, 0, 0.25, 1),
  /** Wind back a little before going. */
  anticipate: cubicBezier(0.45, -0.25, 0.3, 1),
  /** Arrive past the target and settle back. */
  overshoot: cubicBezier(0.2, 0.1, 0.2, 1.25),
  /** Snap: explosive start, slight overshoot. */
  snap: cubicBezier(0.1, 0.7, 0.15, 1.12),
  /** Both: anticipation and overshoot. */
  whip: cubicBezier(0.5, -0.3, 0.2, 1.3),
};

// ---------------------------------------------------------------------------
// Keyframe tracks.

export type Key<V> = {t: number; v: V; e?: Ease};

export const sampleN = (keys: Key<number>[], t: number): number => {
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.t) {
      const p = keys[i - 1];
      const u = (t - p.t) / Math.max(1e-6, k.t - p.t);
      return lerp(p.v, k.v, (k.e ?? E.inOut)(u));
    }
  }
  return keys[keys.length - 1].v;
};

export type PoseKey = {t: number; pose: Pose; e?: Ease};

/** Resolve partial poses by carrying channels forward, then interpolate. */
export const makePoseTrack = (keys: PoseKey[], channels: string[]) => {
  const full: Pose[] = [];
  let prev: Pose = {};
  for (const k of keys) {
    const p: Pose = {};
    for (const c of channels) p[c] = k.pose[c] ?? prev[c] ?? 0;
    full.push(p);
    prev = p;
  }
  return (t: number): Pose => {
    if (t <= keys[0].t) return {...full[0]};
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i].t) {
        const u = (t - keys[i - 1].t) / Math.max(1e-6, keys[i].t - keys[i - 1].t);
        const e = (keys[i].e ?? E.inOut)(u);
        const out: Pose = {};
        for (const c of channels) out[c] = lerp(full[i - 1][c], full[i][c], e);
        return out;
      }
    }
    return {...full[full.length - 1]};
  };
};

// ---------------------------------------------------------------------------
// Feet. A foot is planted at each step's x from when it lands until the next
// step lifts it, and swings along an arc in between. y is the ground height.

export type Step = {t: number; x: number; y?: number; dur?: number; lift?: number};

export const footAt = (steps: Step[], t: number) => {
  let i = 0;
  while (i + 1 < steps.length && steps[i + 1].t <= t) i++;
  const cur = steps[i];
  const next = steps[i + 1];
  const gy = cur.y ?? 0;
  if (!next || t <= cur.t) return {x: cur.x, y: gy, lift: 0, swing: 0};
  const dur = next.dur ?? 12;
  const liftStart = next.t - dur;
  if (t < liftStart) return {x: cur.x, y: gy, lift: 0, swing: 0};
  const u = (t - liftStart) / dur;
  const e = E.sine(u);
  const ny = next.y ?? 0;
  const lift = Math.sin(Math.PI * u) * (next.lift ?? 18);
  return {x: lerp(cur.x, next.x, e), y: lerp(gy, ny, e) - lift, lift, swing: Math.sin(Math.PI * u)};
};

/**
 * Walk cycle steps tied to the root motion so planted feet never slide.
 * Foot k lands when the root reaches its plant position minus half a step.
 */
export const gaitSteps = (
  rootX: (t: number) => number,
  t0: number,
  t1: number,
  stepLen: number,
  opts: {lift?: number; startNear?: boolean; stance?: number} = {},
) => {
  const x0 = rootX(t0);
  const x1 = rootX(t1);
  const dir = Math.sign(x1 - x0) || 1;
  const stance = opts.stance ?? 14;
  const timeAt = (x: number) => {
    let lo = t0;
    let hi = t1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if ((rootX(mid) - x) * dir < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  // The foot that steps first starts behind.
  const firstNear = opts.startNear ?? true;
  const near: Step[] = [{t: t0 - 1, x: x0 + dir * (firstNear ? -stance : stance)}];
  const far: Step[] = [{t: t0 - 1, x: x0 + dir * (firstNear ? stance : -stance)}];
  const total = Math.abs(x1 - x0);
  const n = Math.max(1, Math.round(total / stepLen));
  const len = total / n;
  let prevLand = t0;
  for (let k = 1; k <= n; k++) {
    const onNear = (k % 2 === 1) === firstNear;
    const plant = x0 + dir * (k * len + len * 0.5);
    const last = k === n;
    const landX = last ? x1 + dir * (onNear ? stance : -stance) : plant;
    const land = last ? t1 : timeAt(plant - dir * len * 0.5);
    const dur = Math.max(6, land - prevLand);
    (onNear ? near : far).push({t: land, x: landX, dur, lift: opts.lift ?? 16});
    prevLand = land;
  }
  // The trailing foot comes alongside at the end.
  const lastOnNear = (n % 2 === 1) === firstNear;
  const trail = lastOnNear ? far : near;
  trail.push({t: t1 + 10, x: x1 + dir * (lastOnNear ? -stance : stance), dur: 12, lift: 10});
  return {near, far};
};
