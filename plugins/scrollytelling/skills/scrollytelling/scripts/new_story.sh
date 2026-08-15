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
VER="$(grep -o '"version": *"[0-9.]*"' "$KIT/../../.claude-plugin/plugin.json" 2>/dev/null | grep -o '[0-9.]*' | head -1)"
LATEST="$(curl -s --max-time 5 https://raw.githubusercontent.com/anriueno/scrollytelling-kit/main/plugins/scrollytelling/.claude-plugin/plugin.json 2>/dev/null | grep -o '"version": *"[0-9.]*"' | grep -o '[0-9.]*' | head -1)"
echo "engine version: ${VER:-unknown}${LATEST:+ (latest published: $LATEST)}"
if [ -n "$VER" ] && [ -n "$LATEST" ] && [ "$VER" != "$LATEST" ]; then echo "NOTE: your installed plugin is $VER but $LATEST is published — run /plugin marketplace update, then reinstall scrollytelling@scrollytelling-kit, to get the newer engine (themes, inline editor, ?step=)."; fi
echo "Scaffolded $TARGET. Next: cut CSVs into $TARGET/public/data/, write public/story.json, then: cd $TARGET && npm install && npm run dev"
