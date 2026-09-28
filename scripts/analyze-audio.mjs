// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Analyze public/audio/score.wav against src/timeline.json: duration, peaks,
// clipping, DC, loudness, an RMS-per-second sparkline, per-scene loudness and
// spectral balance, and an onset / silence check at every cue.
//   node scripts/analyze-audio.mjs [file.wav]

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readWav} from './audio/wav.mjs';
import {integratedLufs, shortTermMax, truePeak, kWeight} from './audio/master.mjs';
import {biquad} from './audio/dsp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] ?? path.join(ROOT, 'public/audio/score.wav');
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/timeline.json'), 'utf8'));
const {sr, channels, n} = readWav(file);
const [L, R] = channels.length > 1 ? channels : [channels[0], channels[0]];
const fps = tl.fps;
const dB = (x) => (x > 0 ? 10 * Math.log10(x) : -Infinity);
const fmt = (v, w = 6) => (Number.isFinite(v) ? v.toFixed(1) : '-inf').padStart(w);
let fails = 0;
const verdict = (ok) => { if (!ok) fails++; return ok ? 'ok  ' : 'FAIL'; };

// Mono power signal plus band-split versions (2nd-order x2 slopes).
const mono = new Float32Array(n);
for (let i = 0; i < n; i++) mono[i] = (L[i] + R[i]) * 0.5;
const band = (type, f) => { const x = mono.slice(); biquad(x, type, f, 0.707); biquad(x, type, f, 0.707); return x; };
const low = band('lp', 200), high = band('hp', 2000);
const ms = (x, a, b) => {
  a = Math.max(0, Math.round(a * sr)); b = Math.min(n, Math.round(b * sr));
  let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i];
  return b > a ? s / (b - a) : 0;
};
const msLR = (a, b) => (ms(L, a, b) + ms(R, a, b)) / 2;

// ---------- global ----------
let pk = 0, clipped = 0, dcL = 0, dcR = 0, nonFinite = 0;
for (let i = 0; i < n; i++) {
  const a = Math.abs(L[i]), b = Math.abs(R[i]);
  pk = Math.max(pk, a, b);
  if (a >= 32767 / 32768 || b >= 32767 / 32768) clipped++;
  if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) nonFinite++;
  dcL += L[i]; dcR += R[i];
}
const dur = n / sr, want = tl.total / fps;
const lufs = integratedLufs([L, R], sr);
const tp = truePeak([L, R]);
console.log(`file        ${path.relative(ROOT, file)}  ${sr} Hz, ${channels.length} ch`);
console.log(`duration    ${dur.toFixed(3)} s (want ${want.toFixed(3)})  ${verdict(Math.abs(dur - want) < 1 / sr)}`);
console.log(`peak        ${fmt(20 * Math.log10(pk || 1e-12))} dBFS   true peak ${fmt(tp)} dBTP  ${verdict(tp <= -1)}`);
console.log(`clipped     ${clipped} samples  ${verdict(clipped === 0)}   non-finite ${nonFinite}`);
console.log(`DC offset   L ${(dcL / n).toExponential(1)}  R ${(dcR / n).toExponential(1)}  ${verdict(Math.abs(dcL / n) < 1e-4 && Math.abs(dcR / n) < 1e-4)}`);
console.log(`loudness    ${fmt(lufs)} LUFS integrated (target -16 +/- 1.5)  ${verdict(Math.abs(lufs + 16) <= 1.5)}`);

// ---------- RMS per second ----------
const bars = ' .:-=+*#%@';
const perSec = [];
for (let s = 0; s < Math.ceil(dur); s++) perSec.push(dB(msLR(s, s + 1)));
console.log('\nRMS dBFS per second (sparkline: blank=-inf .. @=-6):');
for (let row = 0; row < perSec.length; row += 15) {
  const seg = perSec.slice(row, row + 15);
  const line = seg.map((v) => bars[Math.max(0, Math.min(9, Math.round(((Number.isFinite(v) ? v : -99) + 66) / 6)))]).join('');
  console.log(`  ${String(row).padStart(3)}s |${line.padEnd(15)}| ${seg.map((v) => fmt(v, 4)).join(' ')}`);
}

// ---------- scenes ----------
console.log('\nscene       from     LUFS  ST-max    RMS   low%  mid%  high%');
for (const [name, sc] of Object.entries(tl.scenes)) {
  const a = sc.from / fps, b = (sc.from + sc.duration) / fps;
  const i0 = Math.round(a * sr), i1 = Math.round(b * sr);
  const tot = ms(mono, a, b) || 1e-20, lo = ms(low, a, b), hi = ms(high, a, b);
  const mid = Math.max(0, tot - lo - hi);
  const sum = lo + mid + hi || 1;
  console.log(`${name.padEnd(10)} ${a.toFixed(1).padStart(5)}s ${fmt(integratedLufs([L.subarray(i0, i1), R.subarray(i0, i1)], sr), 7)} ${fmt(shortTermMax([L, R], sr, i0, i1), 6)} ${fmt(dB(msLR(a, b)), 6)}  ${(100 * lo / sum).toFixed(0).padStart(4)}  ${(100 * mid / sum).toFixed(0).padStart(4)}  ${(100 * hi / sum).toFixed(0).padStart(5)}`);
}

// ---------- cues ----------
// onset: a sound should start here. silence: digital zero until scene end. fade: quiet after.
const ONSET = new Set(['candleLight', 'writingStart', 'signatureDone', 'candleGust', 'crowCaw', 'distantBell',
  'locationTitle', 'signCreak', 'churchRumble', 'heartbeats', 'swordDraw', 'bladeGlint', 'stepsStart', 'monsterSpotted',
  'runeHum', 'runeDoorOpen', 'flash', 'eyesIgnite', 'kingRises', 'roar', 'circleStart', 'swing1', 'roll', 'windup',
  'windupGlint', 'parry', 'riposte', 'stagger', 'crownFall', 'crownBounces', 'crownRest', 'phase2', 'titleBoom', 'finalBell']);
