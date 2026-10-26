#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT
DIST_DIR="$PROJECT_DIR/dist"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-}"

/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p mkdir -p "$PROJECT_DIR/data"

if [[ -n "$OPENCODE_WEB_DIR" ]]; then
  /usr/bin/time -p mkdir -p "$OPENCODE_WEB_DIR"
  /usr/bin/time -p node -e 'const fs = require("node:fs"); const [file, project, directory] = process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({ project, directory }))' "$OPENCODE_WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$DIST_DIR"
fi

if [[ ! -d "$PROJECT_DIR/node_modules/vite" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
fi

/usr/bin/time -p npm run build
exec /usr/bin/time -p node "$PROJECT_DIR/server.mjs"
