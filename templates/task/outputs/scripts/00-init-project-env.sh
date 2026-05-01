#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_ROOT="."
ENV_FILE=""
FORCE=false

usage() {
  cat >&2 <<'EOF'
Usage:
  00-init-project-env.sh --project-root <dir> [--env-file <path>] [--force]

What it does:
  - Copies `outputs/env/.env.example` into your project as `.env` (gitignored)
  - Skip if .env already exists (use --force to overwrite)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file)     ENV_FILE="${2:-}"; shift 2 ;;
    --force)        FORCE=true; shift ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

TEMPLATE="$OUTPUTS_DIR/env/.env.example"
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing env template: $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$PROJECT_ROOT"

if [[ -f "$ENV_FILE" && "$FORCE" != "true" ]]; then
  echo "Env file already exists: $ENV_FILE (skip — already configured)"
  echo "Re-run with --force to overwrite."
  exit 0
fi

cp -p "$TEMPLATE" "$ENV_FILE"
echo "Created: $ENV_FILE"
echo "Edit it to fill in the required values, then run 01-preflight.sh."
