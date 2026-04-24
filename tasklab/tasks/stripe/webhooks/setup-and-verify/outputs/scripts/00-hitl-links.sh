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

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

pretty_path() {
  local p="$1"
  if [[ -n "${HOME:-}" && "$p" == "$HOME"* ]]; then
    printf '%s' "\$HOME${p#$HOME}"
    return 0
  fi
  printf '%s' "$p"
}

PROJECT_ROOT_PRETTY="$(pretty_path "$PROJECT_ROOT")"
TASKLAB_ROOT_PRETTY="$(pretty_path "${TASKLAB_ROOT:-/path/to/TaskLab}")"

echo "Project root: $PROJECT_ROOT"
echo "Env file:     $ENV_FILE"
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

copy_to_clipboard() {
  local text="$1"
  if command -v pbcopy >/dev/null 2>&1; then
    printf "%s" "$text" | pbcopy
    return 0
  fi
  if command -v xclip >/dev/null 2>&1; then
    printf "%s" "$text" | xclip -selection clipboard
    return 0
  fi
  if command -v xsel >/dev/null 2>&1; then
    printf "%s" "$text" | xsel --clipboard --input
    return 0
  fi
  return 1
}

SESSION_PRELUDE=$(
  cat <<EOF
SESSION_FILE="/tmp/tasklab-session-stripe-webhooks.sh"
# Surface: session (local shell)
cat > "\$SESSION_FILE" <<'EOFSESSION'
TASK_DIR="tasklab/tasks/stripe/webhooks/setup-and-verify"
PROJECT_ROOT="$PROJECT_ROOT_PRETTY"
EOFSESSION
. "\$SESSION_FILE"
cd "$TASKLAB_ROOT_PRETTY" && cd "\$TASK_DIR"
EOF
)

NEXT_COMMANDS=$(
  cat <<'EOF'
# Surface: local_script + HITL prompts
bash outputs/scripts/00-init-project-env.sh --project-root "$PROJECT_ROOT"
# Surface: local_script
bash outputs/scripts/01-preflight.sh --project-root "$PROJECT_ROOT"
# Surface: local_script (server)
bash outputs/scripts/02-run-sample-server.sh --project-root "$PROJECT_ROOT"
# Surface: CLI (Stripe)
bash outputs/scripts/03-stripe-listen.sh --project-root "$PROJECT_ROOT"
# Surface: CLI (Stripe)
# stripe trigger payment_intent.succeeded
# Surface: local_script
bash outputs/scripts/99-run-tests.sh --project-root "$PROJECT_ROOT"
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if copy_to_clipboard "${SESSION_PRELUDE}"$'\n\n'"${NEXT_COMMANDS}"; then
    echo
    echo "Copied to clipboard (session prelude + next commands):"
    echo "$SESSION_PRELUDE"
    echo
    echo "$NEXT_COMMANDS"
  else
    echo
    echo "Clipboard copy unavailable (no pbcopy/xclip/xsel). Session prelude + next commands:"
    echo "$SESSION_PRELUDE"
    echo
    echo "$NEXT_COMMANDS"
  fi
fi

open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

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
  open_url "$DOCS_TEST"
  open_url "$DASH_WEBHOOKS_TEST"
fi
