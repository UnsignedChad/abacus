// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// The crown close-up: a low lens on the flagstones, looking down the nave
// from the knight's feet toward the kneeling king. The crown drops in, strikes
// the stone on each bounce cue, rattles on its base and settles at the
// knight's foot. The far half of the shot is painted at quarter resolution so
// the upscale defocuses it: a cheap, convincing depth of field.

import React from 'react';
import {AbsoluteFill} from 'remotion';
import {PaintLayer} from './Canvas';
import {Crown, crownDefs} from './crown';
import {makeIds} from './figure';
import {footPart, knightDefs, shinPart} from './knight';
import {mstr, mul, rot, sc, tr, Vec} from './rig';
import {C} from './time';
import {clamp01, flicker, nz, nz2, rnd, rr} from './util';

type Ctx = CanvasRenderingContext2D;

const B = C.crownBounces; // [570, 585, 598]
const REST = C.crownRest; // 620
const START = 562;

// Camera: a few units above the floor, looking along it.
const camAt = (f: number) => {
  const u = clamp01((f - START) / (C.phase2 - START));
  return {x: 10 - u * 14, y: -38, hz: 470 + u * 6, f: 1380 + u * 160};
};
type CuCam = ReturnType<typeof camAt>;

const P = (c: CuCam, x: number, y: number, z: number): Vec => [960 + ((x - c.x) * c.f) / z, c.hz + ((y - c.y) * c.f) / z];

/** Crown state (real frames): position, in-plane roll, ring tilt. */
export const crownState = (f: number) => {
  const L = (a: number, b: number, u: number) => a + (b - a) * u;
  if (f < B[0]) {
    // Dropping into shot, tumbling.
    const u = clamp01((f - START) / (B[0] - START));
    return {x: 70 - 20 * u, y: -300 * (1 - u * u), z: L(560, 470, u), rot: 60 - 190 * u, tilt: 0.25 + 0.4 * Math.sin(u * 5)};
  }
  if (f < B[1]) {
    const u = (f - B[0]) / (B[1] - B[0]);
    return {x: L(50, 30, u), y: -78 * 4 * u * (1 - u), z: L(470, 360, u), rot: -130 - 130 * u, tilt: 0.3 + 0.2 * Math.cos(u * 6)};
  }
  if (f < B[2]) {
    const u = (f - B[1]) / (B[2] - B[1]);
    return {x: L(30, 18, u), y: -30 * 4 * u * (1 - u), z: L(360, 290, u), rot: -260 - 108 * u, tilt: 0.3 + 0.12 * Math.cos(u * 6)};
  }
  if (f < REST) {
    // Rattling on its base, skidding to the knight's foot, rocking to rest.
    const u = (f - B[2]) / (REST - B[2]);
    const e = 1 - Math.pow(1 - u, 2);
    const ph = u * Math.PI * 7;
    const rock = 20 * Math.pow(1 - u, 1.5) * Math.sin(ph);
    const hop = -5 * Math.pow(1 - u, 2) * Math.abs(Math.sin(ph));
    return {x: L(18, -6, e), y: hop, z: L(290, 238, e), rot: -8 + rock, tilt: 0.18 + 0.08 * Math.pow(1 - u, 2) * Math.cos(ph)};
  }
  return {x: -6, y: 0, z: 238, rot: -8, tilt: 0.18};
};

/** Impacts: the three bounces and the final clack. */
const HITS = [
  {f: B[0], s: 1},
  {f: B[1], s: 0.6},
  {f: B[2], s: 0.35},
  {f: REST, s: 0.18},
];

// ---------------------------------------------------------------------------
// Far layer (quarter res): the nave receding, bokeh, and the kneeling king.

