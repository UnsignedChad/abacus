// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// Merlin's letter: parchment plus the text that writes itself. Each glyph is
// revealed by a left-to-right wipe under a faint nib glow, lands wet and
// near-black, then dries to iron-gall brown.

import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {fonts} from '../../fonts';
import {clamp, easeInOut, progress} from '../../lib/fx';
import {DATELINE, FLOURISH, GLYPHS, GLYPHS_BY_LINE, Glyph, LINES, PAPER} from './layout';
import {TextureCanvas, drawPaper} from './textures';
import {GUST} from './flame';

// Iron-gall ink: near-black while wet; dries to a rich brown where the nib
// was loaded, and to a thin tawny where it was running dry.
const WET = [14, 9, 9];
const WET_THIN = [44, 28, 18];
const DRY = [66, 38, 18];
const DRY_THIN = [122, 84, 50];
const DRY_MS = 55; // frames for ink to dry

const REVEAL = 1.9; // glyph wipe lasts this many times its nib time

const GLYPH_INDEX = new Map(GLYPHS.map((g, i) => [g, i]));

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

const inkColor = (wet: number, load = 1) => {
  const thin = Math.pow(1 - load, 1.3) * 0.85;
  const dry = mix(DRY, DRY_THIN, thin);
  const w = mix(WET, WET_THIN, thin);
  const c = mix(dry, w, wet).map(Math.round);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/** Index of the glyph the nib is on (or last finished) at frame f. */
const currentGlyph = (f: number) => {
  let cur = -1;
  for (let i = 0; i < GLYPHS.length; i++) {
    if (GLYPHS[i].start <= f) cur = i;
    else break;
  }
  return cur;
};

const NibGlow: React.FC<{u: number; size: number; strength: number; frame: number}> = ({u, size, strength, frame}) => {
  // The point bobs as if tracing up- and down-strokes.
  const bob = Math.sin(frame * 2.1) * 0.22 + noise2D('nib', frame * 0.5, 0) * 0.12;
  const x = `${u * 100}%`;
  const y = size * (0.72 - 0.3 * (0.5 + bob));
  const core = size * 0.42;
  const halo = size * 3.4;
  return (
    <>
      <span
        style={{
          position: 'absolute',
          left: x,
          top: y - halo / 2,
          marginLeft: -halo / 2,
          width: halo,
          height: halo,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,214,140,${0.55 * strength}) 0%, rgba(255,170,80,${
            0.22 * strength
          }) 30%, rgba(255,150,60,0) 70%)`,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: x,
          top: y - core / 2,
          marginLeft: -core / 2,
          width: core,
          height: core,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,252,235,${strength}) 0%, rgba(255,214,130,${
            0.75 * strength
          }) 35%, rgba(255,190,90,0) 100%)`,
          boxShadow: `0 0 ${size * 0.5}px ${size * 0.12}px rgba(255,200,110,${0.5 * strength})`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

const GlyphSpan: React.FC<{g: Glyph; frame: number; nib: number | null; nibStrength: number}> = ({
  g,
  frame,
  nib,
  nibStrength,
}) => {
  // Hand-wobble keeps each glyph's advance, so line layout is unchanged.
  const hand: React.CSSProperties = {
    display: 'inline-block',
    transform: `translateY(${g.dy}em) rotate(${g.rot}deg)`,
  };
  if (frame < g.start) {
    return <span style={{...hand, visibility: 'hidden'}}>{g.ch}</span>;
  }
  const rev = Math.min(1, (frame - g.start) / Math.max(0.5, g.dur * REVEAL));
  const wet = 1 - progress(frame, g.start + g.dur, g.start + g.dur + DRY_MS);
  const style: React.CSSProperties = {
    position: 'relative',
    color: inkColor(wet, g.ink),
    // Wet ink pools and shines while it sits on the surface.
    textShadow: wet > 0.02 ? `0 0 ${1 + wet}px rgba(10,5,5,${0.55 * wet})` : undefined,
  };
  if (rev < 1) {
    // Pad the box so italic overhang is not clipped by the mask.
    const p = rev * 130 - 15;
    const mask = `linear-gradient(90deg, #000 ${p}%, transparent ${p + 18}%)`;
    Object.assign(style, {
      WebkitMaskImage: mask,
      maskImage: mask,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      padding: '0 0.18em',
      margin: '0 -0.18em',
    });
  }
  const glyph = <span style={style}>{g.ch}</span>;
  // The glow lives outside the masked span so the wipe does not hide it.
  return (
    <span style={{...hand, position: 'relative'}}>
      {glyph}
      {nib === null ? null : (
        <NibGlow u={nib} size={g.line === LINES.length - 1 ? 60 : 38} strength={nibStrength} frame={frame} />
      )}
    </span>
  );
};

// The underline: four cubic segments, sampled once so the nib glow can ride
// the tip of the stroke at the same arc length the dash reveals.
const FLOURISH_SEGS = [
  [742, 842, 790, 826, 800, 864, 720, 880],
  [720, 880, 640, 896, 520, 894, 452, 878],
  [452, 878, 400, 866, 404, 842, 452, 846],
  [452, 846, 540, 854, 700, 884, 832, 854],
];
const FLOURISH_D = `M 742 842 ${FLOURISH_SEGS.map((c) => `C ${c.slice(2).join(' ')}`).join(' ')}`;

const FLOURISH_PTS = (() => {
  const pts: {x: number; y: number; l: number}[] = [];
  let l = 0;
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of FLOURISH_SEGS) {
    for (let i = pts.length ? 1 : 0; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      const prev = pts[pts.length - 1];
      if (prev) l += Math.hypot(x - prev.x, y - prev.y);
      pts.push({x, y, l});
    }
  }
  return pts.map((q) => ({...q, l: q.l / l}));
})();

const flourishAt = (p: number) => FLOURISH_PTS.find((q) => q.l >= p) ?? FLOURISH_PTS[FLOURISH_PTS.length - 1];

/** A thicker swell of the stroke over [a, b] of its length, revealed up to p. */
const swell = (p: number, a: number, b: number) => `0 ${a} ${Math.max(0, Math.min(p, b) - a)} 2`;

const Flourish: React.FC<{frame: number}> = ({frame}) => {
  const p = progress(frame, FLOURISH.start, FLOURISH.end, easeInOut);
  if (p <= 0) return null;
  const wet = 1 - progress(frame, FLOURISH.end, FLOURISH.end + DRY_MS);
  const tip = flourishAt(p);
  const glow = p < 1 ? 1 : 1 - progress(frame, FLOURISH.end, FLOURISH.end + 6);
  return (
    <>
      <svg
        width={PAPER.w}
        height={PAPER.h}
        style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}
      >
        <path
          d={FLOURISH_D}
          pathLength={1}
          fill="none"
          stroke={inkColor(wet)}
          strokeWidth={4.2}
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1 - p}
        />
        {/* the pen pressed harder through the bottom sweep and the flick */}
        {[
          [0.24, 0.52],
          [0.74, 0.9],
        ].map(([a, b], i) =>
          p <= a ? null : (
            <path
              key={i}
              d={FLOURISH_D}
              pathLength={1}
              fill="none"
              stroke={inkColor(wet)}
              strokeOpacity={0.55}
              strokeWidth={7}
              strokeLinecap="butt"
              strokeDasharray={swell(p, a, b)}
            />
          ),
        )}
      </svg>
      {glow > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: tip.x - 40,
            top: tip.y - 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,250,230,${glow}) 0%, rgba(255,210,130,${0.5 * glow}) 14%, rgba(255,170,80,${
              0.18 * glow
            }) 40%, rgba(255,150,60,0) 70%)`,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </>
  );
};

export const Paper: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = currentGlyph(frame);
  let nibIdx: number | null = null;
  let nibU = 0;
  let nibStrength = 0;
  if (cur >= 0) {
    const g = GLYPHS[cur];
    const into = frame - g.start;
    nibIdx = cur;
    nibU = Math.min(1, into / Math.max(0.001, g.dur));
    // Lift and fade during pauses; gone once the hand is done.
    nibStrength = interpolate(into - g.dur, [0, 5], [1, 0.25], clamp);
    if (cur === GLYPHS.length - 1) nibStrength *= 1 - progress(frame, FLOURISH.start, FLOURISH.end);
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: PAPER.w,
        height: PAPER.h,
      }}
    >
      <TextureCanvas width={PAPER.w} height={PAPER.h} scale={1.5} draw={drawPaper} />
      <div
        style={{
          position: 'absolute',
          right: DATELINE.right,
          top: DATELINE.y,
          fontFamily: fonts.fell,
          fontStyle: 'italic',
          fontSize: DATELINE.size,
          lineHeight: 1.25,
          whiteSpace: 'pre',
          color: 'rgb(92,58,32)',
          opacity: 0.92,
        }}
      >
        {DATELINE.text}
      </div>
      {LINES.map((line, li) => (
        <div
          key={li}
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y,
            fontFamily: fonts.fell,
            fontStyle: 'italic',
            fontSize: line.size,
            lineHeight: 1.25,
            letterSpacing: line.sig ? -1 : 0.2,
            whiteSpace: 'pre',
          }}
        >
          {GLYPHS_BY_LINE[li].map((g) => {
            const gi = GLYPH_INDEX.get(g) ?? -1;
            return (
              <GlyphSpan
                key={g.idx}
                g={g}
                frame={frame}
                nib={gi === nibIdx && nibStrength > 0.01 ? nibU : null}
                nibStrength={nibStrength}
              />
            );
          })}
        </div>
      ))}
      <Flourish frame={frame} />
    </div>
  );
};

/** The sheet on the desk: its shadow, placement, and the gust lifting its edge. */
export const LetterSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const g = GUST_LIFT(frame);
  const flutter =
    (noise2D('lift', frame * 0.45, 0) * 0.25 + noise2D('lift', frame * 1.4, 4) * 0.12) * Math.min(1, g * 2);
  const lift = Math.max(0, g + flutter * g);
  // The candle is up and to the left: shadow falls down-right.
  const dx = 7 + lift * 40;
  const dy = 5 + lift * 16;
  return (
    <div
      style={{
        position: 'absolute',
        left: PAPER.cx - PAPER.w / 2,
        top: PAPER.cy - PAPER.h / 2,
        width: PAPER.w,
        height: PAPER.h,
        transform: `rotate(${PAPER.rot}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          width: PAPER.w - 16,
          height: PAPER.h - 16,
          boxShadow: `${dx}px ${dy}px ${14 + lift * 30}px ${2 + lift * 6}px rgba(0,0,0,${0.62 - lift * 0.1})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0% 45%',
          transform:
            lift > 0.001 ? `perspective(2000px) rotateY(${-lift * 9}deg) rotateX(${lift * 1.5}deg)` : undefined,
        }}
      >
        <Paper />
        {lift > 0.001 ? (
          // The lifted edge turns away from the light.
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, rgba(0,0,0,0) 50%, rgba(20,8,0,${0.45 * lift}) 100%)`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

const GUST_LIFT = (f: number) =>
  interpolate(f, [GUST + 2, GUST + 8, GUST + 18, GUST + 34, GUST + 70], [0, 1, 0.75, 0.3, 0], clamp);
