// Copyright (C) 2026 Charles Kennedy
// All rights reserved.
//
// 32x32 pixel sprites authored as character grids, in the spirit of classic
// roguelike tilesets. Each sprite is a stack of layers (later layers paint
// over earlier ones) and gets a one-pixel dark outline baked around it.

import {RGB, hex, makeCanvas, ctxOf, put} from './util';

type Def = {pal: Record<string, string>; layers: string[][]; outline: string};

const PLAYER: Def = {
  outline: '#0c0a08',
  pal: {
    H: '#eef2f6',
    s: '#b4bac4',
    S: '#7c8492',
    d: '#434956',
    v: '#07070a',
    g: '#d2ad62',
    G: '#8a6a30',
    r: '#a01e1c',
    R: '#5e0f10',
    b: '#6a4424',
    B: '#3a2414',
    w: '#f4f7fa',
    e: '#9aa4b2',
    p: '#d9cfb8',
    P: '#a0937a',
  },
  layers: [
    [
      '',
      '.....w',
      '....wwe',
      '....wwe.......dSSSSd',
      '....wwe......dsHHssSd',
      '....wwe......dsHsssSd',
      '....wwe......dvvvvvvd',
      '....wwe......dSsSsSSd',
      '....wwe.......dSSSSd',
      '....wwe...GgsSrrrrrSsgG',
      '....wwe...gsSdrrgrrdSsg',
      '....wwe..sSdSdrrgrrdSgggggggg',
      '....wwe.sSd.SdrrgrrdSgpprrppg',
      '....wwesSd..SdrrrrrdSgpprrppg',
      '..GgggggG...SdrrrrrdSgrrrrrrg',
      '.....sS.....SdrrgrrdSgpprrppg',
      '.....bS.....SdrrgrrdSgpprrpPg',
      '.....g......SGGgggGGSgpprrpPg',
      '............drrrrrrrd.gprrPg',
      '............dRrrrrrRd.gprrPg',
      '............dsSd.dsSd..grPg',
      '............dsSd.dsSd..gPPg',
      '............dHSd.dHSd...gg',
      '............dsSd.dsSd',
      '............dsSd.dsSd',
      '............dSSd.dSSd',
      '............dSSd.dSSd',
      '...........BbbbB.BbbbB',
      '...........BBBBB.BBBBB',
    ],
  ],
};

const SKELETON: Def = {
  outline: '#0a0806',
  pal: {
    W: '#f2ecd8',
    w: '#cfc5a8',
    u: '#8a8066',
    k: '#0b0907',
    e: '#ff4a22',
    m: '#8a6444',
    M: '#4e3624',
    s: '#a4a8ae',
    S: '#6a6e74',
  },
  layers: [
    [
      '',
      '',
      '............MmmmmmmM',
      '...........MmmmmmmmmM',
      '............wWWWWWww',
      '............WkkWWkkw',
      '............WkeWWekw',
      '............uwWWkWwu',
      '.............wkwkwkw',
      '..............uwwwu',
      '...............wu',
      '..........uwWWwwwwWWwu',
      '..........w..wwuwwu',
      '..........w....uw',
      '..........w..wwuwwu',
      '..........u....uw',
      '..........u...wwuwu',
      '..........w....uw',
      '.............uwWWwu',
      '.............wu..wu',
      '.............wu..wu',
      '.............wu..wu',
      '.............wu..wu',
      '.............WW..WW',
      '.............wu..wu',
      '.............wu..wu',
      '.............wu..wu',
      '.............wu..wu',
      '............wwu..wwu',
    ],
    [
      '........................S',
      '........................sW',
      '........................sW',
      '........................sm',
      '........................sW',
      '........................mW',
      '........................sW',
      '........................sW',
      '......................MmmmM',
      '.......................wWw',
      '......................w.M',
      '........................m',
    ],
    [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '.....MMMMM',
      '....MmmmmmM',
      '...MmmWmmmmM',
      '...MmmmSsmmM',
      '...MmmmssmmM',
      '...MmmmmmmuM',
      '....MmmmmuM',
      '.....MMMMM',
    ],
  ],
};

