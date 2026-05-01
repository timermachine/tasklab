#!/usr/bin/env bash
set -euo pipefail

TASKLAB_ENV_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Locate TaskLab root — works whether running from the TaskLab repo
# or from a synced TaskHub copy in ~/.tasklab/hub/
TASKLAB_ROOT="$(cd "$TASKLAB_ENV_LIB_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  # Fallback: TaskHub layout — lib/ is at hub root
  TASKLAB_HUB_ROOT="$(cd "$TASKLAB_ENV_LIB_DIR/../../../../../.." && pwd)"
  if [[ -f "$TASKLAB_HUB_ROOT/lib/env.sh" ]]; then
    TASKLAB_ROOT="$TASKLAB_HUB_ROOT"
    # shellcheck disable=SC1091
    source "$TASKLAB_ROOT/lib/env.sh"
    # shellcheck disable=SC1091
    source "$TASKLAB_ROOT/lib/install.sh"
    # shellcheck disable=SC1091
    source "$TASKLAB_ROOT/lib/task-script.sh"
    return 0
  fi
  echo "Unable to locate TaskLab or TaskHub root (required to source shared libs)." >&2
  exit 1
fi
export TASKLAB_ROOT

# TaskLab repo layout
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/env.sh"
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/install.sh"
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/task-script.sh"
