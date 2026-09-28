// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The knight: full plate, crimson tabard with a faded star, a battered heater
// shield, a longsword and a tattered cape. Authored facing right; every part
// is drawn in its bone's local frame (limbs hang along +y from their pivot).

import React from 'react';
import {Ids, url} from './figure';
import {Pose, Skeleton} from './rig';

export const KNIGHT: Skeleton = {
  pelvis: {parent: null, x: 0, y: 0},
  spine: {parent: 'pelvis', x: 0, y: -8},
  chest: {parent: 'spine', x: 2, y: -48},
  head: {parent: 'chest', x: 5, y: -64},
  farUpperArm: {parent: 'chest', x: -7, y: -52},
  farForearm: {parent: 'farUpperArm', x: 0, y: 66},
  farHand: {parent: 'farForearm', x: 0, y: 58},
  sword: {parent: 'farHand', x: 0, y: 10},
  farThigh: {parent: 'pelvis', x: -6, y: 6},
  farShin: {parent: 'farThigh', x: 0, y: 86},
  farFoot: {parent: 'farShin', x: 0, y: 84},
  nearThigh: {parent: 'pelvis', x: 5, y: 6},
  nearShin: {parent: 'nearThigh', x: 0, y: 86},
  nearFoot: {parent: 'nearShin', x: 0, y: 84},
  nearUpperArm: {parent: 'chest', x: 3, y: -52},
  nearForearm: {parent: 'nearUpperArm', x: 0, y: 66},
  nearHand: {parent: 'nearForearm', x: 0, y: 58},
  shield: {parent: 'nearForearm', x: 10, y: 30},
};

export const KNIGHT_LEN = {thigh: 86, shin: 84, ankle: 12, upper: 66, fore: 58, hip: 6};
export const KNIGHT_HIP_H = KNIGHT_LEN.thigh + KNIGHT_LEN.shin + KNIGHT_LEN.ankle + KNIGHT_LEN.hip;

export const KNIGHT_CHANNELS = Object.keys(KNIGHT);

// Poses: degrees. Up-pointing bones (spine, chest, head): + leans forward.
// Hanging bones (arms, legs): + swings back, - swings forward.
export const KP: Record<string, Pose> = {
  stand: {
    pelvis: 0, spine: 2, chest: 3, head: -3,
    nearUpperArm: -6, nearForearm: -38, nearHand: 0, shield: 8,
    farUpperArm: 8, farForearm: -16, farHand: 4, sword: -58,
  },
  walk: {
    pelvis: 2, spine: 4, chest: 4, head: -4,
    nearUpperArm: -8, nearForearm: -42, nearHand: 0, shield: 8,
    farUpperArm: 6, farForearm: -20, farHand: 4, sword: -56,
  },
  lookUp: {head: -14, chest: 0, spine: 0},
  guard: {
    pelvis: 4, spine: 3, chest: 1, head: -6,
    nearUpperArm: -48, nearForearm: -74, nearHand: 6, shield: -6,
    farUpperArm: 44, farForearm: -118, farHand: -8, sword: -52,
  },
  guardHigh: {
    pelvis: 4, spine: 2, chest: 0, head: -10,
    nearUpperArm: -70, nearForearm: -70, nearHand: 6, shield: -14,
    farUpperArm: 48, farForearm: -122, farHand: -6, sword: -48,
  },
  brace: {
    pelvis: 14, spine: 16, chest: 10, head: 4,
    nearUpperArm: -72, nearForearm: -78, nearHand: 6, shield: -10,
    farUpperArm: 36, farForearm: -100, farHand: -10, sword: -60,
  },
  tuck: {
    pelvis: 0, spine: 46, chest: 34, head: 34,
    nearUpperArm: -62, nearForearm: -96, nearHand: 0, shield: 16,
    farUpperArm: -30, farForearm: -100, farHand: 0, sword: -80,
    nearThigh: -128, nearShin: 138, nearFoot: -20, farThigh: -116, farShin: 132, farFoot: -20,
  },
  parry: {
    pelvis: 2, spine: -3, chest: -6, head: -20,
    nearUpperArm: -124, nearForearm: -48, nearHand: 0, shield: -26,
    farUpperArm: 34, farForearm: -58, farHand: -10, sword: -30,
  },
  parryFollow: {
    pelvis: 4, spine: -2, chest: -4, head: -14,
    nearUpperArm: -160, nearForearm: -20, nearHand: 0, shield: -44,
    farUpperArm: 52, farForearm: -70, farHand: -12, sword: -50,
  },
  cock: {
    pelvis: 10, spine: 4, chest: -4, head: -6,
    nearUpperArm: -30, nearForearm: -70, nearHand: 0, shield: 0,
    farUpperArm: 72, farForearm: -60, farHand: -24, sword: -90,
  },
  // The shield swings back as a counterweight, so the helm stays clear.
  lunge: {
    pelvis: 14, spine: 14, chest: 6, head: -26,
    nearUpperArm: 66, nearForearm: -28, nearHand: 0, shield: 34,
    farUpperArm: -84, farForearm: -8, farHand: -4, sword: -88,
  },
  recover: {
    pelvis: 6, spine: 6, chest: 4, head: -6,
    nearUpperArm: -40, nearForearm: -70, nearHand: 4, shield: -4,
    farUpperArm: 20, farForearm: -60, farHand: -10, sword: -70,
  },
  lowGuard: {
    pelvis: 4, spine: 4, chest: 4, head: 4,
    nearUpperArm: -30, nearForearm: -62, nearHand: 4, shield: 0,
    farUpperArm: 10, farForearm: -40, farHand: 0, sword: -70,
  },
  shieldUp: {
    pelvis: 10, spine: 6, chest: 0, head: -16,
    nearUpperArm: -96, nearForearm: -62, nearHand: 6, shield: -24,
    farUpperArm: 50, farForearm: -112, farHand: -8, sword: -44,
  },
};

