// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The traveler: hooded cloak, longsword slung on the back, satchel at the
// hip. A pure silhouette, rim-lit warm by the afterglow behind and cool by
// the moon ahead. The cloak and the hood's tail stream back in the headwind.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {project} from './camera';
import {PAR} from './Landscape';
import {Layer} from './util';
import {Foot, WALK, footAt, hipAt, solveLeg} from './walk';

const SIL = '#0a0608';
const LEAN = 4; // degrees forward
const HEM = 80; // cloak front hem, below the hip

type Leg = ReturnType<typeof solveLeg>;
type Pose = {
  hip: {x: number; y: number; phi: number};
  feet: [Foot, Foot];
  legs: [Leg, Leg];
  f: number;
};

const poseAt = (f: number): Pose => {
  const hip = hipAt(f);
  const feet: [Foot, Foot] = [footAt(f, 0), footAt(f, 1)];
  const legs = feet.map((ft, side) => solveLeg(hip.x + (side ? -3 : 3), hip.y, ft.x, ft.y)) as [Leg, Leg];
  return {hip, feet, legs, f};
};

const n1 = (v: number) => v.toFixed(1);

/** Tapered limb segment as a quad. */
const limb = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * 0.5;
  const ny = (dx / l) * 0.5;
  return `M${n1(x0 + nx * w0)},${n1(y0 + ny * w0)} L${n1(x1 + nx * w1)},${n1(y1 + ny * w1)} L${n1(
    x1 - nx * w1,
  )},${n1(y1 - ny * w1)} L${n1(x0 - nx * w0)},${n1(y0 - ny * w0)} Z `;
};

const disc = (x: number, y: number, r: number) =>
  `M${n1(x - r)},${n1(y)} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0 `;

/** Leg parts: thigh, shin, knee and boot as separate shapes (no winding holes). */
const legParts = (leg: Leg, foot: Foot, hx: number, hy: number) => {
  const c = Math.cos(foot.pitch);
  const s = Math.sin(foot.pitch);
  const pt = (x: number, y: number) => `${n1(leg.ax + x * c - y * s)},${n1(leg.ay + x * s + y * c)}`;
  return [
    limb(hx, hy, leg.kx, leg.ky, 20, 13),
    limb(leg.kx, leg.ky, leg.ax, leg.ay, 13, 9.5),
    disc(leg.kx, leg.ky, 6.5),
    `M${pt(-6, -18)} L${pt(6, -18)} L${pt(7, -3)} Q${pt(12, -1)} ${pt(17, 3)} L${pt(17, 8)} L${pt(-7, 8)} L${pt(
      -7,
      0,
    )} Z`,
  ];
};

/** Upper body parts in hip-local coordinates (x forward, y down). */
const upperParts = (pose: Pose) => {
  const {f, hip, legs} = pose;
  const phi = hip.phi;
  // Wind billow: slow gusts plus quick flutter running back along the edges.
  const b = 0.55 + 0.45 * noise2D('cloak', f * 0.03, 0);
  const wave = (k: number, amp: number) => Math.sin(k * 1.3 - f * 0.33) * amp * (0.6 + b * 0.6);
  // The cloak front parts around the leading knee.
  const kneeFront = Math.max(legs[0].kx, legs[1].kx) - hip.x;
  const frontX = Math.max(20, Math.min(38, kneeFront + 6));
  const parts: string[] = [];

  // Cloak: neck -> chest -> front edge -> wavy hem -> billowing back -> shoulder.
  const hemBackX = -44 - 18 * b + wave(0, 3);
  const hemBackY = 84 - 14 * b + wave(1, 3);
  let d = `M10,-84 Q19,-76 19,-62 L19,-36 L${n1(frontX * 0.55 + 9)},8 L${n1(frontX)},${HEM} `;
  const hemN = 9;
  for (let i = 1; i <= hemN; i++) {
    const u = i / hemN;
    const x = frontX + (hemBackX - frontX) * u;
    const y = HEM + (hemBackY - HEM) * u + wave(i * 1.7, 2.5) * u + (i % 2 ? 4 : -2) * u;
    d += `L${n1(x)},${n1(y)} `;
  }
  d += `Q${n1(-38 - 14 * b + wave(3, 4))},${n1(10)} ${n1(-24 - 5 * b + wave(4, 2))},${-40} `;
  d += `Q-20,-70 -12,-80 Q-2,-88 10,-84 Z`;
  parts.push(d);

  // Hood: peaked, with a forward brow over a shadowed face, and a long tail
  // (liripipe) streaming back in the wind.
  parts.push(
    'M-12,-80 Q-18,-98 -13,-114 L-6,-129 Q8,-126 15,-114 Q20,-108 20,-102 Q15,-101 13,-96 Q12,-88 9,-82 Z',
  );
  const tail = 6 * b + wave(5, 3);
  parts.push(
    `M-12,-114 Q${n1(-24 - tail)},${n1(-110 + wave(6, 2))} ${n1(-32 - tail * 1.5)},${n1(-88 + wave(7, 3))} ` +
      `Q${n1(-24 - tail * 0.5)},${n1(-98 + wave(6, 2))} -14,-96 Z`,
  );

  // Satchel at the front of the hip, bouncing a beat behind the walk.
  const sb = Math.sin(2 * Math.PI * phi * 2 - 0.8) * 1.8;
  const sx = frontX * 0.3 + 6;
  parts.push(
    `M${n1(sx)},${n1(-4 + sb)} L${n1(sx + 20)},${n1(-2 + sb)} Q${n1(sx + 23)},${n1(14 + sb)} ${n1(sx + 17)},${n1(
      20 + sb,
    )} L${n1(sx + 3)},${n1(20 + sb)} Q${n1(sx - 2)},${n1(8 + sb)} ${n1(sx)},${n1(-4 + sb)} Z`,
  );
  parts.push(limb(sx + 5, -2 + sb, 14, -76, 3.5, 3.5));

  // Near arm: swings opposite the near leg, the hand out of the cloak front.
  const swing = 0.2 * Math.sin(2 * Math.PI * phi + Math.PI);
  const ax = 5;
  const ay = -72;
  const ex = ax + Math.sin(swing) * 32;
  const ey = ay + Math.cos(swing) * 32;
  const fa = swing + 0.45;
  const hx = ex + Math.sin(fa) * 28;
  const hy = ey + Math.cos(fa) * 28;
  parts.push(limb(ax, ay, ex, ey, 13, 11), limb(ex, ey, hx, hy, 11, 8.5), disc(ex, ey, 5.5), disc(hx, hy, 5));
  return parts;
};

