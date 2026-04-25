#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  02-oauth-login.sh --project-root <dir> [--env-file <path>]

Starts a local OAuth callback server on localhost:8888 (override with SPOTIFY_CALLBACK_PORT),
opens the Spotify auth URL in a browser, waits for the redirect, exchanges the code for
tokens, and writes SPOTIFY_ACCESS_TOKEN + SPOTIFY_REFRESH_TOKEN to your .env.

The server exits automatically after receiving the callback.
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

node "$SAMPLE_DIR/server.mjs" --project-root "$PROJECT_ROOT" --env-file "$ENV_FILE"
