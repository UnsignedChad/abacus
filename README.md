# Clogheen — Intro

The cinematic intro for **Clogheen**: 1920×1080, 30 fps, 1:45.

**Watch it:** [`clogheen-intro.mp4`](clogheen-intro.mp4)

Your old friend Merlin has written asking for help. Something festers beneath the town of Clogheen. You arrive at dusk and steel yourself for what comes next.

| Time | Scene | |
|---|---|---|
| 0:00 | Letter | A candle is lit, Merlin's letter writes itself, and a gust snuffs the flame |
| 0:20 | Road | A hooded traveler walks the dusk road toward Clogheen |
| 0:33 | Town | A low-res isometric village square, with the old church glowing red |
| 0:48 | Steel | Heartbeats and a drawn blade: "You steel yourself for what comes next." |
| 0:56 | Depths | A tile-based roguelike crawl beneath the church, then ancient green runes open onto an abyss |
| 1:08 | Cathedral | A knight against the Skeleton King: a dodge roll, a slow-motion parry, a riposte, a falling crown |
| 1:32 | Title | CLOGHEEN, *Beneath the Old Church*, and "Merlin is waiting." |

## How it's made

Everything is generated from code with [Remotion](https://www.remotion.dev) (React + TypeScript). No images, footage or audio samples are used. The picture is drawn with SVG, CSS and canvas. The soundtrack is synthesized in plain Node.js: a Karplus-Strong guitar, additive bells, formant choir, organ, drums and a reverb.

`src/timeline.json` is the single source of timing. Every scene and every sound reads its cue frames from this file, so the picture and audio stay in sync. For example, the parry spark and the clang both land on frame 2472.

```
src/
  timeline.json     scene ranges and cue frames (the sync contract)
  theme.ts          palette + typed access to the timeline
  fonts.ts          vendored fonts (public/fonts)
  lib/fx.tsx        shared film grain, vignette, letterbox, fog, embers, narration, shake
  scenes/           one component per scene, with its parts in a matching folder
  dev/              isolated per-scene entry points for fast previews
  tools/            contact-sheet renderer used for review
scripts/
  make-audio.mjs    renders public/audio/score.wav from the timeline
  analyze-audio.mjs loudness, peaks, and per-cue onset/silence checks
  audio/            DSP toolkit, instruments, and one score file per scene
  sheet.sh, still.sh, clip.sh   preview helpers
```

## Rendering

Requires Node 18+.

```sh
npm install
npm run render          # synthesizes the soundtrack, then writes out/clogheen-intro.mp4
npm run studio          # interactive preview in the browser
npm run audio           # just regenerate public/audio/score.wav (about 20 s)
npm run analyze-audio   # loudness, peaks, and a per-cue onset report
```

Preview a single scene without bundling the others:

```sh
scripts/sheet.sh cathedral out/cath.png 0 120 300 432 500 620   # grid of frames
scripts/still.sh cathedral out/parry.png 432                     # one frame
```

To retime something, edit `src/timeline.json` and re-render; the soundtrack follows automatically.

## Credits and licenses

© 2026 Charles Kennedy. All rights reserved.

- Fonts: Cinzel, Cinzel Decorative, IM Fell English, Cormorant Garamond and UnifrakturMaguntia are licensed under the SIL Open Font License 1.1. DejaVu Sans Mono is under the Bitstream Vera / DejaVu license.
- Remotion is free for individuals and for companies with up to 3 employees; larger teams need a [company license](https://www.remotion.dev/license).
