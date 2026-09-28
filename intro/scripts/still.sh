#!/usr/bin/env bash
# Render one full-resolution frame of a scene (scene-relative frame).
#   scripts/still.sh cathedral out/cath-432.png 432
set -euo pipefail
cd "$(dirname "$0")/.."
npx remotion still "src/dev/$1.tsx" Scene "$2" --frame="$3" --log=error
echo "wrote $2"
