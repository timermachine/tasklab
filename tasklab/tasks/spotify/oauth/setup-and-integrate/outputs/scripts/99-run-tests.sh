#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  99-run-tests.sh --project-root <dir> [--env-file <path>]

Runs:
  1. smoke-profile.mjs — GET /v1/me with current access token
  2. smoke-refresh.mjs — refresh token cycle + second GET /v1/me

Both must pass for exit 0.
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
source "$TASKLAB_SPOTIFY_SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

SAMPLE_DIR="$(cd "$TASKLAB_SPOTIFY_SCRIPT_DIR/../sample/node" && pwd)"

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_spotify "$ENV_FILE"
tasklab_env_validate_spotify_tokens "$ENV_FILE"

echo "--- smoke-profile ---"
node "$SAMPLE_DIR/smoke-profile.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"

echo "--- smoke-refresh ---"
node "$SAMPLE_DIR/smoke-refresh.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"

echo
echo "All tests passed."
