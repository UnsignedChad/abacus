// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Scene 5, "depths": what lies beneath. A crisp top-down tile view of the
// crypt under the old church, walked one step at a time while the field of
// view peels back the dark. A skeletal warrior steps into view; a low hum
// grows. The adventurer reaches a great seal in the floor, the view closes
// in and the interface falls away; the runes wake, light runs through the
// channels in the stone, the seal splits and the camera falls through into
// a vast green-lit abyss, until everything goes white.

import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FadeLayer, Grain, Letterbox, Narration, Vignette, clamp, easeIn, progress} from '../lib/fx';
import {cues} from '../theme';
import {renderFrame} from './depths/render';
import {DungeonUi} from './depths/Ui';

const C = cues.depths;

const LINE1 = 'Beneath Clogheen, the old halls wind ever downward…';
const LINE2 = '…into places older than any king.';

const DepthsCanvas: React.FC<{frame: number}> = ({frame}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    renderFrame(ctx, c, frame);
  }, [frame]);
  return <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}} />;
};

/** What the flash leaves on the eye: a green-white burn that contracts and sinks into black. */
const Afterglow: React.FC<{frame: number}> = ({frame}) => {
  const t = progress(frame, C.flash + 2, 357);
  if (frame < C.flash + 2 || t >= 1) return null;
  const a = Math.pow(1 - t, 1.7);
  const r = interpolate(t, [0, 1], [120, 30], clamp);
  // The hot white core cools to jade as it fades, so it never reads as grey.
  const core = [236, 255, 244].map((v, i) => Math.round(v + ([93, 255, 176][i] - v) * Math.min(1, t * 2.2)));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse ${r}% ${r * 1.1}% at 50% 50%, rgba(${core.join(',')},${a}) 0%, rgba(93,255,176,${0.7 * a}) 22%, rgba(31,143,106,${0.45 * a}) 55%, rgba(6,30,22,${0.2 * a}) 80%, rgba(0,0,0,0) 100%)`,
      }}
    />
  );
};

export const DepthsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const ui = 1 - progress(frame, 142, 169, easeIn);
  // The flash: white on the cue, holding two frames, then an afterglow that
  // contracts and sinks into black by the end of the scene.
  const afterFlash = frame > C.flash + 1;
  const white =
    frame < C.flash
      ? 0.22 * progress(frame, C.flash - 10, C.flash - 1, easeIn)
      : frame < C.flash + 2
        ? 1
        : 0;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      {afterFlash ? null : <DepthsCanvas frame={frame} />}
      {ui > 0 ? <DungeonUi frame={frame} opacity={ui} /> : null}
      <div style={{position: 'absolute', left: 0, top: 0, width: 1480, height: 1080}}>
        <Narration text={LINE1} window={C.line1 as [number, number]} bottom={300} size={50} />
      </div>
      <Narration text={LINE2} window={C.line2 as [number, number]} bottom={168} size={50} />
      <Afterglow frame={frame} />
      <Vignette strength={0.72} />
      <Grain opacity={0.07} />
      <FadeLayer opacity={white} color="#e4fff0" />
      <FadeLayer opacity={1 - progress(frame, 0, C.fadeInEnd)} />
      <Letterbox amount={1} />
    </AbsoluteFill>
  );
};
