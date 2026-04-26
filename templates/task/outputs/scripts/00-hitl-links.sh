#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--env-file <path>]

Prints {{SERVICE}} deep links and copy-once guidance for manual steps.
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

echo ""
echo "━━━  {{SERVICE}} setup — manual steps  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Env file:  $ENV_FILE"
echo "  (Create it if it does not exist — it is gitignored)"
echo ""

# TODO: Add deep links for each manual step
# tasklab_script_print_link "Step 1: Open API keys" "https://dashboard.{{SERVICE}}.com/settings/api"
# tasklab_script_copy_hint "{{SERVICE_UPPER}}_API_KEY" "your-key-here" "$ENV_FILE"

echo "  ── Step 1: TODO ────────────────────────────────────────────────────────"
echo "  URL:   TODO: https://dashboard.{{SERVICE}}.com/settings/api"
echo "  Copy:  TODO: what to copy and where it goes"
echo "  Paste: {{SERVICE_UPPER}}_API_KEY= into $ENV_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Run next: 01-preflight.sh --project-root \"$PROJECT_ROOT\""
echo ""
