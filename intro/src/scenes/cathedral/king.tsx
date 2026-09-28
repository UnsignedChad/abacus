// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The Skeleton King: long yellowed bones, a rusted pauldron and bracers, a
// faded crimson mantle with an ermine collar, and a huge notched greatsword.
// Authored facing right like the knight; the scene mirrors him to face left.

import React from 'react';
import {Ids, url} from './figure';
import {Pose, Skeleton} from './rig';
import {rr} from './util';

export const KING: Skeleton = {
  pelvis: {parent: null, x: 0, y: 0},
  spine: {parent: 'pelvis', x: -6, y: -14},
  chest: {parent: 'spine', x: 0, y: -58},
  neck: {parent: 'chest', x: 10, y: -96},
  head: {parent: 'neck', x: 3, y: -22},
  jaw: {parent: 'head', x: 4, y: -16},
  farUpperArm: {parent: 'chest', x: -8, y: -86},
  farForearm: {parent: 'farUpperArm', x: 0, y: 104},
  farHand: {parent: 'farForearm', x: 0, y: 96},
  farThigh: {parent: 'pelvis', x: -2, y: 10},
  farShin: {parent: 'farThigh', x: 0, y: 120},
  farFoot: {parent: 'farShin', x: 0, y: 122},
  nearThigh: {parent: 'pelvis', x: 5, y: 10},
  nearShin: {parent: 'nearThigh', x: 0, y: 120},
  nearFoot: {parent: 'nearShin', x: 0, y: 122},
  nearUpperArm: {parent: 'chest', x: 6, y: -86},
  nearForearm: {parent: 'nearUpperArm', x: 0, y: 104},
  nearHand: {parent: 'nearForearm', x: 0, y: 96},
  sword: {parent: 'nearHand', x: 0, y: 16},
};

export const KING_LEN = {thigh: 120, shin: 122, ankle: 16, upper: 104, fore: 96, hip: 10};
export const KING_HIP_H = KING_LEN.thigh + KING_LEN.shin + KING_LEN.ankle + KING_LEN.hip;
export const KING_CHANNELS = Object.keys(KING);

export const EYE_NEAR = [22, -33] as const;
export const EYE_FAR = [33, -34] as const;
export const CROWN_SEAT = [4, -63] as const;
/** Grip positions along the greatsword (local y), for the second hand. */
export const GS = {tip: 384, second: -26, len: 384};

