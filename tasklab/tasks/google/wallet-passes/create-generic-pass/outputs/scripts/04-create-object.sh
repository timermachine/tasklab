#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""

usage() {
  cat >&2 <<'EOF'
Usage:
  04-create-object.sh --project-root <dir> [--env-file <path>]

Creates (or upserts) a Generic pass object via REST.
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

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

CLASS_ID="${CLASS_ID:-${ISSUER_ID}.${CLASS_SUFFIX:-tasklab_generic}}"
OBJECT_ID="${OBJECT_ID:-${ISSUER_ID}.${OBJECT_SUFFIX:-demo_001}}"
export CLASS_ID OBJECT_ID

SAMPLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../sample/node" && pwd)"
(cd "$SAMPLE_DIR" && node createObject.mjs)

