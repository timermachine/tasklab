#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

fail=0
for t in "$OUTPUTS_DIR/tests/"*.sh; do
  [[ -f "$t" ]] || continue
  echo "=== $t ==="
  if ! bash "$t"; then
    fail=1
  fi
done

exit "$fail"