export const KP: Record<string, Pose> = {
  slump: {
    pelvis: -14, spine: 26, chest: 24, neck: 26, head: 38, jaw: 6,
    nearUpperArm: -52, nearForearm: -64, nearHand: 10, sword: 0,
    farUpperArm: -44, farForearm: -70, farHand: 20,
  },
  wake: {
    pelvis: -12, spine: 22, chest: 22, neck: 20, head: 20, jaw: 12,
    nearUpperArm: -54, nearForearm: -62, nearHand: 10, sword: 0,
    farUpperArm: -46, farForearm: -68, farHand: 20,
  },
  risePush: {
    pelvis: 10, spine: 30, chest: 18, neck: 10, head: 0, jaw: 8,
    nearUpperArm: -40, nearForearm: -40, nearHand: 6, sword: 0,
    farUpperArm: -30, farForearm: -50, farHand: 10,
  },
  stand: {
    pelvis: 2, spine: 6, chest: 10, neck: 10, head: -4, jaw: 6,
    nearUpperArm: 8, nearForearm: -14, nearHand: 0, sword: 28,
    farUpperArm: 12, farForearm: -24, farHand: 10,
  },
  // Howling up at the vaults: chest thrown open, skull tipped back ~40 degrees
  // so the gaping jaw still reads in profile above the pauldron.
  roar: {
    pelvis: -4, spine: -6, chest: -10, neck: -6, head: -16, jaw: 58,
    nearUpperArm: -62, nearForearm: -12, nearHand: -4, sword: 70,
    farUpperArm: 118, farForearm: -18, farHand: -26,
  },
  drag: {
    pelvis: 6, spine: 10, chest: 14, neck: 12, head: -12, jaw: 10,
    nearUpperArm: 14, nearForearm: -8, nearHand: 4, sword: 40,
    farUpperArm: -6, farForearm: -30, farHand: 10,
  },
  sweepWind: {
    pelvis: -4, spine: -6, chest: -12, neck: 8, head: -10, jaw: 16,
    nearUpperArm: 96, nearForearm: -22, nearHand: -6, sword: 0,
    farUpperArm: -52, farForearm: -40, farHand: 0,
  },
  sweepEnd: {
    pelvis: 10, spine: 16, chest: 18, neck: 10, head: -14, jaw: 10,
    nearUpperArm: -84, nearForearm: -6, nearHand: -2, sword: 0,
    farUpperArm: 40, farForearm: -30, farHand: 10,
  },
  twoHand: {
    pelvis: 4, spine: 8, chest: 10, neck: 10, head: -8, jaw: 10,
    nearUpperArm: -30, nearForearm: -70, nearHand: -10, sword: -32,
    farUpperArm: -26, farForearm: -76, farHand: -10,
  },
  overhead: {
    pelvis: -8, spine: -10, chest: -14, neck: 6, head: -16, jaw: 22,
    nearUpperArm: -168, nearForearm: -36, nearHand: -14, sword: -46,
    farUpperArm: -160, farForearm: -40, farHand: -10,
  },
  strike: {
    pelvis: 12, spine: 18, chest: 12, neck: 6, head: -10, jaw: 30,
    nearUpperArm: -128, nearForearm: -12, nearHand: -6, sword: -20,
    farUpperArm: -122, farForearm: -18, farHand: -6,
  },
  parried: {
    pelvis: -14, spine: -18, chest: -20, neck: -14, head: -30, jaw: 36,
    nearUpperArm: -196, nearForearm: -24, nearHand: -10, sword: 16,
    farUpperArm: 72, farForearm: -34, farHand: -30,
  },
  reel: {
    pelvis: -12, spine: -14, chest: -16, neck: -10, head: -20, jaw: 30,
    nearUpperArm: -178, nearForearm: -40, nearHand: -8, sword: 24,
    farUpperArm: 84, farForearm: -40, farHand: -30,
  },
  impaled: {
    pelvis: 2, spine: -8, chest: -12, neck: -12, head: -30, jaw: 48,
    nearUpperArm: -150, nearForearm: -26, nearHand: -10, sword: 28,
    farUpperArm: 86, farForearm: -30, farHand: -30,
  },
  hunch: {
    pelvis: 6, spine: 14, chest: 16, neck: 14, head: 16, jaw: 14,
    nearUpperArm: -26, nearForearm: -34, nearHand: 0, sword: 12,
    farUpperArm: -30, farForearm: -76, farHand: 10,
  },
  kneel: {
    pelvis: 2, spine: 8, chest: 12, neck: 14, head: 24, jaw: 10,
    nearUpperArm: -40, nearForearm: -40, nearHand: 0, sword: 20,
    farUpperArm: 10, farForearm: -20, farHand: 14,
  },
  droop: {
    pelvis: 4, spine: 12, chest: 16, neck: 24, head: 40, jaw: 18,
    nearUpperArm: -38, nearForearm: -42, nearHand: 0, sword: 20,
    farUpperArm: 12, farForearm: -16, farHand: 16,
  },
  // Phase two: upright and towering, roaring down at the knight, one claw
  // reaching for him while the burning blade trails behind.
  risen: {
    pelvis: -4, spine: -4, chest: 2, neck: 8, head: 16, jaw: 42,
    nearUpperArm: 22, nearForearm: -18, nearHand: 0, sword: 34,
    farUpperArm: -74, farForearm: -26, farHand: -16,
  },
};

// ---------------------------------------------------------------------------
// Drawing.

export type Part = {sil: React.ReactNode; art: React.ReactNode};

