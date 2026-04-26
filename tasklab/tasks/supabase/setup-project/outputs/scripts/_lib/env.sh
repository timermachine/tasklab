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
export TASKLAB_ROOT="$_TASKLAB_GIT_ROOT"

# shellcheck disable=SC1091
source "$_TASKLAB_SHARED/env.sh"

tasklab_env_precheck() {
  tasklab_core_env_precheck "$1"
}

tasklab_env_source() {
  tasklab_core_env_source "$1"
}
