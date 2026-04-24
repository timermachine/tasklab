#!/usr/bin/env bash
set -euo pipefail

TASKLAB_STRIPE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$TASKLAB_STRIPE_SCRIPT_DIR/.." && pwd)"

PROJECT_ROOT="."
ENV_FILE=""
FORCE=false

usage() {
  cat >&2 <<'EOF'
Usage:
  00-init-project-env.sh --project-root <dir> [--env-file <path>] [--force]

What it does:
  - Copies `outputs/env/.env.example` into your project as `.env` (gitignored)
  - Prompts you (HITL) for required values and writes them into the file
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --force) FORCE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

TEMPLATE="$OUTPUTS_DIR/env/.env.example"
if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing env template: $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$PROJECT_ROOT"

if [[ -f "$ENV_FILE" && "$FORCE" != "true" ]]; then
  echo "Env file already exists: $ENV_FILE" >&2
  echo "Refusing to overwrite. Re-run with --force if you want to replace it." >&2
  exit 1
fi

cp -p "$TEMPLATE" "$ENV_FILE"

set_kv() {
  local key="$1" value="$2"
  local rendered="$value"
  if [[ -z "$value" || "$value" =~ [[:space:]] || "$value" =~ [\'\"\\\`\$#] ]]; then
    rendered="'$(printf '%s' "$value" | perl -pe "s/'/'\\\"'\\\"'/g")'"
  fi

  # Avoid delimiter/escaping footguns (e.g. STRIPE_WEBHOOK_PATH=/webhook) by passing the
  # replacement via environment variables instead of embedding it into the s/// literal.
  KEY="$key" VAL="$rendered" perl -0777 -i -pe 's/^\Q$ENV{KEY}\E=.*$/$ENV{KEY}=$ENV{VAL}/m' "$ENV_FILE"
}

prompt() {
  local key="$1" label="$2" help="$3" def="${4:-}"
  echo
  echo "$label"
  echo "$help"
  if [[ -n "$def" ]]; then
    printf "%s [%s]: " "$key" "$def"
  else
    printf "%s: " "$key"
  fi
  local value
  IFS= read -r value
  if [[ -z "$value" ]]; then
    value="$def"
  fi
  if [[ -z "$value" ]]; then
    echo "Missing value for $key" >&2
    exit 1
  fi
  set_kv "$key" "$value"
}

echo "Initializing env file: $ENV_FILE"

prompt "STRIPE_WEBHOOK_PORT" \
  "Local webhook port" \
  "Your local dev server port (used by Stripe CLI forward-to). Default is 4242." \
  "4242"

prompt "STRIPE_WEBHOOK_PATH" \
  "Local webhook path" \
  "Webhook route path on your dev server. Default is /webhook." \
  "/webhook"

prompt "STRIPE_WEBHOOK_SECRET" \
  "Webhook signing secret (whsec_...)" \
  "Copy from Stripe CLI output (stripe listen) or from Workbench/Dashboard endpoint Signing secret. Paste the whsec_... value." \
  ""

prompt "STRIPE_WEBHOOK_TOLERANCE_SECONDS" \
  "Signature recency tolerance (seconds)" \
  "Replay defense. Must be > 0. Stripe libs default to 300 (5 min)." \
  "300"

prompt "STRIPE_WEBHOOK_DEDUPE_TTL_SECONDS" \
  "Event ID dedupe TTL (seconds)" \
  "Recommended: store seen event IDs for a TTL to reduce replay/duplicate processing risk." \
  "86400"

echo
echo "Wrote: $ENV_FILE"
echo "Next:"
echo "  bash $TASKLAB_STRIPE_SCRIPT_DIR/01-preflight.sh --project-root \"$PROJECT_ROOT\""