export const kingDefs = (ids: Ids) => (
  <>
    <linearGradient id={ids('boneR')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#140f0a" />
      <stop offset="0.3" stopColor="#3e3427" />
      <stop offset="0.66" stopColor="#7d705a" />
      <stop offset="0.86" stopColor="#b3a68a" />
      <stop offset="1" stopColor="#2c251b" />
    </linearGradient>
    <linearGradient id={ids('boneL')} x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stopColor="#140f0a" />
      <stop offset="0.3" stopColor="#3e3427" />
      <stop offset="0.66" stopColor="#7d705a" />
      <stop offset="0.86" stopColor="#b3a68a" />
      <stop offset="1" stopColor="#2c251b" />
    </linearGradient>
    <radialGradient id={ids('skull')} cx="0.64" cy="0.28" r="0.85">
      <stop offset="0" stopColor="#c9bc9e" />
      <stop offset="0.35" stopColor="#8a7c62" />
      <stop offset="0.75" stopColor="#3c3326" />
      <stop offset="1" stopColor="#140f0a" />
    </radialGradient>
    <linearGradient id={ids('iron')} x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0" stopColor="#0d0c0d" />
      <stop offset="0.5" stopColor="#2c2a2c" />
      <stop offset="0.8" stopColor="#5a5558" />
      <stop offset="1" stopColor="#161416" />
    </linearGradient>
    <radialGradient id={ids('ironCop')} cx="0.6" cy="0.3" r="0.8">
      <stop offset="0" stopColor="#7a7478" />
      <stop offset="0.45" stopColor="#2e2a2c" />
      <stop offset="1" stopColor="#0b0a0b" />
    </radialGradient>
    <linearGradient id={ids('gs')} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#141417" />
      <stop offset="0.4" stopColor="#35353c" />
      <stop offset="0.52" stopColor="#6e6f78" />
      <stop offset="0.62" stopColor="#2c2c32" />
      <stop offset="1" stopColor="#0e0e11" />
    </linearGradient>
    <linearGradient id={ids('kgold')} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#d8b46a" />
      <stop offset="0.5" stopColor="#8e6a2c" />
      <stop offset="1" stopColor="#4a3414" />
    </linearGradient>
    <linearGradient id={ids('mantle')} x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stopColor="#5a1016" />
      <stop offset="0.5" stopColor="#35080c" />
      <stop offset="1" stopColor="#140304" />
    </linearGradient>
    <linearGradient id={ids('fur')} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#d4ccbe" />
      <stop offset="0.6" stopColor="#8e8678" />
      <stop offset="1" stopColor="#3a342c" />
    </linearGradient>
  </>
);

const bone = (ids: Ids, lit: boolean) => url(ids, lit ? 'boneR' : 'boneL');
const EDGE = '#150f0a';
const BHL = 'rgba(226,218,196,0.5)';

export const skullPart = (ids: Ids): Part => {
  const d =
    'M-24 -12 C-34 -30 -28 -60 -4 -66 C16 -70 34 -58 36 -40 L38 -32 C36 -28 38 -22 41 -16 L41 -8 L20 -6 C12 -6 6 -10 2 -14 C-6 -8 -16 -6 -24 -12 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={1.2} />
        {/* Sockets: near and (3/4) far. */}
        <ellipse cx={22} cy={-33} rx={8.5} ry={9.5} fill="#050303" />
        <ellipse cx={34} cy={-34} rx={4} ry={8} fill="#050303" />
        <path d="M13 -42 C18 -46 27 -46 31 -42" stroke="rgba(255,250,235,0.5)" strokeWidth={1.6} fill="none" />
        {/* Nasal cavity, cheekbone, zygomatic arch. */}
        <path d="M34 -26 L41 -15 L33 -14 Z" fill="#070404" />
        <path d="M13 -22 C18 -18 26 -18 30 -21" stroke="rgba(245,238,222,0.45)" strokeWidth={2} fill="none" />
        <path d="M12 -24 L-2 -20" stroke="rgba(20,14,10,0.7)" strokeWidth={1.6} />
        {/* Upper teeth. */}
        {[21, 25, 29, 33, 37].map((x) => (
          <rect key={x} x={x} y={-9} width={3.2} height={5.5} rx={1} fill="#cfc5ae" stroke="#2a2218" strokeWidth={0.6} />
        ))}
        {/* Cracks. */}
        <path d="M-10 -62 L-4 -52 L-9 -44 L-3 -38" stroke="#1a130d" strokeWidth={1.3} fill="none" />
        <path d="M-24 -30 L-16 -28 L-14 -20" stroke="#1a130d" strokeWidth={1.1} fill="none" />
        <path d="M-14 -64 C0 -69 18 -66 30 -56" stroke={BHL} strokeWidth={1.8} fill="none" />
      </>
    ),
  };
};

export const jawPart = (): Part => {
  const d = 'M0 0 L-3 14 C-1 23 14 25 31 21 L37 15 L35 8 L14 8 C8 6 4 2 0 0 Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill="#8e836c" stroke={EDGE} strokeWidth={1.1} />
        <path d="M-1 16 C4 21 16 22 30 19" stroke="rgba(30,22,14,0.6)" strokeWidth={1.4} fill="none" />
        {[16, 20, 24, 28, 32].map((x) => (
          <rect key={x} x={x} y={5} width={3.2} height={5} rx={1} fill="#cfc5ae" stroke="#2a2218" strokeWidth={0.6} />
        ))}
        <path d="M2 2 L-1 13" stroke={BHL} strokeWidth={1.2} />
      </>
    ),
  };
};

export const neckPart = (ids: Ids, lit: boolean): Part => {
  const vs = [-3, -10, -17];
  return {
    sil: (
      <>
        {vs.map((y) => (
          <rect key={y} x={-8} y={y - 3} width={16} height={6} rx={2} />
        ))}
      </>
    ),
    art: (
      <>
        {vs.map((y) => (
          <g key={y}>
            <rect x={-8} y={y - 3} width={16} height={6} rx={2} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={0.8} />
            <path d={`M-8 ${y} L-15 ${y + 3}`} stroke="#6e6452" strokeWidth={3} />
          </g>
        ))}
      </>
    ),
  };
};

