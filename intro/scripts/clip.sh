#!/usr/bin/env bash
# Render a range of a scene to MP4 (no audio) and report the time taken.
#   scripts/clip.sh cathedral out/cath.mp4 400-480
set -euo pipefail
cd "$(dirname "$0")/.."
start=$(date +%s)
npx remotion render "src/dev/$1.tsx" Scene "$2" --frames="$3" --log=error --concurrency=2
echo "wrote $2 in $(( $(date +%s) - start ))s"
