// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The camera: an establishing frame on candle and letter, a slow push that
// follows the invisible quill down the page, a settle on the whole letter,
// and a slow drift through the gust.

import {interpolate} from 'remotion';
import {noise2D} from '@remotion/noise';
import {cues} from '../../theme';
import {clamp, easeInOut, progress} from '../../lib/fx';
import {LINES, nibPaper, paperToWorld} from './layout';

const C = cues.letter;

export type Cam = {cx: number; cy: number; s: number; rot: number};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpLog = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

// Centre of the text column, in paper coordinates.
const TEXT_CX = 470;

const follow = (f: number) => {
  // Smooth the stepwise line changes by averaging a window of nib positions,
  // weighted ahead so the camera anticipates the next line.
  let sy = 0;
  let sx = 0;
  let n = 0;
  for (let k = -36; k <= 30; k += 6) {
    const p = nibPaper(Math.max(C.writingStart, f + k));
    sx += p.x;
    sy += p.y;
    n++;
  }
  const col = paperToWorld(TEXT_CX, sy / n);
  const nib = paperToWorld(sx / n, sy / n);
  return {
    cx: col.x * 0.84 + nib.x * 0.16 - 70,
    cy: col.y + 6,
    s: interpolate(f, [C.writingStart, 170, C.writingEnd], [1.2, 1.3, 1.42], clamp),
  };
};

const SIG_LINE = LINES[LINES.length - 1];

export const cameraAt = (f: number): Cam => {
  // Establishing: candle left, letter right, slow push.
  const e = progress(f, C.candleLight, C.writingStart + 20);
  const est = {cx: lerp(1230, 1300, e), cy: lerp(790, 830, e), s: lerp(0.76, 0.82, e)};

  const fo = follow(Math.min(f, C.writingEnd));
  // After the body is written, keep following toward the signature a moment.
  const sig = paperToWorld(SIG_LINE.x + 150, SIG_LINE.y + 60);
  const toSig = progress(f, C.writingEnd - 24, C.writingEnd + 14, easeInOut);
  const fx = lerp(fo.cx, sig.x - 140, toSig);
  const fy = lerp(fo.cy, sig.y + 10, toSig);

  const hold = {cx: 1470, cy: 1005, s: 0.68};

  const w1 = progress(f, C.writingStart - 5, 185, easeInOut);
  // Stay on the signature while it is signed, then settle on the whole letter.
  const w2 = progress(f, C.signatureDone - 18, C.candleGust - 4, easeInOut);

  let cx = lerp(lerp(est.cx, fx, w1), hold.cx, w2);
  let cy = lerp(lerp(est.cy, fy, w1), hold.cy, w2);
  let s = lerpLog(lerpLog(est.s, fo.s, w1), hold.s, w2);

  // Through the gust, drift in toward the dying candle so the last image
  // is the smoke curling off the wick.
  const d = progress(f, C.candleGust - 6, 600, easeInOut);
  cx = lerp(cx, 1060, d);
  cy = lerp(cy, 640, d);
  s *= 1 + 0.3 * d;

  // Breath: a very slight handheld float.
  cx += noise2D('cam', f * 0.012, 0) * 7;
  cy += noise2D('cam', f * 0.012, 5) * 5;
  const rot = lerp(lerp(0.5, 1.7, w1), 0.8, w2) + noise2D('cam', f * 0.01, 9) * 0.12;
  return {cx, cy, s, rot};
};
