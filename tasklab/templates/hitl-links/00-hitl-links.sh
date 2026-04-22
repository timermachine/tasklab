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
  Print terminal-friendly deep links and "where to click / what to copy" guidance for copy-once values.

Authoring checklist:
  - Prefer deep links to exact console pages, not home pages.
  - For every env var / copied value:
    - name (e.g. FOO_ID=)
    - URL to open
    - click path + exact field label
    - what to copy
    - where it goes (file + key)
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

echo "Project root: $PROJECT_ROOT"
echo "Env file:     $ENV_FILE"
echo

### TODO(author): define your deep links here (prefer project-scoped URLs when possible).
CONSOLE_HOME_URL="https://example.com/console"

echo "HITL links:"
echo "- Console home: $CONSOLE_HOME_URL"
echo

echo "Copy-once values to persist into $ENV_FILE:"
echo
echo "- EXAMPLE_ID="
echo "  - Open: $CONSOLE_HOME_URL"
echo "  - Click path: Settings → API"
echo "  - Field label: \"Example ID\""
echo "  - Copy: the raw id (no quotes)"
echo "  - Paste into: $ENV_FILE as EXAMPLE_ID="
echo

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
# TODO(author): replace with your real next commands
echo "Next commands go here"
EOF
)

if [[ "$NO_COPY" != "true" ]]; then
  if copy_to_clipboard "$NEXT_COMMANDS"; then
    echo "Copied next commands to clipboard:"
    echo "$NEXT_COMMANDS"
  else
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
  open_url "$CONSOLE_HOME_URL"
fi
