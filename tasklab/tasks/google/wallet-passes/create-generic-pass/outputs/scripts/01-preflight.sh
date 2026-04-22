#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir> [--env-file <path>]

Checks:
  - Node and npm are available
  - .env exists and contains required keys
  - GOOGLE_APPLICATION_CREDENTIALS points to an existing JSON file
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

echo "Node: $(command -v node || echo 'missing')"
echo "npm:  $(command -v npm || echo 'missing')"
echo

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it by copying outputs/env/.env.example to your project root as .env (gitignored)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

need() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key (in $ENV_FILE)" >&2
    exit 1
  fi
}

need "ISSUER_ID"
need "GOOGLE_APPLICATION_CREDENTIALS"
need "PASS_TITLE"

if [[ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
  echo "GOOGLE_APPLICATION_CREDENTIALS does not exist: $GOOGLE_APPLICATION_CREDENTIALS" >&2
  exit 1
fi

echo "Preflight OK"

