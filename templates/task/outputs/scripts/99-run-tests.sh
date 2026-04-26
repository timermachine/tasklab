#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  99-run-tests.sh --project-root <dir> [--env-file <path>]

Smoke tests for {{SLUG}}.
Requires the service to be configured and accessible.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file)     ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"
tasklab_env_source_file "$ENV_FILE"

PASS=0
FAIL=0

check() {
  local label="$1"
  local result="$2"  # "ok" or anything else = failure
  if [[ "$result" == "ok" ]]; then
    echo "  ✓  $label"
    ((PASS++)) || true
  else
    echo "  ✗  $label — $result"
    ((FAIL++)) || true
  fi
}

echo ""
echo "Running smoke tests for {{SLUG}}..."
echo ""

# TODO: add smoke tests
# Example:
# check "API key is set" "$([ -n "${{{SERVICE_UPPER}}_API_KEY:-}" ] && echo ok || echo 'missing {{SERVICE_UPPER}}_API_KEY')"

check "TODO: test name" "ok"  # replace with real test

echo ""
echo "Results: $PASS passed, $FAIL failed"
echo ""
[[ $FAIL -eq 0 ]] || exit 1