// ---------------------------------------------------------------------------
// Parts. Each returns a silhouette (currentColor, for rim light) and its art.

export type Part = {sil: React.ReactNode; art: React.ReactNode};

const STEEL_EDGE = '#07080a';

export const knightDefs = (ids: Ids) => (
  <>
    <linearGradient id={ids('steelR')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#060709" />
      <stop offset="0.3" stopColor="#13151a" />
      <stop offset="0.6" stopColor="#2a2f38" />
      <stop offset="0.8" stopColor="#6f7a8c" />
      <stop offset="0.9" stopColor="#252930" />
      <stop offset="1" stopColor="#08090b" />
    </linearGradient>
    <linearGradient id={ids('steelL')} x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stopColor="#060709" />
      <stop offset="0.3" stopColor="#13151a" />
      <stop offset="0.6" stopColor="#2a2f38" />
      <stop offset="0.8" stopColor="#6f7a8c" />
      <stop offset="0.9" stopColor="#252930" />
      <stop offset="1" stopColor="#08090b" />
    </linearGradient>
    {/* Domed plate: a tight specular on dark polished steel, not a matte ball. */}
    <radialGradient id={ids('cop')} cx="0.62" cy="0.34" r="0.72" fx="0.7" fy="0.26">
      <stop offset="0" stopColor="#a4b0c4" />
      <stop offset="0.12" stopColor="#4c5462" />
      <stop offset="0.5" stopColor="#1c2027" />
      <stop offset="1" stopColor="#07080a" />
    </radialGradient>
    <linearGradient id={ids('tabard')} x1="0" y1="0" x2="1" y2="0.2">
      <stop offset="0" stopColor="#120203" />
      <stop offset="0.45" stopColor="#300609" />
      <stop offset="0.8" stopColor="#4c0c12" />
      <stop offset="1" stopColor="#1a0305" />
    </linearGradient>
    <linearGradient id={ids('cape')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3a0a0e" />
      <stop offset="0.6" stopColor="#1c0406" />
      <stop offset="1" stopColor="#0a0203" />
    </linearGradient>
    <linearGradient id={ids('blade')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#1a1d24" />
      <stop offset="0.45" stopColor="#6a7384" />
      <stop offset="0.55" stopColor="#c9d3e2" />
      <stop offset="0.7" stopColor="#4a515e" />
      <stop offset="1" stopColor="#15171c" />
    </linearGradient>
    <linearGradient id={ids('field')} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#1a2850" />
      <stop offset="0.6" stopColor="#0e1834" />
      <stop offset="1" stopColor="#060a1a" />
    </linearGradient>
    <linearGradient id={ids('gold')} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#c9a45c" />
      <stop offset="0.5" stopColor="#86672e" />
      <stop offset="1" stopColor="#3e2c12" />
    </linearGradient>
  </>
);

const steel = (ids: Ids, lit: boolean) => url(ids, lit ? 'steelR' : 'steelL');
const HL = 'rgba(190,202,222,0.42)';

export const thighPart = (ids: Ids, lit: boolean): Part => {
  const d = 'M-21 -8 C-26 28 -19 62 -15 86 L15 86 C19 62 25 28 21 -8 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        <path d="M-17 66 C-6 71 6 71 16 66" stroke={STEEL_EDGE} strokeWidth={2} fill="none" />
        <path d="M-18 16 C-6 20 6 20 19 15" stroke={STEEL_EDGE} strokeWidth={1.5} fill="none" />
        <path d="M7 -2 C9 28 8 56 6 80" stroke={HL} strokeWidth={1.6} fill="none" />
      </>
    ),
  };
};

/** Poleyn: a ridged cup over the knee with a fan-shaped wing guarding the
 *  outside of the joint, and articulated lames above and below. */
const POLEYN_WING = 'M-3 -11 C-20 -17 -31 2 -17 17 C-12 10 -8 2 -3 -11 Z';
const poleyn = (ids: Ids, lit: boolean) => (
  <>
    <path d="M-12 -13 C-4 -17 8 -17 14 -13 L14 -8 C8 -11 -4 -11 -12 -8 Z" fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1} />
    <path d="M-11 9 C-4 13 8 13 13 9 L13 14 C8 17 -4 17 -11 14 Z" fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1} />
    <path d={POLEYN_WING} fill={steel(ids, !lit)} stroke={STEEL_EDGE} strokeWidth={1.1} />
    <path d="M-5 -8 C-16 -10 -22 2 -15 11" stroke="rgba(170,182,204,0.28)" strokeWidth={1.2} fill="none" />
    <ellipse cx={3} cy={0} rx={10} ry={11} fill={url(ids, 'cop')} stroke={STEEL_EDGE} strokeWidth={1.2} />
    <path d="M4 -10 C6 -4 6 4 4 10" stroke="rgba(190,202,222,0.45)" strokeWidth={1.1} fill="none" />
    <circle cx={-12} cy={2} r={1.4} fill="#aab4c4" opacity={0.6} />
  </>
);

