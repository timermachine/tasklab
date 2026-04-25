#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
TASKLAB_SHELLY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  02-install-deps.sh --project-root <dir>

Runs pnpm install in the Shelly project root.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$TASKLAB_SHELLY_SCRIPT_DIR/_lib/env.sh"

if [[ ! -d "$PROJECT_ROOT" ]]; then
  echo "Project root not found: $PROJECT_ROOT" >&2
  echo "Clone Shelly first: git clone https://github.com/RYOITABASHI/Shelly \"$PROJECT_ROOT\"" >&2
  exit 1
fi

tasklab_snyk_check "$PROJECT_ROOT"

echo "Installing dependencies in $PROJECT_ROOT ..."
echo "  Command: pnpm install"
echo "  Location: $PROJECT_ROOT"
echo

(cd "$PROJECT_ROOT" && pnpm install)

echo
echo "pnpm install OK: $PROJECT_ROOT"
