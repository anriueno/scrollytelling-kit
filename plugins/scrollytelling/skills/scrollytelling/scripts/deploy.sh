#!/usr/bin/env bash
# deploy.sh — build a story project and deploy it to Vercel (free tier) as a public static site.
# Usage: bash scripts/deploy.sh <project-dir> [project-name]
set -euo pipefail
DIR="${1:?project dir}"; NAME="${2:-$(basename "$(cd "$DIR" && pwd)")}"
cd "$DIR"
if ! command -v vercel >/dev/null 2>&1 && ! npx --no-install vercel --version >/dev/null 2>&1; then
  echo "Vercel CLI not found. Install with: npm i -g vercel   (then: vercel login)"; exit 1
fi
V="$(command -v vercel || echo 'npx vercel')"
if ! $V whoami >/dev/null 2>&1; then echo "Not logged in to Vercel. Run: $V login   (opens a browser; free account)"; exit 1; fi
[ -d node_modules ] || npm install
npm run build
# Deploy the built static site; Vercel detects Vite. --yes accepts defaults; --name sets the project.
$V --prod --yes --name "$NAME" 2>&1 | tail -20
echo
echo "Stable URL: https://$NAME.vercel.app  (redeploying updates the same URL; delete at https://vercel.com/dashboard)"
