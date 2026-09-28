// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene 4, "steel": night at the church gate. A close-up of the hooded
// traveler, breath smoking in the cold, then an insert of the gloved hand on
// the hilt drawing the longsword. A heartbeat tightens the frame; a glint
// runs the edge; hard cut to black.

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FadeLayer, Grain, Letterbox, Narration, Vignette, easeInOut, progress} from '../lib/fx';
import {palette} from '../theme';
import {C, CUT, heartbeat} from './steel/beats';
import {PaintLayer} from './steel/Canvas';
import {Cam, paintBgA, paintFigureA, paintMotes} from './steel/shotA';
import {camB, paintBgB, paintFgB} from './steel/shotB';

const LINE = 'You steel yourself for what comes next.';

/** Shot A camera: a slow push toward the eye with a gentle drift. */
const camA = (f: number): Cam => {
  const t = progress(f, 0, CUT, easeInOut);
  return {x: 1020 + t * 24, y: 505 - t * 12, s: 1.2 + t * 0.09};
};

/** Shot B's motes ride the camera (relative to its resting framing). */
const moteCamB = (f: number): Cam => {
  const c = camB(f);
  const c0 = camB(170);
  return {x: 960 + (c.x - c0.x) * c.s, y: 540 + (c.y - c0.y) * c.s, s: 1 + (c.s - c0.s) * 0.6};
};

/** Red tightening at the frame edges on each heartbeat. */
const PulseVignette: React.FC<{p: number}> = ({p}) =>
  p <= 0.01 ? null : (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 50%, rgba(90,4,6,0) ${58 - p * 10}%, rgba(110,6,8,${
          0.28 * p
        }) 82%, rgba(60,0,2,${0.6 * p}) 100%)`,
      }}
    />
  );

export const SteelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const beat = heartbeat(frame);
  const shotA = frame < CUT;
  const zoom = 1 + beat * 0.012;

  if (frame >= C.cutToBlack) return <AbsoluteFill style={{background: '#000'}} />;

  return (
    <AbsoluteFill style={{background: palette.black, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        {shotA ? (
          <>
            <PaintLayer res={0.25} blur={3} paint={(ctx) => paintBgA(ctx, frame, camA(frame))} />
            <PaintLayer
              paint={(ctx) => {
                const cam = camA(frame);
                paintFigureA(ctx, frame, cam);
                paintMotes(ctx, frame, cam);
              }}
            />
          </>
        ) : (
          <>
            <PaintLayer res={0.3} blur={4} paint={(ctx) => paintBgB(ctx, frame, 0.3)} />
            <PaintLayer
              paint={(ctx) => {
                paintFgB(ctx, frame);
                paintMotes(ctx, frame, moteCamB(frame), 'moteB', moteCamB(frame - 0.9));
              }}
            />
          </>
        )}
      </AbsoluteFill>
      <Vignette strength={0.8} />
      <PulseVignette p={beat} />
      <Narration text={LINE} window={C.line1 as [number, number]} />
      <Grain opacity={0.08} />
      <FadeLayer opacity={1 - progress(frame, 0, 12)} />
      <Letterbox amount={1} />
    </AbsoluteFill>
  );
};
