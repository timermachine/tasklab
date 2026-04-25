#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
OPEN_LINKS=false
ASK_OPEN=false
NO_COPY=false
TASKLAB_STRIPE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKLAB_ROOT="$(cd "$TASKLAB_STRIPE_SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  TASKLAB_ROOT="$(cd "$TASKLAB_STRIPE_SCRIPT_DIR/../../../../../../.." && pwd)"
fi
# shellcheck disable=SC1091
source "$TASKLAB_STRIPE_SCRIPT_DIR/_lib/env.sh"

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--env-file <path>] [--open] [--ask-open] [--no-copy]

Prints Stripe deep links and “where to click / what to copy” guidance for account setup + Checkout + webhooks.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --open) OPEN_LINKS=true; shift ;;
    --ask-open) ASK_OPEN=true; shift ;;
    --no-copy) NO_COPY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

ENV_FILE="$(tasklab_script_default_env_file "$PROJECT_ROOT" "$ENV_FILE")"

PROJECT_ROOT_PRETTY="$(tasklab_script_pretty_path "$PROJECT_ROOT")"
TASKLAB_ROOT_REAL="${TASKLAB_ROOT:-/path/to/TaskLab}"

echo "Project root: $PROJECT_ROOT_PRETTY"
echo "Env file:     $(tasklab_script_pretty_path "$ENV_FILE")"
echo

DOCS_KEYS="https://docs.stripe.com/keys"
DOCS_CHECKOUT="https://docs.stripe.com/checkout"
DOCS_PRODUCTS="https://docs.stripe.com/products-prices"
DOCS_WEBHOOKS="https://docs.stripe.com/webhooks"
DOCS_WEBHOOKS_TEST="https://docs.stripe.com/webhooks/test"

DASH_HOME="https://dashboard.stripe.com"
DASH_API_KEYS="https://dashboard.stripe.com/apikeys"
DASH_PRODUCTS="https://dashboard.stripe.com/products"
DASH_WEBHOOKS="https://dashboard.stripe.com/webhooks"
DASH_WEBHOOKS_TEST="https://dashboard.stripe.com/test/webhooks"

echo "HITL links (Docs):"
echo "- API keys:             $DOCS_KEYS"
echo "- Checkout:             $DOCS_CHECKOUT"
echo "- Products and prices:  $DOCS_PRODUCTS"
echo "- Webhooks:             $DOCS_WEBHOOKS"
echo "- Test webhooks:        $DOCS_WEBHOOKS_TEST"

echo
echo "HITL links (Stripe Dashboard):"
echo "- Dashboard home: $DASH_HOME"
echo "- API keys:       $DASH_API_KEYS"
echo "- Products:       $DASH_PRODUCTS"
echo "- Webhooks:       $DASH_WEBHOOKS"
echo "- Webhooks (test):$DASH_WEBHOOKS_TEST"

echo
echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "- STRIPE_SECRET_KEY=sk_test_..."
echo "  - Dashboard: Developers -> API keys (in test mode)"
echo
echo "- STRIPE_PUBLISHABLE_KEY=pk_test_..."
echo "  - Dashboard: Developers -> API keys (in test mode)"
echo
echo "- STRIPE_PRICE_ID=price_..."
echo "  - Dashboard: Products -> select your Product -> copy Price ID"
echo
echo "- STRIPE_WEBHOOK_SECRET=whsec_..."
echo "  - CLI path (recommended for localhost): run \`stripe listen --forward-to http://localhost:<port><path>\` and copy the printed whsec_..."
echo "  - UI fallback: Webhooks -> select endpoint/destination -> reveal Signing secret"


SESSION_FILE="/tmp/tasklab-session-stripe-account.sh"
SETUP_FILE="/tmp/tasklab-next-stripe-account-setup.sh"
SERVER_FILE="/tmp/tasklab-next-stripe-account-server.sh"
LISTEN_FILE="/tmp/tasklab-next-stripe-account-listen.sh"
OPEN_FILE="/tmp/tasklab-next-stripe-account-open.sh"
TESTS_FILE="/tmp/tasklab-next-stripe-account-tests.sh"

echo
echo "Temporary session env + runnable scripts:"
echo "- Session env: $SESSION_FILE"
echo "- Setup:       $SETUP_FILE"
echo "- Server:      $SERVER_FILE"
echo "- Stripe CLI:  $LISTEN_FILE"
echo "- Open app:    $OPEN_FILE"
echo "- Tests:       $TESTS_FILE"

umask 077

# Surface: session env (temporary)
bash "$TASKLAB_STRIPE_SCRIPT_DIR/00-temporary-session-env.sh" --project-root "$PROJECT_ROOT"

cat > "$SETUP_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

. "$SESSION_FILE"
cd "$TASKLAB_ROOT_REAL" && cd "\$TASK_DIR"

if [[ ! -f "\$PROJECT_ROOT/.env" ]]; then
  bash outputs/scripts/00-init-project-env.sh --project-root "\$PROJECT_ROOT"
fi

bash outputs/scripts/01-preflight.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$SERVER_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

. "$SESSION_FILE"
cd "$TASKLAB_ROOT_REAL" && cd "\$TASK_DIR"
bash outputs/scripts/02-run-sample-server.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$LISTEN_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

. "$SESSION_FILE"
cd "$TASKLAB_ROOT_REAL" && cd "\$TASK_DIR"
bash outputs/scripts/03-stripe-listen.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$OPEN_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

. "$SESSION_FILE"
cd "$TASKLAB_ROOT_REAL" && cd "\$TASK_DIR"
bash outputs/scripts/04-open-local-app.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$TESTS_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

. "$SESSION_FILE"
cd "$TASKLAB_ROOT_REAL" && cd "\$TASK_DIR"
bash outputs/scripts/99-run-tests.sh --project-root "\$PROJECT_ROOT"
EOF

chmod 700 "$SETUP_FILE" "$SERVER_FILE" "$LISTEN_FILE" "$OPEN_FILE" "$TESTS_FILE"

RUN_LINES=$(
  cat <<EOF
. "$SESSION_FILE"
bash "$SETUP_FILE"

# Terminal A (server)
bash "$SERVER_FILE"

# Terminal B (Stripe CLI - optional but recommended)
bash "$LISTEN_FILE"

# Local app (browser)
bash "$OPEN_FILE"

# Smoke tests (requires server running)
bash "$TESTS_FILE"
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if tasklab_script_copy_to_clipboard "$RUN_LINES"; then
    echo
    echo "Copied to clipboard (short run lines):"
    echo "$RUN_LINES"
  else
    echo
    echo "Clipboard copy unavailable (no pbcopy/xclip/xsel). Short run lines:"
    echo "$RUN_LINES"
  fi
fi


if [[ "$ASK_OPEN" == "true" && "$OPEN_LINKS" != "true" ]]; then
  echo
  printf "Open Stripe docs/dashboard links now? [y/N]: "
  answer=""
  IFS= read -r answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    OPEN_LINKS=true
  fi
fi

if [[ "$OPEN_LINKS" == "true" ]]; then
  echo
  echo "Opening links (best-effort)..."
  tasklab_script_open_url "$DOCS_KEYS"
  tasklab_script_open_url "$DASH_API_KEYS"
  tasklab_script_open_url "$DASH_PRODUCTS"
  tasklab_script_open_url "$DASH_WEBHOOKS_TEST"
fi
