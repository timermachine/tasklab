#!/usr/bin/env bash
set -euo pipefail

_TASKLAB_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_TASKLAB_GIT_ROOT="$(cd "$_TASKLAB_LIB_DIR" && git rev-parse --show-toplevel 2>/dev/null || true)"

# Resolve shared lib root — supports TaskLab repo layout and TaskHub layout
if [[ -f "$_TASKLAB_GIT_ROOT/tasklab/lib/bash/env.sh" ]]; then
  _TASKLAB_SHARED="$_TASKLAB_GIT_ROOT/tasklab/lib/bash"
elif [[ -f "$_TASKLAB_GIT_ROOT/lib/env.sh" ]]; then
  _TASKLAB_SHARED="$_TASKLAB_GIT_ROOT/lib"
else
  echo "Unable to locate TaskLab shared libs (checked tasklab/lib/bash/ and lib/ relative to git root: $_TASKLAB_GIT_ROOT)" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$_TASKLAB_SHARED/env.sh"
# shellcheck disable=SC1091
source "$_TASKLAB_SHARED/install.sh"
# shellcheck disable=SC1091
source "$_TASKLAB_SHARED/task-script.sh"
# shellcheck disable=SC1091
source "$_TASKLAB_SHARED/stripe.sh"

tasklab_env_validate_stripe_account() {
  local env_file="$1"
  tasklab_stripe_validate_account "$env_file"
}
