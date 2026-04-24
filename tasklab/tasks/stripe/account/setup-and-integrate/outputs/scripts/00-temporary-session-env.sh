#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
SESSION_FILE="/tmp/tasklab-session-stripe-account.sh"

usage() {
  cat >&2 <<'EOF'
Usage:
  00-temporary-session-env.sh --project-root <dir> [--session-file <path>]

What it does:
  - Writes a temporary session env file you can source in any terminal:
      TASK_DIR=... (task-relative path inside the TaskLab repo)
      PROJECT_ROOT=... (your target project folder)

Then you can run:
  . /tmp/tasklab-session-stripe-account.sh
  cd /path/to/TaskLab && cd "$TASK_DIR"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --session-file) SESSION_FILE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ROOT" ]]; then
  echo "Missing --project-root" >&2
  usage
  exit 2
fi

sq() {
  local s="$1"
  s="${s//\'/\'\"\'\"\'}"
  printf "'%s'" "$s"
}

cat > "$SESSION_FILE" <<EOF
TASK_DIR="tasklab/tasks/stripe/account/setup-and-integrate"
PROJECT_ROOT=$(sq "$PROJECT_ROOT")
EOF

echo "Wrote session env: $SESSION_FILE"
echo "Next:"
echo "  . \"$SESSION_FILE\""
echo "  cd /path/to/TaskLab && cd \"\$TASK_DIR\""