/** Rib i: springs from the spine, rises a little, sweeps forward and down. */
const ribPath = (i: number, ox = 0, oy = 0) => {
  const sy = -86 + i * 12.5;
  const sx = -36 + Math.sin((i / 6) * Math.PI) * 3;
  const fx = i < 5 ? 34 - i * 1.5 : 22 - (i - 4) * 12;
  const fy = sy + 24 + i * 4;
  const c1x = sx - 2;
  const c1y = sy - 18 - i;
  const c2x = sx + 58 - i * 2;
  const c2y = sy - 16 + i * 2;
  return `M${sx + ox} ${sy + oy} C${c1x + ox} ${c1y + oy} ${c2x + ox} ${c2y + oy} ${fx + ox} ${fy + oy}`;
};

export const ribcageParts = (ids: Ids): {back: Part; front: Part} => {
  const outline = 'M-40 4 C-50 -34 -46 -84 -22 -104 L28 -98 C42 -74 44 -34 34 -2 L14 10 Z';
  const spine = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
    const u = k / 9;
    return {x: -36 - Math.sin(u * Math.PI) * 5 + u * 10, y: -2 - u * 96};
  });
  const costal = 'M22 -46 C18 -30 8 -14 -4 -4';
  return {
    back: {
      sil: <path d={outline} opacity={0.3} />,
      art: (
        <>
          {/* The hollow of the chest. */}
          <path d={outline} fill="rgba(5,3,3,0.62)" />
          {/* Scapula. */}
          <path d="M-52 -92 L-18 -96 L-34 -40 Z" fill="#3a3226" stroke={EDGE} strokeWidth={1} />
          <path d="M-50 -88 L-20 -90" stroke="#6e6250" strokeWidth={2.6} />
          {/* Far ribs, dim. */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={ribPath(i, -8, -4)} stroke="#3a3226" strokeWidth={4.5} fill="none" strokeLinecap="round" />
          ))}
          {/* Thoracic spine. */}
          {spine.map((p, k) => (
            <g key={k}>
              <path d={`M${p.x - 4} ${p.y} L${p.x - 14} ${p.y + 5}`} stroke="#4a4032" strokeWidth={4} strokeLinecap="round" />
              <rect x={p.x - 6} y={p.y - 4.5} width={13} height={8.5} rx={2.5} fill={bone(ids, true)} stroke={EDGE} strokeWidth={0.8} />
            </g>
          ))}
        </>
      ),
    },
    front: {
      sil: (
        <>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path key={i} d={ribPath(i)} strokeWidth={6.5} fill="none" strokeLinecap="round" />
          ))}
          <path d="M30 -92 L34 -42" strokeWidth={9} strokeLinecap="round" />
        </>
      ),
      art: (
        <>
          <path d={costal} stroke="#5e5442" strokeWidth={4} fill="none" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i}>
              <path d={ribPath(i)} stroke="#1c160f" strokeWidth={7.5} fill="none" strokeLinecap="round" />
              <path d={ribPath(i)} stroke="#8a7d64" strokeWidth={5.5} fill="none" strokeLinecap="round" />
              <path d={ribPath(i, 0.8, -1.6)} stroke="rgba(214,204,180,0.55)" strokeWidth={1.6} fill="none" strokeLinecap="round" />
            </g>
          ))}
          {/* Sternum and clavicle. */}
          <path d="M30 -92 L34 -42" stroke="#1c160f" strokeWidth={11} strokeLinecap="round" />
          <path d="M30 -92 L34 -42" stroke="#948768" strokeWidth={8.5} strokeLinecap="round" />
          <path d="M33 -94 C18 -102 0 -100 -12 -94" stroke="#1c160f" strokeWidth={7.5} fill="none" strokeLinecap="round" />
          <path d="M33 -94 C18 -102 0 -100 -12 -94" stroke="#a49678" strokeWidth={5} fill="none" strokeLinecap="round" />
        </>
      ),
    },
  };
};

export const lumbarPart = (ids: Ids, lit: boolean): Part => {
  const vs = [-6, -18, -30, -42, -54];
  return {
    sil: (
      <>
        {vs.map((y) => (
          <rect key={y} x={-9} y={y - 5} width={18} height={10} rx={3} />
        ))}
      </>
    ),
    art: (
      <>
        {vs.map((y) => (
          <g key={y}>
            <path d={`M-8 ${y} L-18 ${y + 4}`} stroke="#5e5444" strokeWidth={4} strokeLinecap="round" />
            <rect x={-9} y={y - 5} width={18} height={10} rx={3} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={0.8} />
          </g>
        ))}
      </>
    ),
  };
};

