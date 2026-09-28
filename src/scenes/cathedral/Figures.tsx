// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Renders both fighters as one z-sorted SVG. Each part gets:
//   - a thin rim copy nudged toward the key light (light wrapping the edge),
//   - its painted art,
//   - optionally a dark shade over its silhouette (a figure backlit to near
//     silhouette),
//   - a key-light gradient and a fill-light gradient laid over its silhouette,
//     oriented in the part's own frame from the screen-space light direction,
// so the puppets respond to the moon, the candles and the king's fire.

import React from 'react';
import {Cam, proj, sOf} from './camera';
import {Crown, crownDefs} from './crown';
import {Duel, Solved} from './choreo';
import {Item, makeIds} from './figure';
import {
  chestPart,
  footPart,
  forearmPart,
  handPart,
  headPart,
  knightDefs,
  pelvisPart as kPelvisPart,
  shieldPart,
  shinPart,
  spinePart,
  swordPart,
  thighPart,
  upperArmPart,
} from './knight';
import {
  CROWN_SEAT,
  EYE_FAR,
  EYE_NEAR,
  femurPart,
  forearmBonesPart,
  furPart,
  greatswordPart,
  humerusPart,
  jawPart,
  kingDefs,
  kingFootPart,
  kingHandPart,
  lumbarPart,
  neckPart,
  pauldronPart,
  pelvisPart as gPelvisPart,
  ribcageParts,
  skullPart,
  tibiaPart,
} from './king';
import {ap, boneAngle, I, Mat, mstr, mul, rot, tr, Vec, wrap} from './rig';
import {nz, nz2, rnd} from './util';

export const outerOf = (cam: Cam, s: Solved): Mat => {
  const [sx, sy] = proj(cam, s.x, 0, s.d);
  const k = sOf(cam, s.d);
  return [k * s.facing, 0, 0, k, sx, sy];
};

/** A light as seen by one figure: direction points from the figure toward it. */
export type Light = {color: string; a: number; dir: Vec};
export type CharLight = {
  key: Light;
  fill: Light;
  rim: {color: string; a: number; px: number};
  shade?: {color: string; a: number}; // sinks the figure toward silhouette (backlit)
};

export type FigureLight = {
  knight: CharLight;
  king: CharLight;
  eyes: number; // 0 dark .. 1 lit .. 2+ blazing
  engulf: number; // phase-two fire around the skull
  shieldGlint: number;
  crownGlint?: number;
  swordHeat: number;
  fringe: number; // chromatic fringe (slow motion)
};

type Ext = readonly [number, number, number]; // local centre and radius
type It = Item & {ext?: Ext; who: 'k' | 'g' | 'fx'};

const polyD = (pts: Vec[]) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L') + ' Z';

const extOf = (pts: Vec[]): Ext => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2 + 2];
};

/** Cloth polygon: down the outer chain, a tattered hem, back up the inner one. */
const clothPts = (outer: Vec[], inner: Vec[], seed: number, tatter: number): Vec[] => {
  const a = outer[outer.length - 1];
  const b = inner[inner.length - 1];
  const hem: Vec[] = [];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const jag = (i % 2 ? 1 : 0.2) * tatter * (0.5 + 0.5 * Math.abs(nz(i * 1.7, seed)));
    hem.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - jag]);
  }
  return [...outer, ...hem, ...[...inner].reverse()];
};

