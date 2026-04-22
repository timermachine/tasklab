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

Purpose:
  Print Supabase dashboard deep links and “where to click / what to copy” guidance for repo-local `.env` values.

Notes:
  - UI labels drift; this script prints the most stable entry points and the exact field labels we expect.
  - Treat `service_role` / secret keys as secrets (never commit).
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

extract_env() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 0
  local line
  line="$(rg "^${key}=" "$file" -m 1 | sed -E "s/^${key}=//")"
  line="${line%\"}"; line="${line#\"}"
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

SUPABASE_PROJECT_REF="$(extract_env "SUPABASE_PROJECT_REF" "$ENV_FILE")"

echo "Project root: $PROJECT_ROOT"
echo "Env file:     $ENV_FILE"
echo

DASHBOARD_HOME_URL="https://app.supabase.com/"
DASHBOARD_PROJECTS_URL="https://app.supabase.com/projects"

# Best-effort deep links. If Supabase changes URL shapes, fall back to manual navigation.
API_SETTINGS_URL=""
if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  API_SETTINGS_URL="https://app.supabase.com/project/${SUPABASE_PROJECT_REF}/settings/api"
fi

echo "HITL links (Supabase dashboard):"
echo "- Dashboard home:   $DASHBOARD_HOME_URL"
echo "- Projects list:    $DASHBOARD_PROJECTS_URL"
if [[ -n "$API_SETTINGS_URL" ]]; then
  echo "- Project API page: $API_SETTINGS_URL"
else
  echo "- Project API page: (set SUPABASE_PROJECT_REF in $ENV_FILE to print a deep link)"
fi

echo
echo "Copy-once values to persist into $ENV_FILE (from Project Settings → API):"
echo
echo "- SUPABASE_PROJECT_REF="
echo "  - Open: ${API_SETTINGS_URL:-$DASHBOARD_HOME_URL}"
echo "  - Click path: open your project → Project Settings → API"
echo "  - Field label: \"Project ID (Reference used in APIs and URLs)\" (or similar)"
echo "  - Copy: the raw reference id (no quotes)"
echo
echo "- SUPABASE_URL="
echo "  - Same page: Project Settings → API"
echo "  - Field label: \"Project URL\""
echo "  - Copy: the full URL"
echo
echo "- SUPABASE_ANON_KEY="
echo "  - Same page: Project Settings → API"
echo "  - Field label: \"anon\" (legacy) OR the publishable/public key (UI drift)"
echo "  - Copy: the key string only"
echo
echo "Secret note (may be required by some workflows):"
echo "- service_role / secret key: treat as a secret; never commit it; only store it in a gitignored env file when explicitly required."

echo
echo "Then run:"
echo "  bash $(dirname "$0")/01-check-cli.sh --project-root \"$PROJECT_ROOT\""

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

NEXT_COMMANDS=$(
  cat <<EOF
bash tasklab/tasks/supabase/setup-project/outputs/scripts/01-check-cli.sh --project-root $PROJECT_ROOT
bash tasklab/tasks/supabase/setup-project/outputs/scripts/02-login.sh --project-root $PROJECT_ROOT
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if copy_to_clipboard "$NEXT_COMMANDS"; then
    echo
    echo "Copied next commands to clipboard:"
    echo "$NEXT_COMMANDS"
  else
    echo
    echo "Clipboard copy unavailable (no pbcopy/xclip/xsel). Next commands:"
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
  open_url "$DASHBOARD_PROJECTS_URL"
  if [[ -n "$API_SETTINGS_URL" ]]; then
    open_url "$API_SETTINGS_URL"
  fi
fi
