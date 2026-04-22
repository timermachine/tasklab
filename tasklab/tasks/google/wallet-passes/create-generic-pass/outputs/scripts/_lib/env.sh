#!/usr/bin/env bash
set -euo pipefail

tasklab_env_precheck() {
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
    # grep fallback: approximate the same check.
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

tasklab_env_source() {
  local env_file="$1"
  tasklab_env_precheck "$env_file"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}

tasklab_env_resolve_paths() {
  local project_root="$1"
  if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
    if [[ "${GOOGLE_APPLICATION_CREDENTIALS:0:1}" != "/" ]]; then
      GOOGLE_APPLICATION_CREDENTIALS="$project_root/$GOOGLE_APPLICATION_CREDENTIALS"
      export GOOGLE_APPLICATION_CREDENTIALS
    fi
  fi
}

tasklab_env_validate() {
  local env_file="$1"

  if [[ -n "${ISSUER_ID:-}" && ! "$ISSUER_ID" =~ ^[0-9]+$ ]]; then
    echo "Invalid ISSUER_ID in $env_file: expected digits only, got: $ISSUER_ID" >&2
    echo "Open https://pay.google.com/business/console/ and copy the numeric Issuer ID." >&2
    exit 1
  fi

  if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" && "${GOOGLE_APPLICATION_CREDENTIALS:0:1}" != "/" ]]; then
    echo "Invalid GOOGLE_APPLICATION_CREDENTIALS in $env_file: expected an absolute path, got: $GOOGLE_APPLICATION_CREDENTIALS" >&2
    echo "Set it to an absolute path (e.g. /Users/<you>/Downloads/key.json) or a path relative to --project-root." >&2
    exit 1
  fi
}
