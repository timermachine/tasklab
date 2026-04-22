#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

bash "$OUTPUTS_DIR/tests/smoke.sh"
bash "$OUTPUTS_DIR/tests/check-env-example.sh"
bash "$OUTPUTS_DIR/tests/check-types-file.sh"
