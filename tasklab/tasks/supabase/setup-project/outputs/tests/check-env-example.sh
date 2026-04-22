#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_LOCAL="${1:-$OUTPUTS_DIR/env/.env.local.example}"
TARGET_REPO="$OUTPUTS_DIR/env/.env.example"

if [[ ! -f "$TARGET_LOCAL" ]]; then
  echo "Missing env example file: $TARGET_LOCAL" >&2
  exit 1
fi

if [[ ! -f "$TARGET_REPO" ]]; then
  echo "Missing env example file: $TARGET_REPO" >&2
  exit 1
fi

need() {
  local key="$1" file="$2"
  if ! rg -n "^${key}=" "$file" >/dev/null; then
    echo "Missing key in env example: $key" >&2
    exit 1
  fi
}

need "NEXT_PUBLIC_SUPABASE_URL" "$TARGET_LOCAL"
need "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$TARGET_LOCAL"
need "SUPABASE_URL" "$TARGET_LOCAL"
need "SUPABASE_ANON_KEY" "$TARGET_LOCAL"
need "SUPABASE_SERVICE_ROLE_KEY" "$TARGET_LOCAL"

need "SUPABASE_PROJECT_REF" "$TARGET_REPO"
need "SUPABASE_URL" "$TARGET_REPO"
need "SUPABASE_ANON_KEY" "$TARGET_REPO"

echo "Env examples look OK:"
echo "- $TARGET_LOCAL"
echo "- $TARGET_REPO"