/** Three-quarter pelvis: the near iliac blade fanning up behind the hip, the
 *  far blade and the sacrum behind it, and the ring of pubis and ischium round
 *  the dark obturator hole below the socket. */
export const pelvisPart = (ids: Ids): Part => {
  const blade = 'M4 7 C-6 3 -19 -5 -31 -15 C-41 -23 -41 -36 -31 -43 C-17 -51 6 -49 21 -37 C25 -33 25 -26 21 -22 C15 -12 10 -2 4 7 Z';
  const far = 'M-6 -8 C-12 -22 -4 -42 14 -44 C26 -44 30 -34 24 -26 C16 -18 6 -10 -6 -8 Z';
  const ring = 'M-1 4 C-8 12 -10 23 -6 31 C-2 35 7 35 13 31 L25 25 C27 21 25 16 20 16 L11 16 C9 10 6 5 2 2 Z';
  const sacrum = 'M-37 -14 L-24 -21 L-19 5 C-23 12 -30 12 -33 6 Z';
  return {
    sil: (
      <>
        <path d={far} />
        <path d={blade} />
        <path d={ring} />
        <path d={sacrum} />
      </>
    ),
    art: (
      <>
        <path d={far} fill="#3e3427" stroke={EDGE} strokeWidth={1} />
        <path d={sacrum} fill="#5a4f3e" stroke={EDGE} strokeWidth={0.9} />
        {[-12, -5, 2].map((y) => (
          <circle key={y} cx={-28} cy={y} r={1.6} fill="#120c08" />
        ))}
        <path d={blade} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={1.2} />
        {/* The hollow of the blade, its thick crest, and the socket. */}
        <path d="M-26 -18 C-18 -12 -6 -8 4 -8 C8 -16 10 -26 6 -34 C-6 -40 -20 -36 -26 -18 Z" fill="rgba(30,22,14,0.35)" />
        <path d="M-35 -38 C-22 -49 4 -48 20 -36" stroke={BHL} strokeWidth={2} fill="none" />
        <path d={ring} fill="#8a7f68" stroke={EDGE} strokeWidth={1} />
        <ellipse cx={7} cy={23} rx={5} ry={5.5} fill="#0a0706" />
        <circle cx={2} cy={7} r={6} fill="rgba(12,8,5,0.55)" />
        <path d="M-6 31 C-2 35 7 35 13 31" stroke="rgba(40,28,14,0.6)" strokeWidth={2} fill="none" />
      </>
    ),
  };
};

// Aged bone: a dark stain soaks into the knuckles at both ends of long bones.
const GRIME = 'rgba(38,26,12,0.5)';

/** Femur: head on its neck, the trochanter behind, a shaft bowed a little
 *  forward, and the knuckled condyles at the knee with the kneecap in front. */
export const femurPart = (ids: Ids, lit: boolean): Part => {
  const shaft =
    'M-7 12 C-9 40 -8 76 -9 99 C-11 105 -14 109 -14 114 C-13 122 -2 124 2 120 C6 124 15 122 15 114 C15 108 11 104 9 98 C9 74 9 40 8 12 Z';
  const neck = 'M-4 15 C-6 6 -2 -2 4 -5 L10 2 C5 5 4 10 6 16 Z';
  const troch = 'M-8 17 C-16 13 -15 2 -7 0 C-3 2 -1 10 -3 17 Z';
  return {
    sil: (
      <>
        <circle cx={3} cy={-3} r={10} />
        <path d={neck} />
        <path d={troch} />
        <path d={shaft} />
        <ellipse cx={15} cy={110} rx={5} ry={8} />
      </>
    ),
    art: (
      <>
        <path d={troch} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={1} />
        <path d={neck} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={1} />
        <circle cx={3} cy={-3} r={10} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={1} />
        <path d={shaft} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={1} />
        {/* Linea aspera down the back, the notch between the condyles. */}
        <path d="M-5 24 C-7 50 -7 76 -8 96" stroke="rgba(20,14,8,0.55)" strokeWidth={1.6} fill="none" />
        <path d="M1 106 C2 111 2 115 2 120" stroke={EDGE} strokeWidth={1.3} fill="none" />
        <path d="M4 18 C6 50 6 78 6 97" stroke={BHL} strokeWidth={1.3} fill="none" />
        <path d="M-13 112 C-9 119 -3 121 2 119 C7 121 12 120 14 116" stroke={GRIME} strokeWidth={3.5} fill="none" />
        <ellipse cx={15} cy={110} rx={5} ry={8} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={0.9} />
      </>
    ),
  };
};

/** Tibia: the broad plateau under the knee, the crest of the shin narrowing to
 *  the ankle knuckle; the thin fibula runs behind it. */
