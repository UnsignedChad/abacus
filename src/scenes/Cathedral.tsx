// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// THE CATHEDRAL. A knight parries the Skeleton King in a ruined church.
//
// Layers, back to front: the church (canvas, softly focused), both fighters (one
// z-sorted SVG), volumetric beams with the near props and foreground piers
// (canvas), light and grade overlays, sparks, dust and the phase-two fire
// (canvas), the boss bar, then vignette, grain and letterbox. Canvas layers
// are few on purpose: each one costs a full composite per frame.

import React, {useId} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FadeLayer, Grain, Letterbox, Vignette, progress, useShake} from '../lib/fx';
import {palette} from '../theme';
import {proj, sOf} from './cathedral/camera';
import {PaintLayer, softPass} from './cathedral/Canvas';
import {duelAt, kingAt, toWorld} from './cathedral/choreo';
import {CloseUp} from './cathedral/closeup';
import {crownAtRest, crownInFlight} from './cathedral/crownPath';
import {candleAt, figureLightAt, flashAt, mainCamAt, redAt, SHAKES, slowGradeAt, waveAt} from './cathedral/direct';
import {EnvState, paintBack, paintFront} from './cathedral/env';
import {Figures, outerOf} from './cathedral/Figures';
import {FireState, paintSkullFire} from './cathedral/fire';
import {paintFx, swordTrail} from './cathedral/fx';
import {BossBar} from './cathedral/hud';
import {EYE_NEAR} from './cathedral/king';
import {ap, mul, ramp} from './cathedral/rig';
import {A, C, SHOTS, T, speedAt} from './cathedral/time';

export const CathedralScene: React.FC = () => {
  const frame = useCurrentFrame();
  const idPrefix = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const shake = useShake(SHAKES, 'cathedral');
  if (frame >= C.cutToBlack) return <AbsoluteFill style={{background: '#000'}} />;

  const t = A(frame);
  const closeUp = frame >= SHOTS.closeUpStart && frame < SHOTS.closeUpEnd;
  const fade = 1 - progress(frame, 0, C.fadeInEnd);
  const [flash, flashColor] = flashAt(frame);
  const slow = slowGradeAt(frame);

  let world: React.ReactNode;
  let fx: React.ReactNode = null;
  if (closeUp) {
    world = <CloseUp frame={frame} t={t} idPrefix={idPrefix} />;
  } else {
    const cam = mainCamAt(frame);
    const duel = duelAt(t);
    const S: EnvState = {
      f: frame,
      t,
      cam,
      moon: (frame >= C.phase2 ? 0.75 : 1) * (0.92 + 0.08 * Math.sin(t * 0.021)),
      red: redAt(frame),
      candle: candleAt(t),
      shadows: [
        {x: duel.knight.x, d: duel.knight.d, w: 95, a: 1},
        {x: duel.king.x, d: duel.king.d, w: 130, a: 1},
      ],
      wave: waveAt(t, duel.king),
    };
    const light = figureLightAt(frame, t);
    const riposte = t > T.riposte - 8 && t < T.riposte + 20;
    const crown = t < T.crownFall ? null : frame < C.phase2 ? crownInFlight(t, cam) : crownAtRest(cam, t);
    const eyeW = toWorld(duel.king, ap(duel.king.W.head, EYE_NEAR[0], EYE_NEAR[1]));
    const eye = proj(cam, eyeW[0], eyeW[1], duel.king.d);
    // Phase two: the skull burns. Flames trail the head's motion through the world.
    let fire: FireState | null = null;
    if (light.engulf > 0.01) {
      const G = duel.king;
      const skull = (g: typeof G) => {
        const w = toWorld(g, ap(g.W.head, 6, -38));
        return proj(cam, w[0], w[1], g.d);
      };
      const now = skull(G);
      const prev = skull(kingAt(t - 1));
      fire = {
        t,
        head: mul(outerOf(cam, G), G.W.head),
        s: sOf(cam, G.d),
        amount: light.engulf,
        lag: [now[0] - prev[0], now[1] - prev[1]],
        flood: ramp(frame, C.phase2, C.phase2 + 24),
        floodBeat: 0.85 + 0.15 * Math.sin((frame - C.phase2) * 0.4),
      };
    }
    const flame = fire;
    const fxState = {
      f: frame,
      t,
      cam,
      shutter: speedAt(frame),
      embers: frame >= C.phase2 ? ramp(frame, C.phase2, C.phase2 + 20) : 0,
    };
    const red = <RedLight frame={frame} eye={[eye[0], eye[1]]} scale={sOf(cam, duel.king.d)} />;
    // In phase two the burning skull and its embers are painted into the front
    // layer, above the blood-dark grade: one canvas fewer on the heaviest shot.
    const front = (
      <PaintLayer
        paint={(ctx) => {
          paintFront(ctx, S);
          if (flame) {
            softPass(ctx, 'fire', 0.5, 'lighter', (b) => paintSkullFire(b, flame));
            paintFx(ctx, fxState);
          }
        }}
      />
    );
    world = (
      <>
        <PaintLayer paint={(ctx) => paintBack(ctx, S)} res={0.75} />
        <Figures
          duel={duel}
          cam={cam}
          t={t}
          light={light}
          idPrefix={idPrefix}
          crown={crown}
          riposte={riposte}
          trail={swordTrail(t, cam, speedAt(frame))}
        />
        {flame ? red : front}
        {flame ? front : red}
      </>
    );
    // Sparks ride above the slow-motion grade so they stay hot against it.
    fx = flame ? null : <PaintLayer paint={(ctx) => paintFx(ctx, fxState)} />;
  }

  // Phase two tilts up at the king: a touch of keystone (verticals converging
  // toward the vaults) sells the low angle.
  const tilt = frame >= C.phase2 ? 5 * ramp(frame, C.phase2 + 10, C.cutToBlack) : 0;
  const lens = tilt > 0 ? `perspective(1500px) rotateX(${tilt.toFixed(3)}deg) scale(${(1 + tilt * 0.012).toFixed(4)}) ` : '';
  // One wrapper when tilted, so the keystone costs a single 3D layer.
  const camera = tilt > 0 ? (
    <AbsoluteFill style={{transform: lens + shake, transformOrigin: '50% 90%'}}>
      {world}
      {fx}
    </AbsoluteFill>
  ) : (
    <>
      <AbsoluteFill style={{transform: shake}}>{world}</AbsoluteFill>
      {slow > 0 ? (
        <>
          <AbsoluteFill style={{background: '#7a7a80', mixBlendMode: 'saturation', opacity: 0.55 * slow}} />
          <AbsoluteFill style={{background: '#1e2846', mixBlendMode: 'soft-light', opacity: 0.35 * slow}} />
        </>
      ) : null}
      <AbsoluteFill style={{transform: shake}}>{fx}</AbsoluteFill>
    </>
  );
  return (
    <AbsoluteFill style={{background: palette.black, overflow: 'hidden'}}>
      {camera}
      {flash > 0 ? <AbsoluteFill style={{background: flashColor, opacity: flash, mixBlendMode: 'screen'}} /> : null}
      <BossBar frame={frame} />
      <FadeLayer opacity={fade} />
      <Vignette strength={0.78 + 0.15 * slow} />
      <Grain opacity={0.08} />
      <Letterbox amount={1} />
    </AbsoluteFill>
  );
};

