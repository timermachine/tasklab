#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""

usage() {
  cat >&2 <<'EOF'
Usage:
  00-init-project-env.sh --project-root <dir>

What it does:
  - Copies `<project-root>/.env.example` to `<project-root>/.env` if `.env` does not exist.
  - Does not overwrite an existing `.env`.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ROOT" ]]; then
  echo "Missing --project-root." >&2
  usage
  exit 1
fi

EXAMPLE_FILE="$PROJECT_ROOT/.env.example"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$EXAMPLE_FILE" ]]; then
  echo "Missing $EXAMPLE_FILE. Run 00-install-scaffold.sh first." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "Exists (skip): $ENV_FILE"
  exit 0
fi

cp -p "$EXAMPLE_FILE" "$ENV_FILE"
echo "Created: $ENV_FILE"
echo "Next: edit $ENV_FILE and set PASS_TYPE_IDENTIFIER + TEAM_IDENTIFIER (and cert paths for signing)."

