#!/usr/bin/env bash
# Render a labelled contact sheet of one scene (scene-relative frames), or of
# the whole film with scene "full" (absolute frames).
#   scripts/sheet.sh cathedral out/cath.png 0 120 300 432 500 620 [--cols=3]
set -euo pipefail
cd "$(dirname "$0")/.."
scene=$1; out=$2; shift 2
cols=3; frames=()
for a in "$@"; do
  case $a in --cols=*) cols=${a#--cols=} ;; *) frames+=("$a") ;; esac
done
list=$(IFS=,; echo "${frames[*]}")
if [ "$scene" = full ]; then
  npx remotion still src/index.ts ContactSheet "$out" --props="{\"scene\":\"full\",\"frames\":[$list],\"cols\":$cols}" --log=error
else
  npx remotion still "src/dev/$scene.tsx" Sheet "$out" --props="{\"frames\":[$list],\"cols\":$cols}" --log=error
fi
echo "wrote $out"
