// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import timelineJson from './timeline.json';

export const timeline = timelineJson;
export type SceneKey = keyof typeof timelineJson.scenes;
export const cues = timelineJson.cues;

export const FPS = timelineJson.fps;
export const WIDTH = timelineJson.width;
export const HEIGHT = timelineJson.height;

// Shared palette. Scenes can add their own local colors, but should lean on these
// so the film reads as one piece: soot blacks, bone, tarnished gold, ember, blood.
export const palette = {
  black: '#050304',
  soot: '#0d0a0b',
  ash: '#2a2426',
  stone: '#4a4446',
  bone: '#d9cfb8',
  parchment: '#e8d9b0',
  parchmentDark: '#b89a62',
  ink: '#2a1a10',
  gold: '#c9a45c',
  goldBright: '#f1d48a',
  ember: '#ff7a2a',
  emberDeep: '#c23a0c',
  blood: '#8a0f12',
  bloodBright: '#d42a1c',
  dusk: '#3a1f3d',
  duskOrange: '#e0703a',
  moon: '#b9c7d9',
  zonai: '#5dffb0',
  zonaiDeep: '#1f8f6a',
  night: '#0b1020',
};