const paintFar = (ctx: Ctx, fr: number) => {
  const c = camAt(fr);
  const t = fr;
  ctx.fillStyle = '#060405';
  ctx.fillRect(0, 0, 1920, 1080);
  // A dim wall of glass and piers far away.
  const wall = ctx.createLinearGradient(0, 120, 0, c.hz + 20);
  wall.addColorStop(0, '#07060a');
  wall.addColorStop(1, '#141018');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 1920, c.hz + 20);
  // Window bokeh: soft coloured discs high in the dark.
  const glass = ['#8f1426', '#2b46a8', '#6a2a8a', '#c07a22', '#2a4ab0'];
  for (let i = 0; i < 16; i++) {
    const x = rr(-100, 2020, i, 1, 900) + (c.x - 10) * -0.3;
    const y = rr(140, 420, i, 2, 900);
    const r = rr(40, 110, i, 3, 900);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = glass[i % glass.length];
    g.addColorStop(0, col + '66');
    g.addColorStop(0.7, col + '33');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Piers as soft dark bands.
  for (let i = 0; i < 5; i++) {
    const x = 160 + i * 420 + (c.x - 10) * -0.4;
    const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 70, 0, 140, c.hz + 30);
  }
  // Far floor.
  const floor = ctx.createLinearGradient(0, c.hz, 0, 1080);
  floor.addColorStop(0, '#120e0e');
  floor.addColorStop(0.3, '#191413');
  floor.addColorStop(1, '#0b0909');
  ctx.fillStyle = floor;
  ctx.fillRect(0, c.hz, 1920, 1080 - c.hz);
  // Moonlight lying on the far floor.
  const mp = P(c, 260, 0, 1500);
  ctx.save();
  ctx.translate(mp[0], mp[1]);
  ctx.scale(1, 0.12);
  const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  mg.addColorStop(0, 'rgba(150,170,210,0.28)');
  mg.addColorStop(1, 'rgba(150,170,210,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(-700, -700, 1400, 1400);
  ctx.restore();
  // Candle bokeh, warm and trembling.
  const candles: [number, number, number][] = [
    [-520, -250, 1700],
    [-470, -262, 1720],
    [640, -300, 2100],
    [700, -286, 2080],
    [-900, -280, 1100],
  ];
  candles.forEach(([x, y, z], i) => {
    const p = P(c, x, y, z);
    const r = 34 * flicker(t, 60 + i);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 2.4);
    g.addColorStop(0, 'rgba(255,190,110,0.8)');
    g.addColorStop(0.35, 'rgba(255,140,60,0.35)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p[0] - r * 2.4, p[1] - r * 2.4, r * 4.8, r * 4.8);
  });
  // The kneeling king, seen head on down the nave: backlit by the glass, one
  // knee raised, the greatsword planted before him, mantle pooled behind.
  const kz = 1500;
  const kx = 210;
  const s = c.f / kz;
  const at = (x: number, y: number) => P(c, kx + x, y, kz);
  const path = (pts: [number, number][], close = true) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const p = at(x, y);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    });
    if (close) ctx.closePath();
  };
  // A red breath behind him, swelling as he wakes.
  const wake = clamp01((fr - 622) / 8);
  // A red haze around him, swelling at the end.
  const hz = at(0, -260);
  const rg = ctx.createRadialGradient(hz[0], hz[1], 0, hz[0], hz[1], 520 * s);
  rg.addColorStop(0, `rgba(150,20,8,${0.1 + 0.4 * wake})`);
  rg.addColorStop(1, 'rgba(120,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(hz[0] - 520 * s, hz[1] - 520 * s, 1040 * s, 1040 * s);
  // Mantle pooled on the floor behind and around him.
  ctx.fillStyle = '#0c0203';
  path([[-250, 0], [-200, -150], [-140, -330], [140, -330], [210, -150], [270, 0]]);
  ctx.fill();
  // Raised knee (his left) and the kneeling thigh.
  ctx.fillStyle = '#18130f';
  path([[40, -150], [120, -205], [150, -120], [140, 0], [110, 0], [100, -120]]);
  ctx.fill();
  path([[-120, -150], [-60, -170], [-40, -40], [-110, -20]]);
  ctx.fill();
  // Pelvis and spine.
  ctx.fillStyle = '#1e1914';
  path([[-60, -150], [60, -150], [45, -110], [-45, -110]]);
  ctx.fill();
  ctx.strokeStyle = '#3a3026';
  ctx.lineWidth = 14 * s;
  path([[0, -150], [0, -250]], false);
  ctx.stroke();
  // Ribcage: pale arcs in the open front of the mantle.
  ctx.strokeStyle = '#3e352a';
  ctx.lineWidth = 8 * s;
  for (let i = 0; i < 6; i++) {
    const y = -300 + i * 17;
    const w = 70 - Math.abs(i - 2) * 6;
    const a = at(-w, y + 10);
    const m = at(0, y - 6);
    const b = at(w, y + 10);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(m[0], m[1] - 10 * s, b[0], b[1]);
    ctx.stroke();
  }
  // Shoulders: ermine collar and the pauldron on his right.
  ctx.fillStyle = '#4a443c';
  path([[-120, -330], [-70, -372], [70, -372], [120, -330], [80, -318], [-80, -318]]);
  ctx.fill();
  ctx.fillStyle = '#1a1718';
  path([[-150, -340], [-128, -380], [-78, -372], [-84, -318], [-140, -306]]);
  ctx.fill();
  // Arms: his right hand on the pommel of the planted sword.
  ctx.strokeStyle = '#3e352a';
  ctx.lineWidth = 12 * s;
  path([[-110, -330], [-150, -250], [-140, -200]], false);
  ctx.stroke();
  path([[110, -330], [150, -240], [130, -170]], false);
  ctx.stroke();
  // The greatsword, point down in the stone.
  const s0 = at(-140, 0);
  const s1 = at(-140, -215);
  ctx.strokeStyle = '#121113';
  ctx.lineWidth = 22 * s;
  ctx.beginPath();
  ctx.moveTo(s0[0], s0[1]);
  ctx.lineTo(s1[0], s1[1]);
  ctx.stroke();
  const g0 = at(-190, -200);
  const g1 = at(-90, -200);
  ctx.lineWidth = 12 * s;
  ctx.beginPath();
  ctx.moveTo(g0[0], g0[1]);
  ctx.lineTo(g1[0], g1[1]);
  ctx.stroke();
  // Skull, bowed.
  const hp = at(0, -405);
  ctx.fillStyle = '#3a3128';
  ctx.beginPath();
  ctx.ellipse(hp[0], hp[1], 36 * s, 44 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a231c';
  ctx.fillRect(hp[0] - 22 * s, hp[1] + 26 * s, 44 * s, 22 * s);
  // Moon rim along the crown of the skull and the shoulders.
  ctx.strokeStyle = 'rgba(180,198,230,0.55)';
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.ellipse(hp[0], hp[1], 36 * s, 44 * s, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  path([[-150, -340], [-128, -380], [-70, -372], [70, -372], [120, -330]], false);
  ctx.stroke();
  // Embers in the sockets, waking just before the cut.
  const e = 0.25 + 0.15 * nz(t * 0.3, 90) + 1.4 * wake * wake;
  for (const dx of [-14, 14]) {
    const p = at(dx, -410);
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 60 * s * (0.6 + e));
    g.addColorStop(0, `rgba(255,200,120,${Math.min(1, 0.8 * e)})`);
    g.addColorStop(0.2, `rgba(255,70,20,${Math.min(1, 0.55 * e)})`);
    g.addColorStop(1, 'rgba(160,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p[0] - 200, p[1] - 200, 400, 400);
  }
};

// ---------------------------------------------------------------------------
// Near layer (full res): flagstones, the crown's light, sparks and dust.

const paintNear = (ctx: Ctx, fr: number) => {
  const c = camAt(fr);
  // Flagstones from the lens out to where the far layer takes over.
  const tw = 130;
  for (let z0 = 60; z0 < 900; z0 += 100) {
    const z1 = z0 + 100;
    const row = Math.round(z0 / 100);
    const off = (row % 2) * (tw / 2);
    const fadeFar = clamp01((900 - z1) / 260);
    for (let x = -1200 + off; x < 1200; x += tw) {
      const col = Math.round(x / tw);
      const k = rnd(row, col, 5);
      const a0 = P(c, x + 3, 0, z0 + 2);
      const a1 = P(c, x + tw - 3, 0, z0 + 2);
      const b1 = P(c, x + tw - 3, 0, z1 - 2);
      const b0 = P(c, x + 3, 0, z1 - 2);
      if (Math.max(a0[0], a1[0]) < -50 || Math.min(b0[0], b1[0]) > 1970) continue;
      const v = 16 + 12 * k;
      ctx.fillStyle = `rgba(${v * 1.08},${v * 0.95},${v * 0.9},${fadeFar})`;
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(a1[0], a1[1]);
      ctx.lineTo(b1[0], b1[1]);
      ctx.lineTo(b0[0], b0[1]);
      ctx.closePath();
      ctx.fill();
      // Wear: the far lip of each stone catches the light; chips and cracks.
      if (z0 < 600) {
        ctx.strokeStyle = `rgba(150,160,190,${0.12 * fadeFar})`;
        ctx.lineWidth = Math.max(0.8, 160 / z0);
        ctx.beginPath();
        ctx.moveTo(b0[0], b0[1]);
        ctx.lineTo(b1[0], b1[1]);
        ctx.stroke();
        if (rnd(row, col, 13) < 0.4) {
          const cx0 = x + rr(20, tw - 20, row, col, 14);
          const q0 = P(c, cx0 - 12, 0, z1 - 2);
          const q1 = P(c, cx0 + 10, 0, z1 - 2);
          const q2 = P(c, cx0, 0, z1 - 14);
          ctx.fillStyle = `rgba(0,0,0,${0.5 * fadeFar})`;
          ctx.beginPath();
          ctx.moveTo(q0[0], q0[1]);
          ctx.lineTo(q1[0], q1[1]);
          ctx.lineTo(q2[0], q2[1]);
          ctx.fill();
        }
        if (rnd(row, col, 9) < 0.35) {
          ctx.strokeStyle = `rgba(0,0,0,${0.6 * fadeFar})`;
          ctx.lineWidth = Math.max(0.8, 300 / z0);
          ctx.beginPath();
          let px = x + tw * rnd(row, col, 11);
          let p = P(c, px, 0, z0 + 4);
          ctx.moveTo(p[0], p[1]);
          for (let j = 1; j <= 4; j++) {
            px += rr(-30, 30, row, col, 50 + j);
            p = P(c, Math.max(x, Math.min(x + tw, px)), 0, z0 + j * 24);
            ctx.lineTo(p[0], p[1]);
          }
          ctx.stroke();
        }
      }
    }
  }
  // Light: a cold pool of moonlight where the crown comes to rest, warm
  // candle spill from the left, and a faint red breath from the king.
  const pool = (x: number, z: number, r: number, col: string, a: number) => {
    const p = P(c, x, 0, z);
    const rx = (r * c.f) / z;
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.scale(1, 0.16);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, col.replace('A', String(a)));
    g.addColorStop(1, col.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  pool(40, 300, 260, 'rgba(120,140,190,A)', 0.22);
  pool(-420, 420, 300, 'rgba(255,130,60,A)', 0.12 * flicker(fr, 70));
  pool(200, 800, 500, 'rgba(200,30,10,A)', 0.05 + 0.12 * clamp01((fr - 622) / 8));
  ctx.restore();
  // The crown's shadow on the stone.
  const cs = crownState(fr);
  const sp = P(c, cs.x, 0, cs.z);
  const sr = (44 * c.f) / cs.z;
  const lift = clamp01(-cs.y / 120);
  ctx.save();
  ctx.translate(sp[0], sp[1]);
  ctx.scale(1, 0.2);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, sr * (1 + lift));
  sg.addColorStop(0, `rgba(0,0,0,${0.7 * (1 - lift * 0.8)})`);
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-sr * 2, -sr * 2, sr * 4, sr * 4);
  ctx.restore();
  // Dust from each strike.
  for (const h of HITS) {
    const a = fr - h.f;
    if (a < 0 || a > 40) continue;
    const st = crownState(h.f + 0.01);
    for (let i = 0; i < 10; i++) {
      const dir = rr(-1, 1, i, h.f, 910);
      const x = st.x + dir * (30 + a * 3.2) * h.s;
      const y = -rr(4, 26, i, h.f, 911) * h.s * (1 - Math.exp(-a * 0.1));
      const z = st.z + rr(-30, 30, i, h.f, 912);
      const p = P(c, x, y, z);
      const r = ((18 + a * 1.4) * h.s * c.f) / z;
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
      g.addColorStop(0, `rgba(150,138,124,${0.16 * (1 - a / 40)})`);
      g.addColorStop(1, 'rgba(150,138,124,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
    }
  }
  // Clink sparks: gold on stone.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const h of HITS) {
    const a = fr - h.f;
    if (a < 0 || a > 14) continue;
    const st = crownState(h.f + 0.01);
    const base = P(c, st.x - 20, 0, st.z);
    const k = c.f / st.z;
    const core = Math.max(0, 1 - a / 4) * h.s;
    const g = ctx.createRadialGradient(base[0], base[1], 0, base[0], base[1], 60 * k * h.s);
    g.addColorStop(0, `rgba(255,236,190,${0.9 * core})`);
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(base[0] - 60 * k, base[1] - 60 * k, 120 * k, 120 * k);
    const n = Math.round(14 * h.s);
    for (let i = 0; i < n; i++) {
      const ang = rr(-2.9, -0.25, i, h.f, 920);
      const sp0 = rr(2, 7, i, h.f, 921) * h.s;
      const life = rr(6, 13, i, h.f, 922);
      if (a > life) continue;
      const u = a / life;
      const x0 = Math.cos(ang) * sp0 * a * k;
      const y0 = (Math.sin(ang) * sp0 * a + 0.35 * a * a) * k;
      const x1 = Math.cos(ang) * sp0 * Math.max(0, a - 1) * k;
      const y1 = (Math.sin(ang) * sp0 * Math.max(0, a - 1) + 0.35 * (a - 1) * (a - 1)) * k;
      ctx.strokeStyle = `rgba(255,${210 - u * 120},${120 - u * 90},${1 - u})`;
      ctx.lineWidth = Math.max(1, 0.5 * k);
      ctx.beginPath();
      ctx.moveTo(base[0] + x1, base[1] + y1);
      ctx.lineTo(base[0] + x0, base[1] + y0);
      ctx.stroke();
    }
  }
  // Motes drifting through the lens, out of focus.
  for (let i = 0; i < 26; i++) {
    const x = rr(0, 1920, i, 1, 930) + nz(fr * 0.01, i) * 60;
    const y = rr(150, 900, i, 2, 930) + nz2(fr * 0.012, i) * 40 - fr * 0.3;
    const r = rr(3, 12, i, 3, 930);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(210,205,200,0.18)');
    g.addColorStop(1, 'rgba(210,205,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------

export const CloseUp: React.FC<{frame: number; t: number; idPrefix: string}> = ({frame: fr, idPrefix}) => {
  const ids = makeIds(idPrefix + 'cu');
  const c = camAt(fr);
  // The knight's near foot and greave, huge in the left foreground; the far
  // foot a pace behind it.
  const leg = (x: number, z: number, key: string) => {
    const k = c.f / z;
    const ankle = P(c, x, -12, z);
    const m = mul(tr(ankle[0], ankle[1]), sc(k));
    const shin = mstr(mul(mul(m, rot(-5)), tr(0, -84)));
    const foot = mstr(m);
    const sp = shinPart(ids, true);
    const fp = footPart(ids, true);
    const copy = (dx: number, dy: number, fill: string, op: number) => (
      <g fill={fill} stroke={fill} strokeWidth={0} opacity={op}>
        <g transform={`translate(${dx} ${dy}) ${shin}`}>{sp.sil}</g>
        <g transform={`translate(${dx} ${dy}) ${foot}`}>{fp.sil}</g>
      </g>
    );
    return (
      <g key={key}>
        {copy(3, -2, '#9fb2d6', 0.8)}
        {copy(-3, 0, '#ff8a3a', 0.45)}
        <g transform={shin}>{sp.art}</g>
        <g transform={foot}>{fp.art}</g>
        {copy(0, 0, '#07080b', 0.5)}
      </g>
    );
  };
  const cs = crownState(fr);
  const cp = P(c, cs.x, cs.y - 16, cs.z);
  const ck = (c.f / cs.z) * 1.05;
  const crownM = mul(tr(cp[0], cp[1]), mul(rot(cs.rot), sc(ck)));
  const glint = Math.max(...HITS.map((h) => Math.max(0, 1 - Math.abs(fr - h.f - 1) / 5) * h.s));
  return (
    <AbsoluteFill style={{background: '#050304'}}>
      <PaintLayer paint={(ctx) => paintFar(ctx, fr)} res={0.25} blur={2.6} />
      <PaintLayer paint={(ctx) => paintNear(ctx, fr)} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          {knightDefs(ids)}
          {crownDefs(ids)}
          <radialGradient id={ids('cuGlow')}>
            <stop offset="0" stopColor="#ffd890" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff9040" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={mstr(crownM)}>
          <circle cx={0} cy={-14} r={56} fill={`url(#${ids('cuGlow')})`} opacity={0.12 + 0.3 * glint} />
          <Crown ids={ids} tilt={cs.tilt} glint={glint} red={clamp01((fr - 622) / 8) * 0.8} />
        </g>
        {leg(-118, 232, 'near')}
      </svg>
      {/* Cool moonlight and warm candle wash over the whole shot. */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          background: 'radial-gradient(ellipse at 40% 18%, rgba(90,110,160,0.12) 0%, rgba(0,0,0,0) 45%)',
        }}
      />
    </AbsoluteFill>
  );
};