/** Light direction in a part's local frame. */
const localDir = (m: Mat, d: Vec): Vec => {
  const det = m[0] * m[3] - m[1] * m[2];
  const x = (m[3] * d[0] - m[2] * d[1]) / det;
  const y = (-m[1] * d[0] + m[0] * d[1]) / det;
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

type CrownPose = {m: Mat; tilt: number; glint: number; z: number; red?: number} | null;

export const Figures: React.FC<{
  duel: Duel;
  cam: Cam;
  t: number;
  light: FigureLight;
  idPrefix: string;
  crown: CrownPose;
  trail?: {pts: Vec[][]; alpha: number} | null;
  riposte: boolean;
  only?: 'knight' | 'king';
}> = ({duel, cam, t, light, idPrefix, crown, trail, riposte, only}) => {
  const ids = makeIds(idPrefix);
  const items: It[] = [];
  const {knight: K, king: G} = duel;
  const MOON: Vec = [0.6, -0.8];
  const lit = (m: Mat) => m[0] * MOON[0] + m[1] * MOON[1] > 0;

  // ---- Knight ------------------------------------------------------------
  if (only !== 'king') {
    const ko = outerOf(cam, K);
    const kBase = 200;
    const kW = (b: string) => mul(ko, K.W[b]);
    const add = (key: string, z: number, m: Mat, part: {sil: React.ReactNode; art: React.ReactNode}, ext: Ext) =>
      items.push({key: 'k' + key, who: 'k', z: kBase + z, m, sil: part.sil, art: part.art, rim: 1, ext});
    const cape = clothPts(K.cloth.outer, K.cloth.inner, 3, 16);
    add('cape', 0, ko, {
      sil: <path d={polyD(cape)} />,
      art: (
        <>
          <path d={polyD(cape)} fill={`url(#${ids('cape')})`} stroke="#050102" strokeWidth={1} />
          {/* Folds: shadowed troughs either side of a faintly lit crest. */}
          {[0.25, 0.48, 0.74].map((u, i) => (
            <path
              key={i}
              d={'M' + K.cloth.inner.map((p, j) => {
                const o = K.cloth.outer[j];
                return `${(p[0] + (o[0] - p[0]) * u).toFixed(1)} ${(p[1] + (o[1] - p[1]) * u).toFixed(1)}`;
              }).join(' L')}
              stroke={i === 1 ? 'rgba(150,44,48,0.35)' : 'rgba(0,0,0,0.45)'}
              strokeWidth={i === 1 ? 1.6 : 3}
              fill="none"
            />
          ))}
        </>
      ),
    }, extOf(cape));
    const arm = (side: 'near' | 'far', z: number) => {
      add(side + 'UpperArm', z, kW(side + 'UpperArm'), upperArmPart(ids, lit(kW(side + 'UpperArm')), side === 'near'), [0, 26, 40]);
      add(side + 'Forearm', z + 1, kW(side + 'Forearm'), forearmPart(ids, lit(kW(side + 'Forearm'))), [0, 28, 32]);
    };
    arm('far', 1);
    items.push({
      key: 'ksword',
      who: 'k',
      z: riposte ? 100 + 10 : kBase + 3,
      m: kW('sword'),
      ...swordPart(ids),
      rim: 1,
      ext: [0, 70, 96],
    });
    add('farHand', 4, kW('farHand'), handPart(ids, lit(kW('farHand'))), [0, 11, 15]);
    for (const [side, z] of [['far', 5], ['near', 9]] as const) {
      add(side + 'Thigh', z, kW(side + 'Thigh'), thighPart(ids, lit(kW(side + 'Thigh'))), [0, 40, 46]);
      add(side + 'Shin', z + 1, kW(side + 'Shin'), shinPart(ids, lit(kW(side + 'Shin'))), [0, 40, 44]);
      add(side + 'Foot', z + 2, kW(side + 'Foot'), footPart(ids, lit(kW(side + 'Foot'))), [14, 2, 27]);
    }
    add('pelvis', 8, kW('pelvis'), kPelvisPart(ids), [0, -3, 23]);
    if (K.skirt) {
      const d = polyD(K.skirt);
      add('skirt', 12, ko, {
        sil: <path d={d} />,
        art: (
          <>
            <path d={d} fill={`url(#${ids('tabard')})`} stroke="#120203" strokeWidth={1} />
            <path
              d={`M${K.skirt[1][0] - 8} ${K.skirt[1][1] + 6} L${K.skirt[2][0] - 10} ${K.skirt[2][1] - 4}`}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={3}
            />
          </>
        ),
      }, extOf(K.skirt));
    }
    add('spine', 13, kW('spine'), spinePart(ids), [0, -25, 28]);
    add('chest', 14, kW('chest'), chestPart(ids), [2, -32, 37]);
    add('head', 15, kW('head'), headPart(ids, lit(kW('head'))), [1, -32, 36]);
    arm('near', 16);
    add('nearHand', 18, kW('nearHand'), handPart(ids, lit(kW('nearHand'))), [0, 11, 15]);
    add('shield', 19, kW('shield'), shieldPart(ids, light.shieldGlint), [0, 6, 64]);
  }

  // ---- King --------------------------------------------------------------
  const go = outerOf(cam, G);
  const gs = sOf(cam, G.d);
  if (only !== 'knight') {
    const gBase = 100;
    const gW = (b: string) => mul(go, G.W[b]);
    const add = (key: string, z: number, m: Mat, part: {sil: React.ReactNode; art: React.ReactNode}, ext: Ext, rim = 1) =>
      items.push({key: 'g' + key, who: 'g', z: gBase + z, m, sil: part.sil, art: part.art, rim, ext});
    const mantle = clothPts(G.cloth.outer, G.cloth.inner, 7, 34);
    add('mantle', 0, go, {
      sil: <path d={polyD(mantle)} />,
      art: (
        <>
          <path d={polyD(mantle)} fill={`url(#${ids('mantle')})`} stroke="#0a0203" strokeWidth={1.2} />
          {/* Heavy folds. */}
          {[0.3, 0.55, 0.8].map((u, i) => (
            <path
              key={i}
              d={'M' + G.cloth.inner.map((p, j) => {
                const o = G.cloth.outer[j];
                return `${(p[0] + (o[0] - p[0]) * u).toFixed(1)} ${(p[1] + (o[1] - p[1]) * u).toFixed(1)}`;
              }).join(' L')}
              stroke={i === 1 ? 'rgba(120,30,34,0.35)' : 'rgba(0,0,0,0.5)'}
              strokeWidth={i === 1 ? 2 : 4}
              fill="none"
            />
          ))}
          {/* Ermine trim down the leading edge. */}
          <path
            d={'M' + G.cloth.inner.map((p) => `${(p[0] + 5).toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}
            stroke={`url(#${ids('fur')})`}
            strokeWidth={11}
            fill="none"
            strokeLinecap="round"
          />
        </>
      ),
    }, extOf(mantle));
    const armZ = G.swordBack ? 0.5 : 19;
    add('farUpperArm', 1, gW('farUpperArm'), humerusPart(ids, lit(gW('farUpperArm'))), [0, 50, 56]);
    add('farForearm', 2, gW('farForearm'), forearmBonesPart(ids, lit(gW('farForearm'))), [0, 44, 50]);
    add('farHand', 3, gW('farHand'), kingHandPart(ids, t > 330 && t < 440), [0, 22, 26]);
    add('farThigh', 4, gW('farThigh'), femurPart(ids, lit(gW('farThigh'))), [0, 56, 62]);
    add('farShin', 5, gW('farShin'), tibiaPart(ids, lit(gW('farShin'))), [2, 58, 62]);
    add('farFoot', 6, gW('farFoot'), kingFootPart(ids), [20, 8, 38]);
    const ribs = ribcageParts(ids);
    add('ribsBack', 7, gW('chest'), ribs.back, [-4, -50, 58], 0.4);
    add('lumbar', 8, gW('spine'), lumbarPart(ids, lit(gW('spine'))), [0, -30, 32]);
    add('pelvis', 9, gW('pelvis'), gPelvisPart(ids), [-8, -10, 36]);
    add('nearThigh', 10, gW('nearThigh'), femurPart(ids, lit(gW('nearThigh'))), [0, 56, 62]);
    add('nearShin', 11, gW('nearShin'), tibiaPart(ids, lit(gW('nearShin'))), [2, 58, 62]);
    add('nearFoot', 12, gW('nearFoot'), kingFootPart(ids), [20, 8, 38]);
    add('ribsFront', 13, gW('chest'), ribs.front, [0, -50, 56]);
    add('neck', 14, gW('neck'), neckPart(ids, lit(gW('neck'))), [0, -10, 14]);
    add('skull', 15, gW('head'), skullPart(ids), [6, -36, 40]);
    add('jaw', 16, gW('jaw'), jawPart(), [16, 12, 22]);
    if (crown === null) {
      const cm = mul(gW('head'), mul(tr(CROWN_SEAT[0], CROWN_SEAT[1]), rot(-6)));
      items.push({
        key: 'gcrown',
        who: 'g',
        z: gBase + 17,
        m: cm,
        art: <Crown ids={ids} tilt={0.32} glint={light.crownGlint ?? 0} red={light.eyes > 1.2 ? 0.5 : 0} />,
        rim: 0,
      });
    } else if (crown) {
      items.push({
        key: 'gcrown',
        who: 'g',
        z: crown.z,
        m: crown.m,
        art: <Crown ids={ids} tilt={crown.tilt} glint={crown.glint} red={crown.red ?? 0} />,
        rim: 0,
      });
    }
    add('fur', 18, gW('chest'), furPart(ids), [-10, -90, 46]);
    add('nearUpperArm', armZ, gW('nearUpperArm'), humerusPart(ids, lit(gW('nearUpperArm'))), [0, 50, 56]);
    // The pauldron turns only partway with the arm, like plate strapped to the shoulder.
    const rel = wrap(boneAngle(G.W.nearUpperArm) - boneAngle(G.W.chest));
    const pm = mul(go, mul(G.W.chest, mul(tr(3, -74), mul(rot(rel * 0.3 - 4), [0.7, 0, 0, 0.7, 0, 0]))));
    add('pauldron', Math.max(armZ, 18) + 0.8, pm, pauldronPart(ids), [0, -8, 44]);
    add('sword', armZ + 0.2, gW('sword'), greatswordPart(ids, light.swordHeat), [0, 170, 220]);
    add('nearForearm', armZ + 0.4, gW('nearForearm'), forearmBonesPart(ids, lit(gW('nearForearm'))), [0, 44, 50]);
    add('nearHand', armZ + 0.6, gW('nearHand'), kingHandPart(ids, true), [0, 22, 26]);

    // ---- The eyes --------------------------------------------------------
    const head = gW('head');
    const eyes = [ap(head, EYE_NEAR[0], EYE_NEAR[1]), ap(head, EYE_FAR[0], EYE_FAR[1])];
    if (light.eyes > 0.01) {
      const e = light.eyes;
      const fl = 0.85 + 0.15 * nz(t * 0.4, 5);
      items.push({
        key: 'eyes',
        who: 'fx',
        z: gBase + 16.5,
        m: I,
        rim: 0,
        art: (
          <g>
            {eyes.map((p, i) => {
              const r = (i === 0 ? 1 : 0.8) * gs;
              const halo = (14 + 22 * Math.min(e, 2.5)) * r * fl;
              return (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={halo} fill={`url(#${ids('eyeGlow')})`} opacity={Math.min(1, e)} />
                  <circle cx={p[0]} cy={p[1]} r={3.2 * r * (0.8 + 0.2 * e)} fill="#ff6a1a" />
                  <circle cx={p[0]} cy={p[1]} r={1.6 * r * (0.8 + 0.25 * e)} fill="#fff4d0" />
                </g>
              );
            })}
            {/* Wisps of flame licking up out of the sockets. */}
            {eyes.map((p, i) =>
              [0, 1, 2].map((j) => {
                const ph = t * 0.22 + j * 2.1 + i * 1.3;
                const life = ((ph % 1) + 1) % 1;
                const h = (18 + 16 * e) * gs * (0.6 + 0.4 * Math.sin(ph * 3)) * (i === 0 ? 1 : 0.7);
                const sway = nz2(t * 0.08 + j, i * 4 + j) * 8 * gs;
                const w = (3.2 + e) * gs * (i === 0 ? 1 : 0.7);
                const x = p[0] + (j - 1) * 2 * gs;
                const y = p[1] - 1 * gs;
                return (
                  <path
                    key={`${i}-${j}`}
                    d={`M${x - w} ${y} Q${x - w * 0.6 + sway * 0.3} ${y - h * 0.5} ${x + sway} ${y - h} Q${x + w * 0.6 + sway * 0.3} ${y - h * 0.5} ${x + w} ${y} Z`}
                    fill={j === 1 ? '#ffb040' : '#ff4a12'}
                    opacity={Math.min(1, e) * (0.45 + 0.3 * Math.sin(life * Math.PI))}
                  />
                );
              }),
            )}
          </g>
        ),
      });
    }
    // ---- Motion smear of the greatsword ------------------------------------
    if (trail && trail.alpha > 0.01 && trail.pts.length > 1) {
      // Each ribbon segment fades from nothing at mid-blade to steel at the tip.
      const segs = [];
      for (let i = 0; i < trail.pts.length - 1; i++) {
        const a = trail.pts[i];
        const b = trail.pts[i + 1];
        const age = i / (trail.pts.length - 1);
        const gid = ids(`smear${i}`);
        const inner = [(a[0][0] + b[0][0]) / 2, (a[0][1] + b[0][1]) / 2];
        const outer = [(a[1][0] + b[1][0]) / 2, (a[1][1] + b[1][1]) / 2];
        segs.push(
          <g key={i}>
            <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={inner[0]} y1={inner[1]} x2={outer[0]} y2={outer[1]}>
              <stop offset="0" stopColor="#c4d2ec" stopOpacity={0} />
              <stop offset="0.75" stopColor="#c4d2ec" stopOpacity={0.5} />
              <stop offset="1" stopColor="#eef4ff" stopOpacity={0.9} />
            </linearGradient>
            <path d={polyD([a[0], a[1], b[1], b[0]])} fill={`url(#${gid})`} opacity={trail.alpha * Math.pow(1 - age, 1.6) * 0.55} />
          </g>,
        );
      }
      items.push({key: 'trail', who: 'fx', z: gBase + 18.9, m: I, rim: 0, blend: 'screen', art: <g>{segs}</g>});
    }
  }

  items.sort((a, b) => a.z - b.z);

  // Per-part lighting gradients.
  const defs: React.ReactNode[] = [];
  const overlays = new Map<string, React.ReactNode>();
  for (const it of items) {
    if (!it.sil || !it.ext || it.who === 'fx') continue;
    const L = it.who === 'k' ? light.knight : light.king;
    const [cx, cy, r] = it.ext;
    const layers: React.ReactNode[] = [];
    if (L.shade && L.shade.a > 0.01) {
      layers.push(
        <g key="shade" fill={L.shade.color} stroke={L.shade.color} strokeWidth={0} opacity={L.shade.a}>
          {it.sil}
        </g>,
      );
    }
    for (const [name, l, inner] of [
      ['key', L.key, 0.5],
      ['fill', L.fill, 0.35],
    ] as const) {
      if (l.a <= 0.01) continue;
      const d = localDir(it.m, l.dir);
      const gid = ids(`${name}-${it.key}`);
      defs.push(
        <linearGradient
          key={gid}
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={cx + d[0] * r * inner}
          y1={cy + d[1] * r * inner}
          x2={cx + d[0] * r}
          y2={cy + d[1] * r}
        >
          <stop offset="0" stopColor={l.color} stopOpacity={0} />
          <stop offset="1" stopColor={l.color} stopOpacity={l.a} />
        </linearGradient>,
      );
      layers.push(
        <g key={name} fill={`url(#${gid})`} stroke={`url(#${gid})`} strokeWidth={0}>
          {it.sil}
        </g>,
      );
    }
    overlays.set(it.key, layers);
  }

  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <defs>
        {knightDefs(ids)}
        {kingDefs(ids)}
        {crownDefs(ids)}
        <radialGradient id={ids('eyeGlow')}>
          <stop offset="0" stopColor="#ffd08a" stopOpacity="0.95" />
          <stop offset="0.18" stopColor="#ff6a1a" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#c01a08" stopOpacity="0.25" />
          <stop offset="1" stopColor="#800000" stopOpacity="0" />
        </radialGradient>
        {defs}
      </defs>
      {items.map((it) => {
        const L = it.who === 'k' ? light.knight : light.king;
        const k = it.who === 'k' ? sOf(cam, K.d) : gs;
        const showRim = it.sil && (it.rim ?? 1) > 0 && it.who !== 'fx';
        const fr = light.fringe;
        const px = L.rim.px * k;
        return (
          <g key={it.key} style={it.blend ? {mixBlendMode: it.blend} : undefined}>
            {showRim && fr > 0.01 ? (
              <>
                <g transform={mstr(mul(tr(-2.6 * fr, 0.4 * fr), it.m))} fill="rgb(255,50,70)" stroke="rgb(255,50,70)" strokeWidth={0} opacity={0.32} style={{mixBlendMode: 'screen'}}>
                  {it.sil}
                </g>
                <g transform={mstr(mul(tr(2.6 * fr, -0.4 * fr), it.m))} fill="rgb(60,190,255)" stroke="rgb(60,190,255)" strokeWidth={0} opacity={0.3} style={{mixBlendMode: 'screen'}}>
                  {it.sil}
                </g>
              </>
            ) : null}
            {showRim && L.rim.a > 0.01 ? (
              <g
                transform={mstr(mul(tr(L.key.dir[0] * px, L.key.dir[1] * px), it.m))}
                fill={L.rim.color}
                stroke={L.rim.color}
                strokeWidth={0}
                opacity={L.rim.a * (it.rim ?? 1)}
              >
                {it.sil}
              </g>
            ) : null}
            <g transform={mstr(it.m)}>
              {it.art}
              {overlays.get(it.key)}
            </g>
          </g>
        );
      })}
    </svg>
  );
};