export const tibiaPart = (ids: Ids, lit: boolean): Part => {
  const tibia =
    'M-14 -1 C-15 7 -10 13 -6 19 C-5 50 -4 86 -4 107 C-6 112 -6 119 -2 122 L9 122 C12 118 12 112 9 107 C9 86 10 50 13 23 C17 17 18 7 15 -1 C6 -5 -5 -5 -14 -1 Z';
  const fibula = 'M-12 8 C-14 30 -11 80 -10 114 L-5 116 C-6 80 -8 30 -7 8 Z';
  return {
    sil: (
      <>
        <path d={tibia} />
        <path d={fibula} />
        <circle cx={-10} cy={6} r={5} />
      </>
    ),
    art: (
      <>
        <path d={fibula} fill="#6e6452" stroke={EDGE} strokeWidth={0.8} />
        <circle cx={-10} cy={6} r={5} fill="#7a6f5a" stroke={EDGE} strokeWidth={0.8} />
        <ellipse cx={-7} cy={117} rx={4} ry={5} fill="#7a6f5a" stroke={EDGE} strokeWidth={0.8} />
        <path d={tibia} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={1} />
        {/* Under-lip of the plateau, the tuberosity, the lit crest, grime. */}
        <path d="M-12 5 C-4 9 6 9 15 5" stroke="rgba(20,14,8,0.5)" strokeWidth={1.6} fill="none" />
        <path d="M13 13 C14 18 13 23 11 27" stroke={EDGE} strokeWidth={1} fill="none" />
        <path d="M9 28 C8 56 7 86 7 105" stroke={BHL} strokeWidth={1.3} fill="none" />
        <path d="M-12 1 C-4 -2 6 -2 14 1" stroke={GRIME} strokeWidth={3} fill="none" />
        <path d="M-3 113 C0 119 5 121 9 118" stroke={GRIME} strokeWidth={2.5} fill="none" />
      </>
    ),
  };
};

/** Foot bones: the heel and knuckled tarsals, four long metatarsals fanning
 *  into jointed toes. */
const META = [0, 1, 2, 3].map((k) => ({
  a: [7, 5 + k * 2.6] as const,
  b: [38 + k * 1.2, 13 + k * 1.9] as const,
  c: [53 + k * 0.6, 18 + k * 0.9] as const,
}));
const HEEL = 'M-18 6 C-20 14 -14 19 -6 18 L7 16 C11 12 10 3 4 0 C-2 -4 -14 -3 -18 6 Z';
export const kingFootPart = (ids: Ids): Part => {
  // With no colour the strokes inherit the caller's paint (silhouette copies).
  const bones = (w: number, key: string, color?: string, extra = 0) =>
    META.map((m, k) => (
      <g key={`${key}${k}`}>
        <path d={`M${m.a[0]} ${m.a[1]} L${m.b[0]} ${m.b[1]}`} stroke={color} strokeWidth={w + extra} strokeLinecap="round" fill="none" />
        <path d={`M${m.b[0]} ${m.b[1]} L${m.c[0]} ${m.c[1]}`} stroke={color} strokeWidth={w * 0.8 + extra} strokeLinecap="round" fill="none" />
      </g>
    ));
  return {
    sil: (
      <>
        <path d={HEEL} />
        {bones(4.4, 's')}
      </>
    ),
    art: (
      <>
        {bones(4.4, 'e', EDGE, 1.6)}
        {bones(4.4, 'b', '#9a8f76')}
        {META.map((m, k) => (
          <circle key={k} cx={m.b[0]} cy={m.b[1]} r={2.2} fill="#b0a488" stroke={EDGE} strokeWidth={0.5} />
        ))}
        <path d={HEEL} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={1} />
        <path d="M2 3 C5 7 5 12 3 15" stroke={EDGE} strokeWidth={0.9} fill="none" />
        <path d="M-15 5 C-10 -1 -2 -2 4 1" stroke={BHL} strokeWidth={1.2} fill="none" />
      </>
    ),
  };
};

/** Humerus: the ball of the shoulder, the deltoid ridge, and the flared
 *  knuckle of the elbow. */
export const humerusPart = (ids: Ids, lit: boolean): Part => {
  const shaft = 'M-6 8 C-8 32 -6 62 -7 90 C-11 94 -13 98 -12 103 C-8 108 8 108 12 103 C13 98 11 94 7 90 C7 62 10 36 7 8 Z';
  return {
    sil: (
      <>
        <circle cx={0} cy={0} r={11} />
        <path d={shaft} />
      </>
    ),
    art: (
      <>
        <path d={shaft} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={1} />
        <path d="M7 30 C10 36 10 44 8 50" stroke={EDGE} strokeWidth={1} fill="none" />
        <circle cx={0} cy={0} r={11} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={1} />
        <path d="M3 14 C4 44 4 72 3 90" stroke={BHL} strokeWidth={1.2} fill="none" />
        <path d="M-11 100 C-6 106 6 106 11 100" stroke={GRIME} strokeWidth={3} fill="none" />
      </>
    ),
  };
};

