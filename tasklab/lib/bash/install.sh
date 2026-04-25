#!/usr/bin/env bash
set -euo pipefail

tasklab_core_notice_npm_install() {
  local dir="$1"
  local pkg="$dir/package.json"

  echo "Installing npm dependencies locally (project-only)..." >&2
  echo "- Working dir: $dir" >&2
  echo "- Command:     (cd \"$dir\" && npm install)" >&2

  if [[ -f "$pkg" ]] && command -v node >/dev/null 2>&1; then
    local deps
    deps="$(
      node -e '
        const fs = require("fs");
        const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const deps = Object.keys(pkg.dependencies || {}).sort();
        const dev = Object.keys(pkg.devDependencies || {}).sort();
        const fmt = (xs) => (xs.length ? xs.join(", ") : "(none)");
        console.error(`- deps:        ${fmt(deps)}`);
        console.error(`- devDeps:     ${fmt(dev)}`);
      ' "$pkg" 2>&1
    )"
    echo "$deps" >&2
  fi
}