/** Longsword in its scabbard, slung on the back: hilt over the shoulder. */
const swordPath = () => {
  const px = -21;
  const py = -132;
  const tx = -44;
  const ty = 20;
  const l = Math.hypot(tx - px, ty - py);
  const ux = (tx - px) / l;
  const uy = (ty - py) / l;
  const nx = -uy;
  const ny = ux;
  const at = (s: number, w: number) => `${n1(px + ux * s + nx * w)},${n1(py + uy * s + ny * w)}`;
  return [
    disc(px, py, 4.5),
    `M${at(3, -2.4)} L${at(31, -2.8)} L${at(31, 2.8)} L${at(3, 2.4)} Z`,
    // Crossguard, quillons curving slightly toward the blade.
    `M${at(32, -13)} Q${at(29, 0)} ${at(32, 13)} L${at(36.5, 13)} Q${at(33.5, 0)} ${at(36.5, -13)} Z`,
    // Scabbard with a pointed chape.
    `M${at(36, -4.5)} L${at(l - 10, -4)} L${at(l, 0)} L${at(l - 10, 4)} L${at(36, 4.5)} Z`,
  ];
};

/** The whole silhouette. `legs` scales the opacity of the legs, so a rim can fade toward the ground. */
const Figure: React.FC<{pose: Pose; fill: string; opacity?: number; legs?: number}> = ({
  pose,
  fill,
  opacity = 1,
  legs: legA = 1,
}) => {
  const {hip, feet, legs} = pose;
  const parts = [...legParts(legs[1], feet[1], hip.x - 3, hip.y), ...legParts(legs[0], feet[0], hip.x + 3, hip.y)];
  const upper = [...swordPath(), ...upperParts(pose)];
  return (
    <g fill={fill}>
      <g opacity={opacity * legA}>
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g opacity={opacity} transform={`translate(${n1(hip.x)},${n1(hip.y)}) rotate(${LEAN})`}>
        {upper.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </g>
  );
};

export const Traveler: React.FC = () => {
  const f = useCurrentFrame();
  const pose = poseAt(f);
  const groundY = pose.hip.y + WALK.hipH;
  return (
    <Layer p={project(f, PAR.ground)}>
      <svg width={4000} height={1200} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {/* Contact shadow, thrown toward us by the light behind. */}
        <ellipse cx={pose.hip.x} cy={groundY + 4} rx={60} ry={8} fill="rgba(0,0,0,0.45)" />
        {/* Rim light: offset copies toward the light sources, dark figure on top. */}
        {/* Warm afterglow from behind: a soft outer bloom and a thin hot edge,
            strongest on the hood and shoulders, fading toward the shadowed legs. */}
        <g transform="translate(-4.5,-3.5)">
          <Figure pose={pose} fill="#ff6a30" opacity={0.2} legs={0.4} />
        </g>
        <g transform="translate(-2.6,-2.2)">
          <Figure pose={pose} fill="#ff8a48" opacity={0.35} legs={0.4} />
        </g>
        <g transform="translate(-1.4,-1.3)">
          <Figure pose={pose} fill="#ffc98a" opacity={0.9} legs={0.35} />
        </g>
        {/* Cold moonlight from ahead. */}
        <g transform="translate(1.2,-1)">
          <Figure pose={pose} fill="#9fb2e8" opacity={0.35} legs={0.5} />
        </g>
        <Figure pose={pose} fill={SIL} />
      </svg>
    </Layer>
  );
};
