#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  01-preflight.sh --project-root <dir> [--env-file <path>]

Validates:
  - Required tools are available
  - .env exists and contains required variables
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file)     ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
source "$SCRIPT_DIR/_lib/env.sh"
ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

# ── Tool checks ───────────────────────────────────────────────────────────────
echo "Checking required tools..."

# TODO: add/remove tool checks as needed
# tasklab_script_require_command "node"   "Install Node.js: https://nodejs.org"
# tasklab_script_require_command "curl"   "Install curl"

echo ""

# ── Env file check ────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Run 00-hitl-links.sh first to create it." >&2
  exit 1
fi

tasklab_env_source_file "$ENV_FILE"

# ── Required variable checks ──────────────────────────────────────────────────
# TODO: replace with actual required variables
# tasklab_env_need "$ENV_FILE" "{{SERVICE_UPPER}}_API_KEY"

echo "Preflight OK"
