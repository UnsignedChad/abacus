// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The CLOGHEEN wordmark: tarnished gold with a faked bevel, revealed by a
// ragged burning edge that leaves the metal glowing hot as it cools. Sparks
// fly off the edge, embers keep shedding from the letters, and the bell
// sends one sweep of light across the face.

import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {fonts} from '../../fonts';
import {progress, rand} from '../../lib/fx';
import {
  BURN_END,
  BURN_START,
  C,
  CAP_BOT,
  CAP_TOP,
  EDGE_LIP,
  FONT_SIZE,
  INK_L,
  INK_R,
  WORD_H,
  WORD_W,
  WORD_X,
  WORD_Y,
  bellSwell,
  burnEdge,
  camScale,
  heatAt,
  passFrame,
} from './beats';

/** Padding around the text box so glows and swashes are never clipped. */
const SP = 80;
const BOX_W = WORD_W + SP * 2;
const BOX_H = WORD_H + SP * 2;
const TEXT = 'CLOGHEEN';

const textStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: BOX_W,
  height: BOX_H,
  padding: SP,
  boxSizing: 'border-box',
  fontFamily: fonts.cinzelDecorative,
  fontWeight: 700,
  fontSize: FONT_SIZE,
  lineHeight: 1,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};
const Word: React.FC<{style: React.CSSProperties}> = ({style}) => <div style={{...textStyle, ...style}}>{TEXT}</div>;

const y = (v: number) => `${v + SP}px`;

/** Tarnished gold: a metallic horizon gradient plus brushing and dark mottling. */
const METAL = (() => {
  const base = `linear-gradient(180deg, #5a3e18 ${y(-10)}, #7a5824 ${y(CAP_TOP - 6)}, #eed79a ${y(CAP_TOP)}, #d6b36a ${y(
    CAP_TOP + 14,
  )}, #9c7234 ${y(58)}, #6e4a1c ${y(78)}, #3e2810 ${y(82)}, #7e5a28 ${y(88)}, #a88040 ${y(108)}, #d0ae68 ${y(
    CAP_BOT - 10,
  )}, #e2c47c ${y(CAP_BOT - 4)}, #8a6428 ${y(CAP_BOT + 2)}, #4a3212 ${y(WORD_H + 10)})`;
  const brushed = 'repeating-linear-gradient(72deg, rgba(255,240,200,0.05) 0px, rgba(255,240,200,0.05) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 4px, rgba(20,10,0,0.08) 4px, rgba(20,10,0,0) 7px)';
  const tarnish: string[] = [];
  for (let i = 0; i < 24; i++) {
    const s = `tarnish-${i}`;
    const x = SP + rand(s + 'x', INK_L, INK_R);
    const yy = SP + rand(s + 'y', CAP_TOP, CAP_BOT);
    const r = rand(s + 'r', 20, 60);
    tarnish.push(`radial-gradient(circle ${r}px at ${x}px ${yy}px, rgba(36,20,6,${rand(s + 'a', 0.3, 0.6)}), rgba(40,22,6,0))`);
  }
  return [...tarnish, brushed, base].join(',');
})();

/** Heat ramp: 1 white-hot, fading through gold and ember to nothing. */
const heatColor = (h: number) => {
  const stops: [number, number[]][] = [
    [0, [140, 20, 8, 0]],
    [0.12, [194, 50, 12, 0.55]],
    [0.35, [255, 110, 40, 0.6]],
    [0.65, [255, 190, 110, 0.74]],
    [0.9, [255, 244, 214, 1]],
    [1, [255, 255, 245, 1]],
  ];
  let i = 0;
  while (i < stops.length - 2 && h > stops[i + 1][0]) i++;
  const [h0, c0] = stops[i];
  const [h1, c1] = stops[i + 1];
  const t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
  const c = c0.map((v, k) => v + (c1[k] - v) * t);
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
};

/** Sampled horizontal heat profile as gradient stops (text-box x). */
const heatStops = (f: number, map: (h: number) => string) => {
  const out: string[] = [];
  for (let x = INK_L - 20; x <= INK_R + 40; x += 14) out.push(`${map(heatAt(x, f))} ${x + SP}px`);
  return `linear-gradient(90deg, ${out.join(',')})`;
};

