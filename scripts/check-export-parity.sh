#!/usr/bin/env bash
# Re-renders the frames stored in out/baseline and compares them by PSNR.
# md5 is too strict: headless GPU raster occasionally flips a single anti-aliased pixel.
set -euo pipefail
cd "$(dirname "$0")/.."
frames=$(cd out/baseline && ls f*.png | sed -E 's/^f0*([0-9]+)\.png$/\1/' | paste -sd,)
ONLY="$frames" BLUR=1 node render.mjs >/dev/null
fail=0
for f in out/baseline/*.png; do
  psnr=$(ffmpeg -hide_banner -i "$f" -i "out/frames/$(basename "$f")" -filter_complex psnr -f null - 2>&1 | grep -oE 'average:[0-9.inf]+' | cut -d: -f2)
  ok=$(awk -v p="$psnr" 'BEGIN { print (p == "inf" || p + 0 >= 60) ? "OK" : "FAIL" }')
  [ "$ok" = FAIL ] && fail=1
  echo "$(basename "$f") psnr=$psnr $ok"
done
exit $fail
