#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="."
ENV_FILE=""
OPEN_LINKS=false
ASK_OPEN=false
NO_COPY=false
TASKLAB_TEMPLATE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKLAB_ROOT="$(cd "$TASKLAB_TEMPLATE_SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
TASK_DIR_REL="$(cd "$TASKLAB_TEMPLATE_SCRIPT_DIR" && git rev-parse --show-prefix 2>/dev/null || true)"
TASK_DIR="${TASK_DIR_REL%outputs/scripts/}"
if [[ -z "$TASK_DIR" || "$TASK_DIR" == "$TASK_DIR_REL" ]]; then
  TASK_DIR="tasklab/tasks/<service>/<task-name>"
fi

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
  - Avoid long copy/paste blocks: generate runnable files under /tmp and print 1–2 short commands.
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

SESSION_FILE="/tmp/tasklab-session.sh"
NEXT_FILE="/tmp/tasklab-next.sh"

umask 077

cat > "$SESSION_FILE" <<EOF
TASK_DIR="$TASK_DIR"
PROJECT_ROOT="$PROJECT_ROOT"
EOF

cat > "$NEXT_FILE" <<EOF
#!/usr/bin/env bash
set -euo pipefail

# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: local_script
cd "${TASKLAB_ROOT:-/path/to/TaskLab}" && cd "\$TASK_DIR"

# Surface: local_script (+ optional HITL prompts)
# TODO(author): replace with your real next commands
echo "TODO: run task steps for \$PROJECT_ROOT"
EOF
chmod 700 "$NEXT_FILE"

RUN_LINES=$(
  cat <<EOF
# Surface: session env (temporary)
. "$SESSION_FILE"

# Surface: local_script
bash "$NEXT_FILE"
EOF
)

echo
echo "Temporary session env + runnable script:"
echo "- Session env: $SESSION_FILE"
echo "- Next script: $NEXT_FILE"

if [[ "$NO_COPY" != "true" ]]; then
  if copy_to_clipboard "$RUN_LINES"; then
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
  open_url "$CONSOLE_HOME_URL"
fi