/** Ragged burning edge as an SVG alpha mask (data URI), box coordinates. */
const revealMask = (f: number) => {
  const edge = burnEdge(f);
  if (edge > INK_R + 60 + EDGE_LIP * 2) return undefined;
  // Three nested ragged fronts: solid, then a translucent lip of burning metal.
  const fronts: [number, number][] = [[EDGE_LIP, 0.25], [EDGE_LIP / 2, 0.55], [0, 1]];
  const polys = fronts.map(([off, a]) => {
    const pts: string[] = [];
    for (let yy = 0; yy <= BOX_H; yy += 10) {
      const n = noise2D('burn', yy * 0.018, f * 0.35) * 16 + noise2D('burn2' + off, yy * 0.07, f * 0.7) * 6;
      const lean = (yy - BOX_H / 2) * -0.12;
      pts.push(`${(SP + edge + n + lean + off).toFixed(1)},${yy}`);
    }
    return `<polygon points='0,0 ${pts.join(' ')} 0,${BOX_H}' fill='black' fill-opacity='${a}'/>`;
  });
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${BOX_W}' height='${BOX_H}'>${polys.join('')}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

// The bell's light sweep, in text-box x; it enters the ink on the bell frame.
const SHIMMER_LEN = 36;
const shimmerX = (p: number) => INK_L - 150 + p * (INK_R - INK_L + 300);
/** Where the sweep catches a hard edge: the crest of the H's swash. */
const GLINT = {x: 712, y: -2};

/** A four-point star that flares as the sweep crosses the glint point. */
const Glint: React.FC<{f: number}> = ({f}) => {
  // Frame at which the sweep reaches the glint, found from the eased path.
  let hit = C.finalBell;
  for (let k = 0; k <= SHIMMER_LEN; k++) {
    const p = Easing.inOut(Easing.sin)(k / SHIMMER_LEN);
    if (shimmerX(p) >= GLINT.x) {
      hit = C.finalBell + k;
      break;
    }
  }
  const t = f - hit;
  if (t < -6 || t > 16) return null;
  const a = t < 0 ? (t + 6) / 6 : Math.exp(-t / 6);
  const size = 60 + 70 * a;
  const ray = (rot: number, len: number) => (
    <div
      style={{
        position: 'absolute',
        left: -len / 2,
        top: -1.5,
        width: len,
        height: 3,
        borderRadius: 3,
        transform: `rotate(${rot}deg)`,
        background: 'radial-gradient(closest-side, rgba(255,250,235,1), rgba(255,220,150,0.5) 40%, rgba(255,200,120,0))',
      }}
    />
  );
  return (
    <div style={{position: 'absolute', left: SP + GLINT.x, top: SP + GLINT.y, opacity: a, transform: `rotate(${t * 1.2}deg)`}}>
      <div
        style={{
          position: 'absolute',
          left: -22,
          top: -22,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,245,220,0.9), rgba(255,190,110,0.3) 45%, rgba(255,160,80,0))',
        }}
      />
      {ray(0, size * 2.2)}
      {ray(90, size * 1.3)}
      {ray(45, size * 0.5)}
      {ray(-45, size * 0.5)}
    </div>
  );
};

/** Sparks thrown from the burning edge: short streaks under gravity. */
const Sparks: React.FC<{f: number}> = ({f}) => {
  const out = [];
  for (let i = 0; i < 72; i++) {
    const s = `spark-${i}`;
    const birth = BURN_START + rand(s + 'b', 0, BURN_END - BURN_START + 4);
    const life = rand(s + 'l', 12, 34);
    const t = f - birth;
    if (t < 0 || t > life) continue;
    const x0 = burnEdge(Math.min(birth, BURN_END)) + rand(s + 'j', -8, 8);
    const y0 = rand(s + 'y', CAP_TOP - 10, CAP_BOT + 20);
    const vx = rand(s + 'vx', -2, 9);
    const vy = rand(s + 'vy', -11, -1.5);
    const g = 0.45;
    const x = x0 + vx * t;
    const yy = y0 + vy * t + 0.5 * g * t * t;
    const cvx = vx;
    const cvy = vy + g * t;
    const sp = Math.hypot(cvx, cvy);
    const len = Math.min(34, sp * 2.6 + 3);
    const ang = Math.atan2(cvy, cvx);
    const a = 1 - t / life;
    out.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: SP + x - len,
          top: SP + yy - 1,
          width: len,
          height: 2,
          transformOrigin: '100% 50%',
          transform: `rotate(${ang}rad)`,
          borderRadius: 2,
          opacity: a,
          background: 'linear-gradient(90deg, rgba(255,120,40,0), #ffd79a 70%, #fff6e0)',
          boxShadow: '0 0 6px 1px rgba(255,120,40,0.8)',
        }}
      />,
    );
  }
  return <>{out}</>;
};

/** Embers peeling off the cooling letters and drifting up. */
const Shedding: React.FC<{f: number}> = ({f}) => {
  const out = [];
  for (let i = 0; i < 50; i++) {
    const s = `shed-${i}`;
    const period = rand(s + 'p', 60, 150);
    const k = Math.floor((f + rand(s + 'o', 0, period)) / period);
    const t = ((f + rand(s + 'o', 0, period)) % period) / period;
    const birth = f - t * period;
    const ss = `${s}-${k}`;
    const x0 = rand(ss + 'x', INK_L + 10, INK_R - 30);
    if (birth < passFrame(x0) + 2) continue;
    const boost = 0.35 + 1.1 * Math.exp(-Math.max(0, birth - BURN_END) / 40);
    const y0 = rand(ss + 'y', CAP_TOP + 10, CAP_BOT);
    const rise = rand(ss + 'r', 90, 260);
    const x = x0 + noise2D(ss, f * 0.02, 0) * 30 + t * rand(ss + 'w', -10, 50);
    const yy = y0 - t * rise;
    const r = rand(ss + 's', 1, 2.6) * (1 - t * 0.5);
    const a = Math.min(1, Math.sin(Math.PI * Math.min(1, t * 1.3)) * boost) * (0.7 + 0.3 * Math.sin(f * 0.5 + i));
    if (a <= 0.01) continue;
    out.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: SP + x - r,
          top: SP + yy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          background: '#ffb060',
          opacity: a,
          boxShadow: `0 0 ${r * 4}px ${r * 1.5}px rgba(220,70,16,0.85)`,
        }}
      />,
    );
  }
  return <>{out}</>;
};