export const shinPart = (ids: Ids, lit: boolean): Part => {
  const d = 'M-15 2 C-22 26 -17 54 -12 84 L12 84 C13 54 13 26 14 2 Z';
  return {
    sil: (
      <>
        <path d={d} />
        <path d={POLEYN_WING} />
        <ellipse cx={3} cy={0} rx={12} ry={14} />
      </>
    ),
    art: (
      <>
        <path d={d} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        <path d="M8 8 C10 34 9 58 7 78" stroke={HL} strokeWidth={1.4} fill="none" />
        <path d="M-9 80 L9 80" stroke={STEEL_EDGE} strokeWidth={2} />
        <path d="M-14 40 C-16 52 -14 62 -12 70" stroke="rgba(0,0,0,0.35)" strokeWidth={2} fill="none" />
        {poleyn(ids, lit)}
      </>
    ),
  };
};

export const footPart = (ids: Ids, lit: boolean): Part => {
  const d = 'M-11 -7 L-11 12 L39 12 C45 12 45 5 38 3 L17 -3 C10 -9 -4 -11 -11 -7 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        {[5, 12, 19, 26].map((x) => (
          <path key={x} d={`M${x} ${-3 + x * 0.12} L${x + 2} 11`} stroke={STEEL_EDGE} strokeWidth={1.4} />
        ))}
        <path d="M-10 11 L40 11" stroke="#040405" strokeWidth={2.4} />
        <path d="M18 -1 L37 4" stroke={HL} strokeWidth={1.2} />
      </>
    ),
  };
};

