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

Prints Stripe deep links and “where to click / what to copy” guidance for webhook setup.
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

echo "Project root: $PROJECT_ROOT_PRETTY"
echo "Env file:     $(tasklab_script_pretty_path "$ENV_FILE")"
echo

DOCS_TEST="https://docs.stripe.com/webhooks/test"
DOCS_WEBHOOKS="https://docs.stripe.com/webhooks"
DOCS_DASH_WEBHOOKS="https://docs.stripe.com/development/dashboard/webhooks"
DOCS_WORKBENCH_WEBHOOKS="https://docs.stripe.com/workbench/webhooks"

DASH_WEBHOOKS_LIVE="https://dashboard.stripe.com/webhooks"
DASH_WEBHOOKS_TEST="https://dashboard.stripe.com/test/webhooks"
DASH_API_KEYS="https://dashboard.stripe.com/apikeys"

echo "HITL links (Docs):"
echo "- Webhooks test + replay notes: $DOCS_TEST"
echo "- Webhooks overview/signatures: $DOCS_WEBHOOKS"
echo "- Add endpoint (Dashboard):     $DOCS_DASH_WEBHOOKS"
echo "- Workbench webhooks:           $DOCS_WORKBENCH_WEBHOOKS"

echo
echo "HITL links (Stripe Dashboard):"
echo "- Webhooks (live): $DASH_WEBHOOKS_LIVE"
echo "- Webhooks (test): $DASH_WEBHOOKS_TEST"
echo "- API keys:        $DASH_API_KEYS"

echo
echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "- STRIPE_WEBHOOK_SECRET= (starts with whsec_)"
echo "  - CLI path (recommended for local dev): run \`stripe listen --forward-to http://localhost:<port><path>\` and copy the printed whsec_..."
echo "  - UI path: open Workbench/Dashboard webhooks, select your endpoint/destination, reveal the Signing secret, copy the whsec_..."
echo "  - Paste into: $ENV_FILE as STRIPE_WEBHOOK_SECRET="
echo
echo "- STRIPE_WEBHOOK_PORT= and STRIPE_WEBHOOK_PATH="
echo "  - Choose where your local dev server receives forwarded webhooks (defaults: 4242 + /webhook)."

echo
echo "Next (human note): run this script once per session to regenerate the /tmp helper files it mentions below."
echo "It’s the copy/paste-safe entrypoint: it prints the deep links + writes runnable step scripts under /tmp."


SESSION_FILE="/tmp/tasklab-session-stripe-webhooks.sh"
SETUP_FILE="/tmp/tasklab-next-stripe-webhooks-setup.sh"
SERVER_FILE="/tmp/tasklab-next-stripe-webhooks-server.sh"
LISTEN_FILE="/tmp/tasklab-next-stripe-webhooks-listen.sh"
TESTS_FILE="/tmp/tasklab-next-stripe-webhooks-tests.sh"

echo
echo "Temporary session env + runnable scripts (avoids copy/paste line-break issues):"
echo "- Session env: $SESSION_FILE"
echo "- Setup:       $SETUP_FILE"
echo "- Server:      $SERVER_FILE"
echo "- Stripe CLI:  $LISTEN_FILE"
echo "- Tests:       $TESTS_FILE"

umask 077

# Surface: session env (temporary)
bash "$TASKLAB_STRIPE_SCRIPT_DIR/00-temporary-session-env.sh" --project-root "$PROJECT_ROOT"

cat > "$SETUP_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: local_script
cd "$TASKLAB_ROOT" && cd "\$TASK_DIR"

if [[ ! -f "\$PROJECT_ROOT/.env" ]]; then
  # Surface: local_script + HITL prompts
  bash outputs/scripts/00-init-project-env.sh --project-root "\$PROJECT_ROOT"
fi

# Surface: local_script
bash outputs/scripts/01-preflight.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$SERVER_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: local_script (server)
cd "$TASKLAB_ROOT" && cd "\$TASK_DIR"
bash outputs/scripts/02-run-sample-server.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$LISTEN_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: CLI (Stripe)
cd "$TASKLAB_ROOT" && cd "\$TASK_DIR"
bash outputs/scripts/03-stripe-listen.sh --project-root "\$PROJECT_ROOT"
EOF

cat > "$TESTS_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: local_script
cd "$TASKLAB_ROOT" && cd "\$TASK_DIR"
bash outputs/scripts/99-run-tests.sh --project-root "\$PROJECT_ROOT"
EOF

chmod 700 "$SETUP_FILE" "$SERVER_FILE" "$LISTEN_FILE" "$TESTS_FILE"

RUN_LINES=$(
  cat <<EOF
# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: local_script
bash "$SETUP_FILE"

# Surface: local_script (server)  (run in terminal A)
bash "$SERVER_FILE"

# Surface: CLI (Stripe)  (run in terminal B)
bash "$LISTEN_FILE"

# Surface: CLI (Stripe)
# stripe trigger payment_intent.succeeded

# Surface: local_script
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
  printf "Open these links in your browser now? [y/N]: "
  answer=""
  IFS= read -r answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    OPEN_LINKS=true
  fi
fi

if [[ "$OPEN_LINKS" == "true" ]]; then
  echo
  echo "Opening links (best-effort)..."
  tasklab_script_open_url "$DOCS_TEST"
  tasklab_script_open_url "$DASH_WEBHOOKS_TEST"
fi
