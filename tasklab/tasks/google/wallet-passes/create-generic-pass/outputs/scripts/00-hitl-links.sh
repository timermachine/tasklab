#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
OPEN_LINKS=false
ASK_OPEN=false
NO_COPY=false

usage() {
  cat >&2 <<'EOF'
Usage:
  00-hitl-links.sh --project-root <dir> [--env-file <path>] [--open] [--ask-open] [--no-copy]

Prints stable console URLs and the "copy once" values you need to persist into your project `.env`.

If --open is provided, attempts to open the links in your default browser (best-effort).
If --ask-open is provided, prompts before opening links.
By default, this script copies the next recommended commands to your clipboard (macOS `pbcopy`).
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

GCP_PROJECT_ID=""
if [[ -f "$ENV_FILE" ]]; then
  GCP_PROJECT_ID="$(rg "^GCP_PROJECT_ID=" "$ENV_FILE" -m 1 | sed -E 's/^GCP_PROJECT_ID=//; s/^\"//; s/\"$//; s/^\x27//; s/\x27$//')"
fi

echo "Project root: $PROJECT_ROOT"
echo "Env file:     $ENV_FILE"
echo
echo "HITL links (Google Cloud Console):"
HOME_DASHBOARD_URL="https://console.cloud.google.com/home/dashboard"
WALLET_API_ENABLE_URL="https://console.cloud.google.com/apis/library/walletobjects.googleapis.com"
if [[ -n "$GCP_PROJECT_ID" ]]; then
  HOME_DASHBOARD_URL="https://console.cloud.google.com/home/dashboard?project=$GCP_PROJECT_ID"
  API_LIBRARY_URL="https://console.cloud.google.com/apis/library?project=$GCP_PROJECT_ID"
  WALLET_API_ENABLE_URL="https://console.cloud.google.com/apis/library/walletobjects.googleapis.com?project=$GCP_PROJECT_ID"
  ENABLED_APIS_URL="https://console.cloud.google.com/apis/dashboard?project=$GCP_PROJECT_ID"
  SERVICE_ACCOUNTS_URL="https://console.cloud.google.com/iam-admin/serviceaccounts?project=$GCP_PROJECT_ID"
  SERVICE_ACCOUNTS_CREATE_URL="https://console.cloud.google.com/iam-admin/serviceaccounts/create?project=$GCP_PROJECT_ID"
  CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials?project=$GCP_PROJECT_ID"
else
  API_LIBRARY_URL="https://console.cloud.google.com/apis/library"
  SERVICE_ACCOUNTS_CREATE_URL="https://console.cloud.google.com/iam-admin/serviceaccounts/create"
  ENABLED_APIS_URL="https://console.cloud.google.com/apis/dashboard"
  SERVICE_ACCOUNTS_URL="https://console.cloud.google.com/iam-admin/serviceaccounts"
  CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials"
  echo
  echo "Tip: set GCP_PROJECT_ID in $ENV_FILE to get project-scoped URLs."
fi

echo "- Project picker (Project ID): $HOME_DASHBOARD_URL"
echo "- API Library:               $API_LIBRARY_URL"
echo "- Enable Google Wallet API:  $WALLET_API_ENABLE_URL"
echo "- Enabled APIs:              $ENABLED_APIS_URL"
echo "- Service accounts:          $SERVICE_ACCOUNTS_URL"
echo "- Create service account:    $SERVICE_ACCOUNTS_CREATE_URL"
echo "- Credentials (APIs):        $CREDENTIALS_URL"

echo
echo "HITL links (Issuer / Wallet console):"
ISSUER_CONSOLE_URL="https://pay.google.com/business/console"
echo "- Issuer console (issuer id): $ISSUER_CONSOLE_URL/"
echo "  - Find the numeric issuer id (ISSUER_ID); label/location may vary. Record the exact label you see in the setup report."
echo "  - Required: authorize your service account under Users by inviting the service account email with Access level = Developer."
echo
echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "- GCP_PROJECT_ID="
echo "  - Open: $HOME_DASHBOARD_URL"
echo "  - Use the project picker (top bar). Copy the 'Project ID' (not the project name)."
echo "  - If you open Project info/settings, it also shows 'Project ID'."
echo
echo "- ISSUER_ID= (numeric string)"
echo "  - Open: $ISSUER_CONSOLE_URL/"
echo "  - Select the correct business/issuer."
echo "  - Look for 'Issuer ID' on the dashboard/settings. If you can't find it, use console search for 'issuer' or 'ID'."
echo "  - Sanity check: it should be digits only and usually <= 19 digits (int64)."
echo
echo "- GOOGLE_APPLICATION_CREDENTIALS= (absolute file path on your machine)"
echo "  - This is the path to the downloaded service account JSON key file, e.g. /Users/<you>/Downloads/tasklab-wallet.key.json"
echo "  - Create/download the key from: $SERVICE_ACCOUNTS_URL"
echo "    - Service Accounts → pick the account → Keys → Add key → Create new key → JSON → download"
echo
echo "Then run:"
echo "  (see copied session prelude + next commands below)"

open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

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

pretty_path() {
  local p="$1"
  if [[ -n "${HOME:-}" && "$p" == "$HOME"* ]]; then
    printf '%s' "\$HOME${p#$HOME}"
    return 0
  fi
  printf '%s' "$p"
}

PROJECT_ROOT_PRETTY="$(pretty_path "$PROJECT_ROOT")"

SESSION_PRELUDE=$(
  cat <<EOF
TASK_DIR="tasklab/tasks/google/wallet-passes/create-generic-pass"
PROJECT_ROOT="$PROJECT_ROOT_PRETTY"
cd /Users/steve/dev/TaskLab && cd "\$TASK_DIR"
EOF
)

NEXT_COMMANDS=$(
  cat <<EOF
bash outputs/scripts/00-init-project-env.sh --project-root "\$PROJECT_ROOT"
bash outputs/scripts/01-preflight.sh --project-root "\$PROJECT_ROOT"
bash outputs/scripts/02b-smoke-wallet-api.sh --project-root "\$PROJECT_ROOT"
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
  open_url "$HOME_DASHBOARD_URL"
  open_url "$WALLET_API_ENABLE_URL"
  open_url "$SERVICE_ACCOUNTS_URL"
  open_url "$ISSUER_CONSOLE_URL"
fi