export const pelvisPart = (ids: Ids): Part => {
  const d = 'M-21 -12 L22 -12 L23 6 L-21 6 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={url(ids, 'tabard')} />
        <rect x={-22} y={-10} width={45} height={8} fill="#2a1a10" stroke="#0a0604" strokeWidth={1} />
        <rect x={12} y={-11} width={9} height={10} fill="none" stroke={url(ids, 'gold')} strokeWidth={2} />
      </>
    ),
  };
};

export const spinePart = (ids: Ids): Part => {
  const d = 'M-21 2 C-23 -20 -22 -40 -20 -52 L20 -52 C23 -36 24 -16 22 2 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={url(ids, 'tabard')} />
        <path d="M-8 -48 C-10 -30 -9 -12 -8 0" stroke="rgba(0,0,0,0.45)" strokeWidth={3} fill="none" />
        <path d="M12 -46 C14 -28 14 -12 13 0" stroke="rgba(255,120,110,0.12)" strokeWidth={3} fill="none" />
      </>
    ),
  };
};

const star = (cx: number, cy: number, r: number, n = 8) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d + 'Z';
};

export const chestPart = (ids: Ids): Part => {
  const d = 'M-21 4 C-25 -22 -25 -50 -17 -66 L12 -68 C27 -58 31 -30 23 4 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={url(ids, 'tabard')} />
        {/* Faded eight-pointed star. */}
        <path d={star(6, -34, 15)} fill="#9a7a44" opacity={0.42} />
        <circle cx={6} cy={-34} r={4} fill="#1c0304" opacity={0.6} />
        <path d="M-19 -60 C-8 -66 4 -68 12 -68" stroke="rgba(0,0,0,0.5)" strokeWidth={3} fill="none" />
        <path d="M22 -52 C29 -34 28 -14 22 2" stroke="rgba(190,170,190,0.28)" strokeWidth={2.5} fill="none" />
        <path d="M-4 -6 C-2 -2 4 -2 10 -4" stroke="rgba(0,0,0,0.35)" strokeWidth={2} fill="none" />
      </>
    ),
  };
};

export const headPart = (ids: Ids, lit: boolean): Part => {
  const helm =
    'M-22 -12 L-23 -50 C-23 -60 -16 -64 -6 -64 L10 -64 C19 -64 23 -60 24 -52 L27 -33 L24 -12 Z';
  const gorget = 'M-17 3 L-19 -13 L18 -13 L17 3 Z';
  return {
    sil: (
      <>
        <path d={gorget} />
        <path d={helm} />
      </>
    ),
    art: (
      <>
        <path d={gorget} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        <path d="M-18 -5 L18 -5" stroke={STEEL_EDGE} strokeWidth={1.5} />
        <path d={helm} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.4} />
        {/* Brow band and rivets. */}
        <path d="M-23 -46 L25 -45" stroke="#0b0c0f" strokeWidth={2.2} />
        {[-17, -8, 1, 10, 19].map((x) => (
          <circle key={x} cx={x} cy={-49} r={1.3} fill="#9aa5b8" opacity={0.7} />
        ))}
        {/* Vision slit, with the faintest glint on its upper lip. */}
        <path d="M6 -38 L27 -37 L27 -33 L6 -34 Z" fill="#010102" />
        <path d="M6 -39.5 L26 -38.5" stroke="rgba(220,230,245,0.55)" strokeWidth={1} />
        {/* Breaths. */}
        {[
          [17, -25],
          [21, -25],
          [17, -20],
          [21, -20],
          [19, -15],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.3} fill="#020203" />
        ))}
        {/* Crown of the helm and its front ridge catch the moon. */}
        <path d="M-17 -62 C-6 -66 10 -66 19 -62" stroke="rgba(215,225,240,0.7)" strokeWidth={1.8} fill="none" />
        <path d="M24 -52 L27 -33 L24 -13" stroke="rgba(215,225,240,0.5)" strokeWidth={1.4} fill="none" />
      </>
    ),
  };
};