/** The royal pauldron. Rides the near shoulder, turning partway with the arm. */
export const pauldronPart = (ids: Ids): Part => {
  const p1 = 'M-38 -24 C-36 -52 32 -54 40 -22 L38 8 C20 -2 -20 -2 -38 6 Z';
  const p2 = 'M-36 4 C-18 -4 18 -4 36 6 L34 21 C18 13 -18 13 -35 20 Z';
  const p3 = 'M-33 19 C-17 12 17 12 33 21 L31 33 C17 26 -17 26 -32 32 Z';
  return {
    sil: <path d={p1 + p2 + p3} />,
    art: (
      <>
        {true ? (
          <>
            <path d={p3} fill={url(ids, 'iron')} stroke="#050404" strokeWidth={1.2} />
            <path d={p2} fill={url(ids, 'iron')} stroke="#050404" strokeWidth={1.2} />
            <path d={p1} fill={url(ids, 'ironCop')} stroke="#050404" strokeWidth={1.4} />
            <path d="M-34 -28 C-28 -48 28 -50 36 -24" stroke={url(ids, 'kgold')} strokeWidth={3.2} fill="none" />
            <path d="M-34 6 C-18 -2 18 -2 36 8" stroke={url(ids, 'kgold')} strokeWidth={2} fill="none" opacity={0.7} />
            <path d="M-32 21 C-16 13 16 13 33 22" stroke={url(ids, 'kgold')} strokeWidth={1.6} fill="none" opacity={0.5} />
            {/* Rust bloom, filigree and a spike. */}
            <path d="M-16 -34 C-8 -38 2 -34 -4 -26 C-12 -22 -22 -26 -16 -34 Z" fill="#5a2a12" opacity={0.7} />
            <path d="M-20 -14 C-10 -22 4 -22 12 -12 M-6 -18 C-2 -26 8 -26 12 -18" stroke="#8e6a2c" strokeWidth={1.2} fill="none" opacity={0.6} />
            <path d="M0 -44 L8 -70 L14 -42 Z" fill="#1e1c1e" stroke="#050404" strokeWidth={1} />
            {[-24, -8, 10, 26].map((x) => (
              <circle key={x} cx={x} cy={-4 + Math.abs(x) * 0.08} r={1.8} fill="#a89c82" opacity={0.6} />
            ))}
          </>
        ) : null}
      </>
    ),
  };
};

export const forearmBonesPart = (ids: Ids, lit: boolean): Part => {
  const ulna = 'M-8 -6 L-5 92 L-1 92 L-3 -2 Z';
  const radius = 'M1 2 L3 94 L8 94 L6 2 Z';
  const bracer = 'M-12 34 L12 32 L13 80 L-11 82 Z';
  return {
    sil: (
      <>
        <path d={ulna} />
        <path d={radius} />
        <path d={bracer} />
        <circle cx={-6} cy={-4} r={6} />
      </>
    ),
    art: (
      <>
        <path d={ulna} fill="#7a6f5a" stroke={EDGE} strokeWidth={0.8} />
        <path d={radius} fill={bone(ids, lit)} stroke={EDGE} strokeWidth={0.8} />
        <circle cx={-6} cy={-4} r={6} fill={url(ids, 'skull')} stroke={EDGE} strokeWidth={0.8} />
        <path d={bracer} fill={url(ids, 'iron')} stroke="#050404" strokeWidth={1.2} />
        <path d="M-12 36 L12 34 M-11 78 L13 76" stroke={url(ids, 'kgold')} strokeWidth={2.6} />
        <path d="M-6 50 C-2 56 4 52 8 58" stroke="#5a2a12" strokeWidth={4} opacity={0.6} fill="none" />
        {[44, 58, 70].map((y) => (
          <circle key={y} cx={8} cy={y} r={1.5} fill="#8a8078" />
        ))}
      </>
    ),
  };
};

export const kingHandPart = (ids: Ids, grip: boolean): Part => {
  const palm = 'M-9 -2 L9 -2 L11 22 L-8 24 Z';
  const fingers = grip
    ? 'M-8 22 C-12 34 -6 42 4 40 M-2 24 C-4 36 2 44 10 40 M4 22 C4 34 10 40 14 34'
    : 'M-8 22 L-14 46 M-2 24 L-4 52 M4 24 L6 52 M10 22 L16 46';
  return {
    sil: (
      <>
        <path d={palm} />
        <path d={fingers} strokeWidth={5} fill="none" strokeLinecap="round" />
      </>
    ),
    art: (
      <>
        <path d={palm} fill={bone(ids, true)} stroke={EDGE} strokeWidth={0.8} />
        <path d={fingers} stroke="#9a8f76" strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d={fingers} stroke={EDGE} strokeWidth={0.8} fill="none" strokeDasharray="7 3" />
      </>
    ),
  };
};

