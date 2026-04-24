#!/usr/bin/env bash
set -euo pipefail

tasklab_core_env_precheck() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  local checker="rg"
  if ! command -v rg >/dev/null 2>&1; then
    checker="grep"
  fi

  # Detect common footgun: unquoted values with spaces, e.g. PASS_TITLE=TaskLab Generic Pass
  # This breaks `source .env` and yields confusing "command not found" errors.
  local matches=""
  if [[ "$checker" == "rg" ]]; then
    matches="$(rg -n '^[A-Z0-9_]+=([^"'\''#][^#]*[[:space:]][^#]*)$' "$env_file" || true)"
  else
    matches="$(grep -nE '^[A-Z0-9_]+=([^"'\''#][^#]*[[:space:]][^#]*)$' "$env_file" || true)"
  fi

  if [[ -n "$matches" ]]; then
    echo "Invalid $env_file: unquoted value contains spaces:" >&2
    echo "$matches" >&2
    echo >&2
    echo "Fix: wrap the value in quotes, e.g. PASS_TITLE=\"TaskLab Generic Pass\"." >&2
    exit 1
  fi
}

tasklab_core_env_source() {
  local env_file="$1"
  tasklab_core_env_precheck "$env_file"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}
