#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=""
TEMPLATE=""

usage() {
  cat >&2 <<'EOF'
Usage:
  check-installed-scaffold.sh --project-root <dir> --template next|edge
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="${2:-}"; shift 2 ;;
    --template)
      TEMPLATE="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unexpected argument: $1" >&2
      usage
      exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ROOT" || -z "$TEMPLATE" ]]; then
  usage
  exit 1
fi

if [[ "$TEMPLATE" == "next" ]]; then
  test -f "$PROJECT_ROOT/src/lib/supabase/client.ts"
  test -f "$PROJECT_ROOT/src/lib/supabase/server.ts"
  test -f "$PROJECT_ROOT/src/types/supabase.ts" || true
  echo "Installed next scaffold OK: $PROJECT_ROOT"
elif [[ "$TEMPLATE" == "edge" ]]; then
  test -f "$PROJECT_ROOT/deno.json"
  test -f "$PROJECT_ROOT/supabase/functions/_shared/supabase.ts"
  test -f "$PROJECT_ROOT/supabase/functions/_shared/cors.ts"
  test -f "$PROJECT_ROOT/supabase/functions/health/index.ts"
  echo "Installed edge scaffold OK: $PROJECT_ROOT"
else
  echo "Unknown --template: $TEMPLATE (expected next|edge)" >&2
  exit 2
fi
