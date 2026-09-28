// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// Procedural soundtrack for the Clogheen intro. Reads src/timeline.json, renders
// every scene's music / ambience / sfx stems at its absolute time, masters the
// mix (loudness, limiter, hard cuts) and writes public/audio/score.wav.
//   node scripts/make-audio.mjs [--stems]   (--stems also writes out/audio/*.wav)

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SR, secs, biquad, db} from './audio/dsp.mjs';
import {busOf} from './audio/mixer.mjs';
import {integratedLufs, truePeak, limit} from './audio/master.mjs';
import {writeWav} from './audio/wav.mjs';
import {letter} from './audio/scenes/letter.mjs';
import {road} from './audio/scenes/road.mjs';
import {town} from './audio/scenes/town.mjs';
import {steel} from './audio/scenes/steel.mjs';
import {depths} from './audio/scenes/depths.mjs';
import {cathedral} from './audio/scenes/cathedral.mjs';
import {title} from './audio/scenes/title.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_LUFS = -16;
const CEILING_DB = -2;
const SCENES = {letter, road, town, steel, depths, cathedral, title};
const BUS_GAIN = {music: 1, amb: 1, sfx: 1, verb: 1};

const started = process.hrtime.bigint();
const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/timeline.json'), 'utf8'));
const fps = tl.fps;
const total = secs(tl.total / fps);

// Cue frames -> scene-local seconds (arrays and [start, end] ranges too).
const toSec = (v) => (Array.isArray(v) ? v.map(toSec) : v / fps);
const cueSecs = (name) => Object.fromEntries(Object.entries(tl.cues[name] ?? {}).map(([k, v]) => [k, toSec(v)]));

const buses = {};
for (const b of Object.keys(BUS_GAIN)) buses[b] = {L: new Float32Array(total), R: new Float32Array(total)};

for (const [name, sc] of Object.entries(tl.scenes)) {
  const build = SCENES[name];
  if (!build) throw new Error('no audio for scene ' + name);
  const t = process.hrtime.bigint();
  const mix = build({cue: cueSecs(name), dur: sc.duration / fps, fps}).render();
  const o = secs(sc.from / fps);
  for (const [stem, st] of Object.entries(mix.stems)) {
    const bus = buses[busOf(stem)];
    const n = Math.min(st.L.length, total - o);
    for (let i = 0; i < n; i++) { bus.L[o + i] += st.L[i]; bus.R[o + i] += st.R[i]; }
  }
  console.log(`  ${name.padEnd(10)} ${(Number(process.hrtime.bigint() - t) / 1e9).toFixed(1)}s`);
}

// Sum stems, remove DC / subsonics.
let L = new Float32Array(total), R = new Float32Array(total);
for (const [b, g] of Object.entries(BUS_GAIN)) {
  for (let i = 0; i < total; i++) { L[i] += buses[b].L[i] * g; R[i] += buses[b].R[i] * g; }
}
// 4th-order Butterworth at 24 Hz: nothing below the audible sub eats limiter headroom.
for (const x of [L, R]) { biquad(x, 'hp', 24, 0.5412); biquad(x, 'hp', 24, 1.3066); }
for (let i = 0; i < total; i++) {
  if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) throw new Error('non-finite sample at ' + i);
}

// Hard silences that must survive mastering: steel and cathedral cut to black, and the tail.
const silences = [];
for (const [name, cues] of Object.entries(tl.cues)) {
  const from = tl.scenes[name].from, end = from + tl.scenes[name].duration;
  if (cues.cutToBlack != null) silences.push([(from + cues.cutToBlack) / fps, end / fps]);
  if (name === 'title' && cues.fadeOutEnd != null) silences.push([(from + cues.fadeOutEnd) / fps, tl.total / fps]);
}

// Loudness: normalize, limit, re-measure and trim once more.
let gain = 1, out = null, lufs = 0;
for (let pass = 0; pass < 6; pass++) {
  const gl = new Float32Array(total), gr = new Float32Array(total);
  for (let i = 0; i < total; i++) { gl[i] = L[i] * gain; gr[i] = R[i] * gain; }
  out = limit(gl, gr, SR, {ceilingDb: CEILING_DB});
  lufs = integratedLufs([out.L, out.R], SR);
  if (Math.abs(lufs - TARGET_LUFS) < 0.1) break;
  gain *= db(TARGET_LUFS - lufs);
}
for (const [a, b] of silences) {
  for (let i = secs(a); i < Math.min(total, secs(b)); i++) { out.L[i] = 0; out.R[i] = 0; }
}
const tp = truePeak([out.L, out.R]);

// Limiter report: deepest gain reduction per scene.
for (const [name, sc] of Object.entries(tl.scenes)) {
  const a = secs(sc.from / fps), b = secs((sc.from + sc.duration) / fps);
  let m = 1, at = a;
  for (let i = a; i < b; i++) if (out.gain[i] < m) { m = out.gain[i]; at = i; }
  console.log(`  limiter ${name.padEnd(10)} max GR ${(-20 * Math.log10(m)).toFixed(1).padStart(5)} dB at ${(at / SR).toFixed(2)}s`);
}
const gr = [];
for (const [name, cues] of Object.entries(tl.cues)) {
  for (const [k, v] of Object.entries(cues)) {
    if (typeof v !== 'number') continue;
    const a = secs((tl.scenes[name].from + v) / fps);
    let m = 1;
    for (let i = a; i < Math.min(total, a + secs(0.3)); i++) m = Math.min(m, out.gain[i]);
    if (m < db(-1)) gr.push(`${k} ${(-20 * Math.log10(m)).toFixed(1)}`);
  }
}
if (gr.length) console.log('  limiter GR at cues (dB): ' + gr.join(', '));

fs.mkdirSync(path.join(ROOT, 'public/audio'), {recursive: true});
writeWav(path.join(ROOT, 'public/audio/score.wav'), out.L, out.R, SR);
if (process.argv.includes('--stems')) {
  fs.mkdirSync(path.join(ROOT, 'out/audio'), {recursive: true});
  for (const [b, st] of Object.entries(buses)) {
    const sl = st.L.map((v) => v * gain), sr = st.R.map((v) => v * gain);
    writeWav(path.join(ROOT, `out/audio/stem-${b}.wav`), sl, sr, SR);
  }
}
const took = Number(process.hrtime.bigint() - started) / 1e9;
console.log(`score.wav: ${(total / SR).toFixed(3)}s, ${lufs.toFixed(1)} LUFS, ${tp.toFixed(2)} dBTP, gain ${(20 * Math.log10(gain)).toFixed(1)} dB, rendered in ${took.toFixed(1)}s`);
