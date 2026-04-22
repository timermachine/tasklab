#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_ROOT="."
FORCE=false

usage() {
  cat >&2 <<'EOF'
Usage:
  00-install-scaffold.sh --project-root <dir> [--force]

What it does:
  - Copies this task's `outputs/src/` scaffold into `<project-root>/src/`.
  - Does NOT overwrite existing files unless --force is provided.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      PROJECT_ROOT="${2:-}"; shift 2 ;;
    --force)
      FORCE=true; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unexpected argument: $1" >&2
      usage
      exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ROOT" ]]; then
  echo "Missing --project-root." >&2
  usage
  exit 1
fi

SRC_DIR="$OUTPUTS_DIR/src"
DEST_DIR="$PROJECT_ROOT/src"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Missing scaffold dir: $SRC_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

copy_one() {
  local from="$1"
  local to="$2"
  if [[ -e "$to" && "$FORCE" != "true" ]]; then
    echo "Skip (exists): $to"
    return 0
  fi
  mkdir -p "$(dirname "$to")"
  cp -p "$from" "$to"
  echo "Copied: $to"
}

while IFS= read -r file; do
  rel="${file#$SRC_DIR/}"
  copy_one "$file" "$DEST_DIR/$rel"
done < <(find "$SRC_DIR" -type f | sort)

echo "Scaffold install complete."
