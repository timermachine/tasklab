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
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/install.sh"

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

tasklab_env_validate_stripe_account() {
  local env_file="$1"

  if [[ -n "${STRIPE_SECRET_KEY:-}" && "$STRIPE_SECRET_KEY" != sk_* ]]; then
    echo "Invalid STRIPE_SECRET_KEY in $env_file: expected to start with sk_" >&2
    exit 1
  fi

  if [[ -n "${STRIPE_PUBLISHABLE_KEY:-}" && "$STRIPE_PUBLISHABLE_KEY" != pk_* ]]; then
    echo "Invalid STRIPE_PUBLISHABLE_KEY in $env_file: expected to start with pk_" >&2
    exit 1
  fi

  if [[ -n "${STRIPE_PRICE_ID:-}" && "$STRIPE_PRICE_ID" != price_* ]]; then
    echo "Invalid STRIPE_PRICE_ID in $env_file: expected to start with price_" >&2
    exit 1
  fi

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

  if [[ -n "${STRIPE_WEBHOOK_PORT:-}" ]]; then
    if ! [[ "$STRIPE_WEBHOOK_PORT" =~ ^[0-9]+$ ]]; then
      echo "Invalid STRIPE_WEBHOOK_PORT in $env_file: must be an integer" >&2
      exit 1
    fi
  fi
}
