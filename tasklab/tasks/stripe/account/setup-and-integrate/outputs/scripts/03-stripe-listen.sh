#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_STRIPE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  03-stripe-listen.sh --project-root <dir> [--env-file <path>]

Runs:
  stripe listen --forward-to http://localhost:<port><path>

Notes:
  - You may need to run `stripe login` once.
  - Copy only the `whsec_...` part from CLI output (ignore any terminal formatting).
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
tasklab_script_require_command "stripe" "Missing Stripe CLI (stripe). Install it or use the Dashboard/Workbench delivery tester."
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"
tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_stripe_account "$ENV_FILE"

: "${STRIPE_WEBHOOK_PORT:=4242}"
: "${STRIPE_WEBHOOK_PATH:=/webhook}"

FORWARD_TO="http://localhost:${STRIPE_WEBHOOK_PORT}${STRIPE_WEBHOOK_PATH}"
echo "Forwarding Stripe webhooks to: $FORWARD_TO" >&2
echo "If you haven't logged in, run: stripe login" >&2
echo
stripe listen --forward-to "$FORWARD_TO"

