#!/usr/bin/env bash
# Scaffold a new scrollytelling project from the engine template.
# Usage: new_story.sh <target-dir> [data.csv ...]
set -euo pipefail
KIT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:?target dir}"; shift || true
mkdir -p "$TARGET"
rsync -a --exclude node_modules --exclude dist --exclude 'public/data/*.csv' --exclude public/story.json "$KIT/template/" "$TARGET/"
mkdir -p "$TARGET/public/data" "$TARGET/data/raw"
for f in "$@"; do [ "$(cd "$(dirname "$f")" && pwd)/$(basename "$f")" = "$(cd "$TARGET/data/raw" && pwd)/$(basename "$f")" ] || cp "$f" "$TARGET/data/raw/"; done
cat > "$TARGET/public/story.json" <<'JSON'
{ "title": "Untitled story", "kicker": "A data story", "subtitle": "", "sourceNote": "", "theme": { "accent": "#f0a640" }, "data": {}, "scenes": [], "footerTitle": "Method & sources", "footerHtml": "<p></p>" }
JSON
echo "Scaffolded $TARGET. Next: cut CSVs into $TARGET/public/data/, write public/story.json, then: cd $TARGET && npm install && npm run dev"
