#!/usr/bin/env bash
# Rebuild every homepage screen image into public/images/screens/.
# All screens share one size, so they crossfade pixel for pixel.
# Needs: ImageMagick 7, Chrome, and node_modules (for the hand render).
#   nix-shell -p imagemagick --run scripts/make-art.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PHOTO=assets/IMG_2721.jpeg
OUT=public/images/screens
CHROME="${CHROME:-google-chrome-stable}"
mkdir -p "$OUT" assets/renders

# Render the hand (white wireframe on black) at its starting pose
if curl -s -o /dev/null localhost:4173; then
  echo "port 4173 is already in use; stop whatever is on it first" >&2
  exit 1
fi
node_modules/.bin/vite --port 4173 --strictPort >/dev/null 2>&1 &
DEV=$!
trap 'kill $DEV 2>/dev/null || true' EXIT
until curl -s -o /dev/null localhost:4173; do sleep 0.5; done
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1440,1080 --virtual-time-budget=15000 \
  --screenshot=assets/renders/hand-raw.png http://localhost:4173/render-hand.html 2>/dev/null
curl -sf -o /dev/null localhost:4173/render-hand.html || { echo "hand render page not served" >&2; exit 1; }
# Padded to 4:3 so the model sits a little above centre with room around it on any
# screen shape. The homepage lines its live 3D view up with this: see HAND_RECT in src/main.js
magick assets/renders/hand-raw.png \
  -background black -gravity center -extent 2640x1980 assets/renders/hand.png

# The opening farm screen keeps 8 colours pooled from the photo; the rest are
# greyscale, with the one accent colour lighting up the project renders
# (keep in sync with --accent in public/style.css)
PHOTO_STYLE=(--mono 6 --contrast 1.05 --spread 40)
RENDER_STYLE=(--mono 4 --accent '#3d7bff' --accent-above 0.45 --spread 40)
python3 -I scripts/dither.py "$PHOTO" "$OUT/farm.png" --colours 8
python3 -I scripts/dither.py "$PHOTO" "$OUT/cows.png" "${PHOTO_STYLE[@]}" --crop 1600x1200+2100+900
python3 -I scripts/dither.py assets/renders/hand.png "$OUT/hand.png" "${RENDER_STYLE[@]}"
python3 -I scripts/characteristics.py "$OUT/characteristics.png"

# Full-res versions shown behind the write-ups (same framing as their screen image)
magick "$PHOTO" -auto-orient -strip -crop 1600x1200+2100+900 +repage -colorspace Gray \
  -quality 78 "$OUT/cows-full.jpg"
