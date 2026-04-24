#!/usr/bin/env bash
set -euo pipefail

TASKLAB_ENV_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TASKLAB_ROOT="$(cd "$TASKLAB_ENV_LIB_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  echo "Unable to locate TaskLab git root (required to source tasklab/lib/bash/env.sh)." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/env.sh"

tasklab_env_source_file() {
  local env_file="$1"
  tasklab_core_env_source "$env_file"
}

tasklab_env_need() {
  local env_file="$1" key="$2"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key (in $env_file)" >&2
    exit 1
  fi
}

tasklab_env_validate_stripe() {
  local env_file="$1"

  if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" && "$STRIPE_WEBHOOK_SECRET" != whsec_* ]]; then
    echo "Invalid STRIPE_WEBHOOK_SECRET in $env_file: expected to start with whsec_" >&2
    exit 1
  fi

  if [[ -n "${STRIPE_WEBHOOK_TOLERANCE_SECONDS:-}" ]]; then
    if ! [[ "$STRIPE_WEBHOOK_TOLERANCE_SECONDS" =~ ^[0-9]+$ ]]; then
      echo "Invalid STRIPE_WEBHOOK_TOLERANCE_SECONDS in $env_file: must be an integer" >&2
      exit 1
    fi
    if [[ "$STRIPE_WEBHOOK_TOLERANCE_SECONDS" == "0" ]]; then
      echo "Invalid STRIPE_WEBHOOK_TOLERANCE_SECONDS in $env_file: must be > 0 (0 disables recency check)" >&2
      exit 1
    fi
  fi
}
