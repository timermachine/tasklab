#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_STRIPE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  99-run-tests.sh --project-root <dir> [--env-file <path>]

Runs a local signature + replay smoke test using your STRIPE_WEBHOOK_SECRET.
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

# shellcheck disable=SC1091
source "$TASKLAB_STRIPE_SCRIPT_DIR/_lib/env.sh"
tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_stripe "$ENV_FILE"

SAMPLE_DIR="$(cd "$TASKLAB_STRIPE_SCRIPT_DIR/../sample/node" && pwd)"
if [[ ! -d "$SAMPLE_DIR/node_modules" ]]; then
  tasklab_snyk_check "$SAMPLE_DIR"
  tasklab_core_notice_npm_install "$SAMPLE_DIR" "ci"
  (cd "$SAMPLE_DIR" && npm ci)
  echo "npm ci OK: $SAMPLE_DIR" >&2
fi

node "$SAMPLE_DIR/smoke.mjs"
