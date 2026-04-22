#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  05-generate-save-url.sh --project-root <dir> [--env-file <path>]

Generates a "Save to Google Wallet" URL (JWT signed with your service account key).
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
tasklab_env_validate "$ENV_FILE"

CLASS_ID="${CLASS_ID:-${ISSUER_ID}.${CLASS_SUFFIX:-tasklab_generic}}"
OBJECT_ID="${OBJECT_ID:-${ISSUER_ID}.${OBJECT_SUFFIX:-demo_001}}"
export CLASS_ID OBJECT_ID

SAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../sample/node" && pwd)"
(cd "$SAMPLE_DIR" && node generateSaveUrl.mjs)