// The greatsword: long notched blade, cruel guard, spiked pommel.
const gsEdge = (() => {
  const right: string[] = [];
  const left: string[] = [];
  for (let y = 40, k = 0; y < 340; y += 22, k++) {
    const w = 22 - (y - 40) * 0.028;
    const notch = rr(3, 10, 700, k);
    right.push(`L${w.toFixed(1)} ${y}`, `L${(w - notch).toFixed(1)} ${y + 7}`, `L${w.toFixed(1)} ${y + 12}`);
    const nl = rr(2, 8, 701, k);
    left.unshift(`L${(-w + (k % 3 === 1 ? nl : 0)).toFixed(1)} ${y + 12}`, `L${(-w).toFixed(1)} ${y}`);
  }
  return `M-22 36 L22 36 ${right.join(' ')} L13 350 L0 ${GS.tip} L-14 346 ${left.join(' ')} Z`;
})();

export const greatswordPart = (ids: Ids, heat: number): Part => {
  const guard = 'M-50 20 C-24 27 24 27 50 20 L56 34 C30 39 -30 39 -56 34 Z';
  return {
    sil: (
      <>
        <path d={gsEdge} />
        <path d={guard} />
        <rect x={-6} y={-42} width={12} height={64} />
        <circle cx={0} cy={-50} r={11} />
      </>
    ),
    art: (
      <>
        <path d={gsEdge} fill={url(ids, 'gs')} stroke="#050506" strokeWidth={1.2} />
        {/* Fuller, rust, and a pale worn edge. */}
        <path d="M0 48 L0 270" stroke="#0a0a0c" strokeWidth={6} />
        <path d="M-12 120 C-4 130 -10 150 -2 170 L-10 176 C-16 156 -18 136 -12 120 Z" fill="#5a2a14" opacity={0.55} />
        <path d="M6 220 C12 230 8 244 14 252 L8 256 C4 244 2 232 6 220 Z" fill="#4a2410" opacity={0.6} />
        {/* Honed edges catch the moon, so the blade reads against the dark. */}
        <path d="M20 40 L14 332" stroke="rgba(214,222,238,0.8)" strokeWidth={2} />
        <path d="M-19 44 L-12 340" stroke="rgba(170,180,200,0.35)" strokeWidth={1.4} />
        {heat > 0 ? (
          <path
            d="M0 60 L3 110 L-2 160 L2 210 L-1 262"
            stroke="#ff5a1a"
            strokeWidth={3}
            fill="none"
            opacity={heat}
          />
        ) : null}
        <path d={guard} fill={url(ids, 'iron')} stroke="#050404" strokeWidth={1.2} />
        <path d="M-50 21 C-24 28 24 28 50 21" stroke={url(ids, 'kgold')} strokeWidth={2.2} fill="none" />
        <rect x={-6} y={-42} width={12} height={64} fill="#1c120c" />
        {[-36, -26, -16, -6, 4, 14].map((y) => (
          <path key={y} d={`M-6 ${y} L6 ${y + 5}`} stroke="#0a0604" strokeWidth={1.6} />
        ))}
        <circle cx={0} cy={-50} r={11} fill={url(ids, 'ironCop')} stroke="#050404" strokeWidth={1} />
        <path d="M-4 -60 L0 -76 L4 -60 Z" fill="#1e1c1e" />
      </>
    ),
  };
};

/** The ermine collar that sits over the shoulders (chest frame). */
export const furPart = (ids: Ids): Part => {
  const pts: string[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.08 * Math.sin(i * 2.7) + rr(-0.05, 0.05, 710, i);
    const x = -10 + Math.cos(a) * 42 * r;
    const y = -90 + Math.sin(a) * 20 * r - Math.cos(a) * 6;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const d = pts.join(' ') + ' Z';
  return {
    sil: <path d={d} />,
    art: (
      <>
        <path d={d} fill={url(ids, 'fur')} stroke="#2a241c" strokeWidth={1} />
        {[
          [-30, -92],
          [-14, -100],
          [4, -96],
          [18, -88],
          [-22, -80],
          [-2, -84],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} l2 6 l-2 2 l-2 -2 Z`} fill="#141010" />
        ))}
        <path d="M-44 -96 C-30 -110 10 -112 28 -98" stroke="rgba(245,240,230,0.6)" strokeWidth={2} fill="none" />
      </>
    ),
  };
};
