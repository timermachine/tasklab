#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET="${1:-$OUTPUTS_DIR/src/types/supabase.ts}"

if [[ ! -f "$TARGET" ]]; then
  echo "Missing types file: $TARGET" >&2
  exit 1
fi

echo "Found types file: $TARGET"
