#!/usr/bin/env bash
# One command: patch the build, generate the blog, validate.
#   ./apply-all.sh <build-output-dir>
set -e
DIR="${1:-dist}"
HERE="$(cd "$(dirname "$0")" && pwd)"
echo "=== 1/3 patch (password, email, cf-email, h1) ==="
python3 "$HERE/site/patch-build.py" "$DIR"
echo
echo "=== 2/3 build blog pages ==="
python3 "$HERE/site/build-blog.py" "$DIR"
echo
echo "=== 3/3 validate ==="
node "$HERE/fix-pack/scripts/seo-validate.mjs" --dist "$DIR"
