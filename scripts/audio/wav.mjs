// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

// 16-bit PCM WAV read/write. Writing applies deterministic TPDF dither, but
// exact digital silence stays exactly zero.

import fs from 'node:fs';
import {rng} from './dsp.mjs';

export const writeWav = (path, L, R, sr, {seed = 99} = {}) => {
  const n = L.length;
  const data = Buffer.alloc(n * 4);
  const r = rng(seed);
  const q = (x) => {
    const d = (r() - r()) / 32768;
    if (x === 0) return 0;
    const v = Math.round((x + d) * 32767);
    return v > 32767 ? 32767 : v < -32768 ? -32768 : v;
  };
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(q(L[i]), i * 4);
    data.writeInt16LE(q(R[i]), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path, Buffer.concat([h, data]));
};

export const readWav = (path) => {
  const b = fs.readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = {format: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22)};
    if (id === 'data') data = b.subarray(p + 8, p + 8 + len);
    p += 8 + len + (len & 1);
  }
  if (!fmt || !data || fmt.format !== 1 || fmt.bits !== 16) throw new Error('expected 16-bit PCM');
  const n = Math.floor(data.length / (2 * fmt.ch));
  const chans = Array.from({length: fmt.ch}, () => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < fmt.ch; c++) chans[c][i] = data.readInt16LE((i * fmt.ch + c) * 2) / 32768;
  }
  return {sr: fmt.sr, channels: chans, n};
};