export const Wordmark: React.FC = () => {
  const f = useCurrentFrame();
  if (f < BURN_START) return null;

  const mask = revealMask(f);
  const maskStyle: React.CSSProperties = mask
    ? {maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%'}
    : {};

  // Overall heat of the word (drives the ember halo).
  const avgHeat = Math.max(0, Math.exp(-(f - BURN_END) / 24) * Math.min(1, (f - BURN_START + 1) / 6));
  const bell = bellSwell(f);
  const heatMask = heatStops(f, (h) => `rgba(0,0,0,${Math.min(1, h * 1.3).toFixed(3)})`);
  const glowA = 0.24 + 0.3 * avgHeat + 0.2 * bell + 0.04 * noise2D('wglow', f * 0.04, 0);

  // The slam: arrives slightly large and settles hard, then rides the push-in.
  const slam = 1 + 0.09 * Math.exp(-(f - BURN_START) / 3.2);
  const scale = slam * (1 + (camScale(f) - 1) * 0.55);

  // Bell shimmer: a diagonal band of light crossing the face.
  const sh = progress(f, C.finalBell, C.finalBell + SHIMMER_LEN, Easing.inOut(Easing.sin));
  const shimmerOn = f >= C.finalBell && sh < 1;
  const sx = SP + shimmerX(sh);
  const shimmer = `linear-gradient(105deg, rgba(255,246,220,0) ${sx - 150}px, rgba(255,246,220,0.35) ${sx - 40}px, rgba(255,252,240,0.95) ${sx}px, rgba(255,246,220,0.35) ${
    sx + 40
  }px, rgba(255,246,220,0) ${sx + 150}px)`;

  const clipText: React.CSSProperties = {color: 'transparent', WebkitBackgroundClip: 'text', backgroundClip: 'text'};

  return (
    <div
      style={{
        position: 'absolute',
        left: WORD_X - SP,
        top: WORD_Y - SP,
        width: BOX_W,
        height: BOX_H,
        transform: `scale(${scale})`,
        transformOrigin: `${SP + (INK_L + INK_R) / 2}px ${SP + (CAP_TOP + CAP_BOT) / 2}px`,
      }}
    >
      {/* The word slams in as cold, charred iron; the burn turns it to gold. */}
      {mask && (
        <>
          <Word
            style={{
              color: `rgba(255,112,44,${(0.22 + 0.5 * Math.exp(-(f - BURN_START) / 5)).toFixed(3)})`,
              transform: 'translate(-1px, -1.5px)',
              textShadow: '0 9px 16px rgba(0,0,0,0.9)',
            }}
          />
          <Word style={{color: '#0c0705'}} />
        </>
      )}
      <div style={{position: 'absolute', inset: 0, ...maskStyle}}>
        {/* Soft halo and drop shadow behind the metal. */}
        <Word
          style={{
            color: 'transparent',
            textShadow: `0 8px 16px rgba(0,0,0,0.9), 0 0 30px rgba(255,140,60,${glowA})`,
          }}
        />
        {/* Ember halo that tracks the heat. */}
        {avgHeat > 0.01 && (
          <Word
            style={{
              color: 'transparent',
              textShadow: '0 0 26px rgba(250,110,40,0.95)',
              maskImage: heatMask,
              WebkitMaskImage: heatMask,
            }}
          />
        )}
        {/* The bell's sweep blooms a little past the letter edges. */}
        {shimmerOn && (
          <Word
            style={{
              color: 'transparent',
              textShadow: '0 0 18px rgba(255,214,150,0.9), 0 0 4px rgba(255,240,210,0.9)',
              maskImage: shimmer,
              WebkitMaskImage: shimmer,
            }}
          />
        )}
        {/* Bevel: dark underside and a lit top edge. */}
        <Word style={{color: '#1a0f05', transform: 'translate(1px, 4px)'}} />
        <Word style={{color: 'rgba(255,236,186,0.75)', transform: 'translate(-1px, -2px)'}} />
        <Word style={{...clipText, backgroundImage: METAL, WebkitTextStroke: '0.8px rgba(58,36,12,0.85)'}} />
        {/* Heat over the metal; kept translucent in the middle so the gold's form still reads. */}
        {avgHeat > 0.01 && <Word style={{...clipText, backgroundImage: heatStops(f, heatColor)}} />}
        {shimmerOn && <Word style={{...clipText, backgroundImage: shimmer}} />}
      </div>
      <Glint f={f} />
      <Sparks f={f} />
      <Shedding f={f} />
    </div>
  );
};
