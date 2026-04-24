#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TASKLAB_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  echo "Unable to locate TaskLab git root (required to source tasklab/lib/bash/env.sh)." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/env.sh"

tasklab_env_precheck() {
  tasklab_core_env_precheck "$1"
}

tasklab_env_source() {
  tasklab_core_env_source "$1"
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

  if [[ -n "${ISSUER_ID:-}" ]]; then
    # Wallet Objects REST expects issuer resource id as an int64. If the copied value is longer than
    # 19 digits it's almost certainly the wrong id (common copy/paste footgun).
    local len="${#ISSUER_ID}"
    if (( len > 19 )); then
      echo "Invalid ISSUER_ID in $env_file: too many digits for an int64 (len=$len): $ISSUER_ID" >&2
      echo "Re-copy 'Issuer ID' from https://pay.google.com/business/console/ (should be a <=19 digit number)." >&2
      exit 1
    fi
  fi

  if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" && "${GOOGLE_APPLICATION_CREDENTIALS:0:1}" != "/" ]]; then
    echo "Invalid GOOGLE_APPLICATION_CREDENTIALS in $env_file: expected an absolute path, got: $GOOGLE_APPLICATION_CREDENTIALS" >&2
    echo "Set it to an absolute path (e.g. /Users/<you>/Downloads/key.json) or a path relative to --project-root." >&2
    exit 1
  fi
}
