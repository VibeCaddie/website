#!/usr/bin/env bash
# Regenerates every raster asset from tools/og-render.html and assets/favicon.svg
# using headless Chrome. ImageMagick cannot rasterize these correctly (CSS
# gradients, webfonts, SVG transforms), so Chrome does the work.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

shoot() { # src w h out [scale]
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor="${5:-1}" --window-size="$2,$3" \
    --virtual-time-budget=12000 --screenshot="$4" "$1" >/dev/null 2>&1
}
urlenc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }

card() { # out kicker title sub
  shoot "file://$ROOT/tools/og-render.html?k=$(urlenc "$2")&t=$(urlenc "$3")&s=$(urlenc "$4")" \
    1200 630 "$ROOT/assets/$1"
}

shoot "file://$ROOT/tools/og-render.html" 1200 630 "$ROOT/assets/og.png"

card og-how-it-works.png "How it works" "Three steps, and none <em>is configuration.</em>" \
  "Point it at a repo. The agent picks its skills. You get a ranked report."
card og-skills.png "Review skills" "The caddie <em>picks the club.</em>" \
  "Twelve review skills. The agent loads only the ones your codebase needs."
card og-pricing.png "Credits" "Prepaid. One run <em>is 12 credits.</em>" \
  "No subscription, credits do not expire. Planned pricing, nothing on sale yet."
card og-privacy.png "Privacy" "It reads your code. <em>Here is what happens to it.</em>" \
  "Read-only. No copy of your repository kept. Never used to train a model."

# README banner, rendered at 2x so it stays crisp on retina.
shoot "file://$ROOT/tools/banner-render.html" 1280 400 "$ROOT/assets/readme-banner.png" 2

# Icon: Chrome ignores window widths under ~500px, so render at 512 and downscale.
cat > "$TMP/icon.html" <<HTML
<!DOCTYPE html><meta charset="utf-8">
<style>html,body{margin:0;background:#0a0c0b;width:512px;height:512px}
svg{display:block;width:512px;height:512px}</style>
$(cat "$ROOT/assets/favicon.svg")
HTML
shoot "file://$TMP/icon.html" 512 512 "$TMP/icon512.png"
cp "$TMP/icon512.png" "$ROOT/assets/icon-512.png"
sips -z 180 180 "$TMP/icon512.png" --out "$ROOT/assets/apple-touch-icon.png" >/dev/null

for f in readme-banner.png og.png og-how-it-works.png og-skills.png og-pricing.png og-privacy.png icon-512.png apple-touch-icon.png; do
  printf '%-26s %s\n' "$f" "$(sips -g pixelWidth -g pixelHeight "$ROOT/assets/$f" 2>/dev/null | tail -2 | tr -d ' \n')"
done
