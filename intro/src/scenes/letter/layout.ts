// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Desk layout in world units, the letter's text, and the schedule the
// invisible quill follows. Everything is derived once at module load.

import {random} from 'remotion';
import {noise2D} from '@remotion/noise';
import {cues} from '../../theme';

const C = cues.letter;

export const WORLD = {w: 3000, h: 2000};

// Base of the candle's dish on the desk. The flame sits above it on screen.
export const CANDLE = {x: 840, y: 860};
export const FLAME_Y = -262;

export const PAPER = {cx: 1600, cy: 1010, w: 900, h: 1030, rot: -2};
export const INKWELL = {x: 2250, y: 780};
export const SEAL = {x: 1020, y: 1250};

export const BODY_SIZE = 37;
export const SIG_SIZE = 96;

export type Line = {text: string; x: number; y: number; size: number; sig?: boolean};

// Paper-local coordinates (top-left of the sheet is 0,0); y is the line box top.
export const DATELINE = {text: 'Clogheen, on the Eve of Samhain', right: 96, y: 78, size: 31};

export const LINES: Line[] = [
  {text: 'My dear friend,', x: 104, y: 180, size: BODY_SIZE},
  {text: 'Something festers beneath Clogheen. The wells have', x: 150, y: 266, size: BODY_SIZE},
  {text: 'soured, the dead will not keep to their graves, and', x: 104, y: 328, size: BODY_SIZE},
  {text: 'the old church bell tolls at midnight with no hand', x: 104, y: 390, size: BODY_SIZE},
  {text: 'upon the rope.', x: 104, y: 452, size: BODY_SIZE},
  {text: 'I have gone ahead to learn what I can. Come as', x: 150, y: 544, size: BODY_SIZE},
  {text: 'swiftly as you are able, and come armed.', x: 104, y: 606, size: BODY_SIZE},
  {text: 'Yours, in haste and in hope,', x: 380, y: 700, size: BODY_SIZE},
  {text: 'Merlin', x: 470, y: 756, size: SIG_SIZE, sig: true},
];

// Pause (in weight units) after a line; larger at paragraph ends.
const LINE_PAUSE = [12, 6, 6, 6, 13, 6, 13, 10, 0];

export type Glyph = {
  ch: string;
  line: number;
  idx: number;
  start: number; // frame the nib starts this glyph
  dur: number; // frames the nib spends on it
  ink: number; // 0..1 how loaded the nib was: 1 just after a dip
  dy: number; // hand-wobble: baseline offset in em
  rot: number; // hand-wobble: slant variation in degrees
};

// The quill is re-dipped at the first word break after it runs this dry.
const DIP_EVERY = 26;

const weightOf = (ch: string) => (ch === ' ' ? 0.45 : 1);
const pauseOf = (ch: string) => (ch === ',' ? 2.4 : ch === '.' ? 5 : 0);

const BODY_START = C.writingStart;
const BODY_END = C.writingEnd - 3;
const SIG_START = C.writingEnd + 1;
const SIG_END = C.signatureDone - 12;

// The underline flourish flows straight out of the final stroke of the name.
export const FLOURISH = {start: SIG_END, end: C.signatureDone};

// A slow wander plus a little per-glyph jitter, so it reads as a hand.
const hand = (i: number) => ({
  ink: 1,
  dy: noise2D('base', i * 0.09, 0) * 0.05 + (random('dy' + i) - 0.5) * 0.045,
  rot: noise2D('slant', i * 0.07, 3) * 3 + (random('dr' + i) - 0.5) * 3.4,
});

/** Ink load per glyph: dark after each dip, thinning until the next. */
const inkLoad = (glyphs: Glyph[]) => {
  let since = 0;
  for (const g of glyphs) {
    if (g.line === LINES.length - 1) continue;
    if (since > DIP_EVERY && (g.idx === 0 || g.ch === ' ')) since = 0;
    g.ink = Math.max(0, 1 - since / (DIP_EVERY * 1.25));
    if (g.ch !== ' ') since++;
  }
  return glyphs;
};

const schedule = (): Glyph[] => {
  const out: Glyph[] = [];
  const bodyLines = LINES.filter((l) => !l.sig);
  // Total weight of the body so it lands exactly on the cue window.
  let total = 0;
  bodyLines.forEach((l, li) => {
    for (const ch of l.text) total += weightOf(ch) + pauseOf(ch);
    if (li < bodyLines.length - 1) total += LINE_PAUSE[li];
  });
  // Trailing punctuation pause of the final line is not waited for.
  total -= pauseOf(bodyLines[bodyLines.length - 1].text.slice(-1));
  const k = (BODY_END - BODY_START) / total;
  let t = BODY_START;
  bodyLines.forEach((l, li) => {
    [...l.text].forEach((ch, idx) => {
      const w = weightOf(ch);
      out.push({ch, line: li, idx, start: t, dur: w * k, ...hand(out.length)});
      t += (w + pauseOf(ch)) * k;
    });
    t += LINE_PAUSE[li] * k;
  });
  // Signature: slower capital, then an even hand.
  const sigLine = LINES.length - 1;
  const sig = LINES[sigLine].text;
  const sigW = [2.2, 1, 1, 1, 0.8, 1.2];
  const sigTotal = sigW.reduce((a, b) => a + b, 0);
  let s = SIG_START;
  [...sig].forEach((ch, idx) => {
    const d = (sigW[idx] / sigTotal) * (SIG_END - SIG_START);
    // Signed with a fresh dip.
    out.push({ch, line: sigLine, idx, start: s, dur: d, ...hand(out.length), ink: 1 - idx * 0.05});
    s += d;
  });
  return out;
};

export const GLYPHS = inkLoad(schedule());

/** Glyphs grouped per line, in order. */
export const GLYPHS_BY_LINE: Glyph[][] = LINES.map((_, li) => GLYPHS.filter((g) => g.line === li));

/** Approximate paper-local position of the nib (for the camera to follow). */
export const nibPaper = (frame: number) => {
  let g = GLYPHS[0];
  for (const cand of GLYPHS) {
    if (cand.start <= frame) g = cand;
    else break;
  }
  const line = LINES[g.line];
  const u = Math.min(1, Math.max(0, (frame - g.start) / Math.max(g.dur, 0.001)));
  const adv = line.size * (line.sig ? 0.5 : 0.405);
  return {x: line.x + (g.idx + u) * adv, y: line.y + line.size * 0.7};
};

/** Paper-local point to world coordinates. */
export const paperToWorld = (px: number, py: number) => {
  const a = (PAPER.rot * Math.PI) / 180;
  const dx = px - PAPER.w / 2;
  const dy = py - PAPER.h / 2;
  return {
    x: PAPER.cx + dx * Math.cos(a) - dy * Math.sin(a),
    y: PAPER.cy + dx * Math.sin(a) + dy * Math.cos(a),
  };
};