const W = 0.15;
const jump = (t) => {
  const pre = [dB(ms(mono, t - W, t)), dB(ms(low, t - W, t)), dB(ms(high, t - W, t))];
  const post = [dB(ms(mono, t, t + W)), dB(ms(low, t, t + W)), dB(ms(high, t, t + W))];
  const d = post.map((v, k) => (Number.isFinite(v) && v > -75 ? v - Math.max(pre[k], -90) : -Infinity));
  return {pre: pre[0], post: post[0], full: d[0], best: Math.max(...d), lowD: d[1], highD: d[2]};
};
console.log(`\ncue check (RMS ${W * 1000} ms before -> after, dB; onset passes if full band or low/high band jumps >= 3 dB)`);
console.log('scene      cue               frame    time    before   after   full   low   high  result');
for (const [name, cues] of Object.entries(tl.cues)) {
  const from = tl.scenes[name].from, end = (from + tl.scenes[name].duration) / fps;
  const rows = [];
  for (const [k, v] of Object.entries(cues)) {
    if (Array.isArray(v) && v.length === 2 && /^line/.test(k)) continue; // narration text windows
    if (k === 'stepEvery' || k === 'stepsEnd') continue;
    const frames = Array.isArray(v) ? v : [v];
    frames.forEach((f, j) => rows.push([Array.isArray(v) ? `${k}[${j}]` : k, k, f]));
  }
  if (cues.stepEvery) {
    for (let f = cues.stepsStart + cues.stepEvery, j = 1; f <= cues.stepsEnd; f += cues.stepEvery, j++) rows.push([`step[${j}]`, 'stepsStart', f]);
  }
  rows.sort((a, b) => a[2] - b[2]);
  for (const [label, key, f] of rows) {
    const t = (from + f) / fps;
    const j = jump(t);
    let res = 'info';
    if (key === 'cutToBlack') {
      let nz = 0;
      for (let i = Math.round(t * sr); i < Math.round(end * sr); i++) if (L[i] !== 0 || R[i] !== 0) nz++;
      res = `${verdict(nz === 0)} silence (${nz} nonzero samples to ${end.toFixed(2)}s)`;
    } else if (key === 'fadeOutEnd') {
      res = `${verdict(j.post < -60)} quiet after`;
    } else if (ONSET.has(key)) {
      res = `${verdict(j.best >= 3)} onset`;
    }
    console.log(`${name.padEnd(10)} ${label.padEnd(16)} ${String(from + f).padStart(6)} ${t.toFixed(3).padStart(8)}  ${fmt(j.pre, 7)} ${fmt(j.post, 7)} ${fmt(j.full)} ${fmt(j.lowD)} ${fmt(j.highD)}  ${res}`);
  }
}
// ---------- key moments ----------
// Momentary loudness (400 ms, K-weighted) peak just after each big hit. THE parry
// must be the loudest moment of the film, and must jump out of a hush.
const kw = kWeight([L, R]);
const cum = new Float64Array(n + 1);
for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + kw[0][i] * kw[0][i] + kw[1][i] * kw[1][i];
const mom = (t) => {
  const a = Math.max(0, Math.round(t * sr)), b = Math.min(n, a + Math.round(0.4 * sr));
  return b > a ? -0.691 + 10 * Math.log10((cum[b] - cum[a]) / (b - a) + 1e-20) : -Infinity;
};
const momMax = (t0, t1) => { let m = -Infinity; for (let t = t0; t < t1; t += 0.01) m = Math.max(m, mom(t)); return m; };
const at = (s, c) => (tl.scenes[s].from + tl.cues[s][c]) / fps;
const KEY = [['depths', 'flash'], ['cathedral', 'eyesIgnite'], ['cathedral', 'roar'], ['cathedral', 'windup'], ['cathedral', 'parry'],
  ['cathedral', 'riposte'], ['cathedral', 'phase2'], ['title', 'titleBoom'], ['title', 'finalBell']];
console.log('\nkey moments: momentary LUFS max in [cue-0.2, cue+1.2]; the parry must top them all');
const moments = KEY.map(([s, c]) => [s, c, momMax(at(s, c) - 0.2, at(s, c) + 1.2)]);
const parry = moments.find(([, c]) => c === 'parry')[2];
for (const [s, c, v] of moments) console.log(`  ${s.padEnd(10)} ${c.padEnd(12)} ${fmt(v)}${c === 'parry' ? '' : `  (${fmt(v - parry, 5)} vs parry)`}`);
const others = Math.max(...moments.filter(([, c]) => c !== 'parry').map(([, , v]) => v));
console.log(`  parry leads by ${(parry - others).toFixed(1)} LU  ${verdict(parry > others + 1)}`);
// The riser stops short: the last ~60 ms before the clang should be a near-silent gap.
const P = at('cathedral', 'parry');
const gap = dB(ms(mono, P - 0.065, P - 0.005)), hit = dB(ms(mono, P, P + 0.15));
console.log(`  gap before parry ${fmt(gap)} dBFS -> hit ${fmt(hit)} dBFS  (+${(hit - gap).toFixed(1)} dB)  ${verdict(hit - gap >= 12)}`);

console.log(`\n${fails ? fails + ' check(s) FAILED' : 'all checks passed'}`);
process.exitCode = fails ? 1 : 0;
