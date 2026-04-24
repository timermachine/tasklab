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

tasklab_env_precheck() {
  tasklab_core_env_precheck "$1"
}

tasklab_env_source() {
  tasklab_core_env_source "$1"
}

tasklab_env_resolve_paths() {
  local project_root="$1"
  for k in PASS_P12_PATH WWDR_CERT_PATH; do
    local v="${!k:-}"
    if [[ -n "$v" && "${v:0:1}" != "/" ]]; then
      printf -v "$k" '%s' "$project_root/$v"
      export "$k"
    fi
  done
}

tasklab_env_need() {
  local env_file="$1" key="$2"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key (in $env_file)" >&2
    exit 1
  fi
}
