#!/usr/bin/env bash
set -euo pipefail

# Verifies that TaskLab bash libraries that are meant to be `source`d do not clobber
# common caller variables (e.g. SCRIPT_DIR).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

echo "Repo root: $REPO_ROOT"

libs=()
while IFS= read -r f; do
  [[ -n "$f" ]] || continue
  libs+=("$f")
done < <(find tasklab/tasks -type f -path "*/outputs/scripts/_lib/env.sh" | sort)

if [[ "${#libs[@]}" -eq 0 ]]; then
  fail "no _lib/env.sh files found"
fi

for f in "${libs[@]}"; do
  (
    SCRIPT_DIR="__caller_script_dir__"
    PROJECT_ROOT="__caller_project_root__"
    ENV_FILE="__caller_env_file__"

    # shellcheck disable=SC1090
    source "$f"

    [[ "$SCRIPT_DIR" == "__caller_script_dir__" ]] || fail "$f clobbered SCRIPT_DIR"
    [[ "$PROJECT_ROOT" == "__caller_project_root__" ]] || fail "$f clobbered PROJECT_ROOT"
    [[ "$ENV_FILE" == "__caller_env_file__" ]] || fail "$f clobbered ENV_FILE"
  )
  echo "OK: $f"
done

echo "OK: no clobbering detected"
