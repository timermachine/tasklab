#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
TASKLAB_SPOTIFY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir> [--env-file <path>]

Checks:
  - Node.js 18+ is available
  - .env exists and contains SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI
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

if ! command -v node >/dev/null 2>&1; then
  echo "node not found. Install Node.js 18+ and retry." >&2
  exit 1
fi

NODE_MAJOR="$(node --version | sed 's/v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Node.js 18+ required (found $(node --version)). Upgrade and retry." >&2
  exit 1
fi

echo "Node: $(node --version)"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Copy outputs/env/.env.example to $ENV_FILE and fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET." >&2
  exit 1
fi

tasklab_env_source_file "$ENV_FILE"
tasklab_env_validate_spotify "$ENV_FILE"

echo "Preflight OK"