/** The red pulse racing out from the eyes, and the flood of phase two. */
const RedLight: React.FC<{frame: number; eye: [number, number]; scale: number}> = ({frame: f, eye, scale}) => {
  const layers: React.ReactNode[] = [];
  const age = f - C.eyesIgnite;
  if (age >= 0 && age < 34) {
    const r = (40 + age * 80) * scale;
    const a = 0.34 * (1 - age / 34);
    layers.push(
      <AbsoluteFill
        key="ring"
        style={{
          mixBlendMode: 'screen',
          background: `radial-gradient(circle at ${eye[0]}px ${eye[1]}px, rgba(255,40,20,0) ${Math.max(0, r - 260)}px, rgba(255,50,20,${a * 0.6}) ${Math.max(0, r - 90)}px, rgba(255,70,30,${a}) ${r}px, rgba(255,40,20,0) ${r + 180}px)`,
        }}
      />,
      <AbsoluteFill
        key="bloom"
        style={{
          mixBlendMode: 'screen',
          background: `radial-gradient(circle at ${eye[0]}px ${eye[1]}px, rgba(255,110,50,${0.42 * Math.exp(-age / 3.5)}) 0px, rgba(200,20,10,${0.14 * Math.exp(-age / 7)}) ${110 * scale}px, rgba(0,0,0,0) ${380 * scale}px)`,
        }}
      />,
    );
  }
  if (age >= 0 && age < 9) {
    // The ignition itself: a hot anamorphic flare across the sockets.
    const k = Math.max(0, 1 - age / 9);
    layers.push(
      <AbsoluteFill
        key="flare"
        style={{
          mixBlendMode: 'screen',
          background: `radial-gradient(ellipse ${520 * scale * k}px ${16 * scale}px at ${eye[0]}px ${eye[1]}px, rgba(255,170,110,${0.8 * k}) 0%, rgba(255,60,20,${0.35 * k}) 45%, rgba(255,40,20,0) 100%)`,
        }}
      />,
    );
  }
  if (f >= C.phase2) {
    const flood = ramp(f, C.phase2, C.phase2 + 24);
    // Blood-dark everywhere; the burning skull's own light is screened back
    // in with the fire layer.
    layers.push(
      <AbsoluteFill key="tint" style={{background: 'rgb(172,66,58)', mixBlendMode: 'multiply', opacity: 0.78 * flood}} />,
    );
  }
  return <>{layers}</>;
};
