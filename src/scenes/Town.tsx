// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene 3, "town": nightfall in Clogheen, seen the way old isometric games
// saw their villages: a low-res, palette-dithered square of timber cottages,
// a well, a campfire, a creaking tavern sign, and the old church looming over
// it all with red light leaking from its door. The camera drifts toward the
// church while the town shutters itself in; at the rumble the glow surges,
// dust falls, and the crows take flight.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FadeLayer, Grain, Letterbox, Narration, Vignette, progress, useShake} from '../lib/fx';
import {cues, palette} from '../theme';
import {PixelTown} from './town/PixelTown';
import {LocationCard} from './town/LocationCard';

const C = cues.town;

export const TownScene: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = useShake([{frame: C.churchRumble, strength: 9, decay: 30}], 'town-rumble');
  const fade = Math.max(1 - progress(frame, 0, C.fadeInEnd), progress(frame, C.fadeOutStart, 448));
  return (
    <AbsoluteFill style={{background: palette.black, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `${shake} scale(1.01)`}}>
        <PixelTown />
      </AbsoluteFill>
      <LocationCard />
      <Narration text="The doors are barred. The windows go dark." window={C.line1 as [number, number]} />
      <Narration text="Only the old church still burns with light." window={C.line2 as [number, number]} />
      <Vignette strength={0.7} />
      <Grain opacity={0.08} />
      <FadeLayer opacity={fade} />
      <Letterbox amount={1} />
    </AbsoluteFill>
  );
};