export const upperArmPart = (ids: Ids, lit: boolean, near: boolean): Part => {
  const d = 'M-12 -2 C-13 22 -11 46 -10 66 L10 66 C11 46 13 22 12 -2 Z';
  const p1 = 'M-27 -16 C-26 -36 22 -38 28 -14 L26 6 C12 -2 -14 -2 -27 4 Z';
  const p2 = 'M-26 2 C-12 -4 12 -4 26 4 L24 17 C12 11 -12 11 -25 16 Z';
  const p3 = 'M-24 15 C-12 9 12 9 24 17 L22 27 C12 21 -12 21 -23 26 Z';
  return {
    sil: (
      <>
        <path d={d} />
        {near ? <path d={p1 + p2 + p3} /> : <path d={p2} />}
      </>
    ),
    art: (
      <>
        <path d={d} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        <path d="M-11 44 C-4 47 4 47 11 44" stroke={STEEL_EDGE} strokeWidth={1.6} fill="none" />
        {near ? (
          <>
            <path d={p3} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
            <path d={p2} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
            <path d={p1} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.4} />
            {/* Shade under the roll of the cap, a raised ridge, rivets. */}
            <path d="M-26 -2 C-14 -8 12 -8 26 0 L27 5 C12 -3 -14 -3 -27 3 Z" fill="rgba(0,0,0,0.35)" />
            <path d="M-20 -26 C-8 -34 10 -33 20 -24" stroke="rgba(200,212,232,0.35)" strokeWidth={1.3} fill="none" />
            <path d="M-24 -20 C-20 -34 18 -36 26 -16" stroke={url(ids, 'gold')} strokeWidth={2.2} fill="none" opacity={0.7} />
            {[-18, -6, 6, 18].map((x) => (
              <circle key={x} cx={x} cy={-12 - (18 - Math.abs(x)) * 0.25} r={1.3} fill="#aab4c4" opacity={0.55} />
            ))}
          </>
        ) : (
          <path d={p2} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        )}
      </>
    ),
  };
};

/** Couter: a small cup over the elbow with a fan wing, like the poleyn. */
const COUTER_WING = 'M-2 -9 C-17 -13 -23 3 -12 13 C-9 7 -6 0 -2 -9 Z';

export const forearmPart = (ids: Ids, lit: boolean): Part => {
  const d = 'M-10 0 C-10 22 -9 42 -8 58 L8 58 C9 42 10 22 10 0 Z';
  return {
    sil: (
      <>
        <path d={d} />
        <path d={COUTER_WING} />
        <ellipse cx={1} cy={0} rx={9} ry={10} />
      </>
    ),
    art: (
      <>
        <path d={d} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        <path d="M5 12 C7 30 6 44 5 54" stroke={HL} strokeWidth={1.2} fill="none" />
        <path d="M-9 44 C-3 47 3 47 9 44" stroke={STEEL_EDGE} strokeWidth={1.4} fill="none" />
        <path d={COUTER_WING} fill={steel(ids, !lit)} stroke={STEEL_EDGE} strokeWidth={1} />
        <ellipse cx={1} cy={0} rx={8.5} ry={9.5} fill={url(ids, 'cop')} stroke={STEEL_EDGE} strokeWidth={1.1} />
        <path d="M2 -8 C4 -3 4 3 2 8" stroke="rgba(190,202,222,0.4)" strokeWidth={1} fill="none" />
      </>
    ),
  };
};

export const handPart = (ids: Ids, lit: boolean): Part => {
  const d = 'M-12 -3 L12 -3 L11 8 C13 15 11 24 2 26 C-7 26 -11 18 -10 9 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={steel(ids, lit)} stroke={STEEL_EDGE} strokeWidth={1.2} />
        <path d="M-11 7 L11 7" stroke={STEEL_EDGE} strokeWidth={1.6} />
        <path d="M-9 14 C-4 17 4 17 10 14" stroke={STEEL_EDGE} strokeWidth={1.2} fill="none" />
        <path d="M-8 20 C-3 23 3 23 8 20" stroke={STEEL_EDGE} strokeWidth={1.2} fill="none" />
      </>
    ),
  };
};

