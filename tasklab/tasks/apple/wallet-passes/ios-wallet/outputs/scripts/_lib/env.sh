#!/usr/bin/env bash
set -euo pipefail

_TASKLAB_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_TASKLAB_GIT_ROOT="$(cd "$_TASKLAB_LIB_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -f "$_TASKLAB_GIT_ROOT/tasklab/lib/bash/env.sh" ]]; then
  _TASKLAB_SHARED="$_TASKLAB_GIT_ROOT/tasklab/lib/bash"
elif [[ -f "$_TASKLAB_GIT_ROOT/lib/env.sh" ]]; then
  _TASKLAB_SHARED="$_TASKLAB_GIT_ROOT/lib"
else
  echo "Unable to locate TaskLab shared libs (git root: $_TASKLAB_GIT_ROOT)" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$_TASKLAB_SHARED/env.sh"

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
