// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The candle's life as a pure function of frame: the match, the catch, the
// steady gutter, and the gust that kills it. Everything that is lit reads
// its intensity from here so light and flame never disagree.

import {interpolate} from 'remotion';
import {noise2D} from '@remotion/noise';
import {cues} from '../../theme';
import {clamp, easeOut, progress} from '../../lib/fx';

const C = cues.letter;

export const CATCH = C.candleLight + 5; // wick takes the match's flame
export const GUST = C.candleGust;
export const OUT = GUST + 27; // last blue bead dies

export type FlameState = {
  size: number; // 0..1 overall flame scale
  height: number; // multiplier on flame height
  width: number; // multiplier on flame width
  lean: number; // tip offset as a fraction of height (negative = left)
  bend: number; // extra curvature at the tip, same units
  light: number; // 0..~1.1 light emitted onto the room
  match: number; // 0..1 match flare brightness
  ember: number; // 0..1 wick ember after it goes out
};

/** Match flare: a hard spike at the cue that decays as the wick catches. */
const matchFlare = (f: number) => {
  if (f < C.candleLight) return 0;
  const t = f - C.candleLight;
  // Full flare on the cue frame itself.
  const spike = interpolate(t, [0, 2, 6, 16, 28], [1, 0.95, 0.8, 0.35, 0], clamp);
  return spike * (0.85 + 0.15 * noise2D('match', f * 0.9, 0));
};

/** The gust envelope: how hard the wind is pushing at frame f. */
export const gustAmount = (f: number) =>
  interpolate(f, [GUST - 1, GUST + 4, GUST + 14, GUST + 30, GUST + 60], [0, 1, 0.85, 0.5, 0], clamp);

export const flameAt = (f: number): FlameState => {
  const n1 = noise2D('flame', f * 0.16, 0);
  const n2 = noise2D('flame', f * 0.55, 10);
  const n3 = noise2D('flame', f * 1.3, 20);
  const flick = n1 * 0.55 + n2 * 0.3 + n3 * 0.15; // -1..1, mostly slow

  // Catch: the flame grows from a bead into a full tongue.
  const grow = progress(f, CATCH, CATCH + 22, easeOut);
  const catchWobble = 1 + 0.25 * Math.sin((f - CATCH) * 0.9) * (1 - grow) * (f > CATCH ? 1 : 0);

  // Occasional gutter: a slow noise dips the flame for a moment.
  const gutterN = noise2D('gutter', f * 0.035, 3);
  const gutter = gutterN > 0.55 ? (gutterN - 0.55) * 1.2 : 0;

  // Gust: flame is pushed flat, flutters, shrinks, recovers once, and dies.
  const g = gustAmount(f);
  const gustLife = interpolate(
    f,
    [GUST, GUST + 5, GUST + 10, GUST + 13, GUST + 16, GUST + 20, GUST + 24, OUT],
    [1, 0.72, 0.42, 0.55, 0.28, 0.34, 0.12, 0],
    clamp,
  );
  const flutter = noise2D('flutter', f * 1.7, 0) * g;

  const size = grow * catchWobble * gustLife * (1 - gutter * 0.4);
  // The gust stretches the flame into a thin streamer laid nearly flat.
  const height = (1 + 0.13 * flick - gutter * 0.3) * (1 + 0.6 * g);
  const width = (1 - 0.05 * flick) * (1 - 0.45 * g);
  const lean = noise2D('lean', f * 0.05, 5) * 0.1 + n3 * 0.04 - g * 1.25 + flutter * 0.35;
  const bend = n2 * 0.05 - g * 0.55 + flutter * 0.3;

  const match = matchFlare(f);
  // Light tracks the flame loosely until it truly dies; in the gust it
  // stutters with the flutter.
  const struggle = 1 + noise2D('struggle', f * 1.1, 2) * 0.45 * g;
  // The room's light blooms more slowly than the flame itself catches.
  const bloom = 0.2 + 0.8 * progress(f, CATCH - 2, CATCH + 36, easeOut);
  const light = Math.min(1.15, Math.pow(size, 0.6) * bloom * (1 + 0.07 * flick) * struggle + match * 0.18 * (1 - grow));

  const ember =
    f < OUT - 4
      ? 0
      : interpolate(f, [OUT - 4, OUT, OUT + 12, OUT + 40], [0, 1, 0.7, 0], clamp) *
        (0.75 + 0.25 * noise2D('ember', f * 0.6, 0));

  return {size, height, width, lean, bend, light, match, ember};
};

/**
 * Cold window light on the far side of the desk. The eye finds it as the
 * candle blooms, and it is all that is left once the candle dies.
 */
export const moonAt = (f: number) => 0.55 * progress(f, CATCH + 4, CATCH + 70, easeOut) + 0.3 * progress(f, GUST + 10, OUT + 8);
