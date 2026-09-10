#!/usr/bin/env bash
# Assembles dist/ — the exact set of files that should be public.
# An explicit allowlist, so repo tooling (the design source, the brief, the
# design runtime) can never leak onto the site by accident.
# There is no build step for development: run `node tools/pages.js` and serve
# the repo root directly.
set -euo pipefail
cd "$(dirname "$0")/.."

# Pages are generated, never hand-edited. Regenerate before assembling so dist/
# can never ship a stale page.
node tools/pages.js >/dev/null

rm -rf dist
mkdir -p dist

for f in index.html 404.html robots.txt sitemap.xml llms.txt vibecaddie.json \
         site.webmanifest _headers _redirects; do
  cp "$f" dist/
done

for d in assets .well-known how-it-works skills pricing privacy; do
  cp -R "$d" "dist/$d"
done

find dist -name '.DS_Store' -delete

# Cache busting. Asset filenames are not content-hashed in the repo, so a deploy
# alone cannot invalidate a cached CSS/JS file and visitors keep running the old
# one. Stamp each reference with a short content hash here; _headers can then
# cache /assets/*.css and *.js immutably because the URL changes when they do.
for f in vc.css vc-common.js vc-data.js; do
  h=$(shasum -a 256 "dist/assets/$f" | cut -c1-8)
  find dist -name '*.html' -exec sed -i '' "s|/assets/$f\"|/assets/$f?v=$h\"|g" {} +
done

# The README banner is for GitHub, not the site.
rm -f dist/assets/readme-banner.png

# Guard: repo tooling must never reach the site.
for leak in VibeCaddie.dc.html support.js BRIEF.md; do
  if find dist -name "$leak" | grep -q .; then
    echo "REFUSING: $leak leaked into dist/" >&2; exit 1
  fi
done

echo "dist/ assembled:"
find dist -type f | sed 's|^dist/|  |' | sort
echo "  ($(find dist -type f | wc -l | tr -d ' ') files)"
