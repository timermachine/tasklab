#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_STRIPE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  02-run-sample-server.sh --project-root <dir> [--env-file <path>]

Runs a minimal local webhook server that:
  - verifies Stripe signatures using the raw body
  - does basic dedupe by event id (in-memory)

Open another terminal to run `stripe listen --forward-to http://localhost:<port><path>`.
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


# shellcheck disable=SC1091
source "$TASKLAB_STRIPE_SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"
tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_stripe "$ENV_FILE"

SAMPLE_DIR="$(cd "$TASKLAB_STRIPE_SCRIPT_DIR/../sample/node" && pwd)"
tasklab_script_npm_install_if_missing "$SAMPLE_DIR"

node "$SAMPLE_DIR/server.mjs"
