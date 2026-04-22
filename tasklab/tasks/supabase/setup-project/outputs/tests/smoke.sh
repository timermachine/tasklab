#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Shell syntax check..."
find "$OUTPUTS_DIR/scripts" "$OUTPUTS_DIR/tests" -type f -name '*.sh' -print0 \
  | sort -z \
  | while IFS= read -r -d '' f; do
      bash -n "$f"
    done

echo "Expected scaffold files..."
test -f "$OUTPUTS_DIR/src/lib/supabase/client.ts"
test -f "$OUTPUTS_DIR/src/lib/supabase/server.ts"
test -f "$OUTPUTS_DIR/src/types/supabase.ts"
test -f "$OUTPUTS_DIR/env/.env.local.example"
test -f "$OUTPUTS_DIR/env/.env.example"
test -f "$OUTPUTS_DIR/edge/deno.json"
test -f "$OUTPUTS_DIR/edge/supabase/config.toml"
test -f "$OUTPUTS_DIR/edge/supabase/seed.sql"
test -f "$OUTPUTS_DIR/edge/supabase/functions/.env.custom.example"
test -f "$OUTPUTS_DIR/edge/supabase/functions/_shared/supabase.ts"
test -f "$OUTPUTS_DIR/edge/supabase/functions/_shared/cors.ts"
test -f "$OUTPUTS_DIR/edge/supabase/functions/health/index.ts"
test -f "$OUTPUTS_DIR/edge/supabase/functions/health/deno.json"

echo "OK"
