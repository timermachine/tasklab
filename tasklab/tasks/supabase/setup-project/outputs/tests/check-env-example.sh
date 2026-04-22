#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET="${1:-$OUTPUTS_DIR/env/.env.local.example}"

if [[ ! -f "$TARGET" ]]; then
  echo "Missing env example file: $TARGET" >&2
  exit 1
fi

need() {
  local key="$1"
  if ! rg -n "^${key}=" "$TARGET" >/dev/null; then
    echo "Missing key in env example: $key" >&2
    exit 1
  fi
}

need "NEXT_PUBLIC_SUPABASE_URL"
need "NEXT_PUBLIC_SUPABASE_ANON_KEY"
need "SUPABASE_SERVICE_ROLE_KEY"

echo "Env example looks OK: $TARGET"