const RAT: Def = {
  outline: '#0a0806',
  pal: {
    f: '#7a6450',
    F: '#4a3a2e',
    h: '#a08a70',
    p: '#d49090',
    k: '#0a0806',
    e: '#ff5030',
  },
  layers: [
    [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '..........FF',
      '.........FpF.....FFFF',
      '.......FFffFFFFFFffffFF',
      '.....FFfffffffffffhhfffF',
      '...pFkefffffffffffhffffF',
      '....FffffffffffffffffffFF.....pp',
      '.....FFfffffffffffffffFFpp..pp',
      '......FFFFfFFFFFFFFfFFF..ppp',
      '.......pp..pp....pp.pp',
    ],
  ],
};

const GHOUL: Def = {
  outline: '#0a0708',
  pal: {
    q: '#968a96',
    Q: '#5a505e',
    z: '#c6bac2',
    k: '#0a0708',
    e: '#f0e89a',
    c: '#e0d8c0',
    l: '#3e3228',
    L: '#2a201a',
    t: '#e4dccc',
    r: '#7a1414',
  },
  layers: [
    [
      '',
      '',
      '',
      '',
      '.............QQQQ',
      '............QqzzqQ',
      '......QQQ..QqzzqqQ..QQQ',
      '.....QqzqQ.QkeqekQ.QqzqQ',
      '....QqzqqqQQqqQqqQQqqqzqQ',
      '....QqzqqqqQrtttrQqqqqzqQ',
      '...QqzqqqqqqQrrrQqqqqqqzqQ',
      '...QqqQqqqqqqQQQqqqqqQqqqQ',
      '..QqqQ.QqqqqqqqqqqqqqQ.QqqQ',
      '..QqqQ.QqqQqqQqqQqqqqQ.QqqQ',
      '..QqQ..QqqqqqqqqqqqqqQ..QqQ',
      '..QqQ...QqqQqqQqqQqqQ...QqQ',
      '..QqQ....QlllllllllQ....QqQ',
      '.QqqQ....lLllllllLll....QqqQ',
      '.QqqqQ...llLlllllLl....QqqqQ',
      'cQcQcQ...QqqQ..QqqQ....QcQcQc',
      'c.c.c....QqqQ..QqqQ....c.c.c',
      '.........QqqQ..QqqQ',
      '........QqqQ....QqqQ',
      '........QqqQ....QqqQ',
      '.......QqqQ......QqqQ',
      '.......QqqQ......QqqQ',
      '......QqqqQ......QqqqQ',
      '.....cQcQcQ......QcQcQc',
    ],
  ],
};

const DEFS = {player: PLAYER, skeleton: SKELETON, rat: RAT, ghoul: GHOUL};
export type SpriteKey = keyof typeof DEFS;

const build = (def: Def) => {
  const c = makeCanvas(32, 32);
  const ctx = ctxOf(c);
  const img = ctx.createImageData(32, 32);
  const pal: Record<string, RGB> = {};
  for (const k of Object.keys(def.pal)) pal[k] = hex(def.pal[k]);
  for (const layer of def.layers) {
    layer.forEach((row, y) => {
      for (let x = 0; x < Math.min(32, row.length); x++) {
        const col = pal[row[x]];
        if (col) put(img, x, y, col);
      }
    });
  }
  // Outline: any empty pixel touching a filled one.
  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < 32 && y < 32 && img.data[(y * 32 + x) * 4 + 3] === 255;
  const ol = hex(def.outline);
  const marks: [number, number][] = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)))
        marks.push([x, y]);
  for (const [x, y] of marks) put(img, x, y, ol, 250);
  ctx.putImageData(img, 0, 0);
  return c;
};

const cache = new Map<SpriteKey, HTMLCanvasElement>();

export const sprite = (key: SpriteKey) => {
  let c = cache.get(key);
  if (!c) {
    c = build(DEFS[key]);
    cache.set(key, c);
  }
  return c;
};
