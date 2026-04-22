#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_ROOT=""
OUT_FILE=""

usage() {
  cat >&2 <<EOF
Usage:
  04-generate-types.sh
  04-generate-types.sh --out <path>
  04-generate-types.sh --project-root <dir>
  04-generate-types.sh --project-root <dir> --out <path>

Defaults:
  - Without --project-root, writes to this task's outputs:
      $OUTPUTS_DIR/src/types/supabase.ts
  - With --project-root, writes to:
      <project-root>/src/types/supabase.ts
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="${2:-}"; shift 2 ;;
    --out)
      OUT_FILE="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unexpected argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$OUT_FILE" ]]; then
  if [[ -n "$PROJECT_ROOT" ]]; then
    OUT_FILE="$PROJECT_ROOT/src/types/supabase.ts"
  else
    OUT_FILE="$OUTPUTS_DIR/src/types/supabase.ts"
  fi
fi

mkdir -p "$(dirname "$OUT_FILE")"

echo "Generating Supabase TypeScript types to $OUT_FILE"
if [[ -n "$PROJECT_ROOT" ]]; then
  (
    cd "$PROJECT_ROOT"
    npx --yes supabase@latest gen types typescript --linked > "$OUT_FILE"
  )
else
  npx --yes supabase@latest gen types typescript --linked > "$OUT_FILE"
fi
echo "Done."
