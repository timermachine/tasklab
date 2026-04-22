#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_ROOT=""
TEMPLATE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="${2:-}"; shift 2 ;;
    --template)
      TEMPLATE="${2:-}"; shift 2 ;;
    *)
      echo "Unexpected argument: $1" >&2
      exit 2 ;;
  esac
done

bash "$OUTPUTS_DIR/tests/smoke.sh"
bash "$OUTPUTS_DIR/tests/check-env-example.sh"
bash "$OUTPUTS_DIR/tests/check-types-file.sh"

if [[ -n "$PROJECT_ROOT" || -n "$TEMPLATE" ]]; then
  if [[ -z "$PROJECT_ROOT" || -z "$TEMPLATE" ]]; then
    echo "If using --project-root, you must also provide --template next|edge." >&2
    exit 2
  fi
  bash "$OUTPUTS_DIR/tests/check-installed-scaffold.sh" --project-root "$PROJECT_ROOT" --template "$TEMPLATE"
fi
