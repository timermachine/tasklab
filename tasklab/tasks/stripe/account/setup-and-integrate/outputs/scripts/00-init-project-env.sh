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
  echo "Env file already exists: $ENV_FILE (skip init — already configured)"
  echo "Re-run with --force to overwrite."
  exit 0
fi

cp -p "$TEMPLATE" "$ENV_FILE"

set_kv() {
  local key="$1" value="$2"
  local rendered="$value"
  if [[ -z "$value" || "$value" =~ [[:space:]] || "$value" =~ [\'\"\\\`\$#] ]]; then
    rendered="'$(printf '%s' "$value" | perl -pe "s/'/'\\\"'\\\"'/g")'"
  fi

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
  LAST_PROMPT_VALUE="$value"
}

echo "Initializing env file: $ENV_FILE"

prompt "STRIPE_SECRET_KEY" \
  "Secret API key (sk_test_...)" \
  "Copy from Stripe Dashboard -> Developers -> API keys (test mode). Treat as a secret." \
  ""

prompt "STRIPE_PUBLISHABLE_KEY" \
  "Publishable API key (pk_test_...)" \
  "Copy from Stripe Dashboard -> Developers -> API keys (test mode)." \
  ""

prompt "STRIPE_PRICE_ID" \
  "Price ID (price_...)" \
  "Create a test Product + Price in Stripe Dashboard (Products) and copy the Price ID (starts with price_)." \
  ""

prompt "STRIPE_WEBHOOK_PORT" \
  "Local app/webhook port" \
  "Local dev server port for the sample app + Stripe CLI forwarding. Default is 4242." \
  "4242"
WEBHOOK_PORT_VALUE="$LAST_PROMPT_VALUE"

prompt "STRIPE_WEBHOOK_PATH" \
  "Local webhook path" \
  "Webhook route path on your dev server. Default is /webhook." \
  "/webhook"

prompt "STRIPE_WEBHOOK_SECRET" \
  "Webhook signing secret (whsec_...)" \
  "Recommended: run Stripe CLI `stripe listen --forward-to http://localhost:<port><path>` and copy the printed whsec_... into this field." \
  ""

prompt "STRIPE_SUCCESS_URL" \
  "Checkout success URL" \
  "Where Stripe redirects after successful payment (local is fine for test mode)." \
  "http://localhost:${WEBHOOK_PORT_VALUE:-4242}/success"

prompt "STRIPE_CANCEL_URL" \
  "Checkout cancel URL" \
  "Where Stripe redirects if the customer cancels checkout." \
  "http://localhost:${WEBHOOK_PORT_VALUE:-4242}/cancel"

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
