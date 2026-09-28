// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Fonts are vendored in public/fonts so renders never touch the network.
export const fonts = {
  // Inscriptions, titles, location names.
  cinzel: 'Cinzel',
  // The big game title.
  cinzelDecorative: 'Cinzel Decorative',
  // Merlin's handwriting and old-print flavour text.
  fell: 'IM Fell English',
  // Narration subtitles.
  cormorant: 'Cormorant Garamond',
  // Blackletter accents (use sparingly).
  fraktur: 'UnifrakturMaguntia',
  // Roguelike UI and message log.
  mono: 'DejaVu Sans Mono',
};

const faces: {family: string; file: string; weight?: string; style?: string}[] = [
  {family: fonts.cinzel, file: 'cinzel-400.woff2', weight: '400'},
  {family: fonts.cinzel, file: 'cinzel-700.woff2', weight: '700'},
  {family: fonts.cinzelDecorative, file: 'cinzel-decorative-700.woff2', weight: '700'},
  {family: fonts.fell, file: 'im-fell-english.woff2', weight: '400', style: 'normal'},
  {family: fonts.fell, file: 'im-fell-english-italic.woff2', weight: '400', style: 'italic'},
  {family: fonts.cormorant, file: 'cormorant-500.woff2', weight: '500', style: 'normal'},
  {family: fonts.cormorant, file: 'cormorant-italic-500.woff2', weight: '500', style: 'italic'},
  {family: fonts.fraktur, file: 'unifraktur.woff2', weight: '400'},
  {family: fonts.mono, file: 'dejavu-sans-mono.ttf', weight: '400'},
  {family: fonts.mono, file: 'dejavu-sans-mono-bold.ttf', weight: '700'},
];

let loaded: Promise<unknown> | null = null;

export const ensureFonts = () => {
  if (!loaded) {
    loaded = Promise.all(
      faces.map((f) =>
        loadFont({
          family: f.family,
          url: staticFile(`fonts/${f.file}`),
          weight: f.weight,
          style: f.style,
        }),
      ),
    );
  }
  return loaded;
};

ensureFonts();
