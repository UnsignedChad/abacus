// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Timing and layout for the title card. Everything is derived from the cue
// sheet so the picture stays locked to the score.

import {Easing} from 'remotion';
import {cues} from '../../theme';
import {progress} from '../../lib/fx';

export const C = cues.title;

// Wordmark geometry (measured: Cinzel Decorative 700 @ 180px, 0.04em tracking).
export const FONT_SIZE = 180;
export const WORD_W = 1154;
export const WORD_H = 180;
/** Ink extent inside the text box (the N swash overhangs the right edge). */
export const INK_L = 3;
export const INK_R = 1190;
/** Cap band inside the text box, as px from the box top. */
export const CAP_TOP = 18;
export const CAP_BOT = 146;
/** Text box top-left in frame space; the ink is centred on x=960. */
export const WORD_X = Math.round(960 - (INK_L + INK_R) / 2);
export const WORD_Y = 388;
export const CAP_MID_Y = WORD_Y + (CAP_TOP + CAP_BOT) / 2;

// The burn: an ember edge sweeps the word left to right.
export const BURN_START = C.titleBoom;
export const BURN_LEN = 34;
export const BURN_END = BURN_START + BURN_LEN;
const EDGE_FROM = INK_L + 70; // part of the C is already alight on the boom frame
const EDGE_TO = INK_R + 60;
/** Cooling time constant (frames) for metal behind the edge. */
export const COOL_TAU = 12;
/** Width of the soft, white-hot lip ahead of the solid reveal. */
export const EDGE_LIP = 30;

const burnEase = (u: number) => 1 - (1 - u) * (1 - u);

/** Edge x (text-box px) at a frame; -inf before the boom. */
export const burnEdge = (f: number) => {
  if (f < BURN_START) return -1e4;
  const u = progress(f, BURN_START, BURN_END);
  return EDGE_FROM + (EDGE_TO - EDGE_FROM) * burnEase(u);
};

/** The (fractional) frame at which the edge crosses text-box x. */
export const passFrame = (x: number) => {
  if (x <= EDGE_FROM) return BURN_START;
  const p = Math.min(1, (x - EDGE_FROM) / (EDGE_TO - EDGE_FROM));
  return BURN_START + BURN_LEN * (1 - Math.sqrt(1 - p));
};

/** Heat 0..1 of the metal at text-box x, 0 before the edge has passed. */
export const heatAt = (x: number, f: number) => {
  if (f < BURN_START) return 0;
  const edge = burnEdge(f);
  // The leading lip of the edge is white-hot, ahead of the solid reveal.
  if (x > edge) return x < edge + EDGE_LIP ? 1 : 0;
  return Math.exp(-(f - passFrame(x)) / COOL_TAU);
};

/** Push-in for the whole card: a slow, steady breath towards the title. */
export const camScale = (f: number) =>
  1 + 0.055 * progress(f, C.titleBoom, 390, Easing.bezier(0.3, 0, 0.6, 1));

/**
 * Brightness of the world. The name slams in against the dark; only a brief
 * kick of light reaches the land before the red glow slowly rises and
 * reveals the church behind it.
 */
export const worldLight = (f: number) => {
  if (f < C.titleBoom) return 0;
  const t = f - C.titleBoom;
  const flash = Math.exp(-t / 3) * 0.22;
  const wake = progress(f, C.titleBoom + 6, C.titleBoom + 96, Easing.inOut(Easing.quad));
  return Math.min(1.6, 0.07 + 0.93 * wake + flash);
};

/** The bell: a soft swell of light peaking a few frames after finalBell. */
export const bellSwell = (f: number) => {
  const t = f - C.finalBell;
  if (t < 0) return 0;
  return Math.min(1, t / 4) * Math.exp(-Math.max(0, t - 4) / 26);
};

export const fadeOut = (f: number) =>
  progress(f, C.fadeOutStart, C.fadeOutEnd, Easing.inOut(Easing.quad));
