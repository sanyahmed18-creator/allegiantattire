#!/usr/bin/env bash
# Apply the checked-in static-site patches, regenerate the blog pages/sitemap,
# and validate the deployable site.
# Usage: ./apply-all.sh [site-root]
# Example from this repository: ./apply-all.sh .
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:-$HERE}"

echo "=== 1/4 patch shipped JS/HTML assets ==="
python3 "$HERE/scripts/patch-build.py" "$DIR"

echo
echo "=== 2/4 regenerate static blog pages and sitemap ==="
python3 "$HERE/scripts/build-blog.py" "$DIR"

echo
echo "=== 3/4 check JavaScript syntax ==="
node --check "$DIR/custom.js"
found_bundle=0
for bundle in "$DIR"/assets/index-*.js; do
  [[ -f "$bundle" ]] || continue
  found_bundle=1
  node --check "$bundle"
done
[[ "$found_bundle" -eq 1 ]] || { echo "No assets/index-*.js bundle found in $DIR" >&2; exit 1; }

echo
echo "=== 4/4 validate deployable HTML and crawl files ==="
node "$HERE/scripts/seo-validate.mjs" --dist "$DIR"
