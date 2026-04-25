#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_STRIPE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir> [--env-file <path>]

Checks:
  - Node and npm are available
  - .env exists and contains required keys
  - Stripe CLI availability (optional)
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

echo "Node: $(command -v node || echo 'missing')"
echo "npm:  $(command -v npm || echo 'missing')"
echo -n "Stripe CLI: "
if command -v stripe >/dev/null 2>&1; then
  echo "yes ($(command -v stripe))"
else
  echo "no (optional)"
fi
echo

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it with: bash $TASKLAB_STRIPE_SCRIPT_DIR/00-init-project-env.sh --project-root \"$PROJECT_ROOT\"" >&2
  exit 1
fi

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_stripe "$ENV_FILE"
tasklab_env_need "$ENV_FILE" "STRIPE_WEBHOOK_PORT"
tasklab_env_need "$ENV_FILE" "STRIPE_WEBHOOK_PATH"
tasklab_env_need "$ENV_FILE" "STRIPE_WEBHOOK_SECRET"

echo "Preflight OK"
