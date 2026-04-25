#!/usr/bin/env bash
set -euo pipefail

tasklab_snyk_check() {
  local dir="$1"

  if ! command -v snyk >/dev/null 2>&1; then
    echo "WARNING: snyk not found — skipping vulnerability check." >&2
    echo "  Install: npm install -g snyk && snyk auth" >&2
    echo "  Docs: https://docs.snyk.io/snyk-cli/getting-started-with-the-snyk-cli" >&2
    return 0
  fi

  local snyk_file=""
  if [[ -f "$dir/pnpm-lock.yaml" ]]; then
    snyk_file="pnpm-lock.yaml"
  elif [[ -f "$dir/package-lock.json" ]]; then
    snyk_file="package-lock.json"
  elif [[ -f "$dir/yarn.lock" ]]; then
    snyk_file="yarn.lock"
  elif [[ -f "$dir/package.json" ]]; then
    snyk_file="package.json"
  fi

  if [[ -z "$snyk_file" ]]; then
    echo "WARNING: No package manifest found in $dir — skipping snyk check." >&2
    return 0
  fi

  echo "Running snyk security check..." >&2
  echo "  Command: snyk test --file=$snyk_file" >&2
  echo "  Location: $dir" >&2

  if ! (cd "$dir" && snyk test --file="$snyk_file"); then
    echo >&2
    echo "snyk found vulnerabilities in $dir." >&2
    echo "  Review the report above before proceeding." >&2
    echo "  To skip (not recommended): set TASKLAB_SNYK_SKIP=1" >&2
    if [[ "${TASKLAB_SNYK_SKIP:-0}" == "1" ]]; then
      echo "  TASKLAB_SNYK_SKIP=1 — continuing despite vulnerabilities." >&2
      return 0
    fi
    return 1
  fi

  echo "snyk OK: $dir" >&2
}

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

