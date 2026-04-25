#!/usr/bin/env bash
set -euo pipefail

TASKLAB_SHELLY_ENV_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TASKLAB_ROOT="$(cd "$TASKLAB_SHELLY_ENV_LIB_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$TASKLAB_ROOT" ]]; then
  echo "Unable to locate TaskLab git root (required to source tasklab/lib/bash/env.sh)." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/env.sh"
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/install.sh"
# shellcheck disable=SC1091
source "$TASKLAB_ROOT/tasklab/lib/bash/task-script.sh"
