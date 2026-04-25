#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  02b-smoke-wallet-api.sh --project-root <dir> [--env-file <path>]

What it does:
  - Loads your project `.env`
  - Fetches an access token (service account key)
  - Calls Wallet Objects REST:
      - GET /walletobjects/v1/issuer   (list issuers shared to caller)
      - GET /walletobjects/v1/issuer/{ISSUER_ID}

Success:
  - Prints a small JSON blob with issuerId + name.
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
source "$SCRIPT_DIR/_lib/env.sh"
tasklab_env_source "$ENV_FILE"
tasklab_env_resolve_paths "$PROJECT_ROOT"

if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  echo "Missing GOOGLE_APPLICATION_CREDENTIALS in $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
  echo "GOOGLE_APPLICATION_CREDENTIALS does not exist: $GOOGLE_APPLICATION_CREDENTIALS" >&2
  exit 1
fi

SAMPLE_DIR="$(cd "$SCRIPT_DIR/../sample/node" && pwd)"

if [[ ! -d "$SAMPLE_DIR/node_modules" ]]; then
  tasklab_snyk_check "$SAMPLE_DIR"
  tasklab_core_notice_npm_install "$SAMPLE_DIR"
  (cd "$SAMPLE_DIR" && npm install)
  echo "npm install OK: $SAMPLE_DIR" >&2
fi

node "$SAMPLE_DIR/smokeWalletApi.mjs"
