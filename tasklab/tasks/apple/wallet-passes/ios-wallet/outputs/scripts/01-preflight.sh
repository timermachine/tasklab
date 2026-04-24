#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir>

Checks:
  - project root exists
  - python3 available
  - openssl available
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

if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "Missing project root dir: $PROJECT_ROOT" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Missing python3." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "Missing openssl." >&2
  exit 1
fi

echo "Preflight OK."
python3 --version
openssl version

ENV_FILE="$PROJECT_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/_lib/env.sh"
  tasklab_env_source "$ENV_FILE"
else
  echo "Note: missing $ENV_FILE (run 00-init-project-env.sh and set required values)." >&2
fi