const SHIELD = 'M-44 -54 L44 -58 C46 -10 36 32 0 70 C-36 32 -46 -10 -44 -54 Z';

export const shieldPart = (ids: Ids, glint: number): Part => ({
  sil: <path d={SHIELD} />,
  art: (
    <>
      {/* Thickness of the board, seen past the rim. */}
      <path d={SHIELD} transform="translate(6 3)" fill="#0b0a0b" />
      <path d={SHIELD} fill={url(ids, 'field')} />
      {/* Chevron and three mullets, the paint chipped. */}
      <path d="M-38 20 L0 -16 L38 16 L38 34 L0 0 L-38 38 Z" fill={url(ids, 'gold')} opacity={0.82} />
      <path d={star(-22, -34, 9, 5)} fill={url(ids, 'gold')} opacity={0.75} />
      <path d={star(22, -36, 9, 5)} fill={url(ids, 'gold')} opacity={0.75} />
      <path d={star(0, 38, 9, 5)} fill={url(ids, 'gold')} opacity={0.6} />
      <path d="M-30 -12 L-8 6 M12 -22 L30 -6 M-14 44 L-2 30" stroke="rgba(10,12,20,0.7)" strokeWidth={2} />
      <path d="M20 22 L34 40 M-34 -40 L-20 -30" stroke="rgba(190,200,220,0.25)" strokeWidth={1.2} />
      <path d="M8 8 C14 12 12 20 6 22" stroke="#05060a" strokeWidth={3} fill="none" />
      {/* Iron rim. */}
      <path d={SHIELD} fill="none" stroke="#23262c" strokeWidth={6} />
      <path d={SHIELD} fill="none" stroke="#6c7383" strokeWidth={1.2} opacity={0.6} />
      <path d="M-40 -55 L42 -58 C44 -30 42 -12 38 6" fill="none" stroke="rgba(220,228,242,0.7)" strokeWidth={2} />
      {glint > 0 ? (
        <circle cx={30} cy={-50} r={10 + glint * 20} fill="rgba(255,240,210,0.9)" opacity={glint} />
      ) : null}
    </>
  ),
});

export const swordPart = (ids: Ids): Part => {
  const blade = 'M-6 18 L6 18 L4.5 150 L0 164 L-4.5 150 Z';
  const guard = 'M-23 11 C-12 13 12 13 23 11 L25 17 C12 19 -12 19 -25 17 Z';
  return {
    sil: (
      <>
        <path d={blade} />
        <path d={guard} />
        <rect x={-3.5} y={-16} width={7} height={28} />
        <circle cx={0} cy={-20} r={7} />
      </>
    ),
    art: (
      <>
        <path d={blade} fill={url(ids, 'blade')} stroke="#0b0c10" strokeWidth={0.8} />
        <path d="M0 22 L0 122" stroke="rgba(10,12,16,0.55)" strokeWidth={1.6} />
        <path d="M4.2 24 L3.6 148" stroke="rgba(235,242,252,0.7)" strokeWidth={0.9} />
        <path d={guard} fill={url(ids, 'gold')} stroke="#1a1208" strokeWidth={0.8} />
        <rect x={-3.5} y={-16} width={7} height={28} fill="#24160c" />
        {[-12, -6, 0, 6].map((y) => (
          <path key={y} d={`M-3.5 ${y} L3.5 ${y + 3}`} stroke="#0e0804" strokeWidth={1.2} />
        ))}
        <circle cx={0} cy={-20} r={7} fill={url(ids, 'gold')} stroke="#1a1208" strokeWidth={0.8} />
      </>
    ),
  };
};

/** Tip of the blade in the sword's local frame. */
export const SWORD_TIP = [0, 164] as const;
/** Point on the shield face where a blow lands. */
export const SHIELD_HIT = [18, -48] as const;
