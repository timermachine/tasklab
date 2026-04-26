#!/usr/bin/env bash
# Generates a self-contained task portal HTML page and opens it in your browser.
# Usage: ./00-hitl-portal.sh [--project-root <dir>] [--out <path>] [--open]
set -euo pipefail

PROJECT_ROOT="."
OUT_FILE=""
AUTO_OPEN=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TASKLAB_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || { echo "Error: not in a git repo" >&2; exit 1; })"
TASK_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [[ -f "$TASKLAB_ROOT/tasklab/lib/portal/generate.js" ]]; then
  GENERATOR="$TASKLAB_ROOT/tasklab/lib/portal/generate.js"
elif [[ -f "$TASKLAB_ROOT/lib/portal/generate.js" ]]; then
  GENERATOR="$TASKLAB_ROOT/lib/portal/generate.js"
else
  GENERATOR=""
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="${2:-}"; shift 2 ;;
    --out)          OUT_FILE="${2:-}";     shift 2 ;;
    --open)         AUTO_OPEN=true;        shift ;;
    -h|--help) echo "Usage: 00-hitl-portal.sh [--project-root <dir>] [--out <path>] [--open]"; exit 0 ;;
    *) echo "Unexpected argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$OUT_FILE" ]]; then
  OUT_FILE="$PROJECT_ROOT/tasklab-portal.html"
fi

command -v node &>/dev/null || { echo "Error: node is required." >&2; exit 1; }
command -v yq   &>/dev/null || { echo "Error: yq is required."   >&2; exit 1; }
if [[ -z "$GENERATOR" ]]; then
  echo "Portal generator not available — skipping (run 00-hitl-links.sh for links)"
  exit 0
fi

node "$GENERATOR" \
  --task-dir     "$TASK_DIR" \
  --project-root "$PROJECT_ROOT" \
  --out          "$OUT_FILE"

if [[ "$AUTO_OPEN" == "true" ]]; then
  command -v open &>/dev/null && open "$OUT_FILE" || true
elif [[ -t 0 ]]; then
  printf "\nOpen in browser? [y/N]: "
  read -r _ans
  if [[ "$_ans" == "y" || "$_ans" == "Y" ]]; then
    command -v open &>/dev/null && open "$OUT_FILE" || xdg-open "$OUT_FILE" 2>/dev/null || true
  fi
fi
