// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene 2, "road": dusk on the open road. The traveler walks toward Clogheen
// on its hill, the church spire black against a bruised sky and something red
// breathing in the ground beneath it. Crows burst from a dead tree; far off,
// the church bell tolls once.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FadeLayer, Fog, Grain, Letterbox, Narration, Vignette, progress} from '../lib/fx';
import {cues, palette} from '../theme';
import {Ground, Hills, Midfield, Mountains} from './road/Landscape';
import {NearGrass, VergeGrass} from './road/Grass';
import {SUN, Sky, lightAt} from './road/Sky';
import {SkyIslands} from './road/SkyIslands';
import {Town} from './road/Town';
import {Traveler} from './road/Traveler';
import {Crows, DeadTree} from './road/Tree';
import {Waymarker} from './road/Waymarker';

const C = cues.road;

/** Warm haze where the land meets the afterglow: atmospheric perspective. */
const HorizonHaze: React.FC<{top: number; height: number; alpha: number}> = ({top, height, alpha}) => {
  const f = useCurrentFrame();
  const a = alpha * lightAt(f);
  return (
    <AbsoluteFill
      style={{
        top,
        height,
        background: `radial-gradient(ellipse 70% 100% at 32% 60%, rgba(255,150,100,${a}) 0%, rgba(200,90,100,${
          a * 0.5
        }) 45%, rgba(120,60,110,0) 100%)`,
      }}
    />
  );
};

/** Afterglow blooming over the silhouettes, so the land sits inside the light. */
const LightWrap: React.FC = () => {
  const f = useCurrentFrame();
  const a = lightAt(f);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 900px 380px at ${SUN.x}px ${SUN.y - 40}px, rgba(255,140,80,${
          0.13 * a
        }) 0%, rgba(200,80,70,${0.05 * a}) 50%, rgba(200,80,70,0) 100%)`,
      }}
    />
  );
};

export const RoadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = Math.max(1 - progress(frame, 0, C.fadeInEnd), progress(frame, C.fadeOutStart, 390));
  return (
    <AbsoluteFill style={{background: palette.black, overflow: 'hidden'}}>
      <Sky />
      <SkyIslands />
      <Mountains />
      <HorizonHaze top={560} height={180} alpha={0.22} />
      <Hills />
      <Fog color="170,120,160" opacity={0.14} seed="rd-fog-far" count={7} y={600} height={80} drift={-0.3} />
      <Town />
      <HorizonHaze top={640} height={120} alpha={0.16} />
      <Midfield />
      <Fog color="150,110,150" opacity={0.12} seed="rd-fog-mid" count={8} y={700} height={70} drift={-0.5} />
      <Fog color="160,120,160" opacity={0.1} seed="rd-fog-low" count={8} y={735} height={50} drift={-0.8} />
      <DeadTree />
      <Ground />
      <VergeGrass />
      <LightWrap />
      <Waymarker />
      <Traveler />
      <NearGrass />
      <Crows />
      <Narration text="You answered his call." window={C.line1 as [number, number]} />
      <Narration
        text="Clogheen lies ahead, and the last light is failing."
        window={C.line2 as [number, number]}
      />
      <Vignette strength={0.7} />
      <Grain />
      <Letterbox amount={1} />
      <FadeLayer opacity={fade} />
    </AbsoluteFill>
  );
};
